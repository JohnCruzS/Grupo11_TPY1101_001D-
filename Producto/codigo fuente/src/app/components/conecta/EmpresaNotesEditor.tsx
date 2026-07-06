import { useEffect, useState } from 'react';
import {
  Loader2, Save, Bell, Plus, Trash2,
  Eye, EyeOff, CalendarClock, ChevronDown, ChevronUp, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase, useAuth } from '../../context/AuthContext';
import {
  empresaNotesKey,
  readSetting,
  writeSetting,
  type EmpresaAviso,
  type EmpresaAvisoData,
} from '../../utils/siteSettings';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400';

interface Worker { id: string; label: string; }

function genId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isExpired(a: EmpresaAviso) {
  return !!a.expiresAt && new Date(a.expiresAt) < new Date();
}

function toLocalParts(iso: string): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: '', time: '' };
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function combineExpiry(date: string, time: string): string {
  if (!date) return '';
  const d = new Date(`${date}T${time || '23:59'}`);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

function newAviso(authorName: string): EmpresaAviso {
  return {
    id: genId(),
    titulo: '',
    texto: '',
    enabled: true,
    targetIds: [],
    expiresAt: '',
    createdAt: new Date().toISOString(),
  };
}

export function EmpresaNotesEditor({ empresaId }: { empresaId: string }) {
  const supabase = getSupabase();
  const { user } = useAuth();
  const authorName = user ? `${user.nombre} ${user.apellido}`.trim() : '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avisos, setAvisos] = useState<EmpresaAviso[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!empresaId) { setLoading(false); return; }

    (async () => {

      const stored = await readSetting<EmpresaAvisoData | null>(empresaNotesKey(empresaId));

      if (stored && 'avisos' in stored) {

        setAvisos(stored.avisos);
      } else if (stored && 'titulo' in (stored as object)) {

        const old = stored as { enabled: boolean; titulo: string; texto: string };
        if (old.titulo || old.texto) {
          setAvisos([{
            id: genId(),
            titulo: old.titulo || '',
            texto: old.texto || '',
            enabled: old.enabled ?? true,
            targetIds: [],
            createdAt: new Date().toISOString(),
          }]);
        }
      }

      const { data: assignments } = await supabase
        .from('user_enterprises')
        .select('user_id')
        .eq('enterprise_id', empresaId)
        .eq('is_active', true);

      if (assignments && assignments.length > 0) {
        const ids = assignments.map((a: { user_id: string }) => a.user_id);
        const { data: profiles } = await supabase
          .from('kv_store_7d36b31f')
          .select('key, value')
          .in('key', ids.map((id: string) => `slc_user:${id}`));

        setWorkers(
          (profiles || [])
            .filter((p: { key: string; value: Record<string, unknown> }) =>
              p.value?.rol === 'usuario'
            )
            .map((p: { key: string; value: Record<string, unknown> }) => ({
              id: p.key.replace('slc_user:', ''),
              label:
                `${p.value.nombre || ''} ${p.value.apellido || ''}`.trim() ||
                (p.value.email as string) || p.key,
            }))
        );
      }

      setLoading(false);
    })();
  }, [empresaId]);

  const patch = (id: string, changes: Partial<EmpresaAviso>) =>
    setAvisos((prev) => prev.map((a) => (a.id === id ? { ...a, ...changes } : a)));

  const toggleTarget = (avisoId: string, workerId: string) =>
    setAvisos((prev) =>
      prev.map((a) => {
        if (a.id !== avisoId) return a;
        const has = a.targetIds.includes(workerId);
        return {
          ...a,
          targetIds: has ? a.targetIds.filter((t) => t !== workerId) : [...a.targetIds, workerId],
        };
      })
    );

  const addAviso = () => {
    const a = newAviso(authorName);
    setAvisos((prev) => [a, ...prev]);
    setExpanded((prev) => new Set([...prev, a.id]));
  };

  const removeAviso = (id: string) => setAvisos((prev) => prev.filter((a) => a.id !== id));

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const save = async () => {
    if (!empresaId) { toast.error('No se pudo identificar tu empresa'); return; }
    const vigentes = avisos.filter((a) => !isExpired(a));
    const removed = avisos.length - vigentes.length;
    setSaving(true);
    const res = await writeSetting(empresaNotesKey(empresaId), { avisos: vigentes } as EmpresaAvisoData);
    setSaving(false);
    if (res.ok) {
      setAvisos(vigentes);
      toast.success(
        removed > 0
          ? `Avisos guardados (${removed} expirado${removed > 1 ? 's' : ''} eliminado${removed > 1 ? 's' : ''})`
          : 'Avisos guardados'
      );
    } else {
      toast.error(res.error || 'No se pudo guardar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto w-full">

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5 text-green-600" />
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.2rem', fontWeight: 600, color: '#091f34' }}>
              Avisos a empleados
            </h2>
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', color: '#6b7280' }}>
            Publica mensajes que aparecen en el inicio de tus trabajadores. Puedes dirigirlos a todos o a empleados específicos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addAviso}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-green-700 hover:bg-green-50 rounded-lg border border-green-200 transition-colors"
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
          >
            <Plus size={15} /> Nuevo aviso
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-colors"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
        </div>
      </div>

      {avisos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Bell size={36} className="mx-auto mb-3 text-gray-300" />
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: '#9ca3af', fontWeight: 500 }}>
            No hay avisos todavía
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: '#d1d5db', marginTop: '4px' }}>
            Crea uno con el botón "Nuevo aviso"
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {avisos.map((a) => {
            const expired = isExpired(a);
            const open = expanded.has(a.id);
            const targetLabel = a.targetIds.length === 0
              ? 'Todos los trabajadores'
              : `${a.targetIds.length} trabajador${a.targetIds.length !== 1 ? 'es' : ''}`;

            return (
              <div
                key={a.id}
                className="bg-white rounded-xl border"
                style={{ borderColor: expired ? '#fca5a5' : '#e5e7eb', backgroundColor: expired ? '#fff8f8' : 'white' }}
              >

                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                  onClick={() => toggleExpanded(a.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); patch(a.id, { enabled: !a.enabled }); }}
                      className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        a.enabled
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}
                    >
                      {a.enabled ? <Eye size={11} /> : <EyeOff size={11} />}
                      {a.enabled ? 'Visible' : 'Oculto'}
                    </button>

                    {expired && (
                      <span className="flex-shrink-0 text-xs text-red-500 font-medium">Expirado</span>
                    )}

                    <p
                      className="text-sm font-medium text-gray-800 truncate"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {a.titulo.trim() || <span className="text-gray-400 italic">Sin título</span>}
                    </p>

                    <span
                      className="flex-shrink-0 hidden sm:inline-flex items-center gap-1 text-xs text-gray-400"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      <Users size={11} />
                      {targetLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); removeAviso(a.id); }}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                    {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {open && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-50 space-y-3">

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Título</label>
                      <input
                        className={inputCls}
                        value={a.titulo}
                        onChange={(e) => patch(a.id, { titulo: e.target.value })}
                        placeholder="Ej: Recordatorio de horario"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Mensaje</label>
                      <textarea
                        className={inputCls}
                        rows={3}
                        value={a.texto}
                        onChange={(e) => patch(a.id, { texto: e.target.value })}
                        placeholder="Escribe el mensaje para tus trabajadores..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">
                        <Users size={11} className="inline mr-1" />
                        Dirigido a
                      </label>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => patch(a.id, { targetIds: [] })}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            a.targetIds.length === 0
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                          }`}
                        >
                          Todos los trabajadores
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (a.targetIds.length === 0 && workers.length > 0)
                              patch(a.id, { targetIds: [workers[0].id] });
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            a.targetIds.length > 0
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                          }`}
                        >
                          Trabajadores específicos
                        </button>
                      </div>

                      {workers.length > 0 && (
                        <div className="border border-gray-200 rounded-lg p-2 max-h-36 overflow-y-auto space-y-0.5">
                          {workers.map((w) => (
                            <label
                              key={w.id}
                              className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded-md"
                              style={{ fontFamily: "'Inter', sans-serif" }}
                            >
                              <input
                                type="checkbox"
                                checked={a.targetIds.includes(w.id)}
                                onChange={() => toggleTarget(a.id, w.id)}
                                className="rounded"
                              />
                              {w.label}
                            </label>
                          ))}
                        </div>
                      )}
                      {workers.length === 0 && (
                        <p className="text-xs text-gray-400 italic">No tienes trabajadores asignados aún.</p>
                      )}
                    </div>

                    <div>
                      <label className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1">
                        <CalendarClock size={11} /> Fecha límite (opcional — se elimina automáticamente al guardar)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="block text-[11px] text-gray-400 mb-0.5">Fecha</span>
                          <input
                            type="date"
                            className={inputCls}
                            value={toLocalParts(a.expiresAt).date}
                            onChange={(e) =>
                              patch(a.id, {
                                expiresAt: combineExpiry(
                                  e.target.value,
                                  toLocalParts(a.expiresAt).time
                                ),
                              })
                            }
                          />
                        </div>
                        <div>
                          <span className="block text-[11px] text-gray-400 mb-0.5">Hora</span>
                          <input
                            type="time"
                            className={inputCls}
                            value={toLocalParts(a.expiresAt).time}
                            disabled={!toLocalParts(a.expiresAt).date}
                            onChange={(e) =>
                              patch(a.id, {
                                expiresAt: combineExpiry(
                                  toLocalParts(a.expiresAt).date,
                                  e.target.value
                                ),
                              })
                            }
                          />
                        </div>
                      </div>
                      {a.expiresAt && (
                        <button
                          type="button"
                          onClick={() => patch(a.id, { expiresAt: '' })}
                          className="mt-1 text-xs text-gray-400 hover:text-red-500"
                        >
                          Quitar fecha límite
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-gray-400" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Creado:{' '}
                      {new Date(a.createdAt).toLocaleString('es-CL', {
                        timeZone: 'America/Santiago',
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: false,
                      })}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {avisos.length > 0 && (
        <div className="flex justify-end mt-4">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-colors"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar avisos
          </button>
        </div>
      )}
    </div>
  );
}
