import React from 'react';
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileCheck2, 
  TrendingUp, 
  AlertCircle 
} from 'lucide-react';
import { ReportIndicators, ReportType } from '../../types/index.ts';

interface ReportKPIsProps {
  indicators: ReportIndicators;
  reportType: ReportType;
  periodLabel: string;
}

export const ReportKPIs: React.FC<ReportKPIsProps> = ({
  indicators,
  reportType,
  periodLabel
}) => {
  const safeTotalAdmissions = indicators?.totalAdmissions ?? 0;
  const safeInProgress = indicators?.inProgressAdmissions ?? 0;
  const safeCompleted = indicators?.completedAdmissions ?? 0;
  const safeCompletionRate = indicators?.completionRate ?? 0;
  const safeCancelled = indicators?.cancelledAdmissions ?? 0;
  const safeAvgDays = indicators?.avgDaysToCompletion ?? null;
  const safeApprovalRate = indicators?.documentApprovalRate ?? 0;
  const safeApprovedDocs = indicators?.approvedDocuments ?? 0;
  const safeTotalDocs = indicators?.totalDocuments ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Total Admissões */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Admissões
          </span>
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-slate-900">{safeTotalAdmissions}</span>
          <span className="text-[11px] text-slate-400 font-medium truncate">no filtro</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-400 truncate">
          {periodLabel}
        </div>
      </div>

      {/* 2. Em Andamento */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Em Andamento
          </span>
          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-amber-600">{safeInProgress}</span>
          <span className="text-[11px] text-slate-400 font-medium">ativas</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          Aguardando docs / análise
        </div>
      </div>

      {/* 3. Concluídas & Taxa */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Concluídas
          </span>
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-emerald-600">{safeCompleted}</span>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
            {safeCompletionRate}%
          </span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          Taxa de conclusão
        </div>
      </div>

      {/* 4. Canceladas */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Canceladas
          </span>
          <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
            <XCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-slate-700">{safeCancelled}</span>
          <span className="text-[11px] text-slate-400 font-medium">
            {safeTotalAdmissions > 0 ? `${Math.round((safeCancelled / safeTotalAdmissions) * 100)}%` : '0%'}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          Desistências / canceladas
        </div>
      </div>

      {/* 5. Tempo Médio até Conclusão */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Tempo Médio
          </span>
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-blue-600">
            {safeAvgDays !== null && safeAvgDays !== undefined ? safeAvgDays : '—'}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            {safeAvgDays !== null && safeAvgDays !== undefined ? 'dias' : ''}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500 truncate">
          Para fechamento total
        </div>
      </div>

      {/* 6. Conformidade Documental */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Docs Aprovados
          </span>
          <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
            <FileCheck2 className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-teal-600">
            {safeApprovalRate}%
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            ({safeApprovedDocs}/{safeTotalDocs})
          </span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500 truncate">
          Aprovação documental
        </div>
      </div>
    </div>
  );
};
