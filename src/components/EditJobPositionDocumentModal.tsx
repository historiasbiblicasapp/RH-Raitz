import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, HelpCircle, FileText, CheckCircle2 } from 'lucide-react';
import { JobPosition, JobPositionDocument } from '../types/index.ts';
import { safeFetchJson } from '../lib/api.ts';

interface EditJobPositionDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobPosition: JobPosition;
  documentItem: JobPositionDocument | null;
  onSuccess: (updatedDoc: JobPositionDocument) => void;
}

export const EditJobPositionDocumentModal: React.FC<EditJobPositionDocumentModalProps> = ({
  isOpen,
  onClose,
  jobPosition,
  documentItem,
  onSuccess
}) => {
  const [required, setRequired] = useState<boolean>(true);
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [instructions, setInstructions] = useState<string>('');
  const [active, setActive] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (documentItem) {
      setRequired(documentItem.required);
      setSortOrder(documentItem.sort_order || 1);
      setInstructions(documentItem.instructions || '');
      setActive(documentItem.active);
      setError(null);
    }
  }, [documentItem, isOpen]);

  if (!isOpen || !documentItem) return null;

  const docTypeName = documentItem.document_type?.name || 'Documento';
  const categoryName = documentItem.document_type?.category || 'Geral';
  const isGlobalDocActive = documentItem.document_type?.active !== false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await safeFetchJson<{ document: JobPositionDocument; message: string }>(
        `/api/job-position-documents/${documentItem.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            required,
            sort_order: Number(sortOrder) || 1,
            instructions: instructions.trim() || undefined,
            active
          })
        }
      );

      if (response && response.document) {
        onSuccess(response.document);
        onClose();
      } else {
        throw new Error('Não foi possível salvar as configurações.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar configuração.');
    } finally {
      setSaving(false);
    }
  };

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
              <FileText className="w-4 h-4 text-blue-600" />
              Editar Regras do Documento
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cargo: <span className="font-semibold text-slate-700">{jobPosition.name}</span>
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

          {/* Dados do Documento (Somente Leitura) */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">{docTypeName}</span>
                {!isGlobalDocActive && (
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-semibold rounded-sm">
                    Inativo no catálogo geral
                  </span>
                )}
              </div>
              <span className="px-2 py-0.5 bg-slate-200/80 text-slate-700 text-[10px] rounded-sm font-medium">
                {categoryName}
              </span>
            </div>
            {documentItem.document_type?.description && (
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {documentItem.document_type.description}
              </p>
            )}
            <p className="text-[10px] text-slate-400 pt-1">
              * O tipo de documento não pode ser alterado para preservar a rastreabilidade do checklist.
            </p>
          </div>

          {/* Exigência e Ordem */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Exigência na Admissão <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  id="btn-edit-required"
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
                  id="btn-edit-optional"
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
                {required ? 'Bloqueia avanço se não enviado.' : 'Pode ser enviado opcionalmente.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ordem de Exibição
              </label>
              <input
                type="number"
                id="input-edit-sort-order"
                min="1"
                max="999"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 1)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Posição na lista do colaborador.
              </p>
            </div>
          </div>

          {/* Instruções específicas para este cargo */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Instruções Específicas para o Cargo (Opcional)
              </label>
              <span className="text-[10px] text-slate-400">Visível para o colaborador</span>
            </div>
            <textarea
              id="textarea-edit-instructions"
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Ex: Emitido nos últimos 90 dias com foto nítida e frente/verso no mesmo arquivo."
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed"
            />
          </div>

          {/* Status Ativo/Inativo na Associação */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                id="checkbox-edit-active"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-xs font-semibold text-slate-800 block">
                  Documento ativo neste checklist
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Se desmarcado, este documento não será solicitado em novas admissões deste cargo.
                </span>
              </div>
            </label>
          </div>

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
              id="btn-update-checklist-item"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
