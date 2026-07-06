import { useState, useCallback, useEffect } from 'react';
import { getSupabase } from '../context/AuthContext';

export interface DocumentLegalCategory {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tipo_documento: string;
  normativa_referencia: string | null;
  es_obligatorio: boolean;
  plazo_conservacion_anos: number | null;
  aplicabilidad: 'trabajador' | 'empresa' | 'ambos';
  activo: boolean;
}

export interface UseDocumentCategoriesReturn {
  categories: DocumentLegalCategory[];
  categoriesByType: Record<string, DocumentLegalCategory[]>;
  loading: boolean;
  error: string | null;
  loadCategories: () => Promise<void>;
  getCategoryByCode: (code: string) => DocumentLegalCategory | undefined;
  getCategoriesByType: (type: string) => DocumentLegalCategory[];
  getCategoriesByApplicability: (
    applicability: 'trabajador' | 'empresa' | 'ambos'
  ) => DocumentLegalCategory[];
  getMandatoryCategories: () => DocumentLegalCategory[];
  getRetentionYears: (categoryCode: string) => number;
}

export const DOCUMENT_TYPES = {
  contrato: { label: 'Contratos', icon: '📝', color: 'blue' },
  contrato_modificacion: {
    label: 'Modificaciones de Contrato',
    icon: '✏️',
    color: 'blue',
  },
  liquidacion: { label: 'Liquidaciones', icon: '💰', color: 'green' },
  finiquito: { label: 'Finiquitos', icon: '📤', color: 'red' },
  certificado: { label: 'Certificados', icon: '📜', color: 'purple' },
  carga_familiar: { label: 'Cargas Familiares', icon: '👨‍👩‍👧‍👦', color: 'orange' },
  licencia: { label: 'Licencias y Permisos', icon: '🏥', color: 'pink' },
  sst: { label: 'Seguridad y Salud Laboral', icon: '🦺', color: 'yellow' },
  varios: { label: 'Documentos Varios', icon: '📎', color: 'gray' },
} as const;

export const CATEGORY_GROUPS = [
  {
    id: 'obligatorios',
    label: 'Documentos Obligatorios',
    filter: (c: DocumentLegalCategory) => c.es_obligatorio,
  },
  {
    id: 'contratos',
    label: 'Contratos',
    filter: (c: DocumentLegalCategory) => c.tipo_documento.includes('contrato'),
  },
  {
    id: 'liquidaciones',
    label: 'Liquidaciones y Finiquitos',
    filter: (c: DocumentLegalCategory) =>
      c.tipo_documento === 'liquidacion' || c.tipo_documento === 'finiquito',
  },
  {
    id: 'trabajador',
    label: 'Para Trabajadores',
    filter: (c: DocumentLegalCategory) =>
      c.aplicabilidad === 'trabajador' || c.aplicabilidad === 'ambos',
  },
  {
    id: 'empresa',
    label: 'Para Empresas',
    filter: (c: DocumentLegalCategory) =>
      c.aplicabilidad === 'empresa' || c.aplicabilidad === 'ambos',
  },
];

export function useDocumentCategories(): UseDocumentCategoriesReturn {
  const [categories, setCategories] = useState<DocumentLegalCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabase();

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('document_legal_categories')
        .select('*')
        .eq('activo', true)
        .order('tipo_documento')
        .order('nombre');

      if (queryError) throw queryError;

      setCategories(data || []);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Error cargando categorías';
      setError(msg);
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const getCategoryByCode = useCallback(
    (code: string): DocumentLegalCategory | undefined => {
      return categories.find((c) => c.codigo === code);
    },
    [categories]
  );

  const categoriesByType = categories.reduce(
    (acc, category) => {
      if (!acc[category.tipo_documento]) {
        acc[category.tipo_documento] = [];
      }
      acc[category.tipo_documento].push(category);
      return acc;
    },
    {} as Record<string, DocumentLegalCategory[]>
  );

  const getCategoriesByType = useCallback(
    (type: string): DocumentLegalCategory[] => {
      return categories.filter((c) => c.tipo_documento === type);
    },
    [categories]
  );

  const getCategoriesByApplicability = useCallback(
    (
      applicability: 'trabajador' | 'empresa' | 'ambos'
    ): DocumentLegalCategory[] => {
      if (applicability === 'ambos') {
        return categories.filter((c) => c.aplicabilidad === 'ambos');
      }
      return categories.filter(
        (c) => c.aplicabilidad === applicability || c.aplicabilidad === 'ambos'
      );
    },
    [categories]
  );

  const getMandatoryCategories = useCallback((): DocumentLegalCategory[] => {
    return categories.filter((c) => c.es_obligatorio);
  }, [categories]);

  const getRetentionYears = useCallback(
    (categoryCode: string): number => {
      const category = getCategoryByCode(categoryCode);
      return category?.plazo_conservacion_anos || 5;
    },
    [getCategoryByCode]
  );

  return {
    categories,
    categoriesByType,
    loading,
    error,
    loadCategories,
    getCategoryByCode,
    getCategoriesByType,
    getCategoriesByApplicability,
    getMandatoryCategories,
    getRetentionYears,
  };
}

export function useAssignDocumentCategory() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabase();

  const assignCategory = useCallback(
    async (documentId: string, categoryCode: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from('documents')
          .update({
            legal_category_code: categoryCode,
            updated_at: new Date().toISOString(),
          })
          .eq('id', documentId);

        if (updateError) throw updateError;

        return true;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Error asignando categoría';
        setError(msg);
        console.error('Error assigning category:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const removeCategory = useCallback(
    async (documentId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from('documents')
          .update({
            legal_category_code: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', documentId);

        if (updateError) throw updateError;

        return true;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Error removiendo categoría';
        setError(msg);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  return {
    assignCategory,
    removeCategory,
    loading,
    error,
  };
}

export function getNormativaInfo(
  category: DocumentLegalCategory | undefined
): string {
  if (!category) return '';

  const parts: string[] = [];

  if (category.normativa_referencia) {
    parts.push(`📖 ${category.normativa_referencia}`);
  }

  if (category.plazo_conservacion_anos) {
    parts.push(`⏱️ Conservar por ${category.plazo_conservacion_anos} años`);
  }

  if (category.es_obligatorio) {
    parts.push('⚠️ Documento obligatorio por ley');
  }

  return parts.join(' | ');
}
