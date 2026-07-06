import { useState, useEffect, useCallback } from 'react';
import { extractText, getDocumentProxy } from 'unpdf';
import { getSupabase } from '../../context/AuthContext';
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

function chunkText(text: string, max = 1500, overlap = 200): string[] {
  if (text.length <= max) return [text];
  const chunks: string[] = [];
  let start = 0;
  const MAX_CHUNKS = 3000;
  while (start < text.length && chunks.length < MAX_CHUNKS) {
    let end = Math.min(start + max, text.length);
    if (end < text.length) {
      const sub = text.substring(start, end);
      const lb = Math.max(sub.lastIndexOf('. '), sub.lastIndexOf('\n'));
      if (lb > max / 2) end = start + lb + 1;
    }
    const chunk = text.substring(start, end).trim();
    if (chunk.length > 80) chunks.push(chunk);
    if (end >= text.length) break;
    const next = end - overlap;
    start = next > start ? next : end;
  }
  return chunks;
}

interface KnowledgeDoc {
  id: string;
  title: string;
  content_chunk: string;
  source_url: string;
  source_name: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  chunk_index: number;
  total_chunks: number;
  created_at: string;
  validation_notes?: string;
}

export function LoyGatekeeper() {
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    'all' | 'pending' | 'approved' | 'rejected'
  >('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDoc | null>(null);
  const [validationNote, setValidationNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [runningSpider, setRunningSpider] = useState(false);
  const [spiderResult, setSpiderResult] = useState<{ visited: number; processed: number; elapsed_seconds: number } | null>(null);

  const [ingestingCodigo, setIngestingCodigo] = useState(false);
  const [codigoProgress, setCodigoProgress] = useState(0);

  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });

  const supabase = getSupabase();

  const loadCounts = useCallback(async () => {
    try {
      const statuses = ['pending', 'approved', 'rejected'] as const;
      const results = await Promise.all(
        statuses.map((s) =>
          supabase
            .from('loy_knowledge_documents')
            .select('*', { count: 'exact', head: true })
            .eq('status', s)
        )
      );
      const [pending, approved, rejected] = results.map((r) => r.count || 0);
      setCounts({ pending, approved, rejected, total: pending + approved + rejected });
    } catch {

    }
  }, [supabase]);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('loy_knowledge_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      toast.error('Error cargando documentos: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [supabase, filter]);

  useEffect(() => {
    loadDocuments();
    loadCounts();
  }, [loadDocuments, loadCounts]);

  const validateDocument = async (
    docId: string,
    status: 'approved' | 'rejected'
  ) => {
    setProcessing(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const validatorId = authData?.user?.id;

      const { error } = await supabase.rpc('validate_loy_document', {
        p_document_id: docId,
        p_status: status,
        p_validator_id: validatorId,
        p_notes: validationNote,
      });

      if (error) throw error;

      toast.success(
        `Documento ${status === 'approved' ? 'aprobado' : 'rechazado'} correctamente`
      );

      const doc = documents.find((d) => d.id === docId);
      if (doc && doc.total_chunks > 1) {
        const { error: bulkError } = await supabase
          .from('loy_knowledge_documents')
          .update({
            status,
            validated_by: validatorId,
            validated_at: new Date().toISOString(),
            validation_notes: validationNote,
            updated_at: new Date().toISOString(),
          })
          .eq('source_url', doc.source_url)
          .eq('status', 'pending');

        if (bulkError) {
          console.error('Error actualizando chunks relacionados:', bulkError);
        }
      }

      setSelectedDoc(null);
      setValidationNote('');
      loadDocuments();
      loadCounts();
    } catch (err) {
      toast.error('Error validando: ' + (err as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const runSpider = async () => {
    setRunningSpider(true);
    setSpiderResult(null);
    toast.info('Spider iniciado — puede tardar hasta 2 minutos...');
    try {
      const { data, error } = await supabase.functions.invoke('web-spider-dt');
      if (error) {
        const body = await (error as any).context?.json?.().catch(() => null);
        throw new Error(body?.error || error.message);
      }
      setSpiderResult(data?.summary || null);
      toast.success(`Spider completado: ${data?.summary?.processed ?? 0} artículos nuevos indexados`);
      loadDocuments();
      loadCounts();
    } catch (err) {
      toast.error('Error: ' + (err as Error).message, { duration: 10000 });
    } finally {
      setRunningSpider(false);
    }
  };

  const ingestCodigo = async () => {
    if (
      !confirm(
        'Esto descargará el Código del Trabajo completo (~700 páginas), lo procesará ' +
        'en tu navegador y lo indexará. Tarda varios minutos y reemplaza cualquier ' +
        'versión anterior. No cierres la pestaña. ¿Continuar?'
      )
    ) {
      return;
    }

    setIngestingCodigo(true);
    setCodigoProgress(0);

    try {

      toast.info('Descargando PDF del Código del Trabajo...');
      const { data: pdfBlob, error: pdfError } = await supabase.functions.invoke(
        'ingest-codigo',
        { body: { action: 'pdf' } }
      );
      if (pdfError) throw new Error('No se pudo descargar el PDF: ' + pdfError.message);

      toast.info('Extrayendo texto del PDF (puede tardar)...');
      const buffer = await (pdfBlob as Blob).arrayBuffer();
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdf, { mergePages: true });
      const fullText = (Array.isArray(text) ? text.join(' ') : text)
        .replace(/\s+/g, ' ')
        .trim();

      if (fullText.length < 1000) {
        throw new Error('El PDF no devolvió texto suficiente.');
      }

      const chunks = chunkText(fullText);
      const total = chunks.length;
      toast.info(`${total} fragmentos generados. Indexando...`);

      const BATCH = 40;
      let totalInserted = 0;

      for (let offset = 0; offset < total; offset += BATCH) {
        const batch = chunks.slice(offset, offset + BATCH);
        const { data, error } = await supabase.functions.invoke('ingest-codigo', {
          body: {
            action: 'embed',
            chunks: batch,
            offset,
            total,
            reset: offset === 0,
          },
        });
        if (error) {
          const body = await (error as { context?: { json?: () => Promise<{ error?: string }> } })
            .context?.json?.()
            .catch(() => null);
          throw new Error(body?.error || error.message);
        }

        totalInserted += data.inserted || 0;
        setCodigoProgress(Math.round(((offset + batch.length) / total) * 100));
      }

      toast.success(`Código del Trabajo indexado: ${totalInserted} fragmentos`);
      loadDocuments();
      loadCounts();
    } catch (err) {
      toast.error('Error indexando Código: ' + (err as Error).message, { duration: 10000 });
    } finally {
      setIngestingCodigo(false);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.source_name?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprobado';
      case 'rejected':
        return 'Rechazado';
      default:
        return 'Pendiente';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Gatekeeper LOY - Validación de Documentos
          </h1>
          <p className="text-gray-600 mt-1">
            Valida los documentos legales antes de que sean consultables por el
            asistente LOY.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <button
              onClick={ingestCodigo}
              disabled={ingestingCodigo || runningSpider}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <FileText className={`w-4 h-4 ${ingestingCodigo ? 'animate-pulse' : ''}`} />
              {ingestingCodigo ? `Indexando Código... ${codigoProgress}%` : 'Cargar Código del Trabajo'}
            </button>
            <button
              onClick={runSpider}
              disabled={runningSpider || ingestingCodigo}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${runningSpider ? 'animate-spin' : ''}`} />
              {runningSpider ? 'Ejecutando spider...' : 'Ejecutar Spider DT'}
            </button>
          </div>
          {ingestingCodigo && (
            <div className="w-64 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-2 transition-all duration-300"
                style={{ width: `${codigoProgress}%` }}
              />
            </div>
          )}
          {spiderResult && !ingestingCodigo && (
            <p className="text-xs text-gray-500">
              Último resultado: {spiderResult.processed} artículos nuevos · {spiderResult.visited} páginas · {spiderResult.elapsed_seconds}s
            </p>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800 font-medium">
              Importante: Solo los documentos aprobados serán consultables por
              LOY
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Los documentos rechazados no se indexan. El spider continuará
              recolectando actualizaciones.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border">
          <div className="text-2xl font-bold text-yellow-600">
            {counts.pending}
          </div>
          <div className="text-sm text-gray-600">Pendientes</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border">
          <div className="text-2xl font-bold text-green-600">
            {counts.approved}
          </div>
          <div className="text-sm text-gray-600">Aprobados</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border">
          <div className="text-2xl font-bold text-red-600">
            {counts.rejected}
          </div>
          <div className="text-sm text-gray-600">Rechazados</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border">
          <div className="text-2xl font-bold text-blue-600">
            {counts.total}
          </div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f === 'all' && 'Todos'}
                {f === 'pending' && 'Pendientes'}
                {f === 'approved' && 'Aprobados'}
                {f === 'rejected' && 'Rechazados'}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar documentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={loadDocuments}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Actualizar"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="divide-y">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              Cargando documentos...
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay documentos para mostrar
            </div>
          ) : (
            filteredDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedDoc?.id === doc.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {doc.title}
                      </h3>
                      {doc.total_chunks > 1 && (
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                          Chunk {doc.chunk_index + 1}/{doc.total_chunks}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                        {doc.category || 'General'}
                      </span>
                      <span>•</span>
                      <span>{doc.source_name || 'Fuente desconocida'}</span>
                      <span>•</span>
                      <span>
                        {new Date(doc.created_at).toLocaleDateString('es-CL')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {doc.content_chunk.substring(0, 150)}...
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(doc.status)}`}
                    >
                      {getStatusIcon(doc.status)}
                      {getStatusLabel(doc.status)}
                    </span>
                    {doc.source_url && (
                      <a
                        href={doc.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Ver fuente
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="p-6 border-b">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedDoc.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedDoc.status)}`}
                    >
                      {getStatusLabel(selectedDoc.status)}
                    </span>
                    <span>•</span>
                    <span>{selectedDoc.category || 'General'}</span>
                    <span>•</span>
                    <span>
                      Chunk {selectedDoc.chunk_index + 1} de{' '}
                      {selectedDoc.total_chunks}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contenido del documento:
                </label>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {selectedDoc.content_chunk}
                </div>
              </div>

              {selectedDoc.source_url && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fuente oficial:
                  </label>
                  <a
                    href={selectedDoc.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {selectedDoc.source_url}
                  </a>
                </div>
              )}

              {selectedDoc.status === 'pending' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas de validación (opcional):
                  </label>
                  <textarea
                    value={validationNote}
                    onChange={(e) => setValidationNote(e.target.value)}
                    placeholder="Ej: Información completa y actualizada. Fuente confiable."
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
              )}

              {selectedDoc.validation_notes && (
                <div className="mt-4 bg-gray-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-700">
                    Notas de validación:
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedDoc.validation_notes}
                  </p>
                </div>
              )}
            </div>

            {selectedDoc.status === 'pending' && (
              <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end">
                <button
                  onClick={() => validateDocument(selectedDoc.id, 'rejected')}
                  disabled={processing}
                  className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  {processing ? 'Procesando...' : 'Rechazar'}
                </button>
                <button
                  onClick={() => validateDocument(selectedDoc.id, 'approved')}
                  disabled={processing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {processing ? 'Procesando...' : 'Aprobar documento'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
