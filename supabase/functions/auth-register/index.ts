// Supabase Edge Function for secure user registration
// Uses Supabase Auth with proper password hashing

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RegisterRequest {
  name: string
  phone: string
  password: string
  address?: string
  latitude?: number
  longitude?: number
  companyCode?: string
  role: 'client' | 'manager' | 'driver' | 'company_admin'
  // Note: joinExisting removed - manager must always join existing company
  // company_admin is the only role that can create new company with Master Code
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

    const { name, phone, password, address, latitude, longitude, companyCode, role }: RegisterRequest = await req.json()

    // Validate input
    if (!name || !phone || !password || !role) {
      throw new Error('Sva polja su obavezna')
    }

    if (password.length < 6) {
      throw new Error('Lozinka mora imati najmanje 6 karaktera')
    }

    // Check if phone already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', phone)
      .is('deleted_at', null)
      .single()

    if (existingUser) {
      throw new Error('Korisnik sa ovim brojem telefona već postoji')
    }

    // Use phone as email for Supabase Auth (phone@eco.local)
    const fakeEmail = `${phone.replace(/[^0-9]/g, '')}@eco.local`

    let finalCompanyCode: string | null = null
    let companyName: string | null = null
    let isOwner = false
    let assignedRole = role

    // Handle role-specific logic
    if (role === 'client' || role === 'driver') {
      // Both clients and drivers need a valid company ECO code
      if (!companyCode) throw new Error(role === 'driver' ? 'Kod firme je obavezan za vozača' : 'Kod firme je obavezan za klijenta')

      const { data: company, error: companyError } = await supabaseAdmin
        .from('companies')
        .select('*')
        .eq('code', companyCode.toUpperCase())
        .is('deleted_at', null)
        .single()

      if (companyError || !company) {
        throw new Error('Nevažeći kod firme')
      }

      finalCompanyCode = company.code
      companyName = company.name

    } else if (role === 'manager') {
      // Manager MUST join existing company (no Master Code option)
      if (!companyCode) throw new Error('Kod firme je obavezan')

      const { data: company, error: companyError } = await supabaseAdmin
        .from('companies')
        .select('*')
        .eq('code', companyCode.toUpperCase())
        .is('deleted_at', null)
        .single()

      if (companyError || !company) {
        throw new Error('Nevažeći kod firme')
      }

      finalCompanyCode = company.code
      companyName = company.name

    } else if (role === 'company_admin') {
      // Company Admin creates new company with Master Code
      if (!companyCode) throw new Error('Master kod je obavezan')

      const { data: masterCode, error: mcError } = await supabaseAdmin
        .from('master_codes')
        .select('*')
        .eq('code', companyCode.toUpperCase())
        .eq('status', 'available')
        .single()

      if (mcError || !masterCode) {
        throw new Error('Nevažeći ili već iskorišćeni Master Code')
      }

      // Generate unique company code
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      let newCompanyCode: string
      let isUnique = false

      while (!isUnique) {
        newCompanyCode = 'ECO-' + Array.from({ length: 4 }, () =>
          chars[Math.floor(Math.random() * chars.length)]
        ).join('')

        const { data: existing } = await supabaseAdmin
          .from('companies')
          .select('id')
          .eq('code', newCompanyCode)
          .single()

        if (!existing) isUnique = true
      }

      // Create company
      const { data: newCompany, error: createError } = await supabaseAdmin
        .from('companies')
        .insert({
          code: newCompanyCode!,
          name: name + ' Firma',
          master_code_id: masterCode.id
        })
        .select()
        .single()

      if (createError) throw createError

      finalCompanyCode = newCompanyCode!
      companyName = newCompany.name
      isOwner = true
      assignedRole = 'company_admin'

      // Mark master code as used
      await supabaseAdmin
        .from('master_codes')
        .update({ status: 'used', used_by_company: newCompany.id })
        .eq('id', masterCode.id)
    }

    // Create Supabase Auth user (handles password hashing automatically)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: fakeEmail,
      password: password,
      email_confirm: true, // Auto-confirm since we're not using real email
      user_metadata: {
        name: name,
        phone: phone,
        role: role
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      throw new Error('Greška pri kreiranju naloga: ' + authError.message)
    }

    // Create user profile in public.users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_id: authData.user.id,
        name: name,
        phone: phone,
        address: address || null,
        latitude: latitude || null,
        longitude: longitude || null,
        role: assignedRole,
        company_code: finalCompanyCode,
        is_owner: isOwner
      })
      .select()
      .single()

    if (userError) {
      // Rollback: delete auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      console.error('User profile error:', userError)
      throw new Error('Greška pri kreiranju profila')
    }

    // If company_admin created new company, update manager_id
    if (role === 'company_admin' && finalCompanyCode) {
      await supabaseAdmin
        .from('companies')
        .update({ manager_id: userData.id })
        .eq('code', finalCompanyCode)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Registracija uspešna',
        user: {
          id: userData.id,
          name: userData.name,
          phone: userData.phone,
          role: userData.role
        },
        companyCode: finalCompanyCode,
        companyName: companyName
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Registration error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Došlo je do greške'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
