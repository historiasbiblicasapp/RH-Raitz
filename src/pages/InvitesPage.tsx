import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  KeyRound, 
  Search, 
  Filter, 
  RefreshCw, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  Copy, 
  Check, 
  MessageCircle, 
  Smartphone, 
  Trash2, 
  Edit3, 
  ExternalLink,
  ChevronRight,
  User,
  Calendar,
  AlertTriangle,
  Send,
  Plus,
  Globe
} from 'lucide-react';
import { InviteItem, Admission } from '../types/index.ts';
import { ManageInviteModal } from '../components/ManageInviteModal.tsx';
import { EditAdmissionModal } from '../components/EditAdmissionModal.tsx';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal.tsx';
import { MobileSimulatorModal } from '../components/MobileSimulatorModal.tsx';
import { maskCPF } from '../lib/cpf.ts';
import { safeFetchJson } from '../lib/api.ts';
import { handleFallbackApiRoute } from '../lib/fallbackClient.ts';
import {
  buildInviteUrl,
  getSavedPublicUrl,
  setSavedPublicUrl,
  isPrivatePreviewUrl,
  resolvePublicOrigin,
  type SystemUrlConfig
} from '../lib/appUrl.ts';

export const InvitesPage: React.FC = () => {
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ATIVO' | 'ACESSADO' | 'PENDENTE' | 'EXPIRADO' | 'REVOGADO'>('TODOS');
  
  // Feedback de cópia e ações
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [extendingId, setExtendingId] = useState<string | null>(null);

  // Domínio público para compartilhamento externo
  const [systemConfig, setSystemConfig] = useState<SystemUrlConfig | null>(null);
  const [customBaseUrl, setCustomBaseUrl] = useState<string>(() => getSavedPublicUrl());
  const [urlDraft, setUrlDraft] = useState<string>(() => getSavedPublicUrl());
  const [showPublicUrlEditor, setShowPublicUrlEditor] = useState(false);

  // Modais de ação
  const [selectedAdmissionForInvite, setSelectedAdmissionForInvite] = useState<Admission | null>(null);
  const [selectedAdmissionForEdit, setSelectedAdmissionForEdit] = useState<Admission | null>(null);
  const [admissionToDelete, setAdmissionToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [simulatorUrl, setSimulatorUrl] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const data = await safeFetchJson<any>('/api/invites');
      if (data?.invites) {
        setInvites(data.invites || []);
      }
    } catch (err) {
      console.warn('Utilizando convites em fallback:', err);
      const fallback = handleFallbackApiRoute('/api/invites');
      if (fallback?.invites) {
        setInvites(fallback.invites);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
    safeFetchJson<SystemUrlConfig>('/api/system-config')
      .then((cfg) => {
        if (cfg) setSystemConfig(cfg);
      })
      .catch(() => {});
  }, []);

  const effectiveOrigin = customBaseUrl.trim() || resolvePublicOrigin(systemConfig);
  const isPrivateDomain = isPrivatePreviewUrl(effectiveOrigin);

  const handleSavePublicUrl = () => {
    const normalized = urlDraft.trim().replace(/\/$/, '');
    setSavedPublicUrl(normalized);
    setCustomBaseUrl(normalized);
    setShowPublicUrlEditor(false);
    setActionFeedback({
      type: 'success',
      text: normalized
        ? `Domínio público atualizado para ${normalized}.`
        : 'Domínio público personalizado removido; usando URL padrão.'
    });
  };

  const handleCopyLink = (token: string) => {
    const link = buildInviteUrl(token, customBaseUrl, systemConfig);
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleOpenInviteManager = async (admissionId: string) => {
    try {
      const adm = await safeFetchJson<any>(`/api/admissions/${admissionId}`);
      if (adm) {
        setSelectedAdmissionForInvite(adm);
      }
    } catch (err) {
      console.warn('Erro ao buscar admissão para convite:', err);
      const fallback = handleFallbackApiRoute(`/api/admissions/${admissionId}`);
      if (fallback) {
        setSelectedAdmissionForInvite(fallback);
      }
    }
  };

  const handleOpenEditAdmission = async (admissionId: string) => {
    try {
      const adm = await safeFetchJson<any>(`/api/admissions/${admissionId}`);
      if (adm) {
        setSelectedAdmissionForEdit(adm);
      }
    } catch (err) {
      console.warn('Erro ao buscar detalhes da admissão:', err);
      const fallback = handleFallbackApiRoute(`/api/admissions/${admissionId}`);
      if (fallback) {
        setSelectedAdmissionForEdit(fallback);
      }
    }
  };

  const handleExtendInvite = async (invite: InviteItem) => {
    try {
      setExtendingId(invite.admissionId);
      setActionFeedback(null);
      await safeFetchJson(`/api/admissions/${invite.admissionId}/invite`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expiresInDays: 15,
          reactivate: true
        })
      });
      await fetchInvites();
      setActionFeedback({
        type: 'success',
        text: `Convite de ${invite.employeeName} renovado por +15 dias e pronto para envio.`
      });
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: err.message || 'Não foi possível prorrogar a validade do convite.'
      });
    } finally {
      setExtendingId(null);
    }
  };

  const handleDeleteAdmission = async () => {
    if (!admissionToDelete) return;
    try {
      setIsDeleting(true);
      await safeFetchJson(`/api/admissions/${admissionToDelete.id}`, {
        method: 'DELETE'
      });
      setAdmissionToDelete(null);
      fetchInvites();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: err.message || 'Falha ao excluir cadastro.'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openWhatsApp = (invite: InviteItem) => {
    if (invite.inviteRevoked || invite.isExpired) {
      setActionFeedback({
        type: 'error',
        text: `O convite de ${invite.employeeName} está ${invite.inviteRevoked ? 'revogado' : 'expirado'} e apresentará erro ao candidato. Clique em "Prorrogar +15 dias" antes de enviar.`
      });
      return;
    }

    const cleanPhone = (invite.employeePhone || '').replace(/\D/g, '');
    if (!cleanPhone) {
      setActionFeedback({
        type: 'error',
        text: `O candidato ${invite.employeeName} não possui telefone cadastrado para WhatsApp.`
      });
      return;
    }

    const link = buildInviteUrl(invite.inviteToken, customBaseUrl, systemConfig);
    const firstName = invite.employeeName.split(' ')[0];
    const text = encodeURIComponent(
      `Olá, ${firstName}! Aqui é da Galvanização Raitz.\n\n` +
      `Para darmos início ao seu processo de admissão digital para o cargo de ${invite.employeeRole}, acesse o link seguro abaixo:\n\n` +
      `${link}\n\n` +
      `Qualquer dúvida, estamos à disposição!`
    );
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  // Filtragem
  const filteredInvites = invites.filter((inv) => {
    const cleanSearch = searchTerm.toLowerCase();
    const cleanDigits = searchTerm.replace(/\D/g, '');
    const matchesSearch = 
      inv.employeeName.toLowerCase().includes(cleanSearch) ||
      inv.employeeRole.toLowerCase().includes(cleanSearch) ||
      inv.employeeDepartment.toLowerCase().includes(cleanSearch) ||
      (cleanDigits && inv.employeeCpf && inv.employeeCpf.includes(cleanDigits)) ||
      (inv.employeePhone && inv.employeePhone.toLowerCase().includes(cleanSearch)) ||
      inv.inviteToken.toLowerCase().includes(cleanSearch);

    if (!matchesSearch) return false;

    if (statusFilter === 'ATIVO') return !inv.inviteRevoked && !inv.isExpired;
    if (statusFilter === 'ACESSADO') return inv.inviteAccessCount > 0 && !inv.inviteRevoked;
    if (statusFilter === 'PENDENTE') return !inv.inviteSentViaWhatsApp && !inv.inviteRevoked;
    if (statusFilter === 'EXPIRADO') return inv.isExpired && !inv.inviteRevoked;
    if (statusFilter === 'REVOGADO') return inv.inviteRevoked;

    return true;
  });

  // Contadores
  const activeCount = invites.filter(i => !i.inviteRevoked && !i.isExpired).length;
  const expiredCount = invites.filter(i => i.isExpired && !i.inviteRevoked).length;
  const revokedCount = invites.filter(i => i.inviteRevoked).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-xs border border-blue-200">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Gestão de Convites e Acessos</h1>
            <p className="text-xs text-slate-500">
              Controle completo de links, tokens de segurança, validade e permissões dos candidatos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInvites}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 transition-colors shadow-xs cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/admissoes/nova')}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Admissão / Gerar Convite</span>
          </button>
        </div>
      </div>

      {/* Alerta de URL Privada (ais-dev / localhost) */}
      {isPrivateDomain && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-950 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">
                  Link gerado em ambiente restrito ({effectiveOrigin.replace(/^https?:\/\//, '')})
                </p>
                <p className="text-amber-800 mt-0.5 leading-relaxed">
                  Endereços <code className="bg-amber-100 px-1 rounded">ais-dev-...</code> e <code className="bg-amber-100 px-1 rounded">localhost</code> exigem sessão privada e não abrem no celular do candidato. Configure abaixo a URL pública publicada do app para gerar links externos funcionais.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPublicUrlEditor((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-900 hover:bg-amber-950 text-white font-semibold rounded-xl shrink-0 self-start sm:self-center cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{showPublicUrlEditor ? 'Fechar' : 'Configurar URL Pública'}</span>
            </button>
          </div>

          {showPublicUrlEditor && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-amber-200">
              <input
                type="url"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="https://admissao.suaempresa.com.br"
                className="flex-1 bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={handleSavePublicUrl}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl cursor-pointer"
              >
                Salvar URL
              </button>
            </div>
          )}
        </div>
      )}

      {/* Feedback de ações */}
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
            actionFeedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span className="font-medium">{actionFeedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-xs font-bold underline shrink-0 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Cards de Métricas de Convites */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => setStatusFilter('TODOS')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'TODOS' ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold">Total de Convites</span>
            <KeyRound className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-2xl font-bold text-slate-900">{invites.length}</span>
        </div>

        <div 
          onClick={() => setStatusFilter('ATIVO')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'ATIVO' ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold">Ativos e Válidos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-bold text-emerald-700">{activeCount}</span>
        </div>

        <div 
          onClick={() => setStatusFilter('EXPIRADO')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'EXPIRADO' ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold">Expirados</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-2xl font-bold text-amber-700">{expiredCount}</span>
        </div>

        <div 
          onClick={() => setStatusFilter('REVOGADO')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'REVOGADO' ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold">Revogados</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-2xl font-bold text-rose-700">{revokedCount}</span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por candidato, cargo, CPF ou token..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600 font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['TODOS', 'ATIVO', 'ACESSADO', 'PENDENTE', 'EXPIRADO', 'REVOGADO'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === st 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'TODOS' ? 'Todos' :
               st === 'ATIVO' ? 'Ativos' :
               st === 'ACESSADO' ? 'Já Acessados' :
               st === 'PENDENTE' ? 'Pendentes de Envio' :
               st === 'EXPIRADO' ? 'Expirados' : 'Revogados'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Convites */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-blue-600" />
            Carregando convites do sistema...
          </div>
        ) : filteredInvites.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <KeyRound className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700 text-sm">Nenhum convite encontrado</p>
            <p className="text-slate-500 mt-0.5">Ajuste os filtros de busca ou cadastre uma nova admissão.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredInvites.map((inv) => {
              const inviteLink = buildInviteUrl(inv.inviteToken, customBaseUrl, systemConfig);
              const isCopied = copiedToken === inv.inviteToken;
              const isInactive = inv.inviteRevoked || inv.isExpired;

              return (
                <div key={inv.admissionId} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Dados do Candidato */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 font-bold text-sm flex items-center justify-center shrink-0">
                        {inv.employeeName ? inv.employeeName.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">{inv.employeeName}</span>
                          <span className="text-[11px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                            {inv.employeeRole}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            CPF: {inv.employeeCpf ? maskCPF(inv.employeeCpf) : 'Não informado'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                          <span>{inv.employeeDepartment} • {inv.employeeUnit}</span>
                          {inv.employeePhone && (
                            <>
                              <span>•</span>
                              <span>{inv.employeePhone}</span>
                            </>
                          )}
                          {inv.employeeEmail && (
                            <>
                              <span>•</span>
                              <span>{inv.employeeEmail}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      {inv.inviteRevoked ? (
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold rounded-full text-xs flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Revogado
                        </span>
                      ) : inv.isExpired ? (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold rounded-full text-xs flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Expirado
                        </span>
                      ) : inv.inviteAccessCount > 0 ? (
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-bold rounded-full text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Acessado ({inv.inviteAccessCount}x)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Ativo e Válido
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Informações do Token e Link */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Link Seguro:</span>
                      <span className="font-mono text-[11px] text-slate-700 truncate select-all bg-white px-2 py-1 rounded-md border border-slate-200 flex-1">
                        {inviteLink}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyLink(inv.inviteToken)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors shrink-0 cursor-pointer"
                        title="Copiar link do convite"
                      >
                        {isCopied ? (
                          <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 shrink-0">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Validade: {new Date(inv.inviteExpiresAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  {/* Botões de Ação do Convite (CRUD) */}
                  <div className="flex items-center justify-between gap-2 pt-1 text-xs flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isInactive ? (
                        <button
                          type="button"
                          onClick={() => handleExtendInvite(inv)}
                          disabled={extendingId === inv.admissionId}
                          className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${extendingId === inv.admissionId ? 'animate-spin' : ''}`} />
                          <span>{inv.inviteRevoked ? 'Reativar +15 dias' : 'Prorrogar +15 dias'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openWhatsApp(inv)}
                          className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSimulatorUrl(inviteLink)}
                        className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-3 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Simulador</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenInviteManager(inv.admissionId)}
                        className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                        <span>Gerenciar Validade & Token</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditAdmission(inv.admissionId)}
                        className="flex items-center gap-1 text-slate-600 hover:text-blue-700 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Editar dados cadastrais do colaborador"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar Cadastro</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdmissionToDelete({ id: inv.admissionId, name: inv.employeeName })}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir admissão e convite"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/admissoes/${inv.admissionId}`)}
                        className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-xs cursor-pointer"
                      >
                        <span>Ver Admissão</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Gestão do Convite */}
      {selectedAdmissionForInvite && (
        <ManageInviteModal
          admission={selectedAdmissionForInvite}
          isOpen={!!selectedAdmissionForInvite}
          onClose={() => setSelectedAdmissionForInvite(null)}
          onUpdate={(updated) => {
            setSelectedAdmissionForInvite(updated);
            fetchInvites();
          }}
          onOpenSimulator={(url) => setSimulatorUrl(url)}
        />
      )}

      {/* Modal de Edição de Cadastro */}
      {selectedAdmissionForEdit && (
        <EditAdmissionModal
          admission={selectedAdmissionForEdit}
          isOpen={!!selectedAdmissionForEdit}
          onClose={() => setSelectedAdmissionForEdit(null)}
          onSuccess={() => {
            fetchInvites();
          }}
        />
      )}

      {/* Modal de Exclusão de Cadastro */}
      {admissionToDelete && (
        <DeleteConfirmModal
          isOpen={!!admissionToDelete}
          title="Excluir Admissão e Convite"
          description="Esta ação removerá permanentemente o cadastro do colaborador, histórico de convites e todos os documentos enviados associados a este processo. Tem certeza que deseja prosseguir?"
          itemName={admissionToDelete.name}
          confirmLabel="Sim, Excluir Cadastro"
          isDeleting={isDeleting}
          onClose={() => setAdmissionToDelete(null)}
          onConfirm={handleDeleteAdmission}
        />
      )}

      {/* Simulador Mobile */}
      {simulatorUrl && (
        <MobileSimulatorModal
          isOpen={!!simulatorUrl}
          onClose={() => setSimulatorUrl(null)}
          initialUrl={simulatorUrl}
        />
      )}
    </div>
  );
};
