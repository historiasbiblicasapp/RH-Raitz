import React from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import { JobPosition } from '../types/index.ts';

interface JobPositionStatusModalProps {
  isOpen: boolean;
  position: JobPosition | null;
  targetActive: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const JobPositionStatusModal: React.FC<JobPositionStatusModalProps> = ({
  isOpen,
  position,
  targetActive,
  isLoading = false,
  onClose,
  onConfirm
}) => {
  if (!isOpen || !position) return null;

  const isDeactivating = !targetActive;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
    >
      <div 
        id="job-position-status-modal"
        className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between gap-3">
          <div 
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isDeactivating 
                ? 'bg-amber-100 text-amber-600' 
                : 'bg-emerald-100 text-emerald-600'
            }`}
          >
            {isDeactivating ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h3 id="status-modal-title" className="text-base font-bold text-slate-900">
            {isDeactivating ? 'Desativar cargo?' : 'Ativar cargo?'}
          </h3>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            {isDeactivating
              ? 'Este cargo deixará de aparecer como opção para novas admissões, mas continuará preservado nas admissões existentes.'
              : 'Este cargo voltará a aparecer como opção para novas admissões.'}
          </p>

          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 block">{position.name}</span>
              {position.code && (
                <span className="text-[11px] font-mono text-slate-500">{position.code}</span>
              )}
            </div>
            <span 
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                position.active 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              Atualmente {position.active ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            id="btn-cancel-status-modal"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          
          {isDeactivating ? (
            <button
              type="button"
              id="btn-confirm-deactivate-cargo"
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isLoading ? 'Desativando...' : 'Desativar cargo'}
            </button>
          ) : (
            <button
              type="button"
              id="btn-confirm-activate-cargo"
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isLoading ? 'Ativando...' : 'Ativar cargo'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
