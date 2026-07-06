interface PageMeta {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
}

const BASE_URL = 'https://sotloyconecta.cl';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-default.png`;

export function setPageMeta({ title, description, canonical, ogImage }: PageMeta) {
  document.title = title;

  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', 'index, follow');

  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:site_name', 'SotLoy Conecta');
  upsertMeta('property', 'og:image', ogImage ?? DEFAULT_OG_IMAGE);
  if (canonical) upsertMeta('property', 'og:url', canonical);

  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', ogImage ?? DEFAULT_OG_IMAGE);

  if (canonical) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = canonical;
  }
}

function upsertMeta(attrKey: string, attrVal: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attrKey}="${attrVal}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrKey, attrVal);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}
