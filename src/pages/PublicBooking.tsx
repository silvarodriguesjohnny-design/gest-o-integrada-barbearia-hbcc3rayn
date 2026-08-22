import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import {
  Scissors,
  Clock,
  Loader2,
  CheckCircle2,
  CalendarDays,
  User,
  CalendarX,
  Sparkles,
  ArrowLeft,
  Store,
  Download,
  RefreshCw,
  MonitorSmartphone,
  BadgeCheck,
  CreditCard,
  LifeBuoy,
  X,
  Send,
  ShoppingCart,
  ShoppingBag,
  Plus,
  Minus,
  Package,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ptBR } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
import { useTotemPwa } from '@/hooks/use-totem-pwa'
import { ClientIdentification } from '@/components/public/ClientIdentification'
import {
  getTenantData,
  getSlots,
  createBooking,
  finalizeProductsBooking,
  calculateSlotsWithSchedules,
  groupSlotsByPeriod,
  fetchMonthRawData,
  getPublicSubscriptionPlans,
  startPublicSubscriptionCheckout,
  consumeSubscriptionSession,
  type PublicService,
  type PublicCustomer,
  type PublicActiveSubscription,
  type PublicBarberSchedule,
  type SlotAppointment,
  type MonthSlotData,
} from '@/services/public-booking'
import { startAppointmentCheckout, startPublicBookingCheckout } from '@/services/stripe-checkout'
import { getPublicProducts } from '@/services/products'
import { formatLocalDateYYYYMMDD } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import { manifestUrl } from '@/services/totem-pwa'
import type { SubscriptionPlan, Product } from '@/types'
import { hasActiveSubscription } from '@/services/subscriptions'

const fmtPrice = (v: number) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

interface CartItem {
  product_id: string
  name: string
  price: number
  quantity: number
  image_url: string | null
}

