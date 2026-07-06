import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { insertAuditLog } from '../_shared/audit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || null;
    if (!token) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerData, error: callerError } = await supabaseAdmin.auth.getUser(token);
    if (callerError || !callerData.user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const actorId = callerData.user.id;
    const { data: callerProfile } = await supabaseAdmin
      .from('kv_store_7d36b31f')
      .select('value')
      .eq('key', `slc_user:${actorId}`)
      .maybeSingle();

    const callerRole = callerProfile?.value?.rol || callerProfile?.value?.role || '';
    if (callerRole !== 'superadmin') {
      return new Response(
        JSON.stringify({ error: 'Solo el superadmin puede eliminar empresas' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { enterprise_id } = await req.json();
    if (!enterprise_id) {
      return new Response(
        JSON.stringify({ error: 'enterprise_id es requerido' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from('enterprises')
      .select('id, name')
      .eq('id', enterprise_id)
      .maybeSingle();

    if (empresaError) throw empresaError;
    if (!empresa) {
      return new Response(JSON.stringify({ error: 'La empresa no existe' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const nowIso = new Date().toISOString();

    const { error: archiveError } = await supabaseAdmin
      .from('enterprises')
      .update({ subscription_status: 'archived', updated_at: nowIso })
      .eq('id', enterprise_id);

    if (archiveError) throw archiveError;

    await supabaseAdmin
      .from('subscriptions')
      .update({ estado: 'cancelled' })
      .eq('empresa_id', enterprise_id);

    const ipAddress =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      null;
    const userAgent = req.headers.get('user-agent');

    await insertAuditLog(supabaseAdmin, {
      action: 'ENTERPRISE_DELETE',
      userId: actorId,
      resourceType: 'enterprise',
      resourceId: enterprise_id,
      enterpriseId: enterprise_id,
      success: true,
      ipAddress,
      userAgent,
      metadata: { companyName: empresa.name, mode: 'soft_delete_archived' },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error en delete-enterprise:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
