/* Registers Google reversed client-id URL schemes; set EXPO_PUBLIC_GOOGLE_* in .env, then rebuild native (prebuild / EAS). */
module.exports = ({ config }) => {
  const iosId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const androidId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

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
  };
};
