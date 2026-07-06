import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  LANDING_CAROUSEL_KEY,
  CAROUSEL_IMG_WIDTH,
  CAROUSEL_IMG_HEIGHT,
  readSetting,
  type LandingCarousel as LandingCarouselData,
} from '../utils/siteSettings';

export function LandingCarousel() {
  const [data, setData] = useState<LandingCarouselData | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    readSetting<LandingCarouselData>(LANDING_CAROUSEL_KEY).then(setData);
  }, []);

  const images = (data?.images || []).filter((i) => i.url?.trim());
  const count = images.length;

  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearInterval(id);
  }, [count]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  if (!data || !data.enabled || count === 0) return null;

  const go = (dir: number) => setIndex((i) => (i + dir + count) % count);

  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${CAROUSEL_IMG_WIDTH} / ${CAROUSEL_IMG_HEIGHT}`,
        overflow: 'hidden',
        backgroundColor: '#091f34',
      }}
      aria-label="Carrusel de portada"
    >
      {images.map((img, i) => {
        const isExternal = img.link ? /^https?:\/\//i.test(img.link) : false;
        const slide = (
          <img
            src={img.url}
            alt={img.alt || `Imagen ${i + 1}`}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: i === index ? 1 : 0,
              transition: 'opacity 0.6s ease-in-out',
            }}
          />
        );
        if (!img.link) return <div key={i}>{slide}</div>;
        return (
          <a
            key={i}
            href={img.link}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: i === index ? 'auto' : 'none',
            }}
          >
            {slide}
          </a>
        );
      })}

      {count > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            aria-label="Anterior"
            style={arrowStyle('left')}
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Siguiente"
            style={arrowStyle('right')}
          >
            <ChevronRight size={22} />
          </button>

          <div
            style={{
              position: 'absolute',
              bottom: '14px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '8px',
              zIndex: 2,
            }}
          >
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Ir a la imagen ${i + 1}`}
                style={{
                  width: i === index ? '22px' : '8px',
                  height: '8px',
                  borderRadius: '999px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'width 0.3s, background-color 0.3s',
                  backgroundColor:
                    i === index ? '#ffffff' : 'rgba(255,255,255,0.5)',
                }}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function arrowStyle(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute',
    top: '50%',
    [side]: '14px',
    transform: 'translateY(-50%)',
    width: '40px',
    height: '40px',
    borderRadius: '999px',
    border: 'none',
    backgroundColor: 'rgba(9,31,52,0.45)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 2,
  };
}
