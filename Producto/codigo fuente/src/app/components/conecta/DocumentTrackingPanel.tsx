import { useEffect, useState } from 'react';
import {
  Eye,
  Download,
  Share2,
  Clock,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import { useDocumentTracking } from '../../hooks/useDocumentTracking';
import type { DocumentView, DocumentViewStats } from '../../types/database';

interface Props {
  documentId?: string;
}

export function DocumentTrackingPanel({ documentId }: Props) {
  const [stats, setStats] = useState<DocumentViewStats[]>([]);
  const [viewers, setViewers] = useState<DocumentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<string | null>(null);

  const { getMyDocumentStats, getDocumentViewers, isLoading } =
    useDocumentTracking();

  useEffect(() => {
    loadData();
  }, [documentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (documentId) {

        const [docStats, docViewers] = await Promise.all([
          getMyDocumentStats(documentId),
          getDocumentViewers(documentId),
        ]);

        let finalStats = docStats;
        if ((!docStats || docStats.length === 0) && docViewers.length > 0) {
          const uniqueViewers = new Set(docViewers.map((v) => v.viewer_id)).size;
          const totalDownloads = docViewers.filter((v) => v.action_type === 'download').length;
          const totalViews =
            docViewers.filter((v) => v.action_type === 'view').length || docViewers.length;
          finalStats = [
            {
              document_id: documentId,
              owner_id: docViewers[0]?.owner_id || '',
              unique_viewers: uniqueViewers,
              total_views: totalViews,
              total_downloads: totalDownloads,
              last_viewed_at: docViewers[0]?.viewed_at || null,
            } as unknown as DocumentViewStats,
          ];
        }

        setStats(finalStats);
        setViewers(docViewers);
      } else {

        const allStats = await getMyDocumentStats();
        setStats(allStats);
      }
    } catch (err) {
      console.error('Error cargando tracking:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'view':
        return <Eye className="w-4 h-4 text-blue-500" />;
      case 'download':
        return <Download className="w-4 h-4 text-green-500" />;
      case 'share':
        return <Share2 className="w-4 h-4 text-purple-500" />;
      default:
        return <Eye className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'view':
        return 'Visto';
      case 'download':
        return 'Descargado';
      case 'share':
        return 'Compartido';
      default:
        return actionType;
    }
  };

  const totalStats = {
    documents: stats.length,
    uniqueViewers: stats.reduce((sum, s) => sum + s.unique_viewers, 0),
    totalViews: stats.reduce((sum, s) => sum + s.total_views, 0),
    totalDownloads: stats.reduce((sum, s) => sum + s.total_downloads, 0),
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (documentId && viewers.length > 0) {
    const docStats = stats[0];

    return (
      <div className="space-y-4">

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            {docStats?.document_name || 'Documento'}
          </h3>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-500">Personas únicas</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {docStats?.unique_viewers || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-500">Total vistas</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {docStats?.total_views || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="flex items-center gap-2 mb-1">
                <Download className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-gray-500">Descargas</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {docStats?.total_downloads || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-gray-500">Última vez</span>
              </div>
              <p className="text-sm font-medium text-orange-600">
                {docStats?.last_viewed_at
                  ? formatDate(docStats.last_viewed_at)
                  : 'Nunca'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h4 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Quién ha visto este documento
            </h4>
            <span className="text-sm text-gray-500">
              {viewers.length} registros
            </span>
          </div>

          <div className="divide-y">
            {viewers.map((view, index) => (
              <div key={view.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-blue-600">
                        {(view.viewer_name || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">
                        {view.viewer_name || 'Usuario desconocido'}
                      </p>
                      {view.viewer_email && (
                        <p className="text-sm text-gray-500">
                          {view.viewer_email}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {getActionIcon(view.action_type)}
                        <span className="text-sm text-gray-600">
                          {getActionLabel(view.action_type)}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm text-gray-400">
                          {formatDate(view.viewed_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {view.action_type === 'download' && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        Descargado
                      </span>
                    )}
                    {index === 0 && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        Más reciente
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600">
              Documentos compartidos
            </span>
          </div>
          <p className="text-3xl font-bold text-blue-600">
            {totalStats.documents}
          </p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-600">Personas que vieron</span>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {totalStats.uniqueViewers}
          </p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-5 h-5 text-purple-600" />
            <span className="text-sm text-gray-600">Total vistas</span>
          </div>
          <p className="text-3xl font-bold text-purple-600">
            {totalStats.totalViews}
          </p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
          <div className="flex items-center gap-2 mb-2">
            <Download className="w-5 h-5 text-orange-600" />
            <span className="text-sm text-gray-600">Descargas totales</span>
          </div>
          <p className="text-3xl font-bold text-orange-600">
            {totalStats.totalDownloads}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Estadísticas por documento
          </h3>
          <span className="text-sm text-gray-500">
            {stats.length} documentos
          </span>
        </div>

        {stats.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Eye className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No hay documentos compartidos aún</p>
            <p className="text-sm mt-1">
              Cuando compartas documentos, podrás ver quién los abrió aquí
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {stats.map((stat) => (
              <div key={stat.document_id} className="p-4">
                <div
                  className="flex items-start justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg"
                  onClick={() =>
                    setExpandedDoc(
                      expandedDoc === stat.document_id ? null : stat.document_id
                    )
                  }
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {stat.document_name || 'Documento'}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-sm">
                        <span className="flex items-center gap-1 text-gray-500">
                          <Users className="w-4 h-4" />
                          {stat.unique_viewers} persona
                          {stat.unique_viewers !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <Eye className="w-4 h-4" />
                          {stat.total_opens} vista
                          {stat.total_opens !== 1 ? 's' : ''}
                        </span>
                        {stat.total_downloads > 0 && (
                          <span className="flex items-center gap-1 text-green-600">
                            <Download className="w-4 h-4" />
                            {stat.total_downloads} descarga
                            {stat.total_downloads !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      Última:{' '}
                      {stat.last_viewed_at
                        ? formatDate(stat.last_viewed_at)
                        : 'N/A'}
                    </span>
                    {expandedDoc === stat.document_id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedDoc === stat.document_id && (
                  <div className="mt-4 pl-14">
                    <button
                      onClick={() => setShowDetailModal(stat.document_id)}
                      className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm"
                    >
                      <BarChart3 className="w-4 h-4" />
                      Ver detalle completo de quién vio este documento
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Detalle de vistas</h3>
              <button
                onClick={() => setShowDetailModal(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              <DocumentTrackingPanel documentId={showDetailModal} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
