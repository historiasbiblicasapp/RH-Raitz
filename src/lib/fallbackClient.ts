// Client-side Fallback Data Handler para deploys estáticos (como Vercel SPA) ou quando a API estiver inacessível.
import { initialDbData } from '../data/initialDb.ts';
import { Admission, DashboardStats, JobPosition, DocumentTypeItem, SystemSettings } from '../types/index.ts';

const LOCAL_STORAGE_KEY = 'admissao_digital_local_db_v1';

function getLocalData(): any {
  if (typeof window === 'undefined') {
    return initialDbData;
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.admissions?.length) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[FallbackDB] Falha ao ler localStorage:', e);
  }
  // Inicializa localStorage com o snapshot completo de 25 admissões
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialDbData));
  } catch {}
  return initialDbData;
}

function saveLocalData(data: any) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[FallbackDB] Falha ao salvar localStorage:', e);
  }
}

export function computeStats(options?: {
  period?: string;
  role?: string;
  department?: string;
  unit?: string;
  status?: string;
}): DashboardStats {
  const db = getLocalData();
  let allAdmissions: Admission[] = [...(db.admissions || [])];

  if (options?.role && options.role !== 'TODOS' && options.role !== 'Todos') {
    allAdmissions = allAdmissions.filter(a => a.employee?.role === options.role);
  }
  if (options?.department && options.department !== 'TODOS' && options.department !== 'Todos') {
    allAdmissions = allAdmissions.filter(a => a.employee?.department === options.department);
  }
  if (options?.unit && options.unit !== 'TODOS' && options.unit !== 'Todos') {
    allAdmissions = allAdmissions.filter(a => a.employee?.unit === options.unit);
  }

  const now = new Date();
  const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();

  const waitingDocuments = allAdmissions.filter(a => a.status === 'Aguardando documentos').length;
  const waitingReview = allAdmissions.filter(a => a.status === 'Em conferência').length;
  const pendingIssues = allAdmissions.filter(a => a.status === 'Pendência').length;
  const completed = allAdmissions.filter(a => a.status === 'Concluída').length;
  const cancelled = allAdmissions.filter(a => a.status === 'Cancelada').length;
  const totalActive = allAdmissions.filter(a => a.status !== 'Cancelada').length;

  const upcoming = allAdmissions.filter(a => {
    if (a.status === 'Concluída' || a.status === 'Cancelada') return false;
    if (!a.employee?.expectedStartDate) return false;
    const expectedTime = new Date(a.employee.expectedStartDate + 'T23:59:59').getTime();
    return expectedTime >= todayZero;
  }).length;

  const byProcessStep: Record<string, { name: string; count: number; stepOrder: number }> = {};
  allAdmissions.forEach(a => {
    if (a.processSteps && a.processSteps.length > 0) {
      const activeStep = a.processSteps.find((s: any) => s.status === 'EM_ANDAMENTO') || a.processSteps[0];
      if (activeStep) {
        const key = activeStep.stepKey || activeStep.id;
        if (!byProcessStep[key]) {
          byProcessStep[key] = {
            name: activeStep.stepName,
            count: 0,
            stepOrder: activeStep.stepOrder
          };
        }
        byProcessStep[key].count += 1;
      }
    }
  });

  return {
    newAdmissions: allAdmissions.length,
    waitingDocuments,
    waitingReview,
    pendingIssues,
    completed,
    totalActive,
    cancelled,
    upcoming,
    byProcessStep
  };
}

