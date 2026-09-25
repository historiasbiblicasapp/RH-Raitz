import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  AlertCircle, 
  Clock, 
  UserCheck, 
  FileCheck2, 
  Briefcase, 
  Lock, 
  ShieldAlert, 
  AlertTriangle, 
  Calendar, 
  RefreshCw, 
  Flag, 
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Plus
} from 'lucide-react';
import { 
  Admission, 
  OperationalChecklistItem, 
  OperationalPriority, 
  OperationalChecklistSituation, 
  OperationalResponsible,
  OperationalTaskItem,
  JobPosition,
  JobPositionDocument
} from '../types/index.ts';
import { safeFetchJson } from '../lib/api.ts';
import { handleFallbackApiRoute } from '../lib/fallbackClient.ts';
import { CreateJobPositionWithChecklistModal } from './CreateJobPositionWithChecklistModal.tsx';

interface AdmissionOperationalChecklistTabProps {
  admission: Admission;
  onUpdateAdmission?: (updated: Admission) => void;
  onNavigateTab?: (tab: string, docId?: string) => void;
}

export const AdmissionOperationalChecklistTab: React.FC<AdmissionOperationalChecklistTabProps> = ({
  admission,
  onUpdateAdmission,
  onNavigateTab
}) => {
  const [data, setData] = useState<OperationalChecklistItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  const [isCreateCargoModalOpen, setIsCreateCargoModalOpen] = useState(false);
  const [newPriority, setNewPriority] = useState<OperationalPriority>(admission.operationalPriority || 'NORMAL');
  const [priorityReason, setPriorityReason] = useState(admission.operationalPriorityReason || '');
  const [savingPriority, setSavingPriority] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const endpoint = `/api/admissions/${admission.id}/operational-checklist`;
      let res: OperationalChecklistItem | null = null;
      try {
        res = await safeFetchJson<OperationalChecklistItem>(endpoint);
      } catch {
        res = handleFallbackApiRoute(endpoint) as OperationalChecklistItem;
      }
      if (res) {
        setData(res);
        setNewPriority(res.operationalPriority);
        setPriorityReason(res.operationalPriorityReason || '');
      }
    } catch (err) {
      console.error('[AdmissionChecklistTab] Erro ao carregar checklist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [admission.id]);

  const handleSavePriority = async () => {
    setSavingPriority(true);
    try {
      const endpoint = `/api/admissions/${admission.id}/operational-priority`;
      const payload = { priority: newPriority, reason: priorityReason.trim() || undefined };
      try {
        await safeFetchJson(endpoint, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch {
        handleFallbackApiRoute(endpoint, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
      }

      setPriorityModalOpen(false);
      loadData();
      if (onUpdateAdmission) {
        onUpdateAdmission({
          ...admission,
          operationalPriority: newPriority,
          operationalPriorityReason: priorityReason.trim() || undefined
        });
      }
    } catch (err: any) {
      alert('Erro ao salvar prioridade: ' + (err.message || 'Falha de comunicação'));
    } finally {
      setSavingPriority(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Carregando checklist operacional...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
        Não foi possível carregar as informações operacionais desta admissão.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bloco 1: Visão Geral Operacional & Status Críticos */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-600" />
              <span>Painel de Checklist Operacional</span>
            </h2>
            <p className="text-xs text-slate-500">
              Análise operacional com detecção automática de prazos, bloqueios e responsabilidades ativas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-tab-create-cargo"
              onClick={() => setIsCreateCargoModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-2xs"
              title="Cadastrar novo cargo e definir documentos exigidos no checklist"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Cargo & Checklist</span>
            </button>

            <button
              type="button"
              onClick={() => setPriorityModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
            >
              <Flag className="w-3.5 h-3.5 text-slate-500" />
              <span>Alterar Prioridade</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              title="Recarregar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Grade de Destaques Operacionais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Prioridade */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">Prioridade Operacional</span>
            <div className="pt-1">
              {data.operationalPriority === 'CRITICA' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Crítica
                </span>
              )}
              {data.operationalPriority === 'ALTA' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Alta
                </span>
              )}
              {data.operationalPriority === 'NORMAL' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  Normal
                </span>
              )}
            </div>
            {data.operationalPriorityReason && (
              <p className="text-[11px] text-slate-500 italic mt-1">{data.operationalPriorityReason}</p>
            )}
          </div>

          {/* Situação Operacional */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">Situação Operacional</span>
            <div className="pt-1">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                data.operationalSituation === 'BLOQUEADA' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                data.operationalSituation === 'ATRASADA' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                data.operationalSituation === 'PROXIMA' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                data.operationalSituation === 'SEM_MOVIMENTACAO' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                {data.operationalSituationLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {data.daysSinceCreation} dias desde a criação
            </p>
          </div>

          {/* Responsável Atual */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">Responsável Atual</span>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-800 shadow-2xs">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                {data.currentResponsible === 'FUNCIONARIO' ? 'Funcionário' :
                 data.currentResponsible === 'RH_CONFERENCIA' ? 'RH (Conferência)' :
                 data.currentResponsible === 'GESTOR' ? 'Gestor' :
                 data.currentResponsible === 'SISTEMA' ? 'Sistema' : 'Equipe de RH'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Etapa: {data.currentStepOrder}. {data.currentStepName}
            </p>
          </div>

          {/* Tempo sem Movimentação */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">Tempo na Etapa</span>
            <div className="text-xl font-bold text-slate-900 pt-0.5">
              {data.daysInCurrentStep} dia(s)
            </div>
            <p className={`text-[11px] ${data.daysWithoutMovement >= 3 ? 'text-amber-700 font-semibold' : 'text-slate-400'}`}>
              Sem movimentação há {data.daysWithoutMovement} dia(s)
            </p>
          </div>
        </div>

        {/* Alerta de Pendência Principal */}
        <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
          data.primaryPending.type === 'BLOQUEIO' ? 'bg-purple-50/80 border-purple-200' :
          data.primaryPending.type === 'DOC_REJEITADO' ? 'bg-rose-50/80 border-rose-200' :
          data.primaryPending.type === 'DOC_CONFERENCIA' ? 'bg-sky-50/80 border-sky-200' :
          data.primaryPending.type === 'DOC_NAO_ENVIADO' ? 'bg-amber-50/80 border-amber-200' :
          'bg-slate-50 border-slate-200'
        }`}>
          <div className="p-2 bg-white rounded-lg border shadow-2xs shrink-0">
            {data.primaryPending.type === 'BLOQUEIO' ? <Lock className="w-5 h-5 text-purple-600" /> :
             data.primaryPending.type === 'DOC_REJEITADO' ? <AlertCircle className="w-5 h-5 text-rose-600" /> :
             data.primaryPending.type === 'DOC_CONFERENCIA' ? <FileCheck2 className="w-5 h-5 text-sky-600" /> :
             data.primaryPending.type === 'DOC_NAO_ENVIADO' ? <Clock className="w-5 h-5 text-amber-600" /> :
             <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Ação Operacional Prioritária
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                Responsável: <strong className="text-slate-800">{data.primaryPending.responsible}</strong>
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{data.primaryPending.title}</p>
            <p className="text-xs text-slate-600 mt-0.5">{data.primaryPending.description}</p>
          </div>
          {onNavigateTab && (
            <div className="shrink-0 self-center">
              {data.primaryPending.type === 'DOC_CONFERENCIA' && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('documentos', data.primaryPending.documentId)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  Conferir Documento
                </button>
              )}
              {data.primaryPending.type === 'DOC_REJEITADO' && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('pendencias', data.primaryPending.documentId)}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 border border-rose-300 rounded-lg transition-colors cursor-pointer"
                >
                  Ver Motivo
                </button>
              )}
              {data.primaryPending.type === 'BLOQUEIO' && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('etapas')}
                  className="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded-lg transition-colors cursor-pointer"
                >
                  Ver Etapa
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bloco 2: Lista de Tarefas do Checklist Operacional */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Tarefas Operacionais do Processo ({data.tasks?.length || 0})
            </h3>
            <p className="text-xs text-slate-500">
              Tarefas avaliadas com base na conformidade cadastral, documentos e regras de etapa do Bloco 5.4.
            </p>
          </div>
        </div>

        {(!data.tasks || data.tasks.length === 0) ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Nenhuma tarefa operacional pendente no momento.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.tasks.map((task) => {
              const isDone = task.status === 'CONCLUIDA';
              const isRejected = task.status === 'REJEITADA';
              const isBlocked = task.status === 'BLOQUEADA';

              return (
                <div key={task.id} className="py-3.5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : isRejected || task.priority === 'CRITICA' ? (
                        <AlertCircle className="w-5 h-5 text-rose-500" />
                      ) : isBlocked ? (
                        <Lock className="w-5 h-5 text-purple-500" />
                      ) : task.priority === 'ALTA' ? (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold ${isDone ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                          {task.title}
                        </span>
                        {task.priority === 'CRITICA' && !isDone && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                            Crítica
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          Resp: {task.responsible}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {task.description}
                        </p>
                      )}
                      {task.rejectionReason && (
                        <p className="text-[11px] text-rose-600 font-medium mt-0.5">
                          Motivo: {task.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {onNavigateTab && (
                    <div className="shrink-0">
                      {task.category === 'DOCUMENTO' && (
                        <button
                          type="button"
                          onClick={() => onNavigateTab('documentos', task.documentId)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                        >
                          Documentos
                        </button>
                      )}
                      {(task.category === 'ETAPA' || task.category === 'CONCLUSAO' || task.category === 'APROVACAO') && (
                        <button
                          type="button"
                          onClick={() => onNavigateTab('etapas')}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                        >
                          Etapas
                        </button>
                      )}
                      {(task.category === 'CADASTRO' || task.category === 'DADOS') && (
                        <button
                          type="button"
                          onClick={() => onNavigateTab('dados')}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                        >
                          Dados
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Prioridade */}
      {priorityModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Alterar Prioridade Operacional
              </h3>
              <button
                type="button"
                onClick={() => setPriorityModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Selecione a Prioridade:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['NORMAL', 'ALTA', 'CRITICA'] as OperationalPriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewPriority(p)}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                        newPriority === p
                          ? p === 'CRITICA'
                            ? 'bg-rose-100 border-rose-400 text-rose-800 ring-2 ring-rose-500/20'
                            : p === 'ALTA'
                            ? 'bg-amber-100 border-amber-400 text-amber-800 ring-2 ring-amber-500/20'
                            : 'bg-blue-100 border-blue-400 text-blue-800 ring-2 ring-blue-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Justificativa da Alteração:
                </label>
                <textarea
                  rows={3}
                  value={priorityReason}
                  onChange={(e) => setPriorityReason(e.target.value)}
                  placeholder="Ex: Urgência solicitada pela diretoria de operações."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPriorityModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={savingPriority}
                  onClick={handleSavePriority}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {savingPriority ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação de Cargo com Checklist de Documentos Exigidos */}
      <CreateJobPositionWithChecklistModal
        isOpen={isCreateCargoModalOpen}
        onClose={() => setIsCreateCargoModalOpen(false)}
        onSuccess={(_pos, _docs) => {
          setIsCreateCargoModalOpen(false);
          loadData();
        }}
      />
    </div>
  );
};
