import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Building,
  Briefcase,
  Calendar,
  UserCheck,
  RotateCcw,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckSquare,
  FileCheck2,
  FileWarning,
  SlidersHorizontal
} from 'lucide-react';
import {
  ApprovalQueueItem,
  ApprovalQueueResponse,
  ApprovalQueueFilters,
  ApprovalStatus,
  OperationalPriority
} from '../types/index.ts';
import { safeFetchJson } from '../lib/api.ts';
import { ApprovalDecisionModal } from '../components/ApprovalDecisionModal.tsx';

export const ApprovalQueue: React.FC = () => {
  const navigate = useNavigate();

  // Estados dos Dados
  const [data, setData] = useState<ApprovalQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados dos Filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  // Modal de Decisão
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);

  // Carregamento de dados com debounce na busca
  const loadApprovals = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (roleFilter !== 'all') params.set('responsible', roleFilter);
      if (unitFilter !== 'all') params.set('unit', unitFilter);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await safeFetchJson<ApprovalQueueResponse>(`/api/approvals?${params.toString()}`);
      if (res) {
        setData(res);
      } else {
        setError('Não foi possível obter a fila de aprovações.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar fila de aprovações.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter, priorityFilter, roleFilter, unitFilter, page, limit]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setRoleFilter('all');
    setUnitFilter('all');
    setPage(1);
  };

  const getPriorityBadge = (p: OperationalPriority) => {
    switch (p) {
      case 'CRITICA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Crítica
          </span>
        );
      case 'ALTA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Alta
          </span>
        );
      case 'NORMAL':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            Normal
          </span>
        );
    }
  };

  const getStatusBadge = (st: ApprovalStatus) => {
    switch (st) {
      case 'PENDENTE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Pendente
          </span>
        );
      case 'EM_ANALISE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Eye className="w-3 h-3" /> Em análise
          </span>
        );
      case 'APROVADA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Aprovada
          </span>
        );
      case 'REPROVADA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" /> Reprovada
          </span>
        );
      case 'CANCELADA':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
            Cancelada
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Topo da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Aprovações Internas
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Bloco 5.6
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Gestão, análise e deliberação formal das admissões antes da integração final.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadApprovals(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div
            onClick={() => { setStatusFilter('PENDENTE'); setPage(1); }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'PENDENTE'
                ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/20'
                : 'bg-white border-slate-200/80 hover:border-amber-200 hover:bg-amber-50/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Pendentes</span>
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{data.summary.pending}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Aguardando início</span>
          </div>

          <div
            onClick={() => { setStatusFilter('EM_ANALISE'); setPage(1); }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'EM_ANALISE'
                ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-400/20'
                : 'bg-white border-slate-200/80 hover:border-blue-200 hover:bg-blue-50/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Em Análise</span>
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Eye className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{data.summary.inReview}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Sendo avaliadas</span>
          </div>

          <div
            onClick={() => { setPriorityFilter('CRITICA'); setPage(1); }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              priorityFilter === 'CRITICA'
                ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-400/20'
                : 'bg-white border-slate-200/80 hover:border-rose-200 hover:bg-rose-50/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Críticas</span>
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-700">{data.summary.critical}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Reprovadas / Urgentes</span>
          </div>

          <div
            onClick={() => { setStatusFilter('APROVADA'); setPage(1); }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'APROVADA'
                ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/20'
                : 'bg-white border-slate-200/80 hover:border-emerald-200 hover:bg-emerald-50/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Aprovadas</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{data.summary.approved}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Liberadas para conclusão</span>
          </div>

          <div
            onClick={() => { setStatusFilter('REPROVADA'); setPage(1); }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'REPROVADA'
                ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-400/20'
                : 'bg-white border-slate-200/80 hover:border-rose-200 hover:bg-rose-50/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Reprovadas</span>
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{data.summary.rejected}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Necessitam revisão</span>
          </div>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Busca por texto */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por colaborador, cargo, departamento, CPF ou código..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden bg-slate-50/50"
            />
          </div>

          {/* Filtros em Select */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="text-xs py-2 px-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium text-slate-700"
            >
              <option value="all">Status: Todos</option>
              <option value="PENDENTE">Status: Pendente</option>
              <option value="EM_ANALISE">Status: Em Análise</option>
              <option value="APROVADA">Status: Aprovada</option>
              <option value="REPROVADA">Status: Reprovada</option>
              <option value="CANCELADA">Status: Cancelada</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
              className="text-xs py-2 px-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium text-slate-700"
            >
              <option value="all">Prioridade: Todas</option>
              <option value="CRITICA">Prioridade: Crítica</option>
              <option value="ALTA">Prioridade: Alta</option>
              <option value="NORMAL">Prioridade: Normal</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="text-xs py-2 px-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium text-slate-700"
            >
              <option value="all">Responsável: Todos</option>
              <option value="RH">Responsável: RH</option>
              <option value="GESTOR">Responsável: Gestor</option>
              <option value="ADMIN">Responsável: Diretoria/Admin</option>
              <option value="DP">Responsável: DP</option>
            </select>

            {(search || statusFilter !== 'all' || priorityFilter !== 'all' || roleFilter !== 'all') && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-2"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Aprovações */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading && !refreshing ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-600">Carregando fila de aprovações...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-800">Falha ao obter dados</p>
            <p className="text-xs text-slate-500">{error}</p>
            <button
              onClick={() => loadApprovals(true)}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : !data?.items || data.items.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">Nenhuma aprovação encontrada</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Não há registros com os critérios informados. Ajuste os filtros para visualizar outras admissões.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Código / Solicitado</th>
                  <th className="py-3 px-4">Colaborador</th>
                  <th className="py-3 px-4">Previsão de Início</th>
                  <th className="py-3 px-4">Conformidade Doc.</th>
                  <th className="py-3 px-4">Prioridade</th>
                  <th className="py-3 px-4">Status & Parecer</th>
                  <th className="py-3 px-4">Papel</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {data.items.map((item) => (
                  <tr
                    key={item.approvalId}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* Código / Data de Solicitação */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-900 block">
                        {item.admissionCode}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(item.requestedAt).toLocaleDateString('pt-BR')}
                      </span>
                    </td>

                    {/* Colaborador */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.employeeName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="font-medium text-slate-700">{item.employeeRole}</span>
                        <span>•</span>
                        <span>{item.employeeDepartment}</span>
                        {item.employeeUnit && (
                          <>
                            <span>•</span>
                            <span>{item.employeeUnit}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="font-mono text-[10px] text-slate-400">{item.employeeCpf}</span>
                      </div>
                    </td>

                    {/* Previsão de Início & Tempo Aguardando */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-800">
                        {item.expectedStartDate
                          ? new Date(item.expectedStartDate).toLocaleDateString('pt-BR')
                          : 'A definir'}
                      </div>
                      {item.status !== 'APROVADA' && item.status !== 'CANCELADA' && (
                        <div className={`text-[11px] font-medium ${
                          item.waitingDays >= 5 ? 'text-rose-600 font-semibold' : 'text-slate-400'
                        }`}>
                          {item.waitingDays === 0
                            ? 'Solicitado hoje'
                            : `${item.waitingDays} dia(s) na fila`}
                        </div>
                      )}
                    </td>

                    {/* Documentos */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800">
                          {item.approvedDocsCount}/{item.totalDocsCount}
                        </span>
                        {item.pendingDocsCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700">
                            {item.pendingDocsCount} pendente(s)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">
                            100% aprovado
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Prioridade Operacional */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getPriorityBadge(item.priority)}
                    </td>

                    {/* Status da Aprovação */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div>{getStatusBadge(item.status)}</div>
                      {item.status === 'REPROVADA' && item.decisionReason && (
                        <div className="text-[10px] text-rose-600 truncate max-w-[180px] mt-0.5 font-medium" title={item.decisionReason}>
                          {item.decisionReason}
                        </div>
                      )}
                      {item.status === 'APROVADA' && item.decidedBy && (
                        <div className="text-[10px] text-emerald-600 truncate max-w-[180px] mt-0.5" title={`Por ${item.decidedBy}`}>
                          Por {item.decidedBy}
                        </div>
                      )}
                    </td>

                    {/* Papel */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {item.responsibleRole}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedApprovalId(item.approvalId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{item.status === 'APROVADA' ? 'Ver Parecer' : 'Avaliar'}</span>
                        </button>

                        <button
                          onClick={() => navigate(`/admissoes/${item.admissionId}`)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Abrir Prontuário da Admissão"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé com Paginação */}
        {data && data.totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
            <span>
              Mostrando {((data.page - 1) * data.limit) + 1} a {Math.min(data.page * data.limit, data.total)} de {data.total} aprovações
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={data.page === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-800">
                Página {data.page} de {data.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={data.page === data.totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Decisão do Aprovador */}
      {selectedApprovalId && (
        <ApprovalDecisionModal
          approvalId={selectedApprovalId}
          onClose={() => setSelectedApprovalId(null)}
          onSuccess={() => {
            setSelectedApprovalId(null);
            loadApprovals(true);
          }}
        />
      )}
    </div>
  );
};
