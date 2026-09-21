import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  MessageCircle, 
  ChevronRight, 
  Clock, 
  RotateCcw, 
  Calendar, 
  Building, 
  Briefcase, 
  Layers, 
  ChevronLeft, 
  X,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  UserPlus,
  Edit3,
  Trash2,
  KeyRound,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import { Admission, AdmissionStatus, DashboardStats } from '../types/index.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { InviteModal } from '../components/InviteModal.tsx';
import { EditAdmissionModal } from '../components/EditAdmissionModal.tsx';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal.tsx';
import { ManageInviteModal } from '../components/ManageInviteModal.tsx';
import { maskCPF } from '../lib/cpf.ts';
import { safeFetchJson } from '../lib/api.ts';
import { computeStats, handleFallbackApiRoute } from '../lib/fallbackClient.ts';

export const AdmissionsList: React.FC = () => {
  const [admissions, setAdmissions] = useState<Admission[]>(() => {
    const res = handleFallbackApiRoute('/api/admissions');
    return res?.admissions || [];
  });
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(() => {
    const res = handleFallbackApiRoute('/api/admissions');
    return res?.admissions?.length || 0;
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedInviteAdmission, setSelectedInviteAdmission] = useState<Admission | null>(null);

  // Modais de CRUD de Cadastro e Convite
  const [editingAdmission, setEditingAdmission] = useState<Admission | null>(null);
  const [deletingAdmission, setDeletingAdmission] = useState<{ id: string; name: string } | null>(null);
  const [managingInviteAdmission, setManagingInviteAdmission] = useState<Admission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'TODOS';

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [roleFilter, setRoleFilter] = useState('TODOS');
  const [departmentFilter, setDepartmentFilter] = useState('TODOS');
  const [unitFilter, setUnitFilter] = useState('TODOS');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Estatísticas para os 5 cards
  const [stats, setStats] = useState<DashboardStats>(() => computeStats());
  const [loadingStats, setLoadingStats] = useState(false);

  // Opções de filtros dinâmicos recebidos do servidor
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

  const navigate = useNavigate();

  // Carrega estatísticas dos 5 cards
  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const data = await safeFetchJson<DashboardStats>('/api/dashboard/stats');
      if (data) {
        setStats(data);
      }
    } catch (err) {
      console.warn('Utilizando estatísticas do fallback:', err);
      setStats(computeStats());
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Sincroniza status vindo da URL (por exemplo ao vir do Dashboard ou recarregar)
  useEffect(() => {
    const statusParam = searchParams.get('status') || 'TODOS';
    if (statusParam !== statusFilter) {
      setStatusFilter(statusParam);
      setPage(1);
    }
  }, [searchParams]);

  const loadAdmissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (statusFilter !== 'TODOS') params.append('status', statusFilter);
      if (roleFilter !== 'TODOS') params.append('role', roleFilter);
      if (departmentFilter !== 'TODOS') params.append('department', departmentFilter);
      if (unitFilter !== 'TODOS') params.append('unit', unitFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('page', String(page));
      params.append('limit', String(limit));

      const data = await safeFetchJson<any>(`/api/admissions?${params.toString()}`);
      if (data && data.admissions) {
        setAdmissions(data.admissions);
        setTotal(data.total);
        setTotalPages(data.totalPages || Math.ceil(data.total / limit) || 1);
        if (data.filters) {
          setFilterOptions(data.filters);
        }
      } else if (Array.isArray(data)) {
        setAdmissions(data);
        setTotal(data.length);
        setTotalPages(Math.ceil(data.length / limit) || 1);
      }
    } catch (err) {
      console.warn('Utilizando lista de admissões do fallback:', err);
      const fallback = handleFallbackApiRoute(`/api/admissions`);
      if (fallback?.admissions) {
        setAdmissions(fallback.admissions);
        setTotal(fallback.total || fallback.admissions.length);
        setTotalPages(Math.ceil((fallback.total || fallback.admissions.length) / limit) || 1);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmissions();
  }, [page, statusFilter, roleFilter, departmentFilter, unitFilter, startDate, endDate]);

  // Busca com debounce ou enter
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadAdmissions();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('TODOS');
    setRoleFilter('TODOS');
    setDepartmentFilter('TODOS');
    setUnitFilter('TODOS');
    setStartDate('');
    setEndDate('');
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('status');
    setSearchParams(newParams);
  };

  const handleDeleteAdmission = async () => {
    if (!deletingAdmission) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/admissions/${deletingAdmission.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir admissão.');
      }
      setDeletingAdmission(null);
      loadAdmissions();
      loadStats();
    } catch (err: any) {
      alert(err.message || 'Falha ao excluir admissão.');
    } finally {
      setIsDeleting(false);
    }
  };

  const statusCards = [
    {
      title: 'Todas as admissões',
      statusKey: 'TODOS',
      value: stats.totalActive || total,
      description: 'Todos os processos cadastrados',
      icon: Users,
      color: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/10',
      actionLabel: 'Ver todas',
    },
    {
      title: 'Aguardando documentos',
      statusKey: 'Aguardando documentos',
      value: stats.waitingDocuments,
      description: 'Colaborador precisa enviar docs',
      icon: Clock,
      color: 'bg-sky-50 text-sky-700 border-sky-200 ring-sky-500/10',
      actionLabel: 'Ver aguardando envio',
    },
    {
      title: 'Aguardando conferência',
      statusKey: 'Em conferência',
      value: stats.waitingReview,
      description: 'Documentos prontos para análise',
      icon: FileCheck,
      color: 'bg-amber-50 text-amber-800 border-amber-200 ring-amber-500/10',
      actionLabel: 'Ver em conferência',
      directReviewPath: '/documentos'
    },
    {
      title: 'Pendências',
      statusKey: 'Pendência',
      value: stats.pendingIssues,
      description: 'Possuem documentos rejeitados',
      icon: AlertTriangle,
      color: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10',
      actionLabel: 'Ver pendências',
    },
    {
      title: 'Concluídas',
      statusKey: 'Concluída',
      value: stats.completed,
      description: '100% dos documentos aprovados',
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10',
      actionLabel: 'Ver concluídas',
    },
  ];

  const handleSelectStatusCard = (card: typeof statusCards[0]) => {
    setStatusFilter(card.statusKey);
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (card.statusKey === 'TODOS') {
      newParams.delete('status');
    } else {
      newParams.set('status', card.statusKey);
    }
    setSearchParams(newParams);
  };

  const activeFiltersCount = [
    statusFilter !== 'TODOS',
    roleFilter !== 'TODOS',
    departmentFilter !== 'TODOS',
    unitFilter !== 'TODOS',
    startDate !== '',
    endDate !== ''
  ].filter(Boolean).length;

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Hoje';
      if (diffDays === 1) return 'Ontem';
      if (diffDays < 7) return `Há ${diffDays} dias`;
      return date.toLocaleDateString('pt-BR');
    } catch {
      return 'Recentemente';
    }
  };

  const startRecordIndex = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecordIndex = Math.min(page * limit, total);

  return (
    <div className="space-y-6">
      {/* Cabeçalho da página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/raitz-logo.jpg"
            alt="Logo Raitz"
            referrerPolicy="no-referrer"
            className="w-11 h-11 rounded-xl object-cover shadow-xs border border-slate-200 shrink-0"
          />
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Admissões</h1>
            <p className="text-xs text-slate-500">
              Gerencie e acompanhe os processos de admissão.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            id="btn-admissoes-central-pendencias"
            onClick={() => navigate('/pendencias')}
            className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Central de Pendências</span>
          </button>

          <button
            type="button"
            id="btn-nova-admissao"
            onClick={() => navigate('/admissoes/nova')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nova Admissão</span>
          </button>
        </div>
      </div>

      {/* 5 Cards de Status / Navegação */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statusCards.map((card, idx) => {
          const isActive = (card.statusKey === 'TODOS' && statusFilter === 'TODOS') || statusFilter === card.statusKey;
          return (
            <div
              key={idx}
              onClick={() => handleSelectStatusCard(card)}
              className={`group cursor-pointer rounded-2xl p-4.5 border transition-all duration-200 bg-white hover:shadow-md hover:-translate-y-0.5 relative flex flex-col justify-between ${
                isActive
                  ? 'ring-2 ring-blue-600 border-blue-200 shadow-xs'
                  : 'border-slate-200/80 hover:border-slate-300'
              }`}
              title={`Filtrar por: ${card.title}`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold line-clamp-1 transition-colors ${
                    isActive ? 'text-blue-700' : 'text-slate-500 group-hover:text-slate-700'
                  }`}>
                    {card.title}
                  </span>
                  <div className={`p-2 rounded-xl border ${card.color}`}>
                    <card.icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className={`text-2xl sm:text-3xl font-bold transition-colors ${
                    isActive ? 'text-blue-600' : 'text-slate-900 group-hover:text-blue-600'
                  }`}>
                    {loadingStats ? '...' : card.value}
                  </span>
                  <ArrowUpRight className={`w-4 h-4 transition-all ${
                    isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5'
                  }`} />
                </div>

                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                  {card.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium transition-colors">
                <span className={isActive ? 'text-blue-600 font-semibold' : 'text-slate-500 group-hover:text-blue-600'}>
                  {isActive ? 'Visualizando este status' : card.actionLabel}
                </span>
                {isActive ? (
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Banner informativo quando o filtro ativo for "Em conferência" com atalho direto */}
      {statusFilter === 'Em conferência' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 animate-in fade-in duration-150">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl border border-amber-300 shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Fila de Conferência de Documentos
              </h3>
              <p className="text-xs text-amber-900 mt-0.5">
                Você está filtrando por colaboradores com documentos prontos para análise do RH. Deseja abrir a tela completa de conferência e validação de arquivos?
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/documentos')}
            className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <span>Ir para Conferência de Documentos</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bloco de Busca e Controle de Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Barra de pesquisa */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por nome, CPF, e-mail, telefone..."
              className="w-full text-xs pl-10 pr-20 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); setPage(1); setTimeout(loadAdmissions, 0); }}
                className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors"
            >
              Buscar
            </button>
          </form>

          {/* Botão de abrir/fechar filtros */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              type="button"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                showFiltersPanel || activeFiltersCount > 0
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs px-2.5 py-2 font-medium transition-colors"
                title="Limpar todos os filtros"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Painel expansível de Filtros Avançados */}
        {showFiltersPanel && (
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              {/* Filtro Status */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="TODOS">Todos os status</option>
                  <option value="Rascunho">Rascunho</option>
                  <option value="Aguardando documentos">Aguardando documentos</option>
                  <option value="Em conferência">Em conferência</option>
                  <option value="Pendência">Pendência</option>
                  <option value="Concluída">Concluída</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </div>

              {/* Filtro Cargo */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Cargo
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="TODOS">Todos os cargos</option>
                  {filterOptions.roles.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Setor */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Setor
                </label>
                <select
                  value={departmentFilter}
                  onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="TODOS">Todos os setores</option>
                  {filterOptions.departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Unidade */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Unidade
                </label>
                <select
                  value={unitFilter}
                  onChange={(e) => { setUnitFilter(e.target.value); setPage(1); }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="TODOS">Todas as unidades</option>
                  {filterOptions.units.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Período */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Período de Criação
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Início"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Fim"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabela de Admissões (Computador/Tablet - visual clássico e limpo) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-100">
                <th className="py-3 px-4">Funcionário / Cargo</th>
                <th className="py-3 px-4">CPF (LGPD)</th>
                <th className="py-3 px-4">Setor / Unidade</th>
                <th className="py-3 px-4">Data Prevista</th>
                <th className="py-3 px-4">Progresso</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Atualização</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <Clock className="w-6 h-6 mx-auto mb-2 animate-spin text-blue-600" />
                    <p className="text-xs">Carregando admissões...</p>
                  </td>
                </tr>
              ) : admissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">Nenhuma admissão encontrada</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Tente alterar os termos de busca ou limpar os filtros aplicados.
                    </p>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={handleClearFilters}
                        className="mt-3 text-xs text-blue-600 hover:underline font-semibold"
                      >
                        Limpar todos os filtros
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                admissions.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Funcionário / Cargo */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">
                        {adm.employee.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {adm.employee.role}
                      </div>
                    </td>

                    {/* CPF Mascarado */}
                    <td className="py-3.5 px-4 font-mono text-slate-600 font-medium">
                      {(adm.employee as any).cpfMasked || maskCPF(adm.employee.cpf)}
                    </td>

                    {/* Setor e Unidade */}
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="font-medium text-slate-800">{adm.employee.department}</div>
                      <div className="text-[11px] text-slate-400">{adm.employee.unit}</div>
                    </td>

                    {/* Data Prevista */}
                    <td className="py-3.5 px-4 text-slate-700">
                      {new Date(adm.employee.expectedStartDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </td>

                    {/* Progresso com barra */}
                    <td className="py-3.5 px-4 min-w-[140px]">
                      <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                        <span>{adm.approvedDocuments} de {adm.totalDocuments}</span>
                        <span className="font-bold text-slate-800">{adm.progressPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            adm.progressPercent === 100 
                              ? 'bg-emerald-500' 
                              : adm.status === 'Pendência'
                              ? 'bg-rose-500'
                              : 'bg-blue-600'
                          }`}
                          style={{ width: `${adm.progressPercent}%` }}
                        />
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={adm.status} size="sm" />
                    </td>

                    {/* Atualização */}
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {formatRelativeTime(adm.updatedAt || adm.createdAt)}
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setManagingInviteAdmission(adm)}
                          title="Gerenciar convite e token"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setSelectedInviteAdmission(adm)}
                          title="Enviar convite WhatsApp"
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setEditingAdmission(adm)}
                          title="Editar dados cadastrais"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeletingAdmission({ id: adm.id, name: adm.employee.name })}
                          title="Excluir admissão"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => navigate(`/funcionarios/${adm.employeeId || adm.employee?.id}`)}
                          title="Ver Ficha Cadastral do Funcionário"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => navigate(`/admissoes/${adm.id}`)}
                          className="flex items-center gap-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <span>Ver</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Versão Mobile (Cards em telas pequenas, conforme especificação do item 37) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <Clock className="w-6 h-6 mx-auto mb-2 animate-spin text-blue-600" />
              <p className="text-xs">Carregando admissões...</p>
            </div>
          ) : admissions.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">Nenhuma admissão encontrada</p>
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="mt-2 text-xs text-blue-600 hover:underline font-semibold"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            admissions.map((adm) => (
              <div key={adm.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{adm.employee.name}</h3>
                    <p className="text-xs text-slate-500">{adm.employee.role} • {adm.employee.department}</p>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      CPF: {(adm.employee as any).cpfMasked || maskCPF(adm.employee.cpf)}
                    </p>
                  </div>
                  <StatusBadge status={adm.status} size="sm" />
                </div>

                {/* Progresso */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                  <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                    <span>Progresso ({adm.approvedDocuments} de {adm.totalDocuments})</span>
                    <span className="font-bold text-slate-800">{adm.progressPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        adm.progressPercent === 100 
                          ? 'bg-emerald-500' 
                          : adm.status === 'Pendência'
                          ? 'bg-rose-500'
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${adm.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400 text-[11px]">
                    Previsto: {new Date(adm.employee.expectedStartDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </span>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => setManagingInviteAdmission(adm)}
                      title="Gerenciar convite"
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setSelectedInviteAdmission(adm)}
                      title="WhatsApp"
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-emerald-200"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingAdmission(adm)}
                      title="Editar cadastro"
                      className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 border border-amber-200"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingAdmission({ id: adm.id, name: adm.employee.name })}
                      title="Excluir cadastro"
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => navigate(`/admissoes/${adm.id}`)}
                      className="flex items-center gap-1 bg-blue-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                    >
                      <span>Ver</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Paginação */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-white">
          <span>
            Mostrando <strong>{startRecordIndex}–{endRecordIndex}</strong> de <strong>{total}</strong> admissões
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none font-medium text-slate-700 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                onClick={() => setPage(num)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  page === num
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {num}
              </button>
            ))}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none font-medium text-slate-700 transition-colors cursor-pointer"
            >
              <span>Próximo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Convite WhatsApp */}
      <InviteModal
        admission={selectedInviteAdmission}
        isOpen={!!selectedInviteAdmission}
        onClose={() => setSelectedInviteAdmission(null)}
      />

      {/* Modal de Gerenciamento de Convite (CRUD Convite) */}
      {managingInviteAdmission && (
        <ManageInviteModal
          admission={managingInviteAdmission}
          isOpen={!!managingInviteAdmission}
          onClose={() => setManagingInviteAdmission(null)}
          onUpdate={(updated) => {
            setManagingInviteAdmission(updated);
            loadAdmissions();
          }}
        />
      )}

      {/* Modal de Edição de Cadastro (CRUD Admissão: Update) */}
      {editingAdmission && (
        <EditAdmissionModal
          admission={editingAdmission}
          isOpen={!!editingAdmission}
          onClose={() => setEditingAdmission(null)}
          onSuccess={() => {
            loadAdmissions();
            loadStats();
          }}
        />
      )}

      {/* Modal de Exclusão de Cadastro (CRUD Admissão: Delete) */}
      {deletingAdmission && (
        <DeleteConfirmModal
          isOpen={!!deletingAdmission}
          title="Excluir Admissão"
          description={`Tem certeza que deseja excluir permanentemente o cadastro de "${deletingAdmission.name}"? Todos os documentos e histórico deste processo serão removidos.`}
          itemName={deletingAdmission.name}
          confirmLabel="Sim, Excluir Admissão"
          isDeleting={isDeleting}
          onClose={() => setDeletingAdmission(null)}
          onConfirm={handleDeleteAdmission}
        />
      )}
    </div>
  );
};
