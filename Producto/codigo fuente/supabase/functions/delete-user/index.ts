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
      return new Response(JSON.stringify({ error: 'Solo el superadmin puede eliminar usuarios' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id es requerido' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (user_id === actorId) {
      return new Response(
        JSON.stringify({ error: 'No puedes eliminar tu propia cuenta.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: targetProfile } = await supabaseAdmin
      .from('kv_store_7d36b31f')
      .select('value')
      .eq('key', `slc_user:${user_id}`)
      .maybeSingle();
    const targetRole =
      targetProfile?.value?.rol || targetProfile?.value?.role || '';

    if (targetRole === 'superadmin') {
      const { data: superadmins } = await supabaseAdmin
        .from('kv_store_7d36b31f')
        .select('key')
        .like('key', 'slc_user:%')
        .filter('value->>rol', 'eq', 'superadmin');
      if (!superadmins || superadmins.length <= 1) {
        return new Response(
          JSON.stringify({
            error: 'No puedes eliminar al último superadministrador.',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    await supabaseAdmin
      .from('documents')
      .update({ user_id: null })
      .eq('user_id', user_id);
    await supabaseAdmin
      .from('documents')
      .update({ uploaded_by: actorId })
      .eq('uploaded_by', user_id);

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      user_id
    );

    if (deleteError) {
      console.error('Error eliminando usuario de Auth:', deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    await supabaseAdmin.from('user_enterprises').delete().eq('user_id', user_id);
    await supabaseAdmin
      .from('kv_store_7d36b31f')
      .delete()
      .eq('key', `slc_user:${user_id}`);

    const ipAddress =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      null;
    const userAgent = req.headers.get('user-agent');

    await insertAuditLog(supabaseAdmin, {
      action: 'USER_DELETE',
      userId: actorId,
      resourceType: 'user',
      resourceId: user_id,
      success: true,
      ipAddress,
      userAgent,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error en delete-user:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
