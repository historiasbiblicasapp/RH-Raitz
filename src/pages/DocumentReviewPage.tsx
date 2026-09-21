import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileCheck2, 
  Search, 
  Filter, 
  Clock, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  FileText 
} from 'lucide-react';
import { Admission, AdmissionDocument } from '../types/index.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { DocumentReviewModal } from '../components/DocumentReviewModal.tsx';
import { safeFetchJson } from '../lib/api.ts';
import { handleFallbackApiRoute } from '../lib/fallbackClient.ts';

interface FlatDocumentItem {
  admission: Admission;
  document: AdmissionDocument;
}

export const DocumentReviewPage: React.FC = () => {
  const [admissions, setAdmissions] = useState<Admission[]>(() => {
    const res = handleFallbackApiRoute('/api/admissions');
    return res?.admissions || [];
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Em conferência');
  const [activeReviewItem, setActiveReviewItem] = useState<FlatDocumentItem | null>(null);

  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await safeFetchJson<any>('/api/admissions');
      if (data && data.admissions) {
        setAdmissions(data.admissions);
      } else if (Array.isArray(data)) {
        setAdmissions(data);
      }
    } catch (err) {
      console.warn('Erro ao carregar dados de revisão:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReviewSubmit = async (
    documentId: string, 
    decision: 'Aprovado' | 'Rejeitado', 
    reason?: string, 
    notes?: string
  ) => {
    const res = await fetch(`/api/documents/${documentId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, rejectionReason: reason, rejectionNotes: notes })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha ao salvar decisão.');
    }

    await loadData();
    setActiveReviewItem(null);
  };

  // Monta lista de documentos planos com referência à admissão
  const flatDocuments: FlatDocumentItem[] = [];
  admissions.forEach((adm) => {
    adm.documents.forEach((doc) => {
      flatDocuments.push({ admission: adm, document: doc });
    });
  });

  const filteredItems = flatDocuments.filter(({ admission, document }) => {
    const matchesSearch = 
      admission.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      document.documentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admission.employee.role.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'TODOS') return matchesSearch;
    if (statusFilter === 'Em conferência') {
      return matchesSearch && (document.status === 'Em análise' || document.status === 'Reenviado' || document.status === 'Enviado');
    }
    return matchesSearch && document.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Topo com Título e Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/raitz-logo.jpg"
            alt="Logo Raitz"
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-xl object-cover shadow-xs border border-slate-200 shrink-0"
          />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Conferência de Documentos</h1>
            <p className="text-xs text-slate-500">
              Fila de documentos enviados pelos colaboradores aguardando validação do RH.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar documento ou colaborador..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="Em conferência">Aguardando Conferência</option>
              <option value="TODOS">Todos os Documentos</option>
              <option value="Aprovado">Aprovados</option>
              <option value="Rejeitado">Rejeitados</option>
              <option value="Não enviado">Não enviados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid ou Tabela de Documentos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Documento</th>
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-4">Versão</th>
                <th className="py-3 px-4">Data de Envio</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Nenhum documento encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredItems.map(({ admission, document }) => (
                  <tr key={document.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{document.documentType}</p>
                          <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                            {document.fileName || 'Aguardando upload'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{admission.employee.name}</p>
                      <p className="text-[11px] text-slate-400">{admission.employee.role}</p>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      V{document.currentVersion}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {document.uploadedAt 
                        ? new Date(document.uploadedAt).toLocaleString('pt-BR') 
                        : '—'}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={document.status} size="sm" />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {document.currentVersion > 0 ? (
                        <button
                          type="button"
                          onClick={() => setActiveReviewItem({ admission, document })}
                          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg shadow-xs transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Conferir</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Pendente</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Conferência */}
      <DocumentReviewModal
        document={activeReviewItem?.document || null}
        admission={activeReviewItem?.admission || null}
        isOpen={!!activeReviewItem}
        onClose={() => setActiveReviewItem(null)}
        onReviewSubmit={handleReviewSubmit}
      />
    </div>
  );
};
