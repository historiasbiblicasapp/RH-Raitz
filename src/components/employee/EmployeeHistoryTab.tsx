import React from 'react';
import { 
  History, 
  User, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  Edit3, 
  UserCheck, 
  UserX, 
  Eye, 
  FileText,
  ArrowRight,
  Shield
} from 'lucide-react';
import { AuditLog } from '../../types/index.ts';
import { maskCPF } from '../../lib/cpf.ts';

interface EmployeeHistoryTabProps {
  auditLogs: AuditLog[];
}

export const EmployeeHistoryTab: React.FC<EmployeeHistoryTabProps> = ({
  auditLogs
}) => {
  if (!auditLogs || auditLogs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <History className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">Nenhum evento registrado</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Ainda não há registros de auditoria ou modificações cadastrais para este funcionário.
        </p>
      </div>
    );
  }

  const getActionIcon = (action: string) => {
    if (action.includes('Inativado') || action.includes('Situação')) {
      return <UserX className="w-4 h-4 text-rose-600" />;
    }
    if (action.includes('Reativado')) {
      return <UserCheck className="w-4 h-4 text-emerald-600" />;
    }
    if (action.includes('CPF') || action.includes('visualizado')) {
      return <Eye className="w-4 h-4 text-indigo-600" />;
    }
    if (action.includes('Novo') || action.includes('cadastrado')) {
      return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
    }
    return <Edit3 className="w-4 h-4 text-blue-600" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600" />
          Trilha de Auditoria e Alterações Cadastrais ({auditLogs.length})
        </h3>
        <span className="text-xs text-slate-400">Registros imutáveis e protegidos por LGPD</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="divide-y divide-slate-100">
          {auditLogs.map((log) => {
            const timestamp = log.createdAt || log.timestamp;
            const formattedDate = timestamp ? new Date(timestamp).toLocaleString('pt-BR') : '-';
            const changes = log.changes || [];

            return (
              <div key={log.id} className="p-4 sm:p-5 space-y-3 hover:bg-slate-50/60 transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                      {getActionIcon(log.action)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{log.action}</h4>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <User className="w-3 h-3 text-slate-400" />
                        Responsável: <strong className="text-slate-700">{log.userName || 'Sistema / RH'}</strong>
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 self-start sm:self-auto">
                    <Clock className="w-3 h-3" />
                    {formattedDate}
                  </span>
                </div>

                {log.details && (
                  <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100/80 leading-relaxed">
                    {log.details}
                  </p>
                )}

                {/* Detalhamento de Campos Alterados: Antes x Depois (Seção 22) */}
                {changes.length > 0 && (
                  <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-blue-400 text-xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Campos Modificados:
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {changes.map((ch, idx) => (
                        <div 
                          key={idx} 
                          className="bg-white p-2.5 rounded-md border border-slate-200/90 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <span className="font-bold text-slate-800 shrink-0">
                            {ch.label || ch.field}:
                          </span>

                          <div className="flex items-center gap-2 text-[11px] font-medium">
                            <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded line-through">
                              {ch.previousValue || '(não informado)'}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {ch.newValue || '(removido)'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
