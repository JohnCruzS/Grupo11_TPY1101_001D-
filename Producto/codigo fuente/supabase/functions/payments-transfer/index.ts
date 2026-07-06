

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendResendEmail } from '../_shared/email.ts';
import { insertAuditLog } from '../_shared/audit.ts';

type TransferRequest = {
  empresaId: string;
  plan: string;
  monto: number;
  concepto: string;
  tipo?: 'auditoria' | 'plan';
};

function getAuthToken(req: Request) {
  return req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || null;
}

function adminEmailHtml(params: {
  empresaNombre: string;
  empresaRut?: string;
  monto: number;
  concepto: string;
  tipo: string;
}) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
  <style>
    body{font-family:'Inter',-apple-system,sans-serif;background:#f1f5f9;padding:32px 16px;}
    .card{max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.1);}
    .head{background:linear-gradient(135deg,#091f34,#1e3a5f);padding:28px 30px;color:#fff;}
    .head h1{font-size:18px;margin:0;}
    .head p{font-size:13px;color:rgba(255,255,255,.7);margin:4px 0 0;}
    .body{padding:28px 30px;}
    .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eef2f7;font-size:14px;}
    .row span:first-child{color:#64748b;}
    .row span:last-child{color:#0f172a;font-weight:600;}
    .amount{font-size:22px;color:#091f34;}
    .note{background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0;font-size:13px;color:#92400e;margin-top:20px;}
  </style></head><body>
    <div class="card">
      <div class="head">
        <h1>💸 Nuevo pago por transferencia</h1>
        <p>Requiere tu revisión y aceptación manual</p>
      </div>
      <div class="body">
        <div class="row"><span>Empresa</span><span>${params.empresaNombre}</span></div>
        <div class="row"><span>RUT</span><span>${params.empresaRut || '—'}</span></div>
        <div class="row"><span>Concepto</span><span>${params.concepto}</span></div>
        <div class="row"><span>Tipo</span><span>${params.tipo === 'auditoria' ? 'Auditoría inicial' : 'Plan mensual'}</span></div>
        <div class="row"><span>Monto</span><span class="amount">$${Number(params.monto).toLocaleString('es-CL')}</span></div>
        <div class="note">
          La PyME declara haber realizado la transferencia. Verifica el ingreso en la
          cuenta bancaria y luego acéptalo desde el panel <strong>Pagos → Suscripciones</strong>
          en el dashboard de administración.
        </div>
      </div>
    </div>
  </body></html>`;
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
    const supabase = createClient(supabaseUrl, serviceKey);

    const token = getAuthToken(req);
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'No autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const { empresaId, plan, monto, concepto, tipo } =
      (await req.json()) as TransferRequest;
    if (!empresaId || !monto || !concepto) {
      return new Response(
        JSON.stringify({ success: false, error: 'empresaId, monto y concepto son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentTipo = tipo === 'auditoria' ? 'auditoria' : 'plan';
    const amount = Math.round(Number(monto));

    const { data: profileRow } = await supabase
      .from('kv_store_7d36b31f')
      .select('value')
      .eq('key', `slc_user:${user.id}`)
      .maybeSingle();
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
      .select('name, rut')
      .eq('id', empresaId)
      .single();

    const commerceOrder = `TRF-${empresaId.slice(0, 8)}-${Date.now()}`;
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        empresa_id: empresaId,
        monto: amount,
        moneda: 'CLP',
        estado: 'pending',
        metodo_pago: 'transferencia',
        flow_order_id: commerceOrder,
        flow_response: { concepto, plan, tipo: paymentTipo, requiere_revision: true },
        fecha_creacion: new Date().toISOString(),
        confirmed_by_webhook: false,
      })
      .select('id')
      .single();
    if (paymentError) throw paymentError;

    const { data: adminRows } = await supabase
      .from('kv_store_7d36b31f')
      .select('value')
      .like('key', 'slc_user:%');
    const adminEmails: string[] = (adminRows || [])
      .map((r: { value: Record<string, unknown> }) => r.value)
      .filter((v: Record<string, unknown>) => {
        const r = (v?.rol || v?.role) as string | undefined;
        return r === 'admin' || r === 'superadmin';
      })
      .map((v: Record<string, unknown>) => (v.email || v.correo) as string)
      .filter((e: string | undefined): e is string => !!e);

    console.log(
      `[payments-transfer] pago ${payment.id} creado. Admins a notificar (${adminEmails.length}): ${adminEmails.join(', ') || '(ninguno)'}`
    );

    let emailSent = false;
    if (adminEmails.length) {
      const subject = `💸 Transferencia pendiente — ${enterprise?.name || 'PyME'} ($${amount.toLocaleString('es-CL')})`;
      const result = await sendResendEmail({
        to: adminEmails,
        subject,
        html: adminEmailHtml({
          empresaNombre: enterprise?.name || 'PyME',
          empresaRut: enterprise?.rut,
          monto: amount,
          concepto,
          tipo: paymentTipo,
        }),
      });
      emailSent = result.ok;
      console.log(
        `[payments-transfer] resultado Resend → ok=${result.ok} id=${result.id ?? '-'} error=${result.error ?? '-'}`
      );
    } else {
      console.warn('[payments-transfer] No se encontraron correos de admin para notificar');
    }

    await insertAuditLog(supabase, {
      action: 'PAYMENT_CREATE',
      userId: user.id,
      resourceType: 'payment',
      resourceId: payment.id,
      enterpriseId: empresaId,
      success: true,
      ipAddress:
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      userAgent: req.headers.get('user-agent'),
      metadata: { metodo: 'transferencia', monto: amount, tipo: paymentTipo, concepto },
    });

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: payment.id,
        emailSent,
        message:
          'Transferencia registrada. SotLoy verificará el pago y activará tu cuenta dentro de 24-48 horas hábiles.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    let errMsg = 'Error registrando transferencia';
    if (error instanceof Error) errMsg = error.message;
    else if (error && typeof error === 'object') {
      const e = error as Record<string, unknown>;
      errMsg = String(e.message || e.details || e.hint || e.code || JSON.stringify(error));
    }
    console.error('[payments-transfer] ERROR:', errMsg);
    return new Response(JSON.stringify({ success: false, error: errMsg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
