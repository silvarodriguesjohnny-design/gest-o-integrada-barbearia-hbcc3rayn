import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

function generatePassword(length = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length]
  }
  return result
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()

    if (!callerProfile?.is_super_admin) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas super admins podem convidar usuários.' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    const { email, role, tenant_id } = await req.json()

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Email inválido.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      return new Response(JSON.stringify({ error: 'Este email já está cadastrado.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const tempPassword = generatePassword()

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: role || 'operator', invited_by: user.email },
    })

    if (createError) {
      const lower = createError.message.toLowerCase()
      const msg = lower.includes('already') || lower.includes('registered') || lower.includes('taken')
        ? 'Este email já está cadastrado.'
        : createError.message
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const origin =
      req.headers.get('origin') ||
      'https://gestao-integrada-barbearia-a3c26.goskip.app'

    const resetRes = await fetch(`${supabaseUrl}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
      },
      body: JSON.stringify({ email, redirectTo: `${origin}/set-password` }),
    })

    if (!resetRes.ok) {
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      return new Response(
        JSON.stringify({ error: 'Falha ao enviar email de convite. Tente novamente.' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    await adminClient
      .from('profiles')
      .update({ role: role || 'operator', tenant_id: tenant_id || null })
      .eq('id', newUser.user.id)

    await adminClient.from('invitations').insert({
      email,
      role: role || 'operator',
      tenant_id: tenant_id || null,
      invited_by: user.id,
      status: 'email_sent',
    })

    return new Response(
      JSON.stringify({ success: true, message: `Convite enviado para ${email}` }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor.', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  }
})
