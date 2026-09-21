import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  CalendarClock, 
  RefreshCw, 
  Info, 
  AlertCircle, 
  ExternalLink, 
  Plus, 
  FileText 
} from 'lucide-react';
import { 
  TrackingItem, 
  TrackingSummary, 
  TrackingFilters, 
  TrackingResponse 
} from '../types/index.ts';
import { TrackingSummaryCards } from '../components/TrackingSummaryCards.tsx';
import { TrackingAttentionSection } from '../components/TrackingAttentionSection.tsx';
import { TrackingFiltersBar } from '../components/TrackingFiltersBar.tsx';
import { TrackingTable } from '../components/TrackingTable.tsx';
import { CommunicationModal } from '../components/CommunicationModal.tsx';
import { safeFetchJson } from '../lib/api.ts';
import { handleFallbackApiRoute } from '../lib/fallbackClient.ts';

export const PrazosPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Estados principais
  const [items, setItems] = useState<TrackingItem[]>([]);
  const [attentionItems, setAttentionItems] = useState<TrackingItem[]>([]);
  const [summary, setSummary] = useState<TrackingSummary>({
    upcomingCount: 0,
    overdueCount: 0,
    waitingEmployeeCount: 0,
    waitingRhCount: 0,
    noMovementCount: 0,
    completedCount: 0,
    attentionCount: 0,
    totalCount: 0
  });
  const [availableFilters, setAvailableFilters] = useState<{
    roles: string[];
    departments: string[];
    units: string[];
    statuses: string[];
  }>({
    roles: [],
    departments: [],
    units: [],
    statuses: []
  });

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const limit = 15;

  // Estado dos filtros
  const [filters, setFilters] = useState<TrackingFilters>({
    period: searchParams.get('period') || 'all',
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    status: searchParams.get('status') || 'TODOS',
    cargo: searchParams.get('cargo') || 'TODOS',
    setor: searchParams.get('setor') || 'TODOS',
    unidade: searchParams.get('unidade') || 'TODOS',
    situacao: searchParams.get('situacao') || 'TODOS',
    tempoSemMovimentacao: searchParams.get('tempoSemMovimentacao') || 'all',
    search: searchParams.get('search') || '',
    page: Number(searchParams.get('page')) || 1,
    limit
  });

  // Filtro rápido selecionado nos cards
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);

  // Modal de Comunicação integrado
  const [selectedItemForComm, setSelectedItemForComm] = useState<TrackingItem | null>(null);
  const [isCommModalOpen, setIsCommModalOpen] = useState(false);

  // Busca os dados do backend
  const fetchTrackingData = useCallback(async () => {
    const q = new URLSearchParams();
    if (filters.period && filters.period !== 'all') q.set('period', filters.period);
    if (filters.startDate) q.set('startDate', filters.startDate);
    if (filters.endDate) q.set('endDate', filters.endDate);
    if (filters.status && filters.status !== 'TODOS') q.set('status', filters.status);
    if (filters.cargo && filters.cargo !== 'TODOS') q.set('cargo', filters.cargo);
    if (filters.setor && filters.setor !== 'TODOS') q.set('setor', filters.setor);
    if (filters.unidade && filters.unidade !== 'TODOS') q.set('unidade', filters.unidade);
    if (filters.situacao && filters.situacao !== 'TODOS') q.set('situacao', filters.situacao);
    if (filters.tempoSemMovimentacao && filters.tempoSemMovimentacao !== 'all') {
      q.set('tempoSemMovimentacao', filters.tempoSemMovimentacao);
    }
    if (filters.search) q.set('search', filters.search);
    q.set('page', String(filters.page || 1));
    q.set('limit', String(limit));

    try {
      setLoading(true);

      const data = await safeFetchJson<TrackingResponse>(`/api/prazos?${q.toString()}`);
      if (data) {
        setItems(data.items || []);
        setAttentionItems(data.attentionItems || []);
        if (data.summary) setSummary(data.summary);
        setTotalPages(data.totalPages || 1);
        setTotalResults(data.total || (data.items ? data.items.length : 0));
        if (data.filters) setAvailableFilters(data.filters);
        setPage(data.page || 1);
      }
    } catch (err) {
      console.warn('Utilizando dados locais de prazos:', err);
      const fallback = handleFallbackApiRoute(`/api/prazos?${q.toString()}`);
      if (fallback) {
        setItems(fallback.items || []);
        setTotalResults(fallback.summary?.total || fallback.items?.length || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTrackingData();
  }, [fetchTrackingData]);

  // Atualiza a URL quando os filtros mudam
  const updateFilters = (newFilters: Partial<TrackingFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);

    const params = new URLSearchParams();
    if (updated.period && updated.period !== 'all') params.set('period', updated.period);
    if (updated.startDate) params.set('startDate', updated.startDate);
    if (updated.endDate) params.set('endDate', updated.endDate);
    if (updated.status && updated.status !== 'TODOS') params.set('status', updated.status);
    if (updated.cargo && updated.cargo !== 'TODOS') params.set('cargo', updated.cargo);
    if (updated.setor && updated.setor !== 'TODOS') params.set('setor', updated.setor);
    if (updated.unidade && updated.unidade !== 'TODOS') params.set('unidade', updated.unidade);
    if (updated.situacao && updated.situacao !== 'TODOS') params.set('situacao', updated.situacao);
    if (updated.tempoSemMovimentacao && updated.tempoSemMovimentacao !== 'all') {
      params.set('tempoSemMovimentacao', updated.tempoSemMovimentacao);
    }
    if (updated.search) params.set('search', updated.search);
    if (updated.page && updated.page > 1) params.set('page', String(updated.page));

    setSearchParams(params, { replace: true });
  };

  // Clique em Card de Filtro Rápido
  const handleSelectQuickFilter = (filterKey: string) => {
    if (activeQuickFilter === filterKey) {
      // Desmarca o filtro rápido
      setActiveQuickFilter(null);
      updateFilters({
        period: 'all',
        situacao: 'TODOS',
        status: 'TODOS',
        tempoSemMovimentacao: 'all',
        page: 1
      });
      return;
    }

    setActiveQuickFilter(filterKey);
    switch (filterKey) {
      case 'upcoming':
        updateFilters({
          period: 'next_15',
          situacao: 'TODOS',
          status: 'TODOS',
          tempoSemMovimentacao: 'all',
          page: 1
        });
        break;
      case 'overdue':
        updateFilters({
          period: 'overdue',
          situacao: 'TODOS',
          status: 'TODOS',
          tempoSemMovimentacao: 'all',
          page: 1
        });
        break;
      case 'waiting_employee':
        updateFilters({
          period: 'all',
          situacao: 'aguardando_funcionario',
          status: 'TODOS',
          tempoSemMovimentacao: 'all',
          page: 1
        });
        break;
      case 'waiting_rh':
        updateFilters({
          period: 'all',
          situacao: 'aguardando_rh',
          status: 'TODOS',
          tempoSemMovimentacao: 'all',
          page: 1
        });
        break;
      case 'no_movement':
        updateFilters({
          period: 'all',
          situacao: 'TODOS',
          status: 'TODOS',
          tempoSemMovimentacao: '3_a_5',
          page: 1
        });
        break;
      case 'completed':
        updateFilters({
          period: 'all',
          situacao: 'TODOS',
          status: 'Concluída',
          tempoSemMovimentacao: 'all',
          page: 1
        });
        break;
    }
  };

  const handleResetFilters = () => {
    setActiveQuickFilter(null);
    setFilters({
      period: 'all',
      startDate: undefined,
      endDate: undefined,
      status: 'TODOS',
      cargo: 'TODOS',
      setor: 'TODOS',
      unidade: 'TODOS',
      situacao: 'TODOS',
      tempoSemMovimentacao: 'all',
      search: '',
      page: 1,
      limit
    });
    setSearchParams({}, { replace: true });
  };

  const handleOpenCommunication = (item: TrackingItem) => {
    setSelectedItemForComm(item);
    setIsCommModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-xs">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Prazos e Acompanhamento
                </h1>
                <span className="text-xs font-extrabold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                  Bloco 4.4
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
                Acompanhamento operacional interno de datas previstas, movimentações e situações prioritárias de admissão.
              </p>
            </div>
          </div>
        </div>

        {/* Ações do Cabeçalho */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            id="btn-refresh-tracking"
            onClick={fetchTrackingData}
            disabled={loading}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Atualizar dados operacionais"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            id="btn-goto-pendencias"
            onClick={() => navigate('/pendencias')}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <span>Central de Pendências</span>
          </button>

          <button
            id="btn-nova-admissao-tracking"
            onClick={() => navigate('/admissoes/nova')}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Admissão</span>
          </button>
        </div>
      </div>

      {/* Nota Operacional / LGPD & Regras de Prazos */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-slate-600">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800">Diretriz Operacional Interna: </span>
          Estes indicadores representam o fluxo de acompanhamento interno da empresa (conferência, envio e datas estimadas de início). Não constituem prazos legais ou trabalhistas externos.
        </div>
      </div>

      {/* 1. Indicadores no topo (Cards de Acompanhamento Operacional) */}
      <TrackingSummaryCards
        summary={summary}
        activeQuickFilter={activeQuickFilter}
        onSelectQuickFilter={handleSelectQuickFilter}
      />

      {/* 2. Seção "Precisam de Atenção" */}
      <TrackingAttentionSection
        attentionItems={attentionItems}
        onOpenCommunication={handleOpenCommunication}
      />

      {/* 3. Barra de Filtros Operacionais */}
      <TrackingFiltersBar
        filters={filters}
        onFilterChange={updateFilters}
        onResetFilters={handleResetFilters}
        availableRoles={availableFilters.roles}
        availableDepartments={availableFilters.departments}
        availableUnits={availableFilters.units}
        availableStatuses={availableFilters.statuses}
        totalResults={totalResults}
      />

      {/* 4. Tabela / Lista Principal de Acompanhamento */}
      <TrackingTable
        items={items}
        page={page}
        totalPages={totalPages}
        total={totalResults}
        limit={limit}
        onPageChange={(newPage) => updateFilters({ page: newPage })}
        onOpenCommunication={handleOpenCommunication}
        isLoading={loading}
      />

      {/* Modal de Comunicação Integrado */}
      {selectedItemForComm && (
        <CommunicationModal
          isOpen={isCommModalOpen}
          onClose={() => {
            setIsCommModalOpen(false);
            setSelectedItemForComm(null);
          }}
          admissionId={selectedItemForComm.admissionId}
          admissionCode={selectedItemForComm.admissionCode}
          employeeId={selectedItemForComm.employeeId}
          employeeName={selectedItemForComm.employeeName}
          employeePhone={selectedItemForComm.employeePhone}
          expectedStartDate={selectedItemForComm.expectedStartDate}
          inviteToken={selectedItemForComm.inviteToken || ''}
          isInviteValid={selectedItemForComm.isInviteValid}
          initialReason={{
            type: selectedItemForComm.isOverdue 
              ? 'reminder' 
              : selectedItemForComm.operationalSituation === 'documento_rejeitado'
              ? 'document_rejected'
              : 'documents_pending',
            label: selectedItemForComm.operationalSituationLabel,
            detail: selectedItemForComm.mainPendingReason,
            priority: selectedItemForComm.needsAttention ? 'Alta' : 'Média'
          }}
          onSuccess={() => {
            fetchTrackingData();
          }}
        />
      )}
    </div>
  );
};

export default PrazosPage;