export function handleFallbackApiRoute(urlStr: string, options?: RequestInit): any | undefined {
  const urlObj = new URL(urlStr, 'http://localhost');
  const path = urlObj.pathname;
  const db = getLocalData();
  const method = (options?.method || 'GET').toUpperCase();

  // 1. Dashboard Stats
  if (path === '/api/dashboard/stats' || path === '/dashboard/stats') {
    const period = urlObj.searchParams.get('period') || undefined;
    const role = urlObj.searchParams.get('role') || undefined;
    const department = urlObj.searchParams.get('department') || undefined;
    const unit = urlObj.searchParams.get('unit') || undefined;
    const status = urlObj.searchParams.get('status') || undefined;
    return computeStats({ period, role, department, unit, status });
  }

  // 2. Admissions List
  if (path === '/api/admissions' || path === '/admissions') {
    if (method === 'GET') {
      let list: Admission[] = [...(db.admissions || [])];
      const status = urlObj.searchParams.get('status');
      const role = urlObj.searchParams.get('role');
      const department = urlObj.searchParams.get('department');
      const unit = urlObj.searchParams.get('unit');
      const search = (urlObj.searchParams.get('search') || '').toLowerCase().trim();

      if (status && status !== 'TODOS') list = list.filter(a => a.status === status);
      if (role && role !== 'TODOS') list = list.filter(a => a.employee?.role === role);
      if (department && department !== 'TODOS') list = list.filter(a => a.employee?.department === department);
      if (unit && unit !== 'TODOS') list = list.filter(a => a.employee?.unit === unit);

      if (search) {
        list = list.filter(a => 
          a.employee?.name.toLowerCase().includes(search) ||
          a.employee?.cpf?.includes(search) ||
          a.employee?.role?.toLowerCase().includes(search)
        );
      }

      const roles = Array.from(new Set(db.admissions.map((a: any) => a.employee?.role).filter(Boolean)));
      const departments = Array.from(new Set(db.admissions.map((a: any) => a.employee?.department).filter(Boolean)));
      const units = Array.from(new Set(db.admissions.map((a: any) => a.employee?.unit).filter(Boolean)));

      return {
        admissions: list,
        total: list.length,
        filters: { roles, departments, units }
      };
    }
  }

  // 3. Single Admission by ID
  const admMatch = path.match(/^\/api\/admissions\/([^/]+)$/);
  if (admMatch) {
    const id = admMatch[1];
    const item = (db.admissions || []).find((a: any) => a.id === id);
    if (item) return { admission: item };
    return { admission: db.admissions?.[0] };
  }

  // 4. Job Positions
  if (path.includes('/job-positions') || path.includes('/cargos')) {
    return { jobPositions: db.jobPositions || [] };
  }

  // 5. Document Types
  if (path.includes('/document-types') || path.includes('/tipos-documentos')) {
    return { documentTypes: db.documentTypes || [] };
  }

  // 6. Checklists por Cargo
  if (path.includes('/job-position-documents') || path.includes('/cargos-documentos')) {
    return { documents: db.jobPositionDocuments || [] };
  }

  // 7. Central de Pendências
  if (path.includes('/pendencias')) {
    const pendingAdmissions = (db.admissions || []).filter((a: any) => a.status === 'Pendência');
    const items = pendingAdmissions.map((a: any) => {
      const rejectedDoc = (a.documents || []).find((d: any) => d.status === 'Rejeitado');
      return {
        id: 'pend-' + a.id,
        admissionId: a.id,
        employeeName: a.employee?.name,
        employeeCpf: a.employee?.cpf,
        role: a.employee?.role,
        department: a.employee?.department,
        status: a.status,
        documentName: rejectedDoc?.name || 'Documento com Pendência',
        rejectionReason: rejectedDoc?.rejectionReason || 'Documento ilegível ou incorreto',
        createdAt: a.updatedAt || a.createdAt
      };
    });
    return {
      items,
      summary: {
        total: items.length,
        alta: items.length,
        media: 0,
        baixa: 0
      }
    };
  }

  // 8. Prazos & Acompanhamento
  if (path.includes('/tracking') || path.includes('/prazos')) {
    const items = (db.admissions || []).map((a: any) => ({
      id: a.id,
      employeeName: a.employee?.name,
      employeeCpf: a.employee?.cpf,
      role: a.employee?.role,
      department: a.employee?.department,
      status: a.status,
      expectedStartDate: a.employee?.expectedStartDate,
      daysUntilStart: a.employee?.expectedStartDate ? 5 : null,
      situation: a.status === 'Pendência' ? 'Atenção' : (a.status === 'Concluída' ? 'Concluído' : 'No Prazo')
    }));

    return {
      items,
      summary: {
        total: items.length,
        upcomingCount: 15,
        attentionCount: 1,
        overdueCount: 0
      }
    };
  }

  // 9. Comunicação Hub
  if (path.includes('/communication') || path.includes('/comunicacao')) {
    return {
      items: db.communicationLogs || [],
      templates: db.settings?.communicationTemplates || [],
      summary: {
        totalSent: (db.communicationLogs || []).length,
        whatsappSent: (db.communicationLogs || []).length,
        emailSent: 0
      }
    };
  }

  // 10. Relatórios
  if (path.includes('/reports')) {
    return {
      indicators: {
        totalAdmissions: db.admissions?.length || 25,
        completedAdmissions: 9,
        pendingAdmissions: 1,
        inProgressAdmissions: 15,
        averageDaysToComplete: 3.5
      },
      admissions: db.admissions || [],
      charts: {
        byStatus: [
          { name: 'Aguardando documentos', count: 11 },
          { name: 'Concluída', count: 9 },
          { name: 'Em conferência', count: 4 },
          { name: 'Pendência', count: 1 }
        ]
      }
    };
  }

  // 11. Configurações
  if (path.includes('/settings') || path.includes('/configuracoes')) {
    return { settings: db.settings };
  }

  // 12. Notificações
  if (path.includes('/notifications') || path.includes('/notificacoes')) {
    return { notifications: db.notifications || [] };
  }

  // 13. Auditoria / Histórico
  if (path.includes('/audit-logs') || path.includes('/historico')) {
    return { logs: db.auditLogs || [] };
  }

  // 14. Usuários
  if (path.includes('/users') || path.includes('/usuarios')) {
    return { users: db.users || [] };
  }

  // 15. Gestão de Funcionários (Bloco 5.1)
  const empDetailMatch = path.match(/^\/api\/employees\/([^/?#]+)$/);
  if (empDetailMatch) {
    const empId = empDetailMatch[1];
    const employees = db.employees || (db.admissions || []).map((a: any) => a.employee).filter(Boolean);
    const employee = employees.find((e: any) => e.id === empId);
    if (employee) {
      const admissions = (db.admissions || []).filter((a: any) => a.employeeId === empId || a.employee?.cpf === employee.cpf);
      const auditLogs = (db.auditLogs || []).filter((l: any) => l.entityId === empId || l.employeeName === employee.name);
      return {
        employee: {
          ...employee,
          active: employee.active !== undefined ? employee.active : true,
          status: employee.status || (employee.active !== false ? 'Ativo' : 'Inativo')
        },
        admissions,
        summary: {
          totalAdmissions: admissions.length,
          lastAdmission: admissions[0] || null,
          lastAdmissionStatus: admissions[0]?.status || null,
          pendingCount: 0
        },
        auditLogs
      };
    }
  }

  if (path.startsWith('/api/employees')) {
    const rawList = db.employees || (db.admissions || []).map((a: any) => a.employee).filter(Boolean);
    const mapped = rawList.map((e: any) => ({
      ...e,
      active: e.active !== undefined ? e.active : true,
      status: e.status || (e.active !== false ? 'Ativo' : 'Inativo'),
      cpfMasked: e.cpf ? `***.${e.cpf.slice(3, 6)}.${e.cpf.slice(6, 9)}-**` : '***.***.***-**'
    }));
    return {
      employees: mapped,
      total: mapped.length,
      page: 1,
      limit: 20,
      totalPages: 1,
      filters: {
        roles: Array.from(new Set(mapped.map((e: any) => e.role).filter(Boolean))),
        departments: Array.from(new Set(mapped.map((e: any) => e.department).filter(Boolean))),
        units: Array.from(new Set(mapped.map((e: any) => e.unit).filter(Boolean))),
        statuses: ['Ativo', 'Inativo']
      }
    };
  }

  // 16. Convite do Candidato (/api/invite/:token)
  const inviteMatch = path.match(/^\/api\/invite\/([^/]+)$/);
  if (inviteMatch) {
    const token = inviteMatch[1];
    const match = (db.admissions || []).find((a: any) => a.inviteToken === token);
    if (match) return match;
    // Fallback: primeira admissão aguardando documentos
    return (db.admissions || []).find((a: any) => a.status === 'Aguardando documentos') || db.admissions?.[0];
  }

  // 17. Processo Admissional (Bloco 5.4)
  if (path === '/api/admission-process' || path === '/admission-process') {
    const defaultSteps = [
      { id: 'step-1', stepKey: 'CADASTRO', name: 'Cadastro da Admissão', description: 'Abertura do processo admissional pelo RH', order: 1, active: true, required: true, responsibleRole: 'RH', completionRule: 'CADASTRO_INICIAL' },
      { id: 'step-2', stepKey: 'DADOS_PESSOAIS', name: 'Dados do Funcionário', description: 'Preenchimento e validação cadastral com aceite LGPD', order: 2, active: true, required: true, responsibleRole: 'RH', completionRule: 'DADOS_PREENCHIDOS' },
      { id: 'step-3', stepKey: 'DOCUMENTOS', name: 'Documentos', description: 'Upload e envio dos documentos obrigatórios pelo checklist', order: 3, active: true, required: true, responsibleRole: 'RH', completionRule: 'DOCUMENTOS_APROVADOS' },
      { id: 'step-4', stepKey: 'CONFERENCIA', name: 'Conferência', description: 'Análise minuciosa e conferência pelo time de RH', order: 4, active: true, required: true, responsibleRole: 'RH_CONFERENCIA', completionRule: 'CONFERENCIA_FINALIZADA' },
      { id: 'step-5', stepKey: 'APROVACAO', name: 'Aprovação', description: 'Parecer favorável e validação pela gestão da unidade', order: 5, active: true, required: true, responsibleRole: 'GESTOR', completionRule: 'APROVACAO_MANUAL' },
      { id: 'step-6', stepKey: 'CONCLUSAO', name: 'Conclusão', description: 'Finalização do processo e consolidação do prontuário digital', order: 6, active: true, required: true, responsibleRole: 'ADMIN', completionRule: 'ETAPAS_ANTERIORES_CONCLUIDAS' }
    ];
    const v1 = {
      id: 'proc-ver-1',
      versionNumber: 1,
      status: 'ativa',
      description: 'Versão inicial padrão do processo admissional.',
      changeNotes: 'Configuração inicial padrão',
      createdAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'Sistema',
      steps: defaultSteps
    };
    return {
      process: {
        id: 'processo-padrao',
        name: 'Processo Admissional Padrão',
        currentVersion: 1,
        activeVersionId: 'proc-ver-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        updatedBy: 'Sistema'
      },
      activeVersion: v1,
      allVersions: [v1]
    };
  }

  // 18. Conclusão / Reabertura de Etapa em Fallback
  const stepCompleteMatch = path.match(/^\/api\/admissions\/([^/]+)\/process-steps\/([^/]+)\/complete$/);
  if (stepCompleteMatch && method === 'POST') {
    const admissionId = stepCompleteMatch[1];
    const stepId = stepCompleteMatch[2];
    const admission = (db.admissions || []).find((a: any) => a.id === admissionId);
    if (admission && admission.processSteps) {
      const step = admission.processSteps.find((s: any) => s.id === stepId);
      if (step) {
        step.status = 'CONCLUIDA';
        step.completedAt = new Date().toISOString();
        step.completedBy = 'RH';
        saveLocalData(db);
        return { success: true, admission };
      }
    }
  }

  const stepReopenMatch = path.match(/^\/api\/admissions\/([^/]+)\/process-steps\/([^/]+)\/reopen$/);
  if (stepReopenMatch && method === 'POST') {
    const admissionId = stepReopenMatch[1];
    const stepId = stepReopenMatch[2];
    const admission = (db.admissions || []).find((a: any) => a.id === admissionId);
    if (admission && admission.processSteps) {
      const step = admission.processSteps.find((s: any) => s.id === stepId);
      if (step) {
        step.status = 'EM_ANDAMENTO';
        step.completedAt = undefined;
        step.completedBy = undefined;
        saveLocalData(db);
        return { success: true, admission };
      }
    }
  }

  // 19. Checklist Operacional Avançado (Bloco 5.5)
  if (path === '/api/operational-checklist' || path === '/api/checklist' || path === '/operational-checklist') {
    const params = urlObj.searchParams;
    const admissions: any[] = db.admissions || [];
    const search = params?.get('search')?.toLowerCase() || '';
    const status = params?.get('status');
    const priority = params?.get('priority');
    const situation = params?.get('situation');
    const responsible = params?.get('responsible');

    const now = new Date();
    const items = admissions.map((adm: any) => {
      const docs: any[] = adm.documents || [];
      const steps: any[] = adm.processSteps || [];
      const totalDocs = docs.length;
      const approvedDocs = docs.filter((d: any) => d.status === 'Aprovado').length;
      const rejectedDocs = docs.filter((d: any) => d.status === 'Rejeitado').length;
      const inReviewDocs = docs.filter((d: any) => ['Em análise', 'Enviado', 'Reenviado'].includes(d.status)).length;
      const notSentDocs = docs.filter((d: any) => d.status === 'Não enviado').length;

      const createdTime = new Date(adm.createdAt).getTime();
      const daysSinceCreation = Math.max(0, Math.floor((now.getTime() - createdTime) / 86400000));
      
      const expectedTime = adm.employee?.expectedStartDate ? new Date(adm.employee.expectedStartDate).getTime() : 0;
      const daysToExpected = expectedTime ? Math.round((expectedTime - now.getTime()) / 86400000) : 999;
      const isOverdue = expectedTime > 0 && daysToExpected < 0 && adm.status !== 'Concluída' && adm.status !== 'Cancelada';
      const isUpcoming = expectedTime > 0 && daysToExpected >= 0 && daysToExpected <= 7 && adm.status !== 'Concluída';

      const blockedStep = steps.find((s: any) => s.status === 'BLOQUEADA');
      const rejectedDoc = docs.find((d: any) => d.status === 'Rejeitado');
      const missingRequired = docs.find((d: any) => d.required && d.status === 'Não enviado');
      const inReviewDoc = docs.find((d: any) => ['Em análise', 'Enviado', 'Reenviado'].includes(d.status));

      let operPriority = adm.operationalPriority || 'NORMAL';
      if (!adm.operationalPriority) {
        if (blockedStep || isOverdue) operPriority = 'CRITICA';
        else if (rejectedDoc || (missingRequired && isUpcoming) || inReviewDocs > 0) operPriority = 'ALTA';
      }

      let operSituation = 'EM_DIA';
      let operSituationLabel = 'Em dia';
      if (blockedStep) { operSituation = 'BLOQUEADA'; operSituationLabel = 'Bloqueada'; }
      else if (isOverdue) { operSituation = 'ATRASADA'; operSituationLabel = 'Atrasada'; }
      else if (isUpcoming) { operSituation = 'PROXIMA'; operSituationLabel = `Próxima (${daysToExpected}d)`; }

      let currentResponsible = 'RH';
      if (blockedStep) currentResponsible = blockedStep.responsibleRole || 'RH';
      else if (rejectedDoc || missingRequired || !adm.dataConfirmed) currentResponsible = 'FUNCIONARIO';
      else if (inReviewDoc) currentResponsible = 'RH_CONFERENCIA';
      else if (adm.status === 'Concluída') currentResponsible = 'SISTEMA';

      let pendingType = 'NENHUMA';
      let pendingTitle = 'Sem pendências operacionais';
      let pendingDesc = 'Processo em conformidade com o cronograma.';
      if (blockedStep) {
        pendingType = 'BLOQUEIO';
        pendingTitle = `Etapa ${blockedStep.stepName} bloqueada`;
        pendingDesc = blockedStep.blockReason || 'Necessário desbloqueio.';
      } else if (rejectedDoc) {
        pendingType = 'DOC_REJEITADO';
        pendingTitle = `${rejectedDoc.documentType} rejeitado`;
        pendingDesc = rejectedDoc.rejectionReason || 'Aguardando reenvio pelo colaborador.';
      } else if (!adm.dataConfirmed && adm.status !== 'Concluída') {
        pendingType = 'ETAPA_RESPONSAVEL';
        pendingTitle = 'Validação cadastral pendente';
        pendingDesc = 'Aguardando aceite LGPD pelo colaborador.';
      } else if (missingRequired) {
        pendingType = 'DOC_NAO_ENVIADO';
        pendingTitle = `${missingRequired.documentType} pendente`;
        pendingDesc = 'Documento obrigatório aguardando upload.';
      } else if (inReviewDoc) {
        pendingType = 'DOC_CONFERENCIA';
        pendingTitle = `Conferência de ${inReviewDoc.documentType}`;
        pendingDesc = 'Documento aguardando conferência do RH.';
      }

      const completedSteps = steps.filter((s: any) => s.status === 'CONCLUIDA').length;
      const currentStep = steps.find((s: any) => s.status === 'EM_ANDAMENTO') || steps[0];

      return {
        admissionId: adm.id,
        admissionCode: `ADM-${adm.id.substring(0, 8).toUpperCase()}`,
        employeeId: adm.employeeId,
        employeeName: adm.employee?.name || 'Não informado',
        employeeCpf: adm.employee?.cpf || '',
        employeeCpfMasked: adm.employee?.cpf ? adm.employee.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.***-$4') : '',
        employeeRole: adm.employee?.role || '',
        employeeDepartment: adm.employee?.department || '',
        employeeUnit: adm.employee?.unit || 'Matriz',
        employeeEmail: adm.employee?.email || '',
        employeePhone: adm.employee?.phone || '',
        createdAt: adm.createdAt,
        expectedStartDate: adm.employee?.expectedStartDate,
        lastActivityAt: adm.updatedAt || adm.createdAt,
        lastActivityDescription: 'Atualização cadastral',
        daysSinceCreation,
        daysWithoutMovement: 1,
        daysInCurrentStep: 1,
        currentStepKey: currentStep?.stepKey,
        currentStepName: currentStep?.stepName || 'Cadastro',
        currentStepOrder: currentStep?.stepOrder || 1,
        totalSteps: steps.length || 6,
        completedSteps,
        currentStepStatus: currentStep?.status || 'EM_ANDAMENTO',
        currentStepResponsible: currentStep?.responsibleRole || 'RH',
        progressPercent: adm.progressPercent || Math.round((approvedDocs / (totalDocs || 1)) * 100),
        documentsProgressPercent: totalDocs ? Math.round((approvedDocs / totalDocs) * 100) : 0,
        totalDocuments: totalDocs,
        approvedDocuments: approvedDocs,
        inReviewDocuments: inReviewDocs,
        rejectedDocuments: rejectedDocs,
        notSentDocuments: notSentDocs,
        status: adm.status,
        operationalPriority: operPriority,
        operationalSituation: operSituation,
        operationalSituationLabel: operSituationLabel,
        primaryPending: {
          type: pendingType,
          title: pendingTitle,
          description: pendingDesc,
          responsible: currentResponsible,
          documentId: rejectedDoc?.id || missingRequired?.id || inReviewDoc?.id
        },
        currentResponsible
      };
    });

    let filtered = items;
    if (search) {
      filtered = filtered.filter((i: any) => 
        i.employeeName.toLowerCase().includes(search) || 
        i.employeeRole.toLowerCase().includes(search) ||
        i.employeeDepartment.toLowerCase().includes(search)
      );
    }
    if (status && status !== 'TODOS') filtered = filtered.filter((i: any) => i.status === status);
    if (priority && priority !== 'TODAS') filtered = filtered.filter((i: any) => i.operationalPriority === priority);
    if (situation && situation !== 'TODAS') filtered = filtered.filter((i: any) => i.operationalSituation === situation);
    if (responsible && responsible !== 'TODOS') filtered = filtered.filter((i: any) => i.currentResponsible === responsible);

    const ongoing = items.filter((i: any) => i.status !== 'Concluída' && i.status !== 'Cancelada');

    return {
      items: filtered,
      total: filtered.length,
      page: 1,
      limit: 50,
      totalPages: 1,
      summary: {
        totalInCourse: ongoing.length,
        criticalPendings: ongoing.filter((i: any) => i.operationalPriority === 'CRITICA').length,
        employeePendings: ongoing.filter((i: any) => i.currentResponsible === 'FUNCIONARIO').length,
        rhPendings: ongoing.filter((i: any) => ['RH', 'RH_CONFERENCIA'].includes(i.currentResponsible)).length,
        waitingReviewDocs: ongoing.reduce((acc: number, i: any) => acc + i.inReviewDocuments, 0),
        upcomingAdmissions: ongoing.filter((i: any) => i.operationalSituation === 'PROXIMA').length,
        delayedAdmissions: ongoing.filter((i: any) => i.operationalSituation === 'ATRASADA').length,
        inactiveAdmissions: 0,
        blockedAdmissions: ongoing.filter((i: any) => i.operationalSituation === 'BLOQUEADA').length
      },
      filters: {
        roles: Array.from(new Set(items.map((i: any) => i.employeeRole))).filter(Boolean),
        departments: Array.from(new Set(items.map((i: any) => i.employeeDepartment))).filter(Boolean),
        units: Array.from(new Set(items.map((i: any) => i.employeeUnit))).filter(Boolean),
        steps: [
          { key: 'CADASTRO', name: 'Cadastro da Admissão' },
          { key: 'DADOS_PESSOAIS', name: 'Dados do Funcionário' },
          { key: 'DOCUMENTOS', name: 'Documentos' },
          { key: 'CONFERENCIA', name: 'Conferência' },
          { key: 'APROVACAO', name: 'Aprovação' },
          { key: 'CONCLUSAO', name: 'Conclusão' }
        ],
        responsibles: ['FUNCIONARIO', 'RH', 'RH_CONFERENCIA', 'GESTOR', 'ADMIN'],
        statuses: ['Rascunho', 'Aguardando documentos', 'Em conferência', 'Pendência', 'Concluída', 'Cancelada']
      }
    };
  }

  // 20. Detalhes de Checklist de Admissão em Fallback
  const admChecklistMatch = path.match(/^\/api\/admissions\/([^/]+)\/operational-checklist$/);
  if (admChecklistMatch) {
    const admissionId = admChecklistMatch[1];
    const admission = (db.admissions || []).find((a: any) => a.id === admissionId);
    if (admission) {
      // Reutiliza o item montado
      const checklistData = handleFallbackApiRoute('/api/operational-checklist');
      const foundItem = checklistData?.items?.find((i: any) => i.admissionId === admissionId);
      if (foundItem) return foundItem;
    }
  }

  // 21. Atualização de Prioridade Operacional em Fallback
  const priorityMatch = path.match(/^\/api\/admissions\/([^/]+)\/operational-priority$/);
  if (priorityMatch && (method === 'PATCH' || method === 'POST')) {
    const admissionId = priorityMatch[1];
    const admission = (db.admissions || []).find((a: any) => a.id === admissionId);
    if (admission) {
      const body = typeof options?.body === 'string' ? JSON.parse(options.body) : options?.body || {};
      admission.operationalPriority = body.priority || 'NORMAL';
      admission.operationalPriorityReason = body.reason;
      admission.operationalPriorityUpdatedAt = new Date().toISOString();
      admission.operationalPriorityUpdatedBy = 'RH';
      saveLocalData(db);
      return { success: true, message: 'Prioridade atualizada com sucesso' };
    }
  }

  return undefined;
}
