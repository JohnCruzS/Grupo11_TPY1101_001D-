import { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  Edit3,
  X,
  UserPlus,
  ShieldPlus,
  Link as LinkIcon,
  Eye,
  Send,
  FileText,
  Check,
  Clock,
  DollarSign,
  AlertCircle,
  Search,
  ListFilter,
  Calendar,
  Mail,
  AlertTriangle,
  Ban,
  CheckCircle,
  Power,
  PauseCircle,
  Loader2,
  MailWarning,
} from 'lucide-react';
import { User } from '../../context/AuthContext';
import { AdminView } from './AdminView';
import { getSupabase } from '../../context/AuthContext';
import { DocumentUpload } from './DocumentUpload';
import { MessageCenter } from './MessageCenter';
import { AuditSection } from './AuditSection';
import { ArticlesManager } from './ArticlesManager';
import { LoyGatekeeper } from './LoyGatekeeper';
import { ChatbotIA } from './ChatbotIA';
import { ContentSettingsManager } from './ContentSettingsManager';
import { AdminPermissionsManager } from './AdminPermissionsManager';
import { PERMISO_DEFS, ALL_PERMISOS, type AdminPermisos } from '../../utils/permisos';
import { projectId } from '../../../../utils/supabase/info.tsx';
import { formatRut, validateRut } from '../../utils/validation';
import { exportToXLSX, exportToPDF, type ReportColumn } from '../../utils/reports';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

const SUPABASE_URL = `https://${projectId}.supabase.co`;

interface Company {
  id: string;
  nombre: string;
  rut?: string;
  email?: string;
  telefono?: string;
  estado: string;
  plan?: string;
  plan_price?: number | null;
  userIds: string[];
  createdAt: string;
  suspension_reason?: string;
  suspended_at?: string;
  auditoria_pagada?: boolean;
  primer_mes_pagado?: boolean;
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

const PLANS = [
  'Plan Asesoría',
  'Gestión PyME',
  'Remuneraciones',
  'RRHH Integral',
  'Personalizado',
];
const ROLES = ['usuario', 'empresa', 'admin', 'superadmin'];

interface Props {
  user: User;
  activeSection: string;
}

export function SuperAdminView({ user, activeSection }: Props) {
  const supabase = getSupabase();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);

  const [newAdminPermisos, setNewAdminPermisos] = useState<AdminPermisos>({
    ...ALL_PERMISOS,
  });
  const [showAssign, setShowAssign] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [originalRut, setOriginalRut] = useState<string>('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyWorkers, setCompanyWorkers] = useState<UserProfile[]>([]);
  const [loadingCompanyDetail, setLoadingCompanyDetail] = useState(false);

  const [userSearch, setUserSearch] = useState('');

  const [exportEmpresaId, setExportEmpresaId] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [companyForm, setCompanyForm] = useState({
    nombre: '',
    rut: '',
    email: '',
    telefono: '',
    plan: 'Plan Asesoría',
    planPrice: '',
    estado: 'active',
    primer_mes_pagado: false,
    auditoria_pagada: false,
  });
  const [userForm, setUserForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    rol: 'usuario',
    empresaId: '',
    rut: '',
  });
  const [assignForm, setAssignForm] = useState({ userId: '', companyId: '' });
  const [submitting, setSubmitting] = useState(false);

