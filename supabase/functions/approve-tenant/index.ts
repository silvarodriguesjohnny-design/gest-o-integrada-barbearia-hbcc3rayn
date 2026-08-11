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

    const pendingTenantId = body.pending_tenant_id || body.pendingTenantId
    if (!pendingTenantId) return jsonResponse({ error: 'pending_tenant_id is required' }, 400)

    const { data: pending, error: fetchError } = await supabase
      .from('pending_tenants')
      .select('*')
      .eq('id', pendingTenantId)
      .single()
    if (fetchError || !pending) return jsonResponse({ error: 'Pending tenant not found' }, 404)
    if (pending.status === 'approved')
      return jsonResponse({ error: 'Tenant already approved' }, 409)

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: pending.nome_negocio,
        plan_type: 'essential',
        subscription_status: 'active',
        subscription_type: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        full_name: pending.full_name,
        email: pending.email,
        phone: pending.phone,
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
      .select()
      .single()
    if (tenantError || !tenant)
      return jsonResponse({ error: 'Failed to create tenant', details: tenantError?.message }, 500)

    let userCreated = false
    let profileCreated = false
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: pending.email,
      password: 'Skip@Pass',
      email_confirm: true,
      user_metadata: { full_name: pending.full_name },
    })

    if (!authError && authData.user) {
      userCreated = true
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: authData.user.id,
          email: pending.email,
          full_name: pending.full_name,
          role: 'admin',
          tenant_id: tenant.id,
          is_super_admin: false,
        },
        { onConflict: 'id' },
      )
      profileCreated = !profileError
      await supabase.from('tenants').update({ owner_id: authData.user.id }).eq('id', tenant.id)
    } else {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', pending.email)
        .limit(1)
        .maybeSingle()
      if (existingProfile) {
        userCreated = true
        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: existingProfile.id,
            email: pending.email,
            full_name: pending.full_name,
            role: 'admin',
            tenant_id: tenant.id,
            is_super_admin: false,
          },
          { onConflict: 'id' },
        )
        profileCreated = !profileError
        await supabase.from('tenants').update({ owner_id: existingProfile.id }).eq('id', tenant.id)
      }
    }

    await supabase
      .from('pending_tenants')
      .update({ status: 'approved', tenant_id: tenant.id })
      .eq('id', pendingTenantId)

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
      { error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown' },
      500,
    )
  }
})
