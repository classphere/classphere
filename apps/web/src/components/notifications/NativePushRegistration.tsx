"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";

/** Registers only after sign-in, tying one FCM token to one Classphere user. */
export function NativePushRegistration() {
  const { session } = useAuth(); const router = useRouter();
  useEffect(() => {
    if (!session?.access_token || !Capacitor.isNativePlatform()) return;
    let active = true;
    const listeners: Array<{ remove: () => Promise<void> }> = [];
    const register = async () => {
      const permission = await PushNotifications.checkPermissions();
      const result = permission.receive === "prompt" ? await PushNotifications.requestPermissions() : permission;
      if (result.receive !== "granted") return;
      listeners.push(await PushNotifications.addListener("registration", async ({ value }) => {
        if (!active) return;
        await apiClient.post("/api/v1/notifications/devices", { token: value, platform: Capacitor.getPlatform() }, session.access_token).catch(() => undefined);
      }));
      listeners.push(await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        window.dispatchEvent(new CustomEvent("classphere:notification", { detail: notification.data }));
      }));
      listeners.push(await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const href = action.notification.data?.href;
        if (typeof href === "string" && href.startsWith("/")) router.push(href);
      }));
      await PushNotifications.register();
    };
    void register().catch((error) => console.error("[push] native registration failed", error));
    return () => { active = false; void Promise.all(listeners.map((listener) => listener.remove())); };
  }, [router, session?.access_token]);
  return null;
}
