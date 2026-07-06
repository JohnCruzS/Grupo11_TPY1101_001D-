import { useEffect, useState, useRef } from 'react';
import {
  Users,
  FileText,
  Upload,
  Trash2,
  AlertCircle,
  Building2,
  CheckCircle2,
  Download,
  Eye,
  RefreshCw,
  Search,
  BarChart3,
} from 'lucide-react';
import { useAuth, User } from '../../context/AuthContext';
import { toast } from 'sonner';
import { EnterpriseDocumentView } from './EnterpriseDocumentView';
import { EmpresaDashboardSection } from './EmpresaDashboardSection';
import { EmpresaPerfilSection } from './EmpresaPerfilSection';
import { MessageCenter } from './MessageCenter';
import { EmpleadosManager } from './EmpleadosManager';
import { SubscriptionManager } from './SubscriptionManager';
import { DocumentTrackingPanel } from './DocumentTrackingPanel';
import { DocumentTrackingModal } from './DocumentTrackingModal';
import { ChatbotIA } from './ChatbotIA';
import { PlanGate } from './PlanGate';
import { EmpresaNotesEditor } from './EmpresaNotesEditor';
import { useSecureDownload } from '../../hooks/useSecureDownload';
import { getSupabase } from '../../context/AuthContext';
import { exportToXLSX, exportToPDF, type ReportColumn } from '../../utils/reports';

interface Worker {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rut?: string;
  rol: string;
  empresaId?: string;
  createdAt: string;
}
interface Doc {
  id: string;
  userId: string;
  nombre: string;
  tipo: string;
  fecha: string;
  size: number;
  mimeType: string;
  url: string | null;
  storage_path?: string | null;
}
interface Company {
  id: string;
  nombre: string;
  rut?: string;
  email?: string;
  estado: string;
  plan?: string;
  userIds: string[];
}

