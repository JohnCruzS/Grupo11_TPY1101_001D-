import type { User } from '../context/AuthContext';

export type PermisoKey = 'finanzas' | 'usuarios' | 'empresas' | 'documentos';

export interface AdminPermisos {
  finanzas: boolean;
  usuarios: boolean;
  empresas: boolean;
  documentos: boolean;
}

export const PERMISO_DEFS: {
  key: PermisoKey;
  label: string;
  descripcion: string;
}[] = [
  {
    key: 'finanzas',
    label: 'Finanzas',
    descripcion: 'Ver y gestionar pagos y suscripciones',
  },
  {
    key: 'usuarios',
    label: 'Usuarios',
    descripcion: 'Crear, editar y gestionar usuarios',
  },
  {
    key: 'empresas',
    label: 'Empresas',
    descripcion: 'Crear, editar y archivar empresas',
  },
  {
    key: 'documentos',
    label: 'Documentos',
    descripcion: 'Subir y gestionar documentos',
  },
];

export const ALL_PERMISOS: AdminPermisos = {
  finanzas: true,
  usuarios: true,
  empresas: true,
  documentos: true,
};

export const NO_PERMISOS: AdminPermisos = {
  finanzas: false,
  usuarios: false,
  empresas: false,
  documentos: false,
};

export function hasPermiso(
  user: User | null | undefined,
  key: PermisoKey
): boolean {
  if (!user) return false;
  const rol = user.rol || user.role;
  if (rol === 'superadmin') return true;
  if (rol === 'admin') {
    const p = user.permisos;
    if (!p) return true;
    return p[key] !== false;
  }
  return false;
}
