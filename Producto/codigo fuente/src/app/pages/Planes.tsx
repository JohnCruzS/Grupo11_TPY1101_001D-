import { useEffect } from 'react';
import { ActionButtons } from '../components/ActionButtons';
import { setPageMeta } from '../utils/pageSeo';

import imgPlanAsesoria from '../../assets/services/plan-asesoria.webp';
import imgPlanGestionPyme from '../../assets/services/plan-gestion-pyme.webp';
import imgPlanRemuneraciones from '../../assets/services/plan-remuneraciones.webp';
import imgPlanRrhhIntegral from '../../assets/services/plan-rrhh-integral.webp';

const planes = [
  {
    id: 1,
    title: 'Plan Asesoría',
    image: imgPlanAsesoria,
    items: [
      'consultas laborales',
      'orientación despidos',
      'revisión de contratos',
      'dudas legales',
    ],
  },
  {
    id: 2,
    title: 'Plan Gestión PyME',
    image: imgPlanGestionPyme,
    items: [
      'elaboración de contratos',
      'anexos de contrato',
      'cartas laborales',
      'certificados',
      'cálculo de finiquitos',
    ],
  },
  {
    id: 3,
    title: 'Plan Remuneraciones',
    image: imgPlanRemuneraciones,
    items: [
      'liquidaciones de sueldo',
      'cálculo de cotizaciones',
      'libro de remuneraciones',
      'gestión previsional básica',
    ],
  },
  {
    id: 4,
    title: 'Plan RRHH Integral',
    image: imgPlanRrhhIntegral,
    items: [
      'control de vacaciones',
      'control y tramitación de licencias',
      'asesoría permanente',
      'gestión documental completa',
      'apoyo en inspecciones laborales',
    ],
  },
];

export default function Planes() {
  useEffect(() => {
    setPageMeta({
      title: 'Planes y Precios — SotLoy Conecta',
      description: 'Conoce nuestros planes de gestión laboral para Pymes chilenas. Asesoría, remuneraciones, auditoría y gestión documental con precios transparentes.',
      canonical: 'https://sotloyconecta.cl/planes',
    });
  }, []);

  return (
    <div style={{ backgroundColor: '#ffffff' }}>
      <section
        style={{
          padding: '48px 24px 36px',
          maxWidth: '1100px',
          margin: '0 auto',
        }}
      >
        <h1
          style={{
            fontFamily: "'Merriweather', serif",
            fontWeight: 700,
            fontSize: '1.6rem',
            color: '#1a1a2e',
            textAlign: 'center',
            marginBottom: '40px',
          }}
        >
          Planes adecuados a tus necesidades
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {planes.map((plan) => (
            <div
              key={plan.id}
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              <img
                src={plan.image}
                alt={plan.title}
                style={{
                  width: '100%',
                  height: '130px',
                  objectFit: 'cover',
                  marginBottom: '12px',
                }}
              />
              <p
                style={{
                  fontFamily: "'Merriweather', serif",
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: '#1a1a2e',
                  textAlign: 'center',
                  marginBottom: '12px',
                }}
              >
                {plan.title}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {plan.items.map((item, idx) => (
                  <li
                    key={idx}
                    style={{
                      fontFamily: "'Merriweather', serif",
                      fontSize: '0.78rem',
                      color: '#4a4a5a',
                      lineHeight: 1.7,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '6px',
                      marginBottom: '2px',
                    }}
                  >
                    <span
                      style={{
                        marginTop: '6px',
                        fontSize: '0.35rem',
                        color: '#888',
                      }}
                    >
                      ●
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div style={{ padding: '16px 24px 32px' }}>
        <ActionButtons />
      </div>

      <section
        style={{
          padding: '24px 24px 48px',
          maxWidth: '680px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontFamily: "'Merriweather', serif",
            fontWeight: 600,
            fontSize: '1rem',
            color: '#1a1a2e',
            marginBottom: '12px',
          }}
        >
          ¿Necesitas orientación, realizar cotización o consultas?
        </h2>
        <p
          style={{
            fontFamily: "'Merriweather', serif",
            fontSize: '0.82rem',
            color: '#4a4a5a',
            lineHeight: 1.7,
          }}
        >
          Contáctanos a través de nuestros canales y te responderemos a la
          brevedad para orientarte según las necesidades de tu empresa.
        </p>
      </section>
    </div>
  );
}
