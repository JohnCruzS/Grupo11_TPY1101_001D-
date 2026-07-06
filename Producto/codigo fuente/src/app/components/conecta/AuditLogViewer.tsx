import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Search,
  Filter,
  Calendar,
  CheckCircle,
  XCircle,
  Shield,
  FileSpreadsheet,
  FileType2,
  Printer,
  RefreshCw,
  ChevronDown,
  Eye,
  Users,
  Send,
  UserPlus,
  Copy,
  Check,
} from 'lucide-react';
import { useAuditLogs } from '../../hooks';
import { parseAuditDate } from '../../hooks/useAuditLogs';
import { getSupabase } from '../../context/AuthContext';
import type { AuditLog } from '../../types/database';

interface AuditLogViewerProps {
  userId?: string;
  enterpriseId?: string;
  resourceType?: string;
  showTitle?: boolean;
  maxHeight?: string;
}

const ACTION_LABELS: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  DOCUMENT_UPLOAD: {
    label: 'Subida de Documento',
    color: '#3182ce',
    icon: <FileText size={14} />,
  },
  DOCUMENT_DOWNLOAD: {
    label: 'Descarga de Documento',
    color: '#38a169',
    icon: <Download size={14} />,
  },
  DOCUMENT_DELETE: {
    label: 'Eliminación de Documento',
    color: '#e53e3e',
    icon: <FileText size={14} />,
  },
  DOCUMENT_VIEW: {
    label: 'Visualización de Documento',
    color: '#805ad5',
    icon: <Eye size={14} />,
  },
  LOGIN: {
    label: 'Inicio de Sesión',
    color: '#3182ce',
    icon: <CheckCircle size={14} />,
  },
  LOGOUT: {
    label: 'Cierre de Sesión',
    color: '#718096',
    icon: <XCircle size={14} />,
  },
  USER_CREATE: {
    label: 'Creación de Usuario',
    color: '#38a169',
    icon: <CheckCircle size={14} />,
  },
  USER_UPDATE: {
    label: 'Actualización de Usuario',
    color: '#d69e2e',
    icon: <RefreshCw size={14} />,
  },
  USER_DELETE: {
    label: 'Eliminación de Usuario',
    color: '#e53e3e',
    icon: <XCircle size={14} />,
  },
  USER_ASSIGN: {
    label: 'Asignación a Empresa',
    color: '#3b82f6',
    icon: <Users size={14} />,
  },
  MESSAGE_SEND: {
    label: 'Envío de Mensaje',
    color: '#0ea5e9',
    icon: <Send size={14} />,
  },
  EMPLOYEE_CREATE: {
    label: 'Creación de Empleado',
    color: '#16a34a',
    icon: <UserPlus size={14} />,
  },
  EMPLOYEE_UPDATE: {
    label: 'Actualización de Empleado',
    color: '#d69e2e',
    icon: <RefreshCw size={14} />,
  },
  EMPLOYEE_DEACTIVATE: {
    label: 'Desvinculación de Empleado',
    color: '#dc2626',
    icon: <XCircle size={14} />,
  },
  DEPENDENT_CREATE: {
    label: 'Creación de Carga Familiar',
    color: '#16a34a',
    icon: <UserPlus size={14} />,
  },
  DEPENDENT_DEACTIVATE: {
    label: 'Baja de Carga Familiar',
    color: '#dc2626',
    icon: <XCircle size={14} />,
  },
  ENTERPRISE_CREATE: {
    label: 'Creación de Empresa',
    color: '#38a169',
    icon: <CheckCircle size={14} />,
  },
  ENTERPRISE_UPDATE: {
    label: 'Actualización de Empresa',
    color: '#d69e2e',
    icon: <RefreshCw size={14} />,
  },
  ENTERPRISE_DELETE: {
    label: 'Eliminación de Empresa',
    color: '#dc2626',
    icon: <XCircle size={14} />,
  },
  PAYMENT_CREATE: {
    label: 'Creación de Pago',
    color: '#3182ce',
    icon: <CheckCircle size={14} />,
  },
  SUBSCRIPTION_UPDATE: {
    label: 'Actualización de Suscripción',
    color: '#d69e2e',
    icon: <RefreshCw size={14} />,
  },
};