  const [lastCreatedCredentials, setLastCreatedCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const [adminId, setAdminId] = useState<string>('');
  const [empresaId] = useState<string>('superadmin');
  const [showUpload, setShowUpload] = useState(false);

  const [companySearch, setCompanySearch] = useState('');
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [selectedCompanyForAction, setSelectedCompanyForAction] =
    useState<Company | null>(null);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {

      const { data: enterprises } = await supabase
        .from('enterprises')
        .select('*')
        .neq('subscription_status', 'archived');

      const { data: userProfiles } = await supabase
        .from('kv_store_7d36b31f')
        .select('key, value')
        .like('key', 'slc_user:%');

      const seenIds = new Set<string>();
      const companiesData = (enterprises || []).filter((ent) => {
        if (seenIds.has(ent.id)) return false;
        seenIds.add(ent.id);
        return true;
      }).map((ent) => {
        const rawStatus =
          ent.subscription_status || ent.status || ent.estado || 'trial';
        const normalizedStatus =
          rawStatus === 'active' || rawStatus === 'activo'
            ? 'active'
            : rawStatus === 'suspended' || rawStatus === 'suspendido'
              ? 'suspended'
              : rawStatus === 'archived' || rawStatus === 'archivado'
                ? 'archived'
                : rawStatus;

        return {
          id: ent.id,
          nombre: ent.name,
          rut: ent.rut || '',
          email: ent.email,
          telefono: ent.phone || '',
          estado: normalizedStatus,
          plan: ent.plan || '',
          plan_price: ent.plan_price ?? null,
          userIds: [],
          createdAt: ent.created_at,
          suspension_reason: ent.suspension_reason || '',
          suspended_at: ent.suspended_at || '',
          auditoria_pagada: Boolean(ent.auditoria_pagada),
          primer_mes_pagado: Boolean(ent.primer_mes_pagado),
        };
      });

      const usersData = (userProfiles || []).map((profile) => ({
        id: profile.key.replace('slc_user:', ''),
        nombre: profile.value.nombre,
        apellido: profile.value.apellido,
        email: profile.value.email,
        rol: profile.value.rol,
        empresaId: profile.value.empresaId,
        createdAt: new Date().toISOString(),
      }));

      setCompanies(companiesData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const findAdmin = async () => {
      const { data: adminData } = await supabase
        .from('kv_store_7d36b31f')
        .select('key')
        .like('key', 'slc_user:%')
        .filter('value->>rol', 'eq', 'admin')
        .limit(1);

      if (adminData && adminData.length > 0) {
        const adminUserId = adminData[0].key.replace('slc_user:', '');
        setAdminId(adminUserId);
      }
    };
    findAdmin();
  }, [supabase]);

  const adminSections = ['inicio', 'empresas', 'usuarios', 'documentos', 'pagos'];
  if (adminSections.includes(activeSection)) {
    return <AdminView user={user} activeSection={activeSection} />;
  }

  const handleCreateCompany = async () => {
    if (!companyForm.nombre) {
      toast.error('El nombre es obligatorio.');
      return;
    }

    if (companyForm.telefono && !/^[0-9+\s()-]+$/.test(companyForm.telefono)) {
      toast.error(
        'El teléfono solo puede contener números, +, (), y espacios.'
      );
      return;
    }

    if (!editingCompany) {
      if (!companyForm.rut || !validateRut(companyForm.rut)) {
        toast.error('RUT inválido. Verifica el dígito verificador (ej: 11.111.111-1).');
        return;
      }
    }

    setSubmitting(true);

    try {
      if (editingCompany) {

        const customPlanPrice =
          companyForm.plan === 'Personalizado' && companyForm.planPrice
            ? Number(companyForm.planPrice)
            : null;
        const { error } = await supabase
          .from('enterprises')
          .update({
            name: companyForm.nombre,
            rut: companyForm.rut || null,
            email: companyForm.email || null,
            plan: companyForm.plan,
            plan_price: customPlanPrice,
            subscription_status: companyForm.estado,
            primer_mes_pagado: companyForm.primer_mes_pagado,
            auditoria_pagada: companyForm.auditoria_pagada,
          })
          .eq('id', editingCompany.id);

        if (error) {
          toast.error('Error al actualizar empresa: ' + error.message);
          return;
        }

        await supabase.functions.invoke('audit-log', {
          body: {
            action: 'ENTERPRISE_UPDATE',
            resourceType: 'enterprise',
            resourceId: editingCompany.id,
            enterpriseId: editingCompany.id,
            success: true,
            metadata: {
              nombre: companyForm.nombre,
              plan: companyForm.plan,
              plan_price: companyForm.planPrice || null,
              estado: companyForm.estado,
            },
          },
        });

        toast.success('Empresa actualizada.');
      } else {

        if (companyForm.rut) {
          const { data: rutDup } = await supabase
            .from('enterprises')
            .select('id')
            .eq('rut', companyForm.rut)
            .neq('subscription_status', 'archived')
            .limit(1);
          if (rutDup && rutDup.length > 0) {
            toast.error(`Ya existe una empresa registrada con el RUT ${companyForm.rut}.`);
            setSubmitting(false);
            return;
          }
        }

        const { data: nameDup } = await supabase
          .from('enterprises')
          .select('id')
          .ilike('name', companyForm.nombre.trim())
          .neq('subscription_status', 'archived')
          .limit(1);
        if (nameDup && nameDup.length > 0) {
          toast.error(`Ya existe una empresa con el nombre "${companyForm.nombre}".`);
          setSubmitting(false);
          return;
        }

        const insertData = {
          name: companyForm.nombre,
          rut: companyForm.rut || null,
          email: companyForm.email || null,
          plan: null,
          plan_price: null,
          subscription_status: 'trial',
          auditoria_pagada: false,
          primer_mes_pagado: false,
          max_users: 10,
          created_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('enterprises')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          toast.error('Error al crear empresa: ' + error.message);
          return;
        }

        await supabase.functions.invoke('audit-log', {
          body: {
            action: 'ENTERPRISE_CREATE',
            resourceType: 'enterprise',
            resourceId: data.id,
            enterpriseId: data.id,
            success: true,
            metadata: {
              nombre: companyForm.nombre,
              plan: null,
              estado: 'trial',
              auditoria: 'pendiente',
            },
          },
        });

        if (companyForm.email && data) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(companyForm.email)) {
            toast.error('Email inválido. Debe tener formato: nombre@dominio.com');
            setLastCreatedCredentials({ email: 'No se pudo crear - email inválido', password: 'N/A' });
            return;
          }

          const tempPassword =
            crypto.randomUUID().replace(/-/g, '').slice(0, 16) + 'A1!';

          const { data: createData, error: createError } =
            await supabase.functions.invoke('create-user', {
              body: {
                email: companyForm.email,
                password: tempPassword,
                user_metadata: {
                  rol: 'empresa',
                  nombre: companyForm.nombre,
                  apellido: 'Empresa',
                },
                profile: {
                  email: companyForm.email,
                  nombre: companyForm.nombre,
                  apellido: 'Empresa',
                  rol: 'empresa',
                  empresaId: data.id,
                  telefono: companyForm.telefono || '',
                },
                enterprise_id: data.id,
                role: 'admin',
              },
            });

          if (createError || !createData?.success) {
            const isEmailExists = createData?.code === 'email_exists';
            const errorMsg = createData?.error || createError?.message || 'Error desconocido';

            await supabase.from('enterprises').delete().eq('id', data.id);
            await supabase.functions.invoke('audit-log', {
              body: {
                action: 'ENTERPRISE_DELETE',
                resourceType: 'enterprise',
                resourceId: data.id,
                enterpriseId: data.id,
                success: true,
                metadata: { reason: 'rollback_create_user', error: errorMsg },
              },
            });

            if (isEmailExists) {

              toast.error(errorMsg, { duration: 9000 });
              setLastCreatedCredentials({
                email: 'Correo ya registrado',
                password: 'N/A',
              });
            } else {
              toast.error('No se pudo crear la empresa: ' + errorMsg, { duration: 9000 });
              setLastCreatedCredentials({ email: 'Error: ' + errorMsg, password: 'N/A' });
            }
            setSubmitting(false);
            return;
          }

          setLastCreatedCredentials({
            email: companyForm.email,
            password: 'Enviada por correo',
          });

          const { error: resetError } = await supabase.functions.invoke(
            'reset-password',
            { body: { email: companyForm.email } }
          );
          if (resetError) {
            console.error('Error enviando email de recuperación:', resetError);
          }

          toast.success('Empresa y usuario creados. Se envió email para establecer contraseña.');
        }

        toast.success('Empresa creada correctamente.');
      }

      setShowCreateCompany(false);
      setEditingCompany(null);
      setCompanyForm({
        nombre: '',
        rut: '',
        email: '',
        telefono: '',
        plan: 'Plan Asesoría',
        planPrice: '',
        estado: 'active',
        primer_mes_pagado: false,
        auditoria_pagada: false,
      });
      await reload();

      window.dispatchEvent(new CustomEvent('reload-admin-data'));
    } catch (error) {
      console.error('Error en handleCreateCompany:', error);
      toast.error('Error al procesar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCompany = async (id: string, companyName: string) => {
    const message =
      `⚠️ ELIMINAR EMPRESA ⚠️\n\n` +
      `Empresa: "${companyName}"\n\n` +
      `Esto hará lo siguiente:\n` +
      `• La empresa se quitará del sistema (archivada)\n` +
      `• La empresa y TODOS sus trabajadores perderán el acceso\n` +
      `• Los documentos se conservan, vinculados a la empresa\n` +
      `• Es reversible: reactivar la empresa restaura el acceso\n\n` +
      `¿Estás SEGURO? Escribe "ELIMINAR" para confirmar:`;

    const confirmation = prompt(message);
    if (confirmation !== 'ELIMINAR') {
      if (confirmation !== null) {
        toast.error(
          "Eliminación cancelada. Debes escribir 'ELIMINAR' para confirmar."
        );
      }
      return;
    }

    try {

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/delete-enterprise`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ enterprise_id: id }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al eliminar empresa');
      }

      toast.success('Empresa eliminada correctamente.');
      reload();
    } catch (error) {
      console.error('Error eliminando empresa:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al eliminar empresa.'
      );
    }
  };

  const handleCreateUser = async () => {
    if (!userForm.nombre || !userForm.email) {
      toast.error('Nombre y correo son obligatorios.');
      return;
    }

    if (!userForm.empresaId) {
      toast.error('Debes asignar el usuario a una empresa.');
      return;
    }

    if (!validateRut(userForm.rut)) {
      toast.error('RUT inválido. Ingresa un RUT chileno válido (ej: 12.345.678-9).');
      return;
    }

    setSubmitting(true);

    try {

      const tempPassword =
        crypto.randomUUID().replace(/-/g, '').slice(0, 16) + 'A1!';

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: userForm.email,
          password: tempPassword,
          user_metadata: {
            rol: userForm.rol,
            nombre: userForm.nombre,
            apellido: userForm.apellido,
          },
          profile: {
            id: '',
            email: userForm.email,
            nombre: userForm.nombre,
            apellido: userForm.apellido,
            rol: userForm.rol,
            empresaId: userForm.empresaId,
            rut: userForm.rut,
            createdAt: new Date().toISOString(),
          },
          enterprise_id: userForm.empresaId,
          role: userForm.rol === 'empresa' ? 'admin' : 'employee',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        toast.error(result?.error || 'Error al crear usuario.', {
          duration: 9000,
        });
        return;
      }

      const { error: resetError } = await supabase.functions.invoke(
        'reset-password',
        { body: { email: userForm.email } }
      );
      if (resetError) {
        console.error('Error enviando email de contraseña:', resetError);
        toast.warning(
          'Usuario creado, pero no se pudo enviar el correo para establecer contraseña. Revísalo manualmente.'
        );
      } else {
        toast.success(
          'Usuario creado. Se le envió un correo para establecer su contraseña.'
        );
      }

      setShowCreateUser(false);
      setUserForm({
        nombre: '',
        apellido: '',
        email: '',
        password: '',
        rol: 'usuario',
        empresaId: '',
        rut: '',
      });
      reload();
    } catch (error) {
      console.error('Error creando usuario:', error);
      toast.error('Error al crear usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!userForm.nombre || !userForm.email) {
      toast.error('Nombre y correo son obligatorios.');
      return;
    }

    setSubmitting(true);

    try {
      const tempPassword =
        crypto.randomUUID().replace(/-/g, '').slice(0, 16) + 'A1!';

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: userForm.email,
          password: tempPassword,
          user_metadata: {
            rol: 'admin',
            nombre: userForm.nombre,
            apellido: userForm.apellido,
          },
          profile: {
            id: '',
            email: userForm.email,
            nombre: userForm.nombre,
            apellido: userForm.apellido,
            rol: 'admin',

            permisos: newAdminPermisos,
            createdAt: new Date().toISOString(),
          },

        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        toast.error(result?.error || 'Error al crear administrador.', {
          duration: 9000,
        });
        return;
      }

      const { error: resetError } = await supabase.functions.invoke(
        'reset-password',
        { body: { email: userForm.email } }
      );
      if (resetError) {
        console.error('Error enviando email de contraseña:', resetError);
        toast.warning(
          'Administrador creado, pero no se pudo enviar el correo para establecer contraseña. Revísalo manualmente.'
        );
      } else {
        toast.success(
          'Administrador creado. Se le envió un correo para establecer su contraseña.'
        );
      }

      setShowCreateAdmin(false);
      setUserForm({
        nombre: '',
        apellido: '',
        email: '',
        password: '',
        rol: 'usuario',
        empresaId: '',
      });
      setNewAdminPermisos({ ...ALL_PERMISOS });
      reload();
    } catch (error) {
      console.error('Error creando administrador:', error);
      toast.error('Error al crear administrador.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setSubmitting(true);

    try {

      const { data: existing } = await supabase
        .from('kv_store_7d36b31f')
        .select('value')
        .eq('key', `slc_user:${editingUser.id}`)
        .maybeSingle();

      const merged = {
        ...(existing?.value || {}),
        nombre: editingUser.nombre,
        apellido: editingUser.apellido,
        email: editingUser.email,
        rol: editingUser.rol,
        empresaId: editingUser.empresaId || existing?.value?.empresaId || null,
      };

      const { error: updateError } = await supabase
        .from('kv_store_7d36b31f')
        .update({ value: merged })
        .eq('key', `slc_user:${editingUser.id}`);

      if (updateError) throw new Error(updateError.message);

      await supabase.functions.invoke('audit-log', {
        body: {
          action: 'USER_UPDATE',
          resourceType: 'user',
          resourceId: editingUser.id,
          success: true,
          metadata: { fields: ['nombre', 'apellido', 'email', 'rol', 'empresaId'] },
        },
      });

      toast.success('Usuario actualizado.');
      setEditingUser(null);
      reload();
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      toast.error(`Error al actualizar usuario: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    const demoEmails = new Set([
      'usuario1@gmail.com',
      'pyme@gmail.com',
      'admin@admin.com',
      'superadmin@sotloy.cl',
    ]);
    const targetUser = users.find((u) => u.id === id);
    if (targetUser?.email && demoEmails.has(targetUser.email)) {
      toast.error('No puedes eliminar cuentas demo del sistema.');
      return;
    }

    if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.'))
      return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ user_id: id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar usuario');
      }

      toast.success('Usuario eliminado.');
      reload();
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      toast.error('Error al eliminar usuario.');
    }
  };

