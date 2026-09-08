import React, { useState } from 'react';
import { Settings, ShieldCheck, Database, FileCheck, Check, Save } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [termVersion, setTermVersion] = useState('1.0-2025');
  const [companyName, setCompanyName] = useState('TechCorp Brasil S/A');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <img
          src="/raitz-logo.jpg"
          alt="Logo Raitz"
          referrerPolicy="no-referrer"
          className="w-10 h-10 rounded-xl object-cover shadow-xs border border-slate-200 shrink-0"
        />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Configurações do Sistema</h1>
          <p className="text-xs text-slate-500">
            Gerenciamento de parâmetros operacionais, segurança da informação e termos LGPD.
          </p>
        </div>
      </div>

      {saved && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Configurações salvas com sucesso!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Bloco Empresa */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-600" />
            <span>Dados da Empresa Empregadora</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Razão Social / Nome de Exibição</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Versão Atual do Termo LGPD</label>
              <input
                type="text"
                value={termVersion}
                onChange={(e) => setTermVersion(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Bloco LGPD e Segurança */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Políticas de Segurança e LGPD</span>
          </h2>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2 text-slate-600">
            <p className="font-semibold text-slate-800">Diretrizes Implementadas:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Mascaramento visual de CPF em todas as listagens de tela para proteção contra visualizações indevidas.</li>
              <li>Links de acesso com token criptográfico seguro e único por admissão (sem uso de CPF como senha).</li>
              <li>Armazenamento privativo em disco isolado ou bucket restrito com validação de tipos MIME (PDF, JPG, PNG).</li>
              <li>Histórico de auditoria com data, hora, IP/agente e detalhe de cada aprovação ou recusa.</li>
            </ul>
          </div>
        </div>

        {/* Bloco Checklist de Documentos Padrão */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-blue-600" />
            <span>Documentos Obrigatórios da Admissão</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {['CPF', 'RG', 'Carteira de Trabalho (CTPS)', 'Comprovante de residência', 'Diploma ou Comprovante de escolaridade'].map((doc) => (
              <div key={doc} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-medium">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{doc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 px-5 rounded-xl shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Configurações</span>
          </button>
        </div>
      </form>
    </div>
  );
};
