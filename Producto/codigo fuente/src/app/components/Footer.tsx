import { Logo } from './Logo';
import flowLogo from '../../assets/flow.svg';

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 py-8 mt-12">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8">

          <div className="flex flex-col gap-2">
            <p className="text-gray-500 text-xs">
              Derechos reservados SotLoy Asesorías SpA 2026.
            </p>
            <p className="text-gray-500 text-xs">
              Mail:{' '}
              <a href="mailto:contacto@sotloyasesorias.cl" className="underline text-gray-600">
                contacto@sotloyasesorias.cl
              </a>{' '}
              | Contacto +56 9 8836 2521 | Instagram: @sotloyasesorias
            </p>
            <p className="text-gray-500 text-xs">Región de Valparaíso, Chile.</p>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-400 text-xs">Pago electrónico seguro con</span>
              <img src={flowLogo} alt="Flow" style={{ height: 20, width: 'auto', display: 'block' }} />
            </div>
          </div>

          <div className="flex-shrink-0 self-center md:self-start">
            <Logo size="sm" variant="transparent" />
          </div>
        </div>
      </div>
    </footer>
  );
}
