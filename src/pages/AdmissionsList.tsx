import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  MessageCircle, 
  ChevronRight,
  Clock,
  UserCheck
} from 'lucide-react';
import { Admission } from '../types/index.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { InviteModal } from '../components/InviteModal.tsx';
import { maskCPF } from '../lib/cpf.ts';

export const AdmissionsList: React.FC = () => {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [selectedInviteAdmission, setSelectedInviteAdmission] = useState<Admission | null>(null);

  const navigate = useNavigate();

  const loadAdmissions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admissions');
      if (res.ok) {
        const data = await res.json();
        setAdmissions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmissions();
  }, []);

  const filtered = admissions.filter((adm) => {
    const matches = 
      adm.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adm.employee.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adm.employee.department.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'TODOS') return matches;
    return matches && adm.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/raitz-logo.jpg"
            alt="Logo Raitz"
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-xl object-cover shadow-xs border border-slate-200 shrink-0"
          />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Todos os Processos Admissionais</h1>
            <p className="text-xs text-slate-500">
              Acompanhe em tempo real o status e o checklist de documentos de cada colaborador.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/admissoes/nova')}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Admissão</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Filtros */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar colaborador, cargo ou setor..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

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

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-100">
                <th className="py-3 px-4">Colaborador / Cargo</th>
                <th className="py-3 px-4">CPF (LGPD)</th>
                <th className="py-3 px-4">Início Previsto</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Documentos</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Nenhuma admissão encontrada.
                  </td>
                </tr>
              ) : (
                filtered.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">
                        {adm.employee.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {adm.employee.role} • {adm.employee.department}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {maskCPF(adm.employee.cpf)}
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedInviteAdmission(adm)}
                          title="Enviar Convite WhatsApp"
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => navigate(`/admissoes/${adm.id}`)}
                          className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <span>Detalhes</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InviteModal
        admission={selectedInviteAdmission}
        isOpen={!!selectedInviteAdmission}
        onClose={() => setSelectedInviteAdmission(null)}
      />
    </div>
  );
};