export function AuditLogViewer({
  userId,
  enterpriseId,
  resourceType,
  showTitle = true,
  maxHeight = '600px',
}: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});

  const {
    getAuditLogs,
    exportToCSV,
    exportToExcel,
    generatePDFReport,
    verifyIntegrity,
    isLoading,
    error,
  } = useAuditLogs();

  useEffect(() => {
    loadLogs();
  }, [userId, enterpriseId, resourceType]);

  useEffect(() => {
    let filtered = logs;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(term) ||
          log.resource_type?.toLowerCase().includes(term) ||
          log.user_id?.toLowerCase().includes(term) ||
          log.error_message?.toLowerCase().includes(term)
      );
    }

    if (actionFilter) {
      filtered = filtered.filter((log) => log.action === actionFilter);
    }

    if (dateRange.start) {
      filtered = filtered.filter((log) => log.timestamp >= dateRange.start);
    }

    if (dateRange.end) {
      filtered = filtered.filter((log) => log.timestamp <= dateRange.end);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, actionFilter, dateRange]);

  const loadLogs = async () => {
    const filters: any = {};
    if (userId) filters.userId = userId;
    if (enterpriseId) filters.enterpriseId = enterpriseId;
    if (resourceType) filters.resourceType = resourceType;

    const data = await getAuditLogs(filters);
    setLogs(data);
    setFilteredLogs(data);

    const uniqueIds = [...new Set(data.map((l) => l.user_id).filter(Boolean))] as string[];
    if (uniqueIds.length > 0) {
      const supabase = getSupabase();
      const keys = uniqueIds.map((id) => `slc_user:${id}`);
      const { data: kvRows } = await supabase
        .from('kv_store_7d36b31f')
        .select('key, value')
        .in('key', keys);
      if (kvRows) {
        const map: Record<string, string> = {};
        for (const row of kvRows) {
          const id = (row.key as string).replace('slc_user:', '');
          const v = row.value as any;
          const nombre = [v?.nombre, v?.apellido].filter(Boolean).join(' ') || v?.email || null;
          if (nombre) map[id] = nombre;
        }
        setUserProfiles(map);
      }
    }
  };

  const handleExportCSV = () => {
    exportToCSV(
      filteredLogs,
      `audit_report_${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  const handleExportExcel = () => {
    exportToExcel(
      filteredLogs,
      `audit_report_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  const handleExportPDF = () => {
    generatePDFReport(filteredLogs, 'Reporte de Auditoría - SotLoy Conecta');
  };

  const formatDate = (timestamp: string) => {

    return parseAuditDate(timestamp).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Santiago',
    });
  };

  const getActionDisplay = (action: string) => {
    return (
      ACTION_LABELS[action] || {
        label: action,
        color: '#718096',
        icon: <FileText size={14} />,
      }
    );
  };

  if (error) {
    return (
      <div
        style={{
          padding: '20px',
          background: '#fed7d7',
          borderRadius: '8px',
          color: '#c53030',
        }}
      >
        <p>
          <strong>Error:</strong> {error}
        </p>
        <button onClick={loadLogs} style={{ marginTop: '10px' }}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >

      {showTitle && (
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '1.25rem',
                color: '#1a202c',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Shield size={20} style={{ color: '#3182ce' }} />
              Trazabilidad Forense - Audit Logs
            </h2>
            <p
              style={{
                margin: '4px 0 0 0',
                color: '#718096',
                fontSize: '0.875rem',
              }}
            >
              Registro inmutable de todas las acciones en el sistema
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                background: '#edf2f7',
                border: 'none',
                borderRadius: '6px',
                cursor: filteredLogs.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                opacity: filteredLogs.length === 0 ? 0.5 : 1,
              }}
            >
              <FileSpreadsheet size={16} />
              CSV
            </button>
            <button
              onClick={handleExportExcel}
              disabled={filteredLogs.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                background: '#edf2f7',
                border: 'none',
                borderRadius: '6px',
                cursor: filteredLogs.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                opacity: filteredLogs.length === 0 ? 0.5 : 1,
              }}
            >
              <FileType2 size={16} />
              Excel
            </button>
            <button
              onClick={handleExportPDF}
              disabled={filteredLogs.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                background: '#3182ce',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: filteredLogs.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                opacity: filteredLogs.length === 0 ? 0.5 : 1,
              }}
            >
              <Printer size={16} />
              PDF
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f7fafc',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >

          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#a0aec0',
              }}
            />
            <input
              type="text"
              placeholder="Buscar por acción, recurso, usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '0.875rem',
              minWidth: '180px',
            }}
          >
            <option value="">Todas las acciones</option>
            {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              background: showFilters ? '#3182ce' : 'white',
              color: showFilters ? 'white' : '#4a5568',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            <Filter size={16} />
            Filtros
            <ChevronDown
              size={14}
              style={{ transform: showFilters ? 'rotate(180deg)' : 'none' }}
            />
          </button>

          <button
            onClick={loadLogs}
            disabled={isLoading}
            style={{
              padding: '8px',
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw
              size={16}
              style={{
                animation: isLoading ? 'spin 1s linear infinite' : 'none',
              }}
            />
          </button>
        </div>

        {showFilters && (
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} color="#718096" />
              <span style={{ fontSize: '0.875rem', color: '#4a5568' }}>
                Desde:
              </span>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
                style={{
                  padding: '6px 10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.875rem', color: '#4a5568' }}>
                Hasta:
              </span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end: e.target.value })
                }
                style={{
                  padding: '6px 10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                }}
              />
            </div>
            <button
              onClick={() => {
                setSearchTerm('');
                setActionFilter('');
                setDateRange({ start: '', end: '' });
              }}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: '#718096',
              }}
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          padding: '12px 20px',
          background: '#f7fafc',
          borderBottom: '1px solid #e2e8f0',
          fontSize: '0.875rem',
          color: '#4a5568',
          display: 'flex',
          gap: '24px',
        }}
      >
        <span>
          <strong>{filteredLogs.length}</strong> registros
        </span>
        {searchTerm && <span>Filtrado por: "{searchTerm}"</span>}
        {actionFilter && (
          <span>Acción: {ACTION_LABELS[actionFilter]?.label}</span>
        )}
      </div>

      <div style={{ maxHeight, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead
            style={{
              position: 'sticky',
              top: 0,
              background: 'white',
              zIndex: 10,
            }}
          >
            <tr>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderBottom: '2px solid #e2e8f0',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#4a5568',
                  textTransform: 'uppercase',
                }}
              >
                Fecha/Hora
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderBottom: '2px solid #e2e8f0',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#4a5568',
                  textTransform: 'uppercase',
                }}
              >
                Acción
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderBottom: '2px solid #e2e8f0',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#4a5568',
                  textTransform: 'uppercase',
                }}
              >
                Usuario
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderBottom: '2px solid #e2e8f0',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#4a5568',
                  textTransform: 'uppercase',
                }}
              >
                Recurso
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  borderBottom: '2px solid #e2e8f0',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#4a5568',
                  textTransform: 'uppercase',
                }}
              >
                Estado
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderBottom: '2px solid #e2e8f0',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#4a5568',
                  textTransform: 'uppercase',
                }}
              >
                IP
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#718096',
                  }}
                >
                  {isLoading ? 'Cargando...' : 'No hay registros de auditoría'}
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const action = getActionDisplay(log.action);
                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    style={{
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      background:
                        selectedLog?.id === log.id ? '#ebf8ff' : 'transparent',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = '#f7fafc')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        selectedLog?.id === log.id ? '#ebf8ff' : 'transparent')
                    }
                  >
                    <td
                      style={{
                        padding: '12px',
                        borderBottom: '1px solid #e2e8f0',
                        fontSize: '0.875rem',
                        color: '#4a5568',
                      }}
                    >
                      {formatDate(log.timestamp)}
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        borderBottom: '1px solid #e2e8f0',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span style={{ color: action.color }}>
                          {action.icon}
                        </span>
                        <span
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: '#2d3748',
                          }}
                        >
                          {action.label}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        borderBottom: '1px solid #e2e8f0',
                        fontSize: '0.875rem',
                        color: '#4a5568',
                      }}
                    >
                      {log.user_id
                        ? (userProfiles[log.user_id] || `${log.user_id.slice(0, 8)}…`)
                        : 'Sistema'}
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        borderBottom: '1px solid #e2e8f0',
                        fontSize: '0.875rem',
                        color: '#4a5568',
                      }}
                    >
                      {log.resource_type || 'N/A'}
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        borderBottom: '1px solid #e2e8f0',
                        textAlign: 'center',
                      }}
                    >
                      {log.success ? (
                        <CheckCircle size={18} color="#38a169" />
                      ) : (
                        <XCircle size={18} color="#e53e3e" />
                      )}
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        borderBottom: '1px solid #e2e8f0',
                        fontSize: '0.875rem',
                        color: '#4a5568',
                        fontFamily: 'monospace',
                      }}
                    >
                      {log.ip_address || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1a202c' }}>
                Detalle de Auditoría
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#718096',
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <DetailRow label="ID" value={selectedLog.id} />
              <DetailRow
                label="Acción"
                value={
                  ACTION_LABELS[selectedLog.action]?.label || selectedLog.action
                }
              />
              <DetailRow
                label="Timestamp"
                value={formatDate(selectedLog.timestamp)}
              />
              <DetailRow
                label="Usuario"
                value={
                  selectedLog.user_id
                    ? (userProfiles[selectedLog.user_id]
                        ? `${userProfiles[selectedLog.user_id]}`
                        : 'Sin nombre')
                    : 'Sistema'
                }
              />
              {selectedLog.user_id && (
                <DetailRow
                  label="Usuario ID"
                  value={selectedLog.user_id}
                  copyable
                />
              )}
              <DetailRow
                label="Tipo Recurso"
                value={selectedLog.resource_type || 'N/A'}
              />
              <DetailRow
                label="ID Recurso"
                value={selectedLog.resource_id || 'N/A'}
              />
              <DetailRow
                label="Path Recurso"
                value={selectedLog.resource_path || 'N/A'}
              />
              <DetailRow
                label="Empresa ID"
                value={selectedLog.enterprise_id || 'N/A'}
              />
              <DetailRow
                label="Éxito"
                value={selectedLog.success ? 'Sí' : 'No'}
              />
              {selectedLog.error_message && (
                <DetailRow
                  label="Error"
                  value={selectedLog.error_message}
                  isError
                />
              )}
              <DetailRow
                label="IP Address"
                value={selectedLog.ip_address || 'N/A'}
              />
              <DetailRow
                label="User Agent"
                value={selectedLog.user_agent || 'N/A'}
              />
              <DetailRow
                label="Hash Prev"
                value={selectedLog.hash_prev || 'N/A'}
              />

              {selectedLog.hash_sha256 && (
                <DetailRow label="Hash SHA-256" value={selectedLog.hash_sha256} copyable mono />
              )}

              {selectedLog.metadata && (
                <div style={{ marginTop: '16px' }}>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#4a5568',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Metadata
                  </div>
                  <pre
                    style={{
                      fontSize: '0.75rem',
                      background: '#f7fafc',
                      padding: '12px',
                      borderRadius: '6px',
                      overflow: 'auto',
                    }}
                  >
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  isError = false,
  copyable = false,
  mono = false,
}: {
  label: string;
  value: string;
  isError?: boolean;
  copyable?: boolean;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        padding: '8px 0',
        borderBottom: '1px solid #f0f0f0',
        gap: '8px',
      }}
    >
      <span
        style={{
          width: '140px',
          flexShrink: 0,
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#718096',
          textTransform: 'uppercase',
          paddingTop: '2px',
        }}
      >
        {label}
      </span>
      <span
        style={{
          flex: 1,
          fontSize: '0.875rem',
          color: isError ? '#e53e3e' : '#2d3748',
          wordBreak: 'break-all',
          fontFamily: mono ? 'monospace' : undefined,
        }}
      >
        {value}
      </span>
      {copyable && (
        <button
          onClick={handleCopy}
          title="Copiar"
          style={{
            flexShrink: 0,
            background: 'none',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            padding: '2px 6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: copied ? '#38a169' : '#718096',
            fontSize: '0.75rem',
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      )}
    </div>
  );
}
