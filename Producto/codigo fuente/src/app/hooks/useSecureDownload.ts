import { useState, useCallback } from 'react';
import { getSupabase } from '../context/AuthContext';

interface TrackingParams {
  documentId: string;
  ownerId: string;
  ownerEmpresaId?: string;
  viewerEmpresaId?: string;
}

interface UseSecureDownloadReturn {
  downloadSecure: (
    storagePath: string,
    originalName: string,
    tracking?: TrackingParams
  ) => Promise<void>;
  getSecureUrl: (storagePath: string) => Promise<string | null>;
  isLoading: boolean;
  error: string | null;
}

export function useSecureDownload(): UseSecureDownloadReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSecureUrl = useCallback(
    async (storagePath: string): Promise<string | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const supabase = getSupabase();
        const { data, error: functionError } = await supabase.functions.invoke(
          'secure-document-url',
          {
            body: {
              storage_path: storagePath,
              action: 'view',
              expires_in: 3600,
            },
          }
        );

        if (functionError) {
          throw new Error(functionError.message);
        }

        if (!data?.signedUrl) {
          throw new Error('No se pudo generar URL segura');
        }

        return data.signedUrl;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const downloadSecure = useCallback(
    async (
      storagePath: string,
      originalName: string,
      tracking?: TrackingParams
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const supabase = getSupabase();
        const { data, error: functionError } = await supabase.functions.invoke(
          'secure-document-url',
          {
            body: {
              storage_path: storagePath,
              document_id: tracking?.documentId,
              action: 'download',
              expires_in: 3600,
            },
          }
        );

        if (functionError) {
          throw new Error(functionError.message);
        }

        if (!data?.signedUrl) {
          throw new Error('No se pudo generar URL de descarga');
        }

        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = originalName;
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [getSecureUrl]
  );

  return {
    downloadSecure,
    getSecureUrl,
    isLoading,
    error,
  };
}
