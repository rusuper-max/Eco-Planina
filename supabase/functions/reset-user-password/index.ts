// Supabase Edge Function for admin password reset
// Allows Company Admin and Dev/App Admin to reset user passwords

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ResetPasswordRequest {
  targetUserId: string  // User whose password will be reset
  newPassword: string   // New password to set
}

// Role hierarchy for permission checking
const ROLE_HIERARCHY: Record<string, number> = {
  developer: 100,
  admin: 90,
  company_admin: 80,
  manager: 70,
  driver: 60,
  client: 50,
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get the JWT from authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Niste autorizovani')
    }

    // Verify the JWT and get the user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !authUser) {
      throw new Error('Nevazeci token')
    }

    // Get the requesting user's profile
    const { data: requestingUser, error: reqUserError } = await supabaseAdmin
      .from('users')
      .select('id, role, company_code, is_owner')
      .eq('auth_id', authUser.id)
      .is('deleted_at', null)
      .single()

    if (reqUserError || !requestingUser) {
      throw new Error('Korisnik nije pronadjen')
    }

    const { targetUserId, newPassword }: ResetPasswordRequest = await req.json()

    // Validate input
    if (!targetUserId || !newPassword) {
      throw new Error('ID korisnika i nova lozinka su obavezni')
    }

    if (newPassword.length < 6) {
      throw new Error('Lozinka mora imati najmanje 6 karaktera')
    }

    // Get target user
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, auth_id, name, role, company_code')
      .eq('id', targetUserId)
      .is('deleted_at', null)
      .single()

    if (targetError || !targetUser) {
      throw new Error('Ciljni korisnik nije pronadjen')
    }

    // Permission checks
    const requestingRole = requestingUser.role
    const targetRole = targetUser.role

    // 1. Developer and Admin can reset anyone except other developer/admin
    if (requestingRole === 'developer' || requestingRole === 'admin') {
      if (targetRole === 'developer' || targetRole === 'admin') {
        throw new Error('Ne mozete resetovati lozinku drugom administratoru')
      }
      // OK - can reset
    }
    // 2. Company Admin can only reset users in their company with lower role
    else if (requestingRole === 'company_admin' || requestingUser.is_owner) {
      // Must be same company
      if (targetUser.company_code !== requestingUser.company_code) {
        throw new Error('Ne mozete resetovati lozinku korisnika iz druge firme')
      }
      // Can only reset lower roles (manager, driver, client)
      const targetPriority = ROLE_HIERARCHY[targetRole] || 0
      const requesterPriority = ROLE_HIERARCHY['company_admin']

      if (targetPriority >= requesterPriority) {
        throw new Error('Mozete resetovati lozinku samo menadzerima, vozacima i klijentima')
      }
      // OK - can reset
    }
    // 3. Others cannot reset passwords
    else {
      throw new Error('Nemate dozvolu za ovu akciju')
    }

    // Check if target user has auth_id
    if (!targetUser.auth_id) {
      throw new Error('Korisnik nema povezan auth nalog')
    }

    // Reset the password using Supabase Admin API
    const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUser.auth_id,
      { password: newPassword }
    )

    if (resetError) {
      console.error('Password reset error:', resetError)
      throw new Error('Greska pri resetovanju lozinke: ' + resetError.message)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Lozinka za ${targetUser.name} je uspesno resetovana`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Reset password error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Doslo je do greske'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