const TIPO_COLORS: Record<string, string> = {
  contrato: '#3b82f6',
  liquidacion: '#10b981',
  finiquito: '#f59e0b',
  anexo: '#8b5cf6',
  documento: '#6b7280',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

interface Props {
  activeSection: string;
  onChangeSection?: (section: string) => void;
}

export function EmpresaView({ activeSection, onChangeSection }: Props) {
  const { user } = useAuth();
  const supabase = getSupabase();
  const { getSecureUrl, downloadSecure } = useSecureDownload();

  const viewWorkerDoc = async (doc: Doc) => {
    if (!doc.storage_path) {
      toast.error('Documento sin ruta de archivo.');
      return;
    }
    const url = await getSecureUrl(doc.storage_path);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else toast.error('No se pudo abrir el documento.');
  };
  const downloadWorkerDoc = async (doc: Doc) => {
    if (!doc.storage_path) {
      toast.error('Documento sin ruta de archivo.');
      return;
    }
    await downloadSecure(doc.storage_path, doc.nombre, { documentId: doc.id, ownerId: doc.userId });
  };
  const [company, setCompany] = useState<Company | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [workerDocs, setWorkerDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [trackingDocId, setTrackingDocId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [uploadForm, setUploadForm] = useState({
    userId: '',
    nombre: '',
    tipo: 'contrato',
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {

    if (!user.empresaId && user.rol !== 'empresa') return;
    loadData();
  }, [user.empresaId, user.rol, user.email]);

  useEffect(() => {
    if (
      activeSection !== 'trabajadores' &&
      activeSection !== 'upload' &&
      selectedWorker
    ) {
      setSelectedWorker(null);
    }
  }, [activeSection]);

  const loadData = async () => {
    setLoading(true);
    try {

      let empresaId = user.empresaId;

      if (!empresaId && user.rol === 'empresa') {
        const { data: entData, error: entLookupError } = await supabase
          .from('enterprises')
          .select('id, name, email')
          .eq('email', user.email)
          .single();

        if (entLookupError) {
          console.error('Error buscando empresa por email:', entLookupError);
        }

        if (entData) {
          empresaId = entData.id;
        } else {
          const { data: assignmentData, error: assignError } = await supabase
            .from('user_enterprises')
            .select('enterprise_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle();

          if (assignmentData?.enterprise_id) {
            empresaId = assignmentData.enterprise_id;
          } else if (assignError) {
            console.error('Error buscando asignación:', assignError);
          }
        }
      }

      if (!empresaId) {
        setCompany(null);
        setWorkers([]);
        toast.error('No se pudo determinar la empresa. Contacta al administrador.');
        return;
      }

      const { data: enterprise, error: entError } = await supabase
        .from('enterprises')
        .select('*')
        .eq('id', empresaId)
        .single();

      if (entError) {
        console.error('Error cargando empresa:', entError);
      }

      const { data: assignments, error: assignError } = await supabase
        .from('user_enterprises')
        .select('user_id, role')
        .eq('enterprise_id', empresaId)
        .eq('is_active', true);

      if (assignError) {
        console.error('Error cargando asignaciones:', assignError);
      }

      const filteredAssignments = assignments || [];

      const workerIds = filteredAssignments?.map((a) => a.user_id) || [];
      const { data: workerProfiles } =
        workerIds.length > 0
          ? await supabase
              .from('kv_store_7d36b31f')
              .select('key, value')
              .in(
                'key',
                workerIds.map((id) => `slc_user:${id}`)
              )
          : { data: [] };

      const workersData = (workerProfiles || []).map((profile) => {
        const assignment = filteredAssignments.find(
          (a) => a.user_id === profile.key.replace('slc_user:', '')
        );
        return {
          id: profile.key.replace('slc_user:', ''),
          nombre: profile.value.nombre || 'Sin nombre',
          apellido: profile.value.apellido || 'Sin apellido',
          email: profile.value.email || 'Sin email',
          rut: profile.value.rut || '',
          rol: assignment?.role || profile.value.rol || 'usuario',
          empresaId: empresaId,

          createdAt:
            profile.value.created_at || profile.value.createdAt || '',
        };
      });

      const filteredWorkers = workersData.filter(
        (w) => w.id !== user.id && w.rol !== 'admin' && w.rol !== 'empresa'
      );

      const companyData = enterprise
        ? {
            id: enterprise.id,
            nombre: enterprise.name,
            email: enterprise.email,
            estado:
              (enterprise as { subscription_status?: string })
                .subscription_status || 'active',
            plan: (enterprise as { plan?: string }).plan || 'basic',
            userIds: filteredWorkers.map((w) => w.id),
          }
        : null;

      setCompany(companyData);
      setWorkers(filteredWorkers);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar datos de la empresa');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkerDocs = async (worker: Worker) => {
    setSelectedWorker(worker);
    setLoading(true);
    try {

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('enterprise_id', company?.id || worker.empresaId)
        .eq('user_id', worker.id)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error cargando documentos del trabajador:', error);
        setWorkerDocs([]);
        toast.error('Error al cargar documentos del trabajador');
      } else {

        const transformedDocs: Doc[] = (data || []).map((d: any) => ({
          id: d.id,
          userId: worker.id,
          nombre: d.original_name || d.filename,
          tipo: d.file_category || 'documento',
          fecha: d.uploaded_at,
          size: d.file_size || 0,
          mimeType: d.mime_type || 'application/pdf',
          url: d.storage_url || null,
          storage_path: d.storage_path || null,
        }));
        setWorkerDocs(transformedDocs);
      }
    } catch (err) {
      console.error('Error:', err);
      setWorkerDocs([]);
      toast.error('Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  };

  const closeWorkerProfile = () => {
    setSelectedWorker(null);
    setWorkerDocs([]);

    if (activeSection === 'upload') {
      onChangeSection?.('trabajadores');
    }
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !uploadForm.userId) {
      toast.error('Selecciona un trabajador y un archivo.');
      return;
    }
    setUploading(true);

    setTimeout(() => {
      setUploading(false);
      toast.success('Documento subido correctamente.');
      setUploadForm({ userId: '', nombre: '', tipo: 'contrato' });
      if (fileRef.current) fileRef.current.value = '';
    }, 1000);
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('¿Eliminar este documento?')) return;

    setWorkerDocs((prev) => prev.filter((d: Doc) => d.id !== docId));
    toast.success('Documento eliminado.');
  };

  console.log('=== DEBUG RENDER ===', {
    activeSection,
    selectedWorker: selectedWorker?.id,
    workersCount: workers.length,
  });

  if (activeSection === 'inicio') {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <EmpresaDashboardSection
          user={user}
          company={company}
          workers={workers}
          onChangeSection={onChangeSection}
        />
      </div>
    );
  }

  if (activeSection === 'trabajadores' && selectedWorker) {
    return (
      <PlanGate user={user} feature="Documentos">
      <div className="p-6 max-w-5xl mx-auto">

        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={closeWorkerProfile}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
          >
            ← Volver a trabajadores
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-medium text-xl">
                {selectedWorker.nombre.charAt(0)}
                {selectedWorker.apellido.charAt(0)}
              </span>
            </div>
            <div className="flex-1">
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '1.5rem',
                  color: '#091f34',
                  fontWeight: 500,
                }}
              >
                {selectedWorker.nombre} {selectedWorker.apellido}
              </h2>
              <p className="text-gray-600">{selectedWorker.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-block px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                  {selectedWorker.rol === 'usuario'
                    ? 'Trabajador'
                    : selectedWorker.rol}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="p-4 bg-gray-50 rounded-lg">
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}
              >
                Nombre
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.95rem',
                  color: '#1a1a2e',
                  fontWeight: 500,
                }}
              >
                {selectedWorker.nombre}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}
              >
                Apellido
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.95rem',
                  color: '#1a1a2e',
                  fontWeight: 500,
                }}
              >
                {selectedWorker.apellido}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}
              >
                Correo Electrónico
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.95rem',
                  color: '#1a1a2e',
                  fontWeight: 500,
                }}
              >
                {selectedWorker.email}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}
              >
                Rol
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.95rem',
                  color: '#1a1a2e',
                  fontWeight: 500,
                }}
              >
                {selectedWorker.rol === 'usuario'
                  ? 'Trabajador'
                  : selectedWorker.rol}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg md:col-span-2">
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}
              >
                Empresa Asignada
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.95rem',
                  color: '#1a1a2e',
                  fontWeight: 500,
                }}
              >
                {company?.nombre || 'No asignada'}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg md:col-span-2">
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}
              >
                Asignado desde
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.95rem',
                  color: '#1a1a2e',
                  fontWeight: 500,
                }}
              >
                {formatDate(selectedWorker.createdAt)}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg md:col-span-2">
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}
              >
                ID de Usuario
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.85rem',
                  color: '#6b7280',
                  wordBreak: 'break-all',
                }}
              >
                {selectedWorker.id}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '1rem',
                color: '#091f34',
                fontWeight: 600,
              }}
            >
              Documentos de {selectedWorker.nombre}
            </h3>
            <span className="text-sm text-gray-500">
              {workerDocs.length} documento{workerDocs.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-500">Cargando documentos...</p>
              </div>
            ) : workerDocs.length === 0 ? (
              <div className="text-center py-8">
                <FileText size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No hay documentos</p>
                <p className="text-sm text-gray-400 mt-1">
                  Este trabajador no tiene documentos asignados
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {workerDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: `${TIPO_COLORS[doc.tipo]}15`,
                          color: TIPO_COLORS[doc.tipo],
                        }}
                      >
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {doc.nombre}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatSize(doc.size)} • {formatDate(doc.fecha)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">

                      <button
                        onClick={() => setTrackingDocId(doc.id)}
                        className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                        title="Ver quién ha visto este documento"
                      >
                        <BarChart3 size={16} />
                        Ver quién lo vio
                      </button>
                      <button
                        onClick={() => viewWorkerDoc(doc)}
                        className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2"
                        title="Ver documento"
                      >
                        <Eye size={16} />
                        Ver
                      </button>
                      <button
                        onClick={() => downloadWorkerDoc(doc)}
                        className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                        title="Descargar documento"
                      >
                        <Download size={16} />
                        Descargar
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                        title="Eliminar documento"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => onChangeSection?.('upload')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Upload size={20} />
            Subir documento para {selectedWorker.nombre}
          </button>
        </div>

        <DocumentTrackingModal
          documentId={trackingDocId}
          onClose={() => setTrackingDocId(null)}
        />
      </div>
      </PlanGate>
    );
  }

  if (activeSection === 'trabajadores') {

    const filteredWorkers = workers.filter(
      (worker) =>
        searchTerm === '' ||
        `${worker.nombre} ${worker.apellido}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        worker.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const reportRows = filteredWorkers.length ? filteredWorkers : workers;
    const empresaNombre = company?.nombre || 'empresa';

    const workerCols: ReportColumn<Worker>[] = [
      { header: 'N°', accessor: (w) => reportRows.indexOf(w) + 1 },
      { header: 'Nombre', accessor: (w) => w.nombre },
      { header: 'Apellido', accessor: (w) => w.apellido },
      { header: 'RUT', accessor: (w) => w.rut || '—' },
      { header: 'Email', accessor: (w) => w.email },
      { header: 'Rol', accessor: (w) => w.rol || '—' },
      {
        header: 'Fecha de registro',
        accessor: (w) =>
          w.createdAt
            ? new Date(w.createdAt).toLocaleDateString('es-CL')
            : '—',
      },
    ];

    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.2rem',
                color: '#091f34',
              }}
            >
              Mis Trabajadores
            </h2>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.82rem',
                color: '#6b7280',
              }}
            >
              Gestiona los trabajadores asignados a tu empresa
            </p>
          </div>
          {workers.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  exportToXLSX(
                    reportRows,
                    workerCols,
                    `Trabajadores_${empresaNombre}`,
                    'Trabajadores',
                    `Trabajadores · ${empresaNombre}`
                  )
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
              >
                <Download size={15} /> Excel
              </button>
              <button
                onClick={() =>
                  exportToPDF(
                    `Trabajadores · ${empresaNombre}`,
                    workerCols,
                    reportRows
                  )
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-700 bg-red-50 hover:bg-red-100"
              >
                <FileText size={15} /> PDF
              </button>
            </div>
          )}
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar trabajador por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem' }}
            />
          </div>
          {searchTerm && (
            <p className="mt-2 text-sm text-gray-500">
              {filteredWorkers.length} trabajador
              {filteredWorkers.length !== 1 ? 'es' : ''} encontrado
              {filteredWorkers.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {workers.length === 0 ? (
          <div className="text-center py-12 border border-gray-200 rounded-lg bg-gray-50">
            <Users size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay trabajadores asignados
            </h3>
            <p className="text-gray-500 mb-4">
              Los trabajadores aparecerán aquí cuando sean asignados a tu
              empresa por el administrador
            </p>
            <p className="text-sm text-gray-400">
              Contacta a tu administrador para asignar trabajadores
            </p>
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
            <Search size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">
              No se encontraron trabajadores con "{searchTerm}"
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredWorkers.map((worker) => (
              <div
                key={worker.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => loadWorkerDocs(worker)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {worker.nombre.charAt(0)}
                          {worker.apellido.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {worker.nombre} {worker.apellido}
                        </h4>
                        <p className="text-sm text-gray-600">{worker.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {worker.rol === 'usuario' ? 'Trabajador' : worker.rol}
                      </span>
                      <span className="text-xs text-gray-500">
                        ID: {worker.id}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Click en Ver Documentos:', worker);
                          loadWorkerDocs(worker);
                        }}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 hover:border-blue-300 transition-colors"
                      >
                        Ver Documentos
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (activeSection === 'upload' && selectedWorker) {
    return (
      <PlanGate user={user} feature="Documentos">
        <EnterpriseDocumentView selectedWorkerId={selectedWorker.id} />
      </PlanGate>
    );
  }

  if (activeSection === 'documentos') {

    return (
      <PlanGate user={user} feature="Documentos">
        <EnterpriseDocumentView selectedWorkerId={undefined} />
      </PlanGate>
    );
  }

  if (selectedWorker && (activeSection === 'trabajadores' || activeSection === 'upload')) {
    return (
      <PlanGate user={user} feature="Documentos">
      <div className="p-6 max-w-5xl mx-auto">

        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={closeWorkerProfile}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
          >
            ← Volver a trabajadores
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-medium text-xl">
                {selectedWorker.nombre.charAt(0)}
                {selectedWorker.apellido.charAt(0)}
              </span>
            </div>
            <div className="flex-1">
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '1.5rem',
                  color: '#091f34',
                  fontWeight: 500,
                }}
              >
                {selectedWorker.nombre} {selectedWorker.apellido}
              </h2>
              <p className="text-gray-600 mb-2">{selectedWorker.email}</p>
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-block px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                  {selectedWorker.rol === 'usuario'
                    ? 'Trabajador'
                    : selectedWorker.rol}
                </span>
                <span className="text-xs text-gray-500">
                  ID: {selectedWorker.id}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Asignado desde: {formatDate(selectedWorker.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '1rem',
                color: '#091f34',
                fontWeight: 600,
              }}
            >
              Documentos de {selectedWorker.nombre}
            </h3>
            <span className="text-sm text-gray-500">
              {workerDocs.length} documento{workerDocs.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-500">Cargando documentos...</p>
              </div>
            ) : workerDocs.length === 0 ? (
              <div className="text-center py-8">
                <FileText size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No hay documentos</p>
                <p className="text-sm text-gray-400 mt-1">
                  Este trabajador no tiene documentos asignados
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {workerDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: `${TIPO_COLORS[doc.tipo]}15`,
                          color: TIPO_COLORS[doc.tipo],
                        }}
                      >
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {doc.nombre}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatSize(doc.size)} • {formatDate(doc.fecha)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">

                      <button
                        onClick={() => setTrackingDocId(doc.id)}
                        className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                        title="Ver quién ha visto este documento"
                      >
                        <BarChart3 size={16} />
                        Ver quién lo vio
                      </button>
                      <button
                        onClick={() => viewWorkerDoc(doc)}
                        className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2"
                        title="Ver documento"
                      >
                        <Eye size={16} />
                        Ver
                      </button>
                      <button
                        onClick={() => downloadWorkerDoc(doc)}
                        className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                        title="Descargar documento"
                      >
                        <Download size={16} />
                        Descargar
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                        title="Eliminar documento"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => onChangeSection?.('upload')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Upload size={20} />
            Subir documento para {selectedWorker.nombre}
          </button>
        </div>

        <DocumentTrackingModal
          documentId={trackingDocId}
          onClose={() => setTrackingDocId(null)}
        />
      </div>
      </PlanGate>
    );
  }

  if (activeSection === 'mensajes') {
    return (
      <PlanGate user={user} feature="Mensajes">
        <div className="p-6 h-[calc(100vh-100px)]">
          <MessageCenter
            currentUserId={user?.id || ''}
            currentUserRole={user?.rol || 'empresa'}
            currentUserName={`${user?.nombre || ''} ${user?.apellido || ''}`}
            allowedRoles={['admin', 'usuario']}
            empresaId={company?.id}
          />
        </div>
      </PlanGate>
    );
  }

  if (activeSection === 'avisos') {
    return (
      <EmpresaNotesEditor empresaId={company?.id || user.empresaId || ''} />
    );
  }

  if (activeSection === 'perfil') {
    return <EmpresaPerfilSection user={user} />;
  }

  if (activeSection === 'empleados') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <EmpleadosManager empresaId={company?.id || user.empresaId || ''} />
      </div>
    );
  }

  if (activeSection === 'suscripcion') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <SubscriptionManager empresaId={company?.id || user.empresaId || ''} />
      </div>
    );
  }

  if (activeSection === 'estadisticas') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Estadísticas de Documentos
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Ve quién ha visto y descargado tus documentos compartidos
          </p>
        </div>
        <DocumentTrackingPanel />
      </div>
    );
  }

  if (activeSection === 'chatbot') {
    return <ChatbotIA user={user} />;
  }

  return (
    <EmpresaDashboardSection
      user={user}
      company={company}
      workers={workers}
      onChangeSection={onChangeSection}
    />
  );
}
