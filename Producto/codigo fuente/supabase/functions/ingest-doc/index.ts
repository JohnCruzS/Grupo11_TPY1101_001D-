import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function createEmbedding(
  text: string,
  apiKey: string
): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

function chunkText(
  text: string,
  maxLength: number = 1000,
  overlap: number = 200
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxLength;

    if (end < text.length) {
      const substring = text.substring(start, end);
      const lastBreak = Math.max(
        substring.lastIndexOf('.'),
        substring.lastIndexOf('\n'),
        substring.lastIndexOf(' ')
      );
      if (lastBreak > 0) {
        end = start + lastBreak + 1;
      }
    }

    chunks.push(text.substring(start, end).trim());
    start = end - overlap;
  }

  return chunks.filter((chunk) => chunk.length > 50);
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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

    const token = getAuthToken(req);
    if (!token) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profileRow } = await supabase
      .from('kv_store_7d36b31f')
      .select('value')
      .eq('key', `slc_user:${user.id}`)
      .maybeSingle();

    const role = profileRow?.value?.rol || profileRow?.value?.role;
    if (!['admin', 'superadmin'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Acceso denegado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY no configurada' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = await req.json();
    const {
      title,
      content,
      source_url,
      source_type,
      source_name,
      category,
      published_date,
      effective_date,
      metadata = {},
    } = body;

    if (!title || !content) {
      return new Response(
        JSON.stringify({ error: 'Título y contenido son requeridos' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const chunks = chunkText(content, 1500, 300);
    const insertedIds: string[] = [];

    console.log(
      `Procesando documento "${title}" en ${chunks.length} chunks...`
    );

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      const embedding = await createEmbedding(chunk, openaiApiKey);

      const { data, error } = await supabase
        .from('loy_knowledge_documents')
        .insert({
          title,
          content,
          content_chunk: chunk,
          embedding,
          source_url,
          source_type,
          source_name,
          category,
          published_date,
          effective_date,
          chunk_index: i,
          total_chunks: chunks.length,
          status: 'approved',
          metadata: {
            ...metadata,
            ingested_at: new Date().toISOString(),
            chunk_info: `${i + 1}/${chunks.length}`,
          },
        })
        .select()
        .single();

      if (error) {
        console.error('Error insertando chunk:', error);
        throw error;
      }

      insertedIds.push(data.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Documento procesado en ${chunks.length} fragmentos`,
        document_ids: insertedIds,
        status: 'approved',
        note: 'Los documentos quedan aprobados automaticamente',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Error en ingest-doc:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
