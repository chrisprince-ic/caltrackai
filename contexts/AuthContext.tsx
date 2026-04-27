import {
  createUserWithEmailAndPassword,
  deleteUser,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { get, ref, remove, set } from 'firebase/database';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { getFirebaseAuth, getFirebaseDatabase, isFirebaseConfigured } from '@/lib/firebase';
import { clearMealPlanSession } from '@/lib/meal-plan-session';

type AuthCtx = {
  user: User | null;
  initializing: boolean;
  firebaseReady: boolean;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signUpWithProfile: (input: {
    email: string;
    password: string;
    name: string;
    phone: string;
  }) => Promise<void>;
  signInWithGoogleIdToken: (idToken: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

async function writeUserProfile(uid: string, data: { name: string; phone: string; email: string; provider: string }) {
  const db = getFirebaseDatabase();
  await set(ref(db, `users/${uid}/profile`), {
    ...data,
    updatedAt: Date.now(),
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const firebaseReady = isFirebaseConfigured();

  useEffect(() => {
    if (!firebaseReady) {
      setInitializing(false);
      return;
    }
    let unsub: (() => void) | undefined;
    try {
      const auth = getFirebaseAuth();
      unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setInitializing(false);
      });
    } catch {
      setInitializing(false);
    }
    return () => unsub?.();
  }, [firebaseReady]);

  /** Ensure Google-only accounts get a profile node */
  useEffect(() => {
    if (!user || !firebaseReady) return;
    (async () => {
      try {
        const db = getFirebaseDatabase();
        const pRef = ref(db, `users/${user.uid}/profile`);
        const snap = await get(pRef);
        if (!snap.exists() && user.email) {
          await writeUserProfile(user.uid, {
            name: user.displayName || 'Member',
            phone: '',
            email: user.email,
            provider: user.providerData[0]?.providerId?.includes('google') ? 'google' : 'unknown',
          });
        }
      } catch {
        /* non-fatal */
      }
    })();
  }, [user, firebaseReady]);

  const signInWithEmailPassword = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signUpWithProfile = useCallback(
    async (input: { email: string; password: string; name: string; phone: string }) => {
      const auth = getFirebaseAuth();
      const cred = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
      if (input.name.trim()) {
        await updateProfile(cred.user, { displayName: input.name.trim() });
      }
      await writeUserProfile(cred.user.uid, {
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: input.email.trim(),
        provider: 'password',
      });
    },
    []
  );

  const signInWithGoogleIdToken = useCallback(async (idToken: string) => {
    const auth = getFirebaseAuth();
    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
  }, []);

  const signOutUser = useCallback(async () => {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      clearMealPlanSession();
    } catch {
      /* already signed out */
    }
  }, []);

  const deleteAccount = useCallback(async (password?: string) => {
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not signed in.');

    if (password && currentUser.email) {
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
    }

    try {
      const db = getFirebaseDatabase();
      await remove(ref(db, `users/${currentUser.uid}`));
    } catch {
      /* non-fatal — proceed with auth deletion */
    }

    clearMealPlanSession();
    await deleteUser(currentUser);
  }, []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      firebaseReady,
      signInWithEmailPassword,
      signUpWithProfile,
      signInWithGoogleIdToken,
      signOutUser,
      deleteAccount,
    }),
    [
      user,
      initializing,
      firebaseReady,
      signInWithEmailPassword,
      signUpWithProfile,
      signInWithGoogleIdToken,
      signOutUser,
      deleteAccount,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
