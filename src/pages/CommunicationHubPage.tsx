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
  Eye
} from 'lucide-react';
import { 
  CommunicationItem, 
  CommunicationHubResponse, 
  CommunicationSummary, 
  CommunicationType 
} from '../types/index.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { CommunicationModal } from '../components/CommunicationModal.tsx';

export const CommunicationHubPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Estados de dados
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

  // Carregamento dos dados
  const fetchCommunicationData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (status) q.set('status', status);
      if (documentStatus) q.set('documentStatus', documentStatus);
      if (cargo && cargo !== 'TODOS') q.set('cargo', cargo);
      if (setor && setor !== 'TODOS') q.set('setor', setor);
      if (unidade && unidade !== 'TODOS') q.set('unidade', unidade);
      q.set('page', String(page));
      q.set('limit', '15');

      const userEmail = localStorage.getItem('user_email') || 'rh@empresa.com';
      const res = await fetch(`/api/communications?${q.toString()}`, {
        headers: {
          'x-user-email': userEmail
        }
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Acesso restrito. Usuário não possui permissão de RH.');
        }
        throw new Error('Não foi possível carregar os dados de comunicação.');
      }

      const data: CommunicationHubResponse = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (data.summary) {
        setSummary(data.summary);
      }
      if (data.filters) {
        setFilterOptions({
          roles: data.filters.roles || [],
          departments: data.filters.departments || [],
          units: data.filters.units || [],
          statuses: data.filters.statuses || []
        });
      }
    } catch (err: any) {
      console.error('Erro na tela de comunicação:', err);
      setError(err.message || 'Não foi possível carregar os dados de comunicação.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, status, documentStatus, cargo, setor, unidade, page]);

  useEffect(() => {
    fetchCommunicationData();
  }, [fetchCommunicationData]);

  // Limpa todos os filtros
  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  // Verifica se há filtros ativos
  const hasActiveFilters = Boolean(
    search || status || documentStatus || (cargo && cargo !== 'TODOS') || (setor && setor !== 'TODOS') || (unidade && unidade !== 'TODOS')
  );

  // Renderização da Pendência Principal
  const renderPendingBadge = (reason: CommunicationItem['mainPendingReason']) => {
    let colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
    if (reason.priority === 'Alta') {
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
    } else if (reason.priority === 'Média') {
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
    }

    return (
      <div className="space-y-1">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${colorClasses}`}>
          {reason.label}
        </span>
        <div className="text-xs text-slate-700 leading-snug line-clamp-2" title={reason.detail}>
          {reason.detail}
        </div>
      </div>
    );
  };

  // Formatação de data/hora amigável
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'Nunca comunicou';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

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
              Comunicação com Funcionários
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Acompanhe admissões em andamento e comunique funcionários sobre documentos e pendências.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            id="btn-refresh-communications"
            onClick={() => fetchCommunicationData(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

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

      {/* 2. CARDS DE RESUMO (Seção 6) */}
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
              {summary.inProgressCount}
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
              {summary.waitingDocumentsCount}
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
              {summary.rejectedDocumentsCount}
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
              {summary.waitingResponseCount}
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
              {summary.upcomingWithIssuesCount}
            </span>
            <span className="text-[11px] text-orange-700 font-medium">atenção</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            Prazo de início crítico
          </p>
        </div>
      </div>

      {/* 3. BARRA DE BUSCA E FILTROS */}
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
                id="filter-setor-comunicacao"
                value={setor}
                onChange={(e) => updateParams({ setor: e.target.value, page: 1 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium cursor-pointer"
              >
                <option value="TODOS">Todos os setores</option>
                {filterOptions.departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 4. CONTEÚDO PRINCIPAL: TABELA E CARDS MOBILE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Barra superior de contagem */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Exibindo <strong>{items.length}</strong> de <strong>{total}</strong> candidatos
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
          /* Estado: Erro (Seção 41) */
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
        ) : items.length === 0 ? (
          /* Estado: Vazio (Seção 40) */
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
            {/* VISÃO DESKTOP / TABLET: TABELA (Seção 7) */}
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
                  {items.map((item) => (
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

            {/* VISÃO MOBILE: CARDS RESPONSIVOS (Seção 37) */}
            <div className="sm:hidden divide-y divide-slate-100">
              {items.map((item) => (
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
          }}
        />
      )}
    </div>
  );
};
