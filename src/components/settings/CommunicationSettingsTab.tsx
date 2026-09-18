import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Clock, 
  Sparkles, 
  Check, 
  Copy, 
  RefreshCw, 
  HelpCircle,
  Smartphone,
  Eye,
  AlertCircle
} from 'lucide-react';
import { SystemCommunicationSettings, CommunicationTemplate } from '../../types/index.ts';

interface CommunicationSettingsTabProps {
  settings: SystemCommunicationSettings;
  companyName: string;
  onChange: (updates: Partial<SystemCommunicationSettings>) => void;
}

export const CommunicationSettingsTab: React.FC<CommunicationSettingsTabProps> = ({
  settings,
  companyName,
  onChange
}) => {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl-invite');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [saveTemplateMessage, setSaveTemplateMessage] = useState<string | null>(null);

  // Amostra de simulação para prévia
  const [sampleCandidate, setSampleCandidate] = useState({
    nome: 'Lucas Gabriel Albuquerque',
    cargo: 'Eletricista de Manutenção',
    documento: 'Comprovante de Residência',
    motivo: 'Comprovante com data de emissão superior a 90 dias',
    link: 'https://admissao.raitz.com.br/candidato/tok_7f9b2a'
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const res = await fetch('/api/settings/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
        if (data.templates && data.templates.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(data.templates[0].id);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar modelos:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const activeTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

  const handleUpdateTemplateContent = (newContent: string) => {
    if (!activeTemplate) return;
    setTemplates(prev => prev.map(t => t.id === activeTemplate.id ? { ...t, content: newContent } : t));
  };

  const handleSaveCurrentTemplate = async () => {
    if (!activeTemplate) return;
    try {
      const res = await fetch(`/api/settings/templates/${activeTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: activeTemplate.content,
          active: activeTemplate.active
        })
      });
      if (res.ok) {
        setSaveTemplateMessage('Modelo atualizado com sucesso!');
        setTimeout(() => setSaveTemplateMessage(null), 3000);
      }
    } catch (err) {
      console.error('Erro ao salvar modelo:', err);
    }
  };

  const insertVariable = (variableTag: string) => {
    if (!activeTemplate || !textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = activeTemplate.content;
    const newText = text.substring(0, start) + variableTag + text.substring(end);
    handleUpdateTemplateContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variableTag.length, start + variableTag.length);
    }, 50);
  };

  // Renderização da mensagem em tempo real para a prévia
  const renderSimulatedMessage = (content: string) => {
    if (!content) return '';
    return content
      .replace(/\[NOME\]/g, sampleCandidate.nome)
      .replace(/\[CARGO\]/g, sampleCandidate.cargo)
      .replace(/\[EMPRESA\]/g, companyName || 'Galvanização Raitz')
      .replace(/\[LINK\]/g, sampleCandidate.link)
      .replace(/\[DOCUMENTO\]/g, sampleCandidate.documento)
      .replace(/\[MOTIVO\]/g, sampleCandidate.motivo);
  };

  const availableVariables = [
    { tag: '[NOME]', label: 'Nome do Candidato', desc: 'Nome completo ou primeiro nome' },
    { tag: '[CARGO]', label: 'Cargo Ofertado', desc: 'Título do cargo da vaga' },
    { tag: '[EMPRESA]', label: 'Empresa', desc: companyName || 'Galvanização Raitz' },
    { tag: '[LINK]', label: 'Link Único Seguro', desc: 'URL com token criptográfico' },
    { tag: '[DOCUMENTO]', label: 'Nome do Documento', desc: 'Ex: Comprovante de Residência' },
    { tag: '[MOTIVO]', label: 'Motivo da Recusa', desc: 'Justificativa preenchida pelo RH' }
  ];

  return (
    <div className="space-y-6">
      {/* Diretrizes Operacionais de Mensagens */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-600" />
            <span>Canais e Horários Operacionais de Disparo</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Configure os canais preferenciais e proteções de horário para contato com os candidatos.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <label className="block font-semibold text-slate-800">
              Canal de Comunicação Padrão
            </label>
            <select
              value={settings.defaultChannel || 'whatsapp'}
              onChange={(e) => onChange({ defaultChannel: e.target.value as any })}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-900 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="whatsapp">WhatsApp (Recomendado - Maior taxa de resposta)</option>
              <option value="email">E-mail Corporativo</option>
              <option value="manual">Manual / Telefone (Apenas registro em sistema)</option>
            </select>
            <p className="text-[11px] text-slate-500">
              Define o botão de ação rápida principal na listagem de pendências e admissões.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <label className="block font-semibold text-slate-800">
              Janela Silenciosa de Contato (Horário Noturno)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={settings.quietHoursStart || '20:00'}
                onChange={(e) => onChange({ quietHoursStart: e.target.value })}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold"
              />
              <span className="text-slate-500 text-xs">até</span>
              <input
                type="time"
                value={settings.quietHoursEnd || '08:00'}
                onChange={(e) => onChange({ quietHoursEnd: e.target.value })}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Evita sugestão de cobranças automáticas fora do horário comercial regular.
            </p>
          </div>
        </div>

        <div className="space-y-3 divide-y divide-slate-100 pt-2">
          <div className="pt-3 first:pt-0 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900">Restringir Notificações Apenas a Dias Úteis</p>
              <p className="text-[11px] text-slate-500">
                Sinaliza alertas no painel se o operador tentar disparar cobranças no fim de semana.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.workingHoursOnly ?? true}
                onChange={(e) => onChange({ workingHoursOnly: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="pt-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900">Sugerir Envio Imediato de Mensagem ao Criar Admissão</p>
              <p className="text-[11px] text-slate-500">
                Abre o modal com o texto de boas-vindas logo após o cadastro do colaborador.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.sendWelcomeMessageOnCreate ?? true}
                onChange={(e) => onChange({ sendWelcomeMessageOnCreate: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Editor de Modelos de Mensagem com Prévia WhatsApp em Tempo Real */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Editor de Modelos de Mensagem (WhatsApp)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalize o texto enviado em cada etapa com variáveis automáticas.
            </p>
          </div>

          {saveTemplateMessage && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg font-semibold border border-emerald-200">
              <Check className="w-3.5 h-3.5" />
              <span>{saveTemplateMessage}</span>
            </div>
          )}
        </div>

        {/* Seleção de Abas dos Modelos */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {templates.map(tpl => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => setSelectedTemplateId(tpl.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedTemplateId === tpl.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tpl.name}
            </button>
          ))}
        </div>

        {activeTemplate && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Coluna de Edição */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Texto do Modelo: <span className="text-slate-500 font-normal">{activeTemplate.description}</span>
                </label>
                <textarea
                  ref={textareaRef}
                  rows={8}
                  value={activeTemplate.content}
                  onChange={(e) => handleUpdateTemplateContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 font-sans focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 leading-relaxed resize-y"
                  placeholder="Digite a mensagem..."
                />
              </div>

              {/* Botões de Variáveis Dinâmicas */}
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Inserir Variável Dinâmica (Clique para adicionar):</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {availableVariables.map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => insertVariable(v.tag)}
                      title={v.desc}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>{v.tag}</span>
                      <span className="text-[10px] text-blue-500 font-sans">({v.label})</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={fetchTemplates}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restaurar Texto Original</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveCurrentTemplate}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Este Modelo</span>
                </button>
              </div>
            </div>

            {/* Coluna de Prévia WhatsApp em Tempo Real */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-slate-600" />
                  <span>Visualização WhatsApp (Simulação Real)</span>
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-md">
                  Ao Vivo
                </span>
              </div>

              {/* Moldura de Smartphone / Chat WhatsApp */}
              <div className="bg-[#EFEAE2] rounded-2xl border border-slate-300 p-4 shadow-inner min-h-[300px] flex flex-col justify-between relative overflow-hidden">
                {/* Cabeçalho do Chat */}
                <div className="bg-[#075E54] -m-4 p-3 mb-3 text-white flex items-center gap-2.5 shadow-xs">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                    RH
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight">{companyName || 'Galvanização Raitz'}</p>
                    <p className="text-[10px] text-emerald-200">Online agora</p>
                  </div>
                </div>

                {/* Balão de Mensagem WhatsApp */}
                <div className="bg-white rounded-xl rounded-tl-none p-3 shadow-xs text-xs text-slate-800 space-y-1.5 max-w-[95%] relative border border-slate-100">
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-800 text-xs">
                    {renderSimulatedMessage(activeTemplate.content)}
                  </p>
                  <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 mt-1">
                    <span>10:42</span>
                    <span className="text-blue-500 font-bold">✓✓</span>
                  </div>
                </div>

                {/* Rodapé Informativo */}
                <div className="pt-2 text-center text-[10px] text-slate-500">
                  <span>🔒 Mensagem protegida por criptografia de ponta a ponta</span>
                </div>
              </div>

              {/* Ajuste dos Dados da Amostra */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                <p className="font-semibold text-slate-700 text-[11px]">Dados da Simulação:</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Candidato:</span>
                    <input
                      type="text"
                      value={sampleCandidate.nome}
                      onChange={(e) => setSampleCandidate({ ...sampleCandidate, nome: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Documento:</span>
                    <input
                      type="text"
                      value={sampleCandidate.documento}
                      onChange={(e) => setSampleCandidate({ ...sampleCandidate, documento: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