  const handleAssign = async () => {
    if (!assignForm.userId || !assignForm.companyId) {
      toast.error('Selecciona usuario y empresa.');
      return;
    }
    setSubmitting(true);

    try {

      const { data: existing } = await supabase
        .from('user_enterprises')
        .select('*')
        .eq('user_id', assignForm.userId)
        .eq('enterprise_id', assignForm.companyId)
        .single();

      if (existing) {
        toast.error('Este usuario ya está asignado a esta empresa.');
        return;
      }

      await supabase.from('user_enterprises').insert({
        user_id: assignForm.userId,
        enterprise_id: assignForm.companyId,
        role: 'employee',
        is_active: true,
        assigned_at: new Date().toISOString(),
      });

      await supabase.functions.invoke('audit-log', {
        body: {
          action: 'USER_ASSIGN',
          resourceType: 'user_enterprises',
          resourceId: `${assignForm.userId}:${assignForm.companyId}`,
          enterpriseId: assignForm.companyId,
          success: true,
          metadata: {
            user_id: assignForm.userId,
            enterprise_id: assignForm.companyId,
          },
        },
      });

      toast.success('Usuario asignado correctamente.');
      setShowAssign(false);
      setAssignForm({ userId: '', companyId: '' });
      reload();
    } catch (error) {
      console.error('Error asignando usuario:', error);
      toast.error('Error al asignar usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewCompany = async (company: Company) => {
    setSelectedCompany(company);
    setLoadingCompanyDetail(true);

    console.log('🔍 Verificando empresa:', company.id, company.nombre);

    try {

      const { data: assignments, error: assignError } = await supabase
        .from('user_enterprises')
        .select('user_id, role, is_active')
        .eq('enterprise_id', company.id);

      console.log(
        '📋 Asignaciones encontradas:',
        assignments?.length || 0,
        assignments
      );
      if (assignError) console.error('❌ Error asignaciones:', assignError);

      const activeAssignments = (assignments || []).filter((a) => a.is_active);
      console.log(
        '✅ Asignaciones activas:',
        activeAssignments.length,
        activeAssignments
      );

      if (activeAssignments.length > 0) {
        const userIds = activeAssignments.map((a) => a.user_id);
        console.log('👤 User IDs:', userIds);

        const { data: workerProfiles, error: profileError } = await supabase
          .from('kv_store_7d36b31f')
          .select('key, value')
          .in(
            'key',
            userIds.map((id) => `slc_user:${id}`)
          );

        console.log(
          '📊 Perfiles encontrados:',
          workerProfiles?.length || 0,
          workerProfiles
        );
        if (profileError) console.error('❌ Error perfiles:', profileError);

        const workersData = (workerProfiles || []).map((profile) => ({
          id: profile.key.replace('slc_user:', ''),
          email: profile.value.email,
          nombre: profile.value.nombre,
          apellido: profile.value.apellido,
          rol: profile.value.rol,
          empresaId: company.id,
          createdAt: new Date().toISOString(),
        }));

        console.log(
          '✅ Trabajadores procesados:',
          workersData.length,
          workersData
        );
        setCompanyWorkers(workersData);
      } else {
        console.log('⚠️ No hay asignaciones activas');
        setCompanyWorkers([]);
      }
    } catch (error) {
      console.error('❌ Error cargando trabajadores:', error);
      setCompanyWorkers([]);
    } finally {
      setLoadingCompanyDetail(false);
    }
  };

  const inputCls: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #d1d5db',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.82rem',
    color: '#1a1a2e',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };
  const labelCls: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.75rem',
    color: '#4a4a5a',
    display: 'block',
    marginBottom: '5px',
    fontWeight: 500,
  };

