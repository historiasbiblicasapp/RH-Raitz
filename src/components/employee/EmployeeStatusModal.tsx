import React, { useState } from 'react';
import { UserCheck, UserX, AlertTriangle, X, Loader2 } from 'lucide-react';
import { Employee, EmployeeStatus } from '../../types/index.ts';

interface EmployeeStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  onConfirm: (newStatus: EmployeeStatus, reason: string) => Promise<void>;
  isSaving: boolean;
}

export const EmployeeStatusModal: React.FC<EmployeeStatusModalProps> = ({
  isOpen,
  onClose,
  employee,
  onConfirm,
  isSaving
}) => {
  const currentStatus: EmployeeStatus = employee.status || (employee.active !== false ? 'Ativo' : 'Inativo');
  const targetStatus: EmployeeStatus = currentStatus === 'Ativo' ? 'Inativo' : 'Ativo';
  const isInactivating = targetStatus === 'Inativo';

  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInactivating && !reason.trim()) {
      setError('Por favor, informe o motivo da inativação.');
      return;
    }

    try {
      setError(null);
      await onConfirm(targetStatus, reason.trim());
      setReason('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar situação do funcionário.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isInactivating ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {isInactivating ? <UserX className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isInactivating ? 'Inativar Funcionário' : 'Reativar Funcionário'}
              </h3>
              <p className="text-xs text-slate-500">
                Colaborador: <strong className="text-slate-800">{employee.name}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
          isInactivating 
            ? 'bg-rose-50 border-rose-200 text-rose-800' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {isInactivating ? (
            <>
              <strong>Atenção:</strong> A inativação não exclui nenhum dado cadastral, documento ou admissão anterior. O colaborador apenas deixará de aparecer como elegível para novas admissões ativas imediatas.
            </>
          ) : (
            <>
              O colaborador voltará para a situação <strong>Ativo</strong> e poderá receber novas vinculações operacionais e novos processos de admissão.
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-slate-600 font-semibold block">
              Motivo da alteração de situação {isInactivating && <span className="text-rose-500">*</span>}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={isInactivating ? 'Ex: Desligamento em 19/09, término de contrato temporário...' : 'Ex: Retorno de licença, readmissão autorizada...'}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
            {error && (
              <p className="text-[11px] text-rose-600 font-medium">{error}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 ${
                isInactivating 
                  ? 'bg-rose-600 hover:bg-rose-700' 
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Atualizando...
                </>
              ) : (
                isInactivating ? 'Confirmar Inativação' : 'Confirmar Reativação'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
