import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LandingCarousel } from '../components/LandingCarousel';
import { setPageMeta } from '../utils/pageSeo';
import { ActionButtons } from '../components/ActionButtons';
import { imagePlaceholder } from '../utils/placeholder';

import imgGestionDocumental from '../../assets/services/gestion-documental.webp';
import imgGestionRemuneraciones from '../../assets/services/gestion-remuneraciones.webp';
import imgAuditorias from '../../assets/services/auditorias.webp';
import imgAsesoriaCompleta from '../../assets/services/asesoria-completa.webp';
import imgReglamentosLaborales from '../../assets/services/reglamentos-laborales.webp';
import imgSoporteFiscalizaciones from '../../assets/services/soporte-fiscalizaciones.webp';
import imgExperienciaLaboral from '../../assets/services/experiencia-laboral.webp';
import imgEnfoquePrevencion from '../../assets/services/enfoque-prevencion.webp';
import imgAsesoriaPersonalizada from '../../assets/services/asesoria-personalizada.webp';

const services = [
  {
    id: 1,
    title: 'Gestión documental',
    description:
      'Externaliza RR.HH y enfócate en hacer crecer tu negocio. Nos encargamos de Contratos, Anexos, Finiquitos y toda la documentación necesaria para la correcta administración de tu personal.',
    image: imgGestionDocumental,
  },
  {
    id: 2,
    title: 'Gestión de Remuneraciones',
    description:
      'Administramos el proceso de remuneraciones, incluyendo cálculo de sueldo, cotizaciones previsionales y obligaciones laborales.',
    image: imgGestionRemuneraciones,
  },
  {
    id: 3,
    title: 'Auditorías',
    description:
      'Es importante en qué situación está tu PyME. Ofrecemos Auditoría inicial en base a tus requerimientos.',
    image: imgAuditorias,
  },
  {
    id: 4,
    title: 'Asesoría completa',
    description:
      'Brindamos asesoría permanente en Gestión de Recursos Humanos, resolviendo tus consultas y ayudando en la toma de decisiones.',
    image: imgAsesoriaCompleta,
  },
  {
    id: 5,
    title: 'Reglamentos Laborales',
    description:
      'Elaboramos y actualizamos Reglamentos Internos y documentación exigida por normativa, incluyendo políticas y protocolos.',
    image: imgReglamentosLaborales,
  },
  {
    id: 6,
    title: 'Soporte en Fiscalizaciones',
    description:
      'Apoyamos a tu empresa ante fiscalizaciones de la Inspección del Trabajo. Además, fortalecemos los procesos internos para evitar observaciones o sanciones.',
    image: imgSoporteFiscalizaciones,
  },
];

const whyUs = [
  {
    id: 1,
    title: 'Experiencia en Gestión Laboral',
    description: 'Mas de 10 años de experiencia en el rubro.',
    image: imgExperienciaLaboral,
  },
  {
    id: 2,
    title: 'Enfoque en prevención',
    description: 'Nos anticipamos a contingencias laborales.',
    image: imgEnfoquePrevencion,
  },
  {
    id: 3,
    title: 'Asesoría personalizada',
    description:
      'Cada empresa tiene diferentes realidades, es por eso que nos orientamos en sus necesidades.',
    image: imgAsesoriaPersonalizada,
  },
];

const sectionTitle: React.CSSProperties = {
  fontFamily: "'Merriweather', serif",
  fontWeight: 600,
  fontSize: '1.6rem',
  color: '#1a1a2e',
  textAlign: 'center',
};

const bodyText: React.CSSProperties = {
  fontFamily: "'Merriweather', serif",
  fontSize: '1rem',
  color: '#4a4a5a',
  lineHeight: 1.7,
};

