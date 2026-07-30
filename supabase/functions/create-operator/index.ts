import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

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
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()
    if (userError || !user)
      return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('is_super_admin, role, tenant_id')
      .eq('id', user.id)
      .single()
    if (!callerProfile?.is_super_admin && callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acesso negado.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const { name, email, password, phone, role, tenant_id } = await req.json()
    const targetTenantId = callerProfile.is_super_admin
      ? tenant_id || callerProfile.tenant_id
      : callerProfile.tenant_id

    if (!email || !password || !name) {
      return new Response(JSON.stringify({ error: 'Nome, email e senha são obrigatórios.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: role || 'operator' },
    })
    if (createError)
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })

    await adminClient
      .from('profiles')
      .update({
        role: role || 'operator',
        tenant_id: targetTenantId,
        full_name: name,
        phone: phone || null,
      })
      .eq('id', newUser.user.id)

    await adminClient.from('email_logs').insert({
      tenant_id: targetTenantId,
      recipient: email,
      subject: 'Bem-vindo à equipe!',
      body: `Olá ${name}, sua conta foi criada. Email: ${email}. Acesse: ${req.headers.get('origin') || 'https://gestao-integrada-barbearia-a3c26.goskip.app'}/login`,
      status: 'simulated',
    })

    return new Response(
      JSON.stringify({ success: true, message: `Operador ${name} criado com sucesso.` }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
