import { useState, FormEvent } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  User,
  Building2,
  Phone,
  Mail,
  Lock,
  LogOut,
  CheckCircle,
  ChevronRight,
  FileText,
  Calendar,
  Bell,
  Edit3,
  Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';

type Tab = 'perfil' | 'seguridad' | 'servicios' | 'notificaciones';

const PLAN_LABELS: Record<string, string> = {
  asesoria: 'Plan Asesoría',
  gestion_pyme: 'Gestión PyME',
  remuneraciones: 'Remuneraciones',
  rrhh_integral: 'RRHH Integral',
};

export default function Dashboard() {
  const { user, isLoading, logout, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('perfil');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [profileForm, setProfileForm] = useState({
    nombre: user?.nombre || '',
    apellido: user?.apellido || '',
    empresa: user?.empresa || '',
    telefono: user?.telefono || '',
  });

  const [passForm, setPassForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [passSaving, setPassSaving] = useState(false);
  const handleLogout = async () => {
    await logout();
  };

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8f8f8',
        }}
      >
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            color: '#9ca3af',
            fontSize: '0.85rem',
          }}
        >
          Cargando...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const initials =
    `${user.nombre.charAt(0)}${user.apellido.charAt(0)}`.toUpperCase();
  const memberSince = new Date(user.createdAt).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
  });

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSaving(true);
    const result = await updateProfile(profileForm);
    setSaving(false);
    if (result.success) {
      setSuccessMsg('Perfil actualizado correctamente.');
      setEditMode(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setErrorMsg(result.error || 'Error al guardar.');
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');
    if (
      !passForm.currentPassword ||
      !passForm.newPassword ||
      !passForm.confirmPassword
    ) {
      setPassError('Completa todos los campos.');
      return;
    }
    if (passForm.newPassword.length < 6) {
      setPassError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (passForm.newPassword !== passForm.confirmPassword) {
      setPassError('Las contraseñas no coinciden.');
      return;
    }
    setPassSaving(true);
    const result = await changePassword(
      passForm.currentPassword,
      passForm.newPassword
    );
    setPassSaving(false);
    if (result.success) {
      setPassSuccess('Contraseña cambiada correctamente.');
      setPassForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setTimeout(() => setPassSuccess(''), 3000);
    } else {
      setPassError(result.error || 'Error al cambiar la contraseña.');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #d1d5db',
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.83rem',
    color: '#1a1a2e',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
  };

  const readOnlyStyle: React.CSSProperties = {
    ...inputStyle,
    backgroundColor: '#f9fafb',
    color: '#6b7280',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.76rem',
    color: '#4a4a5a',
    display: 'block',
    marginBottom: '5px',
    fontWeight: 500,
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'perfil', label: 'Mi perfil', icon: <User size={15} /> },
    { id: 'seguridad', label: 'Seguridad', icon: <Shield size={15} /> },
    { id: 'servicios', label: 'Mis servicios', icon: <FileText size={15} /> },
    { id: 'notificaciones', label: 'Notificaciones', icon: <Bell size={15} /> },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f9' }}>

      <div
        style={{
          backgroundColor: '#091f34',
          padding: '14px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Logo size="sm" />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.8rem',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            {user.nombre} {user.apellido}
          </span>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'rgba(255,255,255,0.85)',
              padding: '6px 14px',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.78rem',
              transition: 'all 0.2s',
            }}
          >
            <LogOut size={13} />
            Cerrar sesión
          </button>
        </div>
      </div>

      <div
        style={{ maxWidth: '960px', margin: '0 auto', padding: '36px 24px' }}
      >

        <div
          style={{
            backgroundColor: '#fff',
            padding: '28px 32px',
            marginBottom: '24px',
            boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
          }}
        >

          <div
            style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#091f34',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.4rem',
                color: '#fff',
                fontWeight: 500,
              }}
            >
              {initials}
            </span>
          </div>

          <div style={{ flex: 1 }}>
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.4rem',
                color: '#091f34',
                fontWeight: 500,
                marginBottom: '4px',
              }}
            >
              {user.nombre} {user.apellido}
            </h1>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.8rem',
                color: '#6b7280',
                marginBottom: '2px',
              }}
            >
              {user.email}
            </p>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.76rem',
                color: '#9ca3af',
              }}
            >
              {user.empresa} · Miembro desde {memberSince}
            </p>
          </div>

          {user.plan && (
            <div
              style={{
                backgroundColor: '#f0f4f8',
                padding: '8px 16px',
                borderLeft: '3px solid #091f34',
              }}
            >
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.7rem',
                  color: '#9ca3af',
                  marginBottom: '2px',
                }}
              >
                Plan activo
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.82rem',
                  color: '#091f34',
                  fontWeight: 600,
                }}
              >
                {PLAN_LABELS[user.plan] || user.plan}
              </p>
            </div>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '220px 1fr',
            gap: '20px',
          }}
        >

          <div
            style={{
              backgroundColor: '#fff',
              boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
              padding: '8px 0',
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 20px',
                  background: activeTab === tab.id ? '#f0f4f8' : 'none',
                  border: 'none',
                  borderLeft:
                    activeTab === tab.id
                      ? '3px solid #091f34'
                      : '3px solid transparent',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.82rem',
                  color: activeTab === tab.id ? '#091f34' : '#4a4a5a',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}

            <div style={{ borderTop: '1px solid #f0f0f0', margin: '8px 0' }} />

            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderLeft: '3px solid transparent',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.82rem',
                color: '#dc2626',
                textAlign: 'left',
              }}
            >
              <LogOut size={15} />
              Cerrar sesión
            </button>
          </div>

          <div
            style={{
              backgroundColor: '#fff',
              boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
              padding: '32px',
            }}
          >

            {activeTab === 'perfil' && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '28px',
                  }}
                >
                  <h2
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: '1.1rem',
                      color: '#091f34',
                      fontWeight: 500,
                    }}
                  >
                    Información personal
                  </h2>
                  {!editMode && (
                    <button
                      onClick={() => {
                        setProfileForm({
                          nombre: user.nombre,
                          apellido: user.apellido,
                          empresa: user.empresa,
                          telefono: user.telefono,
                        });
                        setEditMode(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 'transparent',
                        border: '1px solid #091f34',
                        color: '#091f34',
                        padding: '7px 16px',
                        cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.78rem',
                      }}
                    >
                      <Edit3 size={13} />
                      Editar
                    </button>
                  )}
                </div>

                {successMsg && (
                  <div
                    style={{
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      padding: '10px 14px',
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.8rem',
                      color: '#15803d',
                    }}
                  >
                    <CheckCircle size={15} />
                    {successMsg}
                  </div>
                )}

                <form
                  onSubmit={handleSaveProfile}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '14px',
                    }}
                  >
                    <div>
                      <label style={labelStyle}>
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <User size={12} /> Nombre
                        </span>
                      </label>
                      <input
                        type="text"
                        value={editMode ? profileForm.nombre : user.nombre}
                        onChange={(e) =>
                          editMode &&
                          setProfileForm((p) => ({
                            ...p,
                            nombre: e.target.value,
                          }))
                        }
                        style={editMode ? inputStyle : readOnlyStyle}
                        readOnly={!editMode}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <User size={12} /> Apellido
                        </span>
                      </label>
                      <input
                        type="text"
                        value={editMode ? profileForm.apellido : user.apellido}
                        onChange={(e) =>
                          editMode &&
                          setProfileForm((p) => ({
                            ...p,
                            apellido: e.target.value,
                          }))
                        }
                        style={editMode ? inputStyle : readOnlyStyle}
                        readOnly={!editMode}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <Mail size={12} /> Correo electrónico
                      </span>
                    </label>
                    <input
                      type="email"
                      value={user.email}
                      style={readOnlyStyle}
                      readOnly
                    />
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.7rem',
                        color: '#9ca3af',
                        marginTop: '4px',
                      }}
                    >
                      El correo no puede modificarse
                    </p>
                  </div>

                  <div>
                    <label style={labelStyle}>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <Building2 size={12} /> Empresa / Razón social
                      </span>
                    </label>
                    <input
                      type="text"
                      value={editMode ? profileForm.empresa : user.empresa}
                      onChange={(e) =>
                        editMode &&
                        setProfileForm((p) => ({
                          ...p,
                          empresa: e.target.value,
                        }))
                      }
                      style={editMode ? inputStyle : readOnlyStyle}
                      readOnly={!editMode}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <Phone size={12} /> Teléfono
                      </span>
                    </label>
                    <input
                      type="tel"
                      value={
                        editMode
                          ? profileForm.telefono
                          : user.telefono || 'No indicado'
                      }
                      onChange={(e) =>
                        editMode &&
                        setProfileForm((p) => ({
                          ...p,
                          telefono: e.target.value,
                        }))
                      }
                      style={editMode ? inputStyle : readOnlyStyle}
                      readOnly={!editMode}
                    />
                  </div>

                  {errorMsg && (
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
                      {errorMsg}
                    </div>
                  )}

                  {editMode && (
                    <div
                      style={{ display: 'flex', gap: '10px', marginTop: '4px' }}
                    >
                      <button
                        type="submit"
                        disabled={saving}
                        style={{
                          backgroundColor: '#091f34',
                          color: '#fff',
                          padding: '9px 24px',
                          border: 'none',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.82rem',
                          fontWeight: 500,
                          opacity: saving ? 0.7 : 1,
                        }}
                      >
                        {saving ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditMode(false);
                          setErrorMsg('');
                        }}
                        style={{
                          backgroundColor: 'transparent',
                          color: '#6b7280',
                          padding: '9px 20px',
                          border: '1px solid #d1d5db',
                          cursor: 'pointer',
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.82rem',
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {activeTab === 'seguridad' && (
              <div>
                <h2
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '1.1rem',
                    color: '#091f34',
                    fontWeight: 500,
                    marginBottom: '28px',
                  }}
                >
                  Seguridad de la cuenta
                </h2>

                {passSuccess && (
                  <div
                    style={{
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      padding: '10px 14px',
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.8rem',
                      color: '#15803d',
                    }}
                  >
                    <CheckCircle size={15} />
                    {passSuccess}
                  </div>
                )}

                <div
                  style={{
                    backgroundColor: '#f9fafb',
                    border: '1px solid #f0f0f0',
                    padding: '16px 20px',
                    marginBottom: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <Lock size={18} color="#091f34" />
                  <div>
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.82rem',
                        color: '#1a1a2e',
                        fontWeight: 500,
                        marginBottom: '2px',
                      }}
                    >
                      Cambiar contraseña
                    </p>
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.76rem',
                        color: '#9ca3af',
                      }}
                    >
                      Elige una contraseña segura de al menos 6 caracteres
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleChangePassword}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    maxWidth: '400px',
                  }}
                >
                  <div>
                    <label style={labelStyle} htmlFor="current-pass">
                      Contraseña actual
                    </label>
                    <input
                      id="current-pass"
                      type="password"
                      value={passForm.currentPassword}
                      onChange={(e) =>
                        setPassForm((p) => ({
                          ...p,
                          currentPassword: e.target.value,
                        }))
                      }
                      placeholder="••••••••"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="new-pass">
                      Nueva contraseña
                    </label>
                    <input
                      id="new-pass"
                      type="password"
                      value={passForm.newPassword}
                      onChange={(e) =>
                        setPassForm((p) => ({
                          ...p,
                          newPassword: e.target.value,
                        }))
                      }
                      placeholder="Mínimo 6 caracteres"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="confirm-pass">
                      Confirmar nueva contraseña
                    </label>
                    <input
                      id="confirm-pass"
                      type="password"
                      value={passForm.confirmPassword}
                      onChange={(e) =>
                        setPassForm((p) => ({
                          ...p,
                          confirmPassword: e.target.value,
                        }))
                      }
                      placeholder="••••••••"
                      style={inputStyle}
                    />
                  </div>

                  {passError && (
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
                      {passError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={passSaving}
                    style={{
                      backgroundColor: '#091f34',
                      color: '#fff',
                      padding: '9px 24px',
                      border: 'none',
                      cursor: passSaving ? 'not-allowed' : 'pointer',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      opacity: passSaving ? 0.7 : 1,
                      alignSelf: 'flex-start',
                    }}
                  >
                    {passSaving ? 'Guardando...' : 'Cambiar contraseña'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'servicios' && (
              <div>
                <h2
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '1.1rem',
                    color: '#091f34',
                    fontWeight: 500,
                    marginBottom: '8px',
                  }}
                >
                  Mis servicios
                </h2>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.8rem',
                    color: '#9ca3af',
                    marginBottom: '28px',
                  }}
                >
                  Aquí podrás ver los servicios contratados y su estado.
                </p>

                {user.plan ? (
                  <>
                    <div
                      style={{
                        border: '1px solid #e5e7eb',
                        padding: '20px 24px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                        }}
                      >
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: '#091f34',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <FileText size={18} color="#fff" />
                        </div>
                        <div>
                          <p
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: '0.85rem',
                              color: '#1a1a2e',
                              fontWeight: 600,
                              marginBottom: '3px',
                            }}
                          >
                            {PLAN_LABELS[user.plan] || user.plan}
                          </p>
                          <p
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: '0.76rem',
                              color: '#9ca3af',
                            }}
                          >
                            Plan activo · Miembro desde {memberSince}
                          </p>
                        </div>
                      </div>
                      <span
                        style={{
                          backgroundColor: '#f0fdf4',
                          color: '#15803d',
                          padding: '4px 12px',
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          border: '1px solid #bbf7d0',
                        }}
                      >
                        Activo
                      </span>
                    </div>

                    <div
                      style={{
                        backgroundColor: '#f9fafb',
                        border: '1px solid #f0f0f0',
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <Calendar size={16} color="#6b7280" />
                        <p
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '0.8rem',
                            color: '#6b7280',
                          }}
                        >
                          ¿Necesitas cambiar tu plan?
                        </p>
                      </div>
                      <Link
                        to="/planes"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.78rem',
                          color: '#091f34',
                          textDecoration: 'underline',
                        }}
                      >
                        Ver planes <ChevronRight size={13} />
                      </Link>
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '48px 24px',
                      border: '1px dashed #d1d5db',
                    }}
                  >
                    <FileText
                      size={36}
                      color="#d1d5db"
                      style={{ margin: '0 auto 16px' }}
                    />
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.85rem',
                        color: '#9ca3af',
                        marginBottom: '20px',
                      }}
                    >
                      Aún no tienes ningún servicio activo.
                    </p>
                    <Link
                      to="/planes"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#091f34',
                        color: '#fff',
                        padding: '9px 24px',
                        textDecoration: 'none',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.82rem',
                        fontWeight: 500,
                      }}
                    >
                      Ver planes disponibles <ChevronRight size={14} />
                    </Link>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notificaciones' && (
              <div>
                <h2
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '1.1rem',
                    color: '#091f34',
                    fontWeight: 500,
                    marginBottom: '28px',
                  }}
                >
                  Preferencias de notificaciones
                </h2>

                {[
                  {
                    label: 'Novedades y actualizaciones de SotLoy',
                    desc: 'Recibe información sobre nuevos servicios y contenido.',
                    default: true,
                  },
                  {
                    label: 'Recordatorios de documentación',
                    desc: 'Alertas sobre vencimientos y documentos pendientes.',
                    default: true,
                  },
                  {
                    label: 'Confirmaciones de reuniones',
                    desc: 'Correos de confirmación cuando agendes reuniones.',
                    default: true,
                  },
                  {
                    label: 'Ofertas y promociones',
                    desc: 'Información sobre descuentos y planes especiales.',
                    default: false,
                  },
                ].map((item, i) => (
                  <NotifToggle
                    key={i}
                    label={item.label}
                    desc={item.desc}
                    defaultChecked={item.default}
                  />
                ))}

                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.75rem',
                    color: '#9ca3af',
                    marginTop: '24px',
                  }}
                >
                  * Las preferencias se guardan localmente en tu dispositivo.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NotifToggle({
  label,
  desc,
  defaultChecked,
}: {
  label: string;
  desc: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 0',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <div>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.82rem',
            color: '#1a1a2e',
            fontWeight: 500,
            marginBottom: '3px',
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.75rem',
            color: '#9ca3af',
          }}
        >
          {desc}
        </p>
      </div>
      <button
        onClick={() => setChecked(!checked)}
        style={{
          width: '44px',
          height: '24px',
          backgroundColor: checked ? '#091f34' : '#d1d5db',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background-color 0.2s',
          flexShrink: 0,
          marginLeft: '16px',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '3px',
            left: checked ? '23px' : '3px',
            width: '18px',
            height: '18px',
            backgroundColor: '#fff',
            borderRadius: '50%',
            transition: 'left 0.2s',
          }}
        />
      </button>
    </div>
  );
}
