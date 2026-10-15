export type CookieConsent = "accepted" | "rejected" | null;

const STORAGE_KEY = "garimplay_cookie_consent";

export function getCookieConsent(): CookieConsent {
  try {
    const value = localStorage.getItem(STORAGE_KEY);

    if (value === "accepted" || value === "rejected") {
      return value;
    }

    return null;
  } catch {
    return null;
  }
}

export function saveCookieConsent(consent: Exclude<CookieConsent, null>): void {
  try {
    localStorage.setItem(STORAGE_KEY, consent);
  } catch {
    // Armazenamento indisponível.
  }
}
