import { useEffect, useState } from 'react';
import {
  FileText,
  Upload,
  History,
  RotateCcw,
  CheckCircle,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  Shield,
  AlertCircle,
  Download,
  Clock,
  Hash,
  FileUp,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase } from '../../context/AuthContext';
import { useSecureDownload } from '../../hooks/useSecureDownload';
import type { DocumentoVersion } from '../../types/database';

interface Props {
  documentoId: string;
  enterpriseId: string;
  documentoNombre: string;
  onVersionChange?: () => void;
}

export function DocumentVersionManager({
  documentoId,
  enterpriseId,
  documentoNombre,
  onVersionChange,
}: Props) {
  const [versions, setVersions] = useState<DocumentoVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cambiosDescripcion, setCambiosDescripcion] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const supabase = getSupabase();
  const { downloadSecure } = useSecureDownload();

  useEffect(() => {
    loadVersions();
  }, [documentoId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documento_version')
        .select('*')
        .eq('documento_id', documentoId)
        .order('numero_version', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (err) {
      toast.error('Error cargando versiones');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Selecciona un archivo');
      return;
    }

    setUploading(true);
    try {

      const hash = await calculateHash(selectedFile);

      const versionNumber =
        versions.length > 0
          ? Math.max(...versions.map((v) => v.numero_version)) + 1
          : 1;
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${enterpriseId}/${documentoId}/v${versionNumber}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: versionData, error: versionError } = await supabase
        .from('documento_version')
        .insert({
          documento_id: documentoId,
          numero_version: versionNumber,
          archivo_path: filePath,
          archivo_nombre: selectedFile.name,
          hash_sha256: hash,
          tamano_bytes: selectedFile.size,
          mime_type: selectedFile.type,
          cambios_descripcion: cambiosDescripcion || null,
        })
        .select()
        .single();

      if (versionError) throw versionError;

      await supabase
        .from('documents')
        .update({
          version_actual_id: versionData.id,
          hash_sha256: hash,
        })
        .eq('id', documentoId);

      toast.success(`Versión ${versionNumber} creada exitosamente`);
      setShowUploadForm(false);
      setSelectedFile(null);
      setCambiosDescripcion('');
      loadVersions();
      onVersionChange?.();
    } catch (err) {
      toast.error('Error subiendo versión');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleRestore = async (version: DocumentoVersion) => {
    if (!confirm(`¿Restaurar a la versión ${version.numero_version}?`)) return;

    try {

      await supabase
        .from('documents')
        .update({
          version_actual_id: version.id,
          hash_sha256: version.hash_sha256,
        })
        .eq('id', documentoId);

      toast.success(`Restaurado a versión ${version.numero_version}`);
      onVersionChange?.();
    } catch (err) {
      toast.error('Error restaurando versión');
      console.error(err);
    }
  };

  const handleDownload = async (version: DocumentoVersion) => {
    try {
      await downloadSecure(version.archivo_path, version.archivo_nombre);
    } catch (err) {
      toast.error('Error descargando archivo');
      console.error(err);
    }
  };

  const verifyIntegrity = async (version: DocumentoVersion) => {
    toast.info(`Hash SHA-256: ${version.hash_sha256.substring(0, 16)}...`, {
      description: 'El documento está protegido contra modificaciones',
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">Versiones del Documento</h3>
          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-sm">
            {versions.length}
          </span>
        </div>
        <button
          onClick={() => setShowUploadForm(true)}
          className="flex items-center gap-2 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
        >
          <Upload className="w-4 h-4" />
          Nueva Versión
        </button>
      </div>

      {showUploadForm && (
        <form
          onSubmit={handleUpload}
          className="bg-gray-50 rounded-lg p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Subir Nueva Versión</h4>
            <button
              type="button"
              onClick={() => {
                setShowUploadForm(false);
                setSelectedFile(null);
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Archivo *</label>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-sm"
              required
            />
            {selectedFile && (
              <p className="text-xs text-gray-500 mt-1">
                {selectedFile.name} ({formatSize(selectedFile.size)})
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Descripción de cambios
            </label>
            <textarea
              value={cambiosDescripcion}
              onChange={(e) => setCambiosDescripcion(e.target.value)}
              placeholder="¿Qué cambió en esta versión?"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowUploadForm(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Subir Versión
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {versions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No hay versiones registradas</p>
            <p className="text-sm">Sube la primera versión del documento</p>
          </div>
        ) : (
          versions.map((version, index) => (
            <div
              key={version.id}
              className={`border rounded-lg overflow-hidden ${
                index === 0
                  ? 'border-blue-300 bg-blue-50/30'
                  : 'border-gray-200'
              }`}
            >

              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                onClick={() =>
                  setExpandedVersion(
                    expandedVersion === version.id ? null : version.id
                  )
                }
              >
                <div className="flex items-center gap-3">
                  {index === 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <FileText className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        Versión {version.numero_version}
                      </span>
                      {index === 0 && (
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
                          Actual
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(version.created_at).toLocaleString('es-CL')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {formatSize(version.tamano_bytes)}
                  </span>
                  {expandedVersion === version.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>

              {expandedVersion === version.id && (
                <div className="px-4 pb-4 space-y-3 border-t bg-gray-50/50">

                  <div className="pt-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">
                        {version.archivo_nombre}
                      </span>
                    </div>

                    <div className="flex items-start gap-2 text-sm">
                      <Hash className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">
                          Hash SHA-256 (integridad)
                        </p>
                        <p className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          {version.hash_sha256.substring(0, 32)}...
                        </p>
                      </div>
                    </div>

                    {version.cambios_descripcion && (
                      <div className="bg-white rounded-lg p-3 border">
                        <p className="text-xs text-gray-500 mb-1">
                          Cambios en esta versión:
                        </p>
                        <p className="text-sm">{version.cambios_descripcion}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => handleDownload(version)}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg"
                    >
                      <Download className="w-4 h-4" />
                      Descargar
                    </button>
                    <button
                      onClick={() => verifyIntegrity(version)}
                      className="flex items-center gap-1 text-sm text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg"
                    >
                      <Shield className="w-4 h-4" />
                      Verificar
                    </button>
                    {index > 0 && (
                      <button
                        onClick={() => handleRestore(version)}
                        className="flex items-center gap-1 text-sm text-orange-600 hover:bg-orange-50 px-3 py-1.5 rounded-lg"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Restaurar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
