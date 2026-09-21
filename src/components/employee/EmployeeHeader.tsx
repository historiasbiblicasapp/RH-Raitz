import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  User, 
  Briefcase, 
  Building2, 
  Calendar, 
  Clock, 
  Edit3, 
  Eye, 
  UserCheck, 
  UserX,
  ShieldCheck,
  Save,
  X,
  Loader2
} from 'lucide-react';
import { Employee, EmployeeStatus } from '../../types/index.ts';
import { maskCPF } from '../../lib/cpf.ts';

interface EmployeeHeaderProps {
  employee: Employee;
  isEditMode: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  onToggleEditMode: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onOpenStatusModal: () => void;
}

export const EmployeeHeader: React.FC<EmployeeHeaderProps> = ({
  employee,
  isEditMode,
  isSaving,
  hasUnsavedChanges,
  onToggleEditMode,
  onSave,
  onCancelEdit,
  onOpenStatusModal
}) => {
  const navigate = useNavigate();
  const isActive = employee.status ? employee.status === 'Ativo' : (employee.active !== false);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
      {/* Barra superior de navegação e ações */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <button
          type="button"
          onClick={() => navigate('/funcionarios')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar para Lista de Funcionários
        </button>

        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <button
                type="button"
                onClick={onCancelEdit}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                Cancelar Edição
              </button>

              <button
                type="button"
                onClick={onSave}
                disabled={isSaving || !hasUnsavedChanges}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onOpenStatusModal}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  isActive 
                    ? 'border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100' 
                    : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                }`}
                title={isActive ? 'Inativar funcionário no sistema' : 'Reativar funcionário'}
              >
                {isActive ? (
                  <>
                    <UserX className="w-3.5 h-3.5" />
                    Inativar Funcionário
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    Reativar Funcionário
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onToggleEditMode}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Editar Ficha
              </button>
            </>
          )}
        </div>
      </div>

      {/* Conteúdo do Cabeçalho conforme Bloco 5.2 Item 5 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
            {employee.name.charAt(0).toUpperCase()}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {employee.name}
              </h1>

              {/* Status do Funcionário */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                isActive 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                Status: {employee.status || (isActive ? 'Ativo' : 'Inativo')}
              </span>

              {isEditMode && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[11px] font-bold">
                  Modo de Edição Ativo
                </span>
              )}
            </div>

            {employee.socialName && (
              <p className="text-xs text-slate-500">
                Nome Social: <span className="font-medium text-slate-700">{employee.socialName}</span>
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium pt-1">
              <span>
                CPF: <strong className="font-mono text-slate-800">{employee.cpfMasked || maskCPF(employee.cpf)}</strong>
              </span>

              {employee.registrationNumber && (
                <>
                  <span>•</span>
                  <span>
                    Matrícula: <strong className="font-mono text-slate-800">{employee.registrationNumber}</strong>
                  </span>
                </>
              )}

              <span>•</span>
              <span className="flex items-center gap-1 text-slate-700">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                Cargo: <strong className="text-slate-900">{employee.role}</strong>
              </span>

              <span>•</span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Setor: <strong className="text-slate-800">{employee.department}</strong>
              </span>

              <span>•</span>
              <span>
                Unidade: <strong className="text-slate-800">{employee.unit}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Metadados de Data de Cadastro e Atualização */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs text-slate-500 space-y-1 self-start lg:self-auto shrink-0 min-w-[200px]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Cadastrado em:
            </span>
            <span className="font-semibold text-slate-700">
              {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString('pt-BR') : '-'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Atualizado em:
            </span>
            <span className="font-semibold text-slate-700">
              {employee.updatedAt ? new Date(employee.updatedAt).toLocaleDateString('pt-BR') : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
