import { createZip } from '@/lib/zip-writer'

interface PwaZipInput {
  /** Nome do app (ex: "Barbearia Vintage"). */
  appName: string
  /** Cor de fundo do splash (ex: "#D4A44A"). */
  bgColor: string
  /** Cor do tema / status bar (ex: "#D4A44A"). */
  themeColor: string
  /** URL pública do ícone 192x192, ou null para usar um fallback. */
  icon192Url: string | null
  /** URL pública do ícone 512x512, ou null para usar um fallback. */
  icon512Url: string | null
  /** Slug usado na rota /agendar/:slug. */
  slug: string
}

/**
 * Monta um ZIP "PWA instalável" contendo:
 *  - manifest.json
 *  - index.html (loader mínimo)
 *  - icon-192.png e icon-512.png (ou placeholders gerados localmente)
 *
 * O usuário pode hospedar esse pacote em qualquer servidor estático e obter
 * um PWA válido para instalação no tablet/totem.
 */
export async function downloadPwaZip(input: PwaZipInput): Promise<void> {
  const enc = new TextEncoder()

  // ---- manifest.json ----
  const startUrl = `/agendar/${input.slug}`
  const manifest = {
    name: input.appName,
    short_name: input.appName.length > 12 ? input.appName.slice(0, 12) : input.appName,
    description: `Agendamento online — ${input.appName}`,
    start_url: startUrl,
    scope: startUrl,
    display: 'standalone',
    orientation: 'portrait',
    background_color: input.bgColor,
    theme_color: input.themeColor,
    icons: [
      { src: './icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: './icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  }

  // ---- index.html (loader mínimo) ----
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="${input.themeColor}" />
  <link rel="manifest" href="./manifest.json" />
  <link rel="icon" href="./icon-192.png" />
  <link rel="apple-touch-icon" href="./icon-192.png" />
  <title>${input.appName}</title>
  <style>
    html, body { margin: 0; padding: 0; height: 100%; }
    body {
      background-color: ${input.bgColor};
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #fff;
    }
    .wrap { text-align: center; }
    .icon {
      width: 96px; height: 96px; border-radius: 20px;
      background: #fff url('./icon-192.png') center/cover no-repeat;
      box-shadow: 0 8px 24px rgba(0,0,0,0.18);
      margin: 0 auto 16px;
    }
    h1 { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
    p { font-size: 13px; opacity: 0.85; margin: 0; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="icon"></div>
    <h1>${input.appName}</h1>
    <p>Carregando agendamento…</p>
  </div>
  <script>
    // Redireciona para a página de agendamento depois de um breve splash.
    (function () {
      var base = window.location.origin || '';
      var slug = ${JSON.stringify(input.slug)};
      // Se o pacote foi aberto no mesmo domínio da app, vai para /agendar/:slug.
      // Caso contrário, mantém o loader (útil para pré-visualização).
      if (base && slug) {
        setTimeout(function () {
          window.location.replace(base + '/agendar/' + slug);
        }, 900);
      }
    })();
  </script>
</body>
</html>`

  // ---- ícones ----
  const icon192 = await resolveIcon(input.icon192Url, 192, input.bgColor)
  const icon512 = await resolveIcon(input.icon512Url, 512, input.bgColor)

  const blob = createZip([
    { name: 'manifest.json', data: enc.encode(JSON.stringify(manifest, null, 2)) },
    { name: 'index.html', data: enc.encode(html) },
    { name: 'icon-192.png', data: icon192 },
    { name: 'icon-512.png', data: icon512 },
  ])

  // O mime type do Blob no zip-writer está fixado em xlsx; recriamos como zip.
  const zipBlob = new Blob([blob], { type: 'application/zip' })

  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pwa-${input.slug || 'totem'}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Busca o ícone (se houver URL pública) e devolve os bytes PNG.
 * Se a URL não existir ou o fetch falhar, gera um placeholder quadrado
 * com a cor de fundo e a inicial do app.
 */
async function resolveIcon(url: string | null, size: number, bgColor: string): Promise<Uint8Array> {
  if (url) {
    try {
      const resp = await fetch(url)
      if (resp.ok) {
        const buf = new Uint8Array(await resp.arrayBuffer())
        if (buf.byteLength > 0) return buf
      }
    } catch {
      // segue para placeholder
    }
  }
  return placeholderIcon(size, bgColor)
}

function placeholderIcon(size: number, bgColor: string): Uint8Array {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = bgColor || '#D4A44A'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${Math.floor(size * 0.5)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('NR', size / 2, size / 2 + size * 0.04)
  // toBlob é síncrono no canvas? não — usamos uma conversão via OffscreenCanvas
  // como fallback, geramos um PNG via dataURL.
  const dataUrl = canvas.toDataURL('image/png')
  const base64 = dataUrl.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
