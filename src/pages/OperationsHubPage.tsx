import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Activity,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  X,
  Eye,
  SlidersHorizontal,
  ArrowUpDown,
  Building2,
  Briefcase,
  Calendar,
  AlertCircle,
  FileText,
  UserCheck,
  ExternalLink,
  Phone,
  Mail,
  History,
  CheckSquare,
  HelpCircle,
  Layers,
  ArrowRight,
  TrendingUp,
  Zap
} from 'lucide-react';
import {
  OperationalHubItem,
  OperationalHubSummary,
  OperationalHubResponse,
  OperationalHubSituation,
  OperationalPriority,
  AdmissionStatus
} from '../types/index.ts';
import { safeFetchJson } from '../lib/api.ts';

export const OperationsHubPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Estados principais de dados
  const [items, setItems] = useState<OperationalHubItem[]>([]);
  const [attentionItems, setAttentionItems] = useState<OperationalHubItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resumo Operacional (8 KPIs)
  const [summary, setSummary] = useState<OperationalHubSummary>({
    inProgress: 0,
    waitingEmployee: 0,
    waitingRh: 0,
    withPendings: 0,
    pendingApproval: 0,
    nearDeadline: 0,
    delayed: 0,
    blocked: 0,
    total: 0
  });

  // Opções de filtros dinâmicos
  const [filterOptions, setFilterOptions] = useState<{
    roles: string[];
    departments: string[];
    units: string[];
    responsibles: string[];
    statuses: string[];
    situations: { key: string; label: string }[];
  }>({
    roles: [],
    departments: [],
    units: [],
    responsibles: [],
    statuses: [],
    situations: []
  });

  // Drawer / Modal de Diagnóstico Operacional
  const [selectedItem, setSelectedItem] = useState<OperationalHubItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filtros aplicados a partir da URL
  const search = searchParams.get('search') || '';
  const situation = searchParams.get('situation') || 'TODAS';
  const status = searchParams.get('status') || 'TODOS';
  const priority = searchParams.get('priority') || 'TODAS';
  const role = searchParams.get('role') || 'TODOS';
  const department = searchParams.get('department') || 'TODOS';
  const unit = searchParams.get('unit') || 'TODOS';
  const responsible = searchParams.get('responsible') || 'TODOS';
  const period = searchParams.get('period') || 'all';
  const sortBy = searchParams.get('sortBy') || 'priority';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc';
  const currentPage = Number(searchParams.get('page') || '1');
  const [searchTerm, setSearchTerm] = useState(search);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Sincroniza estado de busca quando URL muda
  useEffect(() => {
    setSearchTerm(search);
  }, [search]);

  // Carregamento de dados da Central de Operações
  const fetchOperationsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (situation && situation !== 'TODAS') q.set('situation', situation);
      if (status && status !== 'TODOS') q.set('status', status);
      if (priority && priority !== 'TODAS') q.set('priority', priority);
      if (role && role !== 'TODOS') q.set('role', role);
      if (department && department !== 'TODOS') q.set('department', department);
      if (unit && unit !== 'TODOS') q.set('unit', unit);
      if (responsible && responsible !== 'TODOS') q.set('responsible', responsible);
      if (period && period !== 'all') q.set('period', period);
      if (sortBy) q.set('sortBy', sortBy);
      if (sortOrder) q.set('sortOrder', sortOrder);
      q.set('page', String(currentPage));
      q.set('limit', '10');

      const data = await safeFetchJson<OperationalHubResponse>(`/api/operations?${q.toString()}`);
      if (data) {
        setItems(data.items || []);
        setAttentionItems(data.attentionItems || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.summary) setSummary(data.summary);
        if (data.filters) setFilterOptions(data.filters);
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados da Central de Operações:', err);
      setError('Não foi possível carregar a Central de Operações. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [search, situation, status, priority, role, department, unit, responsible, period, sortBy, sortOrder, currentPage]);

  useEffect(() => {
    fetchOperationsData();
  }, [fetchOperationsData]);

  // Atualizador de filtros na URL
  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (!value || value === 'TODOS' || value === 'TODAS' || value === 'all') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('search', searchTerm.trim());
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(
    search ||
    situation !== 'TODAS' ||
    status !== 'TODOS' ||
    priority !== 'TODAS' ||
    role !== 'TODOS' ||
    department !== 'TODOS' ||
    unit !== 'TODOS' ||
    responsible !== 'TODOS' ||
    period !== 'all'
  );

  // Abre drawer de diagnóstico de uma admissão
  const handleOpenDiagnostic = (item: OperationalHubItem) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  };

  const handleCloseDiagnostic = () => {
    setIsDrawerOpen(false);
    setSelectedItem(null);
  };

  // Helper de badges visuais de situação operacional
  const renderSituationBadge = (sit: OperationalHubSituation, label: string) => {
    switch (sit) {
      case 'BLOQUEADA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
            {label}
          </span>
        );
      case 'ATRASADA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
            {label}
          </span>
        );
      case 'APROVACAO_PENDENTE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            {label}
          </span>
        );
      case 'COM_PENDENCIA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            {label}
          </span>
        );
      case 'AGUARDANDO_RH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            {label}
          </span>
        );
      case 'AGUARDANDO_FUNCIONARIO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            {label}
          </span>
        );
      case 'PROXIMA_DO_PRAZO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-600" />
            {label}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            {label || 'Em dia'}
          </span>
        );
    }
  };

  const renderPriorityBadge = (p: OperationalPriority) => {
    if (p === 'CRITICA') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-600 text-white tracking-wide uppercase">
          Crítica
        </span>
      );
    }
    if (p === 'ALTA') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500 text-white tracking-wide uppercase">
          Alta
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
        Normal
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Cabeçalho Operacional Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Central de Operações do RH
              </h1>
              <p className="text-sm text-slate-500">
                Acompanhe o que precisa ser feito agora, quem precisa agir e os prazos críticos de cada admissão.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchOperationsData()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50"
            title="Atualizar dados operacionais em tempo real"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Atualizar</span>
          </button>

          <Link
            to="/distribuicao"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            title="Distribuição e Gestão de Responsáveis (Bloco 6.4)"
          >
            <Briefcase className="w-4 h-4 text-blue-600" />
            <span>Distribuição</span>
          </Link>

          <Link
            to="/indicadores"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            title="Acessar painel analítico de Indicadores e KPIs"
          >
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Indicadores & KPIs</span>
          </Link>

          <Link
            to="/gargalos"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            title="Mapeamento analítico de gargalos e retenções do processo"
          >
            <Layers className="w-4 h-4 text-amber-600" />
            <span>Análise de Gargalos</span>
          </Link>

          <Link
            to="/configuracoes?tab=automations"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            title="Configuração e monitoramento de rotinas de automação interna (Bloco 6.6)"
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Automações</span>
          </Link>

          <Link
            to="/admissoes/nova"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
          >
            <Users className="w-4 h-4" />
            <span>Nova Admissão</span>
          </Link>
        </div>
      </div>

      {/* 2. Resumo Operacional — Cards com Contadores em Tempo Real */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Card 1: Em Andamento */}
        <button
          onClick={() => updateFilter('situation', 'TODAS')}
          className={`flex flex-col p-3.5 text-left rounded-xl border transition-all text-xs ${
            situation === 'TODAS'
              ? 'bg-blue-50/80 border-blue-400 shadow-xs ring-1 ring-blue-400'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <span className="text-[11px] font-medium text-slate-500">Em andamento</span>
          <span className="text-xl font-bold text-slate-900 mt-1">{summary.inProgress}</span>
          <span className="text-[10px] text-blue-600 mt-1 font-medium flex items-center gap-0.5">
            Total ativas
          </span>
        </button>

        {/* Card 2: Aguardando Funcionário */}
        <button
          onClick={() => updateFilter('situation', 'AGUARDANDO_FUNCIONARIO')}
          className={`flex flex-col p-3.5 text-left rounded-xl border transition-all text-xs ${
            situation === 'AGUARDANDO_FUNCIONARIO'
              ? 'bg-orange-50/80 border-orange-400 shadow-xs ring-1 ring-orange-400'
              : 'bg-white border-slate-200 hover:border-orange-300 shadow-xs'
          }`}
        >
          <span className="text-[11px] font-medium text-slate-500">Aguardando Func.</span>
          <span className="text-xl font-bold text-orange-600 mt-1">{summary.waitingEmployee}</span>
          <span className="text-[10px] text-orange-600/80 mt-1 font-medium">Docs ou dados</span>
        </button>

        {/* Card 3: Aguardando RH */}
        <button
          onClick={() => updateFilter('situation', 'AGUARDANDO_RH')}
          className={`flex flex-col p-3.5 text-left rounded-xl border transition-all text-xs ${
            situation === 'AGUARDANDO_RH'
              ? 'bg-blue-50 border-blue-400 shadow-xs ring-1 ring-blue-400'
              : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
          }`}
        >
          <span className="text-[11px] font-medium text-slate-500">Aguardando RH</span>
          <span className="text-xl font-bold text-blue-700 mt-1">{summary.waitingRh}</span>
          <span className="text-[10px] text-blue-600 mt-1 font-medium">Conferência/Ação</span>
        </button>

        {/* Card 4: Com Pendência */}
        <button
          onClick={() => updateFilter('situation', 'COM_PENDENCIA')}
          className={`flex flex-col p-3.5 text-left rounded-xl border transition-all text-xs ${
            situation === 'COM_PENDENCIA'
              ? 'bg-amber-50 border-amber-400 shadow-xs ring-1 ring-amber-400'
              : 'bg-white border-slate-200 hover:border-amber-300 shadow-xs'
          }`}
        >
          <span className="text-[11px] font-medium text-slate-500">Com pendência</span>
          <span className="text-xl font-bold text-amber-600 mt-1">{summary.withPendings}</span>
          <span className="text-[10px] text-amber-600 mt-1 font-medium">Doc recusado</span>
        </button>

        {/* Card 5: Aprovação Pendente */}
        <button
          onClick={() => updateFilter('situation', 'APROVACAO_PENDENTE')}
          className={`flex flex-col p-3.5 text-left rounded-xl border transition-all text-xs ${
            situation === 'APROVACAO_PENDENTE'
              ? 'bg-purple-50 border-purple-400 shadow-xs ring-1 ring-purple-400'
              : 'bg-white border-slate-200 hover:border-purple-300 shadow-xs'
          }`}
        >
          <span className="text-[11px] font-medium text-slate-500">Aprovação pend.</span>
          <span className="text-xl font-bold text-purple-700 mt-1">{summary.pendingApproval}</span>
          <span className="text-[10px] text-purple-600 mt-1 font-medium">Fila interna</span>
        </button>

        {/* Card 6: Próximas do Prazo */}
        <button
          onClick={() => updateFilter('situation', 'PROXIMA_DO_PRAZO')}
          className={`flex flex-col p-3.5 text-left rounded-xl border transition-all text-xs ${
            situation === 'PROXIMA_DO_PRAZO'
              ? 'bg-yellow-50 border-yellow-400 shadow-xs ring-1 ring-yellow-400'
              : 'bg-white border-slate-200 hover:border-yellow-300 shadow-xs'
          }`}
        >
          <span className="text-[11px] font-medium text-slate-500">Próx. do prazo</span>
          <span className="text-xl font-bold text-yellow-700 mt-1">{summary.nearDeadline}</span>
          <span className="text-[10px] text-yellow-600 mt-1 font-medium">Até 7 dias</span>
        </button>

        {/* Card 7: Atrasadas */}
        <button
          onClick={() => updateFilter('situation', 'ATRASADA')}
          className={`flex flex-col p-3.5 text-left rounded-xl border transition-all text-xs ${
            situation === 'ATRASADA'
              ? 'bg-red-50 border-red-400 shadow-xs ring-1 ring-red-400'
              : 'bg-white border-slate-200 hover:border-red-300 shadow-xs'
          }`}
        >
          <span className="text-[11px] font-medium text-slate-500">Atrasadas</span>
          <span className="text-xl font-bold text-red-600 mt-1">{summary.delayed}</span>
          <span className="text-[10px] text-red-600 mt-1 font-medium">Prazo vencido</span>
        </button>

        {/* Card 8: Bloqueadas */}
        <button
          onClick={() => updateFilter('situation', 'BLOQUEADA')}
          className={`flex flex-col p-3.5 text-left rounded-xl border transition-all text-xs ${
            situation === 'BLOQUEADA'
              ? 'bg-rose-50 border-rose-400 shadow-xs ring-1 ring-rose-400'
              : 'bg-white border-slate-200 hover:border-rose-300 shadow-xs'
          }`}
        >
          <span className="text-[11px] font-medium text-slate-500">Bloqueadas</span>
          <span className="text-xl font-bold text-rose-700 mt-1">{summary.blocked}</span>
          <span className="text-[10px] text-rose-600 mt-1 font-medium">Impedimento</span>
        </button>
      </div>

      {/* 3. Seção "O que precisa de atenção" */}
      {attentionItems && attentionItems.length > 0 && (
        <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  O que precisa de atenção imediata ({attentionItems.length})
                </h2>
                <p className="text-xs text-slate-600">
                  Casos críticos com bloqueios, atrasos de prazo ou pendências que necessitam de intervenção rápida do RH.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {attentionItems.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 hover:border-amber-300 rounded-xl p-4 shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[11px] font-mono font-medium text-slate-400 block">
                        {item.admissionCode}
                      </span>
                      <h3 className="font-semibold text-sm text-slate-900 leading-tight">
                        {item.employeeName}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.employeeRole} • {item.employeeUnit}
                      </p>
                    </div>
                    {renderPriorityBadge(item.priority)}
                  </div>

                  {/* Situação e Alertas */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      {renderSituationBadge(item.situation, item.situationLabel)}
                      <span className="text-[11px] text-slate-500">
                        Resp: <strong className="text-slate-700">{item.responsible}</strong>
                      </span>
                    </div>

                    {item.attentionReasons && item.attentionReasons.length > 0 && (
                      <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 text-xs text-slate-700 space-y-1">
                        {item.attentionReasons.map((reason, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-amber-800 text-[11px]">
                            <span className="text-amber-500 font-bold shrink-0">•</span>
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    Etapa: <span className="font-medium text-slate-700">{item.currentStepName}</span>
                  </div>
                  <button
                    onClick={() => handleOpenDiagnostic(item)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <span>Ver detalhes</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Barra de Filtros Combinados e Busca */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Busca textual */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por colaborador, CPF, matrícula, cargo, setor, unidade ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Buscar
            </button>
          </form>

          {/* Botões de Ação de Filtros */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                showAdvancedFilters || hasActiveFilters
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filtros Operacionais</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-blue-600" />
              )}
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                title="Limpar todos os filtros"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Painel de Filtros Avançados */}
        {showAdvancedFilters && (
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Filtro Situação Operacional */}
            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                Situação Operacional
              </label>
              <select
                value={situation}
                onChange={(e) => updateFilter('situation', e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODAS">Todas as situações</option>
                <option value="AGUARDANDO_FUNCIONARIO">Aguardando Funcionário</option>
                <option value="AGUARDANDO_RH">Aguardando RH</option>
                <option value="COM_PENDENCIA">Com Pendência</option>
                <option value="APROVACAO_PENDENTE">Aprovação Pendente</option>
                <option value="PROXIMA_DO_PRAZO">Próxima do Prazo</option>
                <option value="ATRASADA">Atrasada</option>
                <option value="BLOQUEADA">Bloqueada</option>
                <option value="EM_DIA">Em Dia</option>
              </select>
            </div>

            {/* Filtro Status da Admissão */}
            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                Status da Admissão
              </label>
              <select
                value={status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todos os status</option>
                {filterOptions.statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Filtro Prioridade */}
            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => updateFilter('priority', e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODAS">Todas as prioridades</option>
                <option value="CRITICA">Crítica</option>
                <option value="ALTA">Alta</option>
                <option value="NORMAL">Normal</option>
              </select>
            </div>

            {/* Filtro Responsável Atual */}
            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                Responsável Atual
              </label>
              <select
                value={responsible}
                onChange={(e) => updateFilter('responsible', e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todos os responsáveis</option>
                {filterOptions.responsibles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Filtro Cargo */}
            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                Cargo
              </label>
              <select
                value={role}
                onChange={(e) => updateFilter('role', e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todos os cargos</option>
                {filterOptions.roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Filtro Setor / Departamento */}
            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                Departamento / Setor
              </label>
              <select
                value={department}
                onChange={(e) => updateFilter('department', e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todos os setores</option>
                {filterOptions.departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Filtro Unidade */}
            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                Unidade
              </label>
              <select
                value={unit}
                onChange={(e) => updateFilter('unit', e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todas as unidades</option>
                {filterOptions.units.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* Ordenação */}
            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                Ordenar Por
              </label>
              <select
                value={sortBy}
                onChange={(e) => updateFilter('sortBy', e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="priority">Prioridade & Urgência</option>
                <option value="deadline">Prazo de Início Previsto</option>
                <option value="lastMovement">Última Movimentação</option>
                <option value="name">Nome do Colaborador (A-Z)</option>
                <option value="createdAt">Data de Abertura</option>
              </select>
            </div>
          </div>
        )}

        {/* Barra de Status e Contagem */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>
            Exibindo <strong>{items.length}</strong> de <strong>{total}</strong> admissões operacionais
          </span>
          {hasActiveFilters && (
            <span className="text-blue-600 font-medium">
              Filtros ativos aplicados
            </span>
          )}
        </div>
      </div>

      {/* 5. Lista Operacional de Admissões */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">Carregando dados da operação...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">{error}</p>
            <button
              onClick={() => fetchOperationsData()}
              className="mt-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
            >
              Tentar novamente
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">
              Nenhuma admissão encontrada com os filtros atuais
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Tente redefinir a busca textual ou os filtros operacionais de situação e status para visualizar mais registros.
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors"
              >
                Limpar todos os filtros
              </button>
            )}
          </div>
        ) : (
          <>
            {/* VISUALIZAÇÃO DESKTOP: TABELA OPERACIONAL */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Admissão & Colaborador</th>
                    <th className="py-3.5 px-4">Cargo / Unidade</th>
                    <th className="py-3.5 px-4">Etapa Atual</th>
                    <th className="py-3.5 px-4">Situação Operacional</th>
                    <th className="py-3.5 px-4">Prioridade</th>
                    <th className="py-3.5 px-4">Responsável</th>
                    <th className="py-3.5 px-4">Prazos & Atividade</th>
                    <th className="py-3.5 px-4">Docs</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => handleOpenDiagnostic(item)}
                    >
                      {/* Colaborador & Código */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {item.employeeName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors block">
                              {item.employeeName}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span className="font-mono text-slate-400">{item.admissionCode}</span>
                              <span>•</span>
                              <span>{item.employeeCpfMasked}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cargo e Unidade */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-900 font-medium leading-tight">
                          {item.employeeRole}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {item.employeeUnit}
                        </div>
                      </td>

                      {/* Etapa Atual do Processo 5.4 */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                            {item.currentStepOrder}
                          </span>
                          <span className="font-medium text-slate-800">
                            {item.currentStepName}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Etapa {item.currentStepOrder} de {item.totalSteps}
                        </div>
                      </td>

                      {/* Situação Operacional */}
                      <td className="py-3.5 px-4">
                        {renderSituationBadge(item.situation, item.situationLabel)}
                        {item.needsAttention && (
                          <span className="block text-[10px] text-amber-700 font-medium mt-1">
                            Atenção requerida
                          </span>
                        )}
                      </td>

                      {/* Prioridade */}
                      <td className="py-3.5 px-4">
                        {renderPriorityBadge(item.priority)}
                      </td>

                      {/* Responsável Operacional */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                          {item.responsible}
                        </span>
                      </td>

                      {/* Prazos & Atividade */}
                      <td className="py-3.5 px-4">
                        {item.expectedStartDate ? (
                          <div className="leading-tight">
                            <span className="text-slate-700 font-medium">
                              {new Date(item.expectedStartDate).toLocaleDateString('pt-BR')}
                            </span>
                            {item.isOverdue && item.daysUntilDeadline !== undefined && (
                              <span className="block text-[10px] font-bold text-red-600">
                                Atrasada ({Math.abs(item.daysUntilDeadline)}d)
                              </span>
                            )}
                            {item.isNearDeadline && item.daysUntilDeadline !== undefined && (
                              <span className="block text-[10px] font-medium text-amber-600">
                                Em {item.daysUntilDeadline} dias
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Sem previsão</span>
                        )}
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Mov. há {item.daysWithoutMovement}d
                        </span>
                      </td>

                      {/* Documentos */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${item.documentsSummary.progressPercent}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-medium text-slate-600">
                            {item.documentsSummary.approved}/{item.documentsSummary.total}
                          </span>
                        </div>
                        {item.documentsSummary.rejected > 0 && (
                          <span className="text-[10px] font-semibold text-red-600 block mt-0.5">
                            {item.documentsSummary.rejected} recusado(s)
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDiagnostic(item)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver diagnóstico operacional completo"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <Link
                            to={`/admissoes/${item.admissionId}`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Abrir detalhes da admissão"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* VISUALIZAÇÃO MOBILE: CARDS OPERACIONAIS RESPONSIVOS */}
            <div className="block lg:hidden divide-y divide-slate-100">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenDiagnostic(item)}
                  className="p-4 hover:bg-slate-50 transition-colors space-y-3 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-400">{item.admissionCode}</span>
                        <span>•</span>
                        <span className="text-[10px] text-slate-500">{item.employeeCpfMasked}</span>
                      </div>
                      <h3 className="font-semibold text-sm text-slate-900 mt-0.5">
                        {item.employeeName}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.employeeRole} • {item.employeeUnit}
                      </p>
                    </div>
                    {renderPriorityBadge(item.priority)}
                  </div>

                  {/* Situação e Responsável */}
                  <div className="flex flex-wrap items-center gap-2">
                    {renderSituationBadge(item.situation, item.situationLabel)}
                    <span className="text-xs text-slate-600">
                      Resp: <strong className="text-slate-800">{item.responsible}</strong>
                    </span>
                  </div>

                  {/* Etapa e Prazo */}
                  <div className="bg-slate-50 rounded-lg p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Etapa do processo:</span>
                      <span className="font-medium text-slate-800">{item.currentStepName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Previsão:</span>
                      <span className={`font-semibold ${item.isOverdue ? 'text-red-600' : 'text-slate-800'}`}>
                        {item.expectedStartDate ? new Date(item.expectedStartDate).toLocaleDateString('pt-BR') : 'Não def.'}
                      </span>
                    </div>
                  </div>

                  {/* Ações Mobile */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                      Ver diagnóstico <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                    <Link
                      to={`/admissoes/${item.admissionId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-slate-600 hover:text-slate-900 underline"
                    >
                      Abrir admissão
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-600">
                <span>
                  Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateFilter('page', String(currentPage - 1))}
                    disabled={currentPage <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Página anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => updateFilter('page', String(currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Próxima página"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 6. Drawer Lateral de Diagnóstico Operacional (Visão 360°) */}
      {isDrawerOpen && selectedItem && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={handleCloseDiagnostic}
          />

          {/* Drawer Content */}
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl z-10 flex flex-col overflow-y-auto">
            {/* Topo do Drawer */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50/80">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-medium text-slate-400">
                    {selectedItem.admissionCode}
                  </span>
                  {renderPriorityBadge(selectedItem.priority)}
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedItem.employeeName}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedItem.employeeRole} • {selectedItem.employeeUnit}
                </p>
              </div>

              <button
                onClick={handleCloseDiagnostic}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Diagnóstico */}
            <div className="p-5 space-y-6 flex-1">
              {/* Box Diagnóstico Resumido: O Que Precisa Ser Feito? */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-2">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                  Diagnóstico Operacional
                </span>
                <div className="flex items-center gap-2">
                  {renderSituationBadge(selectedItem.situation, selectedItem.situationLabel)}
                </div>
                <div className="text-xs text-slate-700 space-y-1.5 pt-1">
                  <p>
                    <strong>Quem precisa agir agora:</strong>{' '}
                    <span className="text-blue-700 font-semibold">{selectedItem.responsible}</span>
                  </p>
                  <p>
                    <strong>Etapa atual:</strong> {selectedItem.currentStepName} (Etapa {selectedItem.currentStepOrder} de {selectedItem.totalSteps})
                  </p>
                  <p>
                    <strong>Previsão de início:</strong>{' '}
                    {selectedItem.expectedStartDate
                      ? new Date(selectedItem.expectedStartDate).toLocaleDateString('pt-BR')
                      : 'Não informada'}
                    {selectedItem.isOverdue && (
                      <span className="text-red-600 font-bold ml-1.5">(Atrasada!)</span>
                    )}
                  </p>
                  <p>
                    <strong>Sem movimentação:</strong> há {selectedItem.daysWithoutMovement} dia(s).
                  </p>
                </div>
              </div>

              {/* Alertas e Motivos de Atenção */}
              {selectedItem.attentionReasons && selectedItem.attentionReasons.length > 0 && (
                <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4">
                  <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Alertas Críticos Ativos
                  </span>
                  <ul className="space-y-1 text-xs text-amber-900">
                    {selectedItem.attentionReasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Dados do Colaborador */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Dados do Colaborador
                </h4>
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 text-xs space-y-2 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">CPF:</span>
                    <span className="font-mono font-medium">{selectedItem.employeeCpfMasked}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Departamento:</span>
                    <span className="font-medium">{selectedItem.employeeDepartment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Unidade:</span>
                    <span className="font-medium">{selectedItem.employeeUnit}</span>
                  </div>
                  {selectedItem.employeePhone && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> Telefone:
                      </span>
                      <span className="font-medium">{selectedItem.employeePhone}</span>
                    </div>
                  )}
                  {selectedItem.employeeEmail && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" /> E-mail:
                      </span>
                      <span className="font-medium">{selectedItem.employeeEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Resumo de Documentos */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Status de Documentos
                </h4>
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Progresso de Documentação:</span>
                    <span className="font-bold text-slate-900">{selectedItem.documentsSummary.progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${selectedItem.documentsSummary.progressPercent}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center pt-2 border-t border-slate-200/60">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="block text-xs font-bold text-emerald-600">
                        {selectedItem.documentsSummary.approved}
                      </span>
                      <span className="text-[10px] text-slate-500">Aprovados</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="block text-xs font-bold text-blue-600">
                        {selectedItem.documentsSummary.inReview}
                      </span>
                      <span className="text-[10px] text-slate-500">Em Análise</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="block text-xs font-bold text-red-600">
                        {selectedItem.documentsSummary.rejected}
                      </span>
                      <span className="text-[10px] text-slate-500">Recusados</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="block text-xs font-bold text-slate-600">
                        {selectedItem.documentsSummary.notSent}
                      </span>
                      <span className="text-[10px] text-slate-500">Não Env.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status de Aprovação Interna se Existir */}
              {selectedItem.hasApproval && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Aprovação Interna (Bloco 5.6)
                  </h4>
                  <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-3.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Tipo de Alçada:</span>
                      <span className="font-semibold text-purple-900">{selectedItem.approvalType || 'Padrão'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Status da Aprovação:</span>
                      <span className="font-bold text-purple-800">{selectedItem.approvalStatus}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Ações Rápidas no Rodapé do Drawer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
              <Link
                to={`/admissoes/${selectedItem.admissionId}`}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>Abrir Detalhes da Admissão</span>
              </Link>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  to={`/admissoes/${selectedItem.admissionId}?tab=documentos`}
                  className="py-2 px-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors text-center"
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Conferir Docs</span>
                </Link>

                <Link
                  to={`/pendencias?search=${encodeURIComponent(selectedItem.employeeName)}`}
                  className="py-2 px-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors text-center"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pendências</span>
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  to={`/historico?search=${encodeURIComponent(selectedItem.employeeName)}`}
                  className="py-2 px-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors text-center"
                >
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>Ver Histórico</span>
                </Link>

                <Link
                  to={`/comunicacao?search=${encodeURIComponent(selectedItem.employeeName)}`}
                  className="py-2 px-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors text-center"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Contatar</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
