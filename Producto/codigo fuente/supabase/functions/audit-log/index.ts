import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { insertAuditLog } from '../_shared/audit.ts';

const ALLOWED_ACTIONS = new Set([
  'LOGIN',
  'LOGOUT',
  'USER_CREATE',
  'USER_UPDATE',
  'USER_DELETE',
  'USER_ASSIGN',
  'MESSAGE_SEND',
  'DOCUMENT_UPLOAD',
  'DOCUMENT_DOWNLOAD',
  'DOCUMENT_DELETE',
  'DOCUMENT_VIEW',
  'EMPLOYEE_CREATE',
  'EMPLOYEE_UPDATE',
  'EMPLOYEE_DEACTIVATE',
  'DEPENDENT_CREATE',
  'DEPENDENT_DEACTIVATE',
  'ENTERPRISE_CREATE',
  'ENTERPRISE_UPDATE',
  'ENTERPRISE_DELETE',
  'PAYMENT_CREATE',
  'SUBSCRIPTION_UPDATE',
]);

function getAuthToken(req: Request) {
  return req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || null;
}

function getClientIp(req: Request) {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    null
  );
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
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
    const action = String(body?.action || '').toUpperCase();

    if (!ALLOWED_ACTIONS.has(action)) {
      return new Response(JSON.stringify({ error: 'Acción no permitida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ipAddress = getClientIp(req);
    const userAgent = req.headers.get('user-agent');

    await insertAuditLog(supabase, {
      action,
      userId: user.id,
      resourceType: body?.resourceType || 'user',
      resourceId: body?.resourceId || user.id,
      enterpriseId: body?.enterpriseId || null,
      success: body?.success !== false,
      errorMessage: body?.errorMessage || null,
      ipAddress,
      userAgent,
      metadata: body?.metadata || null,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error en audit-log:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
