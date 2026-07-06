import { useEffect, useState } from 'react';
import {
  LANDING_HERO_KEY,
  readSetting,
  type LandingHero,
} from '../utils/siteSettings';

export function LandingHeroBanner() {
  const [data, setData] = useState<LandingHero | null>(null);

  useEffect(() => {
    readSetting<LandingHero>(LANDING_HERO_KEY).then(setData);
  }, []);

  if (!data || !data.enabled || !data.titulo?.trim()) return null;

  const ctaLabel = data.ctaLabel?.trim();
  const ctaUrl = data.ctaUrl?.trim();
  const isExternal = ctaUrl ? /^https?:\/\//i.test(ctaUrl) : false;

  return (
    <section
      style={{
        background: 'linear-gradient(135deg, #091f34 0%, #13355a 100%)',
        padding: '56px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        <h2
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 700,
            fontSize: '2rem',
            lineHeight: 1.25,
            color: 'white',
            marginBottom: '16px',
          }}
        >
          {data.titulo}
        </h2>
        {data.texto?.trim() && (
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '1.08rem',
              color: 'rgba(255,255,255,0.88)',
              lineHeight: 1.7,
              marginBottom: ctaLabel && ctaUrl ? '28px' : 0,
              whiteSpace: 'pre-wrap',
            }}
          >
            {data.texto}
          </p>
        )}
        {ctaLabel && ctaUrl && (
          <a
            href={ctaUrl}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            style={{
              display: 'inline-block',
              backgroundColor: '#38bdf8',
              color: '#091f34',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.95rem',
              fontWeight: 700,
              padding: '12px 28px',
              borderRadius: '6px',
              textDecoration: 'none',
              boxShadow: '0 2px 12px rgba(56,189,248,0.35)',
            }}
          >
            {ctaLabel}
          </a>
        )}
      </div>
    </section>
  );
}
