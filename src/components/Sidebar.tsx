import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  KeyRound,
  FileCheck2, 
  Bell, 
  BarChart3, 
  History, 
  Settings, 
  LogOut, 
  ShieldCheck,
  UserCog,
  Briefcase,
  FileText,
  ListChecks,
  Layers,
  ChevronDown,
  ChevronRight,
  X,
  AlertCircle,
  MessageSquare,
  CalendarClock,
  UserCheck,
  CheckSquare,
  Activity,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  unreadNotificationsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, unreadNotificationsCount = 0 }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isCadastrosActive = 
    location.pathname.startsWith('/cadastros') || 
    location.pathname === '/cargos' || 
    location.pathname === '/tipos-documentos' ||
    location.pathname === '/checklists';
  const [cadastrosOpen, setCadastrosOpen] = useState(true);

  const mainMenuItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/operacao', label: 'Central de Operações', icon: Activity },
    { to: '/distribuicao', label: 'Distribuição de Trabalho', icon: Briefcase },
    { to: '/indicadores', label: 'Indicadores & KPIs', icon: TrendingUp },
    { to: '/gargalos', label: 'Análise de Gargalos', icon: Layers },
    { to: '/admissoes', label: 'Admissões', icon: Users },
    { to: '/aprovacoes', label: 'Aprovações Internas', icon: ShieldCheck },
    { to: '/checklist', label: 'Checklist Operacional', icon: CheckSquare },
    { to: '/funcionarios', label: 'Funcionários', icon: UserCheck },
    { to: '/pendencias', label: 'Central de Pendências', icon: AlertCircle },
    { to: '/comunicacao', label: 'Comunicação', icon: MessageSquare },
    { to: '/prazos', label: 'Prazos & Acompanhamento', icon: CalendarClock },
    { to: '/convites', label: 'Convites & Acessos', icon: KeyRound },
    { to: '/documentos', label: 'Documentos', icon: FileCheck2 },
  ];

  const secondaryMenuItems = [
    { 
      to: '/notificacoes', 
      label: 'Notificações', 
      icon: Bell, 
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : null 
    },
    { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
    { to: '/historico', label: 'Histórico', icon: History },
    { to: '/usuarios-rh', label: 'Equipe & Acessos RH', icon: UserCog },
    { to: '/configuracoes', label: 'Configurações', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Backdrop para mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Topo do Menu com Marca */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <img
              src="/raitz-logo.jpg"
              alt="Logo Raitz"
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-lg object-cover shadow-xs border border-slate-200 shrink-0"
            />
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base block leading-none">
                Admissão Digital
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Raitz • Gestão de RH</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Itens de Navegação */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {mainMenuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => onClose()}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                <span>{item.label}</span>
              </div>
            </NavLink>
          ))}

          {/* Grupo Cadastros (Bloco 3.1) */}
          <div className="pt-1">
            <button
              type="button"
              id="btn-sidebar-cadastros-toggle"
              onClick={() => setCadastrosOpen(!cadastrosOpen)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                isCadastrosActive
                  ? 'bg-blue-50/70 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className={`w-4 h-4 ${isCadastrosActive ? 'text-blue-600' : 'text-slate-500'}`} />
                <span className="font-semibold">Cadastros</span>
              </div>
              {cadastrosOpen ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {cadastrosOpen && (
              <div className="mt-1 ml-4 pl-3.5 border-l-2 border-slate-200/80 space-y-1 py-0.5">
                <NavLink
                  to="/cadastros/cargos"
                  id="nav-link-cargos"
                  onClick={() => onClose()}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Cargos</span>
                </NavLink>

                <NavLink
                  to="/cadastros/documentos"
                  id="nav-link-tipos-documentos"
                  onClick={() => onClose()}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Tipos de documentos</span>
                </NavLink>

                <NavLink
                  to="/cadastros/checklists"
                  id="nav-link-checklists"
                  onClick={() => onClose()}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <ListChecks className="w-3.5 h-3.5" />
                  <span>Checklist por cargo</span>
                </NavLink>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 my-2" />

          {secondaryMenuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => onClose()}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="bg-rose-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Rodapé do Menu com Perfil do RH e Logout */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center text-xs">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'RH'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{user?.name || 'Recursos Humanos'}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email || 'rh@empresa.com'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do sistema</span>
          </button>
        </div>
      </aside>
    </>
  );
};
