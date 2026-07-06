import { useEffect, useState } from 'react';
import {
  Loader2,
  Save,
  Bell,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  CalendarClock,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase, useAuth } from '../../context/AuthContext';
import { AVISOS_KEY, readSetting, writeSetting, type Aviso } from '../../utils/siteSettings';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400';

interface Target {
  id: string;
  label: string;
}

function genId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    return crypto.randomUUID();
  return `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isExpired(aviso: Aviso): boolean {
  if (!aviso.expiresAt) return false;
  return new Date(aviso.expiresAt) < new Date();
}

export function AvisosManager() {
  const supabase = getSupabase();
  const auth = useAuth();
  const authorName = auth.user
    ? `${auth.user.nombre} ${auth.user.apellido}`.trim()
    : '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [empresas, setEmpresas] = useState<Target[]>([]);
  const [trabajadores, setTrabajadores] = useState<Target[]>([]);

  useEffect(() => {
    (async () => {
      const [avisosData, entRes, profRes] = await Promise.all([
        readSetting<Aviso[]>(AVISOS_KEY),
        supabase.from('enterprises').select('id, name'),
        supabase
          .from('kv_store_7d36b31f')
          .select('key, value')
          .like('key', 'slc_user:%'),
      ]);
      setAvisos(Array.isArray(avisosData) ? avisosData : []);
      setEmpresas(
        (entRes.data || []).map((e: { id: string; name: string }) => ({
          id: e.id,
          label: e.name || e.id,
        }))
      );
      setTrabajadores(
        (profRes.data || [])
          .map((p: { key: string; value: Record<string, unknown> }) => {
            const v = (p.value || {}) as Record<string, unknown>;
            return {
              id: p.key.replace('slc_user:', ''),
              label:
                `${v.nombre || ''} ${v.apellido || ''}`.trim() ||
                (v.email as string) ||
                p.key,
              rol: (v.rol || v.role) as string,
            };
          })
          .filter((t) => t.rol === 'usuario')
          .map(({ id, label }) => ({ id, label }))
      );
      setLoading(false);
    })();

  }, []);

  const update = (id: string, patch: Partial<Aviso>) =>
    setAvisos((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const toggleTarget = (id: string, targetId: string) =>
    setAvisos((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const has = a.targetIds.includes(targetId);
        return {
          ...a,
          targetIds: has
            ? a.targetIds.filter((t) => t !== targetId)
            : [...a.targetIds, targetId],
        };
      })
    );

  const addAviso = () =>
    setAvisos((prev) => [
      {
        id: genId(),
        titulo: '',
        texto: '',
        enabled: true,
        scope: 'all',
        targetIds: [],
        createdAt: new Date().toISOString(),
        createdBy: authorName,
        expiresAt: '',
      },
      ...prev,
    ]);

  const removeAviso = (id: string) =>
    setAvisos((prev) => prev.filter((a) => a.id !== id));

  const save = async () => {

    const vigentes = avisos.filter((a) => !isExpired(a));
    const removed = avisos.length - vigentes.length;
    setSaving(true);
    const res = await writeSetting(AVISOS_KEY, vigentes);
    setSaving(false);
    if (res.ok) {
      setAvisos(vigentes);
      toast.success(
        removed > 0
          ? `Avisos guardados (${removed} expirado${removed > 1 ? 's' : ''} eliminado${removed > 1 ? 's' : ''})`
          : 'Avisos guardados'
      );
    } else toast.error(res.error || 'No se pudo guardar');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e9ecef' }}>
      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Avisos segmentados</h3>
        </div>
        <button
          onClick={addAviso}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200"
        >
          <Plus size={15} /> Nuevo aviso
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Publica avisos dirigidos a todos, a ciertas empresas o a ciertos
        trabajadores. Se muestran en su inicio. Los avisos con fecha de expiración
        se eliminan al guardar.
      </p>

      {avisos.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">
          No hay avisos. Crea uno con "Nuevo aviso".
        </p>
      ) : (
        <div className="space-y-4">
          {avisos.map((a) => {
            const expired = isExpired(a);
            return (
              <div
                key={a.id}
                className="border rounded-lg p-3 space-y-2"
                style={{ borderColor: expired ? '#fca5a5' : '#e5e7eb', backgroundColor: expired ? '#fff5f5' : 'white' }}
              >

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => update(a.id, { enabled: !a.enabled })}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                        a.enabled
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}
                    >
                      {a.enabled ? <Eye size={13} /> : <EyeOff size={13} />}
                      {a.enabled ? 'Visible' : 'Oculto'}
                    </button>
                    {expired && (
                      <span className="text-xs text-red-500 font-medium">Expirado</span>
                    )}
                  </div>
                  <button
                    onClick={() => removeAviso(a.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    title="Eliminar aviso"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <input
                  className={inputCls}
                  value={a.titulo}
                  onChange={(e) => update(a.id, { titulo: e.target.value })}
                  placeholder="Título del aviso"
                />
                <textarea
                  className={inputCls}
                  rows={2}
                  value={a.texto}
                  onChange={(e) => update(a.id, { texto: e.target.value })}
                  placeholder="Mensaje"
                />

                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-sm text-gray-600">Dirigido a:</label>
                  <select
                    value={a.scope}
                    onChange={(e) =>
                      update(a.id, {
                        scope: e.target.value as Aviso['scope'],
                        targetIds: [],
                      })
                    }
                    className="px-2 py-1.5 rounded-lg border border-gray-300 text-sm"
                  >
                    <option value="all">Todos</option>
                    <option value="empresas">Empresas específicas</option>
                    <option value="trabajadores">Trabajadores específicos</option>
                  </select>
                </div>

                {a.scope !== 'all' && (
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                    {(a.scope === 'empresas' ? empresas : trabajadores).map((t) => (
                      <label
                        key={t.id}
                        className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={a.targetIds.includes(t.id)}
                          onChange={() => toggleTarget(a.id, t.id)}
                        />
                        {t.label}
                      </label>
                    ))}
                    {(a.scope === 'empresas' ? empresas : trabajadores).length === 0 && (
                      <p className="text-xs text-gray-400 px-1">
                        No hay {a.scope === 'empresas' ? 'empresas' : 'trabajadores'}.
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <CalendarClock size={12} /> Fecha de expiración (opcional)
                    </label>
                    <input
                      type="datetime-local"
                      className={inputCls}
                      value={a.expiresAt ? a.expiresAt.slice(0, 16) : ''}
                      onChange={(e) =>
                        update(a.id, {
                          expiresAt: e.target.value ? new Date(e.target.value).toISOString() : '',
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <User size={12} /> Publicado por
                    </label>
                    <input
                      className={inputCls}
                      value={a.createdBy ?? ''}
                      onChange={(e) => update(a.id, { createdBy: e.target.value })}
                      placeholder="Nombre del autor"
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-400">
                  Creado:{' '}
                  {new Date(a.createdAt).toLocaleString('es-CL', {
                    timeZone: 'America/Santiago',
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', hour12: false,
                  })}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-end mt-4">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Guardar avisos
        </button>
      </div>
    </div>
  );
}
