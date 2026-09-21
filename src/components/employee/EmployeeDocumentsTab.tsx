import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, 
  FileText, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  FileCheck,
  Plus,
  RefreshCw,
  History,
  Search,
  Filter,
  Trash2,
  Edit3,
  Eye,
  ShieldCheck,
  Bell,
  CheckCircle,
  FileWarning
} from 'lucide-react';
import { 
  Employee, 
  Admission, 
  EmployeeDocument, 
  EmployeeDocumentCategory, 
  EmployeeDocumentStats,
  EmployeeDocumentExpirationStatus
} from '../../types/index.ts';
import { safeFetchJson } from '../../lib/api.ts';
import { UploadEmployeeDocumentModal } from './UploadEmployeeDocumentModal.tsx';
import { RenewDocumentVersionModal } from './RenewDocumentVersionModal.tsx';
import { EditEmployeeDocumentModal } from './EditEmployeeDocumentModal.tsx';
import { DocumentVersionsHistoryModal } from './DocumentVersionsHistoryModal.tsx';
import { DocumentPreviewModal } from './DocumentPreviewModal.tsx';
import { NotifyExpirationModal } from './NotifyExpirationModal.tsx';

interface EmployeeDocumentsTabProps {
  employee: Employee;
  admissions?: Admission[];
  initialDocuments?: EmployeeDocument[];
  initialStats?: EmployeeDocumentStats;
  onDocumentsUpdated?: () => void;
}

const CATEGORIES: Array<{ id: string; label: string }> = [
  { id: 'ALL', label: 'Todas as Categorias' },
  { id: 'Identificação', label: 'Identificação' },
  { id: 'Contratual', label: 'Contratual' },
  { id: 'Saúde e Segurança (SST)', label: 'Saúde e SST' },
  { id: 'Certificações e Treinamentos', label: 'Treinamentos' },
  { id: 'Financeiro e Benefícios', label: 'Financeiro' },
  { id: 'Outros', label: 'Outros' }
];

