import { useState, useCallback } from 'react';
import { getSupabase } from '../context/AuthContext';
import type { Empleado, Carga } from '../types/database';

export function useEmpleados() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEmpleados = useCallback(async (empresaId: string) => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('activo', true)
        .order('apellido', { ascending: true });

      if (error) throw error;
      setEmpleados(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  const createEmpleado = useCallback(
    async (empleado: Omit<Empleado, 'id' | 'created_at' | 'updated_at'>) => {
      setLoading(true);

      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('empleados')
          .insert(empleado)
          .select()
          .single();

        if (error) throw error;

        setEmpleados((prev) => [...prev, data]);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateEmpleado = useCallback(
    async (id: string, updates: Partial<Empleado>) => {
      setLoading(true);

      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('empleados')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        setEmpleados((prev) => prev.map((e) => (e.id === id ? data : e)));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const desvincularEmpleado = useCallback(
    async (id: string, motivo: string) => {
      return updateEmpleado(id, {
        activo: false,
        fecha_desvinculacion: new Date().toISOString().split('T')[0],
        motivo_desvinculacion: motivo,
      });
    },
    [updateEmpleado]
  );

  return {
    empleados,
    loading,
    error,
    loadEmpleados,
    createEmpleado,
    updateEmpleado,
    desvincularEmpleado,
  };
}

export function useCargas(empleadoId?: string) {
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCargas = useCallback(async (id: string) => {
    setLoading(true);

    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('cargas')
        .select('*')
        .eq('empleado_id', id)
        .eq('activa', true);

      setCargas(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const addCarga = useCallback(
    async (carga: Omit<Carga, 'id' | 'created_at' | 'updated_at'>) => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('cargas')
        .insert(carga)
        .select()
        .single();

      if (error) throw error;
      setCargas((prev) => [...prev, data]);
      return data;
    },
    []
  );

  return {
    cargas,
    loading,
    loadCargas,
    addCarga,
  };
}
