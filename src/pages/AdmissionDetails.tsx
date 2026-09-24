import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  MessageCircle, 
  Copy, 
  Check, 
  MoreVertical, 
  XCircle, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Clock, 
  ExternalLink, 
  Shield, 
  History, 
  Eye, 
  User, 
  Building, 
  Calendar, 
  Phone, 
  Mail, 
  Send, 
  Ban, 
  RefreshCw, 
  AlertCircle,
  Briefcase,
  Layers,
  FileCheck2,
  X,
  UserCheck,
  ArrowUpRight,
  Smartphone,
  Edit3,
  Trash2,
  KeyRound,
  Search,
  Filter,
  Info,
  ArrowRight,
  MessageSquare,
  CalendarClock,
  ShieldCheck,
  RotateCcw,
  CheckSquare
} from 'lucide-react';
import { Admission, AdmissionDocument, AuditLog, CommunicationLog } from '../types/index.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { DocumentReviewModal } from '../components/DocumentReviewModal.tsx';
import { InviteModal } from '../components/InviteModal.tsx';
import { MobileSimulatorModal } from '../components/MobileSimulatorModal.tsx';
import { EditAdmissionModal } from '../components/EditAdmissionModal.tsx';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal.tsx';
import { ManageInviteModal } from '../components/ManageInviteModal.tsx';
import { CommunicationModal } from '../components/CommunicationModal.tsx';
import { AdmissionTimeline } from '../components/AdmissionTimeline.tsx';
import { AdmissionProcessStepper } from '../components/AdmissionProcessStepper.tsx';
import { AdmissionOperationalChecklistTab } from '../components/AdmissionOperationalChecklistTab.tsx';
import { AdmissionOperationalTasksTab } from '../components/AdmissionOperationalTasksTab.tsx';
import { ApprovalDecisionModal } from '../components/ApprovalDecisionModal.tsx';
import { UnifiedHistoryTimeline } from '../components/history/UnifiedHistoryTimeline.tsx';
import { AssignResponsibleModal } from '../components/AssignResponsibleModal.tsx';
import { maskCPF } from '../lib/cpf.ts';

type ActiveTab = 'resumo' | 'etapas' | 'aprovacao' | 'checklist' | 'tarefas' | 'dados' | 'documentos' | 'pendencias' | 'prazos' | 'historico' | 'convite';

