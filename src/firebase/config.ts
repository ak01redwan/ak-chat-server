import type { FirebaseApp } from 'firebase/app';
import { getApps, initializeApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const REQUIRED_KEYS = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
] as const;

function readConfig(): FirebaseWebConfig {
  return {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY ?? '',
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.REACT_APP_FIREBASE_APP_ID ?? '',
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || undefined,
  };
}

const firebaseConfig = readConfig();

const missingKeys = REQUIRED_KEYS.filter((key) => !firebaseConfig[key]);

export const configError: string | null =
  missingKeys.length > 0
    ? `Missing Firebase configuration: ${missingKeys.join(
        ', '
      )}. Copy .env.example to .env and provide your Firebase web app credentials.`
    : null;

export const isFirebaseConfigured = configError === null;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

if (isFirebaseConfigured) {
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  firestore = getFirestore(app);
}

/** Returns the initialized Firebase app. Throws if Firebase is not configured. */
export function getFirebaseApp(): FirebaseApp {
  if (!app) throw new Error(configError ?? 'Firebase is not initialized.');
  return app;
}

/** Returns the Auth instance. Throws if Firebase is not configured. */
export function getFirebaseAuth(): Auth {
  if (!auth) throw new Error(configError ?? 'Firebase Auth is not initialized.');
  return auth;
}

/** Returns the Firestore instance. Throws if Firebase is not configured. */
export function getFirebaseFirestore(): Firestore {
  if (!firestore) throw new Error(configError ?? 'Firebase Firestore is not initialized.');
  return firestore;
}
