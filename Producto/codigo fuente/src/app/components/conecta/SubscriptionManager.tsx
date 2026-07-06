import { useEffect, useState } from 'react';
import {
  CreditCard,
  Check,
  X,
  Loader2,
  AlertCircle,
  Calendar,
  TrendingUp,
  Shield,
  Zap,
  Building2,
  Clock,
  Download,
  RefreshCw,
  Mail,
  Bell,
  Banknote,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Lock,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase } from '../../context/AuthContext';
import { initiatePayment, sendEmail, createTransferPayment } from '../../services/paymentService';
import type { Subscription, Payment } from '../../types/database';

interface Props {
  empresaId: string;
  isAdmin?: boolean;
}

const AUDITORIA_PRECIO = 149000;

const PLANES = [
  {
    id: 'A',
    nombre: 'Asesoría Básica',
    precio: 79000,
    precioPrimerMes: 79000,
    descuento: 0,
    descripcion: 'Ideal para empresas que necesitan orientación puntual',
    features: [
      '1 consulta mensual con experto',
      'Respuestas en 48 hrs',
      'Acceso a base de normativas',
      'Soporte vía chat',
    ],
    icon: Shield,
    color: '#3b82f6',
    popular: false,
  },
  {
    id: 'B',
    nombre: 'Gestión PyME',
    precio: 159000,
    precioPrimerMes: 109000,
    descuento: 50000,
    descripcion: 'Solución completa para pequeñas y medianas empresas',
    features: [
      '5 consultas mensuales',
      'Respuestas en 24 hrs',
      'Acceso a base de normativas',
      'Revisión de 2 contratos/mes',
      'Informes trimestrales',
      'Soporte prioritario',
    ],
    icon: Zap,
    color: '#8b5cf6',
    popular: true,
  },
  {
    id: 'C',
    nombre: 'Remuneraciones',
    precio: 269000,
    precioPrimerMes: 169000,
    descuento: 100000,
    descripcion: 'Gestión integral de nómina y compensaciones',
    features: [
      'Consultas ilimitadas',
      'Respuestas en 12 hrs',
      'Cálculo de remuneraciones',
      'Optimización de costos laborales',
      'Revisión de 5 contratos/mes',
      'Reportes mensuales personalizados',
      'Soporte telefónico',
    ],
    icon: TrendingUp,
    color: '#f59e0b',
    popular: false,
  },
  {
    id: 'D',
    nombre: 'RRHH Integral',
    precio: 429000,
    precioPrimerMes: 280000,
    descuento: 149000,
    descripcion: 'Outsourcing completo de recursos humanos',
    features: [
      'Consultas ilimitadas VIP',
      'Respuestas inmediatas',
      'Gestión integral de RRHH',
      'Auditorías trimestrales',
      'Revisión de contratos ilimitada',
      'Reportes semanales ejecutivos',
      'Soporte 24/7 dedicado',
      'Workshops trimestrales',
    ],
    icon: Building2,
    color: '#6366f1',
    popular: false,
  },
];

