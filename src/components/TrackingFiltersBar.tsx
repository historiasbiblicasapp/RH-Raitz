import React, { useState } from 'react';
import { Search, Filter, X, Calendar, RefreshCw, ChevronDown } from 'lucide-react';
import { TrackingFilters } from '../types/index.ts';

interface TrackingFiltersBarProps {
  filters: TrackingFilters;
  onFilterChange: (newFilters: Partial<TrackingFilters>) => void;
  onResetFilters: () => void;
  availableRoles: string[];
  availableDepartments: string[];
  availableUnits: string[];
  availableStatuses: string[];
  totalResults: number;
}

export const TrackingFiltersBar: React.FC<TrackingFiltersBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  availableRoles,
  availableDepartments,
  availableUnits,
  availableStatuses,
  totalResults
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasActiveFilters = Boolean(
    (filters.period && filters.period !== 'all') ||
    filters.startDate ||
    filters.endDate ||
    (filters.status && filters.status !== 'TODOS') ||
    (filters.cargo && filters.cargo !== 'TODOS') ||
    (filters.setor && filters.setor !== 'TODOS') ||
    (filters.unidade && filters.unidade !== 'TODOS') ||
    (filters.situacao && filters.situacao !== 'TODOS') ||
    (filters.tempoSemMovimentacao && filters.tempoSemMovimentacao !== 'all') ||
    filters.search
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3.5">
      {/* Linha superior: Busca, Período e Botões Rápidos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Campo de Busca Textual */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-tracking"
            type="text"
            placeholder="Buscar por colaborador, CPF, cargo ou código ADM..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
            className="w-full pl-9.5 pr-4 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium"
          />
        </div>

        {/* Período da Data Prevista */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="font-semibold text-slate-500 text-[11px]">Período:</span>
            <select
              id="select-periodo-tracking"
              value={filters.period || 'all'}
              onChange={(e) => onFilterChange({ period: e.target.value, page: 1 })}
              className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-2"
            >
              <option value="all">Todas as datas</option>
              <option value="today">Hoje</option>
              <option value="next_7">Próximos 7 dias</option>
              <option value="next_15">Próximos 15 dias</option>
              <option value="next_30">Próximos 30 dias</option>
              <option value="overdue">Data ultrapassada</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          <button
            id="btn-toggle-advanced-filters"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
              showAdvanced || hasActiveFilters
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>

          {hasActiveFilters && (
            <button
              id="btn-clear-tracking-filters"
              onClick={onResetFilters}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
              title="Limpar todos os filtros aplicados"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Inputs de Data Personalizada se o período for 'custom' */}
      {filters.period === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs">
          <span className="font-bold text-blue-900">Intervalo da Data Prevista:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">De:</span>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => onFilterChange({ startDate: e.target.value, page: 1 })}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Até:</span>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => onFilterChange({ endDate: e.target.value, page: 1 })}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Painel Avançado de Filtros */}
      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100 text-xs">
          {/* Situação Operacional */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Situação Operacional
            </label>
            <select
              id="select-situacao-tracking"
              value={filters.situacao || 'TODOS'}
              onChange={(e) => onFilterChange({ situacao: e.target.value, page: 1 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="TODOS">Todas as situações</option>
              <option value="data_ultrapassada">Data prevista ultrapassada</option>
              <option value="proxima_admissao">Próxima da admissão</option>
              <option value="aguardando_funcionario">Aguardando funcionário</option>
              <option value="aguardando_rh">Aguardando RH</option>
              <option value="documento_rejeitado">Documento rejeitado</option>
              <option value="sem_movimentacao">Sem movimentação</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          {/* Tempo sem movimentação */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Tempo Sem Movimentação
            </label>
            <select
              id="select-tempo-movimentacao"
              value={filters.tempoSemMovimentacao || 'all'}
              onChange={(e) => onFilterChange({ tempoSemMovimentacao: e.target.value, page: 1 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Qualquer período</option>
              <option value="ate_2">Até 2 dias</option>
              <option value="3_a_5">3 a 5 dias</option>
              <option value="6_a_10">6 a 10 dias</option>
              <option value="mais_10">Mais de 10 dias</option>
            </select>
          </div>

          {/* Status da Admissão */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Status da Admissão
            </label>
            <select
              id="select-status-tracking"
              value={filters.status || 'TODOS'}
              onChange={(e) => onFilterChange({ status: e.target.value, page: 1 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="TODOS">Todos os status</option>
              {availableStatuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Cargo */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Cargo
            </label>
            <select
              id="select-cargo-tracking"
              value={filters.cargo || 'TODOS'}
              onChange={(e) => onFilterChange({ cargo: e.target.value, page: 1 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="TODOS">Todos os cargos</option>
              {availableRoles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Setor */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Setor
            </label>
            <select
              id="select-setor-tracking"
              value={filters.setor || 'TODOS'}
              onChange={(e) => onFilterChange({ setor: e.target.value, page: 1 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="TODOS">Todos os setores</option>
              {availableDepartments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Indicador de Resultados */}
      <div className="flex items-center justify-between pt-2 text-[11px] text-slate-500 border-t border-slate-100/80">
        <span>
          Exibindo <strong>{totalResults}</strong> admissão(ões) conforme critérios de acompanhamento
        </span>
        {hasActiveFilters && (
          <span className="text-blue-600 font-semibold">
            Filtros ativos aplicados
          </span>
        )}
      </div>
    </div>
  );
};
