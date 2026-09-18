import React from 'react';
import { BarChart3, ShieldCheck, Download, Eye, FileSpreadsheet, Lock } from 'lucide-react';
import { SystemReportSettings } from '../../types/index.ts';

interface ReportsSettingsTabProps {
  settings: SystemReportSettings;
  onChange: (updates: Partial<SystemReportSettings>) => void;
}

export const ReportsSettingsTab: React.FC<ReportsSettingsTabProps> = ({ settings, onChange }) => {
  return (
    <div className="space-y-6">
      {/* Diretrizes de Privacidade e LGPD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Privacidade de Dados (LGPD) e Exibição de CPF</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Políticas de anonimização e mascaramento para proteção contra vazamentos de dados sensíveis.
          </p>
        </div>

        <div className="space-y-3 divide-y divide-slate-100">
          {/* Exibir CPF completo nos relatórios */}
          <div className="pt-3 first:pt-0 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>Exibir CPF Completo nos Relatórios e Exportações</span>
                {!settings.showFullCpf && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                    LGPD Ativa: Mascarado (***.***.890-00)
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-500">
                Por padrão, o CPF é mascarado para preservar a privacidade do colaborador. Ative apenas se houver necessidade estrita para integração fiscal.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showFullCpf ?? false}
                onChange={(e) => onChange({ showFullCpf: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {/* Permitir exportação CSV */}
          <div className="pt-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900">Permitir Exportação de Relatórios em CSV</p>
              <p className="text-[11px] text-slate-500">
                Habilita o botão &ldquo;Exportar CSV&rdquo; no módulo de Relatórios da Admissão.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowExportCsv ?? true}
                onChange={(e) => onChange({ allowExportCsv: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Auditoria obrigatória das exportações */}
          <div className="pt-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900">Auditar Automaticamente Todas as Exportações</p>
              <p className="text-[11px] text-slate-500">
                Registra usuário, data/hora, filtros e quantidade de linhas exportadas no log de auditoria.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auditExports ?? true}
                onChange={(e) => onChange({ auditExports: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Retenção de Dados e Histórico */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600" />
            <span>Retenção de Registros de Auditoria</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Tempo em que os logs de auditoria permanecem preservados para rastreabilidade de conformidade interna.
          </p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 max-w-sm text-xs">
          <label className="block font-semibold text-slate-800">
            Período Mínimo de Retenção de Auditoria
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="30"
              max="1825"
              value={settings.retentionAuditDays ?? 365}
              onChange={(e) => onChange({ retentionAuditDays: Math.max(30, parseInt(e.target.value) || 365) })}
              className="w-24 bg-white border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-900 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
            <span className="text-slate-600 font-medium">dias (1 ano recomendado)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
