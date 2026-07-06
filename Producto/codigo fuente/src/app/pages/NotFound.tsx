import { Link, useLocation } from 'react-router-dom';
import { Home, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';

export default function NotFound() {
  const { session } = useAuth();
  const { pathname } = useLocation();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#0f1b2d' }}
    >

      <div
        className="px-6 py-5 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <Link to="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
          <Logo size="sm" variant="colored" />
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">

        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(6rem, 20vw, 10rem)',
            fontWeight: 700,
            lineHeight: 1,
            color: 'transparent',
            backgroundImage: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #1e3a5f 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            userSelect: 'none',
            marginBottom: '0.5rem',
          }}
        >
          404
        </div>

        <div
          style={{
            width: '48px',
            height: '2px',
            backgroundColor: 'rgba(59,130,246,0.5)',
            marginBottom: '1.5rem',
          }}
        />

        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
            fontWeight: 500,
            color: 'white',
            marginBottom: '0.75rem',
          }}
        >
          Página no encontrada
        </h1>

        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.875rem',
            color: 'rgba(255,255,255,0.45)',
            maxWidth: '380px',
            lineHeight: 1.7,
            marginBottom: '0.5rem',
          }}
        >
          La ruta{' '}
          <code
            style={{
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              color: 'rgba(96,165,250,0.85)',
              backgroundColor: 'rgba(59,130,246,0.1)',
              padding: '1px 6px',
              borderRadius: '4px',
            }}
          >
            {pathname}
          </code>{' '}
          no existe o fue movida.
        </p>

        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.8rem',
            color: 'rgba(255,255,255,0.3)',
            marginBottom: '2.5rem',
          }}
        >
          Si llegaste aquí desde un enlace interno, reporta el problema al equipo técnico.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="flex items-center justify-center gap-2"
            style={{
              padding: '10px 22px',
              backgroundColor: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.8)',
              borderRadius: '8px',
              textDecoration: 'none',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.85rem',
              fontWeight: 500,
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                'rgba(255,255,255,0.12)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                'rgba(255,255,255,0.07)')
            }
          >
            <Home size={15} />
            Ir al inicio
          </Link>

          {session ? (
            <Link
              to="/conecta/dashboard"
              className="flex items-center justify-center gap-2"
              style={{
                padding: '10px 22px',
                backgroundColor: '#1d4ed8',
                border: '1px solid rgba(59,130,246,0.4)',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.85rem',
                fontWeight: 500,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                  '#1e40af')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                  '#1d4ed8')
              }
            >
              <LayoutDashboard size={15} />
              Volver al Dashboard
            </Link>
          ) : (
            <Link
              to="/conecta/login"
              className="flex items-center justify-center gap-2"
              style={{
                padding: '10px 22px',
                backgroundColor: '#1d4ed8',
                border: '1px solid rgba(59,130,246,0.4)',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.85rem',
                fontWeight: 500,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                  '#1e40af')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                  '#1d4ed8')
              }
            >
              <ArrowLeft size={15} />
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>

      <div
        className="px-6 py-5 text-center border-t"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}
      >
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.2)',
          }}
        >
          © 2026 SotLoy Asesorías · Región de Valparaíso, Chile
        </p>
      </div>
    </div>
  );
}
