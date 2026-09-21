import React from 'react';
import { X, History, FileText, Download, ExternalLink, Calendar, User, Eye, CheckCircle2 } from 'lucide-react';
import { EmployeeDocument, EmployeeDocumentVersion } from '../../types/index.ts';

interface DocumentVersionsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: EmployeeDocument | null;
  onSelectVersionPreview: (doc: EmployeeDocument, versionNumber: number) => void;
}

export const DocumentVersionsHistoryModal: React.FC<DocumentVersionsHistoryModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  onSelectVersionPreview
}) => {
  if (!isOpen || !doc) return null;

  const versions = [...(doc.versions || [])].sort((a, b) => b.version - a.version);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Histórico de Versões
              </h3>
              <p className="text-xs text-slate-500">
                {doc.title} • {versions.length} {versions.length === 1 ? 'versão registrada' : 'versões registradas'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Versões em Linha do Tempo */}
        <div className="p-6 overflow-y-auto space-y-4">
          {versions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              Nenhuma versão anterior registrada para este documento.
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((ver, idx) => {
                const isCurrent = ver.version === (doc.currentVersion || 1);
                const fileUrl = `/api/employees/documents/${doc.id}/file?version=${ver.version}`;

                return (
                  <div
                    key={ver.version}
                    className={`p-4 rounded-xl border transition ${
                      isCurrent 
                        ? 'border-indigo-200 bg-indigo-50/40 shadow-2xs' 
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                          isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <FileText className="w-4 h-4" />
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900">
                              Versão {ver.version}
                            </span>
                            {isCurrent && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                <CheckCircle2 className="w-3 h-3" /> Versão Atual Vigente
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-mono text-slate-600 truncate">
                            {ver.fileName} {ver.fileSize ? `(${Math.round(ver.fileSize / 1024)} KB)` : ''}
                          </p>

                          {ver.replacementReason && (
                            <div className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80 inline-block">
                              Motivo da substituição: {ver.replacementReason}
                            </div>
                          )}

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap pt-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {new Date(ver.uploadedAt).toLocaleString('pt-BR')}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              Por: {ver.uploadedBy || 'RH'}
                            </span>
                            {ver.fileHash && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-[10px] text-slate-400" title={`Hash SHA-256: ${ver.fileHash}`}>
                                  SHA-256: {ver.fileHash.slice(0, 10)}...
                                </span>
                              </>
                            )}
                          </div>

                          {ver.notes && (
                            <p className="text-xs text-slate-600 bg-white/80 p-2 rounded-md border border-slate-200/60 mt-1 italic">
                              "{ver.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => onSelectVersionPreview(doc, ver.version)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition"
                          title="Visualizar esta versão"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Ver</span>
                        </button>

                        <a
                          href={`${fileUrl}&download=true`}
                          download={ver.fileName}
                          className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition"
                          title="Baixar arquivo desta versão"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-600" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition"
          >
            Fechar Histórico
          </button>
        </div>
      </div>
    </div>
  );
};
