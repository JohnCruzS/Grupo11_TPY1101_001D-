
import { createBrowserRouter, Navigate, Outlet, useMatches, useRouteError } from 'react-router-dom';
import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { useAuth } from './context/AuthContext';

const Root = lazy(() => import('./pages/Root'));
const Home = lazy(() => import('./pages/Home'));
const QuienesSomos = lazy(() => import('./pages/QuienesSomos'));
const Servicios = lazy(() => import('./pages/Servicios'));
const Planes = lazy(() => import('./pages/Planes'));
const Contacto = lazy(() => import('./pages/Contacto'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ConectaLogin = lazy(() => import('./pages/conecta/ConectaLogin'));
const ConectaDashboard = lazy(() => import('./pages/conecta/ConectaDashboard'));
const DocumentacionPage = lazy(() => import('./pages/conecta/DocumentacionPage'));
const EmpresaPage = lazy(() => import('./pages/conecta/EmpresaPage'));
const PerfilPage = lazy(() => import('./pages/conecta/PerfilPage'));
const PagosPage = lazy(() => import('./pages/conecta/PagosPage'));
const PagoResultadoPage = lazy(() => import('./pages/conecta/PagoResultadoPage'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogArticle = lazy(() => import('./pages/BlogArticle'));
const NotFound = lazy(() => import('./pages/NotFound'));

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
  </div>
);

function TitleSetter() {
  const matches = useMatches();
  useEffect(() => {
    const match = [...matches]
      .reverse()
      .find((m) => (m.handle as { title?: string })?.title);
    document.title = (match?.handle as { title?: string })?.title ?? 'SotLoy Conecta';
  }, [matches]);
  return <Outlet />;
}

const wrap = (Component: ComponentType) => () => (
  <Suspense fallback={<LoadingSpinner />}>
    <Component />
  </Suspense>
);

function RootErrorBoundary() {
  const error = useRouteError() as Error | undefined;
  const isChunkError =
    error?.message?.includes('dynamically imported module') ||
    error?.message?.includes('Failed to fetch') ||
    error?.message?.includes('Importing a module script failed');

  if (isChunkError) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f1b2d',
          padding: '24px',
          textAlign: 'center',
          gap: '16px',
        }}
      >
        <p style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
          SotLoy Conecta
        </p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", color: 'white', fontSize: '1.5rem', fontWeight: 500, margin: 0 }}>
          Nueva versión disponible
        </h1>
        <p style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem', maxWidth: '360px', lineHeight: 1.6, margin: 0 }}>
          La aplicación se actualizó. Recarga la página para continuar.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '8px',
            padding: '10px 28px',
            backgroundColor: '#1d4ed8',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Recargar
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f1b2d',
        padding: '24px',
        textAlign: 'center',
        gap: '12px',
      }}
    >
      <h1 style={{ fontFamily: "'Playfair Display', serif", color: 'white', fontSize: '1.5rem', fontWeight: 500, margin: 0 }}>
        Error inesperado
      </h1>
      <p style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem', margin: 0 }}>
        {error?.message || 'Ocurrió un error desconocido.'}
      </p>
      <button
        onClick={() => window.location.href = '/'}
        style={{
          marginTop: '8px',
          padding: '10px 28px',
          backgroundColor: '#1d4ed8',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.875rem',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Volver al inicio
      </button>
    </div>
  );
}

function ProtectedRoute() {
  const { session, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!session) return <Navigate to="/conecta/login" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <TitleSetter />,
    errorElement: <RootErrorBoundary />,
    children: [

      {
        path: '/',
        Component: wrap(Root),
        children: [
          { index: true, Component: Home, handle: { title: 'SotLoy Conecta' } },
          { path: 'quienes-somos', Component: QuienesSomos, handle: { title: 'Quiénes Somos | SotLoy Conecta' } },
          { path: 'servicios', Component: Servicios, handle: { title: 'Servicios | SotLoy Conecta' } },
          { path: 'planes', Component: Planes, handle: { title: 'Planes | SotLoy Conecta' } },
          { path: 'contacto', Component: Contacto, handle: { title: 'Contacto | SotLoy Conecta' } },
          { path: 'blog', Component: wrap(Blog), handle: { title: 'Blog | SotLoy Conecta' } },
          { path: 'blog/:slug', Component: wrap(BlogArticle) },
        ],
      },

      { path: '/recuperar-contrasena', Component: wrap(ForgotPassword), handle: { title: 'Recuperar Contraseña | SotLoy Conecta' } },
      { path: '/reset-password', Component: wrap(ResetPassword), handle: { title: 'Cambiar Contraseña | SotLoy Conecta' } },

      { path: '/conecta/login', Component: wrap(ConectaLogin), handle: { title: 'Iniciar Sesión | SotLoy Conecta' } },
      { path: '/conecta/pago-resultado', Component: wrap(PagoResultadoPage), handle: { title: 'Resultado de Pago | SotLoy Conecta' } },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/conecta/dashboard', Component: wrap(ConectaDashboard), handle: { title: 'Dashboard | SotLoy Conecta' } },
          { path: '/conecta/documentacion', Component: wrap(DocumentacionPage), handle: { title: 'Documentación | SotLoy Conecta' } },
          { path: '/conecta/empresa', Component: wrap(EmpresaPage), handle: { title: 'Empresa | SotLoy Conecta' } },
          { path: '/conecta/perfil', Component: wrap(PerfilPage), handle: { title: 'Perfil | SotLoy Conecta' } },
          { path: '/conecta/pagos', Component: wrap(PagosPage), handle: { title: 'Pagos | SotLoy Conecta' } },
          { path: '/conecta', Component: () => <Navigate to="/conecta/dashboard" replace /> },
        ],
      },

      { path: '*', Component: wrap(NotFound), handle: { title: '404 | SotLoy Conecta' } },
    ],
  },
]);
