import { useState, useEffect } from 'react';
import { setPageMeta } from '../utils/pageSeo';

interface FormData {
  correo: string;
  nombre: string;
  empresa: string;
  correoElectronico: string;
  telefono: string;
  numeroTrabajadores: string;
  consulta: string;
}

const labelStyle: React.CSSProperties = {
  fontFamily: "'Merriweather', serif",
  fontSize: '0.95rem',
  color: '#1a1a2e',
  fontWeight: 500,
  display: 'block',
  marginBottom: '8px',
};

const inputStyle: React.CSSProperties = {
  fontFamily: "'Merriweather', serif",
  fontSize: '0.92rem',
  color: '#333',
  width: '100%',
  border: 'none',
  borderBottom: '1px solid #ccc',
  padding: '4px 0',
  outline: 'none',
  background: 'transparent',
};

const fieldCard: React.CSSProperties = {
  border: '1px solid #e0e0e8',
  borderRadius: '2px',
  padding: '16px',
  marginBottom: '8px',
};

export default function Contacto() {
  useEffect(() => {
    setPageMeta({
      title: 'Contacto — SotLoy Conecta',
      description: 'Contáctanos para una asesoría laboral personalizada para tu Pyme. Respuesta en menos de 24 horas. SotLoy Asesorías, Santiago de Chile.',
      canonical: 'https://sotloyconecta.cl/contacto',
    });
  }, []);

  const [formData, setFormData] = useState<FormData>({
    correo: '',
    nombre: '',
    empresa: '',
    correoElectronico: '',
    telefono: '',
    numeroTrabajadores: '',
    consulta: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ backgroundColor: '#ffffff' }}>
      <section
        style={{
          padding: '56px 24px 56px',
          maxWidth: '780px',
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
            marginBottom: '20px',
          }}
        >
          Contacto
        </h1>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <p
            style={{
              fontFamily: "'Merriweather', serif",
              fontSize: '0.82rem',
              color: '#4a4a5a',
              marginBottom: '4px',
            }}
          >
            Email:{' '}
            <a
              href="mailto:contacto@sotloyasesorias.cl"
              style={{ color: '#091f34', textDecoration: 'underline' }}
            >
              contacto@sotloyasesorias.cl
            </a>
          </p>
          <p
            style={{
              fontFamily: "'Merriweather', serif",
              fontSize: '0.82rem',
              color: '#4a4a5a',
            }}
          >
            Teléfono: +56 9 8836 2521
          </p>
        </div>

        {submitted ? (
          <div
            style={{
              border: '1px solid #e0e0e8',
              borderRadius: '2px',
              padding: '48px 24px',
              textAlign: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
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
              ¡Formulario enviado!
            </h2>
            <p
              style={{
                fontFamily: "'Merriweather', serif",
                fontSize: '0.82rem',
                color: '#4a4a5a',
              }}
            >
              Gracias por contactarnos. Te responderemos a la brevedad.
            </p>
          </div>
        ) : (
          <div
            style={{
              border: '1px solid #e0e0e8',
              borderRadius: '2px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }}
          >

            <div style={{ backgroundColor: '#091f34', padding: '14px 20px' }}>
              <h2
                style={{
                  fontFamily: "'Merriweather', serif",
                  fontWeight: 400,
                  fontSize: '1.05rem',
                  color: 'white',
                  margin: 0,
                }}
              >
                Formulario de Contacto
              </h2>
            </div>

            <div style={{ backgroundColor: 'white' }}>
              <div
                style={{
                  padding: '10px 20px',
                  borderBottom: '1px solid #f0f0f4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Merriweather', serif",
                    fontSize: '0.75rem',
                    color: '#888',
                  }}
                >
                  contacto@sotloyasesorias.cl
                </span>
              </div>
              <p
                style={{
                  fontFamily: "'Merriweather', serif",
                  fontSize: '0.72rem',
                  color: '#c0392b',
                  padding: '8px 20px',
                }}
              >
                * Indica que la pregunta es obligatoria
              </p>

              <form onSubmit={handleSubmit} style={{ padding: '0 12px 12px' }}>

                <div style={fieldCard}>
                  <label style={labelStyle}>
                    Correo <span style={{ color: '#c0392b' }}>*</span>
                  </label>
                  <input
                    type="email"
                    name="correo"
                    placeholder="Tu dirección de correo electrónico"
                    value={formData.correo}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                </div>

                <div style={fieldCard}>
                  <label style={labelStyle}>
                    Tu nombre <span style={{ color: '#c0392b' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    placeholder="Tu respuesta"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                </div>

                <div style={fieldCard}>
                  <label style={labelStyle}>
                    Empresa <span style={{ color: '#c0392b' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="empresa"
                    placeholder="Tu respuesta"
                    value={formData.empresa}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                </div>

                <div style={fieldCard}>
                  <label style={labelStyle}>
                    Correo Electrónico{' '}
                    <span style={{ color: '#c0392b' }}>*</span>
                  </label>
                  <input
                    type="email"
                    name="correoElectronico"
                    placeholder="Tu respuesta"
                    value={formData.correoElectronico}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                </div>

                <div style={fieldCard}>
                  <label style={labelStyle}>
                    Teléfono <span style={{ color: '#c0392b' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    placeholder="Tu respuesta"
                    value={formData.telefono}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                </div>

                <div style={fieldCard}>
                  <label style={labelStyle}>
                    Número de Trabajadores{' '}
                    <span style={{ color: '#c0392b' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="numeroTrabajadores"
                    placeholder="Tu respuesta"
                    value={formData.numeroTrabajadores}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                </div>

                <div style={fieldCard}>
                  <label style={labelStyle}>
                    Consulta o requerimiento{' '}
                    <span style={{ color: '#c0392b' }}>*</span>
                  </label>
                  <textarea
                    name="consulta"
                    placeholder="Tu respuesta"
                    value={formData.consulta}
                    onChange={handleChange}
                    required
                    rows={3}
                    style={{ ...inputStyle, resize: 'none' }}
                  />
                </div>

                <div
                  style={{
                    borderTop: '1px solid #f0f0f4',
                    marginTop: '8px',
                    paddingTop: '16px',
                    paddingBottom: '8px',
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Merriweather', serif",
                      fontSize: '0.72rem',
                      color: '#888',
                      marginBottom: '16px',
                    }}
                  >
                    Se enviará una copia de tus respuestas por correo
                    electrónico a la dirección que has proporcionado.
                  </p>
                  <button
                    type="submit"
                    style={{
                      fontFamily: "'Merriweather', serif",
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      color: 'white',
                      backgroundColor: '#091f34',
                      border: 'none',
                      padding: '10px 28px',
                      borderRadius: '2px',
                      cursor: 'pointer',
                    }}
                  >
                    Enviar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
