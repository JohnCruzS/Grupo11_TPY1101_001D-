import { useEffect, useState, useRef } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Calendar, User, ArrowLeft, Tag, Clock, ChevronRight } from 'lucide-react';
import { ARTICLES_KEY, readSetting, type Article, type ArticlesData } from '../utils/siteSettings';

function readingTime(text: string): number {
  return Math.max(1, Math.round(text.trim().split(/\s+/).filter(Boolean).length / 200));
}

interface TocItem { id: string; text: string; level: 2 | 3 }

function extractToc(content: string): TocItem[] {
  const items: TocItem[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    if (h2) items.push({ id: slugify(h2[1]), text: h2[1], level: 2 });
    else if (h3) items.push({ id: slugify(h3[1]), text: h3[1], level: 3 });
  }
  return items;
}

function slugify(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function renderContent(text: string): string {
  return text
    .replace(/^### (.+)$/gm, (_, t) => `<h3 id="${slugify(t)}" style="font-family:'Playfair Display',serif;font-size:1.15rem;font-weight:700;color:#1e293b;margin:28px 0 10px;scroll-margin-top:80px">${t}</h3>`)
    .replace(/^## (.+)$/gm, (_, t) => `<h2 id="${slugify(t)}" style="font-family:'Playfair Display',serif;font-size:1.4rem;font-weight:700;color:#0f172a;margin:40px 0 12px;scroll-margin-top:80px">${t}</h2>`)
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#0f172a;font-weight:700">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.88em;color:#1d4ed8">$1</code>')
    .split('\n\n')
    .map(block => {
      if (block.startsWith('<h') || block.startsWith('<ul') || block.startsWith('<ol')) return block;
      return `<p style="font-family:'Georgia',serif;font-size:1.05rem;color:#374151;line-height:1.85;margin:0 0 20px">${block.replace(/\n/g, ' ')}</p>`;
    })
    .join('\n');
}

function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      setProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
    };
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '3px', zIndex: 100, background: '#e5e7eb' }}>
      <div style={{ height: '100%', background: 'linear-gradient(90deg,#1d4ed8,#38bdf8)', width: `${progress}%`, transition: 'width 0.1s linear' }} />
    </div>
  );
}

