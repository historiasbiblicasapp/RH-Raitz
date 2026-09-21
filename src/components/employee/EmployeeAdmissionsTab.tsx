import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Briefcase, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  Layers,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import { Admission } from '../../types/index.ts';
import { StatusBadge } from '../StatusBadge.tsx';

interface EmployeeAdmissionsTabProps {
  admissions: Admission[];
}

export const EmployeeAdmissionsTab: React.FC<EmployeeAdmissionsTabProps> = ({
  admissions
}) => {
  if (!admissions || admissions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">Nenhuma admissão vinculada</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Este colaborador ainda não possui processos formais de admissão digital registrados no sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          Histórico de Processos de Admissão ({admissions.length})
        </h3>
        <span className="text-xs text-slate-500">
          Integridade e snapshots preservados por processo
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {admissions.map((adm) => {
          const docsCount = adm.documents ? adm.documents.length : 0;
          const pendingDocs = adm.documents ? adm.documents.filter(d => d.status === 'Rejeitado' || d.status === 'Não enviado').length : 0;
          const isCompleted = adm.status === 'Concluída';

          return (
            <div 
              key={adm.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-blue-300 transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                    Protocolo: #{adm.id}
                  </span>
                  <StatusBadge status={adm.status} size="sm" />
                </div>

                <Link
                  to={`/admissoes/${adm.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition self-start sm:self-auto"
                >
                  Ver Admissão
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Cargo Registrado na Admissão:</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    {adm.employee?.role || '-'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Data de Abertura:</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {adm.createdAt ? new Date(adm.createdAt).toLocaleDateString('pt-BR') : '-'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Início Previsto / Conclusão:</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {adm.employee?.expectedStartDate 
                      ? new Date(adm.employee.expectedStartDate + 'T00:00:00').toLocaleDateString('pt-BR')
                      : '-'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Status das Pendências:</span>
                  <span className={`font-semibold flex items-center gap-1.5 mt-0.5 ${pendingDocs > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {pendingDocs > 0 ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        {pendingDocs} {pendingDocs === 1 ? 'pendência aberta' : 'pendências abertas'}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Nenhuma pendência
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Barra de Progresso Documental */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <FileCheck2 className="w-4 h-4 text-blue-600" />
                  <span>Progresso documental: <strong>{docsCount}</strong> documentos vinculados</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-24 sm:w-36 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${adm.progressPercent || 0}%` }}
                    />
                  </div>
                  <span className="font-bold text-xs text-blue-700">
                    {adm.progressPercent || 0}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
