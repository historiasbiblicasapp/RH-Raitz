import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Plus, 
  User, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  AlertOctagon, 
  Ban, 
  RotateCcw, 
  FileText, 
  Layers, 
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { OperationalTask, Admission, OperationalPriority, OperationalTaskStatus } from '../types/index.ts';
import { safeFetchJson } from '../lib/api.ts';
import { CreateTaskModal } from './tasks/CreateTaskModal.tsx';
import { 
  CompleteTaskModal, 
  BlockTaskModal, 
  UnblockTaskModal, 
  ReopenTaskModal, 
  CancelTaskModal, 
  AssignTaskResponsibleModal 
} from './tasks/TaskActionModals.tsx';
import { TaskDetailDrawer } from './tasks/TaskDetailDrawer.tsx';

interface AdmissionOperationalTasksTabProps {
  admission: Admission;
  onRefreshAdmission?: () => void;
}

export const AdmissionOperationalTasksTab: React.FC<AdmissionOperationalTasksTabProps> = ({
  admission,
  onRefreshAdmission
}) => {
  const [tasks, setTasks] = useState<OperationalTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<OperationalTask | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  const [taskToComplete, setTaskToComplete] = useState<OperationalTask | null>(null);
  const [taskToBlock, setTaskToBlock] = useState<OperationalTask | null>(null);
  const [taskToUnblock, setTaskToUnblock] = useState<OperationalTask | null>(null);
  const [taskToReopen, setTaskToReopen] = useState<OperationalTask | null>(null);
  const [taskToCancel, setTaskToCancel] = useState<OperationalTask | null>(null);
  const [taskToAssign, setTaskToAssign] = useState<OperationalTask | null>(null);
  const [eligibleUsers, setEligibleUsers] = useState<any[]>([]);

  const currentUserId = 'user-rh-01';

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await safeFetchJson<{ tasks: OperationalTask[] }>(`/api/admissoes/${admission.id}/tarefas`);
      if (res?.tasks) {
        setTasks(res.tasks);
      }
    } catch (err) {
      console.warn('Erro ao carregar tarefas da admissão:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    safeFetchJson<{ users: any[] }>('/api/responsaveis/elegiveis')
      .then(res => {
        if (res?.users) setEligibleUsers(res.users);
      })
      .catch(() => {});
  }, [admission.id]);

  const handleStartTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tarefas/${taskId}/iniciar`, { method: 'POST' });
      if (!res.ok) throw new Error('Falha ao iniciar.');
      await fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelfAssign = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tarefas/${taskId}/atribuir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responsibleUserId: currentUserId, reason: 'Autoatribuição' })
      });
      if (!res.ok) throw new Error('Falha ao assumir.');
      await fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteTask = async (notes?: string) => {
    if (!taskToComplete) return;
    const res = await fetch(`/api/tarefas/${taskToComplete.id}/concluir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completionNotes: notes })
    });
    if (!res.ok) throw new Error('Falha ao concluir tarefa.');
    await fetchTasks();
    if (onRefreshAdmission) onRefreshAdmission();
  };

  const handleBlockTask = async (reason: string) => {
    if (!taskToBlock) return;
    const res = await fetch(`/api/tarefas/${taskToBlock.id}/bloquear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockReason: reason })
    });
    if (!res.ok) throw new Error('Falha ao bloquear tarefa.');
    await fetchTasks();
    if (onRefreshAdmission) onRefreshAdmission();
  };

  const handleUnblockTask = async (reason?: string) => {
    if (!taskToUnblock) return;
    const res = await fetch(`/api/tarefas/${taskToUnblock.id}/desbloquear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) throw new Error('Falha ao desbloquear tarefa.');
    await fetchTasks();
  };

  const handleReopenTask = async (reason: string) => {
    if (!taskToReopen) return;
    const res = await fetch(`/api/tarefas/${taskToReopen.id}/reabrir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reopenReason: reason })
    });
    if (!res.ok) throw new Error('Falha ao reabrir tarefa.');
    await fetchTasks();
  };

  const handleCancelTask = async (reason: string) => {
    if (!taskToCancel) return;
    const res = await fetch(`/api/tarefas/${taskToCancel.id}/cancelar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancelReason: reason })
    });
    if (!res.ok) throw new Error('Falha ao cancelar tarefa.');
    await fetchTasks();
  };

  const handleAssignTask = async (responsibleUserId: string | null, reason?: string) => {
    if (!taskToAssign) return;
    const res = await fetch(`/api/tarefas/${taskToAssign.id}/atribuir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responsibleUserId, reason })
    });
    if (!res.ok) throw new Error('Falha ao alterar responsável.');
    await fetchTasks();
  };

  const renderStatusBadge = (status: OperationalTaskStatus) => {
    switch (status) {
      case 'PENDENTE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Pendente
          </span>
        );
      case 'EM_ANDAMENTO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Em Andamento
          </span>
        );
      case 'BLOQUEADA':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertOctagon className="w-3 h-3" />
            Bloqueada
          </span>
        );
      case 'CONCLUIDA':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Concluída
          </span>
        );
      case 'CANCELADA':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 line-through">
            <Ban className="w-3 h-3" />
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Crítica
          </span>
        );
      case 'ALTA':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Alta
          </span>
        );
      case 'NORMAL':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Normal
          </span>
        );
    }
  };

  const pendingCount = tasks.filter(t => t.status === 'PENDENTE' || t.status === 'EM_ANDAMENTO').length;

  return (
    <div className="space-y-4">
      {/* Barra de Ações da Aba */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-blue-600" />
            Tarefas Operacionais desta Admissão
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
                {pendingCount} em aberto
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Ações pontuais, validações e diligências atribuídas à equipe de RH para esta admissão
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchTasks}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Recarregar tarefas"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Tarefa</span>
          </button>
        </div>
      </div>

      {/* Lista de Tarefas */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Carregando tarefas operacionais...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-12 text-center px-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
              <CheckSquare className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">Nenhuma tarefa operacional cadastrada</h4>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-0.5">
              Esta admissão não possui ações pontuais pendentes. Você pode registrar uma tarefa manual a qualquer momento.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Criar Primeira Tarefa</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.map(task => {
              const isPendingOrInProgress = task.status === 'PENDENTE' || task.status === 'EM_ANDAMENTO';
              const isAssignedToMe = task.responsibleUserId === currentUserId;

              return (
                <div 
                  key={task.id}
                  onClick={() => { setSelectedTask(task); setIsDetailDrawerOpen(true); }}
                  className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {renderStatusBadge(task.status)}
                      {renderPriorityBadge(task.priority)}
                      {task.isOverdue && task.status !== 'CONCLUIDA' && task.status !== 'CANCELADA' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                          Vencida
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">
                        {task.id}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {task.title}
                    </h4>

                    {task.description && (
                      <p className="text-xs text-slate-600 line-clamp-1">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1 flex-wrap">
                      <span className="flex items-center gap-1 font-medium">
                        {task.sourceType === 'DOCUMENTO' && <FileText className="w-3 h-3 text-indigo-600" />}
                        {task.sourceType === 'ETAPA' && <Layers className="w-3 h-3 text-purple-600" />}
                        {task.sourceType === 'PENDENCIA' && <AlertCircle className="w-3 h-3 text-amber-600" />}
                        Origem: {task.sourceType} {task.documentName ? `(${task.documentName})` : ''}
                      </span>

                      <span>•</span>

                      <span className="font-medium">
                        Responsável: <strong>{task.responsibleUserName || 'Sem responsável'}</strong>
                      </span>

                      {task.dueAt && (
                        <>
                          <span>•</span>
                          <span className={`font-medium ${task.isOverdue && isPendingOrInProgress ? 'text-rose-600' : ''}`}>
                            Prazo: {new Date(task.dueAt).toLocaleDateString('pt-BR')} às {new Date(task.dueAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                    {isPendingOrInProgress && !isAssignedToMe && (
                      <button
                        type="button"
                        onClick={() => handleSelfAssign(task.id)}
                        className="px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                      >
                        Assumir
                      </button>
                    )}

                    {isPendingOrInProgress && (
                      <button
                        type="button"
                        onClick={() => setTaskToComplete(task)}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors"
                      >
                        Concluir
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => { setSelectedTask(task); setIsDetailDrawerOpen(true); }}
                      className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Detalhes
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Criação Pré-vinculada à Admissão */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchTasks()}
        initialAdmissionId={admission.id}
        initialAdmissionCode={admission.id.replace('adm-', 'ADM-').slice(0, 10).toUpperCase()}
        initialEmployeeName={admission.employee?.name}
      />

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

      {/* Modais de Ciclo de Vida */}
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
        users={eligibleUsers}
        onClose={() => setTaskToAssign(null)}
        onConfirm={handleAssignTask}
      />
    </div>
  );
};
