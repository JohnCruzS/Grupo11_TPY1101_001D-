import { useState, ReactNode } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpTooltipProps {
  children: ReactNode;
  title?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export function HelpTooltip({
  children,
  title,
  placement = 'top',
}: HelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const placementStyles = {
    top: {
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: '8px',
    },
    bottom: {
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginTop: '8px',
    },
    left: {
      right: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginRight: '8px',
    },
    right: {
      left: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginLeft: '8px',
    },
  };

  return (
    <span className="relative inline-flex items-center">
      {children}
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="ml-1 p-0.5 rounded-full hover:bg-blue-100 transition-colors"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <HelpCircle size={14} color="#3b82f6" />
      </button>

      {isVisible && (
        <div
          className="absolute z-50 w-64 p-3 bg-gray-900 text-white rounded-lg shadow-lg text-sm"
          style={{
            ...placementStyles[placement],
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <div className="flex items-start gap-2">
            <span className="flex-1">{title}</span>
            <button
              onClick={() => setIsVisible(false)}
              className="flex-shrink-0"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <X size={12} color="#9ca3af" />
            </button>
          </div>
          <div
            className="absolute w-2 h-2 bg-gray-900 rotate-45"
            style={{
              ...(placement === 'top' && {
                bottom: '-4px',
                left: '50%',
                marginLeft: '-4px',
              }),
              ...(placement === 'bottom' && {
                top: '-4px',
                left: '50%',
                marginLeft: '-4px',
              }),
              ...(placement === 'left' && {
                right: '-4px',
                top: '50%',
                marginTop: '-4px',
              }),
              ...(placement === 'right' && {
                left: '-4px',
                top: '50%',
                marginTop: '-4px',
              }),
            }}
          />
        </div>
      )}
    </span>
  );
}

interface TourStep {
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="documentos"]',
    title: '📁 Tus Documentos',
    content:
      'Aquí encontrarás todos tus documentos laborales: contratos, liquidaciones, finiquitos y más.',
    position: 'bottom',
  },
  {
    target: '[data-tour="chatbot"]',
    title: '🤖 Asistente IA',
    content:
      'LOY te ayuda con consultas sobre derecho laboral chileno. ¡Pregúntale lo que necesites!',
    position: 'bottom',
  },
  {
    target: '[data-tour="perfil"]',
    title: '👤 Tu Perfil',
    content:
      'Gestiona tu información personal, cambia tu contraseña y configura tus notificaciones.',
    position: 'left',
  },
];

export function OnboardingTour({
  isActive,
  onComplete,
  onSkip,
}: {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isActive) return null;

  const step = TOUR_STEPS[currentStep];
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-50" style={{ pointerEvents: 'none' }}>

      <div
        className="absolute inset-0 bg-black/50"
        style={{ pointerEvents: 'auto' }}
        onClick={onSkip}
      />

      <div
        className="absolute bg-white rounded-lg shadow-xl p-4 w-80"
        style={{
          pointerEvents: 'auto',

          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >

        <div className="w-full h-1 bg-gray-200 rounded-full mb-4">
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <h3
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '1rem',
            fontWeight: 600,
            color: '#091f34',
            marginBottom: '8px',
          }}
        >
          {step.title}
        </h3>

        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.85rem',
            color: '#6b7280',
            marginBottom: '16px',
            lineHeight: 1.5,
          }}
        >
          {step.content}
        </p>

        <div className="flex items-center justify-between">
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.75rem',
              color: '#9ca3af',
            }}
          >
            {currentStep + 1} de {TOUR_STEPS.length}
          </span>

          <div className="flex gap-2">
            <button
              onClick={onSkip}
              className="px-3 py-1.5 text-sm rounded-md"
              style={{
                fontFamily: "'Inter', sans-serif",
                color: '#6b7280',
                backgroundColor: '#f3f4f6',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Omitir
            </button>

            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-3 py-1.5 text-sm rounded-md"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  color: '#6b7280',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Anterior
              </button>
            )}

            <button
              onClick={() => {
                if (currentStep < TOUR_STEPS.length - 1) {
                  setCurrentStep(currentStep + 1);
                } else {
                  onComplete();
                }
              }}
              className="px-3 py-1.5 text-sm rounded-md text-white"
              style={{
                fontFamily: "'Inter', sans-serif",
                backgroundColor: '#3b82f6',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {currentStep === TOUR_STEPS.length - 1
                ? 'Finalizar'
                : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);

  const faqs = [
    {
      q: '¿Cómo descargo un documento?',
      a: 'Haz clic en el icono de descarga junto al documento. Si no está disponible, contacta a tu empresa.',
    },
    {
      q: '¿Qué es el Asistente LOY?',
      a: 'LOY es nuestra IA especializada en derecho laboral chileno. Puedes preguntarle sobre contratos, vacaciones, indemnizaciones, etc.',
    },
    {
      q: '¿Cómo cambio mi contraseña?',
      a: "Ve a 'Mi perfil' y selecciona 'Cambiar contraseña' en la sección de Seguridad.",
    },
    {
      q: '¿Quién puede ver mis documentos?',
      a: 'Solo tú, tu empresa y los administradores autorizados tienen acceso a tus documentos.',
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#091f34',
              }}
            >
              ❓ Centro de Ayuda
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={18} color="#6b7280" />
            </button>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {faqs.map((faq, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#091f34',
                    marginBottom: '4px',
                  }}
                >
                  {faq.q}
                </p>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    lineHeight: 1.4,
                  }}
                >
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 text-center">
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.7rem',
                color: '#9ca3af',
              }}
            >
              ¿Necesitas más ayuda? Contacta a soporte@sotloy.cl
            </p>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105"
        style={{
          backgroundColor: isOpen ? '#6b7280' : '#091f34',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {isOpen ? (
          <X size={20} color="white" />
        ) : (
          <HelpCircle size={24} color="white" />
        )}
      </button>
    </div>
  );
}
