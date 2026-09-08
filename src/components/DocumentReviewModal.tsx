import React, { useState } from 'react';
import { 
  X, 
  Check, 
  XCircle, 
  Clock, 
  FileText, 
  Download, 
  Eye, 
  History, 
  AlertTriangle,
  FileCheck2,
  ZoomIn
} from 'lucide-react';
import { AdmissionDocument, Admission } from '../types/index.ts';
import { StatusBadge } from './StatusBadge.tsx';

interface DocumentReviewModalProps {
  document: AdmissionDocument | null;
  admission: Admission | null;
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmit: (
    documentId: string, 
    decision: 'Aprovado' | 'Rejeitado', 
    reason?: string, 
    notes?: string
  ) => Promise<void>;
}

const REJECTION_REASONS = [
  'Documento ilegível',
  'Documento incompleto',
  'Documento vencido',
  'Arquivo incorreto',
  'Documento diferente do solicitado',
  'Outro'
];

export const DocumentReviewModal: React.FC<DocumentReviewModalProps> = ({
  document,
  admission,
  isOpen,
  onClose,
  onReviewSubmit
}) => {
  const [isRejecting, setIsRejecting] = useState(false);
  const [selectedReason, setSelectedReason] = useState(REJECTION_REASONS[0]);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number | null>(null);

  if (!isOpen || !document || !admission) return null;

  const currentVersionToDisplay = selectedVersionNumber 
    ? document.versions.find(v => v.version === selectedVersionNumber) || document
    : document;

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onReviewSubmit(document.id, 'Aprovado');
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao aprovar documento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedReason) {
      alert('Selecione um motivo para a recusa do documento.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onReviewSubmit(document.id, 'Rejeitado', selectedReason, rejectionNotes);
      setIsRejecting(false);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao rejeitar documento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewUrl = `/api/documents/${document.id}/file${selectedVersionNumber ? `?version=${selectedVersionNumber}` : ''}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Topo do modal */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <img
              src="/raitz-logo.jpg"
              alt="Logo Raitz"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl object-cover shadow-xs border border-slate-200 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Conferência de Documento: {document.documentType}
                </h2>
                <StatusBadge status={document.status} size="sm" />
              </div>
              <p className="text-xs text-slate-500">
                Colaborador: <strong>{admission.employee.name}</strong> • Cargo: {admission.employee.role} • Raitz
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com split layout: Visualizador de Documento e Informações/Ações */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-y-auto">
          {/* Coluna da esquerda (8 colunas em lg): Visualizador */}
          <div className="lg:col-span-7 bg-slate-900 p-4 flex flex-col items-center justify-center min-h-[350px] lg:min-h-[500px] relative border-b lg:border-b-0 lg:border-r border-slate-200">
            {document.storagePath || document.currentVersion > 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="bg-slate-800 rounded-lg p-2 text-slate-300 text-xs mb-2 flex items-center justify-between w-full">
                  <span className="truncate max-w-[200px]">{currentVersionToDisplay.fileName || 'documento'}</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white flex items-center gap-1 text-[11px] bg-slate-700 px-2 py-1 rounded"
                    >
                      <ZoomIn className="w-3 h-3" />
                      <span>Abrir</span>
                    </a>
                  </div>
                </div>

                <div className="flex-1 w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center relative">
                  <iframe
                    src={previewUrl}
                    title="Pré-visualização do documento"
                    className="w-full h-full min-h-[320px] lg:min-h-[420px] border-0"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 p-8">
                <FileText className="w-12 h-12 mx-auto mb-2 text-slate-600" />
                <p className="text-sm font-medium">Documento ainda não enviado pelo colaborador.</p>
              </div>
            )}
          </div>

          {/* Coluna da direita (5 colunas em lg): Detalhes, Histórico e Decisão */}
          <div className="lg:col-span-5 p-6 flex flex-col justify-between overflow-y-auto bg-white">
            <div className="space-y-5">
              {/* Metadados do documento */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Dados do Envio
                </h3>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Versão atual:</span>
                    <span className="font-semibold text-slate-800">V{document.currentVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Data de envio:</span>
                    <span className="font-semibold text-slate-800">
                      {document.uploadedAt ? new Date(document.uploadedAt).toLocaleString('pt-BR') : 'Pendente'}
                    </span>
                  </div>
                  {document.fileSize && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tamanho:</span>
                      <span className="font-semibold text-slate-800">
                        {(document.fileSize / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  )}
                  {document.reviewedBy && (
                    <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5">
                      <span className="text-slate-500">Última análise:</span>
                      <span className="font-semibold text-slate-800">{document.reviewedBy}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Histórico de versões */}
              {document.versions && document.versions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      <span>Histórico de Versões</span>
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      {document.versions.length} versão(ões)
                    </span>
                  </div>

                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {document.versions.map((ver) => (
                      <div
                        key={ver.version}
                        onClick={() => setSelectedVersionNumber(ver.version)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                          (selectedVersionNumber === ver.version || (!selectedVersionNumber && ver.version === document.currentVersion))
                            ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/20'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-800">Versão {ver.version}</span>
                          <StatusBadge status={ver.status} size="sm" />
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {new Date(ver.uploadedAt).toLocaleString('pt-BR')}
                        </p>
                        {ver.rejectionReason && (
                          <p className="text-[11px] text-rose-600 font-medium mt-1">
                            Motivo recusa: {ver.rejectionReason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Se o documento estiver atualmente rejeitado, mostra o motivo */}
              {document.status === 'Rejeitado' && document.rejectionReason && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs">
                  <div className="flex items-center gap-1.5 text-rose-800 font-semibold mb-1">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Recusado: {document.rejectionReason}</span>
                  </div>
                  {document.rejectionNotes && (
                    <p className="text-rose-700 text-[11px] pl-5">
                      "{document.rejectionNotes}"
                    </p>
                  )}
                </div>
              )}

              {/* Formulário de Rejeição (se clicou em Rejeitar) */}
              {isRejecting && (
                <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-4 space-y-3 animate-in fade-in duration-150">
                  <h4 className="text-xs font-bold text-rose-900 uppercase">
                    Motivo da Rejeição (Obrigatório)
                  </h4>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Selecione o motivo:
                    </label>
                    <select
                      value={selectedReason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    >
                      {REJECTION_REASONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Instruções para o funcionário (opcional):
                    </label>
                    <textarea
                      rows={2}
                      value={rejectionNotes}
                      onChange={(e) => setRejectionNotes(e.target.value)}
                      placeholder="Ex: Documento com bordas cortadas. Favor fotografar em ambiente iluminado."
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsRejecting(false)}
                      className="text-xs font-medium text-slate-600 px-3 py-1.5 hover:bg-slate-100 rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleConfirmReject}
                      className="text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-lg shadow-xs transition-colors"
                    >
                      {isSubmitting ? 'Salvando...' : 'Confirmar Rejeição'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Ações de Conferência do RH */}
            {!isRejecting && (
              <div className="pt-6 border-t border-slate-100 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRejecting(true)}
                    disabled={isSubmitting || document.status === 'Não enviado'}
                    className="flex items-center justify-center gap-1.5 bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold py-2.5 px-4 rounded-xl transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>REJEITAR</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isSubmitting || document.status === 'Não enviado' || document.status === 'Aprovado'}
                    className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>APROVAR</span>
                  </button>
                </div>

                <p className="text-[11px] text-center text-slate-400">
                  A aprovação é auditada e atualiza o progresso da admissão automaticamente.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
