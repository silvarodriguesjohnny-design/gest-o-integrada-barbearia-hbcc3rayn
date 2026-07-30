import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Connection': 'keep-alive', ...corsHeaders },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Server configuration missing' }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json().catch(() => null);
    if (!body || !body.pendingTenantId) {
      return jsonResponse({ error: 'pendingTenantId is required' }, 400);
    }

    const { pendingTenantId } = body;

    const { data: pending, error: fetchError } = await supabase
      .from('pending_tenants')
      .select('*')
      .eq('id', pendingTenantId)
      .single();

    if (fetchError || !pending) {
      return jsonResponse({ error: 'Pending tenant not found', details: fetchError?.message }, 404);
    }

    if (pending.status === 'approved') {
      return jsonResponse({ error: 'Tenant already approved' }, 409);
    }

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: pending.nome_negocio,
        plan_type: 'essential',
        subscription_status: 'active',
        subscription_type: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
      })
      .select()
      .single();

    if (tenantError || !tenant) {
      return jsonResponse({ error: 'Failed to create tenant', details: tenantError?.message }, 500);
    }

    const { error: updateError } = await supabase
      .from('pending_tenants')
      .update({ status: 'approved', tenant_id: tenant.id })
      .eq('id', pendingTenantId);

    if (updateError) {
      return jsonResponse({ error: 'Failed to update pending tenant', details: updateError.message }, 500);
    }

    return jsonResponse({ success: true, tenantId: tenant.id, tenantName: tenant.name });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse({ error: 'Internal server error', details: message }, 500);
  }
});
