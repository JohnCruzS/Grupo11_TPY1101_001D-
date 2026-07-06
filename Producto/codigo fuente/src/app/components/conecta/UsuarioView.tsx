import { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Upload,
  User,
  Mail,
  Building2,
  Shield,
  Edit3,
  Camera,
  Key,
  Bell,
  Save,
  X,
  Lock,
  FolderOpen,
  Folder,
  FolderPlus,
  ChevronLeft,
  Search,
  Trash2,
} from 'lucide-react';
import { useAuth, getSupabase } from '../../context/AuthContext';
import { ChatbotIA } from './ChatbotIA';
import { DocumentUpload } from './DocumentUpload';
import { SecureDocumentView } from './SecureDocumentView';
import { MessageCenter } from './MessageCenter';
import { PlanGate } from './PlanGate';
import { useDocFolders, type DocFolder } from '../../hooks/useDocFolders';
import { DocFolderBar } from './DocFolderBar';

interface Doc {
  id: string;
  nombre: string;
  tipo: string;
  fecha: string;
  size: number;
  mimeType: string;
  storage_path: string;
  uploaded_by?: string;
  uploaded_by_name?: string;
  enterprise_id?: string;
}

const TIPO_COLORS: Record<string, string> = {
  contrato: '#3b82f6',
  liquidacion: '#10b981',
  finiquito: '#f59e0b',
  anexo: '#8b5cf6',
  documento: '#6b7280',
};

