import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { ActionButtons } from '../components/ActionButtons';
import { setPageMeta } from '../utils/pageSeo';

const servicios = [
  {
    id: 1,
    title: 'Gestión documental laboral',
    items: [
      'Elaboración de contratos de trabajo.',
      'Redacción y actualización de anexos de contrato.',
      'Elaboración y cálculo de finiquitos.',
      'Preparación de documentación laboral exigida por la legislación vigente.',
    ],
    defaultOpen: true,
  },
  {
    id: 2,
    title: 'Gestión de remuneraciones',
    items: [
      'Cálculo de Remuneraciones',
      'Elaboración de liquidaciones de sueldo',
      'Cálculo de horas extraordinarias, descuentos y haberes.',
      'Apoyo en el cumplimiento de obligaciones previsionales.',
      'Revisión y control de procesos de remuneraciones.',
    ],
    defaultOpen: true,
  },
  {
    id: 3,
    title: 'Proceso de desvinculación laboral',
    items: [
      'Asesoría en procesos de término de contratos.',
      'Elaboración de cartas de despido.',
      'Cálculo de indemnizaciones legales.',
      'Elaboración de finiquitos.',
      'Apoyo en desvinculaciones complejas.',
    ],
    defaultOpen: true,
  },
  {
    id: 4,
    title: 'Auditoría y revisión laboral',
    items: [
      'Revisión del estado de la documentación laboral de la empresa.',
      'Identificación de brechas en el cumplimiento normativo.',
      'Informe con recomendaciones y plan de acción.',
      'Acompañamiento en la implementación de mejoras.',
    ],
    defaultOpen: true,
  },
  {
    id: 5,
    title: 'Apoyo en fiscalizaciones',
    items: [
      'Preparación de documentación ante fiscalizaciones de la Inspección del Trabajo.',
      'Revisión de antecedentes laborales requeridos por la autoridad.',
      'Apoyo en la respuesta a observaciones o requerimientos.',
      'Representación en conciliaciones.',
    ],
    defaultOpen: true,
  },
  {
    id: 6,
    title: 'Asesoría laboral para PyMEs',
    items: [
      'Asesoría permanente en gestión laboral.',
      'Orientación en administración de personal.',
      'Resolución de consultas laborales.',
      'Apoyo en la toma de decisiones relacionadas a la gestión de personas.',
    ],
    defaultOpen: true,
  },
];

function AccordionItem({
  title,
  items,
  defaultOpen,
}: {
  title: string;
  items: string[];
  defaultOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={{ borderBottom: '1px solid #e0e0e8' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            fontFamily: "'Merriweather', serif",
            fontWeight: 600,
            fontSize: '1.1rem',
            color: '#1a1a2e',
          }}
        >
          {title}
        </span>
        {isOpen ? (
          <ChevronUp size={18} color="#666" style={{ flexShrink: 0 }} />
        ) : (
          <ChevronDown size={18} color="#666" style={{ flexShrink: 0 }} />
        )}
      </button>
      {isOpen && (
        <ul
          style={{
            paddingBottom: '20px',
            paddingLeft: '0',
            listStyle: 'none',
            margin: 0,
          }}
        >
          {items.map((item, idx) => (
            <li
              key={idx}
              style={{
                fontFamily: "'Merriweather', serif",
                fontSize: '0.95rem',
                color: '#4a4a5a',
                lineHeight: 1.7,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                marginBottom: '4px',
              }}
            >
              <span
                style={{ marginTop: '6px', fontSize: '0.4rem', color: '#888' }}
              >
                ●
              </span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Servicios() {
  useEffect(() => {
    setPageMeta({
      title: 'Servicios — SotLoy Conecta',
      description: 'Gestión documental, remuneraciones, auditorías laborales, reglamentos internos y soporte en fiscalizaciones de la DT. Todo para tu Pyme en Chile.',
      canonical: 'https://sotloyconecta.cl/servicios',
    });
  }, []);

  return (
    <div style={{ backgroundColor: '#ffffff' }}>
      <section
        style={{
          padding: '56px 24px 40px',
          maxWidth: '880px',
          margin: '0 auto',
        }}
      >
        <h1
          style={{
            fontFamily: "'Merriweather', serif",
            fontWeight: 700,
            fontSize: '1.7rem',
            color: '#1a1a2e',
            textAlign: 'center',
            marginBottom: '40px',
          }}
        >
          Servicios ofrecidos
        </h1>

        {servicios.map((s) => (
          <AccordionItem
            key={s.id}
            title={s.title}
            items={s.items}
            defaultOpen={s.defaultOpen}
          />
        ))}
      </section>

      <section
        style={{
          padding: '24px 24px 48px',
          maxWidth: '640px',
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
          ¿Necesitas apoyo en la gestión laboral de tu empresa?
        </h2>
        <p
          style={{
            fontFamily: "'Merriweather', serif",
            fontSize: '0.82rem',
            color: '#4a4a5a',
            lineHeight: 1.7,
            marginBottom: '28px',
          }}
        >
          Contáctanos y evaluaremos la situación de tu empresa para ofrecer la
          asesoría más adecuada.
        </p>
        <ActionButtons />
      </section>
    </div>
  );
}
