import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { getSupabase } from '../context/AuthContext';
import { Toaster, toast } from 'sonner';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const passwordValid = hasMinLength && hasUppercase && hasSpecial;
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [linkValid, setLinkValid] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const supabase = getSupabase();

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token');
      const type = searchParams.get('type');
      const hash = window.location.hash;

      if (hash && hash.includes('type=recovery')) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setLinkValid(true);
          setVerifying(false);
          return;
        }
      }

      if (!token || type !== 'recovery') {
        setLinkValid(false);
        setVerifying(false);
        toast.error('Link de recuperación inválido o expirado');
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'recovery',
      });

      if (error) {
        setLinkValid(false);
        toast.error('El link de recuperación es inválido o ya expiró');
      } else {
        setLinkValid(true);
      }
      setVerifying(false);
    };

    verifyToken();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!passwordValid) {
      setFormError('La contraseña no cumple los requisitos de seguridad');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setFormError('Error al cambiar contraseña. Intenta solicitar un nuevo enlace.');
        toast.error('Error al cambiar contraseña. Intenta solicitar un nuevo enlace.');
      } else {

        await supabase.auth.signOut();

        setSuccess(true);
        toast.success('Contraseña actualizada. Inicia sesión con tu nueva contraseña.');

        setTimeout(() => {
          navigate('/conecta/login');
        }, 2000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado';
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <Toaster richColors closeButton position="top-right" />
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-[#0ea5e9] mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-bold text-[#0f172a] mb-2">
            Verificando link de recuperación...
          </h2>
          <p className="text-gray-600 text-sm">Esto tomará solo un momento.</p>
        </div>
      </div>
    );
  }

  if (!linkValid) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <Toaster richColors closeButton position="top-right" />
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#0f172a] mb-2">
            Link inválido o expirado
          </h2>
          <p className="text-gray-600 mb-6">
            Este link de recuperación ya no es válido. Solicita uno nuevo para
            continuar.
          </p>
          <Link
            to="/recuperar-contrasena"
            className="inline-block w-full bg-[#0f172a] text-white py-3 rounded-lg font-medium hover:bg-[#1e293b] transition-colors"
          >
            Solicitar nuevo link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <Toaster richColors closeButton position="top-right" />
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#0f172a] mb-2">
            ¡Contraseña actualizada!
          </h2>
          <p className="text-gray-600 mb-4">
            Tu contraseña ha sido cambiada exitosamente.
          </p>
          <p className="text-sm text-gray-500">
            Serás redirigido al inicio de sesión...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <Toaster richColors closeButton position="top-right" />
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#0ea5e9] rounded-xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#0f172a]">
            Cambiar contraseña
          </h1>
          <p className="text-gray-600 mt-2">Ingresa tu nueva contraseña</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
                placeholder="Mínimo 8 caracteres"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {password.length > 0 && (
              <ul className="mt-2 space-y-1">
                {[
                  { ok: hasMinLength, label: 'Mínimo 8 caracteres' },
                  { ok: hasUppercase, label: 'Una letra mayúscula' },
                  { ok: hasSpecial, label: 'Un carácter especial (!@#$...)' },
                ].map(({ ok, label }) => (
                  <li
                    key={label}
                    className="flex items-center gap-1.5 text-xs transition-colors"
                    style={{ color: ok ? '#16a34a' : '#9ca3af' }}
                  >
                    <span style={{ fontSize: '0.9rem' }}>{ok ? '✓' : '○'}</span>
                    {label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
                placeholder="Repite la contraseña"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {confirmPassword.length > 0 && (
              <p
                className="mt-1 text-xs"
                style={{
                  color:
                    confirmPassword === password ? '#16a34a' : '#ef4444',
                }}
              >
                {confirmPassword === password
                  ? '✓ Las contraseñas coinciden'
                  : '○ Las contraseñas no coinciden'}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0f172a] text-white py-3 rounded-lg font-medium hover:bg-[#1e293b] transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
