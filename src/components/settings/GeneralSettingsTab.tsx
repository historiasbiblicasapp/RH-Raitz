import React from 'react';
import { Building2, FileText, Mail, Phone, Clock, AlertCircle } from 'lucide-react';
import { SystemGeneralSettings } from '../../types/index.ts';

interface GeneralSettingsTabProps {
  settings: SystemGeneralSettings;
  onChange: (updates: Partial<SystemGeneralSettings>) => void;
}

export const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({ settings, onChange }) => {
  return (
    <div className="space-y-6">
      {/* Aviso Operacional e Jurídico */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Regras Operacionais Internas</p>
          <p className="text-amber-800 leading-relaxed">
            Os parâmetros cadastrados nesta área representam exclusivamente fluxos e preferências operacionais da empresa. 
            Eles não constituem prazos legais, obrigações trabalhistas ou conformidade jurídica automática perante órgãos oficiais.
          </p>
        </div>
      </div>

      {/* Dados Principais da Empresa */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          <span>Identificação da Empresa Empregadora</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Razão Social / Nome de Exibição <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={settings.companyName || ''}
              onChange={(e) => onChange({ companyName: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Ex: Galvanização Raitz Ltda."
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              CNPJ da Matriz / Principal
            </label>
            <input
              type="text"
              value={settings.cnpj || ''}
              onChange={(e) => onChange({ cnpj: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="00.000.000/0001-00"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Nome de Identificação do Sistema
            </label>
            <input
              type="text"
              value={settings.systemName || ''}
              onChange={(e) => onChange({ systemName: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Admissão Digital"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Versão do Termo LGPD e Privacidade
            </label>
            <input
              type="text"
              value={settings.termVersion || ''}
              onChange={(e) => onChange({ termVersion: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="v1.2-2025"
            />
          </div>
        </div>
      </div>

      {/* Canais de Contato e Atendimento ao Candidato */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Mail className="w-4 h-4 text-blue-600" />
          <span>Contatos do RH para Suporte ao Candidato</span>
        </h3>
        <p className="text-xs text-slate-500">
          Essas informações são disponibilizadas na tela de envio de documentos para o colaborador tirar dúvidas.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>E-mail de Suporte do RH</span>
            </label>
            <input
              type="email"
              value={settings.supportEmail || ''}
              onChange={(e) => onChange({ supportEmail: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="rh@raitz.com.br"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>Telefone / WhatsApp RH</span>
            </label>
            <input
              type="text"
              value={settings.supportPhone || ''}
              onChange={(e) => onChange({ supportPhone: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="(11) 98765-4321"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Horário de Atendimento</span>
            </label>
            <input
              type="text"
              value={settings.businessHours || ''}
              onChange={(e) => onChange({ businessHours: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Seg a Sex das 08h às 18h"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
