import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { insertAuditLog } from '../_shared/audit.ts';
import { sendResendEmail } from '../_shared/email.ts';

function workerUploadEmailHtml(params: {
  empresaNombre: string;
  trabajador: string;
  documento: string;
  categoria: string;
  descripcion?: string;
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
    .row span:last-child{color:#0f172a;font-weight:600;text-align:right;}
    .note{background:#eff6ff;border-left:4px solid #2563eb;padding:12px 16px;border-radius:0 8px 8px 0;font-size:13px;color:#1e40af;margin-top:20px;}
  </style></head><body>
    <div class="card">
      <div class="head">
        <h1>📄 Nuevo documento de un trabajador</h1>
        <p>Un trabajador subió un documento a tu empresa</p>
      </div>
      <div class="body">
        <div class="row"><span>Trabajador</span><span>${params.trabajador}</span></div>
        <div class="row"><span>Documento</span><span>${params.documento}</span></div>
        <div class="row"><span>Categoría</span><span>${params.categoria}</span></div>
        ${params.descripcion ? `<div class="row"><span>Descripción</span><span>${params.descripcion}</span></div>` : ''}
        <div class="note">
          Ingresa a tu panel de <strong>SotLoy Conecta</strong> → Documentos para revisarlo.
        </div>
      </div>
    </div>
  </body></html>`;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',

  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  'application/xml',
  'text/xml',
  'text/plain',

  'image/jpeg',
  'image/png',
]);

async function calculateSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getAuthToken(req: Request) {
  return req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = getAuthToken(req);

    if (!token) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;
    const originalName = formData.get('original_name') as string;
    const enterpriseId = formData.get('enterprise_id') as string;
    const userId = formData.get('user_id') as string | null;
    const recipientType = formData.get('recipient_type') as string | null;

    if (!file || !enterpriseId) {
      return new Response(
        JSON.stringify({ error: 'Faltan datos requeridos' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'El archivo supera el límite de 20 MB.' }),
        {
          status: 413,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return new Response(
        JSON.stringify({ error: `Tipo de archivo no permitido: ${file.type}` }),
        {
          status: 415,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: profileRow, error: profileError } = await supabase
      .from('kv_store_7d36b31f')
      .select('value')
      .eq('key', `slc_user:${user.id}`)
      .maybeSingle();

    if (profileError) {
      console.error('Error cargando perfil:', profileError);
    }

    const profile = profileRow?.value || {};
    const role = profile.rol || profile.role;
    const profileEnterpriseId = profile.empresaId || profile.empresa_id;

    const canUpload =
      ['admin', 'superadmin'].includes(role) ||
      ((role === 'empresa' || role === 'usuario') &&
        profileEnterpriseId === enterpriseId);

    if (!canUpload) {
      return new Response(JSON.stringify({ error: 'Acceso denegado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existing } = await supabase
      .from('documents')
      .select('id')
      .eq('enterprise_id', enterpriseId)
      .eq('file_type', category)
      .eq('original_name', originalName || file.name)
      .eq('user_id', userId || null)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          error: 'Ya existe un documento con el mismo tipo y nombre para este destinatario. Use "Nueva Versión" para reemplazarlo.',
          duplicate: true,
          existing_id: existing.id,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const hashSha256 = await calculateSHA256(file);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `enterprises/${enterpriseId}/${userId || 'general'}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error subiendo a storage:', uploadError);
      return new Response(
        JSON.stringify({
          error: 'Error subiendo archivo: ' + uploadError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert({
        enterprise_id: enterpriseId,
        user_id: userId || null,
        recipient_type: recipientType || (userId ? 'worker' : 'enterprise'),
        filename: fileName,
        original_name: originalName || file.name,
        file_type: category,
        file_category: category,
        file_size: file.size,
        mime_type: file.type,
        storage_path: filePath,
        storage_url: null,
        hash_sha256: hashSha256,
        description: description || null,
        tags: [],
        uploaded_by: user.id,
        uploaded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (docError) {
      console.error('Error guardando en BD:', docError);

      await supabase.storage.from('documents').remove([filePath]);
      return new Response(
        JSON.stringify({
          error: 'Error guardando documento: ' + docError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const ipAddress =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      null;
    const userAgent = req.headers.get('user-agent');

    await insertAuditLog(supabase, {
      action: 'DOCUMENT_UPLOAD',
      userId: user.id,
      resourceType: 'document',
      resourceId: docData?.id,
      resourcePath: docData?.storage_path,
      enterpriseId: enterpriseId,
      success: true,
      ipAddress,
      userAgent,
      metadata: {
        original_name: docData?.original_name,
        file_category: docData?.file_category,
        recipient_type: docData?.recipient_type,
      },
    });

    if (role === 'usuario') {
      try {
        const { data: ent } = await supabase
          .from('enterprises')
          .select('name, email')
          .eq('id', enterpriseId)
          .maybeSingle();
        const trabajador =
          `${profile.nombre || ''} ${profile.apellido || ''}`.trim() ||
          (profile.email as string) ||
          'Un trabajador';
        if (ent?.email) {
          const r = await sendResendEmail({
            to: ent.email,
            subject: `📄 ${trabajador} subió un documento a tu empresa`,
            html: workerUploadEmailHtml({
              empresaNombre: ent.name || 'tu empresa',
              trabajador,
              documento: originalName || file.name,
              categoria: category,
              descripcion: description || undefined,
            }),
          });
          console.log(
            `[documents] aviso a empresa (${ent.email}) por subida de trabajador → ok=${r.ok} error=${r.error ?? '-'}`
          );
        } else {
          console.warn('[documents] la empresa no tiene email para notificar la subida del trabajador');
        }
      } catch (e) {
        console.error('[documents] error notificando subida a la empresa:', e);
      }
    }

    return new Response(JSON.stringify({ success: true, document: docData }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error inesperado:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
