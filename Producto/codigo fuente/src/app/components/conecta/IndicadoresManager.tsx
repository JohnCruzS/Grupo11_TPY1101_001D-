import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, TrendingUp, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  INDICADORES_KEY,
  writeSetting,
  type Indicadores,
} from '../../utils/siteSettings';

interface ApiData {
  uf: string;
  utm: string;
  dolar: string;
  euroError?: boolean;
  rentaMinima: string;
  rentaMinimaNoRemuneratoria: string;
  rentaMinimaJornada: string;
  afpRows: { nombre: string; dependiente: string; independiente: string }[];
  sis: string;
  asignacionFamiliar: { tramo: string; monto: string }[];
  fetchedAt: string;
}

const empty: ApiData = {
  uf: '—',
  utm: '—',
  dolar: '—',
  rentaMinima: '—',
  rentaMinimaNoRemuneratoria: '—',
  rentaMinimaJornada: '—',
  afpRows: [],
  sis: '—',
  asignacionFamiliar: [],
  fetchedAt: '',
};

function fmt(n: number | undefined | null, decimals = 2): string {
  if (n == null) return '—';
  return n.toLocaleString('es-CL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtPesos(n: number | undefined | null): string {
  if (n == null) return '—';
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

async function fetchIndicadores(): Promise<ApiData> {
  const [minRes, prevRes] = await Promise.allSettled([
    fetch('https://mindicador.cl/api').then((r) => r.json()),
    fetch('https://api.boostr.cl/economy/previred.json').then((r) => r.json()),
  ]);

  const min = minRes.status === 'fulfilled' ? minRes.value : null;
  const prev = prevRes.status === 'fulfilled' ? prevRes.value?.data : null;

  const uf = min?.uf?.valor != null ? `$${fmt(min.uf.valor)}` : '—';
  const utm = min?.utm?.valor != null ? `$${fmt(min.utm.valor, 0)}` : '—';
  const dolar = min?.dolar?.valor != null ? `$${fmt(min.dolar.valor)}` : '—';

  const rentaMinima = prev?.remuneraciones?.sueldoMinimo?.general != null
    ? fmtPesos(prev.remuneraciones.sueldoMinimo.general)
    : '—';
  const rentaMinimaNoRemuneratoria = prev?.remuneraciones?.sueldoMinimo?.noRemuneratorias != null
    ? fmtPesos(prev.remuneraciones.sueldoMinimo.noRemuneratorias)
    : '—';
  const rentaMinimaJornada = prev?.remuneraciones?.sueldoMinimo?.jornadaParcial != null
    ? fmtPesos(prev.remuneraciones.sueldoMinimo.jornadaParcial)
    : '—';

  const afpRaw = prev?.afp ?? {};
  const afpRows = Object.entries(afpRaw).map(([nombre, vals]: [string, unknown]) => {
    const v = vals as Record<string, number>;
    return {
      nombre,
      dependiente: v.trabajador != null ? `${fmt(v.trabajador)}%` : '—',
      independiente: v.independiente != null ? `${fmt(v.independiente)}%` : '—',
    };
  });

  const sis = prev?.sis?.tasa != null ? `${fmt(prev.sis.tasa)}%` : '—';

  const asigRaw = prev?.asignacionFamiliar ?? [];
  const asignacionFamiliar = (asigRaw as Record<string, unknown>[]).map((t) => ({
    tramo: t.tramo as string ?? '—',
    monto: t.monto != null ? fmtPesos(t.monto as number) : '—',
  }));

  return {
    uf, utm, dolar,
    rentaMinima, rentaMinimaNoRemuneratoria, rentaMinimaJornada,
    afpRows, sis, asignacionFamiliar,
    fetchedAt: new Date().toISOString(),
  };
}

export function IndicadoresManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [apiData, setApiData] = useState<ApiData>(empty);
  const [fetchError, setFetchError] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setFetchError(false);
    try {
      const data = await fetchIndicadores();
      setApiData(data);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!apiData.fetchedAt) {
      toast.error('Primero carga los datos con "Actualizar".');
      return;
    }
    setSaving(true);
    const items = [
      { label: 'Valor UF', value: apiData.uf },
      { label: 'Valor UTM', value: apiData.utm },
      { label: 'Dólar observado', value: apiData.dolar },
      { label: 'Renta mínima (general)', value: apiData.rentaMinima },
      { label: 'Renta mínima (no remuneratoria)', value: apiData.rentaMinimaNoRemuneratoria },
      { label: 'Renta mínima (jornada parcial)', value: apiData.rentaMinimaJornada },
      { label: 'SIS', value: apiData.sis },
      ...apiData.afpRows.map((r) => ({
        label: `AFP ${r.nombre} (dependiente)`,
        value: r.dependiente,
      })),
      ...apiData.asignacionFamiliar.map((t) => ({
        label: `Asig. familiar ${t.tramo}`,
        value: t.monto,
      })),
    ];
    const payload: Indicadores = { enabled, items, updatedAt: apiData.fetchedAt };
    const res = await writeSetting(INDICADORES_KEY, payload);
    setSaving(false);
    if (res.ok) toast.success('Indicadores publicados');
    else toast.error(res.error || 'No se pudo guardar');
  };

  const thCls = 'text-left text-xs font-semibold text-gray-500 uppercase pb-1';
  const tdCls = 'text-sm text-gray-700 py-1 pr-4';

  return (
    <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e9ecef' }}>
      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Indicadores previsionales</h3>
        </div>
        <button
          onClick={() => void load(true)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Actualizar
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Valores obtenidos en tiempo real desde mindicador.cl y Previred. Haz clic en
        "Publicar" para guardarlos y mostrarlos en los dashboards.
      </p>

      <button
        type="button"
        onClick={() => setEnabled((e) => !e)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium mb-4 ${
          enabled
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-gray-100 text-gray-500 border border-gray-200'
        }`}
      >
        {enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        {enabled ? 'Visible al publicar' : 'Oculto al publicar'}
      </button>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
        </div>
      ) : fetchError ? (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          No se pudo obtener los datos. Verifica tu conexión e intenta con "Actualizar".
        </div>
      ) : (
        <div className="space-y-5">

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'UF', value: apiData.uf },
              { label: 'UTM', value: apiData.utm },
              { label: 'Dólar', value: apiData.dolar },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-0.5">{item.label}</p>
                <p className="text-base font-bold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Rentas mínimas</p>
            <table className="w-full">
              <tbody>
                <tr><td className={tdCls + ' text-gray-500'}>General</td><td className="text-sm font-medium text-gray-900">{apiData.rentaMinima}</td></tr>
                <tr><td className={tdCls + ' text-gray-500'}>No remuneratoria</td><td className="text-sm font-medium text-gray-900">{apiData.rentaMinimaNoRemuneratoria}</td></tr>
                <tr><td className={tdCls + ' text-gray-500'}>Jornada parcial</td><td className="text-sm font-medium text-gray-900">{apiData.rentaMinimaJornada}</td></tr>
              </tbody>
            </table>
          </div>

          {apiData.afpRows.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Cotizaciones AFP</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className={thCls + ' w-1/3'}>AFP</th>
                      <th className={thCls}>Dependiente</th>
                      <th className={thCls}>Independiente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiData.afpRows.map((r) => (
                      <tr key={r.nombre} className="border-t border-gray-100">
                        <td className={tdCls}>{r.nombre}</td>
                        <td className={tdCls}>{r.dependiente}</td>
                        <td className={tdCls}>{r.independiente}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
            <span className="text-sm text-gray-600">SIS (Seguro de Invalidez y Sobrevivencia)</span>
            <span className="text-sm font-bold text-gray-900">{apiData.sis}</span>
          </div>

          {apiData.asignacionFamiliar.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Asignación familiar</p>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={thCls}>Tramo</th>
                    <th className={thCls}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {apiData.asignacionFamiliar.map((t, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className={tdCls}>{t.tramo}</td>
                      <td className={tdCls}>{t.monto}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {apiData.fetchedAt && (
            <p className="text-xs text-gray-400 text-right">
              Obtenido el{' '}
              {new Date(apiData.fetchedAt).toLocaleString('es-CL', {
                timeZone: 'America/Santiago',
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: false,
              })}
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end mt-4">
        <button
          onClick={save}
          disabled={saving || loading || fetchError}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
          Publicar indicadores
        </button>
      </div>
    </div>
  );
}
