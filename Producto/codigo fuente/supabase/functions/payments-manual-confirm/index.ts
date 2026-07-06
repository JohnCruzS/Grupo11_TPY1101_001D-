

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { applyPaymentEffects, notifyEnterpriseUsers, resolvePaymentTipo } from '../_shared/applyPayment.ts';
import { insertAuditLog } from '../_shared/audit.ts';

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

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

    const { data: profileRow } = await supabase
      .from('kv_store_7d36b31f')
      .select('value')
      .eq('key', `slc_user:${user.id}`)
      .maybeSingle();
    const profile = profileRow?.value || {};
    const role = profile.rol || profile.role;
    if (!['admin', 'superadmin'].includes(role)) {
      return new Response(JSON.stringify({ success: false, error: 'Solo administradores' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, paymentId, empresaId, newStatus } = await req.json();

    if (action === 'accept_payment') {
      if (!paymentId) {
        return new Response(JSON.stringify({ success: false, error: 'paymentId requerido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: payment, error: payErr } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();
      if (payErr || !payment) throw payErr || new Error('Pago no encontrado');

      const { error: updErr } = await supabase
        .from('payments')
        .update({
          estado: 'completed',
          fecha_pago: new Date().toISOString(),
          confirmed_by_webhook: false,
          flow_response: {
            ...(payment.flow_response || {}),
            aceptado_por: user.id,
            aceptado_at: new Date().toISOString(),
          },
        })
        .eq('id', paymentId);
      if (updErr) throw updErr;

      const { tipo } = await applyPaymentEffects(supabase, payment);
      await notifyEnterpriseUsers(supabase, payment.empresa_id, Number(payment.monto), tipo);

      await insertAuditLog(supabase, {
        action: 'SUBSCRIPTION_UPDATE',
        userId: user.id,
        resourceType: 'payment',
        resourceId: paymentId,
        enterpriseId: payment.empresa_id,
        success: true,
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        userAgent: req.headers.get('user-agent'),
        metadata: { manual: true, tipo, monto: payment.monto },
      });

      return new Response(JSON.stringify({ success: true, tipo }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'reject_transfer') {
      if (!paymentId) {
        return new Response(JSON.stringify({ success: false, error: 'paymentId requerido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: payment, error: payErr } = await supabase
        .from('payments')
        .select('id, estado, empresa_id, flow_response')
        .eq('id', paymentId)
        .single();
      if (payErr || !payment) throw payErr || new Error('Pago no encontrado');

      if (payment.estado !== 'pending') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Solo se pueden rechazar transferencias pendientes.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: updErr } = await supabase
        .from('payments')
        .update({
          estado: 'cancelled',
          flow_response: {
            ...(payment.flow_response || {}),
            rechazado_por: user.id,
            rechazado_at: new Date().toISOString(),
            motivo: 'transferencia descartada por admin (no aplicada)',
          },
        })
        .eq('id', paymentId);
      if (updErr) throw updErr;

      await insertAuditLog(supabase, {
        action: 'SUBSCRIPTION_UPDATE',
        userId: user.id,
        resourceType: 'payment',
        resourceId: paymentId,
        enterpriseId: payment.empresa_id,
        success: true,
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        userAgent: req.headers.get('user-agent'),
        metadata: { accion: 'reject_transfer' },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'mark_audit') {
      if (!empresaId) {
        return new Response(JSON.stringify({ success: false, error: 'empresaId requerido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: acceptedPayments } = await supabase
        .from('payments')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('estado', 'completed')
        .limit(1);
      if (!acceptedPayments?.length) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'No hay ningún pago aceptado para esta empresa; no se puede marcar la auditoría.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: entErr } = await supabase
        .from('enterprises')
        .update({
          auditoria_pagada: true,
          subscription_status: 'trial',
          updated_at: new Date().toISOString(),
        })
        .eq('id', empresaId);
      if (entErr) throw entErr;

      await insertAuditLog(supabase, {
        action: 'ENTERPRISE_UPDATE',
        userId: user.id,
        resourceType: 'enterprise',
        resourceId: empresaId,
        success: true,
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        userAgent: req.headers.get('user-agent'),
        metadata: { auditoria_pagada: true, manual: true },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'cancel_payment') {
      if (!paymentId) {
        return new Response(JSON.stringify({ success: false, error: 'paymentId requerido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const estadoFinal = newStatus === 'refunded' ? 'refunded' : 'cancelled';

      const { data: payment, error: payErr } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();
      if (payErr || !payment) throw payErr || new Error('Pago no encontrado');

      const empId = payment.empresa_id as string;
      const nowIso = new Date().toISOString();

      const { error: updErr } = await supabase
        .from('payments')
        .update({
          estado: estadoFinal,
          flow_response: {
            ...(payment.flow_response || {}),
            cancelado_por: user.id,
            cancelado_at: nowIso,
            motivo:
              estadoFinal === 'refunded'
                ? 'reembolso (admin)'
                : 'pago no concretado / reversión manual (admin)',
          },
        })
        .eq('id', paymentId);
      if (updErr) throw updErr;

      const { data: restantes } = await supabase
        .from('payments')
        .select('*')
        .eq('empresa_id', empId)
        .eq('estado', 'completed');

      let hasPaidPlan = false;
      let hasPaidAudit = false;
      for (const p of restantes || []) {
        const t = resolvePaymentTipo(p);
        if (t === 'plan') {
          hasPaidPlan = true;
          hasPaidAudit = true;
        } else if (t === 'auditoria') {
          hasPaidAudit = true;
        }
      }

      await supabase
        .from('enterprises')
        .update({
          primer_mes_pagado: hasPaidPlan,
          auditoria_pagada: hasPaidAudit,
          subscription_status: hasPaidPlan ? 'active' : 'trial',
          updated_at: nowIso,
        })
        .eq('id', empId);

      await supabase
        .from('subscriptions')
        .update({ estado: hasPaidPlan ? 'active' : 'trial', updated_at: nowIso })
        .eq('empresa_id', empId);

      await insertAuditLog(supabase, {
        action: 'SUBSCRIPTION_UPDATE',
        userId: user.id,
        resourceType: 'payment',
        resourceId: paymentId,
        enterpriseId: empId,
        success: true,
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        userAgent: req.headers.get('user-agent'),
        metadata: {
          accion: 'cancel_payment',
          estado: estadoFinal,
          monto: payment.monto,
          hasPaidPlan,
          hasPaidAudit,
        },
      });

      return new Response(
        JSON.stringify({ success: true, estado: estadoFinal, hasPaidPlan, hasPaidAudit }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ success: false, error: 'Acción no soportada' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    let errMsg = 'Error en confirmación manual';
    if (error instanceof Error) errMsg = error.message;
    else if (error && typeof error === 'object') {
      const e = error as Record<string, unknown>;
      errMsg = String(e.message || e.details || e.hint || e.code || JSON.stringify(error));
    }
    console.error('[payments-manual-confirm] ERROR:', errMsg);
    return new Response(JSON.stringify({ success: false, error: errMsg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
