import React, { useState } from 'react';
import { 
  X, 
  Bell, 
  Copy, 
  Check, 
  Send, 
  AlertTriangle, 
  MessageSquare, 
  FileWarning 
} from 'lucide-react';
import { Employee, EmployeeDocument } from '../../types/index.ts';

interface NotifyExpirationModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  expiringDocs: EmployeeDocument[];
}

export const NotifyExpirationModal: React.FC<NotifyExpirationModalProps> = ({
  isOpen,
  onClose,
  employee,
  expiringDocs
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const expiredList = expiringDocs.filter(d => d.expirationStatus === 'expired');
  const nearList = expiringDocs.filter(d => d.expirationStatus === 'near_expiration');

  const messageText = `Olá, ${employee.name}!

Aqui é do Departamento de Recursos Humanos da Galvanização Raitz.

Identificamos em seu prontuário digital a necessidade de atualização/renovação dos seguintes documentos:

${expiredList.length > 0 ? `🚨 *DOCUMENTOS VENCIDOS:*
${expiredList.map(d => `• ${d.title} (Venceu em: ${d.expirationDate ? new Date(d.expirationDate).toLocaleDateString('pt-BR') : 'Data não informada'})`).join('\n')}\n\n` : ''}${nearList.length > 0 ? `⚠️ *DOCUMENTOS PRÓXIMOS AO VENCIMENTO:*
${nearList.map(d => `• ${d.title} (Vencimento: ${d.expirationDate ? new Date(d.expirationDate).toLocaleDateString('pt-BR') : 'Data não informada'})`).join('\n')}\n\n` : ''}Por favor, providencie a nova via atualizada e envie ao RH para regularização do seu prontuário corporativo.

Em caso de dúvidas, estamos à disposição!
Departamento de RH - Galvanização Raitz`;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const rawPhone = (employee.phone || '').replace(/\D/g, '');
  const whatsappUrl = rawPhone ? `https://wa.me/55${rawPhone}?text=${encodeURIComponent(messageText)}` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Notificar Vencimento de Documentos
              </h3>
              <p className="text-xs text-slate-500">
                Colaborador: {employee.name} • {expiringDocs.length} documento(s) com pendência
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
            <p className="font-bold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Documentos que exigem atenção:
            </p>
            <ul className="space-y-1.5 pl-2">
              {expiringDocs.map(d => (
                <li key={d.id} className="flex items-center justify-between gap-2 text-slate-800">
                  <span className="font-semibold">{d.title}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    d.expirationStatus === 'expired' 
                      ? 'bg-rose-100 text-rose-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {d.expirationStatus === 'expired' ? 'Vencido' : 'Vence em breve'} ({d.expirationDate ? new Date(d.expirationDate).toLocaleDateString('pt-BR') : ''})
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Mensagem Formatada */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700">
                Mensagem Padrão de Notificação:
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-800 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Mensagem'}</span>
              </button>
            </div>

            <textarea
              readOnly
              rows={8}
              value={messageText}
              className="w-full p-3 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
            />
          </div>
        </div>

        {/* Rodapé e Ações */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Texto Copiado!' : 'Copiar Texto'}</span>
            </button>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Enviar pelo WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
