import { useEffect, useState } from 'react'
import { serviceWorkerUrl } from '@/services/totem-pwa'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface TotemPwaState {
  /** App está rodando em modo standalone (já instalado). */
  standalone: boolean
  /** Evento beforeinstallprompt capturado (instalação disponível). */
  installPrompt: BeforeInstallPromptEvent | null
  /** Há uma nova versão do Service Worker disponível. */
  updateAvailable: boolean
  /** Dispara o prompt nativo de instalação. */
  triggerInstall: () => Promise<boolean>
  /** Recarrega a página para aplicar a nova versão do SW. */
  applyUpdate: () => void
}

/**
 * Registra o Service Worker do Totem (escopo /agendar/:slug), expõe o evento
 * beforeinstallprompt e detecta quando o app já está em modo standalone.
 *
 * Só ativa na rota /agendar/:slug.
 */
export function useTotemPwa(slug: string | undefined): TotemPwaState {
  const [standalone, setStandalone] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if (!slug) return
    // Só registra o SW na rota /agendar/:slug
    if (!window.location.pathname.startsWith('/agendar/')) return
    if (!('serviceWorker' in navigator)) return

    // Detecta modo standalone (PWA já instalado)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
    setStandalone(isStandalone)

    // Registra o SW servido pela edge function
    const swUrl = serviceWorkerUrl()
    navigator.serviceWorker
      .register(swUrl, { scope: `/agendar/${slug}/` })
      .then((registration) => {
        // Nova versão disponível
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true)
            }
          })
        })
      })
      .catch((err) => {
        console.warn('[Totem PWA] Falha ao registrar Service Worker:', err)
      })

    // Mensagens do SW (update disponível via postMessage)
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TOTEM_UPDATE_AVAILABLE') {
        setUpdateAvailable(true)
      }
    }
    navigator.serviceWorker.addEventListener('message', onMessage)

    // beforeinstallprompt
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    // appinstalled — limpa o prompt
    const onInstalled = () => {
      setInstallPrompt(null)
      setStandalone(true)
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage)
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [slug])

  const triggerInstall = async (): Promise<boolean> => {
    if (!installPrompt) return false
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    setInstallPrompt(null)
    return choice.outcome === 'accepted'
  }

  const applyUpdate = () => {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => {
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      })
    })
    window.location.reload()
  }

  return {
    standalone,
    installPrompt,
    updateAvailable,
    triggerInstall,
    applyUpdate,
  }
}
