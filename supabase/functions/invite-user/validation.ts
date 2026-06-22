export type AppRole = 'viewer' | 'researcher' | 'admin'

export const VALID_ROLES: AppRole[] = ['viewer', 'researcher', 'admin']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type ValidationResult =
  | { ok: true; value: { email: string; fullName: string; role: AppRole } }
  | { ok: false; error: string }

export function validateInviteInput(body: unknown): ValidationResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Invalid request body' }
  }
  const { email, fullName, role } = body as Record<string, unknown>
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return { ok: false, error: 'Invalid email' }
  }
  if (typeof role !== 'string' || !VALID_ROLES.includes(role as AppRole)) {
    return { ok: false, error: 'Invalid role' }
  }
  const name = typeof fullName === 'string' ? fullName.trim() : ''
  return { ok: true, value: { email: email.trim(), fullName: name, role: role as AppRole } }
}

// Map a Supabase admin invite error message to an HTTP status code.
export function inviteErrorToStatus(message: string | undefined): number {
  if (!message) return 500
  const m = message.toLowerCase()
  if (m.includes('already') && (m.includes('registered') || m.includes('exist'))) return 409
  return 500
}

// Build the accept-invite redirect URL from a client-supplied origin.
// Returns null for anything that is not a valid http(s) origin.
export function buildRedirectUrl(origin: unknown): string | null {
  if (typeof origin !== 'string') return null
  try {
    const u = new URL(origin)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return `${u.origin}/accept-invite`
  } catch {
    return null
  }
}
