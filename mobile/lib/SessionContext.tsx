import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { clearSession, fetchUser, getStoredSession, signOut, storeSession, type UserSession } from "./auth";

interface SessionState {
  user: UserSession | null;
  sessionToken: string | null;
  loading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionState>({
  user: null,
  sessionToken: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from secure store on app launch
  useEffect(() => {
    (async () => {
      const token = await getStoredSession();
      if (token) {
        const u = await fetchUser(token);
        if (u) {
          setSessionToken(token);
          setUser(u);
        } else {
          await clearSession();
        }
      }
      setLoading(false);
    })();
  }, []);

  const handleSignIn = useCallback(async (token: string) => {
    await storeSession(token);
    setSessionToken(token);
    const u = await fetchUser(token);
    setUser(u);
  }, []);

  const handleSignOut = useCallback(async () => {
    if (sessionToken) await signOut(sessionToken);
    setSessionToken(null);
    setUser(null);
  }, [sessionToken]);

  return (
    <SessionContext.Provider
      value={{
        user,
        sessionToken,
        loading,
        signIn: handleSignIn,
        signOut: handleSignOut,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
