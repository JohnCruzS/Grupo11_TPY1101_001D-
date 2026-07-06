import { useEffect, useState } from 'react';
import {
  FileText,
  Eye,
  Upload,
  Search,
  Filter,
  X,
  FolderOpen,
  FolderPlus,
  ChevronLeft,
  Trash2,
  Folder,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DocumentUpload } from './DocumentUpload';
import { SecureDocumentView } from './SecureDocumentView';
import { getSupabase } from '../../context/AuthContext';
import { toast } from 'sonner';

interface Doc {
  id: string;
  filename: string;
  original_name: string;
  file_type: string;
  file_category: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  storage_url: string | null;
  description: string;
  tags: string[];
  uploaded_at: string;
  user_name: string;
  user_email: string;
}

interface User {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: string;
}

interface CustomFolder {
  id: string;
  name: string;
}

const FIXED_FOLDERS = [
  { value: 'contract',    label: 'Contratos',          color: '#3b82f6' },
  { value: 'payroll',     label: 'Liquidaciones',       color: '#10b981' },
  { value: 'termination', label: 'Finiquitos',          color: '#f59e0b' },
  { value: 'annex',       label: 'Anexos',              color: '#8b5cf6' },
  { value: 'legal',       label: 'Documentos Legales',  color: '#6366f1' },
  { value: 'other',       label: 'Otros',               color: '#6b7280' },
];

const CATEGORY_COLORS: Record<string, string> = {
  contract: '#3b82f6',
  payroll: '#10b981',
  termination: '#f59e0b',
  annex: '#8b5cf6',
  legal: '#6366f1',
  other: '#6b7280',
};

interface Props {
  selectedWorkerId?: string;
}

