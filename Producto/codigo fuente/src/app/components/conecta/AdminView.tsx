import { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  Users,
  FileText,
  CreditCard,
  AlertTriangle,
  Upload,
  X,
  Search,
  Filter,
  Check,
  BarChart3,
  Clock,
  ListFilter,
  Calendar,
  Mail,
  CheckCircle,
  Power,
  PauseCircle,
  Loader2,
  MailWarning,
  Ban,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Activity,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Lock,
  Unlock,
  Save,
  Trash2,
  Sparkles,
  Edit,
} from 'lucide-react';
import { User } from '../../context/AuthContext';
import { getSupabase } from '../../context/AuthContext';
import { DocumentUpload } from './DocumentUpload';
import { AdminDocUploadPanel } from './AdminDocUploadPanel';
import { exportToXLSX, exportToPDF, type ReportColumn } from '../../utils/reports';
import { SecureDocumentView } from './SecureDocumentView';
import { MessageCenter } from './MessageCenter';
import { DocumentTrackingModal } from './DocumentTrackingModal';
import { AuditSection } from './AuditSection';
import { ChatbotIA } from './ChatbotIA';
import { ArticlesManager } from './ArticlesManager';
import { IndicadoresBanner } from './IndicadoresBanner';
import { toast } from 'sonner';

interface UserProfileData {
  key: string;
  value: string;
}
interface Company {
  id: string;
  nombre: string;
  rut?: string;
  email?: string;
  telefono?: string;
  estado: string;
  plan?: string;
  plan_price?: number;
  userIds: string[];
  createdAt: string;
  suspension_reason?: string;
  suspended_at?: string;
}
interface UserProfile {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  empresaId?: string;
  createdAt: string;
}
interface Doc {
  id: string;
  userId: string;
  nombre: string;
  tipo: string;
  fecha: string;
  empresaId: string;
}
interface Payment {
  id: string;
  empresaId: string;
  empresaNombre: string;
  monto: number;
  concepto: string;
  estado: 'pagado' | 'pendiente' | 'vencido';
  fechaVencimiento: string;
  fechaPago?: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
function formatCLP(n: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
  }).format(n);
}

const ESTADO_STYLES: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  pagado: { bg: '#f0fdf4', color: '#15803d', label: 'Pagado' },
  pendiente: { bg: '#fffbeb', color: '#d97706', label: 'Pendiente' },
  vencido: { bg: '#fef2f2', color: '#dc2626', label: 'Vencido' },
};

interface Props {
  user: User;
  activeSection: string;
}

function isoToDisplayDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

function displayToIsoDate(s: string): string {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '';
  const [, dd, mm, yyyy] = m;
  const day = Number(dd);
  const month = Number(mm);
  if (month < 1 || month > 12 || day < 1 || day > 31) return '';
  return `${yyyy}-${mm}-${dd}`;
}

