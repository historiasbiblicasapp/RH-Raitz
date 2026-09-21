import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  FileText, 
  Calendar, 
  Tag, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  HelpCircle,
  FileCheck,
  Camera
} from 'lucide-react';
import { Employee, EmployeeDocumentCategory, DocumentTypeItem } from '../../types/index.ts';
import { safeFetchJson } from '../../lib/api.ts';

interface UploadEmployeeDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
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

export const UploadEmployeeDocumentModal: React.FC<UploadEmployeeDocumentModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EmployeeDocumentCategory>('Outros');
  const [documentTypeId, setDocumentTypeId] = useState<string>('');
  const [hasExpiration, setHasExpiration] = useState(false);
  const [issueDate, setIssueDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [notes, setNotes] = useState('');

  // Arquivo selecionado
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Catálogo de tipos de documento
  const [catalogTypes, setCatalogTypes] = useState<DocumentTypeItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Carrega catálogo para sugestões
      safeFetchJson<DocumentTypeItem[]>('/api/document-types')
        .then(types => setCatalogTypes(types.filter(t => t.active)))
        .catch(() => setCatalogTypes([]));

      // Reseta formulário
      setTitle('');
      setCategory('Outros');
      setDocumentTypeId('');
      setHasExpiration(false);
      setIssueDate('');
      setExpirationDate('');
      setNotes('');
      setFile(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectCatalogItem = (dt: DocumentTypeItem) => {
    setTitle(dt.name);
    setDocumentTypeId(dt.id);
    if (dt.category && CATEGORIES.includes(dt.category as any)) {
      setCategory(dt.category as any);
    }
    if (dt.requires_expiration_date) {
      setHasExpiration(true);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    if (selectedFile.size > 15 * 1024 * 1024) {
      setErrorMessage('O arquivo selecionado excede o limite máximo permitido de 15 MB.');
      return;
    }
    setFile(selectedFile);
    setErrorMessage(null);
    if (!title.trim()) {
      // Sugere o nome do arquivo sem extensão como título
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Por favor, informe o título do documento.');
      return;
    }

    if (hasExpiration && !expirationDate) {
      setErrorMessage('Por favor, informe a data de validade/vencimento do documento.');
      return;
    }

    if (issueDate && expirationDate && new Date(issueDate) > new Date(expirationDate)) {
      setErrorMessage('A data de emissão não pode ser posterior à data de vencimento.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('category', category);
      if (documentTypeId) formData.append('documentTypeId', documentTypeId);
      formData.append('hasExpiration', hasExpiration ? 'true' : 'false');
      if (issueDate) formData.append('issueDate', issueDate);
      if (expirationDate) formData.append('expirationDate', expirationDate);
      if (notes.trim()) formData.append('notes', notes.trim());
      if (file) {
        formData.append('file', file);
      }

      const res = await fetch(`/api/employees/${employee.id}/documents`, {
        method: 'POST',
        headers: {
          'x-role': 'RH',
          'x-user-name': 'RH'
        },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Falha ao realizar upload do documento.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado ao salvar documento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-100">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Novo Documento do Colaborador
              </h3>
              <p className="text-xs text-slate-500">
                {employee.name} • Prontuário Digital Corporativo
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

          {/* Sugestões Rápidas do Catálogo de Documentos */}
          {catalogTypes.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Sugestões do Catálogo Padrão (Opcional):
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200">
                {catalogTypes.slice(0, 8).map(dt => (
                  <button
                    key={dt.id}
                    type="button"
                    onClick={() => handleSelectCatalogItem(dt)}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-white border border-slate-200 hover:border-teal-400 hover:text-teal-700 transition"
                  >
                    {dt.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Título do Documento */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Título / Nome do Documento <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: ASO Periódico 2026, Certificado NR-10, CNH Renovada"
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
            />
          </div>

          {/* Categoria */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Categoria <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as EmployeeDocumentCategory)}
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Controle de Validade / Vencimento */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasExpiration}
                onChange={(e) => setHasExpiration(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
              />
              <span className="text-xs font-bold text-slate-800">
                Este documento possui prazo de validade / vencimento periódico?
              </span>
            </label>

            {hasExpiration && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-fade-in">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Data de Emissão (Opcional)
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
                    Data de Vencimento <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required={hasExpiration}
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-medium"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Área de Upload de Arquivo */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Arquivo Anexo (PDF, JPG, PNG até 15 MB)
            </label>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
                isDragOver 
                  ? 'border-teal-500 bg-teal-50/50' 
                  : file 
                    ? 'border-emerald-300 bg-emerald-50/30' 
                    : 'border-slate-200 hover:border-teal-400 bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                className="hidden"
              />

              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800 truncate max-w-xs">{file.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • Clique para alterar
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">
                    Arraste o arquivo aqui ou <span className="text-teal-600 underline">clique para selecionar</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Suporta PDF, JPG, PNG (tamanho máximo: 15 MB)
                  </p>
                </div>
              )}
            </div>

            {/* Ações de captura Mobile / Câmera (Regras Seções 52 e 53) */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">Ou capture diretamente:</span>
              <div>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Tirar Foto / Câmera
                </button>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Observações Administrativas (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Renovação periódica, entregue presencialmente pelo colaborador..."
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
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
              className="inline-flex items-center gap-2 px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Arquivando...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Salvar e Arquivar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
