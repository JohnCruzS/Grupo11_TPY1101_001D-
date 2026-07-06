

export interface Empleado {
  id: string;
  empresa_id: string;

  rut: string;
  nombre: string;
  apellido: string;
  email?: string;
  telefono?: string;

  departamento?: string;
  cargo?: string;
  fecha_contratacion?: string;
  tipo_contrato: 'indefinido' | 'plazo_fijo' | 'honorarios' | 'otro';
  salario?: number;

  activo: boolean;
  fecha_desvinculacion?: string;
  motivo_desvinculacion?: string;

  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Carga {
  id: string;
  empleado_id: string;

  rut?: string;
  nombre: string;
  apellido: string;
  parentesco: 'conyuge' | 'hijo' | 'hija' | 'padre' | 'madre' | 'otro';

  fecha_nacimiento?: string;
  fecha_vencimiento_carga?: string;

  activa: boolean;

  created_at: string;
  updated_at: string;
}

export interface DocumentoVersion {
  id: string;
  documento_id: string;

  numero_version: number;
  archivo_path: string;
  archivo_nombre: string;

  hash_sha256: string;

  tamano_bytes: number;
  mime_type?: string;

  created_by?: string;
  created_at: string;

  cambios_descripcion?: string;
}

export interface Subscription {
  id: string;
  empresa_id: string;

  plan: 'basic' | 'pro' | 'enterprise';

  estado: 'trial' | 'active' | 'suspended' | 'cancelled';

  fecha_inicio: string;
  fecha_fin?: string;
  fecha_cancelacion?: string;

  incluye_ia: boolean;
  limite_consultas_ia: number;
  consultas_realizadas: number;

  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  subscription_id: string;

  monto: number;
  moneda: string;

  estado: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';

  referencia_flow?: string;
  flow_order_id?: string;

  fecha_creacion: string;
  fecha_pago?: string;
  fecha_vencimiento?: string;

  flow_response?: Record<string, any>;

  confirmed_by_webhook: boolean;
  webhook_timestamp?: string;
}

export interface Notificacion {
  id: string;
  user_id: string;

  titulo: string;
  mensaje: string;
  tipo: 'info' | 'success' | 'warning' | 'error';

  link?: string;
  link_text?: string;

  leida: boolean;
  fecha_leida?: string;

  created_at: string;
  created_by?: string;
  expires_at?: string;
}

export interface Document {
  id: string;
  enterprise_id: string;
  user_id?: string;
  empleado_id?: string;

  filename: string;
  original_name: string;
  file_type: string;
  file_category:
    | 'contract'
    | 'payroll'
    | 'termination'
    | 'annex'
    | 'legal'
    | 'other';
  file_size: number;
  mime_type: string;

  storage_path: string;
  storage_url?: string | null;
  version_actual_id?: string;

  hash_sha256?: string;

  description?: string;
  tags?: string[];
  uploaded_by: string;
  uploaded_at: string;

  recipient_type?: 'admin' | 'worker' | 'enterprise';
}

export interface Enterprise {
  id: string;
  name: string;
  rut?: string;
  email?: string;

  subscription_status: 'trial' | 'active' | 'suspended' | 'cancelled';
  plan?: string;
  plan_price?: number | null;

  created_at: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  action:
    | 'DOCUMENT_UPLOAD'
    | 'DOCUMENT_DOWNLOAD'
    | 'DOCUMENT_DELETE'
    | 'LOGIN'
    | 'LOGOUT'
    | 'USER_CREATE'
    | 'USER_UPDATE'
    | 'USER_DELETE'
    | 'USER_ASSIGN'
    | 'MESSAGE_SEND'
    | 'EMPLOYEE_CREATE'
    | 'EMPLOYEE_UPDATE'
    | 'EMPLOYEE_DEACTIVATE'
    | 'DEPENDENT_CREATE'
    | 'DEPENDENT_DEACTIVATE'
    | 'ENTERPRISE_CREATE'
    | 'ENTERPRISE_UPDATE'
    | 'ENTERPRISE_DELETE'
    | 'PAYMENT_CREATE'
    | 'SUBSCRIPTION_UPDATE'
    | string;
  user_id?: string;
  resource_type?: string;
  resource_id?: string;
  resource_path?: string;
  enterprise_id?: string;
  success: boolean;
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
  hash_sha256?: string;
  hash_prev?: string;
  metadata?: Record<string, any>;
  timestamp: string;
  created_at: string;
}

export interface DocumentView {
  id: string;
  document_id: string;
  viewer_id: string;
  viewer_email?: string;
  viewer_nombre?: string;
  viewer_empresa_id?: string;
  owner_id: string;
  owner_email?: string;
  owner_nombre?: string;
  owner_empresa_id?: string;
  action_type: 'view' | 'download' | 'share';
  ip_address?: string;
  user_agent?: string;
  viewed_at: string;
  audit_log_id?: string;

  viewer_name?: string;
  document_name?: string;
}

export interface DocumentViewStats {
  owner_id: string;
  document_id: string;
  unique_viewers: number;
  total_views: number;
  total_downloads: number;
  total_opens: number;
  last_viewed_at: string;

  document_name?: string;
}
