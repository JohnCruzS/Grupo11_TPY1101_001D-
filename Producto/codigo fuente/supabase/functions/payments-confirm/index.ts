import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { insertAuditLog } from '../_shared/audit.ts';
import { applyPaymentEffects, notifyEnterpriseUsers } from '../_shared/applyPayment.ts';

function getFlowBaseUrl() {
  return (
    Deno.env.get('FLOW_API_URL') ||
    Deno.env.get('FLOW_BASE_URL') ||
    'https://sandbox.flow.cl/api'
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

async function readToken(req: Request) {
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await req.json();
    return body.token as string | undefined;
  }

  const form = await req.formData();
  return form.get('token')?.toString();
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (!apiKey || !secretKey) {
      throw new Error('FLOW_API_KEY/FLOW_SECRET_KEY no configuradas');
    }

    const token = await readToken(req);
    if (!token) {
      return new Response('missing token', {
        status: 400,
        headers: corsHeaders,
      });
    }

    const statusParams = { apiKey, token };
    const signature = await hmacSha256(secretKey, signedPayload(statusParams));
    const query = encodeParams({ ...statusParams, s: signature });

    const flowResponse = await fetch(
      `${getFlowBaseUrl()}/payment/getStatus?${query.toString()}`
    );
    const flowStatus = await flowResponse.json();

    if (!flowResponse.ok) {
      throw new Error(flowStatus?.message || 'No se pudo consultar estado Flow');
    }

    const commerceOrder = flowStatus.commerceOrder as string | undefined;
    const flowOrder = flowStatus.flowOrder;
    const flowStatusCode = Number(flowStatus.status);
    const paid = flowStatusCode === 2;

    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('flow_order_id', commerceOrder)
      .maybeSingle();

    if (!existingPayment) {
      console.warn('[payments-confirm] commerceOrder no encontrado en BD:', commerceOrder);

      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    if (existingPayment.confirmed_by_webhook && existingPayment.estado === 'completed') {
      console.warn('[payments-confirm] webhook duplicado ignorado para:', commerceOrder);
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .update({
        estado: paid ? 'completed' : 'failed',
        transaction_id: flowOrder ? String(flowOrder) : null,
        referencia_flow: token,
        flow_response: flowStatus,
        fecha_pago: paid ? new Date().toISOString() : null,
        confirmed_by_webhook: true,
        webhook_timestamp: new Date().toISOString(),
      })
      .eq('flow_order_id', commerceOrder)
      .select('*')
      .single();

    if (paymentError) throw paymentError;

    const ipAddress =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      null;
    const userAgent = req.headers.get('user-agent');

    await insertAuditLog(supabase, {
      action: 'SUBSCRIPTION_UPDATE',
      userId: payment.user_id || null,
      resourceType: 'payment',
      resourceId: payment.id,
      enterpriseId: payment.empresa_id,
      success: paid,
      ipAddress,
      userAgent,
      metadata: {
        plan: payment.plan,
        status: paid ? 'completed' : 'failed',
        flow_order_id: payment.flow_order_id,
      },
    });

    if (paid) {

      const { tipo } = await applyPaymentEffects(supabase, payment);
      await notifyEnterpriseUsers(supabase, payment.empresa_id, Number(payment.monto), tipo);
    }

    return new Response('OK', { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('[payments-confirm] error crítico:', JSON.stringify(error));
    return new Response('ERROR', { status: 500, headers: corsHeaders });
  }
});
