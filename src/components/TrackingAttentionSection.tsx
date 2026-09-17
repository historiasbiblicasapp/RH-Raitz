import React, { useState } from 'react';
import { 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  MessageSquare, 
  AlertTriangle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TrackingItem } from '../types/index.ts';

interface TrackingAttentionSectionProps {
  attentionItems: TrackingItem[];
  onOpenCommunication: (item: TrackingItem) => void;
}

export const TrackingAttentionSection: React.FC<TrackingAttentionSectionProps> = ({
  attentionItems,
  onOpenCommunication
}) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);

  if (!attentionItems || attentionItems.length === 0) {
    return null;
  }

  return (
    <div 
      id="section-precisam-atencao"
      className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-200/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Precisam de Atenção Operacional
              </h3>
              <span className="bg-amber-200/80 text-amber-900 text-xs font-extrabold px-2 py-0.5 rounded-full">
                {attentionItems.length}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Processos com data prevista ultrapassada, documentos pendentes de correção ou sem movimentação recente.
            </p>
          </div>
        </div>

        <button
          id="btn-toggle-attention-section"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 hover:text-amber-950 bg-amber-100/70 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <span>{isExpanded ? 'Recolher' : 'Expandir'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pt-3.5">
          {attentionItems.map((item) => (
            <div
              key={item.id}
              id={`attention-item-${item.admissionId}`}
              className="bg-white rounded-xl border border-amber-200/80 p-3.5 flex flex-col justify-between shadow-xs hover:border-amber-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-snug">
                      {item.employeeName}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {item.role} • {item.department}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0">
                    {item.admissionCode}
                  </span>
                </div>

                <div className="bg-amber-50 border border-amber-200/60 rounded-lg p-2 my-2 text-[11px] text-amber-900 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <span className="font-semibold leading-tight">
                    {item.attentionReason || item.mainPendingReason}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mb-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Início: <strong>{item.expectedStartDate ? new Date(item.expectedStartDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</strong></span>
                  </span>
                  <span>•</span>
                  <span>
                    {item.isOverdue 
                      ? <strong className="text-rose-600">Ultrapassada há {item.daysSinceOverdue}d</strong>
                      : item.daysToExpectedDate === 0 
                      ? <strong className="text-amber-600">Hoje</strong>
                      : <span>Faltam {item.daysToExpectedDate}d</span>
                    }
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                <button
                  onClick={() => onOpenCommunication(item)}
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                  title="Enviar mensagem ou link via WhatsApp"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Comunicar</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/pendencias?search=${encodeURIComponent(item.employeeName)}`)}
                    className="text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                    title="Ver na Central de Pendências"
                  >
                    Pendências
                  </button>
                  <button
                    onClick={() => navigate(`/admissoes/${item.admissionId}`)}
                    className="flex items-center gap-0.5 text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    <span>Ver</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
