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
