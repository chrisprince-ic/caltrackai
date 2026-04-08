/**
 * Ensures the branded in-app splash runs only once per JS session (true cold start).
 * Any later navigation to `/` skips the splash and routes straight to welcome or tabs.
 */
let appSplashCompleted = false;

export function markAppSplashComplete() {
  appSplashCompleted = true;
}

export function hasAppSplashCompleted() {
  return appSplashCompleted;
}
