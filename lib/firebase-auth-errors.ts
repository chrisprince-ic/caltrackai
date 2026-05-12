/** Map Firebase Auth errors to short, non-leaky user messages. */
export function friendlyFirebaseAuthMessage(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: string }).code ?? '')
      : '';
  const msg = err instanceof Error ? err.message : '';

  if (code === 'auth/invalid-email' || /invalid-email/i.test(msg)) {
    return 'That email address does not look valid.';
  }
  if (code === 'auth/user-disabled') {
    return 'This account has been disabled. Contact support if you need help.';
  }
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Incorrect email or password. Try again or use "Forgot password?" to reset it.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Wait a few minutes and try again.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account already exists with this email. Try signing in instead.';
  }
  if (code === 'auth/weak-password') {
    return 'Choose a stronger password (at least 8 characters).';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error. Check your connection and try again.';
  }
  if (code === 'auth/requires-recent-login') {
    return 'For security, please sign out and sign back in before deleting your account.';
  }

  if (msg && !/^FirebaseError|auth\//i.test(msg)) {
    return msg.slice(0, 200);
  }
  return 'Something went wrong. Please try again.';
}
