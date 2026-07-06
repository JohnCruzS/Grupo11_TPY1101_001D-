import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../context/AuthContext';
import type { Notificacion } from '../types/database';

export function useNotificaciones(userId: string | null) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabase();

  const loadNotificaciones = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotificaciones(data || []);
      setUnreadCount((data || []).filter((n) => !n.leida).length);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error cargando notificaciones'
      );
    } finally {
      setLoading(false);
    }
  }, [userId, supabase]);

  const markAsRead = useCallback(
    async (notificacionId: string) => {
      try {
        const { error } = await supabase
          .from('notificaciones')
          .update({
            leida: true,
            fecha_leida: new Date().toISOString(),
          })
          .eq('id', notificacionId);

        if (error) throw error;

        setNotificaciones((prev) =>
          prev.map((n) =>
            n.id === notificacionId
              ? { ...n, leida: true, fecha_leida: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Error marcando notificación como leída:', err);
      }
    },
    [supabase]
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('notificaciones')
        .update({
          leida: true,
          fecha_leida: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('leida', false);

      if (error) throw error;

      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marcando todas como leídas:', err);
    }
  }, [userId, supabase]);

  const deleteNotificacion = useCallback(
    async (notificacionId: string) => {
      try {
        const { error } = await supabase
          .from('notificaciones')
          .delete()
          .eq('id', notificacionId);

        if (error) throw error;

        const notif = notificaciones.find((n) => n.id === notificacionId);
        setNotificaciones((prev) =>
          prev.filter((n) => n.id !== notificacionId)
        );
        if (notif && !notif.leida) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (err) {
        console.error('Error eliminando notificación:', err);
      }
    },
    [notificaciones, supabase]
  );

  const createNotificacion = useCallback(
    async (
      targetUserId: string,
      titulo: string,
      mensaje: string,
      tipo: Notificacion['tipo'] = 'info',
      options?: { link?: string; link_text?: string; expires_at?: string }
    ) => {
      try {
        const { data, error } = await supabase
          .from('notificaciones')
          .insert({
            user_id: targetUserId,
            titulo,
            mensaje,
            tipo,
            link: options?.link,
            link_text: options?.link_text,
            expires_at: options?.expires_at,
            leida: false,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Error creando notificación:', err);
        throw err;
      }
    },
    [supabase]
  );

  useEffect(() => {
    if (!userId) return;

    loadNotificaciones();

    const subscription = supabase
      .channel(`notificaciones:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notificacion;
          setNotificaciones((prev) => [newNotif, ...prev]);
          if (!newNotif.leida) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notificaciones',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updatedNotif = payload.new as Notificacion;
          setNotificaciones((prev) =>
            prev.map((n) => (n.id === updatedNotif.id ? updatedNotif : n))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notificaciones',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const deletedId = payload.old.id;
          setNotificaciones((prev) => prev.filter((n) => n.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, supabase, loadNotificaciones]);

  return {
    notificaciones,
    unreadCount,
    loading,
    error,
    loadNotificaciones,
    markAsRead,
    markAllAsRead,
    deleteNotificacion,
    createNotificacion,
  };
}
