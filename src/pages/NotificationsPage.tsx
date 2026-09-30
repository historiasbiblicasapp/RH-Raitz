import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { NotificationItem, NotificationPriority } from '../types/index.ts';
import { safeFetchJson } from '../lib/api.ts';

type NotificationTab = 'todas' | 'nao_lidas' | 'documentos' | 'aprovacoes' | 'alertas';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NotificationTab>('todas');
  
  // Filtros combináveis
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedReadStatus, setSelectedReadStatus] = useState<'all' | 'unread' | 'read'>('all');

  const navigate = useNavigate();

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await safeFetchJson<NotificationItem[]>('/api/notifications');
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await safeFetchJson(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await safeFetchJson('/api/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    if (!notif.read) {
      handleMarkAsRead(notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
    } else if (notif.admissionId) {
      const targetUrl = notif.documentId 
        ? `/admissoes/${notif.admissionId}?doc=${notif.documentId}`
        : `/admissoes/${notif.admissionId}`;
      navigate(targetUrl);
    }
  };

  // Contadores para as abas
  const tabCounts = useMemo(() => {
    const unread = notifications.filter(n => !n.read).length;
    const docs = notifications.filter(n => {
      const cat = (n.category || '').toLowerCase();
      const type = (n.type || '').toLowerCase();
      return cat === 'documentos' || cat === 'document' || type.includes('document');
    }).length;
    const approvals = notifications.filter(n => {
      const cat = (n.category || '').toLowerCase();
      const type = (n.type || '').toLowerCase();
      return cat === 'aprovacao' || cat === 'approval' || type.includes('approval');
    }).length;
    const alerts = notifications.filter(n => {
      const prio = (n.priority || '').toLowerCase();
      const cat = (n.category || '').toLowerCase();
      return prio === 'urgent' || prio === 'crítica' || prio === 'critica' || prio === 'high' || prio === 'alta' || cat === 'task' || cat === 'system';
    }).length;

    return {
      todas: notifications.length,
      nao_lidas: unread,
      documentos: docs,
      aprovacoes: approvals,
      alertas: alerts
    };
  }, [notifications]);

  // Filtragem combinada
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notif => {
      // 1. Filtro da Aba Principal
      if (activeTab === 'nao_lidas' && notif.read) return false;
      if (activeTab === 'documentos') {
        const cat = (notif.category || '').toLowerCase();
        const type = (notif.type || '').toLowerCase();
        if (cat !== 'documentos' && cat !== 'document' && !type.includes('document')) return false;
      }
      if (activeTab === 'aprovacoes') {
        const cat = (notif.category || '').toLowerCase();
        const type = (notif.type || '').toLowerCase();
        if (cat !== 'aprovacao' && cat !== 'approval' && !type.includes('approval')) return false;
      }
      if (activeTab === 'alertas') {
        const prio = (notif.priority || '').toLowerCase();
        const cat = (notif.category || '').toLowerCase();
        const isAlert = prio === 'urgent' || prio === 'crítica' || prio === 'critica' || prio === 'high' || prio === 'alta' || cat === 'task' || cat === 'system';
        if (!isAlert) return false;
      }

      // 2. Filtro por Leitura Adicional
      if (selectedReadStatus === 'unread' && notif.read) return false;
      if (selectedReadStatus === 'read' && !notif.read) return false;

      // 3. Filtro por Prioridade Adicional
      if (selectedPriority !== 'all') {
        const p = (notif.priority || 'normal').toLowerCase();
        if (selectedPriority === 'urgent' && p !== 'urgent' && p !== 'crítica' && p !== 'critica') return false;
        if (selectedPriority === 'high' && p !== 'high' && p !== 'alta') return false;
        if (selectedPriority === 'normal' && p !== 'normal' && p !== 'low' && p !== 'baixa') return false;
      }

      // 4. Busca Textual por Título ou Mensagem
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchTitle = (notif.title || '').toLowerCase().includes(query);
        const matchMsg = (notif.message || '').toLowerCase().includes(query);
        const matchCat = (notif.category || '').toLowerCase().includes(query);
        if (!matchTitle && !matchMsg && !matchCat) return false;
      }

      return true;
    });
  }, [notifications, activeTab, selectedReadStatus, selectedPriority, searchTerm]);

  const hasActiveFilters = searchTerm !== '' || selectedPriority !== 'all' || selectedReadStatus !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedPriority('all');
    setSelectedReadStatus('all');
  };

  // Indicadores visuais para prioridades (Requisito 4)
  const getPriorityBadge = (priority?: string) => {
    const p = (priority || 'normal').toLowerCase();

    if (p === 'urgent' || p === 'crítica' || p === 'critica') {
      return {
        label: 'CRÍTICA',
        bgColor: 'bg-rose-50 text-rose-700 border-rose-200',
        dotColor: 'bg-rose-600',
        textColor: 'text-rose-700',
        icon: AlertCircle
      };
    }

    if (p === 'high' || p === 'alta') {
      return {
        label: 'ALTA',
        bgColor: 'bg-amber-50 text-amber-700 border-amber-200',
        dotColor: 'bg-amber-500',
        textColor: 'text-amber-700',
        icon: AlertTriangle
      };
    }

    return {
      label: 'NORMAL',
      bgColor: 'bg-slate-50 text-slate-600 border-slate-200',
      dotColor: 'bg-slate-400',
      textColor: 'text-slate-600',
      icon: Clock
    };
  };

  const getCategoryDisplay = (category?: string, type?: string) => {
    if (category) {
      const c = category.toLowerCase();
      if (c === 'documentos' || c === 'document') return 'Documentos';
      if (c === 'aprovacao' || c === 'approval') return 'Aprovação';
      if (c === 'task' || c === 'tarefa') return 'Tarefa Operacional';
      if (c === 'system' || c === 'sistema') return 'Sistema';
      if (c === 'admission' || c === 'admissao') return 'Admissão';
      return category;
    }
    if (type) {
      if (type.includes('document')) return 'Documentos';
      if (type.includes('approval')) return 'Aprovação';
      if (type.includes('admission')) return 'Admissão';
    }
    return 'Geral';
  };

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Topo / Cabeçalho Principal */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <img
            src="/raitz-logo.jpg"
            alt="Logo Raitz"
            referrerPolicy="no-referrer"
            className="w-11 h-11 rounded-xl object-cover shadow-xs border border-slate-200 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Central de Notificações</h1>
              {tabCounts.nao_lidas > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                  {tabCounts.nao_lidas} não lidas
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Avisos operacionais, pendências documentais e alçadas de aprovação em tempo real.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            onClick={loadNotifications}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {tabCounts.nao_lidas > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-xs transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Marcar todas como lidas</span>
            </button>
          )}
        </div>
      </div>

      {/* Navegação por Abas Principais (Requisito 2) */}
      <div className="bg-slate-200/70 p-1.5 rounded-xl flex items-center gap-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('todas')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'todas'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <span>Todas</span>
          <span className="text-[11px] opacity-75 font-normal">({tabCounts.todas})</span>
        </button>

        <button
          onClick={() => setActiveTab('nao_lidas')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'nao_lidas'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <span>Não lidas</span>
          {tabCounts.nao_lidas > 0 ? (
            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] rounded-full font-bold">
              {tabCounts.nao_lidas}
            </span>
          ) : (
            <span className="text-[11px] opacity-75 font-normal">(0)</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('documentos')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'documentos'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <span>Documentos</span>
          <span className="text-[11px] opacity-75 font-normal">({tabCounts.documentos})</span>
        </button>

        <button
          onClick={() => setActiveTab('aprovacoes')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'aprovacoes'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <span>Aprovações</span>
          <span className="text-[11px] opacity-75 font-normal">({tabCounts.aprovacoes})</span>
        </button>

        <button
          onClick={() => setActiveTab('alertas')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'alertas'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <span>Prazos / Alertas</span>
          <span className="text-[11px] opacity-75 font-normal">({tabCounts.alertas})</span>
        </button>
      </div>

      {/* Barra de Filtros Combináveis (Requisito 10) */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Campo de Busca */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por palavra-chave no título ou mensagem..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Seletores Combináveis */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Prioridade */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="bg-transparent font-medium text-slate-700 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all">Todas as prioridades</option>
              <option value="urgent">Crítica / Urgente</option>
              <option value="high">Alta</option>
              <option value="normal">Normal</option>
            </select>
          </div>

          {/* Status de Leitura */}
          {activeTab === 'todas' && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <select
                value={selectedReadStatus}
                onChange={(e) => setSelectedReadStatus(e.target.value as any)}
                className="bg-transparent font-medium text-slate-700 text-xs focus:outline-none cursor-pointer"
              >
                <option value="all">Todos os status</option>
                <option value="unread">Apenas não lidas</option>
                <option value="read">Apenas lidas</option>
              </select>
            </div>
          )}

          {/* Botão Limpar Filtros */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-slate-500 hover:text-rose-600 font-medium px-2 py-1.5 transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Lista de Notificações */}
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 text-blue-600 animate-spin" />
            <p>Carregando notificações...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs px-4">
            <Bell className="w-9 h-9 mx-auto mb-3 text-slate-300 stroke-1" />
            <p className="font-semibold text-slate-600 text-sm">Nenhuma notificação encontrada.</p>
            <p className="mt-1 text-slate-400 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Nenhum resultado corresponde aos filtros selecionados. Tente limpar os filtros para ver mais notificações.'
                : 'Não há avisos recentes nesta categoria no momento.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-3 text-xs text-blue-600 font-semibold hover:underline"
              >
                Limpar todos os filtros
              </button>
            )}
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const priorityBadge = getPriorityBadge(notif.priority);
            const categoryDisplay = getCategoryDisplay(notif.category, notif.type);
            const timestampFormatted = formatTimestamp(notif.createdAt || notif.timestamp);
            const PriorityIcon = priorityBadge.icon;

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-4 sm:p-5 flex items-start gap-3.5 sm:gap-4 cursor-pointer transition-all ${
                  notif.read
                    ? 'hover:bg-slate-50/80 bg-white opacity-90'
                    : 'bg-blue-50/40 hover:bg-blue-50/70 border-l-4 border-l-blue-600'
                }`}
              >
                {/* Ícone Indicador de Prioridade / Status */}
                <div className={`mt-0.5 p-2 rounded-xl shrink-0 border ${priorityBadge.bgColor}`}>
                  <PriorityIcon className="w-4 h-4" />
                </div>

                {/* Conteúdo Principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-xs sm:text-sm truncate ${
                        notif.read ? 'text-slate-800 font-semibold' : 'text-blue-950 font-bold'
                      }`}>
                        {notif.title}
                      </h3>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" title="Não lida" />
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {timestampFormatted}
                    </span>
                  </div>

                  {/* Mensagem da Notificação */}
                  <p className="text-xs text-slate-600 leading-relaxed mb-2.5">
                    {notif.message}
                  </p>

                  {/* Metadados Visuais Sem Poluição (Requisitos 3, 4, 11) */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {/* Categoria */}
                    <span className="font-medium text-slate-700">
                      {categoryDisplay}
                    </span>

                    <span aria-hidden="true" className="text-slate-300">·</span>

                    {/* Prioridade com Indicador Visual */}
                    <span className={`flex items-center gap-1 font-semibold ${priorityBadge.textColor}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${priorityBadge.dotColor}`} />
                      {priorityBadge.label}
                    </span>

                    {/* Status de Leitura */}
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className={notif.read ? 'text-slate-400' : 'text-blue-700 font-semibold'}>
                      {notif.read ? 'Lida' : 'Nova'}
                    </span>
                  </div>
                </div>

                {/* Ações Rápidas à Direita */}
                <div className="flex items-center gap-1 shrink-0 self-center">
                  {!notif.read && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors"
                      title="Marcar como lida"
                      aria-label="Marcar como lida"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}

                  {(notif.link || notif.admissionId) && (
                    <div className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
