# Classphere Android app and push setup

The native Android project is in `apps/web/android`. It loads the deployed Classphere web app through Capacitor so all existing Next.js routing, tenant isolation, and API behavior remain unchanged.

## Before building

1. Create a Firebase project and register Android package `com.classphere.app`.
2. Download `google-services.json` and place it at `apps/web/android/app/google-services.json`. Do not commit it.
3. Create a Firebase service account with Firebase Cloud Messaging permissions. Store its JSON as the single-line `FIREBASE_SERVICE_ACCOUNT_JSON` API environment variable; never expose it to Next.js.
4. Run migrations `24_in_app_notifications.sql` and `25_push_devices.sql`.

## Production build

The production command locks the native shell to the deployed Classphere portal:

```powershell
npm run cap:sync:production
npm run cap:open:android
```

For the Classphere platform-admin app, use:

```powershell
npm run cap:sync:admin
npm run cap:open:android
```

It loads `https://admin.classphere.com`. Do not use `localhost` or an emulator address for a distributable build.

The app requests notification permission only after a user signs in, records the FCM token against that account, and deep-links into the destination carried by the push payload. Invalid FCM tokens are disabled automatically.
