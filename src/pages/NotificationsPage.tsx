import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Clock, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { SystemNotification } from '../types/index.ts';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (notif: SystemNotification) => {
    handleMarkAsRead(notif.id);
    if (notif.admissionId) {
      navigate(`/admissoes/${notif.admissionId}`);
    }
  };

  const getIcon = (title: string) => {
    if (title.includes('Concluída') || title.includes('Aprovado')) return CheckCircle2;
    if (title.includes('Pendência') || title.includes('Rejeitado') || title.includes('Correção')) return AlertTriangle;
    return Clock;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/raitz-logo.jpg"
            alt="Logo Raitz"
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-xl object-cover shadow-xs border border-slate-200 shrink-0"
          />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Central de Notificações</h1>
            <p className="text-xs text-slate-500">
              Avisos operacionais em tempo real sobre envios, reenvios e conferências.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-xs overflow-hidden">
        {notifications.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>Nenhuma notificação recente.</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const Icon = getIcon(notif.title);
            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-4 sm:p-5 flex items-start gap-3.5 cursor-pointer transition-colors ${
                  notif.read ? 'hover:bg-slate-50 opacity-75' : 'bg-blue-50/40 hover:bg-blue-50/70'
                }`}
              >
                <div className={`p-2 rounded-xl border shrink-0 ${
                  notif.read ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className={`text-xs sm:text-sm font-bold truncate ${notif.read ? 'text-slate-800' : 'text-blue-900'}`}>
                      {notif.title}
                    </h3>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(notif.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{notif.message}</p>
                </div>

                {!notif.read && (
                  <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 self-center" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
