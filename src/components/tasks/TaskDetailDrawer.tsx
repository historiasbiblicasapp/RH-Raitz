import React, { useState } from 'react';
import { 
  X, 
  CheckSquare, 
  User, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Ban, 
  AlertOctagon, 
  RotateCcw, 
  ArrowUpRight, 
  Play, 
  UserCheck, 
  History,
  FileText,
  Layers,
  Building2,
  Briefcase
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { OperationalTask, OperationalPriority, OperationalTaskStatus } from '../../types/index.ts';

interface TaskDetailDrawerProps {
  task: OperationalTask | null;
  isOpen: boolean;
  onClose: () => void;
  onStart: (taskId: string) => Promise<void>;
  onOpenCompleteModal: (task: OperationalTask) => void;
  onOpenBlockModal: (task: OperationalTask) => void;
  onOpenUnblockModal: (task: OperationalTask) => void;
  onOpenReopenModal: (task: OperationalTask) => void;
  onOpenCancelModal: (task: OperationalTask) => void;
  onOpenAssignModal: (task: OperationalTask) => void;
  onSelfAssign: (taskId: string) => Promise<void>;
  currentUserId?: string;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  isOpen,
  onClose,
  onStart,
  onOpenCompleteModal,
  onOpenBlockModal,
  onOpenUnblockModal,
  onOpenReopenModal,
  onOpenCancelModal,
  onOpenAssignModal,
  onSelfAssign,
  currentUserId
}) => {
  const [actionLoading, setActionLoading] = useState(false);

  if (!isOpen || !task) return null;

  const handleStartTask = async () => {
    setActionLoading(true);
    try {
      await onStart(task.id);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClaim = async () => {
    setActionLoading(true);
    try {
      await onSelfAssign(task.id);
    } finally {
      setActionLoading(false);
    }
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Prioridade Crítica
          </span>
        );
      case 'ALTA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Prioridade Alta
          </span>
        );
      case 'NORMAL':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Prioridade Normal
          </span>
        );
    }
  };

  const isAssignedToMe = task.responsibleUserId && currentUserId && task.responsibleUserId === currentUserId;
  const isPendingOrInProgress = task.status === 'PENDENTE' || task.status === 'EM_ANDAMENTO';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-task-title"
        className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 border-l border-slate-200"
      >
        {/* Cabeçalho do Drawer */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {renderStatusBadge(task.status)}
            {renderPriorityBadge(task.priority)}
            {task.isOverdue && task.status !== 'CONCLUIDA' && task.status !== 'CANCELADA' && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-600 text-white animate-pulse">
                Vencida
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Fechar detalhes"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Título e Identificação */}
          <div>
            <span className="text-[11px] font-mono text-slate-400 block uppercase tracking-wider mb-1">
              ID da Tarefa: {task.id}
            </span>
            <h2 id="drawer-task-title" className="text-xl font-bold text-slate-900 leading-snug">
              {task.title}
            </h2>
            {task.description && (
              <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                {task.description}
              </div>
            )}
          </div>

          {/* Vínculo Admissional Obrigatório */}
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                Vínculo Admissional
              </span>
              <Link
                to={`/admissoes/${task.admissionId}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                title="Abrir detalhes completos da admissão"
              >
                <span>Ver Admissão</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 text-[11px] block">Colaborador:</span>
                <Link
                  to={`/funcionarios/${task.employeeId}`}
                  className="font-bold text-slate-900 hover:text-blue-600 truncate block"
                >
                  {task.employeeName}
                </Link>
                {task.employeeCpfMasked && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    CPF: {task.employeeCpfMasked}
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Código / Cargo:</span>
                <span className="font-bold text-slate-900 block font-mono">
                  {task.admissionCode}
                </span>
                <span className="text-[11px] text-slate-600 truncate block">
                  {task.employeeRole || 'Cargo não informado'}
                </span>
              </div>
            </div>

            {(task.employeeDepartment || task.employeeUnit) && (
              <div className="pt-2 border-t border-blue-100/60 flex items-center gap-3 text-[11px] text-slate-600">
                {task.employeeDepartment && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    {task.employeeDepartment}
                  </span>
                )}
                {task.employeeUnit && (
                  <span>• {task.employeeUnit}</span>
                )}
              </div>
            )}
          </div>

          {/* Origem Operacional Específica */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Origem da Demanda
            </span>
            <div className="flex items-center gap-2 text-xs text-slate-800">
              {task.sourceType === 'DOCUMENTO' && <FileText className="w-4 h-4 text-indigo-600 shrink-0" />}
              {task.sourceType === 'ETAPA' && <Layers className="w-4 h-4 text-purple-600 shrink-0" />}
              {task.sourceType === 'PENDENCIA' && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
              {task.sourceType === 'ADMISSAO' && <Briefcase className="w-4 h-4 text-blue-600 shrink-0" />}
              <span className="font-semibold">
                {task.sourceType}: {task.documentName || task.stepName || task.sourceDescription || 'Admissão Geral'}
              </span>
            </div>
          </div>

          {/* Responsável e Prazo Operacional */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Responsável */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Responsável
              </span>
              {task.responsibleUserName ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                      {task.responsibleUserName.charAt(0)}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block leading-tight">
                        {task.responsibleUserName}
                      </span>
                      {task.responsibleUserEmail && (
                        <span className="text-[10px] text-slate-500 block truncate">
                          {task.responsibleUserEmail}
                        </span>
                      )}
                    </div>
                  </div>
                  {task.assignedAt && (
                    <span className="text-[10px] text-slate-400 block pt-1">
                      Atribuído em: {new Date(task.assignedAt).toLocaleDateString('pt-BR')} às {new Date(task.assignedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-block">
                    Sem responsável definido
                  </span>
                  <p className="text-[11px] text-slate-500">
                    A tarefa está no pool aberto aguardando triagem ou autoatribuição.
                  </p>
                </div>
              )}

              {isPendingOrInProgress && (
                <div className="pt-3 mt-2 border-t border-slate-200 flex items-center gap-2">
                  {!isAssignedToMe && (
                    <button
                      type="button"
                      onClick={handleClaim}
                      disabled={actionLoading}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      Assumir tarefa
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenAssignModal(task)}
                    disabled={actionLoading}
                    className="text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer ml-auto"
                  >
                    Transferir
                  </button>
                </div>
              )}
            </div>

            {/* Prazo Operacional */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Prazo Operacional
              </span>
              {task.dueAt ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{new Date(task.dueAt).toLocaleDateString('pt-BR')}</span>
                    <Clock className="w-3.5 h-3.5 text-slate-400 ml-1" />
                    <span>{new Date(task.dueAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {task.isOverdue && task.status !== 'CONCLUIDA' && task.status !== 'CANCELADA' ? (
                    <span className="text-[11px] font-bold text-rose-600 block">
                      Atrasada em relação ao limite estipulado
                    </span>
                  ) : (
                    <span className="text-[11px] text-emerald-600 font-medium block">
                      Dentro do limite operacional
                    </span>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 italic block">
                    Sem prazo definido
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Prioridade orientada pelo SLA geral
                  </span>
                </div>
              )}

              <div className="pt-3 mt-2 border-t border-slate-200 text-[10px] text-slate-400">
                Criada em: {new Date(task.createdAt).toLocaleDateString('pt-BR')} por {task.createdBy}
              </div>
            </div>
          </div>

          {/* Informações de Conclusão / Bloqueio / Cancelamento se aplicável */}
          {task.status === 'CONCLUIDA' && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1 text-xs">
              <span className="font-bold text-emerald-900 block flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Concluída por {task.completedBy}
              </span>
              {task.completedAt && (
                <span className="text-emerald-700 text-[11px] block">
                  Em {new Date(task.completedAt).toLocaleDateString('pt-BR')} às {new Date(task.completedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {task.completionNotes && (
                <p className="text-emerald-800 text-xs mt-1 p-2 bg-white/70 rounded-lg border border-emerald-100">
                  {task.completionNotes}
                </p>
              )}
            </div>
          )}

          {task.status === 'BLOQUEADA' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-1 text-xs">
              <span className="font-bold text-rose-900 block flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                Bloqueada por {task.blockedBy}
              </span>
              {task.blockedAt && (
                <span className="text-rose-700 text-[11px] block">
                  Em {new Date(task.blockedAt).toLocaleDateString('pt-BR')} às {new Date(task.blockedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {task.blockReason && (
                <p className="text-rose-800 text-xs mt-1 p-2 bg-white/70 rounded-lg border border-rose-100 font-medium">
                  Motivo: {task.blockReason}
                </p>
              )}
            </div>
          )}

          {task.status === 'CANCELADA' && (
            <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl space-y-1 text-xs">
              <span className="font-bold text-slate-800 block flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-slate-500" />
                Cancelada por {task.cancelledBy}
              </span>
              {task.cancelReason && (
                <p className="text-slate-700 text-xs mt-1 p-2 bg-white/70 rounded-lg border border-slate-200">
                  Motivo: {task.cancelReason}
                </p>
              )}
            </div>
          )}

          {/* Histórico Cronológico Imutável (Timeline) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <History className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Histórico de Ações & Auditoria
              </h3>
            </div>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {task.history && task.history.map((hist) => (
                <div key={hist.id} className="relative group">
                  <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-white border-2 border-slate-400 flex items-center justify-center group-hover:border-blue-500 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-blue-500" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        {hist.action === 'CREATED' && 'Tarefa Criada'}
                        {hist.action === 'ASSIGNED' && 'Responsável Atribuído'}
                        {hist.action === 'REASSIGNED' && 'Responsável Transferido'}
                        {hist.action === 'UNASSIGNED' && 'Responsável Removido'}
                        {hist.action === 'STARTED' && 'Em Andamento'}
                        {hist.action === 'COMPLETED' && 'Tarefa Concluída'}
                        {hist.action === 'BLOCKED' && 'Tarefa Bloqueada'}
                        {hist.action === 'UNBLOCKED' && 'Tarefa Desbloqueada'}
                        {hist.action === 'REOPENED' && 'Tarefa Reaberta'}
                        {hist.action === 'CANCELLED' && 'Tarefa Cancelada'}
                        {hist.action === 'UPDATED' && 'Dados Atualizados'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(hist.performedAt).toLocaleDateString('pt-BR')} {new Date(hist.performedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      Por: <strong>{hist.performedBy}</strong>
                    </span>
                    {(hist.reason || hist.notes) && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">
                        {hist.reason || hist.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé com Barra de Ações Operacionais */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0 gap-2 flex-wrap">
          {/* Ações para tarefas em andamento ou pendentes */}
          {task.status === 'PENDENTE' && (
            <button
              type="button"
              onClick={handleStartTask}
              disabled={actionLoading}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Iniciar</span>
            </button>
          )}

          {isPendingOrInProgress && (
            <button
              type="button"
              onClick={() => onOpenCompleteModal(task)}
              disabled={actionLoading}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Concluir</span>
            </button>
          )}

          {isPendingOrInProgress && (
            <button
              type="button"
              onClick={() => onOpenBlockModal(task)}
              disabled={actionLoading}
              className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-amber-600" />
              <span>Bloquear</span>
            </button>
          )}

          {task.status === 'BLOQUEADA' && (
            <button
              type="button"
              onClick={() => onOpenUnblockModal(task)}
              disabled={actionLoading}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Desbloquear</span>
            </button>
          )}

          {(task.status === 'CONCLUIDA' || task.status === 'CANCELADA') && (
            <button
              type="button"
              onClick={() => onOpenReopenModal(task)}
              disabled={actionLoading}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reabrir Tarefa</span>
            </button>
          )}

          {isPendingOrInProgress && (
            <button
              type="button"
              onClick={() => onOpenCancelModal(task)}
              disabled={actionLoading}
              className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors ml-auto cursor-pointer"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
