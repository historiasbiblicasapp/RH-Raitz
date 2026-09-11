import React, { useState } from 'react';
import { 
  X, 
  RotateCw, 
  ExternalLink, 
  Smartphone, 
  Copy, 
  Check, 
  ShieldCheck, 
  Sparkles,
  Maximize2
} from 'lucide-react';
import { Admission } from '../types/index.ts';

interface MobileSimulatorModalProps {
  admission?: Admission | null;
  isOpen: boolean;
  onClose: () => void;
  publicUrl?: string;
  initialUrl?: string;
}

export const MobileSimulatorModal: React.FC<MobileSimulatorModalProps> = ({
  admission,
  isOpen,
  onClose,
  publicUrl,
  initialUrl
}) => {
  const [iframeKey, setIframeKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [deviceModel, setDeviceModel] = useState<'iphone' | 'compact'>('iphone');

  if (!isOpen || (!admission && !initialUrl)) return null;

  const localInvitePath = admission 
    ? `/convite/${admission.inviteToken}` 
    : (initialUrl ? (initialUrl.startsWith('http') ? new URL(initialUrl).pathname : initialUrl) : '');
  const effectiveBaseUrl = publicUrl || window.location.origin;
  const fullInviteUrl = initialUrl || `${effectiveBaseUrl}${localInvitePath}`;

  const candidateName = admission?.employee?.name || 'Novo Colaborador';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullInviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleReload = () => {
    setIframeKey(prev => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[96vh] flex flex-col overflow-hidden text-white">
        {/* Barra superior de controle do simulador */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Simulador Mobile
                </span>
                <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Online e Interativo
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Visão do Candidato: {candidateName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Seletor de dispositivo */}
            <div className="hidden sm:flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setDeviceModel('iphone')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  deviceModel === 'iphone' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Smartphone (380px)
              </button>
              <button
                type="button"
                onClick={() => setDeviceModel('compact')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  deviceModel === 'compact' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Compacto (340px)
              </button>
            </div>

            {/* Recarregar */}
            <button
              type="button"
              onClick={handleReload}
              title="Recarregar tela do celular"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Abrir tela cheia */}
            <a
              href={localInvitePath}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir em aba inteira"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors hidden sm:flex items-center justify-center"
            >
              <Maximize2 className="w-4 h-4" />
            </a>

            {/* Fechar */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Área central com Mockup do Smartphone */}
        <div className="flex-1 overflow-y-auto bg-slate-950/90 p-4 sm:p-6 flex flex-col items-center justify-center">
          {/* Mockup do Celular com Borda e Ilha Dinâmica */}
          <div 
            className={`transition-all duration-300 bg-slate-900 border-[8px] sm:border-[10px] border-slate-800 rounded-[44px] shadow-2xl overflow-hidden relative flex flex-col ${
              deviceModel === 'iphone' ? 'w-[380px] max-w-full h-[680px]' : 'w-[340px] max-w-full h-[620px]'
            }`}
          >
            {/* Notch / Speaker / Camera */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center pointer-events-none">
              <div className="w-24 h-4 bg-slate-950 rounded-full flex items-center justify-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-950" />
              </div>
            </div>

            {/* Barra de status mobile simulada */}
            <div className="h-7 bg-white border-b border-slate-100 flex items-center justify-between px-6 text-[10px] font-semibold text-slate-800 shrink-0 z-20">
              <span>09:41</span>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="text-[9px]">5G</span>
                <div className="w-4 h-2 border border-slate-700 rounded-xs p-0.5 flex items-center">
                  <div className="w-full h-full bg-slate-800 rounded-2xs" />
                </div>
              </div>
            </div>

            {/* IFRAME com a aplicação real do funcionário */}
            <div className="flex-1 bg-white relative overflow-hidden">
              <iframe
                key={iframeKey}
                src={localInvitePath}
                title="Portal do Colaborador"
                className="w-full h-full border-0"
              />
            </div>

            {/* Barra Home Indicator do celular */}
            <div className="h-4 bg-white flex items-center justify-center shrink-0">
              <div className="w-28 h-1 bg-slate-300 rounded-full" />
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-4 text-center max-w-md">
            💡 Este simulador renderiza em tempo real o portal de admissão do colaborador. Você pode aceitar os termos da LGPD, conferir os dados e fazer upload de documentos para testar o fluxo de ponta a ponta.
          </p>
        </div>

        {/* Rodapé informativo com opções de link */}
        <div className="px-5 py-3.5 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-400 text-center sm:text-left">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="line-clamp-1">
              Token de acesso individual: <strong className="text-slate-200 font-mono">{admission.inviteToken.slice(0, 16)}...</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopy}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shadow-xs ${
                copied ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Link Copiado!' : 'Copiar Link Completo'}</span>
            </button>

            <a
              href={localInvitePath}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-3.5 rounded-xl transition-colors shrink-0 shadow-xs"
            >
              <span>Abrir em Nova Aba</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
