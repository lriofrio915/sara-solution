export type ApiFetchResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; details?: unknown }

export interface ApiFetchInit extends Omit<RequestInit, 'signal'> {
  timeout?: number
  signal?: AbortSignal
}

export async function apiFetch<T = unknown>(
  input: string | URL,
  init: ApiFetchInit = {},
): Promise<ApiFetchResult<T>> {
  const { timeout = 15000, signal, ...rest } = init
  try {
    const res = await fetch(input, {
      ...rest,
      signal: signal ?? AbortSignal.timeout(timeout),
    })

    let body: unknown = null
    try {
      body = await res.json()
    } catch {
      // non-JSON or empty response — leave as null
    }

    if (!res.ok) {
      const b = body as { error?: string; details?: unknown } | null
      return {
        ok: false,
        status: res.status,
        error: b?.error ?? `HTTP ${res.status}`,
        details: b?.details,
      }
    }

    return { ok: true, status: res.status, data: body as T }
  } catch (err) {
    const name = (err as { name?: string })?.name
    const message = (err as { message?: string })?.message
    if (name === 'TimeoutError' || name === 'AbortError') {
      return { ok: false, status: 0, error: 'Request timeout or aborted' }
    }
    return { ok: false, status: 0, error: message ?? 'Network error' }
  }
}

export function apiPostJson<T = unknown>(
  url: string | URL,
  body: unknown,
  init: ApiFetchInit = {},
): Promise<ApiFetchResult<T>> {
  return apiFetch<T>(url, {
    ...init,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    body: JSON.stringify(body),
  })
}
