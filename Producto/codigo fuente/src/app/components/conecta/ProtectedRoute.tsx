import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingScreen } from './LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireAuth?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  allowedRoles = [],
  requireAuth = true,
  redirectTo = '/conecta/login',
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!requireAuth) {
    return <>{children}</>;
  }

  if (!user) {

    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (allowedRoles.length > 0) {
    const userRole = user.rol || user.role || 'usuario';

    if (!allowedRoles.includes(userRole)) {

      return (
        <Navigate
          to="/conecta/dashboard"
          replace
          state={{
            error: 'No tienes permisos para acceder a esta sección',
            requiredRole: allowedRoles,
          }}
        />
      );
    }
  }

  return <>{children}</>;
}

export function usePermissions() {
  const { user } = useAuth();

  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false;

    const userRole = user.rol || user.role || 'usuario';
    const rolesArray = Array.isArray(roles) ? roles : [roles];

    return rolesArray.includes(userRole);
  };

  const isAuthenticated = !!user;

  const userRole = user?.rol || user?.role || 'usuario';

  return {
    hasRole,
    isAuthenticated,
    userRole,
    user,
  };
}

interface RoleBasedProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
}

export function RoleBased({
  children,
  allowedRoles,
  fallback = null,
}: RoleBasedProps) {
  const { hasRole } = usePermissions();

  if (!hasRole(allowedRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
