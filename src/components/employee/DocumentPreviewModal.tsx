import React from 'react';
import { X, Download, ExternalLink, FileText, Calendar, ShieldCheck, Clock, Layers } from 'lucide-react';
import { EmployeeDocument } from '../../types/index.ts';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: EmployeeDocument | null;
  version?: number;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  version
}) => {
  if (!isOpen || !doc) return null;

  const currentVersion = version || doc.currentVersion || 1;
  const fileUrl = doc.fileUrl 
    ? (doc.fileUrl.includes('?') ? `${doc.fileUrl}&version=${currentVersion}` : `${doc.fileUrl}?version=${currentVersion}`)
    : `/api/employees/documents/${doc.id}/file?version=${currentVersion}`;

  const downloadUrl = fileUrl.includes('download=true') 
    ? fileUrl 
    : (fileUrl.includes('?') ? `${fileUrl}&download=true` : `${fileUrl}?download=true`);

  const isImage = doc.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(doc.fileName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-teal-50 text-teal-700 rounded-xl shrink-0 border border-teal-100">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  {doc.title}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200/80 text-slate-700">
                  v{currentVersion}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                  {doc.category}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate flex items-center gap-2 mt-0.5">
                <span>Arquivo: {doc.fileName}</span>
                <span>•</span>
                <span>Origem: {doc.origin}</span>
                {doc.expirationDate && (
                  <>
                    <span>•</span>
                    <span>Vencimento: {new Date(doc.expirationDate).toLocaleDateString('pt-BR')}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-4">
            <a
              href={downloadUrl}
              download={doc.fileName}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition"
              title="Baixar arquivo original"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Baixar</span>
            </a>

            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition"
              title="Abrir em nova aba"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Nova Aba</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo com o visualizador do documento */}
        <div className="flex-1 bg-slate-900/90 relative min-h-[460px] flex items-center justify-center p-3 sm:p-6 overflow-auto">
          {isImage ? (
            <img
              src={fileUrl}
              alt={doc.title}
              referrerPolicy="no-referrer"
              className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-md border border-slate-700 bg-white"
            />
          ) : (
            <iframe
              src={fileUrl}
              title={doc.title}
              className="w-full h-[65vh] rounded-xl border border-slate-300 bg-white shadow-xs"
            />
          )}
        </div>

        {/* Rodapé com detalhes e conformidade LGPD */}
        <div className="px-6 py-3 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Documento sob custódia digital auditada (LGPD Art. 7º, II - Cumprimento de obrigação legal).</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
          >
            Fechar Visualização
          </button>
        </div>
      </div>
    </div>
  );
};