export const EmployeeDocumentsTab: React.FC<EmployeeDocumentsTabProps> = ({
  employee,
  admissions = [],
  initialDocuments,
  initialStats,
  onDocumentsUpdated
}) => {
  const [documents, setDocuments] = useState<EmployeeDocument[]>(initialDocuments || []);
  const [stats, setStats] = useState<EmployeeDocumentStats | null>(initialStats || null);
  const [isLoading, setIsLoading] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedExpiration, setSelectedExpiration] = useState<string>('ALL');
  const [selectedOrigin, setSelectedOrigin] = useState<string>('ALL');

  // Modais
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<EmployeeDocument | null>(null);
  const [previewVersion, setPreviewVersion] = useState<number | undefined>(undefined);
  const [renewDoc, setRenewDoc] = useState<EmployeeDocument | null>(null);
  const [editDoc, setEditDoc] = useState<EmployeeDocument | null>(null);
  const [historyDoc, setHistoryDoc] = useState<EmployeeDocument | null>(null);
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);

  // Exclusão com confirmação
  const [docToDelete, setDocToDelete] = useState<EmployeeDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Carrega documentos atualizados do backend
  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await safeFetchJson<{
        documents: EmployeeDocument[];
        stats: EmployeeDocumentStats;
        total: number;
      }>(`/api/employees/${employee.id}/documents`);

      if (res && res.documents) {
        setDocuments(res.documents);
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Erro ao carregar documentos do funcionário:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [employee.id]);

  const handleDocumentSuccess = () => {
    fetchDocuments();
    if (onDocumentsUpdated) {
      onDocumentsUpdated();
    }
  };

  const handleDeleteDocument = async () => {
    if (!docToDelete) return;

    if (docToDelete.origin === 'Admissão') {
      alert('Documentos originados de processos admissionais possuem proteção de integridade histórica e não podem ser excluídos.');
      setDocToDelete(null);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/employees/documents/${docToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'x-role': 'RH',
          'x-user-name': 'RH'
        }
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao excluir documento.');
      }

      setDocToDelete(null);
      handleDocumentSuccess();
    } catch (err: any) {
      alert(err.message || 'Falha ao excluir documento.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtragem client-side ágil
  const filteredDocuments = documents.filter(doc => {
    // Busca por texto
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchTitle = (doc.title || '').toLowerCase().includes(term);
      const matchFile = (doc.fileName || '').toLowerCase().includes(term);
      const matchNotes = (doc.notes || '').toLowerCase().includes(term);
      const matchCategory = (doc.category || '').toLowerCase().includes(term);
      if (!matchTitle && !matchFile && !matchNotes && !matchCategory) {
        return false;
      }
    }

    // Categoria
    if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) {
      return false;
    }

    // Status de Vencimento
    if (selectedExpiration !== 'ALL') {
      if (selectedExpiration === 'valid' && doc.expirationStatus !== 'valid') return false;
      if (selectedExpiration === 'near_expiration' && doc.expirationStatus !== 'near_expiration') return false;
      if (selectedExpiration === 'expired' && doc.expirationStatus !== 'expired') return false;
      if (selectedExpiration === 'no_expiration' && doc.expirationStatus !== 'no_expiration') return false;
    }

    // Origem
    if (selectedOrigin !== 'ALL') {
      if (selectedOrigin === 'Admissão' && doc.origin !== 'Admissão') return false;
      if (selectedOrigin === 'RH' && doc.origin === 'Admissão') return false;
    }

    return true;
  });

  // Documentos vencidos ou a vencer para alerta
  const urgentDocs = documents.filter(
    d => d.expirationStatus === 'expired' || d.expirationStatus === 'near_expiration'
  );

  const getExpirationBadge = (doc: EmployeeDocument) => {
    if (!doc.hasExpiration || !doc.expirationDate) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
          Permanente
        </span>
      );
    }

    const expDateStr = new Date(doc.expirationDate).toLocaleDateString('pt-BR');

    switch (doc.expirationStatus) {
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3" />
            Vencido ({expDateStr})
          </span>
        );
      case 'near_expiration':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" />
            Vence em breve ({expDateStr})
          </span>
        );
      case 'valid':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Válido até {expDateStr}
          </span>
        );
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'Identificação':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Contratual':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Saúde e Segurança (SST)':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Certificações e Treinamentos':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Financeiro e Benefícios':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Alerta de Vencimentos Urgentes (se houver) */}
      {urgentDocs.length > 0 && (
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                Atenção: Constam {urgentDocs.length} documento(s) com vencimento pendente ou próximo
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Existem exames ou certificações que demandam renovação periódica para manter a conformidade legal e trabalhista.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsNotifyOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-2xs transition shrink-0"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notificar Colaborador</span>
          </button>
        </div>
      )}

      {/* 2. Painel de Indicadores e Estatísticas de Vencimento (KPIs) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Custodiado
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {stats?.total ?? documents.length}
            </span>
            <span className="text-xs text-slate-400">docs</span>
          </div>
        </div>

        {/* Válidos */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Vigentes
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">
              {stats?.valid ?? documents.filter(d => d.expirationStatus === 'valid').length}
            </span>
            <span className="text-xs text-slate-400">regulares</span>
          </div>
        </div>

        {/* A Vencer (< 30 dias) */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block flex items-center gap-1">
            <Clock className="w-3 h-3" /> A Vencer (30d)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">
              {stats?.nearExpiration ?? documents.filter(d => d.expirationStatus === 'near_expiration').length}
            </span>
            <span className="text-xs text-slate-400">em alerta</span>
          </div>
        </div>

        {/* Vencidos */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Vencidos
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700">
              {stats?.expired ?? documents.filter(d => d.expirationStatus === 'expired').length}
            </span>
            <span className="text-xs text-slate-400">expirados</span>
          </div>
        </div>

        {/* Sem Validade */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Permanentes
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-700">
              {stats?.noExpiration ?? documents.filter(d => d.expirationStatus === 'no_expiration').length}
            </span>
            <span className="text-xs text-slate-400">vitalícios</span>
          </div>
        </div>
      </div>

      {/* 3. Barra de Ações Rápidas, Busca e Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Busca por texto */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por título do documento, nome do arquivo ou observações..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
            />
          </div>

          {/* Botão de Upload Novo Documento */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Documento</span>
            </button>
          </div>
        </div>

        {/* Controles de Filtros Avançados */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Categoria */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 shrink-0 font-medium">Categoria:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
            >
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Validade */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 shrink-0 font-medium">Validade:</span>
            <select
              value={selectedExpiration}
              onChange={(e) => setSelectedExpiration(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
            >
              <option value="ALL">Todas as Situações</option>
              <option value="valid">Apenas Válidos</option>
              <option value="near_expiration">A Vencer (&lt; 30 dias)</option>
              <option value="expired">Apenas Vencidos</option>
              <option value="no_expiration">Apenas Permanentes</option>
            </select>
          </div>

          {/* Origem */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 shrink-0 font-medium">Origem:</span>
            <select
              value={selectedOrigin}
              onChange={(e) => setSelectedOrigin(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
            >
              <option value="ALL">Todas as Origens</option>
              <option value="RH">Upload Direto RH</option>
              <option value="Admissão">Processo de Admissão</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Lista Consolidada de Documentos */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            Nenhum documento encontrado com os filtros aplicados
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {documents.length === 0 
              ? 'Ainda não constam documentos cadastrados no prontuário deste colaborador. Clique em "Novo Documento" para iniciar.' 
              : 'Tente ajustar os critérios de busca ou filtros acima para visualizar os registros.'}
          </p>
          {documents.length === 0 && (
            <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 text-white rounded-xl text-xs font-bold hover:bg-teal-800 transition mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Fazer Primeiro Upload</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
              <FolderOpen className="w-4 h-4 text-teal-700" />
              Prontuário de Documentos ({filteredDocuments.length})
            </h3>
            <span className="text-xs text-slate-400">
              Custódia Segura com Controle de Versões e LGPD
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredDocuments.map((doc) => {
              const fileUrl = doc.fileUrl || `/api/employees/documents/${doc.id}/file`;
              const downloadUrl = fileUrl.includes('?') ? `${fileUrl}&download=true` : `${fileUrl}?download=true`;
              const isFromAdmission = doc.origin === 'Admissão';

              return (
                <div 
                  key={doc.id}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                >
                  {/* Informações Principais */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="p-3 bg-teal-50 text-teal-700 rounded-xl shrink-0 mt-0.5 border border-teal-100">
                      <FileText className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {doc.title}
                        </span>

                        {/* Versão Interativa */}
                        <button
                          onClick={() => setHistoryDoc(doc)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition"
                          title="Clique para ver histórico de versões"
                        >
                          <History className="w-3 h-3" />
                          <span>v{doc.currentVersion || 1}</span>
                          {(doc.versions && doc.versions.length > 1) && (
                            <span className="text-[9px] opacity-75">({doc.versions.length} vias)</span>
                          )}
                        </button>

                        {/* Categoria */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryColor(doc.category)}`}>
                          {doc.category || 'Geral'}
                        </span>

                        {/* Badge de Validade */}
                        {getExpirationBadge(doc)}

                        {/* Origem */}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          {doc.origin === 'Admissão' ? `Admissão #${doc.admissionId || ''}` : 'Prontuário RH'}
                        </span>
                      </div>

                      {/* Metadados Técnicos do Arquivo */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="font-mono text-slate-700 font-medium truncate max-w-xs">
                          {doc.fileName}
                        </span>

                        {doc.fileSize && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400">
                              {(doc.fileSize / 1024).toFixed(0)} KB
                            </span>
                          </>
                        )}

                        <span>•</span>

                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {doc.issueDate ? `Emissão: ${new Date(doc.issueDate).toLocaleDateString('pt-BR')}` : `Cadastrado em: ${new Date(doc.createdAt).toLocaleDateString('pt-BR')}`}
                        </span>

                        {doc.uploadedBy && (
                          <>
                            <span>•</span>
                            <span>Por: <strong>{doc.uploadedBy}</strong></span>
                          </>
                        )}
                      </div>

                      {doc.notes && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/60 max-w-2xl">
                          <span className="font-semibold text-slate-700">Obs:</span> {doc.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Grupo de Ações de Gestão */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end lg:self-center">
                    {/* Visualizar Seguro (Modal) */}
                    <button
                      onClick={() => {
                        setPreviewDoc(doc);
                        setPreviewVersion(doc.currentVersion || 1);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition"
                      title="Visualizar documento em tela"
                    >
                      <Eye className="w-3.5 h-3.5 text-teal-700" />
                      <span>Visualizar</span>
                    </button>

                    {/* Renovar (Upload de Nova Versão) */}
                    <button
                      onClick={() => setRenewDoc(doc)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold shadow-2xs transition"
                      title="Renovar documento (Adicionar Versão)"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Renovar</span>
                    </button>

                    {/* Histórico de Versões */}
                    <button
                      onClick={() => setHistoryDoc(doc)}
                      className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-medium transition"
                      title="Histórico de versões arquivadas"
                    >
                      <History className="w-4 h-4" />
                    </button>

                    {/* Download Direto */}
                    <a
                      href={downloadUrl}
                      download={doc.fileName}
                      className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-medium transition"
                      title="Baixar arquivo original"
                    >
                      <Download className="w-4 h-4" />
                    </a>

                    {/* Editar Metadados */}
                    <button
                      onClick={() => setEditDoc(doc)}
                      className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-medium transition"
                      title="Editar informações cadastrais"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Excluir (apenas para docs do prontuário direto) */}
                    <button
                      onClick={() => setDocToDelete(doc)}
                      className={`p-1.5 rounded-xl text-xs font-medium transition ${
                        isFromAdmission 
                          ? 'text-slate-300 cursor-not-allowed' 
                          : 'text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200'
                      }`}
                      title={isFromAdmission ? 'Documentos de admissão não podem ser excluídos (integridade histórica)' : 'Excluir documento'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Modais Operacionais */}
      <UploadEmployeeDocumentModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        employee={employee}
        onSuccess={handleDocumentSuccess}
      />

      <RenewDocumentVersionModal
        isOpen={Boolean(renewDoc)}
        onClose={() => setRenewDoc(null)}
        document={renewDoc}
        onSuccess={handleDocumentSuccess}
      />

      <EditEmployeeDocumentModal
        isOpen={Boolean(editDoc)}
        onClose={() => setEditDoc(null)}
        document={editDoc}
        onSuccess={handleDocumentSuccess}
      />

      <DocumentVersionsHistoryModal
        isOpen={Boolean(historyDoc)}
        onClose={() => setHistoryDoc(null)}
        document={historyDoc}
        onSelectVersionPreview={(doc, version) => {
          setHistoryDoc(null);
          setPreviewDoc(doc);
          setPreviewVersion(version);
        }}
      />

      <DocumentPreviewModal
        isOpen={Boolean(previewDoc)}
        onClose={() => {
          setPreviewDoc(null);
          setPreviewVersion(undefined);
        }}
        document={previewDoc}
        version={previewVersion}
      />

      <NotifyExpirationModal
        isOpen={isNotifyOpen}
        onClose={() => setIsNotifyOpen(false)}
        employee={employee}
        expiringDocs={urgentDocs}
      />

      {/* Modal de Confirmação de Exclusão */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Excluir Documento?
                </h3>
                <p className="text-xs text-slate-500">
                  Ação sujeita a rastreamento no log de auditoria LGPD.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Tem certeza de que deseja excluir o documento <strong>"{docToDelete.title}"</strong> ({docToDelete.fileName}) do prontuário do colaborador?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleDeleteDocument}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
