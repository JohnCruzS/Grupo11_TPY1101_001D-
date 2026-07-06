import { useEffect, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { getSupabase } from '../../context/AuthContext';
import { DocumentUpload } from './DocumentUpload';

interface Worker {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: string;
}

interface CompanyLite {
  id: string;
  name?: string;
  nombre?: string;
}

export function AdminDocUploadPanel({
  companies,
  onUploaded,
}: {
  companies: CompanyLite[];
  onUploaded?: () => void;
}) {
  const supabase = getSupabase();
  const [open, setOpen] = useState(false);
  const [enterpriseId, setEnterpriseId] = useState('');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);

  useEffect(() => {
    if (!enterpriseId) {
      setWorkers([]);
      return;
    }
    let cancelled = false;
    const loadWorkers = async () => {
      setLoadingWorkers(true);
      try {
        const { data: ues } = await supabase
          .from('user_enterprises')
          .select('user_id')
          .eq('enterprise_id', enterpriseId)
          .eq('is_active', true);
        const ids = (ues || []).map((u: { user_id: string }) => u.user_id);
        if (ids.length === 0) {
          if (!cancelled) setWorkers([]);
          return;
        }
        const keys = ids.map((id) => `slc_user:${id}`);
        const { data: profs } = await supabase
          .from('kv_store_7d36b31f')
          .select('key, value')
          .in('key', keys);
        const list: Worker[] = (profs || [])
          .map((p: { key: string; value: Record<string, unknown> }) => {
            const v = (p.value || {}) as Record<string, unknown>;
            return {
              id: p.key.replace('slc_user:', ''),
              email: (v.email as string) || '',
              nombre: (v.nombre as string) || '',
              apellido: (v.apellido as string) || '',
              rol: ((v.rol || v.role) as string) || 'usuario',
            };
          })
          .filter((w) => w.rol === 'usuario');
        if (!cancelled) setWorkers(list);
      } finally {
        if (!cancelled) setLoadingWorkers(false);
      }
    };
    loadWorkers();
    return () => {
      cancelled = true;
    };
  }, [enterpriseId, supabase]);

  return (
    <div className="mb-6 bg-white rounded-xl border" style={{ borderColor: '#e9ecef' }}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Subir documento</h3>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: open ? '#6b7280' : '#3b82f6' }}
        >
          {open ? <X size={16} /> : <Upload size={16} />}
          {open ? 'Cerrar' : 'Subir documento'}
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: '#f0f0f0' }}>
          <div className="pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Empresa de destino
            </label>
            <select
              value={enterpriseId}
              onChange={(e) => setEnterpriseId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Selecciona una empresa…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.nombre || c.id}
                </option>
              ))}
            </select>
          </div>

          {enterpriseId &&
            (loadingWorkers ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando trabajadores…
              </div>
            ) : (
              <DocumentUpload
                key={enterpriseId}
                empresaId={enterpriseId}
                workers={workers}
                onUploadComplete={onUploaded}
              />
            ))}
        </div>
      )}
    </div>
  );
}
