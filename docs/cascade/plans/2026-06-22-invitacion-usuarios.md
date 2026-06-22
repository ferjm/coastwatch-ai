# Invitación de Usuarios — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que un administrador invite usuarios por email asignándoles un rol, manteniendo abierto el registro público.

**Architecture:** Edge Function dedicada (`invite-user`) que valida que el llamante es `admin`, invita con `auth.admin.inviteUserByEmail` y fija el rol elegido con `upsert` en `user_roles`. La UI añade un diálogo de invitación en `UserManagement.tsx` y una página `/accept-invite` donde el invitado establece su contraseña. La lógica pura (validación, mapeo de errores) se extrae a módulos `.ts` testeables; los componentes React y el handler `serve()` se verifican manualmente (el repo no tiene infra de tests de componentes ni de handlers Deno).

**Tech Stack:** Vite + React + TS + shadcn/ui, Supabase (Edge Functions Deno, Auth admin API, RLS), i18next, Vitest (entorno `node`).

## Global Constraints

- Pre-commit hook rechaza cualquier contenido staged o mensaje de commit que contenga cierta palabra reservada del asistente — no escribirla en archivos ni en mensajes.
- Firma GPG rota en sesiones de agente → commitear siempre con `git -c commit.gpgsign=false commit`.
- Fernando hace los `git push` y aplica configuración en Supabase/Lovable Cloud; el agente nunca empuja ni despliega.
- Rama de trabajo: `feat/user-invitations`.
- El entorno de Vitest es `node` con include `src/**/*.test.ts` y `supabase/functions/**/*.test.ts`. Solo se testean módulos `.ts` puros (sin imports remotos de Deno ni del cliente Supabase). Importar desde `vitest` explícitamente (`globals` no está activado).
- Roles válidos (enum `app_role`): `'viewer' | 'researcher' | 'admin'`.
- Sin migración nueva: se reutilizan `user_roles`, `profiles` y el trigger `handle_new_user` (que ya copia `full_name` de `raw_user_meta_data` a `profiles` y asigna `viewer` por defecto).

---

### Task 1: Lógica pura de la Edge Function (validación + mapeo)

**Files:**
- Create: `supabase/functions/invite-user/validation.ts`
- Test: `supabase/functions/invite-user/validation.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type AppRole = 'viewer' | 'researcher' | 'admin'`
  - `validateInviteInput(body: unknown): { ok: true; value: { email: string; fullName: string; role: AppRole } } | { ok: false; error: string }`
  - `inviteErrorToStatus(message: string | undefined): number`
  - `buildRedirectUrl(origin: unknown): string | null`

- [ ] **Step 1: Write the failing test**

Create `supabase/functions/invite-user/validation.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/functions/invite-user/validation.test.ts`
Expected: FAIL — cannot resolve `./validation`.

- [ ] **Step 3: Write minimal implementation**

Create `supabase/functions/invite-user/validation.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/functions/invite-user/validation.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/invite-user/validation.ts supabase/functions/invite-user/validation.test.ts
git -c commit.gpgsign=false commit -m "feat(invite): pure validation and error mapping for invite-user"
```

---

### Task 2: Edge Function handler `invite-user`

**Files:**
- Create: `supabase/functions/invite-user/index.ts`

**Interfaces:**
- Consumes: `validateInviteInput`, `inviteErrorToStatus`, `buildRedirectUrl` from `./validation.ts` (Task 1).
- Produces: HTTP endpoint `POST invite-user` with body `{ email, fullName, role, origin }`. Responses: `200 { success: true, warning? }`, `400`, `401`, `403`, `409`, `500`.

