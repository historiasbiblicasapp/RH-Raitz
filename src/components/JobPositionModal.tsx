import React, { useState, useEffect } from 'react';
import { X, Briefcase, Tag, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { JobPosition } from '../types/index.ts';

interface JobPositionModalProps {
  isOpen: boolean;
  positionToEdit?: JobPosition | null;
  onClose: () => void;
  onSave: (data: { name: string; code?: string; description?: string; active: boolean }) => Promise<void>;
}

export const JobPositionModal: React.FC<JobPositionModalProps> = ({
  isOpen,
  positionToEdit,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (positionToEdit) {
        setName(positionToEdit.name || '');
        setCode(positionToEdit.code || '');
        setDescription(positionToEdit.description || '');
        setActive(positionToEdit.active !== false);
      } else {
        setName('');
        setCode('');
        setDescription('');
        setActive(true);
      }
      setError(null);
    }
  }, [isOpen, positionToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedName = name.trim().replace(/\s+/g, ' ');
    if (!normalizedName) {
      setError('O nome do cargo é obrigatório.');
      return;
    }

    const normalizedCode = code.trim().replace(/\s+/g, ' ');

    setIsSubmitting(true);
    try {
      await onSave({
        name: normalizedName,
        code: normalizedCode ? normalizedCode.toUpperCase() : undefined,
        description: description.trim() || undefined,
        active
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao salvar o cargo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-cargo-title"
    >
      <div 
        id="job-position-modal"
        className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 id="modal-cargo-title" className="text-base font-bold text-slate-900">
                {positionToEdit ? 'Editar Cargo' : 'Novo Cargo'}
              </h2>
              <p className="text-xs text-slate-500">
                {positionToEdit 
                  ? 'Atualize as informações do cargo cadastrado' 
                  : 'Preencha os dados do cargo para utilização nas admissões'}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-modal-cargo"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Fechar"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div 
              id="cargo-form-error"
              className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Nome do cargo */}
          <div>
            <label htmlFor="cargo-name-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nome do cargo <span className="text-rose-600 font-bold">*</span>
            </label>
            <div className="relative">
              <input
                id="cargo-name-input"
                type="text"
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Analista de TI, Motorista, Auxiliar Administrativo"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Identifica a função exercida pelo colaborador na empresa.
            </p>
          </div>

          {/* Código interno */}
          <div>
            <label htmlFor="cargo-code-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Código interno <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Tag className="w-4 h-4" />
              </div>
              <input
                id="cargo-code-input"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: TI-001, ADM-002, PROD-001"
                className="w-full pl-9 pr-3.5 py-2.5 text-sm uppercase bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Código para integração com folha de pagamento ou ERP.
            </p>
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="cargo-desc-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Descrição das atividades <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <div className="relative">
              <textarea
                id="cargo-desc-input"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Responsável por suporte, infraestrutura e sistemas de TI."
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-900 placeholder:text-slate-400 resize-none"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Resumo das responsabilidades ou requisitos da função.
            </p>
          </div>

          {/* Status */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Status do Cargo
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="radio"
                  name="cargo-status"
                  checked={active === true}
                  onChange={() => setActive(true)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Ativo (disponível para novas admissões)</span>
                </span>
              </label>

              {positionToEdit && (
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="radio"
                    name="cargo-status"
                    checked={active === false}
                    onChange={() => setActive(false)}
                    className="w-4 h-4 text-slate-600 focus:ring-slate-500 border-slate-300"
                  />
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span>Inativo (oculto para novas admissões)</span>
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* Rodapé com botões de ação */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              id="btn-cancel-cargo-modal"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-save-cargo-modal"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{positionToEdit ? 'Salvar Alterações' : 'Cadastrar Cargo'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
