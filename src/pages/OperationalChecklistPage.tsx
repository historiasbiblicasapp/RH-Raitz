import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  CheckSquare, 
  Search, 
  Filter, 
  RefreshCw, 
  AlertCircle, 
  Clock, 
  FileText, 
  UserCheck, 
  AlertTriangle, 
  ShieldAlert, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown, 
  ArrowUpDown, 
  Eye, 
  MessageSquare, 
  FileCheck2, 
  Building2, 
  Briefcase, 
  Calendar, 
  ExternalLink,
  SlidersHorizontal,
  X,
  Lock,
  Flag,
  Sparkles,
  ArrowUpRight,
  ListChecks,
  Plus,
  CheckCircle2
} from 'lucide-react';
import { 
  OperationalChecklistItem, 
  OperationalChecklistResponse, 
  OperationalPendingSummary, 
  OperationalPriority, 
  OperationalChecklistSituation, 
  OperationalResponsible,
  JobPosition,
  JobPositionDocument
} from '../types/index.ts';
import { safeFetchJson } from '../lib/api.ts';
import { handleFallbackApiRoute } from '../lib/fallbackClient.ts';
import { CommunicationModal } from '../components/CommunicationModal.tsx';
import { CreateJobPositionWithChecklistModal } from '../components/CreateJobPositionWithChecklistModal.tsx';

