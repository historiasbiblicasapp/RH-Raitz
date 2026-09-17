import React from 'react';
import { Search, X, Filter, RotateCcw, Calendar } from 'lucide-react';
import { ReportFilterOptions, ReportType } from '../../types/index.ts';

interface ReportFiltersProps {
  filters: ReportFilterOptions;
  onChange: (newFilters: Partial<ReportFilterOptions>) => void;
  onReset: () => void;
  reportType: ReportType;
  availableFilters: {
    roles: string[];
    departments: string[];
    units: string[];
    statuses: string[];
  };
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  filters,
  onChange,
  onReset,
  reportType,
  availableFilters
}) => {
  const isFiltered = Boolean(
    (filters.period && filters.period !== 'all') ||
    (filters.status && filters.status !== 'TODOS') ||
    (filters.cargo && filters.cargo !== 'TODOS') ||
    (filters.setor && filters.setor !== 'TODOS') ||
    (filters.unidade && filters.unidade !== 'TODOS') ||
    (filters.documentStatus && filters.documentStatus !== 'TODOS') ||
    filters.search ||
    filters.startDate ||
    filters.endDate
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
      {/* Linha 1: Período, Busca e Reset */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Campo de Busca Rápida */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="report-search-input"
            type="text"
            placeholder="Buscar por colaborador, CPF, cargo, e-mail ou código..."
            value={filters.search || ''}
            onChange={(e) => onChange({ search: e.target.value, page: 1 })}
            className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
          />
          {filters.search && (
            <button
              id="report-clear-search-btn"
              type="button"
              onClick={() => onChange({ search: '', page: 1 })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Seletor de Período Rápido */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            id="report-period-select"
            value={filters.period || 'all'}
            onChange={(e) => onChange({ period: e.target.value, page: 1 })}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
          >
            <option value="all">Todo o período histórico</option>
            <option value="today">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="this_month">Este mês</option>
            <option value="next_month">Próximo mês</option>
            <option value="custom">Personalizado (Data início / fim)</option>
          </select>

          {isFiltered && (
            <button
              id="report-reset-filters-btn"
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="Limpar todos os filtros"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Período Personalizado (quando selecionado 'custom') */}
      {filters.period === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-600">Intervalo de datas:</span>
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-slate-500">De:</label>
            <input
              id="report-custom-start-date"
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => onChange({ startDate: e.target.value, page: 1 })}
              className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-slate-500">Até:</label>
            <input
              id="report-custom-end-date"
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => onChange({ endDate: e.target.value, page: 1 })}
              className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>
      )}

      {/* Linha 2: Filtros de Domínio (Status, Cargo, Departamento, Unidade) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
        {/* Status da Admissão (apenas se aplicável para o relatório) */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            Status da Admissão
          </label>
          <select
            id="report-status-select"
            value={filters.status || 'TODOS'}
            disabled={reportType === 'concluidas' || reportType === 'canceladas'}
            onChange={(e) => onChange({ status: e.target.value, page: 1 })}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos os status</option>
            {availableFilters.statuses.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Cargo */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            Cargo
          </label>
          <select
            id="report-cargo-select"
            value={filters.cargo || 'TODOS'}
            onChange={(e) => onChange({ cargo: e.target.value, page: 1 })}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos os cargos</option>
            {availableFilters.roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Departamento / Setor */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            Departamento
          </label>
          <select
            id="report-setor-select"
            value={filters.setor || 'TODOS'}
            onChange={(e) => onChange({ setor: e.target.value, page: 1 })}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos os setores</option>
            {availableFilters.departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Unidade ou Status de Documento dependendo da aba */}
        {reportType === 'documentos' ? (
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Status do Documento
            </label>
            <select
              id="report-document-status-select"
              value={filters.documentStatus || 'TODOS'}
              onChange={(e) => onChange({ documentStatus: e.target.value, page: 1 })}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Todos os status</option>
              <option value="Aprovado">Aprovado</option>
              <option value="Em análise">Em análise</option>
              <option value="Reenviado">Reenviado</option>
              <option value="Não enviado">Não enviado</option>
              <option value="Rejeitado">Rejeitado</option>
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Unidade
            </label>
            <select
              id="report-unidade-select"
              value={filters.unidade || 'TODOS'}
              onChange={(e) => onChange({ unidade: e.target.value, page: 1 })}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Todas as unidades</option>
              {availableFilters.units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