export const AdmissionDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [admission, setAdmission] = useState<Admission | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('resumo');
  const [highlightedDocId, setHighlightedDocId] = useState<string | null>(null);

  // Lê parâmetros de URL vindos da Central de Pendências ou links diretos
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const docIdParam = searchParams.get('docId');

    if (tabParam && ['resumo', 'etapas', 'aprovacao', 'checklist', 'tarefas', 'tasks', 'dados', 'documentos', 'pendencias', 'prazos', 'acompanhamento', 'historico', 'convite'].includes(tabParam)) {
      if (tabParam === 'acompanhamento') {
        setActiveTab('prazos');
      } else if (tabParam === 'tasks') {
        setActiveTab('tarefas');
      } else {
        setActiveTab(tabParam as ActiveTab);
      }
    }
    if (docIdParam) {
      setHighlightedDocId(docIdParam);
    }
  }, [searchParams]);

  // Rola suavemente até o documento destacado
  useEffect(() => {
    if (highlightedDocId && activeTab === 'documentos' && !loading) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`doc-row-${highlightedDocId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [highlightedDocId, activeTab, loading]);

  // Modais de ação
  const [selectedDocForReview, setSelectedDocForReview] = useState<AdmissionDocument | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const [showResendModal, setShowResendModal] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // CRUD Modais: Editar Cadastro, Gerenciar Convite e Excluir
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isManageInviteModalOpen, setIsManageInviteModalOpen] = useState(false);
  const [showDeleteAdmissionModal, setShowDeleteAdmissionModal] = useState(false);
  const [isDeletingAdmission, setIsDeletingAdmission] = useState(false);

  // Menu "Mais ações"
  const [showMoreActions, setShowMoreActions] = useState(false);

  // Bloco 4.3: Modal de Comunicação com Funcionário
  const [isCommunicationModalOpen, setIsCommunicationModalOpen] = useState(false);
  const [communicationReason, setCommunicationReason] = useState<any>(undefined);
  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>([]);

  // Bloco 5.6: Modal de Decisão da Aprovação Interna
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  // Bloco 6.4: Modal de Atribuição de Responsável
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Feedback de link copiado
  const [copiedLink, setCopiedLink] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  // Filtros da aba de Documentos (Bloco 3.5)
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docStatusFilter, setDocStatusFilter] = useState<'todos' | 'aguardando' | 'Aprovado' | 'Rejeitado' | 'Não enviado'>('todos');
  const [docTypeFilter, setDocTypeFilter] = useState<'todos' | 'obrigatorios' | 'adicionais'>('todos');

  const fetchAdmission = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const userEmail = localStorage.getItem('user_email') || 'rh@empresa.com';
      const [resAdm, resLogs, resComms] = await Promise.all([
        fetch(`/api/admissions/${id}`),
        fetch(`/api/audit-logs?admissionId=${id}`),
        fetch(`/api/admissions/${id}/communications`, {
          headers: { 'x-user-email': userEmail }
        })
      ]);

      if (resAdm.ok) {
        const data = await resAdm.json();
        setAdmission(data);
      }
      if (resLogs.ok) {
        const logsData = await resLogs.json();
        setAuditLogs(logsData);
      }
      if (resComms.ok) {
        const commsData = await resComms.json();
        setCommunicationLogs(commsData.logs || []);
      }
    } catch (err) {
      console.error('Erro ao buscar admissão:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmission();
  }, [id]);

  const handleReviewSubmit = async (
    documentId: string, 
    decision: 'Aprovado' | 'Rejeitado', 
    reason?: string, 
    notes?: string,
    expectedVersion?: number
  ) => {
    const res = await fetch(`/api/documents/${documentId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        decision, 
        rejectionReason: reason, 
        rejectionNotes: notes,
        expectedVersion
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao avaliar documento.');
    }

    const data = await res.json();
    setAdmission(data.admission);

    // Se houver um documento aberto no modal, atualiza para o estado fresco
    if (selectedDocForReview && selectedDocForReview.id === documentId) {
      const updatedDoc = data.admission.documents.find((d: AdmissionDocument) => d.id === documentId);
      if (updatedDoc) {
        setSelectedDocForReview(updatedDoc);
      }
    }

    // Recarrega trilha de auditoria
    const resLogs = await fetch(`/api/audit-logs?admissionId=${id}`);
    if (resLogs.ok) {
      setAuditLogs(await resLogs.json());
    }
  };

  const handleCopyLink = () => {
    if (!admission) return;
    const url = `${window.location.origin}/convite/${admission.inviteToken}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCancelAdmission = async () => {
    if (!admission || !cancelReason.trim()) return;
    try {
      setIsCancelling(true);
      const res = await fetch(`/api/admissions/${admission.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Erro ao cancelar admissão.');
        return;
      }
      const data = await res.json();
      setAdmission(data.admission);
      setShowCancelModal(false);
      fetchAdmission();
    } catch (err) {
      console.error(err);
      alert('Erro ao cancelar admissão.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCompleteAdmission = async () => {
    if (!admission) return;
    try {
      setIsCompleting(true);
      const res = await fetch(`/api/admissions/${admission.id}/complete`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Erro ao concluir admissão.');
        return;
      }
      const data = await res.json();
      setAdmission(data.admission);
      setShowCompleteModal(false);
      fetchAdmission();
    } catch (err) {
      console.error(err);
      alert('Erro ao concluir admissão.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleResendInviteConfirm = async () => {
    if (!admission) return;
    try {
      setIsResending(true);
      const res = await fetch(`/api/admissions/${admission.id}/resend-invite`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Erro ao reenviar convite.');
        return;
      }
      const data = await res.json();
      setAdmission(data.admission);
      setShowResendModal(false);
      fetchAdmission();
      alert('Convite reenviado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao reenviar convite.');
    } finally {
      setIsResending(false);
    }
  };

  const handleDeleteAdmission = async () => {
    if (!admission) return;
    try {
      setIsDeletingAdmission(true);
      const res = await fetch(`/api/admissions/${admission.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir admissão.');
      }
      navigate('/admissoes');
    } catch (err: any) {
      alert(err.message || 'Falha ao excluir admissão.');
    } finally {
      setIsDeletingAdmission(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <Clock className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-600">Carregando detalhes da admissão...</p>
      </div>
    );
  }

  if (!admission) {
    return (
      <div className="py-20 text-center text-slate-500">
        <AlertCircle className="w-10 h-10 mx-auto mb-2 text-rose-500" />
        <p className="text-base font-bold text-slate-800">Admissão não encontrada</p>
        <button
          onClick={() => navigate('/admissoes')}
          className="mt-3 text-xs text-blue-600 hover:underline font-semibold"
        >
          Voltar para Lista de Admissões
        </button>
      </div>
    );
  }

  const inviteUrl = `${window.location.origin}/convite/${admission.inviteToken}`;
  const maskedToken = admission.inviteToken ? `${admission.inviteToken.slice(0, 7)}...${admission.inviteToken.slice(-4)}` : '';

  // Cálculos de documentos
  const requiredDocs = admission.documents.filter(d => d.required);
  const additionalDocs = admission.documents.filter(d => !d.required);
  const approvedDocs = requiredDocs.filter(d => d.status === 'Aprovado');
  const inReviewDocs = requiredDocs.filter(d => d.status === 'Em análise' || d.status === 'Reenviado');
  const rejectedDocs = requiredDocs.filter(d => d.status === 'Rejeitado');
  const notSentDocs = requiredDocs.filter(d => d.status === 'Não enviado');

  // Métricas completas para a conferência do checklist (Bloco 3.5)
  const allInReviewDocs = admission.documents.filter(d => d.status === 'Em análise' || d.status === 'Reenviado');
  const allApprovedDocs = admission.documents.filter(d => d.status === 'Aprovado');
  const allRejectedDocs = admission.documents.filter(d => d.status === 'Rejeitado');
  const allNotSentDocs = admission.documents.filter(d => d.status === 'Não enviado');
  const totalDocsCount = admission.documents.length;
  const progressPercent = requiredDocs.length > 0 ? Math.round((approvedDocs.length / requiredDocs.length) * 100) : 100;

  // Filtragem na aba de documentos
  const filterDoc = (doc: AdmissionDocument) => {
    if (docSearchQuery.trim()) {
      const q = docSearchQuery.toLowerCase();
      const matchName = doc.documentType.toLowerCase().includes(q);
      const matchCat = doc.category?.toLowerCase().includes(q);
      const matchFile = doc.fileName?.toLowerCase().includes(q);
      if (!matchName && !matchCat && !matchFile) return false;
    }
    if (docStatusFilter === 'aguardando') {
      return doc.status === 'Em análise' || doc.status === 'Reenviado';
    }
    if (docStatusFilter !== 'todos') {
      return doc.status === docStatusFilter;
    }
    return true;
  };

  const filteredRequiredDocs = requiredDocs.filter(filterDoc);
  const filteredAdditionalDocs = additionalDocs.filter(filterDoc);
  const hasActiveDocFilters = docSearchQuery.trim() !== '' || docStatusFilter !== 'todos' || docTypeFilter !== 'todos';

  // Pendências: documentos rejeitados, documentos obrigatórios ainda não enviados, ou solicitação de correção cadastral
  const pendingItems = [
    ...rejectedDocs.map(d => ({
      id: d.id,
      type: 'doc_rejected' as const,
      title: `${d.documentType} rejeitado`,
      reason: d.rejectionReason,
      notes: d.rejectionNotes,
      doc: d
    })),
    ...notSentDocs.map(d => ({
      id: d.id,
      type: 'doc_missing' as const,
      title: `${d.documentType} não enviado`,
      reason: 'Aguardando upload pelo colaborador',
      notes: undefined,
      doc: d
    })),
    ...(admission.correctionRequest && !admission.correctionRequest.resolved ? [{
      id: 'correction-req',
      type: 'correction' as const,
      title: 'Correção cadastral solicitada pelo colaborador',
      reason: admission.correctionRequest.details,
      notes: `Registrado em ${new Date(admission.correctionRequest.requestedAt).toLocaleString('pt-BR')}`,
      doc: undefined
    }] : [])
  ];

  const canComplete = requiredDocs.length > 0 && approvedDocs.length === requiredDocs.length && admission.status !== 'Concluída' && admission.status !== 'Cancelada';
  const isCancelled = admission.status === 'Cancelada';
  const isCompleted = admission.status === 'Concluída';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Barra de navegação superior */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <button
          onClick={() => navigate('/admissoes')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Admissões</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Ação CRUD: Editar Cadastro */}
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Editar informações cadastrais do funcionário"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
            <span>Editar Cadastro</span>
          </button>

          {/* Ação CRUD: Gerenciar Convite */}
          <button
            onClick={() => setIsManageInviteModalOpen(true)}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Gerenciar token, prorrogar ou revogar convite"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
            <span>Gerenciar Convite</span>
          </button>

          {/* Ação Bloco 4.3: Comunicar com Funcionário */}
          <button
            id="btn-comunicar-funcionario"
            onClick={() => {
              setCommunicationReason(undefined);
              setIsCommunicationModalOpen(true);
            }}
            disabled={isCancelled}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            title="Abrir Central de Notificações e Comunicação com o Funcionário"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Comunicar</span>
          </button>

          {/* Ação 1: Enviar convite novamente */}
          <button
            onClick={() => setShowResendModal(true)}
            disabled={isCancelled}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-emerald-600" />
            <span>Reenviar WhatsApp</span>
          </button>

          {/* Ação 2: Copiar link */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                <span className="text-emerald-700">Link copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copiar link</span>
              </>
            )}
          </button>

          {/* Simulador de Celular do Funcionário */}
          <button
            onClick={() => setShowSimulator(true)}
            className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-2 rounded-xl border border-blue-200 shadow-xs transition-colors cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Simulador Mobile</span>
          </button>

          {/* Visão do funcionário */}
          <a
            href={inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Visão do Colaborador</span>
          </a>

          {/* Ação 3: Dropdown Mais Ações */}
          <div className="relative">
            <button
              onClick={() => setShowMoreActions(!showMoreActions)}
              className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer"
              title="Mais ações"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMoreActions && (
              <div 
                className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-30 animate-in fade-in duration-100 text-xs"
                onMouseLeave={() => setShowMoreActions(false)}
              >
                {!isCompleted && !isCancelled && (
                  <button
                    onClick={() => { setShowMoreActions(false); setShowCompleteModal(true); }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 font-semibold text-emerald-700 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Concluir Admissão</span>
                  </button>
                )}

                <button
                  onClick={() => { setShowMoreActions(false); setIsEditModalOpen(true); }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 font-semibold text-slate-700 flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4 text-blue-600" />
                  <span>Editar Cadastro</span>
                </button>

                <button
                  onClick={() => { setShowMoreActions(false); setIsManageInviteModalOpen(true); }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 font-semibold text-slate-700 flex items-center gap-2"
                >
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <span>Gerenciar Convite</span>
                </button>

                {!isCancelled && (
                  <button
                    onClick={() => { setShowMoreActions(false); setShowCancelModal(true); }}
                    className="w-full text-left px-3.5 py-2 hover:bg-rose-50 font-semibold text-rose-700 flex items-center gap-2 border-t border-slate-100"
                  >
                    <Ban className="w-4 h-4 text-rose-600" />
                    <span>Cancelar Admissão</span>
                  </button>
                )}

                <button
                  onClick={() => { setShowMoreActions(false); setShowDeleteAdmissionModal(true); }}
                  className="w-full text-left px-3.5 py-2 hover:bg-rose-50 font-semibold text-rose-600 flex items-center gap-2 border-t border-slate-100"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Excluir Admissão</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerta de Admissão Cancelada se aplicável */}
      {isCancelled && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3 text-rose-900">
          <Ban className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800">
              Processo de Admissão Cancelado pelo RH
            </h3>
            <p className="text-xs mt-1 text-rose-950 font-medium">
              Motivo registrado: "{admission.cancellationReason || 'Cancelamento solicitado pelo RH'}"
            </p>
            <span className="text-[11px] text-rose-700 mt-1 block">
              Cancelado por {admission.cancelledBy || 'RH'} em {admission.cancelledAt ? new Date(admission.cancelledAt).toLocaleString('pt-BR') : 'Data não registrada'}
            </span>
          </div>
        </div>
      )}

      {/* Alerta de Aprovação Reprovada se aplicável */}
      {admission.approval?.status === 'REPROVADA' && !isCancelled && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900">
          <div className="flex items-start gap-3">
            <Ban className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                Aprovação Interna Reprovada / Devolvida
              </h3>
              <p className="text-xs text-rose-950 mt-0.5">
                Motivo: "{admission.approval.decisionReason || 'Sem justificativa informada'}"
              </p>
              <span className="text-[11px] text-rose-700 block mt-0.5">
                Por {admission.approval.decidedBy || 'Liderança'} em {admission.approval.decidedAt ? new Date(admission.approval.decidedAt).toLocaleString('pt-BR') : ''}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsApprovalModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reabrir ou Deliberar</span>
          </button>
        </div>
      )}

      {/* Alerta de Conclusão se 100% aprovado */}
      {canComplete && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Todos os documentos obrigatórios foram aprovados!
              </h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                Esta admissão está pronta para ser formalizada e concluída no sistema.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCompleteModal(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Concluir Admissão</span>
          </button>
        </div>
      )}

      {/* Cabeçalho da Admissão (Item 10) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <img
              src="/raitz-logo.jpg"
              alt="Logo Raitz"
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-2xl object-cover shadow-xs border border-slate-200 shrink-0"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {admission.employee.name}
                </h1>
                <StatusBadge status={admission.status} size="md" />
                <Link
                  to={`/funcionarios/${admission.employeeId || admission.employee?.id}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition"
                  title="Abrir ficha cadastral completa do funcionário"
                >
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  Ficha do Funcionário
                </Link>

                {/* Bloco 6.4: Responsável Operacional */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100/90 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-slate-500 font-normal">Responsável:</span>
                  <span className={admission.responsibleUserName ? 'text-slate-900 font-bold' : 'text-amber-700 font-bold'}>
                    {admission.responsibleUserName || 'Sem responsável'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(true)}
                    className="ml-1 text-[11px] text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                    title="Atribuir ou transferir responsável"
                  >
                    Alterar
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1 font-medium">
                <span className="text-slate-800 font-semibold">{admission.employee.role}</span>
                <span>•</span>
                <span>{admission.employee.department}</span>
                <span>•</span>
                <span>{admission.employee.unit}</span>
                <span>•</span>
                <span>Início previsto: <strong>{new Date(admission.employee.expectedStartDate + 'T00:00:00').toLocaleDateString('pt-BR')}</strong></span>
              </div>
            </div>
          </div>

          {/* Barra de Progresso do Checklist */}
          <div className="w-full lg:w-72 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>Progresso dos Obrigatórios</span>
              <span className="text-blue-600 font-bold text-sm">{admission.progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  admission.progressPercent === 100 
                    ? 'bg-emerald-500' 
                    : admission.status === 'Pendência'
                    ? 'bg-rose-500'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${admission.progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              {admission.approvedDocuments} de {admission.totalDocuments} obrigatórios aprovados
            </p>
          </div>
        </div>

        {/* Linha de navegação em Abas (Item 11) */}
        <div className="flex items-center gap-1 overflow-x-auto pt-4 border-t border-slate-100/60 scrollbar-none text-xs font-semibold">
          <button
            onClick={() => setActiveTab('resumo')}
            className={`px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'resumo'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Resumo
          </button>

          <button
            onClick={() => setActiveTab('etapas')}
            className={`px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'etapas'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>Etapas do Processo</span>
            {admission.processSteps && admission.processSteps.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'etapas' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
              }`}>
                {admission.processSteps.filter(s => s.status === 'CONCLUIDA').length}/{admission.processSteps.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('aprovacao')}
            className={`px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'aprovacao'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Aprovação Interna</span>
            {admission.approval && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                admission.approval.status === 'APROVADA'
                  ? (activeTab === 'aprovacao' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800')
                  : admission.approval.status === 'REPROVADA'
                  ? (activeTab === 'aprovacao' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800')
                  : admission.approval.status === 'EM_ANALISE'
                  ? (activeTab === 'aprovacao' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800')
                  : (activeTab === 'aprovacao' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800')
              }`}>
                {admission.approval.status === 'APROVADA' ? 'Aprovada' :
                 admission.approval.status === 'REPROVADA' ? 'Reprovada' :
                 admission.approval.status === 'EM_ANALISE' ? 'Em análise' : 'Pendente'}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'checklist'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>Checklist Operacional</span>
            {admission.operationalPriority === 'CRITICA' && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Prioridade Crítica" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('tarefas')}
            className={`px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'tarefas'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Tarefas</span>
          </button>

          <button
            onClick={() => setActiveTab('dados')}
            className={`px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'dados'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Dados pessoais
          </button>

          <button
            onClick={() => setActiveTab('documentos')}
            className={`px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'documentos'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>Documentos</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              activeTab === 'documentos' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {admission.documents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pendencias')}
            className={`px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pendencias'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>Pendências</span>
            {pendingItems.length > 0 ? (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                {pendingItems.length}
              </span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('prazos')}
            className={`px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'prazos'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Prazos & Linha do Tempo</span>
          </button>

          <button
            onClick={() => setActiveTab('historico')}
            className={`px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'historico'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Histórico</span>
          </button>

          <button
            onClick={() => setActiveTab('convite')}
            className={`px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'convite'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Convite</span>
          </button>
        </div>
      </div>

      {/* CONTEÚDO DAS ABAS */}

      {/* ABA 1: RESUMO (Item 12) */}
      {activeTab === 'resumo' && (
        <div className="space-y-6">
          {/* Cards de métricas com navegação nas abas */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div 
              onClick={() => setActiveTab('resumo')}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group relative flex flex-col justify-between"
              title="Acessar aba Resumo"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Progresso</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors" />
              </div>
              <div className="text-xl font-bold text-blue-600 mt-1">{admission.progressPercent}%</div>
              <span className="text-[11px] text-slate-500">dos obrigatórios</span>
            </div>

            <div 
              onClick={() => setActiveTab('documentos')}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group relative flex flex-col justify-between"
              title="Acessar aba Documentos Obrigatórios"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Obrigatórios</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors" />
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">{admission.approvedDocuments}/{admission.totalDocuments}</div>
              <span className="text-[11px] text-slate-500">aprovados</span>
            </div>

            <div 
              onClick={() => setActiveTab('documentos')}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-amber-300 hover:shadow-md transition-all group relative flex flex-col justify-between"
              title="Acessar aba Documentos em Análise"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Em Análise</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-600 transition-colors" />
              </div>
              <div className="text-xl font-bold text-amber-600 mt-1">{inReviewDocs.length}</div>
              <span className="text-[11px] text-slate-500">aguardando RH</span>
            </div>

            <div 
              onClick={() => setActiveTab('pendencias')}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-rose-300 hover:shadow-md transition-all group relative flex flex-col justify-between"
              title="Acessar aba Pendências (Documentos Rejeitados)"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Rejeitados</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-rose-600 transition-colors" />
              </div>
              <div className="text-xl font-bold text-rose-600 mt-1">{rejectedDocs.length}</div>
              <span className="text-[11px] text-slate-500">com pendência</span>
            </div>

            <div 
              onClick={() => setActiveTab('pendencias')}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-rose-300 hover:shadow-md transition-all group relative flex flex-col justify-between"
              title="Acessar aba Pendências Gerais"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Pendências</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-rose-600 transition-colors" />
              </div>
              <div className={`text-xl font-bold mt-1 ${pendingItems.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {pendingItems.length}
              </div>
              <span className="text-[11px] text-slate-500">{pendingItems.length > 0 ? 'ações necessárias' : 'tudo regular'}</span>
            </div>
          </div>

          {/* Processo Admissional Configurável (Bloco 5.4) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Processo Admissional (Snapshot Desta Admissão)</span>
              <button
                onClick={() => setActiveTab('etapas')}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Acessar Gestão Completa de Etapas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <AdmissionProcessStepper 
              admission={admission} 
              onUpdate={setAdmission} 
              compact={true} 
            />
          </div>
        </div>
      )}

      {/* ABA: ETAPAS DO PROCESSO (BLOCO 5.4) */}
      {activeTab === 'etapas' && (
        <AdmissionProcessStepper 
          admission={admission} 
          onUpdate={setAdmission} 
          compact={false} 
        />
      )}

      {/* ABA: CHECKLIST OPERACIONAL (BLOCO 5.5) */}
      {activeTab === 'checklist' && (
        <AdmissionOperationalChecklistTab
          admission={admission}
          onUpdateAdmission={setAdmission}
          onNavigateTab={(tab, docId) => {
            if (['resumo', 'etapas', 'aprovacao', 'checklist', 'tarefas', 'dados', 'documentos', 'pendencias', 'prazos', 'historico', 'convite'].includes(tab)) {
              setActiveTab(tab as ActiveTab);
              if (docId) setHighlightedDocId(docId);
            }
          }}
        />
      )}

      {/* ABA: TAREFAS OPERACIONAIS */}
      {activeTab === 'tarefas' && (
        <AdmissionOperationalTasksTab
          admission={admission}
          onRefreshAdmission={fetchAdmission}
        />
      )}

      {/* ABA 2: DADOS PESSOAIS (Item 13) */}
      {activeTab === 'dados' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Dados Cadastrais do Colaborador</h2>
              <p className="text-xs text-slate-500">
                Informações fornecidas pelo RH e conferidas pelo funcionário através do portal.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-xl border border-blue-200 transition-colors"
                title="Editar informações cadastrais"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Dados</span>
              </button>

              {admission.dataConfirmed ? (
                <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Dados confirmados</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Aguardando confirmação</span>
                </span>
              )}
            </div>
          </div>

          {/* Alerta caso haja solicitação de alteração cadastral */}
          {admission.correctionRequest && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-950 space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Solicitação de correção cadastral apontada pelo colaborador</span>
              </div>
              <p className="pl-6 font-medium">"{admission.correctionRequest.details}"</p>
              <p className="pl-6 text-[11px] text-amber-700">
                Registrado em {new Date(admission.correctionRequest.requestedAt).toLocaleString('pt-BR')}
              </p>
            </div>
          )}

          {/* Grade de Dados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Nome Completo</span>
              <p className="font-bold text-slate-900 text-sm">{admission.employee.name}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">CPF (Protegido LGPD)</span>
              <p className="font-bold text-slate-900 font-mono text-sm">{maskCPF(admission.employee.cpf)}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Data de Nascimento</span>
              <p className="font-bold text-slate-900 text-sm">
                {new Date(admission.employee.birthDate + 'T00:00:00').toLocaleDateString('pt-BR')}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Telefone / WhatsApp</span>
              <p className="font-bold text-slate-900 text-sm">{admission.employee.phone}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">E-mail</span>
              <p className="font-bold text-slate-900 text-sm truncate">{admission.employee.email}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Cargo Contratado</span>
              <p className="font-bold text-slate-900 text-sm">{admission.employee.role}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Setor / Departamento</span>
              <p className="font-bold text-slate-900 text-sm">{admission.employee.department}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Unidade / Filial</span>
              <p className="font-bold text-slate-900 text-sm">{admission.employee.unit}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Data Prevista de Início</span>
              <p className="font-bold text-slate-900 text-sm">
                {new Date(admission.employee.expectedStartDate + 'T00:00:00').toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>
              Consentimento LGPD para tratamento dos dados: <strong>{admission.consentGiven ? 'Concedido' : 'Pendente'}</strong>
              {admission.consentDate && ` em ${new Date(admission.consentDate).toLocaleDateString('pt-BR')}`}
            </span>
          </div>
        </div>
      )}

      {/* ABA 3: DOCUMENTOS - CONFERÊNCIA DO CHECKLIST (Bloco 3.5) */}
      {activeTab === 'documentos' && (
        <div className="space-y-6">
          {/* Header de Progresso e Métricas da Conferência */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-blue-600" />
                  <span>Conferência do Checklist de Documentos</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Valide ou aponte pendências nos documentos enviados pelo colaborador.
                </p>
              </div>

              {/* Status geral de conclusão */}
              <div className="flex items-center gap-2 text-xs font-semibold">
                {canComplete ? (
                  <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Checklist 100% Aprovado</span>
                  </span>
                ) : allInReviewDocs.length > 0 ? (
                  <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>{allInReviewDocs.length} aguardando conferência do RH</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{approvedDocs.length} de {requiredDocs.length} obrigatórios aprovados</span>
                  </span>
                )}
              </div>
            </div>

            {/* Barra de Progresso dos Obrigatórios */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-600">Progresso dos Documentos Obrigatórios</span>
                <span className="font-bold text-slate-900">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Cards de Métricas da Conferência */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 pt-1">
              <button 
                type="button"
                onClick={() => { setDocStatusFilter('todos'); setDocTypeFilter('todos'); }}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  docStatusFilter === 'todos' && docTypeFilter === 'todos'
                    ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                }`}
              >
                <div className="text-[11px] font-medium text-slate-500">Total</div>
                <div className="text-xl font-extrabold text-slate-900 mt-0.5">{totalDocsCount}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{requiredDocs.length} obrigatórios</div>
              </button>

              <button 
                type="button"
                onClick={() => setDocStatusFilter('aguardando')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  docStatusFilter === 'aguardando'
                    ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                }`}
              >
                <div className="text-[11px] font-medium text-amber-700 flex items-center justify-between">
                  <span>Conferir</span>
                  {allInReviewDocs.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </div>
                <div className="text-xl font-extrabold text-amber-900 mt-0.5">{allInReviewDocs.length}</div>
                <div className="text-[10px] text-amber-700/80 mt-0.5">Em análise / Reenviados</div>
              </button>

              <button 
                type="button"
                onClick={() => setDocStatusFilter('Aprovado')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  docStatusFilter === 'Aprovado'
                    ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                }`}
              >
                <div className="text-[11px] font-medium text-emerald-700">Aprovados</div>
                <div className="text-xl font-extrabold text-emerald-900 mt-0.5">{allApprovedDocs.length}</div>
                <div className="text-[10px] text-emerald-700/80 mt-0.5">{approvedDocs.length} obrigatórios</div>
              </button>

              <button 
                type="button"
                onClick={() => setDocStatusFilter('Rejeitado')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  docStatusFilter === 'Rejeitado'
                    ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                }`}
              >
                <div className="text-[11px] font-medium text-rose-700">Rejeitados</div>
                <div className="text-xl font-extrabold text-rose-900 mt-0.5">{allRejectedDocs.length}</div>
                <div className="text-[10px] text-rose-700/80 mt-0.5">Com pendências</div>
              </button>

              <button 
                type="button"
                onClick={() => setDocStatusFilter('Não enviado')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  docStatusFilter === 'Não enviado'
                    ? 'bg-slate-200/70 border-slate-400 ring-2 ring-slate-500/20'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                }`}
              >
                <div className="text-[11px] font-medium text-slate-500">Não enviados</div>
                <div className="text-xl font-extrabold text-slate-700 mt-0.5">{allNotSentDocs.length}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Aguardando candidato</div>
              </button>
            </div>
          </div>

          {/* Barra de Filtros e Busca */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  placeholder="Buscar documento por nome, categoria ou arquivo..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={docTypeFilter}
                  onChange={(e) => setDocTypeFilter(e.target.value as any)}
                  className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="todos">Todos os Tipos ({totalDocsCount})</option>
                  <option value="obrigatorios">Somente Obrigatórios ({requiredDocs.length})</option>
                  <option value="adicionais">Somente Adicionais ({additionalDocs.length})</option>
                </select>

                {hasActiveDocFilters && (
                  <button
                    onClick={() => {
                      setDocSearchQuery('');
                      setDocStatusFilter('todos');
                      setDocTypeFilter('todos');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
            </div>

            {/* Chips de filtro rápido por status */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Status:</span>
              <button
                type="button"
                onClick={() => setDocStatusFilter('todos')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  docStatusFilter === 'todos'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({totalDocsCount})
              </button>
              <button
                type="button"
                onClick={() => setDocStatusFilter('aguardando')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  docStatusFilter === 'aguardando'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <span>Aguardando Conferência</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-bold">{allInReviewDocs.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setDocStatusFilter('Aprovado')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  docStatusFilter === 'Aprovado'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                Aprovados ({allApprovedDocs.length})
              </button>
              <button
                type="button"
                onClick={() => setDocStatusFilter('Rejeitado')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  docStatusFilter === 'Rejeitado'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                Rejeitados ({allRejectedDocs.length})
              </button>
              <button
                type="button"
                onClick={() => setDocStatusFilter('Não enviado')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  docStatusFilter === 'Não enviado'
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Não enviados ({allNotSentDocs.length})
              </button>
            </div>
          </div>

          {/* Empty state quando a filtragem não retorna itens */}
          {filteredRequiredDocs.length === 0 && filteredAdditionalDocs.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-800">Nenhum documento encontrado</p>
              <p className="text-xs text-slate-500 mt-1">
                Tente ajustar os termos de busca ou remover os filtros de status e tipo.
              </p>
              {hasActiveDocFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setDocSearchQuery('');
                    setDocStatusFilter('todos');
                    setDocTypeFilter('todos');
                  }}
                  className="mt-3 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Limpar todos os filtros
                </button>
              )}
            </div>
          )}

          {/* Seção 1: Documentos Obrigatórios */}
          {docTypeFilter !== 'adicionais' && filteredRequiredDocs.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Documentos Obrigatórios</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      ({filteredRequiredDocs.length} de {requiredDocs.length})
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Lista dos documentos indispensáveis para conclusão formal do processo.
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                  {approvedDocs.length} de {requiredDocs.length} aprovados
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredRequiredDocs.map((doc) => (
                  <div 
                    key={doc.id} 
                    id={`doc-row-${doc.id}`}
                    className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 rounded-xl ${
                      highlightedDocId === doc.id
                        ? 'bg-blue-50/90 ring-2 ring-blue-500 shadow-sm'
                        : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className={`p-2.5 rounded-xl border mt-0.5 shrink-0 ${
                        doc.status === 'Aprovado' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : doc.status === 'Rejeitado'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : doc.status === 'Não enviado'
                          ? 'bg-slate-50 text-slate-400 border-slate-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200 ring-2 ring-amber-400/20'
                      }`}>
                        {doc.status === 'Aprovado' ? (
                          <FileCheck2 className="w-5 h-5" />
                        ) : doc.status === 'Rejeitado' ? (
                          <AlertCircle className="w-5 h-5" />
                        ) : doc.status === 'Não enviado' ? (
                          <FileText className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{doc.documentType}</h3>
                          <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                            Obrigatório
                          </span>
                          {doc.category && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded">
                              {doc.category}
                            </span>
                          )}
                          <StatusBadge status={doc.status} size="sm" />
                        </div>

                        <div className="text-xs text-slate-500 space-y-1">
                          {doc.instructions && (
                            <p className="text-[11px] text-blue-800 bg-blue-50/80 border border-blue-100/60 px-2 py-0.5 rounded font-medium inline-block">
                              Instruções: {doc.instructions}
                            </p>
                          )}

                          {doc.fileName ? (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span>
                                Arquivo: <span className="font-mono text-slate-800 font-medium">{doc.fileName}</span>
                              </span>
                              {doc.currentVersion > 0 && (
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                                  Versão {doc.currentVersion}
                                </span>
                              )}
                              {doc.uploadedAt && (
                                <span className="text-[11px] text-slate-400">
                                  • Enviado em {new Date(doc.uploadedAt).toLocaleString('pt-BR')}
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-slate-400 italic">Nenhum arquivo enviado ainda pelo colaborador.</p>
                          )}

                          {(doc.allowed_file_types || doc.max_file_size_mb) && (
                            <p className="text-[10px] text-slate-400">
                              Formatos aceitos: {(doc.allowed_file_types || ['PDF', 'JPG', 'PNG']).join(', ')} • Limite: {doc.max_file_size_mb || 10}MB
                            </p>
                          )}

                          {doc.reviewedAt && (
                            <p className="text-[11px] text-slate-500">
                              Conferido por <strong>{doc.reviewedBy || 'RH'}</strong> em {new Date(doc.reviewedAt).toLocaleString('pt-BR')}
                            </p>
                          )}

                          {doc.status === 'Rejeitado' && doc.rejectionReason && (
                            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-0.5">
                              <p className="text-rose-900 font-bold text-[11px]">
                                Motivo da recusa: <span className="font-semibold text-rose-800">{doc.rejectionReason}</span>
                              </p>
                              {doc.rejectionNotes && (
                                <p className="text-[11px] text-rose-700 italic">
                                  Orientação enviada: "{doc.rejectionNotes}"
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {doc.currentVersion > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedDocForReview(doc)}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                            doc.status === 'Em análise' || doc.status === 'Reenviado'
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs ring-2 ring-blue-500/20'
                              : doc.status === 'Rejeitado'
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>
                            {doc.status === 'Em análise' || doc.status === 'Reenviado'
                              ? 'Conferir Documento'
                              : doc.status === 'Rejeitado'
                              ? 'Reavaliar Documento'
                              : 'Revisar / Ver Arquivo'}
                          </span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic px-2 py-1">
                          Aguardando envio
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seção 2: Documentos Adicionais */}
          {docTypeFilter !== 'obrigatorios' && filteredAdditionalDocs.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Documentos Adicionais</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      ({filteredAdditionalDocs.length} de {additionalDocs.length})
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Documentos complementares que não impedem a conclusão do processo.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredAdditionalDocs.map((doc) => (
                  <div 
                    key={doc.id} 
                    id={`doc-row-${doc.id}`}
                    className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 rounded-xl ${
                      highlightedDocId === doc.id
                        ? 'bg-blue-50/90 ring-2 ring-blue-500 shadow-sm'
                        : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className={`p-2.5 rounded-xl border mt-0.5 shrink-0 ${
                        doc.status === 'Aprovado' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : doc.status === 'Rejeitado'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : doc.status === 'Não enviado'
                          ? 'bg-slate-50 text-slate-400 border-slate-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {doc.status === 'Aprovado' ? (
                          <FileCheck2 className="w-5 h-5" />
                        ) : doc.status === 'Rejeitado' ? (
                          <AlertCircle className="w-5 h-5" />
                        ) : doc.status === 'Não enviado' ? (
                          <FileText className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{doc.documentType}</h3>
                          <span className="text-[10px] bg-slate-100 text-slate-500 font-medium px-1.5 py-0.5 rounded">
                            Opcional
                          </span>
                          {doc.category && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded">
                              {doc.category}
                            </span>
                          )}
                          <StatusBadge status={doc.status} size="sm" />
                        </div>

                        <div className="text-xs text-slate-500 space-y-1">
                          {doc.instructions && (
                            <p className="text-[11px] text-blue-800 bg-blue-50/80 border border-blue-100/60 px-2 py-0.5 rounded font-medium inline-block">
                              Instruções: {doc.instructions}
                            </p>
                          )}

                          {doc.fileName ? (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span>Arquivo: <span className="font-mono text-slate-800 font-medium">{doc.fileName}</span></span>
                              {doc.currentVersion > 0 && (
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                                  Versão {doc.currentVersion}
                                </span>
                              )}
                              {doc.uploadedAt && (
                                <span className="text-[11px] text-slate-400">
                                  • Enviado em {new Date(doc.uploadedAt).toLocaleString('pt-BR')}
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-slate-400 italic">Não enviado.</p>
                          )}

                          {(doc.allowed_file_types || doc.max_file_size_mb) && (
                            <p className="text-[10px] text-slate-400">
                              Formatos aceitos: {(doc.allowed_file_types || ['PDF', 'JPG', 'PNG']).join(', ')} • Limite: {doc.max_file_size_mb || 10}MB
                            </p>
                          )}

                          {doc.reviewedAt && (
                            <p className="text-[11px] text-slate-500">
                              Conferido por <strong>{doc.reviewedBy || 'RH'}</strong> em {new Date(doc.reviewedAt).toLocaleString('pt-BR')}
                            </p>
                          )}

                          {doc.status === 'Rejeitado' && doc.rejectionReason && (
                            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-0.5">
                              <p className="text-rose-900 font-bold text-[11px]">
                                Motivo da recusa: <span className="font-semibold text-rose-800">{doc.rejectionReason}</span>
                              </p>
                              {doc.rejectionNotes && (
                                <p className="text-[11px] text-rose-700 italic">
                                  Orientação enviada: "{doc.rejectionNotes}"
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {doc.currentVersion > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedDocForReview(doc)}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                            doc.status === 'Em análise' || doc.status === 'Reenviado'
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Conferir</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic px-2 py-1">
                          Não enviado
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 4: PENDÊNCIAS (Itens 24 e 25) */}
      {activeTab === 'pendencias' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Pendências da Admissão</h2>
              <p className="text-xs text-slate-500">
                Lista focada exclusivamente nos itens que necessitam de ação para viabilizar a conclusão.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold">
              {pendingItems.length > 0 ? (
                <span className="flex items-center gap-1.5 text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                  <span>{pendingItems.length} pendência(s) pendente(s)</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Nenhuma pendência</span>
                </span>
              )}
            </div>
          </div>

          {pendingItems.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">Tudo pronto e sem pendências!</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Todos os documentos obrigatórios foram aprovados pela equipe de RH e os dados cadastrais estão conferidos.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingItems.map((item) => (
                <div 
                  key={item.id}
                  className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0 mt-0.5">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-rose-950">{item.title}</h4>
                      <p className="text-xs text-rose-800 mt-0.5">{item.reason}</p>
                      {item.notes && (
                        <p className="text-[11px] text-rose-700 mt-0.5 italic">
                          Orientação enviada: "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        setCommunicationReason({
                          type: item.type === 'doc_rejected' ? 'document_rejected' : 'documents_pending',
                          label: item.title,
                          documentId: item.doc?.id,
                          documentName: item.doc?.documentType,
                          rejectionReason: item.reason,
                          priority: item.type === 'doc_rejected' ? 'Alta' : 'Média'
                        });
                        setIsCommunicationModalOpen(true);
                      }}
                      className="text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                      title="Comunicar funcionário sobre esta pendência"
                    >
                      <Send className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Notificar</span>
                    </button>

                    {item.doc && item.doc.currentVersion > 0 && (
                      <button
                        onClick={() => setSelectedDocForReview(item.doc!)}
                        className="text-xs font-semibold bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Ver documento
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA: PRAZOS & LINHA DO TEMPO (Bloco 4.4) */}
      {activeTab === 'prazos' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <AdmissionTimeline admissionId={admission.id} />
        </div>
      )}

      {/* ABA 5: HISTÓRICO COMPLETO (Bloco 5.7) */}
      {activeTab === 'historico' && (
        <div className="space-y-4">
          <UnifiedHistoryTimeline
            logs={auditLogs}
            title={`Histórico da Admissão — ${admission.employee.name}`}
            subtitle="Trilha completa e imutável de auditoria com todas as ações, envios e versões de documentos, análises, aprovações, pendências e alterações ocorridas nesta admissão."
            emptyMessage="Nenhum evento de histórico registrado ainda para esta admissão."
            contextFilterLabel="da admissão"
            showExport={true}
            onRefresh={fetchAdmission}
            isLoading={loading}
          />
        </div>
      )}

      {/* ABA 6: CONVITE (Itens 27 e 28) */}
      {activeTab === 'convite' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Informações do Convite Individual</h2>
            <p className="text-xs text-slate-500">
              Controle de envio, monitoramento de acessos e segurança do link do colaborador.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-400 font-semibold block text-[11px]">Status do Convite</span>
              <span className="font-bold text-slate-900">
                {(admission.inviteAccessCount || 0) > 0 
                  ? 'Acessado pelo colaborador' 
                  : admission.inviteSentViaWhatsApp 
                  ? 'Enviado (Aguardando acesso)' 
                  : 'Criado (Não enviado)'}
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-400 font-semibold block text-[11px]">Data de Criação</span>
              <span className="font-bold text-slate-900">
                {new Date(admission.createdAt).toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-400 font-semibold block text-[11px]">Último Envio</span>
              <span className="font-bold text-slate-900">
                {admission.inviteLastSentAt || admission.inviteSentAt
                  ? new Date(admission.inviteLastSentAt || admission.inviteSentAt!).toLocaleString('pt-BR')
                  : 'Nenhum envio registrado'}
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-400 font-semibold block text-[11px]">Acessos Registrados</span>
              <span className="font-bold text-blue-600 text-sm">
                {admission.inviteAccessCount || 0} acesso(s)
              </span>
              {admission.inviteLastAccessedAt && (
                <span className="text-[10px] text-slate-400 block">
                  Último: {new Date(admission.inviteLastAccessedAt).toLocaleString('pt-BR')}
                </span>
              )}
            </div>
          </div>

          {/* Segurança do Token mascarado */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Token Secreto Mascarado (LGPD)
                </span>
                <span className="font-mono text-xs font-bold text-slate-800">
                  {maskedToken}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setIsManageInviteModalOpen(true)}
                  className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Gerenciar Token & Validade</span>
                </button>

                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
                </button>

                <button
                  onClick={() => setShowSimulator(true)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Testar no Simulador</span>
                </button>

                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Enviar por WhatsApp</span>
                </button>
              </div>
            </div>

            {admission.inviteRevoked && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-semibold">
                <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Este convite foi REVOGADO pelo RH. O colaborador não consegue acessar o portal por este link.</span>
              </div>
            )}

            <p className="text-[11px] text-slate-400">
              O link contém um token de segurança de alta entropia exclusivo para {admission.employee.name}.
            </p>
          </div>

          {/* Histórico de Comunicações (Bloco 4.3) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Histórico de Comunicações Enviadas</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Registros auditáveis de notificações, lembretes e avisos enviados para este candidato.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCommunicationReason(undefined);
                  setIsCommunicationModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-emerald-600" />
                <span>Nova Notificação</span>
              </button>
            </div>

            {communicationLogs.length === 0 ? (
              <div className="py-6 text-center text-slate-400">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-slate-600">Nenhuma comunicação registrada ainda</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Envie lembretes ou avisos sobre pendências para manter o candidato informado.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {communicationLogs.map((log) => (
                  <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 capitalize">
                          {log.communicationType.replace('_', ' ')}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {log.channel === 'whatsapp' ? 'WhatsApp' : 'Link/Texto copiado'}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          por {log.userName}
                        </span>
                      </div>
                      <p className="text-slate-600 text-xs font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap max-w-2xl">
                        {log.messagePreview}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-mono text-slate-400 block">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </span>
                      <span className="text-[10px] font-medium text-emerald-600 mt-0.5 block">
                        {log.actionStatusLabel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA: APROVAÇÃO INTERNA (Bloco 5.6) */}
      {activeTab === 'aprovacao' && admission && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      {admission.approval?.title || 'Aprovação Interna'}
                    </h3>
                    {admission.approval && (
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        admission.approval.status === 'APROVADA'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : admission.approval.status === 'REPROVADA'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : admission.approval.status === 'EM_ANALISE'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {admission.approval.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Papel responsável: <strong className="text-slate-700">{admission.approval?.responsibleRole || 'RH / Gestor'}</strong>
                  </p>
                </div>
              </div>

              {admission.approval && admission.approval.status !== 'CANCELADA' && (
                <button
                  onClick={() => setIsApprovalModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {admission.approval.status === 'APROVADA'
                      ? 'Ver Parecer Formal'
                      : admission.approval.status === 'REPROVADA'
                      ? 'Reavaliar / Reabrir'
                      : 'Deliberar Aprovação'}
                  </span>
                </button>
              )}
            </div>

            {/* Detalhes do Parecer Concedido ou Reprovado */}
            {admission.approval?.status === 'APROVADA' && (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Aprovação Formal Concedida com Sucesso</span>
                </div>
                <p className="text-emerald-700">
                  Deliberada por <strong className="text-emerald-950">{admission.approval.decidedBy || 'Liderança'}</strong> em{' '}
                  {admission.approval.decidedAt ? new Date(admission.approval.decidedAt).toLocaleString('pt-BR') : 'Data registrada'}.
                </p>
                {admission.approval.decisionNotes && (
                  <div className="mt-2 p-3 bg-white rounded-lg border border-emerald-200/60 text-slate-700">
                    <span className="font-semibold text-emerald-800 block mb-1">Notas / Parecer:</span>
                    "{admission.approval.decisionNotes}"
                  </div>
                )}
              </div>
            )}

            {admission.approval?.status === 'REPROVADA' && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-800 font-bold">
                    <Ban className="w-4 h-4 text-rose-600" />
                    <span>Admissão Reprovada na Análise Interna</span>
                  </div>
                  <button
                    onClick={() => setIsApprovalModalOpen(true)}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-rose-300 text-rose-700 font-semibold rounded-lg hover:bg-rose-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reabrir Aprovação
                  </button>
                </div>
                <p className="text-rose-700">
                  Reprovada por <strong className="text-rose-950">{admission.approval.decidedBy || 'Liderança'}</strong> em{' '}
                  {admission.approval.decidedAt ? new Date(admission.approval.decidedAt).toLocaleString('pt-BR') : 'Data registrada'}.
                </p>
                <div className="p-3 bg-white rounded-lg border border-rose-200 text-slate-800 space-y-1">
                  <span className="font-semibold text-rose-800 block">Justificativa:</span>
                  <p className="font-medium">"{admission.approval.decisionReason || 'Sem justificativa detalhada'}"</p>
                  {admission.approval.decisionNotes && (
                    <p className="text-slate-500 text-[11px] pt-1 border-t border-slate-100">
                      Notas adicionais: {admission.approval.decisionNotes}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Trilha de Auditoria da Aprovação */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-slate-400" />
                <span>Trilha de Auditoria da Aprovação</span>
              </h4>

              {(!admission.approval?.history || admission.approval.history.length === 0) ? (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 italic">
                  Nenhum evento registrado nesta aprovação até o momento.
                </div>
              ) : (
                <div className="space-y-2">
                  {admission.approval.history.map((h, i) => (
                    <div key={h.id || i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
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
        </div>
      )}

      {/* Modal de Conferência de Documento */}
      <DocumentReviewModal
        document={selectedDocForReview}
        admission={admission}
        isOpen={!!selectedDocForReview}
        onClose={() => setSelectedDocForReview(null)}
        onReviewSubmit={handleReviewSubmit}
      />

      {/* Modal de Convite WhatsApp */}
      <InviteModal
        admission={admission}
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />

      {/* Modal de Gerenciamento do Convite (CRUD Convite: Regenerar / Revogar / Prorrogar) */}
      {isManageInviteModalOpen && (
        <ManageInviteModal
          admission={admission}
          isOpen={isManageInviteModalOpen}
          onClose={() => setIsManageInviteModalOpen(false)}
          onUpdate={(updated) => {
            setAdmission(updated);
            fetchAdmission();
          }}
        />
      )}

      {/* Modal de Edição de Cadastro (CRUD Cadastro: Update) */}
      {isEditModalOpen && (
        <EditAdmissionModal
          admission={admission}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={(updated) => {
            setAdmission(updated);
            fetchAdmission();
          }}
        />
      )}

      {/* Modal de Exclusão de Admissão (CRUD Cadastro: Delete) */}
      {showDeleteAdmissionModal && (
        <DeleteConfirmModal
          isOpen={showDeleteAdmissionModal}
          title="Excluir Admissão Permanentemente"
          description={`Tem certeza que deseja excluir o cadastro e todo o processo admissional de "${admission.employee.name}"? Todos os documentos anexados e registros de auditoria serão removidos.`}
          itemName={admission.employee.name}
          confirmLabel="Sim, Excluir Admissão"
          isDeleting={isDeletingAdmission}
          onClose={() => setShowDeleteAdmissionModal(false)}
          onConfirm={handleDeleteAdmission}
        />
      )}

      {/* Simulador Mobile */}
      <MobileSimulatorModal
        admission={admission}
        isOpen={showSimulator}
        onClose={() => setShowSimulator(false)}
      />

      {/* Modal de Confirmação de Reenvio de Convite */}
      {showResendModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Reenviar Convite ao Colaborador</h3>
              <button onClick={() => setShowResendModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Deseja reenviar o convite de acesso para <strong>{admission.employee.name}</strong>?
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500">Telefone:</span>
                <span className="font-semibold text-slate-800">{admission.employee.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">E-mail:</span>
                <span className="font-semibold text-slate-800">{admission.employee.email}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResendModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isResending}
                onClick={handleResendInviteConfirm}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isResending ? 'Reenviando...' : 'Confirmar Reenvio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Conclusão da Admissão (Itens 30 e 31) */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Concluir Processo Admissional</span>
              </div>
              <button onClick={() => setShowCompleteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!canComplete ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-1">
                <p className="font-bold">Esta admissão ainda possui pendências e não pode ser concluída.</p>
                <p className="text-[11px] text-amber-800">
                  Certifique-se de que todos os {requiredDocs.length} documentos obrigatórios estejam marcados como APROVADOS antes de concluir.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 leading-relaxed">
                Confirma a conclusão formal da admissão de <strong>{admission.employee.name}</strong>?
                Todos os documentos obrigatórios foram conferidos e aprovados. A conclusão ficará gravada no histórico de auditoria.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Voltar
              </button>
              {canComplete && (
                <button
                  type="button"
                  disabled={isCompleting}
                  onClick={handleCompleteAdmission}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isCompleting ? 'Concluindo...' : 'Confirmar Conclusão'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cancelamento da Admissão (Item 29) */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between text-rose-700">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Ban className="w-5 h-5" />
                <span>Cancelar Admissão</span>
              </div>
              <button onClick={() => setShowCancelModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Tem certeza que deseja cancelar esta admissão? O link do colaborador será desativado e o status será alterado para <strong>CANCELADA</strong>.
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Motivo do cancelamento (obrigatório):
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Desistência da vaga pelo candidato / Vaga congelada pela diretoria..."
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={isCancelling || !cancelReason.trim()}
                onClick={handleCancelAdmission}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isCancelling ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Comunicação com Funcionário (Bloco 4.3) */}
      {admission && (
        <CommunicationModal
          isOpen={isCommunicationModalOpen}
          onClose={() => setIsCommunicationModalOpen(false)}
          admissionId={admission.id}
          admissionCode={admission.id.slice(0, 8).toUpperCase()}
          employeeId={admission.employeeId}
          employeeName={admission.employee.name}
          employeePhone={admission.employee.phone}
          expectedStartDate={admission.employee.expectedStartDate}
          inviteToken={admission.inviteToken}
          isInviteValid={!admission.inviteRevoked}
          initialReason={communicationReason}
          onSuccess={() => {
            fetchAdmission();
          }}
        />
      )}

      {/* Modal de Decisão da Aprovação Interna (Bloco 5.6) */}
      {isApprovalModalOpen && admission && admission.approval && (
        <ApprovalDecisionModal
          isOpen={isApprovalModalOpen}
          onClose={() => setIsApprovalModalOpen(false)}
          approvalId={admission.approval.id}
          candidateName={admission.employee.name}
          role={admission.employee.role}
          department={admission.employee.department}
          currentStatus={admission.approval.status}
          onSuccess={() => {
            setIsApprovalModalOpen(false);
            fetchAdmission();
          }}
        />
      )}

      {/* Modal de Atribuição de Responsável (Bloco 6.4) */}
      {isAssignModalOpen && admission && (
        <AssignResponsibleModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={() => {
            fetchAdmission();
          }}
          admissionId={admission.id}
          admissionCode={admission.id.replace('adm-', 'ADM-').slice(0, 10).toUpperCase()}
          employeeName={admission.employee.name}
          currentResponsibleId={admission.responsibleUserId}
          currentResponsibleName={admission.responsibleUserName}
          updatedAt={admission.updatedAt}
        />
      )}
    </div>
  );
};
