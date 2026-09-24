import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  Check, 
  X, 
  FileText, 
  ShieldCheck, 
  Sliders, 
  Layers, 
  Activity, 
  AlertTriangle 
} from 'lucide-react';
import { 
  AutomationRoutineRule, 
  AutomationRoutineKey, 
  AutomationExecutionRecord, 
  AutomationsHubResponse 
} from '../../types/index.ts';
import { safeFetchJson } from '../../lib/api.ts';

export const AutomationsTab: React.FC = () => {
  const [data, setData] = useState<AutomationsHubResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchAutomations = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await safeFetchJson<AutomationsHubResponse>('/api/automations');
      if (res && res.routines) {
        setData(res);
      }
    } catch (err: any) {
      console.error('Erro ao carregar automações:', err);
      setErrorMessage('Não foi possível carregar as rotinas de automação.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, []);

  const handleToggle = async (key: AutomationRoutineKey, currentStatus: boolean) => {
    setTogglingKey(key);
    setErrorMessage(null);
    setSuccessMessage(null);

    const newStatus = !currentStatus;

    try {
      const response = await fetch(`/api/automations/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao atualizar rotina.');
      }

      const resJson = await response.json();
      if (resJson.automations) {
        setData(resJson.automations);
      } else {
        // Atualiza localmente
        setData(prev => {
          if (!prev) return prev;
          const updatedRoutines = prev.routines.map(r => 
            r.key === key ? { ...r, enabled: newStatus } : r
          );
          return {
            ...prev,
            routines: updatedRoutines,
            summary: {
              ...prev.summary,
              activeRoutines: updatedRoutines.filter(r => r.enabled).length,
              inactiveRoutines: updatedRoutines.filter(r => !r.enabled).length
            }
          };
        });
      }

      setSuccessMessage(`Rotina ${newStatus ? 'ativada' : 'desativada'} com sucesso.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao alterar estado da automação.');
    } finally {
      setTogglingKey(null);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Nunca executada';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Explanation */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-indigo-950 p-6 rounded-xl border border-blue-100 dark:border-blue-900/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Automação de Rotinas Internas do RH
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  Determinístico
                </span>
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
                Rotinas automáticas puramente determinísticas e seguras para transições operacionais do processo admissional. O sistema não substitui o julgamento do RH: não aprova documentos por conta própria nem altera aprovações humanas.
              </p>
            </div>
          </div>

          <button
            onClick={fetchAutomations}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Alertas de Feedback */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <div className="text-sm text-red-800 dark:text-red-300">{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="text-sm text-emerald-800 dark:text-emerald-300">{successMessage}</div>
        </div>
      )}

      {/* Resumo de Indicadores */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Total de Rotinas</span>
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 block">
              {data.summary.totalRoutines}
            </span>
            <span className="text-xs text-slate-500 mt-1 block">Rotinas mapeadas</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 block">Rotinas Ativas</span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
              {data.summary.activeRoutines}
            </span>
            <span className="text-xs text-slate-500 mt-1 block">Em execução no fluxo</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 block">Rotinas Inativas</span>
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
              {data.summary.inactiveRoutines}
            </span>
            <span className="text-xs text-slate-500 mt-1 block">Pausadas pelo RH</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 block">Execuções Registradas</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 block">
              {data.summary.totalExecutions}
            </span>
            <span className="text-xs text-slate-500 mt-1 block">Totalmente rastreadas</span>
          </div>
        </div>
      )}

      {/* Lista de Rotinas Determinísticas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-slate-500" />
            Rotinas Configuradas
          </h3>
          <span className="text-xs text-slate-500">
            Alterações entram em vigor imediatamente para os novos eventos
          </span>
        </div>

        {loading && !data ? (
          <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
            Carregando rotinas de automação...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {data?.routines.map((routine) => (
              <div 
                key={routine.key}
                className={`p-5 rounded-xl border transition-all ${
                  routine.enabled 
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm' 
                    : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/80 opacity-75'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {routine.name}
                      </span>
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Gatilho: {routine.triggerEvent}
                      </span>
                      {routine.enabled ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Ativa
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          Inativa
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {routine.description}
                    </p>

                    {/* Ações determinísticas */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                        Ações Determinísticas Executadas:
                      </span>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                        {routine.deterministicActions.map((action, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Rodapé da Rotina com métricas de execução */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span>
                        Total de execuções: <strong className="text-slate-700 dark:text-slate-200">{routine.totalExecutions}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Última execução: <strong className="text-slate-700 dark:text-slate-200">{formatDate(routine.lastExecutedAt)}</strong>
                      </span>
                      {routine.lastExecutionStatus && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            Status:
                            {routine.lastExecutionStatus === 'SUCCESS' ? (
                              <span className="font-semibold text-emerald-600 flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Sucesso
                              </span>
                            ) : (
                              <span className="font-semibold text-red-600 flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" /> Erro seguro
                              </span>
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Switch Ativar/Desativar */}
                  <div className="flex md:flex-col items-center md:items-end justify-between gap-2 shrink-0">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={routine.enabled}
                        onChange={() => handleToggle(routine.key, routine.enabled)}
                        disabled={togglingKey === routine.key}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                    </label>
                    <span className="text-xs font-medium text-slate-500">
                      {routine.enabled ? 'Ativa' : 'Pausada'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico Recente de Execuções Automáticas */}
      {data && data.recentExecutions.length > 0 && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-500" />
              Auditoria de Execuções Automáticas Recentes
            </h3>
            <span className="text-xs text-slate-500">
              Últimos {data.recentExecutions.length} registros rastreáveis
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Data / Hora</th>
                    <th className="py-3 px-4">Rotina</th>
                    <th className="py-3 px-4">Gatilho / Admissão</th>
                    <th className="py-3 px-4">Ações Executadas</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {data.recentExecutions.map((exec) => (
                    <tr key={exec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {formatDate(exec.executedAt)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                          {exec.routineName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {exec.routineKey}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800 dark:text-slate-200 block">
                          {exec.employeeName || 'Admissão'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {exec.triggerEvent}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-md">
                        {exec.actionsTaken && exec.actionsTaken.length > 0 ? (
                          <ul className="space-y-0.5">
                            {exec.actionsTaken.map((action, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-slate-600 dark:text-slate-400">
                                <span className="text-blue-500">•</span>
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-slate-500 italic">{exec.details}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {exec.status === 'SUCCESS' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            Sucesso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800">
                            <AlertTriangle className="w-3 h-3" />
                            Erro seguro
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
