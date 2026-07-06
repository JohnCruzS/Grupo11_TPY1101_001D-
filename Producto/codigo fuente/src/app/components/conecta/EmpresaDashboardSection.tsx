import { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  FileText,
  CheckCircle2,
  Upload,
  CreditCard,
  AlertTriangle,
  Clock,
  TrendingUp,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { getSupabase } from '../../context/AuthContext';
import { IndicadoresBanner } from './IndicadoresBanner';

interface Company {
  id: string;
  nombre: string;
  rut?: string;
  email?: string;
  estado: string;
  plan?: string;
}

interface Worker {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
}

interface RecentDoc {
  id: string;
  original_name: string;
  file_category: string;
  uploaded_at: string;
  estado?: string;
}

interface Subscription {
  plan: string;
  estado: string;
  fecha_fin?: string;
}

interface Props {
  user: any;
  company: Company | null;
  workers: Worker[];
  onChangeSection?: (section: string) => void;
}

const PLAN_LABELS: Record<string, string> = {
  A: 'Asesoría Básica',
  B: 'Gestión PyME',
  C: 'Remuneraciones',
  D: 'RRHH Integral',
  Personalizado: 'Personalizado',
};

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  contract: { label: 'Contrato', color: '#3b82f6' },
  payroll: { label: 'Liquidación', color: '#10b981' },
  termination: { label: 'Finiquito', color: '#f59e0b' },
  annex: { label: 'Anexo', color: '#8b5cf6' },
  legal: { label: 'Legal', color: '#6366f1' },
  other: { label: 'Otro', color: '#6b7280' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) return `Hace ${Math.floor(days / 7)} semana${Math.floor(days / 7) > 1 ? 's' : ''}`;
  return new Date(dateStr).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

export function EmpresaDashboardSection({ user, company, workers, onChangeSection }: Props) {
  const supabase = getSupabase();
  const [docCount, setDocCount] = useState<number>(0);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);

  useEffect(() => {
    if (!company?.id) return;

    supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('enterprise_id', company.id)
      .then(({ count }) => setDocCount(count ?? 0));

    supabase
      .from('subscriptions')
      .select('plan, estado, fecha_fin')
      .eq('empresa_id', company.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setSubscription(data); });

    supabase
      .from('documents')
      .select('id, original_name, file_category, uploaded_at, estado')
      .eq('enterprise_id', company.id)
      .order('uploaded_at', { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setRecentDocs(data); });
  }, [company?.id]);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const dateStr = now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

  const isActive = subscription?.estado === 'active';
  const isTrial = subscription?.estado === 'trial';
  const isSuspended = subscription?.estado === 'suspended';

  const companyActive =
    isActive ||
    company?.estado === 'activo' ||
    company?.estado === 'active';
  const planLabel = PLAN_LABELS[subscription?.plan || company?.plan || ''] || subscription?.plan || company?.plan || 'Sin plan';

  const activeWorkers = workers.filter((w) => w.rol === 'usuario').length;

  return (
    <div className="space-y-5">

      <div
        style={{
          background: 'linear-gradient(135deg, #091f34 0%, #1a3a5c 100%)',
          borderRadius: '14px',
          padding: '28px 32px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute', top: -40, right: -40,
            width: 160, height: 160, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          }}
        />
        <div
          style={{
            position: 'absolute', bottom: -30, right: 80,
            width: 100, height: 100, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize' }}>
              {dateStr}
            </p>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', fontWeight: 700 }}>
              {greeting}, {user?.nombre || 'bienvenido'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
              {company?.nombre || 'Tu empresa'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 20,
              background: isActive ? 'rgba(16,185,129,0.2)' : isTrial ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
              border: `1px solid ${isActive ? 'rgba(16,185,129,0.4)' : isTrial ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)'}`,
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: isActive ? '#10b981' : isTrial ? '#f59e0b' : '#ef4444',
              }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'white' }}>
                {isActive ? `Plan ${planLabel}` : isTrial ? 'Periodo de prueba' : 'Sin suscripción activa'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {!isActive && !isTrial && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 20px', borderRadius: 10,
          background: isSuspended ? '#fef2f2' : '#fffbeb',
          border: `1px solid ${isSuspended ? '#fecaca' : '#fde68a'}`,
        }}>
          <AlertTriangle size={20} color={isSuspended ? '#ef4444' : '#f59e0b'} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 2px 0', fontWeight: 600, fontSize: '0.875rem', color: isSuspended ? '#dc2626' : '#92400e' }}>
              {isSuspended ? 'Cuenta suspendida por mora' : 'Sin suscripción activa'}
            </p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: isSuspended ? '#ef4444' : '#b45309' }}>
              {isSuspended
                ? 'Tu cuenta está suspendida. Contacta a SotLoy para regularizar tu situación.'
                : 'Activa tu plan para acceder a todas las funcionalidades de la plataforma.'}
            </p>
          </div>
          <button
            onClick={() => onChangeSection?.('suscripcion')}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: isSuspended ? '#ef4444' : '#f59e0b', color: 'white',
              fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap',
            }}
          >
            {isSuspended ? 'Contactar' : 'Activar plan'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Trabajadores',
            value: workers.length,
            sub: `${activeWorkers} activos`,
            icon: <Users size={20} />,
            iconBg: '#eff6ff',
            iconColor: '#3b82f6',
            trend: workers.length > 0,
          },
          {
            label: 'Documentos',
            value: docCount,
            sub: 'en el sistema',
            icon: <FileText size={20} />,
            iconBg: '#f0fdf4',
            iconColor: '#10b981',
            trend: docCount > 0,
          },
          {
            label: 'Plan actual',
            value: planLabel,
            sub: isActive ? 'Activo' : isTrial ? 'Prueba' : 'Inactivo',
            icon: <CreditCard size={20} />,
            iconBg: '#faf5ff',
            iconColor: '#8b5cf6',
            trend: isActive,
          },
          {
            label: 'Estado empresa',
            value: companyActive ? 'Activo' : 'Inactivo',
            sub: company?.rut ? `RUT ${company.rut}` : 'Sin RUT',
            icon: <Building2 size={20} />,
            iconBg: '#f8fafc',
            iconColor: '#64748b',
            trend: companyActive,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: stat.iconBg, color: stat.iconColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {stat.icon}
              </div>
              {stat.trend && <TrendingUp size={14} color="#10b981" />}
            </div>
            <p style={{ margin: '0 0 2px 0', fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
              {stat.value}
            </p>
            <p style={{ margin: '0 0 2px 0', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {stat.label}
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
              Documentos recientes
            </h3>
            <button
              onClick={() => onChangeSection?.('documentos')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#3b82f6', fontWeight: 500 }}
            >
              Ver todos <ChevronRight size={14} />
            </button>
          </div>

          {recentDocs.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <Inbox size={40} color="#cbd5e1" style={{ marginBottom: 10 }} />
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.875rem' }}>No hay documentos aún</p>
              <p style={{ margin: '4px 0 0', color: '#cbd5e1', fontSize: '0.8rem' }}>Los documentos subidos por SotLoy aparecerán aquí</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recentDocs.map((doc) => {
                const cat = CATEGORY_LABELS[doc.file_category] || { label: doc.file_category, color: '#6b7280' };
                return (
                  <div
                    key={doc.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 8px', borderRadius: 8,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      background: `${cat.color}15`, color: cat.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <FileText size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#1e293b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.original_name}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                        {cat.label}
                      </p>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                        {timeAgo(doc.uploaded_at)}
                      </p>
                      {doc.estado && (
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                          background: doc.estado === 'Confirmado' ? '#dcfce7' : doc.estado === 'Visto' ? '#fef9c3' : '#f3f4f6',
                          color: doc.estado === 'Confirmado' ? '#166534' : doc.estado === 'Visto' ? '#854d0e' : '#6b7280',
                        }}>
                          {doc.estado}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
              Acciones rápidas
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                {
                  label: 'Gestionar trabajadores',
                  desc: `${workers.length} registrados`,
                  icon: <Users size={16} />,
                  color: '#3b82f6',
                  bg: '#eff6ff',
                  section: 'trabajadores',
                },
                {
                  label: 'Ver documentos',
                  desc: `${docCount} archivos`,
                  icon: <FileText size={16} />,
                  color: '#10b981',
                  bg: '#f0fdf4',
                  section: 'documentos',
                },
                {
                  label: 'Subir insumo',
                  desc: 'Enviar a SotLoy',
                  icon: <Upload size={16} />,
                  color: '#8b5cf6',
                  bg: '#faf5ff',
                  section: 'documentos',
                },
                {
                  label: 'Mi suscripción',
                  desc: isActive ? 'Ver estado y pagos' : 'Activar plan',
                  icon: <CreditCard size={16} />,
                  color: '#f59e0b',
                  bg: '#fffbeb',
                  section: 'suscripcion',
                },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => onChangeSection?.(action.section)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8, border: '1px solid #f1f5f9',
                    background: 'white', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = action.bg;
                    e.currentTarget.style.borderColor = `${action.color}40`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#f1f5f9';
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                    background: action.bg, color: action.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {action.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.83rem', fontWeight: 600, color: '#1e293b' }}>{action.label}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>{action.desc}</p>
                  </div>
                  <ChevronRight size={14} color="#cbd5e1" />
                </button>
              ))}
            </div>
          </div>

          {company && (
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#091f3415', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={16} color="#091f34" />
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>Datos empresa</p>
              </div>
              {[
                { label: 'RUT', value: company.rut },
                { label: 'Email', value: company.email },
              ].filter((r) => r.value).map((row) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{row.label}</span>
                  <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Estado</span>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                  background: companyActive ? '#dcfce7' : '#fee2e2',
                  color: companyActive ? '#166534' : '#dc2626',
                }}>
                  {companyActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <IndicadoresBanner />
    </div>
  );
}