function DateFieldDDMMYYYY({
  value,
  onChange,
  className,
  style,
}: {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [text, setText] = useState(isoToDisplayDate(value));
  useEffect(() => {
    setText(isoToDisplayDate(value));
  }, [value]);

  const handle = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let out = digits;
    if (digits.length > 4) {
      out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      out = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    setText(out);
    onChange(displayToIsoDate(out));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={(e) => handle(e.target.value)}
      placeholder="dd/mm/aaaa"
      maxLength={10}
      className={className}
      style={style}
    />
  );
}

export function AdminView({ user, activeSection }: Props) {
  const supabase = getSupabase();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [billingPayments, setBillingPayments] = useState<
    {
      id: string;
      empresaId: string;
      empresaNombre: string;
      monto: number;
      concepto: string;
      estado: string;
      fecha: string;
      tipo: string;
      metodo: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const [exportEmpresaId, setExportEmpresaId] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [showDocUpload, setShowDocUpload] = useState(false);
  const [selectedCompanyForDoc, setSelectedCompanyForDoc] =
    useState<Company | null>(null);

  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
  const [companyWorkers, setCompanyWorkers] = useState<UserProfile[]>([]);
  const [companyDocs, setCompanyDocs] = useState<Doc[]>([]);
  const [loadingCompanyDetail, setLoadingCompanyDetail] = useState(false);

  const [adminDocs, setAdminDocs] = useState<Doc[]>([]);
  const [readDocIds, setReadDocIds] = useState<Set<string>>(new Set());

  const [trackingDocId, setTrackingDocId] = useState<string | null>(null);

  const [docSearchTerm, setDocSearchTerm] = useState('');
  const [docDateFrom, setDocDateFrom] = useState('');
  const [docDateTo, setDocDateTo] = useState('');
  const [docSelectedCompany, setDocSelectedCompany] = useState('all');
  const [docShowUnreadOnly, setDocShowUnreadOnly] = useState(false);
  const [docShowFilters, setDocShowFilters] = useState(false);

  const [companySearch, setCompanySearch] = useState('');
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [selectedCompanyForAction, setSelectedCompanyForAction] =
    useState<Company | null>(null);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const [billingView, setBillingView] = useState<
    'overview' | 'payments' | 'analytics' | 'custom-plans'
  >('overview');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentDateFrom, setPaymentDateFrom] = useState('');
  const [paymentDateTo, setPaymentDateTo] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<
    'all' | 'paid' | 'pending' | 'overdue'
  >('all');
  const [paymentCompanyFilter, setPaymentCompanyFilter] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<
    'month' | 'quarter' | 'year'
  >('month');

  const [customPlanCompanyId, setCustomPlanCompanyId] = useState('');
  const [customPlanNombre, setCustomPlanNombre] = useState('');
  const [customPlanPrice, setCustomPlanPrice] = useState('');
  const [customPlanDescripcion, setCustomPlanDescripcion] = useState('');
  const [customPlanFeatures, setCustomPlanFeatures] = useState('');
  const [customPlanSaving, setCustomPlanSaving] = useState(false);
  const [customPlanLoading, setCustomPlanLoading] = useState(false);
  const [customPlanHasExisting, setCustomPlanHasExisting] = useState(false);

  const [subStatus, setSubStatus] = useState<string>('');
  const [subSaving, setSubSaving] = useState(false);
  const [recommendedPlanSel, setRecommendedPlanSel] = useState<string>('');
  const [auditoriaPagadaSel, setAuditoriaPagadaSel] = useState(false);
  const [pendingTransfers, setPendingTransfers] = useState<
    { id: string; monto: number; concepto: string; tipo: string; fecha: string }[]
  >([]);
  const [completedPayments, setCompletedPayments] = useState<
    { id: string; monto: number; concepto: string; tipo: string; fecha: string; metodo: string }[]
  >([]);
  const [hasAcceptedPayment, setHasAcceptedPayment] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {

      const [enterprisesRes, userProfilesRes, assignmentsRes, adminDocsRes] =
        await Promise.all([
          supabase.from('enterprises').select('*'),
          supabase
            .from('kv_store_7d36b31f')
            .select('key, value')
            .like('key', 'slc_user:%'),
          supabase.from('user_enterprises').select('*'),
          supabase
            .from('documents')
            .select('*')
            .order('uploaded_at', { ascending: false }),
        ]);

      const { data: enterprises, error: enterprisesError } = enterprisesRes;
      const { data: userProfiles, error: usersError } = userProfilesRes;
      const { data: assignments, error: assignmentsError } = assignmentsRes;

      if (enterprisesError) {
        console.error('Error cargando empresas:', enterprisesError);
      }
      if (usersError) {
        console.error('Error cargando usuarios:', usersError);
      }
      if (assignmentsError) {
        console.error('Error cargando asignaciones:', assignmentsError);
      }

      const userRoles = new Map<string, string>();
      (userProfiles || []).forEach((p: { key: string; value: { rol?: string; role?: string } }) => {
        const id = p.key.replace('slc_user:', '');
        userRoles.set(id, p.value?.rol || p.value?.role || 'usuario');
      });

      const userToEnterprise = new Map<string, string>();
      const companyUsers = new Map<string, string[]>();

      (assignments || []).forEach((assignment: Assignment) => {
        if (assignment.user_id && assignment.enterprise_id) {
          userToEnterprise.set(assignment.user_id, assignment.enterprise_id);

          if (userRoles.get(assignment.user_id) === 'usuario') {
            const existing = companyUsers.get(assignment.enterprise_id) || [];
            existing.push(assignment.user_id);
            companyUsers.set(assignment.enterprise_id, existing);
          }
        }
      });

      console.log('Asignaciones cargadas:', assignments?.length);
      console.log(
        'User -> Enterprise map:',
        Object.fromEntries(userToEnterprise)
      );
      console.log('Company -> Users map:', Object.fromEntries(companyUsers));

      const companiesData = (enterprises || []).map((ent) => {
        const rawStatus =
          ent.subscription_status || ent.status || ent.estado || 'active';
        const normalizedStatus =
          rawStatus === 'active'
            ? 'activo'
            : rawStatus === 'suspended'
              ? 'suspendido'
              : rawStatus === 'past_due'
                ? 'vencido'
                : rawStatus;

        return {
          id: ent.id,
          nombre: ent.name,
          rut: ent.rut,
          email: ent.email,
          telefono: ent.phone || '',
          estado: normalizedStatus,
          plan: ent.plan || '',
          plan_price: typeof ent.plan_price === 'number' ? ent.plan_price : undefined,
          userIds: companyUsers.get(ent.id) || [],
          createdAt: ent.created_at,
          suspension_reason: ent.suspension_reason || '',
          suspended_at: ent.suspended_at || '',
        };
      });

      const usersData = (userProfiles || []).map((profile) => {
        const userId = profile.key.replace('slc_user:', '');

        const empresaIdFromAssignment = userToEnterprise.get(userId);

        return {
          id: userId,
          nombre: profile.value.nombre,
          apellido: profile.value.apellido,
          email: profile.value.email,
          rol: profile.value.rol,

          empresaId: empresaIdFromAssignment || profile.value.empresaId,
          createdAt: profile.value.created_at || profile.value.createdAt || '',
        };
      });

      console.log(
        `Cargadas ${companiesData.length} empresas y ${usersData.length} usuarios`
      );
      console.log(
        'Empresas con trabajadores:',
        companiesData.map((c) => ({
          nombre: c.nombre,
          trabajadores: c.userIds.length,
        }))
      );
      console.log(
        'Usuarios:',
        usersData.map(
          (u) =>
            `${u.nombre} ${u.apellido} (${u.email}) - EmpresaID: ${u.empresaId}`
        )
      );

      setCompanies(companiesData);
      setUsers(usersData);
      setDocs([]);

      const nombrePorEmpresa = new Map(
        companiesData.map((c) => [c.id, c.nombre])
      );
      const estadoMap: Record<string, string> = {
        completed: 'pagado',
        pending: 'pendiente',
        failed: 'fallido',
        cancelled: 'cancelado',
        refunded: 'reembolsado',
      };
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('id, empresa_id, monto, estado, metodo_pago, flow_response, fecha_creacion')
        .order('fecha_creacion', { ascending: false });

      const billing = (paymentsData || []).map((p) => {
        const meta = (p.flow_response || {}) as Record<string, unknown>;
        return {
          id: p.id,
          empresaId: p.empresa_id,
          empresaNombre: nombrePorEmpresa.get(p.empresa_id) || 'Empresa',
          monto: Number(p.monto) || 0,
          concepto: (meta.concepto as string) || (p.metodo_pago === 'transferencia' ? 'Transferencia' : 'Pago'),
          estado: estadoMap[p.estado as string] || p.estado || 'pendiente',
          fecha: (p.fecha_creacion || '').split('T')[0],
          tipo: (meta.tipo as string) || 'plan',
          metodo: p.metodo_pago || 'flow',
        };
      });
      setBillingPayments(billing);
      setPayments([]);

      const { data: adminDocuments, error: adminDocsError } = adminDocsRes;
      if (adminDocsError) {
        console.error('Error cargando documentos del admin:', adminDocsError);
      } else {
        console.log('Documentos para admin cargados:', adminDocuments?.length);
        setAdminDocs(adminDocuments || []);

        const docIds = (adminDocuments || []).map((d: Doc) => d.id);
        if (docIds.length > 0) {
          const { data: vistos } = await supabase
            .from('document_views')
            .select('document_id')
            .eq('viewer_id', user.id)
            .in('document_id', docIds);
          if (vistos) {
            setReadDocIds(new Set(vistos.map((v: { document_id: string }) => v.document_id)));
          }
        }
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    loadData();

    const handleReload = () => {
      console.log('Recargando datos por evento...');
      loadData();
    };

    window.addEventListener('reload-admin-data', handleReload);

    return () => {
      window.removeEventListener('reload-admin-data', handleReload);
    };
  }, [loadData]);

  const handleViewCompany = async (company: Company) => {
    setViewingCompany(company);
    setLoadingCompanyDetail(true);

    console.log('🔍 Cargando detalle de empresa:', company.id, company.nombre);

    try {

      const { data: assignments, error: assignError } = await supabase
        .from('user_enterprises')
        .select('user_id, role, is_active')
        .eq('enterprise_id', company.id);

      console.log('📋 Todas las asignaciones:', assignments);
      console.log('❌ Error asignaciones:', assignError);

      if (assignError) {
        console.error('Error cargando asignaciones:', assignError);
      }

      const activeAssignments = (assignments || []).filter((a) => a.is_active);
      console.log(
        '✅ Asignaciones activas:',
        activeAssignments.length,
        activeAssignments
      );

      if (activeAssignments.length > 0) {
        const userIds = activeAssignments.map((a) => a.user_id);
        console.log('👤 User IDs a buscar:', userIds);

        const { data: workerProfiles, error: profileError } = await supabase
          .from('kv_store_7d36b31f')
          .select('key, value')
          .in(
            'key',
            userIds.map((id) => `slc_user:${id}`)
          );

        console.log(
          '📊 Perfiles encontrados:',
          workerProfiles?.length,
          workerProfiles
        );
        console.log('❌ Error perfiles:', profileError);

        if (profileError) {
          console.error('Error cargando perfiles:', profileError);
        }

        const workersData = (workerProfiles || [])
          .map((profile: UserProfileData) => ({
            id: profile.key.replace('slc_user:', ''),
            email: profile.value.email,
            nombre: profile.value.nombre,
            apellido: profile.value.apellido,
            rol: profile.value.rol,
            empresaId: company.id,
            createdAt: new Date().toISOString(),
          }))

          .filter(
            (w) =>
              w.rol !== 'empresa' &&
              w.rol !== 'admin' &&
              w.rol !== 'superadmin'
          );

        console.log('✅ Trabajadores procesados:', workersData);
        setCompanyWorkers(workersData);
      } else {
        console.log('⚠️ No hay asignaciones activas');
        setCompanyWorkers([]);
      }

      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('enterprise_id', company.id)
        .order('uploaded_at', { ascending: false });

      if (docsError) {
        console.error('Error cargando documentos:', docsError);
      }

      setCompanyDocs(documents || []);
    } catch (error) {
      console.error('Error cargando detalle de empresa:', error);
    } finally {
      setLoadingCompanyDetail(false);
    }
  };

  const loadCustomPlanForCompany = async (companyId: string) => {
    if (!companyId) return;
    setCustomPlanLoading(true);
    try {
      const { data: ent } = await supabase
        .from('enterprises')
        .select('plan, plan_price, subscription_status, recommended_plan, auditoria_pagada')
        .eq('id', companyId)
        .single();

      setSubStatus(ent?.subscription_status || 'pending');
      setRecommendedPlanSel(ent?.recommended_plan || '');
      setAuditoriaPagadaSel(ent?.auditoria_pagada || false);

      const { data: transfers } = await supabase
        .from('payments')
        .select('id, monto, flow_response, fecha_creacion')
        .eq('empresa_id', companyId)
        .eq('estado', 'pending')
        .eq('metodo_pago', 'transferencia')
        .order('fecha_creacion', { ascending: false });
      setPendingTransfers(
        (transfers || []).map((t) => {
          const meta = (t.flow_response || {}) as Record<string, unknown>;
          return {
            id: t.id,
            monto: t.monto,
            concepto: (meta.concepto as string) || 'Transferencia',
            tipo: (meta.tipo as string) || 'plan',
            fecha: t.fecha_creacion,
          };
        })
      );

      const { data: confirmados } = await supabase
        .from('payments')
        .select('id, monto, flow_response, fecha_creacion, fecha_pago, metodo_pago')
        .eq('empresa_id', companyId)
        .eq('estado', 'completed')
        .order('fecha_pago', { ascending: false });
      setCompletedPayments(
        (confirmados || []).map((p) => {
          const meta = (p.flow_response || {}) as Record<string, unknown>;
          return {
            id: p.id,
            monto: p.monto,
            concepto: (meta.concepto as string) || 'Pago',
            tipo: (meta.tipo as string) || 'plan',
            fecha: p.fecha_pago || p.fecha_creacion,
            metodo: (p.metodo_pago as string) || 'flow',
          };
        })
      );

      const { data: accepted } = await supabase
        .from('payments')
        .select('id')
        .eq('empresa_id', companyId)
        .eq('estado', 'completed')
        .limit(1);
      setHasAcceptedPayment(!!accepted?.length);

      const isCustom = ent?.plan === 'Personalizado' && ent?.plan_price;
      setCustomPlanHasExisting(!!isCustom);

      if (isCustom) {
        setCustomPlanPrice(String(ent.plan_price));
        const { data: kv } = await supabase
          .from('kv_store_7d36b31f')
          .select('value')
          .eq('key', `plan_personalizado:${companyId}`)
          .maybeSingle();
        if (kv?.value && typeof kv.value === 'object') {
          const v = kv.value as Record<string, unknown>;
          setCustomPlanNombre((v.nombre as string) || '');
          setCustomPlanDescripcion((v.descripcion as string) || '');
          const feats = Array.isArray(v.features) ? (v.features as string[]) : [];
          setCustomPlanFeatures(feats.join('\n'));
        }
      } else {
        setCustomPlanNombre('');
        setCustomPlanPrice('');
        setCustomPlanDescripcion('');
        setCustomPlanFeatures('');
      }
    } finally {
      setCustomPlanLoading(false);
    }
  };

  const saveCustomPlan = async () => {
    if (!customPlanCompanyId || !customPlanPrice || isNaN(Number(customPlanPrice))) {
      toast.error('Selecciona una empresa y define un precio mensual válido');
      return;
    }
    setCustomPlanSaving(true);
    try {
      const precio = Number(customPlanPrice);
      const features = customPlanFeatures
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      const { error: entError } = await supabase
        .from('enterprises')
        .update({ plan: 'Personalizado', plan_price: precio })
        .eq('id', customPlanCompanyId);
      if (entError) throw entError;

      const { error: kvError } = await supabase
        .from('kv_store_7d36b31f')
        .upsert(
          {
            key: `plan_personalizado:${customPlanCompanyId}`,
            value: {
              nombre: customPlanNombre || 'Acuerdo Personalizado',
              descripcion: customPlanDescripcion || '',
              features,
              updated_at: new Date().toISOString(),
              updated_by: user.id,
            },
          },
          { onConflict: 'key' }
        );
      if (kvError) throw kvError;

      toast.success('Plan personalizado guardado. La empresa ya puede seleccionarlo.');
      setCustomPlanHasExisting(true);
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar el plan personalizado');
    } finally {
      setCustomPlanSaving(false);
    }
  };

  const removeCustomPlan = async () => {
    if (!customPlanCompanyId) return;
    setCustomPlanSaving(true);
    try {
      const { error: entError } = await supabase
        .from('enterprises')
        .update({ plan: null, plan_price: null })
        .eq('id', customPlanCompanyId);
      if (entError) throw entError;

      await supabase
        .from('kv_store_7d36b31f')
        .delete()
        .eq('key', `plan_personalizado:${customPlanCompanyId}`);

      toast.success('Plan personalizado eliminado');
      setCustomPlanHasExisting(false);
      setCustomPlanNombre('');
      setCustomPlanPrice('');
      setCustomPlanDescripcion('');
      setCustomPlanFeatures('');
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar el plan personalizado');
    } finally {
      setCustomPlanSaving(false);
    }
  };

  const assignStandardPlan = async (planId: string, planNombre: string) => {
    if (!customPlanCompanyId) return;
    setSubSaving(true);
    try {
      const nextBilling = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const { error: entError } = await supabase
        .from('enterprises')
        .update({
          plan: planId,
          plan_price: null,
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', customPlanCompanyId);
      if (entError) throw entError;

      await supabase
        .from('kv_store_7d36b31f')
        .delete()
        .eq('key', `plan_personalizado:${customPlanCompanyId}`);

      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('empresa_id', customPlanCompanyId)
        .maybeSingle();

      const subData = {
        empresa_id: customPlanCompanyId,
        plan: planId,
        estado: 'active',
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: nextBilling,
        updated_at: new Date().toISOString(),
      };

      if (existingSub?.id) {
        await supabase.from('subscriptions').update(subData).eq('id', existingSub.id);
      } else {
        await supabase.from('subscriptions').insert(subData);
      }

      toast.success(`Plan ${planNombre} asignado y suscripción activada`);
      setSubStatus('active');
      setCustomPlanHasExisting(false);
      setCustomPlanNombre('');
      setCustomPlanPrice('');
      setCustomPlanDescripcion('');
      setCustomPlanFeatures('');
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error('Error al asignar el plan');
    } finally {
      setSubSaving(false);
    }
  };

  const changeSubscriptionStatus = async (
    nuevoEstado: 'active' | 'suspended' | 'cancelled'
  ) => {
    if (!customPlanCompanyId) return;
    setSubSaving(true);
    try {

      const { error: entError } = await supabase
        .from('enterprises')
        .update({ subscription_status: nuevoEstado })
        .eq('id', customPlanCompanyId);
      if (entError) throw entError;

      await supabase
        .from('enterprises')
        .update({
          suspension_reason:
            nuevoEstado === 'suspended' ? 'Suspendida por administrador (mora)' : null,
          suspended_at: nuevoEstado === 'suspended' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customPlanCompanyId);

      const subEstado =
        nuevoEstado === 'active' ? 'active' : nuevoEstado === 'suspended' ? 'suspended' : 'cancelled';
      await supabase
        .from('subscriptions')
        .update({ estado: subEstado })
        .eq('empresa_id', customPlanCompanyId);

      if (nuevoEstado === 'suspended' || nuevoEstado === 'active') {
        try {
          const suspendida = nuevoEstado === 'suspended';
          const { data: empresa } = await supabase
            .from('enterprises')
            .select('name, email')
            .eq('id', customPlanCompanyId)
            .maybeSingle();

          const nombreEmpresa = empresa?.name || 'tu empresa';
          const asunto = suspendida
            ? 'Tu cuenta de SotLoy Conecta fue suspendida por mora'
            : 'Tu cuenta de SotLoy Conecta fue reactivada';
          const cuerpo = suspendida
            ? `Hola ${nombreEmpresa}, tu cuenta en SotLoy Conecta ha sido suspendida por mora. Mientras dure la suspensión, ni tú ni tus trabajadores podrán iniciar sesión. Regulariza tu pago para reactivar el acceso.`
            : `Hola ${nombreEmpresa}, tu cuenta en SotLoy Conecta ha sido reactivada. Tú y tus trabajadores ya pueden iniciar sesión nuevamente.`;

          if (empresa?.email) {
            await supabase.functions.invoke('send-email', {
              body: {
                to: empresa.email,
                subject: asunto,
                html: `<p>${cuerpo}</p>`,
              },
            });
          }

          const { data: recipients } = await supabase
            .from('user_enterprises')
            .select('user_id')
            .eq('enterprise_id', customPlanCompanyId)
            .eq('is_active', true);
          if (recipients?.length) {
            await supabase.from('notificaciones').insert(
              recipients.map((r: { user_id: string }) => ({
                user_id: r.user_id,
                titulo: suspendida ? 'Cuenta suspendida por mora' : 'Cuenta reactivada',
                mensaje: cuerpo,
                tipo: suspendida ? 'warning' : 'success',
                leida: false,
                created_at: new Date().toISOString(),
              }))
            );
          }
        } catch (notifErr) {
          console.error('Error enviando aviso de cambio de estado:', notifErr);
        }
      }

      const msg =
        nuevoEstado === 'active'
          ? 'Suscripción reactivada'
          : nuevoEstado === 'suspended'
            ? 'Suscripción suspendida por mora'
            : 'Suscripción cancelada';
      toast.success(msg);
      setSubStatus(nuevoEstado);
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error('Error al cambiar el estado de la suscripción');
    } finally {
      setSubSaving(false);
    }
  };

  const saveRecommendedPlan = async (planId: string) => {
    if (!customPlanCompanyId) return;
    setSubSaving(true);
    try {
      const value = planId || null;
      const { error } = await supabase
        .from('enterprises')
        .update({ recommended_plan: value })
        .eq('id', customPlanCompanyId);
      if (error) throw error;
      setRecommendedPlanSel(planId);
      toast.success(planId ? `Plan ${planId} marcado como recomendado` : 'Recomendación quitada');
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar la recomendación');
    } finally {
      setSubSaving(false);
    }
  };

  const acceptTransfer = async (paymentId: string) => {
    setSubSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('payments-manual-confirm', {
        body: { action: 'accept_payment', paymentId },
      });
      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || 'Error');
      toast.success('Pago por transferencia aceptado y aplicado');
      await loadCustomPlanForCompany(customPlanCompanyId);
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error('No se pudo aceptar el pago');
    } finally {
      setSubSaving(false);
    }
  };

  const cancelPayment = async (
    paymentId: string,
    newStatus: 'refunded' | 'cancelled'
  ) => {
    const verbo = newStatus === 'refunded' ? 'reembolsar' : 'cancelar';
    if (
      !confirm(
        `¿Seguro que deseas ${verbo} este pago? Se revertirá el estado de pago de la empresa (NO la suspende; deberá volver a pagar).`
      )
    ) {
      return;
    }
    setSubSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('payments-manual-confirm', {
        body: { action: 'cancel_payment', paymentId, newStatus },
      });
      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || 'Error');
      toast.success(
        newStatus === 'refunded'
          ? 'Pago reembolsado y estado de la empresa revertido'
          : 'Pago cancelado y estado de la empresa revertido'
      );
      await loadCustomPlanForCompany(customPlanCompanyId);
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cancelar el pago');
    } finally {
      setSubSaving(false);
    }
  };

  const rejectTransfer = async (paymentId: string) => {
    if (
      !confirm(
        '¿Descartar esta transferencia? Saldrá de la lista de revisión y no se aplicará. (Úsalo para transferencias de prueba o duplicadas).'
      )
    ) {
      return;
    }
    setSubSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('payments-manual-confirm', {
        body: { action: 'reject_transfer', paymentId },
      });
      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || 'Error');
      toast.success('Transferencia descartada');
      await loadCustomPlanForCompany(customPlanCompanyId);
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error('No se pudo descartar la transferencia');
    } finally {
      setSubSaving(false);
    }
  };

  const markAuditDone = async () => {
    if (!customPlanCompanyId) return;
    setSubSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('payments-manual-confirm', {
        body: { action: 'mark_audit', empresaId: customPlanCompanyId },
      });
      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || 'Error');
      toast.success('Auditoría marcada como realizada');
      setAuditoriaPagadaSel(true);
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'No se pudo marcar la auditoría');
    } finally {
      setSubSaving(false);
    }
  };

  const markAdminDocRead = async (doc: Doc) => {
    setReadDocIds((prev) => new Set([...prev, doc.id]));
    try {

      await supabase.from('document_views').insert({
        document_id: doc.id,
        viewer_id: user.id,
        owner_id: (doc as { uploaded_by?: string }).uploaded_by || user.id,
        action_type: 'view',
        viewer_email: user.email || null,
        viewer_nombre: `${user.nombre || ''} ${user.apellido || ''}`.trim() || null,
        user_agent: navigator.userAgent,
      });
    } catch {

    }
  };

  const pendientes = payments.filter(
    (p: Payment) => p.estado === 'pendiente'
  ).length;

  if (activeSection === 'inicio') {
    const ingresosTotales = billingPayments
      .filter((p) => p.estado === 'pagado')
      .reduce((s, p) => s + p.monto, 0);
    const pagosPendientes = billingPayments.filter((p) => p.estado === 'pendiente');
    const empresasActivas = companies.filter(
      (c) => c.estado === 'active' || c.estado === 'activo'
    ).length;
    const empresasSuspendidas = companies.filter((c) => c.estado === 'suspended');
    const recientes = billingPayments.slice(0, 5);
    const fmtCLP = (n: number) => `$${n.toLocaleString('es-CL')}`;
    const hour = new Date().getHours();
    const saludo = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

    return (
      <div className="p-6 max-w-6xl mx-auto space-y-5">

        <div
          className="p-6 rounded-xl relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #091f34, #1e3a5f)' }}
        >
          <div style={{ position: 'absolute', top: -40, right: -30, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <p style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', marginBottom: 4, textTransform: 'capitalize' }}>
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: 'white', fontSize: '1.4rem', fontWeight: 500, marginBottom: 2 }}>
            {saludo}, {user?.nombre || 'Admin'} 🛡️
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem' }}>
            Visión general de SotLoy Conecta
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Ingresos confirmados', value: loading ? '–' : fmtCLP(ingresosTotales), icon: <DollarSign size={18} />, bg: '#eff6ff', color: '#3b82f6' },
            { label: 'Pagos pendientes', value: loading ? '–' : pagosPendientes.length, icon: <Clock size={18} />, bg: '#fffbeb', color: '#f59e0b' },
            { label: 'Empresas activas', value: loading ? '–' : `${empresasActivas}/${companies.length}`, icon: <Building2 size={18} />, bg: '#f0fdf4', color: '#10b981' },
            { label: 'Trabajadores', value: loading ? '–' : users.filter((u) => u.rol === 'usuario').length, icon: <Users size={18} />, bg: '#faf5ff', color: '#8b5cf6' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.icon}
                </div>
              </div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.35rem', color: '#0f172a', fontWeight: 700, lineHeight: 1.2 }}>{s.value}</p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {(empresasSuspendidas.length > 0 || pagosPendientes.length > 0) && (
          <div className="flex flex-wrap gap-3">
            {empresasSuspendidas.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                <AlertTriangle size={16} color="#ef4444" />
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', color: '#991b1b' }}>
                  {empresasSuspendidas.length} empresa{empresasSuspendidas.length !== 1 ? 's' : ''} suspendida{empresasSuspendidas.length !== 1 ? 's' : ''} por mora
                </span>
              </div>
            )}
            {pagosPendientes.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                <Clock size={16} color="#f59e0b" />
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', color: '#92400e' }}>
                  {pagosPendientes.length} pago{pagosPendientes.length !== 1 ? 's' : ''} pendiente{pagosPendientes.length !== 1 ? 's' : ''} de revisar
                </span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2" style={{ fontSize: '0.95rem' }}>
              <CreditCard size={16} className="text-blue-600" /> Pagos recientes
            </h3>
            {recientes.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No hay pagos registrados aún</div>
            ) : (
              <div className="flex flex-col gap-1">
                {recientes.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.empresaNombre}</p>
                      <p className="text-xs text-gray-400 truncate">{p.concepto}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-semibold text-gray-900">{fmtCLP(p.monto)}</p>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
                        background: p.estado === 'pagado' ? '#dcfce7' : p.estado === 'pendiente' ? '#fef9c3' : '#fee2e2',
                        color: p.estado === 'pagado' ? '#166534' : p.estado === 'pendiente' ? '#854d0e' : '#991b1b',
                      }}>
                        {p.estado}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2" style={{ fontSize: '0.95rem' }}>
              <Building2 size={16} className="text-emerald-600" /> Cartera de empresas
            </h3>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Total empresas', value: companies.length, color: '#3b82f6' },
                { label: 'Con plan activo', value: empresasActivas, color: '#10b981' },
                { label: 'Suspendidas', value: empresasSuspendidas.length, color: '#ef4444' },
                { label: 'Documentos en sistema', value: docs.length, color: '#8b5cf6' },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{r.label}</span>
                  <span className="text-sm font-bold" style={{ color: r.color }}>{loading ? '–' : r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <IndicadoresBanner />
      </div>
    );
  }

  if (activeSection === 'empresas') {

    if (viewingCompany) {
      return (
        <div className="p-6 max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => {
                setViewingCompany(null);
                setCompanyWorkers([]);
                setCompanyDocs([]);
              }}
              className="flex items-center gap-2 px-4 py-2"
              style={{
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.8rem',
                borderRadius: '6px',
              }}
            >
              ← Volver a empresas
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedCompanyForDoc(viewingCompany);
                  setShowDocUpload(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md"
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}
              >
                <Upload size={14} /> Enviar documento
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.4rem',
                color: '#091f34',
                marginBottom: '16px',
              }}
            >
              {viewingCompany.nombre}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.7rem',
                    color: '#9ca3af',
                    marginBottom: '4px',
                  }}
                >
                  RUT
                </p>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#091f34',
                  }}
                >
                  {viewingCompany.rut || '–'}
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.7rem',
                    color: '#9ca3af',
                    marginBottom: '4px',
                  }}
                >
                  Email
                </p>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#091f34',
                  }}
                >
                  {viewingCompany.email || '–'}
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.7rem',
                    color: '#9ca3af',
                    marginBottom: '4px',
                  }}
                >
                  Plan
                </p>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#091f34',
                  }}
                >
                  {viewingCompany.plan || '–'}
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.7rem',
                    color: '#9ca3af',
                    marginBottom: '4px',
                  }}
                >
                  Estado
                </p>
                <span
                  className="px-2 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor:
                      viewingCompany.estado === 'activo'
                        ? '#f0fdf4'
                        : '#fef2f2',
                    color:
                      viewingCompany.estado === 'activo'
                        ? '#15803d'
                        : '#dc2626',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  {viewingCompany.estado}
                </span>
              </div>
            </div>
          </div>

          {loadingCompanyDetail ? (
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.82rem',
                color: '#9ca3af',
              }}
            >
              Cargando detalles...
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <h3
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '1rem',
                    color: '#091f34',
                    fontWeight: 600,
                    marginBottom: '16px',
                  }}
                >
                  👥 Trabajadores ({companyWorkers.length})
                </h3>
                {companyWorkers.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {companyWorkers.map((worker) => (
                      <div
                        key={worker.id}
                        className="p-3 bg-gray-50 rounded-lg"
                      >
                        <p
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '0.85rem',
                            color: '#091f34',
                            fontWeight: 500,
                          }}
                        >
                          {worker.nombre} {worker.apellido}
                        </p>
                        <p
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '0.75rem',
                            color: '#6b7280',
                          }}
                        >
                          {worker.email} • {worker.rol}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.82rem',
                      color: '#9ca3af',
                    }}
                  >
                    No hay trabajadores vinculados a esta empresa.
                  </p>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <h3
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '1rem',
                    color: '#091f34',
                    fontWeight: 600,
                    marginBottom: '16px',
                  }}
                >
                  📄 Documentos ({companyDocs.length})
                </h3>
                {companyDocs.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {companyDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="border border-gray-200 rounded-lg overflow-hidden"
                      >

                        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                          <span className="text-xs text-gray-500">
                            ID: {doc.id.slice(0, 8)}...
                          </span>
                          <button
                            onClick={() => setTrackingDocId(doc.id)}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                            title="Ver quién ha visto este documento"
                          >
                            <BarChart3 size={12} />
                            Ver quién lo vio
                          </button>
                        </div>

                        <SecureDocumentView
                          document={{
                            id: doc.id,
                            original_name: doc.original_name,
                            storage_path: doc.storage_path,
                            file_category: doc.file_category,
                            file_size: doc.file_size || 0,
                            uploaded_at: doc.uploaded_at,
                            uploaded_by: doc.uploaded_by,
                            uploaded_by_name: doc.uploaded_by_name || 'Empresa',
                            enterprise_id: doc.enterprise_id,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.82rem',
                      color: '#9ca3af',
                    }}
                  >
                    No hay documentos enviados a esta empresa.
                  </p>
                )}
              </div>
            </div>
          )}

          {showDocUpload && selectedCompanyForDoc && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h3
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: '1.1rem',
                      color: '#091f34',
                    }}
                  >
                    Enviar documento a: {selectedCompanyForDoc.nombre}
                  </h3>
                  <button
                    onClick={() => {
                      setShowDocUpload(false);
                      setSelectedCompanyForDoc(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className="p-4">
                  <DocumentUpload
                    empresaId={selectedCompanyForDoc.id}
                    onUploadComplete={() => {
                      toast.success('Documento enviado correctamente');
                      setShowDocUpload(false);
                      setSelectedCompanyForDoc(null);

                      handleViewCompany(viewingCompany);
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <DocumentTrackingModal
            documentId={trackingDocId}
            onClose={() => setTrackingDocId(null)}
          />
        </div>
      );
    }

    const companyCols: ReportColumn<Company>[] = [
      { header: 'Empresa', accessor: (c) => c.nombre },
      { header: 'RUT', accessor: (c) => c.rut || '' },
      { header: 'Email', accessor: (c) => c.email || '' },
      { header: 'Teléfono', accessor: (c) => c.telefono || '' },
      { header: 'Estado', accessor: (c) => c.estado || '' },
      { header: 'Plan', accessor: (c) => c.plan || 'Sin plan' },
      { header: 'N° trabajadores', accessor: (c) => c.userIds.length },
    ];

    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '1.2rem',
              color: '#091f34',
            }}
          >
            Empresas registradas
          </h2>
          {companies.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  exportToXLSX(companies, companyCols, 'Empresas', 'Empresas')
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
              >
                <Download size={15} /> Excel
              </button>
              <button
                onClick={() =>
                  exportToPDF('Empresas registradas', companyCols, companies)
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-700 bg-red-50 hover:bg-red-100"
              >
                <FileText size={15} /> PDF
              </button>
            </div>
          )}
        </div>
        {loading ? (
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.82rem',
              color: '#9ca3af',
            }}
          >
            Cargando...
          </p>
        ) : (
          <div className="grid gap-3">
            {companies.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-lg border border-gray-100 p-4 flex items-center justify-between shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleViewCompany(c)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: '#eff6ff' }}
                  >
                    <Building2 size={18} color="#3b82f6" />
                  </div>
                  <div>
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.85rem',
                        color: '#091f34',
                        fontWeight: 600,
                      }}
                    >
                      {c.nombre}
                    </p>
                    <div
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.72rem',
                        color: '#9ca3af',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '2px',
                      }}
                    >
                      {c.rut && <span>RUT: {c.rut} ·</span>}
                      <span>{c.userIds.length} trabajador(es) ·</span>
                      {c.plan ? (
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            c.plan === 'A'
                              ? 'bg-blue-100 text-blue-700'
                              : c.plan === 'B'
                                ? 'bg-purple-100 text-purple-700'
                                : c.plan === 'C'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-indigo-100 text-indigo-700'
                          }`}
                        >
                          Plan {c.plan}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                          Auditoría Pendiente
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setSelectedCompanyForDoc(c);
                      setShowDocUpload(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md"
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}
                  >
                    <Upload size={14} /> Enviar documento
                  </button>
                  <span
                    className="px-2.5 py-1 rounded-full text-xs"
                    style={{
                      backgroundColor:
                        c.estado === 'activo' ? '#f0fdf4' : '#fef2f2',
                      color: c.estado === 'activo' ? '#15803d' : '#dc2626',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.7rem',
                      fontWeight: 600,
                    }}
                  >
                    {c.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {showDocUpload && selectedCompanyForDoc && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '1.1rem',
                    color: '#091f34',
                  }}
                >
                  Enviar documento a: {selectedCompanyForDoc.nombre}
                </h3>
                <button
                  onClick={() => {
                    setShowDocUpload(false);
                    setSelectedCompanyForDoc(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-4">
                <DocumentUpload
                  empresaId={selectedCompanyForDoc.id}
                  onUploadComplete={() => {
                    toast.success('Documento enviado correctamente');
                    setShowDocUpload(false);
                    setSelectedCompanyForDoc(null);
                    loadData();
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeSection === 'usuarios') {
    const filteredUsers = users.filter((u) => {
      const searchTerm = userSearch.toLowerCase();
      const companyName = u.empresaId
        ? companies.find((c) => c.id === u.empresaId)?.nombre || ''
        : '';
      const matchesCompany =
        exportEmpresaId === 'all' || u.empresaId === exportEmpresaId;
      const matchesSearch =
        u.nombre?.toLowerCase().includes(searchTerm) ||
        u.apellido?.toLowerCase().includes(searchTerm) ||
        u.email?.toLowerCase().includes(searchTerm) ||
        u.rol?.toLowerCase().includes(searchTerm) ||
        companyName.toLowerCase().includes(searchTerm);
      return matchesCompany && matchesSearch;
    });

    const sortedUsers = [...filteredUsers].sort((a, b) => {
      if (!sortColumn) return 0;

      let aVal: string;
      let bVal: string;

      switch (sortColumn) {
        case 'Nombre':
          aVal = `${a.nombre || ''} ${a.apellido || ''}`.toLowerCase();
          bVal = `${b.nombre || ''} ${b.apellido || ''}`.toLowerCase();
          break;
        case 'Correo':
          aVal = (a.email || '').toLowerCase();
          bVal = (b.email || '').toLowerCase();
          break;
        case 'Rol':
          aVal = (a.rol || '').toLowerCase();
          bVal = (b.rol || '').toLowerCase();
          break;
        case 'Empresa':
          aVal =
            (a.empresaId
              ? companies.find((c) => c.id === a.empresaId)?.nombre
              : '') || '';
          bVal =
            (b.empresaId
              ? companies.find((c) => c.id === b.empresaId)?.nombre
              : '') || '';
          break;
        case 'Registro':
          aVal = a.createdAt || '';
          bVal = b.createdAt || '';
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    const handleSort = (column: string) => {
      if (sortColumn === column) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortColumn(column);
        setSortDirection('asc');
      }
    };

    type UserExport = {
      nombre: string; email: string; rol: string;
      empresa: string; registro: string;
    };
    const userRows: UserExport[] = sortedUsers.map((u) => ({
      nombre: `${u.nombre || ''} ${u.apellido || ''}`.trim(),
      email: u.email || '',
      rol: u.rol || '',
      empresa: u.empresaId ? (companies.find((c) => c.id === u.empresaId)?.nombre || u.empresaId) : '—',
      registro: u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-CL') : '—',
    }));
    const userCols: ReportColumn<UserExport>[] = [
      { header: 'Nombre', accessor: (r) => r.nombre },
      { header: 'Correo', accessor: (r) => r.email },
      { header: 'Rol', accessor: (r) => r.rol },
      { header: 'Empresa', accessor: (r) => r.empresa },
      { header: 'Registro', accessor: (r) => r.registro },
    ];
    const exportEmpresaNombre =
      exportEmpresaId === 'all'
        ? null
        : companies.find((c) => c.id === exportEmpresaId)?.nombre || null;

    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '1.2rem',
              color: '#091f34',
            }}
          >
            Usuarios del sistema
          </h2>
          <div className="flex items-center gap-2 flex-wrap">

            <select
              value={exportEmpresaId}
              onChange={(e) => setExportEmpresaId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
              style={{ fontFamily: "'Inter', sans-serif" }}
              title="Filtrar por empresa"
            >
              <option value="all">Todas las empresas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            {sortedUsers.length > 0 && (
              <>
                <button
                  onClick={() =>
                    exportToXLSX(
                      userRows,
                      userCols,
                      exportEmpresaNombre
                        ? `Usuarios_${exportEmpresaNombre}`
                        : 'Usuarios',
                      'Usuarios',
                      exportEmpresaNombre
                        ? `Usuarios · ${exportEmpresaNombre}`
                        : 'Usuarios del sistema'
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
                >
                  <Download size={15} /> Excel
                </button>
                <button
                  onClick={() =>
                    exportToPDF(
                      exportEmpresaNombre
                        ? `Usuarios · ${exportEmpresaNombre}`
                        : 'Usuarios del sistema',
                      userCols,
                      userRows,
                      exportEmpresaNombre
                        ? `Usuarios_${exportEmpresaNombre}`
                        : 'Usuarios'
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-700 bg-red-50 hover:bg-red-100"
                >
                  <FileText size={15} /> PDF
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar por nombre, correo, rol o empresa..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.82rem',
              outline: 'none',
            }}
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr
                style={{
                  backgroundColor: '#f9fafb',
                  borderBottom: '1px solid #f3f4f6',
                }}
              >
                {[
                  { key: 'Nombre', label: 'Nombre' },
                  { key: 'Correo', label: 'Correo' },
                  { key: 'Rol', label: 'Rol' },
                  { key: 'Empresa', label: 'Empresa' },
                  { key: 'Registro', label: 'Registro' },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    className="px-4 py-3 text-left cursor-pointer select-none hover:bg-gray-100"
                    onClick={() => handleSort(key)}
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.72rem',
                      color: sortColumn === key ? '#091f34' : '#9ca3af',
                      fontWeight: sortColumn === key ? 700 : 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      {sortColumn === key && (
                        <span style={{ fontSize: '0.9rem', marginLeft: '4px' }}>
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((u, i) => (
                <tr
                  key={u.id}
                  style={{
                    borderBottom:
                      i < sortedUsers.length - 1
                        ? '1px solid #f9fafb'
                        : undefined,
                  }}
                >
                  <td className="px-4 py-3">
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.82rem',
                        color: '#1a1a2e',
                        fontWeight: 500,
                      }}
                    >
                      {u.nombre} {u.apellido}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.78rem',
                        color: '#6b7280',
                      }}
                    >
                      {u.email}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <RolBadge rol={u.rol} />
                  </td>
                  <td className="px-4 py-3">
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.75rem',
                        color: '#9ca3af',
                      }}
                    >
                      {u.empresaId
                        ? companies.find((c) => c.id === u.empresaId)?.nombre ||
                          '–'
                        : '–'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.75rem',
                        color: '#9ca3af',
                      }}
                    >
                      {u.createdAt ? formatDate(u.createdAt) : '–'}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.72rem',
                color: '#9ca3af',
              }}
            >
              Mostrando {sortedUsers.length} de {users.length} usuarios
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (activeSection === 'documentos') {

    const filteredDocs = adminDocs.filter((doc) => {

      const matchesSearch =
        docSearchTerm === '' ||
        doc.original_name
          ?.toLowerCase()
          .includes(docSearchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(docSearchTerm.toLowerCase());

      const docDate = new Date(doc.uploaded_at);
      const matchesDateFrom =
        docDateFrom === '' || docDate >= new Date(docDateFrom);
      const matchesDateTo = docDateTo === '' || docDate <= new Date(docDateTo);

      const matchesCompany =
        docSelectedCompany === 'all' ||
        doc.enterprise_id === docSelectedCompany;

      const matchesUnread = !docShowUnreadOnly || !readDocIds.has(doc.id);

      return (
        matchesSearch &&
        matchesDateFrom &&
        matchesDateTo &&
        matchesCompany &&
        matchesUnread
      );
    });

    const unreadCount = adminDocs.filter((d) => !readDocIds.has(d.id)).length;

    return (
      <div className="p-6 max-w-5xl mx-auto">

        <AdminDocUploadPanel companies={companies} onUploaded={loadData} />

        <div className="flex items-center justify-between mb-6">
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '1.2rem',
              color: '#091f34',
            }}
          >
            📁 Todos los documentos
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filteredDocs.length} de {adminDocs.length})
            </span>
            {unreadCount > 0 && (
              <span
                className="ml-2 px-2 py-0.5 rounded-full text-xs"
                style={{
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {unreadCount} sin leer
              </span>
            )}
          </h2>

          <button
            onClick={() => setDocShowFilters(!docShowFilters)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: docShowFilters ? '#eff6ff' : 'white',
              border: `1px solid ${docShowFilters ? '#3b82f6' : '#d1d5db'}`,
              color: docShowFilters ? '#3b82f6' : '#6b7280',
              fontFamily: "'Inter', sans-serif",
              cursor: 'pointer',
            }}
          >
            <Filter size={16} />
            Filtros {docShowFilters ? '▲' : '▼'}
          </button>
        </div>

        {docShowFilters && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex flex-wrap gap-4">

              <div className="flex-1 min-w-48">
                <label
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.8rem',
                    color: '#374151',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  � Buscar
                </label>
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-2.5 text-gray-400"
                  />
                  <input
                    type="text"
                    value={docSearchTerm}
                    onChange={(e) => setDocSearchTerm(e.target.value)}
                    placeholder="Nombre o descripción..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  />
                </div>
              </div>

              <div className="flex-1 min-w-48">
                <label
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.8rem',
                    color: '#374151',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  🏢 Empresa
                </label>
                <select
                  value={docSelectedCompany}
                  onChange={(e) => setDocSelectedCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  <option value="all">Todas las empresas</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-40">
                <label
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.8rem',
                    color: '#374151',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  📅 Desde
                </label>
                <DateFieldDDMMYYYY
                  value={docDateFrom}
                  onChange={setDocDateFrom}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
              </div>

              <div className="flex-1 min-w-40">
                <label
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.8rem',
                    color: '#374151',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  📅 Hasta
                </label>
                <DateFieldDDMMYYYY
                  value={docDateTo}
                  onChange={setDocDateTo}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={docShowUnreadOnly}
                    onChange={(e) => setDocShowUnreadOnly(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.85rem',
                      color: '#374151',
                    }}
                  >
                    Solo no leídos
                  </span>
                </label>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setDocSearchTerm('');
                    setDocDateFrom('');
                    setDocDateTo('');
                    setDocSelectedCompany('all');
                    setDocShowUnreadOnly(false);
                  }}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                  Limpiar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          {filteredDocs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={36} color="#d1d5db" className="mx-auto mb-2" />
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.82rem',
                  color: '#9ca3af',
                }}
              >
                {adminDocs.length === 0
                  ? 'No hay documentos en el sistema'
                  : 'No se encontraron documentos con los filtros aplicados'}
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                  marginTop: '8px',
                }}
              >
                {adminDocs.length === 0
                  ? 'Los documentos subidos por empresas y trabajadores aparecerán aquí'
                  : 'Intenta ajustar los filtros de búsqueda'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredDocs.map((doc) => {
                const empresa = companies.find(
                  (c) => c.id === doc.enterprise_id
                );
                const uploader = users.find((u) => u.id === doc.uploaded_by);
                const isRead = readDocIds.has(doc.id);

                const categoryLabels: Record<string, string> = {
                  contract: 'Contrato', payroll: 'Liquidación',
                  termination: 'Finiquito', annex: 'Anexo',
                  legal: 'Legal', report: 'Reporte',
                  invoice: 'Factura', other: 'Otro',
                };

                return (
                  <div
                    key={doc.id}
                    className={`px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${!isRead ? 'bg-blue-50/20' : ''}`}
                  >

                    <div className="relative flex-shrink-0">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: isRead ? '#f3f4f6' : '#eff6ff' }}
                      >
                        <FileText size={16} color={isRead ? '#9ca3af' : '#3b82f6'} />
                      </div>
                      {!isRead && (
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p
                          className="truncate"
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '0.85rem',
                            color: '#091f34',
                            fontWeight: isRead ? 500 : 600,
                            maxWidth: '320px',
                          }}
                          title={doc.original_name}
                        >
                          {doc.original_name}
                        </p>
                        {!isRead && (
                          <span
                            className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs"
                            style={{ backgroundColor: '#fef2f2', color: '#dc2626', fontFamily: "'Inter', sans-serif" }}
                          >
                            Nuevo
                          </span>
                        )}
                      </div>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: '#6b7280' }}>
                        {empresa?.nombre || 'Empresa desconocida'} · {uploader ? `${uploader.nombre} ${uploader.apellido}` : 'Usuario desconocido'} · {formatDate(doc.uploaded_at)}
                        {doc.description && <span className="ml-1 text-gray-400">· {doc.description}</span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs"
                        style={{ backgroundColor: '#f3f4f6', color: '#374151', fontFamily: "'Inter', sans-serif" }}
                      >
                        {categoryLabels[doc.file_category] || doc.file_category}
                      </span>

                      {!isRead && (
                        <button
                          onClick={() => markAdminDocRead(doc)}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-green-50"
                          style={{ color: '#15803d', fontFamily: "'Inter', sans-serif", border: 'none', background: 'none', cursor: 'pointer' }}
                          title="Marcar como leído"
                        >
                          <Check size={12} />
                          Leído
                        </button>
                      )}

                      {doc.storage_path && (
                        <SecureDocumentView
                          compact
                          document={{
                            id: doc.id,
                            original_name: doc.original_name,
                            storage_path: doc.storage_path,
                            file_category: doc.file_category,
                            file_size: doc.file_size || 0,
                            uploaded_at: doc.uploaded_at,
                            uploaded_by: doc.uploaded_by,
                            uploaded_by_name: empresa?.nombre || 'Empresa',
                            enterprise_id: doc.enterprise_id,
                          }}
                          onView={() => markAdminDocRead(doc)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeSection === 'mensajes') {
    return (
      <div className="p-6 h-[calc(100vh-100px)]">
        <MessageCenter
          currentUserId={user?.id || ''}
          currentUserRole={user?.rol || 'admin'}
          currentUserName={`${user?.nombre || ''} ${user?.apellido || ''}`}
          allowedRoles={['empresa', 'usuario']}
        />
      </div>
    );
  }

  if (activeSection === 'pagos') {

    const mockPayments = billingPayments;

    const filteredPayments = mockPayments.filter((p) => {
      const matchesSearch =
        paymentSearch === '' ||
        p.empresaNombre.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        p.concepto.toLowerCase().includes(paymentSearch.toLowerCase());
      const matchesStatus =
        paymentStatusFilter === 'all' || p.estado === paymentStatusFilter;
      const matchesDate =
        (!paymentDateFrom || p.fecha >= paymentDateFrom) &&
        (!paymentDateTo || p.fecha <= paymentDateTo);
      return matchesSearch && matchesStatus && matchesDate;
    });

    const totalIngresos = mockPayments
      .filter((p) => p.estado === 'pagado')
      .reduce((sum, p) => sum + p.monto, 0);
    const ingresosPendientes = mockPayments
      .filter((p) => p.estado === 'pendiente')
      .reduce((sum, p) => sum + p.monto, 0);
    const totalPagos = mockPayments.filter((p) => p.estado === 'pagado').length;
    const totalPendientes = mockPayments.filter(
      (p) => p.estado === 'pendiente'
    ).length;

    const ingresosPorMes = [
      { mes: 'Ene', monto: 298000, cantidad: 2 },
      { mes: 'Feb', monto: 497000, cantidad: 3 },
      { mes: 'Mar', monto: 308000, cantidad: 2 },
      { mes: 'Abr', monto: 150000, cantidad: 1 },
      { mes: 'May', monto: 627000, cantidad: 4 },
      { mes: 'Jun', monto: 450000, cantidad: 3 },
    ];

    const maxIngreso = Math.max(...ingresosPorMes.map((i) => i.monto));

    const planesActivos = {
      A: companies.filter((c) => c.plan === 'A').length,
      B: companies.filter((c) => c.plan === 'B').length,
      C: companies.filter((c) => c.plan === 'C').length,
      D: companies.filter((c) => c.plan === 'D').length,
      'Sin Plan': companies.filter((c) => !c.plan).length,
    };
    const totalPlanes = Object.values(planesActivos).reduce((a, b) => a + b, 0);

    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2
              className="text-2xl font-bold text-gray-900"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Dashboard de Facturación
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Gestiona ingresos, pagos y estadísticas financieras
            </p>
          </div>

          <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'overview', label: 'Resumen', icon: PieChart },
              { id: 'payments', label: 'Historial de Pagos', icon: Clock },
              { id: 'analytics', label: 'Analíticas', icon: BarChart3 },
              { id: 'custom-plans', label: 'Suscripciones', icon: CreditCard },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setBillingView(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  billingView === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Ingresos</p>
                <p className="text-2xl font-bold">
                  ${totalIngresos.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-blue-100 text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>Ingresos confirmados</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Pendiente de Cobro</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${ingresosPendientes.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-orange-600 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>{totalPendientes} pagos pendientes</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Pagos Recibidos</p>
                <p className="text-2xl font-bold text-gray-900">{totalPagos}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-green-600 text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>Pagos confirmados</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">MRR (Recurrente)</p>
                <p className="text-2xl font-bold text-gray-900">
                  $
                  {companies
                    .filter((c) => c.plan)
                    .reduce((sum, c) => {
                      const prices: Record<string, number> = {
                        A: 79000,
                        B: 159000,
                        C: 269000,
                        D: 429000,
                      };
                      return sum + (prices[c.plan || ''] || 0);
                    }, 0)
                    .toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-purple-600 text-sm">
              <span>
                {companies.filter((c) => c.plan).length} empresas con plan
              </span>
            </div>
          </div>
        </div>

        {billingView === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Ingresos Mensuales
                </h3>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value as any)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="month">Últimos 6 meses</option>
                  <option value="quarter">Por trimestre</option>
                  <option value="year">Por año</option>
                </select>
              </div>

              <div className="h-64 flex items-end justify-between gap-3">
                {ingresosPorMes.map((item) => (
                  <div
                    key={item.mes}
                    className="flex-1 flex flex-col items-center gap-2"
                  >
                    <div className="relative w-full group">
                      <div
                        className="bg-blue-500 rounded-t-lg transition-all duration-500 hover:bg-blue-600"
                        style={{
                          height: `${(item.monto / maxIngreso) * 200}px`,
                        }}
                      />

                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        ${item.monto.toLocaleString()}
                        <br />
                        {item.cantidad} pagos
                      </div>
                    </div>
                    <span className="text-sm text-gray-600 font-medium">
                      {item.mes}
                    </span>
                    <span className="text-xs text-gray-400">
                      ${(item.monto / 1000).toFixed(0)}k
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-sm text-gray-500">Promedio mensual</p>
                  <p className="text-lg font-semibold text-gray-900">
                    $
                    {Math.round(
                      ingresosPorMes.reduce((sum, i) => sum + i.monto, 0) /
                        ingresosPorMes.length
                    ).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Mejor mes</p>
                  <p className="text-lg font-semibold text-green-600">
                    ${maxIngreso.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total 6 meses</p>
                  <p className="text-lg font-semibold text-blue-600">
                    $
                    {ingresosPorMes
                      .reduce((sum, i) => sum + i.monto, 0)
                      .toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-6">
                <PieChart className="w-5 h-5" />
                Distribución de Planes
              </h3>

              <div className="space-y-4">
                {[
                  {
                    plan: 'A',
                    name: 'Asesoría',
                    color: 'bg-blue-500',
                    price: 79000,
                  },
                  {
                    plan: 'B',
                    name: 'Gestión PyME',
                    color: 'bg-purple-500',
                    price: 159000,
                  },
                  {
                    plan: 'C',
                    name: 'Remuneraciones',
                    color: 'bg-orange-500',
                    price: 269000,
                  },
                  {
                    plan: 'D',
                    name: 'RRHH Integral',
                    color: 'bg-indigo-500',
                    price: 429000,
                  },
                  {
                    plan: 'Sin Plan',
                    name: 'Pendientes',
                    color: 'bg-gray-300',
                    price: 0,
                  },
                ].map((item) => {
                  const count =
                    planesActivos[item.plan as keyof typeof planesActivos] || 0;
                  const percentage =
                    totalPlanes > 0 ? (count / totalPlanes) * 100 : 0;

                  return (
                    <div key={item.plan} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${item.color}`}
                          />
                          <span className="font-medium text-gray-700">
                            {item.name}
                          </span>
                          <span className="text-gray-400">({count})</span>
                        </div>
                        <span className="text-gray-500">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      {item.price > 0 && (
                        <p className="text-xs text-gray-400">
                          ${item.price.toLocaleString()}/mes
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total empresas</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {totalPlanes}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {billingView === 'payments' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

            <div className="p-4 border-b border-gray-200 bg-gray-50 space-y-4">
              <div className="flex flex-col lg:flex-row gap-4">

                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por empresa o concepto..."
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <select
                  value={paymentStatusFilter}
                  onChange={(e) =>
                    setPaymentStatusFilter(e.target.value as any)
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos los estados</option>
                  <option value="pagado">Pagado</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="vencido">Vencido</option>
                </select>

                <div className="flex items-center gap-2">
                  <DateFieldDDMMYYYY
                    value={paymentDateFrom}
                    onChange={setPaymentDateFrom}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-32"
                  />
                  <span className="text-gray-400">-</span>
                  <DateFieldDDMMYYYY
                    value={paymentDateTo}
                    onChange={setPaymentDateTo}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-32"
                  />
                </div>

                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
                  <Download className="w-4 h-4" />
                  Exportar
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Empresa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Concepto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No se encontraron pagos</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">
                            {payment.empresaNombre}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              payment.tipo === 'auditoria'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {payment.concepto}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(payment.fecha).toLocaleDateString('es-CL')}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-gray-900">
                            ${payment.monto.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                              payment.estado === 'pagado'
                                ? 'bg-green-100 text-green-700'
                                : payment.estado === 'pendiente'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {payment.estado === 'pagado' && (
                              <Check className="w-3 h-3" />
                            )}
                            {payment.estado === 'pendiente' && (
                              <Clock className="w-3 h-3" />
                            )}
                            {payment.estado === 'vencido' && (
                              <AlertTriangle className="w-3 h-3" />
                            )}
                            {payment.estado.charAt(0).toUpperCase() +
                              payment.estado.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Mostrando {filteredPayments.length} de {mockPayments.length}{' '}
                pagos
              </p>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
                  Anterior
                </button>
                <button className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}

        {billingView === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5" />
                Tendencia de Ingresos
              </h3>
              <div className="space-y-4">
                {[
                  {
                    label: 'Este mes',
                    actual: 450000,
                    previo: 380000,
                    trend: 'up',
                  },
                  {
                    label: 'Mes pasado',
                    actual: 380000,
                    previo: 420000,
                    trend: 'down',
                  },
                  {
                    label: 'Hace 2 meses',
                    actual: 420000,
                    previo: 350000,
                    trend: 'up',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-500">
                        vs ${item.previo.toLocaleString()} anterior
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-900">
                        ${item.actual.toLocaleString()}
                      </span>
                      <span
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          item.trend === 'up'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {item.trend === 'up' ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {(
                          (Math.abs(item.actual - item.previo) / item.previo) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-6">
                <Building2 className="w-5 h-5" />
                Estados de Cuentas
              </h3>
              <div className="space-y-4">
                {[
                  {
                    label: 'Activas con plan',
                    count: companies.filter(
                      (c) => c.estado === 'activo' && c.plan
                    ).length,
                    color: 'bg-green-500',
                    desc: 'Cuentas al día con suscripción activa',
                  },
                  {
                    label: 'Pendientes auditoría',
                    count: companies.filter((c) => !c.plan).length,
                    color: 'bg-yellow-500',
                    desc: 'Sin plan, deben auditoría de $149.000',
                  },
                  {
                    label: 'Suspendidas',
                    count: companies.filter((c) => c.estado === 'suspendido')
                      .length,
                    color: 'bg-red-500',
                    desc: 'Cuentas temporalmente desactivadas',
                  },
                  {
                    label: 'Total registradas',
                    count: companies.length,
                    color: 'bg-blue-500',
                    desc: 'Todas las empresas en el sistema',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-4 p-4 border border-gray-100 rounded-lg"
                  >
                    <div
                      className={`w-3 h-3 rounded-full ${item.color} mt-1.5`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">
                          {item.label}
                        </p>
                        <span className="text-lg font-bold text-gray-900">
                          {item.count}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-6">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5" />
                Proyección de Ingresos Próximos 3 Meses
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    month: 'Junio 2024',
                    auditorias: 298000,
                    mensualidades: 627000,
                    total: 925000,
                  },
                  {
                    month: 'Julio 2024',
                    auditorias: 149000,
                    mensualidades: 706000,
                    total: 855000,
                  },
                  {
                    month: 'Agosto 2024',
                    auditorias: 0,
                    mensualidades: 855000,
                    total: 855000,
                  },
                ].map((proj, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="font-medium text-gray-900 mb-3">
                      {proj.month}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Auditorías:</span>
                        <span className="font-medium">
                          ${proj.auditorias.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Mensualidades:</span>
                        <span className="font-medium">
                          ${proj.mensualidades.toLocaleString()}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-gray-100 flex justify-between">
                        <span className="font-medium text-gray-700">
                          Total esperado:
                        </span>
                        <span className="font-bold text-indigo-600">
                          ${proj.total.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {billingView === 'custom-plans' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Selecciona una empresa
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Clic para gestionar su suscripción y plan
                </p>
              </div>
              <div className="overflow-y-auto max-h-[500px]">
                {companies.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    No hay empresas registradas
                  </div>
                ) : (
                  companies.map((c) => {
                    const isCustom = c.plan === 'Personalizado';
                    const isSelected = customPlanCompanyId === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setCustomPlanCompanyId(c.id);
                          loadCustomPlanForCompany(c.id);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-100 last:border-0 ${
                          isSelected
                            ? 'bg-sky-50 border-l-4 border-l-sky-500'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-gray-500">
                          {c.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {c.nombre}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {c.rut || 'Sin RUT'} · {c.userIds.length} trabajadores
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {isCustom ? (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-sky-100 text-sky-700 text-xs rounded-full font-medium">
                              <Sparkles className="w-3 h-3" />
                              {c.plan_price ? `$${c.plan_price.toLocaleString()}` : 'Personalizado'}
                            </div>
                          ) : c.plan ? (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                              Plan {c.plan}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                              Sin plan
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm">
              {!customPlanCompanyId ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center px-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-gray-300" />
                  </div>
                  <h4 className="font-semibold text-gray-500">
                    Selecciona una empresa
                  </h4>
                  <p className="text-sm text-gray-400 mt-1 max-w-xs">
                    Elige una empresa de la lista para configurar su plan personalizado de precio y servicios.
                  </p>
                </div>
              ) : customPlanLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
                </div>
              ) : (
                <>

                  <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-sky-50 to-cyan-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
                          <Edit className="w-5 h-5 text-sky-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {companies.find((c) => c.id === customPlanCompanyId)?.nombre || 'Empresa'}
                          </h3>
                          <p className="text-xs text-gray-500">
                            Gestiona el estado, plan estándar o acuerdo personalizado
                          </p>
                        </div>
                      </div>
                      {(() => {
                        const cfg: Record<string, { bg: string; color: string; label: string }> = {
                          active: { bg: 'bg-green-100', color: 'text-green-700', label: 'Activa' },
                          past_due: { bg: 'bg-red-100', color: 'text-red-700', label: 'Mensualidad vencida' },
                          suspended: { bg: 'bg-red-100', color: 'text-red-700', label: 'Suspendida' },
                          trial: { bg: 'bg-amber-100', color: 'text-amber-700', label: 'En prueba' },
                          cancelled: { bg: 'bg-gray-100', color: 'text-gray-500', label: 'Cancelada' },
                          pending: { bg: 'bg-gray-100', color: 'text-gray-500', label: 'Pendiente' },
                        };
                        const s = cfg[subStatus] || cfg.pending;
                        return (
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 ${s.bg} ${s.color} text-xs rounded-full font-medium`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${s.color.replace('text', 'bg')}`} />
                            {s.label}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="p-5 border-b border-gray-200 space-y-5">

                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Estado de la suscripción
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => changeSubscriptionStatus('active')}
                          disabled={subSaving || subStatus === 'active'}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-green-200 text-green-700 hover:bg-green-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Power className="w-3.5 h-3.5" />
                          Activar
                        </button>
                        <button
                          onClick={() => changeSubscriptionStatus('suspended')}
                          disabled={subSaving || subStatus === 'suspended'}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-200 text-red-700 hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <PauseCircle className="w-3.5 h-3.5" />
                          Suspender (mora)
                        </button>
                        <button
                          onClick={() => changeSubscriptionStatus('cancelled')}
                          disabled={subSaving || subStatus === 'cancelled'}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Cancelar
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5">
                        Suspender bloquea el acceso de los usuarios de la PyME por mora.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Auditoría inicial
                      </label>
                      <div className="flex items-center gap-3 flex-wrap">
                        {auditoriaPagadaSel ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 text-sm rounded-lg font-medium">
                            <CheckCircle className="w-4 h-4" />
                            Auditoría realizada
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={markAuditDone}
                              disabled={subSaving || !hasAcceptedPayment}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-amber-300 text-amber-700 hover:bg-amber-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Marcar auditoría realizada
                            </button>
                            {!hasAcceptedPayment && (
                              <span className="text-xs text-gray-400">
                                Requiere un pago aceptado (Flow o transferencia)
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {pendingTransfers.length > 0 && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Transferencias por revisar ({pendingTransfers.length})
                        </label>
                        <div className="space-y-2">
                          {pendingTransfers.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/60"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">
                                  {t.concepto}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {t.tipo === 'auditoria' ? 'Auditoría' : 'Plan'} ·{' '}
                                  ${Number(t.monto).toLocaleString('es-CL')} ·{' '}
                                  {new Date(t.fecha).toLocaleDateString('es-CL')}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={() => rejectTransfer(t.id)}
                                  disabled={subSaving}
                                  className="px-3 py-1.5 rounded-lg text-sm font-medium border border-red-300 text-red-700 hover:bg-red-50 transition disabled:opacity-50"
                                  title="Descartar (transferencia de prueba o duplicada)"
                                >
                                  Rechazar
                                </button>
                                <button
                                  onClick={() => acceptTransfer(t.id)}
                                  disabled={subSaving}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Aceptar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">
                          Verifica el ingreso en la cuenta bancaria antes de aceptar.
                        </p>
                      </div>
                    )}

                    {completedPayments.length > 0 && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Pagos confirmados ({completedPayments.length})
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          Cancela o reembolsa un pago si fue devuelto o no se concretó
                          de verdad. Revierte el estado de pago de la empresa{' '}
                          <strong>sin suspenderla</strong>.
                        </p>
                        <div className="space-y-2">
                          {completedPayments.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">
                                  {p.concepto}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {p.tipo === 'auditoria' ? 'Auditoría' : 'Plan'} ·{' '}
                                  ${Number(p.monto).toLocaleString('es-CL')} ·{' '}
                                  {p.metodo === 'transferencia' ? 'Transferencia' : 'Flow'} ·{' '}
                                  {new Date(p.fecha).toLocaleDateString('es-CL')}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={() => cancelPayment(p.id, 'refunded')}
                                  disabled={subSaving}
                                  className="px-3 py-1.5 rounded-lg text-sm font-medium border border-blue-300 text-blue-700 hover:bg-blue-50 transition disabled:opacity-50"
                                  title="Marcar como reembolsado y revertir el estado de pago"
                                >
                                  Reembolsar
                                </button>
                                <button
                                  onClick={() => cancelPayment(p.id, 'cancelled')}
                                  disabled={subSaving}
                                  className="px-3 py-1.5 rounded-lg text-sm font-medium border border-red-300 text-red-700 hover:bg-red-50 transition disabled:opacity-50"
                                  title="Marcar como no concretado y revertir el estado de pago"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Plan recomendado a la PyME
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['A', 'B', 'C', 'D'].map((p) => {
                          const active = recommendedPlanSel === p;
                          return (
                            <button
                              key={p}
                              onClick={() => saveRecommendedPlan(active ? '' : p)}
                              disabled={subSaving}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition disabled:opacity-50 ${
                                active
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                  : 'border-gray-200 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50/50'
                              }`}
                            >
                              {active && <Sparkles className="w-3.5 h-3.5" />}
                              Plan {p}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5">
                        La PyME verá este plan destacado como "Recomendado por SotLoy". Clic de nuevo para quitarlo.
                      </p>
                    </div>

                  </div>

                  <div className="px-5 pt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-sky-500" />
                      <h4 className="text-sm font-semibold text-gray-800">
                        Plan personalizado (acuerdo a medida)
                      </h4>
                    </div>
                    <p className="text-xs text-gray-400">
                      El 5º plan, bloqueado para la PyME hasta que definas aquí un precio y características.
                    </p>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Nombre del Plan
                        </label>
                        <input
                          type="text"
                          value={customPlanNombre}
                          onChange={(e) => setCustomPlanNombre(e.target.value)}
                          placeholder="Ej: Acuerdo Pyme Premium"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Precio Mensual (CLP)
                          <span className="text-red-500 ml-0.5">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                            $
                          </span>
                          <input
                            type="number"
                            value={customPlanPrice}
                            onChange={(e) => setCustomPlanPrice(e.target.value)}
                            placeholder="120000"
                            min="0"
                            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                          />
                        </div>
                        {customPlanPrice && !isNaN(Number(customPlanPrice)) && (
                          <p className="text-xs text-sky-600 mt-1 font-medium">
                            ${Number(customPlanPrice).toLocaleString('es-CL')}/mes
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Descripción corta
                        </label>
                        <input
                          type="text"
                          value={customPlanDescripcion}
                          onChange={(e) => setCustomPlanDescripcion(e.target.value)}
                          placeholder="Ej: Servicios a medida acordados"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Características incluidas
                          <span className="text-gray-400 font-normal ml-1 text-xs">(una por línea)</span>
                        </label>
                        <textarea
                          value={customPlanFeatures}
                          onChange={(e) => setCustomPlanFeatures(e.target.value)}
                          placeholder={`Consultas ilimitadas\nSoporte prioritario\nRevisión de contratos\nInforme mensual personalizado`}
                          rows={5}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none resize-none font-mono"
                        />
                        {customPlanFeatures && (
                          <p className="text-xs text-gray-400 mt-1">
                            {customPlanFeatures.split('\n').filter(Boolean).length} características
                          </p>
                        )}
                      </div>
                    </div>

                    {(customPlanPrice || customPlanNombre) && (
                      <div className="bg-sky-50 rounded-lg p-4 border border-sky-100">
                        <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-2">
                          Vista previa para la empresa
                        </p>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-5 h-5 text-sky-500" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-sm">
                              {customPlanNombre || 'Acuerdo Personalizado'}
                            </p>
                            {customPlanDescripcion && (
                              <p className="text-xs text-gray-500 mt-0.5">{customPlanDescripcion}</p>
                            )}
                            {customPlanPrice && !isNaN(Number(customPlanPrice)) && (
                              <p className="text-lg font-bold text-sky-600 mt-1">
                                ${Number(customPlanPrice).toLocaleString('es-CL')}
                                <span className="text-xs font-normal text-gray-400">/mes</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      {customPlanHasExisting && (
                        <button
                          onClick={removeCustomPlan}
                          disabled={customPlanSaving}
                          className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar plan
                        </button>
                      )}
                      <button
                        onClick={saveCustomPlan}
                        disabled={customPlanSaving || !customPlanPrice}
                        className="flex items-center gap-2 px-6 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 transition disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                      >
                        {customPlanSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        {customPlanHasExisting ? 'Actualizar plan' : 'Activar plan personalizado'}
                      </button>
                    </div>

                    <p className="text-xs text-gray-400 flex items-start gap-1.5 pt-1">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
                      Al guardar, la empresa verá esta opción desbloqueada en su panel de suscripción
                      y podrá proceder al pago con el precio configurado.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeSection === 'auditoria') {
    return <AuditSection />;
  }

  if (activeSection === 'chatbot') {
    return <ChatbotIA user={user} />;
  }

  if (activeSection === 'articulos') {
    return <div className="p-6 max-w-5xl mx-auto"><ArticlesManager authorName={`${user.nombre} ${user.apellido}`} /></div>;
  }

  return null;
}

function RolBadge({ rol }: { rol: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    usuario: { bg: '#eff6ff', color: '#3b82f6' },
    empresa: { bg: '#f0fdf4', color: '#15803d' },
    admin: { bg: '#fffbeb', color: '#d97706' },
    superadmin: { bg: '#faf5ff', color: '#7c3aed' },
  };
  const s = styles[rol] || { bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs capitalize"
      style={{
        backgroundColor: s.bg,
        color: s.color,
        fontFamily: "'Inter', sans-serif",
        fontSize: '0.7rem',
        fontWeight: 600,
      }}
    >
      {rol}
    </span>
  );
}
