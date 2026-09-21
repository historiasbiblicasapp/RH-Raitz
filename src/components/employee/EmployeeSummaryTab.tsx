import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  User, 
  Briefcase, 
  Building2, 
  Phone, 
  Mail, 
  Calendar,
  ShieldCheck,
  Layers,
  FolderOpen
} from 'lucide-react';
import { Employee, Admission, EmployeeDetailResponse } from '../../types/index.ts';
import { maskCPF, formatPhone } from '../../lib/cpf.ts';
import { StatusBadge } from '../StatusBadge.tsx';

interface EmployeeSummaryTabProps {
  employee: Employee;
  summary: EmployeeDetailResponse['summary'];
  admissions: Admission[];
  allDocumentsCount: number;
  onNavigateToTab: (tab: any) => void;
}

export const EmployeeSummaryTab: React.FC<EmployeeSummaryTabProps> = ({
  employee,
  summary,
  admissions,
  allDocumentsCount,
  onNavigateToTab
}) => {
  const lastAdmission = summary?.lastAdmission || (admissions && admissions[0]) || null;
  const pendingCount = summary?.pendingCount || 0;

  return (
    <div className="space-y-6">
      {/* 4 Indicadores Reais (Seção 7) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Admissões */}
        <div 
          onClick={() => onNavigateToTab('admissoes')}
          className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-blue-300 hover:shadow-xs transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Admissões</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{admissions.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            {admissions.length === 1 ? '1 processo cadastrado' : `${admissions.length} processos no histórico`}
          </p>
        </div>

        {/* Card 2: Documentos Arquivados */}
        <div 
          onClick={() => onNavigateToTab('documentos')}
          className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-blue-300 hover:shadow-xs transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Documentos</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <FolderOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{allDocumentsCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            Recepcionados nas admissões
          </p>
        </div>

        {/* Card 3: Pendências Ativas */}
        <div 
          onClick={() => onNavigateToTab('admissoes')}
          className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-amber-300 hover:shadow-xs transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pendências</span>
            <div className={`p-1.5 rounded-lg ${pendingCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {pendingCount > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </div>
          </div>
          <div className={`text-2xl font-bold ${pendingCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {pendingCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {pendingCount > 0 ? 'Exigem ação do RH ou colaborador' : 'Nenhuma pendência aberta'}
          </p>
        </div>

        {/* Card 4: Última Admissão */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Última Admissão</span>
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          {lastAdmission ? (
            <div>
              <div className="text-sm font-bold text-slate-900 truncate">
                {new Date(lastAdmission.createdAt).toLocaleDateString('pt-BR')}
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <StatusBadge status={lastAdmission.status} size="sm" />
              </div>
            </div>
          ) : (
            <div className="text-sm font-bold text-slate-400">Nenhuma</div>
          )}
        </div>
      </div>

      {/* Bloco Operacional de Resumo do Colaborador (Seção 7) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel Esquerdo: Dados Gerais Principais */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              Resumo Operacional do Funcionário
            </h3>
            <button
              type="button"
              onClick={() => onNavigateToTab('pessoais')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              Ver Detalhes Pessoais →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 font-medium block">Nome Completo</span>
              <p className="font-semibold text-slate-900 text-sm">{employee.name}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium block">CPF (Mascarado LGPD)</span>
              <p className="font-mono font-bold text-slate-900 text-sm">
                {employee.cpfMasked || maskCPF(employee.cpf)}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium block">Situação Cadastral</span>
              <p className="font-semibold">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  employee.status === 'Ativo' || (employee.active !== false)
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {employee.status || (employee.active !== false ? 'Ativo' : 'Inativo')}
                </span>
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium block">Cargo Atual</span>
              <p className="font-semibold text-slate-900">{employee.role}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium block">Setor / Departamento</span>
              <p className="font-semibold text-slate-800">{employee.department}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium block">Unidade de Lotação</span>
              <p className="font-semibold text-slate-800">{employee.unit}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium block">Telefone Principal</span>
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {employee.phone ? formatPhone(employee.phone) : '(Não informado)'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium block">E-mail Principal</span>
              <p className="font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {employee.email || '(Não informado)'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium block">Data de Cadastro no Sistema</span>
              <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString('pt-BR') : '-'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium block">Última Atualização</span>
              <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {employee.updatedAt ? new Date(employee.updatedAt).toLocaleString('pt-BR') : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Painel Direito: Atalho da Admissão Mais Recente */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                Última Admissão
              </h3>
              {lastAdmission && (
                <StatusBadge status={lastAdmission.status} size="sm" />
              )}
            </div>

            {lastAdmission ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Protocolo / Identificador:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {lastAdmission.id}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Cargo Registrado na Admissão:</span>
                  <span className="font-semibold text-slate-800">
                    {lastAdmission.employee?.role || employee.role}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Início Previsto:</span>
                  <span className="font-semibold text-slate-800">
                    {lastAdmission.employee?.expectedStartDate 
                      ? new Date(lastAdmission.employee.expectedStartDate + 'T00:00:00').toLocaleDateString('pt-BR')
                      : '-'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Progresso Documental:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full" 
                        style={{ width: `${lastAdmission.progressPercent || 0}%` }}
                      />
                    </div>
                    <span className="font-bold text-blue-700 text-xs">
                      {lastAdmission.progressPercent || 0}%
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                <Briefcase className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                Nenhuma admissão vinculada até o momento.
              </div>
            )}
          </div>

          {lastAdmission && (
            <Link
              to={`/admissoes/${lastAdmission.id}`}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs transition border border-blue-200"
            >
              Abrir Processo de Admissão
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
