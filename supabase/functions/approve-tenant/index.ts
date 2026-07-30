import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let result = ''
  for (let i = 0; i < length; i++) result += chars[bytes[i] % chars.length]
  return result
}

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') +
    '-' +
    Math.random().toString(36).substring(2, 8)
  )
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
    } = await userClient.auth.getUser()
    if (!user)
      return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()
    if (!callerProfile?.is_super_admin) {
      return new Response(
        JSON.stringify({ error: 'Apenas super admins podem aprovar cadastros.' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    const body = await req.json()
    let data: any

    if (body.pending_tenant_id) {
      const { data: pt } = await adminClient
        .from('pending_tenants')
        .select('*')
        .eq('id', body.pending_tenant_id)
        .single()
      if (!pt)
        return new Response(JSON.stringify({ error: 'Cadastro pendente não encontrado.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      data = pt
    } else {
      data = body
    }

    const tempPassword = generatePassword()
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: data.full_name },
    })
    if (createError)
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })

    const slug = generateSlug(data.nome_negocio)
    const { data: tenant, error: tError } = await adminClient
      .from('tenants')
      .insert({
        name: data.nome_negocio,
        owner_id: newUser.user.id,
        slug,
        status: 'active',
        plan_type: 'essential',
        subscription_type: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      })
      .select()
      .single()
    if (tError)
      return new Response(JSON.stringify({ error: tError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })

    await adminClient
      .from('profiles')
      .update({
        role: 'admin',
        tenant_id: tenant.id,
        full_name: data.full_name,
        phone: data.phone || null,
      })
      .eq('id', newUser.user.id)

    if (body.pending_tenant_id) {
      await adminClient
        .from('pending_tenants')
        .update({ status: 'approved', tenant_id: tenant.id })
        .eq('id', body.pending_tenant_id)
    }

    const origin =
      req.headers.get('origin') || 'https://gestao-integrada-barbearia-a3c26.goskip.app'
    await adminClient.from('email_logs').insert({
      tenant_id: tenant.id,
      recipient: data.email,
      subject: 'Bem-vindo ao Na Régua! Sua barbearia foi aprovada',
      body: `Olá ${data.full_name}! Sua barbearia "${data.nome_negocio}" foi aprovada.\n\nEmail: ${data.email}\nSenha temporária: ${tempPassword}\nAcesse: ${origin}/login`,
      status: 'simulated',
    })

    return new Response(
      JSON.stringify({
        success: true,
        tenant_id: tenant.id,
        message: 'Barbearia aprovada com sucesso.',
      }),
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
