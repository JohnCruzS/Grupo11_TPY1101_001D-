import { useState, useRef } from 'react';
import { Upload, X, FileText, AlertCircle, Users } from 'lucide-react';
import { useAuth, getSupabase } from '../../context/AuthContext';

interface Worker {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: string;
}

interface DocumentUploadProps {
  onUploadComplete?: () => void;
  maxFileSize?: number;
  acceptedTypes?: string[];
  workers?: Worker[];
  empresaId?: string;
  preSelectedWorkerId?: string;
  adminId?: string;
  allowSendToAdmin?: boolean;
  preSelectedCategory?: string;
  extraCategories?: { value: string; label: string }[];
}

const DEFAULT_ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/jpeg',
  'image/png',
];

const CATEGORIES = [
  { value: 'contract', label: 'Contrato' },
  { value: 'payroll', label: 'Liquidación' },
  { value: 'termination', label: 'Finiquito' },
  { value: 'annex', label: 'Anexo' },
  { value: 'legal', label: 'Documento Legal' },
  { value: 'report', label: 'Reporte/Informe' },
  { value: 'invoice', label: 'Factura/Boleta' },
  { value: 'other', label: 'Otro' },
];

export function DocumentUpload({
  onUploadComplete,
  maxFileSize = 20,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  workers = [],
  empresaId,
  preSelectedWorkerId,
  adminId,
  allowSendToAdmin = false,
  preSelectedCategory,
  extraCategories = [],
}: DocumentUploadProps) {
  const { user } = useAuth();
  const supabase = getSupabase();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState(preSelectedCategory || 'contract');
  const [description, setDescription] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState(
    preSelectedWorkerId || ''
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {

    if (!acceptedTypes.includes(file.type)) {
      setError(`Tipo de archivo no permitido: ${file.type}`);
      return;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxFileSize) {
      setError(`El archivo excede el tamaño máximo de ${maxFileSize}MB`);
      return;
    }

    setSelectedFile(file);
    setError('');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (!empresaId) {
      setError('No se pudo determinar la empresa');
      return;
    }

    setUploading(true);
    setError('');

    try {

      const selectedWorkerData = workers.find((w) => w.id === selectedWorkerId);
      const isAdminTarget =
        selectedWorkerId?.startsWith('admin:') ||
        selectedWorkerData?.rol === 'admin' ||
        selectedWorkerData?.rol === 'superadmin';
      const adminTargetId = selectedWorkerId?.startsWith('admin:')
        ? selectedWorkerId.replace('admin:', '')
        : null;
      const actualUserId = adminTargetId || selectedWorkerId || null;

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', category);
      formData.append('description', description || '');
      formData.append('original_name', selectedFile.name);
      formData.append('enterprise_id', empresaId);
      if (actualUserId) formData.append('user_id', actualUserId);
      formData.append(
        'recipient_type',
        isAdminTarget ? 'admin' : selectedWorkerId ? 'worker' : 'enterprise'
      );

      const { data, error: functionError } = await supabase.functions.invoke(
        'documents',
        { body: formData }
      );

      if (functionError) {
        let msg = functionError.message || 'Error al subir el documento';
        try {
          const ctx = (functionError as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          }
        } catch {

        }
        throw new Error(msg);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Error subiendo documento');
      }

      if (actualUserId && !isAdminTarget) {
        const targetWorker = workers.find((w) => w.id === actualUserId);
        if (targetWorker) {
          try {
            const { data: companyData } = await supabase
              .from('enterprises')
              .select('name')
              .eq('id', empresaId)
              .single();

            const categoryLabel =
              CATEGORIES.find((c) => c.value === category)?.label || category;

            await supabase.functions.invoke('send-email', {
              body: {
                to: targetWorker.email,
                template: 'documentNotification',
                data: {
                  nombre: `${targetWorker.nombre} ${targetWorker.apellido}`,
                  documentType: categoryLabel,
                  uploadedBy: user?.nombre || 'Administrador',
                  viewUrl: `${window.location.origin}/conecta`,
                  empresaName: companyData?.name || '',
                },
              },
            });
          } catch {

          }
        }
      }

      setSelectedFile(null);
      setDescription('');
      setCategory('contract');
      setSelectedWorkerId('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onUploadComplete?.();
    } catch (err) {
      setError(
        `Error: ${err instanceof Error ? err.message : 'Error desconocido'}`
      );
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <h3
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '1rem',
          color: '#091f34',
          fontWeight: 600,
          marginBottom: '16px',
        }}
      >
        Subir Documento
      </h3>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          accept={acceptedTypes.join(',')}
          className="hidden"
        />

        <Upload size={48} className="mx-auto mb-4 text-gray-400" />

        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.9rem',
            color: '#374151',
            marginBottom: '8px',
          }}
        >
          Arrastra un archivo aquí o{' '}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-blue-600 hover:text-blue-800 underline"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            haz clic para seleccionar
          </button>
        </p>

        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.8rem',
            color: '#6b7280',
          }}
        >
          Máximo {maxFileSize}MB • PDF, Word, Excel, imágenes
        </p>
      </div>

      {selectedFile && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-blue-600" />
              <div>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    color: '#1a1a2e',
                    fontWeight: 500,
                  }}
                >
                  {selectedFile.name}
                </p>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.75rem',
                    color: '#6b7280',
                  }}
                >
                  {formatFileSize(selectedFile.size)} • {selectedFile.type}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-gray-400 hover:text-gray-600"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          <div className="mb-4">
            <label
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.8rem',
                color: '#374151',
                display: 'block',
                marginBottom: '6px',
              }}
            >
              <Users
                size={14}
                style={{ display: 'inline', marginRight: '4px' }}
              />
              {allowSendToAdmin
                ? 'Destinatario'
                : 'Asignar a trabajador (opcional)'}
            </label>
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {!allowSendToAdmin && (
                <option value="">📁 Documento general de la empresa</option>
              )}
              {allowSendToAdmin && adminId && (
                <option value={`admin:${adminId}`}>
                  🛡️ Enviar al Administrador
                </option>
              )}
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.rol === 'admin'
                    ? '🛡️ Admin:'
                    : '👤'}{' '}
                  {worker.nombre} {worker.apellido} ({worker.email})
                </option>
              ))}
            </select>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.75rem',
                color: '#6b7280',
                marginTop: '4px',
              }}
            >
              {selectedWorkerId?.startsWith('admin:')
                ? 'El documento será enviado directamente al administrador del sistema'
                : selectedWorkerId
                  ? 'El documento será visible solo para este trabajador y la empresa'
                  : 'El documento será visible para todos los trabajadores de la empresa'}
            </p>
          </div>

          <div className="mb-4">
            <label
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.8rem',
                color: '#374151',
                display: 'block',
                marginBottom: '6px',
              }}
            >
              Categoría
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
              {extraCategories.length > 0 && (
                <optgroup label="Carpetas personalizadas">
                  {extraCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      📂 {cat.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="mb-4">
            <label
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.8rem',
                color: '#374151',
                display: 'block',
                marginBottom: '6px',
              }}
            >
              Descripción (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Añade una descripción para este documento..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
              rows={3}
              style={{ fontFamily: "'Inter', sans-serif" }}
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.85rem',
              fontWeight: 500,
            }}
          >
            {uploading ? 'Subiendo...' : 'Subir Documento'}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle size={16} className="text-red-600" />
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
    </div>
  );
}
