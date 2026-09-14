import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Info } from 'lucide-react';
import { JobPosition, JobPositionDocument } from '../types/index.ts';
import { safeFetchJson } from '../lib/api.ts';

interface RemoveJobPositionDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobPosition: JobPosition;
  documentItem: JobPositionDocument | null;
  onSuccess: (removedDoc: JobPositionDocument) => void;
}

export const RemoveJobPositionDocModal: React.FC<RemoveJobPositionDocModalProps> = ({
  isOpen,
  onClose,
  jobPosition,
  documentItem,
  onSuccess
}) => {
  const [removing, setRemoving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !documentItem) return null;

  const docName = documentItem.document_type?.name || 'Documento';

  const handleConfirmRemove = async () => {
    setRemoving(true);
    setError(null);

    try {
      const response = await safeFetchJson<{ document: JobPositionDocument; message: string }>(
        `/api/job-position-documents/${documentItem.id}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response && response.document) {
        onSuccess(response.document);
        onClose();
      } else {
        throw new Error('Falha ao remover documento do checklist.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao remover documento.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Topo com ícone de aviso */}
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-4 mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h3 className="text-base font-bold text-slate-900 text-center">
            Remover documento do checklist?
          </h3>

          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 text-center">
            <div className="font-semibold text-slate-800 text-sm">{docName}</div>
            <div className="text-slate-500">
              Cargo: <span className="font-medium text-slate-700">{jobPosition.name}</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-800 leading-relaxed">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Este documento <strong>não será mais solicitado</strong> para novas admissões deste cargo.
              <br />
              <span className="text-amber-700">As admissões já existentes não serão alteradas.</span>
            </span>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {error}
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={removing}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            id="btn-confirm-remove-doc"
            onClick={handleConfirmRemove}
            disabled={removing}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            {removing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Removendo...
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                Sim, remover do checklist
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
