import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createEmbedding } from '../_shared/embedding.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RetrievedDoc {
  id: string;
  title: string;
  content_chunk: string;
  source_url: string;
  source_name: string;
  category: string;
  similarity: number;
}

interface LLMConfig {
  provider: 'github' | 'openai' | 'groq' | 'local';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

function getBearerToken(req: Request): string | null {
  return req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || null;
}

function resolveLLMConfig(): LLMConfig {
  const provider = (Deno.env.get('LOY_LLM_PROVIDER') || '').toLowerCase();

  const githubKey = Deno.env.get('GITHUB_MODELS_API_KEY') || Deno.env.get('GITHUB_TOKEN') || '';
  const githubBase = Deno.env.get('GITHUB_MODELS_BASE_URL') || 'https://models.inference.ai.azure.com';
  const githubModel = Deno.env.get('GITHUB_MODELS_MODEL') || 'gpt-4o-mini';

  const openAiKey = Deno.env.get('OPENAI_API_KEY') || '';
  const openAiBase = Deno.env.get('OPENAI_BASE_URL') || 'https://api.openai.com/v1';
  const openAiModel = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';

  const groqKey = Deno.env.get('groq_api_key') || Deno.env.get('GROQ_API_KEY') || '';
  const groqModel = Deno.env.get('GROQ_MODEL') || 'llama3-8b-8192';

  if (provider === 'github' && githubKey) return { provider: 'github', apiKey: githubKey, baseUrl: githubBase, model: githubModel };
  if (provider === 'openai' && openAiKey) return { provider: 'openai', apiKey: openAiKey, baseUrl: openAiBase, model: openAiModel };
  if (provider === 'groq' && groqKey) return { provider: 'groq', apiKey: groqKey, baseUrl: 'https://api.groq.com/openai/v1', model: groqModel };
  if (githubKey) return { provider: 'github', apiKey: githubKey, baseUrl: githubBase, model: githubModel };
  if (openAiKey) return { provider: 'openai', apiKey: openAiKey, baseUrl: openAiBase, model: openAiModel };
  if (groqKey) return { provider: 'groq', apiKey: groqKey, baseUrl: 'https://api.groq.com/openai/v1', model: groqModel };

  return { provider: 'local' };
}

async function callLLM(
  config: LLMConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<{ content: string; tokensUsed: number }> {
  if (!config.apiKey || !config.baseUrl || !config.model) {
    throw new Error('LLM config incompleta');
  }

  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${config.provider} API error: ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    tokensUsed: data.usage?.total_tokens || 0,
  };
}

function buildLLMPrompt(query: string, docs: RetrievedDoc[]): { system: string; user: string } {
  const context = docs
    .map((doc, i) =>
      `[Documento ${i + 1}]\nTítulo: ${doc.title}\nFuente: ${doc.source_name || 'Desconocida'}\nCategoría: ${doc.category || 'General'}\nContenido: ${doc.content_chunk}`
    )
    .join('\n\n---\n\n');

  const system = `Eres LOY, el asistente legal de SotLoy Conecta, especializado en normativa laboral chilena (Código del Trabajo y dictámenes de la Dirección del Trabajo).

REGLAS DE FUNDAMENTACIÓN (lo más importante):
1. Basa tu respuesta en el CONTEXTO proporcionado. Si afirmas un dato concreto (un plazo, un monto, un porcentaje, un artículo), debe provenir del contexto. NO inventes números ni artículos que no estén en el contexto.
2. Si el contexto no alcanza para responder con certeza, dilo explícitamente: indica qué parte sí puedes responder y qué parte requeriría revisar la norma específica. No rellenes con suposiciones.
3. Si NO hay nada relevante en el contexto, responde exactamente: "No tengo información suficiente en mi base de conocimientos para responder esa pregunta."

REGLAS SOBRE CÁLCULOS NUMÉRICOS (CRÍTICO — leer con atención):
4. NO inventes fórmulas de cálculo. Una fórmula o regla de cálculo (por ejemplo, cómo se prorratea una indemnización, qué fracción de tiempo cuenta, qué tope aplica) SOLO puedes usarla si aparece TEXTUALMENTE en el contexto. Si la regla exacta no está en el contexto, NO la deduzcas ni la aproximes.
5. PROHIBIDO el cálculo "proporcional" o "aproximado" cuando la regla no esté explícita. Frases como "se calcularía proporcionalmente", "aproximadamente", "podría corresponder" aplicadas a montos son señal de que estás inventando: NO las uses.
6. Si te piden un monto específico y el contexto NO contiene la regla de cálculo exacta, responde así: explica QUÉ componentes integran el cálculo (en términos generales), aclara que el monto exacto depende de reglas específicas de la ley que deben verificarse, y NO entregues una cifra final inventada.
7. Solo entrega una cifra final si puedes derivarla de una regla que esté literal en el contexto. En ese caso, cita el artículo de donde sale la regla.

REGLAS DE PRECISIÓN LEGAL:
8. Muchas reglas laborales son CONDICIONALES. Cuando algo dependa de un supuesto, indícalo claramente. Ejemplos típicos:
   - La indemnización por años de servicio solo aplica en ciertos términos de contrato (p. ej. necesidades de la empresa), NO en una renuncia voluntaria ni en término de contrato a plazo fijo.
   - Puede existir indemnización sustitutiva del aviso previo si no se dio el aviso correspondiente.
   Si el contexto no especifica el supuesto, aclara que "depende del tipo de término de la relación laboral".

REGLAS DE RELEVANCIA Y ASERTIVIDAD (para no dar "ladrillos" confusos):
9. RESPONDE PRIMERO LA REGLA GENERAL que aplica a la mayoría de los trabajadores, de forma directa y clara. Recién DESPUÉS añade excepciones o casos especiales, y mantenlos breves. No abras la respuesta con la excepción ni pongas la regla general al mismo nivel que un caso de nicho. Ejemplo: para el feriado anual, la regla general es 15 días hábiles; los 20 días son una excepción regional que se menciona después y en una línea.
10. USA SOLO EL CONTEXTO RELEVANTE a la pregunta. Si entre los documentos recuperados hay artículos que regulan un caso particular que NO fue preguntado (p. ej. reglas exclusivas de profesores, de trabajadores agrícolas, de un sector específico), NO los incluyas a menos que el usuario haya preguntado por ese caso. Ignorar contexto irrelevante es correcto, no un incumplimiento.
11. Prioriza una respuesta útil y al grano. Si puedes responder en pocas frases, hazlo; no infles la respuesta para "usar" todos los fragmentos.

FORMATO:
12. Sé claro y profesional. Usa listas o pasos cuando ayude.
13. NO agregues una sección de "Fuentes:" ni una lista de fuentes al final. La interfaz ya muestra las fuentes como etiquetas debajo de tu respuesta, así que sería redundante. Si quieres referenciar un artículo dentro del texto, hazlo de forma natural (p. ej. "según el artículo 67"), pero sin un bloque de fuentes al cierre.
14. Termina SIEMPRE con: "Esta respuesta es solo orientativa y no reemplaza la asesoría legal profesional."`;

  const user = `CONTEXTO:\n${context}\n\n---\n\nPREGUNTA: ${query}\n\nResponde fundamentándote SOLO en el contexto anterior. Empieza por la regla general que aplica a la mayoría; las excepciones van después y breves. Ignora los fragmentos que regulen casos específicos que no se preguntaron. Si la pregunta pide un monto o cálculo y la regla exacta no está textual en el contexto, NO inventes la fórmula ni des una cifra final: explica los componentes y di que el monto depende de reglas que deben verificarse. NO incluyas una sección de "Fuentes:" al final (las fuentes ya se muestran como etiquetas en la interfaz).`;

  return { system, user };
}

function buildFallbackResponse(query: string, docs: RetrievedDoc[]): string {
  if (docs.length === 0) {
    return 'No tengo información suficiente en mi base de conocimientos para responder esa pregunta específica.\n\n**Disclaimer:** Esta respuesta es solo orientativa y no reemplaza la asesoría legal profesional.';
  }

  const sourceLines = docs.slice(0, 3).map((doc, i) => {
    const snippet = doc.content_chunk.length > 320
      ? `${doc.content_chunk.slice(0, 320).trimEnd()}...`
      : doc.content_chunk;
    return `[Fuente ${i + 1}] ${doc.title} (${doc.source_name})\n${snippet}`;
  });

  return [
    'Encontré información relacionada en mi base de conocimientos.',
    '',
    `Consulta: ${query}`,
    '',
    ...sourceLines,
    '',
    '**Disclaimer:** Esta respuesta es solo orientativa y no reemplaza la asesoría legal profesional.',
  ].join('\n');
}

async function vectorSearch(
  supabase: ReturnType<typeof createClient>,
  query: string,
  openAiKey: string | undefined,
  options: { similarityThreshold: number; maxResults: number; category?: string }
): Promise<RetrievedDoc[]> {
  const embedding = await createEmbedding(query, openAiKey);

  const { data, error } = await supabase.rpc('search_loy_knowledge', {
    query_embedding: embedding,
    similarity_threshold: options.similarityThreshold,
    max_results: options.maxResults,
    p_category: options.category || null,
  });

  if (error) {
    console.error('Error en búsqueda vectorial:', error.message);
    return [];
  }

  return (data as RetrievedDoc[]) || [];
}

async function keywordSearch(
  supabase: ReturnType<typeof createClient>,
  query: string,
  maxResults: number
): Promise<RetrievedDoc[]> {

  const stopwords = new Set(['cómo', 'cuál', 'cuánto', 'tiene', 'tienen', 'sobre', 'para', 'cuando', 'qué', 'que', 'los', 'las', 'del', 'con', 'una', 'uno']);
  const keywords = query
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stopwords.has(w))
    .slice(0, 4);

