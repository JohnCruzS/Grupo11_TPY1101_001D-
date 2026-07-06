import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Upload,
  FileText,
  Building2,
  UserCircle,
  CreditCard,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ConectaLayout, NavItem } from '../../components/conecta/ConectaLayout';
import { EmpresaView } from '../../components/conecta/EmpresaView';
import { LoadingScreen } from '../../components/conecta/LoadingScreen';
const TEST_ROLE_ACCOUNTS = [
  { label: 'Trabajador de prueba', name: 'Carlos Mendoza', role: 'usuario' },
  {
    label: 'Empresa de prueba',
    name: 'PyME Empresas de Pruebas',
    role: 'empresa',
  },
  { label: 'Administrador de prueba', name: 'Admin SotLoy', role: 'admin' },
  { label: 'Superadmin de prueba', name: 'Super Admin', role: 'superadmin' },
];
const MENU: NavItem[] = [
  { id: 'inicio', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
  { id: 'trabajadores', label: 'Mis trabajadores', icon: <Users size={15} /> },
  {
    id: 'empleados',
    label: 'Empleados (Nuevo)',
    icon: <UserCircle size={15} />,
    badge: 'Nuevo',
  },
  {
    id: 'documentos',
    label: 'Gestión documental',
    icon: <FileText size={15} />,
  },
  {
    id: 'estadisticas',
    label: 'Estadísticas',
    icon: <BarChart3 size={15} />,
    badge: 'Nuevo',
  },
  { id: 'suscripcion', label: 'Suscripción', icon: <CreditCard size={15} /> },
  {
    id: 'perfil',
    label: 'Mi empresa',
    icon: <Building2 size={15} />,
    divider: true,
  },
];

export default function EmpresaPage() {
  const { user, isLoading } = useAuth();
  const [section, setSection] = useState('inicio');

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/conecta/login" replace />;
  if (user.rol !== 'empresa')
    return (
      <Navigate
        to={`/conecta/${user.rol === 'usuario' ? 'usuario' : user.rol}`}
        replace
      />
    );

  return (
    <ConectaLayout
      menuItems={MENU}
      activeSection={section}
      setActiveSection={setSection}
      accentColor="#10b981"
      accentBg="#f0fdf4"
      roleName="Empresa"
      roleIcon={<Building2 size={11} />}
    >
      {section === 'perfil' ? (
        <EmpresaPerfilSection user={user} />
      ) : (
        <EmpresaView activeSection={section} />
      )}
    </ConectaLayout>
  );
}

function EmpresaPerfilSection({
  user,
}: {
  user: NonNullable<ReturnType<typeof useAuth>['user']>;
}) {
  if (!user) return null;
  return (
    <div className="p-6 max-w-xl mx-auto">
      <div
        className="bg-white rounded-xl border p-6"
        style={{ borderColor: '#e9ecef' }}
      >
        <div
          className="flex items-center gap-4 mb-6 pb-5"
          style={{ borderBottom: '1px solid #f3f4f6' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#10b981' }}
          >
            <Building2 size={28} color="white" />
          </div>
          <div>
            <h2
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '1.05rem',
                color: '#091f34',
                fontWeight: 700,
              }}
            >
              {user.nombre} {user.apellido}
            </h2>
            <span
              className="inline-block px-2.5 py-0.5 rounded-full mt-1"
              style={{
                backgroundColor: '#f0fdf4',
                color: '#10b981',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.7rem',
                fontWeight: 600,
              }}
            >
              Empresa / PyME
            </span>
          </div>
        </div>
        {[
          { label: 'Correo', value: user.email },
          { label: 'Responsable', value: `${user.nombre} ${user.apellido}` },
          { label: 'Rol', value: 'Empresa' },
          {
            label: 'Registrado el',
            value: new Date(user.createdAt).toLocaleDateString('es-CL', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            }),
          },
        ].map((f) => (
          <div
            key={f.label}
            className="flex justify-between py-3"
            style={{ borderBottom: '1px solid #f9fafb' }}
          >
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.78rem',
                color: '#9ca3af',
              }}
            >
              {f.label}
            </span>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.82rem',
                color: '#091f34',
                fontWeight: 500,
              }}
            >
              {f.value}
            </span>
          </div>
        ))}
        <div className="mt-6 rounded-lg border border-gray-100 bg-slate-50 p-4">
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#091f34',
              marginBottom: '8px',
            }}
          >
            Cuentas de prueba disponibles
          </p>
          <div className="grid gap-2">
            {TEST_ROLE_ACCOUNTS.map((item) => (
              <div
                key={item.role}
                className="rounded-lg bg-white p-3 border border-gray-100"
              >
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.8rem',
                    color: '#1a1a2e',
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </p>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.75rem',
                    color: '#6b7280',
                  }}
                >
                  {item.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
