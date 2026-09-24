import React, { useState, useEffect } from 'react';
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
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  CheckCircle2,
  Info,
  ShieldCheck,
  Calendar,
  User,
  HelpCircle
} from 'lucide-react';
import { AdmissionDocument, Admission, REJECTION_REASONS } from '../types/index.ts';
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
    notes?: string,
    expectedVersion?: number
  ) => Promise<void>;
}

export const DocumentReviewModal: React.FC<DocumentReviewModalProps> = ({
  document,
  admission,
  isOpen,
  onClose,
  onReviewSubmit
}) => {
  const [isRejecting, setIsRejecting] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>(REJECTION_REASONS[0]);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [rejectionError, setRejectionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number | null>(null);

  // Controles de visualização de documento
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Efeito para registrar auditoria de visualização e resetar controles ao abrir
  useEffect(() => {
    if (isOpen && document) {
      setZoomLevel(1);
      setRotation(0);
      setIsRejecting(false);
      setShowApproveConfirm(false);
      setSelectedReason(REJECTION_REASONS[0]);
      setRejectionNotes('');
      setRejectionError('');
      setSelectedVersionNumber(null);

      // Registra no log de auditoria que o RH visualizou o documento (LGPD)
      if (document.currentVersion > 0) {
        fetch(`/api/documents/${document.id}/view-audit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: document.currentVersion })
        }).catch(() => {});
      }
    }
  }, [isOpen, document?.id]);

  // Registra auditoria ao alternar de versão
  useEffect(() => {
    if (isOpen && document && selectedVersionNumber && selectedVersionNumber !== document.currentVersion) {
      fetch(`/api/documents/${document.id}/view-audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: selectedVersionNumber })
      }).catch(() => {});
    }
  }, [selectedVersionNumber]);

  if (!isOpen || !document || !admission) return null;

  const currentVersionToDisplay = selectedVersionNumber 
    ? document.versions.find(v => v.version === selectedVersionNumber) || document
    : document;

  const handleApproveConfirm = async () => {
    if (document.status === 'Não enviado' || document.currentVersion === 0) {
      alert('Não é possível aprovar um documento que ainda não foi enviado pelo colaborador.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onReviewSubmit(document.id, 'Aprovado', undefined, undefined, document.currentVersion);
      setShowApproveConfirm(false);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao aprovar documento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    setRejectionError('');
    if (!selectedReason) {
      setRejectionError('Selecione um motivo para a recusa do documento.');
      return;
    }

    // Regra do Bloco 3.5: Se o motivo for "Outro", exigir descrição obrigatória!
    if (selectedReason === 'Outro' && !rejectionNotes.trim()) {
      setRejectionError('Para o motivo "Outro", é obrigatório preencher a descrição detalhada do motivo.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onReviewSubmit(
        document.id, 
        'Rejeitado', 
        selectedReason, 
        rejectionNotes.trim() || undefined,
        document.currentVersion
      );
      setIsRejecting(false);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao rejeitar documento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewUrl = `/api/documents/${document.id}/file${selectedVersionNumber ? `?version=${selectedVersionNumber}` : ''}`;
  const downloadUrl = `/api/documents/${document.id}/file?download=true${selectedVersionNumber ? `&version=${selectedVersionNumber}` : ''}`;

  const isImage = Boolean(
    currentVersionToDisplay?.mimeType?.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp)$/i.test(currentVersionToDisplay?.fileName || '') ||
    document.mimeType?.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp)$/i.test(document.fileName || '')
  );

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.6));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleResetView = () => { setZoomLevel(1); setRotation(0); };

  const isAlreadyApproved = document.status === 'Aprovado' && (!selectedVersionNumber || selectedVersionNumber === document.currentVersion);
  const hasUploadedFile = document.currentVersion > 0 || !!document.storagePath;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
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
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900">
                  Conferência: {document.documentType}
                </h2>
                {document.required ? (
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                    Obrigatório
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded">
                    Opcional
                  </span>
                )}
                {document.category && (
                  <span className="text-[10px] bg-slate-200 text-slate-700 font-medium px-2 py-0.5 rounded">
                    {document.category}
                  </span>
                )}
                <StatusBadge status={document.status} size="sm" />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Colaborador: <strong>{admission.employee.name}</strong> • Cargo: <strong>{admission.employee.role}</strong> • Status da admissão: {admission.status}
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

        {/* Corpo com visualizador e painel de análise */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-y-auto">
          {/* Visualizador de documento com zoom e rotação */}
          <div className="lg:col-span-7 bg-slate-950 p-4 flex flex-col items-center justify-between min-h-[400px] lg:min-h-[520px] relative border-b lg:border-b-0 lg:border-r border-slate-200">
            {/* Barra de ferramentas do visualizador */}
            <div className="bg-slate-900/90 backdrop-blur-xs border border-slate-800 rounded-xl px-3 py-1.5 text-slate-300 text-xs mb-3 flex items-center justify-between w-full">
              <span className="truncate max-w-[200px] font-mono text-[11px] text-slate-300">
                {currentVersionToDisplay.fileName || `${document.documentType}.pdf`}
                {selectedVersionNumber && ` (Versão ${selectedVersionNumber})`}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleZoomOut}
                  title="Diminuir zoom"
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono text-slate-400 w-10 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  title="Aumentar zoom"
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-3.5 bg-slate-800 mx-1" />
                <button
                  onClick={handleRotate}
                  title="Girar documento 90°"
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                {(zoomLevel !== 1 || rotation !== 0) && (
                  <button
                    onClick={handleResetView}
                    className="text-[10px] text-blue-400 hover:underline px-1 cursor-pointer"
                  >
                    Resetar
                  </button>
                )}
                <div className="w-px h-3.5 bg-slate-800 mx-1" />
                <a
                  href={downloadUrl}
                  title="Baixar documento original (LGPD auditado)"
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir em nova aba segura"
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Container do documento com transformações de zoom e rotação */}
            <div className="flex-1 w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800/80 flex items-center justify-center relative p-2">
              {hasUploadedFile ? (
                <div 
                  className="w-full h-full flex items-center justify-center transition-transform duration-200"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`
                  }}
                >
                  {isImage ? (
                    <img
                      src={previewUrl}
                      alt={document.documentType}
                      className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-md bg-white"
                    />
                  ) : (
                    <iframe
                      src={previewUrl}
                      title="Visualizador de documento seguro"
                      className="w-full h-full min-h-[350px] lg:min-h-[460px] border-0 rounded bg-white"
                    />
                  )}
                </div>
              ) : (
                <div className="text-center text-slate-400 p-8 max-w-md">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-slate-600" />
                  <p className="text-sm font-semibold text-slate-300">Documento não enviado</p>
                  <p className="text-xs text-slate-500 mt-1">
                    O colaborador ainda não realizou o envio deste documento pelo link de admissão.
                  </p>
                  {document.required ? (
                    <span className="inline-block mt-3 text-[11px] bg-blue-900/40 text-blue-300 border border-blue-800 px-2.5 py-1 rounded-md font-medium">
                      Item obrigatório para a conclusão da admissão
                    </span>
                  ) : (
                    <span className="inline-block mt-3 text-[11px] bg-slate-800 text-slate-400 px-2.5 py-1 rounded-md">
                      Item opcional (não impede a conclusão)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Coluna da direita: Metadados, Histórico de Versões e Ações */}
          <div className="lg:col-span-5 p-6 flex flex-col justify-between overflow-y-auto bg-white">
            <div className="space-y-4">
              {/* Orientações do Checklist (Snapshot) */}
              {document.instructions && (
                <div className="bg-blue-50/80 border border-blue-200/70 rounded-xl p-3 text-xs text-blue-900">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <Info className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Instruções do checklist:</span>
                  </div>
                  <p className="text-blue-800 pl-5 leading-relaxed">{document.instructions}</p>
                </div>
              )}

              {/* Metadados e Informações do Snapshot */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Informações do Documento
                </h3>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Versão atual:</span>
                    <span className="font-semibold text-slate-800">
                      {document.currentVersion > 0 ? `Versão ${document.currentVersion}` : 'Não enviada'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Último envio:</span>
                    <span className="font-semibold text-slate-800">
                      {document.uploadedAt ? new Date(document.uploadedAt).toLocaleString('pt-BR') : '—'}
                    </span>
                  </div>
                  {(document.allowed_file_types || document.max_file_size_mb) && (
                    <div className="flex justify-between border-t border-slate-200/60 pt-1.5">
                      <span className="text-slate-500">Formatos / Limite:</span>
                      <span className="font-medium text-slate-700">
                        {(document.allowed_file_types || ['PDF', 'JPG', 'PNG']).join(', ')} • {document.max_file_size_mb || 10} MB
                      </span>
                    </div>
                  )}
                  {document.reviewedBy && (
                    <div className="flex justify-between border-t border-slate-200/60 pt-1.5">
                      <span className="text-slate-500">Conferido por:</span>
                      <span className="font-semibold text-slate-800">{document.reviewedBy}</span>
                    </div>
                  )}
                  {document.reviewedAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Data da conferência:</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(document.reviewedAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Histórico de versões */}
              {document.versions && document.versions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      <span>Histórico de Versões ({document.versions.length})</span>
                    </h3>
                    <span className="text-[10px] text-slate-400">Clique para inspecionar</span>
                  </div>

                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {document.versions.map((ver) => {
                      const isSelected = selectedVersionNumber === ver.version || (!selectedVersionNumber && ver.version === document.currentVersion);
                      return (
                        <div
                          key={ver.version}
                          onClick={() => setSelectedVersionNumber(ver.version)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/20'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-800">
                              Versão {ver.version} {ver.version === document.currentVersion && '(Atual)'}
                            </span>
                            <StatusBadge status={ver.status} size="sm" />
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Enviado em: {new Date(ver.uploadedAt).toLocaleString('pt-BR')}
                          </p>
                          {ver.reviewedBy && (
                            <p className="text-[11px] text-slate-400">
                              Conferido por: {ver.reviewedBy}
                            </p>
                          )}
                          {ver.rejectionReason && (
                            <div className="mt-1 pt-1 border-t border-rose-100 text-[11px] text-rose-700">
                              <strong>Recusado:</strong> {ver.rejectionReason}
                              {ver.rejectionNotes && ` — "${ver.rejectionNotes}"`}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Aviso se o documento atual está rejeitado */}
              {document.status === 'Rejeitado' && document.rejectionReason && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs">
                  <div className="flex items-center gap-1.5 text-rose-800 font-bold mb-1">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Documento Rejeitado: {document.rejectionReason}</span>
                  </div>
                  {document.rejectionNotes && (
                    <p className="text-rose-700 text-[11px] pl-5 leading-relaxed">
                      "{document.rejectionNotes}"
                    </p>
                  )}
                  <p className="text-[10px] text-rose-500 mt-2 pl-5">
                    Aguardando reenvio de nova versão corrigida pelo colaborador.
                  </p>
                </div>
              )}

              {/* Diálogo de Confirmação de Aprovação */}
              {showApproveConfirm && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2 text-emerald-900">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        Tem certeza que deseja aprovar este documento?
                      </h4>
                      <p className="text-xs mt-1 text-emerald-800">
                        O documento <strong>{document.documentType}</strong> será marcado como <strong>APROVADO</strong> na versão {document.currentVersion}. O progresso da admissão será recalculado e a decisão ficará registrada na auditoria.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowApproveConfirm(false)}
                      className="text-xs font-medium text-slate-600 px-3 py-1.5 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleApproveConfirm}
                      className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      {isSubmitting ? 'Aprovando...' : 'Confirmar Aprovação'}
                    </button>
                  </div>
                </div>
              )}

              {/* Formulário de Rejeição */}
              {isRejecting && (
                <div className="bg-rose-50/90 border border-rose-200 rounded-xl p-4 space-y-3 animate-in fade-in duration-150">
                  <h4 className="text-xs font-bold text-rose-900 uppercase">
                    Motivo da Rejeição (Obrigatório)
                  </h4>

                  {rejectionError && (
                    <div className="p-2 rounded bg-rose-100 text-rose-800 text-[11px] font-medium">
                      {rejectionError}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Selecione o motivo: <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={selectedReason}
                      onChange={(e) => {
                        setSelectedReason(e.target.value);
                        setRejectionError('');
                      }}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    >
                      {REJECTION_REASONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      {selectedReason === 'Outro' ? (
                        <>
                          Descrição detalhada do motivo: <span className="text-rose-600 font-bold">* (Obrigatório)</span>
                        </>
                      ) : (
                        'Orientação / Observação para o colaborador (opcional):'
                      )}
                    </label>
                    <textarea
                      rows={3}
                      value={rejectionNotes}
                      onChange={(e) => {
                        setRejectionNotes(e.target.value);
                        setRejectionError('');
                      }}
                      placeholder={selectedReason === 'Outro' 
                        ? 'Descreva claramente o motivo da recusa para que o candidato saiba como corrigir.' 
                        : 'Ex: Por favor envie uma foto legível onde seja possível conferir todos os campos.'
                      }
                      className={`w-full text-xs bg-white border rounded-lg p-2 focus:ring-2 focus:ring-rose-500 focus:outline-none ${
                        selectedReason === 'Outro' && !rejectionNotes.trim() ? 'border-rose-400' : 'border-slate-300'
                      }`}
                    />
                    {selectedReason === 'Outro' && (
                      <p className="text-[10px] text-rose-600 mt-0.5">
                        Para o motivo "Outro", o preenchimento da descrição é obrigatório.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRejecting(false);
                        setRejectionError('');
                      }}
                      className="text-xs font-medium text-slate-600 px-3 py-1.5 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleConfirmReject}
                      className="text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      {isSubmitting ? 'Salvando...' : 'Confirmar Rejeição'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Ações de Conferência do RH */}
            {!isRejecting && !showApproveConfirm && (
              <div className="pt-6 border-t border-slate-100 space-y-2">
                {!hasUploadedFile ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <p className="text-xs font-semibold text-slate-600">Aguardando envio do arquivo</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Ações de aprovação e rejeição ficam disponíveis após o colaborador enviar o documento.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setIsRejecting(true)}
                      disabled={isSubmitting}
                      className="flex items-center justify-center gap-1.5 bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>REJEITAR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowApproveConfirm(true)}
                      disabled={isSubmitting || isAlreadyApproved}
                      className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>{isAlreadyApproved ? 'JÁ APROVADO' : 'APROVAR'}</span>
                    </button>
                  </div>
                )}

                <p className="text-[11px] text-center text-slate-400 pt-1">
                  Conformidade LGPD: Toda decisão e visualização é registrada na trilha imutável de auditoria.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
