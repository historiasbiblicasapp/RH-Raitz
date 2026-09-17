import React, { useEffect, useState, useCallback } from 'react';
import { 
  Users, 
  FileCheck2, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Download, 
  RefreshCw, 
  FileSpreadsheet, 
  ShieldCheck, 
  Check, 
  Info 
} from 'lucide-react';
import { 
  ReportType, 
  ReportFilterOptions, 
  ReportDataResponse 
} from '../types/index.ts';
import { safeFetchJson } from '../lib/api.ts';
import { ReportKPIs } from '../components/reports/ReportKPIs.tsx';
import { ReportFilters } from '../components/reports/ReportFilters.tsx';
import { ReportChartsSection } from '../components/reports/ReportChartsSection.tsx';
import { ReportTable } from '../components/reports/ReportTable.tsx';

interface ReportTabConfig {
  id: ReportType;
  label: string;
  description: string;
  icon: React.ElementType;
}

const REPORT_TABS: ReportTabConfig[] = [
  {
    id: 'admissoes',
    label: 'Admissões Gerais',
    description: 'Visão integral dos processos de admissão, status, dados e tempo de evolução.',
    icon: Users
  },
  {
    id: 'documentos',
    label: 'Documentos & Auditoria',
    description: 'Auditoria de documentos enviados, conferências, versões e motivos de rejeição.',
    icon: FileCheck2
  },
  {
    id: 'pendencias',
    label: 'Pendências Operacionais',
    description: 'Detecção de gargalos, documentos pendentes, prioridades e conferências.',
    icon: AlertTriangle
  },
  {
    id: 'concluidas',
    label: 'Admissões Concluídas',
    description: 'Métricas de sucesso, SLA de conclusão e tempo médio de fechamento.',
    icon: CheckCircle2
  },
  {
    id: 'canceladas',
    label: 'Admissões Canceladas',
    description: 'Histórico de desistências ou cancelamentos, motivos e responsáveis.',
    icon: XCircle
  }
];

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>('admissoes');
  const [filters, setFilters] = useState<ReportFilterOptions>({
    period: 'all',
    status: 'TODOS',
    cargo: 'TODOS',
    setor: 'TODOS',
    unidade: 'TODOS',
    documentStatus: 'TODOS',
    search: '',
    page: 1,
    limit: 15,
    sortBy: 'date',
    sortOrder: 'desc'
  });

  const [data, setData] = useState<ReportDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carregamento de dados com tratamento de cancelamento
  const loadReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('reportType', reportType);
      if (filters.period) params.set('period', filters.period);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.status) params.set('status', filters.status);
      if (filters.cargo) params.set('cargo', filters.cargo);
      if (filters.setor) params.set('setor', filters.setor);
      if (filters.unidade) params.set('unidade', filters.unidade);
      if (filters.documentStatus) params.set('documentStatus', filters.documentStatus);
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

      const res = await safeFetchJson<ReportDataResponse>(`/api/reports?${params.toString()}`);
      if (res && res.indicators) {
        setData(res);
      }
    } catch (err: any) {
      console.error('Erro ao carregar relatório:', err);
      setToastMessage({
        type: 'error',
        text: 'Não foi possível carregar os dados do relatório: ' + (err?.message || 'Erro de conexão')
      });
    } finally {
      setIsLoading(false);
    }
  }, [reportType, filters]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Limpeza de toast automático após 4 segundos
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Manipuladores de Filtros
  const handleFilterChange = (newFilters: Partial<ReportFilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: newFilters.page ?? 1 }));
  };

  const handleResetFilters = () => {
    setFilters({
      period: 'all',
      status: 'TODOS',
      cargo: 'TODOS',
      setor: 'TODOS',
      unidade: 'TODOS',
      documentStatus: 'TODOS',
      search: '',
      page: 1,
      limit: 15,
      sortBy: 'date',
      sortOrder: 'desc'
    });
  };

  const handleSort = (field: string) => {
    setFilters(prev => {
      const isSameField = prev.sortBy === field;
      const newOrder = isSameField && prev.sortOrder === 'asc' ? 'desc' : 'asc';
      return {
        ...prev,
        sortBy: field,
        sortOrder: newOrder,
        page: 1
      };
    });
  };

  // Exportação para CSV / Excel com UTF-8 BOM e Auditoria
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const payload = {
        reportType,
        period: filters.period,
        startDate: filters.startDate,
        endDate: filters.endDate,
        status: filters.status,
        cargo: filters.cargo,
        setor: filters.setor,
        unidade: filters.unidade,
        documentStatus: filters.documentStatus,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };

      const res = await safeFetchJson<{
        success: boolean;
        csv: string;
        fileName: string;
        totalRows: number;
      }>('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res && res.csv) {
        // Criação de Blob e download automático
        const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', res.fileName || `relatorio_${reportType}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setToastMessage({
          type: 'success',
          text: `Relatório exportado com sucesso! (${res.totalRows} registros no arquivo ${res.fileName})`
        });
      } else {
        throw new Error('Falha na resposta do servidor.');
      }
    } catch (err: any) {
      console.error('Erro na exportação:', err);
      setToastMessage({
        type: 'error',
        text: 'Erro ao exportar arquivo: ' + (err?.message || 'Falha desconhecida')
      });
    } finally {
      setIsExporting(false);
    }
  };

  const activeTabConfig = REPORT_TABS.find(t => t.id === reportType) || REPORT_TABS[0];

  const getPeriodLabel = () => {
    switch (filters.period) {
      case 'today': return 'Hoje';
      case '7d': return 'Últimos 7 dias';
      case '30d': return 'Últimos 30 dias';
      case 'this_month': return 'Este mês';
      case 'next_month': return 'Próximo mês';
      case 'custom': return filters.startDate || filters.endDate ? `${filters.startDate || ''} a ${filters.endDate || ''}` : 'Personalizado';
      case 'all':
      default:
        return 'Todo o histórico';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast de Notificação de Ação */}
      {toastMessage && (
        <div 
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-900 text-white border-emerald-800' 
              : 'bg-rose-900 text-white border-rose-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-300 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Topo: Identidade, Título e Ações Principais */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <img
            src="/raitz-logo.jpg"
            alt="Logo Raitz"
            referrerPolicy="no-referrer"
            className="w-11 h-11 rounded-xl object-cover shadow-xs border border-slate-200 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Relatórios & Indicadores de RH
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" />
                LGPD & RLS
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Consulta consolidada, análise de dados reais e exportação de relatórios gerenciais e operacionais.
            </p>
          </div>
        </div>

        {/* Botões de Ação do Topo */}
        <div className="flex items-center gap-2.5">
          <button
            id="reports-refresh-btn"
            type="button"
            onClick={() => loadReportData()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            title="Atualizar dados da tela"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            id="reports-export-csv-btn"
            type="button"
            onClick={handleExport}
            disabled={isExporting || isLoading || (data?.total === 0)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all"
            title="Exportar dados filtrados em CSV compatível com Microsoft Excel"
          >
            {isExporting ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Exportar CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* Navegação de Abas dos 5 Relatórios Especializados */}
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto pb-px scrollbar-none">
          {REPORT_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = reportType === tab.id;
            return (
              <button
                key={tab.id}
                id={`report-tab-${tab.id}`}
                type="button"
                onClick={() => {
                  setReportType(tab.id);
                  setFilters(prev => ({ ...prev, page: 1 }));
                }}
                className={`inline-flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all select-none ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Descrição contextual da aba ativa */}
      <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-blue-800">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>{activeTabConfig.label}:</strong> {activeTabConfig.description}
          </span>
        </div>
        <span className="text-[11px] text-blue-600 font-medium hidden sm:inline">
          Dados em tempo real • Sem armazenamento duplicado
        </span>
      </div>

      {/* 1. Grade de Indicadores / KPIs */}
      {data && (
        <ReportKPIs 
          indicators={data.indicators} 
          reportType={reportType} 
          periodLabel={getPeriodLabel()} 
        />
      )}

      {/* 2. Barra de Filtros Reutilizáveis */}
      <ReportFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        reportType={reportType}
        availableFilters={data?.availableFilters || { roles: [], departments: [], units: [], statuses: [] }}
      />

      {/* 3. Seção de Gráficos Analíticos com Recharts */}
      {data && data.charts && (
        <ReportChartsSection 
          charts={data.charts} 
          totalAdmissions={data.indicators.totalAdmissions} 
        />
      )}

      {/* 4. Tabela de Registros com Paginação e Ordenação */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-slate-900 tracking-tight uppercase">
            Registros Detalhados ({data ? data.total : 0})
          </h2>
          <span className="text-[11px] text-slate-400">
            CPFs mascarados em cumprimento à LGPD
          </span>
        </div>

        <ReportTable
          reportType={reportType}
          rows={data?.rows || []}
          total={data?.total || 0}
          page={filters.page || 1}
          limit={filters.limit || 15}
          totalPages={data?.totalPages || 1}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          onSort={handleSort}
          onPageChange={(p) => setFilters(prev => ({ ...prev, page: p }))}
          onLimitChange={(l) => setFilters(prev => ({ ...prev, limit: l, page: 1 }))}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
export default ReportsPage;

