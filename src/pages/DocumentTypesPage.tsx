import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
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
  FileCheck2,
  CalendarClock,
  HardDrive,
  ArrowUpDown,
  Sparkles,
  Layers,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { DocumentTypeItem, DocumentCategory, DOCUMENT_CATEGORIES } from '../types/index.ts';
import { safeFetchJson } from '../lib/api.ts';
import { DocumentTypeModal } from '../components/DocumentTypeModal.tsx';
import { DocumentTypeStatusModal } from '../components/DocumentTypeStatusModal.tsx';

type StatusFilter = 'all' | 'active' | 'inactive';

// Estilos de badge visual para cada categoria de documento
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Pessoal': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Trabalhista': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  'Residencial': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  'Escolar': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  'Profissional': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Certificação': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  'Saúde': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  'Outros': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' }
};

export const DocumentTypesPage: React.FC = () => {
  const { user } = useAuth();

  // Estados principais
  const [docTypes, setDocTypes] = useState<DocumentTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active'); // Padrão: Ativos
  const [categoryFilter, setCategoryFilter] = useState<string>('all'); // Padrão: Todas

  // Feedbacks
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingDocType, setEditingDocType] = useState<DocumentTypeItem | null>(null);

  const [statusModalState, setStatusModalState] = useState<{
    isOpen: boolean;
    docType: DocumentTypeItem | null;
    targetActive: boolean;
    isLoading: boolean;
  }>({
    isOpen: false,
    docType: null,
    targetActive: false,
    isLoading: false
  });

  // Verificação de permissões do usuário
  const isAuthorized = user ? ['ADMIN', 'RH', 'GESTOR'].includes(user.role) : false;

  // Carrega documentos do backend
  const fetchDocTypes = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await safeFetchJson<{ documentTypes: DocumentTypeItem[] }>('/api/document-types?status=all');
      setDocTypes(data.documentTypes || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao carregar a lista de tipos de documentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocTypes();
  }, []);

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4500);
  };

  // Filtragem no cliente para responsividade imediata
  const filteredDocTypes = useMemo(() => {
    return docTypes.filter((dt) => {
      // Filtro de status
      if (statusFilter === 'active' && !dt.active) return false;
      if (statusFilter === 'inactive' && dt.active) return false;

      // Filtro de categoria
      if (categoryFilter !== 'all' && dt.category !== categoryFilter) return false;

      // Filtro de busca textual (nome, descrição ou categoria)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = dt.name.toLowerCase().includes(q);
        const matchesDesc = dt.description ? dt.description.toLowerCase().includes(q) : false;
        const matchesCat = dt.category.toLowerCase().includes(q);
        return matchesName || matchesDesc || matchesCat;
      }

      return true;
    });
  }, [docTypes, statusFilter, categoryFilter, searchQuery]);

  // Contadores para os filtros
  const counts = useMemo(() => {
    const active = docTypes.filter((d) => d.active).length;
    const inactive = docTypes.filter((d) => !d.active).length;
    return {
      all: docTypes.length,
      active,
      inactive
    };
  }, [docTypes]);

  // Abertura de modal para criação
  const handleOpenCreateModal = () => {
    setEditingDocType(null);
    setIsFormModalOpen(true);
  };

  // Abertura de modal para edição
  const handleOpenEditModal = (dt: DocumentTypeItem) => {
    setEditingDocType(dt);
    setIsFormModalOpen(true);
  };

  // Salvar documento (novo ou edição)
  const handleSaveDocType = async (formData: {
    name: string;
    description?: string;
    category: DocumentCategory | string;
    required_by_default: boolean;
    active: boolean;
    allowed_file_types: string[];
    max_file_size_mb: number;
    requires_expiration_date: boolean;
    sort_order: number;
  }) => {
    if (editingDocType) {
      // Edição
      const res = await safeFetchJson<{ documentType: DocumentTypeItem; message: string }>(
        `/api/document-types/${editingDocType.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        }
      );

      setDocTypes((prev) =>
        prev.map((d) => (d.id === editingDocType.id ? res.documentType : d))
      );
      showToast('Tipo de documento atualizado com sucesso.');
    } else {
      // Criação
      const res = await safeFetchJson<{ documentType: DocumentTypeItem; message: string }>(
        '/api/document-types',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        }
      );

      setDocTypes((prev) => [...prev, res.documentType]);
      showToast('Tipo de documento cadastrado com sucesso.');
    }
  };

  // Ação de semear documentos iniciais padrão
  const handleSeedDefaults = async () => {
    try {
      setIsSeeding(true);
      setErrorMessage(null);
      const res = await safeFetchJson<{ documentTypes: DocumentTypeItem[]; message: string }>(
        '/api/document-types/seed',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      setDocTypes(res.documentTypes || []);
      showToast('Documentos padrão do sistema cadastrados com sucesso.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao inicializar tipos de documentos padrão.');
    } finally {
      setIsSeeding(false);
    }
  };

  // Solicitar desativação
  const handleRequestDeactivate = (dt: DocumentTypeItem) => {
    setStatusModalState({
      isOpen: true,
      docType: dt,
      targetActive: false,
      isLoading: false
    });
  };

  // Solicitar ativação
  const handleRequestActivate = (dt: DocumentTypeItem) => {
    setStatusModalState({
      isOpen: true,
      docType: dt,
      targetActive: true,
      isLoading: false
    });
  };

  // Confirmar alteração de status
  const handleConfirmStatusToggle = async () => {
    const { docType, targetActive } = statusModalState;
    if (!docType) return;

    setStatusModalState((prev) => ({ ...prev, isLoading: true }));
    try {
      const res = await safeFetchJson<{ documentType: DocumentTypeItem; message: string }>(
        `/api/document-types/${docType.id}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: targetActive })
        }
      );

      setDocTypes((prev) =>
        prev.map((d) => (d.id === docType.id ? res.documentType : d))
      );

      setStatusModalState({ isOpen: false, docType: null, targetActive: false, isLoading: false });
      showToast(targetActive ? 'Tipo de documento ativado com sucesso.' : 'Tipo de documento desativado com sucesso.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao alterar o status do documento.');
      setStatusModalState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast de Sucesso Flutuante */}
      {successToast && (
        <div 
          id="toast-doctype-success"
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
          <h1 id="page-title-documentos" className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-blue-600" />
            <span>Tipos de documentos</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cadastre e gerencie os tipos de documentos utilizados no processo de admissão.
          </p>
        </div>

        {isAuthorized && (
          <div className="flex items-center gap-2.5 shrink-0">
            {docTypes.length === 0 && (
              <button
                type="button"
                id="btn-seed-documentos-header"
                onClick={handleSeedDefaults}
                disabled={isSeeding}
                className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer border border-slate-200 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>{isSeeding ? 'Criando padrões...' : 'Gerar tipos padrão'}</span>
              </button>
            )}

            <button
              type="button"
              id="btn-novo-documento"
              onClick={handleOpenCreateModal}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Novo documento</span>
            </button>
          </div>
        )}
      </div>

      {/* Alerta de permissão de visualização apenas */}
      {!isAuthorized && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Seu perfil de usuário possui acesso somente para leitura deste catálogo de documentos.
          </span>
        </div>
      )}

      {/* Mensagem de Erro Geral */}
      {errorMessage && (
        <div 
          id="doctype-error-banner"
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

      {/* Barra de Filtros, Categoria e Pesquisa */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Campo de Pesquisa em Tempo Real */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="search-documentos-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar documento por nome, categoria ou descrição..."
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

          {/* Filtro de Categoria e Filtro de Status */}
          <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
            {/* Seletor de Categoria */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 hidden sm:inline-flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                <span>Categoria:</span>
              </span>
              <select
                id="filter-category-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20 cursor-pointer"
              >
                <option value="all">Todas as categorias</option>
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Grupo de Filtro de Status */}
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
                Ativos ({counts.active})
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
                Inativos ({counts.inactive})
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
                Todos ({counts.all})
              </button>
            </div>

            <button
              type="button"
              onClick={fetchDocTypes}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Recarregar dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal: Tabela ou Estados Vazios */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          // Skeleton Loading
          <div className="p-8 space-y-4">
            <div className="h-4 bg-slate-100 rounded-md w-1/4 animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-slate-50 rounded-xl w-full animate-pulse border border-slate-100" />
              ))}
            </div>
          </div>
        ) : docTypes.length === 0 ? (
          // Sem documentos cadastrados
          <div id="empty-state-no-documents" className="p-12 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Nenhum tipo de documento cadastrado.</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Cadastre os tipos de documentos necessários para as admissões ou inicialize com o conjunto padrão recomendado (CPF, RG, CTPS, Residência, etc.).
              </p>
            </div>
            {isAuthorized && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  id="btn-seed-defaults-empty"
                  onClick={handleSeedDefaults}
                  disabled={isSeeding}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{isSeeding ? 'Criando documentos...' : 'Criar tipos de documentos padrão'}</span>
                </button>
                <button
                  type="button"
                  id="btn-cadastrar-primeiro-documento"
                  onClick={handleOpenCreateModal}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer border border-slate-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar documento manual</span>
                </button>
              </div>
            )}
          </div>
        ) : filteredDocTypes.length === 0 ? (
          // Nenhum resultado na busca
          <div id="empty-state-no-results" className="p-12 text-center max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Nenhum tipo de documento encontrado para esta busca.</h3>
              <p className="text-xs text-slate-500 mt-1">
                Tente ajustar os termos pesquisados ou alterar os filtros de status e categoria.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setCategoryFilter('all');
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
            >
              Limpar busca e filtros
            </button>
          </div>
        ) : (
          // Tabela Completa de Tipos de Documentos
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="table-documentos">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th scope="col" className="py-3.5 px-4 sm:px-6">Documento</th>
                  <th scope="col" className="py-3.5 px-4">Categoria</th>
                  <th scope="col" className="py-3.5 px-4 whitespace-nowrap">Obrigatório Padrão</th>
                  <th scope="col" className="py-3.5 px-4 whitespace-nowrap">Validade</th>
                  <th scope="col" className="py-3.5 px-4 hidden md:table-cell">Formatos</th>
                  <th scope="col" className="py-3.5 px-4 hidden lg:table-cell">Tamanho Máx.</th>
                  <th scope="col" className="py-3.5 px-4">Status</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredDocTypes.map((dt) => {
                  const catTheme = CATEGORY_COLORS[dt.category] || CATEGORY_COLORS['Outros'];

                  return (
                    <tr 
                      key={dt.id}
                      id={`doctype-row-${dt.id}`}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !dt.active ? 'bg-slate-50/40 text-slate-400' : ''
                      }`}
                    >
                      {/* Documento (Nome e Descrição) */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div 
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              dt.active 
                                ? 'bg-blue-50 text-blue-700' 
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <span 
                              className={`font-bold block ${
                                dt.active ? 'text-slate-900' : 'text-slate-500 line-through'
                              }`}
                            >
                              {dt.name}
                            </span>
                            {dt.description && (
                              <span className="text-[11px] text-slate-400 block line-clamp-1 mt-0.5 max-w-sm">
                                {dt.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Categoria */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span 
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${catTheme.bg} ${catTheme.text} ${catTheme.border}`}
                        >
                          <span>{dt.category}</span>
                        </span>
                      </td>

                      {/* Obrigatório por Padrão */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {dt.required_by_default ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            <Check className="w-3 h-3 text-blue-600" />
                            <span>Sim</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                            <span>Não</span>
                          </span>
                        )}
                      </td>

                      {/* Validade */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {dt.requires_expiration_date ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            <CalendarClock className="w-3 h-3 text-amber-600" />
                            <span>Exige data</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Não exige</span>
                        )}
                      </td>

                      {/* Formatos Permitidos */}
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {dt.allowed_file_types?.map((fmt) => (
                            <span 
                              key={fmt}
                              className="font-mono text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200"
                            >
                              .{fmt.toLowerCase()}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Tamanho Máximo */}
                      <td className="py-3.5 px-4 hidden lg:table-cell whitespace-nowrap text-slate-500 text-[11px]">
                        <div className="flex items-center gap-1">
                          <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                          <span>{dt.max_file_size_mb || 10} MB</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {dt.active ? (
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

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isAuthorized ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Editar */}
                            <button
                              type="button"
                              id={`btn-edit-doctype-${dt.id}`}
                              onClick={() => handleOpenEditModal(dt)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar regras do documento"
                              aria-label={`Editar documento ${dt.name}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Desativar / Ativar */}
                            {dt.active ? (
                              <button
                                type="button"
                                id={`btn-deactivate-doctype-${dt.id}`}
                                onClick={() => handleRequestDeactivate(dt)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                title="Desativar documento (preserva admissões existentes)"
                                aria-label={`Desativar documento ${dt.name}`}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                id={`btn-activate-doctype-${dt.id}`}
                                onClick={() => handleRequestActivate(dt)}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Ativar documento para novas admissões"
                                aria-label={`Ativar documento ${dt.name}`}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé informativo da Tabela */}
        <div className="p-4 bg-slate-50/75 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Mostrando <strong>{filteredDocTypes.length}</strong> de <strong>{docTypes.length}</strong> tipos de documentos cadastrados
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Preservação de histórico ativo</span>
            <span>•</span>
            <span>Conforme Bloco 3.2 da Parte 3</span>
          </div>
        </div>
      </div>

      {/* Modal de Criação / Edição de Tipo de Documento */}
      <DocumentTypeModal
        isOpen={isFormModalOpen}
        documentTypeToEdit={editingDocType}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveDocType}
      />

      {/* Modal de Confirmação de Status (Desativação / Ativação) */}
      <DocumentTypeStatusModal
        isOpen={statusModalState.isOpen}
        documentType={statusModalState.docType}
        targetActive={statusModalState.targetActive}
        isLoading={statusModalState.isLoading}
        onClose={() => setStatusModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmStatusToggle}
      />
    </div>
  );
};
export default DocumentTypesPage;
