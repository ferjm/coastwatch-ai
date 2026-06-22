import { describe, it, expect } from 'vitest'
import { validateInviteInput, inviteErrorToStatus, buildRedirectUrl } from './validation'

describe('validateInviteInput', () => {
  it('rejects a malformed email', () => {
    const r = validateInviteInput({ email: 'nope', fullName: 'X', role: 'viewer' })
    expect(r.ok).toBe(false)
  })
  it('rejects a role outside the enum', () => {
    const r = validateInviteInput({ email: 'a@b.com', fullName: 'X', role: 'superuser' })
    expect(r.ok).toBe(false)
  })
  it('rejects a non-object body', () => {
    expect(validateInviteInput(null).ok).toBe(false)
    expect(validateInviteInput('x').ok).toBe(false)
  })
  it('accepts a valid payload and trims fields', () => {
    const r = validateInviteInput({ email: '  a@b.com ', fullName: '  Ada  ', role: 'researcher' })
    expect(r).toEqual({ ok: true, value: { email: 'a@b.com', fullName: 'Ada', role: 'researcher' } })
  })
})

describe('inviteErrorToStatus', () => {
  it('maps already-registered to 409', () => {
    expect(inviteErrorToStatus('A user with this email address has already been registered')).toBe(409)
  })
  it('maps unknown errors to 500', () => {
    expect(inviteErrorToStatus('smtp timeout')).toBe(500)
    expect(inviteErrorToStatus(undefined)).toBe(500)
  })
})

describe('buildRedirectUrl', () => {
  it('builds the accept-invite URL from a valid origin', () => {
    expect(buildRedirectUrl('https://app.example.com')).toBe('https://app.example.com/accept-invite')
  })
  it('rejects a non-http origin or garbage', () => {
    expect(buildRedirectUrl('javascript:alert(1)')).toBeNull()
    expect(buildRedirectUrl('not a url')).toBeNull()
    expect(buildRedirectUrl(42)).toBeNull()
  })
})
