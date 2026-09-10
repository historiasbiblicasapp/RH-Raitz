import React, { useState } from 'react';
import { 
  X, 
  Send, 
  Copy, 
  Check, 
  RotateCw, 
  Clock, 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle,
  ExternalLink,
  Smartphone,
  Calendar,
  KeyRound,
  MessageCircle,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { Admission } from '../types/index.ts';

interface ManageInviteModalProps {
  admission: Admission;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedAdmission: Admission) => void;
  onOpenSimulator?: (url: string) => void;
}

export const ManageInviteModal: React.FC<ManageInviteModalProps> = ({
  admission,
  isOpen,
  onClose,
  onUpdate,
  onOpenSimulator
}) => {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [extendDays, setExtendDays] = useState<number>(15);

  if (!isOpen) return null;

  const origin = window.location.origin;
  const inviteUrl = `${origin}/convite/${admission.inviteToken}`;
  const isExpired = new Date(admission.inviteExpiresAt).getTime() < Date.now();
  const isRevoked = !!admission.inviteRevoked;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Tem certeza que deseja regenerar o link? O token anterior deixará de funcionar imediatamente.')) {
      return;
    }
    try {
      setLoading(true);
      setActionMessage(null);
      const res = await fetch(`/api/admissions/${admission.id}/invite/regenerate`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar novo convite.');
      
      setActionMessage({ type: 'success', text: 'Novo token e link de convite gerados com sucesso!' });
      onUpdate(data.admission);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleExtend = async (days: number) => {
    try {
      setLoading(true);
      setActionMessage(null);
      const res = await fetch(`/api/admissions/${admission.id}/invite`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extendDays: days, unrevoke: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao prorrogar convite.');

      setActionMessage({ type: 'success', text: `Validade prorrogada em +${days} dias com sucesso!` });
      onUpdate(data.admission);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRevoke = async () => {
    try {
      setLoading(true);
      setActionMessage(null);
      if (isRevoked) {
        // Reativar
        const res = await fetch(`/api/admissions/${admission.id}/invite`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unrevoke: true, extendDays: 7 })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao reativar convite.');
        setActionMessage({ type: 'success', text: 'Convite reativado com sucesso (+7 dias adicionados)!' });
        onUpdate(data.admission);
      } else {
        // Revogar
        const res = await fetch(`/api/admissions/${admission.id}/invite/revoke`, {
          method: 'POST'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao revogar convite.');
        setActionMessage({ type: 'success', text: 'Convite revogado com sucesso. O candidato não poderá mais entrar por este link.' });
        onUpdate(data.admission);
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = () => {
    const firstName = admission.employee.name.split(' ')[0];
    const text = encodeURIComponent(
      `Olá, ${firstName}! Aqui é da Galvanização Raitz.\n\n` +
      `Para darmos início ao seu processo de admissão digital para o cargo de ${admission.employee.role}, acesse o link seguro abaixo para conferir os dados e enviar os documentos solicitados:\n\n` +
      `${inviteUrl}\n\n` +
      `Em caso de qualquer dúvida, estamos à disposição!`
    );
    const cleanPhone = admission.employee.phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 border border-slate-200 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Gerenciar Convite e Acesso</h3>
              <p className="text-xs text-slate-500">
                {admission.employee.name} • {admission.employee.role}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback message */}
        {actionMessage && (
          <div className={`p-3 rounded-xl border flex items-center gap-2 ${
            actionMessage.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {actionMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{actionMessage.text}</span>
          </div>
        )}

        {/* Status do Convite */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">Status do Convite:</span>
            {isRevoked ? (
              <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold rounded-full text-[11px] flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                Revogado
              </span>
            ) : isExpired ? (
              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold rounded-full text-[11px] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Expirado
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[11px] flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Ativo e Válido
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
            <div>
              <span className="text-slate-400 block">Validade até:</span>
              <span className="font-semibold text-slate-800 font-mono">
                {new Date(admission.inviteExpiresAt).toLocaleDateString('pt-BR')} às{' '}
                {new Date(admission.inviteExpiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Acessos registrados:</span>
              <span className="font-semibold text-slate-800">
                {admission.accessCount || 0} vez(es)
                {admission.lastAccessedAt && ` (último em ${new Date(admission.lastAccessedAt).toLocaleDateString('pt-BR')})`}
              </span>
            </div>
          </div>
        </div>

        {/* Link do Convite com Copiar */}
        <div className="space-y-1.5">
          <label className="block font-semibold text-slate-700">Link Direto do Candidato</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-700 truncate select-all">
              {inviteUrl}
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span className="text-emerald-700">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Ações de Envio e Teste */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={openWhatsApp}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-3 rounded-xl transition-colors shadow-xs"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Enviar via WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenSimulator ? onOpenSimulator(inviteUrl) : window.open(inviteUrl, '_blank')}
            className="flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-semibold py-2.5 px-3 rounded-xl transition-colors"
          >
            <Smartphone className="w-4 h-4" />
            <span>Simulador Mobile</span>
          </button>
        </div>

        {/* Bloco de Gestão e CRUD de Convite */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Ações de Gestão de Validade e Token
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleExtend(7)}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center text-slate-700 transition-colors"
            >
              <Clock className="w-4 h-4 mx-auto mb-1 text-blue-600" />
              <span className="font-semibold block">+7 Dias</span>
              <span className="text-[10px] text-slate-400">Prorrogar</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleExtend(15)}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center text-slate-700 transition-colors"
            >
              <Clock className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
              <span className="font-semibold block">+15 Dias</span>
              <span className="text-[10px] text-slate-400">Prorrogar</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleExtend(30)}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center text-slate-700 transition-colors"
            >
              <Clock className="w-4 h-4 mx-auto mb-1 text-indigo-600" />
              <span className="font-semibold block">+30 Dias</span>
              <span className="text-[10px] text-slate-400">Prorrogar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={loading}
              onClick={handleRegenerate}
              className="flex items-center justify-center gap-1.5 p-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl font-semibold transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-700 ${loading ? 'animate-spin' : ''}`} />
              <span>Regenerar Novo Token</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={handleToggleRevoke}
              className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl font-semibold border transition-colors ${
                isRevoked 
                  ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-900' 
                  : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{isRevoked ? 'Reativar Acesso' : 'Revogar Acesso (Bloquear)'}</span>
            </button>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