export const OperationalChecklistPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Estados de dados
  const [items, setItems] = useState<OperationalChecklistItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<OperationalPendingSummary>({
    totalInCourse: 0,
    criticalPendings: 0,
    employeePendings: 0,
    rhPendings: 0,
    waitingReviewDocs: 0,
    upcomingAdmissions: 0,
    delayedAdmissions: 0,
    inactiveAdmissions: 0,
    blockedAdmissions: 0
  });

  // Modal de Criação de Cargo com Checklist
  const [isCreateCargoModalOpen, setIsCreateCargoModalOpen] = useState(false);
  const [createdCargoFeedback, setCreatedCargoFeedback] = useState<{ id: string; name: string; count: number } | null>(null);

  const [filterOptions, setFilterOptions] = useState<{
    roles: string[];
    departments: string[];
    units: string[];
    steps: { key: string; name: string }[];
    responsibles: string[];
    statuses: string[];
  }>({
    roles: [],
    departments: [],
    units: [],
    steps: [],
    responsibles: [],
    statuses: []
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Estados de modal
  const [selectedAdmissionForComm, setSelectedAdmissionForComm] = useState<OperationalChecklistItem | null>(null);
  const [commModalOpen, setCommModalOpen] = useState(false);

  const [selectedItemForPriority, setSelectedItemForPriority] = useState<OperationalChecklistItem | null>(null);
  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  const [newPriority, setNewPriority] = useState<OperationalPriority>('NORMAL');
  const [priorityReason, setPriorityReason] = useState('');
  const [savingPriority, setSavingPriority] = useState(false);
  const [prioritySuccessMsg, setPrioritySuccessMsg] = useState<string | null>(null);

  // Filtros obtidos da URL
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || 'TODOS';
  const step = searchParams.get('step') || 'TODAS';
  const responsible = searchParams.get('responsible') || 'TODOS';
  const priority = searchParams.get('priority') || 'TODAS';
  const situation = searchParams.get('situation') || 'TODAS';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const sortBy = searchParams.get('sortBy') || '';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc';

  // Helper para atualizar parâmetros da URL
  const updateParams = useCallback((newParams: Record<string, string | number | null | undefined>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(newParams).forEach(([key, val]) => {
        if (val === null || val === undefined || val === '' || val === 'TODOS' || val === 'TODAS' || val === 'todas') {
          next.delete(key);
        } else {
          next.set(key, String(val));
        }
      });
      return next;
    });
  }, [setSearchParams]);

  // Carregamento de dados
  const loadChecklistData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (status && status !== 'TODOS') queryParams.set('status', status);
      if (step && step !== 'TODAS') queryParams.set('step', step);
      if (responsible && responsible !== 'TODOS') queryParams.set('responsible', responsible);
      if (priority && priority !== 'TODAS') queryParams.set('priority', priority);
      if (situation && situation !== 'TODAS') queryParams.set('situation', situation);
      if (page) queryParams.set('page', page.toString());
      if (limit) queryParams.set('limit', limit.toString());
      if (sortBy) queryParams.set('sortBy', sortBy);
      if (sortOrder) queryParams.set('sortOrder', sortOrder);

      const endpoint = `/api/operational-checklist?${queryParams.toString()}`;
      let data: OperationalChecklistResponse;

      try {
        data = await safeFetchJson<OperationalChecklistResponse>(endpoint);
      } catch {
        const fallback = handleFallbackApiRoute(endpoint);
        data = fallback as OperationalChecklistResponse;
      }

      if (data && Array.isArray(data.items)) {
        setItems(data.items);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.summary) setSummary(data.summary);
        if (data.filters) {
          setFilterOptions(prev => ({
            roles: data.filters.roles || prev.roles,
            departments: data.filters.departments || prev.departments,
            units: data.filters.units || prev.units,
            steps: data.filters.steps || prev.steps,
            responsibles: data.filters.responsibles || prev.responsibles,
            statuses: data.filters.statuses || prev.statuses
          }));
        }
      }
    } catch (err) {
      console.error('[OperationalChecklist] Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, status, step, responsible, priority, situation, page, limit, sortBy, sortOrder]);

  useEffect(() => {
    loadChecklistData();
  }, [loadChecklistData]);

  // Manipulador de ordenação
  const handleSort = (field: string) => {
    if (sortBy === field) {
      updateParams({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc', page: 1 });
    } else {
      updateParams({ sortBy: field, sortOrder: 'asc', page: 1 });
    }
  };

  // Limpar todos os filtros
  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  // Abrir modal de comunicação
  const handleOpenCommunication = (item: OperationalChecklistItem) => {
    setSelectedAdmissionForComm(item);
    setCommModalOpen(true);
  };

  // Abrir modal de alteração de prioridade
  const handleOpenPriorityModal = (item: OperationalChecklistItem) => {
    setSelectedItemForPriority(item);
    setNewPriority(item.operationalPriority);
    setPriorityReason(item.operationalPriorityReason || '');
    setPrioritySuccessMsg(null);
    setPriorityModalOpen(true);
  };

  // Salvar prioridade operacional
  const handleSavePriority = async () => {
    if (!selectedItemForPriority) return;
    setSavingPriority(true);
    setPrioritySuccessMsg(null);

    try {
      const endpoint = `/api/admissions/${selectedItemForPriority.admissionId}/operational-priority`;
      const payload = { priority: newPriority, reason: priorityReason.trim() || undefined };

      try {
        await safeFetchJson(endpoint, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch {
        handleFallbackApiRoute(endpoint, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
      }

      // Atualiza localmente o item na lista
      setItems(prev => prev.map(it => {
        if (it.admissionId === selectedItemForPriority.admissionId) {
          return {
            ...it,
            operationalPriority: newPriority,
            operationalPriorityReason: priorityReason.trim() || undefined
          };
        }
        return it;
      }));

      setPrioritySuccessMsg(`Prioridade alterada para ${newPriority} com sucesso.`);
      setTimeout(() => {
        setPriorityModalOpen(false);
        loadChecklistData(true);
      }, 900);
    } catch (err: any) {
      alert('Erro ao atualizar prioridade: ' + (err.message || 'Falha de comunicação'));
    } finally {
      setSavingPriority(false);
    }
  };

  // Helpers de formatação e badges
  const getPriorityBadge = (p: OperationalPriority) => {
    switch (p) {
      case 'CRITICA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            Crítica
          </span>
        );
      case 'ALTA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Alta
          </span>
        );
      case 'NORMAL':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Normal
          </span>
        );
    }
  };

  const getSituationBadge = (sit: OperationalChecklistSituation, label: string) => {
    switch (sit) {
      case 'BLOQUEADA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Lock className="w-3 h-3 text-purple-600" />
            {label}
          </span>
        );
      case 'ATRASADA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <Clock className="w-3 h-3 text-red-600" />
            {label}
          </span>
        );
      case 'SEM_MOVIMENTACAO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
            <Clock className="w-3 h-3 text-orange-600" />
            {label}
          </span>
        );
      case 'PROXIMA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
            <Calendar className="w-3 h-3 text-blue-600" />
            {label}
          </span>
        );
      case 'EM_DIA':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
            {label}
          </span>
        );
    }
  };

  const getResponsibleBadge = (resp: OperationalResponsible) => {
    switch (resp) {
      case 'FUNCIONARIO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            <UserCheck className="w-3 h-3" />
            Funcionário
          </span>
        );
      case 'RH_CONFERENCIA':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
            <FileCheck2 className="w-3 h-3" />
            RH (Conferência)
          </span>
        );
      case 'GESTOR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <Briefcase className="w-3 h-3" />
            Gestor
          </span>
        );
      case 'SISTEMA':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Sistema
          </span>
        );
      case 'RH':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            RH
          </span>
        );
    }
  };

  const hasActiveFilters = Boolean(
    search || 
    (status && status !== 'TODOS') || 
    (step && step !== 'TODAS') || 
    (responsible && responsible !== 'TODOS') || 
    (priority && priority !== 'TODAS') || 
    (situation && situation !== 'TODAS')
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Topo da Tela com Identidade e Ações */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Checklist Operacional de Admissões
              </h1>
              <p className="text-sm text-slate-500">
                Acompanhamento centralizado de progresso, pendências, responsáveis operacionais e prazos das admissões.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <button
            type="button"
            id="btn-op-create-cargo"
            onClick={() => setIsCreateCargoModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Cadastrar um novo cargo e definir quais documentos são exigidos"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cargo & Checklist</span>
          </button>

          <Link
            to="/cadastros/checklists"
            id="link-go-to-cargo-checklists"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            title="Configurar documentos exigidos por cargo"
          >
            <ListChecks className="w-4 h-4 text-blue-600" />
            <span>Checklists por Cargo</span>
          </Link>

          <button
            type="button"
            id="btn-refresh-checklist"
            onClick={() => loadChecklistData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Atualizar</span>
          </button>

          <Link
            to="/pendencias"
            id="link-go-to-pendencias"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shadow-2xs"
          >
            <AlertCircle className="w-4 h-4" />
            <span>Central de Pendências</span>
          </Link>
        </div>
      </div>

      {/* Banner de Feedback de Cargo Criado */}
      {createdCargoFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs text-emerald-900">
              <span className="font-bold">Cargo cadastrado com sucesso!</span>{' '}
              <span>O cargo <strong>"{createdCargoFeedback.name}"</strong> foi criado com {createdCargoFeedback.count} documento(s) configurado(s).</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/cadastros/checklists?cargo=${createdCargoFeedback.id}`}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Visualizar Checklist do Cargo
            </Link>
            <button
              type="button"
              onClick={() => setCreatedCargoFeedback(null)}
              className="p-1 text-emerald-600 hover:text-emerald-800 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Indicadores Operacionais (9 Cards com Filtro Direto) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
        {/* 1. Total em Andamento */}
        <button
          type="button"
          onClick={() => updateParams({ status: 'TODOS', situation: 'TODAS', priority: 'TODAS', responsible: 'TODOS', page: 1 })}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            !hasActiveFilters ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-semibold text-slate-500 block leading-tight">Em Andamento</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block tracking-tight">{summary.totalInCourse}</span>
          <span className="text-[11px] text-slate-400">Total ativas</span>
        </button>

        {/* 2. Pendências Críticas */}
        <button
          type="button"
          onClick={() => updateParams({ priority: 'CRITICA', page: 1 })}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            priority === 'CRITICA' ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20' : 'bg-white border-slate-200 hover:border-rose-200'
          }`}
        >
          <span className="text-xs font-semibold text-rose-600 block leading-tight">Críticas</span>
          <span className="text-2xl font-bold text-rose-700 mt-1 block tracking-tight">{summary.criticalPendings}</span>
          <span className="text-[11px] text-slate-400">Ação imediata</span>
        </button>

        {/* 3. Pendências do Funcionário */}
        <button
          type="button"
          onClick={() => updateParams({ responsible: 'FUNCIONARIO', page: 1 })}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            responsible === 'FUNCIONARIO' ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 hover:border-indigo-200'
          }`}
        >
          <span className="text-xs font-semibold text-indigo-600 block leading-tight">Funcionário</span>
          <span className="text-2xl font-bold text-indigo-700 mt-1 block tracking-tight">{summary.employeePendings}</span>
          <span className="text-[11px] text-slate-400">Aguardando envio</span>
        </button>

        {/* 4. Pendências do RH */}
        <button
          type="button"
          onClick={() => updateParams({ responsible: 'RH', page: 1 })}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            responsible === 'RH' ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-500/20' : 'bg-white border-slate-200 hover:border-sky-200'
          }`}
        >
          <span className="text-xs font-semibold text-sky-700 block leading-tight">Com o RH</span>
          <span className="text-2xl font-bold text-sky-800 mt-1 block tracking-tight">{summary.rhPendings}</span>
          <span className="text-[11px] text-slate-400">Análise e operação</span>
        </button>

        {/* 5. Documentos Aguardando Conferência */}
        <button
          type="button"
          onClick={() => updateParams({ step: 'CONFERENCIA', page: 1 })}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            step === 'CONFERENCIA' ? 'bg-cyan-50 border-cyan-300 ring-2 ring-cyan-500/20' : 'bg-white border-slate-200 hover:border-cyan-200'
          }`}
        >
          <span className="text-xs font-semibold text-cyan-700 block leading-tight">Conferência</span>
          <span className="text-2xl font-bold text-cyan-800 mt-1 block tracking-tight">{summary.waitingReviewDocs}</span>
          <span className="text-[11px] text-slate-400">Docs para revisar</span>
        </button>

        {/* 6. Admissões Próximas */}
        <button
          type="button"
          onClick={() => updateParams({ situation: 'PROXIMA', page: 1 })}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            situation === 'PROXIMA' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20' : 'bg-white border-slate-200 hover:border-amber-200'
          }`}
        >
          <span className="text-xs font-semibold text-amber-700 block leading-tight">Próximas</span>
          <span className="text-2xl font-bold text-amber-800 mt-1 block tracking-tight">{summary.upcomingAdmissions}</span>
          <span className="text-[11px] text-slate-400">Início em breve</span>
        </button>

        {/* 7. Admissões Atrasadas */}
        <button
          type="button"
          onClick={() => updateParams({ situation: 'ATRASADA', page: 1 })}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            situation === 'ATRASADA' ? 'bg-red-50 border-red-300 ring-2 ring-red-500/20' : 'bg-white border-slate-200 hover:border-red-200'
          }`}
        >
          <span className="text-xs font-semibold text-red-700 block leading-tight">Atrasadas</span>
          <span className="text-2xl font-bold text-red-800 mt-1 block tracking-tight">{summary.delayedAdmissions}</span>
          <span className="text-[11px] text-slate-400">Prazo ultrapassado</span>
        </button>

        {/* 8. Sem Movimentação */}
        <button
          type="button"
          onClick={() => updateParams({ situation: 'SEM_MOVIMENTACAO', page: 1 })}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            situation === 'SEM_MOVIMENTACAO' ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-500/20' : 'bg-white border-slate-200 hover:border-orange-200'
          }`}
        >
          <span className="text-xs font-semibold text-orange-700 block leading-tight">Paradas</span>
          <span className="text-2xl font-bold text-orange-800 mt-1 block tracking-tight">{summary.inactiveAdmissions}</span>
          <span className="text-[11px] text-slate-400">Sem atividade recente</span>
        </button>

        {/* 9. Bloqueadas */}
        <button
          type="button"
          onClick={() => updateParams({ situation: 'BLOQUEADA', page: 1 })}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            situation === 'BLOQUEADA' ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-500/20' : 'bg-white border-slate-200 hover:border-purple-200'
          }`}
        >
          <span className="text-xs font-semibold text-purple-700 block leading-tight">Bloqueadas</span>
          <span className="text-2xl font-bold text-purple-800 mt-1 block tracking-tight">{summary.blockedAdmissions}</span>
          <span className="text-[11px] text-slate-400">Etapa travada</span>
        </button>
      </div>

      {/* Barra de Pesquisa e Filtros Operacionais */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Campo de Busca Rápida */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-search-checklist"
              value={search}
              onChange={(e) => updateParams({ search: e.target.value, page: 1 })}
              placeholder="Pesquisar por nome, CPF, cargo, setor, unidade, matrícula, e-mail..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => updateParams({ search: '', page: 1 })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtros em linha */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro de Status */}
            <select
              id="select-filter-status"
              value={status}
              onChange={(e) => updateParams({ status: e.target.value, page: 1 })}
              className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Status: Todos</option>
              <option value="Rascunho">Rascunho</option>
              <option value="Aguardando documentos">Aguardando documentos</option>
              <option value="Em conferência">Em conferência</option>
              <option value="Pendência">Pendência</option>
              <option value="Concluída">Concluída</option>
              <option value="Cancelada">Cancelada</option>
            </select>

            {/* Filtro de Etapa do Processo (Bloco 5.4) */}
            <select
              id="select-filter-step"
              value={step}
              onChange={(e) => updateParams({ step: e.target.value, page: 1 })}
              className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODAS">Etapa: Todas</option>
              {filterOptions.steps.map(s => (
                <option key={s.key} value={s.key}>{s.name}</option>
              ))}
            </select>

            {/* Filtro de Responsável */}
            <select
              id="select-filter-responsible"
              value={responsible}
              onChange={(e) => updateParams({ responsible: e.target.value, page: 1 })}
              className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Responsável: Todos</option>
              <option value="FUNCIONARIO">Funcionário</option>
              <option value="RH">RH</option>
              <option value="RH_CONFERENCIA">RH (Conferência)</option>
              <option value="GESTOR">Gestor</option>
              <option value="SISTEMA">Sistema</option>
            </select>

            {/* Filtro de Prioridade */}
            <select
              id="select-filter-priority"
              value={priority}
              onChange={(e) => updateParams({ priority: e.target.value, page: 1 })}
              className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODAS">Prioridade: Todas</option>
              <option value="CRITICA">Crítica</option>
              <option value="ALTA">Alta</option>
              <option value="NORMAL">Normal</option>
            </select>

            {/* Filtro de Situação */}
            <select
              id="select-filter-situation"
              value={situation}
              onChange={(e) => updateParams({ situation: e.target.value, page: 1 })}
              className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODAS">Situação: Todas</option>
              <option value="EM_DIA">Em dia</option>
              <option value="PROXIMA">Próxima do prazo</option>
              <option value="ATRASADA">Atrasada</option>
              <option value="SEM_MOVIMENTACAO">Sem movimentação</option>
              <option value="BLOQUEADA">Bloqueada</option>
            </select>

            {/* Limpar Filtros */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Resumo de contagem */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <div>
            Mostrando <span className="font-semibold text-slate-800">{items.length}</span> de <span className="font-semibold text-slate-800">{total}</span> admissão(ões) encontrada(s)
          </div>
          <div className="text-[11px] text-slate-400">
            Página {page} de {totalPages}
          </div>
        </div>
      </div>

      {/* Tabela Operacional e Lista */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-500 font-medium">Carregando checklist operacional...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">Nenhuma admissão encontrada</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Não foram encontradas admissões para os filtros selecionados. Tente ajustar os parâmetros ou limpar os filtros.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 rounded-lg border border-blue-200 transition-colors"
              >
                Resetar todos os filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1050px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Colaborador</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Criação / Previsão</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('progress')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Etapa & Progresso</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Pendência Principal & Responsável</th>
                  <th className="py-3 px-4 text-center">Prioridade</th>
                  <th className="py-3 px-4">Tempo em Curso</th>
                  <th className="py-3 px-4">Situação</th>
                  <th className="py-3 px-4 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {items.map((item) => {
                  return (
                    <tr key={item.admissionId} className="hover:bg-slate-50/70 transition-colors">
                      {/* Coluna 1: Funcionário */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 leading-tight">
                          <Link 
                            to={`/admissoes/${item.admissionId}`}
                            className="hover:text-blue-600 hover:underline flex items-center gap-1.5"
                          >
                            <span>{item.employeeName}</span>
                            <ArrowUpRight className="w-3 h-3 text-slate-400" />
                          </Link>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>CPF: {item.employeeCpfMasked}</span>
                          <span>•</span>
                          <span className="font-mono text-[11px] text-slate-400">{item.admissionCode}</span>
                        </div>
                        <div className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                          <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[200px]">{item.employeeRole}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-slate-500 text-[11px] truncate max-w-[140px]">{item.employeeDepartment}</span>
                        </div>
                      </td>

                      {/* Coluna 2: Criação & Data Prevista */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-xs text-slate-700">
                          Criada: <span className="font-medium text-slate-900">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                        {item.expectedStartDate ? (
                          <div className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                            <span>Previsão:</span>
                            <span className="font-medium text-slate-900">{new Date(item.expectedStartDate).toLocaleDateString('pt-BR')}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Sem data prevista</span>
                        )}
                        <div className="text-[11px] text-slate-400 mt-1">
                          Há {item.daysSinceCreation} dia(s)
                        </div>
                      </td>

                      {/* Coluna 3: Etapa Atual & Progresso */}
                      <td className="py-3.5 px-4 min-w-[170px]">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-800">
                            {item.currentStepOrder}. {item.currentStepName}
                          </span>
                          <span className="font-bold text-slate-700">{item.progressPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              item.progressPercent === 100 
                                ? 'bg-emerald-500' 
                                : item.progressPercent > 50 
                                ? 'bg-blue-600' 
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${item.progressPercent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                          <span>Etapas: {item.completedSteps}/{item.totalSteps}</span>
                          <span>Docs: {item.approvedDocuments}/{item.totalDocuments}</span>
                        </div>
                      </td>

                      {/* Coluna 4: Pendência Principal & Responsável */}
                      <td className="py-3.5 px-4 max-w-[280px]">
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 shrink-0">
                            {item.primaryPending.type === 'BLOQUEIO' && <Lock className="w-4 h-4 text-purple-600" />}
                            {item.primaryPending.type === 'DOC_REJEITADO' && <AlertCircle className="w-4 h-4 text-rose-600" />}
                            {item.primaryPending.type === 'DOC_NAO_ENVIADO' && <FileText className="w-4 h-4 text-amber-600" />}
                            {item.primaryPending.type === 'DOC_CONFERENCIA' && <FileCheck2 className="w-4 h-4 text-sky-600" />}
                            {item.primaryPending.type === 'ETAPA_RESPONSAVEL' && <Clock className="w-4 h-4 text-blue-600" />}
                            {item.primaryPending.type === 'ADMISSAO_PROXIMA' && <Calendar className="w-4 h-4 text-amber-600" />}
                            {item.primaryPending.type === 'SEM_MOVIMENTACAO' && <Clock className="w-4 h-4 text-orange-600" />}
                            {item.primaryPending.type === 'NENHUMA' && <CheckSquare className="w-4 h-4 text-emerald-600" />}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-900 leading-tight">
                              {item.primaryPending.title}
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                              {item.primaryPending.description}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className="text-[10px] uppercase font-bold text-slate-400">Responsável:</span>
                              {getResponsibleBadge(item.currentResponsible)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Coluna 5: Prioridade */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenPriorityModal(item)}
                          className="hover:scale-105 transition-transform cursor-pointer"
                          title="Clique para alterar a prioridade operacional"
                        >
                          {getPriorityBadge(item.operationalPriority)}
                        </button>
                        {item.operationalPriorityReason && (
                          <div className="text-[10px] text-slate-400 max-w-[90px] truncate mx-auto mt-0.5" title={item.operationalPriorityReason}>
                            {item.operationalPriorityReason}
                          </div>
                        )}
                      </td>

                      {/* Coluna 6: Tempo em Curso */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                        <div className="text-slate-700">
                          Na etapa: <span className="font-semibold text-slate-900">{item.daysInCurrentStep}d</span>
                        </div>
                        <div className={`mt-0.5 ${item.daysWithoutMovement >= 3 ? 'text-amber-700 font-medium' : 'text-slate-500'}`}>
                          Sem mover: {item.daysWithoutMovement}d
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 max-w-[120px] truncate" title={item.lastActivityDescription}>
                          {item.lastActivityDescription}
                        </div>
                      </td>

                      {/* Coluna 7: Situação */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getSituationBadge(item.operationalSituation, item.operationalSituationLabel)}
                      </td>

                      {/* Coluna 8: Ações Rápidas */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Ação Primária Contextual */}
                          {item.inReviewDocuments > 0 ? (
                            <Link
                              to={`/admissoes/${item.admissionId}?tab=documentos`}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors"
                            >
                              Conferir
                            </Link>
                          ) : item.primaryPending.type === 'DOC_REJEITADO' ? (
                            <Link
                              to={`/admissoes/${item.admissionId}?tab=pendencias`}
                              className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                            >
                              Ver pendência
                            </Link>
                          ) : (
                            <Link
                              to={`/admissoes/${item.admissionId}?tab=checklist`}
                              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                              Checklist
                            </Link>
                          )}

                          {/* Comunicar Funcionário */}
                          {item.status !== 'Concluída' && item.status !== 'Cancelada' && (
                            <button
                              type="button"
                              onClick={() => handleOpenCommunication(item)}
                              title="Comunicar funcionário via WhatsApp/E-mail"
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          )}

                          {/* Ver Admissão Completa */}
                          <Link
                            to={`/admissoes/${item.admissionId}`}
                            title="Ver detalhes da admissão"
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
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

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-t border-slate-200 text-xs text-slate-600">
            <div>
              Página <span className="font-semibold text-slate-900">{page}</span> de <span className="font-semibold text-slate-900">{totalPages}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => updateParams({ page: page - 1 })}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: page + 1 })}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Comunicação Integrado */}
      {selectedAdmissionForComm && (
        <CommunicationModal
          isOpen={commModalOpen}
          onClose={() => {
            setCommModalOpen(false);
            setSelectedAdmissionForComm(null);
          }}
          admissionId={selectedAdmissionForComm.admissionId}
          admissionCode={selectedAdmissionForComm.admissionCode}
          employeeId={selectedAdmissionForComm.employeeId}
          employeeName={selectedAdmissionForComm.employeeName}
          employeePhone={selectedAdmissionForComm.employeePhone}
          expectedStartDate={selectedAdmissionForComm.expectedStartDate}
          inviteToken={`token-${selectedAdmissionForComm.admissionId}`}
          initialReason={{
            type: selectedAdmissionForComm.primaryPending.type === 'DOC_REJEITADO' ? 'document_rejected' : 'documents_pending',
            label: selectedAdmissionForComm.primaryPending.title,
            documentId: selectedAdmissionForComm.primaryPending.documentId,
            documentName: selectedAdmissionForComm.primaryPending.title,
            rejectionReason: selectedAdmissionForComm.primaryPending.description,
            detail: selectedAdmissionForComm.primaryPending.description
          }}
          onSuccess={() => {
            loadChecklistData(true);
          }}
        />
      )}

      {/* Modal para Ajuste Manual de Prioridade Operacional */}
      {priorityModalOpen && selectedItemForPriority && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in-50">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Ajustar Prioridade Operacional
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPriorityModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Colaborador: <span className="font-semibold text-slate-900">{selectedItemForPriority.employeeName}</span>
              <span className="block text-slate-400 mt-0.5">{selectedItemForPriority.employeeRole} • {selectedItemForPriority.admissionCode}</span>
            </div>

            {prioritySuccessMsg ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold">
                {prioritySuccessMsg}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Nível de Prioridade:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['NORMAL', 'ALTA', 'CRITICA'] as OperationalPriority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewPriority(p)}
                        className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          newPriority === p
                            ? p === 'CRITICA'
                              ? 'bg-rose-100 border-rose-400 text-rose-800 ring-2 ring-rose-500/20'
                              : p === 'ALTA'
                              ? 'bg-amber-100 border-amber-400 text-amber-800 ring-2 ring-amber-500/20'
                              : 'bg-blue-100 border-blue-400 text-blue-800 ring-2 ring-blue-500/20'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Justificativa / Observação (Registrado em Auditoria):
                  </label>
                  <textarea
                    rows={3}
                    value={priorityReason}
                    onChange={(e) => setPriorityReason(e.target.value)}
                    placeholder="Ex: Prazo de início antecipado pelo gestor da unidade."
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setPriorityModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={savingPriority}
                    onClick={handleSavePriority}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {savingPriority ? 'Salvando...' : 'Salvar Alteração'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Criação de Cargo com Checklist de Documentos */}
      <CreateJobPositionWithChecklistModal
        isOpen={isCreateCargoModalOpen}
        onClose={() => setIsCreateCargoModalOpen(false)}
        onSuccess={(newPos, newDocs) => {
          setCreatedCargoFeedback({
            id: newPos.id,
            name: newPos.name,
            count: newDocs.length
          });
        }}
      />
    </div>
  );
};
