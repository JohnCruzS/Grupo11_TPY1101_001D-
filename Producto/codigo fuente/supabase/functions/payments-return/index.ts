

import { corsHeaders } from '../_shared/cors.ts';

function buildTarget(url: URL): string {
  const paymentId = url.searchParams.get('payment_id') || '';

  const redirect = url.searchParams.get('redirect') || '';

  if (redirect) {
    const sep = redirect.includes('?') ? '&' : '?';
    return paymentId ? `${redirect}${sep}payment_id=${encodeURIComponent(paymentId)}` : redirect;
  }

  const siteUrl = (
    Deno.env.get('PUBLIC_SITE_URL') ||
    Deno.env.get('SITE_URL') ||
    Deno.env.get('APP_URL') ||
    'https://pokeforge.cl'
  ).replace(/\/+$/, '');
  const base = `${siteUrl}/conecta/pago-resultado`;
  return paymentId ? `${base}?payment_id=${encodeURIComponent(paymentId)}` : base;
}

Deno.serve((req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const target = buildTarget(url);

  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      Location: target,
      'Cache-Control': 'no-store',
    },
  });
});
