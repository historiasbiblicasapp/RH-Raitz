import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Tag, 
  CalendarClock, 
  CheckCircle2, 
  AlertCircle, 
  FileCheck, 
  HardDrive, 
  ArrowUpDown,
  Layers
} from 'lucide-react';
import { DocumentTypeItem, DocumentCategory, DOCUMENT_CATEGORIES, ALLOWED_FILE_FORMATS } from '../types/index.ts';

interface DocumentTypeModalProps {
  isOpen: boolean;
  documentTypeToEdit?: DocumentTypeItem | null;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description?: string;
    category: DocumentCategory | string;
    required_by_default: boolean;
    active: boolean;
    allowed_file_types: string[];
    max_file_size_mb: number;
    requires_expiration_date: boolean;
    sort_order: number;
  }) => Promise<void>;
}

export const DocumentTypeModal: React.FC<DocumentTypeModalProps> = ({
  isOpen,
  documentTypeToEdit,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DocumentCategory | string>('Pessoal');
  const [requiredByDefault, setRequiredByDefault] = useState(true);
  const [requiresExpirationDate, setRequiresExpirationDate] = useState(false);
  const [allowedFileTypes, setAllowedFileTypes] = useState<string[]>(['PDF', 'JPG', 'JPEG', 'PNG']);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState<number>(10);
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [active, setActive] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (documentTypeToEdit) {
        setName(documentTypeToEdit.name || '');
        setDescription(documentTypeToEdit.description || '');
        setCategory(documentTypeToEdit.category || 'Pessoal');
        setRequiredByDefault(documentTypeToEdit.required_by_default !== false);
        setRequiresExpirationDate(Boolean(documentTypeToEdit.requires_expiration_date));
        setAllowedFileTypes(
          documentTypeToEdit.allowed_file_types && documentTypeToEdit.allowed_file_types.length > 0
            ? [...documentTypeToEdit.allowed_file_types]
            : ['PDF', 'JPG', 'JPEG', 'PNG']
        );
        setMaxFileSizeMb(documentTypeToEdit.max_file_size_mb || 10);
        setSortOrder(documentTypeToEdit.sort_order ?? 1);
        setActive(documentTypeToEdit.active !== false);
      } else {
        setName('');
        setDescription('');
        setCategory('Pessoal');
        setRequiredByDefault(true);
        setRequiresExpirationDate(false);
        setAllowedFileTypes(['PDF', 'JPG', 'JPEG', 'PNG']);
        setMaxFileSizeMb(10);
        setSortOrder(1);
        setActive(true);
      }
      setError(null);
    }
  }, [isOpen, documentTypeToEdit]);

  // Listener para fechar no ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const toggleFileType = (format: string) => {
    if (allowedFileTypes.includes(format)) {
      if (allowedFileTypes.length === 1) {
        setError('Pelo menos um formato de arquivo deve permanecer selecionado.');
        return;
      }
      setAllowedFileTypes(allowedFileTypes.filter((f) => f !== format));
    } else {
      setAllowedFileTypes([...allowedFileTypes, format]);
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim().replace(/\s+/g, ' ');
    if (!cleanName) {
      setError('O nome do documento é obrigatório.');
      return;
    }

    if (!category) {
      setError('Selecione uma categoria para o tipo de documento.');
      return;
    }

    if (allowedFileTypes.length === 0) {
      setError('Selecione pelo menos um formato de arquivo permitido.');
      return;
    }

    const size = Number(maxFileSizeMb);
    if (isNaN(size) || size <= 0 || size > 100) {
      setError('O tamanho máximo do arquivo deve ser entre 1 MB e 100 MB.');
      return;
    }

    const order = Number(sortOrder);
    if (isNaN(order) || order < 0) {
      setError('A ordem de exibição deve ser um número inteiro válido maior ou igual a zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        name: cleanName,
        description: description.trim() || undefined,
        category,
        required_by_default: requiredByDefault,
        requires_expiration_date: requiresExpirationDate,
        allowed_file_types: allowedFileTypes,
        max_file_size_mb: size,
        sort_order: order,
        active
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao salvar o tipo de documento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-doctype-title"
    >
      <div 
        id="document-type-modal"
        className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6"
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 id="modal-doctype-title" className="text-base font-bold text-slate-900">
                {documentTypeToEdit ? 'Editar Tipo de Documento' : 'Novo Tipo de Documento'}
              </h2>
              <p className="text-xs text-slate-500">
                {documentTypeToEdit 
                  ? 'Atualize os parâmetros e regras do documento' 
                  : 'Configure as regras, categoria e restrições do documento'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
            title="Fechar (ESC)"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div 
              id="doctype-modal-error"
              className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Nome e Categoria em Linha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome do Documento */}
            <div className="space-y-1.5">
              <label htmlFor="doc-name-input" className="block font-semibold text-slate-700">
                Nome do documento <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="doc-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: CPF, RG, Diploma, NR10..."
                  className="w-full px-3.5 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-900 placeholder:text-slate-400 transition-colors"
                  maxLength={100}
                />
              </div>
              <p className="text-[11px] text-slate-400">Identificação clara apresentada ao candidato.</p>
            </div>

            {/* Categoria */}
            <div className="space-y-1.5">
              <label htmlFor="doc-category-select" className="block font-semibold text-slate-700">
                Categoria <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="doc-category-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-900 transition-colors cursor-pointer"
                >
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-400">Agrupamento lógico no painel de conferência.</p>
            </div>
          </div>

          {/* Descrição / Instruções */}
          <div className="space-y-1.5">
            <label htmlFor="doc-description-input" className="block font-semibold text-slate-700">
              Descrição e instruções para o candidato <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              id="doc-description-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Envie a foto legível frente e verso ou em formato PDF oficial emitido pela internet..."
              className="w-full px-3.5 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-900 placeholder:text-slate-400 transition-colors resize-none"
              maxLength={400}
            />
          </div>

          {/* Configurações de Regra: Obrigatório e Data de Validade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Obrigatório por Padrão */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-800 block text-xs flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Obrigatório por padrão?</span>
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  {requiredByDefault ? 'Exigido em todas as admissões' : 'Opcional na admissão'}
                </span>
              </div>
              <button
                type="button"
                id="toggle-required-by-default"
                onClick={() => setRequiredByDefault(!requiredByDefault)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  requiredByDefault ? 'bg-blue-600' : 'bg-slate-300'
                }`}
                role="switch"
                aria-checked={requiredByDefault}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    requiredByDefault ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Exige Data de Validade */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-800 block text-xs flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Possui data de validade?</span>
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  {requiresExpirationDate ? 'Sim (ex: NR10, NR35, ASO)' : 'Não possui validade'}
                </span>
              </div>
              <button
                type="button"
                id="toggle-requires-expiration-date"
                onClick={() => setRequiresExpirationDate(!requiresExpirationDate)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  requiresExpirationDate ? 'bg-amber-600' : 'bg-slate-300'
                }`}
                role="switch"
                aria-checked={requiresExpirationDate}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    requiresExpirationDate ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Formatos de Arquivo Permitidos */}
          <div className="space-y-1.5 pt-1">
            <label className="block font-semibold text-slate-700">
              Formatos de arquivo permitidos <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {ALLOWED_FILE_FORMATS.map((format) => {
                const isSelected = allowedFileTypes.includes(format);
                return (
                  <button
                    key={format}
                    type="button"
                    onClick={() => toggleFileType(format)}
                    id={`btn-format-${format.toLowerCase()}`}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-600' : 'bg-slate-300'}`} />
                    <span>.{format.toLowerCase()}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400">
              Formatos aceitos pelo sistema para upload do candidato.
            </p>
          </div>

          {/* Tamanho Máximo e Ordem de Exibição */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Tamanho Máximo em MB */}
            <div className="space-y-1.5">
              <label htmlFor="doc-max-size-input" className="block font-semibold text-slate-700 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                <span>Tamanho máximo do arquivo (MB)</span>
              </label>
              <input
                id="doc-max-size-input"
                type="number"
                min={1}
                max={50}
                required
                value={maxFileSizeMb}
                onChange={(e) => setMaxFileSizeMb(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-900"
              />
              <p className="text-[11px] text-slate-400">Padrão recomendado: 10 MB.</p>
            </div>

            {/* Ordem de Exibição */}
            <div className="space-y-1.5">
              <label htmlFor="doc-sort-order-input" className="block font-semibold text-slate-700 flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <span>Ordem de exibição</span>
              </label>
              <input
                id="doc-sort-order-input"
                type="number"
                min={1}
                max={999}
                required
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-900"
              />
              <p className="text-[11px] text-slate-400">Posição no checklist admissional (1, 2, 3...).</p>
            </div>
          </div>

          {/* Status Inicial / Atual (Ativo ou Inativo) */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-700 block">Status do documento</span>
              <span className="text-[11px] text-slate-400">
                {active 
                  ? 'Ativo (disponível para novas admissões)' 
                  : 'Inativo (oculto para novas admissões, preservado no histórico)'}
              </span>
            </div>
            <button
              type="button"
              id="btn-toggle-active-status"
              onClick={() => setActive(!active)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                active 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {active ? '● Ativo' : '○ Inativo'}
            </button>
          </div>

          {/* Rodapé e Ações */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-save-doctype"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Salvando...</span>
              ) : (
                <span>{documentTypeToEdit ? 'Atualizar Documento' : 'Salvar Documento'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
