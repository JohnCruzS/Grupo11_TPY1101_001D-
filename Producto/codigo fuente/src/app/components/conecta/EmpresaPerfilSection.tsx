import { useState, useEffect } from 'react';
import { Mail, Phone, Save, X, Loader2, Lock, ShieldCheck, Building2 } from 'lucide-react';
import { getSupabase } from '../../context/AuthContext';
import { toast } from 'sonner';

interface Props {
  user: any;
}

interface EnterpriseData {
  id: string;
  nombre: string;
  rut: string;
  email: string;
  telefono: string;
  plan: string;
}

export function EmpresaPerfilSection({ user }: Props) {
  const supabase = getSupabase();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enterprise, setEnterprise] = useState<EnterpriseData | null>(null);
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let empresaId = user.empresaId;
        if (!empresaId && user.email) {
          const { data } = await supabase
            .from('enterprises')
            .select('id')
            .eq('email', user.email)
            .maybeSingle();
          empresaId = data?.id;
        }
        if (!empresaId) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('enterprises')
          .select('id, name, rut, email, plan')
          .eq('id', empresaId)
          .single();
        if (error) throw error;

        let telefonoVal = '';
        try {
          const { data: tel } = await supabase
            .from('enterprises')
            .select('telefono')
            .eq('id', empresaId)
            .single();
          telefonoVal = (tel as { telefono?: string } | null)?.telefono || '';
        } catch {

        }

        const ent: EnterpriseData = {
          id: data.id,
          nombre: data.name || '',
          rut: data.rut || '',
          email: data.email || '',
          telefono: telefonoVal,
          plan: data.plan || '',
        };
        setEnterprise(ent);
        setEmail(ent.email);
        setTelefono(ent.telefono);
      } catch (err) {
        console.error('Error cargando perfil de empresa:', err);
        toast.error('Error al cargar datos de la empresa');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.empresaId, user.email]);

  const emailChanged = !!enterprise && email.trim() !== enterprise.email;
  const phoneChanged = !!enterprise && telefono.trim() !== (enterprise.telefono || '');
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const persist = async (opts: { withEmail: boolean }) => {
    if (!enterprise) return;
    setSaving(true);
    try {

      if (opts.withEmail) {
        const { error } = await supabase
          .from('enterprises')
          .update({ email: email.trim() })
          .eq('id', enterprise.id);
        if (error) throw error;
      }

      try {
        await supabase
          .from('enterprises')
          .update({ telefono: telefono.trim() || null })
          .eq('id', enterprise.id);
      } catch {

      }

      if (opts.withEmail) {
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              to: email.trim(),
              subject: 'Confirmación de email de contacto — SotLoy Conecta',
              html: `<div style="font-family:'Inter',sans-serif;max-width:520px;margin:0 auto;padding:24px;">
                <h2 style="color:#091f34;">Email de contacto actualizado</h2>
                <p style="color:#475569;font-size:14px;line-height:1.6;">
                  Confirmamos que el email de contacto de <strong>${enterprise.nombre}</strong> en
                  SotLoy Conecta ahora es <strong>${email.trim()}</strong>.
                </p>
                <p style="color:#94a3b8;font-size:12px;">Si no solicitaste este cambio, contacta a soporte@sotloy.cl de inmediato.</p>
              </div>`,
            },
          });
        } catch (e) {
          console.warn('No se pudo enviar el correo de confirmación:', e);
        }
      }

      setEnterprise((prev) =>
        prev
          ? { ...prev, email: opts.withEmail ? email.trim() : prev.email, telefono: telefono.trim() }
          : null
      );
      toast.success(
        opts.withEmail
          ? 'Datos actualizados. Enviamos una confirmación al nuevo email.'
          : 'Teléfono actualizado correctamente'
      );
    } catch (err) {
      console.error('Error guardando perfil:', err);
      toast.error('Error al guardar los cambios');
    } finally {
      setSaving(false);
      setShowEmailConfirm(false);
    }
  };

  const handleSave = () => {
    if (emailChanged && !isValidEmail) {
      toast.error('Ingresa un email válido');
      return;
    }
    if (emailChanged) {
      setShowEmailConfirm(true);
    } else if (phoneChanged) {
      void persist({ withEmail: false });
    }
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.8rem',
    color: '#374151',
    display: 'block',
    marginBottom: '6px',
    fontWeight: 500,
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-48">
        <Loader2 size={20} className="animate-spin" style={{ color: '#9ca3af' }} />
      </div>
    );
  }

  if (!enterprise) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 text-center">
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#9ca3af' }}>
            No se encontró información de empresa asociada a este usuario.
          </p>
        </div>
      </div>
    );
  }

  const hasChanges = emailChanged || phoneChanged;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3" style={{ background: 'linear-gradient(135deg,#f8fafc,#eef2f7)' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#091f3410' }}>
            <Building2 size={20} style={{ color: '#091f34' }} />
          </div>
          <div>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.05rem', color: '#091f34', fontWeight: 600 }}>
              Perfil de la Empresa
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: '#64748b' }}>
              {enterprise.nombre}
              {enterprise.plan ? ` · Plan ${enterprise.plan}` : ''}
            </p>
          </div>
        </div>

        <div className="p-6">

          <div className="mb-5">
            <div className="flex items-center gap-1.5 mb-3">
              <Lock size={13} style={{ color: '#94a3b8' }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Datos legales (no editables)
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label style={labelStyle}>Razón Social</label>
                <div style={{ padding: '9px 12px', background: '#f1f5f9', borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#475569' }}>
                  {enterprise.nombre || '—'}
                </div>
              </div>
              <div>
                <label style={labelStyle}>RUT</label>
                <div style={{ padding: '9px 12px', background: '#f1f5f9', borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#475569' }}>
                  {enterprise.rut || '—'}
                </div>
              </div>
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: '#94a3b8', marginTop: 8 }}>
              La razón social y el RUT solo pueden modificarse por SotLoy mediante verificación. Contacta a soporte si necesitas corregirlos.
            </p>
          </div>

          <div className="pt-5 border-t border-gray-100">
            <div className="flex items-center gap-1.5 mb-3">
              <ShieldCheck size={13} style={{ color: '#3b82f6' }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Datos de contacto
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label style={labelStyle}>Email de Contacto</label>
                <div className="relative">
                  <Mail size={15} className="absolute" style={{ left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contacto@empresa.cl"
                    style={{ width: '100%', padding: '9px 12px 9px 34px', border: `1px solid ${emailChanged && !isValidEmail ? '#fca5a5' : '#d1d5db'}`, borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#1a1a2e', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                {emailChanged && (
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: '#d97706', marginTop: 4 }}>
                    Requiere confirmación. Enviaremos un aviso a la nueva dirección.
                  </p>
                )}
              </div>
              <div>
                <label style={labelStyle}>Teléfono de Contacto</label>
                <div className="relative">
                  <Phone size={15} className="absolute" style={{ left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+56 9 1234 5678"
                    style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid #d1d5db', borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#1a1a2e', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>
                  Se guarda sin confirmación.
                </p>
              </div>
            </div>
          </div>

          {hasChanges && (
            <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-gray-100">
              <button
                onClick={() => {
                  setEmail(enterprise.email);
                  setTelefono(enterprise.telefono);
                }}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm"
                style={{ border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#374151', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', opacity: saving ? 0.6 : 1 }}
              >
                <X size={14} />
                Descartar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm text-white"
                style={{ backgroundColor: '#091f34', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', fontWeight: 500, opacity: saving ? 0.7 : 1 }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          )}
        </div>
      </div>

      {showEmailConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#fffbeb' }}>
                <Mail size={20} style={{ color: '#d97706' }} />
              </div>
              <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: '1rem', color: '#091f34', fontWeight: 600 }}>
                Confirmar cambio de email
              </h3>
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#475569', lineHeight: 1.6, marginBottom: 8 }}>
              Vas a cambiar el email de contacto de la empresa a:
            </p>
            <div style={{ padding: '10px 14px', background: '#f1f5f9', borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#091f34', fontWeight: 600, marginBottom: 16 }}>
              {email.trim()}
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: '#94a3b8', marginBottom: 20 }}>
              Enviaremos un correo de confirmación a esa dirección. Este será el email para todas las comunicaciones y la facturación.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEmailConfirm(false)}
                disabled={saving}
                className="px-4 py-2 rounded-md text-sm"
                style={{ border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#374151', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: '0.82rem' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => void persist({ withEmail: true })}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm text-white"
                style={{ backgroundColor: '#091f34', border: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', fontWeight: 500 }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                Confirmar cambio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
