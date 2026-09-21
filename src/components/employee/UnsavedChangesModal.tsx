import React from 'react';
import { AlertCircle, ArrowLeft, Trash2 } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onContinueEditing: () => void;
  onDiscardChanges: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onContinueEditing,
  onDiscardChanges
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              Alterações Não Salvas
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Você possui alterações pendentes no cadastro deste funcionário. Se sair agora, todas as modificações não salvas serão perdidas.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onDiscardChanges}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition"
          >
            Descartar Alterações
          </button>

          <button
            type="button"
            onClick={onContinueEditing}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            Continuar Editando
          </button>
        </div>
      </div>
    </div>
  );
};