export default function PublicBooking() {
  const { tenantId, slug } = useParams<{ tenantId: string; slug: string }>()
  const { toast } = useToast()
  // Totem PWA: só registra o SW se houver slug (rota /agendar/:slug)
  const totemPwa = useTotemPwa(slug)

  // Injeta o <link rel="manifest"> quando há slug configurado
  useEffect(() => {
    if (!slug) return
    const id = 'totem-manifest-link'
    let link = document.getElementById(id) as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.id = id
      link.rel = 'manifest'
      document.head.appendChild(link)
    }
    link.href = manifestUrl(slug)
    return () => {
      const existing = document.getElementById(id)
      if (existing) existing.remove()
    }
  }, [slug])
  const [tenant, setTenant] = useState<any>(null)
  const [services, setServices] = useState<PublicService[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [customer, setCustomer] = useState<PublicCustomer | null>(null)
  const [selectedService, setSelectedService] = useState<PublicService | null>(null)
  const [barbers, setBarbers] = useState<string[]>([])
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null)
  const [date, setDate] = useState(formatLocalDateYYYYMMDD(new Date()))
  const [appointments, setAppointments] = useState<SlotAppointment[]>([])
  const [barberSchedules, setBarberSchedules] = useState<PublicBarberSchedule[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [booking, setBooking] = useState(false)
  const [done, setDone] = useState(false)

  // --- Assinaturas (Fase 2) ---
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [isSubscriber, setIsSubscriber] = useState(false)
  const [showPlans, setShowPlans] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [paymentType, setPaymentType] = useState<'monthly' | 'prepaid'>('monthly')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  // --- Pagamento antecipado (antes da confirmação) ---
  const [prepayChoice, setPrepayChoice] = useState<'now' | 'later' | null>(null)
  const [stripeEnabled, setStripeEnabled] = useState(false)
  const [prepaymentEnabled, setPrepaymentEnabled] = useState(false)
  const [prepaidPlan, setPrepaidPlan] = useState<SubscriptionPlan | null>(null)
  // --- Créditos de assinatura ativa do cliente (identificação por CPF) ---
  const [activeSubscription, setActiveSubscription] = useState<PublicActiveSubscription | null>(
    null,
  )

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [rawMonthData, setRawMonthData] = useState<Map<string, MonthSlotData>>(new Map())
  const [loadingMonth, setLoadingMonth] = useState(false)
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set())

  const summaryRef = useRef<HTMLDivElement>(null)

  // --- Carrinho de produtos pós-agendamento ---
  const [postBooking, setPostBooking] = useState<'idle' | 'offer' | 'summary'>('idle')
  const [cart, setCart] = useState<CartItem[]>([])
  const [publicProducts, setPublicProducts] = useState<Product[]>([])
  const [lastAppointment, setLastAppointment] = useState<{ id: string } | null>(null)
  const [cartProcessing, setCartProcessing] = useState(false)

  // Resolve o tenant a partir do tenantId (rota /book/:tenantId) ou do slug
  // (rota /agendar/:slug usada pelo Totem PWA).
  const [resolvedTenantId, setResolvedTenantId] = useState<string | undefined>(tenantId)

  useEffect(() => {
    if (tenantId) {
      setResolvedTenantId(tenantId)
      return
    }
    if (!slug) return
    getTenantData('', slug)
      .then(({ data, error }) => {
        if (error || !data?.tenant) {
          setLoadError(true)
          setLoading(false)
        } else {
          setTenant(data.tenant)
          setServices(data.services)
          setStripeEnabled(!!data.tenant.stripe_enabled)
          setPrepaymentEnabled(!!data.tenant.prepayment_enabled)
          setResolvedTenantId(data.tenant.id)
          setLoading(false)
        }
      })
      .catch(() => {
        setLoadError(true)
        setLoading(false)
      })
  }, [tenantId, slug])

  useEffect(() => {
    if (!resolvedTenantId) return
    if (slug) return // slug path already loaded tenant above
    getTenantData(resolvedTenantId)
      .then(({ data, error }) => {
        if (error || !data) {
          setLoadError(true)
        } else {
          setTenant(data.tenant)
          setServices(data.services)
          setStripeEnabled(!!data.tenant.stripe_enabled)
          setPrepaymentEnabled(!!data.tenant.prepayment_enabled)
        }
        setLoading(false)
      })
      .catch(() => {
        setLoadError(true)
        setLoading(false)
      })
  }, [resolvedTenantId, slug])

  useEffect(() => {
    if (!resolvedTenantId || loading) return
    setLoadingMonth(true)
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth() + 1
    fetchMonthRawData(resolvedTenantId, year, month)
      .then((data) => {
        setRawMonthData(data)
        setLoadingMonth(false)
      })
      .catch(() => setLoadingMonth(false))
  }, [resolvedTenantId, currentMonth, loading])

  useEffect(() => {
    if (!selectedService || rawMonthData.size === 0) {
      setAvailableDates(new Set())
      return
    }
    const available = new Set<string>()
    for (const [dateStr, data] of rawMonthData) {
      const [y, m, d] = dateStr.split('-').map(Number)
      const targetDate = new Date(y, m - 1, d)
      const slots = calculateSlotsWithSchedules(
        data.appointments,
        data.barber_schedules,
        selectedBarber,
        selectedService.duration_minutes,
        targetDate,
      )
      if (slots.some((s) => s.available)) {
        available.add(dateStr)
      }
    }
    setAvailableDates(available)
  }, [rawMonthData, selectedService, selectedBarber])

  useEffect(() => {
    if (!resolvedTenantId || !date) return
    setLoadingSlots(true)
    setSelectedSlot('')
    getSlots(resolvedTenantId, date).then(({ data }) => {
      if (data) {
        setAppointments(data.appointments || [])
        setBarbers(data.barbers || [])
        setBarberSchedules(data.barber_schedules || [])
      }
      setLoadingSlots(false)
    })
  }, [resolvedTenantId, date])

  useEffect(() => {
    if (!resolvedTenantId || !date) return
    const interval = setInterval(() => {
      getSlots(resolvedTenantId, date).then(({ data }) => {
        if (data) {
          setAppointments(data.appointments || [])
          setBarbers(data.barbers || [])
          setBarberSchedules(data.barber_schedules || [])
        }
      })
    }, 10000)
    return () => clearInterval(interval)
  }, [resolvedTenantId, date])

  const selectedDateObj = useMemo(() => {
    if (!date) return undefined
    const [y, m, d] = date.split('-').map(Number)
    return new Date(y, m - 1, d)
  }, [date])

  // Rola suavemente até o card-resumo quando um horário é selecionado (tablet/totem)
  useEffect(() => {
    if (selectedSlot && summaryRef.current) {
      summaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [selectedSlot])

  // Carrega planos de assinatura quando o Stripe está configurado, para oferecer
  // pagamento antecipado com desconto antes da confirmação do agendamento.
  useEffect(() => {
    if (!resolvedTenantId || !stripeEnabled) return
    getPublicSubscriptionPlans(resolvedTenantId).then(({ data }) => {
      if (data && data.length > 0) {
        setPlans(data)
        // Pré-seleciona o primeiro plano com pacote pré-pago disponível
        const prepaid = data.find((p) => p.prepaid_months > 0 && p.prepaid_price > 0) || null
        setPrepaidPlan(prepaid)
      }
    })
  }, [resolvedTenantId, stripeEnabled])

  // Carrinho: persiste em sessionStorage para não perder ao navegar.
  useEffect(() => {
    if (!resolvedTenantId) return
    const key = `na-regua-cart-${resolvedTenantId}`
    try {
      const raw = sessionStorage.getItem(key)
      if (raw) setCart(JSON.parse(raw))
    } catch {
      /* ignore */
    }
  }, [resolvedTenantId])

  useEffect(() => {
    if (!resolvedTenantId) return
    const key = `na-regua-cart-${resolvedTenantId}`
    try {
      sessionStorage.setItem(key, JSON.stringify(cart))
    } catch {
      /* ignore */
    }
  }, [cart, resolvedTenantId])

  // Retorno do Stripe Checkout (pós-agendamento com produtos): se voltou
  // com ?paid=1&appt=..., mostra a tela de sucesso.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paid = params.get('paid')
    const apptId = params.get('appt')
    if (paid === '1' && apptId) {
      setLastAppointment((prev) => prev || { id: apptId })
      setPostBooking('idle')
      setCart([])
      setDone(true)
      if (resolvedTenantId) {
        getPublicSubscriptionPlans(resolvedTenantId).then(({ data }) => {
          if (data && data.length > 0) setPlans(data)
        })
      }
    }
  }, [resolvedTenantId])

  const handleBook = async (opts?: { prepay?: boolean; useCredit?: boolean }) => {
    if (!resolvedTenantId || !selectedService || !selectedSlot || !customer) return
    setBooking(true)

    // === Caminho A: usar crédito de assinatura ativa (sem pagamento) ===
    // O cliente tem assinatura ativa com sessões restantes e escolheu usar crédito.
    if (opts?.useCredit && activeSubscription && activeSubscription.sessions_remaining > 0) {
      // 1. Cria o agendamento (sem pagamento antecipado).
      const { error } = await createBooking({
        tenant_id: resolvedTenantId,
        service_id: selectedService.id,
        customer_id: customer.id,
        barber_name: selectedBarber,
        date,
        time: selectedSlot,
      })
      if (error) {
        setBooking(false)
        toast({
          title: 'Erro no agendamento',
          description: error.message || 'Este horário não está mais disponível.',
          variant: 'destructive',
        })
        return
      }
      // 2. Consome o crédito (atomicamente, via RPC FOR UPDATE). Buscamos o
      //    agendamento recém-criado por customer+start_time para amarrar a auditoria.
      //    O consume_subscription_session aceita appointment_id opcional.
      const { error: consumeErr } = await consumeSubscriptionSession(resolvedTenantId, customer.id)
      setBooking(false)
      if (consumeErr) {
        toast({
          title: 'Não foi possível usar o crédito',
          description:
            'Seu agendamento foi criado, mas houve um problema ao consumir o crédito. Fale com a barbearia.',
          variant: 'destructive',
        })
      } else {
        // Atualiza o estado local de créditos restantes.
        setActiveSubscription((prev) =>
          prev
            ? {
                ...prev,
                sessions_used: prev.sessions_used + 1,
                sessions_remaining: Math.max(0, prev.sessions_remaining - 1),
              }
            : prev,
        )
      }
      setDone(true)
      toast({ title: 'Agendamento confirmado com crédito! 🎉' })
      return
    }

    // === Caminho B: pagamento antecipado do agendamento (Cenário 2) ===
    // O agendamento é salvo ANTES com status 'pending_payment' para reservar o
    // horário; depois redirecionamos ao Stripe. O webhook confirma para
    // 'scheduled' após o pagamento.
    if (opts?.prepay && prepaymentEnabled && stripeEnabled) {
      // 1. Cria o agendamento em 'pending_payment' para reservar o horário.
      const { data: bookingData, error: bookingError } = await createBooking({
        tenant_id: resolvedTenantId,
        service_id: selectedService.id,
        customer_id: customer.id,
        barber_name: selectedBarber,
        date,
        time: selectedSlot,
        require_prepayment: true,
      })
      if (bookingError || !bookingData?.appointment) {
        setBooking(false)
        toast({
          title: 'Erro no agendamento',
          description: bookingError?.message || 'Este horário não está mais disponível.',
          variant: 'destructive',
        })
        return
      }
      const appointment = bookingData.appointment
      // 2. Inicia o checkout do agendamento (2% de comissão, fallback plataforma).
      const amountCents = Math.round(Number(selectedService.price) * 100)
      const successUrl = `${window.location.origin}/agendar/${tenant?.slug || resolvedTenantId}?paid=1&appt=${appointment.id}`
      const cancelUrl = `${window.location.origin}/agendar/${tenant?.slug || resolvedTenantId}`
      const { data: checkoutData, error: checkoutError } = await startAppointmentCheckout({
        appointment_id: appointment.id,
        amount: amountCents,
        customer_name: customer.name,
        customer_email: customer.email || undefined,
        success_url: successUrl,
        cancel_url: cancelUrl,
      })
      setBooking(false)
      if (checkoutError || !checkoutData?.url) {
        toast({
          title: 'Erro no pagamento',
          description: checkoutError?.message || 'Não foi possível iniciar o pagamento.',
          variant: 'destructive',
        })
        // O agendamento ficou em pending_payment; o cliente pode tentar de novo.
        return
      }
      window.location.href = checkoutData.url
      return
    }

    // === Caminho C (legado): assinatura pré-paga de plano ===
    if (opts?.prepay && prepaidPlan) {
      const successUrl = `${window.location.origin}/agendar/${tenant?.slug || resolvedTenantId}?paid=1`
      const cancelUrl = `${window.location.origin}/agendar/${tenant?.slug || resolvedTenantId}`
      const { data: checkoutData, error: checkoutError } = await startPublicSubscriptionCheckout({
        plan_id: prepaidPlan.id,
        client_id: customer.id,
        payment_type: 'prepaid',
        success_url: successUrl,
        cancel_url: cancelUrl,
      })
      setBooking(false)
      if (checkoutError || !checkoutData?.checkout_url) {
        toast({
          title: 'Erro no pagamento',
          description: checkoutError?.message || 'Não foi possível iniciar o pagamento antecipado.',
          variant: 'destructive',
        })
        return
      }
      window.location.href = checkoutData.checkout_url
      return
    }

    // === Caminho D: fluxo normal sem pagamento ===
    const { data: bookingData, error } = await createBooking({
      tenant_id: resolvedTenantId,
      service_id: selectedService.id,
      customer_id: customer.id,
      barber_name: selectedBarber,
      date,
      time: selectedSlot,
    })
    setBooking(false)
    if (error) {
      toast({
        title: 'Erro no agendamento',
        description: error.message || 'Este horário não está mais disponível.',
        variant: 'destructive',
      })
    } else {
      setLastAppointment(bookingData?.appointment || null)
      toast({ title: 'Agendamento confirmado!' })
      if (resolvedTenantId) {
        getPublicSubscriptionPlans(resolvedTenantId).then(({ data }) => {
          if (data && data.length > 0) setPlans(data)
        })
        hasActiveSubscription(customer.id, resolvedTenantId).then(setIsSubscriber)
        // Verifica se há produtos para oferecer no pós-agendamento.
        getPublicProducts(resolvedTenantId).then(({ data: prods }) => {
          if (prods && prods.length > 0) {
            setPublicProducts(prods)
            setPostBooking('offer')
          } else {
            setDone(true)
          }
        })
      } else {
        setDone(true)
      }
    }
  }

  // --- Handlers do carrinho pós-agendamento ---
  const addToCart = (p: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === p.id)
      if (existing) {
        return prev.map((c) => (c.product_id === p.id ? { ...c, quantity: c.quantity + 1 } : c))
      }
      return [
        ...prev,
        {
          product_id: p.id,
          name: p.name,
          price: Number(p.price),
          quantity: 1,
          image_url: p.image_url ?? null,
        },
      ]
    })
  }

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.product_id === productId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0),
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.product_id !== productId))
  }

  const skipProducts = () => {
    setCart([])
    setPostBooking('idle')
    setDone(true)
  }

  const handlePayAtBarbershop = async () => {
    if (!resolvedTenantId || !lastAppointment) {
      setPostBooking('idle')
      setDone(true)
      return
    }
    setCartProcessing(true)
    if (cart.length > 0) {
      await finalizeProductsBooking({
        appointment_id: lastAppointment.id,
        tenant_id: resolvedTenantId,
        items: cart.map((c) => ({
          product_id: c.product_id,
          quantity: c.quantity,
          unit_price: c.price,
        })),
      })
    }
    setCartProcessing(false)
    setCart([])
    setPostBooking('idle')
    setDone(true)
  }

  const handlePayNow = async () => {
    if (!resolvedTenantId || !lastAppointment || !selectedService) {
      toast({
        title: 'Erro',
        description: 'Não foi possível processar o pagamento.',
        variant: 'destructive',
      })
      return
    }
    setCartProcessing(true)
    const serviceAmountCents = Math.round(Number(selectedService.price) * 100)
    const cartItems = cart.map((c) => ({
      name: c.name,
      price_cents: Math.round(c.price * 100),
      quantity: c.quantity,
    }))
    const productIds = cart.map((c) => c.product_id)
    const successUrl = `${window.location.origin}/agendar/${tenant?.slug || resolvedTenantId}?paid=1&appt=${lastAppointment.id}`
    const cancelUrl = `${window.location.origin}/agendar/${tenant?.slug || resolvedTenantId}`
    const { data, error: checkoutError } = await startPublicBookingCheckout({
      appointment_id: lastAppointment.id,
      service_amount: serviceAmountCents,
      customer_name: customer?.name,
      customer_email: customer?.email || undefined,
      cart_items: cartItems,
      product_ids: productIds,
      success_url: successUrl,
      cancel_url: cancelUrl,
    })
    setCartProcessing(false)
    if (checkoutError || !data?.url) {
      toast({
        title: 'Erro no pagamento',
        description: checkoutError?.message || 'Não foi possível iniciar o pagamento.',
        variant: 'destructive',
      })
      return
    }
    window.location.href = data.url
  }

  const handleSubscribe = async () => {
    if (!selectedPlan || !customer || !resolvedTenantId) return
    setCheckoutLoading(true)
    const successUrl = `${window.location.origin}/assinatura/sucesso?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${window.location.origin}/agendar/${tenant?.slug || resolvedTenantId}`
    const { data, error } = await startPublicSubscriptionCheckout({
      plan_id: selectedPlan.id,
      client_id: customer.id,
      payment_type: paymentType,
      success_url: successUrl,
      cancel_url: cancelUrl,
    })
    setCheckoutLoading(false)
    if (error || !data?.checkout_url) {
      toast({
        title: 'Erro no pagamento',
        description: error?.message || 'Não foi possível iniciar o pagamento.',
        variant: 'destructive',
      })
      return
    }
    // Redireciona para o Stripe Checkout
    window.location.href = data.checkout_url
  }

  if (loading) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="absolute top-0 left-0 right-0 h-1 barber-pole-stripes" />
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="mt-4 text-sm text-muted-foreground">Carregando agendamento…</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <div className="absolute top-0 left-0 right-0 h-1 barber-pole-stripes" />
        <CalendarX className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-bold">Barbearia não encontrada</h1>
        <p className="text-muted-foreground mt-2 max-w-sm">
          Não foi possível carregar os dados desta barbearia. Verifique o link ou tente novamente
          mais tarde.
        </p>
      </div>
    )
  }

  // --- ETAPA PÓS-AGENDAMENTO: oferta de produtos ---
  if (postBooking === 'offer') {
    const cartCount = cart.reduce((acc, c) => acc + c.quantity, 0)
    return (
      <div className="relative min-h-screen bg-background">
        <div className="absolute top-0 left-0 right-0 h-1 barber-pole-stripes z-50" />
        <main className="mx-auto max-w-2xl px-4 md:px-6 py-6 md:py-8 space-y-6">
          {/* Confirmação do agendamento */}
          <Card className="border-success/40 bg-success/5">
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Agendamento confirmado!</p>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedService?.name} · {selectedDateObj?.toLocaleDateString('pt-BR')} ·{' '}
                  {selectedSlot}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Título da oferta */}
          <div className="text-center space-y-2 animate-fade-in-up">
            <ShoppingBag className="h-10 w-10 text-accent mx-auto" />
            <h2 className="text-2xl font-bold">Aproveite e leve para casa! 🛍️</h2>
            <p className="text-muted-foreground text-sm">
              Adicione produtos da barbearia ao seu pedido
            </p>
          </div>

          {/* Grid de produtos */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {publicProducts.map((p) => {
              const inCart = cart.find((c) => c.product_id === p.id)
              return (
                <Card
                  key={p.id}
                  className="overflow-hidden hover:shadow-md transition-all duration-200"
                >
                  <div className="aspect-square bg-muted/40">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3 space-y-2">
                    <p className="font-semibold text-sm truncate">{p.name}</p>
                    <p className="font-bold text-accent">{fmtPrice(Number(p.price))}</p>
                    {inCart ? (
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 touch-manipulation"
                          onClick={() => updateQty(p.id, -1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="font-semibold text-sm">{inCart.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 touch-manipulation"
                          onClick={() => updateQty(p.id, 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full min-h-[40px] touch-manipulation"
                        onClick={() => addToCart(p)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              className="flex-1 min-h-[48px] text-muted-foreground touch-manipulation"
              onClick={skipProducts}
            >
              Pular
            </Button>
            {cartCount > 0 && (
              <Button
                variant="amber"
                className="flex-1 min-h-[48px] touch-manipulation"
                onClick={() => setPostBooking('summary')}
              >
                <ShoppingCart className="h-4 w-4 mr-2" /> Ver Carrinho ({cartCount}{' '}
                {cartCount === 1 ? 'item' : 'itens'})
              </Button>
            )}
          </div>
        </main>
        <SupportFAB />
      </div>
    )
  }

  // --- ETAPA PÓS-AGENDAMENTO: resumo final (carrinho + agendamento) ---
  if (postBooking === 'summary') {
    const cartTotal = cart.reduce((acc, c) => acc + c.price * c.quantity, 0)
    const serviceTotal = selectedService ? Number(selectedService.price) : 0
    const grandTotal = serviceTotal + cartTotal
    const cartCount = cart.reduce((acc, c) => acc + c.quantity, 0)
    const canPayOnline = stripeEnabled && prepaymentEnabled

    return (
      <div className="relative min-h-screen bg-background">
        <div className="absolute top-0 left-0 right-0 h-1 barber-pole-stripes z-50" />
        <main className="mx-auto max-w-2xl px-4 md:px-6 py-6 md:py-8 space-y-5">
          <h2 className="text-xl font-bold">Resumo do seu pedido</h2>

          {/* Card: Seu Agendamento */}
          <Card className="border-accent/30">
            <CardContent className="p-4 space-y-2">
              <p className="font-semibold flex items-center gap-2 text-sm md:text-base">
                <Scissors className="h-4 w-4 text-accent" /> Seu Agendamento
              </p>
              <div className="text-sm space-y-1.5">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Serviço</span>
                  <span className="font-medium text-right truncate">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Data</span>
                  <span className="font-medium">
                    {selectedDateObj?.toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Horário</span>
                  <span className="font-medium">{selectedSlot}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Profissional</span>
                  <span className="font-medium">{selectedBarber || 'Qualquer um'}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-bold">{fmtPrice(serviceTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Seus Produtos */}
          {cart.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="font-semibold flex items-center gap-2 text-sm md:text-base">
                  <Package className="h-4 w-4 text-accent" /> Seus Produtos
                </p>
                {cart.map((c) => (
                  <div key={c.product_id} className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 rounded-lg bg-muted/40 overflow-hidden flex items-center justify-center">
                      {c.image_url ? (
                        <img
                          src={c.image_url}
                          alt={c.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.quantity}x {fmtPrice(c.price)}
                      </p>
                    </div>
                    <span className="font-semibold text-sm shrink-0">
                      {fmtPrice(c.price * c.quantity)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 hover:text-destructive"
                      onClick={() => removeFromCart(c.product_id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between">
                  <span className="text-sm text-muted-foreground">Subtotal produtos</span>
                  <span className="font-bold">{fmtPrice(cartTotal)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Total */}
          <Card className="border-accent/40 bg-accent/5">
            <CardContent className="p-4 flex justify-between items-center">
              <span className="font-semibold text-base">Total</span>
              <span className="text-2xl font-bold text-accent">{fmtPrice(grandTotal)}</span>
            </CardContent>
          </Card>

          {/* Opções de pagamento */}
          <div className="space-y-3">
            {canPayOnline ? (
              <>
                <Button
                  variant="amber"
                  size="lg"
                  className="w-full min-h-[56px] touch-manipulation shadow-lg"
                  disabled={cartProcessing}
                  onClick={handlePayNow}
                >
                  {cartProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-5 w-5 mr-2" />
                  )}
                  Pagar agora (PIX/Cartão) · {fmtPrice(grandTotal)}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full min-h-[48px] touch-manipulation"
                  disabled={cartProcessing}
                  onClick={handlePayAtBarbershop}
                >
                  Pagar na barbearia
                </Button>
              </>
            ) : (
              <div className="space-y-2">
                <Button
                  variant="amber"
                  size="lg"
                  className="w-full min-h-[56px] touch-manipulation shadow-lg"
                  disabled={cartProcessing}
                  onClick={handlePayAtBarbershop}
                >
                  {cartProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Store className="h-5 w-5 mr-2" />
                  )}
                  Pagar na barbearia
                </Button>
                <p className="text-center text-xs text-muted-foreground bg-muted/50 rounded-md py-2 px-3">
                  Pagamento online em breve
                </p>
              </div>
            )}
            <Button
              variant="ghost"
              className="w-full min-h-[48px] touch-manipulation"
              disabled={cartProcessing}
              onClick={() => setPostBooking('offer')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar aos produtos
            </Button>
          </div>

          {/* Contador do carrinho no rodapé */}
          {cartCount > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              {cartCount} {cartCount === 1 ? 'item' : 'itens'} no carrinho · {fmtPrice(cartTotal)}
            </p>
          )}
        </main>
        <SupportFAB />
      </div>
    )
  }

  if (done) {
    // Se o cliente escolheu ver planos de assinatura, mostra o upsell
    if (showPlans) {
      return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
          <div className="absolute top-0 left-0 right-0 h-1 barber-pole-stripes" />
          <div className="w-full max-w-lg space-y-6 animate-fade-in-up">
            <div className="text-center space-y-2">
              <BadgeCheck className="h-12 w-12 text-accent mx-auto" />
              <h1 className="text-2xl font-bold">Seja um assinante! 🎉</h1>
              <p className="text-muted-foreground text-sm">
                {isSubscriber
                  ? 'Você já é assinante. Aproveite seus benefícios!'
                  : 'Escolha um plano e tenha benefícios exclusivos toda semana.'}
              </p>
            </div>

            {selectedPlan ? (
              <Card className="border-accent/40">
                <CardContent className="p-5 space-y-4 text-left">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{selectedPlan.name}</h3>
                      {selectedPlan.description && (
                        <p className="text-sm text-muted-foreground">{selectedPlan.description}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedPlan(null)}>
                      Voltar
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Forma de pagamento</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={paymentType === 'monthly' ? 'amber' : 'outline'}
                        onClick={() => setPaymentType('monthly')}
                        className="min-h-[48px] flex flex-col"
                      >
                        <span className="text-sm font-semibold">Mensal</span>
                        <span className="text-xs opacity-80">
                          {fmtPrice(selectedPlan.price)}/mês
                        </span>
                      </Button>
                      {selectedPlan.prepaid_months > 0 && (
                        <Button
                          variant={paymentType === 'prepaid' ? 'amber' : 'outline'}
                          onClick={() => setPaymentType('prepaid')}
                          className="min-h-[48px] flex flex-col"
                        >
                          <span className="text-sm font-semibold">
                            {selectedPlan.prepaid_months} meses à vista
                          </span>
                          <span className="text-xs opacity-80">
                            {fmtPrice(selectedPlan.prepaid_price)}
                          </span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {paymentType === 'prepaid' && selectedPlan.prepaid_months > 0 && (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">De</span>
                        <span className="line-through text-muted-foreground">
                          {fmtPrice(selectedPlan.price * selectedPlan.prepaid_months)}
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Por</span>
                        <span className="text-accent">{fmtPrice(selectedPlan.prepaid_price)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedPlan.prepaid_discount_pct}% de desconto à vista
                      </p>
                    </div>
                  )}

                  <Button
                    variant="amber"
                    size="lg"
                    className="w-full min-h-[56px]"
                    disabled={checkoutLoading || isSubscriber}
                    onClick={handleSubscribe}
                  >
                    {checkoutLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <CreditCard className="h-5 w-5 mr-2" />
                    )}
                    {isSubscriber ? 'Você já é assinante' : 'Assinar agora'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {plans.map((plan) => (
                  <Card
                    key={plan.id}
                    className="cursor-pointer hover:border-accent hover:shadow-md active:scale-[0.98] transition-all"
                    onClick={() => {
                      setSelectedPlan(plan)
                      setPaymentType('monthly')
                    }}
                  >
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="text-left min-w-0">
                        <p className="font-semibold">{plan.name}</p>
                        {plan.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {plan.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-accent">{fmtPrice(plan.price)}</p>
                        <p className="text-xs text-muted-foreground">por mês</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              className="w-full min-h-[48px]"
              onClick={() => {
                setShowPlans(false)
                setSelectedPlan(null)
              }}
            >
              Só este agendamento
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <div className="absolute top-0 left-0 right-0 h-1 barber-pole-stripes" />
        <Card className="max-w-md w-full border-success/40 bg-success/5">
          <CardContent className="flex flex-col items-center text-center p-8 animate-fade-in-up">
            <CheckCircle2 className="h-16 w-16 text-success mb-4 animate-bounce" />
            <h1 className="text-2xl font-bold">Agendamento Confirmado!</h1>
            <p className="text-muted-foreground mt-2">
              {customer?.name}, seu horário foi reservado com sucesso.
            </p>
            <Badge variant="success" className="mt-4">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Confirmado
            </Badge>

            {/* Upsell de assinatura */}
            {plans.length > 0 && !isSubscriber && (
              <div className="mt-6 w-full space-y-3 border-t pt-4">
                <div className="flex items-center justify-center gap-2">
                  <BadgeCheck className="h-5 w-5 text-accent" />
                  <span className="font-semibold">Seja um assinante!</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tenha benefícios exclusivos e economia com planos mensais.
                </p>
                <Button
                  variant="amber"
                  className="w-full min-h-[48px]"
                  onClick={() => setShowPlans(true)}
                >
                  Quero ser assinante!
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setDone(false)
                    setSelectedService(null)
                    setSelectedSlot('')
                  }}
                >
                  Só este agendamento
                </Button>
              </div>
            )}

            {(!plans.length || isSubscriber) && (
              <Button
                variant="amber"
                size="lg"
                className="mt-6 w-full min-h-[56px] touch-manipulation"
                onClick={() => {
                  setDone(false)
                  setSelectedService(null)
                  setSelectedSlot('')
                }}
              >
                Fazer Novo Agendamento
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const [y, m, d] = date ? date.split('-').map(Number) : [2026, 1, 1]
  const targetDate = new Date(y, m - 1, d)

  const slots = selectedService
    ? calculateSlotsWithSchedules(
        appointments,
        barberSchedules,
        selectedBarber,
        selectedService.duration_minutes,
        targetDate,
      )
    : []

  return (
    <div className="relative min-h-screen bg-background">
      <div className="absolute top-0 left-0 right-0 h-1 barber-pole-stripes z-50" />
      {/* Header sticky padronizado — 64px de altura em tablet+ */}
      <header className="sticky top-0 z-40 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto max-w-2xl flex h-full items-center gap-3 px-4 md:px-6">
          {tenant?.logo_url ? (
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="h-10 w-10 md:h-12 md:w-12 rounded-lg object-cover ring-2 ring-accent/20"
            />
          ) : (
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-lg bg-accent/10 ring-2 ring-accent/20">
              <Scissors className="h-5 w-5 md:h-6 md:w-6 text-accent" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold truncate">{tenant?.name}</h1>
            <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1">
              <Store className="h-3 w-3" /> Agendamento Online
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8">
        {!customer ? (
          <div className="animate-fade-in-up">
            <ClientIdentification
              tenantId={resolvedTenantId!}
              onIdentified={setCustomer}
              onSubscriptionFound={setActiveSubscription}
            />
          </div>
        ) : !selectedService ? (
          <div className="space-y-6 md:space-y-8 animate-fade-in-up">
            {/* Cliente identificado */}
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15">
                <User className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Bem-vindo</p>
                <p className="font-semibold truncate">{customer.name}</p>
                {activeSubscription && activeSubscription.sessions_remaining > 0 && (
                  <p className="text-xs text-accent font-medium mt-0.5">
                    {activeSubscription.sessions_remaining} agendamento
                    {activeSubscription.sessions_remaining === 1 ? '' : 's'} restante
                    {activeSubscription.sessions_remaining === 1 ? '' : 's'} este mês
                    {activeSubscription.plan_name ? ` · ${activeSubscription.plan_name}` : ''}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[48px] md:min-h-[56px] touch-manipulation"
                onClick={() => {
                  setCustomer(null)
                  setSelectedService(null)
                  setSelectedSlot('')
                  setActiveSubscription(null)
                }}
              >
                Trocar
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-semibold">Escolha um serviço</h2>
              <Badge variant="amber">{services.length} disponíveis</Badge>
            </div>

            {services.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center text-center py-10">
                  <CalendarX className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhum serviço cadastrado.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:gap-4">
                {services.map((s) => (
                  <Card
                    key={s.id}
                    className="touch-card cursor-pointer hover:border-accent hover:shadow-md active:scale-[0.98]"
                    onClick={() => setSelectedService(s)}
                  >
                    <CardContent className="flex items-center justify-between gap-4 p-4 md:p-5 min-h-[56px]">
                      <div className="flex items-center gap-3 md:gap-4 min-w-0">
                        <div className="flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                          <Scissors className="h-6 w-6 md:h-7 md:w-7 text-accent" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-base md:text-lg truncate">{s.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="font-normal">
                              <Clock className="h-3 w-3 mr-1" /> {s.duration_minutes} min
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg md:text-xl font-bold text-accent">
                          {fmtPrice(s.price)}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          Selecionar
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 md:space-y-8 animate-fade-in-up">
            {/* Resumo do serviço selecionado */}
            <Card className="bg-muted/30 border-accent/30">
              <CardContent className="flex items-center justify-between gap-3 p-4 min-h-[56px]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15">
                    <Scissors className="h-5 w-5 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{selectedService.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {fmtPrice(selectedService.price)} · {selectedService.duration_minutes} min
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[48px] md:min-h-[56px] touch-manipulation"
                  onClick={() => setSelectedService(null)}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Trocar
                </Button>
              </CardContent>
            </Card>

            {/* Seleção de profissional */}
            {barbers.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm md:text-base font-semibold">
                  Selecione o Profissional
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedBarber === null ? 'amber' : 'outline'}
                    size="sm"
                    className="min-h-[48px] md:min-h-[56px] touch-manipulation"
                    onClick={() => setSelectedBarber(null)}
                  >
                    Qualquer Profissional
                  </Button>
                  {barbers.map((b) => (
                    <Button
                      key={b}
                      variant={selectedBarber === b ? 'amber' : 'outline'}
                      size="sm"
                      className="min-h-[48px] md:min-h-[56px] touch-manipulation"
                      onClick={() => setSelectedBarber(b)}
                    >
                      {b}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Calendário — células e navegação otimizadas para toque */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm md:text-base font-semibold">
                <CalendarDays className="h-4 w-4 text-accent" /> Data do Atendimento
              </Label>
              <div className="relative">
                {loadingMonth && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 backdrop-blur-sm rounded-lg">
                    <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  </div>
                )}
                <Calendar
                  mode="single"
                  selected={selectedDateObj}
                  onSelect={(selectedDate) => {
                    if (selectedDate) setDate(formatLocalDateYYYYMMDD(selectedDate))
                  }}
                  disabled={(checkDate: Date) => {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    if (checkDate < today) return true
                    if (loadingMonth) return true
                    const dateStr = formatLocalDateYYYYMMDD(checkDate)
                    return !availableDates.has(dateStr)
                  }}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  fromDate={new Date()}
                  locale={ptBR}
                  className="rounded-lg border border-border bg-card p-2 md:p-3 w-full [--cell-size:44px] md:[--cell-size:56px]"
                  classNames={{
                    day_selected:
                      'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground rounded-md font-bold',
                    day_today: 'ring-2 ring-accent text-accent rounded-md',
                    day_disabled: 'text-muted-foreground/30 line-through cursor-not-allowed',
                    weekday:
                      'text-muted-foreground font-normal text-xs md:text-sm flex-1 text-center',
                    caption_label: 'text-sm md:text-base font-semibold',
                    month: 'flex w-full flex-col gap-4',
                    table: 'w-full border-collapse',
                    button_previous:
                      'touch-manipulation active:scale-95 transition-transform rounded-md',
                    button_next:
                      'touch-manipulation active:scale-95 transition-transform rounded-md',
                    day: cn(
                      'touch-manipulation active:scale-95 transition-transform rounded-md',
                      'group/day relative flex w-full items-center justify-center select-none p-0 text-center',
                    ),
                  }}
                />
              </div>
              {availableDates.size === 0 && !loadingMonth && selectedService && (
                <p className="text-sm text-muted-foreground text-center">
                  Nenhuma data disponível neste mês. Tente o próximo mês.
                </p>
              )}
            </div>

            {/* Horários — chips de 56px com scroll horizontal suave por período */}
            {loadingSlots ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
                <p className="text-sm text-muted-foreground mt-2">Carregando horários…</p>
              </div>
            ) : slots.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <CalendarX className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    Nenhum horário disponível para a data selecionada.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-5">
                {groupSlotsByPeriod(slots).map((group) => {
                  const availableCount = group.slots.filter((s) => s.available).length
                  return (
                    <div key={group.period} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-base md:text-lg font-semibold">
                          <Clock className="h-4 w-4 md:h-5 md:w-5 text-accent" /> {group.period}
                        </span>
                        <Badge variant={availableCount > 0 ? 'success' : 'outline'}>
                          {availableCount} livres
                        </Badge>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scroll-smooth">
                        {group.slots.map((slot) => (
                          <Button
                            key={slot.time}
                            type="button"
                            variant={selectedSlot === slot.time ? 'amber' : 'outline'}
                            size="sm"
                            disabled={!slot.available}
                            className={cn(
                              'flex flex-col items-center justify-center gap-0.5 py-2 px-3',
                              'min-h-[56px] min-w-[80px] shrink-0 snap-start',
                              'touch-manipulation active:scale-95 transition-transform',
                              '[&:disabled]:active:scale-100',
                              !slot.available &&
                                'opacity-50 bg-muted/60 cursor-not-allowed border-dashed line-through',
                            )}
                            onClick={() => slot.available && setSelectedSlot(slot.time)}
                          >
                            <span className="font-semibold text-base">{slot.time}</span>
                            <span
                              className={cn(
                                'text-[10px] font-normal',
                                slot.available
                                  ? 'text-success font-medium'
                                  : 'text-destructive font-medium',
                              )}
                            >
                              {slot.available ? 'Disponível' : 'Indisponível'}
                            </span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Resumo final + confirmação — grid 2 colunas, fonte grande, botão 56px */}
            {selectedSlot && (
              <Card ref={summaryRef} className="border-accent/40 shadow-md scroll-mt-20">
                <CardContent className="p-4 md:p-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm md:text-base">
                    <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-accent" />
                    <span className="font-semibold">Resumo do agendamento</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Serviço</p>
                      <p className="text-base md:text-lg font-medium truncate">
                        {selectedService.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Profissional</p>
                      <p className="text-base md:text-lg font-medium truncate">
                        {selectedBarber || 'Qualquer um'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Data</p>
                      <p className="text-base md:text-lg font-medium">
                        {selectedDateObj?.toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Horário</p>
                      <p className="text-base md:text-lg font-medium">{selectedSlot}</p>
                    </div>
                    <div className="col-span-2 border-t pt-2 flex justify-between items-center">
                      <span className="text-sm md:text-base text-muted-foreground">Valor</span>
                      <span className="text-lg md:text-xl font-bold text-accent">
                        {fmtPrice(selectedService.price)}
                      </span>
                    </div>
                  </div>

                  {/* Botão de crédito de assinatura ativa (se houver sessões restantes) */}
                  {activeSubscription && activeSubscription.sessions_remaining > 0 && (
                    <div className="space-y-2 rounded-lg border border-accent/40 bg-accent/5 p-3">
                      <div className="flex items-center gap-2 text-sm md:text-base">
                        <Sparkles className="h-4 w-4 md:h-5 w-5 text-accent" />
                        <span className="font-semibold">Você tem créditos de assinatura</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Restam <strong>{activeSubscription.sessions_remaining}</strong> agendamento
                        {activeSubscription.sessions_remaining === 1 ? '' : 's'} no seu plano
                        {activeSubscription.plan_name ? ` "${activeSubscription.plan_name}"` : ''}.
                        Use um crédito agora e agende sem pagamento.
                      </p>
                      <Button
                        variant="amber"
                        size="lg"
                        loading={booking}
                        className="w-full min-h-[56px] touch-manipulation shadow-lg"
                        onClick={() => handleBook({ useCredit: true })}
                      >
                        {booking ? 'Confirmando…' : `Usar crédito e Agendar para ${selectedSlot}`}
                      </Button>
                    </div>
                  )}

                  {/* Opção de pagamento antecipado com desconto (apenas se Stripe configurado
                      pelo admin, o barbeiro ativou o toggle de prepayment e houver plano
                      pré-pago disponível) */}
                  {stripeEnabled && prepaymentEnabled && prepaidPlan ? (
                    <div className="space-y-3 border-t pt-4">
                      <div className="flex items-center gap-2 text-sm md:text-base">
                        <CreditCard className="h-4 w-4 md:h-5 text-accent" />
                        <span className="font-semibold">Pagamento antecipado</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Assine o plano <strong>{prepaidPlan.name}</strong> com{' '}
                        {prepaidPlan.prepaid_months} meses à vista e ganhe{' '}
                        {prepaidPlan.prepaid_discount_pct}% de desconto.
                      </p>
                      {prepayChoice === null ? (
                        <div className="grid gap-2">
                          <Button
                            variant="amber"
                            className="w-full min-h-[56px] flex flex-col touch-manipulation"
                            disabled={booking}
                            onClick={() => setPrepayChoice('now')}
                          >
                            <span className="text-sm font-semibold">Pagar agora com desconto</span>
                            <span className="text-xs opacity-80">
                              {fmtPrice(prepaidPlan.prepaid_price)} · {prepaidPlan.prepaid_months}{' '}
                              meses
                            </span>
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full min-h-[48px] touch-manipulation"
                            disabled={booking}
                            onClick={() => setPrepayChoice('later')}
                          >
                            Agendar sem pagar
                          </Button>
                        </div>
                      ) : prepayChoice === 'now' ? (
                        <div className="space-y-2 rounded-lg border border-accent/40 bg-accent/5 p-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Plano</span>
                            <span className="font-medium">{prepaidPlan.name}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">De</span>
                            <span className="line-through text-muted-foreground">
                              {fmtPrice(prepaidPlan.price * prepaidPlan.prepaid_months)}
                            </span>
                          </div>
                          <div className="flex justify-between font-semibold">
                            <span>Por</span>
                            <span className="text-accent">
                              {fmtPrice(prepaidPlan.prepaid_price)}
                            </span>
                          </div>
                          <Button
                            variant="amber"
                            size="lg"
                            loading={booking}
                            className="w-full min-h-[56px] touch-manipulation shadow-lg"
                            onClick={() => handleBook({ prepay: true })}
                          >
                            {booking
                              ? 'Iniciando pagamento…'
                              : `Pagar ${fmtPrice(prepaidPlan.prepaid_price)} e Agendar`}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            disabled={booking}
                            onClick={() => setPrepayChoice(null)}
                          >
                            Voltar
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Button
                            variant="amber"
                            size="lg"
                            loading={booking}
                            className="w-full min-h-[56px] text-base md:text-lg touch-manipulation shadow-lg"
                            onClick={() => handleBook()}
                          >
                            {booking
                              ? 'Confirmando…'
                              : `Confirmar Agendamento para ${selectedSlot}`}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            disabled={booking}
                            onClick={() => setPrepayChoice(null)}
                          >
                            Ver opção com desconto
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="amber"
                      size="lg"
                      loading={booking}
                      className="w-full min-h-[56px] text-base md:text-lg touch-manipulation shadow-lg"
                      onClick={() => handleBook()}
                    >
                      {booking ? 'Confirmando…' : `Confirmar Agendamento para ${selectedSlot}`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* Banners do Totem PWA — instalação e nova versão */}
      {totemPwa.updateAvailable && (
        <div className="fixed bottom-4 inset-x-4 z-[60] mx-auto max-w-md rounded-lg border border-accent/40 bg-accent text-accent-foreground shadow-lg animate-fade-in-up">
          <button
            type="button"
            onClick={totemPwa.applyUpdate}
            className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold touch-manipulation"
          >
            <RefreshCw className="h-4 w-4" />
            Nova versão disponível — toque para atualizar
          </button>
        </div>
      )}

      {!totemPwa.standalone && totemPwa.installPrompt && !totemPwa.updateAvailable && (
        <div className="fixed bottom-4 inset-x-4 z-[60] mx-auto max-w-md rounded-lg border border-accent/40 bg-background shadow-lg animate-fade-in-up">
          <div className="flex items-center gap-3 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15">
              <Download className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Adicionar à tela inicial</p>
              <p className="text-xs text-muted-foreground">Instale o totem para acesso rápido.</p>
            </div>
            <Button
              variant="amber"
              size="sm"
              className="touch-manipulation"
              onClick={() => totemPwa.triggerInstall()}
            >
              <MonitorSmartphone className="h-4 w-4 mr-1" /> Instalar
            </Button>
          </div>
        </div>
      )}

      {/* Botão de suporte para o cliente */}
      <SupportFAB />
    </div>
  )
}

const SUPPORT_EMAIL = 'silvarodriguesjohnny@gmail.com'
const SUPPORT_SUBJECT = 'Suporte Na Régua - Cliente'

function SupportFAB() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')

  const handleSend = () => {
    const body = message.trim() || 'Preciso de suporte na plataforma Na Régua.'
    const href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(SUPPORT_SUBJECT)}&body=${encodeURIComponent(body)}`
    window.location.href = href
    setOpen(false)
    setMessage('')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 items-center gap-2 rounded-full bg-amber-500 px-5 text-white shadow-lg shadow-amber-500/30 transition-all hover:bg-amber-600 active:scale-95"
        aria-label="Suporte"
      >
        <LifeBuoy className="h-6 w-6" />
        <span className="text-sm font-semibold">Suporte</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                  <LifeBuoy className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Precisa de ajuda?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Descreva o problema
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Ex: Não consigo selecionar um horário..."
              className="w-full resize-none rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800 outline-none focus:border-amber-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSend}
                className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600"
              >
                <Send className="h-4 w-4" />
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
