import { useEffect, useState } from 'react';
import {
  X,
  Plus,
  UserPlus,
  Calendar,
  Users,
  Trash2,
  Heart,
  Baby,
  UsersRound,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase } from '../../context/AuthContext';
import type { Empleado, Carga } from '../../types/database';
import { formatRut, validateRut } from '../../utils/validation';

interface Props {
  empleado: Empleado;
  onClose: () => void;
}

const PARENTESCO_TIPOS = [
  { value: 'conyuge', label: 'Cónyuge', icon: Heart },
  { value: 'hijo', label: 'Hijo', icon: Baby },
  { value: 'hija', label: 'Hija', icon: Baby },
  { value: 'padre', label: 'Padre', icon: UsersRound },
  { value: 'madre', label: 'Madre', icon: UsersRound },
  { value: 'otro', label: 'Otro', icon: Users },
];

export function CargasManager({ empleado, onClose }: Props) {
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    rut: '',
    nombre: '',
    apellido: '',
    parentesco: 'hijo',
    fecha_nacimiento: '',
  });

  const supabase = getSupabase();

  useEffect(() => {
    loadCargas();
  }, [empleado.id]);

  const loadCargas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cargas')
        .select('*')
        .eq('empleado_id', empleado.id)
        .eq('activa', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCargas(data || []);
    } catch (err) {
      toast.error('Error cargando cargas familiares');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.rut && !validateRut(formData.rut)) {
      toast.error('RUT inválido. Ingresa un RUT chileno válido (ej: 12.345.678-9).');
      return;
    }

    try {
      const cargaData = {
        empleado_id: empleado.id,
        rut: formData.rut || null,
        nombre: formData.nombre,
        apellido: formData.apellido,
        parentesco: formData.parentesco,
        fecha_nacimiento: formData.fecha_nacimiento || null,
        activa: true,
      };

      const { error } = await supabase.from('cargas').insert(cargaData);

      if (error) throw error;

      await supabase.functions.invoke('audit-log', {
        body: {
          action: 'DEPENDENT_CREATE',
          resourceType: 'carga',
          resourceId: cargaData.rut || cargaData.nombre,
          success: true,
          metadata: {
            empleado_id: empleado.id,
            parentesco: cargaData.parentesco,
          },
        },
      });

      toast.success('Carga familiar agregada');
      setShowForm(false);
      setFormData({
        rut: '',
        nombre: '',
        apellido: '',
        parentesco: 'hijo',
        fecha_nacimiento: '',
      });
      loadCargas();
    } catch (err) {
      toast.error('Error agregando carga familiar');
      console.error(err);
    }
  };

  const handleEliminar = async (cargaId: string) => {
    if (!confirm('¿Eliminar esta carga familiar?')) return;

    try {
      const { error } = await supabase
        .from('cargas')
        .update({ activa: false })
        .eq('id', cargaId);

      if (error) throw error;

      await supabase.functions.invoke('audit-log', {
        body: {
          action: 'DEPENDENT_DEACTIVATE',
          resourceType: 'carga',
          resourceId: cargaId,
          success: true,
          metadata: {
            empleado_id: empleado.id,
          },
        },
      });

      toast.success('Carga eliminada');
      loadCargas();
    } catch (err) {
      toast.error('Error eliminando carga');
      console.error(err);
    }
  };

  const getParentescoLabel = (value: string) => {
    return PARENTESCO_TIPOS.find((p) => p.value === value)?.label || value;
  };

  const calcularEdad = (fechaNacimiento: string | null | undefined) => {
    if (!fechaNacimiento) return null;
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold">Cargas Familiares</h3>
            <p className="text-sm text-gray-500 mt-1">
              {empleado.nombre} {empleado.apellido}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">

          <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm">
                <strong>{cargas.length}</strong> cargas registradas
              </span>
            </div>
            <div className="w-px h-4 bg-gray-300" />
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              <span className="text-sm">
                <strong>
                  {cargas.filter((c) => c.parentesco === 'conyuge').length}
                </strong>{' '}
                cónyuge(s)
              </span>
            </div>
            <div className="w-px h-4 bg-gray-300" />
            <div className="flex items-center gap-2">
              <Baby className="w-5 h-5 text-green-500" />
              <span className="text-sm">
                <strong>
                  {
                    cargas.filter(
                      (c) => c.parentesco === 'hijo' || c.parentesco === 'hija'
                    ).length
                  }
                </strong>{' '}
                hijo(s)
              </span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : cargas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <UserPlus className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No hay cargas familiares registradas</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {cargas.map((carga) => {
                const edad = calcularEdad(carga.fecha_nacimiento);
                return (
                  <div
                    key={carga.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {carga.nombre} {carga.apellido}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                            {getParentescoLabel(carga.parentesco)}
                          </span>
                          {carga.rut && <span>RUT: {carga.rut}</span>}
                          {edad !== null && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {edad} años
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEliminar(carga.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {showForm ? (
            <form
              onSubmit={handleSubmit}
              className="border rounded-lg p-4 space-y-4"
            >
              <h4 className="font-medium">Agregar Carga Familiar</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.apellido}
                    onChange={(e) =>
                      setFormData({ ...formData, apellido: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">RUT</label>
                  <input
                    type="text"
                    value={formData.rut}
                    onChange={(e) =>
                      setFormData({ ...formData, rut: formatRut(e.target.value) })
                    }
                    maxLength={12}
                    placeholder="12.345.678-9"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Parentesco *
                  </label>
                  <select
                    required
                    value={formData.parentesco}
                    onChange={(e) =>
                      setFormData({ ...formData, parentesco: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {PARENTESCO_TIPOS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  value={formData.fecha_nacimiento}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fecha_nacimiento: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Agregar
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 w-full justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition"
            >
              <Plus className="w-5 h-5" />
              Agregar Carga Familiar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
