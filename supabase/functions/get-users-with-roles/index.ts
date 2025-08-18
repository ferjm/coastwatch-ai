import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // Verify user is authenticated
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // Check if user has admin role
    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!userRoles || userRoles.role !== 'admin') {
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }

    // Get user roles and profiles using admin client
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      return new Response(JSON.stringify({ error: usersError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get user roles using admin client
    const { data: rolesData, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role')
    
    if (rolesError) {
      console.error('Error fetching roles:', rolesError)
      return new Response(JSON.stringify({ error: rolesError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get user profiles using admin client
    const { data: profilesData, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url')
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return new Response(JSON.stringify({ error: profilesError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Combine users with their roles and profiles
    const usersWithRoles = usersData.users.map(authUser => {
      const userRole = rolesData?.find(role => role.user_id === authUser.id)
      const userProfile = profilesData?.find(profile => profile.id === authUser.id)
      
      return {
        id: authUser.id,
        email: authUser.email,
        full_name: userProfile?.full_name || null,
        avatar_url: userProfile?.avatar_url || null,
        role: userRole?.role || 'no-role',
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at
      }
    })

    return new Response(JSON.stringify(usersWithRoles), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})