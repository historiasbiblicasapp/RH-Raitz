import React from 'react';
import { AuditLog } from '../../types/index.ts';
import { UnifiedHistoryTimeline } from '../history/UnifiedHistoryTimeline.tsx';

interface EmployeeHistoryTabProps {
  auditLogs: AuditLog[];
  employeeName?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const EmployeeHistoryTab: React.FC<EmployeeHistoryTabProps> = ({
  auditLogs = [],
  employeeName,
  onRefresh,
  isLoading = false
}) => {
  return (
    <div className="space-y-4">
      <UnifiedHistoryTimeline
        logs={auditLogs}
        title={employeeName ? `Histórico Completo — ${employeeName}` : 'Histórico do Colaborador & Auditoria'}
        subtitle="Linha do tempo consolidada de admissões vinculadas, alterações cadastrais, documentos arquivados e eventos operacionais deste funcionário."
        emptyMessage="Ainda não há registros de auditoria ou modificações cadastrais para este funcionário."
        contextFilterLabel="do funcionário"
        showExport={true}
        onRefresh={onRefresh}
        isLoading={isLoading}
      />
    </div>
  );
};
