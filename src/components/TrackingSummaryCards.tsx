import React from 'react';
import { 
  Calendar, 
  AlertTriangle, 
  UserCheck, 
  FileCheck2, 
  Hourglass, 
  CheckCircle2 
} from 'lucide-react';
import { TrackingSummary } from '../types/index.ts';

interface TrackingSummaryCardsProps {
  summary: TrackingSummary;
  activeQuickFilter: string | null;
  onSelectQuickFilter: (filterKey: string) => void;
}

export const TrackingSummaryCards: React.FC<TrackingSummaryCardsProps> = ({
  summary,
  activeQuickFilter,
  onSelectQuickFilter
}) => {
  const cards = [
    {
      key: 'upcoming',
      label: 'Próximas Admissões',
      count: summary.upcomingCount,
      subtitle: 'Início nos próximos 15 dias',
      icon: Calendar,
      borderColor: 'hover:border-blue-300',
      activeBorder: 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20',
      iconBg: 'bg-blue-100 text-blue-700',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      key: 'overdue',
      label: 'Data Prevista Ultrapassada',
      count: summary.overdueCount,
      subtitle: 'Processos pendentes pós-data',
      icon: AlertTriangle,
      borderColor: 'hover:border-amber-300',
      activeBorder: 'border-amber-600 bg-amber-50/40 ring-2 ring-amber-500/20',
      iconBg: 'bg-amber-100 text-amber-700',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200'
    },
    {
      key: 'waiting_employee',
      label: 'Aguardando Funcionário',
      count: summary.waitingEmployeeCount,
      subtitle: 'Envio ou correção de docs',
      icon: UserCheck,
      borderColor: 'hover:border-indigo-300',
      activeBorder: 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20',
      iconBg: 'bg-indigo-100 text-indigo-700',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    },
    {
      key: 'waiting_rh',
      label: 'Aguardando RH',
      count: summary.waitingRhCount,
      subtitle: 'Prontos para conferência',
      icon: FileCheck2,
      borderColor: 'hover:border-sky-300',
      activeBorder: 'border-sky-600 bg-sky-50/40 ring-2 ring-sky-500/20',
      iconBg: 'bg-sky-100 text-sky-700',
      badgeBg: 'bg-sky-50 text-sky-700 border-sky-200'
    },
    {
      key: 'no_movement',
      label: 'Sem Movimentação',
      count: summary.noMovementCount,
      subtitle: 'Sem atividade há 3+ dias',
      icon: Hourglass,
      borderColor: 'hover:border-slate-300',
      activeBorder: 'border-slate-600 bg-slate-100/60 ring-2 ring-slate-400/20',
      iconBg: 'bg-slate-100 text-slate-700',
      badgeBg: 'bg-slate-50 text-slate-700 border-slate-200'
    },
    {
      key: 'completed',
      label: 'Concluídas',
      count: summary.completedCount,
      subtitle: 'Processos finalizados',
      icon: CheckCircle2,
      borderColor: 'hover:border-emerald-300',
      activeBorder: 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500/20',
      iconBg: 'bg-emerald-100 text-emerald-700',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
      {cards.map((c) => {
        const Icon = c.icon;
        const isActive = activeQuickFilter === c.key;

        return (
          <button
            key={c.key}
            id={`card-filter-${c.key}`}
            onClick={() => onSelectQuickFilter(c.key)}
            className={`text-left p-4 rounded-2xl bg-white border transition-all duration-150 cursor-pointer shadow-xs ${
              isActive
                ? c.activeBorder
                : `border-slate-200 ${c.borderColor} hover:shadow-sm`
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className={`p-2 rounded-xl ${c.iconBg}`}>
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {c.count}
              </span>
            </div>
            <div className="text-xs font-bold text-slate-800 tracking-tight leading-snug">
              {c.label}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 leading-tight line-clamp-1">
              {c.subtitle}
            </div>
          </button>
        );
      })}
    </div>
  );
};
