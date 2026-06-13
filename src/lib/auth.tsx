import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";

type AuthState = {
  /** Firebase user, or null when signed out. */
  user: User | null;
  /** True only when signed in AND the token carries the admin custom claim. */
  isAdmin: boolean;
  /** Initial auth resolution still in flight. */
  loading: boolean;
};

type AuthContextValue = AuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function hasAdminClaim(user: User | null, forceRefresh = false): Promise<boolean> {
  if (!user) return false;
  const token = await user.getIdTokenResult(forceRefresh);
  return token.claims.admin === true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAdmin: false,
    loading: true,
  });

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      const isAdmin = await hasAdminClaim(user);
      setState({ user, isAdmin, loading: false });
    });
    // Keep admin status fresh if claims change / token refreshes.
    const unsubToken = onIdTokenChanged(auth, async (user) => {
      const isAdmin = await hasAdminClaim(user);
      setState((prev) => ({ ...prev, user, isAdmin, loading: false }));
    });
    return () => {
      unsubAuth();
      unsubToken();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      async signIn(email, password) {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        // Force a token refresh so we read the very latest custom claims.
        const isAdmin = await hasAdminClaim(cred.user, true);
        if (!isAdmin) {
          await fbSignOut(auth);
          throw new Error(
            "This account is not authorized for the admin dashboard.",
          );
        }
      },
      async signOut() {
        await fbSignOut(auth);
      },
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
