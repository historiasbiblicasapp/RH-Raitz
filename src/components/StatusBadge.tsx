import React from 'react';
import { CheckCircle2, Clock, AlertCircle, HelpCircle, FileText, Ban } from 'lucide-react';
import { AdmissionStatus, DocumentStatus } from '../types/index.ts';

interface StatusBadgeProps {
  status: AdmissionStatus | DocumentStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  let colorClasses = '';
  let Icon = HelpCircle;

  switch (status) {
    // 🟢 Verde = aprovado/concluído
    case 'Concluída':
    case 'Aprovado':
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20';
      Icon = CheckCircle2;
      break;

    // 🟡 Amarelo = aguardando/em análise
    case 'Em conferência':
    case 'Em análise':
    case 'Reenviado':
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-amber-500/20';
      Icon = Clock;
      break;

    // 🔴 Vermelho = rejeitado/pendência
    case 'Pendência':
    case 'Rejeitado':
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/20';
      Icon = AlertCircle;
      break;

    // 🔵 Azul = informação
    case 'Aguardando documentos':
    case 'Enviado':
      colorClasses = 'bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-500/20';
      Icon = FileText;
      break;

    // ⚪ Cinza = não enviado/inativo
    case 'Não enviado':
    case 'Rascunho':
    case 'Cancelada':
    default:
      colorClasses = 'bg-slate-100 text-slate-600 border-slate-200 ring-1 ring-slate-400/20';
      Icon = status === 'Cancelada' ? Ban : HelpCircle;
      break;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-medium px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-medium px-3 py-1.5 gap-2'
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border whitespace-nowrap ${colorClasses} ${sizeClasses}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{status}</span>
    </span>
  );
};