export default function BlogArticle() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null | 'loading'>('loading');
  const [activeId, setActiveId] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    readSetting<ArticlesData>(ARTICLES_KEY).then((data) => {
      const found = (data?.articles ?? []).find((a) => a.slug === slug && a.publicado);
      setArticle(found ?? null);

      if (found) {
        document.title = `${found.titulo} | SotLoy Conecta`;
        const upsert = (key: string, val: string, attr = 'name') => {
          let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
          if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
          el.setAttribute('content', val);
        };
        upsert('description', found.descripcionSeo);
        upsert('keywords', found.keywords.join(', '));
        upsert('og:title', found.titulo, 'property');
        upsert('og:description', found.descripcionSeo, 'property');
        if (found.imagenPortada) upsert('og:image', found.imagenPortada, 'property');

        const existing = document.getElementById('article-jsonld');
        if (existing) existing.remove();
        const script = document.createElement('script');
        script.id = 'article-jsonld';
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify({
          '@context': 'https://schema.org', '@type': 'Article',
          headline: found.titulo, description: found.descripcionSeo,
          author: { '@type': 'Person', name: found.autor },
          datePublished: found.creadoEn, dateModified: found.actualizadoEn,
          image: found.imagenPortada,
          publisher: { '@type': 'Organization', name: 'SotLoy Conecta' },
          keywords: found.keywords.join(', '),
        });
        document.head.appendChild(script);
      }
    });
    return () => { document.getElementById('article-jsonld')?.remove(); };
  }, [slug]);

  useEffect(() => {
    if (!article || article === 'loading') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveId(e.target.id);
        }
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );
    const headings = contentRef.current?.querySelectorAll('h2[id], h3[id]') ?? [];
    headings.forEach(h => observer.observe(h));
    return () => observer.disconnect();
  }, [article]);

  if (article === 'loading') {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid #e5e7eb', borderTopColor: '#1d4ed8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!article) return <Navigate to="/blog" replace />;

  const toc = extractToc(article.contenido);
  const mins = readingTime(article.contenido);
  const date = new Date(article.creadoEn).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '80vh' }}>
      <ReadingProgress />

      {article.imagenPortada ? (
        <div style={{ position: 'relative', height: '380px', overflow: 'hidden' }}>
          <img src={article.imagenPortada} alt={article.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(9,31,52,0.92) 40%, rgba(9,31,52,0.35) 100%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '36px 32px', maxWidth: '860px', margin: '0 auto' }}>
            <Link to="/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: "'Inter',sans-serif", fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', marginBottom: '14px' }}>
              <ArrowLeft size={13} /> Blog
            </Link>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {article.keywords.slice(0, 2).map(kw => (
                <span key={kw} style={{ padding: '3px 10px', background: 'rgba(56,189,248,0.2)', border: '1px solid rgba(56,189,248,0.4)', borderRadius: '99px', fontFamily: "'Inter',sans-serif", fontSize: '0.7rem', fontWeight: 600, color: '#38bdf8' }}>
                  {kw}
                </span>
              ))}
            </div>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 700, color: 'white', margin: '0 0 12px', lineHeight: 1.2 }}>
              {article.titulo}
            </h1>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: "'Inter',sans-serif", fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)' }}>
                <User size={12} /> {article.autor}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: "'Inter',sans-serif", fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)' }}>
                <Calendar size={12} /> {date}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: "'Inter',sans-serif", fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)' }}>
                <Clock size={12} /> {mins} min de lectura
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: '#091f34', padding: '48px 24px 40px' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <Link to="/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: "'Inter',sans-serif", fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', marginBottom: '16px' }}>
              <ArrowLeft size={13} /> Blog
            </Link>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {article.keywords.slice(0, 2).map(kw => (
                <span key={kw} style={{ padding: '3px 10px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '99px', fontFamily: "'Inter',sans-serif", fontSize: '0.7rem', fontWeight: 600, color: '#38bdf8' }}>
                  {kw}
                </span>
              ))}
            </div>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(1.5rem,3vw,2.2rem)', fontWeight: 700, color: 'white', margin: '0 0 14px', lineHeight: 1.2 }}>
              {article.titulo}
            </h1>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: "'Inter',sans-serif", fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)' }}>
                <User size={12} /> {article.autor}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: "'Inter',sans-serif", fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)' }}>
                <Calendar size={12} /> {date}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: "'Inter',sans-serif", fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)' }}>
                <Clock size={12} /> {mins} min de lectura
              </span>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '40px 24px 72px', display: 'grid', gridTemplateColumns: toc.length > 1 ? '1fr 240px' : '1fr', gap: '40px', alignItems: 'start' }}>

        <div>

          {article.descripcionSeo && (
            <div style={{ background: '#eff6ff', borderLeft: '4px solid #1d4ed8', borderRadius: '0 10px 10px 0', padding: '16px 20px', marginBottom: '28px' }}>
              <p style={{ fontFamily: "'Georgia',serif", fontSize: '1.05rem', color: '#1e3a8a', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
                {article.descripcionSeo}
              </p>
            </div>
          )}

          <div ref={contentRef} dangerouslySetInnerHTML={{ __html: renderContent(article.contenido) }} />

          {article.keywords.length > 0 && (
            <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <Tag size={14} color="#9ca3af" />
                {article.keywords.map((kw) => (
                  <span key={kw} style={{ padding: '4px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '99px', fontFamily: "'Inter',sans-serif", fontSize: '0.75rem', color: '#475569' }}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: '40px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#091f34', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: "'Inter',sans-serif", fontSize: '1rem', fontWeight: 700, color: 'white' }}>
                {article.autor.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.85rem', fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>
                {article.autor}
              </p>
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.78rem', color: '#6b7280', margin: 0 }}>
                Equipo SotLoy Conecta · {date}
              </p>
            </div>
            <Link to="/blog" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: "'Inter',sans-serif", fontSize: '0.78rem', fontWeight: 600, color: '#1d4ed8', textDecoration: 'none', flexShrink: 0 }}>
              Ver más artículos <ChevronRight size={13} />
            </Link>
          </div>
        </div>

        {toc.length > 1 && (
          <div style={{ position: 'sticky', top: '80px' }}>
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '18px 20px' }}>
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.72rem', fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>
                Contenido
              </p>
              <nav>
                {toc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    style={{
                      display: 'block',
                      padding: item.level === 3 ? '4px 0 4px 12px' : '5px 0',
                      fontFamily: "'Inter',sans-serif",
                      fontSize: item.level === 3 ? '0.75rem' : '0.8rem',
                      fontWeight: item.level === 2 ? 600 : 400,
                      color: activeId === item.id ? '#1d4ed8' : '#4b5563',
                      textDecoration: 'none',
                      borderLeft: item.level === 3 ? `2px solid ${activeId === item.id ? '#1d4ed8' : '#e5e7eb'}` : 'none',
                      lineHeight: 1.4,
                      transition: 'color 0.15s',
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {item.text}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
