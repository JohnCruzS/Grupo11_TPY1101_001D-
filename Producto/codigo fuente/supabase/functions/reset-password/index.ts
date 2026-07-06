import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendResendEmail, passwordResetTemplate } from '../_shared/email.ts';

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
    const siteUrl = (
      Deno.env.get('PUBLIC_SITE_URL') ||
      Deno.env.get('SITE_URL') ||
      Deno.env.get('APP_URL') ||
      'http://localhost:5173'
    ).replace(/\/$/, '');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'El email es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: resetData, error: resetError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: `${siteUrl}/reset-password`,
        },
      });

    if (resetError) {

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Si el email está registrado, recibirás las instrucciones.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const actionLink = resetData.properties.action_link;
    const url = new URL(actionLink);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Error generando token' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resetUrl = `${siteUrl}/reset-password?token=${token}&type=recovery&email=${encodeURIComponent(email)}`;

    const userMetadata = resetData.user?.user_metadata as {
      nombre?: string;
      full_name?: string;
    } | null;
    const nombre =
      userMetadata?.nombre || userMetadata?.full_name || email.split('@')[0];

    const tpl = passwordResetTemplate({ nombre, resetUrl, expiryHours: 24 });
    const emailResult = await sendResendEmail({
      to: email,
      subject: tpl.subject,
      html: tpl.html,
    });

    if (!emailResult.ok) {
      console.error('Error enviando email:', emailResult.error);

    }

    return new Response(
      JSON.stringify({
        success: true,
        message:
          'Si el email está registrado, recibirás las instrucciones para restablecer tu contraseña.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error en reset-password:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
