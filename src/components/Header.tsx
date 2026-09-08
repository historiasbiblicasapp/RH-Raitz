import React from 'react';
import { Menu, Bell, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';

interface HeaderProps {
  onToggleSidebar: () => void;
  unreadCount?: number;
  showNewAdmissionBtn?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  onToggleSidebar, 
  unreadCount = 0,
  showNewAdmissionBtn = true 
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Saudação de acordo com o horário local
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'Colaborador';

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
        {/* Sino de Notificações */}
        <Link
          to="/notificacoes"
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          aria-label="Ver notificações"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          )}
        </Link>

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
