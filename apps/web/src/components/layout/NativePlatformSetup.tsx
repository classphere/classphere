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

    // 2. Dismiss the splash screen (with a short fade so it's not jarring)
    //    @capacitor/splash-screen is optional — gracefully skip if not installed
    import("@capacitor/splash-screen")
      .then(({ SplashScreen }) => {
        SplashScreen.hide({ fadeOutDuration: 200 });
      })
      .catch(() => {
        // SplashScreen plugin not installed — no-op
      });
  }, []);

  // Renders nothing — pure side-effect component
  return null;
}
