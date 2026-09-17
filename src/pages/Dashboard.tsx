import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  UserPlus, 
  Clock, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Ban,
  Calendar,
  RefreshCw, 
  Plus, 
  Filter, 
  Search, 
  ArrowUpRight, 
  ChevronRight, 
  X, 
  AlertCircle, 
  Sparkles, 
  FileText,
  Building2,
  Briefcase,
  Layers,
  ChevronDown,
  CalendarClock
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

import { Admission, DashboardStats } from '../types/index.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { maskCPF } from '../lib/cpf.ts';
import { safeFetchJson } from '../lib/api.ts';

// Cores semânticas para os status
const STATUS_COLORS: Record<string, string> = {
  'Aguardando documentos': '#0284c7', // Sky 600
  'Em conferência': '#d97706',         // Amber 600
  'Pendência': '#e11d48',              // Rose 600
  'Concluída': '#059669',              // Emerald 600
  'Cancelada': '#64748b',              // Slate 500
  'Rascunho': '#94a3b8'                // Slate 400
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Estados dos filtros
  const [period, setPeriod] = useState<string>('7d');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [roleFilter, setRoleFilter] = useState<string>('TODOS');
  const [departmentFilter, setDepartmentFilter] = useState<string>('TODOS');
  const [unitFilter, setUnitFilter] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Opções dinâmicas de filtros
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [availableUnits, setAvailableUnits] = useState<string[]>([]);

  // Estados de dados
  const [stats, setStats] = useState<DashboardStats>({
    newAdmissions: 0,
    waitingDocuments: 0,
    waitingReview: 0,
    pendingIssues: 0,
    completed: 0,
    totalActive: 0,
    cancelled: 0,
    upcoming: 0
  });

  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Carrega opções de cargos cadastrados para o filtro
  const loadJobPositions = useCallback(async () => {
    try {
      const data = await safeFetchJson<{ jobPositions: Array<{ name: string }> }>('/api/job-positions');
      if (data?.jobPositions) {
        const names = data.jobPositions.map(j => j.name).filter(Boolean);
        setAvailableRoles(prev => Array.from(new Set([...prev, ...names])).sort());
      }
    } catch {
      // Falha silenciosa de cargos se não houver permissão ou offline
    }
  }, []);

  // Carrega estatísticas e admissões com os filtros atuais
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      // Monta os parâmetros de consulta
      const statsParams = new URLSearchParams();
      if (period && period !== 'all') statsParams.append('period', period);
      if (period === 'custom') {
        if (startDate) statsParams.append('startDate', startDate);
        if (endDate) statsParams.append('endDate', endDate);
      }
      if (statusFilter !== 'TODOS') statsParams.append('status', statusFilter);
      if (roleFilter !== 'TODOS') statsParams.append('role', roleFilter);
      if (departmentFilter !== 'TODOS') statsParams.append('department', departmentFilter);
      if (unitFilter !== 'TODOS') statsParams.append('unit', unitFilter);

      // Parâmetros para buscar admissões
      const admParams = new URLSearchParams(statsParams);
      admParams.append('limit', '200'); // Limite amplo para cobrir listas operacionais sem N+1
      if (searchTerm.trim()) admParams.append('search', searchTerm.trim());

      const [statsData, admissionsData] = await Promise.all([
        safeFetchJson<DashboardStats>(`/api/dashboard/stats?${statsParams.toString()}`),
        safeFetchJson<{
          admissions: Admission[];
          filters?: { roles: string[]; departments: string[]; units: string[] };
        }>(`/api/admissions?${admParams.toString()}`)
      ]);

      if (statsData) {
        setStats(statsData);
      }

      if (admissionsData) {
        setAdmissions(admissionsData.admissions || []);
        if (admissionsData.filters) {
          if (admissionsData.filters.roles) {
            setAvailableRoles(prev => Array.from(new Set([...prev, ...admissionsData.filters!.roles])).sort());
          }
          if (admissionsData.filters.departments) {
            setAvailableDepartments(admissionsData.filters.departments);
          }
          if (admissionsData.filters.units) {
            setAvailableUnits(admissionsData.filters.units);
          }
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar Dashboard:', err);
      setError('Não foi possível carregar os dados do Dashboard. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, startDate, endDate, statusFilter, roleFilter, departmentFilter, unitFilter, searchTerm]);

  // Carregamento inicial e reativo aos filtros
  useEffect(() => {
    loadJobPositions();
  }, [loadJobPositions]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Limpar todos os filtros
  const handleClearFilters = () => {
    setPeriod('7d');
    setStartDate('');
    setEndDate('');
    setStatusFilter('TODOS');
    setRoleFilter('TODOS');
    setDepartmentFilter('TODOS');
    setUnitFilter('TODOS');
    setSearchTerm('');
  };

  const hasActiveFilters = 
    period !== '7d' || 
    statusFilter !== 'TODOS' || 
    roleFilter !== 'TODOS' || 
    departmentFilter !== 'TODOS' || 
    unitFilter !== 'TODOS' || 
    searchTerm.trim() !== '' ||
    Boolean(startDate || endDate);

  // Formatação de data amigável em pt-BR
  const formatDateBR = (dateStr?: string) => {
    if (!dateStr) return '-';
    const cleanDate = dateStr.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Cálculo de dias relativos até a data prevista
  const getDaysUntilText = (expectedDateStr?: string) => {
    if (!expectedDateStr) return { text: 'Não informada', isOverdue: false, isSoon: false };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [y, m, d] = expectedDateStr.split('T')[0].split('-').map(Number);
    const target = new Date(y, m - 1, d, 0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const daysAgo = Math.abs(diffDays);
      return { 
        text: `Ultrapassado (${daysAgo} dia${daysAgo > 1 ? 's' : ''})`, 
        isOverdue: true, 
        isSoon: false 
      };
    }
    if (diffDays === 0) {
      return { text: 'Hoje', isOverdue: false, isSoon: true };
    }
    if (diffDays === 1) {
      return { text: 'Amanhã', isOverdue: false, isSoon: true };
    }
    if (diffDays <= 7) {
      return { text: `Em ${diffDays} dias`, isOverdue: false, isSoon: true };
    }
    return { text: `Em ${diffDays} dias`, isOverdue: false, isSoon: false };
  };

  // =========================================================================
  // 1. ADMISSÕES QUE PRECISAM DE ATENÇÃO
  // Prioridades:
  // P1: Prazo previsto ultrapassado (expectedStartDate < hoje e não finalizada)
  // P2: Documentos rejeitados (status 'Pendência' ou doc com status 'Rejeitado')
  // P3: Aguardando conferência (status 'Em conferência' ou docs 'Em análise'/'Reenviado')
  // P4: Aguardando documentos (status 'Aguardando documentos')
  // =========================================================================
  const attentionAdmissions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const items = admissions
      .filter(a => a.status !== 'Concluída' && a.status !== 'Cancelada')
      .map(adm => {
        let priority = 5;
        let reason = 'Acompanhamento regular';
        let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';

        // Verifica documentos rejeitados
        const rejectedCount = (adm.documents || []).filter(d => d.status === 'Rejeitado').length;
        const pendingReviewCount = (adm.documents || []).filter(d => d.status === 'Em análise' || d.status === 'Reenviado').length;
        const notSentCount = (adm.documents || []).filter(d => d.status === 'Não enviado').length;

        // Data prevista
        let isOverdue = false;
        if (adm.employee?.expectedStartDate) {
          const [y, m, d] = adm.employee.expectedStartDate.split('T')[0].split('-').map(Number);
          const expTime = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
          if (expTime < todayTime) {
            isOverdue = true;
          }
        }

        if (isOverdue) {
          priority = 1;
          reason = 'Prazo de início ultrapassado';
          badgeStyle = 'bg-rose-100 text-rose-800 border-rose-300 font-semibold';
        } else if (rejectedCount > 0 || adm.status === 'Pendência') {
          priority = 2;
          reason = rejectedCount > 0 ? `${rejectedCount} doc(s) rejeitado(s)` : 'Pendências documentais';
          badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 font-medium';
        } else if (pendingReviewCount > 0 || adm.status === 'Em conferência') {
          priority = 3;
          reason = pendingReviewCount > 0 ? `${pendingReviewCount} doc(s) para conferir` : 'Aguardando conferência do RH';
          badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200 font-medium';
        } else if (adm.status === 'Aguardando documentos') {
          priority = 4;
          reason = 'Aguardando envio pelo colaborador';
          badgeStyle = 'bg-sky-50 text-sky-800 border-sky-200 font-medium';
        }

        const totalPendingDocs = rejectedCount + pendingReviewCount + notSentCount;

        return {
          admission: adm,
          priority,
          reason,
          badgeStyle,
          totalPendingDocs
        };
      })
      .filter(item => item.priority <= 4)
      .sort((a, b) => {
        // Ordena por prioridade (1 mais urgente), depois por data prevista
        if (a.priority !== b.priority) return a.priority - b.priority;
        const dateA = a.admission.employee?.expectedStartDate || '9999-99-99';
        const dateB = b.admission.employee?.expectedStartDate || '9999-99-99';
        return dateA.localeCompare(dateB);
      });

    return items;
  }, [admissions]);

  // =========================================================================
  // 2. PRÓXIMAS ADMISSÕES
  // Ordenadas pela data prevista mais próxima primeiro
  // =========================================================================
  const upcomingAdmissions = useMemo(() => {
    return admissions
      .filter(a => a.status !== 'Cancelada')
      .sort((a, b) => {
        const dateA = a.employee?.expectedStartDate || '9999-99-99';
        const dateB = b.employee?.expectedStartDate || '9999-99-99';
        return dateA.localeCompare(dateB);
      })
      .slice(0, 10); // Exibe as 10 mais próximas
  }, [admissions]);

  // =========================================================================
  // 3. DADOS PARA OS GRÁFICOS
  // =========================================================================
  // Gráfico 1: Admissões por status
  const statusChartData = useMemo(() => {
    const counts = stats.byStatus || {
      'Aguardando documentos': stats.waitingDocuments,
      'Em conferência': stats.waitingReview,
      'Pendência': stats.pendingIssues,
      'Concluída': stats.completed,
      'Cancelada': stats.cancelled || 0,
      'Rascunho': 0
    };

    const data = [
      { name: 'Aguardando documentos', count: counts['Aguardando documentos'] || 0, color: STATUS_COLORS['Aguardando documentos'] },
      { name: 'Em conferência', count: counts['Em conferência'] || 0, color: STATUS_COLORS['Em conferência'] },
      { name: 'Pendência', count: counts['Pendência'] || 0, color: STATUS_COLORS['Pendência'] },
      { name: 'Concluída', count: counts['Concluída'] || 0, color: STATUS_COLORS['Concluída'] },
      { name: 'Cancelada', count: counts['Cancelada'] || 0, color: STATUS_COLORS['Cancelada'] }
    ];

    const total = data.reduce((acc, curr) => acc + curr.count, 0);
    return { data, hasData: total > 0, total };
  }, [stats]);

  // Gráfico 2: Evolução das admissões (Timeline)
  const evolutionChartData = useMemo(() => {
    const raw = stats.evolution || [];
    const hasData = raw.some(d => d.count > 0);
    return { data: raw, hasData };
  }, [stats]);

  // Resumo de documentos
  const docStats = stats.documentStats || {
    notSent: 0,
    sent: 0,
    inReview: 0,
    approved: 0,
    rejected: 0,
    waitingResend: 0,
    total: 0,
    requiredTotal: 0,
    requiredApproved: 0,
    approvalRate: 0
  };

  // 7 Cards Operacionais de Indicadores
  const indicatorCards = [
    {
      id: 'card-novas',
      title: 'Novas admissões',
      value: stats.newAdmissions,
      description: period === 'today' ? 'Cadastradas hoje' : period === '30d' ? 'Últimos 30 dias' : 'No período selecionado',
      icon: UserPlus,
      color: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/10',
      textColor: 'text-blue-600',
      actionPath: '/admissoes',
      actionLabel: 'Ver todas'
    },
    {
      id: 'card-aguardando-docs',
      title: 'Aguardando documentos',
      value: stats.waitingDocuments,
      description: 'Aguardando envio do colaborador',
      icon: Clock,
      color: 'bg-sky-50 text-sky-700 border-sky-200 ring-sky-500/10',
      textColor: 'text-sky-600',
      actionPath: '/admissoes?status=Aguardando documentos',
      actionLabel: 'Filtrar status'
    },
    {
      id: 'card-conferencia',
      title: 'Em conferência',
      value: stats.waitingReview,
      description: 'Documentos prontos para análise',
      icon: FileCheck,
      color: 'bg-amber-50 text-amber-800 border-amber-200 ring-amber-500/10',
      textColor: 'text-amber-700',
      actionPath: '/pendencias?tipo=aguardando_conferencia',
      actionLabel: 'Conferir'
    },
    {
      id: 'card-pendencias',
      title: 'Com pendências',
      value: stats.pendingIssues,
      description: 'Possuem documentos rejeitados',
      icon: AlertTriangle,
      color: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10',
      textColor: 'text-rose-600',
      actionPath: '/pendencias?tipo=documento_rejeitado',
      actionLabel: 'Resolver'
    },
    {
      id: 'card-proximas',
      title: 'Próximas admissões',
      value: stats.upcoming ?? 0,
      description: 'Data de início próxima',
      icon: Calendar,
      color: 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-500/10',
      textColor: 'text-purple-600',
      actionPath: '#proximas-admissoes',
      isAnchor: true,
      actionLabel: 'Ver cronograma'
    },
    {
      id: 'card-concluidas',
      title: 'Concluídas',
      value: stats.completed,
      description: '100% dos docs obrigatórios aprovados',
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10',
      textColor: 'text-emerald-600',
      actionPath: '/admissoes?status=Concluída',
      actionLabel: 'Finalizadas'
    },
    {
      id: 'card-canceladas',
      title: 'Canceladas',
      value: stats.cancelled ?? 0,
      description: 'Processos descontinuados',
      icon: Ban,
      color: 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-400/10',
      textColor: 'text-slate-600',
      actionPath: '/admissoes?status=Cancelada',
      actionLabel: 'Canceladas'
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO DO DASHBOARD */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Dashboard
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Operacional RH
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Acompanhe o andamento das admissões e identifique rapidamente o que precisa de atenção.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Botão Acompanhamento Operacional (Bloco 4.4) */}
          <button
            id="btn-goto-prazos-dashboard"
            onClick={() => navigate('/prazos')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs"
            title="Acessar painel de Prazos e Acompanhamento Operacional"
          >
            <CalendarClock className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Prazos & Acompanhamento</span>
          </button>

          {/* Botão de Atualizar Dados */}
          <button
            id="btn-refresh-dashboard"
            onClick={() => loadDashboardData(true)}
            disabled={refreshing || loading}
            title="Atualizar dados do painel"
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-all shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Atualizando...' : 'Atualizar dados'}</span>
          </button>

          {/* Botão + Nova Admissão */}
          <button
            id="btn-new-admission-dashboard"
            onClick={() => navigate('/admissoes/nova')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Admissão</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ÁREA DE FILTROS DO DASHBOARD */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs sm:text-sm">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Filtros Operacionais</span>
          </div>

          {hasActiveFilters && (
            <button
              id="btn-clear-filters"
              onClick={handleClearFilters}
              className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar filtros</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Filtro: Período */}
          <div>
            <label htmlFor="select-period" className="block text-xs font-semibold text-slate-600 mb-1">
              Período
            </label>
            <div className="relative">
              <select
                id="select-period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-8 text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none cursor-pointer"
              >
                <option value="all">Todo o período</option>
                <option value="today">Hoje</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="this_month">Este mês</option>
                <option value="next_month">Próximo mês</option>
                <option value="custom">Personalizado</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Filtro: Status */}
          <div>
            <label htmlFor="select-status" className="block text-xs font-semibold text-slate-600 mb-1">
              Status da Admissão
            </label>
            <div className="relative">
              <select
                id="select-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-8 text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none cursor-pointer"
              >
                <option value="TODOS">Todos os Status</option>
                <option value="Rascunho">Rascunho</option>
                <option value="Aguardando documentos">Aguardando documentos</option>
                <option value="Em conferência">Em conferência</option>
                <option value="Pendência">Pendência</option>
                <option value="Concluída">Concluída</option>
                <option value="Cancelada">Cancelada</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Filtro: Cargo */}
          <div>
            <label htmlFor="select-role" className="block text-xs font-semibold text-slate-600 mb-1">
              Cargo
            </label>
            <div className="relative">
              <select
                id="select-role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-8 text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none cursor-pointer"
              >
                <option value="TODOS">Todos os Cargos</option>
                {availableRoles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Filtro: Setor */}
          <div>
            <label htmlFor="select-department" className="block text-xs font-semibold text-slate-600 mb-1">
              Setor
            </label>
            <div className="relative">
              <select
                id="select-department"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-8 text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none cursor-pointer"
              >
                <option value="TODOS">Todos os Setores</option>
                {availableDepartments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Filtro: Unidade */}
          <div>
            <label htmlFor="select-unit" className="block text-xs font-semibold text-slate-600 mb-1">
              Unidade
            </label>
            <div className="relative">
              <select
                id="select-unit"
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-8 text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none cursor-pointer"
              >
                <option value="TODOS">Todas as Unidades</option>
                {availableUnits.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Campos adicionais: Datas personalizadas e Busca rápida */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {period === 'custom' ? (
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span className="text-slate-500 font-medium">Intervalo:</span>
              <input
                id="input-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="Data inicial do filtro"
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-slate-400">até</span>
              <input
                id="input-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-label="Data final do filtro"
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          ) : (
            <div className="text-xs text-slate-500 hidden sm:block">
              Exibindo métricas e admissões filtradas em tempo real.
            </div>
          )}

          {/* Campo de Busca rápida */}
          <div className="relative min-w-[260px] sm:ml-auto">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="input-search-admissions"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por colaborador, cargo..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ESTADO DE ERRO (SE HOUVER) */}
      {/* ========================================================================= */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="text-xs sm:text-sm font-medium">{error}</span>
          </div>
          <button
            onClick={() => loadDashboardData()}
            className="text-xs font-semibold px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors shrink-0"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CARDS PRINCIPAIS DE INDICADORES (7 CARDS OPERACIONAIS) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
        {indicatorCards.map((card) => {
          const handleClick = () => {
            if (card.isAnchor) {
              const el = document.getElementById(card.actionPath.replace('#', ''));
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            } else {
              navigate(card.actionPath);
            }
          };

          return (
            <div
              key={card.id}
              id={card.id}
              onClick={handleClick}
              className="group cursor-pointer rounded-2xl p-4 border border-slate-200/80 bg-white transition-all duration-200 hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 flex flex-col justify-between"
              title={`Clique para: ${card.actionLabel}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-semibold text-slate-500 line-clamp-1 group-hover:text-slate-700 transition-colors">
                    {card.title}
                  </span>
                  <div className={`p-1.5 rounded-lg border ${card.color} shrink-0`}>
                    <card.icon className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className={`text-2xl sm:text-3xl font-bold ${loading ? 'text-slate-400' : 'text-slate-900'} group-hover:${card.textColor} transition-colors`}>
                    {loading ? '...' : card.value}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>

                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                  {card.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 group-hover:text-blue-600 font-medium transition-colors">
                <span className="truncate">{card.actionLabel}</span>
                <ChevronRight className="w-3 h-3 shrink-0 ml-1 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 5. RESUMO OPERACIONAL DE DOCUMENTOS */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Indicadores de Documentos</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Status consolidado dos documentos das admissões no escopo filtrado.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Taxa de aprovação obrigatória:</span>
            <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              {docStats.approvalRate}% ({docStats.requiredApproved} de {docStats.requiredTotal})
            </span>
          </div>
        </div>

        {/* Chips de contagem por status */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 font-medium block">Não enviados</span>
            <span className="text-lg font-bold text-slate-700">{docStats.notSent}</span>
          </div>

          <div className="bg-sky-50 border border-sky-200/80 rounded-xl p-3">
            <span className="text-[11px] text-sky-700 font-medium block">Enviados</span>
            <span className="text-lg font-bold text-sky-800">{docStats.sent}</span>
          </div>

          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3">
            <span className="text-[11px] text-amber-800 font-medium block">Em análise</span>
            <span className="text-lg font-bold text-amber-900">{docStats.inReview}</span>
          </div>

          <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3">
            <span className="text-[11px] text-emerald-700 font-medium block">Aprovados</span>
            <span className="text-lg font-bold text-emerald-800">{docStats.approved}</span>
          </div>

          <div className="bg-rose-50 border border-rose-200/80 rounded-xl p-3">
            <span className="text-[11px] text-rose-700 font-medium block">Rejeitados</span>
            <span className="text-lg font-bold text-rose-800">{docStats.rejected}</span>
          </div>

          <div className="bg-indigo-50 border border-indigo-200/80 rounded-xl p-3">
            <span className="text-[11px] text-indigo-700 font-medium block">Total Documentos</span>
            <span className="text-lg font-bold text-indigo-900">{docStats.total}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. GRÁFICOS: STATUS & EVOLUÇÃO TEMPORAL */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Gráfico 1: Admissões por status */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Admissões por Status
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribuição dos processos admissionais de acordo com a fase atual.
            </p>
          </div>

          <div className="mt-4 h-64 w-full flex items-center justify-center">
            {statusChartData.hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusChartData.data}
                  margin={{ top: 15, right: 10, left: -20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      borderRadius: '0.75rem', 
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px'
                    }}
                    formatter={(value: any) => [`${value} admissões`, 'Quantidade']}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {statusChartData.data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center p-6 text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs">Ainda não há dados suficientes para exibir este gráfico.</p>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Evolução das Admissões */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Evolução das Admissões
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Volume de novos cadastros de admissão ao longo do período selecionado.
            </p>
          </div>

          <div className="mt-4 h-64 w-full flex items-center justify-center">
            {evolutionChartData.hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={evolutionChartData.data}
                  margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 10, fill: '#64748b' }}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      borderRadius: '0.75rem', 
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px'
                    }}
                    formatter={(value: any) => [`${value} novas admissões`, 'Cadastros']}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center p-6 text-slate-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs">Ainda não há dados suficientes para exibir este gráfico.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. SEÇÃO "ADMISSÕES QUE PRECISAM DE ATENÇÃO" */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Admissões que precisam de atenção
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                {attentionAdmissions.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Priorizadas por prazo ultrapassado, documentos rejeitados e pendências de conferência.
            </p>
          </div>

          <Link
            to="/pendencias"
            id="link-dashboard-central-pendencias"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100/80 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <span>Ver Central de Pendências</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs">Carregando admissões que precisam de atenção...</p>
          </div>
        ) : attentionAdmissions.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/50">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">Tudo em dia!</h4>
            <p className="text-xs text-slate-500 mt-0.5 max-w-md mx-auto">
              Nenhuma admissão no momento possui prazos vencidos ou pendências críticas que exijam ação imediata do RH.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Colaborador / Cargo</th>
                  <th className="py-3 px-4">Situação Crítica</th>
                  <th className="py-3 px-4">Início Previsto</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Progresso Obrigatórios</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attentionAdmissions.map(({ admission: adm, reason, badgeStyle }) => (
                  <tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                        {adm.employee.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {adm.employee.role} • {adm.employee.department}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border ${badgeStyle}`}>
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{reason}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {formatDateBR(adm.employee.expectedStartDate)}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={adm.status} size="sm" />
                    </td>

                    <td className="py-3.5 px-4 min-w-[140px]">
                      <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                        <span>{adm.approvedDocuments} de {adm.totalDocuments}</span>
                        <span className="font-bold text-slate-800">{adm.progressPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            adm.status === 'Pendência' ? 'bg-rose-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${adm.progressPercent}%` }}
                        />
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigate(`/admissoes/${adm.id}`)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <span>Ver admissão</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 8. SEÇÃO "PRÓXIMAS ADMISSÕES" */}
      {/* ========================================================================= */}
      <div id="proximas-admissoes" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                <Calendar className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Próximas admissões
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                {upcomingAdmissions.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ordenadas pela data prevista de início mais próxima.
            </p>
          </div>

          <button
            onClick={() => navigate('/admissoes')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 self-start sm:self-auto hover:underline"
          >
            Ver todas no módulo Admissões →
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs">Carregando cronograma das próximas admissões...</p>
          </div>
        ) : upcomingAdmissions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50/50">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs">Nenhuma próxima admissão agendada encontrada no filtro selecionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Colaborador</th>
                  <th className="py-3 px-4">Cargo / Setor / Unidade</th>
                  <th className="py-3 px-4">Data Prevista</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Progresso Docs</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {upcomingAdmissions.map((adm) => {
                  const cpfMasked = adm.employee?.cpf ? maskCPF(adm.employee.cpf) : '***.***.***-**';
                  const daysInfo = getDaysUntilText(adm.employee?.expectedStartDate);

                  return (
                    <tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                          {adm.employee.name}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">
                          {cpfMasked}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">
                          {adm.employee.role}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {adm.employee.department} {adm.employee.unit ? `• ${adm.employee.unit}` : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">
                          {formatDateBR(adm.employee.expectedStartDate)}
                        </div>
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md mt-0.5 ${
                          daysInfo.isOverdue 
                            ? 'bg-rose-100 text-rose-700' 
                            : daysInfo.isSoon 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {daysInfo.text}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={adm.status} size="sm" />
                      </td>

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

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => navigate(`/admissoes/${adm.id}`)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <span>Ver admissão</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
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
  );
};