  if (keywords.length === 0) return [];

  const orFilter = keywords
    .map((k) => `title.ilike.%${k}%,content_chunk.ilike.%${k}%`)
    .join(',');

  const { data, error } = await supabase
    .from('loy_knowledge_documents')
    .select('id, title, content_chunk, source_url, source_name, category')
    .eq('status', 'approved')
    .or(orFilter)
    .limit(maxResults);

  if (error) {
    console.error('Error en búsqueda keyword:', error.message);
    return [];
  }

  return (data || []).map((d) => ({ ...d, similarity: 0.5 }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!;
    const openAiKey = Deno.env.get('OPENAI_API_KEY') || undefined;
    const llmConfig = resolveLLMConfig();

    const authHeader = req.headers.get('Authorization') || '';
    const token = getBearerToken(req);
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    const body = await req.json();
    const {
      query,
      conversation_id,
      category,
      similarity_threshold: userThreshold,
      max_results = 10,
    } = body;

    if (!query) {
      return new Response(JSON.stringify({ error: 'La consulta es requerida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const similarityThreshold = typeof userThreshold === 'number' ? userThreshold : 0.3;
    console.log(`LOY consulta: "${query}" | embedding: ${openAiKey ? 'semantic' : 'hash'} | llm: ${llmConfig.provider}`);

    let authUser: { id: string } | null = null;
    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) authUser = { id: user.id };
    }

    if (!authUser) {
      return new Response(
        JSON.stringify({ error: 'Debes iniciar sesión para usar el asistente.', code: 'AUTH_REQUIRED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    {
      const svc = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || supabaseKey
      );
      const { data: profileRow } = await svc
        .from('kv_store_7d36b31f')
        .select('value')
        .eq('key', `slc_user:${authUser.id}`)
        .maybeSingle();
      const profile = (profileRow?.value || {}) as Record<string, unknown>;
      const role = (profile.rol || profile.role) as string | undefined;
      const empresaId = (profile.empresaId || profile.empresa_id) as string | undefined;
      const isStaff = role === 'admin' || role === 'superadmin';

      if (!isStaff) {
        let allowed = false;

        if ((role === 'empresa' || role === 'usuario') && empresaId) {
          const { data: ent } = await svc
            .from('enterprises')
            .select('primer_mes_pagado, subscription_status')
            .eq('id', empresaId)
            .maybeSingle();
          allowed = !!(
            ent &&
            (ent.primer_mes_pagado === true || ent.subscription_status === 'active')
          );
        }
        if (!allowed) {
          return new Response(
            JSON.stringify({
              error:
                'El asistente LOY está disponible solo para empresas con un plan activo (primer mes pagado). Activa tu plan para usarlo.',
              code: 'PLAN_REQUIRED',
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    let currentConversationId = conversation_id || null;
    if (!currentConversationId && authUser) {
      const title = query.length > 70 ? `${query.slice(0, 67)}...` : query;
      const { data: conv, error: convErr } = await supabase
        .from('loy_conversations')
        .insert({ user_id: authUser.id, title: title || 'Nueva consulta' })
        .select('id')
        .single();
      if (convErr) console.error('Error creando conversación:', convErr.message);
      else currentConversationId = conv.id;
    }

    let docs: RetrievedDoc[] = [];
    let searchMethod = 'none';

    try {
      docs = await vectorSearch(supabase, query, openAiKey, {
        similarityThreshold,
        maxResults: max_results,
        category,
      });
      if (docs.length > 0) {
        searchMethod = openAiKey ? 'vector_semantic' : 'vector_hash';
        console.log(`🔍 Vectorial: ${docs.length} docs (threshold=${similarityThreshold})`);
      }
    } catch (e: unknown) {
      console.error('Búsqueda vectorial falló:', (e as Error).message);
    }

    if (docs.length === 0) {
      docs = await keywordSearch(supabase, query, max_results);
      if (docs.length > 0) {
        searchMethod = 'keyword_fallback';
        console.log(`🔍 Keywords: ${docs.length} docs`);
      }
    }

    console.log(`Total docs recuperados: ${docs.length} (método: ${searchMethod})`);

    docs = docs.slice(0, max_results);

    const noInfoContent = 'No tengo información suficiente en mi base de conocimientos para responder esa pregunta específica.\n\n**Disclaimer:** Esta respuesta es solo orientativa y no reemplaza la asesoría legal profesional.';

    if (docs.length === 0) {
      if (currentConversationId && authUser) {
        await supabase.from('loy_messages').insert([
          { conversation_id: currentConversationId, role: 'user', content: query },
          { conversation_id: currentConversationId, role: 'assistant', content: noInfoContent, sources_used: [], model_used: 'no-context', tokens_used: 0 },
        ]);
      }
      return new Response(
        JSON.stringify({ response: noInfoContent, sources: [], tokens_used: 0, retrieved_count: 0, conversation_id: currentConversationId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let content = '';
    let tokensUsed = 0;
    let modelUsed = 'fallback-local';

    try {
      if (llmConfig.provider !== 'local') {
        const { system, user: userPrompt } = buildLLMPrompt(query, docs);
        const result = await callLLM(llmConfig, system, userPrompt);
        content = result.content;
        tokensUsed = result.tokensUsed;
        modelUsed = llmConfig.model || llmConfig.provider;
      } else {
        console.warn('LOY sin LLM configurado, usando fallback local');
        content = buildFallbackResponse(query, docs);
        modelUsed = 'fallback-local';
      }
    } catch (generationError: unknown) {
      console.warn('LLM falló, cayendo a fallback local:', (generationError as Error).message);
      content = buildFallbackResponse(query, docs);
      modelUsed = 'fallback-local';
    }

    const sourceSeen = new Set<string>();
    const sources = docs
      .map((doc) => ({
        id: doc.id,
        title: doc.title,
        source_name: doc.source_name,
        source_url: doc.source_url,
        category: doc.category,
        similarity: doc.similarity,
      }))
      .filter((s) => {
        const key = (s.title || s.source_url || s.id).replace(/\s*\(?(parte\s*)?\d+\/\d+\)?\s*$/i, '').trim();
        if (sourceSeen.has(key)) return false;
        sourceSeen.add(key);
        return true;
      });

    if (currentConversationId && authUser) {
      await supabase.from('loy_messages').insert([
        { conversation_id: currentConversationId, role: 'user', content: query },
        {
          conversation_id: currentConversationId,
          role: 'assistant',
          content,
          sources_used: sources,
          model_used: modelUsed,
          tokens_used: tokensUsed,
        },
      ]);
      await supabase
        .from('loy_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentConversationId);
    }

    return new Response(
      JSON.stringify({
        response: content,
        sources,
        tokens_used: tokensUsed,
        retrieved_count: docs.length,
        model: modelUsed,
        search_method: searchMethod,
        conversation_id: currentConversationId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    console.error('Error en rag-query:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
