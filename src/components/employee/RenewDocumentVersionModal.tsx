import React, { useState, useRef } from 'react';
import { 
  X, 
  RefreshCw, 
  UploadCloud, 
  FileCheck, 
  Calendar, 
  AlertCircle, 
  Loader2, 
  History,
  Camera 
} from 'lucide-react';
import { EmployeeDocument } from '../../types/index.ts';

interface RenewDocumentVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: EmployeeDocument | null;
  onSuccess: () => void;
}

export const RenewDocumentVersionModal: React.FC<RenewDocumentVersionModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  onSuccess
}) => {
  const [replacementReason, setReplacementReason] = useState('Documento renovado');
  const [expirationDate, setExpirationDate] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !doc) return null;

  const nextVersion = (doc.currentVersion || 1) + 1;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    if (selectedFile.size > 15 * 1024 * 1024) {
      setErrorMessage('O arquivo excede o limite de 15 MB.');
      return;
    }
    setFile(selectedFile);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (doc.hasExpiration && !expirationDate) {
      setErrorMessage('Por favor, informe a nova data de validade/vencimento.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('replacementReason', replacementReason);
      if (expirationDate) formData.append('expirationDate', expirationDate);
      if (issueDate) formData.append('issueDate', issueDate);
      if (notes.trim()) formData.append('notes', notes.trim());
      if (file) {
        formData.append('file', file);
      }

      const res = await fetch(`/api/employees/documents/${doc.id}/versions`, {
        method: 'POST',
        headers: {
          'x-role': 'RH',
          'x-user-name': 'RH'
        },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Falha ao processar renovação do documento.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado na renovação.');
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
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Renovar Documento (Versão {nextVersion})
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-xs">
                {doc.title} • Versão atual: v{doc.currentVersion || 1}
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

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
            <p className="text-slate-500 font-semibold">Documento Sendo Renovado:</p>
            <p className="text-slate-900 font-bold">{doc.title} ({doc.category})</p>
            {doc.expirationDate && (
              <p className="text-slate-600">
                Vencimento anterior: <strong>{new Date(doc.expirationDate).toLocaleDateString('pt-BR')}</strong>
              </p>
            )}
          </div>

          {/* Motivo da Substituição (Regra Seção 29) */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Motivo da Substituição / Renovação <span className="text-rose-500">*</span>
            </label>
            <select
              value={replacementReason}
              onChange={(e) => setReplacementReason(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
            >
              <option value="Documento renovado">Documento renovado</option>
              <option value="Documento atualizado">Documento atualizado</option>
              <option value="Documento corrigido">Documento corrigido</option>
              <option value="Documento ilegível">Documento ilegível</option>
              <option value="Documento expirado">Documento expirado</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          {/* Nova Data de Validade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Data de Emissão da Nova Versão
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Nova Data de Vencimento <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white font-medium"
              />
            </div>
          </div>

          {/* Upload do Arquivo Renovado */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Anexar Novo Arquivo Comprovatório (PDF, JPG, PNG)
            </label>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
                isDragOver 
                  ? 'border-emerald-500 bg-emerald-50/50' 
                  : file 
                    ? 'border-emerald-300 bg-emerald-50/30' 
                    : 'border-slate-200 hover:border-emerald-400 bg-slate-50/50'
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
                    Arraste a nova via aqui ou <span className="text-emerald-600 underline">clique para selecionar</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Limite: 15 MB
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
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Tirar Foto / Câmera
                </button>
              </div>
            </div>
          </div>

          {/* Justificativa / Observações da Renovação */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Observações / Justificativa da Renovação
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Renovação periódica realizada na clínica conveniada..."
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
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
              className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registrando Renovação...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Confirmar Renovação</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
