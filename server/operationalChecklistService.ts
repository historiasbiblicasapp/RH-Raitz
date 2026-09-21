import { 
  Admission, 
  OperationalPriority, 
  OperationalChecklistSituation, 
  OperationalResponsible, 
  OperationalPendingSummary, 
  OperationalTaskItem, 
  OperationalChecklistItem, 
  OperationalChecklistFilters, 
  OperationalChecklistResponse,
  SystemSettings
} from '../src/types/index.ts';
import { maskCPF } from '../src/lib/cpf.ts';

export function calculateDayDiff(targetDateStr?: string, referenceDate: Date = new Date()): number {
  if (!targetDateStr) return 0;
  const target = new Date(targetDateStr);
  if (isNaN(target.getTime())) return 0;

  const targetZero = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const refZero = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate()).getTime();

  return Math.round((targetZero - refZero) / (1000 * 60 * 60 * 24));
}

export function getAdmissionLastActivity(adm: Admission): { date: string; description: string; daysAgo: number } {
  const now = new Date();
  let latestDate = new Date(adm.createdAt || now);
  let description = 'Criação do cadastro de admissão';

  if (adm.updatedAt) {
    const upd = new Date(adm.updatedAt);
    if (!isNaN(upd.getTime()) && upd > latestDate) {
      latestDate = upd;
      description = 'Atualização cadastral recente';
    }
  }

  // Verifica documentos
  if (adm.documents && adm.documents.length > 0) {
    for (const doc of adm.documents) {
      if (doc.reviewedAt) {
        const revDate = new Date(doc.reviewedAt);
        if (!isNaN(revDate.getTime()) && revDate > latestDate) {
          latestDate = revDate;
          description = `Conferência RH: ${doc.documentType} (${doc.status})`;
        }
      }
      if (doc.uploadedAt) {
        const upDate = new Date(doc.uploadedAt);
        if (!isNaN(upDate.getTime()) && upDate > latestDate) {
          latestDate = upDate;
          description = `Upload de documento: ${doc.documentType}`;
        }
      }
    }
  }

  // Verifica confirmação de dados
  if (adm.dataConfirmedAt) {
    const confDate = new Date(adm.dataConfirmedAt);
    if (!isNaN(confDate.getTime()) && confDate > latestDate) {
      latestDate = confDate;
      description = 'Confirmação de dados pelo colaborador';
    }
  }

  // Verifica acesso ao convite
  if (adm.inviteLastAccessedAt) {
    const accDate = new Date(adm.inviteLastAccessedAt);
    if (!isNaN(accDate.getTime()) && accDate > latestDate) {
      latestDate = accDate;
      description = 'Acesso ao portal pelo colaborador';
    }
  }

  // Verifica etapas
  if (adm.processSteps && adm.processSteps.length > 0) {
    for (const st of adm.processSteps) {
      if (st.completedAt) {
        const compDate = new Date(st.completedAt);
        if (!isNaN(compDate.getTime()) && compDate > latestDate) {
          latestDate = compDate;
          description = `Etapa ${st.stepName} concluída`;
        }
      }
    }
  }

  const daysAgo = Math.max(0, Math.floor((now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24)));
  return {
    date: latestDate.toISOString(),
    description,
    daysAgo
  };
}

