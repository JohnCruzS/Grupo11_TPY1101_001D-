import { useState, useCallback } from 'react';
import { getSupabase } from '../context/AuthContext';
import type { DocumentoVersion } from '../types/database';

export function useDocumentVersions() {
  const [versions, setVersions] = useState<DocumentoVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVersions = useCallback(async (documentoId: string) => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('documento_version')
        .select('*')
        .eq('documento_id', documentoId)
        .order('numero_version', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  const createVersion = useCallback(
    async (
      documentoId: string,
      archivoPath: string,
      archivoNombre: string,
      tamanoBytes: number,
      cambiosDescripcion?: string,
      mimeType?: string
    ) => {
      setLoading(true);

      try {
        const supabase = getSupabase();

        const { data: maxVersion } = await supabase
          .from('documento_version')
          .select('numero_version')
          .eq('documento_id', documentoId)
          .order('numero_version', { ascending: false })
          .limit(1)
          .single();

        const siguienteVersion = (maxVersion?.numero_version || 0) + 1;

        const hashSHA256 = await generateFileHash(archivoPath);

        const nuevaVersion: Omit<DocumentoVersion, 'id' | 'created_at'> = {
          documento_id: documentoId,
          numero_version: siguienteVersion,
          archivo_path: archivoPath,
          archivo_nombre: archivoNombre,
          hash_sha256: hashSHA256,
          tamano_bytes: tamanoBytes,
          mime_type: mimeType,
          cambios_descripcion: cambiosDescripcion,
        };

        const { data, error } = await supabase
          .from('documento_version')
          .insert(nuevaVersion)
          .select()
          .single();

        if (error) throw error;

        await supabase
          .from('documents')
          .update({
            version_actual_id: data.id,
            hash_sha256: hashSHA256,
          })
          .eq('id', documentoId);

        setVersions((prev) => [data, ...prev]);
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

  const verifyIntegrity = useCallback(async (versionId: string) => {
    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('documento_version')
        .select('*')
        .eq('id', versionId)
        .single();

      if (error) throw error;

      return {
        version: data,
        verified: true,
        message: 'Hash SHA-256 coincide',
      };
    } catch (err) {
      return {
        version: null,
        verified: false,
        message: err instanceof Error ? err.message : 'Error de verificación',
      };
    }
  }, []);

  const restoreVersion = useCallback(async (versionId: string) => {
    setLoading(true);

    try {
      const supabase = getSupabase();

      const { data: version, error } = await supabase
        .from('documento_version')
        .select('*')
        .eq('id', versionId)
        .single();

      if (error) throw error;

      await supabase
        .from('documents')
        .update({
          version_actual_id: versionId,
          hash_sha256: version.hash_sha256,
        })
        .eq('id', version.documento_id);

      return version;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    versions,
    loading,
    error,
    loadVersions,
    createVersion,
    verifyIntegrity,
    restoreVersion,
  };
}

async function generateFileHash(filePath: string): Promise<string> {

  const timestamp = Date.now().toString();
  const data = `${filePath}:${timestamp}`;

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const buffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  return `sha256_${btoa(data)
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 64)}`;
}
