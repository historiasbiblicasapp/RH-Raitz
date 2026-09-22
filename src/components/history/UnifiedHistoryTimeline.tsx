import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Briefcase,
  Layers,
  Sparkles,
  ChevronDown,
  RotateCcw,
  Eye,
  SlidersHorizontal,
  Info,
  X,
  Lock
} from 'lucide-react';
import { AuditLog, AuditLogChange } from '../../types/index.ts';

export type HistoryCategory = 
  | 'TODAS'
  | 'DOCUMENTOS'
  | 'PROCESSO'
  | 'APROVACOES'
  | 'CADASTRO'
  | 'CONVITE'
  | 'SISTEMA';

interface UnifiedHistoryTimelineProps {
  logs: AuditLog[];
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
  showExport?: boolean;
  contextFilterLabel?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

// Classifica semanticamente um log de auditoria em uma categoria do Bloco 5.7
export function categorizeAuditLog(log: AuditLog): HistoryCategory {
  const act = (log.action || '').toLowerCase();
  const ent = (log.entityType || '').toLowerCase();
  const det = (log.details || '').toLowerCase();

  if (
    ent.includes('approval') || 
    act.includes('aprovação') || 
    act.includes('aprovou') && ent.includes('approval') ||
    act.includes('parecer') || 
    act.includes('reprovada') || 
    act.includes('reaberta')
  ) {
    return 'APROVACOES';
  }

  if (
    ent.includes('document') || 
    Boolean(log.documentType) ||
    act.includes('documento') || 
    act.includes('aprovou') || 
    act.includes('rejeitou') || 
    act.includes('upload') || 
    act.includes('download') || 
    act.includes('enviou') || 
    act.includes('reenviou')
  ) {
    return 'DOCUMENTOS';
  }

  if (
    ent.includes('process') || 
    act.includes('etapa') || 
    act.includes('processo') || 
    act.includes('admissão concluída') || 
    act.includes('concluída') || 
    act.includes('cancelada')
  ) {
    return 'PROCESSO';
  }

  if (
    ent.includes('employee') || 
    act.includes('cadastr') || 
    act.includes('inativado') || 
    act.includes('reativado') || 
    act.includes('dados') || 
    (log.changes && log.changes.length > 0)
  ) {
    return 'CADASTRO';
  }

  if (
    act.includes('convite') || 
    act.includes('whatsapp') || 
    act.includes('consentimento') || 
    act.includes('lgpd') || 
    act.includes('token')
  ) {
    return 'CONVITE';
  }

  return 'SISTEMA';
}

export const UnifiedHistoryTimeline: React.FC<UnifiedHistoryTimelineProps> = ({
  logs = [],
  title = 'Histórico Completo & Trilha de Auditoria',
  subtitle = 'Visão consolidada, segura e imutável de todas as ações, decisões, versões e alterações cadastrais.',
  emptyMessage = 'Nenhum registro de histórico encontrado para os critérios selecionados.',
  showExport = true,
  contextFilterLabel,
  onRefresh,
  isLoading = false
}) => {
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HistoryCategory>('TODAS');
  const [selectedUser, setSelectedUser] = useState<string>('TODOS');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedLogForModal, setSelectedLogForModal] = useState<AuditLog | null>(null);

