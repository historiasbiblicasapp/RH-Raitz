import React, { useEffect, useState } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  UserCheck, 
  FileCheck2, 
  Calendar, 
  History,
  Hourglass,
  ArrowRight,
  ShieldAlert,
  Ban,
  FileUp,
  RefreshCw
} from 'lucide-react';
import { AdmissionTimelineEvent, AdmissionStageTimes } from '../types/index.ts';

interface AdmissionTimelineProps {
  admissionId: string;
}

export const AdmissionTimeline: React.FC<AdmissionTimelineProps> = ({ admissionId }) => {
  const [events, setEvents] = useState<AdmissionTimelineEvent[]>([]);
  const [stageTimes, setStageTimes] = useState<AdmissionStageTimes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchTimeline() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/admissions/${admissionId}/timeline`);
        if (!res.ok) {
          throw new Error('Falha ao carregar a linha do tempo e tempos por etapa.');
        }
        const data = await res.json();
        if (isMounted) {
          setEvents(data.events || []);
          setStageTimes(data.stageTimes || null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Erro ao carregar dados temporais.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (admissionId) {
      fetchTimeline();
    }

    return () => {
      isMounted = false;
    };
  }, [admissionId]);

  const getStageIcon = (stage: AdmissionTimelineEvent['stage']) => {
    switch (stage) {
      case 'criacao':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'convite_enviado':
        return <Send className="w-4 h-4 text-emerald-600" />;
      case 'funcionario_acessou':
        return <UserCheck className="w-4 h-4 text-indigo-600" />;
      case 'dados_confirmados':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'documentos_enviados':
        return <FileUp className="w-4 h-4 text-blue-600" />;
      case 'conferencia_rh':
        return <FileCheck2 className="w-4 h-4 text-sky-600" />;
      case 'pendencia':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      case 'reenvio':
        return <RefreshCw className="w-4 h-4 text-amber-600" />;
      case 'aprovacao':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'concluida':
        return <CheckCircle2 className="w-4 h-4 text-emerald-700" />;
      case 'cancelada':
        return <Ban className="w-4 h-4 text-rose-700" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatEventDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500">Carregando linha do tempo operacional...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-800">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Métricas de Tempo por Etapa (Seção 13) */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Tempo por Etapa Operacional
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Tempo aguardando documentos */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <span className="text-[11px] font-semibold text-slate-500 block">
              Tempo Aguardando Documentos
            </span>
            <div className="text-sm font-bold text-slate-900 mt-1">
              {stageTimes?.waitingDocuments || 'Não disponível'}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Do convite ao primeiro envio
            </span>
          </div>

          {/* Tempo aguardando RH */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <span className="text-[11px] font-semibold text-slate-500 block">
              Tempo Aguardando RH
            </span>
            <div className="text-sm font-bold text-slate-900 mt-1">
              {stageTimes?.waitingRh || 'Não disponível'}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Do envio à conferência de documentos
            </span>
          </div>

          {/* Tempo em pendência */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <span className="text-[11px] font-semibold text-slate-500 block">
              Tempo em Pendência
            </span>
            <div className="text-sm font-bold text-slate-900 mt-1">
              {stageTimes?.inPending || 'Não disponível'}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Da rejeição até correção/reenvio
            </span>
          </div>

          {/* Tempo total da admissão */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <span className="text-[11px] font-semibold text-slate-500 block">
              Tempo Total da Admissão
            </span>
            <div className="text-sm font-bold text-blue-700 mt-1">
              {stageTimes?.totalAdmission || 'Não disponível'}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Da criação até conclusão (ou atual)
            </span>
          </div>
        </div>
      </div>

      {/* 2. Linha do Tempo Visual de Eventos Reais (Seção 12) */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Linha do Tempo e Evolução da Admissão
        </h3>

        {events.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500">
            Nenhum evento temporal registrado para esta admissão.
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:top-3 before:bottom-3 before:left-3 sm:before:left-4 before:w-0.5 before:bg-slate-200">
            {events.map((ev, index) => (
              <div 
                key={ev.id || index}
                className="relative group"
              >
                {/* Ícone no eixo da timeline */}
                <div className="absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white border-2 border-slate-300 group-hover:border-blue-500 flex items-center justify-center shadow-xs transition-colors">
                  {getStageIcon(ev.stage)}
                </div>

                {/* Conteúdo do evento */}
                <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs hover:border-slate-300 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <h4 className="text-xs font-bold text-slate-900">
                      {ev.title}
                    </h4>
                    <span className="text-[11px] font-medium text-slate-400">
                      {formatEventDate(ev.date)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {ev.description}
                  </p>

                  {ev.performedBy && (
                    <div className="mt-2 text-[10px] text-slate-400 font-medium flex items-center gap-1">
                      <span>Responsável / Registro:</span>
                      <strong className="text-slate-600">{ev.performedBy}</strong>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
