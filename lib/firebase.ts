import Constants from 'expo-constants';
import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { Platform } from 'react-native';

import { normalizeExpoPublicValue } from '@/lib/env-normalize';

/**
 * Resolved at `expo start` / native build time in `app.config.js` → `expo.extra.firebasePublic`.
 * We merge this with `process.env.EXPO_PUBLIC_*` because Metro / React Compiler do not always inline
 * `process.env` in every bundle path, which makes Firebase look “unconfigured” even with a correct `.env`.
 */
type FirebasePublicExtra = Partial<
  Pick<
    FirebaseOptions,
    | 'apiKey'
    | 'authDomain'
    | 'databaseURL'
    | 'projectId'
    | 'storageBucket'
    | 'messagingSenderId'
    | 'appId'
    | 'measurementId'
  >
>;

let firebaseExtrasMemo: FirebasePublicExtra | undefined;

function firebaseFromExpoExtras(): FirebasePublicExtra {
  if (firebaseExtrasMemo !== undefined) return firebaseExtrasMemo;
  try {
    const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
    const fb = extra?.firebasePublic;
    firebaseExtrasMemo =
      fb && typeof fb === 'object' && !Array.isArray(fb) ? { ...(fb as FirebasePublicExtra) } : {};
  } catch {
    firebaseExtrasMemo = {};
  }
  return firebaseExtrasMemo;
}

/** Prefer env (when inlined), otherwise values embedded from `app.config.js`. */
function pickFromEnvOrExtra(envKey: string, extraKey: keyof FirebasePublicExtra): string | undefined {
  const rawEnv = normalizeExpoPublicValue(process.env[envKey] as string | undefined);
  if (rawEnv) return rawEnv;
  const fromExtra = firebaseFromExpoExtras()[extraKey];
  return normalizeExpoPublicValue(typeof fromExtra === 'string' ? fromExtra : undefined);
}

function readConfig(): FirebaseOptions {
  return {
    apiKey: pickFromEnvOrExtra('EXPO_PUBLIC_API_KEY', 'apiKey'),
    authDomain: pickFromEnvOrExtra('EXPO_PUBLIC_AUTH_DOMAIN', 'authDomain'),
    databaseURL: pickFromEnvOrExtra('EXPO_PUBLIC_DATABASE_URL', 'databaseURL'),
    projectId: pickFromEnvOrExtra('EXPO_PUBLIC_PROJECT_ID', 'projectId'),
    storageBucket: pickFromEnvOrExtra('EXPO_PUBLIC_STORAGE_BUCKET', 'storageBucket'),
    messagingSenderId: pickFromEnvOrExtra('EXPO_PUBLIC_MESSAGING_SENDER_ID', 'messagingSenderId'),
    appId: pickFromEnvOrExtra('EXPO_PUBLIC_APP_ID', 'appId'),
    measurementId: pickFromEnvOrExtra('EXPO_PUBLIC_MEASUREMENT_ID', 'measurementId'),
  };
}

export type FirebaseMissingKey =
  | 'EXPO_PUBLIC_API_KEY'
  | 'EXPO_PUBLIC_AUTH_DOMAIN'
  | 'EXPO_PUBLIC_DATABASE_URL'
  | 'EXPO_PUBLIC_PROJECT_ID'
  | 'EXPO_PUBLIC_APP_ID';

/** Which `EXPO_PUBLIC_*` Firebase keys are absent (never exposes secret values). */
export function getMissingFirebasePublicKeys(): FirebaseMissingKey[] {
  const c = readConfig();
  const missing: FirebaseMissingKey[] = [];
  if (!c.apiKey) missing.push('EXPO_PUBLIC_API_KEY');
  if (!c.authDomain) missing.push('EXPO_PUBLIC_AUTH_DOMAIN');
  if (!c.databaseURL) missing.push('EXPO_PUBLIC_DATABASE_URL');
  if (!c.projectId) missing.push('EXPO_PUBLIC_PROJECT_ID');
  if (!c.appId) missing.push('EXPO_PUBLIC_APP_ID');
  return missing;
}

export function isFirebaseConfigured(): boolean {
  return getMissingFirebasePublicKeys().length === 0;
}

let appInstance: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (appInstance) return appInstance;
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase env missing. Set EXPO_PUBLIC_API_KEY, EXPO_PUBLIC_AUTH_DOMAIN, EXPO_PUBLIC_DATABASE_URL, EXPO_PUBLIC_PROJECT_ID, EXPO_PUBLIC_APP_ID in .env (one KEY=value per line).'
    );
  }
  if (getApps().length === 0) {
    appInstance = initializeApp(readConfig());
  } else {
    appInstance = getApp();
  }
  return appInstance;
}

type FirebaseAuthModule = typeof import('firebase/auth');

/** RN bundle exposes getReactNativePersistence; web typings omit it — load via require on native only. */
export function getFirebaseAuth(): Auth {
  const app = getFirebaseApp();
  if (Platform.OS === 'web') {
    const { getAuth } = require('firebase/auth') as FirebaseAuthModule;
    return getAuth(app);
  }
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const {
    initializeAuth,
    getAuth,
    getReactNativePersistence,
  } = require('firebase/auth') as FirebaseAuthModule & {
    getReactNativePersistence: (storage: typeof AsyncStorage) => import('firebase/auth').Persistence;
  };
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    return getAuth(app);
  }
}

export function getFirebaseDatabase() {
  return getDatabase(getFirebaseApp());
}
