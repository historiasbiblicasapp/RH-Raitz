import React from 'react';
import { 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink, 
  MessageSquare, 
  ArrowRight,
  User,
  History,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TrackingItem, OperationalSituation } from '../types/index.ts';

interface TrackingTableProps {
  items: TrackingItem[];
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  onOpenCommunication: (item: TrackingItem) => void;
  isLoading: boolean;
}

export const TrackingTable: React.FC<TrackingTableProps> = ({
  items,
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onOpenCommunication,
  isLoading
}) => {
  const navigate = useNavigate();

  // Cores e estilos para cada Situação Operacional Centralizada
  const getSituationStyle = (situation: OperationalSituation) => {
    switch (situation) {
      case 'data_ultrapassada':
        return 'bg-amber-100/80 text-amber-900 border-amber-300';
      case 'documento_rejeitado':
        return 'bg-rose-100/80 text-rose-900 border-rose-300';
      case 'aguardando_rh':
        return 'bg-sky-100/80 text-sky-900 border-sky-300';
      case 'aguardando_funcionario':
        return 'bg-indigo-100/80 text-indigo-900 border-indigo-300';
      case 'proxima_admissao':
        return 'bg-blue-100/80 text-blue-900 border-blue-300';
      case 'sem_movimentacao':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'concluida':
        return 'bg-emerald-100/80 text-emerald-900 border-emerald-300';
      case 'cancelada':
        return 'bg-zinc-100 text-zinc-700 border-zinc-300';
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  const formatExpectedDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatMovementTime = (days: number, hours: number) => {
    if (days === 0) {
      if (hours === 0) return 'Recentemente';
      return `Há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }
    return `Há ${days} ${days === 1 ? 'dia' : 'dias'}`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-semibold">Carregando dados de prazos e acompanhamento...</p>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-800 mb-1">Nenhuma admissão encontrada</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Não há registros que correspondam aos filtros e critérios operacionais selecionados.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Tabela para Telas Médias e Grandes */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Colaborador / Cargo</th>
              <th className="py-3 px-3">Data Prevista</th>
              <th className="py-3 px-3">Situação Operacional</th>
              <th className="py-3 px-3">Progresso Docs</th>
              <th className="py-3 px-3">Última Movimentação</th>
              <th className="py-3 px-3">Principal Pendência</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {items.map((item) => (
              <tr 
                key={item.id}
                id={`row-tracking-${item.admissionId}`}
                className="hover:bg-slate-50/80 transition-colors"
              >
                {/* Colaborador */}
                <td className="py-3.5 px-4">
                  <div className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer"
                    onClick={() => navigate(`/admissoes/${item.admissionId}`)}
                  >
                    {item.employeeName}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {item.role} • {item.department}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                    <span>{item.employeeCpf}</span>
                    <span>•</span>
                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-sans font-semibold">
                      {item.admissionCode}
                    </span>
                  </div>
                </td>

                {/* Data Prevista de Início */}
                <td className="py-3.5 px-3 whitespace-nowrap">
                  <div className="font-bold text-slate-800">
                    {formatExpectedDate(item.expectedStartDate)}
                  </div>
                  <div className="mt-0.5">
                    {item.isOverdue ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                        Ultrapassada há {item.daysSinceOverdue}d
                      </span>
                    ) : item.daysToExpectedDate === 0 ? (
                      <span className="inline-flex items-center text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                        Hoje
                      </span>
                    ) : item.isUpcoming ? (
                      <span className="inline-flex items-center text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        Em {item.daysToExpectedDate} dias
                      </span>
                    ) : item.admissionStatus === 'Concluída' ? (
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        Concluída
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-medium">
                        Em {item.daysToExpectedDate} dias
                      </span>
                    )}
                  </div>
                </td>

                {/* Situação Operacional */}
                <td className="py-3.5 px-3">
                  <div className="flex flex-col gap-1 items-start">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${getSituationStyle(item.operationalSituation)}`}>
                      {item.operationalSituationLabel}
                    </span>

                    {/* Badges Secundárias */}
                    {item.secondarySituations && item.secondarySituations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {item.secondarySituations.map((sec, idx) => (
                          <span
                            key={idx}
                            className="inline-block text-[9.5px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200/60"
                          >
                            {sec.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </td>

                {/* Progresso de Documentos */}
                <td className="py-3.5 px-3 whitespace-nowrap">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          item.progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${item.progressPercent}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-800">
                      {item.progressPercent}%
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {item.approvedDocuments} de {item.totalDocuments} validados
                  </div>
                </td>

                {/* Última Movimentação */}
                <td className="py-3.5 px-3 max-w-[200px]">
                  <div className="text-xs text-slate-800 font-medium line-clamp-1" title={item.lastMovementDescription}>
                    {item.lastMovementDescription}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                    <History className="w-3 h-3 text-slate-400" />
                    <span>{formatMovementTime(item.daysWithoutMovement, item.hoursWithoutMovement)}</span>
                    {item.daysWithoutMovement >= 3 && item.admissionStatus !== 'Concluída' && item.admissionStatus !== 'Cancelada' && (
                      <span className="text-amber-700 font-bold bg-amber-50 px-1 rounded">
                        Sem atividade
                      </span>
                    )}
                  </div>
                </td>

                {/* Principal Pendência */}
                <td className="py-3.5 px-3 max-w-[220px]">
                  <div className="text-xs text-slate-700 font-medium line-clamp-2" title={item.mainPendingReason}>
                    {item.mainPendingReason}
                  </div>
                </td>

                {/* Ações Rápidas */}
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Botão Comunicar */}
                    <button
                      id={`btn-comunicar-${item.admissionId}`}
                      onClick={() => onOpenCommunication(item)}
                      className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      title="Comunicar funcionário via WhatsApp ou link"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>

                    {/* Botão Ver Pendências */}
                    <button
                      id={`btn-pendencias-${item.admissionId}`}
                      onClick={() => navigate(`/pendencias?search=${encodeURIComponent(item.employeeName)}`)}
                      className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      title="Ver na Central de Pendências"
                    >
                      Pendências
                    </button>

                    {/* Botão Ver Detalhes */}
                    <button
                      id={`btn-detalhes-${item.admissionId}`}
                      onClick={() => navigate(`/admissoes/${item.admissionId}`)}
                      className="flex items-center gap-0.5 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      title="Abrir detalhes da admissão"
                    >
                      <span>Ver</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards para Telas Mobile */}
      <div className="block md:hidden divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 
                  className="text-xs font-bold text-slate-900 hover:text-blue-600 cursor-pointer"
                  onClick={() => navigate(`/admissoes/${item.admissionId}`)}
                >
                  {item.employeeName}
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  {item.role} • {item.department}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {item.employeeCpf} • {item.admissionCode}
                </p>
              </div>

              <span className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold border ${getSituationStyle(item.operationalSituation)}`}>
                {item.operationalSituationLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block">Data Prevista:</span>
                <span className="font-bold text-slate-800">
                  {formatExpectedDate(item.expectedStartDate)}
                </span>
                {item.isOverdue && (
                  <span className="block text-[10px] font-bold text-amber-700 mt-0.5">
                    Ultrapassada há {item.daysSinceOverdue}d
                  </span>
                )}
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block">Evolução:</span>
                <span className="font-bold text-blue-600">{item.progressPercent}%</span>
                <span className="text-[10px] text-slate-500 ml-1">({item.approvedDocuments}/{item.totalDocuments})</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 block uppercase">Última Movimentação:</span>
              <p className="text-xs text-slate-800 font-medium">{item.lastMovementDescription}</p>
              <p className="text-[10px] text-slate-500">{formatMovementTime(item.daysWithoutMovement, item.hoursWithoutMovement)}</p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => onOpenCommunication(item)}
                className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Comunicar</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/pendencias?search=${encodeURIComponent(item.employeeName)}`)}
                  className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg cursor-pointer"
                >
                  Pendências
                </button>
                <button
                  onClick={() => navigate(`/admissoes/${item.admissionId}`)}
                  className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg cursor-pointer"
                >
                  <span>Ver Detalhes</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50/70 border-t border-slate-200 text-xs text-slate-600">
        <div>
          Página <strong>{page}</strong> de <strong>{totalPages}</strong> ({total} registros no total)
        </div>

        <div className="flex items-center gap-1.5">
          <button
            id="btn-tracking-prev-page"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Anterior</span>
          </button>
          <button
            id="btn-tracking-next-page"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>Próxima</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
