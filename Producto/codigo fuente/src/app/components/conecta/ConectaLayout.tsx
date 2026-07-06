import { useState, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { Toaster } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { ConectaLogo } from '../Logo';
import { NotificationsPanel } from './NotificationsPanel';
import { HelpButton } from './HelpTooltip';

export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  divider?: boolean;
  badge?: string;
}

interface Props {
  children: ReactNode;
  menuItems: NavItem[];
  activeSection: string;
  setActiveSection: (id: string) => void;
  accentColor: string;
  accentBg: string;
  roleName: string;
  roleIcon?: ReactNode;
}

export function ConectaLayout({
  children,
  menuItems,
  activeSection,
  setActiveSection,
  accentColor,
  accentBg,
  roleName,
  roleIcon,
}: Props) {
  const { user, logout, startAuthTransition, clearAuthTransition } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    startAuthTransition('logout');
    await logout();
    navigate('/conecta/login');
    clearAuthTransition();
  };

  const initials = user
    ? `${user.nombre[0]}${user.apellido[0]}`.toUpperCase()
    : '??';
  const activeItem = menuItems.find((m) => m.id === activeSection);

  const SidebarContent = () => (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: '#091f34' }}
    >

      <div
        className="px-5 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <Link to="/" className="no-underline">
          <ConectaLogo height={34} />
        </Link>
      </div>

      <div
        className="px-4 py-3 mx-3 mt-3 mb-1 rounded-lg flex-shrink-0"
        style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: accentColor, opacity: 0.9 }}
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
              className="truncate"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.8rem',
                color: 'white',
                fontWeight: 500,
              }}
            >
              {user?.nombre} {user?.apellido}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              {roleIcon && (
                <span style={{ color: accentColor, display: 'flex' }}>
                  {roleIcon}
                </span>
              )}
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.64rem',
                  color: accentColor,
                  fontWeight: 600,
                }}
              >
                {roleName}
              </span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto px-2">
        {menuItems.map((item) => (
          <div key={item.id}>
            {item.divider && (
              <div
                className="mx-2 my-2"
                style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
              />
            )}
            <button
              onClick={() => {
                setActiveSection(item.id);
                setSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left mb-0.5 transition-all"
              style={{
                background:
                  activeSection === item.id
                    ? `linear-gradient(90deg, ${accentColor}28 0%, ${accentColor}0a 100%)`
                    : 'transparent',
                border:
                  activeSection === item.id
                    ? `1px solid ${accentColor}35`
                    : '1px solid transparent',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.8rem',
                color:
                  activeSection === item.id
                    ? 'white'
                    : 'rgba(255,255,255,0.55)',
                fontWeight: activeSection === item.id ? 500 : 400,
              }}
            >
              <span
                style={{
                  color:
                    activeSection === item.id
                      ? accentColor
                      : 'rgba(255,255,255,0.4)',
                  display: 'flex',
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-xs"
                  style={{
                    backgroundColor: accentColor,
                    color: 'white',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          </div>
        ))}
      </nav>

      <div
        className="p-3 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
      >
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.15)',
            color: '#fca5a5',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.78rem',
          }}
        >
          <LogOut size={14} /> Cerrar sesión
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

      <aside
        className="hidden md:flex w-56 flex-shrink-0 flex-col"
        style={{ minHeight: '100vh' }}
      >
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-60 flex-shrink-0">
            <SidebarContent />
          </div>
          <div
            className="flex-1"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        <div
          className="flex items-center gap-4 px-4 md:px-6 py-3 flex-shrink-0 bg-white border-b"
          style={{
            borderColor: '#e9ecef',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
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

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                style={{
                  color: accentColor,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {activeItem?.icon}
              </span>
              <h1
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.92rem',
                  color: '#091f34',
                  fontWeight: 700,
                }}
              >
                {activeItem?.label || 'Dashboard'}
              </h1>
            </div>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.68rem',
                color: '#adb5bd',
                marginTop: '1px',
              }}
            >
              {new Date().toLocaleDateString('es-CL', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          <div className="flex items-center gap-2">

            {user && (
              <NotificationsPanel
                userId={user.id}
                userRol={user.rol || 'usuario'}
              />
            )}

            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                backgroundColor: accentBg,
                border: `1px solid ${accentColor}30`,
              }}
            >
              {roleIcon && (
                <span style={{ color: accentColor, display: 'flex' }}>
                  {roleIcon}
                </span>
              )}
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.72rem',
                  color: accentColor,
                  fontWeight: 600,
                }}
              >
                {roleName}
              </span>
            </div>
            <div
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #e9ecef',
              }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: accentColor }}
              >
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.55rem',
                    color: 'white',
                    fontWeight: 700,
                  }}
                >
                  {initials}
                </span>
              </div>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.75rem',
                  color: '#495057',
                  fontWeight: 500,
                }}
              >
                {user?.nombre}
              </span>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto relative">{children}</main>

        <HelpButton />
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  color,
  bg,
  change,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  color: string;
  bg: string;
  change?: string;
  subtitle?: string;
}) {
  return (
    <div
      className="bg-white rounded-xl p-5 border flex items-start gap-4"
      style={{
        borderColor: '#e9ecef',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: bg }}
      >
        <span style={{ color, display: 'flex' }}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.7rem',
            color: '#adb5bd',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '1.5rem',
            color: '#091f34',
            fontWeight: 800,
            lineHeight: 1.2,
            marginTop: '2px',
          }}
        >
          {value}
        </p>
        {subtitle && (
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.71rem',
              color: '#adb5bd',
              marginTop: '3px',
            }}
          >
            {subtitle}
          </p>
        )}
        {change && (
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.71rem',
              color: '#10b981',
              marginTop: '3px',
              fontWeight: 500,
            }}
          >
            {change}
          </p>
        )}
      </div>
    </div>
  );
}
