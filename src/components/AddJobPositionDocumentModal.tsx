import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, FileText, CheckCircle2, HelpCircle } from 'lucide-react';
import { JobPosition, DocumentTypeItem, JobPositionDocument } from '../types/index.ts';
import { safeFetchJson } from '../lib/api.ts';

interface AddJobPositionDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobPosition: JobPosition;
  currentDocuments: JobPositionDocument[];
  onSuccess: (newDoc: JobPositionDocument) => void;
}

export const AddJobPositionDocumentModal: React.FC<AddJobPositionDocumentModalProps> = ({
  isOpen,
  onClose,
  jobPosition,
  currentDocuments,
  onSuccess
}) => {
  const [availableDocTypes, setAvailableDocTypes] = useState<DocumentTypeItem[]>([]);
  const [loadingDocTypes, setLoadingDocTypes] = useState(false);
  const [selectedDocTypeId, setSelectedDocTypeId] = useState<string>('');
  const [required, setRequired] = useState<boolean>(true);
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [instructions, setInstructions] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Carrega os tipos de documentos ativos do catálogo
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setLoadingDocTypes(true);

    safeFetchJson<{ documentTypes: DocumentTypeItem[] }>('/api/document-types?status=active')
      .then(res => {
        if (res && res.documentTypes) {
          // Filtra apenas tipos de documentos ativos que ainda não estão configurados como ativos neste cargo
          const configuredActiveIds = new Set(
            currentDocuments
              .filter(d => d.active)
              .map(d => d.document_type_id)
          );

          const available = res.documentTypes.filter(dt => !configuredActiveIds.has(dt.id));
          setAvailableDocTypes(available);

          if (available.length > 0) {
            setSelectedDocTypeId(available[0].id);
            setRequired(available[0].required_by_default);
          } else {
            setSelectedDocTypeId('');
          }
        }
      })
      .catch(err => {
        console.error('Erro ao carregar tipos de documentos:', err);
        setError('Não foi possível carregar o catálogo de tipos de documentos.');
      })
      .finally(() => {
        setLoadingDocTypes(false);
      });

    // Próxima ordem sugerida
    const nextOrder = currentDocuments.length > 0
      ? Math.max(...currentDocuments.map(d => d.sort_order || 0)) + 1
      : 1;
    setSortOrder(nextOrder);
    setInstructions('');
  }, [isOpen, jobPosition.id, currentDocuments]);

  // Quando o usuário troca o tipo de documento selecionado, atualiza o default de required
  const handleDocTypeChange = (id: string) => {
    setSelectedDocTypeId(id);
    const found = availableDocTypes.find(dt => dt.id === id);
    if (found) {
      setRequired(found.required_by_default);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocTypeId) {
      setError('Por favor, selecione um tipo de documento.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await safeFetchJson<{ document: JobPositionDocument; message: string }>(
        `/api/job-positions/${jobPosition.id}/documents`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document_type_id: selectedDocTypeId,
            required,
            sort_order: Number(sortOrder) || 1,
            instructions: instructions.trim() || undefined
          })
        }
      );

      if (response && response.document) {
        onSuccess(response.document);
        onClose();
      } else {
        throw new Error('Falha ao adicionar documento ao cargo.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao vincular documento. Verifique se o item já não foi cadastrado.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const selectedDocType = availableDocTypes.find(dt => dt.id === selectedDocTypeId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              Adicionar Documento ao Checklist
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cargo: <span className="font-semibold text-slate-700">{jobPosition.name}</span>
              {jobPosition.code && <span className="ml-1 text-slate-400">({jobPosition.code})</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loadingDocTypes ? (
            <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              Carregando catálogo de documentos...
            </div>
          ) : availableDocTypes.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-center space-y-2">
              <p className="text-xs font-semibold text-amber-800">
                Todos os documentos ativos já estão vinculados a este cargo!
              </p>
              <p className="text-[11px] text-amber-600">
                Para adicionar outros documentos, cadastre novos tipos de documentos na aba "Tipos de documentos".
              </p>
            </div>
          ) : (
            <>
              {/* Seleção do Tipo de Documento */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Documento <span className="text-rose-500">*</span>
                </label>
                <select
                  id="select-document-type"
                  value={selectedDocTypeId}
                  onChange={(e) => handleDocTypeChange(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                >
                  {availableDocTypes.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.name} — Categoria: {dt.category} {dt.required_by_default ? '(Obrigatório padrão)' : '(Opcional)'}
                    </option>
                  ))}
                </select>

                {/* Preview do documento selecionado */}
                {selectedDocType && (
                  <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200/70 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">{selectedDocType.name}</span>
                      <span className="px-2 py-0.5 bg-slate-200/80 text-slate-700 text-[10px] rounded-sm font-medium">
                        {selectedDocType.category}
                      </span>
                    </div>
                    {selectedDocType.description && (
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {selectedDocType.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-slate-500">
                      <span>Formatos: {selectedDocType.allowed_file_types?.join(', ') || 'PDF, JPG, PNG'}</span>
                      <span>•</span>
                      <span>Até {selectedDocType.max_file_size_mb || 10}MB</span>
                      {selectedDocType.requires_expiration_date && (
                        <>
                          <span>•</span>
                          <span className="text-amber-700 font-medium">Exige validade</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Obrigatório ou Opcional */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Exigência na Admissão <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      id="btn-option-required"
                      onClick={() => setRequired(true)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all ${
                        required
                          ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Obrigatório
                    </button>
                    <button
                      type="button"
                      id="btn-option-optional"
                      onClick={() => setRequired(false)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all ${
                        !required
                          ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Opcional
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {required ? 'O candidato deve enviar para concluir.' : 'Envio não bloqueante.'}
                  </p>
                </div>

                {/* Ordem de exibição */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ordem no Checklist
                  </label>
                  <input
                    type="number"
                    id="input-sort-order"
                    min="1"
                    max="999"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 1)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Posição em que aparecerá na lista.
                  </p>
                </div>
              </div>

              {/* Instruções específicas para o cargo */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Instruções Específicas para este Cargo (Opcional)
                  </label>
                  <span className="text-[10px] text-slate-400">Ajuda o colaborador a não errar</span>
                </div>
                <textarea
                  id="textarea-instructions"
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Ex: Emitido nos últimos 90 dias com foto nítida e assinatura visível."
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed"
                />
              </div>
            </>
          )}

          {/* Rodapé / Ações */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-save-checklist-item"
              disabled={saving || loadingDocTypes || availableDocTypes.length === 0}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar ao Checklist
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
