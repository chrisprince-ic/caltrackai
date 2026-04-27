# CalTrack AI

Cross-platform nutrition tracking app built with **Expo** and **React Native**. Users log meals (including **AI photo scans** via **Google Cloud Vision** + **Google Gemini**), set targets from **onboarding**, sync data with **Firebase**, and can subscribe through **RevenueCat** (CalTrack Pro).

---

## Tech stack

| Area | Technology |
|------|------------|
| Framework | Expo SDK ~54, React 19, React Native 0.81 |
| Navigation | Expo Router (file-based), stack + tabs |
| Auth & cloud data | Firebase Auth + Firebase Realtime Database |
| AI | **Google Cloud Vision** + **Gemini** (meal scan: labels + image → nutrition JSON); **DeepSeek** (meal plans, groceries, coach, insights) |
| Payments | RevenueCat + `react-native-purchases-ui` (paywalls) |
| Social login | Google (expo-auth-session + Firebase credential) |
| Fonts | Poppins (`@expo-google-fonts/poppins`) |
| Native modules | `expo-camera`, `expo-image-manipulator` (resize/compress before Vision), `expo-dev-client` (recommended for full native feature set) |

---

## Prerequisites

- **Node.js** (LTS recommended, e.g. 20+)
- **npm** (or pnpm/yarn if you adapt commands)
- **Expo account** (for EAS builds, optional for local dev)
- Accounts / keys for: **Firebase**, **Google Cloud** (Vision API + API key), **Google AI Studio / Gemini API**, **DeepSeek**, **RevenueCat** (if using subscriptions), **Google OAuth** (if using Google sign-in)

---

## Quick start (local development)

```bash
git clone <your-repo-url>
cd caltrackai
npm install
```

