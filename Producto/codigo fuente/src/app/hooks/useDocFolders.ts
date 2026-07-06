import { useCallback, useEffect, useState } from 'react';
import { readSetting, writeSetting } from '../utils/siteSettings';

export interface DocFolder {
  id: string;
  nombre: string;
}

export interface DocFoldersState {
  folders: DocFolder[];
  assignments: Record<string, string>;
}

export const DEFAULT_FOLDERS: DocFolder[] = [
  { id: 'contratos', nombre: 'Contratos' },
  { id: 'liquidaciones', nombre: 'Liquidaciones' },
  { id: 'anexos', nombre: 'Anexos' },
  { id: 'otros', nombre: 'Otros' },
];

const keyFor = (userId: string) => `doc_folders:${userId}`;

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useDocFolders(userId: string | undefined) {
  const [state, setState] = useState<DocFoldersState>({
    folders: DEFAULT_FOLDERS,
    assignments: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    readSetting<DocFoldersState>(keyFor(userId)).then((data) => {
      if (cancelled) return;
      if (data && Array.isArray(data.folders)) {
        setState({
          folders: data.folders,
          assignments: data.assignments || {},
        });
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const persist = useCallback(
    (next: DocFoldersState) => {
      setState(next);
      if (userId) writeSetting(keyFor(userId), next);
    },
    [userId]
  );

  const addFolder = useCallback(
    (nombre: string) => {
      const clean = nombre.trim();
      if (!clean) return;
      persist({
        ...state,
        folders: [...state.folders, { id: genId(), nombre: clean }],
      });
    },
    [state, persist]
  );

  const renameFolder = useCallback(
    (id: string, nombre: string) => {
      const clean = nombre.trim();
      if (!clean) return;
      persist({
        ...state,
        folders: state.folders.map((f) =>
          f.id === id ? { ...f, nombre: clean } : f
        ),
      });
    },
    [state, persist]
  );

  const deleteFolder = useCallback(
    (id: string) => {
      const assignments: Record<string, string> = {};
      for (const [docId, folderId] of Object.entries(state.assignments)) {
        if (folderId !== id) assignments[docId] = folderId;
      }
      persist({
        folders: state.folders.filter((f) => f.id !== id),
        assignments,
      });
    },
    [state, persist]
  );

  const assign = useCallback(
    (docId: string, folderId: string | null) => {
      const assignments = { ...state.assignments };
      if (folderId) assignments[docId] = folderId;
      else delete assignments[docId];
      persist({ ...state, assignments });
    },
    [state, persist]
  );

  return {
    folders: state.folders,
    assignments: state.assignments,
    loading,
    addFolder,
    renameFolder,
    deleteFolder,
    assign,
  };
}
