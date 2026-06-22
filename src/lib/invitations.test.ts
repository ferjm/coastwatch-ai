import { describe, it, expect } from 'vitest'
import { inviteErrorKey, validateNewPassword } from './invitations'

describe('inviteErrorKey', () => {
  it('maps 409 to the already-exists key', () => {
    expect(inviteErrorKey(409)).toBe('inviteErrorExists')
  })
  it('maps 403 to the forbidden key', () => {
    expect(inviteErrorKey(403)).toBe('inviteErrorForbidden')
  })
  it('maps 401 to the unauthorized key', () => {
    expect(inviteErrorKey(401)).toBe('inviteErrorUnauthorized')
  })
  it('maps 400 to the invalid key', () => {
    expect(inviteErrorKey(400)).toBe('inviteErrorInvalid')
  })
  it('maps unknown/undefined status to the generic key', () => {
    expect(inviteErrorKey(undefined)).toBe('inviteErrorGeneric')
    expect(inviteErrorKey(500)).toBe('inviteErrorGeneric')
  })
})

describe('validateNewPassword', () => {
  it('rejects passwords shorter than 6 chars', () => {
    expect(validateNewPassword('123', '123')).toBe('passwordTooShort')
  })
  it('rejects mismatched passwords', () => {
    expect(validateNewPassword('abcdef', 'abcdeg')).toBe('passwordsDontMatch')
  })
  it('accepts a valid matching password', () => {
    expect(validateNewPassword('abcdef', 'abcdef')).toBeNull()
  })
})
