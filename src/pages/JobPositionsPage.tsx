import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Power, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Check, 
  Tag, 
  Clock, 
  RefreshCw,
  FileSpreadsheet,
  ShieldAlert,
  ListChecks
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { JobPosition } from '../types/index.ts';
import { safeFetchJson } from '../lib/api.ts';
import { JobPositionModal } from '../components/JobPositionModal.tsx';
import { JobPositionStatusModal } from '../components/JobPositionStatusModal.tsx';
import { CreateJobPositionWithChecklistModal } from '../components/CreateJobPositionWithChecklistModal.tsx';

type StatusFilter = 'all' | 'active' | 'inactive';

export const JobPositionsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Lista de cargos e estados de dados
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active'); // Padrão: Ativos
  
  // Mensagens de feedback
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isCreateCargoWithChecklistOpen, setIsCreateCargoWithChecklistOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<JobPosition | null>(null);

  const [statusModalState, setStatusModalState] = useState<{
    isOpen: boolean;
    position: JobPosition | null;
    targetActive: boolean;
    isLoading: boolean;
  }>({
    isOpen: false,
    position: null,
    targetActive: false,
    isLoading: false
  });

  // Verificação de permissões do usuário
  const isAuthorized = user ? ['ADMIN', 'RH', 'GESTOR'].includes(user.role) : false;

  // Carrega cargos do backend
  const fetchPositions = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      // Busca todos para permitir filtragem local instantânea sem recarregamento
      const data = await safeFetchJson<{ jobPositions: JobPosition[] }>('/api/job-positions?status=all');
      setPositions(data.jobPositions || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao carregar a lista de cargos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  // Exibe toast temporário de sucesso
  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4500);
  };

  // Filtragem e pesquisa em tempo real no cliente
  const filteredPositions = useMemo(() => {
    return positions.filter((pos) => {
      // Filtro de status
      if (statusFilter === 'active' && !pos.active) return false;
      if (statusFilter === 'inactive' && pos.active) return false;

      // Filtro de busca textual (nome ou código)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = pos.name.toLowerCase().includes(q);
        const matchesCode = pos.code ? pos.code.toLowerCase().includes(q) : false;
        const matchesDesc = pos.description ? pos.description.toLowerCase().includes(q) : false;
        return matchesName || matchesCode || matchesDesc;
      }

      return true;
    });
  }, [positions, statusFilter, searchQuery]);

  // Abertura de modal para novo cargo
  const handleOpenCreateModal = () => {
    setEditingPosition(null);
    setIsFormModalOpen(true);
  };

  // Abertura de modal para edição
  const handleOpenEditModal = (pos: JobPosition) => {
    setEditingPosition(pos);
    setIsFormModalOpen(true);
  };

  // Salvar cargo (novo ou edição)
  const handleSavePosition = async (formData: { 
    name: string; 
    code?: string; 
    description?: string; 
    active: boolean; 
  }) => {
    if (editingPosition) {
      // Edição
      const res = await safeFetchJson<{ jobPosition: JobPosition; message: string }>(
        `/api/job-positions/${editingPosition.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        }
      );
      
      setPositions((prev) => 
        prev.map((p) => (p.id === editingPosition.id ? res.jobPosition : p))
      );
      showToast('Cargo atualizado com sucesso.');
    } else {
      // Criação
      const res = await safeFetchJson<{ jobPosition: JobPosition; message: string }>(
        '/api/job-positions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        }
      );
      
      setPositions((prev) => [res.jobPosition, ...prev]);
      showToast('Cargo cadastrado com sucesso.');
    }
  };

  // Solicitar desativação
  const handleRequestDeactivate = (pos: JobPosition) => {
    setStatusModalState({
      isOpen: true,
      position: pos,
      targetActive: false,
      isLoading: false
    });
  };

  // Solicitar ativação
  const handleRequestActivate = (pos: JobPosition) => {
    setStatusModalState({
      isOpen: true,
      position: pos,
      targetActive: true,
      isLoading: false
    });
  };

  // Confirmar alteração de status (ativar/desativar)
  const handleConfirmStatusToggle = async () => {
    const { position, targetActive } = statusModalState;
    if (!position) return;

    setStatusModalState((prev) => ({ ...prev, isLoading: true }));
    try {
      const res = await safeFetchJson<{ jobPosition: JobPosition; message: string }>(
        `/api/job-positions/${position.id}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: targetActive })
        }
      );

      setPositions((prev) => 
        prev.map((p) => (p.id === position.id ? res.jobPosition : p))
      );

      setStatusModalState({ isOpen: false, position: null, targetActive: false, isLoading: false });
      showToast(targetActive ? 'Cargo ativado com sucesso.' : 'Cargo desativado com sucesso.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao alterar o status do cargo.');
      setStatusModalState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Formatação amigável de data
  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast de Sucesso Flutuante */}
      {successToast && (
        <div 
          id="toast-cargo-success"
          className="fixed top-5 right-5 z-50 bg-emerald-700 text-white px-4 py-3 rounded-2xl shadow-xl border border-emerald-600/30 flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-3 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <span>Cadastros</span>
            <span>•</span>
            <span>Módulo Administrativo</span>
          </div>
          <h1 id="page-title-cargos" className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-blue-600" />
            <span>Cargos</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cadastre e gerencie os cargos utilizados nas admissões.
          </p>
        </div>

        {isAuthorized && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="btn-novo-cargo-com-checklist"
              onClick={() => setIsCreateCargoWithChecklistOpen(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Cadastrar novo cargo e marcar quais documentos são exigidos no checklist"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Cargo & Checklist</span>
            </button>

            <button
              type="button"
              id="btn-novo-cargo"
              onClick={handleOpenCreateModal}
              className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-2xs transition-colors cursor-pointer"
              title="Cadastro rápido de cargo"
            >
              <span>Cargo Simples</span>
            </button>
          </div>
        )}
      </div>

      {/* Alerta de permissão restrita, se aplicável */}
      {!isAuthorized && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Seu perfil de usuário possui acesso somente para leitura deste catálogo de cargos.
          </span>
        </div>
      )}

      {/* Mensagem de Erro Geral */}
      {errorMessage && (
        <div 
          id="cargo-error-banner"
          className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-medium flex items-center justify-between gap-3 animate-in fade-in"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-800 p-1 font-bold text-xs"
          >
            Dispensar
          </button>
        </div>
      )}

      {/* Barra de Filtros e Pesquisa */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Campo de Pesquisa em Tempo Real */}
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="search-cargos-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar cargo por nome ou código..."
            className="w-full pl-10 pr-9 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-900 placeholder:text-slate-400 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs"
              title="Limpar pesquisa"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtro de Status (Todos, Ativos, Inativos) */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-start md:justify-end">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </span>
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              id="filter-status-active"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ativos ({positions.filter((p) => p.active).length})
            </button>
            <button
              type="button"
              id="filter-status-inactive"
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === 'inactive'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inativos ({positions.filter((p) => !p.active).length})
            </button>
            <button
              type="button"
              id="filter-status-all"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({positions.length})
            </button>
          </div>

          <button
            type="button"
            onClick={fetchPositions}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer ml-1"
            title="Recarregar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Conteúdo Principal: Tabela ou Estados Vazios */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          // Estado Carregando (Skeleton)
          <div className="p-8 space-y-4">
            <div className="h-4 bg-slate-100 rounded-md w-1/4 animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-slate-50 rounded-xl w-full animate-pulse border border-slate-100" />
              ))}
            </div>
          </div>
        ) : positions.length === 0 ? (
          // Sem cargos cadastrados no sistema
          <div id="empty-state-no-cargos" className="p-12 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
              <Briefcase className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Nenhum cargo cadastrado.</h3>
              <p className="text-xs text-slate-500 mt-1">
                Cadastre os cargos da empresa para que possam ser selecionados durante a criação de novas admissões.
              </p>
            </div>
            {isAuthorized && (
              <button
                type="button"
                id="btn-cadastrar-primeiro-cargo"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar primeiro cargo</span>
              </button>
            )}
          </div>
        ) : filteredPositions.length === 0 ? (
          // Nenhum resultado na busca
          <div id="empty-state-no-results" className="p-12 text-center max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Nenhum cargo encontrado para esta busca.</h3>
              <p className="text-xs text-slate-500 mt-1">
                Verifique os termos digitados no campo de busca ou altere o filtro de status selecionado.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
            >
              Limpar busca e filtros
            </button>
          </div>
        ) : (
          // Tabela Completa de Cargos
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="table-cargos">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th scope="col" className="py-3.5 px-4 sm:px-6">Cargo</th>
                  <th scope="col" className="py-3.5 px-4">Código</th>
                  <th scope="col" className="py-3.5 px-4 hidden md:table-cell">Descrição</th>
                  <th scope="col" className="py-3.5 px-4">Status</th>
                  <th scope="col" className="py-3.5 px-4 hidden lg:table-cell">Atualizado em</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPositions.map((pos) => (
                  <tr 
                    key={pos.id}
                    id={`cargo-row-${pos.id}`}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      !pos.active ? 'bg-slate-50/40 text-slate-400' : ''
                    }`}
                  >
                    {/* Cargo (Nome) */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            pos.active 
                              ? 'bg-blue-50 text-blue-700' 
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div>
                          <span 
                            className={`font-bold block ${
                              pos.active ? 'text-slate-900' : 'text-slate-500 line-through'
                            }`}
                          >
                            {pos.name}
                          </span>
                          {pos.description && (
                            <span className="text-[11px] text-slate-400 block md:hidden line-clamp-1 mt-0.5">
                              {pos.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Código */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {pos.code ? (
                        <span className="inline-flex items-center gap-1 font-mono font-semibold text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                          <Tag className="w-3 h-3 text-slate-400" />
                          <span>{pos.code}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">—</span>
                      )}
                    </td>

                    {/* Descrição */}
                    <td className="py-3.5 px-4 hidden md:table-cell text-slate-600 max-w-xs truncate">
                      {pos.description ? (
                        <span title={pos.description}>{pos.description}</span>
                      ) : (
                        <span className="text-slate-400 italic">Sem descrição</span>
                      )}
                    </td>

                    {/* Status (Ativo / Inativo) */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {pos.active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Ativo</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          <span>Inativo</span>
                        </span>
                      )}
                    </td>

                    {/* Atualizado em */}
                    <td className="py-3.5 px-4 hidden lg:table-cell whitespace-nowrap text-slate-500 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(pos.updatedAt || pos.createdAt)}</span>
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {isAuthorized ? (
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão Checklist de Documentos do Cargo */}
                          <button
                            type="button"
                            id={`btn-checklist-cargo-${pos.id}`}
                            onClick={() => navigate(`/cadastros/checklists?cargo=${pos.id}`)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Configurar checklist de documentos"
                            aria-label={`Configurar checklist de documentos para ${pos.name}`}
                          >
                            <ListChecks className="w-3.5 h-3.5" />
                          </button>

                          {/* Botão Editar */}
                          <button
                            type="button"
                            id={`btn-edit-cargo-${pos.id}`}
                            onClick={() => handleOpenEditModal(pos)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Editar informações do cargo"
                            aria-label={`Editar cargo ${pos.name}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Botão Desativar / Ativar */}
                          {pos.active ? (
                            <button
                              type="button"
                              id={`btn-deactivate-cargo-${pos.id}`}
                              onClick={() => handleRequestDeactivate(pos)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Desativar cargo (preserva admissões existentes)"
                              aria-label={`Desativar cargo ${pos.name}`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              id={`btn-activate-cargo-${pos.id}`}
                              onClick={() => handleRequestActivate(pos)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Ativar cargo para novas admissões"
                              aria-label={`Ativar cargo ${pos.name}`}
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Visualização</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé informativo da Tabela */}
        <div className="p-4 bg-slate-50/75 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Mostrando <strong>{filteredPositions.length}</strong> de <strong>{positions.length}</strong> cargos cadastrados
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Preservação de histórico ativo</span>
            <span>•</span>
            <span>Conforme Bloco 3.1 da Parte 3</span>
          </div>
        </div>
      </div>

      {/* Modal de Cadastro / Edição de Cargo */}
      <JobPositionModal
        isOpen={isFormModalOpen}
        positionToEdit={editingPosition}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSavePosition}
      />

      {/* Modal de Confirmação de Status (Desativação / Reativação) */}
      <JobPositionStatusModal
        isOpen={statusModalState.isOpen}
        position={statusModalState.position}
        targetActive={statusModalState.targetActive}
        isLoading={statusModalState.isLoading}
        onClose={() => setStatusModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmStatusToggle}
      />

      {/* Modal de Novo Cargo com Configuração do Checklist de Documentos */}
      <CreateJobPositionWithChecklistModal
        isOpen={isCreateCargoWithChecklistOpen}
        onClose={() => setIsCreateCargoWithChecklistOpen(false)}
        onSuccess={(newPos, newDocs) => {
          setIsCreateCargoWithChecklistOpen(false);
          setPositions((prev) => [newPos, ...prev]);
          showToast(`Cargo "${newPos.name}" criado com sucesso com ${newDocs.length} documento(s) configurado(s) no checklist!`);
        }}
      />
    </div>
  );
};
