import { useState } from 'react';
import { Download, FileText, Loader2, AlertCircle } from 'lucide-react';
import { useSecureDownload } from '../../hooks/useSecureDownload';
import { getSupabase } from '../../context/AuthContext';

interface Document {
  id: string;
  original_name: string;
  storage_path: string;
  file_category: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by?: string;
  uploaded_by_name?: string;
  enterprise_id?: string;
}

interface SecureDocumentViewProps {
  document: Document;
  onView?: () => void;
  viewerEnterpriseId?: string;
  compact?: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    contract: 'Contrato',
    payroll: 'Liquidación',
    termination: 'Finiquito',
    annex: 'Anexo',
    legal: 'Legal',
    report: 'Reporte',
    invoice: 'Factura',
    other: 'Otro',
  };
  return labels[category] || category;
};

export function SecureDocumentView({
  document,
  onView,
  viewerEnterpriseId,
  compact = false,
}: SecureDocumentViewProps) {
  const { downloadSecure, getSecureUrl, isLoading, error } =
    useSecureDownload();
  const [viewError, setViewError] = useState<string | null>(null);

  const handleDownload = async () => {

    await downloadSecure(document.storage_path, document.original_name, {
      documentId: document.id,
      ownerId: document.uploaded_by || '',
      ownerEmpresaId: document.enterprise_id,
      viewerEmpresaId: viewerEnterpriseId,
    });
  };

  const handleView = async () => {
    setViewError(null);
    const url = await getSecureUrl(document.storage_path);

    if (url) {
      window.open(url, '_blank');
      onView?.();

      try {
        const supabase = getSupabase();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser && document.id) {
          await supabase.from('document_views').insert({
            document_id: document.id,
            viewer_id: authUser.id,
            viewer_empresa_id: viewerEnterpriseId || null,
            owner_id: document.uploaded_by || null,
            owner_empresa_id: document.enterprise_id || null,
            action_type: 'view',
            user_agent: navigator.userAgent,
          });
        }
      } catch {

      }
    } else {
      setViewError('No se pudo generar vista previa segura');
    }
  };

  const buttons = (
    <div className="flex items-center gap-1">
      {(error || viewError) && (
        <div
          className="flex items-center gap-1 text-red-600 text-xs mr-1"
          title={error || viewError || undefined}
        >
          <AlertCircle className="w-3 h-3" />
        </div>
      )}
      <button
        onClick={handleView}
        disabled={isLoading}
        className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
      >
        Ver
      </button>
      <button
        onClick={handleDownload}
        disabled={isLoading}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Download className="w-3 h-3" />
        )}
        Descargar
      </button>
    </div>
  );

  if (compact) return buttons;

  return (
    <div className="p-3 bg-white hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 text-sm truncate">
            {document.original_name}
          </h4>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 mt-1">
            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">
              {getCategoryLabel(document.file_category)}
            </span>
            <span>{formatFileSize(document.file_size)}</span>
            <span>•</span>
            <span>
              {new Date(document.uploaded_at).toLocaleDateString('es-CL')}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">{buttons}</div>
      </div>
    </div>
  );
}
