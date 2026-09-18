import React, { useState, useEffect } from 'react';
import { History, Shield, RefreshCw, Clock, User, FileText } from 'lucide-react';
import { AuditLog } from '../../types/index.ts';

export const AuditHistoryTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings/history');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.history || []);
      }
    } catch (err) {
      console.error('Erro ao buscar histórico de configurações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.userName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <span>Histórico de Auditoria das Configurações Operacionais</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Registro cronológico de quem alterou parâmetros operacionais, modelos de mensagens e regras.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchHistory}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl font-semibold transition-colors w-fit cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar Histórico</span>
          </button>
        </div>

        {/* Campo de Busca */}
        <div className="max-w-xs">
          <input
            type="text"
            placeholder="Filtrar por ação, usuário ou detalhe..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Lista de Registros */}
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 text-center text-xs text-slate-400">Carregando histórico de alterações...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 space-y-1">
              <Shield className="w-6 h-6 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600">Nenhum registro de alteração recente encontrado.</p>
              <p className="text-[11px] text-slate-400">Qualquer mudança salva nas configurações será auditada automaticamente aqui.</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{log.action}</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-md">
                      {log.userName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-mono text-[11px] bg-white p-2 rounded-lg border border-slate-100">
                  {log.details}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
