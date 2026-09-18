import React from 'react';
import { Files, AlertOctagon, RotateCcw, CalendarClock, ShieldAlert, CheckSquare } from 'lucide-react';
import { SystemDocumentSettings } from '../../types/index.ts';

interface DocumentSettingsTabProps {
  settings: SystemDocumentSettings;
  onChange: (updates: Partial<SystemDocumentSettings>) => void;
}

export const DocumentSettingsTab: React.FC<DocumentSettingsTabProps> = ({ settings, onChange }) => {
  const commonFileTypes = [
    { ext: 'PDF', mime: 'application/pdf' },
    { ext: 'JPG / JPEG', mime: 'image/jpeg' },
    { ext: 'PNG', mime: 'image/png' },
    { ext: 'WEBP', mime: 'image/webp' }
  ];

  const currentTypes = settings.defaultAllowedFileTypes || ['application/pdf', 'image/jpeg', 'image/png'];

  const toggleFileType = (mime: string) => {
    let next: string[];
    if (currentTypes.includes(mime)) {
      if (currentTypes.length <= 1) return; // Mínimo 1 formato
      next = currentTypes.filter(t => t !== mime);
    } else {
      next = [...currentTypes, mime];
    }
    onChange({ defaultAllowedFileTypes: next });
  };

  return (
    <div className="space-y-6">
      {/* Upload e Restrições Técnicas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Files className="w-4 h-4 text-blue-600" />
            <span>Formatos e Limites Padrão de Upload</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Defina as restrições técnicas que protegem o armazenamento e garantem a integridade dos arquivos.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <label className="block font-semibold text-slate-800">
              Tamanho Máximo Padrão por Arquivo (MB)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="50"
                value={settings.defaultMaxFileSizeMb ?? 15}
                onChange={(e) => onChange({ defaultMaxFileSizeMb: Math.max(1, parseInt(e.target.value) || 15) })}
                className="w-24 bg-white border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-900 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
              <span className="text-slate-600 font-medium">Megabytes (MB)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Limite global aplicado ao upload do candidato (pode ser refinado por tipo de documento).
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <label className="block font-semibold text-slate-800">
              Alerta de Documentos com Validade Próxima
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="5"
                max="180"
                value={settings.alertExpiringDocumentsDays ?? 30}
                onChange={(e) => onChange({ alertExpiringDocumentsDays: Math.max(5, parseInt(e.target.value) || 30) })}
                className="w-24 bg-white border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-900 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
              <span className="text-slate-600 font-medium">dias antes do vencimento</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Alerta para CNH, ASO ou outros documentos com campo de expiração configurado.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 sm:col-span-2">
            <label className="block font-semibold text-slate-800">
              Formatos de Arquivo Habilitados por Padrão
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {commonFileTypes.map((item) => {
                const checked = currentTypes.includes(item.mime);
                return (
                  <button
                    key={item.mime}
                    type="button"
                    onClick={() => toggleFileType(item.mime)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      checked
                        ? 'bg-blue-50 border-blue-300 text-blue-800'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span>{item.ext}</span>
                    <CheckSquare className={`w-4 h-4 ${checked ? 'text-blue-600' : 'text-slate-300'}`} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Regras de Conferência, Recusa e Reenvio */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-600" />
            <span>Políticas de Recusa e Reenvio de Documentos</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Padronize a conduta do RH ao recusar documentos com baixa legibilidade ou inconsistências.
          </p>
        </div>

        <div className="space-y-3 divide-y divide-slate-100">
          {/* Exigir justificativa */}
          <div className="pt-3 first:pt-0 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900">Exigir Justificativa Obrigatória ao Rejeitar Documento</p>
              <p className="text-[11px] text-slate-500">
                Impede que o analista rejeite um documento sem selecionar ou digitar o motivo claro ao candidato.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.requireRejectionReason ?? true}
                onChange={(e) => onChange({ requireRejectionReason: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Notificar funcionário imediatamente */}
          <div className="pt-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900">Sugerir Notificação Imediata ao Recusar</p>
              <p className="text-[11px] text-slate-500">
                Abre ou sugere o envio da mensagem WhatsApp já preenchida com o motivo da recusa.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifyEmployeeOnRejection ?? true}
                onChange={(e) => onChange({ notifyEmployeeOnRejection: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Reenvios ilimitados vs limite */}
          <div className="pt-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900">Permitir Tentativas Ilimitadas de Reenvio</p>
              <p className="text-[11px] text-slate-500">
                Se desativado, o candidato poderá reenviar o documento recusado apenas até o limite definido abaixo.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowUnlimitedResubmission ?? true}
                onChange={(e) => onChange({ allowUnlimitedResubmission: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Limite de reenvios se não for ilimitado */}
          {!settings.allowUnlimitedResubmission && (
            <div className="pt-3 flex items-center justify-between gap-4 bg-slate-50 p-3 rounded-xl">
              <div>
                <p className="text-xs font-bold text-slate-900">Limite Máximo de Tentativas de Reenvio</p>
                <p className="text-[11px] text-slate-500">
                  Após este número de recusas, o candidato deverá contatar o RH diretamente.
                </p>
              </div>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.maxResubmissionAttempts ?? 3}
                onChange={(e) => onChange({ maxResubmissionAttempts: Math.max(1, parseInt(e.target.value) || 3) })}
                className="w-20 bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-900 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
