import { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  AlertCircle,
  CheckCircle2,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import { getSupabase } from '../../context/AuthContext';

interface Enterprise {
  id: string;
  name: string;
  rut?: string;
  email?: string;
}

interface UserLocal {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: string;
  enterprise_id?: string;
}

interface AssignmentRow {
  user_id: string;
  enterprise_id: string;
}

export function UserEnterpriseAssignment() {
  const supabase = getSupabase();
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [allUsers, setAllUsers] = useState<UserLocal[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [selectedEnterprise, setSelectedEnterprise] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [entRes, profilesRes, assignRes] = await Promise.all([
        supabase.from('enterprises').select('id, name, rut, email'),
        supabase
          .from('kv_store_7d36b31f')
          .select('key, value')
          .like('key', 'slc_user:%'),
        supabase
          .from('user_enterprises')
          .select('user_id, enterprise_id')
          .eq('is_active', true),
      ]);

      if (entRes.error) throw entRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (assignRes.error) throw assignRes.error;

      setEnterprises(entRes.data || []);

      const users: UserLocal[] = (profilesRes.data || []).map((p) => ({
        id: p.key.replace('slc_user:', ''),
        email: p.value.email || '',
        nombre: p.value.nombre || '',
        apellido: p.value.apellido || '',
        rol: p.value.rol || 'usuario',
      }));
      setAllUsers(users);
      setAssignments(assignRes.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const assignedUserIds = new Set(assignments.map((a) => a.user_id));

  const unassignedUsers = allUsers.filter((u) => !assignedUserIds.has(u.id));

  const assignedUsersWithEnterprise: UserLocal[] = allUsers
    .filter((u) => assignedUserIds.has(u.id))
    .map((u) => {
      const assignment = assignments.find((a) => a.user_id === u.id);
      return { ...u, enterprise_id: assignment?.enterprise_id };
    });

  const filteredUnassigned = unassignedUsers.filter((u) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.email.toLowerCase().includes(term) ||
      u.nombre.toLowerCase().includes(term) ||
      u.apellido.toLowerCase().includes(term)
    );
  });

  const handleAssignUsers = async () => {
    if (!selectedEnterprise || selectedUsers.length === 0) {
      setError('Selecciona una empresa y al menos un usuario');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const rows = selectedUsers.map((userId) => ({
        user_id: userId,
        enterprise_id: selectedEnterprise,
        role: 'employee',
        is_active: true,
        assigned_at: new Date().toISOString(),
      }));
      const { error: insertError } = await supabase
        .from('user_enterprises')
        .insert(rows);
      if (insertError) throw insertError;
      setSuccess(`${selectedUsers.length} usuario(s) asignado(s) exitosamente`);
      setSelectedUsers([]);
      await loadData();
    } catch (err: unknown) {
      setError(
        `Error al asignar: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignUser = async (userId: string, enterpriseId: string) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { error: deleteError } = await supabase
        .from('user_enterprises')
        .delete()
        .eq('user_id', userId)
        .eq('enterprise_id', enterpriseId);
      if (deleteError) throw deleteError;
      setSuccess('Usuario desasignado exitosamente');
      await loadData();
    } catch (err: unknown) {
      setError(
        `Error al desasignar: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h2
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '1.1rem',
            color: '#091f34',
            fontWeight: 600,
            marginBottom: '16px',
          }}
        >
          Asignación de Usuarios a Empresas
        </h2>

        <div className="mb-6">
          <label
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.85rem',
              color: '#374151',
              display: 'block',
              marginBottom: '8px',
            }}
          >
            Seleccionar Empresa
          </label>
          <select
            value={selectedEnterprise}
            onChange={(e) => {
              setSelectedEnterprise(e.target.value);
              setSelectedUsers([]);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <option value="">-- Selecciona una empresa --</option>
            {enterprises.map((enterprise) => (
              <option key={enterprise.id} value={enterprise.id}>
                {enterprise.name}
                {enterprise.rut ? ` · ${enterprise.rut}` : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedEnterprise && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.95rem',
                  color: '#374151',
                  fontWeight: 600,
                }}
              >
                Usuarios sin Asignar ({filteredUnassigned.length})
              </h3>
              <div className="flex items-center gap-2">
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.8rem',
                    color: '#6b7280',
                  }}
                >
                  {selectedUsers.length} seleccionados
                </span>
                {selectedUsers.length > 0 && (
                  <button
                    onClick={handleAssignUsers}
                    disabled={loading}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-1"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    <UserPlus size={14} />
                    {loading ? 'Asignando...' : 'Asignar Seleccionados'}
                  </button>
                )}
              </div>
            </div>

            <div className="relative mb-3">
              <Search
                size={15}
                className="absolute left-3 top-2.5 text-gray-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o correo..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {filteredUnassigned.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users size={36} className="mx-auto mb-2 text-gray-300" />
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                  }}
                >
                  {searchTerm
                    ? 'No se encontraron usuarios con ese criterio'
                    : 'No hay usuarios sin asignar'}
                </p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-md max-h-64 overflow-y-auto">
                {filteredUnassigned.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 border-b border-gray-100 hover:bg-gray-50 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="rounded border-gray-300"
                    />
                    <div>
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          color: '#091f34',
                        }}
                      >
                        {user.nombre} {user.apellido}
                      </p>
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.75rem',
                          color: '#6b7280',
                        }}
                      >
                        {user.email} · {user.rol}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <h3
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.95rem',
              color: '#374151',
              fontWeight: 600,
              marginBottom: '12px',
            }}
          >
            Usuarios Asignados ({assignedUsersWithEnterprise.length})
          </h3>

          {assignedUsersWithEnterprise.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Building2 size={36} className="mx-auto mb-2 text-gray-300" />
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.85rem',
                }}
              >
                No hay usuarios asignados a empresas
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {assignedUsersWithEnterprise.map((user) => {
                const enterprise = enterprises.find(
                  (e) => e.id === user.enterprise_id
                );
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserPlus size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <p
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            color: '#091f34',
                          }}
                        >
                          {user.nombre} {user.apellido}
                        </p>
                        <p
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '0.75rem',
                            color: '#6b7280',
                          }}
                        >
                          {user.email} · {user.rol}
                          {enterprise ? ` · ${enterprise.name}` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handleUnassignUser(user.id, user.enterprise_id!)
                      }
                      disabled={loading}
                      className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      Desasignar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.8rem',
                color: '#dc2626',
              }}
            >
              {error}
            </p>
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-600 shrink-0" />
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.8rem',
                color: '#059669',
              }}
            >
              {success}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
