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
  Plus
} from 'lucide-react';
import { InviteItem, Admission } from '../types/index.ts';
import { ManageInviteModal } from '../components/ManageInviteModal.tsx';
import { EditAdmissionModal } from '../components/EditAdmissionModal.tsx';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal.tsx';
import { MobileSimulatorModal } from '../components/MobileSimulatorModal.tsx';
import { maskCPF } from '../lib/cpf.ts';

export const InvitesPage: React.FC = () => {
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ATIVO' | 'ACESSADO' | 'PENDENTE' | 'EXPIRADO' | 'REVOGADO'>('TODOS');
  
  // Feedback de cópia
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

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
      const res = await fetch('/api/invites');
      if (res.ok) {
        const data = await res.json();
        setInvites(data.invites || []);
      }
    } catch (err) {
      console.error('Erro ao buscar convites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/convite/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleOpenInviteManager = async (admissionId: string) => {
    try {
      const res = await fetch(`/api/admissions/${admissionId}`);
      if (res.ok) {
        const adm = await res.json();
        setSelectedAdmissionForInvite(adm);
      }
    } catch (err) {
      console.error('Erro ao buscar detalhes da admissão para o convite:', err);
    }
  };

  const handleOpenEditAdmission = async (admissionId: string) => {
    try {
      const res = await fetch(`/api/admissions/${admissionId}`);
      if (res.ok) {
        const adm = await res.json();
        setSelectedAdmissionForEdit(adm);
      }
    } catch (err) {
      console.error('Erro ao buscar admissão para edição:', err);
    }
  };

  const handleDeleteAdmission = async () => {
    if (!admissionToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/admissions/${admissionToDelete.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir cadastro.');
      }
      setAdmissionToDelete(null);
      fetchInvites();
    } catch (err: any) {
      alert(err.message || 'Falha ao excluir');
    } finally {
      setIsDeleting(false);
    }
  };

  const openWhatsApp = (invite: InviteItem) => {
    const link = `${window.location.origin}/convite/${invite.inviteToken}`;
    const firstName = invite.employeeName.split(' ')[0];
    const text = encodeURIComponent(
      `Olá, ${firstName}! Aqui é da Galvanização Raitz.\n\n` +
      `Para darmos início ao seu processo de admissão digital para o cargo de ${invite.employeeRole}, acesse o link seguro abaixo:\n\n` +
      `${link}\n\n` +
      `Qualquer dúvida, estamos à disposição!`
    );
    const cleanPhone = (invite.employeePhone || '').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank');
  };

  // Filtragem
  const filteredInvites = invites.filter((inv) => {
    const matchesSearch = 
      inv.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.employeeRole.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.employeeDepartment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.employeeCpf && inv.employeeCpf.includes(searchTerm.replace(/\D/g, ''))) ||
      (inv.employeePhone && inv.employeePhone.includes(searchTerm)) ||
      inv.inviteToken.toLowerCase().includes(searchTerm.toLowerCase());

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
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 transition-colors shadow-xs"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/nova-admissao')}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Admissão / Gerar Convite</span>
          </button>
        </div>
      </div>

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
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors ${
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
              const inviteLink = `${window.location.origin}/convite/${inv.inviteToken}`;
              const isCopied = copiedToken === inv.inviteToken;

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
                            CPF: {maskCPF(inv.employeeCpf || '')}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                          <span>{inv.employeeDepartment} • {inv.employeeUnit}</span>
                          <span>•</span>
                          <span>{inv.employeePhone}</span>
                          <span>•</span>
                          <span>{inv.employeeEmail}</span>
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
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors shrink-0"
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
                      <button
                        type="button"
                        onClick={() => openWhatsApp(inv)}
                        className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSimulatorUrl(inviteLink)}
                        className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Simulador</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenInviteManager(inv.admissionId)}
                        className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                        <span>Gerenciar Validade & Token</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditAdmission(inv.admissionId)}
                        className="flex items-center gap-1 text-slate-600 hover:text-blue-700 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Editar dados cadastrais do colaborador"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar Cadastro</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdmissionToDelete({ id: inv.admissionId, name: inv.employeeName })}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Excluir admissão e convite"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/admissoes/${inv.admissionId}`)}
                        className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-xs"
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
