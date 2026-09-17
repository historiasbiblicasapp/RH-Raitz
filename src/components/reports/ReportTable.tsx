import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowUpDown, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ShieldAlert, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { 
  ReportType, 
  ReportRowAdmission, 
  ReportRowDocument, 
  ReportRowPending, 
  ReportRowCompleted, 
  ReportRowCancelled 
} from '../../types/index.ts';
import { StatusBadge } from '../StatusBadge.tsx';

interface ReportTableProps {
  reportType: ReportType;
  rows: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort: (field: string) => void;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  isLoading: boolean;
}

export const ReportTable: React.FC<ReportTableProps> = ({
  reportType,
  rows,
  total,
  page,
  limit,
  totalPages,
  sortBy,
  sortOrder,
  onSort,
  onPageChange,
  onLimitChange,
  isLoading
}) => {
  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString('pt-BR');
    } catch {
      return isoStr;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-slate-700">Carregando dados do relatório...</p>
        <p className="text-[11px] text-slate-400">Consolidando informações reais do sistema.</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <FileText className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-800">Nenhum registro encontrado</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Não foram encontradas informações correspondentes aos filtros selecionados neste relatório. Tente alterar o período ou os critérios de busca.
        </p>
      </div>
    );
  }

  const startRecord = (page - 1) * limit + 1;
  const endRecord = Math.min(total, page * limit);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* Tabela Responsiva */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold select-none">
              {/* Cabeçalhos Dinâmicos baseados no reportType */}
              {reportType === 'admissoes' && (
                <>
                  <th className="py-3 px-4">Código</th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                    onClick={() => onSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Colaborador</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                    onClick={() => onSort('role')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Cargo / Setor</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Unidade</th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                    onClick={() => onSort('status')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Previsão Início</th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                    onClick={() => onSort('progress')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Progresso</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                    onClick={() => onSort('duration')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Tempo (Dias)</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </>
              )}

              {reportType === 'documentos' && (
                <>
                  <th className="py-3 px-4">Admissão / Colaborador</th>
                  <th className="py-3 px-4">Cargo / Setor</th>
                  <th className="py-3 px-4">Documento</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Obrigatório</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Versão</th>
                  <th className="py-3 px-4">Datas</th>
                  <th className="py-3 px-4">Conferido Por / Motivo</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </>
              )}

              {reportType === 'pendencias' && (
                <>
                  <th className="py-3 px-4">Admissão / Colaborador</th>
                  <th className="py-3 px-4">Cargo / Setor</th>
                  <th className="py-3 px-4">Item Pendente</th>
                  <th className="py-3 px-4">Tipo da Pendência</th>
                  <th className="py-3 px-4">Prioridade</th>
                  <th className="py-3 px-4">Dias Pendente</th>
                  <th className="py-3 px-4">Status Atual</th>
                  <th className="py-3 px-4">Motivo / Justificativa</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </>
              )}

              {reportType === 'concluidas' && (
                <>
                  <th className="py-3 px-4">Código</th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                    onClick={() => onSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Colaborador</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Cargo / Setor</th>
                  <th className="py-3 px-4">Unidade</th>
                  <th className="py-3 px-4">Data Criação</th>
                  <th className="py-3 px-4">Data Conclusão</th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                    onClick={() => onSort('duration')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Tempo Total (Dias)</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Concluído Por</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </>
              )}

              {reportType === 'canceladas' && (
                <>
                  <th className="py-3 px-4">Código</th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                    onClick={() => onSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Colaborador</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Cargo / Setor</th>
                  <th className="py-3 px-4">Unidade</th>
                  <th className="py-3 px-4">Data Criação</th>
                  <th className="py-3 px-4">Data Cancelamento</th>
                  <th className="py-3 px-4">Cancelado Por</th>
                  <th className="py-3 px-4">Motivo Informado</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-slate-700">
            {/* 1. Linhas para Relatório Geral de Admissões */}
            {reportType === 'admissoes' && (rows as ReportRowAdmission[]).map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-4 font-mono font-medium text-blue-600">
                  {r.admissionCode}
                </td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-900">{r.employeeName}</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <span>CPF: {r.employeeCpfMasked}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-slate-800">{r.role}</div>
                  <div className="text-[11px] text-slate-500">{r.department}</div>
                </td>
                <td className="py-3 px-4 text-slate-600 font-medium">
                  {r.unit || 'Matriz'}
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={r.status} size="sm" />
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {formatDate(r.expectedStartDate)}
                </td>
                <td className="py-3 px-4">
                  <div className="w-28 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700">{r.progressPercent}%</span>
                      <span className="text-slate-400 font-medium">
                        {r.approvedDocuments}/{r.totalDocuments}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full" 
                        style={{ width: `${r.progressPercent}%` }} 
                      />
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 font-medium text-slate-700">
                  {r.durationDays !== undefined ? `${r.durationDays}d` : '—'}
                </td>
                <td className="py-3 px-4 text-right">
                  <Link
                    to={`/admissoes/${r.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 rounded-md transition-colors"
                    title="Ver detalhes da admissão"
                  >
                    <span>Ver</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}

            {/* 2. Linhas para Relatório de Documentos */}
            {reportType === 'documentos' && (rows as ReportRowDocument[]).map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-mono text-[11px] text-blue-600 font-medium">{r.admissionCode}</div>
                  <div className="font-semibold text-slate-900">{r.employeeName}</div>
                  <div className="text-[11px] text-slate-400">CPF: {r.employeeCpfMasked}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-slate-800">{r.role}</div>
                  <div className="text-[11px] text-slate-500">{r.department}</div>
                </td>
                <td className="py-3 px-4 font-semibold text-slate-800">
                  {r.documentName}
                </td>
                <td className="py-3 px-4 text-slate-600">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                    {r.category}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {r.required ? (
                    <span className="text-rose-600 font-semibold text-[11px]">Sim</span>
                  ) : (
                    <span className="text-slate-400 text-[11px]">Opcional</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={r.status} size="sm" />
                </td>
                <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                  V{r.currentVersion}
                </td>
                <td className="py-3 px-4 text-[11px] text-slate-600 space-y-0.5">
                  <div>Envio: {formatDate(r.uploadedAt)}</div>
                  <div>Conf.: {formatDate(r.reviewedAt)}</div>
                </td>
                <td className="py-3 px-4 text-[11px]">
                  {r.rejectionReason ? (
                    <div className="text-rose-700 font-medium max-w-[200px] truncate" title={r.rejectionReason}>
                      Motivo: {r.rejectionReason}
                    </div>
                  ) : (
                    <div className="text-slate-500">
                      {r.reviewedBy ? `Por: ${r.reviewedBy}` : '—'}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <Link
                    to={`/admissoes/${r.admissionId}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    <span>Abrir</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}

            {/* 3. Linhas para Relatório de Pendências */}
            {reportType === 'pendencias' && (rows as ReportRowPending[]).map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-mono text-[11px] text-blue-600 font-medium">{r.admissionCode}</div>
                  <div className="font-semibold text-slate-900">{r.employeeName}</div>
                  <div className="text-[11px] text-slate-400">CPF: {r.employeeCpfMasked}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-slate-800">{r.role}</div>
                  <div className="text-[11px] text-slate-500">{r.department}</div>
                </td>
                <td className="py-3 px-4 font-semibold text-slate-800">
                  {r.documentName || 'Admissão Geral'}
                </td>
                <td className="py-3 px-4 text-slate-700">
                  {r.pendingTypeLabel}
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    r.priority === 'Alta' 
                      ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                      : r.priority === 'Média'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {r.priority}
                  </span>
                </td>
                <td className="py-3 px-4 font-semibold text-slate-700">
                  {r.daysPending} dia(s)
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={r.status} size="sm" />
                </td>
                <td className="py-3 px-4 text-[11px] text-slate-600 max-w-[200px] truncate" title={r.rejectionReason || ''}>
                  {r.rejectionReason || 'Aguardando ação'}
                </td>
                <td className="py-3 px-4 text-right">
                  <Link
                    to={`/admissoes/${r.admissionId}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    <span>Tratar</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}

            {/* 4. Linhas para Relatório de Concluídas */}
            {reportType === 'concluidas' && (rows as ReportRowCompleted[]).map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-4 font-mono font-medium text-emerald-600">
                  {r.admissionCode}
                </td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-900">{r.employeeName}</div>
                  <div className="text-[11px] text-slate-400">CPF: {r.employeeCpfMasked}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-slate-800">{r.role}</div>
                  <div className="text-[11px] text-slate-500">{r.department}</div>
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {r.unit}
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {formatDate(r.createdAt)}
                </td>
                <td className="py-3 px-4 text-emerald-700 font-medium">
                  {formatDate(r.completedAt)}
                </td>
                <td className="py-3 px-4">
                  <span className="font-bold text-slate-800">{r.durationDays}</span>
                  <span className="text-[11px] text-slate-500 ml-1">dias corridos</span>
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {r.completedBy}
                </td>
                <td className="py-3 px-4 text-right">
                  <Link
                    to={`/admissoes/${r.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    <span>Ver</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}

            {/* 5. Linhas para Relatório de Canceladas */}
            {reportType === 'canceladas' && (rows as ReportRowCancelled[]).map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-4 font-mono font-medium text-slate-600">
                  {r.admissionCode}
                </td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-900">{r.employeeName}</div>
                  <div className="text-[11px] text-slate-400">CPF: {r.employeeCpfMasked}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-slate-800">{r.role}</div>
                  <div className="text-[11px] text-slate-500">{r.department}</div>
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {r.unit}
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {formatDate(r.createdAt)}
                </td>
                <td className="py-3 px-4 text-rose-700 font-medium">
                  {formatDate(r.cancelledAt)}
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {r.cancelledBy}
                </td>
                <td className="py-3 px-4 text-slate-700 max-w-[220px] truncate" title={r.cancellationReason}>
                  {r.cancellationReason}
                </td>
                <td className="py-3 px-4 text-right">
                  <Link
                    to={`/admissoes/${r.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    <span>Ver</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Barra Inferior de Paginação */}
      <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <span>
            Mostrando <strong className="font-semibold text-slate-900">{startRecord}</strong> a{' '}
            <strong className="font-semibold text-slate-900">{endRecord}</strong> de{' '}
            <strong className="font-semibold text-slate-900">{total}</strong> registros
          </span>

          <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
            <span className="text-slate-400">Por página:</span>
            <select
              id="report-limit-select"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-700 focus:outline-hidden"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            id="report-prev-page-btn"
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition-colors"
            title="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 py-1 font-medium text-slate-700">
            Página {page} de {totalPages || 1}
          </span>

          <button
            id="report-next-page-btn"
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition-colors"
            title="Próxima página"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
