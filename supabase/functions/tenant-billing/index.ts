import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const body = await req.json().catch(() => ({}))

    if (body.action === 'new_tenant') {
      const { data: superAdmin } = await supabase
        .from('profiles')
        .select('email')
        .eq('is_super_admin', true)
        .single()

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Provisioning alert generated',
          super_admin_email: superAdmin?.email || 'rodriguesjohnny@hotmail.com',
          tenant_name: body.tenant_name,
          plan_type: body.plan_type,
          timestamp: new Date().toISOString(),
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    const { data: expiredTenants } = await supabase
      .from('tenants')
      .select('id, name, plan_type, trial_ends_at, subscription_type')
      .eq('subscription_type', 'trial')
      .lt('trial_ends_at', new Date().toISOString())

    let updatedCount = 0
    if (expiredTenants && expiredTenants.length > 0) {
      for (const tenant of expiredTenants) {
        const { error } = await supabase
          .from('tenants')
          .update({ subscription_type: 'past_due' })
          .eq('id', tenant.id)

        if (!error) updatedCount++
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        expired_trials: expiredTenants?.length || 0,
        updated: updatedCount,
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
