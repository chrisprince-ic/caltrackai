/* eslint-env node */
/* global __dirname */
const path = require('path');

// Load `.env` before `process.env` is read below. Ensures Firebase keys exist when Expo evaluates config
// and mirrors them into `expo.extra.firebasePublic` so the runtime bundle reads them via `expo-constants`.
try {
  require('dotenv').config({ path: path.resolve(__dirname, '.env') });
} catch {
  /* dotenv optional if using only shell env — still populate extra from process.env below */
}

/* Registers Google reversed client-id URL schemes; set EXPO_PUBLIC_GOOGLE_* in .env, then rebuild native (prebuild / EAS). */
module.exports = ({ config }) => {
  const iosId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const androidId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

  /** Mirrored client-side from `extra.firebasePublic` (see `lib/firebase.ts`). */
  const firebasePublic = {
    apiKey: process.env.EXPO_PUBLIC_API_KEY ?? '',
    authDomain: process.env.EXPO_PUBLIC_AUTH_DOMAIN ?? '',
    databaseURL: process.env.EXPO_PUBLIC_DATABASE_URL ?? '',
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID ?? '',
    storageBucket: process.env.EXPO_PUBLIC_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.EXPO_PUBLIC_MESSAGING_SENDER_ID ?? '',
    appId: process.env.EXPO_PUBLIC_APP_ID ?? '',
    measurementId: process.env.EXPO_PUBLIC_MEASUREMENT_ID ?? '',
  };

  /** Avoid bogus .env placeholders becoming invalid native URL schemes */
  function reversedScheme(clientId) {
    if (!clientId || typeof clientId !== 'string') return null;
    const t = clientId.trim();
    if (!/^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/i.test(t)) return null;
    return `com.googleusercontent.apps.${t.replace(/\.apps\.googleusercontent\.com$/i, '')}`;
  }

  const revIos = reversedScheme(iosId);
  const revAndroid = reversedScheme(androidId);

  const existingIosTypes = config.ios?.infoPlist?.CFBundleURLTypes ?? [];
  const iosUrlTypes = revIos
    ? [...existingIosTypes, { CFBundleURLSchemes: [revIos] }]
    : existingIosTypes;

  const existingAndroidFilters = config.android?.intentFilters ?? [];
  const androidIntentFilters = revAndroid
    ? [
        ...existingAndroidFilters,
        {
          action: 'VIEW',
          data: [{ scheme: revAndroid }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ]
    : existingAndroidFilters;

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      'react-native-iap',
    ],
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        CFBundleURLTypes: iosUrlTypes,
      },
    },
    android: {
      ...config.android,
      intentFilters: androidIntentFilters,
    },
    extra: {
      ...(config.extra || {}),
      firebasePublic,
    },
  };
};
