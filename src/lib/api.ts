/**
 * Centralized API fetch utility with automatic 401 handling.
 * When any API call returns 401 (Unauthorized), it clears the auth state
 * from localStorage and reloads the page to force re-login.
 */

let logoutCallback: (() => void) | null = null;

export function registerLogoutCallback(cb: () => void) {
  logoutCallback = cb;
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, options);

  if (res.status === 401) {
    // Token is invalid or expired — force logout
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ds_token');
      localStorage.removeItem('ds_user');
      localStorage.removeItem('ds_provider');
    }
    if (logoutCallback) {
      logoutCallback();
    }
    // Also reload the page to reset all state
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }

  return res;
}
