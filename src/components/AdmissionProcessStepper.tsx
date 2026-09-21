import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Lock, 
  PlayCircle, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  History, 
  ChevronRight, 
  ShieldCheck, 
  User, 
  FileText, 
  Info,
  Calendar,
  Layers,
  ArrowRight,
  MessageSquare
} from 'lucide-react';
import { Admission, AdmissionProcessStepSnapshot, ProcessStepCompletionRule, ProcessStepResponsibleRole } from '../types/index.ts';
import { safeFetchJson } from '../lib/api.ts';

interface AdmissionProcessStepperProps {
  admission: Admission;
  onUpdate: (updatedAdmission: Admission) => void;
  compact?: boolean;
}

export const AdmissionProcessStepper: React.FC<AdmissionProcessStepperProps> = ({
  admission,
  onUpdate,
  compact = false
}) => {
  const [selectedStep, setSelectedStep] = useState<AdmissionProcessStepSnapshot | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<AdmissionProcessStepSnapshot | null>(null);
  
  // Modais de Ação
  const [showCompleteModal, setShowCompleteModal] = useState<AdmissionProcessStepSnapshot | null>(null);
  const [completeNotes, setCompleteNotes] = useState('');
  const [isSubmittingComplete, setIsSubmittingComplete] = useState(false);

  const [showReopenModal, setShowReopenModal] = useState<AdmissionProcessStepSnapshot | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [isSubmittingReopen, setIsSubmittingReopen] = useState(false);

  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const steps = (admission.processSteps || []).sort((a, b) => a.stepOrder - b.stepOrder);

  // Concluir Etapa Manualmente
  const handleCompleteStep = async () => {
    if (!showCompleteModal) return;
    try {
      setIsSubmittingComplete(true);
      setFeedbackMessage(null);

      const response = await safeFetchJson<any>(`/api/admissions/${admission.id}/process-steps/${showCompleteModal.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: completeNotes.trim() || undefined })
      });

      if (response?.success && response?.admission) {
        onUpdate(response.admission);
        setFeedbackMessage({ type: 'success', text: response.message || 'Etapa concluída com sucesso!' });
        setShowCompleteModal(null);
        setCompleteNotes('');
        setTimeout(() => setFeedbackMessage(null), 4000);
      } else {
        throw new Error(response?.error || 'Não foi possível concluir a etapa.');
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Erro ao concluir etapa.' });
    } finally {
      setIsSubmittingComplete(false);
    }
  };

  // Reabrir Etapa com Justificativa Obrigatória
  const handleReopenStep = async () => {
    if (!showReopenModal) return;
    if (!reopenReason.trim()) {
      alert('A justificativa de reabertura é estritamente obrigatória.');
      return;
    }

    try {
      setIsSubmittingReopen(true);
      setFeedbackMessage(null);

      const response = await safeFetchJson<any>(`/api/admissions/${admission.id}/process-steps/${showReopenModal.id}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reopenReason.trim() })
      });

      if (response?.success && response?.admission) {
        onUpdate(response.admission);
        setFeedbackMessage({ type: 'success', text: response.message || 'Etapa reaberta com sucesso!' });
        setShowReopenModal(null);
        setReopenReason('');
        setTimeout(() => setFeedbackMessage(null), 4000);
      } else {
        throw new Error(response?.error || 'Não foi possível reabrir a etapa.');
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Erro ao reabrir etapa.' });
    } finally {
      setIsSubmittingReopen(false);
    }
  };

  const formatRoleName = (role: ProcessStepResponsibleRole | string) => {
    switch (role) {
      case 'RH': return 'RH (Operacional)';
      case 'RH_CONFERENCIA': return 'RH (Conferência)';
      case 'GESTOR': return 'Gestor Imediato';
      case 'DP': return 'Departamento Pessoal';
      case 'ADMIN': return 'Administrador';
      case 'CANDIDATO': return 'Colaborador';
      default: return role;
    }
  };

  const formatRuleName = (rule: ProcessStepCompletionRule) => {
    switch (rule) {
      case 'CADASTRO_INICIAL': return 'Abertura do Cadastro no Sistema';
      case 'DADOS_PREENCHIDOS': return 'Confirmação dos Dados pelo Candidato';
      case 'DOCUMENTOS_APROVADOS': return 'Aprovação de Todos os Documentos Obrigatórios';
      case 'CONFERENCIA_FINALIZADA': return 'Conferência Finalizada pelo RH';
      case 'APROVACAO_MANUAL': return 'Aprovação Manual do Gestor / RH';
      case 'ETAPAS_ANTERIORES_CONCLUIDAS': return 'Conclusão de Todas as Etapas Anteriores';
      default: return rule;
    }
  };

  if (steps.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-xs">
        <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="font-semibold text-slate-700">Etapas do processo não inicializadas nesta admissão.</p>
        <p className="mt-1 text-slate-400">O snapshot será gerado automaticamente na próxima sincronização.</p>
      </div>
    );
  }

  // Visualização compacta (para cabeçalho ou resumo)
  if (compact) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <Layers className="w-4 h-4" />
            </span>
            <h4 className="text-xs font-bold text-slate-900">Processo Admissional (V{admission.processVersionNumber || 1})</h4>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            {steps.filter(s => s.status === 'CONCLUIDA').length} de {steps.length} etapas concluídas
          </span>
        </div>

        {/* Stepper Horizontal Simplificado */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
          {steps.map((st, idx) => {
            const isCompleted = st.status === 'CONCLUIDA';
            const isInProgress = st.status === 'EM_ANDAMENTO';
            const isBlocked = st.status === 'BLOQUEADA';

            return (
              <div 
                key={st.id} 
                className={`p-2.5 rounded-xl border transition-all text-left ${
                  isCompleted 
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
                    : isInProgress 
                    ? 'bg-blue-50/80 border-blue-300 text-blue-950 ring-2 ring-blue-500/20' 
                    : isBlocked
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950 opacity-80'
                    : 'bg-slate-50 border-slate-200 text-slate-700 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold opacity-75">#{idx + 1}</span>
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  {isInProgress && <PlayCircle className="w-3.5 h-3.5 text-blue-600 shrink-0 animate-pulse" />}
                  {isBlocked && <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                  {!isCompleted && !isInProgress && !isBlocked && <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                </div>
                <p className="text-xs font-bold truncate" title={st.stepName}>{st.stepName}</p>
                <p className="text-[10px] opacity-75 mt-0.5 truncate">
                  {isCompleted ? 'Concluída' : isInProgress ? 'Em andamento' : isBlocked ? 'Bloqueada' : 'Pendente'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerta de Feedback */}
      {feedbackMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in duration-150 ${
          feedbackMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button 
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 rounded"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Cabeçalho do Processo com Versionamento Imutável */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Etapas do Processo Admissional</h3>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-full">
                  Versão {admission.processVersionNumber || 1}.0
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Snapshot imutável gerado na abertura desta admissão. Mantém histórico e regras originais.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-right">
            <span className="text-[10px] text-slate-400 block font-medium">Progresso das Etapas</span>
            <span className="text-xs font-bold text-slate-800">
              {steps.filter(s => s.status === 'CONCLUIDA').length} de {steps.length} concluídas
            </span>
          </div>
        </div>
      </div>

      {/* Lista / Timeline Interativa das Etapas */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isCompleted = step.status === 'CONCLUIDA';
          const isInProgress = step.status === 'EM_ANDAMENTO';
          const isBlocked = step.status === 'BLOQUEADA';
          const isPending = step.status === 'PENDENTE';

          // Verifica se etapas anteriores obrigatórias estão concluídas
          const previousSteps = steps.filter(s => s.stepOrder < step.stepOrder);
          const previousMandatoryComplete = previousSteps.filter(s => s.required).every(s => s.status === 'CONCLUIDA');

          return (
            <div 
              key={step.id}
              className={`bg-white rounded-2xl border transition-all p-5 shadow-xs ${
                isInProgress 
                  ? 'border-blue-300 ring-2 ring-blue-500/10' 
                  : isCompleted 
                  ? 'border-emerald-200' 
                  : isBlocked
                  ? 'border-amber-200 bg-amber-50/20'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Lado Esquerdo: Ícone, Ordem, Nome e Metadados */}
                <div className="flex items-start gap-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isCompleted 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : isInProgress 
                      ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-400/40' 
                      : isBlocked
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {isCompleted && <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />}
                    {isInProgress && <PlayCircle className="w-5 h-5 animate-pulse" />}
                    {isBlocked && <Lock className="w-5 h-5" />}
                    {isPending && <span className="text-xs font-bold">{index + 1}</span>}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">Etapa {step.stepOrder}</span>
                      <h4 className="text-sm font-bold text-slate-900">{step.stepName}</h4>

                      {/* Badges de Status */}
                      {isCompleted && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" />
                          Concluída
                        </span>
                      )}
                      {isInProgress && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                          Em Andamento
                        </span>
                      )}
                      {isBlocked && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Bloqueada
                        </span>
                      )}
                      {isPending && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full">
                          Pendente
                        </span>
                      )}

                      {step.required ? (
                        <span className="text-[10px] font-semibold text-slate-500">Obrigatória</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400 italic">Opcional</span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 mt-1">{step.stepDescription}</p>

                    {/* Detalhes de Responsável e Regra */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-2.5">
                      <span className="flex items-center gap-1 text-slate-700 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Responsável: <strong>{formatRoleName(step.responsibleRole)}</strong>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-700 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                        Regra: <strong>{formatRuleName(step.completionRule)}</strong>
                      </span>
                    </div>

                    {/* Informações de Conclusão / Bloqueio */}
                    {isCompleted && (
                      <div className="mt-2.5 p-2 bg-emerald-50 rounded-xl border border-emerald-100 text-[11px] text-emerald-900 flex flex-wrap items-center gap-2">
                        <span>Concluída em: <strong>{step.completedAt ? new Date(step.completedAt).toLocaleString('pt-BR') : 'Data não registrada'}</strong></span>
                        <span>•</span>
                        <span>Por: <strong>{step.completedBy || 'Sistema'}</strong></span>
                        {step.notes && (
                          <>
                            <span>•</span>
                            <span className="italic">"{step.notes}"</span>
                          </>
                        )}
                      </div>
                    )}

                    {isBlocked && (
                      <div className="mt-2.5 p-2 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-900 flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Bloqueada: Esta etapa depende da conclusão das etapas anteriores obrigatórias.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lado Direito: Ações de Concluir / Reabrir / Ver Histórico */}
                <div className="flex items-center gap-2 self-end lg:self-center shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 w-full lg:w-auto justify-end">
                  {/* Botão Ver Histórico da Etapa */}
                  <button
                    onClick={() => setShowHistoryModal(step)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    title="Ver histórico de transições desta etapa"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Histórico</span>
                  </button>

                  {/* Botão Concluir Etapa (se não concluída) */}
                  {!isCompleted && (
                    <button
                      onClick={() => {
                        setCompleteNotes('');
                        setShowCompleteModal(step);
                      }}
                      disabled={!previousMandatoryComplete}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                      title={previousMandatoryComplete ? 'Concluir esta etapa manualmente' : 'Conclua as etapas anteriores obrigatórias primeiro'}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Concluir Etapa</span>
                    </button>
                  )}

                  {/* Botão Reabrir Etapa (se concluída) */}
                  {isCompleted && (
                    <button
                      onClick={() => {
                        setReopenReason('');
                        setShowReopenModal(step);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
                      title="Reabrir esta etapa mediante justificativa obrigatória"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reabrir</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Concluir Etapa */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl shrink-0">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Concluir Etapa do Processo</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Etapa: <strong>{showCompleteModal.stepName}</strong> (#{showCompleteModal.stepOrder})
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p>Ao concluir manualmente esta etapa, o sistema registrará seu usuário na auditoria e liberará a etapa subsequente para prosseguimento do fluxo.</p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block font-semibold text-slate-800">
                Observações ou Parecer do RH (Opcional):
              </label>
              <textarea
                rows={3}
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                placeholder="Ex: Documentos conferidos e validados pela equipe de RH..."
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCompleteModal(null)}
                disabled={isSubmittingComplete}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCompleteStep}
                disabled={isSubmittingComplete}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                {isSubmittingComplete ? 'Concluindo...' : 'Confirmar Conclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reabrir Etapa (Justificativa Obrigatória) */}
      {showReopenModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                <RotateCcw className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Reabrir Etapa do Processo</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Etapa: <strong>{showReopenModal.stepName}</strong> (#{showReopenModal.stepOrder})
                </p>
              </div>
            </div>

            <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                Atenção: Justificativa Obrigatória
              </p>
              <p>Esta ação reabrirá a etapa e reverterá o status da admissão se ela já estiver concluída. O motivo será registrado no log de auditoria permanente.</p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block font-semibold text-slate-800">
                Justificativa da Reabertura <span className="text-rose-600 font-bold">*</span>:
              </label>
              <textarea
                rows={3}
                required
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Ex: Identificada divergência no comprovante de endereço que requer novo envio pelo colaborador..."
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-rose-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowReopenModal(null)}
                disabled={isSubmittingReopen}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleReopenStep}
                disabled={isSubmittingReopen || !reopenReason.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                {isSubmittingReopen ? 'Reabrindo...' : 'Reabrir Etapa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Histórico da Etapa */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Histórico de Transições</h3>
                  <p className="text-xs text-slate-500">Etapa: {showHistoryModal.stepName}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistoryModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {(showHistoryModal.history || []).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Nenhum evento registrado nesta etapa.</p>
              ) : (
                (showHistoryModal.history || []).map((ev, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase ${
                        ev.action === 'concluida' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : ev.action === 'reaberta'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {ev.action}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(ev.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium pt-1">{ev.details}</p>
                    <p className="text-[11px] text-slate-500">Operador: <strong>{ev.userName}</strong></p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowHistoryModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
