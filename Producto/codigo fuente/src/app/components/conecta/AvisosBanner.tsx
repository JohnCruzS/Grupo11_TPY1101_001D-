import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { AVISOS_KEY, readSetting, type Aviso } from '../../utils/siteSettings';

export function AvisosBanner({
  userId,
  empresaId,
}: {
  userId: string;
  empresaId?: string;
}) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  useEffect(() => {
    readSetting<Aviso[]>(AVISOS_KEY).then((data) => {
      setAvisos(Array.isArray(data) ? data : []);
    });
  }, []);

  const visibles = avisos.filter((a) => {
    if (!a.enabled || !a.texto?.trim()) return false;
    if (a.scope === 'all') return true;
    if (a.scope === 'empresas')
      return !!empresaId && a.targetIds.includes(empresaId);
    if (a.scope === 'trabajadores') return a.targetIds.includes(userId);
    return false;
  });

  if (visibles.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibles.map((a) => (
        <div
          key={a.id}
          className="rounded-xl p-4 border flex items-start gap-3"
          style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#dbeafe' }}
          >
            <Bell size={16} color="#2563eb" />
          </div>
          <div className="min-w-0">
            {a.titulo?.trim() && (
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#1e3a8a',
                  marginBottom: '2px',
                }}
              >
                {a.titulo}
              </p>
            )}
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.8rem',
                color: '#1e40af',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}
            >
              {a.texto}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
