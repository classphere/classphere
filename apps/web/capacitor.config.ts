import type { CapacitorConfig } from "@capacitor/cli";

// Production uses the deployed Classphere web app inside the native shell.
// For an Android emulator, set CAPACITOR_SERVER_URL=http://10.0.2.2:3000.
const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "com.classphere.app",
  appName: "Classphere",
  webDir: "mobile-shell",
  ...(serverUrl ? { server: { url: serverUrl, cleartext: serverUrl.startsWith("http://") } } : {}),
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
