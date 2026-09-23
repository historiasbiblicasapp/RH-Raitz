import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertOctagon, 
  Ban, 
  RotateCcw, 
  UserCheck, 
  AlertTriangle,
  Play
} from 'lucide-react';
import { OperationalTask } from '../../types/index.ts';

interface EligibleUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

// -----------------------------------------------------------------------------
// 1. MODAL DE CONCLUSÃO DE TAREFA
// -----------------------------------------------------------------------------
interface CompleteTaskModalProps {
  isOpen: boolean;
  task: OperationalTask | null;
  onClose: () => void;
  onConfirm: (completionNotes?: string) => Promise<void>;
}

export const CompleteTaskModal: React.FC<CompleteTaskModalProps> = ({
  isOpen,
  task,
  onClose,
  onConfirm
}) => {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(notes.trim() || undefined);
      setNotes('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao concluir tarefa.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Concluir Tarefa Operacional</h3>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <span className="text-xs text-slate-500 font-medium block">Tarefa a ser concluída:</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{task.title}</p>
            <span className="text-xs text-slate-500 mt-0.5 block">
              Funcionário: <strong>{task.employeeName}</strong> ({task.admissionCode})
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Observações da Conclusão (Opcional)
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Documento conferido e aprovado após contato telefônico com o candidato..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              {submitting ? 'Salvando...' : 'Confirmar Conclusão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// 2. MODAL DE BLOQUEIO DE TAREFA
// -----------------------------------------------------------------------------
interface BlockTaskModalProps {
  isOpen: boolean;
  task: OperationalTask | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export const BlockTaskModal: React.FC<BlockTaskModalProps> = ({
  isOpen,
  task,
  onClose,
  onConfirm
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed || trimmed.length < 3) {
      setError('Informe o motivo do bloqueio operacional (mínimo 3 caracteres).');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(trimmed);
      setReason('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao bloquear tarefa.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Bloquear Tarefa Operacional</h3>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <span className="text-xs text-slate-500 font-medium block">Tarefa a ser bloqueada:</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{task.title}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Motivo / Impedimento Operacional <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Ex: Aguardando retorno da junta médica sobre laudo complementar..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              {submitting ? 'Bloqueando...' : 'Confirmar Bloqueio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// 3. MODAL DE DESBLOQUEIO DE TAREFA
// -----------------------------------------------------------------------------
interface UnblockTaskModalProps {
  isOpen: boolean;
  task: OperationalTask | null;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
}

export const UnblockTaskModal: React.FC<UnblockTaskModalProps> = ({
  isOpen,
  task,
  onClose,
  onConfirm
}) => {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(notes.trim() || undefined);
      setNotes('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao desbloquear tarefa.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Play className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Desbloquear Tarefa Operacional</h3>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <span className="text-xs text-slate-500 font-medium block">Tarefa a ser desbloqueada:</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{task.title}</p>
            {task.blockReason && (
              <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                Motivo do bloqueio atual: {task.blockReason}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Observações do Desbloqueio (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Impedimento resolvido, documentação complementar recebida..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              {submitting ? 'Desbloqueando...' : 'Desbloquear e Retomar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// 4. MODAL DE REABERTURA DE TAREFA
// -----------------------------------------------------------------------------
interface ReopenTaskModalProps {
  isOpen: boolean;
  task: OperationalTask | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export const ReopenTaskModal: React.FC<ReopenTaskModalProps> = ({
  isOpen,
  task,
  onClose,
  onConfirm
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed || trimmed.length < 3) {
      setError('Informe a justificativa para a reabertura (mínimo 3 caracteres).');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(trimmed);
      setReason('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao reabrir tarefa.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Reabrir Tarefa Operacional</h3>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <span className="text-xs text-slate-500 font-medium block">Tarefa a ser reaberta:</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{task.title}</p>
            <span className="text-[11px] text-slate-400 block mt-1">
              A tarefa voltará para o status <strong>PENDENTE</strong> e o histórico registrará a justificativa.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Justificativa de Reabertura <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Ex: Foi constatada divergência no documento após conferência final..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              {submitting ? 'Reabrindo...' : 'Confirmar Reabertura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// 5. MODAL DE CANCELAMENTO DE TAREFA
// -----------------------------------------------------------------------------
interface CancelTaskModalProps {
  isOpen: boolean;
  task: OperationalTask | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export const CancelTaskModal: React.FC<CancelTaskModalProps> = ({
  isOpen,
  task,
  onClose,
  onConfirm
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed || trimmed.length < 3) {
      setError('Informe a justificativa do cancelamento (mínimo 3 caracteres).');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(trimmed);
      setReason('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao cancelar tarefa.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <Ban className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Cancelar Tarefa Operacional</h3>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <span className="text-xs text-slate-500 font-medium block">Tarefa a ser cancelada:</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{task.title}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              A tarefa será marcada como <strong>CANCELADA</strong> e continuará no histórico de auditoria.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Justificativa de Cancelamento <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Ex: Ação desnecessária devido à alteração nos requisitos da vaga..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              {submitting ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// 6. MODAL DE ATRIBUIÇÃO DE RESPONSÁVEL DA TAREFA
// -----------------------------------------------------------------------------
interface AssignTaskResponsibleModalProps {
  isOpen: boolean;
  task: OperationalTask | null;
  users: EligibleUser[];
  onClose: () => void;
  onConfirm: (responsibleUserId: string | null, reason?: string) => Promise<void>;
}

export const AssignTaskResponsibleModal: React.FC<AssignTaskResponsibleModalProps> = ({
  isOpen,
  task,
  users,
  onClose,
  onConfirm
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(task?.responsibleUserId || '');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (task) {
      setSelectedUserId(task.responsibleUserId || '');
      setReason('');
      setError(null);
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const targetUserId = selectedUserId ? selectedUserId : null;
      await onConfirm(targetUserId, reason.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao alterar responsável.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Atribuir Responsável da Tarefa</h3>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <span className="text-xs text-slate-500 font-medium block">Tarefa:</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{task.title}</p>
            <span className="text-xs text-slate-500 mt-0.5 block">
              Responsável atual: <strong>{task.responsibleUserName || 'Sem responsável'}</strong>
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Novo Responsável Operacional
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            >
              <option value="">Sem responsável (Remover atribuição)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Motivo / Observação da Atribuição (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Redistribuição de carga de trabalho para atendimento célere..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              {submitting ? 'Salvando...' : 'Salvar Atribuição'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