  if (activeSection === 'gestionar_empresas') {
    const filteredCompanyList = companies.filter((c) => {
      const q = companySearch.toLowerCase();
      return (
        !q ||
        c.nombre.toLowerCase().includes(q) ||
        (c.rut || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.plan || '').toLowerCase().includes(q)
      );
    });

    type CompanyExport = { nombre: string; rut: string; email: string; plan: string; estado: string; trabajadores: number; };
    const companyExportRows: CompanyExport[] = filteredCompanyList.map((c) => ({
      nombre: c.nombre,
      rut: c.rut || '—',
      email: c.email || '—',
      plan: c.plan || 'Sin plan',
      estado: c.estado || '—',
      trabajadores: c.userIds.length,
    }));
    const companyCols: ReportColumn<CompanyExport>[] = [
      { header: 'Empresa', accessor: (r) => r.nombre },
      { header: 'RUT', accessor: (r) => r.rut },
      { header: 'Email', accessor: (r) => r.email },
      { header: 'Plan', accessor: (r) => r.plan },
      { header: 'Estado', accessor: (r) => r.estado },
      { header: 'N° trabajadores', accessor: (r) => r.trabajadores },
    ];

    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '1.2rem',
              color: '#091f34',
            }}
          >
            Gestión de Empresas
          </h2>
          <div className="flex gap-2 flex-wrap">
            {filteredCompanyList.length > 0 && (
              <>
                <button
                  onClick={() => exportToXLSX(companyExportRows, companyCols, 'Empresas', 'Empresas')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
                >
                  <Download size={14} /> Excel
                </button>
                <button
                  onClick={() => exportToPDF('Gestión de Empresas', companyCols, companyExportRows)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-700 bg-red-50 hover:bg-red-100"
                >
                  <FileText size={14} /> PDF
                </button>
              </>
            )}
            <button
              onClick={() => reload()}
              className="flex items-center gap-2 px-3 py-2"
              style={{
                backgroundColor: '#fff',
                color: '#091f34',
                border: '1px solid #d1d5db',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.78rem',
              }}
              title="Actualizar lista"
            >
              <Search size={13} /> Actualizar
            </button>
            <button
              onClick={() => {
                setShowCreateCompany(true);
                setEditingCompany(null);
                setCompanyForm({
                  nombre: '',
                  rut: '',
                  email: '',
                  telefono: '',
                  plan: 'Plan Asesoría',
                  planPrice: '',
                  estado: 'active',
                  primer_mes_pagado: false,
                  auditoria_pagada: false,
                });
              }}
              className="flex items-center gap-2 px-4 py-2"
              style={{
                backgroundColor: '#091f34',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.82rem',
              }}
            >
              <Plus size={14} /> Nueva empresa
            </button>
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar por nombre, RUT, correo o plan..."
            value={companySearch}
            onChange={(e) => setCompanySearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.82rem',
              outline: 'none',
            }}
          />
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
          <>
          <div className="grid gap-3">
            {filteredCompanyList.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-lg border border-gray-100 p-4 flex items-center justify-between shadow-sm"
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
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.72rem',
                        color: '#9ca3af',
                      }}
                    >
                      {c.rut || 'Sin RUT'} · {c.plan || 'Sin plan'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={{
                      backgroundColor:
                        c.estado === 'active' ? '#f0fdf4'
                        : c.estado === 'suspended' ? '#fef2f2'
                        : '#fffbeb',
                      color:
                        c.estado === 'active' ? '#15803d'
                        : c.estado === 'suspended' ? '#dc2626'
                        : '#92400e',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.7rem',
                      fontWeight: 600,
                    }}
                  >
                    {c.estado === 'active' ? 'Activo'
                      : c.estado === 'suspended' ? 'Suspendido'
                      : c.estado === 'archived' ? 'Archivado'
                      : c.estado === 'trial' ? 'En evaluación'
                      : c.estado}
                  </span>
                  <button
                    onClick={() => handleViewCompany(c)}
                    className="w-8 h-8 rounded flex items-center justify-center"
                    style={{
                      backgroundColor: '#f0f9ff',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Eye size={14} color="#0ea5e9" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingCompany(c);
                      const rutFormatted = c.rut ? formatRut(c.rut) : '';
                      setOriginalRut(rutFormatted);
                      setCompanyForm({
                        nombre: c.nombre,
                        rut: rutFormatted,
                        email: c.email || '',
                        telefono: c.telefono || '',
                        plan: c.plan || 'Plan Asesoría',
                        planPrice: c.plan_price ? String(c.plan_price) : '',
                        estado: c.estado === 'activo' || c.estado === 'active' ? 'active'
                          : c.estado === 'suspended' || c.estado === 'suspendido' ? 'suspended'
                          : c.estado || 'active',
                        primer_mes_pagado: Boolean(c.primer_mes_pagado),
                        auditoria_pagada: Boolean(c.auditoria_pagada),
                      });
                      setShowCreateCompany(true);
                    }}
                    className="w-8 h-8 rounded flex items-center justify-center"
                    style={{
                      backgroundColor: '#eff6ff',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Edit3 size={14} color="#3b82f6" />
                  </button>
                  <button
                    onClick={() => handleDeleteCompany(c.id, c.nombre)}
                    className="w-8 h-8 rounded flex items-center justify-center"
                    style={{
                      backgroundColor: '#fef2f2',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={14} color="#ef4444" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {!loading && (
            <div className="mt-2 px-1">
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.72rem',
                  color: '#9ca3af',
                }}
              >
                Mostrando {filteredCompanyList.length} de {companies.length} empresas
              </p>
            </div>
          )}
          </>
        )}

        {showCreateCompany && (
          <Modal
            title={editingCompany ? 'Editar empresa' : 'Nueva empresa'}
            onClose={() => {
              setShowCreateCompany(false);
              setEditingCompany(null);
            }}
          >
            <div className="space-y-3">
              {[
                {
                  key: 'nombre',
                  label: 'Nombre *',
                  placeholder: 'Tech Solutions SpA',
                },
                { key: 'rut', label: 'RUT *', placeholder: '76.123.456-7' },
                {
                  key: 'email',
                  label: 'Correo',
                  placeholder: 'contacto@empresa.cl',
                },
              ].map((f) => (
                <div key={f.key}>
                  <label style={labelCls}>{f.label}</label>
                  <input
                    type={f.type || 'text'}
                    value={(companyForm as Record<string, string>)[f.key]}
                    onChange={(e) => {
                      const val =
                        f.key === 'rut'
                          ? formatRut(e.target.value)
                          : e.target.value;
                      setCompanyForm((p) => ({ ...p, [f.key]: val }));
                    }}
                    maxLength={f.key === 'rut' ? 12 : undefined}
                    placeholder={f.placeholder}
                    style={inputCls}
                  />
                </div>
              ))}

              {editingCompany ? (
                <>
                  <div>
                    <label style={labelCls}>Plan</label>
                    <select
                      value={companyForm.plan}
                      onChange={(e) =>
                        setCompanyForm((p) => ({ ...p, plan: e.target.value }))
                      }
                      style={inputCls}
                    >
                      {PLANS.map((pl) => (
                        <option key={pl} value={pl}>
                          {pl}
                        </option>
                      ))}
                    </select>
                  </div>
                  {companyForm.plan === 'Personalizado' && (
                    <div>
                      <label style={labelCls}>Precio mensual personalizado (CLP)</label>
                      <input
                        type="number"
                        min="0"
                        value={companyForm.planPrice}
                        onChange={(e) =>
                          setCompanyForm((p) => ({
                            ...p,
                            planPrice: e.target.value,
                          }))
                        }
                        placeholder="Ej: 99000"
                        style={inputCls}
                      />
                    </div>
                  )}
                  <div>
                    <label style={labelCls}>Estado de suscripción</label>
                    <select
                      value={companyForm.estado}
                      onChange={(e) =>
                        setCompanyForm((p) => ({ ...p, estado: e.target.value }))
                      }
                      style={inputCls}
                    >
                      <option value="active">Activo</option>
                      <option value="trial">En evaluación / auditoría</option>
                      <option value="suspended">Suspendido (mora)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2 mt-1">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', color: '#374151' }}>
                      <input
                        type="checkbox"
                        checked={companyForm.primer_mes_pagado}
                        onChange={(e) => setCompanyForm((p) => ({ ...p, primer_mes_pagado: e.target.checked }))}
                      />
                      Primer mes pagado (acceso a Documentos, Mensajes, etc.)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', color: '#374151' }}>
                      <input
                        type="checkbox"
                        checked={companyForm.auditoria_pagada}
                        onChange={(e) => setCompanyForm((p) => ({ ...p, auditoria_pagada: e.target.checked }))}
                      />
                      Auditoría inicial pagada
                    </label>
                  </div>
                </>
              ) : (
                <div className="bg-blue-50 border border-blue-100 rounded p-3 flex items-start gap-2">
                  <AlertCircle size={15} style={{ color: '#2563eb', marginTop: '2px', flexShrink: 0 }} />
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.78rem',
                      color: '#374151',
                      lineHeight: 1.5,
                    }}
                  >
                    La empresa se creará con la <strong>auditoría pendiente</strong>.
                    El plan no se asigna ahora: la propia empresa lo elegirá después
                    de pagar su auditoría inicial.
                  </p>
                </div>
              )}
              <button
                onClick={handleCreateCompany}
                disabled={submitting}
                className="w-full py-2.5 mt-2"
                style={{
                  backgroundColor: '#091f34',
                  color: 'white',
                  border: 'none',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.83rem',
                  fontWeight: 500,
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting
                  ? 'Guardando...'
                  : editingCompany
                    ? 'Guardar cambios'
                    : 'Crear empresa'}
              </button>
            </div>
          </Modal>
        )}

        {selectedCompany && (
          <Modal
            title={selectedCompany.nombre}
            onClose={() => {
              setSelectedCompany(null);
              setCompanyWorkers([]);
            }}
          >
            <div className="space-y-4">

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.9rem',
                    color: '#091f34',
                    fontWeight: 600,
                    marginBottom: '12px',
                  }}
                >
                  Información de la Empresa
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span style={{ color: '#6b7280' }}>RUT:</span>
                    <p style={{ fontWeight: 500 }}>
                      {selectedCompany.rut || 'No especificado'}
                    </p>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280' }}>Email:</span>
                    <p style={{ fontWeight: 500 }}>
                      {selectedCompany.email || 'No especificado'}
                    </p>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280' }}>Plan:</span>
                    <p style={{ fontWeight: 500 }}>
                      {selectedCompany.plan || 'Sin plan'}
                    </p>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280' }}>Estado:</span>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs ml-2"
                      style={{
                        backgroundColor:
                          selectedCompany.estado === 'active' ? '#f0fdf4'
                          : selectedCompany.estado === 'suspended' ? '#fef2f2'
                          : '#fffbeb',
                        color:
                          selectedCompany.estado === 'active' ? '#15803d'
                          : selectedCompany.estado === 'suspended' ? '#dc2626'
                          : '#92400e',
                      }}
                    >
                      {selectedCompany.estado === 'active' ? 'Activo'
                        : selectedCompany.estado === 'suspended' ? 'Suspendido'
                        : selectedCompany.estado === 'trial' ? 'En evaluación'
                        : selectedCompany.estado}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.9rem',
                    color: '#091f34',
                    fontWeight: 600,
                    marginBottom: '12px',
                  }}
                >
                  Trabajadores Vinculados ({companyWorkers.length})
                </h3>
                {loadingCompanyDetail ? (
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.82rem',
                      color: '#9ca3af',
                    }}
                  >
                    Cargando trabajadores...
                  </p>
                ) : companyWorkers.length === 0 ? (
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.82rem',
                      color: '#9ca3af',
                    }}
                  >
                    No hay trabajadores vinculados a esta empresa.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {companyWorkers.map((worker) => (
                      <div
                        key={worker.id}
                        className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-medium text-sm">
                            {worker.nombre?.charAt(0)}
                            {worker.apellido?.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: '0.85rem',
                              fontWeight: 500,
                              color: '#091f34',
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
                            {worker.email}
                          </p>
                        </div>
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 flex-shrink-0">
                          {worker.rol === 'usuario' ? 'Trabajador' : worker.rol}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )}

        {lastCreatedCredentials && (
          <Modal
            title="Empresa creada"
            onClose={() => setLastCreatedCredentials(null)}
          >
            <div className="p-4 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#1e3a8a',
                    fontWeight: 600,
                    marginBottom: '12px',
                  }}
                >
                  ✅ Empresa creada correctamente
                </p>

                <div className="space-y-3">
                  <div>
                    <label
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.7rem',
                        color: '#6b7280',
                        display: 'block',
                        marginBottom: '4px',
                      }}
                    >
                      Correo electrónico
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={lastCreatedCredentials.email}
                        readOnly
                        className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded"
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.85rem',
                        }}
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            lastCreatedCredentials.email
                          );
                          toast.success('Email copiado');
                        }}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>

                  <div
                    className="bg-white border border-blue-100 rounded p-3 flex items-start gap-2"
                    style={{ marginTop: '4px' }}
                  >
                    <Mail size={16} style={{ color: '#2563eb', marginTop: '2px', flexShrink: 0 }} />
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.8rem',
                        color: '#374151',
                        lineHeight: 1.5,
                      }}
                    >
                      Le enviamos un correo a esta dirección con un enlace para
                      que la empresa <strong>active su cuenta y defina su contraseña</strong>.
                      Al ingresar, deberá pagar su auditoría inicial y luego podrá
                      elegir su plan.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setLastCreatedCredentials(null)}
                className="w-full py-2.5"
                style={{
                  backgroundColor: '#091f34',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.83rem',
                  fontWeight: 500,
                  borderRadius: '4px',
                }}
              >
                Entendido, cerrar
              </button>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  if (activeSection === 'gestionar_usuarios') {

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
          aVal = (
            companies.find((c) => c.id === a.empresaId)?.nombre || ''
          ).toLowerCase();
          bVal = (
            companies.find((c) => c.id === b.empresaId)?.nombre || ''
          ).toLowerCase();
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

    type UserExport2 = { nombre: string; email: string; rol: string; empresa: string; };
    const userExportRows: UserExport2[] = sortedUsers.map((u) => ({
      nombre: `${u.nombre || ''} ${u.apellido || ''}`.trim(),
      email: u.email || '',
      rol: u.rol || '',
      empresa: u.empresaId ? (companies.find((c) => c.id === u.empresaId)?.nombre || '—') : '—',
    }));
    const userExportCols: ReportColumn<UserExport2>[] = [
      { header: 'Nombre', accessor: (r) => r.nombre },
      { header: 'Correo', accessor: (r) => r.email },
      { header: 'Rol', accessor: (r) => r.rol },
      { header: 'Empresa', accessor: (r) => r.empresa },
    ];
    const exportEmpresaNombre =
      exportEmpresaId === 'all'
        ? null
        : companies.find((c) => c.id === exportEmpresaId)?.nombre || null;

    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '1.2rem',
              color: '#091f34',
            }}
          >
            Gestión de Usuarios
          </h2>
          <div className="flex gap-2 flex-wrap">

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
                      userExportRows,
                      userExportCols,
                      exportEmpresaNombre ? `Usuarios_${exportEmpresaNombre}` : 'Usuarios',
                      'Usuarios',
                      exportEmpresaNombre
                        ? `Usuarios · ${exportEmpresaNombre}`
                        : 'Gestión de Usuarios'
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
                >
                  <Download size={14} /> Excel
                </button>
                <button
                  onClick={() =>
                    exportToPDF(
                      exportEmpresaNombre
                        ? `Usuarios · ${exportEmpresaNombre}`
                        : 'Gestión de Usuarios',
                      userExportCols,
                      userExportRows,
                      exportEmpresaNombre ? `Usuarios_${exportEmpresaNombre}` : 'Usuarios'
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-700 bg-red-50 hover:bg-red-100"
                >
                  <FileText size={14} /> PDF
                </button>
              </>
            )}
            <button
              onClick={() => reload()}
              className="flex items-center gap-2 px-3 py-2"
              style={{
                backgroundColor: '#fff',
                color: '#091f34',
                border: '1px solid #d1d5db',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.78rem',
              }}
              title="Actualizar lista"
            >
              <Search size={13} /> Actualizar
            </button>
            <button
              onClick={() => setShowAssign(true)}
              className="flex items-center gap-2 px-3 py-2"
              style={{
                backgroundColor: '#fff',
                color: '#091f34',
                border: '1px solid #091f34',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.78rem',
              }}
            >
              <LinkIcon size={13} /> Asignar a empresa
            </button>
            <button
              onClick={() => setShowCreateUser(true)}
              className="flex items-center gap-2 px-3 py-2"
              style={{
                backgroundColor: '#091f34',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.78rem',
              }}
            >
              <UserPlus size={13} /> Nuevo usuario
            </button>
            <button
              onClick={() => {
                setUserForm({
                  nombre: '',
                  apellido: '',
                  email: '',
                  password: '',
                  rol: 'admin',
                  empresaId: '',
                });
                setShowCreateAdmin(true);
              }}
              className="flex items-center gap-2 px-3 py-2"
              style={{
                backgroundColor: '#7c2d12',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.78rem',
              }}
              title="Crear una cuenta de administrador de SotLoy (sin empresa asociada)"
            >
              <ShieldPlus size={13} /> Nuevo admin
            </button>
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
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
                    { key: 'Acciones', label: 'Acciones' },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      className={`px-4 py-3 text-left ${key !== 'Acciones' ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                      onClick={() => key !== 'Acciones' && handleSort(key)}
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.72rem',
                        color: sortColumn === key ? '#091f34' : '#9ca3af',
                        fontWeight: sortColumn === key ? 700 : 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div className="flex items-center gap-1">
                        {label}
                        {sortColumn === key && (
                          <span
                            style={{ fontSize: '0.9rem', marginLeft: '4px' }}
                          >
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
                          fontSize: '0.76rem',
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
                          fontSize: '0.74rem',
                          color: '#9ca3af',
                        }}
                      >
                        {u.empresaId
                          ? companies.find((c) => c.id === u.empresaId)
                              ?.nombre || '–'
                          : '–'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingUser({ ...u })}
                          className="w-7 h-7 rounded flex items-center justify-center"
                          style={{
                            backgroundColor: '#eff6ff',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit3 size={12} color="#3b82f6" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="w-7 h-7 rounded flex items-center justify-center"
                          style={{
                            backgroundColor: '#fef2f2',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={12} color="#ef4444" />
                        </button>
                      </div>
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
        )}

        {showCreateUser && (
          <Modal title="Nuevo usuario" onClose={() => setShowCreateUser(false)}>
            <div className="space-y-3">
              {[
                {
                  key: 'nombre',
                  label: 'Nombre *',
                  type: 'text',
                  placeholder: 'Juan',
                },
                {
                  key: 'apellido',
                  label: 'Apellido',
                  type: 'text',
                  placeholder: 'Pérez',
                },
                {
                  key: 'email',
                  label: 'Correo *',
                  type: 'email',
                  placeholder: 'user@empresa.cl',
                },
              ].map((f) => (
                <div key={f.key}>
                  <label style={labelCls}>{f.label}</label>
                  <input
                    type={f.type}
                    value={(userForm as Record<string, string>)[f.key]}
                    onChange={(e) =>
                      setUserForm((p) => ({ ...p, [f.key]: e.target.value }))
                    }
                    placeholder={f.placeholder}
                    style={inputCls}
                  />
                </div>
              ))}
              <div>
                <label style={labelCls}>RUT *</label>
                <input
                  type="text"
                  value={userForm.rut}
                  onChange={(e) =>
                    setUserForm((p) => ({ ...p, rut: formatRut(e.target.value) }))
                  }
                  placeholder="12.345.678-9"
                  style={{
                    ...inputCls,
                    borderColor:
                      userForm.rut && !validateRut(userForm.rut)
                        ? '#ef4444'
                        : undefined,
                  }}
                />
                {userForm.rut && !validateRut(userForm.rut) && (
                  <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px', fontFamily: "'Inter', sans-serif" }}>
                    RUT inválido
                  </p>
                )}
              </div>
              <div>
                <label style={labelCls}>Empresa *</label>
                <select
                  value={userForm.empresaId}
                  onChange={(e) =>
                    setUserForm((p) => ({ ...p, empresaId: e.target.value }))
                  }
                  style={inputCls}
                >
                  <option value="">Selecciona una empresa *</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded p-3 flex items-start gap-2">
                <Mail size={15} style={{ color: '#2563eb', marginTop: '2px', flexShrink: 0 }} />
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.78rem',
                    color: '#374151',
                    lineHeight: 1.5,
                  }}
                >
                  No necesitas asignar contraseña: el usuario recibirá un correo
                  con un enlace para establecer la suya.
                </p>
              </div>
              <button
                onClick={handleCreateUser}
                disabled={submitting}
                className="w-full py-2.5 mt-2"
                style={{
                  backgroundColor: '#091f34',
                  color: 'white',
                  border: 'none',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.83rem',
                  fontWeight: 500,
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </Modal>
        )}

        {showCreateAdmin && (
          <Modal title="Nuevo administrador" onClose={() => setShowCreateAdmin(false)}>
            <div className="space-y-3">
              {[
                {
                  key: 'nombre',
                  label: 'Nombre *',
                  type: 'text',
                  placeholder: 'Juan',
                },
                {
                  key: 'apellido',
                  label: 'Apellido',
                  type: 'text',
                  placeholder: 'Pérez',
                },
                {
                  key: 'email',
                  label: 'Correo *',
                  type: 'email',
                  placeholder: 'admin@sotloy.cl',
                },
              ].map((f) => (
                <div key={f.key}>
                  <label style={labelCls}>{f.label}</label>
                  <input
                    type={f.type}
                    value={(userForm as Record<string, string>)[f.key]}
                    onChange={(e) =>
                      setUserForm((p) => ({ ...p, [f.key]: e.target.value }))
                    }
                    placeholder={f.placeholder}
                    style={inputCls}
                  />
                </div>
              ))}
              <div className="bg-orange-50 border border-orange-100 rounded p-3 flex items-start gap-2">
                <ShieldPlus size={15} style={{ color: '#c2410c', marginTop: '2px', flexShrink: 0 }} />
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.78rem',
                    color: '#374151',
                    lineHeight: 1.5,
                  }}
                >
                  Esta cuenta tendrá rol <strong>administrador</strong> de SotLoy:
                  gestiona la cartera de empresas y no se asocia a ninguna empresa
                  en particular. Recibirá un correo para establecer su contraseña.
                </p>
              </div>

              <div>
                <label style={labelCls}>Módulos habilitados</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {PERMISO_DEFS.map((def) => {
                    const enabled = newAdminPermisos[def.key];
                    return (
                      <button
                        key={def.key}
                        type="button"
                        onClick={() =>
                          setNewAdminPermisos((p) => ({
                            ...p,
                            [def.key]: !p[def.key],
                          }))
                        }
                        className={`flex items-start gap-2 p-2 rounded-lg border text-left transition ${
                          enabled
                            ? 'border-purple-300 bg-purple-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <span
                          className={`mt-0.5 w-8 h-4.5 rounded-full flex-shrink-0 relative transition ${
                            enabled ? 'bg-purple-600' : 'bg-gray-300'
                          }`}
                          style={{ width: 32, height: 18 }}
                        >
                          <span
                            className="absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all"
                            style={{ left: enabled ? 16 : 2 }}
                          />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-medium text-gray-800">
                            {def.label}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.72rem',
                    color: '#9ca3af',
                    marginTop: '6px',
                  }}
                >
                  Podrás ajustarlos luego en “Gestionar administración”.
                </p>
              </div>

              <button
                onClick={handleCreateAdmin}
                disabled={submitting}
                className="w-full py-2.5 mt-2"
                style={{
                  backgroundColor: '#7c2d12',
                  color: 'white',
                  border: 'none',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.83rem',
                  fontWeight: 500,
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Creando...' : 'Crear administrador'}
              </button>
            </div>
          </Modal>
        )}

        {editingUser && (
          <Modal title="Editar usuario" onClose={() => setEditingUser(null)}>
            <div className="space-y-3">
              {[
                { key: 'nombre', label: 'Nombre', type: 'text' },
                { key: 'apellido', label: 'Apellido', type: 'text' },
                { key: 'email', label: 'Email', type: 'email' },
              ].map((f) => (
                <div key={f.key}>
                  <label style={labelCls}>{f.label}</label>
                  <input
                    type={f.type}
                    value={(editingUser as Record<string, string>)[f.key] || ''}
                    onChange={(e) =>
                      setEditingUser((p) =>
                        p ? { ...p, [f.key]: e.target.value } : p
                      )
                    }
                    style={inputCls}
                  />
                </div>
              ))}
              <div>
                <label style={labelCls}>Rol</label>
                <select
                  value={editingUser.rol}
                  onChange={(e) =>
                    setEditingUser((p) =>
                      p ? { ...p, rol: e.target.value } : p
                    )
                  }
                  style={inputCls}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelCls}>Empresa</label>
                <select
                  value={editingUser.empresaId || ''}
                  onChange={(e) =>
                    setEditingUser((p) =>
                      p ? { ...p, empresaId: e.target.value } : p
                    )
                  }
                  style={inputCls}
                >
                  <option value="">Sin empresa</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleUpdateUser}
                disabled={submitting}
                className="w-full py-2.5 mt-2"
                style={{
                  backgroundColor: '#091f34',
                  color: 'white',
                  border: 'none',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.83rem',
                  fontWeight: 500,
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </Modal>
        )}

        {showAssign && (
          <Modal
            title="Asignar usuario a empresa"
            onClose={() => setShowAssign(false)}
          >
            <div className="space-y-3">
              <div>
                <label style={labelCls}>Usuario</label>
                <select
                  value={assignForm.userId}
                  onChange={(e) =>
                    setAssignForm((p) => ({ ...p, userId: e.target.value }))
                  }
                  style={inputCls}
                >
                  <option value="">Seleccionar usuario...</option>
                  {users
                    .filter((u) => u.rol === 'usuario')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} {u.apellido} — {u.email}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label style={labelCls}>Empresa</label>
                <select
                  value={assignForm.companyId}
                  onChange={(e) =>
                    setAssignForm((p) => ({ ...p, companyId: e.target.value }))
                  }
                  style={inputCls}
                >
                  <option value="">Seleccionar empresa...</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleAssign}
                disabled={submitting}
                className="w-full py-2.5 mt-2"
                style={{
                  backgroundColor: '#091f34',
                  color: 'white',
                  border: 'none',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.83rem',
                  fontWeight: 500,
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Asignando...' : 'Asignar'}
              </button>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  if (activeSection === 'enviar_documento_admin') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.3rem',
                color: '#091f34',
                marginBottom: '8px',
              }}
            >
              📤 Enviar Documento al Administrador
            </h2>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.85rem',
                color: '#6b7280',
              }}
            >
              Envía documentos importantes directamente al administrador del
              sistema
            </p>
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
            style={{
              backgroundColor: showUpload ? '#6b7280' : '#3b82f6',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.85rem',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {showUpload ? <X size={18} /> : <Send size={18} />}
            {showUpload ? 'Cancelar' : 'Enviar Documento'}
          </button>
        </div>

        {showUpload && adminId && (
          <div className="mb-6">
            <DocumentUpload
              onUploadComplete={() => {
                toast.success(
                  'Documento enviado al administrador correctamente'
                );
                setShowUpload(false);
              }}
              empresaId={empresaId}
              adminId={adminId}
              allowSendToAdmin={true}
              workers={[]}
            />
          </div>
        )}

        {!adminId && (
          <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
            <FileText size={48} color="#9ca3af" className="mx-auto mb-4" />
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.9rem',
                color: '#6b7280',
              }}
            >
              No se encontró un administrador en el sistema.
            </p>
          </div>
        )}

        <div className="mt-8">
          <h3
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '1rem',
              color: '#091f34',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            📋 Documentos enviados recientemente
          </h3>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.85rem',
                color: '#9ca3af',
                textAlign: 'center',
              }}
            >
              El historial de documentos enviados se encuentra en la sección
              &quot;Documentos&quot;
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (activeSection === 'mensajes') {
    return (
      <div className="p-6 h-[calc(100vh-100px)]">
        <MessageCenter
          currentUserId={user?.id || ''}
          currentUserRole={user?.rol || 'superadmin'}
          currentUserName={`${user?.nombre || ''} ${user?.apellido || ''}`}
          allowedRoles={['empresa', 'admin']}
        />
      </div>
    );
  }

  if (activeSection === 'pagos') {

    const MOTIVOS_PREDEFINIDOS = [
      {
        value: 'no_pago_auditoria',
        label: 'Suscripción desactivada por no pago de auditoría inicial',
        description:
          'No se ha recibido el pago de $149.000 por concepto de auditoría',
      },
      {
        value: 'no_pago_mensualidad',
        label: 'Suscripción desactivada por morosidad en mensualidad',
        description: 'Atraso en el pago de la mensualidad del plan',
      },
      {
        value: 'incumplimiento',
        label: 'Suscripción suspendida por incumplimiento de términos',
        description: 'Violación a los términos y condiciones del servicio',
      },
      {
        value: 'cancelacion_usuario',
        label: 'Suscripción cancelada a solicitud del usuario',
        description: 'El usuario solicitó la cancelación del servicio',
      },
      {
        value: 'suspension_temporal',
        label: 'Suscripción suspendida temporalmente',
        description: 'Pausa temporal del servicio a solicitud del cliente',
      },
      {
        value: 'fraudulenta',
        label: 'Cuenta desactivada por actividad fraudulenta',
        description: 'Detectada actividad sospechosa o fraudulenta',
      },
      {
        value: 'custom',
        label: 'Otro motivo (personalizado)',
        description: 'Especificar un motivo personalizado',
      },
    ];

    const filteredCompanies = companies
      .filter(
        (c) =>
          companySearch === '' ||
          c.nombre.toLowerCase().includes(companySearch.toLowerCase()) ||
          (c.rut && c.rut.toLowerCase().includes(companySearch.toLowerCase()))
      )
      .sort((a, b) => {

        const aDebe = !a.plan || a.estado === 'suspended';
        const bDebe = !b.plan || b.estado === 'suspended';
        if (aDebe && !bDebe) return -1;
        if (!aDebe && bDebe) return 1;

        return a.nombre.localeCompare(b.nombre);
      });

    const empresaTieneDeuda = (company: Company) =>
      company.estado === 'suspended' ||
      !company.plan ||
      !company.auditoria_pagada ||
      !company.primer_mes_pagado;

    const empresasConDeuda = companies.filter(empresaTieneDeuda).length;
    const empresasAlDia = companies.length - empresasConDeuda;

    const openDeactivateModal = (company: Company) => {
      setSelectedCompanyForAction(company);
      setDeactivationReason('no_pago_auditoria');
      setCustomReason('');
      setShowDeactivateModal(true);
    };

    const closeDeactivateModal = () => {
      setShowDeactivateModal(false);
      setSelectedCompanyForAction(null);
      setDeactivationReason('');
      setCustomReason('');
      setIsSendingEmail(false);
    };

    const handleDeactivate = async () => {
      if (!selectedCompanyForAction) return;

      const motivo =
        deactivationReason === 'custom'
          ? customReason
          : MOTIVOS_PREDEFINIDOS.find((m) => m.value === deactivationReason)
              ?.label || 'Cuenta desactivada';

      setIsSendingEmail(true);

      try {

        const { error } = await supabase
          .from('enterprises')
          .update({ subscription_status: 'suspended' })
          .eq('id', selectedCompanyForAction.id);

        if (error) throw error;

        await supabase
          .from('enterprises')
          .update({
            suspension_reason: motivo,
            suspended_at: new Date().toISOString(),
          })
          .eq('id', selectedCompanyForAction.id);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        toast.success(
          `Cuenta de "${selectedCompanyForAction.nombre}" suspendida correctamente`
        );
        closeDeactivateModal();
        reload();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error('Error al suspender la cuenta: ' + msg);
        console.error(err);
      } finally {
        setIsSendingEmail(false);
      }
    };

    const handleActivate = async (company: Company) => {
      try {
        const { error } = await supabase
          .from('enterprises')
          .update({ subscription_status: 'active' })
          .eq('id', company.id);

        if (error) throw error;

        await supabase
          .from('enterprises')
          .update({ suspension_reason: null, suspended_at: null })
          .eq('id', company.id);

        toast.success(`Empresa "${company.nombre}" activada exitosamente`);
        reload();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error('Error al activar la cuenta: ' + msg);
        console.error(err);
      }
    };

    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Gestión de Cuentas
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {companies.length} empresas registradas • {empresasConDeuda} con
              pendientes • {empresasAlDia} al día
            </p>
          </div>

          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar empresa por nombre o RUT..."
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {companies.length}
                </p>
                <p className="text-sm text-gray-500">Empresas Totales</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {empresasAlDia}
                </p>
                <p className="text-sm text-gray-500">Cuentas Al Día</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {companies.filter((c) => !c.plan).length}
                </p>
                <p className="text-sm text-gray-500">Pendientes Auditoría</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {companies.filter((c) => c.estado === 'suspended').length}
                </p>
                <p className="text-sm text-gray-500">Suspendidas</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <ListFilter className="w-5 h-5" />
                Lista de Empresas
              </h3>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Deudor
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Al día
                </span>
              </div>
            </div>
          </div>

          {filteredCompanies.length === 0 ? (
            <div className="p-12 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">
                No se encontraron empresas
              </h3>
              <p className="text-gray-500 mt-2">
                Intenta con otro término de búsqueda
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredCompanies.map((company, index) => {
                const cuentaSuspendida = company.estado === 'suspended';
                const tienePlan = Boolean(company.plan);
                const auditoriaPagada = Boolean(company.auditoria_pagada);
                const primerMesPagado = Boolean(company.primer_mes_pagado);
                const tieneDeuda =
                  cuentaSuspendida ||
                  !tienePlan ||
                  !auditoriaPagada ||
                  !primerMesPagado;
                const planPrices: Record<string, number> = {
                  A: 79000,
                  B: 159000,
                  C: 269000,
                  D: 429000,
                };
                const planNames: Record<string, string> = {
                  A: 'Asesoría',
                  B: 'Gestión PyME',
                  C: 'Remuneraciones',
                  D: 'RRHH Integral',
                };

                return (
                  <div
                    key={company.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      tieneDeuda
                        ? 'border-l-4 border-l-red-500'
                        : 'border-l-4 border-l-green-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {company.nombre}
                          </h4>
                          {index < empresasConDeuda && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                              PRIORIDAD
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {company.rut || 'Sin RUT'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Creada:{' '}
                            {new Date(company.createdAt).toLocaleDateString(
                              'es-CL'
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {company.email || 'Sin email'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">

                        {company.plan ? (
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                              company.plan === 'A'
                                ? 'bg-blue-100 text-blue-700'
                                : company.plan === 'B'
                                  ? 'bg-purple-100 text-purple-700'
                                  : company.plan === 'C'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-indigo-100 text-indigo-700'
                            }`}
                          >
                            Plan {company.plan} - $
                            {planPrices[company.plan]?.toLocaleString()}/mes
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                            Sin plan activo
                          </span>
                        )}

                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                            !tieneDeuda
                              ? 'bg-green-100 text-green-700'
                              : cuentaSuspendida
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {!tieneDeuda
                            ? '✓ Al día'
                            : cuentaSuspendida
                              ? '⛔ Suspendida'
                              : '⏳ Deudor'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-4">
                        {!tienePlan ? (
                          <div className="flex items-center gap-2 text-yellow-700">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="text-sm font-medium">
                              Debe auditoría inicial: $149.000
                            </span>
                          </div>
                        ) : cuentaSuspendida ? (
                          <div className="flex items-center gap-2 text-red-700">
                            <Ban className="w-5 h-5" />
                            <span className="text-sm font-medium">
                              {company.suspension_reason || 'Cuenta suspendida'}
                            </span>
                          </div>
                        ) : !auditoriaPagada ? (
                          <div className="flex items-center gap-2 text-yellow-700">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="text-sm font-medium">
                              Auditoría inicial pendiente
                            </span>
                          </div>
                        ) : !primerMesPagado ? (
                          <div className="flex items-center gap-2 text-red-700">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="text-sm font-medium">
                              Primer mes pendiente de pago
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-sm font-medium">
                              Cuenta activa y al día
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {company.estado === 'suspended' ? (
                          <button
                            onClick={() => handleActivate(company)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
                          >
                            <Power className="w-4 h-4" />
                            Activar Cuenta
                          </button>
                        ) : (
                          <>
                            {!tienePlan && (
                              <button
                                onClick={() => openDeactivateModal(company)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                              >
                                <Ban className="w-4 h-4" />
                                Suspender
                              </button>
                            )}
                            {tienePlan && (
                              <button
                                onClick={() => openDeactivateModal(company)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors font-medium"
                              >
                                <PauseCircle className="w-4 h-4" />
                                Suspender
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showDeactivateModal && selectedCompanyForAction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 bg-red-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <MailWarning className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-red-900">
                      Suspender Cuenta
                    </h3>
                    <p className="text-sm text-red-700">
                      {selectedCompanyForAction.nombre}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-900">Atención</p>
                      <p className="text-sm text-yellow-800 mt-1">
                        Al suspender esta cuenta se enviará automáticamente un
                        correo electrónico a{' '}
                        <strong>
                          {selectedCompanyForAction.email || 'la empresa'}
                        </strong>{' '}
                        notificando la suspensión.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo de suspensión
                  </label>
                  <div className="space-y-2">
                    {MOTIVOS_PREDEFINIDOS.map((motivo) => (
                      <label
                        key={motivo.value}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          deactivationReason === motivo.value
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="deactivationReason"
                          value={motivo.value}
                          checked={deactivationReason === motivo.value}
                          onChange={(e) =>
                            setDeactivationReason(e.target.value)
                          }
                          className="mt-1"
                        />
                        <div>
                          <p className="font-medium text-gray-900">
                            {motivo.label}
                          </p>
                          <p className="text-sm text-gray-500">
                            {motivo.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {deactivationReason === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Motivo personalizado
                    </label>
                    <textarea
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Escribe el motivo de suspensión..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Vista previa del correo
                  </p>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <strong>Para:</strong>{' '}
                      {selectedCompanyForAction.email || 'empresa@ejemplo.com'}
                    </p>
                    <p>
                      <strong>Asunto:</strong> Tu suscripción ha sido suspendida
                      - CONECTA
                    </p>
                    <p className="mt-2 text-gray-500 italic">
                      "
                      {deactivationReason === 'custom'
                        ? customReason || '(motivo personalizado)'
                        : MOTIVOS_PREDEFINIDOS.find(
                            (m) => m.value === deactivationReason
                          )?.label}
                      "
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  onClick={closeDeactivateModal}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                  disabled={isSendingEmail}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeactivate}
                  disabled={
                    isSendingEmail ||
                    (deactivationReason === 'custom' && !customReason.trim())
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <MailWarning className="w-4 h-4" />
                      Suspender y Notificar
                    </>
                  )}
                </button>
              </div>
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

  if (activeSection === 'gatekeeper') {
    return <LoyGatekeeper />;
  }

  if (activeSection === 'contenido') {
    return <ContentSettingsManager />;
  }

  if (activeSection === 'gestionar_admin') {
    return <AdminPermissionsManager />;
  }

  if (activeSection === 'articulos') {
    return <div className="p-6 max-w-5xl mx-auto"><ArticlesManager authorName={`${user.nombre} ${user.apellido}`} /></div>;
  }

  return null;
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col"
        style={{
          position: 'relative',
          zIndex: 10000,
          margin: 'auto',
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.92rem',
              color: '#091f34',
              fontWeight: 600,
            }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
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
