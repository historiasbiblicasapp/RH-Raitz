import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, CheckCircle2, Clock, AlertTriangle, FileText } from 'lucide-react';
import { Admission, DashboardStats } from '../types/index.ts';

export const ReportsPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [admissions, setAdmissions] = useState<Admission[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/stats').then(r => r.json()),
      fetch('/api/admissions').then(r => r.json())
    ]).then(([s, a]) => {
      setStats(s);
      setAdmissions(a);
    }).catch(console.error);
  }, []);

  const totalAdmissions = admissions.length;
  const completedRate = totalAdmissions > 0 && stats 
    ? Math.round((stats.completed / totalAdmissions) * 100) 
    : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <img
          src="/raitz-logo.jpg"
          alt="Logo Raitz"
          referrerPolicy="no-referrer"
          className="w-10 h-10 rounded-xl object-cover shadow-xs border border-slate-200 shrink-0"
        />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Relatórios & Indicadores de RH</h1>
          <p className="text-xs text-slate-500">
            Visão consolidada do fluxo de admissões e eficiência no recebimento de documentos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Taxa de Conclusão
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600">{completedRate}%</span>
            <span className="text-xs text-slate-500 font-medium">dos processos finalizados</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Tempo Médio de Retorno
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-blue-600">2.4</span>
            <span className="text-xs text-slate-500 font-medium">dias úteis para envio</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Aprovação em 1ª Versão
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800">82%</span>
            <span className="text-xs text-slate-500 font-medium">sem necessidade de reenvio</span>
          </div>
        </div>
      </div>

      {/* Tabela de distribuição por setor */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Admissões por Departamento</h2>
        <div className="space-y-3">
          {Array.from(new Set(admissions.map(a => a.employee.department))).map((dept) => {
            const count = admissions.filter(a => a.employee.department === dept).length;
            const percentage = totalAdmissions > 0 ? Math.round((count / totalAdmissions) * 100) : 0;
            return (
              <div key={dept} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{dept}</span>
                  <span className="text-slate-500">{count} admissões ({percentage}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
