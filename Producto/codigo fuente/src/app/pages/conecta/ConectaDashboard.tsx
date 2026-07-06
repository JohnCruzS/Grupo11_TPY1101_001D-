import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Bot,
  Users,
  Building2,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Shield,
  Crown,
  User,
  MessageSquare,
  Globe,
  Megaphone,
  LayoutPanelTop,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { Toaster } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { ConectaLogo } from '../../components/Logo';
import { UsuarioView } from '../../components/conecta/UsuarioView';
import { EmpresaView } from '../../components/conecta/EmpresaView';
import { AdminView } from '../../components/conecta/AdminView';
import { SuperAdminView } from '../../components/conecta/SuperAdminView';
import { DashboardPanelsBanner } from '../../components/conecta/DashboardPanelsBanner';
import { EmpresaNotesBanner } from '../../components/conecta/EmpresaNotesBanner';
import { AvisosBanner } from '../../components/conecta/AvisosBanner';
import { hasPermiso } from '../../utils/permisos';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  divider?: boolean;
}

const MENUS: Record<string, MenuItem[]> = {
  usuario: [
    { id: 'inicio', label: 'Inicio', icon: <LayoutDashboard size={16} /> },
    { id: 'documentos', label: 'Mis documentos', icon: <FileText size={16} /> },
    { id: 'mensajes', label: 'Mensajes', icon: <MessageSquare size={16} /> },
    { id: 'perfil', label: 'Mi perfil', icon: <User size={16} /> },
    { id: 'chatbot', label: 'Asistente IA', icon: <Bot size={16} /> },
  ],
  empresa: [
    { id: 'inicio', label: 'Inicio', icon: <LayoutDashboard size={16} /> },
    {
      id: 'trabajadores',
      label: 'Mis trabajadores',
      icon: <Users size={16} />,
    },
    { id: 'documentos', label: 'Documentos', icon: <FileText size={16} /> },
    { id: 'mensajes', label: 'Mensajes', icon: <MessageSquare size={16} /> },
    { id: 'avisos', label: 'Avisos a empleados', icon: <Megaphone size={16} /> },
    { id: 'suscripcion', label: 'Mi Suscripción', icon: <CreditCard size={16} /> },
    { id: 'perfil', label: 'Mi Perfil', icon: <User size={16} /> },
    { id: 'chatbot', label: 'Asistente IA', icon: <Bot size={16} /> },
  ],
  admin: [
    { id: 'inicio', label: 'Inicio', icon: <LayoutDashboard size={16} /> },
    { id: 'empresas', label: 'Empresas', icon: <Building2 size={16} /> },
    { id: 'usuarios', label: 'Usuarios', icon: <Users size={16} /> },
    { id: 'documentos', label: 'Documentos', icon: <FileText size={16} /> },
    { id: 'mensajes', label: 'Mensajes', icon: <MessageSquare size={16} /> },
    { id: 'pagos', label: 'Pagos', icon: <CreditCard size={16} /> },
    { id: 'auditoria', label: 'Auditoría', icon: <Shield size={16} /> },
    { id: 'chatbot', label: 'Asistente IA', icon: <Bot size={16} /> },
    { id: 'articulos', label: 'Blog / Artículos', icon: <BookOpen size={16} /> },
  ],
  superadmin: [
    { id: 'inicio', label: 'Inicio', icon: <LayoutDashboard size={16} /> },
    { id: 'usuarios', label: 'Usuarios', icon: <Users size={16} /> },
    { id: 'documentos', label: 'Documentos', icon: <FileText size={16} /> },
    { id: 'mensajes', label: 'Mensajes', icon: <MessageSquare size={16} /> },
    { id: 'pagos', label: 'Cuentas Pendientes', icon: <CreditCard size={16} /> },
    {
      id: 'auditoria',
      label: 'Auditoría Forense',
      icon: <Shield size={16} />,
      divider: true,
    },
    {
      id: 'gestionar_empresas',
      label: 'Gestionar empresas',
      icon: <Settings size={16} />,
    },
    {
      id: 'gestionar_usuarios',
      label: 'Gestionar usuarios',
      icon: <Crown size={16} />,
    },
    {
      id: 'gestionar_admin',
      label: 'Gestionar administración',
      icon: <ShieldCheck size={16} />,
    },
    {
      id: 'contenido',
      label: 'Gestionar contenido',
      icon: <LayoutPanelTop size={16} />,
    },
    { id: 'chatbot', label: 'Asistente IA', icon: <Bot size={16} /> },
    { id: 'gatekeeper', label: 'Gatekeeper LOY', icon: <Globe size={16} /> },
    { id: 'articulos', label: 'Blog / Artículos', icon: <BookOpen size={16} /> },
  ],
};

const ROL_LABELS: Record<string, { label: string; color: string; bg: string }> =
  {
    usuario: { label: 'Usuario', color: '#3b82f6', bg: '#eff6ff' },
    empresa: { label: 'Empresa', color: '#15803d', bg: '#f0fdf4' },
    admin: { label: 'Admin', color: '#d97706', bg: '#fffbeb' },
    superadmin: { label: 'Super Admin', color: '#7c3aed', bg: '#faf5ff' },
  };

