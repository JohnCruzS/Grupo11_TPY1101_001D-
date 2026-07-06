type AuditLogInput = {
  action: string;
  userId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  resourcePath?: string | null;
  enterpriseId?: string | null;
  success: boolean;
  errorMessage?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  timestamp?: string;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
  return `{${entries.join(',')}}`;
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function insertAuditLog(
  supabase: { from: (table: string) => any },
  input: AuditLogInput
) {
  const timestamp = input.timestamp || new Date().toISOString();
  const { data: lastLog } = await supabase
    .from('audit_logs')
    .select('hash_sha256')
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevHash = lastLog?.hash_sha256 || null;
  const payload = {
    action: input.action,
    user_id: input.userId || null,
    resource_type: input.resourceType || null,
    resource_id: input.resourceId || null,
    resource_path: input.resourcePath || null,
    enterprise_id: input.enterpriseId || null,
    success: input.success,
    error_message: input.errorMessage || null,
    ip_address: input.ipAddress || null,
    user_agent: input.userAgent || null,
    metadata: input.metadata || null,
    timestamp,
    prev_hash: prevHash,
  };

  const hash = await sha256Hex(stableStringify(payload));

  const { prev_hash: _, ...dbPayload } = payload;

  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      ...dbPayload,
      hash_prev: prevHash,
      hash_sha256: hash,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error insertando audit log:', error);
  }

  return { id: data?.id || null, hash };
}
