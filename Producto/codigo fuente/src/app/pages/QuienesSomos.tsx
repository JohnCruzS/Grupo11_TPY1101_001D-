import { useEffect } from 'react';
import { setPageMeta } from '../utils/pageSeo';

const bodyText: React.CSSProperties = {
  fontFamily: "'Merriweather', serif",
  fontSize: '1.02rem',
  color: '#4a4a5a',
  lineHeight: 1.8,
  textAlign: 'center',
};

export default function QuienesSomos() {
  useEffect(() => {
    setPageMeta({
      title: '¿Quiénes somos? — SotLoy Conecta',
      description: 'SotLoy Asesorías lleva más de 10 años acompañando a Pymes chilenas en gestión laboral, RRHH y cumplimiento normativo. Conoce nuestro equipo y misión.',
      canonical: 'https://sotloyconecta.cl/quienes-somos',
    });
  }, []);

  return (
    <div style={{ backgroundColor: '#ffffff' }}>
      <section
        style={{
          padding: '56px 24px 64px',
          maxWidth: '820px',
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
            marginBottom: '36px',
          }}
        >
          ¿Quiénes somos?
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <p style={bodyText}>
            SotLoy Asesorías brinda apoyo a empresas en la gestión de sus
            procesos laborales y en la correcta administración de la
            documentación relacionada con la gestión de personas. Desde Villa
            Alemana, entregamos servicios a empresas de la región que buscan
            ordenar sus procesos laborales, cumplir con sus obligaciones y
            fortalecer la administración de su personal.
          </p>

          <p style={bodyText}>
            Contamos con experiencia en asesoría laboral y gestión de recursos
            humanos, apoyando a las organizaciones en la elaboración de
            contratos, anexos y finiquitos, gestión de remuneraciones, cálculos
            laborales y resolución de situaciones complejas como procesos de
            desvinculación o requerimientos de la autoridad laboral.
          </p>

          <p style={bodyText}>
            Nuestro enfoque está orientado a acompañar a las empresas en la
            prevención de contingencias laborales, entregando asesoría clara y
            práctica que permita mantener una gestión laboral ordenada y segura.
          </p>

          <p style={bodyText}>
            En SotLoy Asesorías ofrecemos un apoyo cercano y especializado para
            que las empresas puedan gestionar correctamente sus procesos
            laborales y la administración de su personal. Nuestro servicio está
            orientado a entregar soluciones claras y prácticas en materias como
            contratos de trabajo, remuneraciones, documentación laboral,
            procesos de desvinculación y cumplimiento de las obligaciones
            laborales.
          </p>

          <p style={bodyText}>
            Acompañamos a las organizaciones en la prevención de contingencias
            laborales, apoyando en cálculos, revisión de documentación y
            preparación ante fiscalizaciones de la Dirección del Trabajo, con el
            objetivo de mantener una gestión laboral ordenada y segura.
          </p>
        </div>
      </section>
    </div>
  );
}
