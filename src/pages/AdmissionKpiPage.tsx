import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Users,
  Building2,
  Briefcase,
  Layers,
  Filter,
  RefreshCw,
  X,
  ChevronRight,
  ChevronLeft,
  Info,
  ArrowUpRight,
  ShieldCheck,
  FileCheck,
  ExternalLink,
  Ban,
  Activity,
  UserCheck,
  CheckSquare
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';
import {
  KpiHubResponse,
  KpiFilters,
  KpiEvolutionPoint,
  KpiDistributionItem,
  KpiByDimensionItem
} from '../types/index.ts';
import { safeFetchJson } from '../lib/api.ts';

// Componente de Tooltip Explicativo com Ícone (i)
const KpiInfoTooltip: React.FC<{ text: string }> = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex items-center ml-1">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-slate-400 hover:text-slate-600 focus:outline-hidden transition-colors"
        aria-label="Informações sobre o indicador"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-slate-900 text-white text-[11px] leading-relaxed rounded-lg shadow-xl z-50 pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
};

export const AdmissionKpiPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Estados
  const [data, setData] = useState<KpiHubResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Parâmetros da URL
  const period = searchParams.get('period') || '30d';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const role = searchParams.get('role') || 'TODOS';
  const department = searchParams.get('department') || 'TODOS';
  const unit = searchParams.get('unit') || 'TODOS';
  const status = searchParams.get('status') || 'TODOS';
  const situation = searchParams.get('situation') || 'TODAS';
  const responsible = searchParams.get('responsible') || 'TODOS';

  // Estados locais para inputs de data personalizada
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);

  // Carregar dados
  const fetchKpis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (period) q.set('period', period);
      if (period === 'custom') {
        if (startDate) q.set('startDate', startDate);
        if (endDate) q.set('endDate', endDate);
      }
      if (role && role !== 'TODOS') q.set('role', role);
      if (department && department !== 'TODOS') q.set('department', department);
      if (unit && unit !== 'TODOS') q.set('unit', unit);
      if (status && status !== 'TODOS') q.set('status', status);
      if (situation && situation !== 'TODAS') q.set('situation', situation);
      if (responsible && responsible !== 'TODOS') q.set('responsible', responsible);

      const res = await safeFetchJson<KpiHubResponse>(`/api/kpis?${q.toString()}`);
      if (res) {
        setData(res);
      }
    } catch (err: any) {
      console.error('Erro ao carregar indicadores:', err);
      setError('Não foi possível carregar os indicadores. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate, role, department, unit, status, situation, responsible]);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  // Atualizador de filtros
  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (!value || value === 'TODOS' || value === 'TODAS') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    setSearchParams(params);
  };

  const handlePeriodChange = (newPeriod: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('period', newPeriod);
    if (newPeriod !== 'custom') {
      params.delete('startDate');
      params.delete('endDate');
    }
    setSearchParams(params);
  };

  const handleApplyCustomDates = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    params.set('period', 'custom');
    if (customStart) params.set('startDate', customStart);
    if (customEnd) params.set('endDate', customEnd);
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setSearchParams({ period: '30d' });
    setCustomStart('');
    setCustomEnd('');
  };

  const hasActiveFilters = Boolean(
    period !== '30d' ||
    role !== 'TODOS' ||
    department !== 'TODOS' ||
    unit !== 'TODOS' ||
    status !== 'TODOS' ||
    situation !== 'TODAS' ||
    responsible !== 'TODOS'
  );

  return (
    <div className="space-y-6 pb-14">
      {/* 1. Cabeçalho Principal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Indicadores e KPIs de Admissão
              </h1>
              <p className="text-sm text-slate-500">
                Acompanhe os principais indicadores do processo admissional com base nos dados reais do sistema.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchKpis()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50"
            title="Atualizar dados analíticos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Atualizar</span>
          </button>

          <Link
            to="/gargalos"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors shadow-xs"
          >
            <Layers className="w-4 h-4 text-amber-600" />
            <span>Análise de Gargalos</span>
          </Link>

          <Link
            to="/operacao"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shadow-xs"
          >
            <Activity className="w-4 h-4" />
            <span>Central de Operações</span>
          </Link>
        </div>
      </div>

      {/* 2. Barra de Filtros de Período e Dimensões */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
        {/* Seletor Rápido de Período */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-medium">
            {[
              { key: 'today', label: 'Hoje' },
              { key: '7d', label: 'Últimos 7 dias' },
              { key: '30d', label: 'Últimos 30 dias' },
              { key: '90d', label: 'Últimos 90 dias' },
              { key: 'this_month', label: 'Este mês' },
              { key: 'last_month', label: 'Mês anterior' },
              { key: 'this_year', label: 'Este ano' },
              { key: 'custom', label: 'Personalizado' }
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handlePeriodChange(item.key)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === item.key
                    ? 'bg-white text-blue-600 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium transition-colors ${
                showFiltersPanel || hasActiveFilters
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtros Adicionais</span>
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-blue-600" />}
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                title="Limpar todos os filtros"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Formulário de Período Personalizado */}
        {period === 'custom' && (
          <form onSubmit={handleApplyCustomDates} className="pt-3 border-t border-slate-100 flex flex-wrap items-end gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Data Inicial:</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Data Final:</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
                required
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Aplicar Período
            </button>
          </form>
        )}

        {/* Painel de Filtros Dimensionais */}
        {showFiltersPanel && data?.availableFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Cargo</label>
              <select
                value={role}
                onChange={(e) => updateFilter('role', e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              >
                <option value="TODOS">Todos os cargos</option>
                {data.availableFilters.roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Departamento / Setor</label>
              <select
                value={department}
                onChange={(e) => updateFilter('department', e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              >
                <option value="TODOS">Todos os setores</option>
                {data.availableFilters.departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Unidade</label>
              <select
                value={unit}
                onChange={(e) => updateFilter('unit', e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              >
                <option value="TODOS">Todas as unidades</option>
                {data.availableFilters.units.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Status da Admissão</label>
              <select
                value={status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              >
                <option value="TODOS">Todos os status</option>
                {data.availableFilters.statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Calculando indicadores e métricas analíticas...</p>
        </div>
      ) : error || !data ? (
        <div className="py-16 text-center text-red-600 bg-white rounded-2xl border border-red-200 p-6">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm font-medium">{error || 'Falha ao carregar indicadores.'}</p>
          <button
            onClick={() => fetchKpis()}
            className="mt-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {/* 3. CARDS DE INDICADORES PRINCIPAIS (1 A 9) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <span>Indicadores Principais</span>
                <span className="text-xs font-normal text-slate-500">({data.periodLabel})</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {/* Card 1: Iniciadas */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 flex items-center">
                    Iniciadas
                    <KpiInfoTooltip text="Total de admissões criadas ou iniciadas dentro do período selecionado." />
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-2">
                  {data.mainCards.started}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Novos processos
                </span>
              </div>

              {/* Card 2: Em Andamento */}
              <Link
                to="/operacao"
                className="p-4 bg-white border border-slate-200 hover:border-blue-400 rounded-xl shadow-xs transition-all block group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 flex items-center">
                    Em Andamento
                    <KpiInfoTooltip text="Admissões com processo ativo (diferente de Concluída e Cancelada)." />
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-600 mt-2">
                  {data.mainCards.inProgress}
                </div>
                <span className="text-[11px] text-blue-600/80 mt-1 block flex items-center gap-0.5">
                  Ver na operação <ArrowUpRight className="w-3 h-3" />
                </span>
              </Link>

              {/* Card 3: Concluídas */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 flex items-center">
                    Concluídas
                    <KpiInfoTooltip text="Admissões finalizadas com prontuário gerado no período selecionado." />
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-emerald-600 mt-2">
                  {data.mainCards.completed}
                </div>
                <span className="text-[11px] text-emerald-600/80 mt-1 block">
                  Finalizadas com sucesso
                </span>
              </div>

              {/* Card 4: Canceladas */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 flex items-center">
                    Canceladas
                    <KpiInfoTooltip text="Admissões descontinuadas ou canceladas durante o período selecionado." />
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Ban className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-700 mt-2">
                  {data.mainCards.cancelled}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Descontinuadas
                </span>
              </div>

              {/* Card 5: Aguardando Funcionário */}
              <Link
                to="/operacao?situation=AGUARDANDO_FUNCIONARIO"
                className="p-4 bg-white border border-slate-200 hover:border-orange-400 rounded-xl shadow-xs transition-all block group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 flex items-center">
                    Aguardando Func.
                    <KpiInfoTooltip text="Admissões onde a próxima ação depende do candidato (envio de dados ou documentos)." />
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-orange-600 mt-2">
                  {data.mainCards.waitingEmployee}
                </div>
                <span className="text-[11px] text-orange-600/80 mt-1 block flex items-center gap-0.5">
                  Filtrar no Hub <ArrowUpRight className="w-3 h-3" />
                </span>
              </Link>

              {/* Card 6: Aguardando RH */}
              <Link
                to="/operacao?situation=AGUARDANDO_RH"
                className="p-4 bg-white border border-slate-200 hover:border-blue-400 rounded-xl shadow-xs transition-all block group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 flex items-center">
                    Aguardando RH
                    <KpiInfoTooltip text="Admissões aguardando ação interna da equipe de RH (conferência, validação)." />
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <FileCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-700 mt-2">
                  {data.mainCards.waitingRh}
                </div>
                <span className="text-[11px] text-blue-600 mt-1 block flex items-center gap-0.5">
                  Conferência pendente <ArrowUpRight className="w-3 h-3" />
                </span>
              </Link>

              {/* Card 7: Com Pendências */}
              <Link
                to="/pendencias"
                className="p-4 bg-white border border-slate-200 hover:border-amber-400 rounded-xl shadow-xs transition-all block group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 flex items-center">
                    Com Pendência
                    <KpiInfoTooltip text="Admissões com documentos rejeitados ou recusas ativas aguardando resolução." />
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-amber-600 mt-2">
                  {data.mainCards.withPendings}
                </div>
                <span className="text-[11px] text-amber-600 mt-1 block flex items-center gap-0.5">
                  Central de Pendências <ArrowUpRight className="w-3 h-3" />
                </span>
              </Link>

              {/* Card 8: Aprovações Pendentes */}
              <Link
                to="/aprovacoes"
                className="p-4 bg-white border border-slate-200 hover:border-purple-400 rounded-xl shadow-xs transition-all block group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 flex items-center">
                    Aprovação Pend.
                    <KpiInfoTooltip text="Admissões que dependem de aprovação interna (gestor, diretoria ou RH)." />
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-purple-700 mt-2">
                  {data.mainCards.pendingApproval}
                </div>
                <span className="text-[11px] text-purple-600 mt-1 block flex items-center gap-0.5">
                  Fila de Aprovação <ArrowUpRight className="w-3 h-3" />
                </span>
              </Link>

              {/* Card 9: Atrasadas */}
              <Link
                to="/operacao?situation=ATRASADA"
                className="p-4 bg-white border border-slate-200 hover:border-red-400 rounded-xl shadow-xs transition-all block group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 flex items-center">
                    Atrasadas
                    <KpiInfoTooltip text="Admissões ainda não concluídas cuja data de início prevista já foi ultrapassada." />
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-red-600 mt-2">
                  {data.mainCards.delayed}
                </div>
                <span className="text-[11px] text-red-600 mt-1 block flex items-center gap-0.5">
                  Prazo vencido <ArrowUpRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
          </div>

          {/* 4. SEÇÃO: TAXAS E PERCENTUAIS & TEMPOS REAIS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Box 1: Taxas e Eficiência */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <span>Taxas e Eficiência Operacional</span>
                  <KpiInfoTooltip text="Taxas calculadas matematicamente a partir dos dados do período. Quando o denominador for zero, exibe-se '—' para evitar distorções." />
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block">Taxa de Conclusão</span>
                  <div className="text-xl font-bold text-emerald-700 mt-1">
                    {data.rates.completionRate !== null ? `${data.rates.completionRate}%` : '—'}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {data.mainCards.completed} concluídas / {data.mainCards.started} iniciadas
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block">Taxa de Cancelamento</span>
                  <div className="text-xl font-bold text-slate-700 mt-1">
                    {data.rates.cancellationRate !== null ? `${data.rates.cancellationRate}%` : '—'}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {data.mainCards.cancelled} canceladas / {data.mainCards.started} iniciadas
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block">Docs Aprovados</span>
                  <div className="text-xl font-bold text-blue-700 mt-1">
                    {data.rates.approvedDocsRate !== null ? `${data.rates.approvedDocsRate}%` : '—'}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {data.documents.approved} aprovados / {data.documents.submitted} enviados
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block">Taxa de Rejeição</span>
                  <div className="text-xl font-bold text-red-600 mt-1">
                    {data.rates.rejectionDocsRate !== null ? `${data.rates.rejectionDocsRate}%` : '—'}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {data.documents.rejected} recusados / {data.documents.submitted} enviados
                  </span>
                </div>
              </div>
            </div>

            {/* Box 2: Indicadores de Tempo Real & Mediana */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <span>Tempo Médio & Mediana de Conclusão</span>
                    <KpiInfoTooltip text="Calculado a partir da diferença real entre data/hora de conclusão e criação da admissão. A mediana é imune a distorções causadas por admissões excepcionalmente longas." />
                  </h3>
                </div>

                {data.timeMetrics.hasSufficientData ? (
                  <div className="grid grid-cols-2 gap-3.5 mb-4">
                    <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl">
                      <span className="text-xs font-medium text-blue-700 block">Tempo Médio</span>
                      <div className="text-xl font-bold text-slate-900 mt-1">
                        {data.timeMetrics.avgCompletionDays} dias
                      </div>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        Equivalente a {data.timeMetrics.avgCompletionHours} horas
                      </span>
                    </div>

                    <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-xl">
                      <span className="text-xs font-medium text-purple-700 block">Tempo Mediano</span>
                      <div className="text-xl font-bold text-slate-900 mt-1">
                        {data.timeMetrics.medianCompletionDays} dias
                      </div>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        Equivalente a {data.timeMetrics.medianCompletionHours} horas
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 mb-4">
                    Ainda não há admissões concluídas com dados suficientes no período selecionado.
                  </div>
                )}
              </div>

              {/* Tempo por Etapa (5.4) */}
              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-2">
                  Tempo Médio por Etapa do Processo Admissional
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                  {data.timeMetrics.stepAvgTimes.map((step) => (
                    <div key={step.stepKey} className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block truncate" title={step.stepName}>
                        {step.stepName.split(' ')[0]}
                      </span>
                      <span className="font-bold text-slate-800 block mt-0.5">
                        {step.hasSufficientData ? `${step.avgDays}d` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 5. SEÇÃO: DOCUMENTOS & APROVAÇÕES INTERNAS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Métricas de Documentos */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Painel de Documentos da Admissão</span>
                  <KpiInfoTooltip text="Acompanha o volume de documentos enviados, em análise, aprovados, recusados e aqueles que exigiram reenvio (com versões > 1)." />
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block">Enviados</span>
                  <span className="text-lg font-bold text-slate-900 mt-1 block">{data.documents.submitted}</span>
                  <span className="text-[10px] text-slate-400">Total submetidos</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block">Aprovados</span>
                  <span className="text-lg font-bold text-emerald-600 mt-1 block">{data.documents.approved}</span>
                  <span className="text-[10px] text-emerald-600/80">Validados pelo RH</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block">Rejeitados</span>
                  <span className="text-lg font-bold text-red-600 mt-1 block">{data.documents.rejected}</span>
                  <span className="text-[10px] text-red-600/80">Recusas ativas</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block">Reenviados</span>
                  <span className="text-lg font-bold text-amber-600 mt-1 block">{data.documents.resent}</span>
                  <span className="text-[10px] text-amber-600/80">Versão &gt; 1 pós recusa</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Não enviados / Pendentes: <strong>{data.documents.pendingOrNotSent}</strong></span>
                <span>Obrigatórios pendentes: <strong className="text-red-600">{data.documents.mandatoryPending}</strong></span>
              </div>
            </div>

            {/* Métricas de Aprovações Internas */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>Painel de Aprovações Internas (5.6)</span>
                  <KpiInfoTooltip text="Métricas consolidadas sobre os pareceres e aprovações formais de alçada (Gestores, Diretoria, RH)." />
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block">Pendentes</span>
                  <span className="text-lg font-bold text-purple-700 mt-1 block">{data.approvals.pending}</span>
                  <span className="text-[10px] text-purple-600">Aguardando parecer</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block">Aprovadas</span>
                  <span className="text-lg font-bold text-emerald-600 mt-1 block">{data.approvals.approved}</span>
                  <span className="text-[10px] text-emerald-600">Alçadas favoráveis</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block">Reprovadas</span>
                  <span className="text-lg font-bold text-red-600 mt-1 block">{data.approvals.rejected}</span>
                  <span className="text-[10px] text-red-600">Recusadas</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block">Reabertas</span>
                  <span className="text-lg font-bold text-slate-700 mt-1 block">{data.approvals.reopened}</span>
                  <span className="text-[10px] text-slate-400">Cancel./Reabertas</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Total de aprovações requeridas: <strong>{data.approvals.total}</strong></span>
                <span>
                  Tempo médio de decisão:{' '}
                  <strong>
                    {data.approvals.hasSufficientData ? `${data.approvals.avgDecisionHours}h` : 'Dados insuficientes'}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* 6. GRÁFICOS VISUAIS: EVOLUÇÃO E DISTRIBUIÇÃO */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Gráfico 1: Evolução Temporal */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Evolução Temporal de Admissões
                  </h3>
                  <p className="text-xs text-slate-500">
                    Admissões iniciadas versus concluídas no período (agrupado por {data.evolutionGrouping === 'day' ? 'dia' : data.evolutionGrouping === 'week' ? 'semana' : 'mês'})
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                {data.evolution && data.evolution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.evolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorStarted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px', border: 'none' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Area type="monotone" dataKey="started" name="Iniciadas" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorStarted)" />
                      <Area type="monotone" dataKey="completed" name="Concluídas" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorCompleted)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Nenhum dado temporal no período selecionado.
                  </div>
                )}
              </div>
            </div>

            {/* Gráfico 2: Distribuição por Situação Operacional */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">
                  Distribuição da Situação Atual
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Admissões ativas por gargalo/situação
                </p>

                <div className="space-y-3">
                  {data.situationDistribution && data.situationDistribution.length > 0 ? (
                    data.situationDistribution.map((sit) => {
                      const totalActive = data.mainCards.inProgress || 1;
                      const percent = Math.round((sit.count / totalActive) * 100);
                      return (
                        <div key={sit.category} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-700 font-medium flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sit.color }} />
                              {sit.label}
                            </span>
                            <span className="text-slate-500 font-semibold">
                              {sit.count} ({percent}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${percent}%`, backgroundColor: sit.color }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 py-6 text-center">
                      Nenhuma admissão em andamento no filtro atual.
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 text-right">
                <Link to="/operacao" className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                  Abrir Central de Operações <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* 7. ANÁLISES DESCRITIVAS: CARGO, UNIDADE E SETOR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Por Cargo */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-500" />
                <span>Admissões por Cargo</span>
              </h3>
              <div className="divide-y divide-slate-100 text-xs max-h-64 overflow-y-auto">
                {data.byRole && data.byRole.length > 0 ? (
                  data.byRole.slice(0, 6).map((item) => (
                    <div key={item.name} className="py-2.5 flex items-center justify-between">
                      <div className="truncate pr-2">
                        <span className="font-medium text-slate-800 block truncate">{item.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {item.inProgress} em curso • {item.completed} concluídas
                        </span>
                      </div>
                      <span className="font-bold text-slate-700 shrink-0">
                        {item.completionRate !== null ? `${item.completionRate}% conc.` : '—'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">Sem dados de cargos.</p>
                )}
              </div>
            </div>

            {/* Por Unidade */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span>Admissões por Unidade</span>
              </h3>
              <div className="divide-y divide-slate-100 text-xs max-h-64 overflow-y-auto">
                {data.byUnit && data.byUnit.length > 0 ? (
                  data.byUnit.slice(0, 6).map((item) => (
                    <div key={item.name} className="py-2.5 flex items-center justify-between">
                      <div className="truncate pr-2">
                        <span className="font-medium text-slate-800 block truncate">{item.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {item.inProgress} em curso • {item.withPendings} com pendência
                        </span>
                      </div>
                      <span className="font-bold text-slate-700 shrink-0">
                        {item.started + item.inProgress} total
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">Sem dados de unidades.</p>
                )}
              </div>
            </div>

            {/* Por Setor */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-500" />
                <span>Admissões por Setor / Dep.</span>
              </h3>
              <div className="divide-y divide-slate-100 text-xs max-h-64 overflow-y-auto">
                {data.byDepartment && data.byDepartment.length > 0 ? (
                  data.byDepartment.slice(0, 6).map((item) => (
                    <div key={item.name} className="py-2.5 flex items-center justify-between">
                      <div className="truncate pr-2">
                        <span className="font-medium text-slate-800 block truncate">{item.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {item.inProgress} ativas • {item.completed} concluídas
                        </span>
                      </div>
                      <span className="font-bold text-slate-700 shrink-0">
                        {item.started} iniciadas
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">Sem dados de departamentos.</p>
                )}
              </div>
            </div>
          </div>

          {/* 8. TABELA DETALHADA COM DRILL-DOWN PARA REGISTROS DE ORIGEM */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Admissões no Período Selecionado ({data.totalDetailed})
                </h3>
                <p className="text-xs text-slate-500">
                  Acesse qualquer registro de origem com um clique para gerenciar pendências, aprovações ou o processo.
                </p>
              </div>

              <Link
                to="/operacao"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Ver na Central de Operações <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Admissão & Colaborador</th>
                    <th className="py-3 px-4">Cargo / Unidade</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Situação Operacional</th>
                    <th className="py-3 px-4">Duração</th>
                    <th className="py-3 px-4">Pendências</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.detailedAdmissions.map((adm) => (
                    <tr key={adm.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{adm.employeeName}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">{adm.code}</span>
                          <span>•</span>
                          <span>{adm.employeeCpfMasked}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium">{adm.role}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{adm.unit}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {adm.status}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[11px] font-semibold text-slate-700">
                          {adm.situationLabel}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {adm.durationDays !== undefined ? (
                          <span className="text-slate-700 font-medium">
                            {adm.durationDays} dias
                          </span>
                        ) : (
                          <span className="text-slate-400">Em curso</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {adm.pendingDocsCount > 0 ? (
                          <span className="text-amber-600 font-bold">
                            {adm.pendingDocsCount} doc(s)
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium">Regular</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/admissoes/${adm.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <span>Abrir</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
