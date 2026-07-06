import { useState, useCallback } from 'react';
import { getSupabase } from '../context/AuthContext';
import type { Subscription, Payment } from '../types/database';

export function useSubscriptions() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSubscription = useCallback(async (empresaId: string) => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      setSubscription(data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  const createSubscription = useCallback(
    async (
      empresaId: string,
      plan: Subscription['plan'] = 'basic',
      incluyeIA: boolean = false
    ) => {
      setLoading(true);

      try {
        const supabase = getSupabase();

        const nueva: Omit<Subscription, 'id' | 'created_at' | 'updated_at'> = {
          empresa_id: empresaId,
          plan,
          estado: 'trial',
          fecha_inicio: new Date().toISOString().split('T')[0],
          incluye_ia: incluyeIA,
          limite_consultas_ia: incluyeIA ? 100 : 0,
          consultas_realizadas: 0,
        };

        const { data, error } = await supabase
          .from('subscriptions')
          .insert(nueva)
          .select()
          .single();

        if (error) throw error;

        setSubscription(data);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const changePlan = useCallback(
    async (subscriptionId: string, newPlan: Subscription['plan']) => {
      setLoading(true);

      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('subscriptions')
          .update({ plan: newPlan })
          .eq('id', subscriptionId)
          .select()
          .single();

        if (error) throw error;

        setSubscription(data);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const cancelSubscription = useCallback(async (subscriptionId: string) => {
    setLoading(true);

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          estado: 'cancelled',
          fecha_cancelacion: new Date().toISOString().split('T')[0],
        })
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) throw error;

      setSubscription(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPayments = useCallback(async (subscriptionId: string) => {
    setLoading(true);

    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .order('fecha_creacion', { ascending: false });

      setPayments(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const createPendingPayment = useCallback(
    async (
      subscriptionId: string,
      monto: number,
      fechaVencimiento?: string
    ) => {
      setLoading(true);

      try {
        const supabase = getSupabase();

        const nuevoPago: Omit<Payment, 'id' | 'fecha_creacion'> = {
          subscription_id: subscriptionId,
          monto,
          moneda: 'CLP',
          estado: 'pending',
          fecha_vencimiento:
            fechaVencimiento ||
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
          confirmed_by_webhook: false,
        };

        const { data, error } = await supabase
          .from('payments')
          .insert(nuevoPago)
          .select()
          .single();

        if (error) throw error;

        setPayments((prev) => [data, ...prev]);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    subscription,
    payments,
    loading,
    error,
    loadSubscription,
    createSubscription,
    changePlan,
    cancelSubscription,
    loadPayments,
    createPendingPayment,
  };
}

export function useAdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAllSubscriptions = useCallback(async () => {
    setLoading(true);

    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('subscriptions')
        .select(
          `
          *,
          enterprises:empresa_id (name, rut)
        `
        )
        .order('created_at', { ascending: false });

      setSubscriptions(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    subscriptions,
    loading,
    loadAllSubscriptions,
  };
}
