import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Building,
  Briefcase,
  Calendar,
  FileCheck2,
  FileWarning,
  ShieldAlert,
  ArrowRight,
  History,
  RotateCcw,
  Check,
  AlertCircle
} from 'lucide-react';
import {
  AdmissionApproval,
  ApprovalQueueItem,
  ApprovalDetailResponse,
  REJECTION_REASONS_APPROVAL,
  RejectionReasonApproval
} from '../types/index.ts';
import { safeFetchJson } from '../lib/api.ts';

interface ApprovalDecisionModalProps {
  approvalId: string;
  onClose: () => void;
  onSuccess: () => void;
  isOpen?: boolean;
  candidateName?: string;
  role?: string;
  department?: string;
  currentStatus?: any;
}

export const ApprovalDecisionModal: React.FC<ApprovalDecisionModalProps> = ({
  approvalId,
  onClose,
  onSuccess,
  isOpen = true
}) => {
  if (isOpen === false) return null;

  const [data, setData] = useState<ApprovalDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de Ação
  const [mode, setMode] = useState<'view' | 'approve' | 'reject' | 'reopen'>('view');
  const [submitting, setSubmitting] = useState(false);

  // Formulário de Aprovação
  const [approveNotes, setApproveNotes] = useState('');

  // Formulário de Reprovação
  const [selectedReason, setSelectedReason] = useState<string>(REJECTION_REASONS_APPROVAL[0]);
  const [rejectDetails, setRejectDetails] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');

  // Formulário de Reabertura
  const [reopenReason, setReopenReason] = useState('');

  // Carrega os detalhes completos da aprovação
  React.useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const res = await safeFetchJson<ApprovalDetailResponse>(`/api/approvals/${approvalId}`);
        if (isMounted) {
          if (res) {
            setData(res);
          } else {
            setError('Não foi possível carregar os dados desta aprovação.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Erro ao carregar detalhes da aprovação.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [approvalId]);

  // Ação: Iniciar Análise Formal
  const handleStartReview = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const res = await safeFetchJson<any>(`/api/approvals/${approvalId}/start`, {
        method: 'POST'
      });
      if (res?.success) {
        // Recarrega detalhes
        const refreshed = await safeFetchJson<ApprovalDetailResponse>(`/api/approvals/${approvalId}`);
        if (refreshed) setData(refreshed);
      } else {
        throw new Error(res?.error || 'Erro ao iniciar análise.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao iniciar análise.');
    } finally {
      setSubmitting(false);
    }
  };

  // Ação: Confirmar Aprovação
  const handleConfirmApprove = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const res = await safeFetchJson<any>(`/api/approvals/${approvalId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: approveNotes.trim() || undefined })
      });
      if (res?.success) {
        onSuccess();
        onClose();
      } else {
        throw new Error(res?.error || 'Erro ao registrar aprovação.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar aprovação.');
    } finally {
      setSubmitting(false);
    }
  };

  // Ação: Confirmar Reprovação (Justificativa Obrigatória)
  const handleConfirmReject = async () => {
    const combinedReason = selectedReason === 'Outro'
      ? rejectDetails.trim()
      : `${selectedReason}${rejectDetails.trim() ? ` — ${rejectDetails.trim()}` : ''}`;

    if (!combinedReason || combinedReason.length < 5) {
      setError('A justificativa da reprovação é obrigatória e deve ter pelo menos 5 caracteres.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await safeFetchJson<any>(`/api/approvals/${approvalId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: combinedReason,
          notes: rejectNotes.trim() || undefined
        })
      });
      if (res?.success) {
        onSuccess();
        onClose();
      } else {
        throw new Error(res?.error || 'Erro ao registrar reprovação.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar reprovação.');
    } finally {
      setSubmitting(false);
    }
  };

  // Ação: Confirmar Reabertura
  const handleConfirmReopen = async () => {
    if (!reopenReason.trim() || reopenReason.trim().length < 5) {
      setError('O motivo da reabertura é obrigatório (mínimo de 5 caracteres).');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await safeFetchJson<any>(`/api/approvals/${approvalId}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reopenReason.trim() })
      });
      if (res?.success) {
        onSuccess();
        onClose();
      } else {
        throw new Error(res?.error || 'Erro ao reabrir aprovação.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao reabrir aprovação.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center space-y-3">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Carregando dados da aprovação...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Aprovação não encontrada</h3>
          <p className="text-sm text-slate-500">{error || 'Não foi possível localizar este registro no sistema.'}</p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const { approval, admission, employee, documents } = data;
  const requiredDocs = documents.filter(d => d.required);
  const approvedDocs = documents.filter(d => d.status === 'Aprovado');
  const rejectedDocs = documents.filter(d => d.status === 'Rejeitado');
  const pendingDocs = requiredDocs.filter(d => d.status !== 'Aprovado');

  const statusBadge = (st: string) => {
    switch (st) {
      case 'PENDENTE':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3.5 h-3.5" /> Pendente</span>;
      case 'EM_ANALISE':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"><Clock className="w-3.5 h-3.5" /> Em análise</span>;
      case 'APROVADA':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> Aprovada</span>;
      case 'REPROVADA':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"><XCircle className="w-3.5 h-3.5" /> Reprovada</span>;
      case 'CANCELADA':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">Cancelada</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{approval.title || 'Aprovação Interna'}</h2>
                {statusBadge(approval.status)}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Admissão ADM-{admission.id.slice(0, 6).toUpperCase()} • Responsável: <span className="font-semibold text-slate-700">{approval.responsibleRole}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem de Erro Geral */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Corpo com Scroll */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Card Resumo do Colaborador */}
          <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Colaborador</span>
                <span className="text-sm font-bold text-slate-900">{employee.name}</span>
                <span className="text-xs text-slate-500 ml-2 font-mono">{employee.cpfMasked || employee.cpf}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Previsão de Início</span>
                <span className="text-xs font-bold text-slate-800">
                  {employee.expectedStartDate
                    ? new Date(employee.expectedStartDate).toLocaleDateString('pt-BR')
                    : 'A definir'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium text-slate-700">{employee.role}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>{employee.department} {employee.unit ? `• ${employee.unit}` : ''}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-medium">
                  {approvedDocs.length} de {requiredDocs.length} docs aprovados
                </span>
              </div>
            </div>

            {rejectedDocs.length > 0 && (
              <div className="p-2.5 bg-rose-50/80 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700 font-medium">
                <FileWarning className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Há {rejectedDocs.length} documento(s) rejeitado(s) na admissão aguardando correção.</span>
              </div>
            )}
          </div>

          {/* Estado Atual da Decisão */}
          {approval.status === 'APROVADA' && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Admissão Aprovada Internamente</span>
              </div>
              <p className="text-xs text-emerald-700">
                Aprovada por <span className="font-semibold">{approval.decidedBy || 'Liderança'}</span> em{' '}
                {approval.decidedAt ? new Date(approval.decidedAt).toLocaleString('pt-BR') : 'data registrada'}.
              </p>
              {approval.decisionNotes && (
                <div className="mt-2 p-2.5 bg-white/80 rounded-lg border border-emerald-200/60 text-xs text-slate-700">
                  <span className="font-semibold text-emerald-800 block mb-0.5">Observações registradas:</span>
                  "{approval.decisionNotes}"
                </div>
              )}
            </div>
          )}

          {approval.status === 'REPROVADA' && (
            <div className="p-4 bg-rose-50/80 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Admissão Reprovada na Análise Interna</span>
                </div>
                {mode === 'view' && (
                  <button
                    onClick={() => setMode('reopen')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reabrir Aprovação
                  </button>
                )}
              </div>
              <p className="text-xs text-rose-700">
                Reprovada por <span className="font-semibold">{approval.decidedBy || 'Liderança'}</span> em{' '}
                {approval.decidedAt ? new Date(approval.decidedAt).toLocaleString('pt-BR') : 'data registrada'}.
              </p>
              <div className="mt-2 p-3 bg-white rounded-lg border border-rose-200 text-xs text-slate-700 space-y-1">
                <span className="font-semibold text-rose-800 block">Justificativa formal registrada:</span>
                <p className="text-slate-800 font-medium">"{approval.decisionReason || 'Sem justificativa detalhada'}"</p>
                {approval.decisionNotes && (
                  <p className="text-slate-500 text-[11px] pt-1 border-t border-slate-100">
                    Notas adicionais: {approval.decisionNotes}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Painel Interativo de Tomada de Decisão */}
          {approval.status !== 'APROVADA' && approval.status !== 'CANCELADA' && (
            <div className="space-y-4">
              {mode === 'view' && (
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Parecer Formal do Aprovador</h4>
                      <p className="text-xs text-slate-500">
                        {approval.status === 'PENDENTE'
                          ? 'A admissão está aguardando início de análise da gestão.'
                          : 'Admissão em análise. Registre seu parecer para liberar o processo.'}
                      </p>
                    </div>
                    {approval.status === 'PENDENTE' && (
                      <button
                        onClick={handleStartReview}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold rounded-lg transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5" /> Marcar "Em Análise"
                      </button>
                    )}
                  </div>

                  {/* Botões de Ação Principal */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => setMode('approve')}
                      className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm shadow-xs hover:shadow-md transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Aprovar Admissão
                    </button>

                    <button
                      onClick={() => setMode('reject')}
                      className="flex items-center justify-center gap-2 py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-semibold text-sm transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> Reprovar Admissão
                    </button>
                  </div>
                </div>
              )}

              {/* Formulário de Confirmação de Aprovação */}
              {mode === 'approve' && (
                <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Confirmar Aprovação da Admissão</span>
                    </div>
                    <button
                      onClick={() => setMode('view')}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                    >
                      Cancelar
                    </button>
                  </div>

                  <p className="text-xs text-slate-600">
                    Ao aprovar, você valida formalmente o ingresso do colaborador <strong>{employee.name}</strong> para o cargo de <strong>{employee.role}</strong>. A etapa de aprovação no processo admissional será concluída.
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Parecer / Observações Adicionais (Opcional)
                    </label>
                    <textarea
                      value={approveNotes}
                      onChange={(e) => setApproveNotes(e.target.value)}
                      placeholder="Ex: Candidato aprovado com parecer favorável da diretoria para início imediato."
                      rows={3}
                      className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setMode('view')}
                      disabled={submitting}
                      className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleConfirmApprove}
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                    >
                      {submitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Gravando aprovação...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirmar e Aprovar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Formulário de Confirmação de Reprovação (Com Justificativa Obrigatória) */}
              {mode === 'reject' && (
                <div className="p-4 bg-rose-50/40 rounded-xl border border-rose-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-rose-200/60 pb-2">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Registrar Reprovação da Admissão</span>
                    </div>
                    <button
                      onClick={() => setMode('view')}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                    >
                      Cancelar
                    </button>
                  </div>

                  <p className="text-xs text-slate-600">
                    A reprovação bloqueia o avanço da admissão para a etapa de conclusão e atualiza a situação para <strong>Pendência Crítica</strong>, exigindo regularização ou parecer corretivo.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Motivo Principal da Reprovação <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={selectedReason}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-rose-500 outline-hidden font-medium text-slate-800"
                      >
                        {REJECTION_REASONS_APPROVAL.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Detalhamento da Justificativa <span className="text-rose-500">* (Obrigatório)</span>
                      </label>
                      <textarea
                        value={rejectDetails}
                        onChange={(e) => setRejectDetails(e.target.value)}
                        placeholder="Descreva com clareza o motivo da reprovação e as ações necessárias pelo RH ou pelo candidato..."
                        rows={3}
                        className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-hidden bg-white"
                      />
                      <span className="text-[11px] text-slate-400">Mínimo de 5 caracteres. Ficará registrado na trilha de auditoria.</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Recomendações / Próximos Passos (Opcional)
                      </label>
                      <input
                        type="text"
                        value={rejectNotes}
                        onChange={(e) => setRejectNotes(e.target.value)}
                        placeholder="Ex: Solicitar novo documento de comprovante de residência atualizado."
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-hidden bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setMode('view')}
                      disabled={submitting}
                      className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleConfirmReject}
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                    >
                      {submitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Gravando reprovação...</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Confirmar Reprovação</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Formulário de Reabertura */}
              {mode === 'reopen' && (
                <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                      <RotateCcw className="w-4 h-4 text-amber-600" />
                      <span>Reabrir Aprovação para Nova Análise</span>
                    </div>
                    <button
                      onClick={() => setMode('view')}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                    >
                      Cancelar
                    </button>
                  </div>

                  <p className="text-xs text-slate-600">
                    A reabertura remove o status de reprovação, desfaz o bloqueio da etapa no processo e coloca a aprovação novamente em <strong>Em análise</strong>.
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Motivo da Reabertura <span className="text-amber-600">* (Obrigatório)</span>
                    </label>
                    <textarea
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      placeholder="Ex: Documentos corrigidos pelo candidato e conferidos pelo RH, reapresentando para deliberação da liderança."
                      rows={3}
                      className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setMode('view')}
                      disabled={submitting}
                      className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleConfirmReopen}
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                    >
                      {submitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Reabrindo...</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Confirmar Reabertura</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Linha do Tempo de Histórico da Aprovação */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span>Histórico de Deliberação</span>
            </div>

            {(!approval.history || approval.history.length === 0) ? (
              <p className="text-xs text-slate-400 italic">Nenhum evento registrado até o momento.</p>
            ) : (
              <div className="space-y-2.5">
                {approval.history.map((h, idx) => (
                  <div key={h.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          h.action === 'APROVADA' ? 'bg-emerald-500' :
                          h.action === 'REPROVADA' ? 'bg-rose-500' :
                          h.action === 'REABERTA' ? 'bg-amber-500' :
                          h.action === 'INICIADA' ? 'bg-blue-500' : 'bg-slate-400'
                        }`} />
                        {h.action}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(h.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-slate-600">
                      Registrado por: <strong className="text-slate-800">{h.userName}</strong>
                      {h.userRole ? ` (${h.userRole})` : ''}
                    </p>
                    {h.reason && (
                      <p className="text-slate-800 font-medium bg-white p-2 rounded-md border border-slate-200/60 mt-1">
                        Motivo: "{h.reason}"
                      </p>
                    )}
                    {h.notes && (
                      <p className="text-slate-500 text-[11px] italic mt-0.5">
                        Observação: "{h.notes}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">
            Rastreabilidade e auditoria ativas
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-xl transition-colors shadow-2xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
