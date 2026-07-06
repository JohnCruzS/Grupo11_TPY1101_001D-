import { useEffect, useState } from 'react';
import { X, BarChart3 } from 'lucide-react';
import { DocumentTrackingPanel } from './DocumentTrackingPanel';

interface Props {
  documentId: string | null;
  onClose: () => void;
}

export function DocumentTrackingModal({ documentId, onClose }: Props) {
  if (!documentId) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">

        <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Estadísticas del Documento
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <DocumentTrackingPanel documentId={documentId} />
        </div>
      </div>
    </div>
  );
}
