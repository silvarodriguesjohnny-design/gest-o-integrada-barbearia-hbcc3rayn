import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendWhatsAppMessage } from '../_shared/evolution-api.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', Connection: 'keep-alive', ...corsHeaders },
  })
}

function generateSlug(name: string): string {
  const clean = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
  return `${clean || 'barbearia'}-${Math.floor(1000 + Math.random() * 9000)}`
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM = Deno.env.get('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev'

async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, text: body }),
    })
    return resp.ok
  } catch {
    return false
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey)
      return jsonResponse({ error: 'Server configuration missing' }, 500)

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const body = await req.json().catch(() => null)
    if (!body) return jsonResponse({ error: 'Invalid request body' }, 400)

    let pending: any = null
    const pendingTenantId = body.pending_tenant_id || body.pendingTenantId || body.id

    if (pendingTenantId) {
      const { data, error: fetchError } = await supabase
        .from('pending_tenants')
        .select('*')
        .eq('id', pendingTenantId)
        .maybeSingle()

      if (fetchError) {
        return jsonResponse(
          { error: 'Database error fetching pending tenant', details: fetchError.message },
          500,
        )
      }
      pending = data
    }

    if (!pending && body.full_name && body.email && body.nome_negocio) {
      const payload = {
        full_name: String(body.full_name).trim(),
        email: String(body.email).trim().toLowerCase(),
        phone: body.phone ? String(body.phone).trim() : null,
        cpf_cnpj: body.cpf_cnpj ? String(body.cpf_cnpj).trim() : null,
        cep: body.cep ? String(body.cep).trim() : null,
        rua: body.rua ? String(body.rua).trim() : null,
        numero: body.numero ? String(body.numero).trim() : null,
        complemento: body.complemento ? String(body.complemento).trim() : null,
        bairro: body.bairro ? String(body.bairro).trim() : null,
        cidade: body.cidade ? String(body.cidade).trim() : null,
        estado: body.estado ? String(body.estado).trim() : null,
        nome_negocio: String(body.nome_negocio).trim(),
        numero_cadeiras: Number(body.numero_cadeiras) || 1,
        quantidade_profissionais: Number(body.quantidade_profissionais) || 1,
        horario_funcionamento: body.horario_funcionamento
          ? String(body.horario_funcionamento).trim()
          : null,
        status: 'pending',
      }

      const { data: createdPending, error: createPendingError } = await supabase
        .from('pending_tenants')
        .insert([payload])
        .select('*')
        .single()

      if (createPendingError || !createdPending) {
        return jsonResponse(
          { error: 'Failed to record pending tenant', details: createPendingError?.message },
          500,
        )
      }
      pending = createdPending
    }

    if (!pending) {
      return jsonResponse({ error: 'Pending tenant not found or missing required fields' }, 404)
    }

    if (pending.status === 'approved' && pending.tenant_id) {
      return jsonResponse({
        success: true,
        message: 'Tenant already approved',
        tenantId: pending.tenant_id,
        email_sent: true,
        whatsapp_sent: true,
      })
    }

    const tenantSlug = generateSlug(pending.nome_negocio)

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: pending.nome_negocio,
        slug: tenantSlug,
        plan_type: 'essential',
        subscription_status: 'active',
        subscription_type: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        full_name: pending.full_name,
        email: pending.email,
        phone: pending.phone,
        whatsapp_phone: pending.phone,
        cpf_cnpj: pending.cpf_cnpj,
        cep: pending.cep,
        rua: pending.rua,
        numero: pending.numero,
        complemento: pending.complemento,
        bairro: pending.bairro,
        cidade: pending.cidade,
        estado: pending.estado,
        horario_funcionamento: pending.horario_funcionamento,
        numero_cadeiras: pending.numero_cadeiras || 1,
        quantidade_profissionais: pending.quantidade_profissionais || 1,
      })
      .select('*')
      .single()

    if (tenantError || !tenant) {
      return jsonResponse({ error: 'Failed to create tenant', details: tenantError?.message }, 500)
    }

    let userId: string | null = null
    let userCreated = false
    let profileCreated = false

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: pending.email,
      password: 'Skip@Pass',
      email_confirm: true,
      user_metadata: { full_name: pending.full_name },
    })

    if (!authError && authData?.user) {
      userId = authData.user.id
      userCreated = true
    } else {
      try {
        const { data: usersList } = await supabase.auth.admin.listUsers()
        const match = usersList?.users?.find(
          (u) => u.email?.toLowerCase() === pending.email.toLowerCase(),
        )
        if (match) {
          userId = match.id
          userCreated = true
        }
      } catch (e) {
        console.error('Error listing auth users:', e)
      }

      if (!userId) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', pending.email)
          .maybeSingle()
        if (existingProfile) {
          userId = existingProfile.id
          userCreated = true
        }
      }
    }

    if (userId) {
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: userId,
          email: pending.email,
          full_name: pending.full_name,
          role: 'admin',
          tenant_id: tenant.id,
          is_super_admin: false,
        },
        { onConflict: 'id' },
      )
      profileCreated = !profileError
      await supabase.from('tenants').update({ owner_id: userId }).eq('id', tenant.id)
    }

    await supabase
      .from('pending_tenants')
      .update({ status: 'approved', tenant_id: tenant.id })
      .eq('id', pending.id)

    const emailSubject = 'Sua barbearia foi aprovada! – Na Régua'
    const emailBody = `Olá ${pending.full_name},\n\nSua barbearia "${pending.nome_negocio}" foi aprovada!\n\nVocê já pode acessar o sistema Na Régua.\nEmail: ${pending.email}\nSenha temporária: Skip@Pass\n\nRecomendamos que você altere sua senha após o primeiro acesso.\n\nAtenciosamente,\nEquipe Na Régua`
    const emailSent = await sendEmail(pending.email, emailSubject, emailBody)

    await supabase.from('email_logs').insert({
      tenant_id: tenant.id,
      recipient: pending.email,
      subject: emailSubject,
      body: emailBody,
      status: emailSent ? 'sent' : 'simulated',
    })

    let waSent = false
    if (pending.phone) {
      const { data: waConfigRow } = await supabase
        .from('messaging_configs')
        .select('config_json, tenant_id')
        .eq('channel', 'whatsapp')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (waConfigRow) {
        const raw = (waConfigRow.config_json as Record<string, string>) || {}
        const config = {
          api_key: raw.api_key || '',
          phone_number: raw.phone_number || '',
          base_url: raw.base_url || raw.evolution_base_url || '',
          instance_name: raw.instance_name || raw.evolution_instance || '',
        }
        const waMsg = `🎉 *Sua barbearia foi aprovada!*\n\nOlá ${pending.full_name}! Sua barbearia "${pending.nome_negocio}" foi aprovada no Na Régua.\n\nAcesse o sistema:\nEmail: ${pending.email}\nSenha temporária: Skip@Pass\n\nAltere sua senha após o primeiro acesso!`
        const waResult = await sendWhatsAppMessage(config, pending.phone, waMsg)
        waSent = waResult.success
      }

      await supabase.from('notification_logs').insert({
        tenant_id: tenant.id,
        channel: 'whatsapp_approval',
        body: 'Approval notification',
        status: waSent ? 'sent' : 'failed',
        notification_type: 'approval_confirmation',
        sent_at: new Date().toISOString(),
      })
    }

    return jsonResponse({
      success: true,
      tenantId: tenant.id,
      tenantName: tenant.name,
      userCreated,
      profileCreated,
      email_sent: emailSent,
      whatsapp_sent: waSent,
    })
  } catch (err) {
    return jsonResponse(
      { error: 'Internal server error', details: err instanceof Error ? err.message : String(err) },
      500,
    )
  }
})
