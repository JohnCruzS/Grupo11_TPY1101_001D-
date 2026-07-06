import { useState, useEffect } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  RefreshCw,
  ExternalLink,
  Shield,
  PartyPopper,
} from 'lucide-react';
import { useAuth, useSubscriptions } from '../../hooks';
import { getSupabase } from '../../context/AuthContext';
import { LoadingScreen } from '../../components/conecta/LoadingScreen';
import { Toaster, toast } from 'sonner';
import type { Payment, Subscription } from '../../types/database';

const PLAN_LABELS: Record<
  string,
  { name: string; color: string; bg: string; price: number }
> = {

  A: { name: 'Asesoría Básica', color: '#3b82f6', bg: '#eff6ff', price: 79000 },
  B: { name: 'Gestión PyME', color: '#8b5cf6', bg: '#faf5ff', price: 159000 },
  C: { name: 'Remuneraciones', color: '#f59e0b', bg: '#fffbeb', price: 269000 },
  D: { name: 'RRHH Integral', color: '#6366f1', bg: '#eef2ff', price: 429000 },

  basic: { name: 'Básico', color: '#6b7280', bg: '#f3f4f6', price: 79000 },
  pro: { name: 'Profesional', color: '#3b82f6', bg: '#eff6ff', price: 159000 },
  enterprise: { name: 'Empresarial', color: '#7c3aed', bg: '#faf5ff', price: 269000 },
};

const STATUS_LABELS: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  completed: {
    label: 'Completado',
    color: '#10b981',
    icon: <CheckCircle size={16} />,
  },
  pending: {
    label: 'Pendiente',
    color: '#f59e0b',
    icon: <Clock size={16} />,
  },
  failed: {
    label: 'Fallido',
    color: '#ef4444',
    icon: <XCircle size={16} />,
  },
  refunded: {
    label: 'Reembolsado',
    color: '#6b7280',
    icon: <RefreshCw size={16} />,
  },
  cancelled: {
    label: 'Cancelado',
    color: '#6b7280',
    icon: <XCircle size={16} />,
  },
};

type PaymentResultState = {
  show: boolean;
  estado: 'completed' | 'failed' | 'pending' | null;
  monto?: number;
  plan?: string;
  concepto?: string;
};

