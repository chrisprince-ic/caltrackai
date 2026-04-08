import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
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
  sendPasswordReset: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  signOutUser: () => Promise<void>;
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

  /** Ensure accounts missing a profile node get one created */
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
            provider: 'password',
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

  const sendPasswordReset = useCallback(async (email: string) => {
    const auth = getFirebaseAuth();
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const deleteAccount = useCallback(async () => {
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not signed in.');
    const uid = currentUser.uid;
    // Delete the Firebase Auth account (may throw auth/requires-recent-login)
    await deleteUser(currentUser);
    // Best-effort: remove all user data from the database
    try {
      const db = getFirebaseDatabase();
      await remove(ref(db, `users/${uid}`));
    } catch {
      /* data removal is best-effort */
    }
    clearMealPlanSession();
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

  const value = useMemo(
    () => ({
      user,
      initializing,
      firebaseReady,
      signInWithEmailPassword,
      signUpWithProfile,
      sendPasswordReset,
      deleteAccount,
      signOutUser,
    }),
    [
      user,
      initializing,
      firebaseReady,
      signInWithEmailPassword,
      signUpWithProfile,
      sendPasswordReset,
      deleteAccount,
      signOutUser,
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
