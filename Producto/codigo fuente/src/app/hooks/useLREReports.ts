import { useState, useCallback } from 'react';
import { getSupabase } from '../context/AuthContext';

export interface LREReportData {
  empresaRut: string;
  empresaNombre: string;
  periodo: string;
  trabajadores: LRETrabajadorData[];
}

export interface LRETrabajadorData {
  rut: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  fechaIngreso: string;
  sueldoBase: number;
  gratificacion: number;
  horasExtras: number;
  comisiones: number;
  bonos: number;
  aguinaldos: number;
  totalImponible: number;
  afp: number;
  salud: number;
  seguroCesantia: number;
  impuestoUnico: number;
  totalDescuentosLegales: number;
  anticipos: number;
  prestamos: number;
  otrosDescuentos: number;
  totalDescuentos: number;
  totalLiquido: number;
}

export interface UseLREReportsReturn {
  generateLRECSV: (data: LREReportData) => string;
  generateLREXML: (data: LREReportData) => string;
  downloadLRECSV: (data: LREReportData, filename?: string) => void;
  downloadLREXML: (data: LREReportData, filename?: string) => void;
  loadEmpresaData: (empresaId: string) => Promise<LREReportData | null>;
  loading: boolean;
  error: string | null;
}

export function generateLRECSV(data: LREReportData): string {
  const headers = [
    'RUT_EMPRESA',
    'NOMBRE_EMPRESA',
    'PERIODO',
    'RUT_TRABAJADOR',
    'NOMBRES',
    'APELLIDOS',
    'CARGO',
    'FECHA_INGRESO',
    'SUELDO_BASE',
    'GRATIFICACION',
    'HORAS_EXTRAS',
    'COMISIONES',
    'BONOS',
    'AGUINALDOS',
    'TOTAL_IMPONIBLE',
    'AFP',
    'SALUD',
    'SEGURO_CESANTIA',
    'IMPUESTO_UNICO',
    'TOTAL_DSCTOS_LEGALES',
    'ANTICIPOS',
    'PRESTAMOS',
    'OTROS_DSCTOS',
    'TOTAL_DSCTOS',
    'TOTAL_LIQUIDO',
  ];

  const rows = data.trabajadores.map((t) => [
    data.empresaRut,
    data.empresaNombre,
    data.periodo,
    t.rut,
    t.nombres,
    t.apellidos,
    t.cargo,
    t.fechaIngreso,
    t.sueldoBase.toFixed(0),
    t.gratificacion.toFixed(0),
    t.horasExtras.toFixed(0),
    t.comisiones.toFixed(0),
    t.bonos.toFixed(0),
    t.aguinaldos.toFixed(0),
    t.totalImponible.toFixed(0),
    t.afp.toFixed(0),
    t.salud.toFixed(0),
    t.seguroCesantia.toFixed(0),
    t.impuestoUnico.toFixed(0),
    t.totalDescuentosLegales.toFixed(0),
    t.anticipos.toFixed(0),
    t.prestamos.toFixed(0),
    t.otrosDescuentos.toFixed(0),
    t.totalDescuentos.toFixed(0),
    t.totalLiquido.toFixed(0),
  ]);

  return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
}