export default function PagosPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { subscription, payments, loading: subLoading, loadSubscription, loadPayments } = useSubscriptions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [paymentResult, setPaymentResult] = useState<PaymentResultState>({ show: false, estado: null });

  useEffect(() => {
    if (user?.empresa_id) {
      void loadSubscription(user.empresa_id);
    }
    setIsLoading(false);
  }, [user?.empresa_id, loadSubscription]);

  useEffect(() => {
    if (subscription?.id) {
      void loadPayments(subscription.id);
    }
  }, [subscription?.id, loadPayments]);

  useEffect(() => {
    const paymentId = searchParams.get('payment_id');
    if (!paymentId) return;

    const supabase = getSupabase();
    supabase
      .from('payments')
      .select('id, estado, monto, plan, concepto, flow_response')
      .eq('id', paymentId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const meta = data.flow_response as Record<string, unknown> | null;
          setPaymentResult({
            show: true,
            estado: data.estado as PaymentResultState['estado'],
            monto: data.monto,
            plan: data.plan || (meta?.plan as string | undefined),
            concepto: data.concepto || (meta?.concepto as string | undefined),
          });
        }

        setSearchParams({}, { replace: true });
      });
  }, []);

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/conecta/login" replace />;
  }

  if (isLoading || subLoading) {
    return <LoadingScreen />;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleRetryPayment = () => {
    const pendingWithToken = payments.find(
      (p) => p.estado === 'pending' && p.referencia_flow
    );
    if (pendingWithToken?.referencia_flow) {
      window.open(
        `https://www.flow.cl/app/pay/${pendingWithToken.referencia_flow}`,
        '_blank',
        'noopener,noreferrer'
      );
    } else {
      navigate('/conecta/dashboard');
      toast.info('Inicia un nuevo pago desde el panel de suscripción');
    }
  };

  const handleDownloadInvoice = (payment: Payment) => {
    const ref = payment.flow_order_id || payment.referencia_flow;
    if (ref) {
      toast.success(`Referencia de pago: ${ref}. El comprobante fue enviado a tu correo registrado.`);
    } else {
      toast.info('El comprobante fue enviado a tu correo registrado.');
    }
  };

  const userPlan = subscription?.plan || user?.plan || 'A';
  const planInfo = PLAN_LABELS[userPlan] || PLAN_LABELS.A;

  const subEstado = subscription?.estado;
  const subStatusConfig = (() => {
    switch (subEstado) {
      case 'active':
        return { bg: '#f0fdf4', border: '#10b98120', dotColor: '#10b981', textColor: '#059669', label: 'Activa' };
      case 'trial':
        return { bg: '#fffbeb', border: '#f59e0b20', dotColor: '#f59e0b', textColor: '#d97706', label: 'En Prueba' };
      case 'suspended':
        return { bg: '#fef2f2', border: '#ef444420', dotColor: '#ef4444', textColor: '#dc2626', label: 'Suspendida' };
      case 'cancelled':
        return { bg: '#f3f4f6', border: '#6b728020', dotColor: '#9ca3af', textColor: '#4b5563', label: 'Cancelada' };
      default:
        return { bg: '#f3f4f6', border: '#6b728020', dotColor: '#9ca3af', textColor: '#4b5563', label: 'Sin suscripción' };
    }
  })();

  const renewalDate = subscription?.proximo_pago_fecha || subscription?.fecha_fin;
  const renewalLabel = renewalDate
    ? `Próxima renovación: ${new Date(renewalDate).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
    : 'Sin fecha de renovación';

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px' }}>
      <Toaster richColors closeButton position="top-right" />

      {paymentResult.show && paymentResult.estado && (
        <div style={{ maxWidth: '1000px', margin: '0 auto 24px' }}>
          {paymentResult.estado === 'completed' && (
            <div style={{
              borderRadius: 14, padding: '24px 28px', display: 'flex', gap: 20, alignItems: 'flex-start',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '1px solid #86efac',
              boxShadow: '0 4px 20px rgba(16,185,129,0.12)',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle size={28} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#14532d' }}>
                    ¡Pago procesado exitosamente!
                  </h3>
                  <PartyPopper size={18} color="#16a34a" />
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.875rem', color: '#166534' }}>
                  {paymentResult.concepto || `Tu pago por el Plan ${paymentResult.plan || ''} fue recibido correctamente.`}
                  {paymentResult.monto ? ` — ${formatCurrency(paymentResult.monto)}` : ''}
                </p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#4ade80' }}>
                  Tu suscripción se activará en los próximos minutos. Si no ves el cambio, recarga la página.
                </p>
              </div>
              <button
                onClick={() => setPaymentResult({ show: false, estado: null })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4ade80', fontSize: '1.2rem', padding: 4 }}
              >
                ×
              </button>
            </div>
          )}

          {paymentResult.estado === 'failed' && (
            <div style={{
              borderRadius: 14, padding: '24px 28px', display: 'flex', gap: 20, alignItems: 'flex-start',
              background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
              border: '1px solid #fca5a5',
              boxShadow: '0 4px 20px rgba(239,68,68,0.1)',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <XCircle size={28} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 700, color: '#7f1d1d' }}>
                  El pago no pudo ser procesado
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.875rem', color: '#991b1b' }}>
                  La transacción fue rechazada o cancelada. No se realizó ningún cargo a tu cuenta.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => { setPaymentResult({ show: false, estado: null }); navigate('/conecta/dashboard'); }}
                    style={{
                      padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: '#ef4444', color: 'white', fontSize: '0.85rem', fontWeight: 600,
                    }}
                  >
                    Intentar nuevamente
                  </button>
                  <button
                    onClick={() => setPaymentResult({ show: false, estado: null })}
                    style={{
                      padding: '9px 18px', borderRadius: 8, border: '1px solid #fca5a5',
                      background: 'white', cursor: 'pointer', color: '#dc2626', fontSize: '0.85rem',
                    }}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {paymentResult.estado === 'pending' && (
            <div style={{
              borderRadius: 14, padding: '24px 28px', display: 'flex', gap: 20, alignItems: 'center',
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef9c3 100%)',
              border: '1px solid #fde68a',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Clock size={28} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 700, color: '#78350f' }}>
                  Pago en proceso
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e' }}>
                  Tu pago está siendo verificado. Esto puede tomar unos minutos. Recibirás una confirmación por correo cuando se complete.
                </p>
              </div>
              <button
                onClick={() => setPaymentResult({ show: false, estado: null })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f59e0b', fontSize: '1.2rem', padding: 4 }}
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}

      <div
        style={{ maxWidth: '1000px', margin: '0 auto', marginBottom: '24px' }}
      >
        <button
          onClick={() => navigate('/conecta/dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: '0.875rem',
            marginBottom: '16px',
          }}
        >
          <ArrowLeft size={16} />
          Volver al Dashboard
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: planInfo.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CreditCard size={28} color={planInfo.color} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>
              Gestión de Pagos
            </h1>
            <p
              style={{
                margin: '4px 0 0 0',
                color: '#64748b',
                fontSize: '0.875rem',
              }}
            >
              Administra tu suscripción y revisa tu historial de pagos
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: '1000px',
          margin: '0 auto',
          display: 'grid',
          gap: '24px',
        }}
      >

        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: planInfo.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CreditCard size={20} color={planInfo.color} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.125rem', color: '#1e293b' }}>
                Suscripción Actual
              </h2>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
            }}
          >
            <div
              style={{
                padding: '20px',
                background: planInfo.bg,
                borderRadius: '10px',
                border: `2px solid ${planInfo.color}20`,
              }}
            >
              <p
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '0.75rem',
                  color: planInfo.color,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Plan Actual
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: planInfo.color,
                }}
              >
                {planInfo.name}
              </p>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '0.875rem',
                  color: '#6b7280',
                }}
              >
                {planInfo.price > 0 ? `${formatCurrency(planInfo.price)}/mes` : 'Precio a convenir'}
              </p>
            </div>

            <div
              style={{
                padding: '20px',
                background: subStatusConfig.bg,
                borderRadius: '10px',
                border: `2px solid ${subStatusConfig.border}`,
              }}
            >
              <p
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '0.75rem',
                  color: subStatusConfig.textColor,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Estado
              </p>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: subStatusConfig.dotColor,
                    animation: subEstado === 'active' ? 'pulse 2s infinite' : undefined,
                  }}
                />
                <p
                  style={{
                    margin: 0,
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: subStatusConfig.textColor,
                  }}
                >
                  {subStatusConfig.label}
                </p>
              </div>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '0.875rem',
                  color: '#6b7280',
                }}
              >
                {renewalLabel}
              </p>
            </div>

            <div
              style={{
                padding: '20px',
                background: '#eff6ff',
                borderRadius: '10px',
                border: '2px solid #3b82f620',
              }}
            >
              <p
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '0.75rem',
                  color: '#2563eb',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Método de Pago
              </p>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <CreditCard size={20} color="#2563eb" />
                <p
                  style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#1e40af',
                  }}
                >
                  Flow
                </p>
              </div>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '0.875rem',
                  color: '#6b7280',
                }}
              >
                Pagos automáticos habilitados
              </p>
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
            <button
              onClick={() => navigate('/planes')}
              style={{
                padding: '10px 20px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cambiar Plan
            </button>
            <button
              onClick={handleRetryPayment}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '0.875rem',
                cursor: 'pointer',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ExternalLink size={16} />
              Ver en Flow
            </button>
          </div>
        </div>

        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#f0f9ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={20} color="#0284c7" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.125rem', color: '#1e293b' }}>
                Historial de Pagos
              </h2>
              <p
                style={{
                  margin: '4px 0 0 0',
                  color: '#64748b',
                  fontSize: '0.875rem',
                }}
              >
                Últimas transacciones de tu suscripción
              </p>
            </div>
          </div>

          {isLoading ? (
            <div
              style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}
            >
              Cargando historial de pagos...
            </div>
          ) : payments.length === 0 ? (
            <div
              style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}
            >
              <Clock size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>No hay pagos registrados aún</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'left',
                        borderBottom: '2px solid #e5e7eb',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      Fecha
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'left',
                        borderBottom: '2px solid #e5e7eb',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      Referencia
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'right',
                        borderBottom: '2px solid #e5e7eb',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      Monto
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        borderBottom: '2px solid #e5e7eb',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      Estado
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        borderBottom: '2px solid #e5e7eb',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const status =
                      STATUS_LABELS[payment.estado] || STATUS_LABELS.pending;
                    return (
                      <tr key={payment.id}>
                        <td
                          style={{
                            padding: '16px 12px',
                            borderBottom: '1px solid #e5e7eb',
                            fontSize: '0.875rem',
                            color: '#374151',
                          }}
                        >
                          {formatDate(payment.fecha_creacion)}
                        </td>
                        <td
                          style={{
                            padding: '16px 12px',
                            borderBottom: '1px solid #e5e7eb',
                            fontSize: '0.875rem',
                            color: '#374151',
                            fontFamily: 'monospace',
                          }}
                        >
                          {payment.referencia_flow ||
                            payment.flow_order_id ||
                            'N/A'}
                        </td>
                        <td
                          style={{
                            padding: '16px 12px',
                            borderBottom: '1px solid #e5e7eb',
                            fontSize: '0.875rem',
                            color: '#374151',
                            textAlign: 'right',
                            fontWeight: 600,
                          }}
                        >
                          {formatCurrency(payment.monto)}
                        </td>
                        <td
                          style={{
                            padding: '16px 12px',
                            borderBottom: '1px solid #e5e7eb',
                            textAlign: 'center',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: `${status.color}15`,
                              color: status.color,
                            }}
                          >
                            {status.icon}
                            {status.label}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '16px 12px',
                            borderBottom: '1px solid #e5e7eb',
                            textAlign: 'center',
                          }}
                        >
                          <button
                            onClick={() => handleDownloadInvoice(payment)}
                            disabled={payment.estado !== 'completed'}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              background:
                                payment.estado === 'completed'
                                  ? '#eff6ff'
                                  : '#f3f4f6',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              color:
                                payment.estado === 'completed'
                                  ? '#2563eb'
                                  : '#9ca3af',
                              cursor:
                                payment.estado === 'completed'
                                  ? 'pointer'
                                  : 'not-allowed',
                            }}
                          >
                            <Download size={14} />
                            Comprobante
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div
          style={{
            background: '#fafafa',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <AlertCircle size={20} color="#6b7280" style={{ marginTop: '2px' }} />
          <div>
            <h3
              style={{
                margin: '0 0 4px 0',
                fontSize: '1rem',
                color: '#374151',
              }}
            >
              Información de Facturación
            </h3>
            <p
              style={{
                margin: '0 0 8px 0',
                fontSize: '0.875rem',
                color: '#6b7280',
              }}
            >
              Las boletas electrónicas son emitidas automáticamente y enviadas a
              tu correo registrado. Si necesitas factura, contacta a nuestro
              equipo de soporte.
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>
              Pasarela de pagos: Flow.cl | Empresa: SotLoy Asesorías SpA | RUT:
              77.123.456-7
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