export default function Home() {
  useEffect(() => {
    setPageMeta({
      title: 'SotLoy Conecta — Gestión laboral y RRHH para Pymes en Chile',
      description: 'Plataforma digital de gestión laboral para Pymes chilenas. Contratos, liquidaciones, asesoría legal, auditorías y asistente IA. Simplifica tus RRHH hoy.',
      canonical: 'https://sotloyconecta.cl/',
    });
  }, []);

  return (
    <div style={{ backgroundColor: '#ffffff' }}>

      <LandingCarousel />

      <section
        style={{
          padding: '64px 24px 44px',
          maxWidth: '860px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontFamily: "'Merriweather', serif",
            fontWeight: 700,
            fontSize: '2.2rem',
            lineHeight: 1.25,
            color: '#1a1a2e',
            marginBottom: '20px',
          }}
        >
          Gestión laboral eficiente para tu empresa
        </h1>
        <p
          style={{
            ...bodyText,
            fontSize: '1.1rem',
            fontStyle: 'italic',
            marginBottom: '36px',
          }}
        >
          En SotLoy Asesorías brindamos apoyo especializado a empresas en la
          gestión de sus procesos laborales, ayudando a mantener la
          documentación en regla, prevenir contingencias y asegurar el correcto
          cumplimiento de la legislación laboral.
        </p>
        <ActionButtons />
      </section>

      <section
        style={{
          padding: '32px 24px 44px',
          maxWidth: '1080px',
          margin: '0 auto',
        }}
      >
        <h2 style={{ ...sectionTitle, marginBottom: '40px' }}>
          Servicios disponibles
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))',
            gap: '36px',
          }}
        >
          {services.map((service) => (
            <div
              key={service.id}
              style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}
            >
              <img
                src={service.image}
                alt={service.title}
                style={{
                  width: '210px',
                  height: '150px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  flexShrink: 0,
                }}
              />
              <div>
                <p
                  style={{
                    fontFamily: "'Merriweather', serif",
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    color: '#1a1a2e',
                    marginBottom: '10px',
                  }}
                >
                  {service.title}
                </p>
                <p style={bodyText}>{service.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <Link
            to="/servicios"
            style={{
              fontFamily: "'Merriweather', serif",
              fontSize: '1rem',
              color: '#1a1a2e',
              textDecoration: 'underline',
            }}
          >
            Ver todos los servicios disponibles
          </Link>
        </div>
      </section>

      <section
        style={{
          padding: '32px 24px 44px',
          maxWidth: '1080px',
          margin: '0 auto',
        }}
      >
        <h2 style={{ ...sectionTitle, marginBottom: '40px' }}>
          ¿Por qué trabajar con SotLoy Asesorías?
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: '36px',
          }}
        >
          {whyUs.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <img
                src={item.image}
                alt={item.title}
                style={{
                  width: '100%',
                  height: '210px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}
              />
              <p
                style={{
                  fontFamily: "'Merriweather', serif",
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  color: '#091f34',
                  marginBottom: '10px',
                }}
              >
                {item.title}
              </p>
              <p style={bodyText}>{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          padding: '24px 24px 48px',
          maxWidth: '700px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <h2 style={{ ...sectionTitle, marginBottom: '28px' }}>Contacto</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
            gap: '24px',
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "'Merriweather', serif",
                fontWeight: 500,
                fontSize: '0.85rem',
                color: '#1a1a2e',
                marginBottom: '6px',
              }}
            >
              Mail
            </p>
            <p style={bodyText}>contacto@sotloyasesorias.cl</p>
          </div>
          <div>
            <p
              style={{
                fontFamily: "'Merriweather', serif",
                fontWeight: 500,
                fontSize: '0.85rem',
                color: '#1a1a2e',
                marginBottom: '6px',
              }}
            >
              WhatsApp
            </p>
            <a
              href="https://wa.me/56988362521"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...bodyText,
                color: '#091f34',
                textDecoration: 'underline',
              }}
            >
              +56 9 8836 2521
            </a>
          </div>
          <div>
            <p
              style={{
                fontFamily: "'Merriweather', serif",
                fontWeight: 500,
                fontSize: '0.85rem',
                color: '#1a1a2e',
                marginBottom: '6px',
              }}
            >
              Instagram
            </p>
            <p style={bodyText}>@sotloyasesorias</p>
          </div>
        </div>
      </section>
    </div>
  );
}
