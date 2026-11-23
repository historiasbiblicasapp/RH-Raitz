import React, { useState, useEffect, useId } from 'react';
import {
  Check,
  Copy,
  Mail,
  MessageCircle,
  Phone,
  AlertCircle,
  RotateCcw,
  Link as LinkIcon
} from 'lucide-react';
import {
  DEFAULT_RAITZ_RECRUITMENT_MESSAGE,
  RAITZ_RECRUITMENT_FORM_URL,
  buildRaitzRecruitmentMessage,
  generateWhatsAppLink,
  normalizeBrazilianPhone
} from '../lib/communication.ts';

export interface QuickMessageSenderProps {
  recipientName: string;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
  role?: string | null;
  onAction?: (action: 'whatsapp' | 'copy' | 'email', message: string) => void;
}

export const QuickMessageSender: React.FC<QuickMessageSenderProps> = ({
  recipientName,
  recipientPhone,
  recipientEmail,
  role,
  onAction
}) => {
  const textareaId = useId();
  const [message, setMessage] = useState<string>(DEFAULT_RAITZ_RECRUITMENT_MESSAGE);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedFormLink, setCopiedFormLink] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setMessage(DEFAULT_RAITZ_RECRUITMENT_MESSAGE);
    setCopiedMessage(false);
    setCopiedFormLink(false);
    setFeedback(null);
  }, [recipientName, recipientPhone, role]);

  const phoneValidation = normalizeBrazilianPhone(recipientPhone);
  const trimmedRole = role?.trim() || '';
  const hasDifferentRole = Boolean(trimmedRole && trimmedRole.toLowerCase() !== 'auxiliar de produção');
  const isCustomMessage = message !== DEFAULT_RAITZ_RECRUITMENT_MESSAGE;

  const whatsappUrl =
    phoneValidation.isValid && message.trim()
      ? generateWhatsAppLink(phoneValidation.cleanDigits, message)
      : undefined;

  const cleanEmail = recipientEmail?.trim() || '';
  const hasValidEmail = cleanEmail.includes('@');
  const mailtoUrl =
    hasValidEmail && message.trim()
      ? `mailto:${encodeURIComponent(cleanEmail)}?subject=${encodeURIComponent('Processo Seletivo - Raitz Resende')}&body=${encodeURIComponent(message)}`
      : undefined;

  const handleCopyMessage = async () => {
    if (!message.trim()) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopiedMessage(true);
      setFeedback({ type: 'success', text: 'Mensagem copiada para a área de transferência.' });
      setTimeout(() => setCopiedMessage(false), 2500);
      onAction?.('copy', message);
    } catch {
      setFeedback({ type: 'error', text: 'Não foi possível copiar a mensagem automaticamente.' });
    }
  };

  const handleCopyFormLink = async () => {
    try {
      await navigator.clipboard.writeText(RAITZ_RECRUITMENT_FORM_URL);
      setCopiedFormLink(true);
      setFeedback({ type: 'success', text: 'Link do formulário copiado.' });
      setTimeout(() => setCopiedFormLink(false), 2500);
    } catch {
      setFeedback({ type: 'error', text: 'Não foi possível copiar o link.' });
    }
  };

  const handleUseRegisteredRole = () => {
    if (!trimmedRole) return;
    setMessage(buildRaitzRecruitmentMessage(trimmedRole));
    setFeedback(null);
  };

  const handleRestoreDefault = () => {
    setMessage(DEFAULT_RAITZ_RECRUITMENT_MESSAGE);
    setFeedback(null);
  };

  return (
    <div className="space-y-3.5">
      {/* Resumo do destinatário */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold text-slate-500 block">Destinatário</span>
          <p className="font-bold text-slate-900 truncate">{recipientName}</p>
          {hasValidEmail && (
            <p className="text-[11px] text-slate-500 truncate mt-0.5">{cleanEmail}</p>
          )}
        </div>

        <div className="sm:text-right shrink-0">
          <span className="text-[11px] font-semibold text-slate-500 block">WhatsApp / Telefone</span>
          {phoneValidation.isValid ? (
            <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-slate-800 mt-0.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              {phoneValidation.displayPhone}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-rose-600 font-medium mt-0.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {phoneValidation.error || 'Telefone inválido'}
            </span>
          )}
        </div>
      </div>

      {/* Cabeçalho do editor + atalhos */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor={textareaId} className="text-xs font-semibold text-slate-700">
            Mensagem de Boas-vindas e Formulário (Raitz Resende)
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {hasDifferentRole && (
              <button
                type="button"
                onClick={handleUseRegisteredRole}
                className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Usar cargo cadastrado ({trimmedRole})
              </button>
            )}
            {isCustomMessage && (
              <button
                type="button"
                onClick={handleRestoreDefault}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Restaurar padrão
              </button>
            )}
          </div>
        </div>

        <textarea
          id={textareaId}
          rows={11}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all leading-relaxed resize-y"
        />
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : feedback.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Ações de envio */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="btn-quick-copy-message"
            onClick={handleCopyMessage}
            disabled={!message.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
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
            id="btn-quick-copy-form-link"
            onClick={handleCopyFormLink}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copiedFormLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Link copiado!</span>
              </>
            ) : (
              <>
                <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Copiar link do Forms</span>
              </>
            )}
          </button>

          {mailtoUrl && (
            <a
              href={mailtoUrl}
              onClick={() => onAction?.('email', message)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              <span>Enviar por E-mail</span>
            </a>
          )}
        </div>

        {whatsappUrl ? (
          <a
            id="btn-quick-send-whatsapp"
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              setFeedback({
                type: 'info',
                text: 'WhatsApp aberto com a mensagem pronta. Confirme o envio no aplicativo.'
              });
              onAction?.('whatsapp', message);
            }}
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-xs transition-colors whitespace-nowrap shrink-0"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>Enviar pelo WhatsApp</span>
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex items-center justify-center gap-2 bg-slate-200 text-slate-500 font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl cursor-not-allowed whitespace-nowrap shrink-0"
            title="Informe um número de telefone válido com DDD para enviar via WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp indisponível</span>
          </button>
        )}
      </div>
    </div>
  );
};
