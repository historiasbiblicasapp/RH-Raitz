import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  Filter,
  RefreshCw,
  X,
  ChevronRight,
  ChevronLeft,
  Info,
  ExternalLink,
  Activity,
  FileX,
  RotateCcw,
  ShieldAlert,
  ArrowUpRight,
  AlertCircle,
  Download,
  Search,
  Building2,
  Briefcase,
  Users,
  Lock,
  Flame,
  CheckSquare,
  Sparkles
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
  CartesianGrid,
  PieChart,
  Pie
} from 'recharts';
import {
  BottleneckHubResponse,
  BottleneckStalledAdmission,
  BottleneckStepMetrics,
  BottleneckPendingItem,
  BottleneckRejectionReasonItem,
  BottleneckDocTypeRejectionItem,
  BottleneckDimensionItem
} from '../types/index.ts';
import { safeFetchJson } from '../lib/api.ts';

// Componente de Tooltip Informativo Neutro
const InfoTip: React.FC<{ text: string }> = ({ text }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex items-center ml-1">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors"
        aria-label="Informações sobre a métrica"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-50 pointer-events-none leading-relaxed">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
};

export const AdmissionBottleneckPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Estados principais
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BottleneckHubResponse | null>(null);

  // Filtros selecionados
  const period = searchParams.get('period') || '30d';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const role = searchParams.get('role') || 'TODOS';
  const department = searchParams.get('department') || 'TODOS';
  const unit = searchParams.get('unit') || 'TODOS';
  const status = searchParams.get('status') || 'TODOS';
  const situation = searchParams.get('situation') || 'TODAS';

  // Busca e paginação interna da tabela de admissões sem movimentação
  const [stalledSearch, setStalledSearch] = useState('');
  const [stalledPage, setStalledPage] = useState(1);
  const stalledPerPage = 10;

  // Aba ativa de comparações dimensionais
  const [dimensionTab, setDimensionTab] = useState<'role' | 'unit' | 'department'>('role');

  // Carregar dados da API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (period) params.set('period', period);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (role && role !== 'TODOS') params.set('role', role);
      if (department && department !== 'TODOS') params.set('department', department);
      if (unit && unit !== 'TODOS') params.set('unit', unit);
      if (status && status !== 'TODOS') params.set('status', status);
      if (situation && situation !== 'TODAS') params.set('situation', situation);

      const res = await safeFetchJson<BottleneckHubResponse>(`/api/gargalos?${params.toString()}`);
      if (res) {
        setData(res);
      } else {
        setError('Não foi possível carregar os dados de gargalos.');
      }
    } catch (err: any) {
      console.error('Erro ao buscar análise de gargalos:', err);
      setError(err?.message || 'Erro inesperado na análise de gargalos.');
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate, role, department, unit, status, situation]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Atualizar parâmetro na URL
  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== 'TODOS' && value !== 'TODAS') {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams({ period: '30d' }));
  };

  // Filtrar admissões paradas pela busca
  const filteredStalled = useMemo(() => {
    if (!data?.stalledAdmissions) return [];
    if (!stalledSearch.trim()) return data.stalledAdmissions;
    const q = stalledSearch.toLowerCase().trim();
    return data.stalledAdmissions.filter(item => 
      item.employeeName.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      item.role.toLowerCase().includes(q) ||
      item.department.toLowerCase().includes(q) ||
      item.unit.toLowerCase().includes(q)
    );
  }, [data?.stalledAdmissions, stalledSearch]);

  const totalStalledPages = Math.max(1, Math.ceil(filteredStalled.length / stalledPerPage));
  const paginatedStalled = useMemo(() => {
    const start = (stalledPage - 1) * stalledPerPage;
    return filteredStalled.slice(start, start + stalledPerPage);
  }, [filteredStalled, stalledPage]);

  // Exportar dados agregados para CSV
  const handleExportCsv = () => {
    if (!data) return;
    const lines: string[] = [];
    lines.push('ANÁLISE DE GARGALOS DO PROCESSO ADMISSIONAL');
    lines.push(`Período;${data.periodLabel} (${data.dateRange.start.slice(0,10)} a ${data.dateRange.end.slice(0,10)})`);
    lines.push('');
    lines.push('1. INDICADORES PRINCIPAIS');
    lines.push(`Admissões sem movimentação recente;${data.mainCards.stalledAdmissionsCount}`);
    lines.push(`Maior tempo sem movimentação observado;${data.mainCards.maxStalledFormatted}`);
    lines.push(`Tempo médio do processo concluído;${data.mainCards.avgProcessDays !== null ? `${data.mainCards.avgProcessDays} dias` : 'Dados insuficientes'}`);
    lines.push(`Etapa com maior tempo médio;${data.mainCards.slowestStepName || 'N/A'} (${data.mainCards.slowestStepAvgDays !== null ? `${data.mainCards.slowestStepAvgDays} dias` : '—'})`);
    lines.push(`Total de documentos rejeitados;${data.mainCards.rejectedDocsCount}`);
    lines.push(`Documentos com reenvio de nova versão;${data.mainCards.resentDocsCount}`);
    lines.push(`Aprovações internas pendentes;${data.mainCards.pendingApprovalsCount}`);
    lines.push(`Processos com prazo ultrapassado;${data.mainCards.delayedCount}`);
    lines.push('');

    lines.push('2. TEMPO POR ETAPA DO PROCESSO');
    lines.push('Etapa;Processos Analisados;Em Andamento;Tempo Médio (dias);Tempo Médio (horas);Tempo Mediano (dias);Maior Tempo (dias);Paradas na Etapa');
    for (const s of data.stepMetrics) {
      lines.push(`"${s.stepName}";${s.processCount};${s.inProgressCount};${s.avgDays !== null ? s.avgDays : '—'};${s.avgHours !== null ? s.avgHours : '—'};${s.medianDays !== null ? s.medianDays : '—'};${s.maxDays !== null ? s.maxDays : '—'};${s.stalledCount}`);
    }
    lines.push('');

    lines.push('3. ADMISSÕES SEM MOVIMENTAÇÃO RECENTE');
    lines.push('Código;Colaborador;CPF;Cargo;Unidade;Etapa Atual;Situação;Última Movimentação (Data);Ação;Tempo Parado');
    for (const a of data.stalledAdmissions) {
      lines.push(`"${a.code}";"${a.employeeName}";"${a.employeeCpfMasked}";"${a.role}";"${a.unit}";"${a.currentStepName}";"${a.situationLabel}";"${a.lastMovementAt.slice(0, 16).replace('T', ' ')}";"${a.lastMovementAction}";"${a.stalledFormatted}"`);
    }
    lines.push('');

    lines.push('4. REJEIÇÕES POR MOTIVO');
    lines.push('Motivo;Ocorrências;Documentos Afetados;Admissões Afetadas;Percentual');
    for (const r of data.rejectionsByReason) {
      lines.push(`"${r.reason}";${r.count};${r.affectedDocsCount};${r.affectedAdmissionsCount};${r.percent}%`);
    }

    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analise_gargalos_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* CABEÇALHO DA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded">
              Auditoria Operacional
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Bloco 6.3 — Análise de Padrões e Tempos
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 flex items-center gap-2">
            <Layers className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            Análise de Gargalos do Processo Admissional
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Mapeamento analítico de tempos, etapas com retenção, rejeições documentais e admissões ativas sem movimentação recente.
          </p>
        </div>

        {/* NAVEGAÇÃO CRUZADA E EXPORTAÇÃO */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admissoes/operacoes"
            className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5"
          >
            <Clock className="w-4 h-4 text-blue-500" />
            Central de Operações
          </Link>

          <Link
            to="/indicadores"
            className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5"
          >
            <Activity className="w-4 h-4 text-indigo-500" />
            Indicadores & KPIs
          </Link>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!data || loading}
            className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="Exportar dados agregados em CSV"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Exportar CSV
          </button>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            title="Recarregar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* AVISO CONCEITUAL OBRIGATÓRIO (NEUTRALIDADE ANALÍTICA) */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-slate-600 dark:text-slate-400 mt-0.5 shrink-0" />
        <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <span className="font-semibold text-slate-900 dark:text-slate-100">Nota de Neutralidade Analítica:</span>{' '}
          Esta análise apresenta padrões e tempos observados nos dados do processo admissional. Os resultados são estritamente descritivos e não representam, por si só, uma avaliação de desempenho individual de colaboradores, setores ou unidades.
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
            <Filter className="w-4 h-4 text-amber-500" />
            Filtros do Painel
          </div>
          {(period !== '30d' || role !== 'TODOS' || department !== 'TODOS' || unit !== 'TODOS' || status !== 'TODOS' || situation !== 'TODAS') && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Período */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Período de Análise
            </label>
            <select
              value={period}
              onChange={(e) => updateFilter('period', e.target.value)}
              className="w-full text-xs bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="today">Hoje</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="this_month">Este mês</option>
              <option value="last_month">Mês anterior</option>
              <option value="this_year">Este ano</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {/* Cargo */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Cargo
            </label>
            <select
              value={role}
              onChange={(e) => updateFilter('role', e.target.value)}
              className="w-full text-xs bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="TODOS">Todos os Cargos</option>
              {data?.availableFilters.roles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Setor */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Setor / Departamento
            </label>
            <select
              value={department}
              onChange={(e) => updateFilter('department', e.target.value)}
              className="w-full text-xs bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="TODOS">Todos os Setores</option>
              {data?.availableFilters.departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Unidade */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Unidade
            </label>
            <select
              value={unit}
              onChange={(e) => updateFilter('unit', e.target.value)}
              className="w-full text-xs bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="TODOS">Todas as Unidades</option>
              {data?.availableFilters.units.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Status do Processo */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Status da Admissão
            </label>
            <select
              value={status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="w-full text-xs bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="TODOS">Todos os Status</option>
              {data?.availableFilters.statuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Situação Operacional */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Situação Operacional
            </label>
            <select
              value={situation}
              onChange={(e) => updateFilter('situation', e.target.value)}
              className="w-full text-xs bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {data?.availableFilters.situations.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Campos de Data Personalizada se selecionado */}
        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Data Inicial</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => updateFilter('startDate', e.target.value)}
                className="text-xs bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-gray-800 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Data Final</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => updateFilter('endDate', e.target.value)}
                className="text-xs bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-gray-800 dark:text-gray-200"
              />
            </div>
          </div>
        )}
      </div>

      {/* ESTADO DE ERRO */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchData}
            className="px-3 py-1 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100 rounded text-xs font-semibold hover:bg-red-200"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* CARDS PRINCIPAIS DE MÉTRICAS (1 A 8) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Admissões sem movimentação */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center">
              Sem Movimentação
              <InfoTip text="Processos de admissão ativos sem nenhum evento ou interação registrada há 24 horas ou mais." />
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? '...' : (data?.mainCards.stalledAdmissionsCount ?? 0)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ativas há ≥1 dia
            </span>
          </div>
        </div>

        {/* Card 2: Maior tempo sem movimentação */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center">
              Maior Tempo Parado
              <InfoTip text="Maior tempo decorrido desde a última interação observada entre todos os processos ativos." />
            </span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? '...' : (data?.mainCards.maxStalledFormatted ?? 'Dados insuficientes')}
            </span>
          </div>
        </div>

        {/* Card 3: Tempo Médio do Processo */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center">
              Tempo Médio
              <InfoTip text="Média de dias decorridos entre a criação e a conclusão das admissões finalizadas no período." />
            </span>
            <Activity className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? '...' : (data?.mainCards.avgProcessDays !== null ? `${data?.mainCards.avgProcessDays} dias` : 'Dados insuficientes')}
            </span>
          </div>
        </div>

        {/* Card 4: Etapa com Maior Tempo Médio */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center truncate">
              Etapa Mais Longa
              <InfoTip text="Etapa do processo configurado que apresentou o maior tempo médio entre início e conclusão." />
            </span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2">
            <div className="text-base font-bold text-gray-900 dark:text-white truncate">
              {loading ? '...' : (data?.mainCards.slowestStepName || 'Dados insuficientes')}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {data?.mainCards.slowestStepAvgDays !== null ? `Média: ${data?.mainCards.slowestStepAvgDays} dias` : 'Sem conclusão no período'}
            </div>
          </div>
        </div>

        {/* Card 5: Documentos Rejeitados */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center">
              Documentos Rejeitados
              <InfoTip text="Quantidade de recusas documentais efetuadas pela conferência no período filtrado." />
            </span>
            <FileX className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? '...' : (data?.mainCards.rejectedDocsCount ?? 0)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">recusas registradas</span>
          </div>
        </div>

        {/* Card 6: Documentos com Reenvio */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center">
              Documentos com Reenvio
              <InfoTip text="Quantidade de documentos que exigiram nova versão (versão superior a 1) pelo colaborador." />
            </span>
            <RotateCcw className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? '...' : (data?.mainCards.resentDocsCount ?? 0)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">novas versões</span>
          </div>
        </div>

        {/* Card 7: Aprovações Pendentes */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center">
              Aprovações Pendentes
              <InfoTip text="Admissões que se encontram atualmente aguardando validação formal de alçada de gestão (Bloco 5.6)." />
            </span>
            <ShieldAlert className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? '...' : (data?.mainCards.pendingApprovalsCount ?? 0)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">na fila</span>
          </div>
        </div>

        {/* Card 8: Processos Atrasados */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center">
              Prazo Ultrapassado
              <InfoTip text="Processos em andamento cuja data prevista de início de trabalho já passou." />
            </span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? '...' : (data?.mainCards.delayedCount ?? 0)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">processos</span>
          </div>
        </div>
      </div>

      {/* PONTOS DE ATENÇÃO OBSERVADOS (LINGUAGEM NEUTRA) */}
      {data?.attentionPoints && data.attentionPoints.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Pontos de Atenção Observados no Período
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Fatos descritivos identificados automaticamente no fluxo admissional para direcionamento de esforço da equipe:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {data.attentionPoints.map((pt) => (
              <div
                key={pt.id}
                className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 rounded-lg flex items-start gap-2.5"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                    {pt.title}
                  </div>
                  <div className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                    {pt.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ANÁLISE POR ETAPA DO PROCESSO (TABELA & GRÁFICO) */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700 pb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              Tempo Observado por Etapa do Processo
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tempos reais decorridos entre início e conclusão em cada etapa com histórico registrado.
            </p>
          </div>
        </div>

        {/* Gráfico comparativo de médias e medianas */}
        {data?.stepMetrics && (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.stepMetrics.map(s => ({
                  name: s.stepName,
                  'Tempo Médio (dias)': s.avgDays ?? 0,
                  'Tempo Mediano (dias)': s.medianDays ?? 0,
                  'Maior Tempo (dias)': s.maxDays ?? 0
                }))}
                margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [`${val} dias`, '']}
                  contentStyle={{ backgroundColor: '#1f2937', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Tempo Médio (dias)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Tempo Mediano (dias)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Maior Tempo (dias)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabela de Etapas */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 uppercase tracking-wider border-y border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-3 py-2.5">Etapa</th>
                <th className="px-3 py-2.5 text-center">Processos Analisados</th>
                <th className="px-3 py-2.5 text-center">Em Andamento</th>
                <th className="px-3 py-2.5 text-right">Tempo Médio</th>
                <th className="px-3 py-2.5 text-right">Tempo Mediano</th>
                <th className="px-3 py-2.5 text-right flex items-center justify-end">
                  Maior Tempo
                  <InfoTip text="Valor extremo registrado para identificar eventuais casos anômalos. Maior tempo não reflete o fluxo regular." />
                </th>
                <th className="px-3 py-2.5 text-center">Paradas na Etapa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data?.stepMetrics.map((step) => (
                <tr key={step.stepKey} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                  <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[10px] flex items-center justify-center font-bold">
                      {step.stepOrder}
                    </span>
                    {step.stepName}
                  </td>
                  <td className="px-3 py-2.5 text-center text-gray-700 dark:text-gray-300">
                    {step.processCount}
                  </td>
                  <td className="px-3 py-2.5 text-center text-gray-700 dark:text-gray-300">
                    {step.inProgressCount}
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium text-gray-900 dark:text-white">
                    {step.avgDays !== null ? `${step.avgDays} dias (${step.avgHours}h)` : <span className="text-gray-400 italic">Dados insuficientes</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-700 dark:text-gray-300">
                    {step.medianDays !== null ? `${step.medianDays} dias` : <span className="text-gray-400 italic">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right text-amber-700 dark:text-amber-400 font-semibold">
                    {step.maxDays !== null ? `${step.maxDays} dias` : <span className="text-gray-400 italic">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {step.stalledCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        {step.stalledCount} processo(s)
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADMISSÕES ATIVAS SEM MOVIMENTAÇÃO RECENTE (TABELA OPERACIONAL) */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Admissões Ativas Ordenadas por Tempo Sem Movimentação
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Processos em andamento com o tempo decorrido desde o último evento registrado na admissão.
            </p>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar colaborador, código, cargo..."
              value={stalledSearch}
              onChange={(e) => { setStalledSearch(e.target.value); setStalledPage(1); }}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {paginatedStalled.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
            Nenhuma admissão encontrada com os critérios informados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 uppercase tracking-wider border-y border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-3 py-2.5">Código / Link</th>
                  <th className="px-3 py-2.5">Colaborador</th>
                  <th className="px-3 py-2.5">Cargo / Unidade</th>
                  <th className="px-3 py-2.5">Etapa Atual</th>
                  <th className="px-3 py-2.5">Situação Operacional</th>
                  <th className="px-3 py-2.5">Última Movimentação</th>
                  <th className="px-3 py-2.5 text-right">Tempo Parado</th>
                  <th className="px-3 py-2.5 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginatedStalled.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/20">
                    <td className="px-3 py-2.5 font-mono font-medium text-amber-700 dark:text-amber-400">
                      <Link to={`/admissoes/${item.id}`} className="hover:underline flex items-center gap-1">
                        {item.code}
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-gray-900 dark:text-white">{item.employeeName}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{item.employeeCpfMasked}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-gray-800 dark:text-gray-200">{item.role}</div>
                      <div className="text-[11px] text-gray-400">{item.unit}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 font-medium">
                        {item.currentStepName}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        item.situation === 'ATRASADA' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                        item.situation === 'COM_PENDENCIA' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' :
                        item.situation === 'AGUARDANDO_RH' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                        item.situation === 'APROVACAO_PENDENTE' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' :
                        item.situation === 'PROXIMA_DO_PRAZO' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' :
                        item.situation === 'BLOQUEADA' ? 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200' :
                        'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      }`}>
                        {item.situationLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-gray-800 dark:text-gray-200 font-medium">{item.lastMovementAction}</div>
                      <div className="text-[11px] text-gray-400">
                        {new Date(item.lastMovementAt).toLocaleDateString('pt-BR')} às {new Date(item.lastMovementAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`px-2 py-0.5 rounded font-semibold text-xs ${
                        item.stalledDays >= 3 
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300' 
                          : item.stalledDays >= 1 
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' 
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {item.stalledFormatted}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Link
                        to={`/admissoes/${item.id}`}
                        className="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 rounded text-[11px] font-medium transition-colors"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação da Tabela de Parados */}
        {totalStalledPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500">
            <div>
              Mostrando página {stalledPage} de {totalStalledPages} ({filteredStalled.length} registros)
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={stalledPage <= 1}
                onClick={() => setStalledPage(p => Math.max(1, p - 1))}
                className="p-1 border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={stalledPage >= totalStalledPages}
                onClick={() => setStalledPage(p => Math.min(totalStalledPages, p + 1))}
                className="p-1 border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SEÇÃO DUPLA: PENDÊNCIAS OBSERVADAS & ANÁLISE DE REJEIÇÕES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PENDÊNCIAS OBSERVADAS */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                Tipos de Pendências Observadas
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Consistente com os apontamentos da Central de Pendências.
              </p>
            </div>
            <Link
              to="/pendencias"
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              Abrir Central
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 uppercase tracking-wider border-y border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-3 py-2">Tipo de Pendência</th>
                  <th className="px-3 py-2 text-center">Ocorrências</th>
                  <th className="px-3 py-2 text-center">Processos Afetados</th>
                  <th className="px-3 py-2 text-right">Proporção</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data?.pendingsByType.map(p => (
                  <tr key={p.typeKey} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{p.title}</td>
                    <td className="px-3 py-2 text-center font-bold text-gray-700 dark:text-gray-300">{p.count}</td>
                    <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400">{p.affectedAdmissionsCount}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="w-12 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500" style={{ width: `${p.percent}%` }} />
                        </div>
                        <span className="text-[11px] text-gray-500 font-mono">{p.percent}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* REJEIÇÕES POR MOTIVO */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileX className="w-4 h-4 text-orange-500" />
                Motivos de Rejeição de Documentos
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Frequência de recusas pelo motivo oficial apontado pela conferência.
              </p>
            </div>
          </div>

          {data?.rejectionsByReason && data.rejectionsByReason.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
              Nenhuma rejeição de documento registrada no período selecionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 uppercase tracking-wider border-y border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-3 py-2">Motivo</th>
                    <th className="px-3 py-2 text-center">Recusas</th>
                    <th className="px-3 py-2 text-center">Docs Afetados</th>
                    <th className="px-3 py-2 text-right">Percentual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data?.rejectionsByReason.map(r => (
                    <tr key={r.reason} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{r.reason}</td>
                      <td className="px-3 py-2 text-center font-bold text-gray-700 dark:text-gray-300">{r.count}</td>
                      <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400">{r.affectedDocsCount}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-12 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500" style={{ width: `${r.percent}%` }} />
                          </div>
                          <span className="text-[11px] text-gray-500 font-mono">{r.percent}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* REJEIÇÕES POR TIPO DE DOCUMENTO E TEMPOS DE REENVIO / CONFERÊNCIA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rejeições por Tipo de Documento */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
          <div className="border-b border-gray-100 dark:border-gray-700 pb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-500" />
              Taxa de Rejeição por Tipo de Documento
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Percentual objetivo de rejeição e tamanho da amostra avaliada.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 uppercase tracking-wider border-y border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-3 py-2">Tipo de Documento</th>
                  <th className="px-3 py-2 text-center">Submetidos</th>
                  <th className="px-3 py-2 text-center">Rejeitados</th>
                  <th className="px-3 py-2 text-center">Reenvios</th>
                  <th className="px-3 py-2 text-right">Taxa (Amostra)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data?.rejectionsByDocType.map(doc => (
                  <tr key={doc.documentTypeName} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{doc.documentTypeName}</td>
                    <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">{doc.submittedCount}</td>
                    <td className="px-3 py-2 text-center font-semibold text-rose-600 dark:text-rose-400">{doc.rejectedCount}</td>
                    <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400">{doc.resentCount}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">
                      {doc.rejectionRate !== null ? (
                        <span>
                          {doc.rejectionRate}% <span className="text-gray-400 text-[10px]">({doc.rejectedCount} de {doc.submittedCount})</span>
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Métricas de Reenvios e Tempos de Conferência */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
          <div className="border-b border-gray-100 dark:border-gray-700 pb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-indigo-500" />
              Tempos de Reenvio e Conferência Documental
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tempos decorridos entre a recusa e o novo upload, e entre o envio e a validação pelo RH.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Box 1: Tempo de Reenvio */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-xl space-y-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
                Tempo até o Reenvio
              </span>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {data?.resentMetrics.hasSufficientResendData && data.resentMetrics.avgResendTimeHours !== null
                  ? `${data.resentMetrics.avgResendTimeHours} horas`
                  : <span className="text-xs font-normal text-gray-400 italic">Dados insuficientes</span>}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5">
                <div>Mediana: {data?.resentMetrics.medianResendTimeHours !== null ? `${data?.resentMetrics.medianResendTimeHours}h` : '—'}</div>
                <div>Maior tempo: {data?.resentMetrics.maxResendTimeHours !== null ? `${data?.resentMetrics.maxResendTimeHours}h` : '—'}</div>
                <div>Aguardando novo envio: <span className="font-semibold text-amber-600">{data?.resentMetrics.waitingResendCount ?? 0}</span></div>
              </div>
            </div>

            {/* Box 2: Tempo de Conferência do RH */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-xl space-y-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
                Tempo de Conferência RH
              </span>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {data?.reviewTimeMetrics.hasSufficientData && data.reviewTimeMetrics.avgReviewHours !== null
                  ? `${data.reviewTimeMetrics.avgReviewHours} horas`
                  : <span className="text-xs font-normal text-gray-400 italic">Dados insuficientes</span>}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5">
                <div>Mediana: {data?.reviewTimeMetrics.medianReviewHours !== null ? `${data?.reviewTimeMetrics.medianReviewHours}h` : '—'}</div>
                <div>Amostra avaliada: {data?.reviewTimeMetrics.sampleCount ?? 0} documento(s)</div>
                <div>Tempo entre upload e parecer final de aprovação</div>
              </div>
            </div>
          </div>

          {/* Bloqueios Operacionais e Reaberturas */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-rose-500" />
                Processos com Bloqueio Registrado:
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                {data?.blockedMetrics.blockedCount ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                Processos com Reabertura Registrada:
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                {data?.reopenedMetrics.reopenedCount ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* EVOLUÇÃO TEMPORAL DOS PONTOS DE ATENÇÃO (GRÁFICO) */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
        <div className="border-b border-gray-100 dark:border-gray-700 pb-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-500" />
            Evolução Temporal dos Pontos de Atenção
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Acompanhamento histórico de pendências ativas, rejeições, reenvios e processos concluídos no período.
          </p>
        </div>

        {data?.evolution && data.evolution.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.evolution} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRej" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorStalled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', color: '#fff', borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="stalled" name="Sem Movimentação" stroke="#f59e0b" fillOpacity={1} fill="url(#colorStalled)" />
                <Area type="monotone" dataKey="rejections" name="Rejeições" stroke="#ef4444" fillOpacity={1} fill="url(#colorRej)" />
                <Area type="monotone" dataKey="completed" name="Concluídas" stroke="#10b981" fillOpacity={1} fill="url(#colorCompleted)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-gray-500">Dados insuficientes para montagem da evolução temporal.</div>
        )}
      </div>

      {/* COMPARAÇÕES DESCRITIVAS POR DIMENSÃO (CARGO, UNIDADE, SETOR) */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-600" />
              Comparações Descritivas por Dimensão
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Dados agregados para diagnóstico de processos; não constituem avaliação de desempenho.
            </p>
          </div>

          {/* Abas de Dimensão */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setDimensionTab('role')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                dimensionTab === 'role'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              Por Cargo
            </button>
            <button
              type="button"
              onClick={() => setDimensionTab('unit')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                dimensionTab === 'unit'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              Por Unidade
            </button>
            <button
              type="button"
              onClick={() => setDimensionTab('department')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                dimensionTab === 'department'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              Por Setor
            </button>
          </div>
        </div>

        {/* Tabela Descritiva da Dimensão Selecionada */}
        {(() => {
          const items: BottleneckDimensionItem[] = 
            dimensionTab === 'role' ? (data?.byRole || []) :
            dimensionTab === 'unit' ? (data?.byUnit || []) :
            (data?.byDepartment || []);

          if (items.length === 0) {
            return (
              <div className="py-8 text-center text-xs text-gray-500">
                Nenhum agrupamento encontrado para a dimensão selecionada.
              </div>
            );
          }

          return (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 uppercase tracking-wider border-y border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-3 py-2.5">
                      {dimensionTab === 'role' ? 'Cargo' : dimensionTab === 'unit' ? 'Unidade' : 'Setor'}
                    </th>
                    <th className="px-3 py-2.5 text-center">Amostra (Admissões)</th>
                    <th className="px-3 py-2.5 text-right">Tempo Médio Conclusão</th>
                    <th className="px-3 py-2.5 text-center">Pendências</th>
                    <th className="px-3 py-2.5 text-center">Rejeições</th>
                    <th className="px-3 py-2.5 text-center">Paradas Atualmente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {items.map(item => (
                    <tr key={item.name} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                      <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white">{item.name}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-gray-700 dark:text-gray-300">{item.sampleCount}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-gray-900 dark:text-white">
                        {item.avgCompletionDays !== null ? `${item.avgCompletionDays} dias` : <span className="text-gray-400 italic">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-700 dark:text-gray-300">{item.pendingsCount}</td>
                      <td className="px-3 py-2.5 text-center font-medium text-rose-600 dark:text-rose-400">{item.rejectionsCount}</td>
                      <td className="px-3 py-2.5 text-center">
                        {item.stalledCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            {item.stalledCount}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default AdmissionBottleneckPage;
