import { useState, useCallback } from 'react';
import { getSupabase } from '../context/AuthContext';
import type { AuditLog } from '../types/database';

export function parseAuditDate(ts: string): Date {
  if (!ts) return new Date(NaN);
  const trimmed = ts.trim();
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed);
  return new Date(hasTz ? trimmed : trimmed.replace(' ', 'T') + 'Z');
}

interface UseAuditLogsReturn {

  getAuditLogs: (filters?: AuditFilters) => Promise<AuditLog[]>;

  exportToCSV: (logs: AuditLog[], filename?: string) => void;

  exportToExcel: (logs: AuditLog[], filename?: string) => void;

  generatePDFReport: (logs: AuditLog[], title?: string) => void;

  verifyIntegrity: (log: AuditLog) => Promise<boolean>;

  isLoading: boolean;
  error: string | null;
}

interface AuditFilters {
  action?: string;
  userId?: string;
  resourceType?: string;
  enterpriseId?: string;
  startDate?: string;
  endDate?: string;
  success?: boolean;
  limit?: number;
}

export function useAuditLogs(): UseAuditLogsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabase();

  const getAuditLogs = useCallback(
    async (filters?: AuditFilters): Promise<AuditLog[]> => {
      setIsLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('audit_logs')
          .select('*')
          .order('timestamp', { ascending: false });

        if (filters?.action) {
          query = query.eq('action', filters.action);
        }
        if (filters?.userId) {
          query = query.eq('user_id', filters.userId);
        }
        if (filters?.resourceType) {
          query = query.eq('resource_type', filters.resourceType);
        }
        if (filters?.enterpriseId) {
          query = query.eq('enterprise_id', filters.enterpriseId);
        }
        if (filters?.success !== undefined) {
          query = query.eq('success', filters.success);
        }
        if (filters?.startDate) {
          query = query.gte('timestamp', filters.startDate);
        }
        if (filters?.endDate) {
          query = query.lte('timestamp', filters.endDate);
        }
        if (filters?.limit) {
          query = query.limit(filters.limit);
        } else {
          query = query.limit(1000);
        }

        const { data, error: queryError } = await query;

        if (queryError) throw queryError;

        return data || [];
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error cargando logs';
        setError(msg);
        console.error('Error getting audit logs:', err);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  const exportToCSV = useCallback(
    (logs: AuditLog[], filename: string = 'audit_report.csv') => {
      if (logs.length === 0) return;

      const headers = [
        'ID',
        'Acción',
        'Usuario ID',
        'Tipo Recurso',
        'ID Recurso',
        'Path Recurso',
        'Empresa ID',
        'Éxito',
        'Error',
        'IP Address',
        'User Agent',
        'Hash SHA-256',
        'Metadata',
        'Timestamp',
        'Created At',
      ];

      const rows = logs.map((log) => [
        log.id,
        log.action,
        log.user_id || '',
        log.resource_type || '',
        log.resource_id || '',
        log.resource_path || '',
        log.enterprise_id || '',
        log.success ? 'Sí' : 'No',
        log.error_message || '',
        log.ip_address || '',
        log.user_agent || '',
        log.hash_sha256 || '',
        log.metadata ? JSON.stringify(log.metadata) : '',
        log.timestamp,
        log.created_at,
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row
            .map((cell) =>

              typeof cell === 'string' &&
              (cell.includes(',') || cell.includes('"'))
                ? `"${cell.replace(/"/g, '""')}"`
                : cell
            )
            .join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    []
  );

  const exportToExcel = useCallback(
    (logs: AuditLog[], filename: string = 'audit_report.xlsx') => {

      exportToCSV(logs, filename.replace('.xlsx', '.csv'));
    },
    [exportToCSV]
  );

  const generatePDFReport = useCallback(
    (logs: AuditLog[], title: string = 'Reporte de Auditoría') => {
      if (logs.length === 0) return;

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const styles = `
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 10px; }
        .header-info { margin: 20px 0; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #3182ce; color: white; padding: 12px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
        tr:nth-child(even) { background: #f7fafc; }
        .success { color: #38a169; font-weight: bold; }
        .error { color: #e53e3e; font-weight: bold; }
        .hash { font-family: monospace; font-size: 0.85em; color: #4a5568; }
        @media print {
          body { margin: 20px; }
          .no-print { display: none; }
        }
      </style>
    `;

      const rows = logs
        .map(
          (log) => `
      <tr>
        <td>${parseAuditDate(log.timestamp).toLocaleString('es-CL', { timeZone: 'America/Santiago', hour12: false })}</td>
        <td>${log.action}</td>
        <td>${log.user_id?.slice(0, 8) || 'N/A'}...</td>
        <td>${log.resource_type || 'N/A'}</td>
        <td class="${log.success ? 'success' : 'error'}">${log.success ? '✓ Éxito' : '✗ Fallo'}</td>
        <td class="hash">${log.hash_sha256?.slice(0, 16) || 'N/A'}...</td>
        <td>${log.ip_address || 'N/A'}</td>
      </tr>
    `
        )
        .join('');

      printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        ${styles}
        <script>
          // Auto-ejecutar print cuando cargue la página
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="header-info">
          <p><strong>Fecha de generación:</strong> ${new Date().toLocaleString('es-CL')}</p>
          <p><strong>Total de registros:</strong> ${logs.length}</p>
          <p><strong>Usuario:</strong> ${logs[0]?.user_id ? 'Filtrado por usuario' : 'Todos los usuarios'}</p>
        </div>

        <div class="no-print" style="
          background: #f0f9ff; border: 1px solid #3182ce; padding: 15px;
          border-radius: 8px; margin-bottom: 20px; color: #1e40af;
        ">
          <strong>📄 Para guardar como PDF:</strong><br>
          1. En el diálogo de impresión, selecciona "Guardar como PDF" (o "Microsoft Print to PDF")<br>
          2. Click en Guardar<br>
          3. El PDF se descargará automáticamente
        </div>

        <button class="no-print" onclick="window.print()" style="
          background: #3182ce; color: white; border: none; padding: 10px 20px;
          border-radius: 5px; cursor: pointer; margin-bottom: 20px;
        ">🖨️ Imprimir / Guardar PDF</button>

        <table>
          <thead>
            <tr>
              <th>Fecha/Hora</th>
              <th>Acción</th>
              <th>Usuario</th>
              <th>Recurso</th>
              <th>Estado</th>
              <th>Hash (SHA-256)</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div style="margin-top: 40px; padding: 20px; background: #f7fafc; border-radius: 5px;">
          <h3>Información de Integridad</h3>
          <p>Este reporte incluye hashes SHA-256 para verificación de integridad.</p>
          <p>Los audit logs son inmutables y no pueden ser modificados una vez creados.</p>
          <p class="hash">Sistema: SotLoy Conecta | Cumplimiento: Trazabilidad Forense (Épica 2)</p>
        </div>
      </body>
      </html>
    `);

      printWindow.document.close();
    },
    []
  );

  const stableStringify = (value: unknown): string => {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map(stableStringify).join(',')}]`;
    }
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const entries = keys.map(
      (key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`
    );
    return `{${entries.join(',')}}`;
  };

  const sha256Hex = async (value: string) => {
    const data = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  };

  const verifyIntegrity = useCallback(async (log: AuditLog): Promise<boolean> => {
    if (!log.hash_sha256) return false;

    const payload = {
      action: log.action,
      user_id: log.user_id || null,
      resource_type: log.resource_type || null,
      resource_id: log.resource_id || null,
      resource_path: log.resource_path || null,
      enterprise_id: log.enterprise_id || null,
      success: log.success,
      error_message: log.error_message || null,
      ip_address: log.ip_address || null,
      user_agent: log.user_agent || null,
      metadata: log.metadata || null,
      timestamp: log.timestamp,
      prev_hash: log.hash_prev || null,
    };

    const computed = await sha256Hex(stableStringify(payload));
    return computed === log.hash_sha256;
  }, []);

  return {
    getAuditLogs,
    exportToCSV,
    exportToExcel,
    generatePDFReport,
    verifyIntegrity,
    isLoading,
    error,
  };
}
