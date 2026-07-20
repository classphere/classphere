# Classphere Android app and push setup

The native Android project is in `apps/web/android`. It loads the deployed Classphere web app through Capacitor so all existing Next.js routing, tenant isolation, and API behavior remain unchanged.

## Before building

1. Create a Firebase project and register Android package `com.classphere.app`.
2. Download `google-services.json` and place it at `apps/web/android/app/google-services.json`. Do not commit it.
3. Create a Firebase service account with Firebase Cloud Messaging permissions. Store its JSON as the single-line `FIREBASE_SERVICE_ACCOUNT_JSON` API environment variable; never expose it to Next.js.
4. Run migrations `24_in_app_notifications.sql` and `25_push_devices.sql`.

## Local Android emulator

From `apps/web`, run Next.js on the host and sync with:

```powershell
$env:CAPACITOR_SERVER_URL = "http://10.0.2.2:3000"
npm run cap:sync
npm run cap:open:android
```

## Production build

Set `CAPACITOR_SERVER_URL` to the HTTPS production portal before sync. For example:

```powershell
$env:CAPACITOR_SERVER_URL = "https://app.classphere.com"
npm run cap:sync
npm run cap:open:android
```

The app requests notification permission only after a user signs in, records the FCM token against that account, and deep-links into the destination carried by the push payload. Invalid FCM tokens are disabled automatically.
