"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

/** One app-wide subscription; React components consume the browser event. */
export function NotificationRealtimeBridge() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel(`notifications:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        window.dispatchEvent(new CustomEvent("classphere:notification", { detail: payload.new }));
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id]);
  return null;
}