const TIPO_LABELS: Record<string, string> = {
  contrato: 'Contrato',
  liquidacion: 'Liquidación',
  finiquito: 'Finiquito',
  anexo: 'Anexo',
  documento: 'Documento',
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface Props {
  user: any;
  activeSection: string;
  onChangeSection?: (section: string) => void;
}

export function UsuarioView({ user, activeSection, onChangeSection }: Props) {
  const { user: authUser } = useAuth();
  const supabase = getSupabase();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [companyName, setCompanyName] = useState<string>('');
  const [viewedDocIds, setViewedDocIds] = useState<Set<string>>(new Set());

  const docFolders = useDocFolders(user?.id);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');

  const [activeDocFolder, setActiveDocFolder] = useState<string | null>(null);
  const [activeFolderLabel, setActiveFolderLabel] = useState('');
  const [docSearch, setDocSearch] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const loadDocs = async () => {
    if (activeSection !== 'documentos' && activeSection !== 'inicio') return;
    setLoading(true);

    try {

      const query = supabase
        .from('documents')
        .select('*')
        .or(`user_id.eq.${user.id},uploaded_by.eq.${user.id}`);

      const { data, error: docsError } = await query.order('uploaded_at', {
        ascending: false,
      });

      if (docsError) {
        console.error('Error cargando documentos:', docsError);
        setDocs([]);
      } else {

        const categoryMap: Record<string, string> = {
          contract: 'contrato',
          payroll: 'liquidacion',
          termination: 'finiquito',
          annex: 'anexo',
          legal: 'legal',
          other: 'otro',
        };

        const transformedDocs: Doc[] = (data || []).map((d: any) => ({
          id: d.id,
          nombre: d.original_name || d.filename,
          tipo: categoryMap[d.file_category] || d.file_category || 'documento',
          fecha: d.uploaded_at,
          size: d.file_size || 0,
          mimeType: d.mime_type || 'application/pdf',
          storage_path: d.storage_path,
          uploaded_by: d.uploaded_by,
          uploaded_by_name: d.uploaded_by_name,
          enterprise_id: d.enterprise_id,
        }));
        setDocs(transformedDocs);
      }
      setError('');
    } catch (err) {
      console.error('Error:', err);
      setDocs([]);
      setError('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, [user.id, user.empresaId, activeSection]);

  useEffect(() => {
    const loadViewHistory = async () => {
      const { data } = await supabase
        .from('document_views')
        .select('document_id')
        .eq('viewer_id', user.id);
      if (data) {
        setViewedDocIds(new Set(data.map((v: any) => v.document_id)));
      }
    };
    loadViewHistory();
  }, [user.id]);

  const unreadCount = docs.filter((d) => !viewedDocIds.has(d.id)).length;
  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) SotLoy Conecta` : 'SotLoy Conecta';
    return () => { document.title = 'SotLoy Conecta'; };
  }, [unreadCount]);

  const handleDocViewed = (docId: string) => {
    setViewedDocIds((prev) => new Set([...prev, docId]));
  };

  useEffect(() => {
    const loadCompanyName = async () => {
      if (!user.empresaId) {
        setCompanyName('');
        return;
      }
      try {
        const { data, error } = await supabase
          .from('enterprises')
          .select('name')
          .eq('id', user.empresaId)
          .single();

        if (data && !error) {
          setCompanyName(data.name);
        } else {
          setCompanyName(user.empresa || 'Empresa registrada');
        }
      } catch (err) {
        setCompanyName(user.empresa || 'Empresa registrada');
      }
    };

    loadCompanyName();
  }, [user.empresaId, user.empresa]);

  if (activeSection === 'chatbot') return <ChatbotIA user={user} />;

  if (activeSection === 'mensajes') {
    if (!user.empresaId) {
      return (
        <div className="p-6 max-w-3xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 flex items-start gap-3">
            <AlertCircle size={20} color="#d97706" style={{ marginTop: 2, flexShrink: 0 }} />
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: '#92400e' }}>
              Aún no estás asignado a ninguna empresa, por lo que no puedes enviar
              mensajes. Contacta a tu empleador o a SotLoy.
            </p>
          </div>
        </div>
      );
    }
    return (
      <PlanGate user={user} feature="Mensajes">
        <div className="p-6 h-[calc(100vh-100px)]">
          <MessageCenter
            currentUserId={user?.id || ''}
            currentUserRole={user?.rol || 'usuario'}
            currentUserName={`${user?.nombre || ''} ${user?.apellido || ''}`}
            allowedRoles={['empresa']}
            empresaId={user.empresaId}
          />
        </div>
      </PlanGate>
    );
  }

  if (activeSection === 'perfil') {
    return <UserProfileView user={user} companyName={companyName} />;
  }

  if (activeSection === 'inicio') {
    return (
      <div className="p-6 max-w-4xl mx-auto">

        <div
          className="mb-6 p-6 rounded-lg"
          style={{
            background: 'linear-gradient(135deg, #091f34 0%, #1e3a5f 100%)',
          }}
        >
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              color: 'white',
              fontSize: '1.3rem',
              fontWeight: 500,
              marginBottom: '6px',
            }}
          >
            Bienvenido, {user.nombre} 👋
          </h2>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              color: 'rgba(255,255,255,0.65)',
              fontSize: '0.82rem',
            }}
          >
            Aquí puedes ver tus documentos laborales y consultar al asistente
            IA.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: 'Total documentos',
              value: docs.length,
              icon: <FileText size={20} />,
              color: '#091f34',
            },
            {
              label: 'Sin leer',
              value: unreadCount,
              icon: <Bell size={20} />,
              color: unreadCount > 0 ? '#ef4444' : '#9ca3af',
            },
            {
              label: 'Contratos',
              value: docs.filter((d) => d.tipo === 'contrato').length,
              icon: <CheckCircle2 size={20} />,
              color: '#3b82f6',
            },
            {
              label: 'Liquidaciones',
              value: docs.filter((d) => d.tipo === 'liquidacion').length,
              icon: <Clock size={20} />,
              color: '#10b981',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-lg p-4 flex items-center gap-4 shadow-sm border border-gray-100"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: `${stat.color}15`,
                  color: stat.color,
                }}
              >
                {stat.icon}
              </div>
              <div>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '1.4rem',
                    color: '#091f34',
                    fontWeight: 700,
                  }}
                >
                  {loading ? '–' : stat.value}
                </p>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.74rem',
                    color: '#9ca3af',
                  }}
                >
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.9rem',
                color: '#091f34',
                fontWeight: 600,
              }}
            >
              Documentos recientes
            </h3>
          </div>
          <DocList
            docs={docs.slice(0, 3)}
            loading={loading}
            error={error}
            compact
            onDocViewed={handleDocViewed}
          />
        </div>

        <div
          className="mt-4 p-4 rounded-lg flex items-center gap-4 cursor-pointer border"
          style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}
          onClick={() => onChangeSection?.('chatbot')}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#091f34' }}
          >
            <Sparkles size={18} color="#fff" />
          </div>
          <div>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.85rem',
                color: '#091f34',
                fontWeight: 600,
              }}
            >
              Consulta al Asistente Legal IA
            </p>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.76rem',
                color: '#3b82f6',
              }}
            >
              Pregunta sobre contratos, remuneraciones, vacaciones y más →
            </p>
          </div>
        </div>
      </div>
    );
  }

  const FIXED_DOC_FOLDERS = [
    { value: 'contrato',   label: 'Contratos',         color: '#3b82f6' },
    { value: 'liquidacion',label: 'Liquidaciones',      color: '#10b981' },
    { value: 'finiquito',  label: 'Finiquitos',         color: '#f59e0b' },
    { value: 'anexo',      label: 'Anexos',             color: '#8b5cf6' },
    { value: 'legal',      label: 'Documentos Legales', color: '#6366f1' },
    { value: 'otro',       label: 'Otros',              color: '#6b7280' },
  ];

  const FOLDER_COLOR: Record<string, string> = {
    contrato: '#3b82f6', liquidacion: '#10b981', finiquito: '#f59e0b',
    anexo: '#8b5cf6', legal: '#6366f1', otro: '#6b7280', documento: '#6b7280',
  };

  const { folders: customFolders, assignments } = docFolders;

  const docsInFixed = (tipo: string) => docs.filter((d) => {
    if (tipo === 'otro') return d.tipo === 'otro' || d.tipo === 'documento' || !FOLDER_COLOR[d.tipo];
    return d.tipo === tipo;
  });

  const docsInCustom = (folderId: string) =>
    docs.filter((d) => assignments[d.id] === folderId);

  const activeDocs = (() => {
    if (!activeDocFolder) return [];
    const base = activeDocFolder.startsWith('custom__')
      ? docsInCustom(activeDocFolder.replace('custom__', ''))
      : docsInFixed(activeDocFolder);
    if (!docSearch.trim()) return base;
    const q = docSearch.toLowerCase();
    return base.filter((d) => d.nombre.toLowerCase().includes(q));
  })();

  const folderColor = (v: string) => FOLDER_COLOR[v] ?? '#0891b2';

  return (
    <PlanGate user={user} feature="Documentos">
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {activeDocFolder && (
              <button
                onClick={() => { setActiveDocFolder(null); setActiveFolderLabel(''); setDocSearch(''); }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
              >
                <ChevronLeft size={16} />
                Carpetas
              </button>
            )}
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.2rem', color: '#091f34', fontWeight: 600 }}>
              {activeDocFolder ? (
                <span className="flex items-center gap-2">
                  <FolderOpen size={20} color={folderColor(activeDocFolder.replace('custom__', ''))} />
                  {activeFolderLabel}
                </span>
              ) : 'Mis documentos'}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">

            {!activeDocFolder && (
              <button
                onClick={() => setShowNewFolder(!showNewFolder)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  borderColor: showNewFolder ? '#3b82f6' : '#d1d5db',
                  color: showNewFolder ? '#3b82f6' : '#374151',
                  backgroundColor: showNewFolder ? '#eff6ff' : 'white',
                  fontWeight: 500,
                }}
              >
                <FolderPlus size={15} />
                Nueva carpeta
              </button>
            )}

            {user.empresaId && (
              <button
                onClick={() => setShowUpload(!showUpload)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', fontWeight: 500 }}
              >
                <Upload size={16} />
                {showUpload ? 'Cancelar' : 'Enviar documento'}
              </button>
            )}
          </div>
        </div>

        {showNewFolder && (
          <div className="mb-5 p-4 bg-blue-50 rounded-lg border border-blue-100 flex items-center gap-3 flex-wrap">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFolderName.trim()) {
                  docFolders.addFolder(newFolderName.trim());
                  setNewFolderName('');
                  setShowNewFolder(false);
                }
              }}
              placeholder="Nombre de la carpeta..."
              maxLength={40}
              className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-md text-sm"
              style={{ fontFamily: "'Inter', sans-serif" }}
              autoFocus
            />
            <button
              onClick={() => {
                if (newFolderName.trim()) {
                  docFolders.addFolder(newFolderName.trim());
                  setNewFolderName('');
                  setShowNewFolder(false);
                }
              }}
              disabled={!newFolderName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-40 hover:bg-blue-700 transition-colors"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
            >
              Crear
            </button>
            <button
              onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}
              className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
            >
              Cancelar
            </button>
          </div>
        )}

        {showUpload && user.empresaId && (
          <div className="mb-5">
            <DocumentUpload
              empresaId={user.empresaId}
              allowSendToAdmin={false}
              onUploadComplete={() => { setShowUpload(false); loadDocs(); }}
            />
          </div>
        )}

        {!activeDocFolder && (
          <>
            {loading ? (
              <div className="py-16 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', color: '#9ca3af' }}>
                  Cargando documentos...
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">

                {FIXED_DOC_FOLDERS.map((folder) => {
                  const count = docsInFixed(folder.value).length;
                  return (
                    <div
                      key={folder.value}
                      className="group rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md"
                      style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}
                      onClick={() => { setActiveDocFolder(folder.value); setActiveFolderLabel(folder.label); }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = folder.color;
                        (e.currentTarget as HTMLDivElement).style.backgroundColor = `${folder.color}08`;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = '#e5e7eb';
                        (e.currentTarget as HTMLDivElement).style.backgroundColor = '#fafafa';
                      }}
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${folder.color}18` }}>
                        <FolderOpen size={24} color={folder.color} />
                      </div>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.88rem', fontWeight: 600, color: '#1f2937', marginBottom: '4px' }}>
                        {folder.label}
                      </p>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: count > 0 ? folder.color : '#9ca3af', fontWeight: count > 0 ? 600 : 400 }}>
                        {count === 0 ? 'Sin documentos' : `${count} documento${count !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  );
                })}

                {customFolders.map((folder) => {
                  const count = docsInCustom(folder.id).length;
                  return (
                    <div
                      key={folder.id}
                      className="group relative rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md"
                      style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}
                      onClick={() => { setActiveDocFolder(`custom__${folder.id}`); setActiveFolderLabel(folder.name); }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = '#0891b2';
                        (e.currentTarget as HTMLDivElement).style.backgroundColor = '#0891b208';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = '#e5e7eb';
                        (e.currentTarget as HTMLDivElement).style.backgroundColor = '#fafafa';
                      }}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); docFolders.deleteFolder(folder.id); }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
                        title="Eliminar carpeta"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                      >
                        <Trash2 size={13} />
                      </button>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: '#0891b218' }}>
                        <Folder size={24} color="#0891b2" />
                      </div>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.88rem', fontWeight: 600, color: '#1f2937', marginBottom: '4px' }}>
                        {folder.name}
                      </p>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: count > 0 ? '#0891b2' : '#9ca3af', fontWeight: count > 0 ? 600 : 400 }}>
                        {count === 0 ? 'Sin documentos' : `${count} documento${count !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeDocFolder && (
          <>

            <div className="mb-4 relative">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                placeholder="Buscar por nombre..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
            </div>

            <div className="bg-white rounded-lg border border-gray-100">
              <div className="px-5 py-3 border-b border-gray-50">
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#6b7280' }}>
                  {activeDocs.length} documento{activeDocs.length !== 1 ? 's' : ''}
                  {activeDocFolder.startsWith('custom__') && (
                    <span className="ml-3 text-xs text-blue-500">
                      Carpeta personalizada · Para añadir documentos, asígnalos desde la lista
                    </span>
                  )}
                </p>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', color: '#9ca3af' }}>Cargando...</p>
                </div>
              ) : activeDocs.length === 0 ? (
                <div className="p-12 text-center">
                  <FolderOpen size={40} color="#d1d5db" className="mx-auto mb-3" />
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.88rem', color: '#9ca3af', fontWeight: 500 }}>
                    Esta carpeta está vacía
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {activeDocs.map((doc) => (
                    <div key={doc.id}>
                      {doc.storage_path ? (
                        <SecureDocumentView
                          document={{
                            id: doc.id,
                            original_name: doc.nombre,
                            storage_path: doc.storage_path,
                            file_category: doc.tipo,
                            file_size: doc.size,
                            uploaded_at: doc.fecha,
                            uploaded_by: doc.uploaded_by,
                            uploaded_by_name: doc.uploaded_by_name || 'Empresa',
                            enterprise_id: doc.enterprise_id,
                          }}
                          viewerEnterpriseId={authUser?.empresaId || ''}
                          onView={() => handleDocViewed(doc.id)}
                        />
                      ) : (
                        <div className="flex items-center gap-4 px-5 py-4">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${FOLDER_COLOR[doc.tipo] || '#6b7280'}15` }}>
                            <FileText size={16} color={FOLDER_COLOR[doc.tipo] || '#6b7280'} />
                          </div>
                          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#374151' }}>{doc.nombre}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
    </PlanGate>
  );
}

function DocList({
  docs,
  loading,
  error,
  compact,
  user,
  onDocViewed,
  folders,
  assignments,
  onAssignFolder,
}: {
  docs: Doc[];
  loading: boolean;
  error: string;
  compact?: boolean;
  user?: any;
  onDocViewed?: (docId: string) => void;
  folders?: DocFolder[];
  assignments?: Record<string, string>;
  onAssignFolder?: (docId: string, folderId: string | null) => void;
}) {
  if (loading)
    return (
      <div className="p-8 text-center">
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.82rem',
            color: '#9ca3af',
          }}
        >
          Cargando documentos...
        </p>
      </div>
    );
  if (error)
    return (
      <div className="p-6 flex items-center gap-2" style={{ color: '#ef4444' }}>
        <AlertCircle size={16} />
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.82rem' }}>
          {error}
        </p>
      </div>
    );
  if (!docs.length)
    return (
      <div className="p-8 text-center">
        <FileText size={32} color="#d1d5db" className="mx-auto mb-2" />
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.82rem',
            color: '#9ca3af',
          }}
        >
          No hay documentos disponibles.
        </p>
      </div>
    );
  return (
    <div
      className={
        compact
          ? ''
          : 'bg-white rounded-lg shadow-sm border border-gray-100 divide-y divide-gray-100'
      }
    >
      {docs.map((doc) => (
        <div key={doc.id}>
          {doc.storage_path ? (
            <SecureDocumentView
              document={{
                id: doc.id,
                original_name: doc.nombre,
                storage_path: doc.storage_path,
                file_category: doc.tipo,
                file_size: doc.size,
                uploaded_at: doc.fecha,
                uploaded_by: doc.uploaded_by,
                uploaded_by_name: doc.uploaded_by_name || 'Empresa',
                enterprise_id: doc.enterprise_id,
              }}
              viewerEnterpriseId={user?.empresaId || user?.enterprise_id || ''}
              onView={() => onDocViewed?.(doc.id)}
            />
          ) : (
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: `${TIPO_COLORS[doc.tipo] || '#6b7280'}15`,
                  }}
                >
                  <FileText
                    size={16}
                    color={TIPO_COLORS[doc.tipo] || '#6b7280'}
                  />
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.83rem',
                      color: '#1a1a2e',
                      fontWeight: 500,
                    }}
                  >
                    {doc.nombre}
                  </p>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.72rem',
                      color: '#9ca3af',
                    }}
                  >
                    {formatDate(doc.fecha)} · {formatSize(doc.size)}
                  </p>
                </div>
              </div>
              <span
                className="px-2.5 py-0.5 rounded-full text-xs"
                style={{
                  backgroundColor: `${TIPO_COLORS[doc.tipo] || '#6b7280'}15`,
                  color: TIPO_COLORS[doc.tipo] || '#6b7280',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.68rem',
                  fontWeight: 600,
                }}
              >
                {TIPO_LABELS[doc.tipo] || 'Doc'}
              </span>
            </div>
          )}

          {folders && onAssignFolder && !compact && (
            <div className="px-5 pb-3 flex items-center gap-2">
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.72rem',
                  color: '#9ca3af',
                }}
              >
                Carpeta:
              </span>
              <select
                value={assignments?.[doc.id] || ''}
                onChange={(e) =>
                  onAssignFolder(doc.id, e.target.value || null)
                }
                className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 bg-white"
              >
                <option value="">Sin carpeta</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface UserProfileViewProps {
  user: any;
  companyName: string;
}

function UserProfileView({ user, companyName }: UserProfileViewProps) {
  const supabase = getSupabase();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    nombre: user.nombre || '',
    apellido: user.apellido || '',
    telefono: user.telefono || '',
    emailNotifications: true,
    documentAlerts: true,
    marketingEmails: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('kv_store_7d36b31f')
        .select('value')
        .eq('key', `slc_user:${user.id}`)
        .maybeSingle();

      if (cancelled || error || !data?.value) return;
      const prefs = data.value.preferences;
      if (prefs) {
        setFormData((prev) => ({
          ...prev,
          emailNotifications: prefs.emailNotifications ?? true,
          documentAlerts: prefs.documentAlerts ?? true,
          marketingEmails: prefs.marketingEmails ?? false,
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, user.id]);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);

    try {

      const { data: current, error: readError } = await supabase
        .from('kv_store_7d36b31f')
        .select('value')
        .eq('key', `slc_user:${user.id}`)
        .maybeSingle();

      if (readError) throw readError;

      const existingValue = current?.value || {};

      const { error } = await supabase
        .from('kv_store_7d36b31f')
        .update({
          value: {
            ...existingValue,

            telefono: formData.telefono,
            preferences: {
              ...(existingValue.preferences || {}),
              emailNotifications: formData.emailNotifications,
              documentAlerts: formData.documentAlerts,
              marketingEmails: formData.marketingEmails,
            },
          },
        })
        .eq('key', `slc_user:${user.id}`);

      if (error) throw error;

      await supabase.functions.invoke('audit-log', {
        body: {
          action: 'USER_UPDATE',
          resourceType: 'user',
          resourceId: user.id,
          success: true,
          metadata: {
            fields: ['telefono', 'preferences'],
          },
        },
      });

      setMessage({ type: 'success', text: 'Perfil actualizado correctamente' });
      setIsEditing(false);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Error al actualizar perfil',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setMessage({
        type: 'error',
        text: 'La contraseña debe tener al menos 8 caracteres',
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Contraseña actualizada correctamente',
      });
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Error al cambiar contraseña',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">

      <div className="flex items-center justify-between mb-6">
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.5rem',
            color: '#091f34',
            fontWeight: 500,
          }}
        >
          👤 Mi Perfil
        </h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: isEditing ? '#6b7280' : '#3b82f6',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {isEditing ? <X size={16} /> : <Edit3 size={16} />}
          {isEditing ? 'Cancelar' : 'Editar Perfil'}
        </button>
      </div>

      {message && (
        <div
          className="mb-4 p-4 rounded-lg"
          style={{
            backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          }}
        >
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.9rem',
              color: message.type === 'success' ? '#15803d' : '#dc2626',
            }}
          >
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start gap-6 mb-6">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#eff6ff', border: '3px solid #bfdbfe' }}
          >
            <span className="text-blue-600 font-medium text-3xl">
              {formData.nombre?.charAt(0)}
              {formData.apellido?.charAt(0)}
            </span>
          </div>
          <div className="flex-1">
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.3rem',
                color: '#091f34',
                fontWeight: 500,
              }}
            >
              {formData.nombre} {formData.apellido}
            </h3>
            <p className="text-gray-500 mb-2">{user.email}</p>
            <span
              className="px-3 py-1 rounded-full text-xs"
              style={{
                backgroundColor:
                  user.rol === 'admin'
                    ? '#fffbeb'
                    : user.rol === 'empresa'
                      ? '#f0fdf4'
                      : '#eff6ff',
                color:
                  user.rol === 'admin'
                    ? '#d97706'
                    : user.rol === 'empresa'
                      ? '#15803d'
                      : '#3b82f6',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
              }}
            >
              {user.rol === 'usuario'
                ? '👷 Trabajador'
                : user.rol === 'empresa'
                  ? '🏢 Empresa'
                  : user.rol === 'admin'
                    ? '🛡️ Administrador'
                    : user.rol}
            </span>
          </div>
        </div>

        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.8rem',
                  color: '#6b7280',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Nombre <span style={{ color: '#9ca3af' }}>🔒 no editable</span>
              </label>
              <input
                type="text"
                value={formData.nombre}
                readOnly
                disabled
                title="Solo tu empresa puede modificar tu nombre"
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
            </div>
            <div>
              <label
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.8rem',
                  color: '#6b7280',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Apellido <span style={{ color: '#9ca3af' }}>🔒 no editable</span>
              </label>
              <input
                type="text"
                value={formData.apellido}
                readOnly
                disabled
                title="Solo tu empresa puede modificar tu apellido"
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
            </div>
            <div>
              <label
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.8rem',
                  color: '#6b7280',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) =>
                  setFormData({ ...formData, telefono: e.target.value })
                }
                placeholder="+56 9 1234 5678"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
            </div>
            <div className="md:col-span-2">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
                style={{
                  backgroundColor: saving ? '#9ca3af' : '#10b981',
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <Save size={16} />
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoCard
              icon={<User size={16} />}
              label="Nombre"
              value={formData.nombre}
            />
            <InfoCard
              icon={<User size={16} />}
              label="Apellido"
              value={formData.apellido}
            />
            <InfoCard
              icon={<Mail size={16} />}
              label="Email"
              value={user.email}
            />
            <InfoCard
              icon={<Shield size={16} />}
              label="Teléfono"
              value={formData.telefono || 'No especificado'}
            />
            {user.empresaId && (
              <InfoCard
                icon={<Building2 size={16} />}
                label="Empresa"
                value={companyName || user.empresa}
              />
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
        <h3
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '1rem',
            color: '#091f34',
            fontWeight: 600,
            marginBottom: '16px',
          }}
        >
          🔔 Preferencias de Notificación
        </h3>
        <div className="space-y-3">
          <ToggleOption
            icon={<Bell size={16} />}
            label="Notificaciones por email"
            description="Recibe notificaciones importantes en tu correo"
            checked={formData.emailNotifications}
            onChange={(v) =>
              setFormData({ ...formData, emailNotifications: v })
            }
            disabled={!isEditing}
          />
          <ToggleOption
            icon={<FileText size={16} />}
            label="Alertas de documentos"
            description="Notificarme cuando reciba nuevos documentos"
            checked={formData.documentAlerts}
            onChange={(v) => setFormData({ ...formData, documentAlerts: v })}
            disabled={!isEditing}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '1rem',
              color: '#091f34',
              fontWeight: 600,
            }}
          >
            🔐 Seguridad
          </h3>
          <button
            onClick={() => setIsChangingPassword(!isChangingPassword)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
            style={{
              backgroundColor: isChangingPassword ? '#fee2e2' : '#fef3c7',
              color: isChangingPassword ? '#dc2626' : '#d97706',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <Key size={14} />
            {isChangingPassword ? 'Cancelar' : 'Cambiar Contraseña'}
          </button>
        </div>

        {isChangingPassword && (
          <div className="space-y-3">
            <div>
              <label
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.8rem',
                  color: '#6b7280',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Nueva Contraseña
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    newPassword: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                style={{ fontFamily: "'Inter', sans-serif" }}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div>
              <label
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.8rem',
                  color: '#6b7280',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Confirmar Contraseña
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    confirmPassword: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                style={{ fontFamily: "'Inter', sans-serif" }}
                placeholder="Repite la contraseña"
              />
            </div>
            <button
              onClick={handleChangePassword}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
              style={{
                backgroundColor: saving ? '#9ca3af' : '#091f34',
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <Lock size={16} />
              {saving ? 'Actualizando...' : 'Actualizar Contraseña'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: '#6b7280' }}>{icon}</span>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.75rem',
            color: '#6b7280',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
      </div>
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.95rem',
          color: '#1a1a2e',
          fontWeight: 500,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function ToggleOption({
  icon,
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg ${disabled ? '' : 'hover:bg-gray-50'}`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
          style={{ color: '#6b7280' }}
        >
          {icon}
        </div>
        <div>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.9rem',
              color: '#1a1a2e',
              fontWeight: 500,
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
            {description}
          </p>
        </div>
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`w-12 h-6 rounded-full relative transition-colors ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        style={{
          backgroundColor: checked ? '#3b82f6' : '#d1d5db',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span
          className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
          style={{
            left: '4px',
            transform: checked ? 'translateX(24px)' : 'translateX(0)',
          }}
        />
      </button>
    </div>
  );
}