export function EnterpriseDocumentView({ selectedWorkerId }: Props) {
  const { user } = useAuth();
  const supabase = getSupabase();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [empresaId, setEmpresaId] = useState<string>('');
  const [adminId, setAdminId] = useState<string>('');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [activeFolderLabel, setActiveFolderLabel] = useState('');
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [savingFolder, setSavingFolder] = useState(false);

  const getEmpresaId = async () => {
    let id = user?.empresaId;
    if (!id && user?.rol === 'empresa' && user?.email) {
      const { data } = await supabase
        .from('enterprises')
        .select('id')
        .eq('email', user.email)
        .single();
      if (data) id = data.id;
    }
    return id;
  };

  const loadCustomFolders = async (eid: string) => {
    const { data } = await supabase
      .from('kv_store_7d36b31f')
      .select('value')
      .eq('key', `slc_folders:${eid}`)
      .single();
    if (data?.value && Array.isArray(data.value)) {
      setCustomFolders(data.value as CustomFolder[]);
    }
  };

  const saveCustomFolders = async (folders: CustomFolder[]): Promise<boolean> => {
    const { error: saveErr } = await supabase
      .from('kv_store_7d36b31f')
      .upsert({ key: `slc_folders:${empresaId}`, value: folders }, { onConflict: 'key' });
    if (saveErr) {
      console.error('Error guardando carpetas:', saveErr);
      toast.error('No se pudieron guardar las carpetas. Intenta nuevamente.');
      return false;
    }
    setCustomFolders(folders);
    return true;
  };

  const handleAddFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setSavingFolder(true);
    const id = `cf_${Date.now()}`;
    const updated = [...customFolders, { id, name }];
    const ok = await saveCustomFolders(updated);
    setSavingFolder(false);
    if (!ok) return;
    setNewFolderName('');
    setShowNewFolder(false);
    toast.success(`Carpeta "${name}" creada`);
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    const docsInFolder = docs.filter(
      (d) => d.file_category === `custom__${folderId}`
    );
    if (docsInFolder.length > 0) {
      toast.error(
        `La carpeta "${folderName}" tiene ${docsInFolder.length} documento(s). Muéve o elimina los documentos primero.`
      );
      return;
    }
    const updated = customFolders.filter((f) => f.id !== folderId);
    const ok = await saveCustomFolders(updated);
    if (ok) toast.success(`Carpeta "${folderName}" eliminada`);
  };

  const changeDocFolder = async (docId: string, newCategory: string) => {
    const prev = docs;
    setDocs((ds) =>
      ds.map((d) => (d.id === docId ? { ...d, file_category: newCategory } : d))
    );
    const { error: updErr } = await supabase
      .from('documents')
      .update({ file_category: newCategory })
      .eq('id', docId);
    if (updErr) {
      setDocs(prev);
      toast.error('No se pudo cambiar la carpeta del documento');
    } else {
      toast.success('Documento movido de carpeta');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const resolvedEmpresaId = await getEmpresaId();
      if (!resolvedEmpresaId) {
        setDocs([]);
        setUsers([]);
        return;
      }
      setEmpresaId(resolvedEmpresaId);

      const { data: allProfiles } = await supabase
        .from('kv_store_7d36b31f')
        .select('key, value')
        .like('key', 'slc_user:%');

      const adminProfile = allProfiles?.find((p) => p.value?.rol === 'admin');
      if (adminProfile) {
        setAdminId(adminProfile.key.replace('slc_user:', ''));
      }

      const { data: assignments } = await supabase
        .from('user_enterprises')
        .select('user_id, role')
        .eq('enterprise_id', resolvedEmpresaId)
        .eq('is_active', true);

      let usersData: User[] = [];
      if (assignments) {
        const userIds = assignments.map((a) => a.user_id);
        const { data: workerProfiles } =
          userIds.length > 0
            ? await supabase
                .from('kv_store_7d36b31f')
                .select('key, value')
                .in('key', userIds.map((id) => `slc_user:${id}`))
            : { data: [] };

        usersData = (workerProfiles || [])
          .filter((p) => {
            const rol = p.value.rol;
            return rol !== 'empresa' && rol !== 'admin' && rol !== 'superadmin';
          })
          .map((p) => ({
            id: p.key.replace('slc_user:', ''),
            email: p.value.email,
            nombre: p.value.nombre,
            apellido: p.value.apellido,
            rol: p.value.rol,
          }));

        const adminUsers: User[] = (allProfiles || [])
          .filter((p) => p.value?.rol === 'admin')
          .map((p) => ({
            id: p.key.replace('slc_user:', ''),
            email: p.value.email,
            nombre: p.value.nombre,
            apellido: p.value.apellido,
            rol: 'admin',
          }));

        setUsers([...adminUsers, ...usersData]);
      }

      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('enterprise_id', resolvedEmpresaId)
        .order('uploaded_at', { ascending: false });

      if (docsError) console.error('Error cargando documentos:', docsError);

      const docsWithUserInfo = (documents || []).map((doc) => {
        const assignedUser = usersData.find((u) => u.id === doc.user_id);
        const uploaderWorker = !doc.user_id
          ? usersData.find((u) => u.id === doc.uploaded_by)
          : undefined;
        const relatedUser = assignedUser || uploaderWorker;
        return {
          id: doc.id,
          filename: doc.filename,
          original_name: doc.original_name,
          file_type: doc.file_type,
          file_category: doc.file_category || 'other',
          file_size: doc.file_size || 0,
          mime_type: doc.mime_type || '',
          storage_path: doc.storage_path,
          storage_url: null,
          description: doc.description || '',
          tags: doc.tags || [],
          uploaded_at: doc.uploaded_at,
          user_name: assignedUser
            ? `${assignedUser.nombre} ${assignedUser.apellido}`
            : uploaderWorker
              ? `${uploaderWorker.nombre} ${uploaderWorker.apellido} · subido por el trabajador`
              : 'Empresa General',
          user_email: relatedUser?.email || '',
        };
      });

      setDocs(docsWithUserInfo);
      await loadCustomFolders(resolvedEmpresaId);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setDocs([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUploadComplete = () => {
    setShowUpload(false);
    loadData();
  };

  const allFolders = [
    ...FIXED_FOLDERS.map((f) => ({ ...f, isCustom: false, customId: '' })),
    ...customFolders.map((f) => ({
      value: `custom__${f.id}`,
      label: f.name,
      color: '#0891b2',
      isCustom: true,
      customId: f.id,
    })),
  ];

  const extraCategories = customFolders.map((f) => ({
    value: `custom__${f.id}`,
    label: f.name,
  }));

  const docsInFolder = (folderValue: string) =>
    docs.filter((d) => d.file_category === folderValue);

  const filteredDocs = docs.filter((doc) => {
    if (activeFolder && doc.file_category !== activeFolder) return false;
    const matchesUser = selectedUser === 'all' || doc.user_email === selectedUser;
    const matchesSearch =
      doc.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const docDate = doc.uploaded_at.substring(0, 10);
    const matchesDateFrom = !dateFrom || docDate >= dateFrom;
    const matchesDateTo = !dateTo || docDate <= dateTo;
    return matchesUser && matchesSearch && matchesDateFrom && matchesDateTo;
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const folderColor = (value: string) =>
    CATEGORY_COLORS[value] ?? (value.startsWith('custom__') ? '#0891b2' : '#6b7280');

  const canManageFolders =
    user?.rol === 'empresa' || user?.rol === 'admin' || user?.rol === 'superadmin';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {activeFolder && (
              <button
                onClick={() => {
                  setActiveFolder(null);
                  setActiveFolderLabel('');
                  setShowUpload(false);
                  setSearchTerm('');
                  setSelectedUser('all');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
              >
                <ChevronLeft size={16} />
                Carpetas
              </button>
            )}
            <h2
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '1.2rem',
                color: '#091f34',
                fontWeight: 600,
              }}
            >
              {activeFolder ? (
                <span className="flex items-center gap-2">
                  <FolderOpen size={20} color={folderColor(activeFolder)} />
                  {activeFolderLabel}
                </span>
              ) : (
                'Documentos'
              )}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">

            {!activeFolder && canManageFolders && (
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

            {canManageFolders && (
              <button
                onClick={() => setShowUpload(!showUpload)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', fontWeight: 500 }}
              >
                <Upload size={16} />
                {showUpload ? 'Cancelar' : 'Subir documento'}
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
              onKeyDown={(e) => e.key === 'Enter' && handleAddFolder()}
              placeholder="Nombre de la carpeta..."
              maxLength={40}
              className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-md text-sm"
              style={{ fontFamily: "'Inter', sans-serif" }}
              autoFocus
            />
            <button
              onClick={handleAddFolder}
              disabled={!newFolderName.trim() || savingFolder}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-40 hover:bg-blue-700 transition-colors"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
            >
              {savingFolder ? 'Creando...' : 'Crear'}
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

        {showUpload && (
          <div className="mb-6">
            <DocumentUpload
              onUploadComplete={handleUploadComplete}
              workers={
                selectedWorkerId
                  ? users.filter((u) => u.id === selectedWorkerId).map((u) => ({
                      id: u.id, email: u.email, nombre: u.nombre, apellido: u.apellido, rol: u.rol || 'usuario',
                    }))
                  : users.map((u) => ({
                      id: u.id, email: u.email, nombre: u.nombre, apellido: u.apellido, rol: u.rol || 'usuario',
                    }))
              }
              empresaId={empresaId}
              preSelectedWorkerId={selectedWorkerId}
              adminId={adminId}
              allowSendToAdmin={true}
              preSelectedCategory={activeFolder ?? undefined}
              extraCategories={extraCategories}
            />
          </div>
        )}

        {!activeFolder && (
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
                {allFolders.map((folder) => {
                  const count = docsInFolder(folder.value).length;
                  return (
                    <div
                      key={folder.value}
                      className="group relative rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md"
                      style={{
                        borderColor: '#e5e7eb',
                        backgroundColor: '#fafafa',
                      }}
                      onClick={() => {
                        setActiveFolder(folder.value);
                        setActiveFolderLabel(folder.label);
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = folder.color;
                        (e.currentTarget as HTMLDivElement).style.backgroundColor = `${folder.color}08`;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = '#e5e7eb';
                        (e.currentTarget as HTMLDivElement).style.backgroundColor = '#fafafa';
                      }}
                    >

                      {folder.isCustom && canManageFolders && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.customId, folder.label);
                          }}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
                          title="Eliminar carpeta"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}

                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                        style={{ backgroundColor: `${folder.color}18` }}
                      >
                        {folder.isCustom
                          ? <Folder size={24} color={folder.color} />
                          : <FolderOpen size={24} color={folder.color} />
                        }
                      </div>

                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          color: '#1f2937',
                          marginBottom: '4px',
                        }}
                      >
                        {folder.label}
                      </p>
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.75rem',
                          color: count > 0 ? folder.color : '#9ca3af',
                          fontWeight: count > 0 ? 600 : 400,
                        }}
                      >
                        {count === 0 ? 'Sin documentos' : `${count} documento${count !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && canManageFolders && docs.length > 0 && (
              <div className="mt-8">
                <h3
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#091f34',
                    marginBottom: '4px',
                  }}
                >
                  Organizar documentos
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                  Asigna cada documento a una carpeta con el menú desplegable.
                </p>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-3 flex-wrap hover:bg-gray-50"
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${folderColor(doc.file_category)}18` }}
                      >
                        <FileText size={16} color={folderColor(doc.file_category)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="truncate"
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            color: '#1f2937',
                          }}
                          title={doc.original_name}
                        >
                          {doc.original_name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {doc.user_name} · {formatDate(doc.uploaded_at)} ·{' '}
                          {formatSize(doc.file_size)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Folder size={14} className="text-gray-400" />
                        <select
                          value={doc.file_category}
                          onChange={(e) => changeDocFolder(doc.id, e.target.value)}
                          className="px-2.5 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                          style={{ fontFamily: "'Inter', sans-serif", minWidth: 160 }}
                        >

                          {!allFolders.some((f) => f.value === doc.file_category) && (
                            <option value={doc.file_category}>
                              (Sin carpeta)
                            </option>
                          )}
                          {allFolders.map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeFolder && (
          <>

            <div className="mb-5">
              <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-lg">

                <div className="flex-1 min-w-44">
                  <label style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '5px' }}>
                    👤 Usuario
                  </label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    <option value="all">Todos</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.email}>
                        {u.nombre} {u.apellido}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 min-w-44">
                  <label style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '5px' }}>
                    🔍 Buscar
                  </label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Nombre o descripción..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-md border transition-colors"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      backgroundColor: showAdvancedFilters ? '#eff6ff' : 'white',
                      borderColor: showAdvancedFilters ? '#3b82f6' : '#d1d5db',
                      color: showAdvancedFilters ? '#3b82f6' : '#6b7280',
                    }}
                  >
                    <Filter size={14} />
                    Fechas
                  </button>
                </div>
              </div>

              {showAdvancedFilters && (
                <div className="flex flex-wrap gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100 mt-2">
                  <div className="flex-1 min-w-40">
                    <label style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '5px' }}>
                      📅 Desde
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    />
                  </div>
                  <div className="flex-1 min-w-40">
                    <label style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '5px' }}>
                      📅 Hasta
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => { setDateFrom(''); setDateTo(''); setSelectedUser('all'); setSearchTerm(''); }}
                      className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      <X size={14} />
                      Limpiar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: '#091f34', fontWeight: 600 }}>
                  {filteredDocs.length} documento{filteredDocs.length !== 1 ? 's' : ''}
                </h3>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', color: '#9ca3af' }}>
                    Cargando...
                  </p>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="p-12 text-center">
                  <FolderOpen size={40} color="#d1d5db" className="mx-auto mb-3" />
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.88rem', color: '#9ca3af', fontWeight: 500 }}>
                    Esta carpeta está vacía
                  </p>
                  {canManageFolders && (
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: '#d1d5db', marginTop: '4px' }}>
                      Usa "Subir documento" para añadir el primero
                    </p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${folderColor(doc.file_category)}18` }}
                        >
                          <FileText size={18} color={folderColor(doc.file_category)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: '0.9rem',
                              color: '#1a1a2e',
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {doc.original_name}
                          </p>
                          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: '#9ca3af' }}>
                            {doc.user_name} · {formatDate(doc.uploaded_at)} · {formatSize(doc.file_size)}
                            {doc.description && ` · ${doc.description}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        {doc.storage_path ? (
                          <SecureDocumentView
                            document={{
                              id: doc.id,
                              original_name: doc.original_name,
                              storage_path: doc.storage_path,
                              file_category: doc.file_category,
                              file_size: doc.file_size,
                              uploaded_at: doc.uploaded_at,
                              uploaded_by_name: doc.user_name,
                            }}
                          />
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-400 rounded-md text-sm">
                            <Eye size={14} />
                            Sin acceso
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-500" style={{ fontFamily: "'Inter', sans-serif" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
