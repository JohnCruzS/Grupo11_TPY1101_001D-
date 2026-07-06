import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  User,
  LogOut,
  ChevronDown,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { Logo, ConectaLogo } from './Logo';
import { useAuth } from '../context/AuthContext';

const navLinks = [
  { to: '/', label: 'Inicio' },
  { to: '/quienes-somos', label: '¿Quiénes somos?' },
  { to: '/servicios', label: 'Servicios' },
  { to: '/planes', label: 'Planes' },
  { to: '/contacto', label: 'Contacto' },
  { to: '/blog', label: 'Blog' },
];

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const user = auth.user;

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 130);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    auth.startAuthTransition('logout');
    await Promise.all([auth.logout(), new Promise((r) => setTimeout(r, 800))]);
    auth.clearAuthTransition();
    navigate('/');
  };

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const initials = user
    ? `${user.nombre.charAt(0)}${user.apellido.charAt(0)}`.toUpperCase()
    : '';

  const linkStyle = (to: string): React.CSSProperties => {
    const active = location.pathname === to;
    return {
      fontFamily: "'Inter', sans-serif",
      fontSize: '0.92rem',
      color: 'white',
      fontWeight: active ? 700 : 400,
      opacity: active ? 1 : 0.85,
      textDecoration: 'none',
      transition: 'opacity 0.2s, border-color 0.2s',
      paddingBottom: '6px',
      borderBottom: active
        ? '2px solid #38bdf8'
        : '2px solid transparent',
    };
  };

  return (
    <header style={{ backgroundColor: '#091f34' }}>

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: '#091f34',
          boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        }}
      >

        {scrolled && (
          <Link
            to="/"
            className="hidden md:block"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              textDecoration: 'none',
              zIndex: 1,
            }}
          >
            <Logo size="xs" />
          </Link>
        )}

      <div className="flex justify-between items-center px-6 md:px-8 pt-3 pb-1">

        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            color: 'white',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
          }}
          aria-label="Menú"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className="hidden md:flex items-center gap-5 ml-auto">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} style={linkStyle(link.to)}>
              {link.label}
            </Link>
          ))}

          {!user && (
            <Link
              to="/conecta/login"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',

                backgroundColor: '#091f34',
                border: '1px solid rgba(255,255,255,0.35)',
                color: 'white',
                padding: '6px 16px',
                cursor: 'pointer',
                textDecoration: 'none',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.9rem',
                fontWeight: 600,
                borderRadius: '8px',

                marginBottom: '8px',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.75)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)')
              }
            >
              <span>Ingresa a</span>

              <ConectaLogo height={24} style={{ position: 'relative', top: '2px' }} />
            </Link>
          )}

          {user ? (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.22)',
                  color: 'white',
                  padding: '5px 12px 5px 8px',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.78rem',
                  transition: 'background-color 0.2s',
                }}
              >
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    color: 'white',
                  }}
                >
                  {initials}
                </div>
                <span>{user.nombre}</span>
                <ChevronDown size={12} style={{ opacity: 0.7 }} />
              </button>

              {dropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    backgroundColor: '#fff',
                    minWidth: '190px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                    zIndex: 100,
                  }}
                >
                  <div
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f0f0f0',
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.82rem',
                        color: '#1a1a2e',
                        fontWeight: 600,
                      }}
                    >
                      {user.nombre} {user.apellido}
                    </p>
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.72rem',
                        color: '#9ca3af',
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '160px',
                      }}
                    >
                      {user.email}
                    </p>
                  </div>
                  <Link
                    to="/conecta/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '11px 16px',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.8rem',
                      color: '#1a1a2e',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = '#f9fafb')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = 'transparent')
                    }
                  >
                    <User size={14} />
                    Mi cuenta
                  </Link>
                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '11px 16px',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.8rem',
                      color: '#dc2626',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      borderTop: '1px solid #f0f0f0',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = '#fef2f2')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = 'transparent')
                    }
                  >
                    <LogOut size={14} />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </nav>

        <div className="md:hidden flex items-center gap-2">
          {user ? (
            <Link
              to="/conecta/dashboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                backgroundColor: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: 'white',
                textDecoration: 'none',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.6rem',
                fontWeight: 700,
              }}
            >
              {initials}
            </Link>
          ) : (
            <Link
              to="/conecta/login"
              aria-label="Ingresa a SotLoy Conecta"
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'transparent',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '5px 10px',
                borderRadius: '6px',
                textDecoration: 'none',
              }}
            >
              <ConectaLogo height={18} />
            </Link>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div
          style={{
            backgroundColor: '#0e1a30',
            padding: '12px 0',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                display: 'block',
                padding: '11px 24px',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.85rem',
                color:
                  location.pathname === link.to
                    ? 'white'
                    : 'rgba(255,255,255,0.75)',
                fontWeight: location.pathname === link.to ? 600 : 400,
                textDecoration: 'none',
                backgroundColor:
                  location.pathname === link.to
                    ? 'rgba(255,255,255,0.08)'
                    : 'transparent',
              }}
            >
              {link.label}
            </Link>
          ))}
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.08)',
              margin: '8px 0',
            }}
          />
          <Link
            to="/conecta/login"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 24px',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.82rem',
              color: 'rgba(255,255,255,0.6)',
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={14} />
            SotLoy Conecta
          </Link>
          {user && (
            <>
              <Link
                to="/conecta/dashboard"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '11px 24px',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.85rem',
                  color: 'rgba(255,255,255,0.75)',
                  textDecoration: 'none',
                }}
              >
                <User size={15} />
                Mi cuenta
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '11px 24px',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.85rem',
                  color: '#fca5a5',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <LogOut size={15} />
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      )}
      </div>

      <div className="flex flex-col items-center justify-center py-8 pb-10" style={{ paddingTop: '88px' }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Logo size="xl" />
        </Link>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            color: 'white',
            fontSize: '1rem',
            marginTop: '20px',
            opacity: 0.9,
            letterSpacing: '0.01em',
          }}
        >
          Gestión laboral y de RRHH simple y segura para Pymes.
        </p>
      </div>
    </header>
  );
}