export default function ConectaDashboard() {
  const { user, logout, isLoading, startAuthTransition, clearAuthTransition } = useAuth();
  const [activeSection, setActiveSection] = useState('inicio');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#091f34]">
        <div className="animate-spin w-10 h-10 border-2 border-white border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/conecta/login" replace />;

  const userRol = user.rol || 'usuario';

  const menu = (MENUS[userRol] || MENUS.usuario).filter((item) => {
    if (userRol !== 'admin') return true;
    if (item.id === 'empresas') return hasPermiso(user, 'empresas');
    if (item.id === 'usuarios') return hasPermiso(user, 'usuarios');
    if (item.id === 'documentos') return hasPermiso(user, 'documentos');
    if (item.id === 'pagos') return hasPermiso(user, 'finanzas');
    return true;
  });
  const rolInfo = ROL_LABELS[userRol] || ROL_LABELS.usuario;
  const initials = `${user.nombre[0]}${user.apellido[0]}`.toUpperCase();

  const handleLogout = async () => {
    startAuthTransition('logout');
    await Promise.all([logout(), new Promise((r) => setTimeout(r, 800))]);
    clearAuthTransition();
  };

  const navItem = (item: MenuItem) => (
    <button
      key={item.id}
      onClick={() => {
        setActiveSection(item.id);
        setSidebarOpen(false);
      }}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
      style={{
        background:
          activeSection === item.id ? 'rgba(255,255,255,0.1)' : 'none',
        border: 'none',
        borderLeft:
          activeSection === item.id
            ? '3px solid rgba(255,255,255,0.7)'
            : '3px solid transparent',
        cursor: 'pointer',
        fontFamily: "'Inter', sans-serif",
        fontSize: '0.82rem',
        color: activeSection === item.id ? 'white' : 'rgba(255,255,255,0.6)',
        fontWeight: activeSection === item.id ? 500 : 400,
      }}
    >
      <span style={{ opacity: activeSection === item.id ? 1 : 0.7 }}>
        {item.icon}
      </span>
      {item.label}
    </button>
  );

  const sidebar = (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: '#091f34' }}
    >

      <div
        className="px-5 py-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <Link to="/" style={{ textDecoration: 'none' }}>
          <ConectaLogo height={30} />
        </Link>
      </div>

      <div
        className="px-4 py-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.75rem',
                color: 'white',
                fontWeight: 700,
              }}
            >
              {initials}
            </span>
          </div>
          <div className="min-w-0">
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.82rem',
                color: 'white',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.nombre} {user.apellido}
            </p>
            <span
              className="inline-block px-2 py-0.5 rounded-full mt-0.5"
              style={{
                backgroundColor: rolInfo.bg,
                color: rolInfo.color,
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.62rem',
                fontWeight: 600,
              }}
            >
              {rolInfo.label}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        {menu.map((item) => (
          <div key={item.id}>
            {item.divider && (
              <div
                className="mx-4 my-2"
                style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
              />
            )}
            {navItem(item)}
          </div>
        ))}
      </nav>

      <div
        className="p-3 border-t"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.8rem',
            color: '#fca5a5',
          }}
        >
          <LogOut size={15} /> Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: '#f0f2f5' }}
    >
      <Toaster richColors closeButton position="top-right" />

      <div
        className="hidden md:flex w-60 flex-shrink-0 flex-col"
        style={{ minHeight: '100vh' }}
      >
        {sidebar}
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="w-64 flex-shrink-0">{sidebar}</div>
          <div
            className="flex-1"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        <div className="flex items-center justify-between px-4 md:px-6 py-3 flex-shrink-0 bg-white border-b border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#091f34',
                display: 'flex',
              }}
            >
              <Menu size={20} />
            </button>
            <div>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.9rem',
                  color: '#091f34',
                  fontWeight: 600,
                }}
              >
                {menu.find((m) => m.id === activeSection)?.label || 'Dashboard'}
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.7rem',
                  color: '#9ca3af',
                }}
              >
                SotLoy Conecta ·{' '}
                {new Date().toLocaleDateString('es-CL', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ backgroundColor: rolInfo.bg }}
            >
              {userRol === 'admin' && (
                <Shield size={12} color={rolInfo.color} />
              )}
              {userRol === 'superadmin' && (
                <Crown size={12} color={rolInfo.color} />
              )}
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.73rem',
                  color: rolInfo.color,
                  fontWeight: 600,
                }}
              >
                {rolInfo.label}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.75rem',
                color: '#6b7280',
              }}
            >
              <LogOut size={13} /> Salir
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">

          {activeSection === 'inicio' && (
            <div className="px-4 md:px-6 pt-4 space-y-4">
              <AvisosBanner userId={user.id} empresaId={user.empresaId} />
              <DashboardPanelsBanner />
              {userRol === 'usuario' && user.empresaId && (
                <EmpresaNotesBanner empresaId={user.empresaId} userId={user.id} />
              )}
            </div>
          )}
          {userRol === 'usuario' && (
            <UsuarioView user={user} activeSection={activeSection} onChangeSection={setActiveSection} />
          )}
          {userRol === 'empresa' && (
            <EmpresaView
              activeSection={activeSection}
              onChangeSection={setActiveSection}
            />
          )}
          {userRol === 'admin' && (
            <AdminView user={user} activeSection={activeSection} />
          )}
          {userRol === 'superadmin' && (
            <SuperAdminView user={user} activeSection={activeSection} />
          )}
        </div>
      </div>
    </div>
  );
}
