const SESSION_KEY = "sourcelens-session-v1";

/** Anonymous browser-session partition key, not an authentication token. */
export function getSessionId() {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = window.crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return "session-" + Math.random().toString(36).slice(2) + "-" + Date.now();
  }
}
