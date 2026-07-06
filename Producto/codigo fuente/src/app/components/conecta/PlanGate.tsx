import { useEffect, useState } from 'react';
import { Lock, AlertCircle, Loader2 } from 'lucide-react';
import { getSupabase } from '../../context/AuthContext';

interface PlanGateProps {

  user: any;
  feature?: string;
  children: React.ReactNode;
}

type AccessState = 'checking' | 'allowed' | 'unpaid' | 'suspended';

export function PlanGate({ user, feature = 'Esta sección', children }: PlanGateProps) {
  const [state, setState] = useState<AccessState>('checking');

  useEffect(() => {
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (!cancelled) setState('allowed');
    }, 8000);

    const check = async () => {
      const rol = user?.rol || user?.role;
      if (rol === 'admin' || rol === 'superadmin') {
        if (!cancelled) setState('allowed');
        return;
      }

      const empresaId = user?.empresaId || user?.empresa_id;
      if (!empresaId) {
        if (!cancelled) setState('unpaid');
        return;
      }

      const { data } = await getSupabase()
        .from('enterprises')
        .select('primer_mes_pagado, subscription_status')
        .eq('id', empresaId)
        .maybeSingle();

      const rawStatus = ((data?.subscription_status as string | undefined) ?? '').toLowerCase();
      if (rawStatus === 'suspended' || rawStatus === 'suspendido' || rawStatus === 'archived' || rawStatus === 'archivado') {
        if (!cancelled) setState('suspended');
        return;
      }

      const isActive = rawStatus === 'active' || rawStatus === 'activo' || rawStatus === 'activa';
      const paid = data?.primer_mes_pagado === true || isActive;
      if (!cancelled) setState(paid ? 'allowed' : 'unpaid');
    };
    void check();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [user?.rol, user?.role, user?.empresaId, user?.empresa_id]);

  if (state === 'checking') {
    return (
      <div className="flex items-center justify-center h-full p-10">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#091f34' }} />
      </div>
    );
  }

  if (state === 'allowed') return <>{children}</>;

  const suspended = state === 'suspended';
  return (
    <div
      className="flex flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: '#f8fafc', minHeight: '60vh' }}
    >
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
        style={{ backgroundColor: '#091f3410' }}
      >
        <Lock className="w-9 h-9" style={{ color: '#091f34' }} />
      </div>
      <h2 className="text-xl font-semibold mb-2" style={{ color: '#091f34' }}>
        {feature} no disponible
      </h2>
      <p className="text-sm text-gray-500 max-w-md mb-6 leading-relaxed">
        {suspended ? (
          <>
            Tu cuenta está <strong>suspendida</strong>. Regulariza tu pago para
            volver a usar esta sección.
          </>
        ) : (
          <>
            Esta sección está disponible solo para empresas con un{' '}
            <strong>plan activo</strong>. Completa el pago de tu plan para
            desbloquearla.
          </>
        )}
      </p>
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm"
        style={{ backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}
      >
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        {user?.rol === 'usuario' || user?.role === 'usuario'
          ? suspended
            ? 'Contacta a tu empleador para regularizar la cuenta.'
            : 'Contacta a tu empleador para activar el plan.'
          : `Ve a «Mi Suscripción» para ${suspended ? 'regularizar tu cuenta' : 'activar tu plan'}.`}
      </div>
    </div>
  );
}
