import React, { useState, useEffect } from 'react';
import { X, UserCheck, AlertTriangle, Shield, CheckCircle, RefreshCw, UserMinus } from 'lucide-react';
import { safeFetchJson } from '../lib/api.ts';
import { Admission, User } from '../types/index.ts';

interface AssignResponsibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (admission: Admission) => void;
  admissionId: string;
  admissionCode: string;
  employeeName: string;
  stepKey?: string;
  stepName?: string;
  currentResponsibleId?: string;
  currentResponsibleName?: string;
  updatedAt?: string;
}

export const AssignResponsibleModal: React.FC<AssignResponsibleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  admissionId,
  admissionCode,
  employeeName,
  stepKey,
  stepName,
  currentResponsibleId,
  currentResponsibleName,
  updatedAt
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmedTransfer, setConfirmedTransfer] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedUserId('');
      setReason('');
      setError(null);
      setSuccessMsg(null);
      setConfirmedTransfer(false);
      return;
    }

    const fetchUsers = async () => {
      setLoadingUsers(true);
      setError(null);
      try {
        const data = await safeFetchJson<{ users: User[] }>('/api/responsaveis/elegiveis');
        if (data && data.users) {
          setUsers(data.users);
          // Pré-seleciona se já houver responsável atual
          if (currentResponsibleId) {
            setSelectedUserId(currentResponsibleId);
          } else {
            setSelectedUserId('');
          }
        }
      } catch (err: any) {
        console.error('Erro ao buscar usuários elegíveis:', err);
        setError('Não foi possível carregar a lista de usuários de RH.');
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [isOpen, currentResponsibleId]);

  if (!isOpen) return null;

  const isStepAssignment = Boolean(stepKey && stepName);
  const selectedUser = users.find(u => u.id === selectedUserId);
  const isRemoving = selectedUserId === 'REMOVE' || selectedUserId === '';
  const isChanging = Boolean(
    currentResponsibleId &&
    selectedUserId &&
    selectedUserId !== 'REMOVE' &&
    selectedUserId !== currentResponsibleId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Se estiver transferindo de uma pessoa para outra e ainda não confirmou no aviso
    if (isChanging && !confirmedTransfer) {
      setConfirmedTransfer(true);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        responsibleUserId: isRemoving ? null : selectedUserId,
        stepKey: stepKey || undefined,
        reason: reason.trim() || undefined,
        versionTimestamp: updatedAt
      };

      const endpoint = isStepAssignment
        ? `/api/admissoes/${admissionId}/etapas/${stepKey}/atribuir`
        : `/api/admissoes/${admissionId}/atribuir`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar responsável.');
      }

      setSuccessMsg(data.message || 'Atribuição realizada com sucesso!');
      setTimeout(() => {
        onSuccess(data.admission);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar atribuição. Tente novamente.');
      setConfirmedTransfer(false);
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'RH': return 'Analista de RH';
      case 'RH_CONFERENCIA': return 'RH Conferência';
      case 'GESTOR': return 'Gestão / Liderança';
      case 'ADMIN': return 'Administrador';
      default: return role;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabeçalho */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isStepAssignment ? `Atribuir Etapa: ${stepName}` : 'Atribuir Responsável da Admissão'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {admissionCode} • {employeeName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold">Não foi possível concluir</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Status Atual do Responsável */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
            <div>
              <span className="text-slate-500 block">Responsável Atual:</span>
              <span className="font-bold text-slate-800 text-sm">
                {currentResponsibleName || 'Nenhum (Sem responsável)'}
              </span>
            </div>
            {isStepAssignment && (
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold rounded-md text-[11px] border border-blue-200">
                Escopo: Etapa {stepName}
              </span>
            )}
          </div>

          {/* Confirmação de Transferência */}
          {isChanging && (
            <div className={`p-4 rounded-xl border transition-all ${
              confirmedTransfer 
                ? 'bg-amber-50/80 border-amber-300 text-amber-900' 
                : 'bg-blue-50/60 border-blue-200 text-blue-900'
            }`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold">
                    Transferência de Responsabilidade
                  </p>
                  <p>
                    Você está transferindo esta {isStepAssignment ? 'etapa' : 'admissão'} de{' '}
                    <strong className="text-slate-900">{currentResponsibleName}</strong> para{' '}
                    <strong className="text-slate-900">{selectedUser?.name}</strong>.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Todas as notificações e pendências operacionais passarão para a fila do novo responsável.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Seleção do Novo Responsável */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Selecione o Novo Responsável <span className="text-red-500">*</span>
            </label>
            {loadingUsers ? (
              <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Carregando equipe de RH...</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {/* Opção: Sem responsável (Remover) */}
                <label className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  selectedUserId === 'REMOVE' || selectedUserId === ''
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="responsibleUser"
                      value="REMOVE"
                      checked={selectedUserId === 'REMOVE' || selectedUserId === ''}
                      onChange={() => {
                        setSelectedUserId('REMOVE');
                        setConfirmedTransfer(false);
                      }}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-1.5 font-medium">
                      <UserMinus className="w-4 h-4 text-slate-400" />
                      <span>Sem responsável (Pool aberto / Aguardando candidato)</span>
                    </div>
                  </div>
                </label>

                {/* Usuários elegíveis */}
                {users.map(u => {
                  const isCurrent = u.id === currentResponsibleId;
                  const isSelected = u.id === selectedUserId;
                  const isInactive = u.active === false;

                  return (
                    <label
                      key={u.id}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                        isInactive
                          ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-200'
                          : isSelected
                          ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-xs cursor-pointer'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="radio"
                          name="responsibleUser"
                          value={u.id}
                          disabled={isInactive}
                          checked={isSelected}
                          onChange={() => {
                            setSelectedUserId(u.id);
                            setConfirmedTransfer(false);
                          }}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[11px] shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <div className="truncate">
                          <div className="font-semibold flex items-center gap-1.5">
                            <span className="truncate">{u.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded-sm font-normal">
                                Atual
                              </span>
                            )}
                            {isInactive && (
                              <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded-sm font-medium">
                                Inativo
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 block truncate">
                            {u.email}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          <Shield className="w-3 h-3 text-slate-400" />
                          <span>{getRoleLabel(u.role)}</span>
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Justificativa / Observação */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Justificativa ou Observação Operacional (Opcional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Redistribuição de carga da equipe, cobertura de férias, transferência para analista de conferência..."
              rows={2}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Esta observação será registrada no histórico de atribuições e auditoria da admissão.
            </p>
          </div>

          {/* Botões do Rodapé */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={submitting || loadingUsers}
              className={`px-5 py-2.5 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2 ${
                isChanging && !confirmedTransfer
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Salvando atribuição...</span>
                </>
              ) : isChanging && !confirmedTransfer ? (
                <span>Confirmar Transferência</span>
              ) : (
                <span>Salvar Atribuição</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
