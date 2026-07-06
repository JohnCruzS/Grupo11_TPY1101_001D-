import { useEffect, useState } from 'react';
import { Info, X } from 'lucide-react';
import {
  empresaNotesKey,
  readSetting,
  type EmpresaAviso,
  type EmpresaAvisoData,
  type EmpresaNotes,
} from '../../utils/siteSettings';

interface Props {
  empresaId: string;
  userId: string;
}

function isExpired(a: EmpresaAviso) {
  return !!a.expiresAt && new Date(a.expiresAt) < new Date();
}

function isForWorker(a: EmpresaAviso, userId: string) {

  return a.targetIds.length === 0 || a.targetIds.includes(userId);
}

export function EmpresaNotesBanner({ empresaId, userId }: Props) {
  const [avisos, setAvisos] = useState<EmpresaAviso[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!empresaId) return;

    readSetting<EmpresaAvisoData | EmpresaNotes | null>(empresaNotesKey(empresaId)).then((stored) => {
      if (!stored) return;

      if ('avisos' in stored) {

        const visibles = (stored as EmpresaAvisoData).avisos.filter(
          (a) => a.enabled && !isExpired(a) && isForWorker(a, userId)
        );
        setAvisos(visibles);
      } else {

        const old = stored as EmpresaNotes;
        if (old.enabled && (old.titulo || old.texto)) {
          setAvisos([{
            id: 'legacy',
            titulo: old.titulo,
            texto: old.texto,
            enabled: true,
            targetIds: [],
            createdAt: new Date().toISOString(),
          }]);
        }
      }
    });
  }, [empresaId, userId]);

  const visible = avisos.filter((a) => !dismissed.has(a.id));
  if (!empresaId || visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((a) => (
        <div
          key={a.id}
          className="rounded-xl p-4 border flex items-start gap-3"
          style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#dcfce7' }}
          >
            <Info size={15} color="#15803d" />
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#14532d', fontWeight: 700, marginBottom: '2px' }}>
              {a.titulo.trim() || 'Aviso de tu empresa'}
            </p>
            {a.texto && (
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#166534', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {a.texto}
              </p>
            )}
          </div>
          <button
            onClick={() => setDismissed((prev) => new Set([...prev, a.id]))}
            className="flex-shrink-0 p-1 text-green-400 hover:text-green-700 rounded transition-colors"
            title="Cerrar aviso"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
