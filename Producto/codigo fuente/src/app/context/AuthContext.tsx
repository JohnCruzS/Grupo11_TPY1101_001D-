import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { ConectaLogo } from '../components/Logo';

function AuthTransitionOverlay({ type }: { type: 'login' | 'logout' }) {
  return (
    <div
      className="auth-overlay-anim"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#091f34',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
      }}
    >
      <style>{`
        @keyframes auth-overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .auth-overlay-anim { animation: auth-overlay-in 0.18s ease-out forwards; }
      `}</style>

      <ConectaLogo height={52} />

      <div
        className="animate-spin"
        style={{
          width: '32px',
          height: '32px',
          border: '2px solid rgba(255,255,255,0.1)',
          borderTop: '2px solid rgba(255,255,255,0.65)',
          borderRadius: '50%',
        }}
      />

      <p style={{
        fontFamily: "'Inter', sans-serif",
        color: 'rgba(255,255,255,0.4)',
        fontSize: '0.78rem',
        letterSpacing: '0.04em',
      }}>
        {type === 'login' ? 'Iniciando sesión...' : 'Cerrando sesión...'}
      </p>
    </div>
  );
}
import { createClient, Session } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import type { AdminPermisos } from '../utils/permisos';

const SUPABASE_URL = `https://${projectId}.supabase.co`;

const supabase = createClient(SUPABASE_URL, publicAnonKey);

export function getSupabase() {
  return supabase;
}

const SESSION_MAX_AGE_MS = 60 * 60 * 1000;
const SESSION_STARTED_KEY = 'slc_session_started_at';
export const SESSION_EXPIRED_FLAG = 'slc_session_expired';

export const SESSION_BLOCKED_FLAG = 'slc_session_blocked';

export const BLOCK_MESSAGES: Record<'suspended' | 'archived', string> = {
  suspended: 'Acceso suspendido por mora',
  archived:
    'Tu empresa ya no se encuentra activa en SotLoy Conecta. Si crees que es un error, contacta a soporte.',
};

function getSessionStartedAt(): number | null {
  const raw = localStorage.getItem(SESSION_STARTED_KEY);
  return raw ? Number(raw) : null;
}

function setSessionStartedAt(ts: number) {
  localStorage.setItem(SESSION_STARTED_KEY, String(ts));
}

function clearSessionStartedAt() {
  localStorage.removeItem(SESSION_STARTED_KEY);
}

function isSessionExpired(): boolean {
  const startedAt = getSessionStartedAt();
  if (!startedAt) return false;
  return Date.now() - startedAt > SESSION_MAX_AGE_MS;
}

export interface User {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  empresa: string;
  telefono: string;
  role?: 'usuario' | 'empresa' | 'admin' | 'superadmin';
  plan?: string;
  createdAt: string;

  rol?: 'usuario' | 'empresa' | 'admin' | 'superadmin';
  empresaId?: string;

  permisos?: AdminPermisos;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  authTransition: 'login' | 'logout' | null;
  startAuthTransition: (type: 'login' | 'logout') => void;
  clearAuthTransition: () => void;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    data: RegisterData
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (
    data: Partial<User>
  ) => Promise<{ success: boolean; error?: string }>;
  changePassword: (
    current: string,
    newPass: string
  ) => Promise<{ success: boolean; error?: string }>;

  refreshUser: () => Promise<void>;
  apiGet: (path: string) => Promise<Response>;
  apiPost: (path: string, body?: unknown) => Promise<Response>;
  apiPut: (path: string, body?: unknown) => Promise<Response>;
  apiDelete: (path: string) => Promise<Response>;
  apiFormPost: (path: string, formData: FormData) => Promise<Response>;
}