export function buildOperationalChecklistItem(
  adm: Admission, 
  settings?: SystemSettings
): OperationalChecklistItem {
  const now = new Date();
  const docs = adm.documents || [];
  const steps = adm.processSteps || [];

  const upcomingThreshold = settings?.tracking?.upcomingDaysThreshold ?? 7;
  const inactivityThreshold = settings?.tracking?.inactivityDaysThreshold ?? 3;

  const isCompleted = adm.status === 'Concluída';
  const isCancelled = adm.status === 'Cancelada';

  // Cálculos de datas
  const daysSinceCreation = Math.max(0, Math.floor((now.getTime() - new Date(adm.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
  const lastActivity = getAdmissionLastActivity(adm);
  const daysWithoutMovement = lastActivity.daysAgo;

  const daysToExpected = adm.employee?.expectedStartDate 
    ? calculateDayDiff(adm.employee.expectedStartDate, now) 
    : 999;
  const isOverdue = adm.employee?.expectedStartDate 
    ? daysToExpected < 0 && !isCompleted && !isCancelled 
    : false;
  const isUpcoming = adm.employee?.expectedStartDate 
    ? daysToExpected >= 0 && daysToExpected <= upcomingThreshold && !isCompleted && !isCancelled 
    : false;

  // Etapas
  const totalSteps = steps.length || 6;
  const completedSteps = steps.filter(s => s.status === 'CONCLUIDA').length;
  const currentStep = steps.find(s => s.status === 'EM_ANDAMENTO') || 
                      steps.find(s => s.status === 'BLOQUEADA') || 
                      (isCompleted ? steps[steps.length - 1] : steps[0]);

  const daysInCurrentStep = currentStep?.startedAt 
    ? Math.max(0, Math.floor((now.getTime() - new Date(currentStep.startedAt).getTime()) / (1000 * 60 * 60 * 24)))
    : daysSinceCreation;

  // Documentos
  const totalDocuments = docs.length;
  const approvedDocuments = docs.filter(d => d.status === 'Aprovado').length;
  const inReviewDocuments = docs.filter(d => d.status === 'Em análise' || d.status === 'Enviado' || d.status === 'Reenviado').length;
  const rejectedDocuments = docs.filter(d => d.status === 'Rejeitado').length;
  const notSentDocuments = docs.filter(d => d.status === 'Não enviado').length;

  const documentsProgressPercent = totalDocuments > 0 
    ? Math.round((approvedDocuments / totalDocuments) * 100) 
    : 0;

  // Progresso global ponderado: 50% etapas + 50% documentos
  const stepsProgressPercent = totalSteps > 0 
    ? Math.round((completedSteps / totalSteps) * 100) 
    : 0;
  const progressPercent = totalDocuments > 0 
    ? Math.round((stepsProgressPercent * 0.5) + (documentsProgressPercent * 0.5))
    : stepsProgressPercent;

  // Análise de bloqueios e pendências
  const blockedStep = steps.find(s => s.status === 'BLOQUEADA');
  const rejectedDoc = docs.find(d => d.status === 'Rejeitado');
  const missingRequiredDoc = docs.find(d => d.required && d.status === 'Não enviado');
  const inReviewDoc = docs.find(d => d.status === 'Em análise' || d.status === 'Enviado' || d.status === 'Reenviado');

  // Identificação da Pendência Principal (Item 18 do documento)
  let primaryPendingType: OperationalChecklistItem['primaryPending']['type'] = 'NENHUMA';
  let primaryPendingTitle = 'Sem pendências operacionais';
  let primaryPendingDesc = 'Processo em conformidade com o cronograma.';
  let primaryPendingResp: OperationalResponsible = 'RH';
  let primaryPendingDocId: string | undefined;
  let primaryPendingStepId: string | undefined;

  if (blockedStep) {
    primaryPendingType = 'BLOQUEIO';
    primaryPendingTitle = `Etapa ${blockedStep.stepName} bloqueada`;
    primaryPendingDesc = blockedStep.blockReason || 'Necessário desbloqueio para avançar o fluxo.';
    primaryPendingResp = (blockedStep.responsibleRole as OperationalResponsible) || 'RH';
    primaryPendingStepId = blockedStep.id;
  } else if (rejectedDoc) {
    primaryPendingType = 'DOC_REJEITADO';
    primaryPendingTitle = `${rejectedDoc.documentType} rejeitado`;
    primaryPendingDesc = rejectedDoc.rejectionReason 
      ? `Motivo: ${rejectedDoc.rejectionReason}` 
      : 'Aguardando reenvio de nova foto/arquivo pelo colaborador.';
    primaryPendingResp = 'FUNCIONARIO';
    primaryPendingDocId = rejectedDoc.id;
  } else if (!adm.dataConfirmed && adm.status !== 'Concluída' && adm.status !== 'Cancelada') {
    primaryPendingType = 'ETAPA_RESPONSAVEL';
    primaryPendingTitle = 'Validação cadastral pendente';
    primaryPendingDesc = 'Aguardando colaborador validar dados pessoais e aceitar termo LGPD.';
    primaryPendingResp = 'FUNCIONARIO';
  } else if (missingRequiredDoc) {
    primaryPendingType = 'DOC_NAO_ENVIADO';
    primaryPendingTitle = `${missingRequiredDoc.documentType} pendente`;
    primaryPendingDesc = 'Documento obrigatório aguardando upload pelo colaborador.';
    primaryPendingResp = 'FUNCIONARIO';
    primaryPendingDocId = missingRequiredDoc.id;
  } else if (inReviewDoc) {
    primaryPendingType = 'DOC_CONFERENCIA';
    primaryPendingTitle = `Conferência de ${inReviewDoc.documentType}`;
    primaryPendingDesc = 'Documento enviado pelo colaborador aguardando conferência do RH.';
    primaryPendingResp = 'RH_CONFERENCIA';
    primaryPendingDocId = inReviewDoc.id;
  } else if (currentStep && currentStep.status === 'EM_ANDAMENTO' && currentStep.stepKey === 'APROVACAO') {
    primaryPendingType = 'ETAPA_RESPONSAVEL';
    primaryPendingTitle = 'Aprovação da liderança';
    primaryPendingDesc = 'Aguardando parecer final da gestão/liderança da unidade.';
    primaryPendingResp = 'GESTOR';
    primaryPendingStepId = currentStep.id;
  } else if (isOverdue) {
    primaryPendingType = 'ADMISSAO_PROXIMA';
    primaryPendingTitle = 'Data prevista ultrapassada';
    primaryPendingDesc = `A data prevista era ${new Date(adm.employee.expectedStartDate!).toLocaleDateString('pt-BR')}.`;
    primaryPendingResp = 'RH';
  } else if (isUpcoming) {
    primaryPendingType = 'ADMISSAO_PROXIMA';
    primaryPendingTitle = `Início previsto em ${daysToExpected} dia(s)`;
    primaryPendingDesc = `Admissão agendada para ${new Date(adm.employee.expectedStartDate!).toLocaleDateString('pt-BR')}.`;
    primaryPendingResp = 'RH';
  } else if (daysWithoutMovement >= inactivityThreshold && !isCompleted && !isCancelled) {
    primaryPendingType = 'SEM_MOVIMENTACAO';
    primaryPendingTitle = `Sem movimentação há ${daysWithoutMovement} dias`;
    primaryPendingDesc = `Último evento registrado: ${lastActivity.description}.`;
    primaryPendingResp = 'RH';
  }

  // Responsável atual pelo avanço da admissão
  let currentResponsible: OperationalResponsible = 'RH';
  if (blockedStep) {
    currentResponsible = (blockedStep.responsibleRole as OperationalResponsible) || 'RH';
  } else if (rejectedDoc || missingRequiredDoc || !adm.dataConfirmed) {
    currentResponsible = 'FUNCIONARIO';
  } else if (inReviewDoc) {
    currentResponsible = 'RH_CONFERENCIA';
  } else if (currentStep && currentStep.stepKey === 'APROVACAO') {
    currentResponsible = 'GESTOR';
  } else if (isCompleted) {
    currentResponsible = 'SISTEMA';
  }

  // Prioridade Operacional (Itens 10 e 11)
  let operationalPriority: OperationalPriority = adm.operationalPriority || 'NORMAL';
  if (!adm.operationalPriority) {
    if (blockedStep || isOverdue || (rejectedDoc && daysToExpected <= 3)) {
      operationalPriority = 'CRITICA';
    } else if (rejectedDoc || (missingRequiredDoc && isUpcoming) || inReviewDocuments > 0 && daysInCurrentStep > 2 || daysWithoutMovement >= inactivityThreshold) {
      operationalPriority = 'ALTA';
    } else {
      operationalPriority = 'NORMAL';
    }
  }

  // Situação Operacional (Item 9)
  let operationalSituation: OperationalChecklistSituation = 'EM_DIA';
  let operationalSituationLabel = 'Em dia';

  if (blockedStep) {
    operationalSituation = 'BLOQUEADA';
    operationalSituationLabel = 'Bloqueada';
  } else if (isOverdue) {
    operationalSituation = 'ATRASADA';
    operationalSituationLabel = 'Atrasada';
  } else if (daysWithoutMovement >= inactivityThreshold && !isCompleted && !isCancelled) {
    operationalSituation = 'SEM_MOVIMENTACAO';
    operationalSituationLabel = `Sem movimentação (${daysWithoutMovement}d)`;
  } else if (isUpcoming) {
    operationalSituation = 'PROXIMA';
    operationalSituationLabel = `Próxima (${daysToExpected}d)`;
  } else {
    operationalSituation = 'EM_DIA';
    operationalSituationLabel = 'Em dia';
  }

  // Lista estruturada de tarefas operacionais (Item 15)
  const tasks: OperationalTaskItem[] = [
    {
      id: `task-cad-${adm.id}`,
      title: 'Abertura do Cadastro e Geração de Convite',
      description: `Criada em ${new Date(adm.createdAt).toLocaleDateString('pt-BR')}`,
      category: 'CADASTRO',
      responsible: 'RH',
      status: 'CONCLUIDA',
      priority: 'NORMAL',
      completedAt: adm.createdAt,
      completedBy: 'RH'
    },
    {
      id: `task-dados-${adm.id}`,
      title: 'Validação de Dados Cadastrais & Aceite LGPD',
      description: adm.dataConfirmed 
        ? `Validado em ${adm.dataConfirmedAt ? new Date(adm.dataConfirmedAt).toLocaleDateString('pt-BR') : 'Data registrada'}`
        : 'Colaborador precisa acessar o link seguro, conferir seus dados e dar o aceite.',
      category: 'DADOS',
      responsible: 'FUNCIONARIO',
      status: adm.dataConfirmed ? 'CONCLUIDA' : 'EM_ANDAMENTO',
      priority: !adm.dataConfirmed && isUpcoming ? 'ALTA' : 'NORMAL',
      actionRequired: !adm.dataConfirmed ? 'Aguardando validação do funcionário' : undefined,
      completedAt: adm.dataConfirmedAt,
      completedBy: adm.dataConfirmed ? adm.employee.name : undefined
    }
  ];

  // Adiciona tarefas para cada documento do checklist
  docs.forEach(doc => {
    let taskStatus: OperationalTaskItem['status'] = 'PENDENTE';
    let actionReq = 'Enviar documento';

    if (doc.status === 'Aprovado') {
      taskStatus = 'CONCLUIDA';
      actionReq = 'Conferido e aprovado pelo RH';
    } else if (doc.status === 'Rejeitado') {
      taskStatus = 'REJEITADA';
      actionReq = `Reenviar documento: ${doc.rejectionReason || 'Não conforme'}`;
    } else if (doc.status === 'Em análise' || doc.status === 'Enviado' || doc.status === 'Reenviado') {
      taskStatus = 'EM_ANDAMENTO';
      actionReq = 'Conferir documento';
    }

    const docResp: OperationalResponsible = 
      doc.status === 'Aprovado' ? 'RH' :
      (doc.status === 'Em análise' || doc.status === 'Enviado' || doc.status === 'Reenviado') ? 'RH_CONFERENCIA' : 
      'FUNCIONARIO';

    tasks.push({
      id: `task-doc-${doc.id}`,
      title: `${doc.documentType} ${doc.required ? '(Obrigatório)' : '(Opcional)'}`,
      description: doc.rejectionReason 
        ? `Rejeitado: ${doc.rejectionReason}. ${doc.rejectionNotes ? `Obs: ${doc.rejectionNotes}` : ''}`
        : doc.status === 'Aprovado' 
        ? `Aprovado por ${doc.reviewedBy || 'RH'}`
        : `Status atual: ${doc.status}`,
      category: 'DOCUMENTO',
      responsible: docResp,
      status: taskStatus,
      documentId: doc.id,
      documentName: doc.documentType,
      rejectionReason: doc.rejectionReason,
      rejectionNotes: doc.rejectionNotes,
      priority: doc.status === 'Rejeitado' ? 'ALTA' : (doc.required && isUpcoming ? 'ALTA' : 'NORMAL'),
      actionRequired: actionReq,
      completedAt: doc.reviewedAt,
      completedBy: doc.reviewedBy
    });
  });

  // Tarefa de Conferência Geral
  const allDocsApproved = totalDocuments > 0 && approvedDocuments === totalDocuments;
  tasks.push({
    id: `task-conf-${adm.id}`,
    title: 'Conferência Geral da Admissão',
    description: allDocsApproved 
      ? 'Todos os documentos obrigatórios foram aprovados.'
      : `${approvedDocuments} de ${totalDocuments} documentos aprovados até o momento.`,
    category: 'CONFERENCIA',
    responsible: 'RH_CONFERENCIA',
    status: allDocsApproved ? 'CONCLUIDA' : (inReviewDocuments > 0 ? 'EM_ANDAMENTO' : 'PENDENTE'),
    priority: inReviewDocuments > 0 ? 'ALTA' : 'NORMAL',
    actionRequired: inReviewDocuments > 0 ? 'Finalizar conferência dos documentos em análise' : undefined
  });

  // Tarefa de Aprovação do Gestor
  const approvalStep = steps.find(s => s.stepKey === 'APROVACAO');
  tasks.push({
    id: `task-aprov-${adm.id}`,
    title: 'Aprovação Final da Contratação (Liderança)',
    description: approvalStep?.status === 'CONCLUIDA'
      ? `Aprovado por ${approvalStep.completedBy || 'Gestão'}`
      : 'Parecer da liderança para liberação da data de início.',
    category: 'APROVACAO',
    responsible: 'GESTOR',
    status: approvalStep?.status === 'CONCLUIDA' ? 'CONCLUIDA' : (allDocsApproved ? 'EM_ANDAMENTO' : 'PENDENTE'),
    priority: allDocsApproved && !isCompleted ? 'ALTA' : 'NORMAL',
    stepId: approvalStep?.id,
    stepName: 'Aprovação',
    actionRequired: allDocsApproved && approvalStep?.status !== 'CONCLUIDA' ? 'Registrar parecer da liderança' : undefined
  });

  // Tarefa de Conclusão e Prontuário
  tasks.push({
    id: `task-conc-${adm.id}`,
    title: 'Conclusão e Prontuário Digital',
    description: isCompleted 
      ? `Processo concluído em ${adm.completedAt ? new Date(adm.completedAt).toLocaleDateString('pt-BR') : 'Data registrada'}.`
      : 'Geração do prontuário digital e ativação final do colaborador.',
    category: 'CONCLUSAO',
    responsible: 'ADMIN',
    status: isCompleted ? 'CONCLUIDA' : 'PENDENTE',
    priority: 'NORMAL',
    completedAt: adm.completedAt,
    completedBy: adm.completedBy
  });

  return {
    admissionId: adm.id,
    admissionCode: `ADM-${adm.id.substring(0, 8).toUpperCase()}`,
    employeeId: adm.employeeId,
    employeeName: adm.employee?.name || 'Não identificado',
    employeeCpf: adm.employee?.cpf || '',
    employeeCpfMasked: maskCPF(adm.employee?.cpf || ''),
    employeeRole: adm.employee?.role || 'Cargo não definido',
    employeeDepartment: adm.employee?.department || 'Setor não informado',
    employeeUnit: adm.employee?.unit || 'Unidade Principal',
    employeeEmail: adm.employee?.email || '',
    employeePhone: adm.employee?.phone || '',
    createdAt: adm.createdAt,
    expectedStartDate: adm.employee?.expectedStartDate,
    lastActivityAt: lastActivity.date,
    lastActivityDescription: lastActivity.description,
    daysSinceCreation,
    daysWithoutMovement,
    daysInCurrentStep,
    currentStepKey: currentStep?.stepKey,
    currentStepName: currentStep?.stepName || 'Cadastro',
    currentStepOrder: currentStep?.stepOrder || 1,
    totalSteps,
    completedSteps,
    currentStepStatus: currentStep?.status || 'EM_ANDAMENTO',
    currentStepResponsible: currentStep?.responsibleRole || 'RH',
    currentStepBlockReason: currentStep?.blockReason,
    progressPercent,
    documentsProgressPercent,
    totalDocuments,
    approvedDocuments,
    inReviewDocuments,
    rejectedDocuments,
    notSentDocuments,
    status: adm.status,
    operationalPriority,
    operationalPriorityReason: adm.operationalPriorityReason,
    operationalSituation,
    operationalSituationLabel,
    primaryPending: {
      type: primaryPendingType,
      title: primaryPendingTitle,
      description: primaryPendingDesc,
      responsible: primaryPendingResp,
      documentId: primaryPendingDocId,
      stepId: primaryPendingStepId
    },
    currentResponsible,
    tasks
  };
}

export function filterAndPaginateChecklist(
  admissions: Admission[],
  options: OperationalChecklistFilters = {},
  settings?: SystemSettings
): OperationalChecklistResponse {
  const rolesSet = new Set<string>();
  const departmentsSet = new Set<string>();
  const unitsSet = new Set<string>();
  const stepsMap = new Map<string, string>();
  const responsiblesSet = new Set<string>();
  const statusesSet = new Set<string>();

  // Processa todos os itens para popular filtros e sumário geral
  const allItems: OperationalChecklistItem[] = [];

  let totalInCourse = 0;
  let criticalPendings = 0;
  let employeePendings = 0;
  let rhPendings = 0;
  let waitingReviewDocs = 0;
  let upcomingAdmissions = 0;
  let delayedAdmissions = 0;
  let inactiveAdmissions = 0;
  let blockedAdmissions = 0;

  for (const adm of admissions) {
    if (adm.employee?.role) rolesSet.add(adm.employee.role);
    if (adm.employee?.department) departmentsSet.add(adm.employee.department);
    if (adm.employee?.unit) unitsSet.add(adm.employee.unit);
    if (adm.status) statusesSet.add(adm.status);

    const item = buildOperationalChecklistItem(adm, settings);
    allItems.push(item);

    if (item.currentStepKey) {
      stepsMap.set(item.currentStepKey, item.currentStepName);
    }
    responsiblesSet.add(item.currentResponsible);

    // Contadores de sumário
    const isOngoing = adm.status !== 'Concluída' && adm.status !== 'Cancelada';
    if (isOngoing) totalInCourse++;
    if (item.operationalPriority === 'CRITICA' && isOngoing) criticalPendings++;
    if (item.currentResponsible === 'FUNCIONARIO' && isOngoing) employeePendings++;
    if ((item.currentResponsible === 'RH' || item.currentResponsible === 'RH_CONFERENCIA') && isOngoing) rhPendings++;
    if (item.inReviewDocuments > 0 && isOngoing) waitingReviewDocs += item.inReviewDocuments;
    if (item.operationalSituation === 'PROXIMA' && isOngoing) upcomingAdmissions++;
    if (item.operationalSituation === 'ATRASADA' && isOngoing) delayedAdmissions++;
    if (item.operationalSituation === 'SEM_MOVIMENTACAO' && isOngoing) inactiveAdmissions++;
    if (item.operationalSituation === 'BLOQUEADA' && isOngoing) blockedAdmissions++;
  }

  // Aplicação dos Filtros
  let filtered = allItems.filter(item => {
    // 1. Busca textual ampla
    if (options.search && options.search.trim() !== '') {
      const q = options.search.toLowerCase().trim();
      const rawCpf = item.employeeCpf.replace(/\D/g, '');
      const match = 
        item.employeeName.toLowerCase().includes(q) ||
        item.employeeCpfMasked.toLowerCase().includes(q) ||
        rawCpf.includes(q.replace(/\D/g, '')) ||
        item.employeeRole.toLowerCase().includes(q) ||
        item.employeeDepartment.toLowerCase().includes(q) ||
        item.employeeUnit.toLowerCase().includes(q) ||
        item.employeeEmail.toLowerCase().includes(q) ||
        item.employeePhone.includes(q) ||
        item.admissionCode.toLowerCase().includes(q);
      if (!match) return false;
    }

    // 2. Status da Admissão
    if (options.status && options.status !== 'TODOS' && options.status !== 'todas') {
      if (item.status.toLowerCase() !== options.status.toLowerCase()) return false;
    }

    // 3. Etapa do Processo
    if (options.step && options.step !== 'TODAS' && options.step !== 'todas') {
      if (item.currentStepKey !== options.step && item.currentStepName !== options.step) return false;
    }

    // 4. Responsável Operacional
    if (options.responsible && options.responsible !== 'TODOS' && options.responsible !== 'todos') {
      if (item.currentResponsible !== options.responsible) return false;
    }

    // 5. Prioridade
    if (options.priority && options.priority !== 'TODAS' && options.priority !== 'todas') {
      if (item.operationalPriority !== options.priority) return false;
    }

    // 6. Situação Operacional
    if (options.situation && options.situation !== 'TODAS' && options.situation !== 'todas') {
      if (item.operationalSituation !== options.situation) return false;
    }

    // 7. Período
    if (options.startDate) {
      const start = new Date(options.startDate).getTime();
      const targetDate = new Date(item.createdAt).getTime();
      if (targetDate < start) return false;
    }
    if (options.endDate) {
      const end = new Date(options.endDate).getTime() + 86400000;
      const targetDate = new Date(item.createdAt).getTime();
      if (targetDate > end) return false;
    }

    return true;
  });

  // Ordenação Operacional Inteligente
  const priorityOrder: Record<OperationalPriority, number> = {
    CRITICA: 1,
    ALTA: 2,
    NORMAL: 3
  };

  const situationOrder: Record<OperationalChecklistSituation, number> = {
    BLOQUEADA: 1,
    ATRASADA: 2,
    SEM_MOVIMENTACAO: 3,
    PROXIMA: 4,
    EM_DIA: 5
  };

  filtered.sort((a, b) => {
    if (options.sortBy === 'name') {
      const cmp = a.employeeName.localeCompare(b.employeeName);
      return options.sortOrder === 'desc' ? -cmp : cmp;
    }
    if (options.sortBy === 'date') {
      const cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return options.sortOrder === 'asc' ? -cmp : cmp;
    }
    if (options.sortBy === 'expectedDate') {
      const da = a.expectedStartDate ? new Date(a.expectedStartDate).getTime() : 9999999999999;
      const db = b.expectedStartDate ? new Date(b.expectedStartDate).getTime() : 9999999999999;
      const cmp = da - db;
      return options.sortOrder === 'desc' ? -cmp : cmp;
    }
    if (options.sortBy === 'progress') {
      const cmp = b.progressPercent - a.progressPercent;
      return options.sortOrder === 'asc' ? -cmp : cmp;
    }

    // Ordenação padrão: Prioridade (CRITICA > ALTA > NORMAL), Situação e Data
    const pDiff = priorityOrder[a.operationalPriority] - priorityOrder[b.operationalPriority];
    if (pDiff !== 0) return pDiff;

    const sDiff = situationOrder[a.operationalSituation] - situationOrder[b.operationalSituation];
    if (sDiff !== 0) return sDiff;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const total = filtered.length;
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 20));
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startIndex = (page - 1) * limit;
  const paginatedItems = filtered.slice(startIndex, startIndex + limit);

  return {
    items: paginatedItems,
    total,
    page,
    limit,
    totalPages,
    summary: {
      totalInCourse,
      criticalPendings,
      employeePendings,
      rhPendings,
      waitingReviewDocs,
      upcomingAdmissions,
      delayedAdmissions,
      inactiveAdmissions,
      blockedAdmissions
    },
    filters: {
      roles: Array.from(rolesSet).sort(),
      departments: Array.from(departmentsSet).sort(),
      units: Array.from(unitsSet).sort(),
      steps: Array.from(stepsMap.entries()).map(([key, name]) => ({ key, name })),
      responsibles: Array.from(responsiblesSet).sort(),
      statuses: Array.from(statusesSet).sort()
    }
  };
}
