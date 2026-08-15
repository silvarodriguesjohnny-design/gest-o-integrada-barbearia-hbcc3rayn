import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

// --- Service Worker source ---
// Escopo restrito a /agendar/:slug. Cache-first para assets estáticos,
// network-first para dados dinâmicos (chamadas Supabase / functions).
// Banner de "nova versão disponível" emitido via postMessage ao cliente.
function serviceWorkerSource(): string {
  return `// Totem PWA Service Worker — gerado dinamicamente
const CACHE_VERSION = 'totem-v' + Date.now();
const STATIC_CACHE = 'totem-static-' + CACHE_VERSION;
const RUNTIME_CACHE = 'totem-runtime';

// Lista de rotas/padrões considerados "dados dinâmicos" (network-first)
const DYNAMIC_PATTERNS = [
  /\\/functions\\/v1\\//,            // chamadas a edge functions (serviços, horários)
  /supabase\\.co\\/rest\\/v1\\//,     // chamadas REST ao Supabase
];

// Extensões consideradas assets estáticos (cache-first)
const STATIC_ASSET = /\\.(?:css|js|woff2?|ttf|png|jpg|jpeg|svg|gif|webp|ico)$/i;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll([
      './',
    ]).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('totem-static-') && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => {
      // Avisa os clientes que uma nova versão está ativa
      return self.clients.matchAll({ includeUncontrolled: true });
    }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'TOTEM_UPDATE_AVAILABLE' });
      });
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Ignora requisições de outros domínios que não sejam da própria app
  // (permite CDN de fontes, etc.)
  const sameOrigin = url.origin === self.location.origin;

  // Dados dinâmicos → network-first
  if (DYNAMIC_PATTERNS.some((p) => p.test(url.href))) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match(req).then((c) => c || new Response('offline', { status: 503 })))
    );
    return;
  }

  // Assets estáticos (mesma origem) → cache-first
  if (sameOrigin && (STATIC_ASSET.test(url.pathname) || url.pathname.startsWith('/assets'))) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((resp) => {
          const copy = resp.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          return resp;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Navegação (HTML) → network-first com fallback ao cache (offline)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('./')))
    );
    return;
  }
});
`
}

function manifestJson(cfg: {
  app_name: string
  background_color: string
  theme_color: string
  icon_192_url: string | null
  icon_512_url: string | null
  slug: string
}) {
  const startUrl = `/agendar/${cfg.slug}`
  const icons = []
  if (cfg.icon_192_url) {
    icons.push({
      src: cfg.icon_192_url,
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable',
    })
  }
  if (cfg.icon_512_url) {
    icons.push({
      src: cfg.icon_512_url,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    })
  }
  return {
    name: cfg.app_name,
    short_name: cfg.app_name.length > 12 ? cfg.app_name.slice(0, 12) : cfg.app_name,
    description: `Agendamento online — ${cfg.app_name}`,
    start_url: startUrl,
    scope: startUrl,
    display: 'standalone',
    orientation: 'portrait',
    background_color: cfg.background_color,
    theme_color: cfg.theme_color,
    icons,
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // ---- GET /manifest.json?slug=<slug>  (público) ----
    if (url.pathname.endsWith('/manifest.json')) {
      const slug = url.searchParams.get('slug')
      if (!slug) {
        return new Response(JSON.stringify({ error: 'slug é obrigatório' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data: cfg, error } = await supabase
        .from('totem_config')
        .select('app_name, background_color, theme_color, icon_192_url, icon_512_url, slug')
        .eq('slug', slug)
        .maybeSingle()

      if (error || !cfg) {
        return new Response(JSON.stringify({ error: 'Configuração não encontrada' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify(manifestJson(cfg)), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/manifest+json',
          'Cache-Control': 'no-cache',
        },
      })
    }

    // ---- GET /sw.js?slug=<slug>  (público) ----
    if (url.pathname.endsWith('/sw.js')) {
      return new Response(serviceWorkerSource(), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache',
          'Service-Worker-Allowed': '/agendar/',
        },
      })
    }

    // ---- CRUD da configuração (autenticado) ----
    // A edge function recebe sempre POST do supabase-js; o campo _method indica a operação.
    const body = await req.json().catch(() => ({}))
    const method = (body._method || req.method || 'POST').toUpperCase()

    if (method === 'GET') {
      const tenantId = body.tenant_id
      if (!tenantId) {
        return new Response(JSON.stringify({ error: 'tenant_id obrigatório' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data, error } = await supabase
        .from('totem_config')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (error) throw error
      return new Response(JSON.stringify({ config: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (method === 'POST' || method === 'PUT') {
      const {
        tenant_id,
        app_name,
        background_color,
        theme_color,
        icon_192_url,
        icon_512_url,
        slug,
      } = body

      if (!tenant_id || !app_name || !slug) {
        return new Response(
          JSON.stringify({ error: 'tenant_id, app_name e slug são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const payload = {
        tenant_id,
        app_name,
        background_color: background_color || '#D4A44A',
        theme_color: theme_color || '#D4A44A',
        icon_192_url: icon_192_url || null,
        icon_512_url: icon_512_url || null,
        slug,
        updated_at: new Date().toISOString(),
      }

      // Upsert: uma config por tenant
      const { data: existing } = await supabase
        .from('totem_config')
        .select('id')
        .eq('tenant_id', tenant_id)
        .maybeSingle()

      let data, error
      if (existing) {
        ;({ data, error } = await supabase
          .from('totem_config')
          .update(payload)
          .eq('tenant_id', tenant_id)
          .select()
          .single())
      } else {
        ;({ data, error } = await supabase.from('totem_config').insert(payload).select().single())
      }

      if (error) throw error
      return new Response(JSON.stringify({ config: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Método não suportado' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