interface RegisterData {
  nombre: string;
  apellido: string;
  email: string;
  empresa: string;
  telefono: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authTransition, setAuthTransition] = useState<'login' | 'logout' | null>(null);
  const supabase = getSupabase();

  const startAuthTransition = (type: 'login' | 'logout') => setAuthTransition(type);
  const clearAuthTransition = () => setAuthTransition(null);

  const loadUserProfile = async (session: Session): Promise<User> => {
    const userId = session.user.id;
    const metadata = session.user.user_metadata || {};

    try {
      const { data, error } = await supabase
        .from('kv_store_7d36b31f')
        .select('value')
        .eq('key', `slc_user:${userId}`)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile from KV Store:', error);
      }

      if (data?.value && !error) {
        const profile = data.value;
        return {
          id: userId,
          nombre: profile.nombre || metadata.nombre || 'Usuario',
          apellido: profile.apellido || metadata.apellido || '',
          email: session.user.email || profile.email || '',
          empresa: profile.empresa || metadata.empresa || '',
          telefono: profile.telefono || metadata.telefono || '',
          role: profile.rol || metadata.rol || 'usuario',
          rol: profile.rol || metadata.rol || 'usuario',
          plan: profile.plan || metadata.plan,
          empresaId: profile.empresaId || profile.empresa_id,
          permisos: profile.permisos,
          createdAt: session.user.created_at,
        };
      }
    } catch (err) {
      console.error('Error loading profile from KV Store:', err);
    }

    return {
      id: userId,
      nombre: metadata.nombre || 'Usuario',
      apellido: metadata.apellido || '',
      email: session.user.email || '',
      empresa: metadata.empresa || '',
      telefono: metadata.telefono || '',
      role: metadata.rol || 'usuario',
      rol: metadata.rol || 'usuario',
      plan: metadata.plan,
      createdAt: session.user.created_at,
    };
  };

  const forceExpireSession = async () => {
    clearSessionStartedAt();
    sessionStorage.setItem(SESSION_EXPIRED_FLAG, '1');
    setUser(null);
    setSession(null);
    await supabase.auth.signOut();
  };

  const forceBlockedSession = async (message: string) => {
    clearSessionStartedAt();
    sessionStorage.setItem(SESSION_BLOCKED_FLAG, message);
    setUser(null);
    setSession(null);
    await supabase.auth.signOut();
  };

  const getAccountBlockStatus = async (
    userId: string
  ): Promise<'suspended' | 'archived' | null> => {
    try {
      const { data: kv } = await supabase
        .from('kv_store_7d36b31f')
        .select('value')
        .eq('key', `slc_user:${userId}`)
        .maybeSingle();
      const profile = (kv?.value || {}) as Record<string, unknown>;
      const rol = (profile.rol || profile.role || 'usuario') as string;
      if (rol === 'admin' || rol === 'superadmin') return null;

      const empresaIds = new Set<string>();
      const propio = (profile.empresaId || profile.empresa_id) as string | undefined;
      if (propio) empresaIds.add(propio);

      const { data: ues } = await supabase
        .from('user_enterprises')
        .select('enterprise_id')
        .eq('user_id', userId)
        .eq('is_active', true);
      (ues || []).forEach((u: { enterprise_id: string }) => {
        if (u.enterprise_id) empresaIds.add(u.enterprise_id);
      });

      if (empresaIds.size === 0) return null;

      const { data: bloqueadas } = await supabase
        .from('enterprises')
        .select('subscription_status')
        .in('id', Array.from(empresaIds))
        .in('subscription_status', ['suspended', 'archived']);

      if (!bloqueadas?.length) return null;

      const algunaSuspendida = bloqueadas.some(
        (e: { subscription_status: string }) => e.subscription_status === 'suspended'
      );
      return algunaSuspendida ? 'suspended' : 'archived';
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session && isSessionExpired()) {
        forceExpireSession();
        setIsLoading(false);
        return;
      }
      if (session && !getSessionStartedAt()) {

        setSessionStartedAt(Date.now());
      }
      setSession(session);
      if (session) {

        const metadata = session.user.user_metadata || {};
        const basicUser: User = {
          id: session.user.id,
          nombre: metadata.nombre || 'Usuario',
          apellido: metadata.apellido || '',
          email: session.user.email || '',
          empresa: metadata.empresa || '',
          telefono: metadata.telefono || '',
          role: metadata.rol || 'usuario',
          rol: metadata.rol || 'usuario',
          plan: metadata.plan,
          createdAt: session.user.created_at,
        };
        if (mounted) setUser(basicUser);

        getAccountBlockStatus(session.user.id).then((status) => {
          if (mounted && status) forceBlockedSession(BLOCK_MESSAGES[status]);
        });

        loadUserProfile(session)
          .then((fullProfile) => {
            if (mounted) setUser(fullProfile);
          })
          .catch((err) => {
            console.error('Error loading full profile:', err);
          });
      }
      if (mounted) setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearSessionStartedAt();
      }
      setSession(session);
      if (session) {

        const metadata = session.user.user_metadata || {};
        const basicUser: User = {
          id: session.user.id,
          nombre: metadata.nombre || 'Usuario',
          apellido: metadata.apellido || '',
          email: session.user.email || '',
          empresa: metadata.empresa || '',
          telefono: metadata.telefono || '',
          role: metadata.rol || 'usuario',
          rol: metadata.rol || 'usuario',
          plan: metadata.plan,
          createdAt: session.user.created_at,
        };
        setUser((prev) =>
          prev && prev.id === session.user.id ? prev : basicUser
        );

        loadUserProfile(session)
          .then((fullProfile) => {
            if (!mounted) return;

            setUser((prev) =>
              prev &&
              prev.id === fullProfile.id &&
              prev.empresaId === fullProfile.empresaId &&
              prev.rol === fullProfile.rol &&
              prev.nombre === fullProfile.nombre &&
              prev.apellido === fullProfile.apellido &&
              prev.email === fullProfile.email
                ? prev
                : fullProfile
            );
          })
          .catch((err) => {
            console.error('Error loading full profile:', err);
          });
      } else {
        setUser(null);
      }
    });

    const expiryCheckId = setInterval(async () => {
      if (isSessionExpired()) {
        forceExpireSession();
        return;
      }

      const {
        data: { session: current },
      } = await supabase.auth.getSession();
      if (current) {
        const status = await getAccountBlockStatus(current.user.id);
        if (status) forceBlockedSession(BLOCK_MESSAGES[status]);
      }
    }, 60 * 1000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearInterval(expiryCheckId);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { success: false, error: error.message };
    if (data?.session) {

      const blockStatus = await getAccountBlockStatus(data.session.user.id);
      if (blockStatus) {
        await supabase.functions.invoke('audit-log', {
          body: {
            action: 'LOGIN',
            resourceType: 'auth',
            resourceId: data.session.user.id,
            success: false,
            metadata: { method: 'password', reason: blockStatus },
          },
        });
        await supabase.auth.signOut();
        return { success: false, error: BLOCK_MESSAGES[blockStatus] };
      }
      setSessionStartedAt(Date.now());
      await supabase.functions.invoke('audit-log', {
        body: {
          action: 'LOGIN',
          resourceType: 'auth',
          resourceId: data.session.user.id,
          success: true,
          metadata: { method: 'password' },
        },
      });
    }

    return { success: true };
  };

  const register = async (data: RegisterData) => {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          nombre: data.nombre,
          apellido: data.apellido,
          empresa: data.empresa,
          telefono: data.telefono,
          rol: 'empresa',
        },
      },
    });
    if (error) return { success: false, error: error.message };

    if (authData?.session) {
      setSessionStartedAt(Date.now());
    }

    if (authData?.user) {
      try {
        await supabase.from('kv_store_7d36b31f').insert({
          key: `slc_user:${authData.user.id}`,
          value: {
            nombre: data.nombre,
            apellido: data.apellido,
            email: data.email,
            empresa: data.empresa,
            telefono: data.telefono,
            rol: 'empresa',
            id: authData.user.id,
            created_at: authData.user.created_at,
          },
        });
      } catch (kvErr) {
        console.warn('No se pudo crear el perfil en KV Store:', kvErr);
      }
    }

    return { success: true };
  };

  const logout = async () => {
    if (session?.user?.id) {
      await supabase.functions.invoke('audit-log', {
        body: {
          action: 'LOGOUT',
          resourceType: 'auth',
          resourceId: session.user.id,
          success: true,
        },
      });
    }
    clearSessionStartedAt();
    await supabase.auth.signOut();
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return { success: false, error: 'No autenticado.' };

    const { error } = await supabase.auth.updateUser({
      data: {
        nombre: data.nombre,
        apellido: data.apellido,
        empresa: data.empresa,
        telefono: data.telefono,
      },
    });
    if (error) return { success: false, error: error.message };
    await supabase.functions.invoke('audit-log', {
      body: {
        action: 'USER_UPDATE',
        resourceType: 'user',
        resourceId: user.id,
        success: true,
        metadata: {
          fields: Object.keys(data),
        },
      },
    });

    setUser({ ...user, ...data });
    return { success: true };
  };

  const changePassword = async (current: string, newPass: string) => {
    if (!user) return { success: false, error: 'No autenticado.' };

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    });
    if (signInError) return { success: false, error: 'La contraseña actual es incorrecta.' };
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const refreshUser = async () => {
    if (!session) return;

    const {
      data: { session: newSession },
    } = await supabase.auth.getSession();
    if (newSession) {
      setSession(newSession);
      const userProfile = await loadUserProfile(newSession);
      setUser(userProfile);
    }
  };

  const authHeader = () => ({
    Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
  });

  const apiGet = (path: string) =>
    fetch(`${SUPABASE_URL}${path}`, { headers: { ...authHeader() } });

  const apiPost = (path: string, body?: unknown) =>
    fetch(`${SUPABASE_URL}${path}`, {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  const apiPut = (path: string, body?: unknown) =>
    fetch(`${SUPABASE_URL}${path}`, {
      method: 'PUT',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  const apiDelete = (path: string) =>
    fetch(`${SUPABASE_URL}${path}`, {
      method: 'DELETE',
      headers: { ...authHeader() },
    });

  const apiFormPost = (path: string, formData: FormData) =>
    fetch(`${SUPABASE_URL}${path}`, {
      method: 'POST',
      headers: { ...authHeader() },
      body: formData,
    });

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        authTransition,
        startAuthTransition,
        clearAuthTransition,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        refreshUser,
        apiGet,
        apiPost,
        apiPut,
        apiDelete,
        apiFormPost,
      }}
    >
      {authTransition && <AuthTransitionOverlay type={authTransition} />}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
