import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

let firebaseApp: App | null | undefined;

function app(): App | null {
  if (firebaseApp !== undefined) return firebaseApp;
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!serviceAccount) return (firebaseApp = null);
  try {
    firebaseApp = getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
  } catch (error) {
    console.error("[firebase] could not initialize Firebase Admin:", error);
    firebaseApp = null;
  }
  return firebaseApp;
}

export function firebaseMessaging() {
  const instance = app();
  return instance ? getMessaging(instance) : null;
}
