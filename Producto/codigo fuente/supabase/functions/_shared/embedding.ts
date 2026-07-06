

export async function createEmbedding(text: string, apiKey?: string): Promise<number[]> {
  if (apiKey) {
    return createOpenAIEmbedding(text, apiKey);
  }
  return createHashEmbedding(text);
}

async function createOpenAIEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
  return json.data[0].embedding as number[];
}

function createHashEmbedding(text: string): number[] {
  const dims = 1536;
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash = hash & hash;
  }
  const seed = Math.abs(hash) + 1;
  const embedding = Array.from({ length: dims }, (_, i) => {
    const x = Math.sin(seed * (i + 1) * 0.1) * 10000;
    return (x - Math.floor(x)) * 2 - 1;
  });
  const magnitude = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
  return embedding.map((v) => v / (magnitude || 1));
}
