import React, { useState, useEffect } from 'react';
import { 
  X, 
  Edit3, 
  Calendar, 
  Tag, 
  AlertCircle, 
  Loader2, 
  Save 
} from 'lucide-react';
import { EmployeeDocument, EmployeeDocumentCategory } from '../../types/index.ts';

interface EditEmployeeDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: EmployeeDocument | null;
  onSuccess: () => void;
}

const CATEGORIES: EmployeeDocumentCategory[] = [
  'Identificação',
  'Contratual',
  'Saúde e Segurança (SST)',
  'Certificações e Treinamentos',
  'Financeiro e Benefícios',
  'Outros'
];

export const EditEmployeeDocumentModal: React.FC<EditEmployeeDocumentModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EmployeeDocumentCategory>('Outros');
  const [hasExpiration, setHasExpiration] = useState(false);
  const [issueDate, setIssueDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>('Válido');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (doc && isOpen) {
      setTitle(doc.title || '');
      setCategory((doc.category as EmployeeDocumentCategory) || 'Outros');
      setHasExpiration(Boolean(doc.hasExpiration));
      setIssueDate(doc.issueDate ? doc.issueDate.split('T')[0] : '');
      setExpirationDate(doc.expirationDate ? doc.expirationDate.split('T')[0] : '');
      setNotes(doc.notes || '');
      setStatus(doc.status || 'Válido');
      setErrorMessage(null);
    }
  }, [doc, isOpen]);

  if (!isOpen || !doc) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('O título do documento é obrigatório.');
      return;
    }

    if (hasExpiration && !expirationDate) {
      setErrorMessage('Por favor, informe a data de vencimento.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/employees/documents/${doc.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-role': 'RH',
          'x-user-name': 'RH'
        },
        body: JSON.stringify({
          title: title.trim(),
          category,
          hasExpiration,
          issueDate: issueDate || undefined,
          expirationDate: hasExpiration ? expirationDate : undefined,
          notes: notes.trim(),
          status
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Falha ao atualizar metadados do documento.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Editar Informações do Documento
              </h3>
              <p className="text-xs text-slate-500">
                Arquivo: {doc.fileName} • Origem: {doc.origin}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Título */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Título do Documento <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Categoria e Situação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EmployeeDocumentCategory)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Status / Parecer
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-medium"
              >
                <option value="Válido">Válido</option>
                <option value="Aprovado">Aprovado</option>
                <option value="Em Análise">Em Análise</option>
                <option value="Rejeitado">Rejeitado</option>
                <option value="Pendente">Pendente</option>
              </select>
            </div>
          </div>

          {/* Controle de Validade */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasExpiration}
                onChange={(e) => setHasExpiration(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-xs font-bold text-slate-800">
                Possui controle de data de validade / vencimento?
              </span>
            </label>

            {hasExpiration && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Data de Emissão
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-medium"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Observações
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Ações */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
