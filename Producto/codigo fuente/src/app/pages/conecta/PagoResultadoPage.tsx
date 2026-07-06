import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, ArrowRight, RefreshCw } from 'lucide-react';
import { getSupabase } from '../../context/AuthContext';

type Estado = 'completed' | 'failed' | 'pending' | 'loading';

interface PaymentInfo {
  estado: Estado;
  monto?: number;
  plan?: string;
  concepto?: string;
}

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n);

export default function PagoResultadoPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState<PaymentInfo>({ estado: 'loading' });

  useEffect(() => {
    const paymentId = searchParams.get('payment_id');
    if (!paymentId) {
      setInfo({ estado: 'pending' });
      return;
    }

    const supabase = getSupabase();
    supabase
      .from('payments')
      .select('estado, monto, plan, concepto, flow_response')
      .eq('id', paymentId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setInfo({ estado: 'pending' });
          return;
        }
        const meta = data.flow_response as Record<string, unknown> | null;
        setInfo({
          estado: (data.estado as Estado) || 'pending',
          monto: data.monto,
          plan: data.plan || (meta?.plan as string | undefined),
          concepto: data.concepto || (meta?.concepto as string | undefined),
        });
      });
  }, []);

  const config = {
    completed: {
      icon: <CheckCircle size={64} color="white" />,
      bg: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      iconBg: 'rgba(255,255,255,0.15)',
      title: '¡Pago exitoso!',
      subtitle: 'Tu transacción fue procesada correctamente.',
      detail: info.concepto || `Plan ${info.plan || ''} activado`,
      btnLabel: 'Ir al Dashboard',
      btnBg: '#059669',
      btnHover: '#047857',
    },
    failed: {
      icon: <XCircle size={64} color="white" />,
      bg: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
      iconBg: 'rgba(255,255,255,0.15)',
      title: 'Pago rechazado',
      subtitle: 'La transacción no pudo completarse. No se realizó ningún cargo.',
      detail: 'Puedes intentarlo nuevamente desde el panel de suscripción.',
      btnLabel: 'Intentar nuevamente',
      btnBg: '#dc2626',
      btnHover: '#b91c1c',
    },
    pending: {
      icon: <Clock size={64} color="white" />,
      bg: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
      iconBg: 'rgba(255,255,255,0.15)',
      title: 'Pago en proceso',
      subtitle: 'Estamos verificando tu transacción. Esto puede tomar unos minutos.',
      detail: 'Recibirás una confirmación por correo cuando se complete.',
      btnLabel: 'Ver mi suscripción',
      btnBg: '#d97706',
      btnHover: '#b45309',
    },
    loading: {
      icon: <RefreshCw size={48} color="white" />,
      bg: 'linear-gradient(135deg, #475569 0%, #64748b 100%)',
      iconBg: 'rgba(255,255,255,0.15)',
      title: 'Verificando pago...',
      subtitle: 'Un momento por favor.',
      detail: '',
      btnLabel: '',
      btnBg: '',
      btnHover: '',
    },
  }[info.estado];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f1f5f9',
        padding: '24px',
      }}
    >

      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          SotLoy Conecta
        </p>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: 480,
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        }}
      >

        <div
          style={{
            background: config.bg,
            padding: '48px 40px 40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: config.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              animation: info.estado === 'loading' ? 'spin 1s linear infinite' : undefined,
            }}
          >
            {config.icon}
          </div>
          <h1
            style={{
              margin: '0 0 8px',
              fontSize: '1.6rem',
              fontWeight: 700,
              color: 'white',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {config.title}
          </h1>
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)' }}>
            {config.subtitle}
          </p>
        </div>

        <div style={{ background: 'white', padding: '32px 40px' }}>
          {info.monto && (
            <div
              style={{
                padding: '16px 20px',
                background: '#f8fafc',
                borderRadius: 12,
                marginBottom: 20,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Monto cobrado</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                {formatCLP(info.monto)}
              </span>
            </div>
          )}

          {config.detail && (
            <p
              style={{
                margin: '0 0 24px',
                fontSize: '0.875rem',
                color: '#64748b',
                textAlign: 'center',
                lineHeight: 1.6,
              }}
            >
              {config.detail}
            </p>
          )}

          {info.estado !== 'loading' && (
            <button
              onClick={() => navigate('/conecta/dashboard')}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 10,
                border: 'none',
                background: config.btnBg,
                color: 'white',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              {config.btnLabel}
              <ArrowRight size={18} />
            </button>
          )}

          <p
            style={{
              margin: '16px 0 0',
              fontSize: '0.75rem',
              color: '#cbd5e1',
              textAlign: 'center',
            }}
          >
            Procesado por Flow.cl · SotLoy Asesorías SpA
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
