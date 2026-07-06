import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ConectaLogo, Logo } from '../../components/Logo';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth, SESSION_EXPIRED_FLAG, SESSION_BLOCKED_FLAG, BLOCK_MESSAGES } from '../../context/AuthContext';
import { loginSchema, type LoginForm } from '../../utils/validation';

const LOCKOUT_KEY = 'slc_lockout_v1';

interface LockoutData {
  failCount: number;
  lockedUntil: number | null;
  tier: number;
}

function readLockout(): LockoutData {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    if (raw) return JSON.parse(raw) as LockoutData;
  } catch {}
  return { failCount: 0, lockedUntil: null, tier: 0 };
}

function saveLockout(data: LockoutData) {
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify(data));
}

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ConectaLogin() {
  const { login, startAuthTransition, clearAuthTransition } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [lockout, setLockoutState] = useState<LockoutData>(readLockout);
  const [countdown, setCountdown] = useState(0);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_EXPIRED_FLAG)) {
      sessionStorage.removeItem(SESSION_EXPIRED_FLAG);
      setError('root', {
        message: 'Tu sesión expiró tras 1 hora de uso. Inicia sesión nuevamente.',
      });
    }
    const blockedMsg = sessionStorage.getItem(SESSION_BLOCKED_FLAG);
    if (blockedMsg) {
      sessionStorage.removeItem(SESSION_BLOCKED_FLAG);
      setError('root', { message: blockedMsg });
    }
  }, []);

  useEffect(() => {
    if (!lockout.lockedUntil) {
      setCountdown(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((lockout.lockedUntil! - Date.now()) / 1000),
      );
      setCountdown(remaining);
      if (remaining === 0) {
        const updated = { ...lockout, lockedUntil: null };
        saveLockout(updated);
        setLockoutState(updated);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockout.lockedUntil]);

  const updateLockout = (data: LockoutData) => {
    saveLockout(data);
    setLockoutState(data);
  };

  const isBlocked = lockout.tier === 3;
  const isTimedOut = !isBlocked && lockout.lockedUntil !== null && countdown > 0;
  const isLocked = isBlocked || isTimedOut;

  const onSubmit = async (data: LoginForm) => {
    clearErrors();
    if (isLocked) return;

    startAuthTransition('login');
    const result = await login(data.email.trim(), data.password);
    clearAuthTransition();

    if (result.success) {
      saveLockout({ failCount: 0, lockedUntil: null, tier: 0 });
      navigate('/conecta/dashboard');
      return;
    }

    if (result.error && Object.values(BLOCK_MESSAGES).includes(result.error)) {
      setError('root', { message: result.error });
      return;
    }

    const current = { ...lockout };

    if (current.tier === 0) {
      current.failCount += 1;
      if (current.failCount >= 3) {
        current.lockedUntil = Date.now() + 5 * 60 * 1000;
        current.tier = 1;
        current.failCount = 0;
      }
    } else if (current.tier === 1) {
      current.lockedUntil = Date.now() + 30 * 60 * 1000;
      current.tier = 2;
    } else if (current.tier === 2) {
      current.tier = 3;
      current.lockedUntil = null;
    }

    updateLockout(current);

    if (current.tier === 0) {
      const left = 3 - current.failCount;
      setError('root', {
        message: `Credenciales incorrectas. ${left} intento${left !== 1 ? 's' : ''} restante${left !== 1 ? 's' : ''}.`,
      });
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#091f34' }}>

      <div
        className="hidden lg:flex flex-col justify-between w-96 flex-shrink-0 p-10"
        style={{
          backgroundColor: '#091f34',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div>
          <div className="mb-12">
            <Link to="/" style={{ textDecoration: 'none' }}>
              <Logo variant="colored" size="sm" />
            </Link>
          </div>

          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              color: 'white',
              fontSize: '1.6rem',
              fontWeight: 500,
              lineHeight: 1.3,
              marginBottom: '16px',
            }}
          >
            Plataforma de Gestión Documental Laboral
          </h2>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              color: 'rgba(255,255,255,0.55)',
              fontSize: '0.82rem',
              lineHeight: 1.7,
            }}
          >
            Gestiona contratos, liquidaciones y documentos laborales con
            inteligencia artificial integrada.
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              label: 'Gestión documental segura',
              desc: 'Documentos almacenados en la nube',
            },
            {
              label: 'Control de roles y accesos',
              desc: 'Permisos personalizados por perfil',
            },
            {
              label: 'IA Legal integrada',
              desc: 'Asistente con derecho laboral chileno',
            },
          ].map((f) => (
            <div key={f.label} className="flex items-start gap-3">
              <div
                className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                style={{ backgroundColor: '#60a5fa' }}
              />
              <div>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                  }}
                >
                  {f.label}
                </p>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.72rem',
                  }}
                >
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            color: 'rgba(255,255,255,0.25)',
            fontSize: '0.7rem',
          }}
        >
          © 2026 SotLoy Asesorías. Región de Valparaíso, Chile.
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">

          <div className="flex justify-center mb-6">
            <Link to="/" style={{ textDecoration: 'none' }}>
              <ConectaLogo height={48} />
            </Link>
          </div>

          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              color: 'white',
              fontSize: '1.6rem',
              fontWeight: 500,
              marginBottom: '6px',
              textAlign: 'center',
            }}
          >
            Bienvenido
          </h1>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              color: 'rgba(255,255,255,0.45)',
              fontSize: '0.85rem',
              marginBottom: '32px',
              textAlign: 'center',
            }}
          >
            Inicia sesión para acceder a tu portal
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.55)',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                Correo electrónico
              </label>
              <input
                type="email"
                {...register('email')}
                placeholder="correo@empresa.cl"
                autoComplete="email"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: errors.email ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.12)',
                  color: 'white',
                  outline: 'none',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              />
              {errors.email && (
                <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.55)',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    padding: '11px 42px 11px 14px',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    border: errors.password ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.12)',
                    color: 'white',
                    outline: 'none',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  disabled={isLocked}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{
                    color: 'rgba(255,255,255,0.4)',
                    background: 'none',
                    border: 'none',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    display: 'flex',
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                  {errors.password.message}
                </p>
              )}
            </div>
              <div style={{ textAlign: 'right', marginTop: '8px' }}>
                <Link
                  to="/recuperar-contrasena"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.75rem',
                    color: 'rgba(255,255,255,0.5)',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = '#60a5fa')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')
                  }
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

            {isBlocked ? (
              <div
                style={{
                  backgroundColor: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.4)',
                  padding: '10px 14px',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.78rem',
                  color: '#fca5a5',
                }}
              >
                Cuenta bloqueada por demasiados intentos.{' '}
                <Link
                  to="/recuperar-contrasena"
                  style={{ color: '#fca5a5', textDecoration: 'underline' }}
                >
                  Restablecer contraseña
                </Link>
                .
              </div>
            ) : isTimedOut ? (
              <div
                style={{
                  backgroundColor: 'rgba(245,158,11,0.12)',
                  border: '1px solid rgba(245,158,11,0.35)',
                  padding: '10px 14px',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.78rem',
                  color: '#fcd34d',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>⏳</span>
                Demasiados intentos. Intenta de nuevo en{' '}
                <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {fmtTime(countdown)}
                </strong>
              </div>
            ) : errors.root ? (
              <div
                style={{
                  backgroundColor: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  padding: '10px 14px',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.78rem',
                  color: '#fca5a5',
                }}
              >
                {errors.root.message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLocked}
              className="w-full flex items-center justify-center gap-2"
              style={{
                padding: '12px 24px',
                backgroundColor: isLocked ? 'rgba(9,31,52,0.5)' : '#091f34',
                border: '1px solid rgba(255,255,255,0.2)',
                color: isLocked ? 'rgba(255,255,255,0.3)' : 'white',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.85rem',
                fontWeight: 500,
                marginTop: '4px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isLocked)
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1e3a5f';
              }}
              onMouseLeave={(e) => {
                if (!isLocked)
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#091f34';
              }}
            >
              <LogIn size={15} />
              <span>Ingresar al sistema</span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.3)',
                textDecoration: 'none',
              }}
            >
              ← Volver al sitio principal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
