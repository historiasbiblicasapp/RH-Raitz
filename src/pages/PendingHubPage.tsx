import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  Clock, 
  FileText, 
  XCircle, 
  CheckCircle2, 
  Search, 
  Filter, 
  ArrowUpDown, 
  ArrowUpRight, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  Building2, 
  Briefcase, 
  Calendar, 
  UserCheck, 
  AlertCircle,
  FileCheck2,
  X,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  MessageSquare,
  Send
} from 'lucide-react';
import { 
  PendingItem, 
  PendingPriority, 
  PendingType, 
  PendingSummary, 
  PendingHubResponse 
} from '../types/index.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { maskCPF } from '../lib/cpf.ts';

export const PendingHubPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Estados de dados
  const [items, setItems] = useState<PendingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<PendingSummary>({
    total: 0,
    notSent: 0,
    waitingReview: 0,
    rejected: 0,
    upcomingWithIssues: 0
  });
  const [filterOptions, setFilterOptions] = useState<{
    roles: string[];
    departments: string[];
    units: string[];
    documentTypes: string[];
    responsibles: string[];
  }>({
    roles: [],
    departments: [],
    units: [],
    documentTypes: [],
    responsibles: []
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Filtros derivados da URL
  const search = searchParams.get('search') || '';
  const tipo = searchParams.get('tipo') || 'todas';
  const prioridade = searchParams.get('prioridade') || 'todas';
  const status = searchParams.get('status') || 'TODOS';
  const cargo = searchParams.get('cargo') || 'TODOS';
  const setor = searchParams.get('setor') || 'TODOS';
  const unidade = searchParams.get('unidade') || 'TODOS';
  const documento = searchParams.get('documento') || 'TODOS';
  const responsavel = searchParams.get('responsavel') || 'TODOS';
  const periodo = searchParams.get('periodo') || 'todos';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const sortBy = searchParams.get('sortBy') || '';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc';

  // Helper para atualizar parâmetros de URL
  const updateParams = useCallback((newParams: Record<string, string | number | null | undefined>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(newParams).forEach(([key, val]) => {
        if (val === null || val === undefined || val === '' || val === 'todas' || val === 'TODOS' || val === 'todos') {
          next.delete(key);
        } else {
          next.set(key, String(val));
        }
      });
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Função principal de busca de pendências
  const fetchPendingItems = useCallback(async (isSilentRefresh = false) => {
    try {
      if (!isSilentRefresh) setLoading(true);
      else setRefreshing(true);

      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (tipo && tipo !== 'todas') query.set('tipo', tipo);
      if (prioridade && prioridade !== 'todas') query.set('prioridade', prioridade);
      if (status && status !== 'TODOS') query.set('status', status);
      if (cargo && cargo !== 'TODOS') query.set('cargo', cargo);
      if (setor && setor !== 'TODOS') query.set('setor', setor);
      if (unidade && unidade !== 'TODOS') query.set('unidade', unidade);
      if (documento && documento !== 'TODOS') query.set('documento', documento);
      if (responsavel && responsavel !== 'TODOS') query.set('responsavel', responsavel);
      if (page) query.set('page', String(page));
      if (limit) query.set('limit', String(limit));
      if (sortBy) query.set('sortBy', sortBy);
      if (sortOrder) query.set('sortOrder', sortOrder);

      // Tratamento de período
      if (periodo === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        query.set('startDate', todayStr);
        query.set('endDate', todayStr);
      } else if (periodo === '7d') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        query.set('startDate', d.toISOString().split('T')[0]);
      } else if (periodo === '30d') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        query.set('startDate', d.toISOString().split('T')[0]);
      }

      const res = await fetch(`/api/pendencias?${query.toString()}`);
      if (!res.ok) {
        throw new Error('Falha ao carregar central de pendências');
      }

      const data: PendingHubResponse = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setSummary(data.summary || {
        total: 0,
        notSent: 0,
        waitingReview: 0,
        rejected: 0,
        upcomingWithIssues: 0
      });
      setFilterOptions(data.filters || {
        roles: [],
        departments: [],
        units: [],
        documentTypes: [],
        responsibles: []
      });
    } catch (err) {
      console.error('Erro ao buscar pendências:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, tipo, prioridade, status, cargo, setor, unidade, documento, responsavel, periodo, page, limit, sortBy, sortOrder]);

  useEffect(() => {
    fetchPendingItems();
  }, [fetchPendingItems]);

  // Limpeza de filtros
  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(search) ||
      tipo !== 'todas' ||
      prioridade !== 'todas' ||
      status !== 'TODOS' ||
      cargo !== 'TODOS' ||
      setor !== 'TODOS' ||
      unidade !== 'TODOS' ||
      documento !== 'TODOS' ||
      responsavel !== 'TODOS' ||
      periodo !== 'todos'
    );
  }, [search, tipo, prioridade, status, cargo, setor, unidade, documento, responsavel, periodo]);

  // Ordenação de colunas
  const handleSort = (field: string) => {
    if (sortBy === field) {
      updateParams({
        sortBy: field,
        sortOrder: sortOrder === 'asc' ? 'desc' : 'asc',
        page: 1
      });
    } else {
      updateParams({
        sortBy: field,
        sortOrder: 'asc',
        page: 1
      });
    }
  };

  // Renderização de badge de prioridade calculada
  const renderPriorityBadge = (priority: PendingPriority, isOverdue?: boolean) => {
    if (priority === 'Alta') {
      return (
        <span 
          id="badge-priority-alta"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
          <span>Alta</span>
          {isOverdue && <span className="text-[10px] text-rose-500 font-semibold">(Atrasado)</span>}
        </span>
      );
    }
    if (priority === 'Média') {
      return (
        <span 
          id="badge-priority-media"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>Média</span>
        </span>
      );
    }
    return (
      <span 
        id="badge-priority-baixa"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        <span>Baixa</span>
      </span>
    );
  };

  // Renderização de badge do tipo de pendência
  const renderPendingTypeBadge = (item: PendingItem) => {
    switch (item.pendingType) {
      case 'aguardando_conferencia':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Aguardando conferência</span>
          </span>
        );
      case 'documento_rejeitado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200/80">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Documento rejeitado</span>
          </span>
        );
      case 'aguardando_reenvio':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200/80">
            <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
            <span>Aguardando reenvio</span>
          </span>
        );
      case 'admissao_proxima':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200/80">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>{item.isOverdue ? 'Prazo ultrapassado' : 'Admissão próxima'}</span>
          </span>
        );
      case 'documento_nao_enviado':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Não enviado</span>
          </span>
        );
    }
  };

  // Navegação direta com foco no documento
  const handleOpenAdmission = (item: PendingItem) => {
    if (item.documentId) {
      navigate(`/admissoes/${item.admissionId}?tab=documentos&docId=${item.documentId}`);
    } else {
      navigate(`/admissoes/${item.admissionId}?tab=documentos`);
    }
  };

  return (
    <div id="central-de-pendencias-container" className="space-y-6 pb-12">
      {/* 1. Header Operacional da Central */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Central de Pendências
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Fila operacional em tempo real de admissões e documentos que necessitam de ação do RH.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/comunicacao"
            id="btn-link-comunicacao-hub"
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors shadow-2xs cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
            <span>Comunicação com Funcionários</span>
          </Link>

          <button
            type="button"
            id="btn-refresh-pendencias"
            onClick={() => fetchPendingItems(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
          </button>
        </div>
      </div>

      {/* 2. Cards de Resumo Operacional no Topo (Seção 4) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card: Total */}
        <button
          type="button"
          id="summary-card-total"
          onClick={() => updateParams({ tipo: 'todas', page: 1 })}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            tipo === 'todas'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${tipo === 'todas' ? 'text-slate-300' : 'text-slate-500'}`}>
              Total Pendências
            </span>
            <Layers className={`w-4 h-4 ${tipo === 'todas' ? 'text-slate-300' : 'text-slate-400'}`} />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black tracking-tight">
            {summary.total}
          </div>
          <p className={`text-[11px] mt-1 ${tipo === 'todas' ? 'text-slate-400' : 'text-slate-500'}`}>
            Itens na fila operacional
          </p>
        </button>

        {/* Card: Não enviados */}
        <button
          type="button"
          id="summary-card-nao-enviados"
          onClick={() => updateParams({ tipo: 'documento_nao_enviado', page: 1 })}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            tipo === 'documento_nao_enviado'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-blue-200 hover:shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${tipo === 'documento_nao_enviado' ? 'text-blue-100' : 'text-slate-500'}`}>
              Não enviados
            </span>
            <FileText className={`w-4 h-4 ${tipo === 'documento_nao_enviado' ? 'text-blue-200' : 'text-blue-500'}`} />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black tracking-tight">
            {summary.notSent}
          </div>
          <p className={`text-[11px] mt-1 ${tipo === 'documento_nao_enviado' ? 'text-blue-100' : 'text-slate-500'}`}>
            Obrigatórios pendentes
          </p>
        </button>

        {/* Card: Aguardando conferência */}
        <button
          type="button"
          id="summary-card-aguardando-conferencia"
          onClick={() => updateParams({ tipo: 'aguardando_conferencia', page: 1 })}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            tipo === 'aguardando_conferencia'
              ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-amber-200 hover:shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${tipo === 'aguardando_conferencia' ? 'text-amber-100' : 'text-slate-500'}`}>
              Conferência
            </span>
            <Clock className={`w-4 h-4 ${tipo === 'aguardando_conferencia' ? 'text-amber-100' : 'text-amber-500'}`} />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black tracking-tight">
            {summary.waitingReview}
          </div>
          <p className={`text-[11px] mt-1 ${tipo === 'aguardando_conferencia' ? 'text-amber-100' : 'text-slate-500'}`}>
            Aguardando análise RH
          </p>
        </button>

        {/* Card: Documentos rejeitados */}
        <button
          type="button"
          id="summary-card-rejeitados"
          onClick={() => updateParams({ tipo: 'documento_rejeitado', page: 1 })}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            tipo === 'documento_rejeitado'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-600/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-rose-200 hover:shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${tipo === 'documento_rejeitado' ? 'text-rose-100' : 'text-slate-500'}`}>
              Rejeitados
            </span>
            <XCircle className={`w-4 h-4 ${tipo === 'documento_rejeitado' ? 'text-rose-100' : 'text-rose-500'}`} />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black tracking-tight">
            {summary.rejected}
          </div>
          <p className={`text-[11px] mt-1 ${tipo === 'documento_rejeitado' ? 'text-rose-100' : 'text-slate-500'}`}>
            Aguardando correção
          </p>
        </button>

        {/* Card: Admissões próximas */}
        <button
          type="button"
          id="summary-card-proximas"
          onClick={() => updateParams({ tipo: 'admissao_proxima', page: 1 })}
          className={`col-span-2 sm:col-span-1 p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            tipo === 'admissao_proxima'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-600/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-200 hover:shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${tipo === 'admissao_proxima' ? 'text-indigo-100' : 'text-slate-500'}`}>
              Próximas
            </span>
            <AlertTriangle className={`w-4 h-4 ${tipo === 'admissao_proxima' ? 'text-indigo-200' : 'text-indigo-500'}`} />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black tracking-tight">
            {summary.upcomingWithIssues}
          </div>
          <p className={`text-[11px] mt-1 ${tipo === 'admissao_proxima' ? 'text-indigo-100' : 'text-slate-500'}`}>
            Prazo crítico com pendências
          </p>
        </button>
      </div>

      {/* 3. Barra de Busca e Filtros Operacionais */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Campo de Busca Textual */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              id="input-search-pendencias"
              value={search}
              onChange={(e) => updateParams({ search: e.target.value, page: 1 })}
              placeholder="Buscar colaborador, CPF, cargo, documento ou código da admissão..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => updateParams({ search: '', page: 1 })}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro Rápido de Tipo */}
          <div className="w-full md:w-56 shrink-0">
            <select
              id="select-tipo-pendencia"
              value={tipo}
              onChange={(e) => updateParams({ tipo: e.target.value, page: 1 })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
            >
              <option value="todas">Todos os tipos de pendência</option>
              <option value="documento_nao_enviado">Documento não enviado</option>
              <option value="aguardando_conferencia">Aguardando conferência</option>
              <option value="documento_rejeitado">Documento rejeitado</option>
              <option value="aguardando_reenvio">Aguardando reenvio</option>
              <option value="admissao_proxima">Admissão com prazo crítico</option>
            </select>
          </div>

          {/* Filtro de Prioridade */}
          <div className="w-full md:w-44 shrink-0">
            <select
              id="select-prioridade"
              value={prioridade}
              onChange={(e) => updateParams({ prioridade: e.target.value, page: 1 })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
            >
              <option value="todas">Todas as prioridades</option>
              <option value="Alta">Alta prioridade</option>
              <option value="Média">Média prioridade</option>
              <option value="Baixa">Baixa prioridade</option>
            </select>
          </div>

          {/* Toggle de Filtros Avançados */}
          <button
            type="button"
            id="btn-toggle-filtros-avancados"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-colors cursor-pointer w-full md:w-auto shrink-0 ${
              showAdvancedFilters || hasActiveFilters
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <span>Filtros</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-blue-600" />
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Área Expansível de Filtros Avançados */}
        {showAdvancedFilters && (
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in duration-200">
            {/* Cargo */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Cargo
              </label>
              <select
                id="filter-cargo"
                value={cargo}
                onChange={(e) => updateParams({ cargo: e.target.value, page: 1 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
              >
                <option value="TODOS">Todos os cargos</option>
                {filterOptions.roles.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Setor */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Setor / Departamento
              </label>
              <select
                id="filter-setor"
                value={setor}
                onChange={(e) => updateParams({ setor: e.target.value, page: 1 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
              >
                <option value="TODOS">Todos os setores</option>
                {filterOptions.departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Documento */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Documento
              </label>
              <select
                id="filter-documento"
                value={documento}
                onChange={(e) => updateParams({ documento: e.target.value, page: 1 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
              >
                <option value="TODOS">Todos os tipos de doc</option>
                {filterOptions.documentTypes.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Período */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Período
              </label>
              <select
                id="filter-periodo"
                value={periodo}
                onChange={(e) => updateParams({ periodo: e.target.value, page: 1 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
              >
                <option value="todos">Todo o histórico</option>
                <option value="today">Hoje</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
              </select>
            </div>
          </div>
        )}

        {/* Feedback de filtros ativos e botão limpar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <div className="text-slate-500">
              Exibindo resultados filtrados ({total} de {summary.total} pendências)
            </div>
            <button
              type="button"
              id="btn-clear-filters-pendencias"
              onClick={handleClearFilters}
              className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar todos os filtros</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Tabela Operacional Principal da Central de Pendências (Seção 5) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 mx-auto text-blue-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-700">Carregando fila operacional de pendências...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {hasActiveFilters ? 'Nenhuma pendência encontrada com os filtros selecionados' : 'Tudo em dia na admissão!'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {hasActiveFilters 
                  ? 'Experimente remover alguns dos filtros aplicados para visualizar outros registros.'
                  : 'Nenhum documento aguarda conferência ou possui rejeição no momento.'}
              </p>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table id="table-central-pendencias" className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                  <th 
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('prioridade')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Prioridade</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('funcionario')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Funcionário</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">CPF</th>
                  <th className="py-3.5 px-4">Admissão</th>
                  <th 
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('cargo')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Cargo</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('documento')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Documento</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Tipo de Pendência</th>
                  <th className="py-3.5 px-4">Status Atual</th>
                  <th 
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('data')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Data</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Responsável</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr 
                    key={item.id} 
                    id={`pendencia-row-${item.id}`}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Prioridade */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderPriorityBadge(item.priority, item.isOverdue)}
                    </td>

                    {/* Funcionário */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 leading-snug">
                        {item.employeeName}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span>{item.department}</span>
                        {item.unit && (
                          <>
                            <span>•</span>
                            <span>{item.unit}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* CPF mascarado rigorosamente */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-600">
                      {item.employeeCpf}
                    </td>

                    {/* Código da Admissão */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {item.admissionCode}
                      </span>
                    </td>

                    {/* Cargo */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-medium">
                      {item.role}
                    </td>

                    {/* Documento */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span>{item.documentName || 'Checklist Geral'}</span>
                        {item.isRequired ? (
                          <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded uppercase">
                            Obrigatório
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded uppercase">
                            Opcional
                          </span>
                        )}
                      </div>
                      {item.rejectionReason && (
                        <div className="text-[11px] text-rose-700 mt-1 max-w-xs truncate" title={item.rejectionReason}>
                          Motivo: <span className="font-semibold">{item.rejectionReason}</span>
                        </div>
                      )}
                    </td>

                    {/* Tipo de Pendência */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderPendingTypeBadge(item)}
                    </td>

                    {/* Status Atual */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={item.currentStatus as any} size="sm" />
                    </td>

                    {/* Data */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
                      {item.date ? new Date(item.date).toLocaleDateString('pt-BR') : '-'}
                      {item.expectedStartDate && (
                        <div className="text-[10px] text-slate-400">
                          Início: {new Date(item.expectedStartDate).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </td>

                    {/* Responsável */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600">
                      {item.reviewerOrResponsible || '-'}
                    </td>

                    {/* Ações: Comunicar & Ver admissão */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-right space-x-1.5">
                      <button
                        type="button"
                        id={`btn-comunicar-pendencia-${item.id}`}
                        onClick={() => navigate(`/comunicacao?search=${encodeURIComponent(item.employeeName)}`)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors shadow-2xs cursor-pointer group/btn"
                        title="Comunicar funcionário sobre esta pendência"
                      >
                        <Send className="w-3 h-3 text-emerald-600 group-hover/btn:text-white transition-colors" />
                        <span>Comunicar</span>
                      </button>

                      <button
                        type="button"
                        id={`btn-ver-admissao-${item.id}`}
                        onClick={() => handleOpenAdmission(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors shadow-2xs cursor-pointer group/btn"
                      >
                        <span>Ver admissão</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-blue-500 group-hover/btn:text-white transition-colors" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Paginação Operacional (Seção 18) */}
        {!loading && items.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50/50">
            <div className="text-slate-500">
              Mostrando <span className="font-bold text-slate-800">{items.length}</span> de{' '}
              <span className="font-bold text-slate-800">{total}</span> itens
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-slate-600 mr-2">
                <span>Itens por página:</span>
                <select
                  value={limit}
                  onChange={(e) => updateParams({ limit: Number(e.target.value), page: 1 })}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => updateParams({ page: Math.max(1, page - 1) })}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-semibold text-slate-700">
                  {page} de {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => updateParams({ page: Math.min(totalPages, page + 1) })}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
