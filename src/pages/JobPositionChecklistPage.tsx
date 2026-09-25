import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  ListChecks, 
  Plus, 
  Search, 
  Briefcase, 
  FileText, 
  ArrowUp, 
  ArrowDown, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  Sparkles, 
  Check, 
  X, 
  Filter,
  Info,
  Layers,
  ChevronRight
} from 'lucide-react';
import { JobPosition, JobPositionDocument, DocumentTypeItem } from '../types/index.ts';
import { safeFetchJson } from '../lib/api.ts';
import { AddJobPositionDocumentModal } from '../components/AddJobPositionDocumentModal.tsx';
import { EditJobPositionDocumentModal } from '../components/EditJobPositionDocumentModal.tsx';
import { RemoveJobPositionDocModal } from '../components/RemoveJobPositionDocModal.tsx';
import { CreateJobPositionWithChecklistModal } from '../components/CreateJobPositionWithChecklistModal.tsx';

export const JobPositionChecklistPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialCargoId = searchParams.get('cargo') || '';

  // Estado de cargos
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [loadingPositions, setLoadingPositions] = useState<boolean>(true);
  const [selectedPositionId, setSelectedPositionId] = useState<string>(initialCargoId);

  // Estado de documentos do cargo selecionado
  const [documents, setDocuments] = useState<JobPositionDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modais
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isCreateCargoModalOpen, setIsCreateCargoModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<JobPositionDocument | null>(null);
  const [removingItem, setRemovingItem] = useState<JobPositionDocument | null>(null);

  // Notificações / Mensagens
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [reordering, setReordering] = useState<boolean>(false);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(prev => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const handleCargoCreatedWithChecklist = (newPosition: JobPosition, newDocuments: JobPositionDocument[]) => {
    setJobPositions(prev => {
      const exists = prev.some(p => p.id === newPosition.id);
      return exists ? prev.map(p => p.id === newPosition.id ? newPosition : p) : [...prev, newPosition];
    });
    setSelectedPositionId(newPosition.id);
    if (newDocuments && newDocuments.length > 0) {
      setDocuments(newDocuments);
    } else {
      loadDocumentsForPosition(newPosition.id, filterStatus);
    }
    showToast('success', `Cargo "${newPosition.name}" cadastrado com sucesso com ${newDocuments.length} documento(s) configurado(s)!`);
  };

  // Carrega a lista de cargos ativos
  const loadJobPositions = async () => {
    setLoadingPositions(true);
    try {
      const res = await safeFetchJson<{ jobPositions: JobPosition[] }>('/api/job-positions?status=all');
      if (res && res.jobPositions) {
        setJobPositions(res.jobPositions);
        // Se ainda não houver cargo selecionado, seleciona o primeiro cargo ativo
        if (!selectedPositionId && res.jobPositions.length > 0) {
          const firstActive = res.jobPositions.find(p => p.active) || res.jobPositions[0];
          setSelectedPositionId(firstActive.id);
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar cargos:', err);
      showToast('error', 'Não foi possível carregar a lista de cargos.');
    } finally {
      setLoadingPositions(false);
    }
  };

  useEffect(() => {
    loadJobPositions();
  }, []);

  // Carrega os documentos vinculados ao cargo selecionado
  const loadDocumentsForPosition = async (positionId: string, status: 'all' | 'active' | 'inactive' = filterStatus) => {
    if (!positionId) {
      setDocuments([]);
      return;
    }

    setLoadingDocuments(true);
    try {
      const res = await safeFetchJson<{ jobPosition: JobPosition; documents: JobPositionDocument[] }>(
        `/api/job-positions/${positionId}/documents?status=${status}`
      );
      if (res && res.documents) {
        setDocuments(res.documents);
      }
    } catch (err: any) {
      console.error('Erro ao carregar checklist do cargo:', err);
      showToast('error', 'Erro ao carregar os documentos configurados para este cargo.');
    } finally {
      setLoadingDocuments(false);
    }
  };

  useEffect(() => {
    if (selectedPositionId) {
      loadDocumentsForPosition(selectedPositionId, filterStatus);
    } else {
      setDocuments([]);
    }
  }, [selectedPositionId, filterStatus]);

  // Cargo selecionado
  const currentPosition = useMemo(() => {
    return jobPositions.find(p => p.id === selectedPositionId);
  }, [jobPositions, selectedPositionId]);

  // Lista filtrada pelo termo de busca
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const name = doc.document_type?.name?.toLowerCase() || '';
      const cat = doc.document_type?.category?.toLowerCase() || '';
      const inst = doc.instructions?.toLowerCase() || '';
      const term = searchTerm.toLowerCase();
      return name.includes(term) || cat.includes(term) || inst.includes(term);
    });
  }, [documents, searchTerm]);

  // Métricas do cargo
  const stats = useMemo(() => {
    const activeDocs = documents.filter(d => d.active);
    const requiredCount = activeDocs.filter(d => d.required).length;
    const optionalCount = activeDocs.filter(d => !d.required).length;
    return {
      total: activeDocs.length,
      required: requiredCount,
      optional: optionalCount
    };
  }, [documents]);

  // Alternar rapidamente entre Obrigatório e Opcional
  const handleToggleRequired = async (item: JobPositionDocument) => {
    try {
      const newRequired = !item.required;
      const res = await safeFetchJson<{ document: JobPositionDocument; message: string }>(
        `/api/job-position-documents/${item.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ required: newRequired })
        }
      );

      if (res && res.document) {
        setDocuments(prev => prev.map(d => d.id === item.id ? res.document : d));
        showToast('success', `Documento "${item.document_type?.name}" agora é ${newRequired ? 'Obrigatório' : 'Opcional'}.`);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao alterar obrigatoriedade do documento.');
    }
  };

  // Reordenação: Mover documento para cima ou para baixo
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    if (reordering) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredDocuments.length) return;

    setReordering(true);
    const newItems = [...filteredDocuments];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    const orderedIds = newItems.map(d => d.id);

    // Otimisticamente atualiza a UI
    setDocuments(prev => {
      const map = new Map(newItems.map((item, idx) => [item.id, idx + 1]));
      return prev.map(item => {
        if (map.has(item.id)) {
          return { ...item, sort_order: map.get(item.id)! };
        }
        return item;
      }).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    });

    try {
      const res = await safeFetchJson<{ documents: JobPositionDocument[]; message: string }>(
        `/api/job-positions/${selectedPositionId}/documents/reorder`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedIds })
        }
      );

      if (res && res.documents) {
        setDocuments(res.documents);
        showToast('success', 'Ordem dos documentos atualizada com sucesso.');
      }
    } catch (err: any) {
      showToast('error', 'Erro ao salvar a nova ordem dos documentos.');
      if (selectedPositionId) {
        loadDocumentsForPosition(selectedPositionId, filterStatus);
      }
    } finally {
      setReordering(false);
    }
  };

  // Semear cenários padrão (Eletricista com NR10/NR35 e Auxiliar Administrativo)
  const handleSeedDefaults = async () => {
    try {
      setLoadingDocuments(true);
      const res = await safeFetchJson<{ documents: JobPositionDocument[]; message: string }>(
        '/api/job-position-documents/seed',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      showToast('success', res.message || 'Checklists padrão gerados com sucesso!');
      if (selectedPositionId) {
        await loadDocumentsForPosition(selectedPositionId, filterStatus);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao gerar checklists padrão.');
    } finally {
      setLoadingDocuments(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast flutuante de notificação */}
      {toastMessage && (
        <div 
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-in slide-in-from-top-3 duration-200 ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : toastMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
          {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          {toastMessage.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
          <span>{toastMessage.text}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="ml-2 p-0.5 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Cadastros & Configurações</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ListChecks className="w-6 h-6 text-blue-600" />
            Checklist de Documentos por Cargo
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure quais documentos devem ser solicitados ao candidato para cada cargo durante o processo admissional.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-create-cargo-with-checklist"
            onClick={() => setIsCreateCargoModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cargo & Checklist</span>
          </button>

          {documents.length === 0 && (
            <button
              type="button"
              id="btn-seed-checklists"
              onClick={handleSeedDefaults}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
              title="Carregar configuração recomendada para Eletricista e Auxiliar Administrativo"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Gerar Cenários Padrão</span>
            </button>
          )}

          {currentPosition && currentPosition.active && (
            <button
              type="button"
              id="btn-add-document-to-cargo"
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Adicionar Documento Avulso</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Seleção de Cargo */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
            <label htmlFor="select-cargo" className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-blue-600" />
              Selecione o Cargo:
            </label>

            <div className="relative flex-1 max-w-md">
              <select
                id="select-cargo"
                value={selectedPositionId}
                onChange={(e) => setSelectedPositionId(e.target.value)}
                disabled={loadingPositions}
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {loadingPositions ? (
                  <option value="">Carregando cargos...</option>
                ) : jobPositions.length === 0 ? (
                  <option value="">Nenhum cargo cadastrado no sistema</option>
                ) : (
                  jobPositions.map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.name} {pos.code ? `(${pos.code})` : ''} {!pos.active ? '[INATIVO]' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <button
              type="button"
              id="btn-quick-new-cargo"
              onClick={() => setIsCreateCargoModalOpen(true)}
              className="px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-2xs"
              title="Cadastrar um novo cargo e definir seus documentos exigidos"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Cargo</span>
            </button>

            {currentPosition && (
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full ${
                  currentPosition.active 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {currentPosition.active ? 'Cargo Ativo' : 'Cargo Inativo'}
                </span>
                {currentPosition.code && (
                  <span className="px-2.5 py-1 text-[11px] font-mono font-medium bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                    Cód: {currentPosition.code}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Filtros secundários do checklist */}
          <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setFilterStatus('active')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  filterStatus === 'active'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ativos
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({documents.length})
              </button>
            </div>
          </div>
        </div>

        {/* Alerta caso o cargo esteja inativo */}
        {currentPosition && !currentPosition.active && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Este cargo está inativo.</span>
              <p className="mt-0.5 text-amber-700">
                Você pode visualizar o histórico de documentos configurados, mas novas admissões não poderão ser abertas para cargos inativos até que ele seja reativado no cadastro de cargos.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo Principal */}
      {!selectedPositionId ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <ListChecks className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Selecione um cargo</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Escolha um cargo na lista acima para visualizar e personalizar a lista de documentos necessários para admissão.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Métricas Rápidas do Checklist do Cargo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Total de Documentos</span>
                <span className="text-xl font-bold text-slate-900">{stats.total}</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Documentos Obrigatórios</span>
                <span className="text-xl font-bold text-blue-700">{stats.required}</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Documentos Opcionais</span>
                <span className="text-xl font-bold text-slate-700">{stats.optional}</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Barra de Busca dentro do Checklist */}
          {documents.length > 3 && (
            <div className="relative max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por nome, categoria ou instruções..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          )}

          {/* Tabela de Documentos do Cargo */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            {loadingDocuments ? (
              <div className="py-16 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Carregando documentos do cargo...
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Nenhum documento configurado para este cargo
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  {searchTerm 
                    ? 'Nenhum documento coincide com os filtros da busca.' 
                    : 'Adicione os documentos que os colaboradores contratados para este cargo devem enviar no checklist.'}
                </p>

                {currentPosition?.active && !searchTerm && (
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Primeiro Documento
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3 text-center w-14">Ordem</th>
                      <th className="py-3 px-4 min-w-[180px]">Tipo de Documento</th>
                      <th className="py-3 px-3 min-w-[110px]">Categoria</th>
                      <th className="py-3 px-3 min-w-[110px]">Obrigatoriedade</th>
                      <th className="py-3 px-4 min-w-[200px]">Instruções para o Cargo</th>
                      <th className="py-3 px-3 text-center w-20">Status</th>
                      <th className="py-3 px-4 text-right min-w-[140px]">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDocuments.map((item, index) => {
                      const docType = item.document_type;
                      const isGlobalActive = docType?.active !== false;

                      return (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-slate-50/60 transition-colors ${
                            !item.active ? 'bg-slate-50/40 opacity-70' : ''
                          }`}
                        >
                          {/* Ordem com botões para subir/descer */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className="font-mono font-bold text-slate-700 w-5 text-center">
                                {item.sort_order || index + 1}
                              </span>
                              <div className="flex flex-col">
                                <button
                                  type="button"
                                  title="Subir ordem"
                                  disabled={index === 0 || reordering}
                                  onClick={() => handleMoveOrder(index, 'up')}
                                  className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  title="Descer ordem"
                                  disabled={index === filteredDocuments.length - 1 || reordering}
                                  onClick={() => handleMoveOrder(index, 'down')}
                                  className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Nome e descrição do documento */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span>{docType?.name || 'Documento não identificado'}</span>
                              {!isGlobalActive && (
                                <span 
                                  className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-semibold rounded-sm"
                                  title="Este documento foi desativado no catálogo geral"
                                >
                                  Inativo no catálogo
                                </span>
                              )}
                            </div>
                            {docType?.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {docType.description}
                              </p>
                            )}
                          </td>

                          {/* Categoria */}
                          <td className="py-3 px-3">
                            <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-medium rounded-md border border-slate-200/60">
                              {docType?.category || 'Geral'}
                            </span>
                          </td>

                          {/* Obrigatoriedade */}
                          <td className="py-3 px-3">
                            <button
                              type="button"
                              onClick={() => handleToggleRequired(item)}
                              title="Clique para alternar entre Obrigatório e Opcional"
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                                item.required
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${item.required ? 'bg-blue-600' : 'bg-slate-400'}`} />
                              {item.required ? 'Obrigatório' : 'Opcional'}
                            </button>
                          </td>

                          {/* Instruções específicas */}
                          <td className="py-3 px-4">
                            {item.instructions ? (
                              <p className="text-[11px] text-slate-700 leading-relaxed italic bg-slate-50 p-1.5 rounded-md border border-slate-200/50">
                                "{item.instructions}"
                              </p>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">
                                Padrão do documento
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                              item.active 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : 'bg-rose-50 text-rose-700'
                            }`}>
                              {item.active ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>

                          {/* Ações */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingItem(item)}
                                title="Editar regras deste documento"
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setRemovingItem(item)}
                                title="Remover do checklist"
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Adição */}
      {currentPosition && (
        <AddJobPositionDocumentModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          jobPosition={currentPosition}
          currentDocuments={documents}
          onSuccess={(newDoc) => {
            setDocuments(prev => [...prev, newDoc].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
            showToast('success', `Documento adicionado ao checklist de "${currentPosition.name}" com sucesso!`);
          }}
        />
      )}

      {/* Modal de Edição */}
      {currentPosition && editingItem && (
        <EditJobPositionDocumentModal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          jobPosition={currentPosition}
          documentItem={editingItem}
          onSuccess={(updatedDoc) => {
            setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
            showToast('success', 'Regras do documento atualizadas com sucesso!');
          }}
        />
      )}

      {/* Modal de Remoção */}
      {currentPosition && removingItem && (
        <RemoveJobPositionDocModal
          isOpen={!!removingItem}
          onClose={() => setRemovingItem(null)}
          jobPosition={currentPosition}
          documentItem={removingItem}
          onSuccess={(removedDoc) => {
            // Remove da lista se estivemos filtrando ativos
            if (filterStatus === 'active') {
              setDocuments(prev => prev.filter(d => d.id !== removedDoc.id));
            } else {
              setDocuments(prev => prev.map(d => d.id === removedDoc.id ? removedDoc : d));
            }
            showToast('info', `Documento removido do checklist de "${currentPosition.name}". As admissões existentes não foram alteradas.`);
          }}
        />
      )}

      {/* Modal de Criação de Cargo com Checklist de Documentos */}
      <CreateJobPositionWithChecklistModal
        isOpen={isCreateCargoModalOpen}
        onClose={() => setIsCreateCargoModalOpen(false)}
        onSuccess={handleCargoCreatedWithChecklist}
      />
    </div>
  );
};
