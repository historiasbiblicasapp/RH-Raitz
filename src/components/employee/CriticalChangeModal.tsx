import React from 'react';
import { AlertTriangle, ShieldAlert, Check, X, Loader2 } from 'lucide-react';

interface CriticalChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  criticalFieldsChanged: Array<{ label: string; from: string; to: string }>;
  isSaving: boolean;
}

export const CriticalChangeModal: React.FC<CriticalChangeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  criticalFieldsChanged,
  isSaving
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-xl shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              Confirmar Alterações Estruturais
            </h3>
            <p className="text-xs text-slate-500">
              Você está alterando informações cadastrais críticas do colaborador. Por favor, revise antes de prosseguir.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Campos com impacto cadastral:
          </span>
          <div className="divide-y divide-slate-200/60 max-h-48 overflow-y-auto">
            {criticalFieldsChanged.map((item, idx) => (
              <div key={idx} className="py-2 first:pt-0 last:pb-0 space-y-1">
                <span className="font-bold text-slate-800 block">{item.label}</span>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-400 line-through truncate max-w-[140px]">{item.from}</span>
                  <span className="text-slate-400">→</span>
                  <span className="font-bold text-blue-700 truncate max-w-[160px]">{item.to}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Esta ação será gravada permanentemente na trilha de auditoria do sistema com o seu usuário responsável.
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition disabled:opacity-50"
          >
            Revisar Campos
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Confirmar e Salvar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
