import { createEmbedding } from '../_shared/embedding.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PDF_URL = 'https://www.dt.gob.cl/legislacion/1624/articles-95516_recurso_1.pdf';
const TITLE = 'Código del Trabajo - Chile';
const SOURCE_NAME = 'Dirección del Trabajo - Código del Trabajo';
const CATEGORY = 'codigo_trabajo';

function buildChunkTitle(text: string, index: number, total: number): string {
  const nums = [...text.matchAll(/Art[íi]culo\s+(\d+)/gi)]
    .map((m) => parseInt(m[1], 10))
    .filter((n) => !isNaN(n));

  if (nums.length === 0) {
    return `${TITLE} (parte ${index + 1}/${total})`;
  }
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return min === max
    ? `${TITLE} - Art. ${min}`
    : `${TITLE} - Arts. ${min} a ${max}`;
}

class DB {
  private base: string;
  private headers: Record<string, string>;
  constructor(url: string, key: string) {
    this.base = `${url}/rest/v1`;
    this.headers = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    };
  }
  async deleteAll(): Promise<void> {
    await fetch(
      `${this.base}/loy_knowledge_documents?source_url=eq.${encodeURIComponent(PDF_URL)}`,
      { method: 'DELETE', headers: this.headers }
    );
  }
  async insert(row: Record<string, unknown>): Promise<void> {
    const res = await fetch(`${this.base}/loy_knowledge_documents`, {
      method: 'POST',
      headers: { ...this.headers, Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error(`insert: ${await res.text()}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'embed';

    if (action === 'pdf') {
      const res = await fetch(PDF_URL);
      if (!res.ok) throw new Error(`Descarga PDF falló: HTTP ${res.status}`);
      const bytes = await res.arrayBuffer();
      return new Response(bytes, {
        headers: { ...corsHeaders, 'Content-Type': 'application/pdf' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAiKey   = Deno.env.get('OPENAI_API_KEY') || undefined;

    if (!openAiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY no configurada.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const chunks: string[] = Array.isArray(body.chunks) ? body.chunks : [];
    const offset = Math.max(0, Number(body.offset) || 0);
    const total  = Number(body.total) || chunks.length;
    const reset  = body.reset === true;

    const db = new DB(supabaseUrl, supabaseKey);

    if (offset === 0 && reset) {
      await db.deleteAll();
    }

    const scrapedAt = new Date().toISOString();
    let inserted = 0;

    for (let j = 0; j < chunks.length; j++) {
      const chunk = chunks[j];
      if (!chunk || chunk.length < 80) continue;
      const globalIndex = offset + j;

      const embedding = await createEmbedding(chunk, openAiKey);
      await db.insert({
        title: buildChunkTitle(chunk, globalIndex, total),
        content: chunk,
        content_chunk: chunk.slice(0, 1500),
        embedding,
        source_url: PDF_URL,
        source_type: 'normativa',
        source_name: SOURCE_NAME,
        category: CATEGORY,
        status: 'approved',
        chunk_index: globalIndex,
        total_chunks: total,
        metadata: {
          ingested_at: scrapedAt,
          embedding_type: 'openai_text-embedding-3-small',
        },
      });
      inserted++;
    }

    return new Response(
      JSON.stringify({ success: true, inserted, offset }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const msg = (err as Error).message;
    console.log(`❌ Error: ${msg}`);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
