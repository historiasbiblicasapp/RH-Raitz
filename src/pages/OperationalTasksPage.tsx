import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Filter, 
  User, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  AlertOctagon, 
  Ban, 
  RotateCcw, 
  ArrowUpDown, 
  ExternalLink, 
  UserCheck, 
  RefreshCw, 
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  FileText,
  Layers,
  Inbox
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  OperationalTask, 
  OperationalTasksResponse, 
  OperationalPriority, 
  OperationalTaskStatus,
  OperationalTaskSourceType
} from '../types/index.ts';
import { safeFetchJson } from '../lib/api.ts';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal.tsx';
import { 
  CompleteTaskModal, 
  BlockTaskModal, 
  UnblockTaskModal, 
  ReopenTaskModal, 
  CancelTaskModal, 
  AssignTaskResponsibleModal 
} from '../components/tasks/TaskActionModals.tsx';
import { TaskDetailDrawer } from '../components/tasks/TaskDetailDrawer.tsx';

export const OperationalTasksPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Estados dos filtros
  const [viewMode, setViewMode] = useState<'todas' | 'minhas' | 'sem_responsavel' | 'criticas' | 'vencidas' | 'concluidas'>(
    (searchParams.get('view') as any) || 'todas'
  );
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'TODOS');
  const [selectedPriority, setSelectedPriority] = useState(searchParams.get('priority') || 'TODAS');
  const [selectedResponsible, setSelectedResponsible] = useState(searchParams.get('responsible') || '');
  const [selectedSourceType, setSelectedSourceType] = useState(searchParams.get('source') || 'TODAS');
  const [selectedUnit, setSelectedUnit] = useState(searchParams.get('unit') || 'TODAS');
  const [page, setPage] = useState(1);

  // Estados de dados
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OperationalTasksResponse | null>(null);
  const [selectedTask, setSelectedTask] = useState<OperationalTask | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Estados de modais de ciclo de vida
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<OperationalTask | null>(null);
  const [taskToBlock, setTaskToBlock] = useState<OperationalTask | null>(null);
  const [taskToUnblock, setTaskToUnblock] = useState<OperationalTask | null>(null);
  const [taskToReopen, setTaskToReopen] = useState<OperationalTask | null>(null);
  const [taskToCancel, setTaskToCancel] = useState<OperationalTask | null>(null);
  const [taskToAssign, setTaskToAssign] = useState<OperationalTask | null>(null);

  // Usuário autenticado padrão
  const currentUserId = 'user-rh-01';

  // Buscar tarefas na API
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (viewMode !== 'todas') params.set('viewMode', viewMode);
    if (search.trim()) params.set('search', search.trim());
    if (selectedStatus && selectedStatus !== 'TODOS') params.set('status', selectedStatus);
    if (selectedPriority && selectedPriority !== 'TODAS') params.set('priority', selectedPriority);
    if (selectedResponsible) params.set('responsible', selectedResponsible);
    if (selectedSourceType && selectedSourceType !== 'TODAS') params.set('sourceType', selectedSourceType);
    if (selectedUnit && selectedUnit !== 'TODAS') params.set('unit', selectedUnit);
    params.set('page', String(page));
    params.set('limit', '15');

    try {
      const res = await safeFetchJson<OperationalTasksResponse>(`/api/tarefas?${params.toString()}`);
      if (res) {
        setData(res);
        // Atualiza a tarefa selecionada caso esteja com drawer aberto
        if (selectedTask) {
          const updated = res.items.find(t => t.id === selectedTask.id);
          if (updated) setSelectedTask(updated);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar tarefas operacionais:', err);
    } finally {
      setLoading(false);
    }
  }, [viewMode, search, selectedStatus, selectedPriority, selectedResponsible, selectedSourceType, selectedUnit, page, selectedTask]);

  useEffect(() => {
    fetchTasks();
  }, [viewMode, selectedStatus, selectedPriority, selectedResponsible, selectedSourceType, selectedUnit, page]);

  // Debounce para busca textual
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchTasks();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Ações Operacionais via API
  const handleStartTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tarefas/${taskId}/iniciar`, { method: 'POST' });
      if (!res.ok) throw new Error('Falha ao iniciar tarefa.');
      await fetchTasks();
    } catch (err) {
      console.error(err);
      alert('Erro ao iniciar a tarefa.');
    }
  };

  const handleSelfAssign = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tarefas/${taskId}/atribuir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responsibleUserId: currentUserId, reason: 'Autoatribuição operacional' })
      });
      if (!res.ok) throw new Error('Falha ao assumir tarefa.');
      await fetchTasks();
    } catch (err) {
      console.error(err);
      alert('Erro ao assumir a tarefa.');
    }
  };

  const handleCompleteTask = async (notes?: string) => {
    if (!taskToComplete) return;
    const res = await fetch(`/api/tarefas/${taskToComplete.id}/concluir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completionNotes: notes })
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Erro ao concluir tarefa.');
    }
    await fetchTasks();
  };

  const handleBlockTask = async (reason: string) => {
    if (!taskToBlock) return;
    const res = await fetch(`/api/tarefas/${taskToBlock.id}/bloquear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockReason: reason })
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Erro ao bloquear tarefa.');
    }
    await fetchTasks();
  };

  const handleUnblockTask = async (reason?: string) => {
    if (!taskToUnblock) return;
    const res = await fetch(`/api/tarefas/${taskToUnblock.id}/desbloquear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Erro ao desbloquear tarefa.');
    }
    await fetchTasks();
  };

  const handleReopenTask = async (reason: string) => {
    if (!taskToReopen) return;
    const res = await fetch(`/api/tarefas/${taskToReopen.id}/reabrir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reopenReason: reason })
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Erro ao reabrir tarefa.');
    }
    await fetchTasks();
  };

  const handleCancelTask = async (reason: string) => {
    if (!taskToCancel) return;
    const res = await fetch(`/api/tarefas/${taskToCancel.id}/cancelar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancelReason: reason })
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Erro ao cancelar tarefa.');
    }
    await fetchTasks();
  };

  const handleAssignTask = async (responsibleUserId: string | null, reason?: string) => {
    if (!taskToAssign) return;
    const res = await fetch(`/api/tarefas/${taskToAssign.id}/atribuir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responsibleUserId, reason })
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Erro ao alterar responsável.');
    }
    await fetchTasks();
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedStatus('TODOS');
    setSelectedPriority('TODAS');
    setSelectedResponsible('');
    setSelectedSourceType('TODAS');
    setSelectedUnit('TODAS');
    setPage(1);
    setViewMode('todas');
  };

  const summary = data?.summary || {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    blocked: 0,
    cancelled: 0,
    unassigned: 0,
    myTasks: 0,
    critical: 0,
    overdue: 0
  };

  const renderStatusBadge = (status: OperationalTaskStatus) => {
    switch (status) {
      case 'PENDENTE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Pendente
          </span>
        );
      case 'EM_ANDAMENTO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Em Andamento
          </span>
        );
      case 'BLOQUEADA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertOctagon className="w-3.5 h-3.5" />
            Bloqueada
          </span>
        );
      case 'CONCLUIDA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Concluída
          </span>
        );
      case 'CANCELADA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 line-through">
            <Ban className="w-3.5 h-3.5" />
            Cancelada
          </span>
        );
      default:
        return null;
    }
  };

  const renderPriorityBadge = (priority: OperationalPriority) => {
    switch (priority) {
      case 'CRITICA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Crítica
          </span>
        );
      case 'ALTA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Alta
          </span>
        );
      case 'NORMAL':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Normal
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Tarefas Operacionais do RH
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Gestão pontual de pendências, conferências documentais e ações do processo admissional
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchTasks}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Tarefa</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas e Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <button
          type="button"
          onClick={() => { setViewMode('minhas'); setPage(1); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            viewMode === 'minhas'
              ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Minha Fila</span>
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700 mt-2">{summary.myTasks}</p>
          <span className="text-[11px] text-slate-500 block mt-0.5">Atribuídas a você</span>
        </button>

        <button
          type="button"
          onClick={() => { setViewMode('sem_responsavel'); setPage(1); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            viewMode === 'sem_responsavel'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Sem Responsável</span>
            <Inbox className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-2">{summary.unassigned}</p>
          <span className="text-[11px] text-slate-500 block mt-0.5">Pool para triagem</span>
        </button>

        <button
          type="button"
          onClick={() => { setViewMode('criticas'); setPage(1); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            viewMode === 'criticas'
              ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Críticas</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-700 mt-2">{summary.critical}</p>
          <span className="text-[11px] text-slate-500 block mt-0.5">Atenção máxima</span>
        </button>

        <button
          type="button"
          onClick={() => { setViewMode('vencidas'); setPage(1); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            viewMode === 'vencidas'
              ? 'bg-red-50/80 border-red-300 ring-2 ring-red-500/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Vencidas</span>
            <Clock className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-700 mt-2">{summary.overdue}</p>
          <span className="text-[11px] text-slate-500 block mt-0.5">Prazo expirado</span>
        </button>

        <button
          type="button"
          onClick={() => { setViewMode('concluidas'); setPage(1); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            viewMode === 'concluidas'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Concluídas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{summary.completed}</p>
          <span className="text-[11px] text-slate-500 block mt-0.5">Finalizadas</span>
        </button>

        <button
          type="button"
          onClick={() => { setViewMode('todas'); setPage(1); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            viewMode === 'todas'
              ? 'bg-slate-100/90 border-slate-400 ring-2 ring-slate-500/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total</span>
            <Layers className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{summary.total}</p>
          <span className="text-[11px] text-slate-500 block mt-0.5">Todas registradas</span>
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Busca Textual */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por título, funcionário, CPF, código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
          </div>

          {/* Filtro Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="PENDENTE">Pendente</option>
              <option value="EM_ANDAMENTO">Em Andamento</option>
              <option value="BLOQUEADA">Bloqueada</option>
              <option value="CONCLUIDA">Concluída</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>

          {/* Filtro Prioridade */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => { setSelectedPriority(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            >
              <option value="TODAS">Todas as Prioridades</option>
              <option value="CRITICA">Crítica</option>
              <option value="ALTA">Alta</option>
              <option value="NORMAL">Normal</option>
            </select>
          </div>

          {/* Filtro Responsável */}
          <div>
            <select
              value={selectedResponsible}
              onChange={(e) => { setSelectedResponsible(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            >
              <option value="">Todos os Responsáveis</option>
              <option value="sem_responsavel">Apenas Sem Responsável</option>
              {data?.filters?.users?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Linha de filtros secundários e limpar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-600">Origem:</span>
            <select
              value={selectedSourceType}
              onChange={(e) => { setSelectedSourceType(e.target.value); setPage(1); }}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
            >
              <option value="TODAS">Todas as origens</option>
              <option value="ADMISSAO">Admissão Geral</option>
              <option value="DOCUMENTO">Conferência Documental</option>
              <option value="ETAPA">Etapa do Processo</option>
              <option value="PENDENCIA">Central de Pendências</option>
              <option value="APROVACAO">Aprovação Interna</option>
              <option value="CHECKLIST">Checklist Operacional</option>
            </select>

            {data?.filters?.units && data.filters.units.length > 0 && (
              <>
                <span className="font-semibold text-slate-600 ml-2">Unidade:</span>
                <select
                  value={selectedUnit}
                  onChange={(e) => { setSelectedUnit(e.target.value); setPage(1); }}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
                >
                  <option value="TODAS">Todas as unidades</option>
                  {data.filters.units.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </>
            )}
          </div>

          {(search || selectedStatus !== 'TODOS' || selectedPriority !== 'TODAS' || selectedResponsible || selectedSourceType !== 'TODAS' || selectedUnit !== 'TODAS' || viewMode !== 'todas') && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Lista / Tabela de Tarefas */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-500 font-medium">Carregando tarefas operacionais...</span>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <CheckSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Nenhuma tarefa operacional encontrada</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Não há tarefas correspondentes aos filtros selecionados. Crie uma nova tarefa ou ajuste os critérios.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Nova Tarefa</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Prioridade</th>
                  <th className="py-3.5 px-4">Tarefa Operacional</th>
                  <th className="py-3.5 px-4">Funcionário / Admissão</th>
                  <th className="py-3.5 px-4">Origem</th>
                  <th className="py-3.5 px-4">Responsável</th>
                  <th className="py-3.5 px-4">Prazo</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {data.items.map((task) => {
                  const isAssignedToMe = task.responsibleUserId === currentUserId;
                  const isPendingOrInProgress = task.status === 'PENDENTE' || task.status === 'EM_ANDAMENTO';

                  return (
                    <tr 
                      key={task.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => { setSelectedTask(task); setIsDetailDrawerOpen(true); }}
                    >
                      {/* Prioridade */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderPriorityBadge(task.priority)}
                      </td>

                      {/* Título da Tarefa */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors block line-clamp-1">
                          {task.title}
                        </span>
                        {task.description && (
                          <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {task.description}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          {task.id}
                        </span>
                      </td>

                      {/* Colaborador & Admissão */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Link
                          to={`/admissoes/${task.admissionId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-slate-900 hover:text-blue-600 block"
                        >
                          {task.employeeName}
                        </Link>
                        <span className="text-[11px] text-slate-500 font-mono block">
                          {task.admissionCode} • {task.employeeRole || 'Admissão'}
                        </span>
                      </td>

                      {/* Origem */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {task.sourceType === 'DOCUMENTO' && <FileText className="w-3 h-3 text-indigo-600" />}
                          {task.sourceType === 'ETAPA' && <Layers className="w-3 h-3 text-purple-600" />}
                          {task.sourceType === 'PENDENCIA' && <AlertCircle className="w-3 h-3 text-amber-600" />}
                          {task.sourceType === 'ADMISSAO' && <Briefcase className="w-3 h-3 text-blue-600" />}
                          {task.sourceType}
                        </span>
                      </td>

                      {/* Responsável */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {task.responsibleUserName ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                              {task.responsibleUserName.charAt(0)}
                            </div>
                            <span className="font-medium text-slate-800">
                              {task.responsibleUserName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            Sem responsável
                          </span>
                        )}
                      </td>

                      {/* Prazo */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {task.dueAt ? (
                          <div>
                            <span className="font-semibold text-slate-800 block">
                              {new Date(task.dueAt).toLocaleDateString('pt-BR')}
                            </span>
                            {task.isOverdue && task.status !== 'CONCLUIDA' && task.status !== 'CANCELADA' ? (
                              <span className="text-[10px] font-bold text-rose-600 block">
                                Vencida
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 block">
                                {new Date(task.dueAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Sem prazo
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderStatusBadge(task.status)}
                      </td>

                      {/* Ações Rápidas */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        {isPendingOrInProgress && !isAssignedToMe && (
                          <button
                            type="button"
                            onClick={() => handleSelfAssign(task.id)}
                            className="px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            title="Assumir esta tarefa"
                          >
                            Assumir
                          </button>
                        )}

                        {isPendingOrInProgress && (
                          <button
                            type="button"
                            onClick={() => setTaskToComplete(task)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                            title="Concluir tarefa"
                          >
                            Concluir
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => { setSelectedTask(task); setIsDetailDrawerOpen(true); }}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé e Paginação */}
        {data && data.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Mostrando {((data.page - 1) * data.limit) + 1} a {Math.min(data.page * data.limit, data.total)} de {data.total} tarefas
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={data.page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-semibold text-slate-700">
                Página {data.page} de {data.totalPages}
              </span>
              <button
                type="button"
                disabled={data.page >= data.totalPages}
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer de Detalhes da Tarefa */}
      <TaskDetailDrawer
        task={selectedTask}
        isOpen={isDetailDrawerOpen}
        onClose={() => { setIsDetailDrawerOpen(false); setSelectedTask(null); }}
        onStart={handleStartTask}
        onOpenCompleteModal={(t) => setTaskToComplete(t)}
        onOpenBlockModal={(t) => setTaskToBlock(t)}
        onOpenUnblockModal={(t) => setTaskToUnblock(t)}
        onOpenReopenModal={(t) => setTaskToReopen(t)}
        onOpenCancelModal={(t) => setTaskToCancel(t)}
        onOpenAssignModal={(t) => setTaskToAssign(t)}
        onSelfAssign={handleSelfAssign}
        currentUserId={currentUserId}
      />

      {/* Modal de Criação */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchTasks()}
      />

      {/* Modais de Ações do Ciclo de Vida */}
      <CompleteTaskModal
        isOpen={!!taskToComplete}
        task={taskToComplete}
        onClose={() => setTaskToComplete(null)}
        onConfirm={handleCompleteTask}
      />

      <BlockTaskModal
        isOpen={!!taskToBlock}
        task={taskToBlock}
        onClose={() => setTaskToBlock(null)}
        onConfirm={handleBlockTask}
      />

      <UnblockTaskModal
        isOpen={!!taskToUnblock}
        task={taskToUnblock}
        onClose={() => setTaskToUnblock(null)}
        onConfirm={handleUnblockTask}
      />

      <ReopenTaskModal
        isOpen={!!taskToReopen}
        task={taskToReopen}
        onClose={() => setTaskToReopen(null)}
        onConfirm={handleReopenTask}
      />

      <CancelTaskModal
        isOpen={!!taskToCancel}
        task={taskToCancel}
        onClose={() => setTaskToCancel(null)}
        onConfirm={handleCancelTask}
      />

      <AssignTaskResponsibleModal
        isOpen={!!taskToAssign}
        task={taskToAssign}
        users={data?.filters?.users || []}
        onClose={() => setTaskToAssign(null)}
        onConfirm={handleAssignTask}
      />
    </div>
  );
};
