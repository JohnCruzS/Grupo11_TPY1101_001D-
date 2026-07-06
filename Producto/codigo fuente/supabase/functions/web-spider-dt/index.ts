import { createEmbedding } from '../_shared/embedding.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SEED_URLS = [
  'https://www.dt.gob.cl/legislacion/1624/w3-channel.html',
  'https://www.dt.gob.cl/legislacion/1624/w3-multipropertyvalues-22762-193891.html',
  'https://www.dt.gob.cl/legislacion/1624/w3-multipropertyvalues-147182-193891.html',
  'https://www.dt.gob.cl/legislacion/1624/w3-propertyvalue-22763.html',
  'https://www.dt.gob.cl/legislacion/1624/w3-article-95516.html',
];

const ALLOWED_HOSTS = new Set(['www.dt.gob.cl', 'dt.gob.cl']);
const ALLOWED_PATH_PREFIX = '/legislacion/1624';
const SKIP_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.css', '.js', '.zip'];
const DEFAULT_MAX_PAGES = 25;

const HARD_MAX_PAGES = 30;
const DEFAULT_DELAY_MS = 1200;
const TIMEOUT_MS = 130_000;

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

  async exists(table: string, column: string, value: string): Promise<boolean> {
    const url = `${this.base}/${table}?${column}=eq.${encodeURIComponent(value)}&select=id&limit=1`;
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0;
  }

  async insert(table: string, row: Record<string, unknown>): Promise<string | null> {
    const res = await fetch(`${this.base}/${table}`, {
      method: 'POST',
      headers: { ...this.headers, Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`DB insert ${table}: ${err}`);
    }
    return null;
  }
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    u.search = '';
    return u.toString();
  } catch { return url; }
}

function isAllowedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (!ALLOWED_HOSTS.has(u.hostname)) return false;
    if (!u.pathname.startsWith(ALLOWED_PATH_PREFIX)) return false;
    if (SKIP_EXTENSIONS.some((ext) => u.pathname.toLowerCase().endsWith(ext))) return false;
    return true;
  } catch { return false; }
}

function isArticleUrl(url: string): boolean {
  return /\/w3-article-\d+\.html$/i.test(url);
}

function extractLinks(html: string, baseUrl: string): string[] {
  const links = new Set<string>();
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1]?.trim();
    if (!raw || raw.startsWith('mailto:') || raw.startsWith('#')) continue;
    try {
      const norm = normalizeUrl(new URL(raw, baseUrl).toString());
      if (isAllowedUrl(norm)) links.add(norm);
    } catch {  }
  }
  return Array.from(links);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function deriveTitle(html: string, content: string, url: string): string {
  const articleId = url.match(/w3-article-(\d+)\.html/i)?.[1];

  const ordMatch = content.match(/ORD\.?\s*N[°ºoO]?\s*[\d./-]+/i);
  if (ordMatch) {
    return stripHtml(ordMatch[0]).replace(/\s+/g, ' ').trim();
  }

  const h1 = stripHtml(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '').trim();
  const generic = /^(dict[aá]menes y normativa|normativa laboral|direcci[oó]n del trabajo)$/i;
  if (h1.length > 5 && !generic.test(h1)) {
    return h1;
  }

  const tema = inferCategory(content);
  return articleId
    ? `Dictamen DT ${articleId} — ${tema}`
    : `Normativa Laboral - Dirección del Trabajo`;
}

function extractContent(html: string): string {

  for (const re of [/<main[^>]*>([\s\S]*?)<\/main>/i, /<article[^>]*>([\s\S]*?)<\/article>/i]) {
    const m = html.match(re);
    if (m?.[1]) {
      const t = stripHtml(m[1]).trim();
      if (t.length > 200) return t.slice(0, 8000);
    }
  }

  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return stripHtml(body?.[1] ?? html).slice(0, 8000);
}

function cleanContent(text: string): string {
  let s = text
    .replace(/Contenido principal/gi, ' ')
    .replace(/Toggle navigation/gi, ' ')
    .replace(/Buscar dict[aá]menes/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const startRe = [/ORD\.?\s*N[°º]?\s*\d+/i, /C[oó]digo del Trabajo/i, /Art[ií]culo\s+\d+/i];
  let start = -1;
  for (const re of startRe) {
    const idx = s.search(re);
    if (idx !== -1 && (start === -1 || idx < start)) start = idx;
  }
  if (start > 0) s = s.slice(start);

  const endMarkers = ['Concordancias', 'Catalogación', 'Ministerio del Trabajo'];
  for (const m of endMarkers) {
    const idx = s.indexOf(m, 10);
    if (idx !== -1) { s = s.slice(0, idx); break; }
  }

  return s.trim();
}

function inferCategory(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('contrato')) return 'contratos';
  if (t.includes('vacacion') || t.includes('feriado')) return 'vacaciones';
  if (t.includes('despido') || t.includes('indemniza')) return 'despidos';
  if (t.includes('jornada')) return 'jornada';
  if (t.includes('licencia') || t.includes('postnatal')) return 'licencias';
  if (t.includes('remuneracion')) return 'remuneraciones';
  return 'normativa';
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function fetchTextBounded(
  url: string,
  maxBytes = 500_000,
  timeoutMs = 10_000
): Promise<string | null> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SotLoyConectaSpider/1.0 (+https://sotloy.cl)' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    console.log(`⚠️ HTTP ${res.status}`);
    await res.body?.cancel().catch(() => {});
    return null;
  }
  if (!res.body) return '';

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let bytes = 0;

  try {
    while (bytes < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      parts.push(decoder.decode(value, { stream: true }));
    }
  } finally {

    await reader.cancel().catch(() => {});
  }

  return parts.join('');
}

