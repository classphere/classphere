"use client";

import { useEffect } from "react";

/**
 * NativePlatformSetup
 *
 * Runs once on mount. When the app is running inside a Capacitor native shell
 * (Android / iOS), it:
 *   1. Adds `.native-platform` to <body> → triggers CSS that removes all
 *      browser-like UX (text selection, tap highlights, overscroll, etc.)
 *   2. Hides the splash screen after the first meaningful paint.
 */
export default function NativePlatformSetup() {
  useEffect(() => {
    const isNative =
      typeof window !== "undefined" &&
      // @ts-ignore — Capacitor global injected by the native bridge
      (window.Capacitor?.isNativePlatform?.() ?? false);

    if (!isNative) return;

    // 1. Apply native-platform CSS class
    document.body.classList.add("native-platform");

    // 2. Dismiss the splash screen via the Capacitor bridge global.
    //    We use window.Capacitor.Plugins directly so there's no npm import
    //    that would break the Vercel/Turbopack build.
    try {
      // @ts-ignore — Capacitor global injected by the native bridge at runtime
      const SplashScreen = window.Capacitor?.Plugins?.SplashScreen;
      if (SplashScreen) {
        SplashScreen.hide({ fadeOutDuration: 200 });
      }
    } catch {
      // Not in Capacitor context or plugin not available — no-op
    }
  }, []);

  // Renders nothing — pure side-effect component
  return null;
}
