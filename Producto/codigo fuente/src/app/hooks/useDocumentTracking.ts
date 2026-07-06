import { useState, useCallback } from 'react';
import { getSupabase } from '../context/AuthContext';
import type { DocumentView, DocumentViewStats } from '../types/database';

interface UseDocumentTrackingReturn {

  trackDocumentView: (params: TrackViewParams) => Promise<boolean>;

  getMyDocumentStats: (documentId?: string) => Promise<DocumentViewStats[]>;

  getDocumentViewers: (documentId: string) => Promise<DocumentView[]>;

  getMyViewHistory: () => Promise<DocumentView[]>;

  isLoading: boolean;
  error: string | null;
}

interface TrackViewParams {
  documentId: string;
  ownerId: string;
  ownerEmpresaId?: string;
  viewerEmpresaId?: string;
  actionType: 'view' | 'download' | 'share';
  auditLogId?: string;
}

export function useDocumentTracking(): UseDocumentTrackingReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabase();

  const trackDocumentView = useCallback(
    async (params: TrackViewParams): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Usuario no autenticado');
        }

        let viewerNombre: string | null = null;
        const viewerEmail = user.email || null;
        try {
          const { data: profileRow } = await supabase
            .from('kv_store_7d36b31f')
            .select('value')
            .eq('key', `slc_user:${user.id}`)
            .maybeSingle();
          const v = (profileRow?.value || {}) as Record<string, unknown>;
          const nombre = (v.nombre as string) || '';
          const apellido = (v.apellido as string) || '';
          viewerNombre = `${nombre} ${apellido}`.trim() || (v.name as string) || null;
        } catch {

        }

        const { data, error: insertError } = await supabase
          .from('document_views')
          .insert({
            document_id: params.documentId,
            viewer_id: user.id,
            viewer_empresa_id: params.viewerEmpresaId || null,
            viewer_nombre: viewerNombre,
            viewer_email: viewerEmail,
            owner_id: params.ownerId,
            owner_empresa_id: params.ownerEmpresaId || null,
            action_type: params.actionType,
            ip_address: null,
            user_agent: navigator.userAgent,
            audit_log_id: params.auditLogId || null,
          })
          .select()
          .single();

        if (insertError) {

          if (insertError.code === '23505') {
            return true;
          }
          throw insertError;
        }

        return true;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Error registrando vista';
        setError(msg);
        console.error('Error tracking document view:', err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  const getMyDocumentStats = useCallback(
    async (documentId?: string): Promise<DocumentViewStats[]> => {
      setIsLoading(true);
      setError(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Usuario no autenticado');
        }

        let query = supabase
          .from('document_view_stats')
          .select('*')
          .eq('owner_id', user.id);

        if (documentId) {
          query = query.eq('document_id', documentId);
        }

        const { data, error: queryError } = await query;

        if (queryError) throw queryError;

        const stats = data || [];
        const documentIds = stats.map((s) => s.document_id);

        if (documentIds.length > 0) {
          const { data: docs } = await supabase
            .from('documents')
            .select('id, original_name')
            .in('id', documentIds);

          const docMap = new Map(docs?.map((d) => [d.id, d.original_name]));

          return stats.map((s) => ({
            ...s,
            document_name: docMap.get(s.document_id) || 'Documento desconocido',
          }));
        }

        return stats;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Error cargando estadísticas';
        setError(msg);
        console.error('Error getting document stats:', err);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  const getDocumentViewers = useCallback(
    async (documentId: string): Promise<DocumentView[]> => {
      setIsLoading(true);
      setError(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Usuario no autenticado');
        }

        const { data, error: queryError } = await supabase
          .from('document_views')
          .select('*')
          .eq('document_id', documentId)
          .eq('owner_id', user.id)
          .order('viewed_at', { ascending: false });

        if (queryError) throw queryError;

        const views = data || [];

        return views.map((v) => ({
          ...v,
          viewer_name:
            v.viewer_nombre || v.viewer_email || 'Usuario desconocido',
          viewer_email: v.viewer_email,
        }));
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Error cargando viewers';
        setError(msg);
        console.error('Error getting document viewers:', err);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  const getMyViewHistory = useCallback(async (): Promise<DocumentView[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error: queryError } = await supabase
        .from('document_views')
        .select('*')
        .eq('viewer_id', user.id)
        .order('viewed_at', { ascending: false })
        .limit(100);

      if (queryError) throw queryError;

      const views = data || [];
      const documentIds = views.map((v) => v.document_id);

      if (documentIds.length > 0) {
        const { data: docs } = await supabase
          .from('documents')
          .select('id, original_name')
          .in('id', documentIds);

        const docMap = new Map(docs?.map((d) => [d.id, d.original_name]));

        return views.map((v) => ({
          ...v,
          document_name: docMap.get(v.document_id) || 'Documento desconocido',
        }));
      }

      return views;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Error cargando historial';
      setError(msg);
      console.error('Error getting view history:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  return {
    trackDocumentView,
    getMyDocumentStats,
    getDocumentViewers,
    getMyViewHistory,
    isLoading,
    error,
  };
}
