import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendWhatsAppMessage } from '../_shared/evolution-api.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM = Deno.env.get('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev'

async function sendViaResend(
  to: string,
  subject: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) return { success: false, error: 'RESEND_API_KEY not configured' }
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, text: body }),
    })
    if (!resp.ok) {
      const errBody = await resp.text()
      return { success: false, error: `Resend API error ${resp.status}: ${errBody}` }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    const { to, subject, body, tenant_id, phone, whatsapp_message } = await req.json()

    if (!to || !subject) {
      return new Response(JSON.stringify({ error: 'Destinatário e assunto são obrigatórios.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const resendResult = await sendViaResend(to, subject, body || '')
    const emailStatus = resendResult.success ? 'sent' : 'simulated'

    const { error: logError } = await supabase.from('email_logs').insert({
      tenant_id: tenant_id || null,
      recipient: to,
      subject,
      body: body || '',
      status: emailStatus,
    })

    if (logError) {
      console.error('[send-email] Failed to log email:', logError.message)
    }

    if (phone && whatsapp_message) {
      try {
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
          const waResult = await sendWhatsAppMessage(config, phone, whatsapp_message)
          await supabase.from('notification_logs').insert({
            tenant_id: waConfigRow.tenant_id || tenant_id || null,
            channel: 'whatsapp_registration',
            body: whatsapp_message.slice(0, 200),
            status: waResult.success ? 'sent' : 'failed',
            notification_type: 'registration_confirmation',
            sent_at: new Date().toISOString(),
          })
        }
      } catch (waErr) {
        console.error('[send-email] WhatsApp send failed:', String(waErr))
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_status: emailStatus,
        resend_error: resendResult.success ? null : resendResult.error,
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