export function generateLREXML(data: LREReportData): string {
  const trabajadoresXML = data.trabajadores
    .map(
      (t) => `
    <Trabajador>
      <RUT>${escapeXml(t.rut)}</RUT>
      <Nombres>${escapeXml(t.nombres)}</Nombres>
      <Apellidos>${escapeXml(t.apellidos)}</Apellidos>
      <Cargo>${escapeXml(t.cargo)}</Cargo>
      <FechaIngreso>${t.fechaIngreso}</FechaIngreso>
      <Remuneraciones>
        <SueldoBase>${t.sueldoBase.toFixed(0)}</SueldoBase>
        <Gratificacion>${t.gratificacion.toFixed(0)}</Gratificacion>
        <HorasExtras>${t.horasExtras.toFixed(0)}</HorasExtras>
        <Comisiones>${t.comisiones.toFixed(0)}</Comisiones>
        <Bonos>${t.bonos.toFixed(0)}</Bonos>
        <Aguinaldos>${t.aguinaldos.toFixed(0)}</Aguinaldos>
        <TotalImponible>${t.totalImponible.toFixed(0)}</TotalImponible>
      </Remuneraciones>
      <DescuentosLegales>
        <AFP>${t.afp.toFixed(0)}</AFP>
        <Salud>${t.salud.toFixed(0)}</Salud>
        <SeguroCesantia>${t.seguroCesantia.toFixed(0)}</SeguroCesantia>
        <ImpuestoUnico>${t.impuestoUnico.toFixed(0)}</ImpuestoUnico>
        <TotalDescuentosLegales>${t.totalDescuentosLegales.toFixed(0)}</TotalDescuentosLegales>
      </DescuentosLegales>
      <DescuentosAdicionales>
        <Anticipos>${t.anticipos.toFixed(0)}</Anticipos>
        <Prestamos>${t.prestamos.toFixed(0)}</Prestamos>
        <OtrosDescuentos>${t.otrosDescuentos.toFixed(0)}</OtrosDescuentos>
        <TotalDescuentos>${t.totalDescuentos.toFixed(0)}</TotalDescuentos>
      </DescuentosAdicionales>
      <TotalLiquido>${t.totalLiquido.toFixed(0)}</TotalLiquido>
    </Trabajador>
  `
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<LibroRemuneracionesElectronico>
  <Encabezado>
    <RUT_Empresa>${escapeXml(data.empresaRut)}</RUT_Empresa>
    <Nombre_Empresa>${escapeXml(data.empresaNombre)}</Nombre_Empresa>
    <Periodo>${data.periodo}</Periodo>
    <Fecha_Generacion>${new Date().toISOString()}</Fecha_Generacion>
    <Version>1.0</Version>
  </Encabezado>
  <Trabajadores>
    ${trabajadoresXML}
  </Trabajadores>
</LibroRemuneracionesElectronico>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

export function useLREReports(): UseLREReportsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabase();

  const downloadLRECSV = useCallback(
    (data: LREReportData, filename?: string) => {
      const csv = generateLRECSV(data);
      const blob = new Blob(['\uFEFF' + csv], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `LRE_${data.empresaRut}_${data.periodo}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    []
  );

  const downloadLREXML = useCallback(
    (data: LREReportData, filename?: string) => {
      const xml = generateLREXML(data);
      const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `LRE_${data.empresaRut}_${data.periodo}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    []
  );

  const loadEmpresaData = useCallback(
    async (empresaId: string): Promise<LREReportData | null> => {
      setLoading(true);
      setError(null);

      try {

        const { data: empresa, error: empresaError } = await supabase
          .from('enterprises')
          .select('id, name, rut')
          .eq('id', empresaId)
          .single();

        if (empresaError || !empresa) {
          throw new Error(
            'Error cargando datos de empresa: ' + empresaError?.message
          );
        }

        const { data: empleados, error: empleadosError } = await supabase
          .from('empleados')
          .select('*')
          .eq('empresa_id', empresaId)
          .eq('activo', true);

        if (empleadosError) {
          throw new Error(
            'Error cargando empleados: ' + empleadosError.message
          );
        }

        const trabajadores: LRETrabajadorData[] = (empleados || []).map((e) => {
          const sueldoBase = Number(e.salario) || 350000;
          const gratificacion = sueldoBase * 0.25;
          const totalImponible = sueldoBase + gratificacion;
          const afp = totalImponible * 0.1;
          const salud = totalImponible * 0.07;
          const seguroCesantia = totalImponible * 0.006;
          const impuestoUnico = totalImponible * 0.04;
          const totalDescuentosLegales =
            afp + salud + seguroCesantia + impuestoUnico;
          const totalLiquido = totalImponible - totalDescuentosLegales;

          return {
            rut: e.rut,
            nombres: e.nombre,
            apellidos: e.apellido,
            cargo: e.cargo || 'Empleado',
            fechaIngreso:
              e.fecha_contratacion || new Date().toISOString().split('T')[0],
            sueldoBase,
            gratificacion,
            horasExtras: 0,
            comisiones: 0,
            bonos: 0,
            aguinaldos: 0,
            totalImponible,
            afp,
            salud,
            seguroCesantia,
            impuestoUnico,
            totalDescuentosLegales,
            anticipos: 0,
            prestamos: 0,
            otrosDescuentos: 0,
            totalDescuentos: totalDescuentosLegales,
            totalLiquido,
          };
        });

        const now = new Date();
        const periodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        return {
          empresaRut: empresa.rut || '76.123.456-7',
          empresaNombre: empresa.name,
          periodo,
          trabajadores,
        };
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Error cargando datos LRE';
        setError(msg);
        console.error('Error loading LRE data:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  return {
    generateLRECSV,
    generateLREXML,
    downloadLRECSV,
    downloadLREXML,
    loadEmpresaData,
    loading,
    error,
  };
}
