import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Map, Check, ChevronDown, Loader2, Copy, ArrowRight, PartyPopper } from 'lucide-react'
import { getOnboardingProgress, type OnboardingStep } from '@/services/onboarding-journey'
import { getTenantSlug } from '@/services/tenants'
import { useToast } from '@/hooks/use-toast'

interface OnboardingJourneyProps {
  tenantId: string
}

type Action = NonNullable<OnboardingStep['action']>

export function OnboardingJourney({ tenantId }: OnboardingJourneyProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [steps, setSteps] = useState<OnboardingStep[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const prevCompletedCount = useRef(0)

  const load = async () => {
    const result = await getOnboardingProgress(tenantId)
    setSteps(result)
    setLoading(false)
  }

  useEffect(() => {
    if (!tenantId) return
    load()
  }, [tenantId])

  // Revalida ao voltar para a aba/foco na janela — critérios podem ter mudado.
  useEffect(() => {
    const revalidate = () => load()
    window.addEventListener('visibilitychange', revalidate)
    window.addEventListener('focus', revalidate)
    return () => {
      window.removeEventListener('visibilitychange', revalidate)
      window.removeEventListener('focus', revalidate)
    }
  }, [tenantId])

  // Animação: pisca em verde quando um passo novo é concluído.
  const completedCount = steps.filter((s) => s.completed).length
  useEffect(() => {
    if (completedCount > prevCompletedCount.current && prevCompletedCount.current >= 0) {
      setJustCompleted(true)
      const t = setTimeout(() => setJustCompleted(false), 1200)
      prevCompletedCount.current = completedCount
      return () => clearTimeout(t)
    }
    prevCompletedCount.current = completedCount
  }, [completedCount])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
      </div>
    )
  }

  if (steps.length === 0) return null

  // Jornada concluída — card sutil de parabéns.
  if (completedCount === steps.length) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3 dark:border-emerald-900/50 dark:bg-emerald-900/10">
        <PartyPopper className="h-5 w-5 text-emerald-600 shrink-0" />
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
          Jornada concluída 🎉 Sua barbearia está pronta para receber clientes e pagamentos.
        </p>
      </div>
    )
  }

  const nextStep = steps.find((s) => !s.completed)

  const handleAction = async (action: Action) => {
    if (action.type === 'navigate') {
      navigate(action.target)
      return
    }
    if (action.type === 'copy') {
      try {
        const slug = await getTenantSlug(tenantId)
        const link = slug
          ? `${window.location.origin}/agendar/${slug}`
          : `${window.location.origin}/book/${tenantId}`
        await navigator.clipboard.writeText(link)
        toast({ title: 'Link copiado!', description: 'Envie para seus clientes agendarem online.' })
      } catch {
        toast({ title: 'Não foi possível copiar o link', variant: 'destructive' })
      }
      return
    }
    // modal
    setShowModal(true)
  }

  const stepColor = (s: OnboardingStep) => {
    if (s.completed) return 'completed'
    if (nextStep && s.step === nextStep.step) return 'current'
    return 'upcoming'
  }

  return (
    <>
      <div
        className={[
          'rounded-xl border border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-900/10',
          'transition-all duration-500',
          justCompleted ? 'ring-2 ring-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/15' : '',
        ].join(' ')}
      >
        {/* Header */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-4 text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 shrink-0">
              <Map className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-amber-900 dark:text-amber-200 truncate">
                Sua Jornada
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-300/70">
                {completedCount} de {steps.length} concluídos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
              {completedCount} de {steps.length} concluídos
            </span>
            <ChevronDown
              className={[
                'h-4 w-4 text-amber-600 dark:text-amber-400 transition-transform',
                expanded ? 'rotate-180' : '',
              ].join(' ')}
            />
          </div>
        </button>

        {/* Conteúdo */}
        <div className="px-4 sm:px-6 pb-4">
          {expanded ? (
            <ol className="space-y-2.5">
              {steps.map((s) => (
                <StepRow
                  key={s.step}
                  step={s}
                  color={stepColor(s)}
                  onAction={() => s.action && handleAction(s.action)}
                />
              ))}
            </ol>
          ) : (
            nextStep && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-lg bg-white/70 dark:bg-white/5 p-3 sm:p-4 border border-amber-100 dark:border-amber-900/30">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <NumberBadge step={nextStep.step} color="current" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      Passo {nextStep.step} de {steps.length}
                    </p>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      {nextStep.title}
                    </p>
                    <p className="text-sm text-amber-800/70 dark:text-amber-200/70 mt-0.5">
                      {nextStep.benefit}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 sm:self-center">
                  <NextAction
                    step={nextStep}
                    onAction={() => nextStep.action && handleAction(nextStep.action)}
                  />
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {showModal && (
        <ConnectModal
          onClose={() => setShowModal(false)}
          onGo={() => navigate('/dashboard/configuracoes')}
        />
      )}
    </>
  )
}

type StepColor = 'completed' | 'current' | 'upcoming'

function StepRow({
  step,
  color,
  onAction,
}: {
  step: OnboardingStep
  color: StepColor
  onAction: () => void
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
      <NumberBadge step={step.step} color={color} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">{step.title}</p>
        <p className="text-sm text-amber-800/70 dark:text-amber-200/70">{step.benefit}</p>
      </div>
      <div className="shrink-0">
        {step.completed ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <Check className="h-3 w-3" /> Concluído
          </span>
        ) : step.action && step.action.target === 'auto' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
            Aguardando...
          </span>
        ) : (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
          >
            {step.action?.label}
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </li>
  )
}

function NextAction({ step, onAction }: { step: OnboardingStep; onAction: () => void }) {
  if (step.completed) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
        <Check className="h-3 w-3" /> Concluído ✅
      </span>
    )
  }
  if (step.action && step.action.target === 'auto') {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
        Aguardando...
      </span>
    )
  }
  const isCopy = step.action?.type === 'copy'
  return (
    <button
      type="button"
      onClick={onAction}
      className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
    >
      {isCopy ? <Copy className="h-3.5 w-3.5" /> : null}
      {step.action?.label}
      {!isCopy && <ArrowRight className="h-3.5 w-3.5" />}
    </button>
  )
}

function NumberBadge({ step, color }: { step: number; color: StepColor }) {
  const base =
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold'
  if (color === 'completed') {
    return (
      <div className={`${base} bg-emerald-500 text-white`}>
        <Check className="h-4 w-4" />
      </div>
    )
  }
  if (color === 'current') {
    return (
      <div
        className={`${base} bg-amber-500 text-white ring-2 ring-amber-200 dark:ring-amber-900/50`}
      >
        {step}
      </div>
    )
  }
  return (
    <div className={`${base} bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-300`}>
      {step}
    </div>
  )
}

function ConnectModal({ onClose, onGo }: { onClose: () => void; onGo: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Map className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="font-semibold text-amber-900 dark:text-amber-200">Conectar WhatsApp</h3>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Para que confirmações e lembretes saiam do seu número, você precisa conectar uma
            instância do WhatsApp (Evolution API):
          </p>
          <ol className="list-decimal list-inside space-y-1 pl-1">
            <li>Vá em Configurações → Canais de Comunicação.</li>
            <li>
              Ative o canal <strong>WhatsApp</strong>.
            </li>
            <li>Preencha URL da instância, nome, API key e número.</li>
            <li>Salve e faça um teste enviando uma mensagem.</li>
          </ol>
          <p>Quando estiver conectado, este passo marcará sozinho.</p>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 dark:border-zinc-700 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={onGo}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
          >
            Ir para Configurações <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default OnboardingJourney
