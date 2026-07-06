import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  User,
  Mail,
  Building2,
  Phone,
  Shield,
  Save,
  CheckCircle,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LoadingScreen } from '../../components/conecta/LoadingScreen';
import { Toaster, toast } from 'sonner';

export default function PerfilPage() {
  const { user, isLoading, updateProfile, changePassword } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: user?.nombre || '',
    apellido: user?.apellido || '',
    email: user?.email || '',
    telefono: user?.telefono || '',
    empresa: user?.empresa || '',
  });

  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const pwHasMinLength = passwordData.new.length >= 8;
  const pwHasUppercase = /[A-Z]/.test(passwordData.new);
  const pwHasSpecial = /[^a-zA-Z0-9]/.test(passwordData.new);
  const passwordValid = pwHasMinLength && pwHasUppercase && pwHasSpecial;

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/conecta/login" replace />;
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const result = await updateProfile({
      nombre: formData.nombre,
      apellido: formData.apellido,
      telefono: formData.telefono,
    });

    if (result.success) {
      toast.success('Perfil actualizado correctamente');
    } else {
      toast.error(result.error || 'Error al actualizar perfil');
    }

    setIsSaving(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.new !== passwordData.confirm) {
      toast.error('Las contraseñas nuevas no coinciden');
      return;
    }

    if (!passwordValid) {
      toast.error('La contraseña no cumple los requisitos de seguridad');
      return;
    }

    setIsChangingPassword(true);

    const result = await changePassword(passwordData.current, passwordData.new);

    if (result.success) {
      toast.success('Contraseña actualizada correctamente');
      setPasswordData({ current: '', new: '', confirm: '' });
      setShowPasswordSection(false);
    } else {
      toast.error(result.error || 'Error al cambiar contraseña');
    }

    setIsChangingPassword(false);
  };

  const userRole = user?.rol || user?.role || 'usuario';

  const roleLabels: Record<
    string,
    { label: string; color: string; bg: string }
  > = {
    usuario: { label: 'Usuario', color: '#3b82f6', bg: '#eff6ff' },
    empresa: { label: 'Empresa', color: '#15803d', bg: '#f0fdf4' },
    admin: { label: 'Administrador', color: '#d97706', bg: '#fffbeb' },
    superadmin: {
      label: 'Super Administrador',
      color: '#7c3aed',
      bg: '#faf5ff',
    },
  };

  const roleInfo = roleLabels[userRole] || roleLabels.usuario;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px' }}>
      <Toaster richColors closeButton position="top-right" />

      <div
        style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '24px' }}
      >
        <button
          onClick={() => navigate('/conecta/dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: '0.875rem',
            marginBottom: '16px',
          }}
        >
          <ArrowLeft size={16} />
          Volver al Dashboard
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: 600,
            }}
          >
            {user?.nombre?.[0]}
            {user?.apellido?.[0]}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>
              Mi Perfil
            </h1>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '4px',
              }}
            >
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: roleInfo.bg,
                  color: roleInfo.color,
                }}
              >
                {roleInfo.label}
              </span>
              <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                {user?.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'grid',
          gap: '24px',
        }}
      >

        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={20} color="#3b82f6" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.125rem', color: '#1e293b' }}>
                Información Personal
              </h2>
              <p
                style={{
                  margin: '4px 0 0 0',
                  color: '#64748b',
                  fontSize: '0.875rem',
                }}
              >
                Actualiza tus datos de contacto
              </p>
            </div>
          </div>

          <form onSubmit={handleProfileUpdate}>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#374151',
                    }}
                  >
                    Nombre
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User
                      size={16}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9ca3af',
                      }}
                    />
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) =>
                        setFormData({ ...formData, nombre: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                      }}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#374151',
                    }}
                  >
                    Apellido
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User
                      size={16}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9ca3af',
                      }}
                    />
                    <input
                      type="text"
                      value={formData.apellido}
                      onChange={(e) =>
                        setFormData({ ...formData, apellido: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                      }}
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#374151',
                  }}
                >
                  Correo Electrónico
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af',
                    }}
                  />
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      background: '#f9fafb',
                      color: '#6b7280',
                    }}
                  />
                </div>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                  }}
                >
                  El correo no puede ser modificado. Contacta a soporte si
                  necesitas cambiarlo.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#374151',
                    }}
                  >
                    Teléfono
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone
                      size={16}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9ca3af',
                      }}
                    />
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) =>
                        setFormData({ ...formData, telefono: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#374151',
                    }}
                  >
                    Empresa
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Building2
                      size={16}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9ca3af',
                      }}
                    />
                    <input
                      type="text"
                      value={formData.empresa}
                      disabled
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        background: '#f9fafb',
                        color: '#6b7280',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: '20px',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="submit"
                disabled={isSaving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                <Save size={16} />
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>

        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lock size={20} color="#d97706" />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '1.125rem', color: '#1e293b' }}>
                Seguridad
              </h2>
              <p
                style={{
                  margin: '4px 0 0 0',
                  color: '#64748b',
                  fontSize: '0.875rem',
                }}
              >
                Cambia tu contraseña regularmente para mayor seguridad
              </p>
            </div>
            <button
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              style={{
                padding: '8px 16px',
                background: showPasswordSection ? '#e5e7eb' : '#f3f4f6',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                cursor: 'pointer',
                color: '#374151',
              }}
            >
              {showPasswordSection ? 'Cancelar' : 'Cambiar Contraseña'}
            </button>
          </div>

          {showPasswordSection && (
            <form onSubmit={handlePasswordChange}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#374151',
                    }}
                  >
                    Contraseña Actual
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      value={passwordData.current}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, current: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: '10px 40px 10px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box',
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#9ca3af',
                        display: 'flex',
                      }}
                    >
                      {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#374151',
                    }}
                  >
                    Nueva Contraseña
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={passwordData.new}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, new: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: '10px 40px 10px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box',
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#9ca3af',
                        display: 'flex',
                      }}
                    >
                      {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {passwordData.new.length > 0 && (
                    <ul style={{ margin: '6px 0 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {[
                        { ok: pwHasMinLength, label: 'Mínimo 8 caracteres' },
                        { ok: pwHasUppercase, label: 'Una letra mayúscula' },
                        { ok: pwHasSpecial, label: 'Un carácter especial (!@#$...)' },
                      ].map(({ ok, label }) => (
                        <li
                          key={label}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.75rem',
                            color: ok ? '#16a34a' : '#9ca3af',
                            transition: 'color 0.2s',
                          }}
                        >
                          <span>{ok ? '✓' : '○'}</span>
                          {label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#374151',
                    }}
                  >
                    Confirmar Nueva Contraseña
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      value={passwordData.confirm}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirm: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: '10px 40px 10px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box',
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#9ca3af',
                        display: 'flex',
                      }}
                    >
                      {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordData.confirm.length > 0 && (
                    <p
                      style={{
                        margin: '4px 0 0 0',
                        fontSize: '0.75rem',
                        color: passwordData.confirm === passwordData.new ? '#16a34a' : '#ef4444',
                      }}
                    >
                      {passwordData.confirm === passwordData.new
                        ? '✓ Las contraseñas coinciden'
                        : '○ Las contraseñas no coinciden'}
                    </p>
                  )}
                </div>
              </div>

              <div
                style={{
                  marginTop: '20px',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowPasswordSection(false)}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    color: '#374151',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    background: '#d97706',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: isChangingPassword ? 'not-allowed' : 'pointer',
                    opacity: isChangingPassword ? 0.7 : 1,
                  }}
                >
                  <CheckCircle size={16} />
                  {isChangingPassword
                    ? 'Actualizando...'
                    : 'Actualizar Contraseña'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div
          style={{
            background: '#f0fdf4',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <Shield size={20} color="#15803d" style={{ marginTop: '2px' }} />
          <div>
            <h3
              style={{
                margin: '0 0 4px 0',
                fontSize: '1rem',
                color: '#166534',
              }}
            >
              Tu información está protegida
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#166534' }}>
              SotLoy Conecta utiliza encriptación AES-256 para proteger tus
              documentos y cumple con los estándares de seguridad ISO/IEC 27001.
              Todas las acciones en el sistema se registran en un audit log
              inmutable con hash SHA-256 para garantizar trazabilidad forense.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
