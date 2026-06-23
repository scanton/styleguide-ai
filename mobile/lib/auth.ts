import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const API_BASE = "https://www.styleguideai.com";
const SECURE_KEY_SESSION = "sga_session_token";
const SECURE_KEY_LOCALE = "sga_preferred_locale";

export interface UserSession {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  preferredLanguage: string | null;
}

// --- Session storage ---

export async function storeSession(token: string) {
  await SecureStore.setItemAsync(SECURE_KEY_SESSION, token);
}

export async function getStoredSession(): Promise<string | null> {
  return SecureStore.getItemAsync(SECURE_KEY_SESSION);
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(SECURE_KEY_SESSION);
}

// --- Locale storage ---

export async function storeLocale(locale: string) {
  await SecureStore.setItemAsync(SECURE_KEY_LOCALE, locale);
}

export async function getStoredLocale(): Promise<string | null> {
  return SecureStore.getItemAsync(SECURE_KEY_LOCALE);
}

// Exchange the OAuth code with the NextAuth backend and return the session cookie.
export async function exchangeCodeForSession(code: string, redirectUri: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/callback/google?code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`, {
      method: "GET",
      redirect: "manual",
      credentials: "include",
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      const match = setCookie.match(/next-auth\.session-token=([^;]+)/);
      return match?.[1] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

// Fetch the current user's profile using a stored session token.
export async function fetchUser(sessionToken: string): Promise<UserSession | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/session`, {
      headers: { Cookie: `next-auth.session-token=${sessionToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.user) return null;
    return {
      id: data.user.id ?? data.user.email,
      name: data.user.name ?? null,
      email: data.user.email ?? null,
      image: data.user.image ?? null,
      preferredLanguage: data.user.preferredLanguage ?? null,
    };
  } catch {
    return null;
  }
}

export async function signOut(sessionToken: string) {
  try {
    await fetch(`${API_BASE}/api/auth/signout`, {
      method: "POST",
      headers: { Cookie: `next-auth.session-token=${sessionToken}` },
    });
  } catch {
    // ignore
  }
  await clearSession();
}
