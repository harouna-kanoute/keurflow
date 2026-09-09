import AsyncStorage from "@react-native-async-storage/async-storage";

// "Se souvenir de moi" stores the *email only*, never the password.
// AsyncStorage is unencrypted app-sandboxed storage (see supabase.ts) — fine
// for an address the user types in public anyway, wrong for a credential. If
// we ever want the password pre-filled too, it has to go through
// expo-secure-store (Keychain / Keystore), not here.
//
// This is separate from staying signed in: the Supabase session already
// persists on its own. This only saves re-typing the address after an explicit
// sign-out or on a new install.
export const REMEMBERED_EMAIL_KEY = "keurflow-remembered-email";

export async function getRememberedEmail(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(REMEMBERED_EMAIL_KEY);
  } catch (error) {
    // A storage read failing must never block the login screen from rendering.
    console.error("[remembered-email] read failed:", error);
    return null;
  }
}

export async function setRememberedEmail(email: string): Promise<void> {
  try {
    await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, email);
  } catch (error) {
    console.error("[remembered-email] write failed:", error);
  }
}

export async function clearRememberedEmail(): Promise<void> {
  try {
    await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
  } catch (error) {
    console.error("[remembered-email] clear failed:", error);
  }
}
