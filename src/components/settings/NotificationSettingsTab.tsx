import React from 'react';
import { Bell, Mail, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { SystemNotificationSettings } from '../../types/index.ts';

interface NotificationSettingsTabProps {
  settings: SystemNotificationSettings;
  onChange: (updates: Partial<SystemNotificationSettings>) => void;
}

export const NotificationSettingsTab: React.FC<NotificationSettingsTabProps> = ({ settings, onChange }) => {
  return (
    <div className="space-y-6">
      {/* Alertas Operacionais da Fila de Trabalho */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600" />
            <span>Alertas Operacionais para a Equipe de RH</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Defina quando e como o sistema deve alertar os analistas sobre acontecimentos no fluxo.
          </p>
        </div>

        <div className="space-y-3 divide-y divide-slate-100">
          {/* Documentos submetidos */}
          <div className="pt-3 first:pt-0 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900">Notificar RH Quando Candidato Enviar Todos os Documentos</p>
              <p className="text-[11px] text-slate-500">
                Sinaliza na Central de Pendências que o pacote do colaborador está pronto para análise.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifyRhOnAllDocumentsSubmitted ?? true}
                onChange={(e) => onChange({ notifyRhOnAllDocumentsSubmitted: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Reenvio após recusa */}
          <div className="pt-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900">Notificar RH Quando Documento Recusado For Reenviado</p>
              <p className="text-[11px] text-slate-500">
                Atribui prioridade na Central para reanalisar rapidamente documentos corrigidos pelo candidato.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifyRhOnDocumentResubmitted ?? true}
                onChange={(e) => onChange({ notifyRhOnDocumentResubmitted: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Alerta de inatividade diário */}
          <div className="pt-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900">Alerta Diário de Admissões Estagnadas</p>
              <p className="text-[11px] text-slate-500">
                Destaque automático no início da manhã de todas as admissões sem movimentação.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.alertInactivityDaily ?? true}
                onChange={(e) => onChange({ alertInactivityDaily: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Relatório Consolidado Diário por E-mail */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-600" />
            <span>Resumo Operacional Diário por E-mail (Digest)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Envio automatizado de resumo matinal contendo totais de admissões, pendências e inatividades.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              E-mail de Destino do Resumo Operacional
            </label>
            <input
              type="email"
              value={settings.digestEmailAddress || ''}
              onChange={(e) => onChange({ digestEmailAddress: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="rh-gestao@raitz.com.br"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Horário de Disparo do Resumo Matinal
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={settings.digestNotificationHour || '08:00'}
                onChange={(e) => onChange({ digestNotificationHour: e.target.value })}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-slate-500 text-xs">horário de Brasília</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
