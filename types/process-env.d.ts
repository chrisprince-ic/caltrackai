declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_GEMINI_API_KEY?: string;
    EXPO_PUBLIC_GEMINI_MODEL?: string;
    /** Firebase Web SDK config */
    EXPO_PUBLIC_API_KEY?: string;
    EXPO_PUBLIC_AUTH_DOMAIN?: string;
    EXPO_PUBLIC_DATABASE_URL?: string;
    EXPO_PUBLIC_PROJECT_ID?: string;
    EXPO_PUBLIC_STORAGE_BUCKET?: string;
    EXPO_PUBLIC_MESSAGING_SENDER_ID?: string;
    EXPO_PUBLIC_APP_ID?: string;
    EXPO_PUBLIC_MEASUREMENT_ID?: string;
    /** OAuth Web client ID from Firebase Console → Authentication → Google → Web client */
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?: string;
    /** iOS OAuth client ID (required for Google on iOS with expo-auth-session) */
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?: string;
    /** Android OAuth client ID (required for Google on Android) */
    EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?: string;
    /** RevenueCat public SDK key (shared or fallback for both platforms) */
    EXPO_PUBLIC_REVENUECAT_API_KEY?: string;
    EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?: string;
    EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?: string;
  }
}
