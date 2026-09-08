import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar.tsx';
import { Header } from './Header.tsx';
import { useAuth } from '../context/AuthContext.tsx';

export const Layout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    // Carrega contador de notificações não lidas
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const unread = data.filter((n: any) => !n.read).length;
          setUnreadCount(unread);
        }
      })
      .catch(() => {});
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800">
      {/* Sidebar Lateral (Desktop fixa / Mobile gaveta) */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        unreadNotificationsCount={unreadCount}
      />

      {/* Conteúdo Principal com compensação da sidebar (w-64 = 16rem em lg) */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          unreadCount={unreadCount}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
