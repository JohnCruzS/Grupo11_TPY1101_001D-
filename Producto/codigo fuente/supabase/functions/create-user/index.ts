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
      return new Response(JSON.stringify({ error: 'Solo el superadmin puede crear usuarios' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, password, user_metadata, profile, enterprise_id, role } =
      await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email y contraseña son requeridos' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: authData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata,
      });

    if (createError) {
      console.error('Error creando usuario en Auth:', createError);

      const code = (createError as { code?: string }).code;
      const isEmailExists =
        code === 'email_exists' ||
        (createError as { status?: number }).status === 422 ||
        /already been registered/i.test(createError.message);

      if (isEmailExists) {
        return new Response(
          JSON.stringify({
            success: false,
            code: 'email_exists',
            error:
              'El correo ya está registrado en otra cuenta. No es posible crear una nueva cuenta con el mismo correo. Si crees que se trata de un error, contacta al área de soporte técnico (TI).',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({ success: false, code: 'auth_error', error: createError.message }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const userId = authData.user.id;

    if (profile) {
      const { error: profileError } = await supabaseAdmin
        .from('kv_store_7d36b31f')
        .insert({
          key: `slc_user:${userId}`,
          value: { ...profile, id: userId, created_at: authData.user.created_at },
        });

      if (profileError) {
        console.error('Error creando perfil:', profileError);
      }
    }

    if (enterprise_id) {
      const { error: assignError } = await supabaseAdmin
        .from('user_enterprises')
        .insert({
          user_id: userId,
          enterprise_id: enterprise_id,
          role: role || 'employee',
          is_active: true,
          assigned_at: new Date().toISOString(),
        });

      if (assignError) {
        console.error('Error asignando a empresa:', assignError);
      }
    }

    const ipAddress =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      null;
    const userAgent = req.headers.get('user-agent');

    await insertAuditLog(supabaseAdmin, {
      action: 'USER_CREATE',
      userId: actorId,
      resourceType: 'user',
      resourceId: userId,
      enterpriseId: enterprise_id || null,
      success: true,
      ipAddress,
      userAgent,
      metadata: {
        email,
        role: role || 'employee',
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: userId, email: authData.user.email },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error en create-user:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
