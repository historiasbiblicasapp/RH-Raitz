import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Briefcase, 
  ListChecks, 
  Plus, 
  Search, 
  Check, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Tag, 
  FileText, 
  ShieldAlert, 
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { JobPosition, DocumentTypeItem, JobPositionDocument } from '../types/index.ts';
import { safeFetchJson } from '../lib/api.ts';

interface DocSelectionState {
  selected: boolean;
  required: boolean;
  instructions: string;
}

interface CreateJobPositionWithChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPosition: JobPosition, newDocuments: JobPositionDocument[]) => void;
}

export const CreateJobPositionWithChecklistModal: React.FC<CreateJobPositionWithChecklistModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  // Dados do Cargo
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);

  // Tipos de Documentos disponíveis
  const [allDocTypes, setAllDocTypes] = useState<DocumentTypeItem[]>([]);
  const [loadingDocTypes, setLoadingDocTypes] = useState(false);
  const [docSearch, setDocSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');

  // Mapeamento de documentos selecionados e configurados
  // docTypeId -> { selected: boolean, required: boolean, instructions: string }
  const [docSelections, setDocSelections] = useState<Record<string, DocSelectionState>>({});
  const [expandedInstructions, setExpandedInstructions] = useState<Record<string, boolean>>({});

  // Estados de submissão
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carrega os tipos de documentos ativos
  useEffect(() => {
    if (!isOpen) return;

    // Reset formulário
    setName('');
    setCode('');
    setDescription('');
    setActive(true);
    setError(null);
    setDocSearch('');
    setSelectedCategory('TODAS');

    setLoadingDocTypes(true);
    safeFetchJson<{ documentTypes: DocumentTypeItem[] }>('/api/document-types?status=active')
      .then(res => {
        if (res && res.documentTypes) {
          setAllDocTypes(res.documentTypes);

          // Inicializar mapa de seleções com padrão CLT recomendado
          const initialMap: Record<string, DocSelectionState> = {};
          res.documentTypes.forEach(dt => {
            const isStandardClt = [
              'CPF', 
              'RG', 
              'Carteira de Identidade', 
              'Carteira de Trabalho', 
              'Comprovante de Residência',
              'Título de Eleitor',
              'ASO'
            ].some(namePattern => dt.name.toLowerCase().includes(namePattern.toLowerCase()));

            initialMap[dt.id] = {
              selected: isStandardClt || Boolean(dt.required_by_default),
              required: dt.required_by_default !== false,
              instructions: ''
            };
          });
          setDocSelections(initialMap);
        }
      })
      .catch(err => {
        console.error('Erro ao carregar tipos de documentos:', err);
        setError('Não foi possível carregar os tipos de documentos disponíveis.');
      })
      .finally(() => {
        setLoadingDocTypes(false);
      });
  }, [isOpen]);

  // Lista de categorias distintas para filtro
  const categories = useMemo(() => {
    const cats = new Set<string>();
    allDocTypes.forEach(dt => {
      if (dt.category) cats.add(dt.category);
    });
    return ['TODAS', ...Array.from(cats).sort()];
  }, [allDocTypes]);

  // Documentos filtrados por busca e categoria
  const filteredDocTypes = useMemo(() => {
    return allDocTypes.filter(dt => {
      if (selectedCategory !== 'TODAS' && dt.category !== selectedCategory) {
        return false;
      }
      if (docSearch.trim()) {
        const q = docSearch.trim().toLowerCase();
        const matchesName = dt.name.toLowerCase().includes(q);
        const matchesDesc = dt.description ? dt.description.toLowerCase().includes(q) : false;
        const matchesCat = dt.category ? dt.category.toLowerCase().includes(q) : false;
        return matchesName || matchesDesc || matchesCat;
      }
      return true;
    });
  }, [allDocTypes, selectedCategory, docSearch]);

  // Estatísticas de seleção
  const selectionStats = useMemo(() => {
    let totalSelected = 0;
    let requiredCount = 0;
    let optionalCount = 0;

    Object.values(docSelections).forEach(sel => {
      if (sel.selected) {
        totalSelected++;
        if (sel.required) requiredCount++;
        else optionalCount++;
      }
    });

    return { totalSelected, requiredCount, optionalCount };
  }, [docSelections]);

  // Toggle de seleção de um documento
  const handleToggleSelectDoc = (docTypeId: string) => {
    setDocSelections(prev => {
      const current = prev[docTypeId] || { selected: false, required: true, instructions: '' };
      return {
        ...prev,
        [docTypeId]: {
          ...current,
          selected: !current.selected
        }
      };
    });
  };

  // Toggle de obrigatoriedade
  const handleToggleRequired = (docTypeId: string) => {
    setDocSelections(prev => {
      const current = prev[docTypeId] || { selected: true, required: true, instructions: '' };
      return {
        ...prev,
        [docTypeId]: {
          ...current,
          required: !current.required
        }
      };
    });
  };

  // Atualizar instruções específicas
  const handleInstructionsChange = (docTypeId: string, text: string) => {
    setDocSelections(prev => {
      const current = prev[docTypeId] || { selected: true, required: true, instructions: '' };
      return {
        ...prev,
        [docTypeId]: {
          ...current,
          instructions: text
        }
      };
    });
  };

  // Presets rápidos
  const handleSelectBasicClt = () => {
    const basicKeywords = [
      'cpf', 
      'rg', 
      'identidade', 
      'trabalho', 
      'residência', 
      'residencia', 
      'título', 
      'titulo', 
      'aso'
    ];

    setDocSelections(prev => {
      const updated: Record<string, DocSelectionState> = {};
      allDocTypes.forEach(dt => {
        const isBasic = basicKeywords.some(kw => dt.name.toLowerCase().includes(kw));
        updated[dt.id] = {
          selected: isBasic,
          required: isBasic,
          instructions: prev[dt.id]?.instructions || ''
        };
      });
      return updated;
    });
  };

  const handleSelectAll = () => {
    setDocSelections(prev => {
      const updated: Record<string, DocSelectionState> = {};
      allDocTypes.forEach(dt => {
        updated[dt.id] = {
          selected: true,
          required: prev[dt.id]?.required ?? dt.required_by_default,
          instructions: prev[dt.id]?.instructions || ''
        };
      });
      return updated;
    });
  };

  const handleClearAll = () => {
    setDocSelections(prev => {
      const updated: Record<string, DocSelectionState> = {};
      allDocTypes.forEach(dt => {
        updated[dt.id] = {
          selected: false,
          required: dt.required_by_default,
          instructions: prev[dt.id]?.instructions || ''
        };
      });
      return updated;
    });
  };

  const toggleExpandInstruction = (docTypeId: string) => {
    setExpandedInstructions(prev => ({
      ...prev,
      [docTypeId]: !prev[docTypeId]
    }));
  };

  // Submissão
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedName = name.trim().replace(/\s+/g, ' ');
    if (!normalizedName) {
      setError('Por favor, informe o nome do cargo.');
      return;
    }

    const normalizedCode = code.trim().replace(/\s+/g, ' ');

    // Montar lista de documentos selecionados
    const selectedDocumentsPayload: Array<{
      document_type_id: string;
      required: boolean;
      instructions?: string;
      sort_order?: number;
    }> = [];

    let order = 1;
    allDocTypes.forEach(dt => {
      const sel = docSelections[dt.id];
      if (sel && sel.selected) {
        selectedDocumentsPayload.push({
          document_type_id: dt.id,
          required: sel.required,
          instructions: sel.instructions.trim() || undefined,
          sort_order: order++
        });
      }
    });

    setIsSubmitting(true);
    try {
      const response = await safeFetchJson<{
        jobPosition: JobPosition;
        documents?: JobPositionDocument[];
        message: string;
      }>('/api/job-positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: normalizedName,
          code: normalizedCode ? normalizedCode.toUpperCase() : undefined,
          description: description.trim() || undefined,
          active,
          documents: selectedDocumentsPayload
        })
      });

      if (!response || !response.jobPosition) {
        throw new Error('Falha ao processar o cadastro do cargo.');
      }

      onSuccess(response.jobPosition, response.documents || []);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar novo cargo e checklist.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-cargo-checklist-title"
    >
      <div 
        id="create-cargo-checklist-modal"
        className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 id="modal-cargo-checklist-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Cadastrar Novo Cargo & Checklist</span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 rounded-full">
                  Configuração
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Defina o cargo e marque quais documentos serão exigidos dos colaboradores nesta função.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário com rolagem */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Seção 1: Dados Básicos do Cargo */}
          <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Tag className="w-3.5 h-3.5 text-blue-600" />
              <span>1. Informações do Cargo</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label htmlFor="cargo-name-input-chk" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nome do Cargo <span className="text-rose-600 font-bold">*</span>
                </label>
                <input
                  id="cargo-name-input-chk"
                  type="text"
                  autoFocus
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Soldador Industrial, Analista de RH, Eletricista"
                  className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 shadow-2xs"
                />
              </div>

              <div>
                <label htmlFor="cargo-code-input-chk" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Código Interno <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  id="cargo-code-input-chk"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ex: SLD-001"
                  className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 shadow-2xs uppercase"
                />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="cargo-desc-input-chk" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Descrição das Atribuições <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  id="cargo-desc-input-chk"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descrição da função e requisitos de qualificação necessários..."
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 resize-none shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Documentos Exigidos pelo Cargo */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <ListChecks className="w-4 h-4 text-blue-600" />
                  <span>2. Documentos Exigidos para Este Cargo</span>
                </div>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                  {selectionStats.totalSelected} selecionados ({selectionStats.requiredCount} obrigatórios, {selectionStats.optionalCount} opcionais)
                </span>
              </div>

              {/* Botões de presets rápidos */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectBasicClt}
                  className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors flex items-center gap-1 border border-blue-200/60"
                  title="Seleciona automaticamente RG, CPF, CTPS, Comprovante de Residência, Título e ASO"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Padrão CLT</span>
                </button>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Filtros da lista de documentos */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder="Pesquisar documento por nome ou código..."
                  className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de Documentos Selecionáveis */}
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto bg-white shadow-2xs">
              {loadingDocTypes ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Carregando tipos de documentos...
                </div>
              ) : filteredDocTypes.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Nenhum documento encontrado com os filtros aplicados.
                </div>
              ) : (
                filteredDocTypes.map(docType => {
                  const sel = docSelections[docType.id] || { selected: false, required: true, instructions: '' };
                  const isChecked = sel.selected;
                  const isExpanded = expandedInstructions[docType.id];

                  return (
                    <div 
                      key={docType.id}
                      className={`p-3 transition-colors ${
                        isChecked ? 'bg-blue-50/30 hover:bg-blue-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        {/* Checkbox e Nome */}
                        <label className="flex items-center gap-3 cursor-pointer flex-1 select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectDoc(docType.id)}
                            className="w-4 h-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                          />
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-semibold ${
                              isChecked ? 'text-slate-900' : 'text-slate-600'
                            }`}>
                              {docType.name}
                            </span>

                            {docType.category && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded-sm">
                                {docType.category}
                              </span>
                            )}
                          </div>
                        </label>

                        {/* Controles quando selecionado: Obrigatório vs Opcional + Instruções */}
                        {isChecked && (
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Toggle Obrigatório / Opcional */}
                            <button
                              type="button"
                              onClick={() => handleToggleRequired(docType.id)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors border flex items-center gap-1 cursor-pointer ${
                                sel.required
                                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              }`}
                              title={sel.required ? 'Documento impeditivo (obrigatório)' : 'Documento complementar (opcional)'}
                            >
                              {sel.required ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  <span>Obrigatório</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  <span>Opcional</span>
                                </>
                              )}
                            </button>

                            {/* Botão de instruções específicas */}
                            <button
                              type="button"
                              onClick={() => toggleExpandInstruction(docType.id)}
                              className={`p-1 rounded-md text-[11px] flex items-center gap-1 border transition-colors ${
                                sel.instructions
                                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                              }`}
                              title="Adicionar orientações específicas para o candidato neste cargo"
                            >
                              <FileText className="w-3 h-3" />
                              <span className="hidden sm:inline">
                                {sel.instructions ? 'Orientação ativa' : 'Orientação'}
                              </span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Campo de instruções expandido */}
                      {isChecked && isExpanded && (
                        <div className="mt-2.5 pt-2 border-t border-blue-100/60 pl-7">
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Orientação específica para o colaborador ao enviar {docType.name}:
                          </label>
                          <input
                            type="text"
                            value={sel.instructions}
                            onChange={(e) => handleInstructionsChange(docType.id, e.target.value)}
                            placeholder="Ex: CNH categoria D válida; ASO emitido em até 30 dias; Certidão com averbação..."
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 placeholder:text-slate-400"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Documentos marcados como <strong>Obrigatório</strong> bloqueiam a conclusão da admissão até que sejam devidamente enviados e aprovados pelo RH.</span>
            </p>
          </div>
        </form>

        {/* Rodapé com Ações */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim()}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Cadastrando...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Cadastrar Cargo & Salvar Checklist ({selectionStats.totalSelected})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
