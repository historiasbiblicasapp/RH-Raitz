import React from 'react';
import { AlertTriangle, CheckCircle, X, FileText } from 'lucide-react';
import { DocumentTypeItem } from '../types/index.ts';

interface DocumentTypeStatusModalProps {
  isOpen: boolean;
  documentType: DocumentTypeItem | null;
  targetActive: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DocumentTypeStatusModal: React.FC<DocumentTypeStatusModalProps> = ({
  isOpen,
  documentType,
  targetActive,
  isLoading = false,
  onClose,
  onConfirm
}) => {
  if (!isOpen || !documentType) return null;

  const isDeactivating = !targetActive;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-doctype-modal-title"
    >
      <div 
        id="document-type-status-modal"
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
          <h3 id="status-doctype-modal-title" className="text-base font-bold text-slate-900">
            {isDeactivating ? 'Desativar tipo de documento?' : 'Ativar tipo de documento?'}
          </h3>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            {isDeactivating
              ? 'Este documento deixará de estar disponível para novas configurações, mas será preservado nos processos de admissão existentes.'
              : 'Este documento voltará a estar disponível para seleção e novas admissões.'}
          </p>

          <div className="mt-3.5 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">{documentType.name}</span>
                <span className="text-[11px] text-slate-500">Categoria: {documentType.category}</span>
              </div>
            </div>
            <span 
              className={`text-[11px] px-2 py-0.5 rounded-md font-semibold border ${
                documentType.active
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              Status atual: {documentType.active ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            id="btn-confirm-doctype-status"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
              isDeactivating
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isLoading ? (
              <span>Processando...</span>
            ) : isDeactivating ? (
              <span>Sim, desativar documento</span>
            ) : (
              <span>Sim, ativar documento</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
