import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, ArrowRight, Clock } from 'lucide-react';
import { ARTICLES_KEY, readSetting, type Article, type ArticlesData } from '../utils/siteSettings';
import { setPageMeta } from '../utils/pageSeo';

function readingTime(text: string): number {
  return Math.max(1, Math.round(text.trim().split(/\s+/).filter(Boolean).length / 200));
}

function ArticleCard({ a, featured = false }: { a: Article; featured?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const mins = readingTime(a.contenido);
  const date = new Date(a.creadoEn).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

  if (featured) {
    return (
      <Link to={`/blog/${a.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
        <article
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            borderRadius: '16px',
            overflow: 'hidden',
            background: 'white',
            border: '1px solid #e5e7eb',
            display: 'grid',
            gridTemplateColumns: a.imagenPortada ? '1fr 1fr' : '1fr',
            minHeight: '320px',
            boxShadow: hovered ? '0 8px 32px rgba(17,24,39,0.12)' : '0 1px 4px rgba(17,24,39,0.06)',
            transform: hovered ? 'translateY(-2px)' : 'none',
            transition: 'box-shadow 0.25s, transform 0.25s',
          }}
        >
          {a.imagenPortada && (
            <div style={{ overflow: 'hidden', position: 'relative' }}>
              <img
                src={a.imagenPortada}
                alt={a.titulo}
                style={{
                  width: '100%', height: '100%', objectFit: 'cover', minHeight: '240px',
                  transform: hovered ? 'scale(1.03)' : 'scale(1)',
                  transition: 'transform 0.4s ease',
                }}
              />
              <div style={{ position: 'absolute', top: '14px', left: '14px', background: '#091f34', color: 'white', padding: '4px 10px', borderRadius: '6px', fontFamily: "'Inter',sans-serif", fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em' }}>
                DESTACADO
              </div>
            </div>
          )}
          <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                {a.keywords.slice(0, 2).map(kw => (
                  <span key={kw} style={{ padding: '3px 10px', background: '#eff6ff', borderRadius: '99px', fontFamily: "'Inter',sans-serif", fontSize: '0.7rem', fontWeight: 600, color: '#1d4ed8' }}>
                    {kw}
                  </span>
                ))}
              </div>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: '0 0 12px', lineHeight: 1.3 }}>
                {a.titulo}
              </h2>
              {a.descripcionSeo && (
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.65, margin: '0 0 20px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {a.descripcionSeo}
                </p>
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: "'Inter',sans-serif", fontSize: '0.75rem', color: '#9ca3af' }}>
                  <User size={12} /> {a.autor}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: "'Inter',sans-serif", fontSize: '0.75rem', color: '#9ca3af' }}>
                  <Calendar size={12} /> {date}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: "'Inter',sans-serif", fontSize: '0.75rem', color: '#9ca3af' }}>
                  <Clock size={12} /> {mins} min de lectura
                </span>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: "'Inter',sans-serif", fontSize: '0.82rem', fontWeight: 600, color: '#1d4ed8' }}>
                Leer artículo <ArrowRight size={14} />
              </span>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link to={`/blog/${a.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <article
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderRadius: '14px',
          overflow: 'hidden',
          background: 'white',
          border: '1px solid #e5e7eb',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: hovered ? '0 6px 24px rgba(17,24,39,0.10)' : '0 1px 4px rgba(17,24,39,0.05)',
          transform: hovered ? 'translateY(-2px)' : 'none',
          transition: 'box-shadow 0.25s, transform 0.25s',
        }}
      >
        {a.imagenPortada ? (
          <div style={{ overflow: 'hidden', height: '180px', flexShrink: 0 }}>
            <img
              src={a.imagenPortada}
              alt={a.titulo}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                transform: hovered ? 'scale(1.04)' : 'scale(1)',
                transition: 'transform 0.4s ease',
              }}
            />
          </div>
        ) : (
          <div style={{ height: '8px', background: 'linear-gradient(90deg,#1d4ed8,#3b82f6)', flexShrink: 0 }} />
        )}
        <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {a.keywords.length > 0 && (
            <span style={{ display: 'inline-block', padding: '2px 8px', background: '#eff6ff', borderRadius: '99px', fontFamily: "'Inter',sans-serif", fontSize: '0.68rem', fontWeight: 600, color: '#1d4ed8', marginBottom: '10px', alignSelf: 'flex-start' }}>
              {a.keywords[0]}
            </span>
          )}
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.05rem', fontWeight: 700, color: '#111827', margin: '0 0 8px', lineHeight: 1.35, flex: 1 }}>
            {a.titulo}
          </h2>
          {a.descripcionSeo && (
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.6, margin: '0 0 14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {a.descripcionSeo}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "'Inter',sans-serif", fontSize: '0.72rem', color: '#9ca3af' }}>
                <Calendar size={11} /> {date}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "'Inter',sans-serif", fontSize: '0.72rem', color: '#9ca3af' }}>
                <Clock size={11} /> {mins} min
              </span>
            </div>
            <ArrowRight size={14} color="#1d4ed8" />
          </div>
        </div>
      </article>
    </Link>
  );
}

export default function Blog() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageMeta({
      title: 'Blog — SotLoy Conecta',
      description: 'Artículos y guías sobre gestión laboral, recursos humanos y normativa chilena para Pymes.',
      canonical: 'https://sotloyconecta.cl/blog',
    });
    readSetting<ArticlesData>(ARTICLES_KEY).then((data) => {
      const published = (data?.articles ?? []).filter((a) => a.publicado);
      published.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
      setArticles(published);
      setLoading(false);
    });
  }, []);

  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '80vh' }}>
      <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '40px 24px 64px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', padding: '64px 0', color: '#9ca3af', fontFamily: "'Inter',sans-serif", fontSize: '0.9rem' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid #e5e7eb', borderTopColor: '#1d4ed8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Cargando artículos…
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : articles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
            <div style={{ width: '64px', height: '64px', background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span style={{ fontSize: '1.8rem' }}>✍️</span>
            </div>
            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', fontWeight: 700, color: '#374151', margin: '0 0 6px' }}>
              Próximamente
            </p>
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.85rem', color: '#9ca3af', margin: 0 }}>
              Estamos preparando contenido de valor para tu empresa.
            </p>
          </div>
        ) : (
          <>

            {featured && (
              <div style={{ marginBottom: '32px' }}>
                <ArticleCard a={featured} featured />
              </div>
            )}

            {rest.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
                    Más artículos
                  </p>
                  <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%,300px),1fr))', gap: '20px' }}>
                  {rest.map((a) => (
                    <ArticleCard key={a.id} a={a} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
