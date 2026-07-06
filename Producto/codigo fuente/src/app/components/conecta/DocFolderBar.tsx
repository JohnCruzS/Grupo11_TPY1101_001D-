import { useState } from 'react';
import { Folder, FolderPlus, Pencil, Trash2, Check, X, Settings2 } from 'lucide-react';
import type { DocFolder } from '../../hooks/useDocFolders';

interface Props {
  folders: DocFolder[];
  selected: string;
  counts: Record<string, number>;
  onSelect: (value: string) => void;
  onAdd: (nombre: string) => void;
  onRename: (id: string, nombre: string) => void;
  onDelete: (id: string) => void;
}

export function DocFolderBar({
  folders,
  selected,
  counts,
  onSelect,
  onAdd,
  onRename,
  onDelete,
}: Props) {
  const [managing, setManaging] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const chip = (value: string, label: string, count: number) => {
    const active = selected === value;
    return (
      <button
        key={value}
        onClick={() => onSelect(value)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition"
        style={{
          backgroundColor: active ? '#091f34' : '#f1f5f9',
          color: active ? 'white' : '#475569',
          fontFamily: "'Inter', sans-serif",
          fontWeight: active ? 600 : 400,
          border: '1px solid ' + (active ? '#091f34' : '#e2e8f0'),
        }}
      >
        {value !== 'all' && value !== 'none' && <Folder size={13} />}
        {label}
        <span style={{ opacity: 0.7 }}>({count})</span>
      </button>
    );
  };

  const startEdit = (f: DocFolder) => {
    setEditingId(f.id);
    setEditName(f.nombre);
  };

  const commitEdit = () => {
    if (editingId && editName.trim()) onRename(editingId, editName);
    setEditingId(null);
    setEditName('');
  };

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        {chip('all', 'Todos', counts.all || 0)}
        {folders.map((f) => chip(f.id, f.nombre, counts[f.id] || 0))}
        {chip('none', 'Sin carpeta', counts.none || 0)}
        <button
          onClick={() => setManaging((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
          style={{
            backgroundColor: managing ? '#eff6ff' : 'transparent',
            color: '#2563eb',
            border: '1px dashed #93c5fd',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <Settings2 size={13} />
          Gestionar carpetas
        </button>
      </div>

      {managing && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">

          <div className="flex items-center gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) {
                  onAdd(newName);
                  setNewName('');
                }
              }}
              placeholder="Nueva carpeta…"
              className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button
              onClick={() => {
                if (newName.trim()) {
                  onAdd(newName);
                  setNewName('');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <FolderPlus size={14} />
              Crear
            </button>
          </div>

          {folders.length === 0 ? (
            <p className="text-xs text-gray-400">No hay carpetas.</p>
          ) : (
            <div className="divide-y divide-gray-200">
              {folders.map((f) => (
                <div key={f.id} className="flex items-center gap-2 py-1.5">
                  <Folder size={14} className="text-gray-400 flex-shrink-0" />
                  {editingId === f.id ? (
                    <>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="flex-1 px-2 py-1 rounded border border-gray-300 text-sm"
                      />
                      <button
                        onClick={commitEdit}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Check size={15} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                      >
                        <X size={15} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-gray-700">
                        {f.nombre}
                      </span>
                      <button
                        onClick={() => startEdit(f)}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Renombrar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(`¿Eliminar la carpeta "${f.nombre}"? Los documentos no se borran, solo quedan sin carpeta.`)
                          ) {
                            onDelete(f.id);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
