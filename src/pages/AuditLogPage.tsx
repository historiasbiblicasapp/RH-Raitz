import React, { useEffect, useState } from 'react';
import { History, Search, ShieldCheck, Download, Filter, ChevronRight, Eye, User, FileText, Briefcase, CheckCircle2, XCircle, Clock, ArrowRight } from 'lucide-react';
import { AuditLog, AuditLogChange } from '../types/index.ts';
import { safeFetchJson } from '../lib/api.ts';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('TODAS');
  const [entityFilter, setEntityFilter] = useState('TODAS');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await safeFetchJson<any>('/api/audit-logs');
      if (Array.isArray(data)) {
        setLogs(data);
      } else if (data?.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.warn('Erro ao carregar logs de auditoria:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (log.employeeName || '').toLowerCase().includes(term) ||
      (log.performedBy || log.userName || '').toLowerCase().includes(term) ||
      (log.entityName || '').toLowerCase().includes(term) ||
      (log.fieldChanged || '').toLowerCase().includes(term) ||
      (log.previousValue || '').toLowerCase().includes(term) ||
      (log.newValue || '').toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term);

    const matchesAction = actionFilter === 'TODAS' || log.action.includes(actionFilter);
    const matchesEntity = entityFilter === 'TODAS' || log.entityType === entityFilter;

    return matchesSearch && matchesAction && matchesEntity;
  });

  const getActionColor = (action: string) => {
    if (action.includes('Aprovado') || action.includes('Concluída') || action.includes('activated')) {
      return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }
    if (action.includes('Rejeitado') || action.includes('Recusa') || action.includes('removed') || action.includes('deactivated') || action.includes('cancelou')) {
      return 'text-rose-700 bg-rose-50 border-rose-200';
    }
    if (action.includes('Enviado') || action.includes('Criada') || action.includes('created') || action.includes('added')) {
      return 'text-blue-700 bg-blue-50 border-blue-200';
    }
    if (action.includes('updated') || action.includes('atualizado') || action.includes('reordered')) {
      return 'text-amber-700 bg-amber-50 border-amber-200';
    }
    return 'text-slate-700 bg-slate-50 border-slate-200';
  };

  const getEntityIcon = (entityType?: string) => {
    switch (entityType) {
      case 'job_position':
        return <Briefcase className="w-3.5 h-3.5 text-indigo-600" />;
      case 'document_type':
        return <FileText className="w-3.5 h-3.5 text-blue-600" />;
      case 'job_position_document':
        return <CheckCircle2 className="w-3.5 h-3.5 text-violet-600" />;
      case 'admission_document':
        return <FileText className="w-3.5 h-3.5 text-emerald-600" />;
      case 'admission':
        return <User className="w-3.5 h-3.5 text-sky-600" />;
      default:
        return <History className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getEntityLabel = (entityType?: string) => {
    switch (entityType) {
      case 'job_position': return 'Cargo';
      case 'document_type': return 'Tipo de Documento';
      case 'job_position_document': return 'Checklist do Cargo';
      case 'admission_document': return 'Documento de Admissão';
      case 'admission': return 'Admissão';
      default: return 'Sistema';
    }
  };

  const exportToCSV = () => {
    const headers = ['Data/Hora', 'Usuário', 'Ação', 'Entidade', 'Nome Entidade', 'Campo Alterado', 'Valor Anterior', 'Novo Valor', 'Colaborador', 'Documento', 'Detalhes'];
    const rows = filteredLogs.map(l => [
      new Date(l.timestamp).toISOString(),
      l.userName || l.performedBy || '',
      l.action,
      l.entityType || '',
      l.entityName || '',
      l.fieldChanged || '',
      l.previousValue || '',
      l.newValue || '',
      l.employeeName || '',
      l.documentType || '',
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria-admissao-digital-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              <h1 className="text-xl font-bold text-slate-900">Trilha de Auditoria & Segurança</h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3 h-3" />
                <span>Rastreabilidade Total LGPD Art. 37</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Registro estruturado e imutável de quem criou, alterou, quando alterou, valores anteriores e novos valores.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={exportToCSV}
            title="Exportar registros filtrados para CSV"
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por usuário, campo, valor ou ação..."
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <span className="text-slate-400 font-medium">Entidade:</span>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="TODAS">Todas as Entidades</option>
              <option value="job_position">Cargos</option>
              <option value="document_type">Tipos de Documento</option>
              <option value="job_position_document">Checklist por Cargo</option>
              <option value="admission_document">Documentos de Admissão</option>
              <option value="admission">Cadastro de Admissão</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="TODAS">Todas as Ações</option>
              <option value="Criada">Admissão Criada</option>
              <option value="Enviado">Documento Enviado</option>
              <option value="aprovou">Aprovado pelo RH</option>
              <option value="rejeitou">Rejeitado pelo RH</option>
              <option value="updated">Atualização</option>
              <option value="added">Inclusão</option>
              <option value="removed">Remoção / Inativação</option>
              <option value="reordered">Reordenação</option>
              <option value="Concluída">Admissão Concluída</option>
            </select>
          </div>

          <span className="text-xs text-slate-400">
            {filteredLogs.length} registro{filteredLogs.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Tabela de Logs Estruturada */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Data e Hora</th>
                <th className="py-3 px-4">Quem Realizou</th>
                <th className="py-3 px-4">Entidade & Alvo</th>
                <th className="py-3 px-4">O que foi Alterado (De ➔ Para)</th>
                <th className="py-3 px-4">Detalhes & Contexto</th>
                <th className="py-3 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans text-xs">
                    Carregando trilha de auditoria...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans text-xs">
                    Nenhum registro de auditoria encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr 
                    key={log.id} 
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>

                    <td className="py-3 px-4 font-sans font-semibold text-slate-800 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {(log.performedBy || log.userName || 'S').slice(0, 1).toUpperCase()}
                        </span>
                        <span>{log.performedBy || log.userName}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-sans">
                      <div className="flex items-center gap-1.5">
                        {getEntityIcon(log.entityType)}
                        <div>
                          <div className="font-semibold text-slate-800">
                            {log.entityName || log.employeeName || log.documentType || '—'}
                          </div>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {getEntityLabel(log.entityType)}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-sans max-w-xs">
                      {log.fieldChanged ? (
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-slate-600 block">
                            {log.fieldChanged}:
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap text-xs">
                            {log.previousValue !== undefined && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[11px] line-through">
                                {log.previousValue}
                              </span>
                            )}
                            {log.previousValue !== undefined && log.newValue !== undefined && (
                              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                            )}
                            {log.newValue !== undefined && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                                {log.newValue}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className={`inline-block px-2 py-0.5 rounded-md border text-[11px] font-semibold ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-sans text-slate-600 max-w-sm">
                      <p className="truncate text-xs" title={log.details}>
                        {log.details}
                      </p>
                      {log.changes && log.changes.length > 1 && (
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          +{log.changes.length} alterações estruturadas
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="p-1 rounded-lg text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors"
                        title="Ver detalhes da auditoria"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Drawer de Detalhes da Auditoria */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Registro Detalhado de Auditoria</h3>
                  <span className="text-[11px] text-slate-500 font-mono">ID: {selectedLog.id}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Data e Hora</span>
                  <span className="font-mono text-slate-800 font-medium">
                    {new Date(selectedLog.timestamp).toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Responsável</span>
                  <span className="font-bold text-slate-900">
                    {selectedLog.performedBy || selectedLog.userName}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Tipo de Entidade</span>
                  <span className="font-semibold text-slate-800">
                    {getEntityLabel(selectedLog.entityType)}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Ação Realizada</span>
                  <span className="font-semibold text-slate-800">
                    {selectedLog.action}
                  </span>
                </div>
              </div>

              {/* Seção de Alterações Estruturadas */}
              {selectedLog.changes && selectedLog.changes.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                    <h4 className="text-xs font-bold text-slate-900">Campos Alterados (De ➔ Para)</h4>
                  </div>
                  <div className="divide-y divide-slate-100 p-2 space-y-2">
                    {selectedLog.changes.map((change, idx) => (
                      <div key={idx} className="p-2 text-xs space-y-1">
                        <span className="font-bold text-slate-700 block text-[11px]">
                          {change.label || change.field}:
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-mono line-through">
                            {String(change.previousValue ?? 'Vazio')}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-mono font-semibold">
                            {String(change.newValue ?? 'Vazio')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedLog.fieldChanged ? (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase">
                    Alteração no campo: {selectedLog.fieldChanged}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    {selectedLog.previousValue !== undefined && (
                      <div className="p-2 rounded-lg bg-white border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-semibold">Valor Anterior</span>
                        <span className="font-mono text-rose-700 line-through">{selectedLog.previousValue}</span>
                      </div>
                    )}
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                    {selectedLog.newValue !== undefined && (
                      <div className="p-2 rounded-lg bg-white border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-semibold">Novo Valor</span>
                        <span className="font-mono text-emerald-700 font-bold">{selectedLog.newValue}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Detalhes Textuais */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Descrição Completa</span>
                <p className="text-slate-800 leading-relaxed font-sans">
                  {selectedLog.details}
                </p>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

