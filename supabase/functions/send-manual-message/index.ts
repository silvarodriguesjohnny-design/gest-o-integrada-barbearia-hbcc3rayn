import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  sendWhatsAppMessage,
  getWhatsAppConfig,
  normalizePhone,
  validateWhatsAppConfig,
} from '../_shared/evolution-api.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    let body: Record<string, any> = {}
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Corpo da requisição JSON inválido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    const { tenant_id, phone, message, customer_name } = body

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Tenant ID não foi fornecido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Telefone do destinatário é obrigatório.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'A mensagem não pode estar vazia.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    // Normalize phone number (sanitizes & prepends country code 55 if needed)
    const formattedPhone = normalizePhone(phone)
    console.log(
      `[send-manual-message] Processing message for Tenant: ${tenant_id} | Raw Phone: "${phone}" | Formatted JID Number: "${formattedPhone}"`,
    )

    if (!formattedPhone || formattedPhone.length < 10) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `O número ${phone} é inválido ou está incompleto.`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    // Fetch tenant messaging credentials from database
    const waConfig = await getWhatsAppConfig(supabase, tenant_id)
    const validationError = validateWhatsAppConfig(waConfig)
    if (validationError) {
      console.error('[send-manual-message] Credentials validation error:', validationError)
      return new Response(JSON.stringify({ success: false, error: validationError }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Send WhatsApp message
    const sendResult = await sendWhatsAppMessage(waConfig!, formattedPhone, message)

    if (!sendResult.success) {
      let friendlyError = sendResult.error || 'Falha ao enviar mensagem via Evolution API.'

      if (
        friendlyError.includes('exists: false') ||
        friendlyError.includes('exists:false') ||
        friendlyError.includes('"exists":false') ||
        friendlyError.includes('"exists": false')
      ) {
        friendlyError = `O número ${phone} não possui uma conta de WhatsApp válida.`
      }

      console.error('[send-manual-message] Message send failed:', friendlyError)

      return new Response(
        JSON.stringify({
          success: false,
          error: friendlyError,
          details: sendResult.details,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    // Log notification in notification_logs table
    try {
      await supabase.from('notification_logs').insert({
        tenant_id,
        channel: 'whatsapp_manual',
        body: `Enviado para ${customer_name || phone}: ${message.slice(0, 150)}`,
        sent_at: new Date().toISOString(),
      })
    } catch (logErr) {
      console.warn('[send-manual-message] Failed to save log:', logErr)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mensagem enviada com sucesso!',
        formatted_phone: formattedPhone,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  } catch (err) {
    console.error('[send-manual-message] Exception:', String(err))
    return new Response(
      JSON.stringify({
        success: false,
        error: `Erro interno do servidor: ${String(err)}`,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  }
})
