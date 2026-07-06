import { useEffect, useState } from 'react';
import { TrendingUp, Loader2, RefreshCw } from 'lucide-react';

interface AfpRow {
  nombre: string;
  dependiente: string;
  independiente: string;
}

interface AsigFamiliar {
  tramo: string;
  monto: string;
}

interface LiveData {
  uf: string;
  utm: string;
  dolar: string;
  sueldoMinimo: string;
  sueldoMinimoNoRem: string;
  sueldoMinimoJornada: string;
  sis: string;
  afp: AfpRow[];
  asignacion: AsigFamiliar[];
  updatedAt: Date;
}

function clp(n: unknown): string {
  const num = typeof n === 'number' ? n : Number(n);
  if (isNaN(num)) return '—';
  return `$${Math.round(num).toLocaleString('es-CL')}`;
}

function pct(n: unknown, decimals = 2): string {
  const num = typeof n === 'number' ? n : Number(n);
  if (isNaN(num)) return '—';
  return `${num.toFixed(decimals)}%`;
}

function pick(obj: unknown, ...paths: string[][]): unknown {
  for (const path of paths) {
    let cur: unknown = obj;
    for (const key of path) {
      if (cur == null || typeof cur !== 'object') { cur = undefined; break; }
      cur = (cur as Record<string, unknown>)[key];
    }
    if (cur != null) return cur;
  }
  return undefined;
}

async function fetchLive(): Promise<LiveData> {
  const [minRes, prevRes] = await Promise.allSettled([
    fetch('https://mindicador.cl/api').then((r) => {
      if (!r.ok) throw new Error('mindicador ' + r.status);
      return r.json();
    }),
    fetch('https://api.boostr.cl/economy/previred.json').then((r) => {
      if (!r.ok) throw new Error('boostr ' + r.status);
      return r.json();
    }),
  ]);

  const min = minRes.status === 'fulfilled' ? minRes.value : {};
  const prevRaw = prevRes.status === 'fulfilled' ? prevRes.value : {};

  const prev = ((prevRaw as Record<string, unknown>)?.data ?? {}) as Record<string, unknown>;

  const uf   = clp(pick(min, ['uf',    'valor']));
  const utm  = clp(pick(min, ['utm',   'valor']));
  const dolar= clp(pick(min, ['dolar', 'valor']));

  const sueldoMinimo = clp(pick(prev, ['topes_imponibles', 'afp', 'clp']));
  const sueldoMinimoNoRem = '—';
  const sueldoMinimoJornada = '—';

  const afpRaw = (prev?.tasas_cotizacion_afp ?? {}) as Record<string, unknown>;
  const afp: AfpRow[] = Object.entries(afpRaw).map(([nombre, vals]) => {
    const v = (vals ?? {}) as Record<string, Record<string, number>>;
    const dep = v?.dependiente?.trabajador;

    const ind = v?.independiente?.sis;
    return {
      nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1),
      dependiente: pct(dep),
      independiente: pct(ind),
    };
  });

  const capitalInd = (afpRaw?.capital as Record<string, Record<string, number>>)?.independiente?.sis;
  const capitalDep = (afpRaw?.capital as Record<string, Record<string, number>>)?.dependiente?.trabajador;
  const sisCalc = capitalInd != null && capitalDep != null ? capitalInd - capitalDep : undefined;
  const sis = pct(sisCalc);

  const asignacion: AsigFamiliar[] = [];

  return {
    uf, utm, dolar,
    sueldoMinimo, sueldoMinimoNoRem, sueldoMinimoJornada,
    sis, afp, asignacion,
    updatedAt: new Date(),
  };
}

const thCls: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '0.68rem',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  paddingBottom: '6px',
  textAlign: 'left',
};
const tdCls: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '0.82rem',
  color: '#374151',
  padding: '4px 12px 4px 0',
  borderTop: '1px solid #f1f5f9',
};

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: '#f8fafc', border: '1px solid #eef2f7' }}>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.66rem', color: '#6b7280', marginBottom: '3px', lineHeight: 1.2 }}>
        {label}
      </p>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '1rem', fontWeight: 700, color: '#091f34' }}>
        {value}
      </p>
    </div>
  );
}

export function IndicadoresBanner() {
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetchLive()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const sectionTitle = (text: string) => (
    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '12px 0 6px' }}>
      {text}
    </p>
  );

  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: '#fff', borderColor: '#e9ecef' }}>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-600" />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', fontWeight: 700, color: '#091f34' }}>
            Indicadores previsionales
          </span>
        </div>
        <div className="flex items-center gap-3">
          {data && !loading && (
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', color: '#9ca3af' }}>
              Actualizado al {data.updatedAt.toLocaleString('es-CL', {
                timeZone: 'America/Santiago',
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: false,
              })}
            </span>
          )}
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            title="Actualizar"
            style={{ background: 'none', border: 'none', cursor: loading ? 'default' : 'pointer', color: '#9ca3af', padding: 0 }}
          >
            {loading
              ? <Loader2 size={14} className="animate-spin" />
              : <RefreshCw size={14} />}
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      )}

      {error && !loading && (
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#ef4444', textAlign: 'center', padding: '12px 0' }}>
          No se pudo obtener los datos. Verifica tu conexión.
        </p>
      )}

      {data && !loading && (
        <>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Card label="Valor UF" value={data.uf} />
            <Card label="Valor UTM" value={data.utm} />
            <Card label="Dólar observado" value={data.dolar} />
            {data.sueldoMinimo !== '—' && (
              <Card label="Tope imponible AFP" value={data.sueldoMinimo} />
            )}
            {data.sis !== '—' && (
              <Card label="SIS (aprox.)" value={data.sis} />
            )}
          </div>

          {data.afp.length > 0 && (
            <>
              {sectionTitle('Cotizaciones AFP')}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...thCls, width: '35%' }}>AFP</th>
                      <th style={thCls}>Dependiente (trabajador %)</th>
                      <th style={thCls}>Independiente AFP+SIS %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.afp.map((row) => (
                      <tr key={row.nombre}>
                        <td style={{ ...tdCls, fontWeight: 500 }}>{row.nombre}</td>
                        <td style={tdCls}>{row.dependiente}</td>
                        <td style={tdCls}>{row.independiente}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
