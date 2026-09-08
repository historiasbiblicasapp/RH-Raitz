import React, { useState } from 'react';
import { Check, Copy, MessageCircle, X, Shield, ExternalLink, Sparkles } from 'lucide-react';
import { Admission } from '../types/index.ts';
import { StatusBadge } from './StatusBadge.tsx';

interface InviteModalProps {
  admission: Admission | null;
  isOpen: boolean;
  onClose: () => void;
  onSentWhatsApp?: (admissionId: string) => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ 
  admission, 
  isOpen, 
  onClose,
  onSentWhatsApp 
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !admission) return null;

  const inviteUrl = `${window.location.origin}/convite/${admission.inviteToken}`;
  const firstName = admission.employee.name.split(' ')[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleWhatsApp = () => {
    // Texto padronizado, acolhedor e seguro
    const message = encodeURIComponent(
      `Olá ${firstName}! 👋 Seja muito bem-vindo(a) à nossa equipe no cargo de *${admission.employee.role}*.\n\n` +
      `Para darmos início ao seu processo de contratação, criamos o seu acesso exclusivo e seguro no portal *Admissão Digital*.\n\n` +
      `Por favor, acesse pelo seu celular para conferir seus dados e enviar seus documentos:\n` +
      `${inviteUrl}\n\n` +
      `Em caso de qualquer dúvida, nosso time de RH está à disposição!`
    );

    const cleanPhone = admission.employee.phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${message}`;

    if (onSentWhatsApp) {
      onSentWhatsApp(admission.id);
    }

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Cabeçalho do modal */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5 text-white relative">
          <div className="flex items-center gap-3">
            <img
              src="/raitz-logo.jpg"
              alt="Logo Raitz"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl object-cover shadow-xs border border-white/20 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">
                  Raitz • Convite Individual
                </span>
              </div>
              <h2 className="text-xl font-bold leading-tight">Admissão criada com sucesso!</h2>
              <p className="text-xs text-blue-100 mt-0.5">
                O convite é individual, criptografado e seguro. Não utiliza o CPF como senha.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informações da Admissão */}
        <div className="p-6 space-y-5">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">{admission.employee.name}</p>
                <p className="text-xs text-slate-500">{admission.employee.role} • {admission.employee.department}</p>
              </div>
              <StatusBadge status={admission.status} size="sm" />
            </div>

            {/* Barra de progresso */}
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1.5">
                <span>Progresso da admissão</span>
                <span className="font-semibold text-blue-700">{admission.progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${admission.progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {admission.approvedDocuments} de {admission.totalDocuments} documentos obrigatórios aprovados
              </p>
            </div>
          </div>

          {/* Campo de link para cópia */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Link de Acesso do Colaborador:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="flex-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2.5 font-mono select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors shadow-xs ${
                  copied 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-slate-800 hover:bg-slate-900 text-white'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Aviso de conformidade e segurança */}
          <div className="flex items-start gap-2.5 text-xs text-slate-500 bg-blue-50/70 p-3 rounded-lg border border-blue-100">
            <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              Em conformidade com a <strong>LGPD</strong>, o link dá acesso apenas aos dados e documentos deste funcionário.
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-xs transition-colors"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Enviar pelo WhatsApp</span>
            </button>

            <a
              href={`/convite/${admission.inviteToken}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm py-2.5 px-4 rounded-xl transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir visão celular</span>
            </a>
          </div>
        </div>

        {/* Rodapé modal */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-slate-600 hover:text-slate-800 px-3 py-1.5"
          >
            Fechar janela
          </button>
        </div>
      </div>
    </div>
  );
};