1. Create a **`.env`** file in the project root (see [Environment variables](#environment-variables)). It is **gitignored**; do not commit secrets.
2. Start the dev server:

```bash
npm start
```

Then press `i` (iOS simulator), `a` (Android emulator), or scan the QR code in **Expo Go**.

### When you need a development build

Features such as **Firebase native persistence**, **RevenueCat**, and **full camera behavior** work best with a **custom dev client**, not always with Expo Go alone.

```bash
# After configuring app.json / EAS and env, create a dev client (example)
npx eas build --profile development --platform ios
# or android
```

Use the `development` profile from `eas.json` (`developmentClient: true`).

---

## Environment variables

Define variables in **`.env`** at the project root. Expo exposes only names prefixed with **`EXPO_PUBLIC_`** to the client bundle. **Never put server-only secrets** in these variables; anything `EXPO_PUBLIC_*` ships to the app binary.

### DeepSeek (meal plans, groceries, insights, onboarding coach)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_DEEPSEEK_API_KEY` | Yes (for AI text features) | API key from [DeepSeek](https://api.deepseek.com) |
| `EXPO_PUBLIC_DEEPSEEK_MODEL` | No | Defaults to `deepseek-chat` |
| `EXPO_PUBLIC_DEEPSEEK_BASE_URL` | No | Defaults to `https://api.deepseek.com` |

### Google Gemini (meal photo scan — multimodal nutrition JSON)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_GEMINI_API_KEY` | Yes (for scan tab) | API key from [Google AI Studio](https://aistudio.google.com/apikey) |
| `EXPO_PUBLIC_GEMINI_MODEL` | No | Defaults to `gemini-2.5-flash` |

### Google Cloud Vision (meal photo scanning — label detection)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_GOOGLE_VISION_API_KEY` | Yes (for scan tab) | API key with **Cloud Vision API** enabled |

Scanning requires **Vision** and **Gemini** keys (labels from Vision → Gemini sees the image + label context and returns calorie/macro JSON).

### Firebase (Auth + Realtime Database)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_API_KEY` | Yes | Firebase Web API key |
| `EXPO_PUBLIC_AUTH_DOMAIN` | Yes | e.g. `yourapp.firebaseapp.com` |
| `EXPO_PUBLIC_DATABASE_URL` | Yes | Realtime Database URL |
| `EXPO_PUBLIC_PROJECT_ID` | Yes | GCP project id |
| `EXPO_PUBLIC_APP_ID` | Yes | Firebase app id |
| `EXPO_PUBLIC_STORAGE_BUCKET` | Optional | If you use Storage later |
| `EXPO_PUBLIC_MESSAGING_SENDER_ID` | Optional | FCM sender id |
| `EXPO_PUBLIC_MEASUREMENT_ID` | Optional | Analytics |

Example shape (values are placeholders):

```env
EXPO_PUBLIC_API_KEY=...
EXPO_PUBLIC_AUTH_DOMAIN=yourapp.firebaseapp.com
EXPO_PUBLIC_DATABASE_URL=https://yourapp-default-rtdb.firebaseio.com
EXPO_PUBLIC_PROJECT_ID=yourapp
EXPO_PUBLIC_APP_ID=1:...
```

After changing `.env`, **restart** the Expo dev server (`Ctrl+C`, then `npm start`).

### Firebase Realtime Database rules

The repo includes **`database.rules.json`**: users may only read/write their own node under `users/{uid}`. **Deploy** these rules in the Firebase console (Realtime Database → Rules) before production.

### Google Sign-In

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | For Google flow | Web client ID (Firebase Auth → Google provider) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | iOS native | iOS OAuth client ID |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Android | Android OAuth client ID |

`app.config.js` merges **reversed client ID** URL schemes into iOS / Android when those IDs look valid, so Google redirect URIs work after a **native rebuild**.

### RevenueCat (subscriptions)

Use **public SDK keys** from RevenueCat → Project → API keys (not secret keys).

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_REVENUECAT_API_KEY` | Optional shared fallback |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | Apple / App Store key (often `appl_` or `test_`) |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` | Google Play key (often `goog_` or `test_`) |

Platform-specific keys avoid “wrong store” credential errors. Align **bundle ID** (`app.json` → `ios.bundleIdentifier`) and **Android package** with RevenueCat and the stores.

Entitlement and product identifiers used in code live in `constants/revenuecat.ts` (e.g. entitlement `ChrisGroup Pro`). Update that file if your dashboard uses different IDs.

---

## NPM scripts

| Script | Command | Purpose |
|--------|---------|---------|
| Start Metro | `npm start` | `expo start` |
| iOS | `npm run ios` | Start + open iOS simulator |
| Android | `npm run android` | Start + open Android emulator |
| Web | `npm run web` | Expo web (camera/AI limited vs native) |
| Lint | `npm run lint` | `expo lint` |

Typecheck (no script in package.json, run manually):

```bash
npx tsc --noEmit
```

---

## Production builds (EAS Build)

`eas.json` defines profiles:

- **`development`** — dev client, internal distribution  
- **`preview`** — internal testing builds  
- **`production`** — store-ready builds  

Configure **EAS secrets** or **`.env`** for CI so `EXPO_PUBLIC_*` variables are present at build time. Example:

```bash
npx eas build --platform ios --profile production
npx eas build --platform android --profile production
```

Submit to stores with EAS Submit or manually. Ensure App Store Connect / Play Console product IDs match RevenueCat and `constants/revenuecat.ts`.

---

## App structure (high level)

```
app/
  index.tsx          # Entry redirect → welcome
  welcome.tsx        # Sign in / sign up / guest
  auth/              # Login, sign-up
  onboarding/        # Goals, plan summary, Gemini refine
  (tabs)/            # Home, meal plans, scan, groceries, insights
  meal-plan/[planId].tsx
  meal-recipe.tsx
  subscription.tsx
components/          # Home dashboard, onboarding, auth, tab bar, UI
contexts/            # Auth, nutrition log, targets, RevenueCat, onboarding plan
lib/                 # Firebase, DeepSeek, Gemini scan, Vision, sync, caches, purchases helpers
constants/           # Palette, theme, RevenueCat, subscription copy
database.rules.json  # Example RTDB security rules (deploy in Firebase)
app.config.js        # Dynamic config (Google URL schemes)
```

---

## Feature notes

- **Meal scan** — `expo-camera` or gallery → **`expo-image-manipulator`** (max width 1024px, JPEG ~0.82) → **Google Vision** (labels + objects, food filter, ≥70% confidence) → **Gemini** (multimodal: image + Vision summary → nutrition JSON). On **web**, scan is replaced with a placeholder.
- **AI meal plan & groceries** — Responses are cached **once per calendar day** (local timezone) in AsyncStorage when targets match, to reduce API usage.
- **Nutrition log** — Stored under `users/{uid}/days/{YYYY-MM-DD}/entries` in Realtime Database; totals power home macros and insights.

---

## Security reminders

- Keep **`.env` out of git** (already in `.gitignore`).
- Deploy **`database.rules.json`** (or equivalent) so user data is not world-readable.
- DeepSeek, Gemini, Vision, and Firebase **client** keys are still extractable from the app; use **API key restrictions** (GCP / Google AI / DeepSeek), **Firebase App Check**, and **RevenueCat** dashboard controls for production hardening.

---

## Troubleshooting

| Issue | Things to check |
|-------|------------------|
| “Firebase not configured” | All required `EXPO_PUBLIC_*` Firebase vars set; restart Expo |
| AI / empty scan | `EXPO_PUBLIC_GEMINI_API_KEY`; scan also needs `EXPO_PUBLIC_GOOGLE_VISION_API_KEY` + Vision API enabled |
| RevenueCat / paywall errors | Correct platform key (`appl_` vs `goog_`), bundle ID / package match |
| Google Sign-In redirect | iOS/Android client IDs in `.env`; **rebuild** native app after changing `app.config.js` |
| AI features in Expo Go | Some flows may need a **development build** |

---

## License

Private project (`"private": true` in `package.json`). Add a license file if you open-source the repo.
