import { useEffect, useState } from 'react';
import { Loader2, Save, ShieldCheck, Search } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase } from '../../context/AuthContext';
import {
  PERMISO_DEFS,
  ALL_PERMISOS,
  type AdminPermisos,
} from '../../utils/permisos';

interface AdminProfile {
  userId: string;
  key: string;
  nombre: string;
  apellido: string;
  email: string;
  value: Record<string, unknown>;
  permisos: AdminPermisos;
}

export function AdminPermissionsManager() {
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const supabase = getSupabase();

  useEffect(() => {
    load();

  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('kv_store_7d36b31f')
        .select('key, value')
        .like('key', 'slc_user:%');
      if (error) throw error;
      const list: AdminProfile[] = (data || [])
        .map((row: { key: string; value: Record<string, unknown> }) => {
          const v = (row.value || {}) as Record<string, unknown>;
          const rol = (v.rol || v.role) as string;
          if (rol !== 'admin') return null;
          const stored = v.permisos as Partial<AdminPermisos> | undefined;
          return {
            userId: row.key.replace('slc_user:', ''),
            key: row.key,
            nombre: (v.nombre as string) || '',
            apellido: (v.apellido as string) || '',
            email: (v.email as string) || '',
            value: v,

            permisos: stored
              ? { ...ALL_PERMISOS, ...stored }
              : { ...ALL_PERMISOS },
          } as AdminProfile;
        })
        .filter(Boolean) as AdminProfile[];
      list.sort((a, b) =>
        `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`)
      );
      setAdmins(list);
    } catch (err) {
      console.error(err);
      toast.error('No se pudieron cargar los administradores');
    } finally {
      setLoading(false);
    }
  };

  const togglePermiso = (userId: string, key: keyof AdminPermisos) => {
    setAdmins((prev) =>
      prev.map((a) =>
        a.userId === userId
          ? { ...a, permisos: { ...a.permisos, [key]: !a.permisos[key] } }
          : a
      )
    );
  };

  const save = async (admin: AdminProfile) => {
    setSavingId(admin.userId);
    try {
      const newValue = { ...admin.value, permisos: admin.permisos };
      const { error } = await supabase
        .from('kv_store_7d36b31f')
        .upsert({ key: admin.key, value: newValue }, { onConflict: 'key' });
      if (error) throw error;

      supabase.functions
        .invoke('audit-log', {
          body: {
            action: 'USER_UPDATE',
            resourceType: 'user',
            resourceId: admin.userId,
            success: true,
            metadata: { permisos: admin.permisos, scope: 'admin_permissions' },
          },
        })
        .catch(() => {});

      setAdmins((prev) =>
        prev.map((a) =>
          a.userId === admin.userId ? { ...a, value: newValue } : a
        )
      );
      toast.success('Permisos actualizados');
    } catch (err) {
      console.error(err);
      toast.error('No se pudieron guardar los permisos');
    } finally {
      setSavingId(null);
    }
  };

  const filtered = admins.filter((a) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      `${a.nombre} ${a.apellido}`.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-6 h-6 text-purple-600" />
        <div>
          <h2 className="text-xl font-semibold">Gestionar administración</h2>
          <p className="text-sm text-gray-500">
            Activa o desactiva las capacidades de cada administrador. Los super
            admin siempre conservan todas las capacidades.
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar administrador..."
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
          No hay administradores para mostrar.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((admin) => (
            <div
              key={admin.userId}
              className="bg-white rounded-xl border p-4"
              style={{ borderColor: '#e9ecef' }}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold text-gray-900">
                    {admin.nombre} {admin.apellido}
                  </p>
                  <p className="text-sm text-gray-500">{admin.email}</p>
                </div>
                <button
                  onClick={() => save(admin)}
                  disabled={savingId === admin.userId}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
                >
                  {savingId === admin.userId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Guardar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                {PERMISO_DEFS.map((def) => {
                  const enabled = admin.permisos[def.key];
                  return (
                    <button
                      key={def.key}
                      onClick={() => togglePermiso(admin.userId, def.key)}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-left transition ${
                        enabled
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <span
                        className={`mt-0.5 w-9 h-5 rounded-full flex-shrink-0 relative transition ${
                          enabled ? 'bg-purple-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                            enabled ? 'left-[18px]' : 'left-0.5'
                          }`}
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-800">
                          {def.label}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {def.descripcion}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
