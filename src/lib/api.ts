/**
 * Centralized API client for the admin dashboard.
 * All requests are routed through the cardcentrals-backend.
 * Never call Paystack, Reloadly, Firebase, or any third-party service directly.
 */

const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  "http://localhost:3000/api/v1";

export const TOKEN_KEY = "cardcentrals_admin_token";
export const ADMIN_KEY = "cardcentrals_admin_user";

// ─── Token helpers ────────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Always send the Bearer token if we have it (covers Postman / non-browser).
  // The backend also accepts the httpOnly cookie set at login, so both paths work.
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    // credentials:'include' sends the httpOnly admin_token cookie on every request,
    // enabling the XSS-safe cookie auth path for browsers.
    credentials: "include",
  });

  // Session expired — redirect to login
  if (res.status === 401) {
    clearAuth();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }

  return json.data as T;
}

// ─── Response shape normalizer ────────────────────────────────────────────────

/**
 * Coerce a response into the canonical `{ data: T[], meta }` paginated shape.
 * Tolerates the three shapes the backend may emit while it stabilises:
 *   - { data: [...], meta: {...} }                (paginated)
 *   - [...]                                       (raw array, unwrapped)
 *   - { data: { data: [...], meta: {...} } }      (double-wrapped)
 */
export function asPaginated<T>(
  raw: unknown,
): { data: T[]; meta: { total: number; page: number; limit: number; pages: number } } {
  const fallbackMeta = { total: 0, page: 1, limit: 0, pages: 1 };
  if (Array.isArray(raw)) {
    return { data: raw as T[], meta: { ...fallbackMeta, total: raw.length, limit: raw.length } };
  }
  if (raw && typeof raw === "object") {
    const r = raw as { data?: unknown; meta?: unknown };
    if (Array.isArray(r.data)) {
      return {
        data: r.data as T[],
        meta: (r.meta as typeof fallbackMeta) ?? {
          ...fallbackMeta,
          total: r.data.length,
          limit: r.data.length,
        },
      };
    }
    if (r.data && typeof r.data === "object") {
      const inner = r.data as { data?: unknown; meta?: unknown };
      if (Array.isArray(inner.data)) {
        return {
          data: inner.data as T[],
          meta: (inner.meta as typeof fallbackMeta) ?? {
            ...fallbackMeta,
            total: inner.data.length,
            limit: inner.data.length,
          },
        };
      }
    }
  }
  return { data: [], meta: fallbackMeta };
}

// ─── HTTP methods ─────────────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string) =>
    request<T>(path, { method: "GET" }),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: <T>(path: string) =>
    request<T>(path, { method: "DELETE" }),
};

// Domain types live in `src/types/*` and are re-exported via `src/types/index.ts`.
// Import them from there directly — this file owns only the runtime client.