function chunkText(text: string, max = 1500, overlap = 200): string[] {
  if (text.length <= max) return [text];

  const chunks: string[] = [];
  let start = 0;

  const MAX_CHUNKS = 100;

  while (start < text.length && chunks.length < MAX_CHUNKS) {
    let end = Math.min(start + max, text.length);
    if (end < text.length) {
      const sub = text.substring(start, end);
      const lb = Math.max(sub.lastIndexOf('. '), sub.lastIndexOf('\n'));
      if (lb > max / 2) end = start + lb + 1;
    }

    const chunk = text.substring(start, end).trim();
    if (chunk.length > 80) chunks.push(chunk);

    if (end >= text.length) break;

    const nextStart = end - overlap;
    start = nextStart > start ? nextStart : end;
  }

  return chunks.length > 0 ? chunks : [text];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAiKey   = Deno.env.get('OPENAI_API_KEY') || undefined;

    const db = new DB(supabaseUrl, supabaseKey);

    const envMaxPages = Number(Deno.env.get('SPIDER_MAX_PAGES') || DEFAULT_MAX_PAGES);
    const maxPages = Math.min(Math.max(1, envMaxPages || DEFAULT_MAX_PAGES), HARD_MAX_PAGES);
    const delayMs  = Number(Deno.env.get('SPIDER_DELAY_MS')  || DEFAULT_DELAY_MS);
    const startTime = Date.now();

    console.log(`🕷️ Spider DT | maxPages=${maxPages} | embedding=${openAiKey ? 'openai' : 'hash'}`);

    const visited = new Set<string>();
    const queued  = new Set<string>(SEED_URLS.map(normalizeUrl));
    const queue   = [...queued];
    let found = 0, processed = 0, timedOut = false;

    while (queue.length > 0 && visited.size < maxPages) {
      if (Date.now() - startTime > TIMEOUT_MS) {
        timedOut = true;
        console.log('⏰ Timeout, deteniendo.');
        break;
      }

      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      console.log(`🌐 [${visited.size}/${maxPages}] ${current}`);

      let html: string;
      try {
        const body = await fetchTextBounded(current);
        if (body === null) {
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        html = body;
      } catch (e: unknown) {
        console.log(`⚠️ Fetch fallido: ${(e as Error).message}`);
        continue;
      }

      for (const link of extractLinks(html, current)) {
        if (!visited.has(link) && !queued.has(link) && queue.length < maxPages * 3) {
          queued.add(link);
          isArticleUrl(link) ? queue.unshift(link) : queue.push(link);
        }
      }

      if (!isArticleUrl(current)) {
        console.log('⏭️ Índice, solo links');
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }

      if (await db.exists('loy_knowledge_documents', 'source_url', current)) {
        console.log('↩️ Ya indexado');
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }

      const content = cleanContent(extractContent(html));
      const title   = deriveTitle(html, content, current);

      html = '';

      if (content.length < 150) {
        console.log(`⏭️ Contenido corto (${content.length} chars)`);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }

      const chunks     = content.length > 1500 ? chunkText(content) : [content];
      const contentHash = await sha256(content);
      const category   = inferCategory(`${title} ${content}`);
      const scrapedAt  = new Date().toISOString();
      let inserted = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        try {
          const embedding = await createEmbedding(chunk, openAiKey);
          await db.insert('loy_knowledge_documents', {
            title: chunks.length > 1 ? `${title} (${i + 1}/${chunks.length})` : title,
            content: chunk,
            content_chunk: chunk.slice(0, 1500),
            embedding,
            source_url: current,
            source_type: 'normativa',
            source_name: 'Dirección del Trabajo - Chile',
            category,
            status: 'approved',
            chunk_index: i,
            total_chunks: chunks.length,
            metadata: {
              spider_name: 'dt_normativas_cloud',
              scraped_at: scrapedAt,
              embedding_type: openAiKey ? 'openai_text-embedding-3-small' : 'hash_fallback',
              content_hash: contentHash,
            },
          });
          inserted++;
        } catch (e: unknown) {
          console.log(`❌ Chunk ${i + 1}: ${(e as Error).message}`);
        }
      }

      if (inserted > 0) { found++; processed++; }
      console.log(`✅ ${inserted}/${chunks.length} chunks: ${title}`);

      await new Promise((r) => setTimeout(r, delayMs));
    }

    try {
      await db.insert('loy_spider_logs', {
        spider_name: 'dt_normativas_cloud',
        source_url: 'https://www.dt.gob.cl',
        status: timedOut ? 'partial' : 'success',
        items_found: found,
        items_processed: processed,
        error_message: null,
      });
    } catch {  }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`✅ Fin: ${processed} artículos | ${visited.size} páginas | ${elapsed}s`);

    return new Response(
      JSON.stringify({
        success: true,
        status: timedOut ? 'partial' : 'success',
        embedding_mode: openAiKey ? 'semantic' : 'hash_fallback',
        summary: { visited: visited.size, found, processed, elapsed_seconds: elapsed },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const msg = (err as Error).message;
    console.log(`❌ Error crítico: ${msg}`);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