  // Lista única de usuários responsáveis para o dropdown
  const uniqueUsers = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => {
      const u = l.userName || l.performedBy;
      if (u && u.trim()) set.add(u.trim());
    });
    return Array.from(set).sort();
  }, [logs]);

  // Contagens por categoria para pills
  const categoryCounts = useMemo(() => {
    const counts: Record<HistoryCategory, number> = {
      TODAS: logs.length,
      DOCUMENTOS: 0,
      PROCESSO: 0,
      APROVACOES: 0,
      CADASTRO: 0,
      CONVITE: 0,
      SISTEMA: 0
    };

    logs.forEach(l => {
      const cat = categorizeAuditLog(l);
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return counts;
  }, [logs]);

  // Métricas rápidas de topo
  const metrics = useMemo(() => {
    let approvalsCount = 0;
    let rejectionsCount = 0;
    let dataChangesCount = 0;
    let documentsCount = 0;

    logs.forEach(l => {
      const act = l.action.toLowerCase();
      if (act.includes('aprov') || act.includes('concluíd') || act.includes('reativad')) approvalsCount++;
      if (act.includes('rejeit') || act.includes('cancel') || act.includes('reprovad') || act.includes('inativad')) rejectionsCount++;
      if (l.changes && l.changes.length > 0 || l.fieldChanged) dataChangesCount++;
      if (l.documentType || act.includes('documento')) documentsCount++;
    });

    return {
      total: logs.length,
      approvalsCount,
      rejectionsCount,
      dataChangesCount,
      documentsCount
    };
  }, [logs]);

  // Filtragem e ordenação dos logs
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // 1. Categoria
    if (selectedCategory !== 'TODAS') {
      result = result.filter(l => categorizeAuditLog(l) === selectedCategory);
    }

    // 2. Usuário responsável
    if (selectedUser !== 'TODOS') {
      result = result.filter(l => (l.userName || l.performedBy || '') === selectedUser);
    }

    // 3. Período
    const now = new Date();
    if (selectedPeriod === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      result = result.filter(l => (l.timestamp || l.createdAt || '').startsWith(todayStr));
    } else if (selectedPeriod === '7d') {
      const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter(l => new Date(l.timestamp || l.createdAt || 0) >= past7Days);
    } else if (selectedPeriod === '30d') {
      const past30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      result = result.filter(l => new Date(l.timestamp || l.createdAt || 0) >= past30Days);
    } else if (selectedPeriod === 'custom') {
      if (customStartDate) {
        const start = new Date(customStartDate).getTime();
        result = result.filter(l => new Date(l.timestamp || l.createdAt || 0).getTime() >= start);
      }
      if (customEndDate) {
        const end = new Date(customEndDate + 'T23:59:59.999Z').getTime();
        result = result.filter(l => new Date(l.timestamp || l.createdAt || 0).getTime() <= end);
      }
    }

    // 4. Busca textual
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter(l => {
        const act = (l.action || '').toLowerCase();
        const det = (l.details || '').toLowerCase();
        const user = (l.userName || l.performedBy || '').toLowerCase();
        const doc = (l.documentType || '').toLowerCase();
        const emp = (l.employeeName || '').toLowerCase();
        const entName = (l.entityName || '').toLowerCase();
        const field = (l.fieldChanged || '').toLowerCase();
        const prev = String(l.previousValue || '').toLowerCase();
        const next = String(l.newValue || '').toLowerCase();
        const changesMatch = l.changes?.some(c => 
          (c.label || '').toLowerCase().includes(q) ||
          String(c.previousValue || '').toLowerCase().includes(q) ||
          String(c.newValue || '').toLowerCase().includes(q)
        );

        return (
          act.includes(q) ||
          det.includes(q) ||
          user.includes(q) ||
          doc.includes(q) ||
          emp.includes(q) ||
          entName.includes(q) ||
          field.includes(q) ||
          prev.includes(q) ||
          next.includes(q) ||
          Boolean(changesMatch)
        );
      });
    }

    // 5. Ordenação temporal
    result.sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
      const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [logs, selectedCategory, selectedUser, selectedPeriod, customStartDate, customEndDate, searchTerm, sortOrder]);

  // Agrupamento visual por data
  const groupedLogs = useMemo(() => {
    const groups: { [dateLabel: string]: AuditLog[] } = {};

    const todayStr = new Date().toLocaleDateString('pt-BR');
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toLocaleDateString('pt-BR');

    filteredLogs.forEach(log => {
      const date = new Date(log.timestamp || log.createdAt || Date.now());
      const dateStr = date.toLocaleDateString('pt-BR');

      let label = dateStr;
      if (dateStr === todayStr) {
        label = `Hoje (${dateStr})`;
      } else if (dateStr === yesterdayStr) {
        label = `Ontem (${dateStr})`;
      }

      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(log);
    });

    return groups;
  }, [filteredLogs]);

  // Exportação CSV
  const handleExportCSV = () => {
    const headers = [
      'Data/Hora',
      'Responsável',
      'Ação',
      'Categoria',
      'Entidade',
      'Colaborador / Alvo',
      'Documento',
      'Campo Alterado',
      'Valor Anterior',
      'Novo Valor',
      'Detalhes do Evento'
    ];

    const rows = filteredLogs.map(l => [
      new Date(l.timestamp || l.createdAt || Date.now()).toLocaleString('pt-BR'),
      `"${(l.userName || l.performedBy || 'Sistema').replace(/"/g, '""')}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      categorizeAuditLog(l),
      l.entityType || '',
      `"${(l.employeeName || l.entityName || '').replace(/"/g, '""')}"`,
      `"${(l.documentType || '').replace(/"/g, '""')}"`,
      `"${(l.fieldChanged || (l.changes?.length ? l.changes.map(c => c.label).join('; ') : '')).replace(/"/g, '""')}"`,
      `"${(l.previousValue || '').replace(/"/g, '""')}"`,
      `"${(l.newValue || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historico-auditoria-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('TODAS');
    setSelectedUser('TODOS');
    setSelectedPeriod('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSortOrder('desc');
  };

  const hasActiveFilters = 
    searchTerm.trim() !== '' || 
    selectedCategory !== 'TODAS' || 
    selectedUser !== 'TODOS' || 
    selectedPeriod !== 'all' || 
    customStartDate !== '' || 
    customEndDate !== '';

  return (
    <div className="space-y-6">
      {/* 1. Header & Identidade Visual */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600 shrink-0" />
              {title}
            </h2>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3 h-3" />
              <span>Imutável (LGPD Art. 37)</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {showExport && (
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-2xs transition disabled:opacity-50 cursor-pointer"
              title="Exportar dados filtrados para arquivo CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar CSV</span>
            </button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
              title="Atualizar histórico"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Resumo de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">Total de Eventos</span>
            <strong className="text-base font-bold text-slate-900">{metrics.total}</strong>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">Aprovações / Sucesso</span>
            <strong className="text-base font-bold text-slate-900">{metrics.approvalsCount}</strong>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">Rejeições / Pendências</span>
            <strong className="text-base font-bold text-slate-900">{metrics.rejectionsCount}</strong>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">Alterações Cadastrais</span>
            <strong className="text-base font-bold text-slate-900">{metrics.dataChangesCount}</strong>
          </div>
        </div>
      </div>

      {/* 3. Painel de Filtros Avançados */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3.5">
        {/* Linha 1: Busca e Filtros Dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Busca textual */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ação, responsável, detalhe, documento ou valor..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro por Responsável */}
          <div>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none text-slate-700"
              >
                <option value="TODOS">Todos os Responsáveis</option>
                {uniqueUsers.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Filtro por Período */}
          <div>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none text-slate-700"
              >
                <option value="all">Todo o Período</option>
                <option value="today">Apenas Hoje</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="custom">Personalizado...</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Linha opcional: Datas personalizadas */}
        {selectedPeriod === 'custom' && (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex flex-col sm:flex-row items-center gap-3 text-xs animate-in fade-in duration-200">
            <span className="font-semibold text-slate-600 shrink-0">Intervalo de Datas:</span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-slate-400">até</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Linha 2: Categorias (Pills) e Ordenação */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Pills de Categorias */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'TODAS', label: 'Todos' },
              { id: 'DOCUMENTOS', label: 'Documentos' },
              { id: 'PROCESSO', label: 'Processo & Etapas' },
              { id: 'APROVACOES', label: 'Aprovações' },
              { id: 'CADASTRO', label: 'Cadastrais' },
              { id: 'CONVITE', label: 'Convites & LGPD' },
              { id: 'SISTEMA', label: 'Sistema' },
            ].map(cat => {
              const count = categoryCounts[cat.id as HistoryCategory] || 0;
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id as HistoryCategory)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-500 border border-slate-200'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Ordenação e Limpeza */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 transition cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{sortOrder === 'desc' ? 'Mais recentes primeiro' : 'Mais antigos primeiro'}</span>
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 rounded hover:bg-rose-50 transition cursor-pointer"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Lista da Linha do Tempo */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Nenhum evento localizado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {hasActiveFilters ? 'Tente ajustar ou limpar os filtros de busca para visualizar os registros.' : emptyMessage}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar filtros</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedLogs).map(([dateLabel, items]) => (
            <div key={dateLabel} className="space-y-3">
              {/* Separador de Data */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-100/90 px-3 py-1 rounded-full border border-slate-200/60 shadow-2xs">
                  {dateLabel}
                </span>
                <div className="h-px bg-slate-200 grow" />
                <span className="text-[11px] font-mono text-slate-400">
                  {items.length} registro{items.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Itens na Timeline */}
              <div className="relative pl-6 border-l-2 border-slate-200 ml-3 space-y-4">
                {items.map((log) => {
                  const category = categorizeAuditLog(log);
                  const changes = log.changes || [];
                  const timestamp = log.timestamp || log.createdAt;
                  const formattedTime = timestamp ? new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-';
                  const formattedDateTime = timestamp ? new Date(timestamp).toLocaleString('pt-BR') : '-';

                  const isApproval = log.action.includes('aprovou') || log.action.includes('Aprovado') || log.action.includes('reativado');
                  const isRejection = log.action.includes('rejeitou') || log.action.includes('Rejeitado') || log.action.includes('cancel') || log.action.includes('reprovad') || log.action.includes('inativad');
                  const isUpload = log.action.includes('enviou') || log.action.includes('reenviou') || log.action.includes('upload');
                  const isEdit = changes.length > 0 || log.fieldChanged;

                  // Marcador de linha
                  let markerColor = 'bg-slate-400 ring-slate-100';
                  if (isApproval) markerColor = 'bg-emerald-500 ring-emerald-100';
                  else if (isRejection) markerColor = 'bg-rose-500 ring-rose-100';
                  else if (isUpload) markerColor = 'bg-blue-500 ring-blue-100';
                  else if (isEdit) markerColor = 'bg-amber-500 ring-amber-100';

                  return (
                    <div key={log.id} className="relative group">
                      {/* Ponto indicador da timeline */}
                      <div className={`w-3 h-3 rounded-full absolute -left-[31px] top-4 border-2 border-white ring-4 ${markerColor} transition-transform group-hover:scale-125`} />

                      {/* Card do Evento */}
                      <div className="bg-white hover:bg-slate-50/50 p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs transition space-y-3">
                        {/* Linha 1: Ação, Categoria e Horário */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 leading-tight">
                              {log.action}
                            </span>

                            {/* Tag de Categoria */}
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                              {category}
                            </span>

                            {/* Tag do Tipo de Documento se houver */}
                            {log.documentType && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                {log.documentType}
                              </span>
                            )}
                          </div>

                          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 self-start sm:self-auto shrink-0">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{formattedTime}</span>
                            <span className="text-slate-300">({formattedDateTime})</span>
                          </span>
                        </div>

                        {/* Linha 2: Onde Ocorreu / Contexto & Responsável */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          {/* Quem Realizou */}
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>Responsável:</span>
                            <strong className="text-slate-800 font-semibold">
                              {log.userName || log.performedBy || 'Sistema'}
                            </strong>
                          </div>

                          {/* Onde Ocorreu */}
                          {(log.employeeName || log.entityName || log.admissionId) && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500">Alvo:</span>
                              <span className="text-slate-800 font-medium">
                                {log.employeeName || log.entityName || `Admissão #${log.admissionId?.slice(0, 8)}`}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Linha 3: Detalhes Textuais */}
                        {log.details && (
                          <p className="text-xs text-slate-700 bg-slate-50/80 p-3 rounded-xl border border-slate-100 leading-relaxed font-normal">
                            {log.details}
                          </p>
                        )}

                        {/* Linha 4: Comparativo "Antes / Depois" (Bloco 5.7) */}
                        {changes.length > 0 ? (
                          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Alterações Detectadas ({changes.length} campo{changes.length === 1 ? '' : 's'}):
                              </span>
                              <span className="text-[10px] text-slate-400">Comparativo Antes x Depois</span>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                              {changes.map((ch, idx) => (
                                <div
                                  key={idx}
                                  className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                                >
                                  <span className="font-semibold text-slate-700 shrink-0">
                                    {ch.label || ch.field}:
                                  </span>

                                  <div className="flex items-center gap-2 text-[11px] font-medium flex-wrap">
                                    <span className="text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-md line-through">
                                      {String(ch.previousValue ?? '(vazio)')}
                                    </span>
                                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                      {String(ch.newValue ?? '(removido)')}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : log.fieldChanged ? (
                          <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 text-xs flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-slate-600">Campo alterado:</span>
                              <span className="font-semibold text-slate-800">{log.fieldChanged}</span>
                            </div>

                            {(log.previousValue !== undefined || log.newValue !== undefined) && (
                              <div className="flex items-center gap-2 text-[11px] font-medium">
                                {log.previousValue !== undefined && (
                                  <span className="text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-md line-through">
                                    {String(log.previousValue)}
                                  </span>
                                )}
                                {log.previousValue !== undefined && log.newValue !== undefined && (
                                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                )}
                                {log.newValue !== undefined && (
                                  <span className="text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                    {String(log.newValue)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : null}

                        {/* Linha 5: Rodapé do Log (Identificadores & Ação Detalhes) */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                          <span className="font-mono text-[10px] text-slate-400">
                            ID: {log.id}
                          </span>

                          <button
                            type="button"
                            onClick={() => setSelectedLogForModal(log)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Detalhes do Registro</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Modal de Detalhes do Registro de Auditoria (Bloco 5.7) */}
      {selectedLogForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Topo do Modal */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Registro de Auditoria Oficial</h3>
                  <span className="text-[11px] font-mono text-slate-500">ID: {selectedLogForModal.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogForModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Ação Executada</span>
                  <strong className="text-slate-900 text-xs">{selectedLogForModal.action}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Data e Hora Exata</span>
                  <span className="text-slate-800 font-mono text-xs">
                    {new Date(selectedLogForModal.timestamp || selectedLogForModal.createdAt || Date.now()).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Usuário Responsável</span>
                  <span className="text-slate-800 font-semibold text-xs">
                    {selectedLogForModal.userName || selectedLogForModal.performedBy || 'Sistema Automático'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Categoria</span>
                  <span className="text-slate-800 font-semibold text-xs">
                    {categorizeAuditLog(selectedLogForModal)}
                  </span>
                </div>
              </div>

              {/* Onde ocorreu */}
              {(selectedLogForModal.employeeName || selectedLogForModal.documentType || selectedLogForModal.admissionId) && (
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Contexto / Objeto Afetado</span>
                  <div className="text-xs text-slate-800 space-y-1">
                    {selectedLogForModal.employeeName && (
                      <p>Colaborador: <strong className="text-slate-900">{selectedLogForModal.employeeName}</strong></p>
                    )}
                    {selectedLogForModal.documentType && (
                      <p>Documento: <strong className="text-slate-900">{selectedLogForModal.documentType}</strong></p>
                    )}
                    {selectedLogForModal.admissionId && (
                      <p>Admissão: <strong className="text-slate-900 font-mono">{selectedLogForModal.admissionId}</strong></p>
                    )}
                  </div>
                </div>
              )}

              {/* Descrição Detalhada */}
              {selectedLogForModal.details && (
                <div className="space-y-1">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Descrição Completa</span>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 leading-relaxed">
                    {selectedLogForModal.details}
                  </div>
                </div>
              )}

              {/* Diff detalhado */}
              {(selectedLogForModal.changes?.length || selectedLogForModal.fieldChanged) && (
                <div className="space-y-1.5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Modificações Realizadas (Antes x Depois)</span>
                  <div className="space-y-2">
                    {selectedLogForModal.changes?.map((ch, i) => (
                      <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-700">{ch.label || ch.field}:</span>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded line-through">
                            {String(ch.previousValue ?? 'Vazio')}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                            {String(ch.newValue ?? 'Vazio')}
                          </span>
                        </div>
                      </div>
                    ))}
                    {!selectedLogForModal.changes?.length && selectedLogForModal.fieldChanged && (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-700">{selectedLogForModal.fieldChanged}:</span>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded line-through">
                            {String(selectedLogForModal.previousValue ?? 'Vazio')}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                            {String(selectedLogForModal.newValue ?? 'Vazio')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Nota de Segurança LGPD */}
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-start gap-2.5 text-blue-800">
                <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Este registro é protegido por integridade criptográfica e política de retenção imutável. Informações sensíveis são estritamente auditadas de acordo com as normas da Lei Geral de Proteção de Dados (LGPD).
                </p>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/70">
              <button
                type="button"
                onClick={() => setSelectedLogForModal(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
