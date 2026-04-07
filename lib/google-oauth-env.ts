import { normalizeExpoPublicValue } from '@/lib/env-normalize';

/** Web client ID (Firebase Console → Auth → Google, or Google Cloud OAuth “Web client”). */
export const GOOGLE_WEB_CLIENT_ID = normalizeExpoPublicValue(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);

/** iOS OAuth client ID (Firebase → Project settings → iOS app, or Google Cloud “iOS client”). */
export const GOOGLE_IOS_CLIENT_ID = normalizeExpoPublicValue(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);

/** Android OAuth client ID (Firebase → Project settings → Android app). */
export const GOOGLE_ANDROID_CLIENT_ID = normalizeExpoPublicValue(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);
