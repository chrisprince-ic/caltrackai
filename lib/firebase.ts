import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import type { Auth } from 'firebase/auth';
import { Platform } from 'react-native';

import { normalizeExpoPublicValue } from '@/lib/env-normalize';

function readConfig(): FirebaseOptions {
  return {
    apiKey: normalizeExpoPublicValue(process.env.EXPO_PUBLIC_API_KEY),
    authDomain: normalizeExpoPublicValue(process.env.EXPO_PUBLIC_AUTH_DOMAIN),
    databaseURL: normalizeExpoPublicValue(process.env.EXPO_PUBLIC_DATABASE_URL),
    projectId: normalizeExpoPublicValue(process.env.EXPO_PUBLIC_PROJECT_ID),
    storageBucket: normalizeExpoPublicValue(process.env.EXPO_PUBLIC_STORAGE_BUCKET),
    messagingSenderId: normalizeExpoPublicValue(process.env.EXPO_PUBLIC_MESSAGING_SENDER_ID),
    appId: normalizeExpoPublicValue(process.env.EXPO_PUBLIC_APP_ID),
    measurementId: normalizeExpoPublicValue(process.env.EXPO_PUBLIC_MEASUREMENT_ID),
  };
}

export function isFirebaseConfigured(): boolean {
  const c = readConfig();
  return Boolean(c.apiKey && c.authDomain && c.databaseURL && c.projectId && c.appId);
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
