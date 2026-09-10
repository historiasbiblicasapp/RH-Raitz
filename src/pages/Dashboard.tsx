import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  Clock, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  ArrowUpRight, 
  MessageCircle, 
  Share2, 
  ChevronRight,
  Filter,
  Users
} from 'lucide-react';
import { Admission, DashboardStats } from '../types/index.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { InviteModal } from '../components/InviteModal.tsx';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    newAdmissions: 0,
    waitingDocuments: 0,
    waitingReview: 0,
    pendingIssues: 0,
    completed: 0,
    totalActive: 0
  });
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [selectedInviteAdmission, setSelectedInviteAdmission] = useState<Admission | null>(null);

  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, admissionsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/admissions')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (admissionsRes.ok) {
        const admissionsData = await admissionsRes.json();
        setAdmissions(Array.isArray(admissionsData) ? admissionsData : (admissionsData.admissions || []));
      }
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredAdmissions = admissions.filter((adm) => {
    const matchesSearch = 
      adm.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adm.employee.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adm.employee.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'TODOS') return matchesSearch;
    return matchesSearch && adm.status === statusFilter;
  });

  const cards = [
    {
      title: 'Novas admissões',
      value: stats.newAdmissions,
      description: 'Cadastradas nos últimos 7 dias',
      icon: UserPlus,
      color: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/10',
      actionFilter: 'TODOS',
      targetPath: '/admissoes',
      actionLabel: 'Ver todas as admissões'
    },
    {
      title: 'Aguardando documentos',
      value: stats.waitingDocuments,
      description: 'Colaborador precisa enviar docs',
      icon: Clock,
      color: 'bg-sky-50 text-sky-700 border-sky-200 ring-sky-500/10',
      actionFilter: 'Aguardando documentos',
      targetPath: '/admissoes?status=Aguardando documentos',
      actionLabel: 'Ver aguardando envio'
    },
    {
      title: 'Aguardando conferência',
      value: stats.waitingReview,
      description: 'Documentos prontos para análise',
      icon: FileCheck,
      color: 'bg-amber-50 text-amber-800 border-amber-200 ring-amber-500/10',
      actionFilter: 'Em conferência',
      targetPath: '/documentos',
      actionLabel: 'Abrir tela de conferência'
    },
    {
      title: 'Pendências',
      value: stats.pendingIssues,
      description: 'Possuem documentos rejeitados',
      icon: AlertTriangle,
      color: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10',
      actionFilter: 'Pendência',
      targetPath: '/admissoes?status=Pendência',
      actionLabel: 'Ver admissões com pendências'
    },
    {
      title: 'Concluídas',
      value: stats.completed,
      description: '100% dos documentos aprovados',
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10',
      actionFilter: 'Concluída',
      targetPath: '/admissoes?status=Concluída',
      actionLabel: 'Ver processos concluídos'
    },
  ];

  return (
    <div className="space-y-6">
      {/* 5 Cards de Métricas com Navegação */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card, idx) => (
          <div
            key={idx}
            onClick={() => navigate(card.targetPath)}
            className="group cursor-pointer rounded-2xl p-4.5 border border-slate-200/80 bg-white transition-all duration-200 hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 relative flex flex-col justify-between"
            title={`Clique para ir para: ${card.actionLabel}`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 line-clamp-1 group-hover:text-slate-700 transition-colors">
                  {card.title}
                </span>
                <div className={`p-2 rounded-xl border ${card.color}`}>
                  <card.icon className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {loading ? '...' : card.value}
                </span>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                {card.description}
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 group-hover:text-blue-600 font-medium transition-colors">
              <span className="truncate">{card.actionLabel}</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 ml-1 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        ))}
      </div>

      {/* Painel Central de Admissões Recentes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Barra de Filtros e Busca */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/raitz-logo.jpg"
              alt="Logo Raitz"
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-lg object-cover shadow-xs border border-slate-200 shrink-0"
            />
            <h2 className="text-base font-bold text-slate-900">Processos Admissionais</h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
              {filteredAdmissions.length}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Campo de Busca */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, cargo ou setor..."
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Filtro por Status */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="TODOS">Todos os Status</option>
                <option value="Aguardando documentos">Aguardando documentos</option>
                <option value="Em conferência">Em conferência</option>
                <option value="Pendência">Pendência</option>
                <option value="Concluída">Concluída</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabela Responsiva */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Colaborador / Cargo</th>
                <th className="py-3 px-4">CPF (LGPD)</th>
                <th className="py-3 px-4">Início Previsto</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Progresso Docs</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAdmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Nenhum processo admissional encontrado.
                  </td>
                </tr>
              ) : (
                filteredAdmissions.map((adm) => {
                  const cpfMasked = (adm.employee as any).cpfMasked || '***.***.***-**';
                  return (
                    <tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                          {adm.employee.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {adm.employee.role} • {adm.employee.department}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {cpfMasked}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        {new Date(adm.employee.expectedStartDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={adm.status} size="sm" />
                      </td>

                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                          <span>{adm.approvedDocuments} de {adm.totalDocuments}</span>
                          <span className="font-bold text-slate-800">{adm.progressPercent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              adm.progressPercent === 100 
                                ? 'bg-emerald-500' 
                                : adm.status === 'Pendência' 
                                ? 'bg-rose-500' 
                                : 'bg-blue-600'
                            }`}
                            style={{ width: `${adm.progressPercent}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão Convite / WhatsApp */}
                          <button
                            onClick={() => setSelectedInviteAdmission(adm)}
                            title="Gerar / Enviar Convite"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>

                          {/* Botão Detalhes */}
                          <button
                            onClick={() => navigate(`/admissoes/${adm.id}`)}
                            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <span>Conferir</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Convite Individual */}
      <InviteModal
        admission={selectedInviteAdmission}
        isOpen={!!selectedInviteAdmission}
        onClose={() => setSelectedInviteAdmission(null)}
      />
    </div>
  );
};
