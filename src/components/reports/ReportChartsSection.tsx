import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Cell,
  AreaChart,
  Area 
} from 'recharts';
import { 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Building2, 
  FileCheck, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { ReportCharts } from '../../types/index.ts';

interface ReportChartsSectionProps {
  charts: ReportCharts;
  totalAdmissions: number;
}

export const ReportChartsSection: React.FC<ReportChartsSectionProps> = ({
  charts,
  totalAdmissions
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (totalAdmissions === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Cabeçalho de Controle da Seção de Gráficos */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition-colors select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <PieChartIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 tracking-tight">
              Análise Visual & Gráficos de Distribuição
            </h3>
            <p className="text-[11px] text-slate-500">
              Métricas consolidadas por status, setor, evolução temporal e conformidade de documentos.
            </p>
          </div>
        </div>

        <button 
          type="button" 
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          aria-label={isExpanded ? 'Ocultar gráficos' : 'Expandir gráficos'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="p-5 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Gráfico: Distribuição por Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Distribuição por Status da Admissão
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {totalAdmissions} admissões
              </span>
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.byStatus} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
                            <p className="font-semibold">{data.name}</p>
                            <p className="text-slate-300">{data.count} admissões ({data.percentage}%)</p>
                          </div>
                        );
                      }
                      return null;
                    }} 
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {charts.byStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Gráfico: Evolução Temporal das Admissões */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Evolução Temporal no Período
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Volume de criações
              </span>
            </div>

            <div className="h-56 w-full pt-2">
              {charts.evolution && charts.evolution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.evolution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorEvolution" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 10, fill: '#64748b' }} 
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
                              <p className="font-semibold">{data.date}</p>
                              <p className="text-blue-300">{data.count} admissões iniciadas</p>
                            </div>
                          );
                        }
                        return null;
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorEvolution)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Dados temporais insuficientes no período selecionado
                </div>
              )}
            </div>
          </div>

          {/* 3. Distribuição por Departamento */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Admissões por Departamento
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {charts.byDepartment.length} setores
              </span>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {charts.byDepartment.map((dept) => (
                <div key={dept.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 truncate max-w-[200px]" title={dept.name}>
                      {dept.name}
                    </span>
                    <span className="text-slate-500 font-semibold">
                      {dept.count} ({dept.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.max(4, dept.percentage)}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Situação Geral dos Documentos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-teal-600" />
                Situação Geral dos Documentos
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Status documental
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {charts.byDocumentStatus.map((docSt) => (
                <div 
                  key={docSt.name}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600">
                      {docSt.name}
                    </span>
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: docSt.color || '#3b82f6' }}
                    />
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-lg font-bold text-slate-900">
                      {docSt.count}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {docSt.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Distribuição por Unidade */}
            {charts.byUnit.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex items-center gap-3 text-xs text-slate-600">
                <span className="font-semibold text-slate-700 shrink-0">Unidades:</span>
                <div className="flex flex-wrap gap-2">
                  {charts.byUnit.map(u => (
                    <span key={u.name} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                      {u.name}: <strong className="font-semibold text-slate-900">{u.count}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
