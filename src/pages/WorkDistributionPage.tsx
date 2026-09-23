import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserMinus,
  Briefcase,
  Layers,
  Activity,
  AlertTriangle,
  Clock,
  ArrowRight,
  Filter,
  Search,
  RefreshCw,
  SlidersHorizontal,
  X,
  FileCheck2,
  Calendar,
  Eye,
  CheckCircle2,
  Info,
  ChevronRight,
  Shield,
  BarChart2
} from 'lucide-react';
import { safeFetchJson } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { AssignResponsibleModal } from '../components/AssignResponsibleModal.tsx';
import {
  WorkDistributionResponse,
  WorkDistributionItem,
  WorkloadByResponsibleItem,
  OperationalPriority,
  OperationalHubSituation
} from '../types/index.ts';

export const WorkDistributionPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Estados principais
  const [data, setData] = useState<WorkDistributionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de Atribuição
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    admissionId: string;
    admissionCode: string;
    employeeName: string;
    stepKey?: string;
    stepName?: string;
    currentResponsibleId?: string;
    currentResponsibleName?: string;
  }>({
    isOpen: false,
    admissionId: '',
    admissionCode: '',
    employeeName: ''
  });

  // Drawer de Detalhes do Responsável
  const [selectedUserDetail, setSelectedUserDetail] = useState<WorkloadByResponsibleItem | null>(null);

  // Parâmetros de Filtro
  const viewMode = (searchParams.get('view') as 'distribuicao' | 'minha_fila' | 'sem_responsavel' | 'todas') || 'distribuicao';
  const search = searchParams.get('search') || '';
  const responsible = searchParams.get('responsible') || 'TODOS';
  const situation = searchParams.get('situation') || 'TODAS';
  const priority = searchParams.get('priority') || 'TODAS';
  const unit = searchParams.get('unit') || 'TODAS';
  const department = searchParams.get('department') || 'TODOS';
  const sortBy = searchParams.get('sortBy') || 'priority';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc';
  const currentPage = Number(searchParams.get('page') || '1');

  const [searchTerm, setSearchTerm] = useState(search);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    setSearchTerm(search);
  }, [search]);

  // Carrega dados da distribuição
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (responsible && responsible !== 'TODOS') q.set('responsible', responsible);
      if (situation && situation !== 'TODAS') q.set('situation', situation);
      if (priority && priority !== 'TODAS') q.set('priority', priority);
      if (unit && unit !== 'TODAS') q.set('unit', unit);
      if (department && department !== 'TODOS') q.set('department', department);
      if (sortBy) q.set('sortBy', sortBy);
      if (sortOrder) q.set('sortOrder', sortOrder);
      q.set('viewMode', viewMode);
      q.set('page', String(currentPage));
      q.set('limit', '20');

      const response = await safeFetchJson<WorkDistributionResponse>(`/api/distribuicao?${q.toString()}`);
      if (response) {
        setData(response);
      }
    } catch (err: any) {
      console.error('Erro ao carregar distribuição de trabalho:', err);
      setError('Não foi possível carregar os dados de distribuição. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [search, responsible, situation, priority, unit, department, sortBy, sortOrder, viewMode, currentPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (!value || value === 'TODOS' || value === 'TODAS' || value === 'all') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const setViewMode = (mode: 'distribuicao' | 'minha_fila' | 'sem_responsavel' | 'todas') => {
    const params = new URLSearchParams(searchParams);
    params.set('view', mode);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('search', searchTerm.trim());
  };

  const handleClearFilters = () => {
    const params = new URLSearchParams();
    if (viewMode !== 'distribuicao') params.set('view', viewMode);
    setSearchParams(params);
    setSearchTerm('');
  };

  const openAssignModal = (item: WorkDistributionItem, stepOnly = false) => {
    setModalState({
      isOpen: true,
      admissionId: item.admissionId,
      admissionCode: item.admissionCode,
      employeeName: item.employeeName,
      stepKey: stepOnly ? item.currentStepKey : undefined,
      stepName: stepOnly ? item.currentStepName : undefined,
      currentResponsibleId: stepOnly ? item.stepResponsibleId : item.admissionResponsibleId,
      currentResponsibleName: stepOnly ? item.stepResponsibleName : item.admissionResponsibleName
    });
  };

  const handleAssignmentSuccess = () => {
    fetchData();
  };

  const renderPriorityBadge = (p: OperationalPriority) => {
    switch (p) {
      case 'CRITICA':
        return (
          <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-md font-bold text-[10px] tracking-wide inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            CRÍTICA
          </span>
        );
      case 'ALTA':
        return (
          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md font-semibold text-[10px] tracking-wide inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            ALTA
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-medium">
            NORMAL
          </span>
        );
    }
  };

  const renderSituationBadge = (situation: OperationalHubSituation, label: string) => {
    const colorMap: Partial<Record<OperationalHubSituation, string>> = {
      EM_DIA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      AGUARDANDO_RH: 'bg-blue-50 text-blue-700 border-blue-200',
      AGUARDANDO_FUNCIONARIO: 'bg-slate-50 text-slate-700 border-slate-200',
      COM_PENDENCIA: 'bg-rose-50 text-rose-700 border-rose-200',
      APROVACAO_PENDENTE: 'bg-purple-50 text-purple-700 border-purple-200',
      PROXIMA_DO_PRAZO: 'bg-amber-50 text-amber-700 border-amber-200',
      ATRASADA: 'bg-red-50 text-red-700 border-red-200',
      BLOQUEADA: 'bg-zinc-800 text-white border-zinc-900'
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${colorMap[situation] || 'bg-slate-100 text-slate-700'}`}>
        {label}
      </span>
    );
  };

  const cards = data?.cards || {
    totalAssigned: 0,
    unassignedCount: 0,
    myQueueCount: 0,
    usersWithAssignmentsCount: 0,
    activeProcessesCount: 0
  };

  const hasActiveFilters = Boolean(
    search ||
    (responsible && responsible !== 'TODOS') ||
    (situation && situation !== 'TODAS') ||
    (priority && priority !== 'TODAS') ||
    (unit && unit !== 'TODAS') ||
    (department && department !== 'TODOS')
  );

  return (
    <div className="space-y-6">
      {/* 1. Cabeçalho Operacional do Bloco 6.4 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-bold uppercase tracking-wider">
                Bloco 6.4 • Operação
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-slate-500 text-xs font-medium">Equilíbrio & Filas</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2.5">
              <span>Gestão de Responsáveis & Distribuição</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-3xl">
              Acompanhamento operacional da distribuição de processos, atribuição de etapas, filas individuais de trabalho e identificação ágil de admissões sem responsável.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/operacao"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
            >
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Central de Operações</span>
            </Link>
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors"
              title="Recarregar distribuição"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Nota conceitual obrigatória (Section 16 & 17) */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-500 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            <strong>Finalidade Operacional:</strong> Os indicadores abaixo refletem a alocação de demandas em andamento para equilíbrio de esforços e fluxo contínuo. Não constituem ranking individual ou avaliação de produtividade.
          </span>
        </div>
      </div>

      {/* 2. Cards de Métricas Operacionais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Atribuído */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Total Atribuído</span>
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {cards.totalAssigned}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Com analista responsável
          </p>
        </div>

        {/* Sem Responsável */}
        <div 
          onClick={() => setViewMode('sem_responsavel')}
          className={`border rounded-2xl p-4 shadow-xs cursor-pointer transition-all ${
            cards.unassignedCount > 0
              ? 'bg-amber-50/60 border-amber-200 hover:bg-amber-100/60'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-800">
            <span className="font-medium">Sem Responsável</span>
            <UserMinus className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">
            {cards.unassignedCount}
          </div>
          <p className="text-[11px] text-amber-700 font-medium mt-1 flex items-center gap-1">
            <span>Requer triagem / alocação</span>
            <ArrowRight className="w-3 h-3" />
          </p>
        </div>

        {/* Minha Fila */}
        <div 
          onClick={() => setViewMode('minha_fila')}
          className={`border rounded-2xl p-4 shadow-xs cursor-pointer transition-all ${
            viewMode === 'minha_fila'
              ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Minha Fila</span>
            <Briefcase className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-700">
            {cards.myQueueCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Sob sua responsabilidade</span>
            <ArrowRight className="w-3 h-3 text-blue-600" />
          </p>
        </div>

        {/* Usuários com Atribuições */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Equipe Alocada</span>
            <Users className="w-4 h-4 text-slate-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {cards.usersWithAssignmentsCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Analistas com processos
          </p>
        </div>

        {/* Processos Ativos */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Processos Ativos</span>
            <Layers className="w-4 h-4 text-slate-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {cards.activeProcessesCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Em andamento operacional
          </p>
        </div>
      </div>

      {/* 3. Navegação em Abas Operacionais */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setViewMode('distribuicao')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            viewMode === 'distribuicao'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Distribuição de Trabalho ({data?.distributionByResponsible?.length || 0})</span>
        </button>

        <button
          onClick={() => setViewMode('minha_fila')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            viewMode === 'minha_fila'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Minha Fila ({cards.myQueueCount})</span>
        </button>

        <button
          onClick={() => setViewMode('sem_responsavel')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            viewMode === 'sem_responsavel'
              ? 'bg-amber-600 text-white shadow-xs'
              : cards.unassignedCount > 0
              ? 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <UserMinus className="w-4 h-4" />
          <span>Sem Responsável ({cards.unassignedCount})</span>
        </button>

        <button
          onClick={() => setViewMode('todas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            viewMode === 'todas'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Todas as Admissões ({cards.activeProcessesCount})</span>
        </button>
      </div>

      {/* 4. Barra de Filtros e Busca */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por colaborador, código, cargo, setor, unidade ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Buscar
            </button>
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium transition-colors ${
                showAdvancedFilters || hasActiveFilters
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtros Detalhados</span>
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-blue-600" />}
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                title="Limpar filtros"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Painel Avançado */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Responsável */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Responsável
              </label>
              <select
                value={responsible}
                onChange={(e) => updateParam('responsible', e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todos os responsáveis</option>
                <option value="SEM_RESPONSAVEL">Sem responsável</option>
                {data?.filters?.responsibles?.filter(r => r !== 'Sem responsável').map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Situação */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Situação
              </label>
              <select
                value={situation}
                onChange={(e) => updateParam('situation', e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
              >
                {data?.filters?.situations?.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Prioridade */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => updateParam('priority', e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODAS">Todas as prioridades</option>
                <option value="CRITICA">Crítica</option>
                <option value="ALTA">Alta</option>
                <option value="NORMAL">Normal</option>
              </select>
            </div>

            {/* Unidade */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Unidade
              </label>
              <select
                value={unit}
                onChange={(e) => updateParam('unit', e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODAS">Todas as unidades</option>
                {data?.filters?.units?.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 5. Conteúdo das Abas */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Calculando distribuição de trabalho...</p>
        </div>
      ) : error ? (
        <div className="bg-white border border-red-200 rounded-2xl p-10 text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-red-800 mb-1">Erro ao carregar distribuição</p>
          <p className="text-xs text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      ) : viewMode === 'distribuicao' ? (
        /* ABA 1: TABELA DE CARGA DE TRABALHO POR RESPONSÁVEL */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Carga Operacional da Equipe de RH
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Consolidação de admissões ativas, etapas atribuídas, pendências documentais e aprovações
              </p>
            </div>
            <span className="text-xs font-medium text-slate-500">
              {data?.distributionByResponsible?.length || 0} analistas cadastrados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Responsável (RH)</th>
                  <th className="py-3.5 px-4 text-center">Admissões Ativas</th>
                  <th className="py-3.5 px-4 text-center">Etapas Pendentes</th>
                  <th className="py-3.5 px-4 text-center">Pendências</th>
                  <th className="py-3.5 px-4 text-center">Aprovações</th>
                  <th className="py-3.5 px-4 text-center">Carga Total</th>
                  <th className="py-3.5 px-4">Última Atividade</th>
                  <th className="py-3.5 px-5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.distributionByResponsible?.map((resp) => {
                  const isCurrentUser = Boolean(currentUser?.id === resp.userId || currentUser?.email === resp.userEmail);

                  return (
                    <tr
                      key={resp.userId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrentUser ? 'bg-blue-50/30 font-medium' : ''
                      }`}
                    >
                      {/* Usuário */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCurrentUser ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {resp.userName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900">
                                {resp.userName}
                              </span>
                              {isCurrentUser && (
                                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 text-[10px] rounded-sm font-semibold">
                                  Você
                                </span>
                              )}
                              {!resp.active && (
                                <span className="px-1.5 py-0.2 bg-red-100 text-red-700 text-[10px] rounded-sm font-semibold">
                                  Inativo
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {resp.department} • {resp.userRole}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Admissões Ativas */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center justify-center min-w-7 px-2 py-0.5 rounded-full font-bold text-xs ${
                          resp.admissionsCount > 0 ? 'bg-blue-50 text-blue-700' : 'text-slate-400'
                        }`}>
                          {resp.admissionsCount}
                        </span>
                      </td>

                      {/* Etapas Pendentes */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center justify-center min-w-7 px-2 py-0.5 rounded-full font-semibold text-xs ${
                          resp.pendingStepsCount > 0 ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400'
                        }`}>
                          {resp.pendingStepsCount}
                        </span>
                      </td>

                      {/* Pendências Documentais */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center justify-center min-w-7 px-2 py-0.5 rounded-full font-semibold text-xs ${
                          resp.activePendingsCount > 0 ? 'bg-rose-50 text-rose-700 font-bold' : 'text-slate-400'
                        }`}>
                          {resp.activePendingsCount}
                        </span>
                      </td>

                      {/* Aprovações Pendentes */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center justify-center min-w-7 px-2 py-0.5 rounded-full font-semibold text-xs ${
                          resp.pendingApprovalsCount > 0 ? 'bg-purple-50 text-purple-700' : 'text-slate-400'
                        }`}>
                          {resp.pendingApprovalsCount}
                        </span>
                      </td>

                      {/* Carga Total Ponderada */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center justify-center min-w-8 px-2.5 py-1 rounded-lg font-bold text-xs ${
                          resp.totalWorkload > 8 
                            ? 'bg-amber-100 text-amber-800'
                            : resp.totalWorkload > 0
                            ? 'bg-slate-100 text-slate-800'
                            : 'text-slate-400'
                        }`}>
                          {resp.totalWorkload}
                        </span>
                      </td>

                      {/* Última Movimentação */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {resp.lastMovementAt ? (
                          <span>{new Date(resp.lastMovementAt).toLocaleDateString('pt-BR')}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            updateParam('responsible', resp.userName);
                            setViewMode('todas');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors font-semibold text-xs"
                        >
                          <span>Ver Fila</span>
                          <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ABAS 2, 3 E 4: TABELA OPERACIONAL DE ADMISSÕES COM ATRIBUIÇÃO */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {viewMode === 'minha_fila' && 'Minha Fila de Trabalho'}
                {viewMode === 'sem_responsavel' && 'Admissões Sem Responsável Atribuído'}
                {viewMode === 'todas' && 'Todas as Admissões Operacionais'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {viewMode === 'minha_fila' && 'Admissões e etapas operacionais sob sua responsabilidade direta.'}
                {viewMode === 'sem_responsavel' && 'Processos que necessitam de direcionamento para um analista de RH.'}
                {viewMode === 'todas' && 'Visão completa dos processos com seus respectivos responsáveis e etapas.'}
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600">
              Total: {data?.total || 0} processos
            </span>
          </div>

          {data?.items && data.items.length === 0 ? (
            <div className="py-16 text-center">
              <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">
                Nenhum processo encontrado
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {viewMode === 'sem_responsavel' 
                  ? 'Ótimo trabalho! Todas as admissões ativas estão com responsáveis atribuídos.' 
                  : 'Nenhuma admissão corresponde aos filtros selecionados.'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="mt-4 px-3.5 py-1.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Admissão & Colaborador</th>
                    <th className="py-3.5 px-4">Cargo / Unidade</th>
                    <th className="py-3.5 px-4">Etapa Atual</th>
                    <th className="py-3.5 px-4">Situação</th>
                    <th className="py-3.5 px-4">Responsável Admissão</th>
                    <th className="py-3.5 px-4">Responsável Etapa</th>
                    <th className="py-3.5 px-4">Prioridade</th>
                    <th className="py-3.5 px-4">Prazos</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.items?.map((item) => {
                    const isUnassigned = !item.admissionResponsibleId || item.admissionResponsibleName === 'Sem responsável';

                    return (
                      <tr
                        key={item.admissionId}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isUnassigned ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        {/* Colaborador & Código */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {item.employeeName.charAt(0)}
                            </div>
                            <div>
                              <Link
                                to={`/admissoes/${item.admissionId}`}
                                className="font-semibold text-slate-900 hover:text-blue-600 transition-colors block"
                              >
                                {item.employeeName}
                              </Link>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                <span className="font-mono text-slate-500">{item.admissionCode}</span>
                                <span>•</span>
                                <span>{item.employeeCpfMasked}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Cargo / Unidade */}
                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 font-medium">
                            {item.employeeRole}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {item.employeeUnit} • {item.employeeDepartment}
                          </div>
                        </td>

                        {/* Etapa Atual */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                              {item.currentStepOrder}
                            </span>
                            <span>{item.currentStepName}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Etapa {item.currentStepOrder} de {item.totalSteps}
                          </div>
                        </td>

                        {/* Situação */}
                        <td className="py-3.5 px-4">
                          {renderSituationBadge(item.situation, item.situationLabel)}
                        </td>

                        {/* Responsável pela Admissão */}
                        <td className="py-3.5 px-4">
                          {isUnassigned ? (
                            <button
                              type="button"
                              onClick={() => openAssignModal(item, false)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors border border-amber-300"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              <span>Atribuir RH</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-medium text-xs bg-slate-100 text-slate-800">
                                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                                <span>{item.admissionResponsibleName}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => openAssignModal(item, false)}
                                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                                title="Alterar responsável"
                              >
                                Alterar
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Responsável pela Etapa */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-600 text-xs">
                              {item.stepResponsibleName || 'Mesmo da admissão'}
                            </span>
                            <button
                              type="button"
                              onClick={() => openAssignModal(item, true)}
                              className="text-[10px] text-slate-400 hover:text-blue-600 font-medium"
                              title="Atribuir responsável específico para esta etapa"
                            >
                              (Etapa)
                            </button>
                          </div>
                        </td>

                        {/* Prioridade */}
                        <td className="py-3.5 px-4">
                          {renderPriorityBadge(item.priority)}
                        </td>

                        {/* Prazos */}
                        <td className="py-3.5 px-4 text-[11px] text-slate-500">
                          {item.expectedStartDate ? (
                            <div className="font-medium text-slate-800">
                              {new Date(item.expectedStartDate).toLocaleDateString('pt-BR')}
                            </div>
                          ) : (
                            <span className="text-slate-400">Sem previsão</span>
                          )}
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Mov. há {item.daysWithoutMovement}d
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openAssignModal(item, false)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors font-semibold text-xs"
                            >
                              Atribuir
                            </button>
                            <Link
                              to={`/admissoes/${item.admissionId}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Ver Admissão"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de Atribuição */}
      <AssignResponsibleModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        onSuccess={handleAssignmentSuccess}
        admissionId={modalState.admissionId}
        admissionCode={modalState.admissionCode}
        employeeName={modalState.employeeName}
        stepKey={modalState.stepKey}
        stepName={modalState.stepName}
        currentResponsibleId={modalState.currentResponsibleId}
        currentResponsibleName={modalState.currentResponsibleName}
      />
    </div>
  );
};

export default WorkDistributionPage;
