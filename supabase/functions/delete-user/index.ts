import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)
    const anon = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '')
    const { data: { user }, error: authError } = await anon.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const { data: callerRole } = await admin.from('user_roles').select('role').eq('user_id', user.id).single()
    if (callerRole?.role !== 'admin') return json({ error: 'Forbidden' }, 403)

    const body = await req.json().catch(() => null)
    const userId = body?.userId
    if (typeof userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(userId)) {
      return json({ error: 'Invalid userId' }, 400)
    }
    if (userId === user.id) return json({ error: 'cannot_delete_self' }, 400)

    // Keep uploaded images: reassign them to the admin performing the deletion.
    const { error: reassignError } = await admin.from('images').update({ user_id: user.id }).eq('user_id', userId)
    if (reassignError) return json({ error: reassignError.message }, 500)

    const { error: delError } = await admin.auth.admin.deleteUser(userId)
    if (delError) return json({ error: delError.message }, 500)

    return json({ success: true }, 200)
  } catch (error) {
    console.error('Error:', error)
    return json({ error: (error as Error).message }, 500)
  }
})
