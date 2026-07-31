"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Client-side response cache.
 *
 * Before this, every page fetched in a useEffect with no cache, so navigating
 * dashboard -> tests -> dashboard refetched everything and showed a spinner
 * each time. With a cache, a page you have already visited renders instantly
 * from memory and revalidates in the background.
 *
 * The defaults below are tuned for a study app rather than a trading dashboard:
 * data changes when the student does something, not continuously.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Created in state so each browser session gets exactly one client, and it
  // is never shared across requests during SSR.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Treat data as fresh for a minute. Within that window a revisit is
            // instant with no network call at all.
            staleTime: 60_000,
            // Keep it in memory well past that so back-navigation still paints
            // immediately, then revalidates.
            gcTime: 10 * 60_000,
            // Refetching on every window focus is the classic cause of a page
            // flickering when a student alt-tabs back mid-test.
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            // One retry: enough to ride out a dropped mobile packet, not enough
            // to leave a student staring at a spinner when the API is down.
            retry: 1,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
          },
          mutations: {
            // Submissions must never be silently retried — a duplicated submit
            // is worse than a visible failure the student can act on.
            retry: 0,
          },
        },
      }),
  );

  // A push/realtime notification means something server-side changed — a result
  // finished analysing, a test was assigned, a DPP was published. Marking every
  // query stale here is what pages used to do by hand, each with its own
  // `notificationVersion` counter threaded through a fetch effect.
  //
  // Invalidate rather than refetch: only queries with a mounted observer go to
  // the network, so the page the student is actually looking at updates and
  // everything else just refreshes next time it is shown.
  useEffect(() => {
    const onNotification = () => {
      void client.invalidateQueries();
    };
    window.addEventListener("classphere:notification", onNotification);
    return () => window.removeEventListener("classphere:notification", onNotification);
  }, [client]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
