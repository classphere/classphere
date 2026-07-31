"use client";

import { useEffect, useRef, useState } from "react";
import { RiNotification3Line } from "@remixicon/react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { Badge } from "@capawesome/capacitor-badge";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";
import { apiQueryKey, useApiQuery } from "@/lib/hooks/useApiQuery";

type Notification = { id: string; title: string; body?: string | null; href?: string | null; read_at?: string | null; created_at: string };
type NotificationFeed = { notifications: Notification[]; unreadCount: number };
const FEED_PATH = "/api/v1/notifications?limit=12";

export function NotificationBell() {
  const { session } = useAuth(); const router = useRouter(); const queryClient = useQueryClient(); const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null);
  const { data } = useApiQuery<NotificationFeed>(FEED_PATH);
  const items = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;
  const load = () => queryClient.invalidateQueries({ queryKey: [FEED_PATH] });
  // Read-marking is applied to the cache directly rather than refetched: the
  // badge has to drop the moment it is tapped, and the server response carries
  // nothing this component does not already know.
  const patchFeed = (update: (feed: NotificationFeed) => NotificationFeed) =>
    queryClient.setQueryData<NotificationFeed>(apiQueryKey(FEED_PATH), (feed) =>
      feed ? update(feed) : feed,
    );
  // Android's badge is only ever set client-side (there's no OS-level push
  // payload for it the way iOS has aps.badge) — keep the native icon in sync
  // with whatever this component considers the unread count to be.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void (unread > 0 ? Badge.set({ count: unread }) : Badge.clear()).catch(() => undefined);
  }, [unread]);
  // Show an arriving notification immediately. QueryProvider also invalidates
  // on this event, so the authoritative list follows a moment later.
  useEffect(() => { const onNotification = (event: Event) => { const item = (event as CustomEvent<Notification>).detail; if (!item?.id) return; patchFeed((feed) => ({ notifications: [item, ...feed.notifications.filter((candidate) => candidate.id !== item.id)].slice(0, 12), unreadCount: feed.unreadCount + 1 })); }; window.addEventListener("classphere:notification", onNotification); return () => window.removeEventListener("classphere:notification", onNotification); }, [queryClient]);
  useEffect(() => { const close = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); }; document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);
  const openItem = async (item: Notification) => { if (!item.read_at && session?.access_token) { await apiClient.post(`/api/v1/notifications/${item.id}/read`, {}, session.access_token).catch(() => undefined); patchFeed((feed) => ({ notifications: feed.notifications.map((candidate) => candidate.id === item.id ? { ...candidate, read_at: new Date().toISOString() } : candidate), unreadCount: Math.max(0, feed.unreadCount - 1) })); } setOpen(false); if (item.href) router.push(item.href); };
  const markAllRead = async () => { if (!session?.access_token || !unread) return; await apiClient.post("/api/v1/notifications/read-all", {}, session.access_token); patchFeed((feed) => ({ notifications: feed.notifications.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })), unreadCount: 0 })); };
  return <div ref={ref} className="relative"><button onClick={() => { setOpen((value) => !value); if (!open) void load(); }} aria-label="Notifications" className="relative flex size-12 items-center justify-center rounded-full bg-b-surface2 border border-s-stroke2 transition-all active:scale-95 shadow-widget hover:border-s-highlight cursor-pointer shrink-0 text-t-secondary hover:text-t-primary"><RiNotification3Line size={20} />{unread > 0 && <span className="absolute right-2 top-2 flex min-w-4 h-4 items-center justify-center rounded-full bg-primary-03 px-1 text-[9px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}</button>{open && <div className="absolute bottom-14 left-0 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[14px] border border-s-stroke2 bg-b-surface1 shadow-depth"><div className="flex items-center justify-between border-b border-s-stroke2 px-4 py-3"><p className="font-semibold text-t-primary">Notifications</p><button onClick={() => void markAllRead()} className="text-xs font-semibold text-primary-01 disabled:opacity-50" disabled={!unread}>Mark all read</button></div><div className="max-h-80 overflow-y-auto">{items.length ? items.map((item) => <button key={item.id} onClick={() => void openItem(item)} className={`block w-full border-b border-s-stroke2/70 px-4 py-3 text-left transition-colors hover:bg-b-surface2 ${item.read_at ? "" : "bg-primary-01/5"}`}><p className="text-sm font-semibold text-t-primary">{item.title}</p>{item.body && <p className="mt-1 text-xs leading-5 text-t-secondary">{item.body}</p>}</button>) : <p className="px-4 py-8 text-center text-sm text-t-secondary">You’re all caught up.</p>}</div></div>}</div>;
}
