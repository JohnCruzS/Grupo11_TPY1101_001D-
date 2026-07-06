

type SupabaseClient = any;

interface PaymentRow {
  id: string;
  empresa_id: string;
  plan?: string | null;
  monto?: number | null;
  concepto?: string | null;
  flow_response?: Record<string, unknown> | null;
}

export function resolvePaymentTipo(payment: PaymentRow): 'auditoria' | 'plan' {
  const meta = payment.flow_response || {};
  const metaTipo = (meta.tipo as string | undefined)?.toLowerCase();
  if (metaTipo === 'auditoria' || metaTipo === 'plan') return metaTipo;

  const concepto = (payment.concepto || '').toLowerCase();

  if (concepto.includes('auditor') && !concepto.includes('plan') && !concepto.includes('combinado')) {
    return 'auditoria';
  }
  return 'plan';
}

export function resolvePlan(payment: PaymentRow): string {
  const meta = payment.flow_response || {};
  if (payment.plan) return payment.plan;
  if (meta.plan) return String(meta.plan);
  const c = payment.concepto || '';
  if (c.includes('Plan A')) return 'A';
  if (c.includes('Plan B')) return 'B';
  if (c.includes('Plan C')) return 'C';
  if (c.includes('Plan D')) return 'D';
  return 'Personalizado';
}

async function upsertSubscriptionManual(
  supabase: SupabaseClient,
  empresaId: string,
  data: Record<string, unknown>
) {
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('empresa_id', empresaId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase.from('subscriptions').update(data).eq('id', existing.id);
    if (error) {
      console.error('[applyPayment] subscriptions update error:', JSON.stringify(error));
      throw new Error(`Error actualizando suscripción: ${error.message}`);
    }
  } else {
    const { error } = await supabase.from('subscriptions').insert(data);
    if (error) {
      console.error('[applyPayment] subscriptions insert error:', JSON.stringify(error));
      throw new Error(`Error insertando suscripción: ${error.message}`);
    }
  }
}

export async function applyPaymentEffects(
  supabase: SupabaseClient,
  payment: PaymentRow
): Promise<{ tipo: 'auditoria' | 'plan'; plan: string }> {
  const tipo = resolvePaymentTipo(payment);
  const plan = resolvePlan(payment);
  const nowIso = new Date().toISOString();

  if (tipo === 'auditoria') {

    const { error: entError } = await supabase
      .from('enterprises')
      .update({
        auditoria_pagada: true,
        subscription_status: 'trial',
        updated_at: nowIso,
      })
      .eq('id', payment.empresa_id);
    if (entError) {
      console.error('[applyPayment] enterprises (auditoria) error:', JSON.stringify(entError));
      throw new Error(`Error activando auditoría: ${entError.message}`);
    }

    await upsertSubscriptionManual(supabase, payment.empresa_id, {
      empresa_id: payment.empresa_id,
      estado: 'trial',
      fecha_inicio: nowIso.split('T')[0],
      updated_at: nowIso,
    });

    return { tipo, plan };
  }

  const nextBilling = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  await upsertSubscriptionManual(supabase, payment.empresa_id, {
    empresa_id: payment.empresa_id,
    plan,
    estado: 'active',
    fecha_inicio: nowIso.split('T')[0],
    fecha_fin: nextBilling,
    updated_at: nowIso,
  });

  const { error: entError } = await supabase
    .from('enterprises')
    .update({
      subscription_status: 'active',
      plan,
      auditoria_pagada: true,
      primer_mes_pagado: true,
      updated_at: nowIso,
    })
    .eq('id', payment.empresa_id);
  if (entError) {
    console.error('[applyPayment] enterprises (plan) error:', JSON.stringify(entError));
    throw new Error(`Error activando plan en empresa: ${entError.message}`);
  }

  return { tipo, plan };
}

export async function notifyEnterpriseUsers(
  supabase: SupabaseClient,
  empresaId: string,
  monto: number,
  tipo: 'auditoria' | 'plan'
) {
  try {
    const { data: recipients } = await supabase
      .from('user_enterprises')
      .select('user_id')
      .eq('enterprise_id', empresaId)
      .eq('is_active', true);

    if (recipients?.length) {
      const mensaje =
        tipo === 'auditoria'
          ? `Hemos recibido el pago de tu auditoría inicial ($${Number(monto).toLocaleString('es-CL')}). Ya puedes elegir tu plan.`
          : `Hemos recibido tu pago de $${Number(monto).toLocaleString('es-CL')}. Tu suscripción está activa.`;
      await supabase.from('notificaciones').insert(
        recipients.map((r: { user_id: string }) => ({
          user_id: r.user_id,
          titulo: 'Pago Recibido',
          mensaje,
          tipo: 'success',
          leida: false,
          created_at: new Date().toISOString(),
        }))
      );
    }
  } catch (err) {
    console.error('[applyPayment] notificaciones error:', err);
  }
}
