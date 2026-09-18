import React from 'react';
import { UserCheck, Clock, Calendar, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { SystemAdmissionSettings } from '../../types/index.ts';

interface AdmissionSettingsTabProps {
  settings: SystemAdmissionSettings;
  onChange: (updates: Partial<SystemAdmissionSettings>) => void;
}

export const AdmissionSettingsTab: React.FC<AdmissionSettingsTabProps> = ({ settings, onChange }) => {
  return (
    <div className="space-y-6">
      {/* Prazos Operacionais e Monitoramento */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Prazos e Alertas Operacionais de Acompanhamento</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Configure os parâmetros de sensibilidade para a Central de Acompanhamento e painéis de monitoramento do RH.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <label className="block font-semibold text-slate-800">
              Início Próximo (Dias de Antecedência)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="60"
                value={settings.upcomingDaysThreshold ?? 5}
                onChange={(e) => onChange({ upcomingDaysThreshold: Math.max(1, parseInt(e.target.value) || 5) })}
                className="w-24 bg-white border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-900 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
              <span className="text-slate-600 font-medium">dias antes do início previsto</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Admissões com data de admissão dentro deste intervalo serão sinalizadas com o marcador &ldquo;Início Próximo&rdquo;.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <label className="block font-semibold text-slate-800">
              Alerta de Inatividade (Dias sem Movimentação)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="30"
                value={settings.inactivityThresholdDays ?? 3}
                onChange={(e) => onChange({ inactivityThresholdDays: Math.max(1, parseInt(e.target.value) || 3) })}
                className="w-24 bg-white border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-900 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
              <span className="text-slate-600 font-medium">dias corridos sem interação</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Dispara o badge &ldquo;Atenção: sem movimentação&rdquo; no Acompanhamento quando o candidato ou RH não interagem.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 sm:col-span-2">
            <label className="block font-semibold text-slate-800">
              Limite Máximo Futuro para Início Previsto
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="7"
                max="365"
                value={settings.maxFutureDaysStartDate ?? 90}
                onChange={(e) => onChange({ maxFutureDaysStartDate: Math.max(7, parseInt(e.target.value) || 90) })}
                className="w-24 bg-white border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-900 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
              <span className="text-slate-600 font-medium">dias no futuro</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Bloqueia o agendamento de datas de início que excedam este limite na criação da admissão.
            </p>
          </div>
        </div>
      </div>

      {/* Regras de Edição e Permissões no Ciclo de Vida */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Travas e Permissões Operacionais no Ciclo da Admissão</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Controle o que os operadores de RH têm permissão de alterar nas admissões em andamento.
          </p>
        </div>

        <div className="space-y-3 divide-y divide-slate-100">
          {/* Bloquear início retroativo */}
          <div className="pt-3 first:pt-0 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900">Bloquear Data de Início Retroativa</p>
              <p className="text-[11px] text-slate-500">
                Impede cadastrar colaboradores com data prevista de início anterior ao dia atual.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.blockRetroactiveStartDate ?? false}
                onChange={(e) => onChange({ blockRetroactiveStartDate: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Permitir edição de dados após criação */}
          <div className="pt-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900">Permitir Edição de Dados Cadastrais Após Criação</p>
              <p className="text-[11px] text-slate-500">
                Permite que operadores de RH ajustem nome, e-mail, telefone e dados pessoais durante o processo.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowEditDataAfterCreation ?? true}
                onChange={(e) => onChange({ allowEditDataAfterCreation: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Permitir alteração de cargo */}
          <div className="pt-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900">Permitir Alteração de Cargo Durante o Processo</p>
              <p className="text-[11px] text-slate-500">
                Se desativado, o cargo cadastrado no início do fluxo fica congelado para preservar o checklist original.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowEditRoleAfterCreation ?? true}
                onChange={(e) => onChange({ allowEditRoleAfterCreation: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Permitir cancelamento */}
          <div className="pt-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900">Habilitar Ação de Cancelamento de Admissão</p>
              <p className="text-[11px] text-slate-500">
                Exibe o botão de cancelamento para operadores encerrarem processos de desistência ou reprovação.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowCancelAdmission ?? true}
                onChange={(e) => onChange({ allowCancelAdmission: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Exigir justificativa no cancelamento */}
          <div className="pt-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900">Exigir Justificativa Textual Obrigatória ao Cancelar</p>
              <p className="text-[11px] text-slate-500">
                Obriga o preenchimento de um motivo formal que será auditado no histórico do processo.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.requireCancellationReason ?? true}
                onChange={(e) => onChange({ requireCancellationReason: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Permitir conclusão manual com pendências */}
          <div className="pt-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900">Permitir Conclusão Manual pelo RH</p>
              <p className="text-[11px] text-slate-500">
                Permite que o RH finalize a admissão caso todos os documentos obrigatórios estejam conferidos.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowManualCompletion ?? true}
                onChange={(e) => onChange({ allowManualCompletion: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
