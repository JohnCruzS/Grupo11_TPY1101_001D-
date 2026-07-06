export interface SeoCheck {
  label: string;
  status: 'ok' | 'warn' | 'error';
  detail: string;
}

export interface SeoResult {
  score: number;
  checks: SeoCheck[];
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function keywordDensity(text: string, kw: string): number {
  if (!kw || !text) return 0;
  const normalized = text.toLowerCase();
  const kwLower = kw.toLowerCase();
  const matches = normalized.split(kwLower).length - 1;
  const words = wordCount(text);
  return words > 0 ? (matches / words) * 100 : 0;
}

function hasHeadings(contenido: string): { h2: boolean; h3: boolean } {
  return {
    h2: /^## .+/m.test(contenido),
    h3: /^### .+/m.test(contenido),
  };
}

function slugQuality(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

export function analyzeSeo(params: {
  titulo: string;
  descripcionSeo: string;
  contenido: string;
  slug: string;
  keywords: string[];
}): SeoResult {
  const { titulo, descripcionSeo, contenido, slug, keywords } = params;
  const checks: SeoCheck[] = [];
  let totalPoints = 0;
  let earnedPoints = 0;

  totalPoints += 15;
  const titleLen = titulo.length;
  if (titleLen >= 50 && titleLen <= 60) {
    earnedPoints += 15;
    checks.push({ label: 'Longitud del título', status: 'ok', detail: `${titleLen} caracteres (ideal: 50–60)` });
  } else if (titleLen >= 40 && titleLen <= 70) {
    earnedPoints += 10;
    checks.push({ label: 'Longitud del título', status: 'warn', detail: `${titleLen} caracteres (ideal: 50–60)` });
  } else if (titleLen === 0) {
    checks.push({ label: 'Longitud del título', status: 'error', detail: 'Sin título' });
  } else {
    earnedPoints += 5;
    checks.push({ label: 'Longitud del título', status: 'warn', detail: `${titleLen} caracteres — ${titleLen < 40 ? 'muy corto' : 'muy largo'} (ideal: 50–60)` });
  }

  totalPoints += 15;
  const descLen = descripcionSeo.length;
  if (descLen >= 150 && descLen <= 160) {
    earnedPoints += 15;
    checks.push({ label: 'Meta descripción', status: 'ok', detail: `${descLen} caracteres (ideal: 150–160)` });
  } else if (descLen >= 120 && descLen <= 175) {
    earnedPoints += 10;
    checks.push({ label: 'Meta descripción', status: 'warn', detail: `${descLen} caracteres (ideal: 150–160)` });
  } else if (descLen === 0) {
    checks.push({ label: 'Meta descripción', status: 'error', detail: 'Sin meta descripción' });
  } else {
    earnedPoints += 5;
    checks.push({ label: 'Meta descripción', status: 'warn', detail: `${descLen} caracteres — ${descLen < 120 ? 'muy corta' : 'muy larga'}` });
  }

  totalPoints += 15;
  const mainKw = keywords[0] ?? '';
  if (mainKw && titulo.toLowerCase().includes(mainKw.toLowerCase())) {
    earnedPoints += 15;
    checks.push({ label: 'Keyword en título', status: 'ok', detail: `"${mainKw}" aparece en el título` });
  } else if (!mainKw) {
    checks.push({ label: 'Keyword en título', status: 'warn', detail: 'Agrega al menos una keyword principal' });
  } else {
    checks.push({ label: 'Keyword en título', status: 'error', detail: `"${mainKw}" no aparece en el título` });
  }

  totalPoints += 10;
  if (mainKw && descripcionSeo.toLowerCase().includes(mainKw.toLowerCase())) {
    earnedPoints += 10;
    checks.push({ label: 'Keyword en meta descripción', status: 'ok', detail: `"${mainKw}" aparece en la descripción` });
  } else if (!mainKw) {
    checks.push({ label: 'Keyword en meta descripción', status: 'warn', detail: 'Define una keyword principal primero' });
  } else {
    earnedPoints += 3;
    checks.push({ label: 'Keyword en meta descripción', status: 'warn', detail: `"${mainKw}" no aparece en la descripción` });
  }

  totalPoints += 10;
  if (mainKw && contenido) {
    const density = keywordDensity(contenido, mainKw);
    if (density >= 1 && density <= 3) {
      earnedPoints += 10;
      checks.push({ label: 'Densidad de keyword', status: 'ok', detail: `${density.toFixed(1)}% (ideal: 1–3%)` });
    } else if (density > 3) {
      earnedPoints += 4;
      checks.push({ label: 'Densidad de keyword', status: 'warn', detail: `${density.toFixed(1)}% — keyword stuffing, reduce un poco` });
    } else {
      earnedPoints += 2;
      checks.push({ label: 'Densidad de keyword', status: 'warn', detail: `${density.toFixed(1)}% — muy baja, menciona más la keyword` });
    }
  } else {
    checks.push({ label: 'Densidad de keyword', status: 'warn', detail: 'Define keyword y contenido para analizar' });
  }

  totalPoints += 20;
  const words = wordCount(contenido);
  if (words >= 800) {
    earnedPoints += 20;
    checks.push({ label: 'Longitud del artículo', status: 'ok', detail: `${words} palabras (ideal: ≥800)` });
  } else if (words >= 400) {
    earnedPoints += 12;
    checks.push({ label: 'Longitud del artículo', status: 'warn', detail: `${words} palabras — intenta llegar a 800+` });
  } else if (words >= 150) {
    earnedPoints += 6;
    checks.push({ label: 'Longitud del artículo', status: 'warn', detail: `${words} palabras — contenido corto` });
  } else {
    checks.push({ label: 'Longitud del artículo', status: 'error', detail: `${words} palabras — muy corto para indexar bien` });
  }

  totalPoints += 10;
  const headings = hasHeadings(contenido);
  if (headings.h2 && headings.h3) {
    earnedPoints += 10;
    checks.push({ label: 'Estructura de encabezados', status: 'ok', detail: 'Tiene H2 (##) y H3 (###)' });
  } else if (headings.h2) {
    earnedPoints += 6;
    checks.push({ label: 'Estructura de encabezados', status: 'warn', detail: 'Tiene H2 (##) pero faltan H3 (###)' });
  } else {
    checks.push({ label: 'Estructura de encabezados', status: 'warn', detail: 'Agrega secciones con ## Título y ### Subtítulo' });
  }

  totalPoints += 5;
  if (slug && slugQuality(slug)) {
    earnedPoints += 5;
    checks.push({ label: 'URL / Slug', status: 'ok', detail: `/${slug}` });
  } else if (!slug) {
    checks.push({ label: 'URL / Slug', status: 'error', detail: 'Sin slug definido' });
  } else {
    earnedPoints += 2;
    checks.push({ label: 'URL / Slug', status: 'warn', detail: 'Usa solo minúsculas, números y guiones' });
  }

  totalPoints += 5;
  if (keywords.length >= 3) {
    earnedPoints += 5;
    checks.push({ label: 'Keywords secundarias', status: 'ok', detail: `${keywords.length} keywords definidas` });
  } else {
    earnedPoints += 2;
    checks.push({ label: 'Keywords secundarias', status: 'warn', detail: `${keywords.length} keyword(s) — agrega al menos 3` });
  }

  const score = Math.round((earnedPoints / totalPoints) * 100);
  return { score, checks };
}

export function scoreColor(score: number): string {
  if (score >= 80) return '#16a34a';
  if (score >= 55) return '#d97706';
  return '#dc2626';
}

export function scoreLabel(score: number): string {
  if (score >= 80) return 'Bueno';
  if (score >= 55) return 'Mejorable';
  return 'Bajo';
}
