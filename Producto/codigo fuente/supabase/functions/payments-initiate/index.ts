import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { insertAuditLog } from '../_shared/audit.ts';

type PaymentRequest = {
  empresaId: string;
  plan: string;
  monto: number;
  concepto: string;
  metodoPago?: string;
  email?: string;
  returnUrl?: string;
  tipo?: 'auditoria' | 'plan';
};

const PLAN_MAP: Record<string, string> = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  basic: 'basic',
  pro: 'pro',
  enterprise: 'enterprise',
  Personalizado: 'Personalizado',
};

function getAuthToken(req: Request) {
  return req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || null;
}

function getFlowBaseUrl() {
  return (
    Deno.env.get('FLOW_API_URL') ||
    Deno.env.get('FLOW_BASE_URL') ||
    'https://sandbox.flow.cl/api'
  ).replace(/\/$/, '');
}

function getSiteUrl() {
  return (
    Deno.env.get('PUBLIC_SITE_URL') ||
    Deno.env.get('SITE_URL') ||
    Deno.env.get('APP_URL') ||
    'http://localhost:5173'
  ).replace(/\/$/, '');
}

function encodeParams(params: Record<string, string | number>) {
  return new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)])
  );
}

function signedPayload(params: Record<string, string | number>) {
  return Object.keys(params)
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join('');
}

async function hmacSha256(secret: string, payload: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
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
    const apiKey = Deno.env.get('FLOW_API_KEY') || '';
    const secretKey = Deno.env.get('FLOW_SECRET_KEY') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!apiKey || !secretKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'FLOW_API_KEY/FLOW_SECRET_KEY no configuradas' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = getAuthToken(req);
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'No autenticado' }), {
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
      return new Response(JSON.stringify({ success: false, error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { empresaId, plan, monto, concepto, metodoPago, email, returnUrl, tipo } =
      (await req.json()) as PaymentRequest;
    const paymentTipo = tipo === 'auditoria' ? 'auditoria' : 'plan';

    if (!empresaId || !plan || !monto || !concepto) {
      return new Response(
        JSON.stringify({ success: false, error: 'empresaId, plan, monto y concepto son requeridos' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
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
    const profileEmpresaId = profile.empresaId || profile.empresa_id;
    const canPay =
      ['admin', 'superadmin'].includes(role) || profileEmpresaId === empresaId;

    if (!canPay) {
      return new Response(JSON.stringify({ success: false, error: 'Acceso denegado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: enterprise } = await supabase
      .from('enterprises')
      .select('email, name')
      .eq('id', empresaId)
      .single();

    const customerEmail = email || enterprise?.email || user.email;
    if (!customerEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'No hay email para el pagador' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const commerceOrder = `SLC-${empresaId.slice(0, 8)}-${Date.now()}`;
    const amount = Math.round(Number(monto));
    const paymentPlan = PLAN_MAP[plan] || plan;

    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id, estado')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    let subscription: { id: string } | null = existingSub ?? null;

    if (!existingSub) {
      const { data: newSub, error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          empresa_id: empresaId,
          plan: paymentPlan,
          estado: 'trial',
          fecha_inicio: new Date().toISOString().split('T')[0],
          incluye_ia: false,
          limite_consultas_ia: 0,
          consultas_realizadas: 0,
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (subscriptionError) {
        console.warn('[payments-initiate] Insert subscription falló (continuando sin subscription_id):', JSON.stringify(subscriptionError));
      } else {
        subscription = newSub;
      }
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        empresa_id: empresaId,
        subscription_id: subscription?.id ?? null,
        monto: amount,
        moneda: 'CLP',
        estado: 'pending',
        metodo_pago: metodoPago || 'flow',
        flow_order_id: commerceOrder,

        flow_response: { concepto, plan: paymentPlan, tipo: paymentTipo },
        fecha_creacion: new Date().toISOString(),
        fecha_vencimiento: new Date(Date.now() + 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        confirmed_by_webhook: false,
      })
      .select('id')
      .single();

    if (paymentError) throw paymentError;

    const urlConfirmation = `${supabaseUrl}/functions/v1/payments-confirm`;

    const siteBase = (returnUrl || getSiteUrl())
      .replace(/\/+$/, '')
      .replace(/\/conecta.*$/, '');
    const frontendResultUrl = `${siteBase}/conecta/pago-resultado`;

    const urlReturn =
      `${supabaseUrl}/functions/v1/payments-return` +
      `?payment_id=${payment.id}` +
      `&redirect=${encodeURIComponent(frontendResultUrl)}`;

    const flowParams: Record<string, string | number> = {
      apiKey,
      commerceOrder,
      subject: concepto.slice(0, 80),
      currency: 'CLP',
      amount,
      email: customerEmail,
      urlConfirmation,
      urlReturn,
      optional: JSON.stringify({
        paymentId: payment.id,
        empresaId,
        plan: paymentPlan,
      }),
    };

    const signature = await hmacSha256(secretKey, signedPayload(flowParams));
    const flowBody = encodeParams({ ...flowParams, s: signature });

    const flowResponse = await fetch(`${getFlowBaseUrl()}/payment/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: flowBody,
    });

    const flowData = await flowResponse.json();
    const baseMeta = { concepto, plan: paymentPlan, tipo: paymentTipo };
    if (!flowResponse.ok || !flowData?.url || !flowData?.token) {
      await supabase
        .from('payments')
        .update({
          estado: 'failed',
          flow_response: { ...baseMeta, flow_error: flowData },
        })
        .eq('id', payment.id);
      throw new Error(flowData?.message || 'Flow rechazó la creación del pago');
    }

    await supabase
      .from('payments')
      .update({
        referencia_flow: flowData.token,
        flow_response: { ...baseMeta, ...flowData },
      })
      .eq('id', payment.id);

    const ipAddress =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      null;
    const userAgent = req.headers.get('user-agent');

    await insertAuditLog(supabase, {
      action: 'PAYMENT_CREATE',
      userId: user.id,
      resourceType: 'payment',
      resourceId: payment.id,
      enterpriseId: empresaId,
      success: true,
      ipAddress,
      userAgent,
      metadata: {
        plan: paymentPlan,
        monto: amount,
        concepto,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: payment.id,
        commerceOrder,
        flowToken: flowData.token,
        paymentUrl: `${flowData.url}?token=${flowData.token}`,
        message: 'Pago Flow creado correctamente',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {

    let errMsg = 'Error iniciando pago';
    if (error instanceof Error) {
      errMsg = error.message;
    } else if (error && typeof error === 'object') {
      const e = error as Record<string, unknown>;
      errMsg = String(e.message || e.details || e.hint || e.code || JSON.stringify(error));
    }
    console.error('[payments-initiate] ERROR:', errMsg, JSON.stringify(error));
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
