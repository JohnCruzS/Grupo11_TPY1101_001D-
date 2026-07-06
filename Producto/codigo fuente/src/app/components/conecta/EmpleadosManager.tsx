import { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Briefcase,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  AlertCircle,
  Loader2,
  MoreVertical,
  FileText,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase } from '../../context/AuthContext';
import { formatRut, validateRut } from '../../utils/validation';
import type { Empleado, Carga } from '../../types/database';
import { CargasManager } from './CargasManager';

interface Props {
  empresaId: string;
  isAdmin?: boolean;
}

const CONTRATO_TIPOS = [
  { value: 'indefinido', label: 'Indefinido' },
  { value: 'plazo_fijo', label: 'Plazo Fijo' },
  { value: 'honorarios', label: 'Honorarios' },
  { value: 'otro', label: 'Otro' },
];

export function EmpleadosManager({ empresaId, isAdmin = false }: Props) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState<Empleado | null>(null);
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(
    null
  );
  const [showCargas, setShowCargas] = useState(false);
  const [formData, setFormData] = useState({
    rut: '',
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    departamento: '',
    cargo: '',
    fecha_contratacion: '',
    tipo_contrato: 'indefinido',
    salario: '',
  });

  const supabase = getSupabase();

  useEffect(() => {
    loadEmpleados();
  }, [empresaId]);

  const loadEmpleados = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('activo', true)
        .order('apellido', { ascending: true });

      if (error) throw error;
      setEmpleados(data || []);
    } catch (err) {
      toast.error('Error cargando empleados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateRut(formData.rut)) {
      toast.error('RUT inválido. Ingresa un RUT chileno válido (ej: 12.345.678-5).');
      return;
    }

    try {
      const empleadoData = {
        empresa_id: empresaId,
        rut: formData.rut,
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email || null,
        telefono: formData.telefono || null,
        departamento: formData.departamento || null,
        cargo: formData.cargo || null,
        fecha_contratacion: formData.fecha_contratacion || null,
        tipo_contrato: formData.tipo_contrato,
        salario: formData.salario ? parseFloat(formData.salario) : null,
        activo: true,
      };

      if (editingEmpleado) {
        const { error } = await supabase
          .from('empleados')
          .update(empleadoData)
          .eq('id', editingEmpleado.id);

        if (error) throw error;
        await supabase.functions.invoke('audit-log', {
          body: {
            action: 'EMPLOYEE_UPDATE',
            resourceType: 'empleado',
            resourceId: editingEmpleado.id,
            enterpriseId: empresaId,
            success: true,
            metadata: {
              fields: Object.keys(empleadoData),
            },
          },
        });
        toast.success('Empleado actualizado');
      } else {
        const { error } = await supabase.from('empleados').insert(empleadoData);

        if (error) throw error;
        await supabase.functions.invoke('audit-log', {
          body: {
            action: 'EMPLOYEE_CREATE',
            resourceType: 'empleado',
            resourceId: empleadoData.rut,
            enterpriseId: empresaId,
            success: true,
            metadata: {
              email: empleadoData.email,
              cargo: empleadoData.cargo,
            },
          },
        });
        toast.success('Empleado agregado');
      }

      setShowForm(false);
      setEditingEmpleado(null);
      resetForm();
      loadEmpleados();
    } catch (err) {
      toast.error('Error guardando empleado');
      console.error(err);
    }
  };

  const handleDesvincular = async (empleado: Empleado) => {
    if (!confirm(`¿Desvincular a ${empleado.nombre} ${empleado.apellido}?`))
      return;

    try {
      const { error } = await supabase
        .from('empleados')
        .update({
          activo: false,
          fecha_desvinculacion: new Date().toISOString().split('T')[0],
          motivo_desvinculacion: 'Desvinculación manual',
        })
        .eq('id', empleado.id);

      if (error) throw error;
      await supabase.functions.invoke('audit-log', {
        body: {
          action: 'EMPLOYEE_DEACTIVATE',
          resourceType: 'empleado',
          resourceId: empleado.id,
          enterpriseId: empresaId,
          success: true,
          metadata: {
            rut: empleado.rut,
            motivo: 'Desvinculación manual',
          },
        },
      });
      toast.success('Empleado desvinculado');
      loadEmpleados();
    } catch (err) {
      toast.error('Error desvinculando empleado');
      console.error(err);
    }
  };

  const handleEdit = (empleado: Empleado) => {
    setEditingEmpleado(empleado);
    setFormData({
      rut: empleado.rut,
      nombre: empleado.nombre,
      apellido: empleado.apellido,
      email: empleado.email || '',
      telefono: empleado.telefono || '',
      departamento: empleado.departamento || '',
      cargo: empleado.cargo || '',
      fecha_contratacion: empleado.fecha_contratacion || '',
      tipo_contrato: empleado.tipo_contrato,
      salario: empleado.salario?.toString() || '',
    });
    setShowForm(true);
  };

  const handleVerCargas = (empleado: Empleado) => {
    setSelectedEmpleado(empleado);
    setShowCargas(true);
  };

  const resetForm = () => {
    setFormData({
      rut: '',
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      departamento: '',
      cargo: '',
      fecha_contratacion: '',
      tipo_contrato: 'indefinido',
      salario: '',
    });
  };

  const filteredEmpleados = empleados.filter(
    (e) =>
      e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.rut.includes(searchTerm) ||
      e.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold">Empleados</h2>
          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-sm">
            {empleados.length}
          </span>
        </div>
        <button
          onClick={() => {
            setEditingEmpleado(null);
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Agregar Empleado
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, RUT o cargo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid gap-4">
        {filteredEmpleados.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No hay empleados registrados</p>
          </div>
        ) : (
          filteredEmpleados.map((empleado) => (
            <div
              key={empleado.id}
              className="bg-white border rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {empleado.nombre} {empleado.apellido}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-1 text-sm text-gray-600">
                      {empleado.cargo && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {empleado.cargo}
                        </span>
                      )}
                      {empleado.departamento && (
                        <span className="flex items-center gap-1">
                          <span className="w-1 h-1 bg-gray-400 rounded-full" />
                          {empleado.departamento}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        RUT: {empleado.rut}
                      </span>
                      {empleado.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {empleado.email}
                        </span>
                      )}
                      {empleado.telefono && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {empleado.telefono}
                        </span>
                      )}
                      {empleado.fecha_contratacion && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(
                            empleado.fecha_contratacion
                          ).toLocaleDateString('es-CL')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVerCargas(empleado)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Cargas familiares"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(empleado)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDesvincular(empleado)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Desvincular"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">
                {editingEmpleado ? 'Editar Empleado' : 'Nuevo Empleado'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    RUT *
                  </label>
                  <input
                    type="text"
                    required
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
                    Tipo Contrato
                  </label>
                  <select
                    value={formData.tipo_contrato}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tipo_contrato: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {CONTRATO_TIPOS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
                  <label className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) =>
                      setFormData({ ...formData, telefono: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Departamento
                  </label>
                  <input
                    type="text"
                    value={formData.departamento}
                    onChange={(e) =>
                      setFormData({ ...formData, departamento: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Cargo
                  </label>
                  <input
                    type="text"
                    value={formData.cargo}
                    onChange={(e) =>
                      setFormData({ ...formData, cargo: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Fecha Contratación
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_contratacion}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fecha_contratacion: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Salario (CLP)
                  </label>
                  <input
                    type="number"
                    value={formData.salario}
                    onChange={(e) =>
                      setFormData({ ...formData, salario: e.target.value })
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Check className="w-4 h-4" />
                  {editingEmpleado ? 'Guardar Cambios' : 'Agregar Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCargas && selectedEmpleado && (
        <CargasManager
          empleado={selectedEmpleado}
          onClose={() => {
            setShowCargas(false);
            setSelectedEmpleado(null);
          }}
        />
      )}
    </div>
  );
}
