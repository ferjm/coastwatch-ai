// Fallback del host de inferencia: si el self-host (Space de HF) falla, se reintenta
// una vez contra Roboflow serverless. Sin APIs de Deno: testeable con vitest.

export const SERVERLESS_HOST = 'https://serverless.roboflow.com'
export const PRIMARY_TIMEOUT_MS = 25_000

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>

export interface InferResult {
  resp: Response
  host: string
  fellBack: boolean
}

// Fallos del host (caído, pausado, sin hardware): red, timeout o 5xx/429.
// Un 4xx (imagen o key mal) no se reintenta: fallaría igual en serverless.
function isHostFailure(resp: Response): boolean {
  return resp.status >= 500 || resp.status === 429
}

export async function inferWithFallback(
  primaryHost: string,
  buildUrl: (host: string) => string,
  init: RequestInit,
  doFetch: FetchLike = (u, i) => fetch(u, i),
  timeoutMs: number = PRIMARY_TIMEOUT_MS,
): Promise<InferResult> {
  if (primaryHost === SERVERLESS_HOST) {
    return { resp: await doFetch(buildUrl(SERVERLESS_HOST), init), host: SERVERLESS_HOST, fellBack: false }
  }
  try {
    const resp = await doFetch(buildUrl(primaryHost), { ...init, signal: AbortSignal.timeout(timeoutMs) })
    if (!isHostFailure(resp)) return { resp, host: primaryHost, fellBack: false }
    await resp.body?.cancel()
  } catch (_) {
    // red o timeout: cae al fallback
  }
  return { resp: await doFetch(buildUrl(SERVERLESS_HOST), init), host: SERVERLESS_HOST, fellBack: true }
}
