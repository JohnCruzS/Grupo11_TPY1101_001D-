#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://qpttobsxyvmaxtmzcver.supabase.co';
const SERVICE_ROLE_KEY = process.env.LOY_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('Falta LOY_SERVICE_ROLE_KEY en el entorno.');
  console.error(
    'Ejemplo: LOY_SERVICE_ROLE_KEY=tu_key OPENAI_API_KEY=sk-... node scripts/ingest_codigo_trabajo.js'
  );
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error('Falta OPENAI_API_KEY en el entorno.');
  console.error(
    'Es obligatoria: LOY busca con embeddings de OpenAI, así que el Código debe'
  );
  console.error(
    'indexarse con el MISMO modelo o LOY nunca encontrará estos chunks.'
  );
  process.exit(1);
}

const PDF_URL =
  'https://www.dt.gob.cl/legislacion/1624/articles-95516_recurso_1.pdf';
const TITLE = 'Codigo del Trabajo - Chile';
const SOURCE_NAME = 'Direccion del Trabajo - Codigo del Trabajo';
const SOURCE_TYPE = 'normativa';
const CATEGORY = 'codigo_trabajo';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createEmbedding(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8191),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI embeddings ${response.status}: ${err}`);
  }

  const json = await response.json();
  return json.data[0].embedding;
}

function chunkText(text, maxLength = 1500, overlap = 300) {
  const chunks = [];
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

    const chunk = text.substring(start, end).trim();
    if (chunk.length > 50) {
      chunks.push(chunk);
    }
    start = end - overlap;
  }

  return chunks;
}

async function main() {
  const pdfModule = await import('pdf-parse/lib/pdf-parse.js');
  const pdfParse = pdfModule.default || pdfModule;
  if (typeof pdfParse !== 'function') {
    throw new Error('pdf-parse no esta disponible.');
  }

  console.log('Descargando PDF...');
  const response = await fetch(PDF_URL);
  if (!response.ok) {
    throw new Error(`Error descargando PDF: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const data = await pdfParse(Buffer.from(buffer));
  const content = data.text.replace(/\s+/g, ' ').trim();

  if (!content || content.length < 500) {
    throw new Error('El PDF no devolvio texto suficiente.');
  }

  const chunks = chunkText(content, 1500, 300);
  console.log(`Texto extraido: ${content.length} caracteres`);
  console.log(`Creando ${chunks.length} chunks...`);

  const { data: existing } = await supabase
    .from('loy_knowledge_documents')
    .select('id')
    .eq('source_url', PDF_URL)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`Ya existen registros con source_url=${PDF_URL}. Usa --force para reingestar.`);
    if (!process.argv.includes('--force')) {
      process.exit(0);
    }
    console.log('--force detectado, borrando registros anteriores...');
    const { error: delError } = await supabase
      .from('loy_knowledge_documents')
      .delete()
      .eq('source_url', PDF_URL);
    if (delError) throw delError;
    console.log('Registros anteriores eliminados.');
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await createEmbedding(chunk);

    const { error } = await supabase
      .from('loy_knowledge_documents')
      .insert({
        title: `${TITLE} (parte ${i + 1}/${chunks.length})`,
        content: chunk,
        content_chunk: chunk.slice(0, 1500),
        embedding,
        source_url: PDF_URL,
        source_type: SOURCE_TYPE,
        source_name: SOURCE_NAME,
        category: CATEGORY,
        chunk_index: i,
        total_chunks: chunks.length,
        status: 'approved',
        metadata: {
          ingested_at: new Date().toISOString(),
          embedding_type: 'openai_text-embedding-3-small',
          chunk_info: `${i + 1}/${chunks.length}`,
        },
      });

    if (error) {
      console.error('Error insertando chunk:', error.message);
      throw error;
    }

    if ((i + 1) % 10 === 0) {
      console.log(`Insertados ${i + 1}/${chunks.length}...`);
    }
  }

  console.log('Listo. Codigo del Trabajo ingerido.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
