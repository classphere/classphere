"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { Badge } from "@capawesome/capacitor-badge";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";
import { registerLocalNotificationTapHandler } from "@/lib/notifications/local-reminders";

/** Registers only after sign-in, tying one FCM token to one Classphere user. */
export function NativePushRegistration() {
  const { session } = useAuth(); const router = useRouter();

  // Local reminder taps don't depend on sign-in state the way push registration
  // does — register this once, independent of the effect below.
  useEffect(() => {
    const handler = registerLocalNotificationTapHandler(router);
    return () => { void handler?.remove(); };
  }, [router]);

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

      // Best-effort — iOS bundles badge into the same permission prompt as
      // push, but ask explicitly so the badge still works if it's ever split out.
      try {
        const badgePermission = await Badge.checkPermissions();
        if (badgePermission.display === "prompt") await Badge.requestPermissions();
      } catch {
        // badge support varies by platform/OS version — non-fatal either way
      }
    };
    void register().catch((error) => console.error("[push] native registration failed", error));
    return () => { active = false; void Promise.all(listeners.map((listener) => listener.remove())); };
  }, [router, session?.access_token]);
  return null;
}
