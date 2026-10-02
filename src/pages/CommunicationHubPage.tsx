import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  RotateCcw, 
  Clock, 
  AlertCircle, 
  FileCheck, 
  FileWarning, 
  Users, 
  Send, 
  ArrowUpRight, 
  Calendar, 
  CheckCircle2, 
  X, 
  Phone,
  RefreshCw,
  Eye,
  History,
  Copy,
  CheckSquare,
  FileText,
  ExternalLink
} from 'lucide-react';
import { 
  CommunicationItem, 
  CommunicationHubResponse, 
  CommunicationSummary, 
  CommunicationType,
  CommunicationLog,
  CommunicationActionStatus
} from '../types/index.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { CommunicationModal } from '../components/CommunicationModal.tsx';
import { safeFetchJson } from '../lib/api.ts';
import { handleFallbackApiRoute } from '../lib/fallbackClient.ts';

export const CommunicationHubPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Navegação entre Fila Operacional e Histórico Auditável
  const [activeTab, setActiveTab] = useState<'fila' | 'historico'>('fila');

  // Estados de dados da Fila de Comunicação
  const [items, setItems] = useState<CommunicationItem[]>([]);
  const [summary, setSummary] = useState<CommunicationSummary>({
    inProgressCount: 0,
    waitingDocumentsCount: 0,
    rejectedDocumentsCount: 0,
    waitingResponseCount: 0,
    upcomingWithIssuesCount: 0
  });
  const [filterOptions, setFilterOptions] = useState<{
    roles: string[];
    departments: string[];
    units: string[];
    statuses: string[];
  }>({
    roles: [],
    departments: [],
    units: [],
    statuses: []
  });

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados do Histórico Cronológico de Comunicações (Bloco 6.8D)
  const [historyLogs, setHistoryLogs] = useState<CommunicationLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyActionFilter, setHistoryActionFilter] = useState<'TODOS' | CommunicationActionStatus>('TODOS');

  // Parâmetros de Filtro extraídos da URL (mantém histórico e compartilhamento)
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const documentStatus = searchParams.get('docStatus') || '';
  const cargo = searchParams.get('cargo') || 'TODOS';
  const setor = searchParams.get('setor') || 'TODOS';
  const unidade = searchParams.get('unidade') || 'TODOS';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Modal de Comunicação
  const [activeModalItem, setActiveModalItem] = useState<CommunicationItem | null>(null);

  // Drawer / painel de filtros avançados
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);

  // Atualizador de URLSearchParams
  const updateParams = useCallback((newParams: Record<string, string | number | null | undefined>) => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      Object.entries(newParams).forEach(([key, val]) => {
        if (val === null || val === undefined || val === '' || val === 'TODOS') {
          p.delete(key);
        } else {
          p.set(key, String(val));
        }
      });
      return p;
    });
  }, [setSearchParams]);

  // Carregamento dos dados da Fila de Comunicação
  const fetchCommunicationData = useCallback(async (isSilent = false) => {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (status) q.set('status', status);
    if (documentStatus) q.set('documentStatus', documentStatus);
    if (cargo && cargo !== 'TODOS') q.set('cargo', cargo);
    if (setor && setor !== 'TODOS') q.set('setor', setor);
    if (unidade && unidade !== 'TODOS') q.set('unidade', unidade);
    q.set('page', String(page));
    q.set('limit', '15');

    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const data = await safeFetchJson<CommunicationHubResponse>(`/api/communications?${q.toString()}`);
      if (data) {
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(data.total ?? (Array.isArray(data.items) ? data.items.length : 0));
        setTotalPages(data.totalPages ?? 1);
        if (data.summary) {
          setSummary({
            inProgressCount: data.summary.inProgressCount ?? 0,
            waitingDocumentsCount: data.summary.waitingDocumentsCount ?? 0,
            rejectedDocumentsCount: data.summary.rejectedDocumentsCount ?? 0,
            waitingResponseCount: data.summary.waitingResponseCount ?? 0,
            upcomingWithIssuesCount: data.summary.upcomingWithIssuesCount ?? 0
          });
        }
        if (data.filters) {
          setFilterOptions({
            roles: Array.isArray(data.filters.roles) ? data.filters.roles : [],
            departments: Array.isArray(data.filters.departments) ? data.filters.departments : [],
            units: Array.isArray(data.filters.units) ? data.filters.units : [],
            statuses: Array.isArray(data.filters.statuses) ? data.filters.statuses : []
          });
        }
      }
    } catch (err: any) {
      console.warn('Utilizando dados locais de comunicação:', err);
      const fallback = handleFallbackApiRoute(`/api/communications?${q.toString()}`);
      if (fallback) {
        setItems(Array.isArray(fallback.items) ? fallback.items : []);
        setTotal(fallback.total ?? (Array.isArray(fallback.items) ? fallback.items.length : 0));
        setTotalPages(fallback.totalPages ?? 1);
        if (fallback.summary) {
          setSummary({
            inProgressCount: fallback.summary.inProgressCount ?? 0,
            waitingDocumentsCount: fallback.summary.waitingDocumentsCount ?? 0,
            rejectedDocumentsCount: fallback.summary.rejectedDocumentsCount ?? 0,
            waitingResponseCount: fallback.summary.waitingResponseCount ?? 0,
            upcomingWithIssuesCount: fallback.summary.upcomingWithIssuesCount ?? 0
          });
        }
        if (fallback.filters) {
          setFilterOptions({
            roles: Array.isArray(fallback.filters.roles) ? fallback.filters.roles : [],
            departments: Array.isArray(fallback.filters.departments) ? fallback.filters.departments : [],
            units: Array.isArray(fallback.filters.units) ? fallback.filters.units : [],
            statuses: Array.isArray(fallback.filters.statuses) ? fallback.filters.statuses : []
          });
        }
      } else {
        setItems([]);
        setTotal(0);
        setTotalPages(1);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, status, documentStatus, cargo, setor, unidade, page]);

  // Carregamento do Histórico de Comunicações (Bloco 6.8D)
  const fetchHistoryData = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const data = await safeFetchJson<{ logs: CommunicationLog[] }>('/api/communications/logs');
      if (data && Array.isArray(data.logs)) {
        setHistoryLogs(data.logs);
      } else {
        setHistoryLogs([]);
      }
    } catch (err) {
      console.warn('Utilizando fallback para histórico de comunicações:', err);
      const fallback = handleFallbackApiRoute('/api/communications/logs');
      if (fallback && Array.isArray(fallback.logs)) {
        setHistoryLogs(fallback.logs);
      } else {
        setHistoryLogs([]);
      }
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommunicationData();
  }, [fetchCommunicationData]);

  useEffect(() => {
    if (activeTab === 'historico') {
      fetchHistoryData();
    }
  }, [activeTab, fetchHistoryData]);

  // Limpa todos os filtros da Fila
  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  // Verifica se há filtros ativos
  const hasActiveFilters = Boolean(
    search || status || documentStatus || (cargo && cargo !== 'TODOS') || (setor && setor !== 'TODOS') || (unidade && unidade !== 'TODOS')
  );

  // Renderização segura da Pendência Principal (Proteção contra undefined e campos vazios)
  const renderPendingBadge = (reason?: CommunicationItem['mainPendingReason']) => {
    if (!reason) {
      return (
        <span className="text-slate-400 italic text-[11px]">
          Sem pendências críticas
        </span>
      );
    }

    let colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
    if (reason.priority === 'Alta') {
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
    } else if (reason.priority === 'Média') {
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
    }

    return (
      <div className="space-y-1">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${colorClasses}`}>
          {reason.label || 'Pendência'}
        </span>
        {reason.detail && (
          <div className="text-xs text-slate-700 leading-snug line-clamp-2" title={reason.detail}>
            {reason.detail}
          </div>
        )}
      </div>
    );
  };

  // Formatação segura de data/hora
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'Nunca comunicou';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '-';
      return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return '-';
    }
  };

  // Indicadores de Comunicação (Bloco 6.8D - Seção 8: Garantir funcionamento seguro com 0 registros)
  const safeHistoryLogs = Array.isArray(historyLogs) ? historyLogs : [];
  const historyStats = {
    total: safeHistoryLogs.length,
    whatsapp: safeHistoryLogs.filter(l => l.actionStatus === 'whatsapp_opened').length,
    copiedMessage: safeHistoryLogs.filter(l => l.actionStatus === 'message_copied').length,
    copiedLink: safeHistoryLogs.filter(l => l.actionStatus === 'link_copied').length
  };

  // Filtro do Histórico
  const filteredHistoryLogs = safeHistoryLogs.filter(log => {
    if (historyActionFilter !== 'TODOS' && log.actionStatus !== historyActionFilter) {
      return false;
    }
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase().trim();
      const matchAdm = (log.admissionId || '').toLowerCase().includes(q);
      const matchUser = (log.userName || '').toLowerCase().includes(q);
      const matchDoc = (log.documentName || '').toLowerCase().includes(q);
      const matchTask = (log.taskId || '').toLowerCase().includes(q);
      const matchPreview = (log.messagePreview || '').toLowerCase().includes(q);
      const matchType = (log.communicationType || '').toLowerCase().includes(q);
      return matchAdm || matchUser || matchDoc || matchTask || matchPreview || matchType;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100/80 text-blue-700 border border-blue-200/70">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Central de Comunicação com Funcionários
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gestão de avisos operacionais, rastreabilidade auditável e histórico cronológico em conformidade com a LGPD.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            id="btn-refresh-communications"
            onClick={() => {
              if (activeTab === 'fila') fetchCommunicationData(true);
              else fetchHistoryData();
            }}
            disabled={loading || refreshing || historyLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing || historyLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <Link
            to="/tarefas"
            id="link-comunicacao-para-tarefas"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100/80 transition-colors shadow-2xs cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
            <span>Tarefas Operacionais</span>
          </Link>

          <Link
            to="/pendencias"
            id="link-comunicacao-para-central-pendencias"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100/80 transition-colors shadow-2xs cursor-pointer"
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Central de Pendências</span>
          </Link>
        </div>
      </div>

      {/* 2. NAVEGAÇÃO DE ABAS: FILA VS HISTÓRICO (Bloco 6.8D) */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          id="tab-fila-comunicacao"
          onClick={() => setActiveTab('fila')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'fila'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Fila de Ações de Contato</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
            {items?.length ?? 0}
          </span>
        </button>

        <button
          type="button"
          id="tab-historico-comunicacao"
          onClick={() => {
            setActiveTab('historico');
            fetchHistoryData();
          }}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'historico'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Histórico Auditável & Rastreabilidade</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
            {historyStats.total}
          </span>
        </button>
      </div>

      {/* VISÃO DA FILA DE COMUNICAÇÃO */}
      {activeTab === 'fila' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* CARDS DE RESUMO OPERACIONAL */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Funcionários em processo */}
            <div 
              onClick={() => updateParams({ status: 'TODOS', docStatus: null, page: 1 })}
              className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
                !status && !documentStatus ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-xs' : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Em processo</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {summary?.inProgressCount ?? 0}
                </span>
                <span className="text-[11px] text-slate-400">candidatos</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 truncate">
                Admissões em andamento
              </p>
            </div>

            {/* Aguardando documentos */}
            <div 
              onClick={() => updateParams({ docStatus: 'nao_enviado', page: 1 })}
              className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
                documentStatus === 'nao_enviado' ? 'border-amber-500 ring-2 ring-amber-500/10 shadow-xs' : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Aguardando docs</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {summary?.waitingDocumentsCount ?? 0}
                </span>
                <span className="text-[11px] text-amber-700 font-medium">pendentes</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 truncate">
                Documentos não enviados
              </p>
            </div>

            {/* Documentos rejeitados */}
            <div 
              onClick={() => updateParams({ docStatus: 'rejeitado', page: 1 })}
              className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
                documentStatus === 'rejeitado' ? 'border-rose-500 ring-2 ring-rose-500/10 shadow-xs' : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Docs rejeitados</span>
                <FileWarning className="w-4 h-4 text-rose-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-rose-600">
                  {summary?.rejectedDocumentsCount ?? 0}
                </span>
                <span className="text-[11px] text-rose-600 font-medium">precisam correção</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 truncate">
                Aguardando reenvio
              </p>
            </div>

            {/* Aguardando resposta */}
            <div 
              onClick={() => updateParams({ status: 'Aguardando documentos', page: 1 })}
              className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
                status === 'Aguardando documentos' ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-xs' : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Aguardando resposta</span>
                <Send className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {summary?.waitingResponseCount ?? 0}
                </span>
                <span className="text-[11px] text-indigo-700 font-medium">notificados</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 truncate">
                Convite ou aviso ativo
              </p>
            </div>

            {/* Admissões próximas */}
            <div 
              onClick={() => updateParams({ status: 'Pendência', page: 1 })}
              className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white col-span-2 sm:col-span-1 ${
                status === 'Pendência' ? 'border-orange-500 ring-2 ring-orange-500/10 shadow-xs' : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Admissões próximas</span>
                <Calendar className="w-4 h-4 text-orange-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-orange-600">
                  {summary?.upcomingWithIssuesCount ?? 0}
                </span>
                <span className="text-[11px] text-orange-700 font-medium">atenção</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 truncate">
                Prazo de início crítico
              </p>
            </div>
          </div>

          {/* BARRA DE BUSCA E FILTROS */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Campo de Busca Textual */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="input-busca-comunicacao"
                  value={search}
                  onChange={(e) => updateParams({ search: e.target.value, page: 1 })}
                  placeholder="Buscar por nome, CPF mascarado, cargo ou código ADM-..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => updateParams({ search: '', page: 1 })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Botão de Filtros Avançados */}
                <button
                  type="button"
                  id="btn-toggle-filtros-avancados"
                  onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    showFiltersDrawer || hasActiveFilters
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filtros</span>
                  {hasActiveFilters && (
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  )}
                </button>

                {/* Limpar Filtros */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    id="btn-limpar-filtros"
                    onClick={handleClearFilters}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Limpar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Drawer / Grid de Filtros Avançados */}
            {showFiltersDrawer && (
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-150">
                {/* Situação da Admissão */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Situação da Admissão
                  </label>
                  <select
                    id="filter-situacao-admissao"
                    value={status}
                    onChange={(e) => updateParams({ status: e.target.value, page: 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium cursor-pointer"
                  >
                    <option value="">Priorizar ativas (Padrão)</option>
                    <option value="TODOS">Todas as situações</option>
                    <option value="Rascunho">Rascunho</option>
                    <option value="Aguardando documentos">Aguardando documentos</option>
                    <option value="Em conferência">Em conferência</option>
                    <option value="Pendência">Pendência</option>
                    <option value="Concluída">Concluída</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </div>

                {/* Situação Documental */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Situação Documental
                  </label>
                  <select
                    id="filter-situacao-documental"
                    value={documentStatus}
                    onChange={(e) => updateParams({ docStatus: e.target.value, page: 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium cursor-pointer"
                  >
                    <option value="">Todas</option>
                    <option value="rejeitado">Com documentos rejeitados</option>
                    <option value="nao_enviado">Com documentos não enviados</option>
                    <option value="em_analise">Com documentos em análise</option>
                    <option value="aprovado">Todos os documentos aprovados</option>
                  </select>
                </div>

                {/* Cargo */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Cargo
                  </label>
                  <select
                    id="filter-cargo-comunicacao"
                    value={cargo}
                    onChange={(e) => updateParams({ cargo: e.target.value, page: 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium cursor-pointer"
                  >
                    <option value="TODOS">Todos os cargos</option>
                    {(filterOptions?.roles ?? []).map(r => (
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
                    id="filter-setor-comunicacao"
                    value={setor}
                    onChange={(e) => updateParams({ setor: e.target.value, page: 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium cursor-pointer"
                  >
                    <option value="TODOS">Todos os setores</option>
                    {(filterOptions?.departments ?? []).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* CONTEÚDO PRINCIPAL: TABELA E CARDS MOBILE */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Barra superior de contagem */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Exibindo <strong>{items?.length ?? 0}</strong> de <strong>{total ?? 0}</strong> candidatos
              </span>
              {hasActiveFilters && (
                <span className="text-blue-600 font-medium">
                  Filtros ativos aplicados
                </span>
              )}
            </div>

            {/* Estado: Carregando */}
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs font-semibold text-slate-600">
                  Carregando dados de comunicação...
                </p>
              </div>
            ) : error ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 border border-rose-200">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Não foi possível carregar os dados de comunicação.
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => fetchCommunicationData()}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Tentar novamente</span>
                </button>
              </div>
            ) : (items?.length ?? 0) === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-200">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Nenhuma comunicação pendente
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Não existem admissões que necessitem de comunicação no momento.
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="mt-4 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Limpar filtros aplicados
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* VISÃO DESKTOP / TABLET: TABELA */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="py-3.5 px-4">Funcionário</th>
                        <th className="py-3.5 px-4">CPF</th>
                        <th className="py-3.5 px-4">Cargo</th>
                        <th className="py-3.5 px-4">Admissão</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Pendência Principal</th>
                        <th className="py-3.5 px-4">Última Comunicação</th>
                        <th className="py-3.5 px-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(items ?? []).map((item) => (
                        <tr 
                          key={item.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
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

                          {/* CPF (Mascarado) */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-600">
                            {item.employeeCpf}
                          </td>

                          {/* Cargo */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-medium">
                            {item.role}
                          </td>

                          {/* Admissão */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              {item.admissionCode}
                            </span>
                            {item.expectedStartDate && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Início: {new Date(item.expectedStartDate).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </td>

                          {/* Status da Admissão */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <StatusBadge status={item.admissionStatus} size="sm" />
                          </td>

                          {/* Pendência Principal */}
                          <td className="py-3.5 px-4 max-w-xs">
                            {renderPendingBadge(item.mainPendingReason)}
                          </td>

                          {/* Última Comunicação */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {item.lastCommunication ? (
                              <div>
                                <div className="font-medium text-slate-800 flex items-center gap-1">
                                  <span className="capitalize">{item.lastCommunication.channel}</span>
                                  <span>•</span>
                                  <span className="text-[11px] text-slate-500">{item.lastCommunication.actionStatusLabel}</span>
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {formatDateTime(item.lastCommunication.createdAt)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">
                                Nenhuma comunicação
                              </span>
                            )}
                          </td>

                          {/* Ações: Comunicar & Ver admissão */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-right space-x-1.5">
                            <button
                              type="button"
                              id={`btn-comunicar-${item.id}`}
                              onClick={() => setActiveModalItem(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors shadow-2xs cursor-pointer group/btn"
                            >
                              <Send className="w-3.5 h-3.5 text-emerald-600 group-hover/btn:text-white transition-colors" />
                              <span>Comunicar</span>
                            </button>

                            <button
                              type="button"
                              id={`btn-ver-admissao-${item.id}`}
                              onClick={() => navigate(`/admissoes/${item.admissionId}`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                              title="Ver admissão"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* VISÃO MOBILE: CARDS RESPONSIVOS */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {(items ?? []).map((item) => (
                    <div key={`mobile-${item.id}`} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            {item.employeeName}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {item.role} • {item.employeeCpf}
                          </div>
                        </div>
                        <StatusBadge status={item.admissionStatus} size="sm" />
                      </div>

                      {/* Detalhe da pendência */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                        {renderPendingBadge(item.mainPendingReason)}
                      </div>

                      {/* Informações adicionais */}
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                        <span>
                          Admissão: <strong className="font-mono text-slate-700">{item.admissionCode}</strong>
                        </span>
                        {item.expectedStartDate && (
                          <span>
                            Início: {new Date(item.expectedStartDate).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>

                      {/* Ações Mobile */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setActiveModalItem(item)}
                          className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Comunicar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate(`/admissoes/${item.admissionId}`)}
                          className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          <span>Ver admissão</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* PAGINAÇÃO */}
                {totalPages > 1 && (
                  <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Página {page} de {totalPages}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => updateParams({ page: page - 1 })}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Anterior
                      </button>

                      <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => updateParams({ page: page + 1 })}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* VISÃO DO HISTÓRICO CRONOLÓGICO DE COMUNICAÇÕES (Bloco 6.8D) */}
      {activeTab === 'historico' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* INDICADORES DE COMUNICAÇÃO (Seção 8: Resiliência contra undefined.length, zero registros suportado) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Total de Ações */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Total de Ações</span>
                <History className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {historyStats.total}
              </p>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Registros auditados
              </span>
            </div>

            {/* WhatsApp Aberto */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>WhatsApp Aberto</span>
                <Phone className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-emerald-600 mt-2">
                {historyStats.whatsapp}
              </p>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Abertura para envio
              </span>
            </div>

            {/* Mensagem Copiada */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Mensagem Copiada</span>
                <Copy className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {historyStats.copiedMessage}
              </p>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Área de transferência
              </span>
            </div>

            {/* Link Copiado */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Link Copiado</span>
                <ArrowUpRight className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-600 mt-2">
                {historyStats.copiedLink}
              </p>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Link de acesso seguro
              </span>
            </div>
          </div>

          {/* BARRA DE FILTROS DO HISTÓRICO */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="input-busca-historico"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Filtrar histórico por operador, admissão, documento ou conteúdo..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {historySearch && (
                <button
                  type="button"
                  onClick={() => setHistorySearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                id="select-filtro-acao-historico"
                value={historyActionFilter}
                onChange={(e) => setHistoryActionFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="TODOS">Todos os tipos de ação</option>
                <option value="whatsapp_opened">WhatsApp aberto</option>
                <option value="message_copied">Mensagem copiada</option>
                <option value="link_copied">Link copiado</option>
              </select>

              {(historySearch || historyActionFilter !== 'TODOS') && (
                <button
                  type="button"
                  onClick={() => {
                    setHistorySearch('');
                    setHistoryActionFilter('TODOS');
                  }}
                  className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* TABELA AUDITÁVEL DE HISTÓRICO (Bloco 6.8D - Seções 6, 7 e 9) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Exibindo <strong>{filteredHistoryLogs?.length ?? 0}</strong> de <strong>{safeHistoryLogs.length}</strong> registros cronológicos
              </span>
              <span className="text-[11px] text-slate-400">
                Estados reais de interação • Sem presunção de leitura/entrega
              </span>
            </div>

            {historyLoading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs font-semibold text-slate-600">
                  Carregando histórico auditável...
                </p>
              </div>
            ) : (filteredHistoryLogs?.length ?? 0) === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-200">
                  <History className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Nenhum registro de comunicação encontrado
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {historySearch || historyActionFilter !== 'TODOS'
                    ? 'Nenhum registro corresponde aos filtros selecionados.'
                    : 'Ainda não foram realizadas comunicações com funcionários no sistema.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-4">Data / Hora</th>
                      <th className="py-3.5 px-4">Operador</th>
                      <th className="py-3.5 px-4">Canal</th>
                      <th className="py-3.5 px-4">Tipo / Contexto</th>
                      <th className="py-3.5 px-4">Admissão / Candidato</th>
                      <th className="py-3.5 px-4">Documento Relacionado</th>
                      <th className="py-3.5 px-4">Tarefa Vinculada</th>
                      <th className="py-3.5 px-4">Status da Ação</th>
                      <th className="py-3.5 px-4">Prévia (LGPD &le; 160c)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(filteredHistoryLogs ?? []).map((log) => {
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Data/Hora */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-semibold text-slate-900 block font-mono text-[11px]">
                              {new Date(log.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(log.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </td>

                          {/* Operador */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-bold text-slate-900 block">
                              {log.userName || 'Sistema RH'}
                            </span>
                            {log.userId && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {log.userId}
                              </span>
                            )}
                          </td>

                          {/* Canal */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {log.channel === 'whatsapp' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Phone className="w-3 h-3 text-emerald-600" />
                                WhatsApp
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                <Copy className="w-3 h-3 text-slate-500" />
                                Área de transf.
                              </span>
                            )}
                          </td>

                          {/* Tipo de Comunicação */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-semibold text-slate-800 capitalize block">
                              {(log.communicationType || 'Aviso').replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Tpl: {log.templateId || 'padrão'}
                            </span>
                          </td>

                          {/* Candidato / Admissão */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <Link
                              to={`/admissoes/${log.admissionId}`}
                              className="font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                              title="Abrir admissão"
                            >
                              <span>{log.admissionId.replace('adm-', 'ADM-').slice(0, 12)}</span>
                              <ExternalLink className="w-3 h-3 text-blue-500" />
                            </Link>
                            {log.employeeId && (
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {log.employeeId.slice(0, 12)}
                              </span>
                            )}
                          </td>

                          {/* Documento Relacionado (Contexto da Ação) */}
                          <td className="py-3 px-4 max-w-[180px]">
                            {log.documentName || log.documentId ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 truncate max-w-full">
                                  <FileText className="w-3 h-3 shrink-0 text-blue-600" />
                                  <span className="truncate">{log.documentName || log.documentId}</span>
                                </span>
                                {log.rejectionReason && (
                                  <span className="text-[10px] text-rose-600 block line-clamp-1 italic" title={log.rejectionReason}>
                                    Motivo: {log.rejectionReason}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">
                                Sem documento específico
                              </span>
                            )}
                          </td>

                          {/* Tarefa Vinculada (Bloco 6.8B e 6.8D) */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {log.taskId ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 font-mono">
                                  <CheckSquare className="w-3 h-3 text-purple-600" />
                                  {log.taskId}
                                </span>
                                <span className="text-[10px] text-emerald-600 font-semibold block">
                                  Concluída via contato
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[10px] italic">
                                Não vinculada
                              </span>
                            )}
                          </td>

                          {/* Status Real da Ação (Sem inventar entrega ou leitura) */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {log.actionStatus === 'whatsapp_opened' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                WhatsApp aberto
                              </span>
                            ) : log.actionStatus === 'message_copied' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                <Copy className="w-3 h-3 text-blue-600" />
                                Mensagem copiada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
                                <ArrowUpRight className="w-3 h-3 text-purple-600" />
                                Link copiado
                              </span>
                            )}
                          </td>

                          {/* Mensagem Preview (LGPD: Minimizada <= 160 caracteres) */}
                          <td className="py-3 px-4 max-w-xs">
                            <p 
                              className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 font-mono line-clamp-2"
                              title={log.messagePreview}
                            >
                              {log.messagePreview || '—'}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. MODAL DE COMUNICAÇÃO (Seção 11 e 12) */}
      {activeModalItem && (
        <CommunicationModal
          isOpen={Boolean(activeModalItem)}
          onClose={() => setActiveModalItem(null)}
          admissionId={activeModalItem.admissionId}
          admissionCode={activeModalItem.admissionCode}
          employeeId={activeModalItem.employeeId}
          employeeName={activeModalItem.employeeName}
          employeePhone={activeModalItem.employeePhone}
          expectedStartDate={activeModalItem.expectedStartDate}
          inviteToken={activeModalItem.inviteToken}
          isInviteValid={activeModalItem.isInviteValid}
          initialReason={activeModalItem.mainPendingReason}
          onSuccess={() => {
            fetchCommunicationData(true);
            if (activeTab === 'historico') fetchHistoryData();
          }}
        />
      )}
    </div>
  );
};

export default CommunicationHubPage;
