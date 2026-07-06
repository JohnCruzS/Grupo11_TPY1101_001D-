import { getSupabase } from '../context/AuthContext';

const SIGNED_URL_EXPIRY = 60 * 60;

export async function generateSignedUrl(
  path: string,
  bucket: string = 'documents',
  expirySeconds: number = SIGNED_URL_EXPIRY
): Promise<string | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expirySeconds);

  if (error) {
    console.error('Error generando URL firmada:', error);
    return null;
  }

  return data?.signedUrl || null;
}

export async function uploadFile(
  file: File,
  path: string,
  bucket: string = 'documents'
): Promise<{ path: string; error: Error | null }> {
  const supabase = getSupabase();

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  return {
    path: data?.path || path,
    error: error || null,
  };
}

export async function deleteFile(
  path: string,
  bucket: string = 'documents'
): Promise<{ error: Error | null }> {
  const supabase = getSupabase();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  return { error: error || null };
}
