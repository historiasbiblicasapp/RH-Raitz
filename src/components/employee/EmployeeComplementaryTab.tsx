import React from 'react';
import { 
  FileText, 
  ShieldAlert, 
  Lock, 
  AlertCircle, 
  Info,
  Hash
} from 'lucide-react';
import { Employee } from '../../types/index.ts';

interface EmployeeComplementaryTabProps {
  employee: Employee;
  isEditMode: boolean;
  editData: Partial<Employee>;
  onChangeField: (field: keyof Employee, value: any) => void;
}

export const EmployeeComplementaryTab: React.FC<EmployeeComplementaryTabProps> = ({
  employee,
  isEditMode,
  editData,
  onChangeField
}) => {
  return (
    <div className="space-y-6">
      {/* Aviso LGPD Obrigatório (Seção 18) */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Privacidade & Diretrizes LGPD para Uso Interno do RH</p>
          <p className="text-amber-800 leading-relaxed">
            As anotações administrativas são estritamente restritas à equipe de Recursos Humanos e não são visíveis para o colaborador. <strong>Atenção:</strong> em conformidade com o princípio de necessidade da LGPD, <strong>nunca registre dados sensíveis</strong> como condições de saúde, convicções religiosas ou dados biométricos neste espaço.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600" />
            Controles Administrativos Internos
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">Restrito ao RH</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Identificador Interno / Complementar */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">
              Identificador Interno Complementar
            </label>
            {isEditMode ? (
              <input
                type="text"
                value={editData.internalId || ''}
                onChange={(e) => onChangeField('internalId', e.target.value.trim())}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: ERP-8942 / COD-FILIAL-01"
              />
            ) : (
              <p className="font-mono font-semibold text-slate-800">
                {employee.internalId || '(Nenhum identificador complementar registrado)'}
              </p>
            )}
          </div>

          {/* Matrícula no Sistema */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">
              Matrícula Oficial (Folha de Pagamento)
            </label>
            <p className="font-mono font-semibold text-slate-800 py-1.5">
              {employee.registrationNumber || '(Não cadastrada)'}
            </p>
          </div>

          {/* Observações Administrativas do RH */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-slate-500 font-medium block">
              Observações Administrativas
            </label>
            {isEditMode ? (
              <textarea
                value={editData.administrativeNotes || ''}
                onChange={(e) => onChangeField('administrativeNotes', e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Anotações internas, histórico de tratativas com a liderança ou particularidades da vaga..."
              />
            ) : (
              <div className="text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100 min-h-[100px] whitespace-pre-wrap leading-relaxed">
                {employee.administrativeNotes || 'Nenhuma observação administrativa registrada.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
