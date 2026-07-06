import { RouterProvider } from 'react-router-dom';
import { router } from './routes.tsx';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './components/NotificationProvider';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider />
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  );
}