This task has no unit test (the `serve()` handler imports remote Deno/esm.sh modules that don't resolve under node Vitest, matching `infer-cloud/index.ts`). Verification is `deno check` plus end-to-end manual testing in Task 6.

- [ ] **Step 1: Write the handler**

Create `supabase/functions/invite-user/index.ts`:

```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateInviteInput, inviteErrorToStatus, buildRedirectUrl } from './validation.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Authenticate the caller from the JWT.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401)
    }
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
    const { data: { user }, error: authError } =
      await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return json({ error: 'Unauthorized' }, 401)
    }

    // 2. Authorize: caller must be an admin.
    const { data: callerRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    if (roleError || !callerRole || callerRole.role !== 'admin') {
      return json({ error: 'Forbidden' }, 403)
    }

    // 3. Validate the request body.
    const body = await req.json().catch(() => null)
    const validation = validateInviteInput(body)
    if (!validation.ok) {
      return json({ error: validation.error }, 400)
    }
    const redirectTo = buildRedirectUrl((body as Record<string, unknown>)?.origin)
    if (!redirectTo) {
      return json({ error: 'Invalid origin' }, 400)
    }
    const { email, fullName, role } = validation.value

    // 4. Invite the user (creates an unconfirmed auth.users row + sends email).
    //    The handle_new_user trigger inserts a default 'viewer' role row.
    const { data: invited, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName },
        redirectTo,
      })
    if (inviteError || !invited?.user) {
      return json(
        { error: inviteError?.message ?? 'Invite failed' },
        inviteErrorToStatus(inviteError?.message)
      )
    }

    // 5. Override the default role with the chosen one (service role bypasses RLS).
    let warning: string | undefined
    const { error: upsertError } = await supabaseAdmin
      .from('user_roles')
      .upsert({ user_id: invited.user.id, role }, { onConflict: 'user_id' })
    if (upsertError) {
      console.error('Role upsert failed after invite:', upsertError)
      warning = 'invited_but_role_not_set'
    }

    return json({ success: true, ...(warning ? { warning } : {}) }, 200)
  } catch (error) {
    console.error('Error:', error)
    return json({ error: (error as Error).message }, 500)
  }
})
```

- [ ] **Step 2: Type-check the function with Deno**

Run: `deno check supabase/functions/invite-user/index.ts`
Expected: no type errors (remote modules download on first run).

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/invite-user/index.ts
git -c commit.gpgsign=false commit -m "feat(invite): invite-user edge function with admin guard and role assignment"
```

---

### Task 3: Lógica pura de cliente (mapeo de error + validación de contraseña)

**Files:**
- Create: `src/lib/invitations.ts`
- Test: `src/lib/invitations.test.ts`

**Interfaces:**
- Consumes: nada (módulo sin imports con efectos — NO importa el cliente Supabase, para que el test cargue limpio en node).
- Produces:
  - `type AppRole = 'viewer' | 'researcher' | 'admin'`
  - `inviteErrorKey(status: number | undefined): string` → clave i18n
  - `validateNewPassword(password: string, confirm: string): string | null` → clave i18n o `null` si válida

- [ ] **Step 1: Write the failing test**

Create `src/lib/invitations.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/invitations.test.ts`
Expected: FAIL — cannot resolve `./invitations`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/invitations.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/invitations.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/invitations.ts src/lib/invitations.test.ts
git -c commit.gpgsign=false commit -m "feat(invite): client-side error mapping and password validation helpers"
```

---

### Task 4: Diálogo de invitación + integración en UserManagement + i18n

**Files:**
- Create: `src/components/InviteUserDialog.tsx`
- Modify: `src/pages/UserManagement.tsx` (imports, estado, botón en el header, render del diálogo)
- Modify: `src/lib/i18n.ts` (claves del diálogo en `es` y `en`)

**Interfaces:**
- Consumes: `inviteErrorKey`, `AppRole` from `@/lib/invitations` (Task 3); `supabase.functions.invoke('invite-user', ...)` (Task 2).
- Produces: `InviteUserDialog` component con props `{ onInvited: () => void }`.

No hay infra de tests de componentes React (Vitest corre en `node`, include `*.test.ts`). Verificación: `npm run build` (typecheck) + prueba manual en Task 6.

- [ ] **Step 1: Add i18n keys (Spanish)**

In `src/lib/i18n.ts`, inside `resources.es.translation`, after the existing `"emailPlaceholder"` line, add:

```ts
      // Invitations
      "inviteUser": "Invitar usuario",
      "inviteUserTitle": "Invitar nuevo usuario",
      "inviteUserDescription": "Se enviará un correo de invitación para que la persona active su cuenta.",
      "sendInvite": "Enviar invitación",
      "sendingInvite": "Enviando...",
      "inviteSuccess": "Invitación enviada",
      "inviteSuccessDescription": "Se ha enviado un correo de invitación.",
      "inviteWarningRoleNotSet": "Usuario invitado, pero el rol no se pudo asignar. Ajústalo manualmente.",
      "inviteErrorInvalid": "Datos de invitación inválidos.",
      "inviteErrorUnauthorized": "Tu sesión ha expirado. Vuelve a iniciar sesión.",
      "inviteErrorForbidden": "No tienes permisos para invitar usuarios.",
      "inviteErrorExists": "Ese email ya tiene una cuenta.",
      "inviteErrorGeneric": "No se pudo enviar la invitación. Inténtalo de nuevo.",
```

- [ ] **Step 2: Add i18n keys (English)**

In `src/lib/i18n.ts`, inside `resources.en.translation`, locate the matching English `"emailPlaceholder"` entry and add immediately after it:

```ts
      // Invitations
      "inviteUser": "Invite user",
      "inviteUserTitle": "Invite a new user",
      "inviteUserDescription": "An invitation email will be sent so the person can activate their account.",
      "sendInvite": "Send invitation",
      "sendingInvite": "Sending...",
      "inviteSuccess": "Invitation sent",
      "inviteSuccessDescription": "An invitation email has been sent.",
      "inviteWarningRoleNotSet": "User invited, but the role could not be set. Adjust it manually.",
      "inviteErrorInvalid": "Invalid invitation data.",
      "inviteErrorUnauthorized": "Your session has expired. Please sign in again.",
      "inviteErrorForbidden": "You do not have permission to invite users.",
      "inviteErrorExists": "That email already has an account.",
      "inviteErrorGeneric": "Could not send the invitation. Please try again.",
```

> If the `en` block has no `"emailPlaceholder"` key, add these keys after its `"accountCreationError"` entry instead. The keys must live inside `resources.en.translation`.

- [ ] **Step 3: Create the dialog component**

Create `src/components/InviteUserDialog.tsx`:

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { inviteErrorKey, type AppRole } from '@/lib/invitations'
import { UserPlus } from 'lucide-react'

interface InviteUserDialogProps {
  onInvited: () => void
}

export function InviteUserDialog({ onInvited }: InviteUserDialogProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<AppRole>('viewer')
  const [loading, setLoading] = useState(false)

  const reset = () => {
    setEmail('')
    setFullName('')
    setRole('viewer')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email, fullName, role, origin: window.location.origin },
      })
      if (error) {
        const status = (error as { context?: { status?: number } })?.context?.status
        toast({
          title: t('error'),
          description: t(inviteErrorKey(status)),
          variant: 'destructive',
        })
        return
      }
      if (data?.warning) {
        toast({ title: t('inviteSuccess'), description: t('inviteWarningRoleNotSet') })
      } else {
        toast({ title: t('inviteSuccess'), description: t('inviteSuccessDescription') })
      }
      reset()
      setOpen(false)
      onInvited()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          {t('inviteUser')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('inviteUserTitle')}</DialogTitle>
          <DialogDescription>{t('inviteUserDescription')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">{t('email')}</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-name">{t('fullName')}</Label>
            <Input
              id="invite-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('role')}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">{t('viewer')}</SelectItem>
                <SelectItem value="researcher">{t('researcher')}</SelectItem>
                <SelectItem value="admin">{t('administrator')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('sendingInvite') : t('sendInvite')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Wire the dialog into UserManagement**

In `src/pages/UserManagement.tsx`:

a. Add the import after the existing `useAuthStore` import (line 11):

```tsx
import { InviteUserDialog } from '@/components/InviteUserDialog';
```

b. Replace the page header block (lines 163-168, the `<div className="mb-6">…</div>`) with a header that includes the invite button:

```tsx
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('userManagement')}</h1>
          <p className="text-muted-foreground">
            {t('manageUsersDescription')}
          </p>
        </div>
        <InviteUserDialog onInvited={fetchUsers} />
      </div>
```

(`fetchUsers` is already defined in this component and refreshes the list.)

- [ ] **Step 5: Type-check the build**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/InviteUserDialog.tsx src/pages/UserManagement.tsx src/lib/i18n.ts
git -c commit.gpgsign=false commit -m "feat(invite): invite dialog wired into user management"
```

---

### Task 5: Página de aceptación `/accept-invite` + ruta + i18n

**Files:**
- Create: `src/pages/AcceptInvite.tsx`
- Modify: `src/App.tsx` (import + ruta pública)
- Modify: `src/lib/i18n.ts` (claves de la página en `es` y `en`)

**Interfaces:**
- Consumes: `validateNewPassword` from `@/lib/invitations` (Task 3); `supabase.auth.getSession`, `supabase.auth.onAuthStateChange`, `supabase.auth.updateUser`.
- Produces: ruta `/accept-invite` (pública).

Verificación: `npm run build` + prueba manual end-to-end en Task 6.

- [ ] **Step 1: Add i18n keys (Spanish)**

In `src/lib/i18n.ts`, inside `resources.es.translation`, right after the invitation keys added in Task 4, add:

```ts
      // Accept invite
      "acceptInviteTitle": "Establece tu contraseña",
      "acceptInviteDescription": "Crea una contraseña para activar tu cuenta.",
      "setPassword": "Establecer contraseña",
      "settingPassword": "Guardando...",
      "passwordTooShort": "La contraseña debe tener al menos 6 caracteres.",
      "inviteLinkInvalid": "Este enlace de invitación no es válido o ha caducado.",
      "inviteAccepted": "Cuenta activada",
      "goToLogin": "Ir a iniciar sesión",
```

- [ ] **Step 2: Add i18n keys (English)**

In `src/lib/i18n.ts`, inside `resources.en.translation`, right after the invitation keys added in Task 4, add:

```ts
      // Accept invite
      "acceptInviteTitle": "Set your password",
      "acceptInviteDescription": "Create a password to activate your account.",
      "setPassword": "Set password",
      "settingPassword": "Saving...",
      "passwordTooShort": "The password must be at least 6 characters.",
      "inviteLinkInvalid": "This invitation link is invalid or has expired.",
      "inviteAccepted": "Account activated",
      "goToLogin": "Go to sign in",
```

- [ ] **Step 3: Create the AcceptInvite page**

Create `src/pages/AcceptInvite.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { validateNewPassword } from '@/lib/invitations'

export default function AcceptInvite() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // The invite link establishes a session by parsing tokens from the URL.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setHasSession(true)
        setChecking(false)
      }
    })
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session)
      setChecking(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errorKey = validateNewPassword(password, confirm)
    if (errorKey) {
      toast({ title: t('authError'), description: t(errorKey), variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast({ title: t('inviteAccepted') })
      navigate('/app')
    } catch (error: any) {
      toast({ title: t('authError'), description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {t('loading')}
      </div>
    )
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{t('inviteLinkInvalid')}</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/login')}>{t('goToLogin')}</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ocean-50 to-primary-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary-700">
            {t('acceptInviteTitle')}
          </CardTitle>
          <CardDescription>{t('acceptInviteDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">{t('password')}</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">{t('confirmPassword')}</Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('settingPassword') : t('setPassword')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Register the route**

In `src/App.tsx`:

a. Add the import after the existing `import Auth from "./pages/Auth";` line:

```tsx
import AcceptInvite from "./pages/AcceptInvite";
```

b. Add the route inside the `{/* Public routes */}` group, after the `/auth` route:

```tsx
            <Route path="/accept-invite" element={<AcceptInvite />} />
```

- [ ] **Step 5: Type-check the build**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/AcceptInvite.tsx src/App.tsx src/lib/i18n.ts
git -c commit.gpgsign=false commit -m "feat(invite): accept-invite page and public route"
```

---

### Task 6: Configuración de Supabase + verificación end-to-end (manual, Fernando)

**Files:** ninguno (pasos de configuración y verificación manual; no se commitea código).

Estos pasos no pueden automatizarse desde el agente: requieren la consola de Supabase/Lovable Cloud, despliegue de la Edge Function y un email real. El agente deja el checklist; Fernando lo ejecuta.

- [ ] **Step 1: Allowlist de Redirect URL**

En Supabase Auth → URL Configuration, añadir a *Redirect URLs* la ruta `/accept-invite` para cada origen usado:
- Preview de Lovable: `https://<id>.lovableproject.com/accept-invite` (o el dominio del preview).
- Producción / dominio final: `https://<dominio>/accept-invite`.

Sin esto, el enlace del email de invitación será rechazado por Supabase.

- [ ] **Step 2: Desplegar la Edge Function**

Asegurar que `invite-user` se despliega (push a GitHub + rebuild de Lovable, igual que `infer-cloud`). Las variables `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` ya existen en el entorno de funciones (las usa `get-users-with-roles`).

- [ ] **Step 3: Prueba feliz (admin invita)**

Como admin, en `/app/users`: pulsar "Invitar usuario", introducir un email real propio, nombre y rol `researcher`. Verificar:
- Toast "Invitación enviada".
- El usuario aparece en la lista con rol `researcher` y "Último acceso: Nunca".

- [ ] **Step 4: Prueba feliz (invitado acepta)**

Abrir el email recibido, pulsar el enlace → debe aterrizar en `/accept-invite`. Establecer una contraseña (≥6 caracteres, ambas iguales). Verificar:
- Toast "Cuenta activada" y redirección a `/app`.
- Cerrar sesión e iniciar sesión con email + nueva contraseña funciona.
- El rol efectivo es `researcher` (acceso acorde; no ve la gestión de usuarios de admin).

- [ ] **Step 5: Pruebas de error**

- Invitar un email que ya tiene cuenta → toast "Ese email ya tiene una cuenta".
- Abrir `/accept-invite` directamente sin sesión (sin enlace) → tarjeta "enlace no válido o caducado" + botón a login.
- En el formulario de aceptación, contraseñas distintas → toast de error sin enviar.

- [ ] **Step 6: Confirmar resultado**

Anotar el resultado de la verificación. Si todo pasa, la rama `feat/user-invitations` queda lista para que Fernando haga `git push` y abra PR.

---

## Notas de implementación

- **Orden de tareas:** 1 → 2 → 3 → 5 pueden hacerse en cualquier orden tras la 1/3; la 4 depende de 3 (helpers) y la 5 depende de 3. La 6 es la última (requiere todo desplegado).
- **Sin migración:** se reutiliza el esquema existente. Si en el futuro se quisiera revocar/reenviar invitaciones, ahí sí haría falta una tabla de invitaciones — fuera de alcance.
- **Mejora respecto al spec:** el `redirectTo` se construye desde `origin` enviado por el cliente (validado en `buildRedirectUrl`), evitando configurar un env `SITE_URL` y funcionando igual en preview y producción.
