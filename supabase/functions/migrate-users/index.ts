// Supabase Edge Function to migrate existing users to Supabase Auth
// Run this ONCE after deploying the new auth system

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get service role key from environment
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    // Create admin client - Edge Functions automatically have access to service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get all users without auth_id (not yet migrated)
    const { data: usersToMigrate, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, name, phone, password, role')
      .is('auth_id', null)
      .is('deleted_at', null)

    if (fetchError) throw fetchError

    if (!usersToMigrate || usersToMigrate.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No users to migrate', migrated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = {
      total: usersToMigrate.length,
      migrated: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const user of usersToMigrate) {
      try {
        // Create fake email from phone
        const fakeEmail = `${user.phone.replace(/[^0-9]/g, '')}@eco.local`

        // Check if auth user already exists with this email
        const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingAuth = existingAuthUsers?.users?.find(u => u.email === fakeEmail)

        let authUserId: string

        if (existingAuth) {
          // Auth user exists, just link it
          authUserId = existingAuth.id
        } else {
          // Create new auth user
          // Note: Using the existing password - Supabase will hash it
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: fakeEmail,
            password: user.password, // Supabase Auth will hash this
            email_confirm: true,
            user_metadata: {
              name: user.name,
              phone: user.phone,
              role: user.role,
              migrated: true,
              migrated_at: new Date().toISOString()
            }
          })

          if (authError) {
            throw new Error(`Auth creation failed: ${authError.message}`)
          }

          authUserId = authData.user.id
        }

        // Update user record with auth_id
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ auth_id: authUserId })
          .eq('id', user.id)

        if (updateError) {
          throw new Error(`Update failed: ${updateError.message}`)
        }

        results.migrated++
        console.log(`Migrated user: ${user.phone} (${user.name})`)

      } catch (userError) {
        results.failed++
        results.errors.push(`User ${user.phone}: ${userError.message}`)
        console.error(`Failed to migrate user ${user.phone}:`, userError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Migration complete`,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Migration error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Migration failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
