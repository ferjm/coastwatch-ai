export type AppRole = 'viewer' | 'researcher' | 'admin'

// Map the edge function HTTP status to an i18n key the caller resolves with t().
export function inviteErrorKey(status: number | undefined): string {
  switch (status) {
    case 400:
      return 'inviteErrorInvalid'
    case 401:
      return 'inviteErrorUnauthorized'
    case 403:
      return 'inviteErrorForbidden'
    case 409:
      return 'inviteErrorExists'
    default:
      return 'inviteErrorGeneric'
  }
}

// Validate a new password against Supabase's 6-char minimum and confirmation.
// Returns an i18n key on failure, or null when valid.
export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < 6) return 'passwordTooShort'
  if (password !== confirm) return 'passwordsDontMatch'
  return null
}
