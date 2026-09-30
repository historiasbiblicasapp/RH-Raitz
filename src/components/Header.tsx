import React, { useState, useEffect, useRef } from 'react';
import { Menu, Bell, Plus, Check, CheckCheck, ExternalLink, AlertTriangle, AlertCircle, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { safeFetchJson } from '../lib/api.ts';
import { NotificationItem } from '../types/index.ts';

interface HeaderProps {
  onToggleSidebar: () => void;
  unreadCount?: number;
  showNewAdmissionBtn?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  onToggleSidebar, 
  unreadCount: propUnreadCount,
  showNewAdmissionBtn = true 
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Saudação de acordo com o horário local
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'Colaborador';

  const fetchRecentNotifications = async () => {
    try {
      setLoading(true);
      const data = await safeFetchJson<NotificationItem[]>('/api/notifications');
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (err) {
      console.error('Erro ao carregar notificações no Header:', err);
    } finally {
      setLoading(false);
    }
  };

  // Polling de 30 segundos (Requisito 15)
  useEffect(() => {
    fetchRecentNotifications();
    const interval = setInterval(fetchRecentNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = propUnreadCount !== undefined 
    ? propUnreadCount 
    : notifications.filter(n => !n.read).length;

  const recentNotifications = notifications.slice(0, 5);

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
    handleMarkAsRead(notif.id);
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    } else if (notif.admissionId) {
      const targetUrl = notif.documentId 
        ? `/admissoes/${notif.admissionId}?doc=${notif.documentId}`
        : `/admissoes/${notif.admissionId}`;
      navigate(targetUrl);
    }
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Agora';
      if (diffMins < 60) return `${diffMins} min`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h`;
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  const getPriorityLabel = (priority?: string) => {
    if (!priority) return null;
    const p = priority.toLowerCase();
    if (p === 'urgent' || p === 'crítica' || p === 'critica') return { text: 'Crítica', color: 'text-rose-600' };
    if (p === 'high' || p === 'alta') return { text: 'Alta', color: 'text-amber-600' };
    return null;
  };

  const getCategoryLabel = (category?: string) => {
    if (!category) return null;
    const c = category.toLowerCase();
    if (c === 'documentos' || c === 'document') return 'Documentos';
    if (c === 'aprovacao' || c === 'approval') return 'Aprovação';
    if (c === 'task' || c === 'tarefa') return 'Tarefa';
    if (c === 'system' || c === 'sistema') return 'Sistema';
    if (c === 'admission' || c === 'admissao') return 'Admissão';
    return null;
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <img
            src="/raitz-logo.jpg"
            alt="Logo Raitz"
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-lg object-cover shadow-xs border border-slate-200 shrink-0"
          />
          <div>
            <h1 className="text-base sm:text-lg font-semibold text-slate-900 leading-tight">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Acompanhe o andamento das admissões • Raitz
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Sino de Notificações com Dropdown Popover (Bloco 6.7D) */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => {
              setIsOpen(prev => !prev);
              if (!isOpen) fetchRecentNotifications();
            }}
            className={`relative p-2 rounded-lg transition-colors ${
              isOpen 
                ? 'bg-slate-100 text-slate-900' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
            aria-label="Notificações"
            aria-expanded={isOpen}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-rose-500 rounded-full ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              {/* Cabeçalho do Dropdown */}
              <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Notificações</span>
                  {unreadCount > 0 && (
                    <span className="text-[11px] font-medium text-slate-500">
                      ({unreadCount} não {unreadCount === 1 ? 'lida' : 'lidas'})
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
                    title="Marcar todas como lidas"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Lidas</span>
                  </button>
                )}
              </div>

              {/* Lista das 5 notificações recentes */}
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                {recentNotifications.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs">
                    <Bell className="w-6 h-6 mx-auto mb-2 text-slate-300 stroke-1" />
                    <p>Nenhuma notificação recente.</p>
                  </div>
                ) : (
                  recentNotifications.map(notif => {
                    const priorityInfo = getPriorityLabel(notif.priority);
                    const categoryLabel = getCategoryLabel(notif.category);
                    const timeLabel = formatRelativeTime(notif.createdAt || notif.timestamp);

                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                          notif.read ? 'hover:bg-slate-50 opacity-80' : 'bg-blue-50/40 hover:bg-blue-50/70'
                        }`}
                      >
                        <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                          priorityInfo?.text === 'Crítica'
                            ? 'bg-rose-100 text-rose-700'
                            : priorityInfo?.text === 'Alta'
                            ? 'bg-amber-100 text-amber-700'
                            : notif.read
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {priorityInfo?.text === 'Crítica' ? (
                            <AlertCircle className="w-3.5 h-3.5" />
                          ) : priorityInfo?.text === 'Alta' ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <h4 className={`text-xs font-semibold truncate ${notif.read ? 'text-slate-800' : 'text-blue-950 font-bold'}`}>
                              {notif.title}
                            </h4>
                            <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
                              {timeLabel}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 line-clamp-1 mb-1.5">
                            {notif.message}
                          </p>

                          {/* Metadados exibidos SOMENTE se houver informação disponível (Requisito 14) */}
                          {(categoryLabel || priorityInfo) && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                              {categoryLabel && <span>{categoryLabel}</span>}
                              {categoryLabel && priorityInfo && <span aria-hidden="true">·</span>}
                              {priorityInfo && (
                                <span className={priorityInfo.color}>
                                  {priorityInfo.text}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {!notif.read && (
                          <span 
                            className="w-2 h-2 rounded-full bg-blue-600 shrink-0 self-center" 
                            title="Não lida"
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Rodapé com link para a Central de Notificações */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                <Link
                  to="/notificacoes"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 py-1 px-3 rounded-lg hover:bg-white transition-colors"
                >
                  <span>Ver todas as notificações na Central</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Botão + Nova Admissão */}
        {showNewAdmissionBtn && (
          <button
            onClick={() => navigate('/admissoes/nova')}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Admissão</span>
          </button>
        )}
      </div>
    </header>
  );
};
