import React, { useEffect, useState } from 'react';
import { History, Search, ShieldCheck, Download, Filter } from 'lucide-react';
import { AuditLog } from '../types/index.ts';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('TODAS');

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      (log.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.performedBy || log.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());

    if (actionFilter === 'TODAS') return matchesSearch;
    return matchesSearch && log.action.includes(actionFilter);
  });

  const getActionColor = (action: string) => {
    if (action.includes('Aprovado') || action.includes('Concluída')) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (action.includes('Rejeitado') || action.includes('Recusa')) return 'text-rose-700 bg-rose-50 border-rose-200';
    if (action.includes('Enviado') || action.includes('Criada')) return 'text-blue-700 bg-blue-50 border-blue-200';
    return 'text-slate-700 bg-slate-50 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Topo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/raitz-logo.jpg"
            alt="Logo Raitz"
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-xl object-cover shadow-xs border border-slate-200 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Trilha de Auditoria & LGPD</h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3 h-3" />
                <span>Conforme LGPD Art. 37</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Registro imutável de todas as ações, envios, análises e acessos a dados no sistema.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por colaborador ou ação..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="TODAS">Todas as Ações</option>
              <option value="Criada">Admissão Criada</option>
              <option value="Enviado">Documento Enviado</option>
              <option value="Aprovado">Aprovado</option>
              <option value="Rejeitado">Rejeitado</option>
              <option value="Concluída">Admissão Concluída</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Logs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Data e Hora</th>
                <th className="py-3 px-4">Usuário / Agente</th>
                <th className="py-3 px-4">Ação Executada</th>
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-4">Documento</th>
                <th className="py-3 px-4">Detalhes & Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans text-xs">
                    Nenhum registro de auditoria encontrado.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>

                    <td className="py-3 px-4 font-sans font-semibold text-slate-800">
                      {log.performedBy || log.userName}
                    </td>

                    <td className="py-3 px-4 font-sans">
                      <span className={`inline-block px-2 py-0.5 rounded-md border text-[11px] font-semibold ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-sans text-slate-800">
                      {log.employeeName || '—'}
                    </td>

                    <td className="py-3 px-4 font-sans text-slate-600">
                      {log.documentType || '—'}
                    </td>

                    <td className="py-3 px-4 font-sans text-slate-600 max-w-xs truncate">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
