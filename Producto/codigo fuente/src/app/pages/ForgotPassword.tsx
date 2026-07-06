import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { Logo } from '../components/Logo';
import { getSupabase } from '../context/AuthContext';
import { Toaster, toast } from 'sonner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Por favor ingresa tu correo electrónico.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor ingresa un correo electrónico válido.');
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabase();

      const { error: resetError } = await supabase.functions.invoke(
        'reset-password',
        { body: { email } }
      );

      if (resetError) {
        console.error('Error enviando recuperación:', resetError);
        setError('Hubo un problema al enviar el correo. Intenta nuevamente.');
        toast.error('Error al enviar el correo de recuperación');
      } else {
        setSent(true);
        toast.success('Correo de recuperación enviado exitosamente');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error de conexión. Verifica tu internet e intenta nuevamente.');
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.85rem',
    color: '#1a1a2e',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8f8f8',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 16px',
      }}
    >
      <Toaster richColors closeButton position="top-right" />
      <div
        style={{
          backgroundColor: '#fff',
          width: '100%',
          maxWidth: '420px',
          padding: '48px 40px',
          boxShadow: '0 2px 20px rgba(0,0,0,0.07)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '32px',
          }}
        >
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Logo size="sm" variant="transparent" />
          </Link>
        </div>

        {!sent ? (
          <>
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.5rem',
                color: '#091f34',
                textAlign: 'center',
                marginBottom: '8px',
                fontWeight: 500,
              }}
            >
              Recuperar contraseña
            </h1>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.8rem',
                color: '#6b7280',
                textAlign: 'center',
                marginBottom: '32px',
                lineHeight: 1.6,
              }}
            >
              Ingresa tu correo electrónico y te enviaremos las instrucciones
              para restablecer tu contraseña.
            </p>

            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
            >
              <div>
                <label
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.78rem',
                    color: '#4a4a5a',
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 500,
                  }}
                  htmlFor="recover-email"
                >
                  Correo electrónico
                </label>
                <input
                  id="recover-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.cl"
                  style={inputStyle}
                  autoComplete="email"
                />
              </div>

              {error && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    padding: '10px 14px',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.8rem',
                    color: '#dc2626',
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: '#091f34',
                  color: '#fff',
                  padding: '11px 24px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  opacity: loading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                }}
              >
                {loading ? (
                  <span>Enviando...</span>
                ) : (
                  <>
                    <Mail size={15} />
                    <span>Enviar instrucciones</span>
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                backgroundColor: '#f0f4f8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <Mail size={24} color="#091f34" />
            </div>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.3rem',
                color: '#091f34',
                marginBottom: '12px',
                fontWeight: 500,
              }}
            >
              Correo enviado
            </h2>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.82rem',
                color: '#6b7280',
                lineHeight: 1.7,
                marginBottom: '28px',
              }}
            >
              Si el correo <strong>{email}</strong> está registrado, recibirás
              las instrucciones en los próximos minutos. Revisa también tu
              carpeta de spam.
            </p>
            <Link
              to="/conecta/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.82rem',
                color: '#091f34',
                textDecoration: 'underline',
              }}
            >
              <ArrowLeft size={14} />
              Volver al inicio de sesión
            </Link>
          </div>
        )}

        <div
          style={{
            marginTop: '28px',
            paddingTop: '24px',
            borderTop: '1px solid #f0f0f0',
            textAlign: 'center',
          }}
        >
          <Link
            to="/conecta/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.78rem',
              color: '#9ca3af',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={13} />
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