export function SubscriptionManager({ empresaId, isAdmin = false }: Props) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [showAuditoriaPayment, setShowAuditoriaPayment] = useState(false);
  const [showPlanPreview, setShowPlanPreview] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [auditoriaPagada, setAuditoriaPagada] = useState(false);
  const [primerMesPagado, setPrimerMesPagado] = useState(false);
  const [recommendedPlan, setRecommendedPlan] = useState<string | null>(null);
  const [enterprisePlan, setEnterprisePlan] = useState<string | null>(null);
  const [enterprisePlanPrice, setEnterprisePlanPrice] = useState<number | null>(null);
  const [customPlanDetails, setCustomPlanDetails] = useState<{
    nombre: string;
    descripcion: string;
    features: string[];
  } | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<
    'method' | 'details' | 'processing' | 'success' | 'error'
  >('method');
  const [paymentMethod, setPaymentMethod] = useState<'webpay' | 'transfer'>(
    'webpay'
  );
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    success: boolean;
    message: string;
    paymentId?: string;
  } | null>(null);
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '', name: '' });

  const supabase = getSupabase();

  const periodoFin = subscription?.fecha_fin
    ? new Date(subscription.fecha_fin)
    : null;
  const planChangeLocked =
    !isAdmin &&
    subscription?.estado === 'active' &&
    !!periodoFin &&
    periodoFin.getTime() > Date.now();
  const desbloqueoPlanLabel = periodoFin
    ? periodoFin.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  useEffect(() => {
    loadSubscription();
  }, [empresaId]);

  const loadSubscription = async () => {
    setLoading(true);
    try {

      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (subError && subError.code !== 'PGRST116') throw subError;
      setSubscription(subData || null);

      const { data: empresaData } = await supabase
        .from('enterprises')
        .select('plan, plan_price, auditoria_pagada, primer_mes_pagado, recommended_plan')
        .eq('id', empresaId)
        .single();

      if (empresaData) {
        setAuditoriaPagada(empresaData.auditoria_pagada || false);
        setPrimerMesPagado(empresaData.primer_mes_pagado || false);
        setRecommendedPlan(empresaData.recommended_plan || null);
        const precio =
          typeof empresaData.plan_price === 'number' ? empresaData.plan_price : null;
        setEnterprisePlanPrice(precio);

        if (empresaData.plan) {
          setEnterprisePlan(empresaData.plan);
        }

        if (empresaData.plan === 'Personalizado' && precio) {
          const { data: kvCustom } = await supabase
            .from('kv_store_7d36b31f')
            .select('value')
            .eq('key', `plan_personalizado:${empresaId}`)
            .maybeSingle();
          if (kvCustom?.value && typeof kvCustom.value === 'object') {
            const v = kvCustom.value as Record<string, unknown>;
            setCustomPlanDetails({
              nombre: (v.nombre as string) || 'Acuerdo Personalizado',
              descripcion: (v.descripcion as string) || 'Plan negociado con SotLoy Asesorías',
              features: Array.isArray(v.features)
                ? (v.features as string[])
                : ['Precio mensual personalizado', 'Condiciones a medida'],
            });
          }
        }
      }

      const { data: payData } = await supabase
        .from('payments')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('fecha_creacion', { ascending: false });

      setPayments(payData || []);
    } catch (err) {
      toast.error('Error cargando suscripción');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!selectedPlan) return;

    setPaymentProcessing(true);
    setPaymentStep('processing');

    try {
      const plan = getPlan(selectedPlan);
      if (!plan) throw new Error('Plan no encontrado');

      const { data: freshSub } = await supabase
        .from('subscriptions')
        .select('estado, fecha_fin')
        .eq('empresa_id', empresaId)
        .maybeSingle();

      const esRenovacion = (freshSub?.estado ?? subscription?.estado) === 'past_due';
      const incluyeAuditoria = !auditoriaPagadaEfectiva;
      const montoPagar = esRenovacion
        ? plan.precio
        : plan.precioPrimerMes + (incluyeAuditoria ? AUDITORIA_PRECIO : 0);
      const concepto = esRenovacion
        ? `Renovación mensual - Plan ${selectedPlan} ${plan.nombre}`
        : incluyeAuditoria
          ? `Auditoría + Plan ${selectedPlan} ${plan.nombre} - Primer Mes`
          : `Plan ${selectedPlan} - ${plan.nombre} - Primer Mes`;

      const payment = await initiatePayment({
        empresaId,
        plan: selectedPlan,
        monto: montoPagar,
        concepto,
        metodoPago: 'webpay',
        tipo: 'plan',
      });

      if (!payment.success || !payment.paymentUrl) {
        throw new Error(payment.error || 'No se pudo iniciar el pago en Flow');
      }

      setPaymentResult({
        success: true,
        message: 'Redirigiendo a Flow para completar el pago',
        paymentId: payment.paymentId,
      });
      setPaymentStep('success');
      window.location.href = payment.paymentUrl;
      return;
    } catch (err) {
      console.error('Error procesando pago:', err);
      const msg = err instanceof Error ? err.message : 'Error al procesar el pago. Intenta nuevamente.';
      setPaymentResult({
        success: false,
        message: msg,
      });
      setPaymentStep('error');
      toast.error(msg);
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handlePayAuditoria = async () => {
    setPaymentProcessing(true);
    setPaymentStep('processing');
    try {
      const payment = await initiatePayment({
        empresaId,
        plan: 'AUDITORIA',
        monto: AUDITORIA_PRECIO,
        concepto: 'Auditoría inicial SotLoy',
        metodoPago: 'webpay',
        tipo: 'auditoria',
      });
      if (!payment.success || !payment.paymentUrl) {
        throw new Error(payment.error || 'No se pudo iniciar el pago en Flow');
      }
      setPaymentResult({
        success: true,
        message: 'Redirigiendo a Flow para pagar la auditoría',
        paymentId: payment.paymentId,
      });
      setPaymentStep('success');
      window.location.href = payment.paymentUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el pago.';
      setPaymentResult({ success: false, message: msg });
      setPaymentStep('error');
      toast.error(msg);
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleTransferIntent = async () => {

    const incluyeAuditoria = !auditoriaPagadaEfectiva;
    const esSoloAuditoria = incluyeAuditoria && !selectedPlan;
    if (!esSoloAuditoria && !selectedPlan) return;
    setPaymentProcessing(true);
    setPaymentStep('processing');
    try {
      let monto: number;
      let concepto: string;
      let planId: string;
      let tipo: 'auditoria' | 'plan';

      if (esSoloAuditoria) {
        monto = AUDITORIA_PRECIO;
        concepto = 'Auditoría inicial SotLoy - Transferencia';
        planId = 'AUDITORIA';
        tipo = 'auditoria';
      } else {
        const plan = getPlan(selectedPlan!);
        if (!plan) throw new Error('Plan no encontrado');
        const esRenovacion = subscription?.estado === 'past_due';
        monto = esRenovacion
          ? plan.precio
          : plan.precioPrimerMes + (incluyeAuditoria ? AUDITORIA_PRECIO : 0);
        concepto = esRenovacion
          ? `Renovación mensual - Plan ${selectedPlan} ${plan.nombre} - Transferencia`
          : incluyeAuditoria
            ? `Auditoría + Plan ${selectedPlan} ${plan.nombre} - Transferencia`
            : `Plan ${selectedPlan} - ${plan.nombre} - Transferencia`;
        planId = selectedPlan!;
        tipo = 'plan';
      }

      const res = await createTransferPayment({
        empresaId,
        plan: planId,
        monto,
        concepto,
        tipo,
      });

      if (!res.success) {
        throw new Error(res.error || 'No se pudo registrar la transferencia');
      }

      setPaymentResult({
        success: true,
        message:
          res.message ||
          'Tu transferencia ha sido registrada. SotLoy verificará el pago y activará tu cuenta dentro de 24-48 horas hábiles.',
      });
      setPaymentStep('success');
    } catch (err) {
      console.error('Error registrando transferencia:', err);
      const msg = err instanceof Error ? err.message : 'Error al registrar la transferencia.';
      setPaymentResult({ success: false, message: msg });
      setPaymentStep('error');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const sendPaymentNotifications = async (
    plan: (typeof PLANES)[0],
    monto: number,
    paymentId: string
  ) => {
    try {

      const { data: empresa } = await supabase
        .from('enterprises')
        .select('email, name')
        .eq('id', empresaId)
        .single();

      if (empresa?.email) {
        await sendEmail(empresa.email, 'paymentConfirmation', {
          nombre: empresa.name || 'Cliente',
          plan: plan.nombre,
          monto: monto.toLocaleString('es-CL'),
          paymentId: paymentId,
          fecha: new Date().toLocaleDateString('es-CL'),
        });
        console.log('📧 Email de confirmación enviado a:', empresa.email);
      }

      const { data: recipients } = await supabase
        .from('user_enterprises')
        .select('user_id')
        .eq('enterprise_id', empresaId)
        .eq('is_active', true);

      if (recipients?.length) {
        const { error: notifError } = await supabase
          .from('notificaciones')
          .insert(
            recipients.map((r) => ({
              user_id: r.user_id,
              titulo: `Plan ${plan.nombre} Activado`,
              mensaje: `Tu pago de $${monto.toLocaleString()} ha sido procesado exitosamente. El plan ${plan.nombre} está ahora activo.`,
              tipo: 'success',
              leida: false,
              created_at: new Date().toISOString(),
            }))
          );

        if (notifError) {
          console.error('Error creando notificación:', notifError);
        } else {
          console.log('🔔 Anuncio creado en el sistema');
        }
      }

      console.log('📧 NOTIFICACIÓN A ADMIN:');
      console.log('   Asunto: Nueva suscripción activada');
      console.log('   Empresa ID: ' + empresaId);
      console.log('   Plan: ' + plan.nombre);
      console.log('   Monto: $' + monto.toLocaleString());
    } catch (err) {
      console.error('Error enviando notificaciones:', err);
    }
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    if (paymentResult?.success) {
      setShowChangePlan(false);
      setSelectedPlan(null);
      loadSubscription();
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const IVA_RATE = 0.19;
  const ivaBreakdown = (total: number) => {
    const neto = Math.round(total / (1 + IVA_RATE));
    return { neto, iva: total - neto };
  };

  const getEstadoBadge = (
    estado: string,
    auditoriaPagadaLocal: boolean = false
  ) => {
    const styles: Record<string, { bg: string; color: string; label: string }> =
      {
        trial: {
          bg: '#fffbeb',
          color: '#d97706',
          label: auditoriaPagadaLocal ? 'Sin Plan' : 'Auditoría Pendiente',
        },
        active: { bg: '#f0fdf4', color: '#15803d', label: 'Activo' },
        past_due: { bg: '#fef2f2', color: '#dc2626', label: 'Mensualidad vencida' },
        suspended: { bg: '#fef2f2', color: '#dc2626', label: 'Suspendido' },
        cancelled: { bg: '#f3f4f6', color: '#6b7280', label: 'Cancelado' },
      };

    const style = styles[estado] || styles.trial;

    return (
      <span
        className="px-3 py-1 rounded-full text-sm font-medium"
        style={{ backgroundColor: style.bg, color: style.color }}
      >
        {style.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const planNameToId: Record<string, string> = {
    'Asesoría Básica': 'A',
    'Gestión PyME': 'B',
    Remuneraciones: 'C',
    'RRHH Integral': 'D',
  };

  const enterprisePlanId =
    enterprisePlan && enterprisePlan.length > 1
      ? planNameToId[enterprisePlan] || enterprisePlan
      : enterprisePlan;

  const effectivePlan = subscription?.plan || enterprisePlanId;
  const customPlan =
    enterprisePlanId === 'Personalizado' && enterprisePlanPrice
      ? {
          id: 'Personalizado',
          nombre: customPlanDetails?.nombre || 'Acuerdo Personalizado',
          precio: enterprisePlanPrice,
          precioPrimerMes: enterprisePlanPrice,
          descuento: 0,
          descripcion:
            customPlanDetails?.descripcion ||
            'Plan negociado directamente con SotLoy Asesorías',
          features: customPlanDetails?.features || [
            'Precio mensual personalizado',
            'Condiciones a medida',
            'Soporte dedicado',
          ],
          icon: Sparkles,
          color: '#0ea5e9',
          popular: false,
        }
      : null;

  const planCatalog = customPlan ? [...PLANES, customPlan] : PLANES;
  const getPlan = (planId: string | null) =>
    planCatalog.find((p) => p.id === planId);
  const currentPlan = getPlan(effectivePlan || null);

  const displayPlan = getPlan(selectedPlan) || currentPlan;
  const subscriptionIsActive = subscription?.estado === 'active';
  const subscriptionIsSuspended = subscription?.estado === 'suspended';
  const auditoriaPagadaEfectiva = auditoriaPagada || subscriptionIsActive;
  const primerMesPagadoEfectivo = primerMesPagado || subscriptionIsActive;

  const hasActivePlan =
    subscription?.plan ||
    (enterprisePlanId &&
      ['A', 'B', 'C', 'D', 'Personalizado'].includes(enterprisePlanId));
  const billingUpToDate =
    Boolean(hasActivePlan) &&
    !subscriptionIsSuspended &&
    auditoriaPagadaEfectiva &&
    primerMesPagadoEfectivo;

  const esRenovacion = subscription?.estado === 'past_due';

  const transferPendiente =
    !billingUpToDate &&
    payments.some((p) => {
      const meta = (p.flow_response || {}) as Record<string, unknown>;
      return (
        p.estado === 'pending' &&
        ((p as { metodo_pago?: string }).metodo_pago === 'transferencia' ||
          meta.requiere_revision === true)
      );
    });

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(9,31,52,0.06)' }}
          >
            <CreditCard className="w-5 h-5" style={{ color: '#091f34' }} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Suscripción y Pagos
            </h2>
            <p className="text-sm text-gray-500">
              Gestiona tu plan, pagos y estado de cuenta
            </p>
          </div>
        </div>
      </div>

      {!showChangePlan && (
        <div className="rounded-xl p-6 border border-gray-200 bg-white shadow-sm">

          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              {displayPlan ? (
                <displayPlan.icon
                  className="w-10 h-10"
                  style={{ color: displayPlan.color }}
                />
              ) : (
                <AlertCircle className="w-10 h-10 text-yellow-600" />
              )}
              <div>
                <h3 className="text-xl font-semibold">
                  {displayPlan
                    ? `Plan ${displayPlan.nombre}`
                    : 'Sin Plan Activado'}
                </h3>
                <p className="text-gray-600 text-sm">
                  {displayPlan
                    ? displayPlan.descripcion
                    : 'Complete el pago de auditoría para activar un plan'}
                </p>
              </div>
            </div>
            <div className="text-right">
              {transferPendiente ? (
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{ backgroundColor: '#fffbeb', color: '#b45309' }}
                >
                  Pago en revisión
                </span>
              ) : (
                getEstadoBadge(
                  billingUpToDate ? 'active' : subscription?.estado || 'trial',
                  auditoriaPagadaEfectiva
                )
              )}
            </div>
          </div>

          <div
            className={`rounded-xl p-6 border ${
              billingUpToDate
                ? 'bg-green-50/60 border-green-200'
                : transferPendiente
                  ? 'bg-amber-50/60 border-amber-200'
                  : 'bg-amber-50/50 border-amber-200'
            }`}
          >
            {transferPendiente ? (

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-amber-700 font-semibold">
                  <Clock className="w-5 h-5" />
                  <span>PAGO POR TRANSFERENCIA EN REVISIÓN</span>
                </div>
                <p className="text-sm text-amber-800">
                  Registramos tu transferencia. Está{' '}
                  <strong>pendiente de confirmación por un administrador</strong> de
                  SotLoy. En cuanto verifiquemos el ingreso (24-48 hrs hábiles), tu
                  plan se activará automáticamente.
                </p>
                <div className="bg-white/80 rounded-lg p-3 text-sm text-amber-700 border border-amber-200 flex items-center gap-2">
                  <Bell className="w-4 h-4 flex-shrink-0" />
                  No necesitas hacer nada más. Te avisaremos por correo cuando se
                  confirme.
                </div>
              </div>
            ) : hasActivePlan && currentPlan && billingUpToDate ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-700 font-semibold">
                  <CheckCircle className="w-5 h-5" />
                  <span>CUENTA ACTIVA Y AL DÍA</span>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-green-700 font-medium mb-1">
                      Tu suscripción se encuentra vigente.
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-green-700">
                        {formatPrice(currentPlan.precio)}
                      </span>
                      <span className="text-gray-600 font-medium">/mes</span>
                    </div>
                    {(() => {
                      const { neto, iva } = ivaBreakdown(currentPlan.precio);
                      return (
                        <p className="text-xs text-gray-500 mt-1">
                          IVA incluido (19%) · Neto {formatPrice(neto)} + IVA{' '}
                          {formatPrice(iva)}
                        </p>
                      );
                    })()}
                    {subscription?.fecha_fin && (
                      <p className="text-sm text-green-700 mt-2 flex items-center gap-1 font-medium">
                        <Calendar className="w-4 h-4" />
                        Próxima renovación:{' '}
                        {new Date(subscription.fecha_fin).toLocaleDateString(
                          'es-CL'
                        )}
                      </p>
                    )}
                  </div>

                  {planChangeLocked ? (
                    <div className="flex flex-col items-start lg:items-end gap-1">
                      <span className="flex items-center gap-2 px-4 py-3 border border-gray-200 text-gray-400 rounded-lg text-sm font-medium bg-gray-50 cursor-not-allowed select-none">
                        <Lock className="w-4 h-4" />
                        Cambio de plan bloqueado
                      </span>
                      <p className="text-xs text-gray-500 lg:text-right max-w-[14rem]">
                        Ya pagaste tu plan este mes. Podrás cambiarlo desde el{' '}
                        <span className="font-medium">{desbloqueoPlanLabel}</span>,
                        al renovar tu periodo.
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowChangePlan(true)}
                      className="flex items-center justify-center gap-2 px-4 py-3 border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition text-sm font-medium"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Cambiar Plan
                    </button>
                  )}
                </div>
              </div>
            ) : (hasActivePlan || selectedPlan) && displayPlan ? (

              <div className="space-y-5">

                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {!auditoriaPagadaEfectiva
                      ? 'Activación pendiente'
                      : esRenovacion
                        ? 'Mensualidad pendiente'
                        : 'Plan seleccionado'}
                  </span>
                  <h4 className="text-base font-semibold text-gray-900 mt-2.5">
                    {!auditoriaPagadaEfectiva
                      ? 'Completa tu primer pago para activar el servicio'
                      : esRenovacion
                        ? 'Renueva tu mensualidad para mantener el servicio'
                        : 'Paga tu primer mes para activar el plan'}
                  </h4>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {!auditoriaPagadaEfectiva
                      ? 'Tu plan ya está asignado. Solo falta el pago inicial: la auditoría y el primer mes.'
                      : esRenovacion
                        ? 'Tu periodo actual venció. Paga la mensualidad para seguir usando SotLoy Conecta.'
                        : 'Ya pagaste tu auditoría. Confirma el pago del primer mes (con descuento de bienvenida) para activar tu plan.'}
                  </p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  {!auditoriaPagadaEfectiva ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          Auditoría inicial{' '}
                          <span className="text-gray-400">(pago único)</span>
                        </span>
                        <span className="font-medium text-gray-900">
                          {formatPrice(AUDITORIA_PRECIO)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          Primer mes · Plan {displayPlan.nombre}
                          {displayPlan.descuento > 0 && (
                            <span className="ml-1.5 text-green-600 text-xs font-medium">
                              (ahorras {formatPrice(displayPlan.descuento)})
                            </span>
                          )}
                        </span>
                        <span className="font-medium text-gray-900">
                          {displayPlan.descuento > 0 && (
                            <span className="text-gray-400 line-through font-normal mr-1.5">
                              {formatPrice(displayPlan.precio)}
                            </span>
                          )}
                          {formatPrice(displayPlan.precioPrimerMes)}
                        </span>
                      </div>
                      <div className="border-t border-gray-100 pt-2.5 flex items-center justify-between">
                        <span className="font-semibold text-gray-900">
                          Total a pagar ahora
                        </span>
                        <span className="text-2xl font-bold text-gray-900">
                          {formatPrice(
                            displayPlan.precioPrimerMes + AUDITORIA_PRECIO
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Desde el segundo mes pagarás{' '}
                        {formatPrice(displayPlan.precio)}/mes.
                      </p>
                    </div>
                  ) : esRenovacion ? (
                    <div className="flex items-baseline justify-between">
                      <span className="font-semibold text-gray-900">
                        Mensualidad
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-gray-900">
                          {formatPrice(displayPlan.precio)}
                        </span>
                        <span className="text-gray-500 text-sm">/mes</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          Primer mes · Plan {displayPlan.nombre}
                          {displayPlan.descuento > 0 && (
                            <span className="ml-1.5 text-green-600 text-xs font-medium">
                              (ahorras {formatPrice(displayPlan.descuento)})
                            </span>
                          )}
                        </span>
                        <span className="font-medium text-gray-900">
                          {displayPlan.descuento > 0 && (
                            <span className="text-gray-400 line-through font-normal mr-1.5">
                              {formatPrice(displayPlan.precio)}
                            </span>
                          )}
                          {formatPrice(displayPlan.precioPrimerMes)}
                        </span>
                      </div>
                      <div className="border-t border-gray-100 pt-2.5 flex items-center justify-between">
                        <span className="font-semibold text-gray-900">
                          Total a pagar ahora
                        </span>
                        <span className="text-2xl font-bold text-gray-900">
                          {formatPrice(displayPlan.precioPrimerMes)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Desde el segundo mes pagarás{' '}
                        {formatPrice(displayPlan.precio)}/mes.
                      </p>
                    </div>
                  )}
                  {(() => {
                    const total = !auditoriaPagadaEfectiva
                      ? displayPlan.precioPrimerMes + AUDITORIA_PRECIO
                      : esRenovacion
                        ? displayPlan.precio
                        : displayPlan.precioPrimerMes;
                    const { neto, iva } = ivaBreakdown(total);
                    return (
                      <p className="text-xs text-gray-500 mt-2.5 pt-2.5 border-t border-gray-100">
                        IVA incluido (19%) · Neto {formatPrice(neto)} + IVA{' '}
                        {formatPrice(iva)}
                      </p>
                    );
                  })()}
                  {subscription?.fecha_fin && (
                    <p className="text-sm text-amber-700 mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5 font-medium">
                      <Calendar className="w-4 h-4" />
                      Vence el{' '}
                      {new Date(subscription.fecha_fin).toLocaleDateString(
                        'es-CL'
                      )}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">

                  <button
                    onClick={() => {
                      setSelectedPlan(displayPlan.id);
                      setPaymentStep('method');
                      setPaymentMethod('webpay');
                      setCardData({ number: '', expiry: '', cvv: '', name: '' });
                      setPaymentResult(null);
                      setShowPaymentModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 text-white rounded-lg transition font-semibold shadow-sm"
                    style={{ backgroundColor: '#091f34' }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = '#0d2b48')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = '#091f34')
                    }
                  >
                    <CreditCard className="w-5 h-5" />
                    {!auditoriaPagadaEfectiva
                      ? 'Pagar auditoría + primer mes'
                      : esRenovacion
                        ? 'Pagar mensualidad'
                        : 'Pagar primer mes'}
                  </button>

                  {!auditoriaPagadaEfectiva && (
                    <button
                      onClick={() => {
                        setSelectedPlan(null);
                        setPaymentStep('method');
                        setPaymentMethod('webpay');
                        setCardData({
                          number: '',
                          expiry: '',
                          cvv: '',
                          name: '',
                        });
                        setPaymentResult(null);
                        setShowPaymentModal(true);
                      }}
                      className="flex items-center justify-center gap-2 px-5 py-3 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                    >
                      <Shield className="w-4 h-4" />
                      Solo auditoría
                    </button>
                  )}

                  <button
                    onClick={() => setShowChangePlan(true)}
                    className="flex items-center justify-center gap-2 px-5 py-3 text-gray-600 hover:bg-gray-100 rounded-lg transition text-sm font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Cambiar plan
                  </button>
                </div>

                <p className="text-xs text-gray-500 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
                  Si no realizas el pago, tu suscripción podría suspenderse y
                  perderás acceso al servicio.
                </p>
              </div>
            ) : !auditoriaPagadaEfectiva ? (

              <>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <span className="inline-block px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded-full font-semibold mb-2">
                    Paso 1 de 2
                  </span>
                  <p className="text-sm text-yellow-700 mb-1">
                    Para comenzar, paga tu auditoría inicial:
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-yellow-700">
                      {formatPrice(AUDITORIA_PRECIO)}
                    </span>
                    <span className="text-gray-500">Auditoría inicial</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Puedes pagar solo la auditoría y elegir tu plan después, o
                    pagar la auditoría junto con tu primer mes de plan de una vez.
                  </p>
                </div>

                <div className="flex flex-col gap-2">

                  <button
                    onClick={() => {
                      setSelectedPlan(null);
                      setShowChangePlan(true);
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-medium"
                  >
                    <Zap className="w-4 h-4" />
                    Pagar auditoría + plan
                  </button>

                  <button
                    onClick={() => {
                      setSelectedPlan(null);
                      setPaymentStep('method');
                      setPaymentMethod('webpay');
                      setPaymentResult(null);
                      setShowPaymentModal(true);
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-2 border border-yellow-300 text-yellow-700 bg-white rounded-lg hover:bg-yellow-50 transition text-sm font-medium"
                  >
                    Solo pagar auditoría
                  </button>
                  <button
                    onClick={() => setShowPlanPreview((v) => !v)}
                    className="flex items-center justify-center gap-2 px-6 py-2 border border-yellow-300 text-yellow-700 bg-white rounded-lg hover:bg-yellow-50 transition text-sm font-medium"
                  >
                    <TrendingUp className="w-4 h-4" />
                    {showPlanPreview ? 'Ocultar precios' : 'Ver precios del 1° mes'}
                  </button>
                </div>
              </div>

              {showPlanPreview && (
                <div className="mt-4 bg-white rounded-lg border border-yellow-200 p-4">
                  <h4 className="font-semibold text-gray-800 mb-1 text-sm">
                    Precios del primer mes (con descuento de bienvenida)
                  </h4>
                  <p className="text-xs text-gray-500 mb-3">
                    Estos son los planes que podrás elegir una vez confirmada la auditoría. La auditoría inicial se paga por separado.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-200">
                          <th className="pb-2 font-medium">Plan</th>
                          <th className="pb-2 font-medium">Precio normal</th>
                          <th className="pb-2 font-medium text-green-700">1° mes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {PLANES.map((plan) => (
                          <tr key={plan.id} className="border-b border-gray-100">
                            <td className="py-2 font-medium text-gray-800">
                              Plan {plan.id} · {plan.nombre}
                            </td>
                            <td className="py-2 text-gray-400 line-through">
                              {formatPrice(plan.precio)}
                            </td>
                            <td className="py-2 font-bold text-green-700">
                              {formatPrice(plan.precioPrimerMes)}
                              {plan.descuento > 0 && (
                                <span className="ml-1.5 text-xs font-normal text-green-600">
                                  (ahorras {formatPrice(plan.descuento)})
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Desde el segundo mes se cobra el precio normal del plan.
                  </p>
                </div>
              )}
              </>
            ) : (

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <span className="inline-block px-2 py-0.5 bg-green-200 text-green-800 text-xs rounded-full font-semibold mb-2">
                    Paso 2 de 2 · Auditoría pagada ✓
                  </span>
                  <p className="text-sm text-gray-700 mb-1">
                    {recommendedPlan
                      ? 'Tu asesor SotLoy te recomienda un plan. Elígelo o selecciona otro:'
                      : 'Ya puedes elegir el plan que mejor se ajuste a tu empresa:'}
                  </p>
                </div>

                <button
                  onClick={() => setShowChangePlan(true)}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  <Zap className="w-4 h-4" />
                  Elegir plan
                </button>
              </div>
            )}
          </div>

          {displayPlan && (
            <div className="mt-6">
              <h4 className="font-medium mb-3 text-gray-700">
                Tu plan incluye:
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {displayPlan.features.map((feature, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm text-gray-600"
                  >
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!displayPlan && (
            <div className="mt-6 bg-white rounded-lg p-4">
              <h4 className="font-medium mb-2 text-yellow-900">
                ¿Cómo funciona?
              </h4>
              <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                <li>
                  Paga la auditoría inicial de {formatPrice(AUDITORIA_PRECIO)} (vía Flow o transferencia)
                </li>
                <li>
                  Tu asesor SotLoy coordina una reunión y te recomienda un plan
                </li>
                <li>
                  Eliges tu plan y pagas el primer mes con descuento de bienvenida
                </li>
                <li>Desde el segundo mes, pagas el precio normal del plan</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {showChangePlan && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Selecciona un plan</h3>
            <button
              onClick={() => {
                setShowChangePlan(false);
                setSelectedPlan(null);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-900 mb-3">
              💡 Descuentos de Bienvenida (Primer Mes)
            </h4>
            <p className="text-sm text-blue-700 mb-3">
              {!auditoriaPagadaEfectiva
                ? `Se cobrará la auditoría inicial (${formatPrice(AUDITORIA_PRECIO)}) junto con el primer mes del plan que elijas. Estos son los precios del primer mes con el descuento de bienvenida:`
                : 'Estos son los precios del plan con el descuento de bienvenida del primer mes:'}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-blue-800 border-b border-blue-200">
                    <th className="pb-2">Plan</th>
                    <th className="pb-2">Precio Base</th>
                    <th className="pb-2">Descuento Plan</th>
                    <th className="pb-2 text-green-700">Pagarás 1° Mes</th>
                  </tr>
                </thead>
                <tbody className="text-blue-900">
                  {PLANES.map((plan) => (
                    <tr key={plan.id} className="border-b border-blue-100">
                      <td className="py-2 font-medium">
                        Plan {plan.id} - {plan.nombre}
                      </td>
                      <td className="py-2">{formatPrice(plan.precio)}</td>
                      <td className="py-2 text-green-600">
                        {plan.descuento > 0 ? `-${formatPrice(plan.descuento)}` : <span className="text-gray-400">Sin descuento</span>}
                      </td>
                      <td className="py-2 font-bold text-green-700">
                        {formatPrice(plan.precioPrimerMes)}
                      </td>
                    </tr>
                  ))}
                  {customPlan && (
                    <tr className="border-t-2 border-sky-200 bg-sky-50/60">
                      <td className="py-2 font-medium text-sky-700 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        {customPlan.nombre}
                      </td>
                      <td className="py-2 text-sky-700">{formatPrice(customPlan.precio)}</td>
                      <td className="py-2 text-sky-600">Negociado</td>
                      <td className="py-2 font-bold text-sky-700">
                        {formatPrice(customPlan.precio)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-blue-600 mt-3">
              Todos los precios incluyen IVA (19%). SotLoy Asesorías SpA emite
              boleta/factura con el IVA detallado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANES.map((plan) => {
              const isRecommended = recommendedPlan === plan.id;
              return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative p-5 rounded-xl border-2 cursor-pointer transition ${
                  selectedPlan === plan.id
                    ? 'border-blue-500 bg-blue-50'
                    : isRecommended
                      ? 'border-emerald-400 bg-emerald-50/50 hover:border-emerald-500 ring-2 ring-emerald-100'
                      : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 whitespace-nowrap shadow">
                    <Sparkles className="w-3 h-3" />
                    Recomendado por SotLoy
                  </div>
                )}
                {plan.popular && !isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Más Popular
                  </div>
                )}
                {plan.descuento === AUDITORIA_PRECIO && !isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Auditoría Gratis
                  </div>
                )}
                <div className="text-center">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: `${plan.color}20` }}
                  >
                    <span className="text-2xl font-bold" style={{ color: plan.color }}>
                      {plan.id}
                    </span>
                  </div>
                  <h4 className="font-semibold">{plan.nombre}</h4>
                  <p className="text-gray-500 text-xs mb-3">{plan.descripcion}</p>

                  <div className="mb-3">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-xl font-bold" style={{ color: plan.color }}>
                        {formatPrice(plan.precioPrimerMes)}
                      </span>
                      <span className="text-xs text-gray-400">/mes 1°</span>
                    </div>
                    <div className="text-xs text-gray-400 line-through">
                      {formatPrice(plan.precio)}
                    </div>
                    {plan.descuento > 0 && (
                      <div className="text-xs text-green-600 font-medium mt-1">
                        Ahorra {formatPrice(plan.descuento)} el primer mes
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      Luego {formatPrice(plan.precio)}/mes
                    </div>
                  </div>

                  <ul className="text-xs text-left space-y-1.5">
                    {plan.features.slice(0, 4).map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600">{f}</span>
                      </li>
                    ))}
                    {plan.features.length > 4 && (
                      <li className="text-xs text-gray-400 pl-4.5">
                        +{plan.features.length - 4} características más
                      </li>
                    )}
                  </ul>
                </div>
              </div>
              );
            })}
          </div>

          {customPlan ? (

            <div
              onClick={() => setSelectedPlan('Personalizado')}
              className={`relative flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-xl border-2 cursor-pointer transition ${
                selectedPlan === 'Personalizado'
                  ? 'border-sky-500 bg-sky-50'
                  : 'border-sky-200 bg-gradient-to-r from-sky-50/60 to-cyan-50/60 hover:border-sky-400'
              }`}
            >
              <div className="absolute -top-3 left-6 bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Acuerdo Exclusivo
              </div>
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#0ea5e920' }}
              >
                <Sparkles className="w-7 h-7" style={{ color: '#0ea5e9' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900">{customPlan.nombre}</h4>
                <p className="text-gray-500 text-sm mt-0.5">{customPlan.descripcion}</p>
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {customPlan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Check className="w-3 h-3 text-sky-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-2xl font-bold" style={{ color: '#0ea5e9' }}>
                  {formatPrice(customPlan.precio)}
                </div>
                <div className="text-xs text-gray-400">/mes</div>
                {selectedPlan === 'Personalizado' && (
                  <div className="mt-1">
                    <Check className="w-5 h-5 text-sky-500 ml-auto" />
                  </div>
                )}
              </div>
            </div>
          ) : (

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 cursor-not-allowed select-none">
              <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Lock className="w-7 h-7 text-gray-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-400">Acuerdo Personal con SotLoy</h4>
                  <span className="px-2 py-0.5 bg-gray-200 text-gray-500 text-xs rounded-full font-medium">
                    No disponible
                  </span>
                </div>
                <p className="text-gray-400 text-sm mt-0.5">
                  Esta opción se activa cuando SotLoy negocia condiciones especiales de precio y
                  servicios directamente contigo.
                </p>
                <p className="text-xs text-gray-400 mt-1.5">
                  ¿Interesado? Contáctanos a{' '}
                  <span className="text-blue-400">contacto@sotloy.cl</span>
                </p>
              </div>
              <div className="flex-shrink-0 text-gray-300">
                <Lock className="w-6 h-6" />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowChangePlan(false);
                setSelectedPlan(null);
              }}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (!selectedPlan) {
                  toast.error('Selecciona un plan primero');
                  return;
                }

                setShowChangePlan(false);
                toast.success('Plan seleccionado. Revisa el resumen y confirma el pago cuando quieras.');
              }}
              disabled={!selectedPlan}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              style={{ backgroundColor: '#091f34' }}
            >
              <Check className="w-4 h-4" />
              Confirmar selección
            </button>
          </div>
        </div>
      )}

      {!showChangePlan && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              Historial de Pagos
            </h3>
            {payments.length > 0 && (
              <span className="text-sm text-gray-500">
                {payments.length} pagos
              </span>
            )}
          </div>

          {payments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No hay pagos registrados</p>
              <p className="text-sm mt-1">
                {subscription?.estado === 'trial'
                  ? 'Estás en período de prueba'
                  : 'Los pagos aparecerán aquí'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                      Monto
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                      Referencia
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {new Date(payment.fecha_creacion).toLocaleDateString(
                          'es-CL'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {new Intl.NumberFormat('es-CL', {
                          style: 'currency',
                          currency: payment.moneda,
                        }).format(payment.monto)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            payment.estado === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : payment.estado === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : payment.estado === 'failed'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {payment.estado === 'completed'
                            ? 'Pagado'
                            : payment.estado === 'pending'
                              ? 'Pendiente'
                              : payment.estado === 'failed'
                                ? 'Fallido'
                                : payment.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {payment.referencia_flow || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {payment.estado === 'completed' && (
                          <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showPaymentModal && (selectedPlan || !auditoriaPagadaEfectiva) && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {paymentStep === 'success'
                          ? paymentMethod === 'transfer'
                            ? 'Transferencia Registrada'
                            : 'Redirigiendo a Flow'
                          : paymentStep === 'error'
                            ? 'Error en el Pago'
                            : 'Procesar Pago'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {!auditoriaPagadaEfectiva && !selectedPlan
                          ? 'Auditoría inicial'
                          : !auditoriaPagadaEfectiva
                            ? `Auditoría + ${getPlan(selectedPlan)?.nombre ?? ''}`
                            : getPlan(selectedPlan)?.nombre}
                      </p>
                    </div>
                  </div>
                  {paymentStep !== 'processing' && (
                    <button
                      onClick={handleClosePaymentModal}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6">

                {paymentStep === 'method' && (
                  <div className="space-y-6">

                    <p className="text-sm font-semibold text-gray-700">
                      Detalle de tu pago
                    </p>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                      {!auditoriaPagadaEfectiva && !selectedPlan ? (

                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Concepto:</span>
                            <span className="font-medium">Auditoría inicial</span>
                          </div>
                          <div className="border-t border-gray-200 pt-2 flex justify-between">
                            <span className="font-semibold text-gray-900">
                              Total a pagar:
                            </span>
                            <span className="font-bold text-blue-600 text-lg">
                              {formatPrice(AUDITORIA_PRECIO)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 pt-1">
                            Tras confirmarse, podrás elegir tu plan con el descuento de bienvenida.
                          </p>
                        </>
                      ) : esRenovacion ? (

                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Plan:</span>
                            <span className="font-medium">
                              {getPlan(selectedPlan)?.nombre}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Renovación mensual:</span>
                            <span className="font-medium">
                              {formatPrice(getPlan(selectedPlan)?.precio || 0)}
                            </span>
                          </div>
                          <div className="border-t border-gray-200 pt-2 flex justify-between">
                            <span className="font-semibold text-gray-900">
                              Total a pagar:
                            </span>
                            <span className="font-bold text-blue-600 text-lg">
                              {formatPrice(getPlan(selectedPlan)?.precio || 0)}
                            </span>
                          </div>
                        </>
                      ) : (

                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Plan seleccionado:</span>
                            <span className="font-medium">
                              {getPlan(selectedPlan)?.nombre}
                            </span>
                          </div>
                          {!auditoriaPagadaEfectiva && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Auditoría inicial:</span>
                              <span className="font-medium">
                                {formatPrice(AUDITORIA_PRECIO)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              Primer mes del plan{' '}
                              {(getPlan(selectedPlan)?.descuento || 0) > 0 && (
                                <span className="text-green-600">
                                  (incl. descuento de bienvenida)
                                </span>
                              )}
                              :
                            </span>
                            <span className="font-medium">
                              {formatPrice(getPlan(selectedPlan)?.precioPrimerMes || 0)}
                            </span>
                          </div>
                          {(getPlan(selectedPlan)?.descuento || 0) > 0 && (
                            <div className="flex justify-between text-xs text-green-600">
                              <span>Ahorro del primer mes:</span>
                              <span>
                                -{formatPrice(getPlan(selectedPlan)?.descuento || 0)}
                              </span>
                            </div>
                          )}
                          <div className="border-t border-gray-200 pt-2 flex justify-between">
                            <span className="font-semibold text-gray-900">
                              Total a pagar ahora:
                            </span>
                            <span className="font-bold text-blue-600 text-lg">
                              {formatPrice(
                                (getPlan(selectedPlan)?.precioPrimerMes || 0) +
                                  (!auditoriaPagadaEfectiva ? AUDITORIA_PRECIO : 0)
                              )}
                            </span>
                          </div>
                          <div className="border-t border-gray-200 pt-2 mt-1 space-y-1">
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Cubre:</span>
                              <span>1 mes de servicio</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Desde el 2° mes:</span>
                              <span className="font-medium text-gray-600">
                                {formatPrice(getPlan(selectedPlan)?.precio || 0)}/mes
                              </span>
                            </div>
                            {!auditoriaPagadaEfectiva && (
                              <p className="text-xs text-gray-400 pt-1">
                                La auditoría inicial es un pago único; la mensualidad
                                del plan se cobra cada mes.
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700">
                        Selecciona método de pago:
                      </p>

                      <button
                        onClick={() => setPaymentMethod('webpay')}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                          paymentMethod === 'webpay'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <CreditCard className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-medium text-gray-900">
                            Pagar con Flow (Tarjeta / WebPay)
                          </p>
                          <p className="text-sm text-gray-500">
                            Tarjeta de crédito, débito o WebPay Plus
                          </p>
                        </div>
                        {paymentMethod === 'webpay' && (
                          <Check className="w-5 h-5 text-blue-500" />
                        )}
                      </button>

                      <button
                        onClick={() => setPaymentMethod('transfer')}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                          paymentMethod === 'transfer'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Banknote className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-medium text-gray-900">
                            Transferencia Bancaria
                          </p>
                          <p className="text-sm text-gray-500">
                            Depósito manual — SotLoy confirma en 24-48 hrs
                          </p>
                        </div>
                        {paymentMethod === 'transfer' && (
                          <Check className="w-5 h-5 text-blue-500" />
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() =>
                        paymentMethod === 'webpay'
                          ? (!auditoriaPagadaEfectiva && !selectedPlan
                              ? handlePayAuditoria()
                              : handleProcessPayment())
                          : setPaymentStep('details')
                      }
                      className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                    >
                      {paymentMethod === 'webpay'
                        ? 'Ir a pagar con Flow'
                        : 'Ver instrucciones de transferencia'}
                    </button>
                  </div>
                )}

                {paymentStep === 'details' && paymentMethod === 'transfer' && (
                  <div className="space-y-4">
                    <button
                      onClick={() => setPaymentStep('method')}
                      className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Volver a métodos de pago
                    </button>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-900">
                            Instrucciones de transferencia
                          </p>
                          <p className="text-sm text-yellow-800 mt-1">
                            Realiza una transferencia con los siguientes datos y
                            luego confirma el pago.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 bg-gray-50 rounded-xl p-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nombre:</span>
                        <span className="font-medium">SotLoy Asesorías SpA</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">RUT:</span>
                        <span className="font-medium">78.422.207-1</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Banco:</span>
                        <span className="font-medium">Banco de Chile</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tipo de cuenta:</span>
                        <span className="font-medium">Cuenta Vista</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">N° de cuenta:</span>
                        <span className="font-medium">00-015-32261-69</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">fsoto@sotloyasesorias.cl</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monto:</span>
                        <span className="font-bold text-blue-600">
                          {formatPrice(
                            !auditoriaPagadaEfectiva && !selectedPlan
                              ? AUDITORIA_PRECIO
                              : (getPlan(selectedPlan)?.precioPrimerMes || 0) +
                                  (!auditoriaPagadaEfectiva ? AUDITORIA_PRECIO : 0)
                          )}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleTransferIntent}
                      className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                    >
                      He realizado la transferencia
                    </button>
                  </div>
                )}

                {paymentStep === 'processing' && (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      Procesando pago...
                    </h4>
                    <p className="text-gray-500">
                      Por favor no cierres esta ventana
                    </p>
                  </div>
                )}

                {paymentStep === 'success' && paymentResult && (
                  <div className="py-8 text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">
                      {paymentMethod === 'transfer'
                        ? 'Transferencia registrada'
                        : '¡Redirigiendo a Flow!'}
                    </h4>
                    <p className="text-gray-600 mb-4">
                      {paymentResult.message}
                    </p>
                    {paymentResult.paymentId && (
                      <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">ID de pago:</span>
                          <span className="font-medium font-mono text-xs">
                            {paymentResult.paymentId}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Concepto:</span>
                          <span className="font-medium">
                            {!auditoriaPagadaEfectiva && !selectedPlan
                              ? 'Auditoría inicial'
                              : !auditoriaPagadaEfectiva
                                ? `Auditoría + ${getPlan(selectedPlan)?.nombre ?? ''}`
                                : getPlan(selectedPlan)?.nombre}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 mb-6">
                      {paymentMethod === 'transfer' ? (
                        <div className="flex items-center gap-2 text-sm text-amber-600 justify-center bg-amber-50 px-3 py-2 rounded-lg">
                          <Bell className="w-4 h-4" />
                          <span>SotLoy revisará tu transferencia en 24-48 hrs hábiles</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-blue-600 justify-center bg-blue-50 px-3 py-2 rounded-lg">
                          <Mail className="w-4 h-4" />
                          <span>Recibirás confirmación por correo al completar el pago</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleClosePaymentModal}
                      className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                    >
                      Cerrar
                    </button>
                  </div>
                )}

                {paymentStep === 'error' && paymentResult && (
                  <div className="py-8 text-center">
                    <div className="w-20 h-20 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <XCircle className="w-10 h-10 text-red-600" />
                    </div>
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">
                      Error en el pago
                    </h4>
                    <p className="text-gray-600 mb-6">
                      {paymentResult.message}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setPaymentStep('method')}
                        className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                      >
                        Intentar de nuevo
                      </button>
                      <button
                        onClick={handleClosePaymentModal}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
      )}
    </div>
  );
}
