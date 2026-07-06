import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { insertAuditLog } from '../_shared/audit.ts';

type ActionType = 'view' | 'download';

function getClientIp(req: Request) {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    null
  );
}

function getAuthToken(req: Request) {
  return req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const token = getAuthToken(req);

    if (!token) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      storage_path,
      document_id,
      action = 'view',
      expires_in = 3600,
    }: {
      storage_path?: string;
      document_id?: string;
      action?: ActionType;
      expires_in?: number;
    } = body;

    if (!storage_path && !document_id) {
      return new Response(
        JSON.stringify({ error: 'storage_path o document_id es requerido' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let documentQuery = supabase
      .from('documents')
      .select(
        'id, enterprise_id, user_id, uploaded_by, storage_path, original_name'
      )
      .limit(1);

    documentQuery = document_id
      ? documentQuery.eq('id', document_id)
      : documentQuery.eq('storage_path', storage_path);

    const { data: document, error: documentError } =
      await documentQuery.single();

    if (documentError || !document) {
      return new Response(JSON.stringify({ error: 'Documento no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profileRow, error: profileError } = await supabase
      .from('kv_store_7d36b31f')
      .select('value')
      .eq('key', `slc_user:${user.id}`)
      .maybeSingle();

    if (profileError) {
      console.error('Error cargando perfil:', profileError);
    }

    const profile = profileRow?.value || {};
    const role = profile.rol || profile.role;
    const empresaId = profile.empresaId || profile.empresa_id;
    const canAccess =
      ['admin', 'superadmin'].includes(role) ||
      document.user_id === user.id ||
      document.uploaded_by === user.id ||

      (role === 'empresa' && empresaId && document.enterprise_id === empresaId);

    if (!canAccess) {
      return new Response(JSON.stringify({ error: 'Acceso denegado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const safeExpiry = Math.min(Math.max(Number(expires_in) || 3600, 60), 3600);

    const signOptions =
      action === 'download'
        ? { download: document.original_name || true }
        : undefined;
    const { data: signed, error: signedError } = await supabase.storage
      .from('documents')
      .createSignedUrl(document.storage_path, safeExpiry, signOptions);

    const ipAddress = getClientIp(req);
    const userAgent = req.headers.get('user-agent');
    const success = !signedError && Boolean(signed?.signedUrl);
    const auditLog = await insertAuditLog(supabase, {
      action: action === 'download' ? 'DOCUMENT_DOWNLOAD' : 'DOCUMENT_VIEW',
      userId: user.id,
      resourceType: 'document',
      resourceId: document.id,
      resourcePath: document.storage_path,
      enterpriseId: document.enterprise_id,
      success,
      errorMessage: signedError?.message || null,
      ipAddress,
      userAgent,
      metadata: {
        original_name: document.original_name,
        expires_in: safeExpiry,
      },
    });

    if (success) {
      await supabase.from('document_views').insert({
        document_id: document.id,
        viewer_id: user.id,
        viewer_email: user.email,
        viewer_nombre:
          `${profile.nombre || ''} ${profile.apellido || ''}`.trim() || null,
        viewer_empresa_id: empresaId || null,
        owner_id: document.uploaded_by || document.user_id || user.id,
        owner_empresa_id: document.enterprise_id,
        action_type: action,
        ip_address: ipAddress,
        user_agent: userAgent,
        audit_log_id: auditLog?.id || null,
      });
    }

    if (!success) {
      return new Response(
        JSON.stringify({ error: signedError?.message || 'Error generando URL' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        signedUrl: signed!.signedUrl,
        expiresIn: safeExpiry,
        auditLogId: auditLog?.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error interno',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
