import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, 
  Copy, 
  MessageCircle, 
  X, 
  Shield, 
  ExternalLink, 
  Smartphone, 
  AlertTriangle,
  Settings2,
  Globe,
  MessageSquareText
} from 'lucide-react';
import { Admission } from '../types/index.ts';
import { StatusBadge } from './StatusBadge.tsx';
import { MobileSimulatorModal } from './MobileSimulatorModal.tsx';
import { QuickMessageSender } from './QuickMessageSender.tsx';
import { safeFetchJson } from '../lib/api.ts';
import {
  buildInviteUrl,
  getSavedPublicUrl,
  isPrivatePreviewUrl,
  setSavedPublicUrl,
  type SystemUrlConfig
} from '../lib/appUrl.ts';

interface InviteModalProps {
  admission: Admission | null;
  isOpen: boolean;
  onClose: () => void;
  onSentWhatsApp?: (admissionId: string) => void;
  initialTab?: 'portal' | 'recruitment_form';
}

export const InviteModal: React.FC<InviteModalProps> = ({ 
  admission, 
  isOpen, 
  onClose,
  onSentWhatsApp,
  initialTab = 'portal'
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'portal' | 'recruitment_form'>(initialTab);
  const [copied, setCopied] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showDomainConfig, setShowDomainConfig] = useState(false);

  const [systemConfig, setSystemConfig] = useState<SystemUrlConfig | null>(null);
  const [customBaseUrl, setCustomBaseUrl] = useState<string>(() => getSavedPublicUrl());

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      const saved = getSavedPublicUrl();
      if (saved) setCustomBaseUrl(saved);

      safeFetchJson<SystemUrlConfig>('/api/system-config')
        .then(data => {
          if (data) {
            setSystemConfig(data);
            if (!saved && data.envUrl && !isPrivatePreviewUrl(data.envUrl)) {
              setCustomBaseUrl(data.envUrl);
            }
          }
        })
        .catch(() => {
          // Ignora silenciosamente em caso de erro transitório de rede
        });
    }
  }, [isOpen, initialTab]);

  if (!isOpen || !admission) return null;

  const isPrivateHost = Boolean(
    isPrivatePreviewUrl(window.location.origin) ||
    systemConfig?.isLocalhost
  );

  // Calcula a URL efetiva para o convite
  const effectiveOrigin = customBaseUrl.trim() ||
    (systemConfig?.envUrl && !isPrivatePreviewUrl(systemConfig.envUrl) ? systemConfig.envUrl : window.location.origin);

  const inviteUrl = buildInviteUrl(admission.inviteToken, customBaseUrl, systemConfig);
  const localRelativeUrl = `/convite/${admission.inviteToken}`;
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

  const handleQuickMessageAction = async (action: 'whatsapp' | 'copy' | 'email', messageText: string) => {
    if (action === 'whatsapp' && onSentWhatsApp) {
      onSentWhatsApp(admission.id);
    }
    if (action === 'whatsapp' || action === 'copy') {
      try {
        await fetch('/api/communications/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': localStorage.getItem('user_email') || 'rh@empresa.com'
          },
          body: JSON.stringify({
            admissionId: admission.id,
            employeeId: admission.employeeId,
            communicationType: 'recruitment_form',
            channel: action === 'whatsapp' ? 'whatsapp' : 'copy',
            templateId: 'recruitment_form',
            messagePreview: messageText.slice(0, 160),
            actionStatus: action === 'whatsapp' ? 'whatsapp_opened' : 'message_copied',
            actionStatusLabel: action === 'whatsapp' ? 'WhatsApp aberto (Formulário Raitz Resende)' : 'Mensagem do formulário copiada'
          })
        });
      } catch {
        // Registro auxiliar não bloqueante
      }
    }
  };

  const handleOpenDirectly = () => {
    onClose();
    navigate(localRelativeUrl);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[92vh]">
          {/* Cabeçalho do modal */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 px-6 py-5 text-white relative shrink-0">
            <div className="flex items-center gap-3">
              <img
                src="/raitz-logo.jpg"
                alt="Logo Raitz"
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-2xl object-cover shadow-xs border border-white/20 shrink-0"
              />
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                    Raitz • Convite e Mensagem Inicial
                  </span>
                </div>
                <h2 className="text-xl font-bold leading-tight">Admissão criada com sucesso!</h2>
                <p className="text-xs text-blue-100 mt-0.5">
                  Envie o acesso ao portal admissional ou a mensagem com o link do formulário.
                </p>
              </div>
            </div>

            <button 
              onClick={onClose}
              aria-label="Fechar janela"
              className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Informações da Admissão e Seletor de Mensagem */}
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">{admission.employee.name}</p>
                  <p className="text-xs text-slate-500">{admission.employee.role} · {admission.employee.department}</p>
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

            {/* Seletor de tipo de envio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                id="tab-invite-portal"
                onClick={() => setActiveTab('portal')}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'portal'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Convite Portal Admissional</span>
              </button>

              <button
                type="button"
                id="tab-invite-recruitment-form"
                onClick={() => setActiveTab('recruitment_form')}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'recruitment_form'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquareText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Mensagem Formulário (Raitz Resende)</span>
              </button>
            </div>

            {activeTab === 'recruitment_form' ? (
              <QuickMessageSender
                recipientName={admission.employee.name}
                recipientPhone={admission.employee.phone}
                recipientEmail={admission.employee.email}
                role={admission.employee.role}
                onAction={handleQuickMessageAction}
              />
            ) : (
              <>
                {/* DESTAQUE PRINCIPAL: Botão do Simulador Mobile Embutido */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Testar como Funcionário
                        </h3>
                        <p className="text-xs text-slate-600">
                          Abra o simulador de celular direto nesta tela para preencher e enviar documentos.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowSimulator(true)}
                      className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-colors shrink-0 whitespace-nowrap cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Abrir no Simulador</span>
                    </button>
                  </div>
                </div>

                {/* Aviso inteligente caso esteja em localhost/ais-dev ou precise de domínio público */}
                {isPrivateHost && !customBaseUrl && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-amber-950">
                        Aviso para envio por WhatsApp em Celular Externo:
                      </p>
                      <p className="text-amber-800 mt-0.5 text-[11px]">
                        O endereço atual (<code>{window.location.hostname.includes('ais-dev-') ? 'ais-dev (ambiente privado)' : 'localhost'}</code>) exige sessão do desenvolvedor e não abre no celular de candidatos externos. Para testar aqui, use o Simulador; para enviar a funcionários, configure a URL pública publicada.
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowSimulator(true)}
                          className="text-[11px] font-bold text-blue-700 hover:underline bg-white px-2.5 py-1 rounded-lg border border-amber-300"
                        >
                          Testar no Simulador de Celular (Recomendado)
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDomainConfig(!showDomainConfig)}
                          className="text-[11px] font-semibold text-amber-800 hover:underline flex items-center gap-1"
                        >
                          <Globe className="w-3 h-3" />
                          <span>{showDomainConfig ? 'Ocultar ajuste de domínio' : 'Configurar URL pública'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Campo de configuração opcional de URL pública */}
                {showDomainConfig && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Domínio Público ou Endereço de Hospedagem:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        placeholder="https://seu-dominio.vercel.app"
                        value={customBaseUrl}
                        onChange={(e) => {
                          setCustomBaseUrl(e.target.value);
                          setSavedPublicUrl(e.target.value);
                        }}
                        className="flex-1 bg-white border border-slate-300 text-xs rounded-lg px-3 py-2 text-slate-800 focus:outline-blue-500"
                      />
                      {customBaseUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomBaseUrl('');
                            setSavedPublicUrl('');
                          }}
                          className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Insira o link público da aplicação publicada para que colaboradores consigam abrir de qualquer celular.
                    </p>
                  </div>
                )}

                {/* Campo de link para cópia */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Link de Acesso do Colaborador:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDomainConfig(!showDomainConfig)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                    >
                      <Settings2 className="w-3 h-3" />
                      <span>Ajustar domínio</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteUrl}
                      className="flex-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2.5 font-mono select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors shadow-xs whitespace-nowrap shrink-0 ${
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
                <div className="flex items-start gap-2.5 text-xs text-slate-500 bg-blue-50/70 p-3 rounded-xl border border-blue-100">
                  <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p>
                    Em conformidade com a <strong>LGPD</strong>, o link dá acesso apenas aos dados e envio de documentos deste funcionário.
                  </p>
                </div>

                {/* Botões de Ação */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleWhatsApp}
                    className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <MessageCircle className="w-4 h-4 fill-current" />
                    <span>Enviar pelo WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenDirectly}
                    className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Acessar portal nesta tela</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Rodapé modal */}
          <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-400">
              {activeTab === 'recruitment_form'
                ? 'Mensagem personalizada pronta para envio'
                : 'Token de acesso individual gerado'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Modal do Simulador Mobile */}
      <MobileSimulatorModal
        admission={admission}
        isOpen={showSimulator}
        onClose={() => setShowSimulator(false)}
        publicUrl={effectiveOrigin}
      />
    </>
  );
};

