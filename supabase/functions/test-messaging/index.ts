import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const { channel, config, tenant_id } = await req.json()

    await supabase.from('email_logs').insert({
      tenant_id: tenant_id || null,
      recipient: config?.from_email || config?.sender_id || 'test@simulado.com',
      subject: `[TESTE] Configuração de ${channel}`,
      body: JSON.stringify(config || {}),
      status: 'simulated',
    })

    return new Response(JSON.stringify({
      success: true,
      message: 'Teste realizado com sucesso (simulado)',
      channel,
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno', detail: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
