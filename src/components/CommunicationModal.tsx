import React, { useState, useEffect, useId } from 'react';
import { 
  X, 
  MessageSquare, 
  Send, 
  Copy, 
  Check, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Link as LinkIcon, 
  ExternalLink,
  Phone,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { CommunicationType, CommunicationActionStatus } from '../types/index.ts';
import { 
  normalizeBrazilianPhone, 
  COMMUNICATION_TEMPLATES, 
  renderTemplate, 
  generateWhatsAppLink 
} from '../lib/communication.ts';

export interface CommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  admissionId: string;
  admissionCode?: string;
  employeeId: string;
  employeeName: string;
  employeePhone: string;
  expectedStartDate?: string;
  inviteToken: string;
  isInviteValid?: boolean;
  initialReason?: {
    type: CommunicationType;
    label: string;
    documentId?: string;
    documentName?: string;
    rejectionReason?: string;
    detail?: string;
    priority?: 'Alta' | 'Média' | 'Baixa';
  };
  onSuccess?: () => void;
}

export const CommunicationModal: React.FC<CommunicationModalProps> = ({
  isOpen,
  onClose,
  admissionId,
  admissionCode,
  employeeId,
  employeeName,
  employeePhone,
  expectedStartDate,
  inviteToken,
  isInviteValid = true,
  initialReason,
  onSuccess
}) => {
  const modalTitleId = useId();
  const textareaId = useId();

  // Validação do Telefone
  const phoneValidation = normalizeBrazilianPhone(employeePhone);

  // Link do convite
  const inviteUrl = `${window.location.origin}/convite/${inviteToken}`;

  // Modelo selecionado
  const defaultTemplateId: CommunicationType = initialReason?.type || 'documents_pending';
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationType>(defaultTemplateId);

  // Mensagem editável
  const [message, setMessage] = useState<string>('');

  // Estados de feedback de cópia
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Loading / Submissão
  const [submitting, setSubmitting] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Atualiza a mensagem ao alterar template ou dados
  useEffect(() => {
    if (!isOpen) return;

    const chosen = COMMUNICATION_TEMPLATES[selectedTemplate] || COMMUNICATION_TEMPLATES.documents_pending;
    const rendered = renderTemplate(chosen.templateText, {
      employeeName,
      inviteUrl,
      documentName: initialReason?.documentName,
      rejectionReason: initialReason?.rejectionReason
    });

    setMessage(rendered);
    setCopiedMessage(false);
    setCopiedLink(false);
    setFeedbackNotice(null);
  }, [isOpen, selectedTemplate, employeeName, inviteUrl, initialReason?.documentName, initialReason?.rejectionReason]);

  // Se o modal fechar, reseta estados
  useEffect(() => {
    if (!isOpen) {
      setCopiedMessage(false);
      setCopiedLink(false);
      setFeedbackNotice(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Registrar histórico no backend (append-only)
  const logCommunicationAction = async (
    actionStatus: CommunicationActionStatus,
    channel: 'whatsapp' | 'copy',
    actionStatusLabel?: string
  ) => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/communications/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': localStorage.getItem('user_email') || 'rh@empresa.com'
        },
        body: JSON.stringify({
          admissionId,
          employeeId,
          communicationType: selectedTemplate,
          channel,
          templateId: selectedTemplate,
          documentId: initialReason?.documentId,
          documentName: initialReason?.documentName,
          rejectionReason: initialReason?.rejectionReason,
          messagePreview: message.slice(0, 160),
          actionStatus,
          actionStatusLabel
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao registrar histórico de comunicação.');
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Falha ao registrar log de comunicação:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Ação: Copiar Mensagem
  const handleCopyMessage = async () => {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopiedMessage(true);
      setFeedbackNotice({ type: 'success', text: 'Mensagem copiada.' });
      setTimeout(() => setCopiedMessage(false), 2500);

      // Registra evento de cópia
      await logCommunicationAction('message_copied', 'copy', 'Mensagem copiada');
    } catch (e) {
      setFeedbackNotice({ type: 'error', text: 'Não foi possível copiar para a área de transferência.' });
    }
  };

  // Ação: Copiar Link Seguro
  const handleCopyLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setFeedbackNotice({ type: 'success', text: 'Link copiado.' });
      setTimeout(() => setCopiedLink(false), 2500);

      // Registra evento de cópia de link
      await logCommunicationAction('link_copied', 'copy', 'Link copiado');
    } catch (e) {
      setFeedbackNotice({ type: 'error', text: 'Não foi possível copiar o link.' });
    }
  };

  // Ação: Abrir WhatsApp
  const handleOpenWhatsApp = async () => {
    if (!phoneValidation.isValid) {
      setFeedbackNotice({ type: 'error', text: 'Funcionário sem telefone válido cadastrado.' });
      return;
    }

    if (!message.trim()) {
      setFeedbackNotice({ type: 'error', text: 'A mensagem não pode estar vazia.' });
      return;
    }

    const waLink = generateWhatsAppLink(phoneValidation.cleanDigits, message);

    // Abre o WhatsApp no navegador/app
    window.open(waLink, '_blank', 'noopener,noreferrer');

    // Registra como "WhatsApp aberto para envio" (Seção 17: nunca afirma que foi enviada automaticamente)
    await logCommunicationAction('whatsapp_opened', 'whatsapp', 'WhatsApp aberto para envio');

    setFeedbackNotice({ 
      type: 'info', 
      text: 'WhatsApp aberto para envio. O envio final deve ser confirmado pelo usuário no WhatsApp.' 
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
    >
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center border border-blue-200/70 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 id={modalTitleId} className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Comunicar Funcionário
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Prepare e envie notificações sobre pendências e documentos admissionais.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-communication-modal"
            onClick={onClose}
            aria-label="Fechar janela"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Card Resumo do Funcionário e Situação */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Funcionário
              </span>
              <div className="font-bold text-slate-900 text-sm mt-0.5">
                {employeeName}
              </div>
              {admissionCode && (
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  Admissão: {admissionCode}
                </div>
              )}
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Telefone cadastrado
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {phoneValidation.isValid ? (
                  <span className="font-semibold text-slate-800 font-mono">
                    {phoneValidation.displayPhone}
                  </span>
                ) : (
                  <span className="text-rose-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {phoneValidation.error || 'Sem telefone válido'}
                  </span>
                )}
              </div>
              {expectedStartDate && (
                <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Início previsto: {new Date(expectedStartDate).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
            </div>

            {/* Pendência identificada */}
            {initialReason && (
              <div className="sm:col-span-2 pt-2 border-t border-slate-200/60 flex items-start gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 mt-0.5 ${
                  initialReason.priority === 'Alta' 
                    ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                    : initialReason.priority === 'Média'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                }`}>
                  {initialReason.label}
                </span>

                <div className="text-xs text-slate-700 flex-1">
                  {initialReason.documentName && (
                    <span className="font-semibold text-slate-900 mr-1.5">
                      {initialReason.documentName}
                    </span>
                  )}
                  {initialReason.rejectionReason ? (
                    <span className="text-rose-700">
                      Motivo: <strong>{initialReason.rejectionReason}</strong>
                    </span>
                  ) : (
                    <span>{initialReason.detail}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Aviso se o convite estiver expirado ou revogado */}
          {!isInviteValid && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Atenção:</strong> O link seguro deste convite está expirado ou revogado. Recomendamos renovar o convite na página da admissão para que o funcionário possa enviar documentos.
              </span>
            </div>
          )}

          {/* Seletor de Modelo de Mensagem */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Modelo de Mensagem
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(Object.keys(COMMUNICATION_TEMPLATES) as CommunicationType[])
                .filter(key => key !== 'general_notice')
                .map((key) => {
                  const tpl = COMMUNICATION_TEMPLATES[key];
                  const isSelected = selectedTemplate === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      id={`btn-template-${key}`}
                      onClick={() => setSelectedTemplate(key)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-2xs' 
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-xs leading-snug">
                        {tpl.title}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-tight">
                        {tpl.description}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Área de Edição da Mensagem */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor={textareaId} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Mensagem Personalizável
              </label>
              <span className="text-[11px] text-slate-400">
                Placeholders [NOME], [LINK], [DOCUMENTO] substituídos
              </span>
            </div>

            <div className="relative">
              <textarea
                id={textareaId}
                rows={7}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite ou personalize a mensagem..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans leading-relaxed resize-y"
              />
            </div>
          </div>

          {/* Feedback de Ação (Toast interno) */}
          {feedbackNotice && (
            <div className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150 ${
              feedbackNotice.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : feedbackNotice.type === 'error'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              <div className="flex items-center gap-2">
                {feedbackNotice.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-current shrink-0" />
                )}
                <span>{feedbackNotice.text}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setFeedbackNotice(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Rodapé / Ações */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-modal-copy-message"
              onClick={handleCopyMessage}
              disabled={submitting || !message}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {copiedMessage ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copiada!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copiar mensagem</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="btn-modal-copy-link"
              onClick={handleCopyLink}
              disabled={submitting || !inviteUrl}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Link copiado!</span>
                </>
              ) : (
                <>
                  <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copiar link</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              id="btn-modal-cancel"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 transition-colors cursor-pointer"
            >
              Fechar
            </button>

            <button
              type="button"
              id="btn-modal-open-whatsapp"
              onClick={handleOpenWhatsApp}
              disabled={submitting || !phoneValidation.isValid}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer ${
                phoneValidation.isValid 
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' 
                  : 'bg-slate-300 cursor-not-allowed text-slate-500'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Abrir WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
