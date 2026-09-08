import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MessageCircle, 
  Share2, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Shield, 
  History, 
  Eye,
  Check,
  UserCheck
} from 'lucide-react';
import { Admission, AdmissionDocument } from '../types/index.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { DocumentReviewModal } from '../components/DocumentReviewModal.tsx';
import { InviteModal } from '../components/InviteModal.tsx';
import { maskCPF } from '../lib/cpf.ts';

export const AdmissionDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [admission, setAdmission] = useState<Admission | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDocForReview, setSelectedDocForReview] = useState<AdmissionDocument | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const fetchAdmission = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/admissions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setAdmission(data);
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
    notes?: string
  ) => {
    const res = await fetch(`/api/documents/${documentId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, rejectionReason: reason, rejectionNotes: notes })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao avaliar documento.');
    }

    const data = await res.json();
    setAdmission(data.admission);
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <Clock className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-600" />
        <p className="text-sm">Carregando detalhes da admissão...</p>
      </div>
    );
  }

  if (!admission) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p className="text-base font-semibold">Admissão não encontrada.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-3 text-xs text-blue-600 hover:underline"
        >
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  const inviteUrl = `${window.location.origin}/convite/${admission.inviteToken}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Barra superior de navegação */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-xs transition-colors"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>Convidar / WhatsApp</span>
          </button>

          <a
            href={inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Visão do Funcionário</span>
          </a>
        </div>
      </div>

      {/* Alerta de solicitação de correção de dados (se houver) */}
      {admission.correctionRequest && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Solicitação de Correção Cadastral Apontada pelo Colaborador
            </h3>
            <p className="text-xs mt-1 text-amber-950 font-medium">
              "{admission.correctionRequest.details}"
            </p>
            <span className="text-[11px] text-amber-700 mt-1 block">
              Registrado em: {new Date(admission.correctionRequest.requestedAt).toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      )}

      {/* Cartão com dados do colaborador e status da admissão */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <img
              src="/raitz-logo.jpg"
              alt="Logo Raitz"
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-xl object-cover shadow-xs border border-slate-200 shrink-0"
            />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">{admission.employee.name}</h1>
                <StatusBadge status={admission.status} size="md" />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {admission.employee.role} • {admission.employee.department} • {admission.employee.unit}
              </p>
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="w-full md:w-64 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>Conferência de Documentos</span>
              <span className="text-blue-600">{admission.progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  admission.progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                }`}
                style={{ width: `${admission.progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {admission.approvedDocuments} de {admission.totalDocuments} obrigatórios aprovados
            </p>
          </div>
        </div>

        {/* Grade com dados cadastrais e LGPD */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] font-medium">CPF (LGPD)</span>
            <span className="font-semibold text-slate-800 font-mono">
              {maskCPF(admission.employee.cpf)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-medium">Telefone / WhatsApp</span>
            <span className="font-semibold text-slate-800">{admission.employee.phone}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-medium">E-mail</span>
            <span className="font-semibold text-slate-800 truncate block">{admission.employee.email}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-medium">Início Previsto</span>
            <span className="font-semibold text-slate-800">
              {new Date(admission.employee.expectedStartDate + 'T00:00:00').toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Indicadores de Consentimento e Validação do Funcionário */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Shield className={`w-4 h-4 ${admission.consentGiven ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>
              Consentimento LGPD: <strong>{admission.consentGiven ? 'Aceito' : 'Pendente'}</strong>
              {admission.consentDate && ` (${new Date(admission.consentDate).toLocaleDateString('pt-BR')})`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600">
            <UserCheck className={`w-4 h-4 ${admission.dataConfirmed ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>
              Conferência dos dados: <strong>{admission.dataConfirmed ? 'Confirmados pelo funcionário' : 'Aguardando validação'}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Checklist de Documentos Obrigatórios */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Checklist de Documentos</h2>
            <p className="text-xs text-slate-500">
              Analise cada documento enviado. Uma admissão só pode ser concluída com 100% dos obrigatórios aprovados.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {admission.documents.map((doc) => (
            <div key={doc.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl border mt-0.5 ${
                  doc.status === 'Aprovado' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : doc.status === 'Rejeitado'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : doc.status === 'Não enviado'
                    ? 'bg-slate-50 text-slate-400 border-slate-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  <FileText className="w-5 h-5" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{doc.documentType}</h3>
                    {doc.required && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded">
                        Obrigatório
                      </span>
                    )}
                    <StatusBadge status={doc.status} size="sm" />
                  </div>

                  <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                    {doc.fileName ? (
                      <p>
                        Arquivo: <span className="font-medium text-slate-700">{doc.fileName}</span>
                        {doc.currentVersion > 0 && ` (Versão ${doc.currentVersion})`}
                      </p>
                    ) : (
                      <p className="text-slate-400 italic">Nenhum arquivo enviado ainda.</p>
                    )}

                    {doc.uploadedAt && (
                      <p className="text-[11px] text-slate-400">
                        Enviado em: {new Date(doc.uploadedAt).toLocaleString('pt-BR')}
                      </p>
                    )}

                    {/* Exibe motivo caso tenha sido recusado */}
                    {doc.status === 'Rejeitado' && doc.rejectionReason && (
                      <p className="text-rose-600 font-medium text-[11px] pt-0.5">
                        Motivo da recusa: {doc.rejectionReason}
                        {doc.rejectionNotes && ` - "${doc.rejectionNotes}"`}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Botão de Análise / Ação */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                {doc.currentVersion > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedDocForReview(doc)}
                    className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Conferir Documento</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modais */}
      <DocumentReviewModal
        document={selectedDocForReview}
        admission={admission}
        isOpen={!!selectedDocForReview}
        onClose={() => setSelectedDocForReview(null)}
        onReviewSubmit={handleReviewSubmit}
      />

      <InviteModal
        admission={admission}
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
    </div>
  );
};
