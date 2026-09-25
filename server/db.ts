import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  Admission, 
  Employee, 
  EmployeeStatus,
  EmployeeFilters,
  EmployeeResponse,
  EmployeeDetailResponse,
  AdmissionDocument, 
  AuditLog, 
  NotificationItem, 
  ConsentRecord,
  DashboardStats,
  DashboardStatsOptions,
  DocumentStats,
  DocumentType,
  DocumentStatus,
  AdmissionStatus,
  User,
  JobPosition,
  DocumentTypeItem,
  DocumentCategory,
  JobPositionDocument,
  AuditLogChange,
  PendingHubResponse,
  PendingFilters,
  PendingItem,
  PendingPriority,
  PendingSummary,
  CommunicationLog,
  CommunicationType,
  CommunicationChannel,
  CommunicationActionStatus,
  CommunicationItem,
  CommunicationSummary,
  CommunicationFilters,
  CommunicationHubResponse,
  CommunicationPendingReason,
  TrackingItem,
  TrackingSummary,
  TrackingFilters,
  TrackingResponse,
  OperationalSituation,
  AdmissionTimelineEvent,
  AdmissionStageTimes,
  ReportType,
  ReportFilterOptions,
  ReportIndicators,
  ReportCharts,
  ReportChartItem,
  ReportTimelineEvolution,
  ReportRowAdmission,
  ReportRowDocument,
  ReportRowPending,
  ReportRowCompleted,
  ReportRowCancelled,
  ReportDataResponse,
  SystemSettings,
  SystemGeneralSettings,
  SystemAdmissionSettings,
  SystemDocumentSettings,
  CommunicationTemplateItem,
  SystemCommunicationSettings,
  SystemNotificationSettings,
  SystemTrackingSettings,
  SystemReportSettings,
  SystemSecuritySettings,
  EmployeeDocument,
  EmployeeDocumentCategory,
  EmployeeDocumentStatus,
  EmployeeDocumentVersion,
  EmployeeDocumentStats,
  EmployeeDocumentFilterOptions,
  EmployeeDocumentsResponse,
  ProcessStepKey,
  ProcessStepStatus,
  ProcessStepCompletionRule,
  ConfigurableProcessStep,
  AdmissionProcessVersion,
  AdmissionProcessConfig,
  AdmissionProcessStepHistoryItem,
  AdmissionProcessStepSnapshot,
  AdmissionProcessResponse,
  OperationalPriority,
  OperationalChecklistSituation,
  OperationalResponsible,
  OperationalPendingSummary,
  OperationalTaskItem,
  OperationalChecklistItem,
  OperationalChecklistFilters,
  OperationalChecklistResponse,
  AdmissionApproval,
  ApprovalStatus,
  ApprovalType,
  ApprovalResponsibleRole,
  AdmissionApprovalHistoryItem,
  ApprovalQueueItem,
  ApprovalQueueSummary,
  ApprovalQueueFilters,
  ApprovalQueueResponse,
  ApprovalDetailResponse,
  OperationalHubSituation,
  OperationalHubSummary,
  OperationalHubItem,
  OperationalHubFilters,
  OperationalHubResponse,
  KpiPeriodType,
  KpiMainCards,
  KpiRates,
  KpiStepTimeItem,
  KpiTimeMetrics,
  KpiDocumentsMetrics,
  KpiApprovalsMetrics,
  KpiEvolutionPoint,
  KpiDistributionItem,
  KpiByDimensionItem,
  KpiFilters,
  KpiDetailedAdmission,
  KpiHubResponse,
  BottleneckStepMetrics,
  BottleneckStalledAdmission,
  BottleneckPendingItem,
  BottleneckRejectionReasonItem,
  BottleneckDocTypeRejectionItem,
  BottleneckResentMetrics,
  BottleneckReviewTimeMetrics,
  BottleneckBlockedMetrics,
  BottleneckReopenedMetrics,
  BottleneckEvolutionPoint,
  BottleneckDimensionItem,
  BottleneckAttentionPoint,
  BottleneckMainCards,
  BottleneckHubResponse,
  AssignmentActionType,
  AdmissionAssignmentHistoryItem,
  WorkloadByResponsibleItem,
  WorkDistributionCards,
  WorkDistributionItem,
  WorkDistributionFilters,
  WorkDistributionResponse,
  AssignResponsibleRequest,
  OperationalTask,
  OperationalTaskStatus,
  OperationalTaskSourceType,
  OperationalTaskActionType,
  OperationalTaskHistoryItem,
  OperationalTaskSummary,
  OperationalTaskFilters,
  OperationalTasksResponse,
  CreateOperationalTaskInput,
  UpdateOperationalTaskInput,
  AutomationRoutineKey,
  AutomationRoutineRule,
  AutomationExecutionRecord,
  AutomationsHubResponse
} from '../src/types/index.ts';
import { maskCPF, validateCPF, validateEmail } from '../src/lib/cpf.ts';
import { initialDbData } from '../src/data/initialDb.ts';
import { 
  buildOperationalChecklistItem, 
  filterAndPaginateChecklist 
} from './operationalChecklistService.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORAGE_DIR = path.join(DATA_DIR, 'storage');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface DatabaseSchema {
  users: User[];
  employees: Employee[];
  admissions: Admission[];
  auditLogs: AuditLog[];
  notifications: NotificationItem[];
  consentRecords: ConsentRecord[];
  jobPositions: JobPosition[];
  documentTypes: DocumentTypeItem[];
  jobPositionDocuments: JobPositionDocument[];
  communicationLogs: CommunicationLog[];
  settings?: SystemSettings;
  employeeDocuments?: EmployeeDocument[];
  admissionProcess?: AdmissionProcessConfig;
  admissionProcessVersions?: AdmissionProcessVersion[];
  operationalTasks?: OperationalTask[];
  automationExecutions?: AutomationExecutionRecord[];
}

export const DEFAULT_ADMISSION_PROCESS_STEPS: ConfigurableProcessStep[] = [
  {
    id: 'step-cadastro',
    stepKey: 'CADASTRO',
    name: 'Cadastro da Admissão',
    description: 'Abertura do processo admissional pelo RH com dados contratuais iniciais e geração de convite de acesso.',
    order: 1,
    active: true,
    required: true,
    responsibleRole: 'RH',
    completionRule: 'CADASTRO_INICIAL'
  },
  {
    id: 'step-dados-pessoais',
    stepKey: 'DADOS_PESSOAIS',
    name: 'Dados do Funcionário',
    description: 'Preenchimento, conferência cadastral com consentimento LGPD e confirmação formal dos dados pelo candidato.',
    order: 2,
    active: true,
    required: true,
    responsibleRole: 'RH',
    completionRule: 'DADOS_PREENCHIDOS'
  },
  {
    id: 'step-documentos',
    stepKey: 'DOCUMENTOS',
    name: 'Documentos',
    description: 'Upload e envio dos documentos admissionais obrigatórios conforme o checklist do cargo selecionado.',
    order: 3,
    active: true,
    required: true,
    responsibleRole: 'RH',
    completionRule: 'DOCUMENTOS_APROVADOS'
  },
  {
    id: 'step-conferencia',
    stepKey: 'CONFERENCIA',
    name: 'Conferência',
    description: 'Análise minuciosa, validação de conformidade e conferência documental pela equipe especializada do RH.',
    order: 4,
    active: true,
    required: true,
    responsibleRole: 'RH_CONFERENCIA',
    completionRule: 'CONFERENCIA_FINALIZADA'
  },
  {
    id: 'step-aprovacao',
    stepKey: 'APROVACAO',
    name: 'Aprovação',
    description: 'Parecer favorável e validação final da contratação pela liderança ou gestão da unidade.',
    order: 5,
    active: true,
    required: true,
    responsibleRole: 'GESTOR',
    completionRule: 'APROVACAO_MANUAL'
  },
  {
    id: 'step-conclusao',
    stepKey: 'CONCLUSAO',
    name: 'Conclusão',
    description: 'Finalização do processo admissional, consolidação do prontuário digital e liberação para início das atividades.',
    order: 6,
    active: true,
    required: true,
    responsibleRole: 'ADMIN',
    completionRule: 'ETAPAS_ANTERIORES_CONCLUIDAS'
  }
];

export function generateDefaultSettings(): SystemSettings {
  const now = new Date().toISOString();
  return {
    id: 'system-settings-default',
    general: {
      companyName: 'Galvanização Raitz',
      companyLogoUrl: '/raitz-logo.jpg',
      defaultUnit: 'Matriz - São Paulo',
      timezone: 'America/Sao_Paulo'
    },
    admission: {
      allowCancelAdmission: true,
      requireCancellationReason: true,
      allowEditDataAfterCreation: true,
      allowEditRoleAfterCreation: true,
      allowManualCompletion: true
    },
    documents: {
      defaultMaxFileSizeMb: 10,
      defaultAllowedFileTypes: ['PDF', 'JPG', 'JPEG', 'PNG'],
      requireRhReview: true,
      allowResubmissionAfterRejection: true,
      allowMultipleVersions: true,
      requireRejectionReason: true,
      expirationHandling: 'alert_near_expiration'
    },
    communication: {
      defaultChannel: 'whatsapp',
      sendWelcomeMessageOnCreate: true,
      workingHoursOnly: true,
      quietHoursStart: '20:00',
      quietHoursEnd: '08:00'
    },
    communicationTemplates: [
      {
        id: 'tmpl-01',
        key: 'documents_pending',
        name: 'Documentos pendentes',
        description: 'Avisa o colaborador sobre envio de documentos obrigatórios pendentes.',
        content: `Olá, [NOME].\n\nSua admissão na [EMPRESA] para a posição de [CARGO] está em andamento e ainda existem documentos pendentes de envio.\n\nAcesse seu link de admissão para verificar os documentos necessários e continuar o processo.\n\n[LINK]`,
        active: true,
        updatedAt: now,
        updatedBy: 'Sistema'
      },
      {
        id: 'tmpl-02',
        key: 'document_rejected',
        name: 'Documento rejeitado',
        description: 'Comunica necessidade de correção em documento que não foi aprovado pelo RH.',
        content: `Olá, [NOME].\n\nUm documento enviado para sua admissão na [EMPRESA] precisa ser corrigido pelo seguinte motivo: [MOTIVO].\n\nAcesse seu link de admissão para verificar a pendência e enviar uma nova versão legível.\n\n[LINK]`,
        active: true,
        updatedAt: now,
        updatedBy: 'Sistema'
      },
      {
        id: 'tmpl-03',
        key: 'reminder',
        name: 'Lembrete de admissão',
        description: 'Lembrete amigável sobre o andamento do processo admissional.',
        content: `Olá, [NOME].\n\nEste é um lembrete sobre sua admissão na [EMPRESA].\n\nAcesse seu link de admissão para verificar se existem documentos pendentes e continuar o processo com tranquilidade.\n\n[LINK]`,
        active: true,
        updatedAt: now,
        updatedBy: 'Sistema'
      },
      {
        id: 'tmpl-04',
        key: 'admission_upcoming',
        name: 'Admissão próxima',
        description: 'Alerta sobre a proximidade da data prevista de início das atividades.',
        content: `Olá, [NOME].\n\nSua data prevista de admissão na [EMPRESA] está próxima.\n\nPedimos que acesse seu link de admissão e conclua o envio de todos os documentos solicitados para que nosso RH possa homologar seu cadastro.\n\n[LINK]`,
        active: true,
        updatedAt: now,
        updatedBy: 'Sistema'
      },
      {
        id: 'tmpl-05',
        key: 'general_notice',
        name: 'Aviso geral',
        description: 'Mensagem institucional padrão sobre o processo de admissão.',
        content: `Olá, [NOME].\n\nAcesse o portal da sua admissão na [EMPRESA] para conferir informações e atualizações sobre o seu processo admissional.\n\n[LINK]`,
        active: true,
        updatedAt: now,
        updatedBy: 'Sistema'
      }
    ],
    notifications: {
      notifyNewDocumentUploaded: true,
      notifyDocumentRejected: true,
      notifyNewPending: true,
      notifyAdmissionUpcoming: true,
      notifyAdmissionCompleted: true,
      recipientsRole: 'RH'
    },
    tracking: {
      upcomingDaysThreshold: 7,
      inactivityDaysThreshold: 5
    },
    reports: {
      showFullCpf: false,
      allowExportCsv: true,
      allowExportXlsx: false,
      allowPrint: true,
      auditExports: true
    },
    security: {
      sessionTimeoutMinutes: 480,
      restrictAccessToRhAndAdmin: true,
      enforceAuditLogging: true
    },
    automations: {
      DOCUMENT_REJECTED: true,
      DOCUMENT_RESUBMITTED: true,
      ALL_REQUIRED_DOCUMENTS_APPROVED: true,
      APPROVAL_COMPLETED: true,
      TASK_COMPLETED: true
    },
    updatedAt: now,
    updatedBy: 'Sistema'
  };
}


function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

const INITIAL_DOC_TYPES: { type: DocumentType; required: boolean }[] = [
  { type: 'CPF', required: true },
  { type: 'RG', required: true },
  { type: 'Carteira de Trabalho', required: true },
  { type: 'Comprovante de residência', required: true },
  { type: 'Diploma/Certificado', required: true },
];

export const INITIAL_JOB_POSITIONS = [
  { name: 'Auxiliar Administrativo', code: 'ADM-001', description: 'Rotinas de suporte administrativo e atendimento', active: true },
  { name: 'Analista de TI', code: 'TI-001', description: 'Responsável por suporte, infraestrutura e sistemas de TI', active: true },
  { name: 'Técnico de Segurança do Trabalho', code: 'SEG-001', description: 'Inspeções, laudos e conformidade com normas regulamentadoras', active: true },
  { name: 'Eletricista', code: 'MAN-001', description: 'Manutenção e instalação de redes elétricas industriais', active: true },
  { name: 'Mecânico', code: 'MAN-002', description: 'Manutenção preventiva e corretiva de máquinas e equipamentos', active: true },
  { name: 'Operador de Produção', code: 'PROD-001', description: 'Operação de maquinário e linhas de produção industrial', active: true },
  { name: 'Motorista', code: 'LOG-001', description: 'Transporte e entregas operacionais', active: true },
  { name: 'Assistente Administrativo', code: 'ADM-002', description: 'Lançamentos, controle de documentos e suporte ao setor', active: true }
];

export const INITIAL_DOCUMENT_TYPES: Omit<DocumentTypeItem, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>[] = [
  {
    name: 'CPF',
    description: 'Cadastro de Pessoa Física - Documento oficial de identificação fiscal perante a Receita Federal.',
    category: 'Pessoal',
    required_by_default: true,
    active: true,
    allowed_file_types: ['PDF', 'JPG', 'JPEG', 'PNG'],
    max_file_size_mb: 10,
    requires_expiration_date: false,
    sort_order: 1
  },
  {
    name: 'RG',
    description: 'Registro Geral - Carteira de Identidade oficial expedida por órgão de segurança pública.',
    category: 'Pessoal',
    required_by_default: true,
    active: true,
    allowed_file_types: ['PDF', 'JPG', 'JPEG', 'PNG'],
    max_file_size_mb: 10,
    requires_expiration_date: false,
    sort_order: 2
  },
  {
    name: 'Carteira de Trabalho',
    description: 'CTPS Digital ou física contendo qualificação civil e número de registro profissional.',
    category: 'Trabalhista',
    required_by_default: true,
    active: true,
    allowed_file_types: ['PDF', 'JPG', 'JPEG', 'PNG'],
    max_file_size_mb: 10,
    requires_expiration_date: false,
    sort_order: 3
  },
  {
    name: 'Comprovante de Residência',
    description: 'Comprovante recente (água, luz, gás, telefone) emitido nos últimos 90 dias.',
    category: 'Residencial',
    required_by_default: true,
    active: true,
    allowed_file_types: ['PDF', 'JPG', 'JPEG', 'PNG'],
    max_file_size_mb: 10,
    requires_expiration_date: false,
    sort_order: 4
  },
  {
    name: 'Diploma/Certificado',
    description: 'Comprovante de conclusão de escolaridade fundamental, média, técnica ou superior.',
    category: 'Escolar',
    required_by_default: false,
    active: true,
    allowed_file_types: ['PDF', 'JPG', 'JPEG', 'PNG'],
    max_file_size_mb: 10,
    requires_expiration_date: false,
    sort_order: 5
  },
  {
    name: 'NR10 - Segurança em Instalações Elétricas',
    description: 'Certificado de capacitação e reciclagem em segurança em instalações e serviços com eletricidade.',
    category: 'Certificação',
    required_by_default: false,
    active: true,
    allowed_file_types: ['PDF', 'JPG', 'JPEG', 'PNG'],
    max_file_size_mb: 10,
    requires_expiration_date: true,
    sort_order: 6
  },
  {
    name: 'NR35 - Trabalho em Altura',
    description: 'Certificado de treinamento para trabalho em altura conforme norma regulamentadora.',
    category: 'Certificação',
    required_by_default: false,
    active: true,
    allowed_file_types: ['PDF', 'JPG', 'JPEG', 'PNG'],
    max_file_size_mb: 10,
    requires_expiration_date: true,
    sort_order: 7
  },
  {
    name: 'Atestado de Saúde Ocupacional (ASO)',
    description: 'Atestado médico de aptidão física e mental para admissão emitido por médico do trabalho.',
    category: 'Saúde',
    required_by_default: true,
    active: true,
    allowed_file_types: ['PDF', 'JPG', 'JPEG', 'PNG'],
    max_file_size_mb: 10,
    requires_expiration_date: true,
    sort_order: 8
  }
];

function generateInitialData(): DatabaseSchema {
  const userRaitzRH: User = {
    id: 'user-rh-00',
    email: 'rh@galvanizacaoraitz.com.br',
    name: 'RH Galvanização Raitz',
    role: 'RH',
    department: 'Recursos Humanos / Gente & Gestão',
    createdAt: new Date().toISOString()
  };

  const adminUser: User = {
    id: 'user-rh-01',
    email: 'rh@empresa.com',
    name: 'Mariana Silveira',
    role: 'RH',
    department: 'Recursos Humanos',
    createdAt: new Date().toISOString()
  };

  const userAdminRaitz: User = {
    id: 'user-rh-03',
    email: 'admin@raitz.com.br',
    name: 'Coordenação Raitz RH',
    role: 'RH',
    department: 'Recursos Humanos',
    createdAt: new Date().toISOString()
  };

  // Seed sample employee 1 (Aguardando documentos)
  const emp1: Employee = {
    id: 'emp-01',
    name: 'Lucas Gabriel Albuquerque',
    cpf: '12345678901',
    birthDate: '1995-04-12',
    phone: '11987654321',
    email: 'lucas.albuquerque@email.com',
    role: 'Desenvolvedor Frontend Pleno',
    department: 'Tecnologia da Informação',
    unit: 'Matriz - São Paulo',
    expectedStartDate: '2026-10-01',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
  };

  const adm1Token = 'tok_' + crypto.randomBytes(16).toString('hex');
  const adm1Docs: AdmissionDocument[] = INITIAL_DOC_TYPES.map(item => ({
    id: 'doc-' + crypto.randomUUID(),
    admissionId: 'adm-01',
    documentType: item.type,
    required: item.required,
    status: 'Não enviado',
    currentVersion: 0,
    versions: [],
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
  }));

  const adm1: Admission = {
    id: 'adm-01',
    employeeId: emp1.id,
    employee: emp1,
    status: 'Aguardando documentos',
    inviteToken: adm1Token,
    inviteExpiresAt: new Date(Date.now() + 15 * 86400000).toISOString(),
    inviteSentViaWhatsApp: true,
    inviteSentAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    consentGiven: false,
    dataConfirmed: false,
    documents: adm1Docs,
    progressPercent: 0,
    totalDocuments: 5,
    approvedDocuments: 0,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
  };

  // Seed sample employee 2 (Em conferência - alguns enviados)
  const emp2: Employee = {
    id: 'emp-02',
    name: 'Camila Fernandes Rocha',
    cpf: '98765432100',
    birthDate: '1992-08-25',
    phone: '21976543210',
    email: 'camila.rocha@email.com',
    role: 'Analista de Recursos Humanos',
    department: 'Gente e Gestão',
    unit: 'Filial - Rio de Janeiro',
    expectedStartDate: '2026-09-20',
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
  };

  const adm2Token = 'tok_' + crypto.randomBytes(16).toString('hex');
  const adm2Docs: AdmissionDocument[] = INITIAL_DOC_TYPES.map((item, idx) => {
    const isSent = idx < 3;
    const isApproved = idx === 0;
    return {
      id: 'doc-' + crypto.randomUUID(),
      admissionId: 'adm-02',
      documentType: item.type,
      required: item.required,
      status: isApproved ? 'Aprovado' : (isSent ? 'Em análise' : 'Não enviado'),
      currentVersion: isSent ? 1 : 0,
      fileName: isSent ? `${item.type.toLowerCase().replace(/[\/\s]/g, '_')}_camila.pdf` : undefined,
      fileSize: isSent ? 1420500 : undefined,
      mimeType: isSent ? 'application/pdf' : undefined,
      storagePath: isSent ? 'sample-file.pdf' : undefined,
      uploadedAt: isSent ? new Date(Date.now() - 1 * 86400000).toISOString() : undefined,
      reviewedAt: isApproved ? new Date().toISOString() : undefined,
      reviewedBy: isApproved ? 'Mariana Silveira (RH)' : undefined,
      versions: isSent ? [{
        version: 1,
        fileName: `${item.type.toLowerCase().replace(/[\/\s]/g, '_')}_camila.pdf`,
        fileSize: 1420500,
        mimeType: 'application/pdf',
        storagePath: 'sample-file.pdf',
        uploadedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        status: isApproved ? 'Aprovado' : 'Em análise',
        reviewedAt: isApproved ? new Date().toISOString() : undefined,
        reviewedBy: isApproved ? 'Mariana Silveira (RH)' : undefined
      }] : [],
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
    };
  });

  const adm2: Admission = {
    id: 'adm-02',
    employeeId: emp2.id,
    employee: emp2,
    status: 'Em conferência',
    inviteToken: adm2Token,
    inviteExpiresAt: new Date(Date.now() + 15 * 86400000).toISOString(),
    inviteSentViaWhatsApp: true,
    inviteSentAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    consentGiven: true,
    consentDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    consentTextVersion: '1.0-2025',
    dataConfirmed: true,
    dataConfirmedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    documents: adm2Docs,
    progressPercent: 20,
    totalDocuments: 5,
    approvedDocuments: 1,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
  };

  // Seed sample employee 3 (Pendência - comprovante rejeitado)
  const emp3: Employee = {
    id: 'emp-03',
    name: 'Rodrigo Santoro Maia',
    cpf: '45678912300',
    birthDate: '1988-11-03',
    phone: '31988776655',
    email: 'rodrigo.maia@email.com',
    role: 'Engenheiro de Dados',
    department: 'Tecnologia da Informação',
    unit: 'Matriz - São Paulo',
    expectedStartDate: '2026-09-18',
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
  };

  const adm3Token = 'tok_' + crypto.randomBytes(16).toString('hex');
  const adm3Docs: AdmissionDocument[] = INITIAL_DOC_TYPES.map((item) => {
    const isProof = item.type === 'Comprovante de residência';
    return {
      id: 'doc-' + crypto.randomUUID(),
      admissionId: 'adm-03',
      documentType: item.type,
      required: item.required,
      status: isProof ? 'Rejeitado' : 'Aprovado',
      currentVersion: 1,
      fileName: `${item.type.toLowerCase().replace(/[\/\s]/g, '_')}_rodrigo.pdf`,
      fileSize: 1024000,
      mimeType: 'application/pdf',
      storagePath: 'sample-file.pdf',
      uploadedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      reviewedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      reviewedBy: 'Mariana Silveira (RH)',
      rejectionReason: isProof ? 'Documento ilegível' : undefined,
      rejectionNotes: isProof ? 'Comprovante emitido há mais de 90 dias e com foto embaçada. Favor enviar conta recente de água ou energia com boa resolução.' : undefined,
      versions: [{
        version: 1,
        fileName: `${item.type.toLowerCase().replace(/[\/\s]/g, '_')}_rodrigo.pdf`,
        fileSize: 1024000,
        mimeType: 'application/pdf',
        storagePath: 'sample-file.pdf',
        uploadedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        status: isProof ? 'Rejeitado' : 'Aprovado',
        reviewedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        reviewedBy: 'Mariana Silveira (RH)',
        rejectionReason: isProof ? 'Documento ilegível' : undefined,
        rejectionNotes: isProof ? 'Comprovante emitido há mais de 90 dias e com foto embaçada.' : undefined,
      }],
      createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
    };
  });

  const adm3: Admission = {
    id: 'adm-03',
    employeeId: emp3.id,
    employee: emp3,
    status: 'Pendência',
    inviteToken: adm3Token,
    inviteExpiresAt: new Date(Date.now() + 15 * 86400000).toISOString(),
    inviteSentViaWhatsApp: true,
    inviteSentAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    consentGiven: true,
    consentDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    consentTextVersion: '1.0-2025',
    dataConfirmed: true,
    dataConfirmedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    documents: adm3Docs,
    progressPercent: 80,
    totalDocuments: 5,
    approvedDocuments: 4,
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
  };

  const auditLogs: AuditLog[] = [
    {
      id: 'audit-01',
      timestamp: new Date(Date.now() - 6 * 86400000).toISOString(),
      userName: 'Mariana Silveira (RH)',
      action: 'RH criou uma nova admissão',
      employeeName: 'Rodrigo Santoro Maia',
      details: 'Cadastro de admissão iniciado para o cargo Engenheiro de Dados'
    },
    {
      id: 'audit-02',
      timestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
      userName: 'Rodrigo Santoro Maia',
      action: 'Funcionário acessou o convite',
      employeeName: 'Rodrigo Santoro Maia',
      details: 'Acesso realizado pelo navegador móvel via token individual'
    },
    {
      id: 'audit-03',
      timestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
      userName: 'Rodrigo Santoro Maia',
      action: 'Funcionário deu consentimento LGPD',
      employeeName: 'Rodrigo Santoro Maia',
      details: 'Ciência e consentimento registrado para tratamento de dados admissionais (Termo v1.0)'
    },
    {
      id: 'audit-04',
      timestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
      userName: 'Rodrigo Santoro Maia',
      action: 'Funcionário confirmou seus dados',
      employeeName: 'Rodrigo Santoro Maia',
      details: 'Conferência de dados cadastrais finalizada sem divergências apontadas'
    },
    {
      id: 'audit-05',
      timestamp: new Date(Date.now() - 1 * 86400000).toISOString(),
      userName: 'Mariana Silveira (RH)',
      action: 'RH rejeitou Comprovante de residência',
      employeeName: 'Rodrigo Santoro Maia',
      documentType: 'Comprovante de residência',
      details: 'Motivo: Documento ilegível. Observação: Comprovante emitido há mais de 90 dias e com foto embaçada.'
    }
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif-01',
      timestamp: new Date(Date.now() - 1 * 86400000).toISOString(),
      title: 'Documento aguardando conferência',
      message: 'Camila Fernandes Rocha enviou 3 novos documentos para análise.',
      type: 'document_uploaded',
      admissionId: 'adm-02',
      read: false,
      link: '/admissoes/adm-02'
    },
    {
      id: 'notif-02',
      timestamp: new Date(Date.now() - 1 * 86400000).toISOString(),
      title: 'Pendência gerada',
      message: 'Comprovante de residência de Rodrigo Santoro Maia foi recusado.',
      type: 'pending',
      admissionId: 'adm-03',
      read: true,
      link: '/admissoes/adm-03'
    }
  ];

  const initialJobPositions: JobPosition[] = INITIAL_JOB_POSITIONS.map((jp, idx) => ({
    id: 'job-' + (idx + 1).toString().padStart(2, '0'),
    name: jp.name,
    code: jp.code,
    description: jp.description,
    active: jp.active,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'Sistema',
    updatedBy: 'Sistema'
  }));

  const initialDocTypes: DocumentTypeItem[] = INITIAL_DOCUMENT_TYPES.map((dt, idx) => ({
    id: 'doc-type-' + (idx + 1).toString().padStart(2, '0'),
    name: dt.name,
    description: dt.description,
    category: dt.category,
    required_by_default: dt.required_by_default,
    active: dt.active,
    allowed_file_types: [...dt.allowed_file_types],
    max_file_size_mb: dt.max_file_size_mb,
    requires_expiration_date: dt.requires_expiration_date,
    sort_order: dt.sort_order,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'Sistema',
    updated_by: 'Sistema'
  }));

  const initialJobPositionDocs = buildDefaultJobPositionDocuments(initialJobPositions, initialDocTypes);

  return {
    users: [userRaitzRH, adminUser, userAdminRaitz],
    employees: [emp1, emp2, emp3],
    admissions: [adm1, adm2, adm3],
    auditLogs,
    notifications,
    consentRecords: [],
    jobPositions: initialJobPositions,
    documentTypes: initialDocTypes,
    jobPositionDocuments: initialJobPositionDocs,
    communicationLogs: [],
    settings: generateDefaultSettings()
  };
}

export function buildDefaultJobPositionDocuments(
  jobPositions: JobPosition[],
  docTypes: DocumentTypeItem[]
): JobPositionDocument[] {
  const list: JobPositionDocument[] = [];
  const now = new Date().toISOString();

  const eletricista = jobPositions.find(p => p.name.toLowerCase().includes('eletricista') || p.code === 'MAN-001');
  const auxiliarAdm = jobPositions.find(p => p.name.toLowerCase().includes('auxiliar administrativo') || p.code === 'ADM-001');

  const getDoc = (prefix: string) => docTypes.find(d => d.name.toLowerCase().startsWith(prefix.toLowerCase()));

  const cpf = getDoc('CPF');
  const rg = getDoc('RG');
  const ctps = getDoc('Carteira de Trabalho');
  const compRes = getDoc('Comprovante de Residência');
  const nr10 = getDoc('NR10');
  const nr35 = getDoc('NR35');
  const diploma = getDoc('Diploma');

  // Cenário 1: Eletricista
  // 1. CPF — obrigatório
  // 2. RG — obrigatório
  // 3. Carteira de Trabalho — obrigatório
  // 4. Comprovante de Residência — obrigatório
  // 5. NR10 — obrigatório
  // 6. NR35 — obrigatório
  // 7. Diploma — opcional
  if (eletricista) {
    if (cpf) {
      list.push({
        id: 'jpd-elet-01',
        job_position_id: eletricista.id,
        document_type_id: cpf.id,
        required: true,
        sort_order: 1,
        active: true,
        created_at: now,
        updated_at: now,
        created_by: 'Sistema',
        updated_by: 'Sistema'
      });
    }
    if (rg) {
      list.push({
        id: 'jpd-elet-02',
        job_position_id: eletricista.id,
        document_type_id: rg.id,
        required: true,
        sort_order: 2,
        active: true,
        created_at: now,
        updated_at: now,
        created_by: 'Sistema',
        updated_by: 'Sistema'
      });
    }
    if (ctps) {
      list.push({
        id: 'jpd-elet-03',
        job_position_id: eletricista.id,
        document_type_id: ctps.id,
        required: true,
        sort_order: 3,
        active: true,
        created_at: now,
        updated_at: now,
        created_by: 'Sistema',
        updated_by: 'Sistema'
      });
    }
    if (compRes) {
      list.push({
        id: 'jpd-elet-04',
        job_position_id: eletricista.id,
        document_type_id: compRes.id,
        required: true,
        sort_order: 4,
        instructions: 'Comprovante recente emitido nos últimos 90 dias (luz, água ou gás).',
        active: true,
        created_at: now,
        updated_at: now,
        created_by: 'Sistema',
        updated_by: 'Sistema'
      });
    }
    if (nr10) {
      list.push({
        id: 'jpd-elet-05',
        job_position_id: eletricista.id,
        document_type_id: nr10.id,
        required: true,
        sort_order: 5,
        instructions: 'Certificado de NR10 válido e legível (básico ou reciclagem de 40h).',
        active: true,
        created_at: now,
        updated_at: now,
        created_by: 'Sistema',
        updated_by: 'Sistema'
      });
    }
    if (nr35) {
      list.push({
        id: 'jpd-elet-06',
        job_position_id: eletricista.id,
        document_type_id: nr35.id,
        required: true,
        sort_order: 6,
        instructions: 'Certificado de capacitação NR35 dentro da validade bienal.',
        active: true,
        created_at: now,
        updated_at: now,
        created_by: 'Sistema',
        updated_by: 'Sistema'
      });
    }
    if (diploma) {
      list.push({
        id: 'jpd-elet-07',
        job_position_id: eletricista.id,
        document_type_id: diploma.id,
        required: false,
        sort_order: 7,
        instructions: 'Curso técnico em eletrotécnica ou qualificação correlata.',
        active: true,
        created_at: now,
        updated_at: now,
        created_by: 'Sistema',
        updated_by: 'Sistema'
      });
    }
  }

  // Cenário 2: Auxiliar Administrativo
  // 1. CPF — obrigatório
  // 2. RG — obrigatório
  // 3. Carteira de Trabalho — obrigatório
  // 4. Comprovante de Residência — obrigatório
  // 5. Diploma — opcional
  if (auxiliarAdm) {
    if (cpf) {
      list.push({
        id: 'jpd-adm-01',
        job_position_id: auxiliarAdm.id,
        document_type_id: cpf.id,
        required: true,
        sort_order: 1,
        active: true,
        created_at: now,
        updated_at: now,
        created_by: 'Sistema',
        updated_by: 'Sistema'
      });
    }
    if (rg) {
      list.push({
        id: 'jpd-adm-02',
        job_position_id: auxiliarAdm.id,
        document_type_id: rg.id,
        required: true,
        sort_order: 2,
        active: true,
        created_at: now,
        updated_at: now,
        created_by: 'Sistema',
        updated_by: 'Sistema'
      });
    }
    if (ctps) {
      list.push({
        id: 'jpd-adm-03',
        job_position_id: auxiliarAdm.id,
        document_type_id: ctps.id,
        required: true,
        sort_order: 3,
        active: true,
        created_at: now,
        updated_at: now,
        created_by: 'Sistema',
        updated_by: 'Sistema'
      });
    }
    if (compRes) {
      list.push({
        id: 'jpd-adm-04',
        job_position_id: auxiliarAdm.id,
        document_type_id: compRes.id,
        required: true,
        sort_order: 4,
        instructions: 'Comprovante de residência atualizado em nome do colaborador ou familiares.',
        active: true,
        created_at: now,
        updated_at: now,
        created_by: 'Sistema',
        updated_by: 'Sistema'
      });
    }
    if (diploma) {
      list.push({
        id: 'jpd-adm-05',
        job_position_id: auxiliarAdm.id,
        document_type_id: diploma.id,
        required: false,
        sort_order: 5,
        instructions: 'Comprovante de escolaridade (Ensino Médio ou Superior).',
        active: true,
        created_at: now,
        updated_at: now,
        created_by: 'Sistema',
        updated_by: 'Sistema'
      });
    }
  }

  return list;
}

export class Database {
  private data: DatabaseSchema;
  private activeAutomationLocks = new Set<string>();
  private automationDeduplicationCache = new Map<string, number>();

  private tryAcquireAutomationLock(key: string, minIntervalMs = 2000): boolean {
    if (this.activeAutomationLocks.has(key)) {
      return false; // Bloqueio ativo: previne concorrência simultânea
    }
    const lastRan = this.automationDeduplicationCache.get(key);
    const now = Date.now();
    if (lastRan && now - lastRan < minIntervalMs) {
      return false; // Previne duplicidade de eventos repetidos em curto intervalo (idempotência)
    }
    this.activeAutomationLocks.add(key);
    return true;
  }

  private releaseAutomationLock(key: string): void {
    this.activeAutomationLocks.delete(key);
    this.automationDeduplicationCache.set(key, Date.now());
    if (this.automationDeduplicationCache.size > 200) {
      const cutoff = Date.now() - 60000;
      for (const [k, ts] of this.automationDeduplicationCache.entries()) {
        if (ts < cutoff) {
          this.automationDeduplicationCache.delete(k);
        }
      }
    }
  }

  constructor() {
    ensureDirectories();
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.users) this.data.users = [];
        if (!this.data.communicationLogs) this.data.communicationLogs = [];
        if (!this.data.operationalTasks) this.data.operationalTasks = [];
        if (!this.data.automationExecutions) this.data.automationExecutions = [];

        if (this.data.settings && !this.data.settings.automations) {
          this.data.settings.automations = {
            DOCUMENT_REJECTED: true,
            DOCUMENT_RESUBMITTED: true,
            ALL_REQUIRED_DOCUMENTS_APPROVED: false,
            APPROVAL_COMPLETED: false,
            TASK_COMPLETED: false
          };
        }

        // Garante a existência e integridade dos cargos (Job Positions)
        if (!this.data.jobPositions || this.data.jobPositions.length === 0) {
          this.data.jobPositions = INITIAL_JOB_POSITIONS.map((jp, idx) => ({
            id: 'job-' + (idx + 1).toString().padStart(2, '0'),
            name: jp.name,
            code: jp.code,
            description: jp.description,
            active: jp.active,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'Sistema',
            updatedBy: 'Sistema'
          }));
          this.save();
        }

        // Garante a existência e integridade dos Tipos de Documentos (Bloco 3.2)
        if (!this.data.documentTypes || this.data.documentTypes.length === 0) {
          this.data.documentTypes = INITIAL_DOCUMENT_TYPES.map((dt, idx) => ({
            id: 'doc-type-' + (idx + 1).toString().padStart(2, '0'),
            name: dt.name,
            description: dt.description,
            category: dt.category,
            required_by_default: dt.required_by_default,
            active: dt.active,
            allowed_file_types: [...dt.allowed_file_types],
            max_file_size_mb: dt.max_file_size_mb,
            requires_expiration_date: dt.requires_expiration_date,
            sort_order: dt.sort_order,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'Sistema',
            updated_by: 'Sistema'
          }));
          this.save();
        }

        // Garante a existência e integridade do Checklist de Documentos por Cargo (Bloco 3.3)
        if (!this.data.jobPositionDocuments || this.data.jobPositionDocuments.length === 0) {
          this.data.jobPositionDocuments = buildDefaultJobPositionDocuments(
            this.data.jobPositions || [],
            this.data.documentTypes || []
          );
          this.save();
        }

        // Garante a remoção de usuários obsoletos
        this.data.users = this.data.users.filter(u => u.email.toLowerCase() !== 'microwasmel@gmail.com');

        // Garante a existência dos usuários padrão de RH (Bloco 6.4)
        const defaultUsers = [
          {
            id: 'user-rh-00',
            email: 'rh@galvanizacaoraitz.com.br',
            name: 'RH Galvanização Raitz',
            role: 'RH' as const,
            department: 'Recursos Humanos / Gente & Gestão',
            active: true
          },
          {
            id: 'user-rh-03',
            email: 'admin@raitz.com.br',
            name: 'Coordenação Raitz RH',
            role: 'RH' as const,
            department: 'Recursos Humanos',
            active: true
          },
          {
            id: 'user-rh-01',
            email: 'rh@empresa.com',
            name: 'Mariana Silveira',
            role: 'RH' as const,
            department: 'Recursos Humanos',
            active: true
          },
          {
            id: 'user-rh-04',
            email: 'carlos.mendes@raitz.com.br',
            name: 'Carlos Eduardo Mendes',
            role: 'RH_CONFERENCIA' as const,
            department: 'Conferência Documental',
            active: true
          },
          {
            id: 'user-rh-05',
            email: 'patricia.duarte@raitz.com.br',
            name: 'Patrícia Duarte',
            role: 'GESTOR' as const,
            department: 'Gente e Gestão',
            active: true
          },
          {
            id: 'user-rh-06',
            email: 'roberto.dias@raitz.com.br',
            name: 'Roberto Dias (Inativo)',
            role: 'RH' as const,
            department: 'Recursos Humanos',
            active: false
          }
        ];

        let updated = false;
        for (const def of defaultUsers) {
          const existing = this.data.users.find(u => u.email.toLowerCase() === def.email.toLowerCase());
          if (!existing) {
            this.data.users.push({
              id: def.id,
              email: def.email,
              name: def.name,
              role: def.role,
              department: def.department,
              active: def.active,
              createdAt: new Date().toISOString()
            });
            updated = true;
          } else {
            if (existing.active === undefined) {
              existing.active = def.active;
              updated = true;
            }
          }
        }

        // Garante que todos os usuários tenham flag active definida
        this.data.users.forEach(u => {
          if (u.active === undefined) {
            u.active = true;
            updated = true;
          }
        });

        // Inicializa atribuições iniciais em admissões que ainda não possuem responsável definido (Bloco 6.4)
        if (this.data.admissions && this.data.admissions.length > 0) {
          const mariana = this.data.users.find(u => u.name === 'Mariana Silveira') || this.data.users[0];
          const carlos = this.data.users.find(u => u.role === 'RH_CONFERENCIA') || mariana;

          this.data.admissions.forEach((adm, idx) => {
            if (!adm.assignmentsHistory) {
              adm.assignmentsHistory = [];
            }
            // Não atribui todas para manter admissões "Sem Responsável" (requisito do bloco)
            // adm-01 ou múltiplos de 4 ficam sem responsável
            if (!adm.responsibleUserId && idx % 4 !== 0 && adm.status !== 'Cancelada') {
              const assignedUser = (idx % 2 === 0) ? carlos : mariana;
              adm.responsibleUserId = assignedUser.id;
              adm.responsibleUserName = assignedUser.name;
              adm.responsibleUserEmail = assignedUser.email;
              adm.assignedAt = adm.createdAt || new Date().toISOString();
              adm.assignedBy = 'Sistema';
              adm.assignmentReason = 'Distribuição operacional inicial de admissões';
              adm.assignmentsHistory.push({
                id: 'asgn-init-' + (adm.id || idx),
                admissionId: adm.id,
                action: 'ASSIGNED',
                newUserId: assignedUser.id,
                newUserName: assignedUser.name,
                assignedByUserName: 'Sistema',
                assignedAt: adm.createdAt || new Date().toISOString(),
                reason: 'Atribuição automática inicial'
              });
              updated = true;
            }
          });
        }

        if (updated) {
          this.save();
        }

        // Garante a existência das Configurações Operacionais (Bloco 4.6)
        if (!this.data.settings) {
          this.data.settings = generateDefaultSettings();
          this.save();
        }

        // Garante a existência e integridade dos Funcionários (Parte 5 - Bloco 5.1)
        if (!this.data.employees) {
          this.data.employees = [];
        }
        let employeesNeedSave = false;
        for (const adm of (this.data.admissions || [])) {
          if (adm.employee) {
            const cleanCpf = adm.employee.cpf.replace(/\D/g, '');
            const existingEmp = this.data.employees.find(e => e.id === adm.employeeId || e.cpf.replace(/\D/g, '') === cleanCpf);
            if (!existingEmp) {
              this.data.employees.push({
                ...adm.employee,
                active: true,
                status: 'Ativo'
              });
              employeesNeedSave = true;
            }
          }
        }
        this.data.employees.forEach(emp => {
          if (emp.active === undefined) {
            emp.active = true;
            employeesNeedSave = true;
          }
          if (!emp.status) {
            emp.status = emp.active ? 'Ativo' : 'Inativo';
            employeesNeedSave = true;
          }
        });
        if (employeesNeedSave) {
          this.save();
        }
      } catch (e) {
        console.warn('Falha ao ler db.json, inicializando com dados mestres estruturados:', e);
        this.data = JSON.parse(JSON.stringify(initialDbData));
        this.save();
      }
    } else {
      this.data = JSON.parse(JSON.stringify(initialDbData));
      this.save();
    }

    // Inicialização do Processo Admissional Configurável (Bloco 5.4)
    this.ensureAdmissionProcessInitialized();

    // Inicialização da Aprovação Interna (Bloco 5.6)
    this.ensureApprovalsInitialized();
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      // Ambientes serverless com sistema de arquivos somente leitura (ex: Vercel Lambda / AWS)
      try {
        const tmpDir = '/tmp/admissao_data';
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
        fs.writeFileSync(path.join(tmpDir, 'db.json'), JSON.stringify(this.data, null, 2), 'utf-8');
      } catch {
        // Modo somente leitura: dados permanecem em memória sem quebrar a execução
      }
    }
  }

  // =========================================================================
  // BLOCO 5.4 — PROCESSO ADMISSIONAL CONFIGURÁVEL (Métodos de Gestão e Snapshot)
  // =========================================================================

  private ensureAdmissionProcessInitialized() {
    let needsSave = false;
    const now = new Date().toISOString();
    const v1Id = 'proc-ver-1';

    if (!this.data.admissionProcessVersions || this.data.admissionProcessVersions.length === 0) {
      const v1: AdmissionProcessVersion = {
        id: v1Id,
        versionNumber: 1,
        status: 'ativa',
        description: 'Versão inicial padrão do processo admissional em 6 etapas estruturadas.',
        changeNotes: 'Configuração inicial padrão do sistema (Bloco 5.4)',
        createdAt: '2026-01-01T00:00:00.000Z',
        createdBy: 'Sistema',
        steps: JSON.parse(JSON.stringify(DEFAULT_ADMISSION_PROCESS_STEPS))
      };
      this.data.admissionProcessVersions = [v1];
      needsSave = true;
    }

    if (!this.data.admissionProcess) {
      this.data.admissionProcess = {
        id: 'processo-padrao',
        name: 'Processo Admissional Padrão',
        description: 'Fluxo operacional de admissão digital com etapas auditadas, versionamento e controle rigoroso de avanço.',
        currentVersion: 1,
        activeVersionId: this.data.admissionProcessVersions[0].id,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: now,
        updatedBy: 'Sistema'
      };
      needsSave = true;
    }

    // Migração e retrocompatibilidade segura para admissões existentes
    const activeVer = this.data.admissionProcessVersions.find(v => v.id === this.data.admissionProcess?.activeVersionId) || this.data.admissionProcessVersions[0];

    for (const adm of (this.data.admissions || [])) {
      if (!adm.processSteps || adm.processSteps.length === 0) {
        adm.processVersionId = activeVer.id;
        adm.processVersionNumber = activeVer.versionNumber;

        const steps: AdmissionProcessStepSnapshot[] = activeVer.steps
          .filter(s => s.active)
          .sort((a, b) => a.order - b.order)
          .map((s) => {
            let stepStatus: ProcessStepStatus = 'PENDENTE';
            let completedAt: string | undefined;
            let completedBy: string | undefined;
            let startedAt: string | undefined;

            // CADASTRO: concluído no ato da abertura
            if (s.stepKey === 'CADASTRO') {
              stepStatus = 'CONCLUIDA';
              startedAt = adm.createdAt;
              completedAt = adm.createdAt;
              completedBy = 'RH';
            } else if (s.stepKey === 'DADOS_PESSOAIS') {
              if (adm.dataConfirmed || adm.status === 'Em conferência' || adm.status === 'Concluída') {
                stepStatus = 'CONCLUIDA';
                startedAt = adm.createdAt;
                completedAt = adm.dataConfirmedAt || adm.createdAt;
                completedBy = adm.employee?.name || 'Colaborador';
              } else if (adm.status === 'Aguardando documentos' || adm.status === 'Rascunho') {
                stepStatus = 'EM_ANDAMENTO';
                startedAt = adm.createdAt;
              }
            } else if (s.stepKey === 'DOCUMENTOS') {
              if (adm.status === 'Concluída' || (adm.documents && adm.documents.length > 0 && adm.documents.filter(d => d.required).every(d => d.status === 'Aprovado'))) {
                stepStatus = 'CONCLUIDA';
                startedAt = adm.createdAt;
                completedAt = adm.updatedAt || adm.createdAt;
                completedBy = 'RH';
              } else if (adm.dataConfirmed || adm.status === 'Em conferência') {
                stepStatus = 'EM_ANDAMENTO';
                startedAt = adm.dataConfirmedAt || adm.createdAt;
              } else if (adm.status === 'Pendência') {
                stepStatus = 'EM_ANDAMENTO';
                startedAt = adm.createdAt;
              }
            } else if (s.stepKey === 'CONFERENCIA') {
              if (adm.status === 'Concluída') {
                stepStatus = 'CONCLUIDA';
                completedAt = adm.completedAt || adm.updatedAt;
                completedBy = adm.completedBy || 'RH';
              } else if (adm.status === 'Em conferência') {
                stepStatus = 'EM_ANDAMENTO';
                startedAt = adm.updatedAt || adm.createdAt;
              }
            } else if (s.stepKey === 'APROVACAO') {
              if (adm.status === 'Concluída') {
                stepStatus = 'CONCLUIDA';
                completedAt = adm.completedAt || adm.updatedAt;
                completedBy = adm.completedBy || 'Gestor';
              }
            } else if (s.stepKey === 'CONCLUSAO') {
              if (adm.status === 'Concluída') {
                stepStatus = 'CONCLUIDA';
                completedAt = adm.completedAt || adm.updatedAt;
                completedBy = adm.completedBy || 'Sistema';
              }
            }

            let blockReason: string | undefined;
            if (adm.status === 'Pendência' && (s.stepKey === 'DOCUMENTOS' || s.stepKey === 'CONFERENCIA')) {
              blockReason = 'Existem pendências ou documentos rejeitados na admissão.';
            }

            return {
              id: 'step-snap-' + crypto.randomUUID(),
              admissionId: adm.id,
              processVersionId: activeVer.id,
              processVersionNumber: activeVer.versionNumber,
              stepKey: s.stepKey,
              stepName: s.name,
              stepDescription: s.description,
              stepOrder: s.order,
              required: s.required,
              responsibleRole: s.responsibleRole,
              completionRule: s.completionRule,
              status: stepStatus,
              blockReason,
              startedAt,
              completedAt,
              completedBy,
              history: [
                {
                  action: stepStatus === 'CONCLUIDA' ? 'concluida' : 'iniciada',
                  timestamp: adm.createdAt,
                  userName: 'Sistema',
                  details: `Etapa inicializada no snapshot do processo admissional (Versão ${activeVer.versionNumber}).`
                }
              ]
            };
          });

        if (adm.status !== 'Concluída' && adm.status !== 'Cancelada') {
          const hasInProgress = steps.some(st => st.status === 'EM_ANDAMENTO');
          if (!hasInProgress) {
            const firstPending = steps.find(st => st.status === 'PENDENTE');
            if (firstPending) {
              firstPending.status = 'EM_ANDAMENTO';
              firstPending.startedAt = now;
            }
          }
        }

        adm.processSteps = steps;
        const currentStep = steps.find(st => st.status === 'EM_ANDAMENTO') || steps[steps.length - 1];
        adm.currentStepKey = currentStep?.stepKey;
        needsSave = true;
      }
    }

    if (needsSave) {
      this.save();
    }
  }

  // =========================================================================
  // BLOCO 5.6 — APROVAÇÃO INTERNA: Inicialização de Snapshot
  // =========================================================================

  private ensureApprovalsInitialized() {
    let needsSave = false;
    const now = new Date().toISOString();

    for (const adm of (this.data.admissions || [])) {
      if (!adm.approval) {
        const approvalStep = (adm.processSteps || []).find(s => s.stepKey === 'APROVACAO');
        if (approvalStep) {
          let status: ApprovalStatus = 'PENDENTE';
          let decidedAt: string | undefined;
          let decidedBy: string | undefined;
          let decisionReason: string | undefined;
          let startedAt: string | undefined;

          if (adm.status === 'Concluída') {
            status = 'APROVADA';
            decidedAt = adm.completedAt || adm.updatedAt || adm.createdAt;
            decidedBy = adm.completedBy || 'Gestor Responsável';
          } else if (adm.status === 'Cancelada') {
            status = 'CANCELADA';
            decidedAt = adm.cancelledAt || adm.updatedAt;
            decidedBy = adm.cancelledBy || 'RH';
            decisionReason = adm.cancellationReason;
          } else if (approvalStep.status === 'CONCLUIDA') {
            status = 'APROVADA';
            decidedAt = approvalStep.completedAt || now;
            decidedBy = approvalStep.completedBy || 'Gestor Responsável';
          } else if (approvalStep.status === 'BLOQUEADA' && approvalStep.blockReason?.includes('Reprovada')) {
            status = 'REPROVADA';
            decidedAt = approvalStep.history?.[approvalStep.history.length - 1]?.timestamp || now;
            decidedBy = approvalStep.history?.[approvalStep.history.length - 1]?.userName || 'Gestor Responsável';
            decisionReason = approvalStep.blockReason;
          } else if (approvalStep.status === 'EM_ANDAMENTO') {
            status = 'EM_ANALISE';
            startedAt = approvalStep.startedAt || now;
          }

          const approval: AdmissionApproval = {
            id: 'appr-' + adm.id,
            admissionId: adm.id,
            processStepId: approvalStep.id,
            approvalType: 'GESTOR',
            title: 'Aprovação da Gestão / Diretoria',
            description: 'Validação final e parecer formal sobre o ingresso do colaborador.',
            status,
            required: approvalStep.required ?? true,
            responsibleRole: (approvalStep.responsibleRole as ApprovalResponsibleRole) || 'GESTOR',
            requestedAt: adm.createdAt,
            startedAt,
            decidedAt,
            decidedBy,
            decisionReason,
            configurationSnapshot: {
              versionNumber: adm.processVersionNumber || 1,
              stepName: approvalStep.stepName,
              allowRejection: true,
              requireRejectionReason: true
            },
            createdAt: adm.createdAt,
            updatedAt: now,
            history: [
              {
                id: 'hist-appr-init-' + crypto.randomUUID(),
                action: status === 'APROVADA' ? 'APROVADA' : (status === 'CANCELADA' ? 'CANCELADA' : 'SOLICITADA'),
                timestamp: adm.createdAt,
                userName: status === 'APROVADA' ? (decidedBy || 'Sistema') : 'Sistema',
                newStatus: status,
                notes: 'Aprovação interna inicializada no snapshot do processo admissional.'
              }
            ]
          };

          adm.approval = approval;
          needsSave = true;
        }
      }
    }

    if (needsSave) {
      this.save();
    }
  }

  getAdmissionProcess(): AdmissionProcessResponse {
    this.ensureAdmissionProcessInitialized();
    const process = this.data.admissionProcess!;
    const allVersions = (this.data.admissionProcessVersions || []).sort((a, b) => b.versionNumber - a.versionNumber);
    const activeVersion = allVersions.find(v => v.id === process.activeVersionId) || allVersions[0];

    return {
      process,
      activeVersion,
      allVersions
    };
  }

  getActiveAdmissionProcessVersion(): AdmissionProcessVersion {
    this.ensureAdmissionProcessInitialized();
    const process = this.data.admissionProcess!;
    const allVersions = this.data.admissionProcessVersions || [];
    const activeVersion = allVersions.find(v => v.id === process.activeVersionId);
    if (activeVersion) return activeVersion;
    if (allVersions.length > 0) return allVersions[0];

    return {
      id: 'proc-ver-1',
      versionNumber: 1,
      status: 'ativa',
      description: 'Versão inicial padrão do processo admissional.',
      createdAt: new Date().toISOString(),
      createdBy: 'Sistema',
      steps: JSON.parse(JSON.stringify(DEFAULT_ADMISSION_PROCESS_STEPS))
    };
  }

  createAdmissionProcessVersion(
    steps: ConfigurableProcessStep[], 
    changeNotes: string, 
    userName: string
  ): AdmissionProcessVersion {
    this.ensureAdmissionProcessInitialized();

    if (!Array.isArray(steps) || steps.length < 2) {
      throw new Error('O processo admissional deve possuir pelo menos 2 etapas configuradas.');
    }

    const activeSteps = steps.filter(s => s.active);
    if (activeSteps.length < 2) {
      throw new Error('É necessário que pelo menos 2 etapas estejam ativas no processo.');
    }

    const requiredSteps = activeSteps.filter(s => s.required);
    if (requiredSteps.length < 1) {
      throw new Error('Pelo menos uma etapa ativa deve ser marcada como obrigatória.');
    }

    // Validação de nomes e keys
    const seenKeys = new Set<string>();
    steps.forEach((s, idx) => {
      if (!s.name || !s.name.trim()) {
        throw new Error(`A etapa ${idx + 1} possui nome em branco.`);
      }
      if (!s.stepKey || !s.stepKey.trim()) {
        throw new Error(`A etapa "${s.name}" possui identificador estável inválido.`);
      }
      const upperKey = s.stepKey.trim().toUpperCase();
      if (seenKeys.has(upperKey)) {
        throw new Error(`Identificador estável duplicado: "${upperKey}". Cada etapa deve ter um identificador único.`);
      }
      seenKeys.add(upperKey);
    });

    const currentVersionNumber = this.data.admissionProcess?.currentVersion || 1;
    const newVersionNumber = currentVersionNumber + 1;
    const now = new Date().toISOString();
    const newVersionId = 'proc-ver-' + newVersionNumber;

    // Normaliza ordens sequenciais
    const normalizedSteps: ConfigurableProcessStep[] = steps.map((s, idx) => ({
      ...s,
      id: s.id || ('step-' + crypto.randomUUID()),
      stepKey: s.stepKey.trim().toUpperCase() as ProcessStepKey,
      name: s.name.trim(),
      description: s.description ? s.description.trim() : '',
      order: idx + 1
    }));

    // Cria a nova versão ativa
    const newVersion: AdmissionProcessVersion = {
      id: newVersionId,
      versionNumber: newVersionNumber,
      status: 'ativa',
      description: `Versão ${newVersionNumber} do Processo Admissional`,
      changeNotes: changeNotes ? changeNotes.trim() : 'Atualização estrutural nas etapas do processo.',
      createdAt: now,
      createdBy: userName,
      steps: normalizedSteps
    };

    // Marca versões anteriores como 'historica'
    if (this.data.admissionProcessVersions) {
      this.data.admissionProcessVersions.forEach(v => {
        v.status = 'historica';
      });
    } else {
      this.data.admissionProcessVersions = [];
    }

    this.data.admissionProcessVersions.unshift(newVersion);

    // Atualiza a configuração do processo
    if (this.data.admissionProcess) {
      this.data.admissionProcess.currentVersion = newVersionNumber;
      this.data.admissionProcess.activeVersionId = newVersionId;
      this.data.admissionProcess.updatedAt = now;
      this.data.admissionProcess.updatedBy = userName;
    } else {
      this.data.admissionProcess = {
        id: 'processo-padrao',
        name: 'Processo Admissional Padrão',
        currentVersion: newVersionNumber,
        activeVersionId: newVersionId,
        createdAt: now,
        updatedAt: now,
        updatedBy: userName
      };
    }

    // REGRA CRÍTICA (Seção 2): NÃO altera admissões existentes!
    // Admissões criadas anteriormente mantêm intacto o snapshot de sua versão.

    // Auditoria
    this.addAuditLog({
      userName,
      action: 'admission_process_version_created',
      entityType: 'admission_process',
      entityId: newVersionId,
      entityName: `Processo Admissional Versão ${newVersionNumber}`,
      fieldChanged: 'versão do processo',
      previousValue: `Versão ${currentVersionNumber}`,
      newValue: `Versão ${newVersionNumber}`,
      details: `Nova versão (${newVersionNumber}) do Processo Admissional criada por ${userName}. Total de etapas: ${normalizedSteps.length} (${activeSteps.length} ativas). Motivo: "${changeNotes || 'Atualização das etapas'}"`
    });

    this.save();
    return newVersion;
  }

  evaluateAdmissionProcessSteps(admission: Admission, userName: string = 'Sistema'): boolean {
    if (!admission.processSteps || admission.processSteps.length === 0) {
      return false;
    }

    let modified = false;
    const now = new Date().toISOString();

    // 1. Etapa CADASTRO: sempre concluída
    const cadastroStep = admission.processSteps.find(s => s.stepKey === 'CADASTRO');
    if (cadastroStep && cadastroStep.status !== 'CONCLUIDA') {
      cadastroStep.status = 'CONCLUIDA';
      cadastroStep.completedAt = cadastroStep.completedAt || admission.createdAt;
      cadastroStep.completedBy = cadastroStep.completedBy || 'RH';
      modified = true;
    }

    // 2. Etapa DADOS_PESSOAIS: se dataConfirmed for true, concluir
    const dadosStep = admission.processSteps.find(s => s.stepKey === 'DADOS_PESSOAIS');
    if (dadosStep) {
      if (admission.dataConfirmed && dadosStep.status !== 'CONCLUIDA') {
        dadosStep.status = 'CONCLUIDA';
        dadosStep.completedAt = admission.dataConfirmedAt || now;
        dadosStep.completedBy = admission.employee?.name || 'Colaborador';
        dadosStep.history = dadosStep.history || [];
        dadosStep.history.push({
          action: 'concluida',
          timestamp: now,
          userName: userName || 'Colaborador',
          details: 'Dados cadastrais confirmados pelo colaborador.'
        });
        modified = true;

        // Se a próxima etapa (DOCUMENTOS) for PENDENTE, avança para EM_ANDAMENTO
        const docsStep = admission.processSteps.find(s => s.stepKey === 'DOCUMENTOS');
        if (docsStep && docsStep.status === 'PENDENTE') {
          docsStep.status = 'EM_ANDAMENTO';
          docsStep.startedAt = now;
          docsStep.history = docsStep.history || [];
          docsStep.history.push({
            action: 'iniciada',
            timestamp: now,
            userName: 'Sistema',
            details: 'Iniciada automaticamente após confirmação de dados cadastrais.'
          });
        }
      }
    }

    // 3. Etapa DOCUMENTOS
    const docsStep = admission.processSteps.find(s => s.stepKey === 'DOCUMENTOS');
    if (docsStep) {
      const requiredDocs = (admission.documents || []).filter(d => d.required);
      const allRequiredApproved = requiredDocs.length > 0 && requiredDocs.every(d => d.status === 'Aprovado');
      const anyRejected = (admission.documents || []).some(d => d.status === 'Rejeitado');

      if (anyRejected) {
        docsStep.blockReason = 'Existem documentos com status "Rejeitado" que precisam de reenvio pelo colaborador.';
      } else {
        docsStep.blockReason = undefined;
      }

      if (allRequiredApproved && docsStep.status !== 'CONCLUIDA') {
        docsStep.status = 'CONCLUIDA';
        docsStep.completedAt = now;
        docsStep.completedBy = userName || 'Sistema';
        docsStep.blockReason = undefined;
        docsStep.history = docsStep.history || [];
        docsStep.history.push({
          action: 'concluida',
          timestamp: now,
          userName: userName || 'Sistema',
          details: 'Todos os documentos obrigatórios foram aprovados pela equipe.'
        });
        modified = true;

        // Se a próxima etapa (CONFERENCIA) for PENDENTE ou BLOQUEADA, avança para EM_ANDAMENTO
        const confStep = admission.processSteps.find(s => s.stepKey === 'CONFERENCIA');
        if (confStep && (confStep.status === 'PENDENTE' || confStep.status === 'BLOQUEADA')) {
          confStep.status = 'EM_ANDAMENTO';
          confStep.startedAt = now;
          confStep.blockReason = undefined;
          confStep.history = confStep.history || [];
          confStep.history.push({
            action: 'iniciada',
            timestamp: now,
            userName: 'Sistema',
            details: 'Iniciada automaticamente após aprovação de todos os documentos obrigatórios.'
          });
        }
      }
    }

    // 4. Se a admissão está Concluída, garante que todas as etapas ativas estejam CONCLUIDA
    if (admission.status === 'Concluída') {
      for (const st of admission.processSteps) {
        if (st.status !== 'CONCLUIDA' && st.status !== 'IGNORADA') {
          st.status = 'CONCLUIDA';
          st.completedAt = st.completedAt || admission.completedAt || now;
          st.completedBy = st.completedBy || admission.completedBy || 'Sistema';
          modified = true;
        }
      }
    }

    // Atualiza currentStepKey
    const inProgressStep = admission.processSteps.find(s => s.status === 'EM_ANDAMENTO');
    if (inProgressStep) {
      admission.currentStepKey = inProgressStep.stepKey;
    } else {
      const lastStep = admission.processSteps[admission.processSteps.length - 1];
      admission.currentStepKey = lastStep?.stepKey;
    }

    return modified;
  }

  completeAdmissionProcessStep(
    admissionId: string, 
    stepId: string, 
    userName: string, 
    notes?: string
  ): { admission: Admission; step: AdmissionProcessStepSnapshot } {
    const admission = this.getAdmissionById(admissionId);
    if (!admission) throw new Error('Admissão não encontrada.');

    if (!admission.processSteps || admission.processSteps.length === 0) {
      throw new Error('Nenhuma etapa de processo vinculada a esta admissão.');
    }

    const stepIndex = admission.processSteps.findIndex(s => s.id === stepId || s.stepKey === stepId);
    if (stepIndex === -1) {
      throw new Error('Etapa do processo não encontrada nesta admissão.');
    }

    const step = admission.processSteps[stepIndex];
    if (step.status === 'CONCLUIDA') {
      throw new Error(`A etapa "${step.stepName}" já está concluída.`);
    }

    // Regra de dependência: etapas anteriores obrigatórias devem estar concluídas
    for (let i = 0; i < stepIndex; i++) {
      const priorStep = admission.processSteps[i];
      if (priorStep.required && priorStep.status !== 'CONCLUIDA' && priorStep.status !== 'IGNORADA') {
        throw new Error(`Não é possível concluir a etapa "${step.stepName}": a etapa anterior obrigatória "${priorStep.stepName}" ainda está ${priorStep.status.toLowerCase()}.`);
      }
    }

    // Validações de Regras Específicas
    if (step.completionRule === 'DOCUMENTOS_APROVADOS') {
      const requiredDocs = (admission.documents || []).filter(d => d.required);
      const notApproved = requiredDocs.filter(d => d.status !== 'Aprovado');
      if (notApproved.length > 0) {
        throw new Error(`Não é possível concluir: ainda existem ${notApproved.length} documentos obrigatórios não aprovados.`);
      }
    } else if (step.completionRule === 'DADOS_PREENCHIDOS') {
      if (!admission.dataConfirmed) {
        admission.dataConfirmed = true;
        admission.dataConfirmedAt = new Date().toISOString();
      }
    }

    const now = new Date().toISOString();
    step.status = 'CONCLUIDA';
    step.completedAt = now;
    step.completedBy = userName;
    step.blockReason = undefined;
    if (notes) step.notes = notes;

    step.history = step.history || [];
    step.history.push({
      action: 'concluida',
      timestamp: now,
      userName,
      details: notes || `Etapa "${step.stepName}" concluída manualmente por ${userName}.`
    });

    // Auditoria
    this.addAuditLog({
      userName,
      action: 'admission_process_step_completed',
      entityType: 'admission_process_step',
      entityId: step.id,
      entityName: step.stepName,
      admissionId: admission.id,
      employeeName: admission.employee?.name,
      fieldChanged: 'status da etapa',
      previousValue: 'EM_ANDAMENTO',
      newValue: 'CONCLUIDA',
      details: `Etapa "${step.stepName}" (ordem ${step.stepOrder}) concluída na admissão de ${admission.employee?.name} por ${userName}.${notes ? ` Observações: "${notes}".` : ''}`
    });

    // Avança para a próxima etapa se houver
    let nextStep: AdmissionProcessStepSnapshot | undefined;
    for (let j = stepIndex + 1; j < admission.processSteps.length; j++) {
      const candidate = admission.processSteps[j];
      if (candidate.status !== 'IGNORADA') {
        nextStep = candidate;
        break;
      }
    }

    if (nextStep) {
      if (nextStep.status === 'PENDENTE' || nextStep.status === 'BLOQUEADA') {
        nextStep.status = 'EM_ANDAMENTO';
        nextStep.startedAt = now;
        nextStep.history = nextStep.history || [];
        nextStep.history.push({
          action: 'iniciada',
          timestamp: now,
          userName: 'Sistema',
          details: `Etapa liberada e iniciada automaticamente após a conclusão de "${step.stepName}".`
        });

        this.addAuditLog({
          userName: 'Sistema',
          action: 'admission_process_step_started',
          entityType: 'admission_process_step',
          entityId: nextStep.id,
          entityName: nextStep.stepName,
          admissionId: admission.id,
          employeeName: admission.employee?.name,
          details: `Próxima etapa "${nextStep.stepName}" iniciada automaticamente.`
        });
      }
      admission.currentStepKey = nextStep.stepKey;
    } else {
      // Era a última etapa! Conclui o processo admissional se todas obrigatórias concluídas
      const allRequiredDone = admission.processSteps.filter(s => s.required).every(s => s.status === 'CONCLUIDA' || s.status === 'IGNORADA');
      if (allRequiredDone) {
        admission.status = 'Concluída';
        admission.completedAt = now;
        admission.completedBy = userName;
        admission.currentStepKey = step.stepKey;

        this.addAuditLog({
          userName,
          action: 'admission_process_completed',
          entityType: 'admission_process',
          entityId: admission.processVersionId,
          admissionId: admission.id,
          employeeName: admission.employee?.name,
          details: `Todas as etapas do processo admissional foram concluídas com sucesso. Admissão finalizada!`
        });

        this.addNotification({
          title: 'Admissão concluída com sucesso',
          message: `O processo admissional de ${admission.employee?.name} foi 100% concluído em todas as etapas por ${userName}.`,
          type: 'completed',
          admissionId: admission.id,
          link: `/admissoes/${admission.id}`
        });
      }
    }

    admission.updatedAt = now;
    this.save();
    return { admission, step };
  }

  reopenAdmissionProcessStep(
    admissionId: string, 
    stepId: string, 
    userName: string, 
    reason: string
  ): { admission: Admission; step: AdmissionProcessStepSnapshot } {
    const admission = this.getAdmissionById(admissionId);
    if (!admission) throw new Error('Admissão não encontrada.');

    if (!reason || !reason.trim()) {
      throw new Error('É obrigatório informar uma justificativa detalhada para a reabertura da etapa.');
    }

    if (!admission.processSteps || admission.processSteps.length === 0) {
      throw new Error('Nenhuma etapa de processo vinculada a esta admissão.');
    }

    const stepIndex = admission.processSteps.findIndex(s => s.id === stepId || s.stepKey === stepId);
    if (stepIndex === -1) {
      throw new Error('Etapa não encontrada nesta admissão.');
    }

    const step = admission.processSteps[stepIndex];
    if (step.status !== 'CONCLUIDA') {
      throw new Error(`Apenas etapas concluídas podem ser reabertas. Status atual: ${step.status}.`);
    }

    const now = new Date().toISOString();
    const previousCompletedAt = step.completedAt;
    const previousCompletedBy = step.completedBy;

    // Atualiza a etapa para EM_ANDAMENTO
    step.status = 'EM_ANDAMENTO';
    step.completedAt = undefined;
    step.completedBy = undefined;
    step.notes = `Reaberta em ${new Date(now).toLocaleString('pt-BR')}: ${reason.trim()}`;

    step.history = step.history || [];
    step.history.push({
      action: 'reaberta',
      timestamp: now,
      userName,
      reason: reason.trim(),
      details: `Etapa reaberta por ${userName}. Motivo: "${reason.trim()}". (Conclusão anterior: ${previousCompletedAt ? new Date(previousCompletedAt).toLocaleString('pt-BR') : 'N/A'} por ${previousCompletedBy || 'N/A'})`
    });

    // Reverte etapas posteriores para PENDENTE
    for (let i = stepIndex + 1; i < admission.processSteps.length; i++) {
      const nextStep = admission.processSteps[i];
      if (nextStep.status === 'CONCLUIDA' || nextStep.status === 'EM_ANDAMENTO') {
        nextStep.status = 'PENDENTE';
        nextStep.completedAt = undefined;
        nextStep.completedBy = undefined;
        nextStep.history = nextStep.history || [];
        nextStep.history.push({
          action: 'bloqueada',
          timestamp: now,
          userName: 'Sistema',
          details: `Retornada para status PENDENTE devido à reabertura da etapa anterior "${step.stepName}".`
        });
      }
    }

    // Se a admissão estava Concluída, reverte o status
    if (admission.status === 'Concluída') {
      admission.status = 'Em conferência';
      admission.completedAt = undefined;
      admission.completedBy = undefined;
    }

    admission.currentStepKey = step.stepKey;
    admission.updatedAt = now;

    // Auditoria
    this.addAuditLog({
      userName,
      action: 'admission_process_step_reopened',
      entityType: 'admission_process_step',
      entityId: step.id,
      entityName: step.stepName,
      admissionId: admission.id,
      employeeName: admission.employee?.name,
      fieldChanged: 'status da etapa',
      previousValue: 'CONCLUIDA',
      newValue: 'EM_ANDAMENTO',
      details: `Etapa "${step.stepName}" reaberta na admissão de ${admission.employee?.name} por ${userName}. Motivo obrigatório: "${reason.trim()}".`
    });

    this.save();
    return { admission, step };
  }

  // Estatísticas do Dashboard
  getStats(options?: DashboardStatsOptions): DashboardStats {
    let allAdmissions = [...(this.data.admissions || [])];

    // Se houver filtros de Cargo, Setor ou Unidade, aplica sobre o escopo
    if (options?.role && options.role !== 'TODOS' && options.role !== 'Todos') {
      allAdmissions = allAdmissions.filter(a => a.employee?.role === options.role);
    }
    if (options?.department && options.department !== 'TODOS' && options.department !== 'Todos') {
      allAdmissions = allAdmissions.filter(a => a.employee?.department === options.department);
    }
    if (options?.unit && options.unit !== 'TODOS' && options.unit !== 'Todos') {
      allAdmissions = allAdmissions.filter(a => a.employee?.unit === options.unit);
    }

    // Período para "Novas admissões" e métricas do período
    const now = new Date();
    let periodStart: number | null = null;
    let periodEnd: number | null = null;

    if (options?.period === 'today') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    } else if (options?.period === '7d') {
      periodStart = Date.now() - 7 * 86400000;
      periodEnd = Date.now();
    } else if (options?.period === '30d') {
      periodStart = Date.now() - 30 * 86400000;
      periodEnd = Date.now();
    } else if (options?.period === 'this_month') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    } else if (options?.period === 'next_month') {
      periodStart = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0).getTime();
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999).getTime();
    } else if (options?.startDate || options?.endDate) {
      if (options.startDate) periodStart = new Date(options.startDate + 'T00:00:00').getTime();
      if (options.endDate) periodEnd = new Date(options.endDate + 'T23:59:59').getTime();
    } else {
      // Padrão: 7 dias para novas admissões
      periodStart = Date.now() - 7 * 86400000;
      periodEnd = Date.now();
    }

    // Se options.status foi informado e for diferente de TODOS, podemos também calcular dados filtrados
    let statusFilteredAdmissions = allAdmissions;
    if (options?.status && options.status !== 'TODOS' && options.status !== 'Todos') {
      statusFilteredAdmissions = allAdmissions.filter(a => a.status === options.status);
    }

    // Novas admissões criadas dentro do período selecionado
    const newAdmissions = allAdmissions.filter(a => {
      const createdTime = new Date(a.createdAt).getTime();
      if (periodStart !== null && createdTime < periodStart) return false;
      if (periodEnd !== null && createdTime > periodEnd) return false;
      return true;
    }).length;

    // Métricas por status (baseado em allAdmissions que respeita Cargo, Setor, Unidade)
    const waitingDocuments = allAdmissions.filter(a => a.status === 'Aguardando documentos').length;
    const waitingReview = allAdmissions.filter(a => a.status === 'Em conferência').length;
    const pendingIssues = allAdmissions.filter(a => a.status === 'Pendência').length;
    const completed = allAdmissions.filter(a => a.status === 'Concluída').length;
    const cancelled = allAdmissions.filter(a => a.status === 'Cancelada').length;
    const totalActive = allAdmissions.filter(a => a.status !== 'Cancelada').length;

    // Próximas admissões: expectedStartDate no futuro ou próximos dias
    const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    const upcoming = allAdmissions.filter(a => {
      if (a.status === 'Concluída' || a.status === 'Cancelada') return false;
      if (!a.employee?.expectedStartDate) return false;
      const expectedTime = new Date(a.employee.expectedStartDate + 'T23:59:59').getTime();
      return expectedTime >= todayZero;
    }).length;

    // Indicadores agregados de documentos (sobre o conjunto filtrado de admissões)
    const targetAdmissionsForDocs = (options?.status && options.status !== 'TODOS' && options.status !== 'Todos')
      ? statusFilteredAdmissions
      : allAdmissions;

    let notSent = 0;
    let sent = 0;
    let inReview = 0;
    let approved = 0;
    let rejected = 0;
    let waitingResend = 0;
    let totalDocs = 0;
    let requiredTotal = 0;
    let requiredApproved = 0;

    targetAdmissionsForDocs.forEach(a => {
      (a.documents || []).forEach(doc => {
        totalDocs++;
        if (doc.required) requiredTotal++;
        if (doc.required && doc.status === 'Aprovado') requiredApproved++;

        switch (doc.status) {
          case 'Não enviado':
            notSent++;
            break;
          case 'Enviado':
            sent++;
            break;
          case 'Em análise':
          case 'Reenviado':
            inReview++;
            break;
          case 'Aprovado':
            approved++;
            break;
          case 'Rejeitado':
            rejected++;
            waitingResend++;
            break;
          default:
            break;
        }
      });
    });

    const approvalRate = requiredTotal > 0
      ? Math.round((requiredApproved / requiredTotal) * 100)
      : (totalDocs > 0 ? 100 : 0);

    const documentStats: DocumentStats = {
      notSent,
      sent,
      inReview,
      approved,
      rejected,
      waitingResend,
      total: totalDocs,
      requiredTotal,
      requiredApproved,
      approvalRate
    };

    // Distribuição por status
    const byStatus = {
      'Rascunho': allAdmissions.filter(a => a.status === 'Rascunho').length,
      'Aguardando documentos': waitingDocuments,
      'Em conferência': waitingReview,
      'Pendência': pendingIssues,
      'Concluída': completed,
      'Cancelada': cancelled
    };

    // Evolução das admissões (por data)
    const dateMap = new Map<string, number>();
    
    if (periodStart !== null && periodEnd !== null && (periodEnd - periodStart) <= 35 * 86400000) {
      let cur = new Date(periodStart);
      const endD = new Date(periodEnd);
      while (cur <= endD) {
        const key = cur.toISOString().split('T')[0];
        dateMap.set(key, 0);
        cur.setDate(cur.getDate() + 1);
      }
    }

    allAdmissions.forEach(a => {
      const createdDate = a.createdAt ? a.createdAt.split('T')[0] : '';
      if (createdDate) {
        const time = new Date(createdDate + 'T12:00:00').getTime();
        if (periodStart !== null && time < periodStart - 86400000) return;
        if (periodEnd !== null && time > periodEnd + 86400000) return;
        
        dateMap.set(createdDate, (dateMap.get(createdDate) || 0) + 1);
      }
    });

    const evolution = Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => {
        const parts = date.split('-');
        const d = parts[2] || '';
        const m = parts[1] || '';
        return {
          date,
          label: `${d}/${m}`,
          count
        };
      });

    // Distribuição de admissões ativas por etapa do processo (Bloco 5.4)
    const byProcessStep: Record<string, { name: string; count: number; stepOrder: number }> = {};
    const activeVersion = this.getActiveAdmissionProcessVersion();
    (activeVersion?.steps || DEFAULT_ADMISSION_PROCESS_STEPS).forEach(st => {
      byProcessStep[st.stepKey] = {
        name: st.name,
        count: 0,
        stepOrder: st.order
      };
    });

    allAdmissions.filter(a => a.status !== 'Cancelada' && a.status !== 'Concluída').forEach(a => {
      const activeStep = a.processSteps?.find(s => s.status === 'EM_ANDAMENTO');
      if (activeStep && byProcessStep[activeStep.stepKey]) {
        byProcessStep[activeStep.stepKey].count++;
      } else if (a.currentStepKey && byProcessStep[a.currentStepKey]) {
        byProcessStep[a.currentStepKey].count++;
      }
    });

    return {
      newAdmissions,
      waitingDocuments,
      waitingReview,
      pendingIssues,
      completed,
      totalActive,
      cancelled,
      upcoming,
      documentStats,
      byStatus,
      evolution,
      byProcessStep
    };
  }

  // Usuários (CRUD)
  getUsers(): User[] {
    return this.data.users || [];
  }

  getUserById(id: string): User | undefined {
    return (this.data.users || []).find(u => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return (this.data.users || []).find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  addUser(userData: Omit<User, 'id' | 'createdAt'>): User {
    if (!this.data.users) this.data.users = [];
    const existing = this.getUserByEmail(userData.email);
    if (existing) {
      return existing;
    }
    const newUser: User = {
      id: 'user-rh-' + crypto.randomUUID().slice(0, 8),
      email: userData.email.toLowerCase().trim(),
      name: userData.name.trim(),
      role: userData.role || 'RH',
      department: userData.department || 'Recursos Humanos',
      createdAt: new Date().toISOString()
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>, updatedBy: string): User {
    if (!this.data.users) this.data.users = [];
    const user = this.getUserById(id);
    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    if (updates.email && updates.email.toLowerCase() !== user.email.toLowerCase()) {
      const emailInUse = this.getUserByEmail(updates.email);
      if (emailInUse && emailInUse.id !== id) {
        throw new Error('Já existe outro usuário com este e-mail.');
      }
      user.email = updates.email.toLowerCase().trim();
    }

    if (updates.name) user.name = updates.name.trim();
    if (updates.department) user.department = updates.department.trim();
    if (updates.role) user.role = updates.role;

    this.addAuditLog({
      userName: updatedBy,
      action: 'Usuário de RH atualizado',
      details: `Dados do usuário ${user.name} (${user.email}) atualizados por ${updatedBy}`
    });

    this.save();
    return user;
  }

  deleteUser(id: string, deletedBy: string): boolean {
    if (!this.data.users) return false;
    const user = this.getUserById(id);
    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    if (this.data.users.length <= 1) {
      throw new Error('Não é possível excluir o único usuário do sistema.');
    }

    this.data.users = this.data.users.filter(u => u.id !== id);

    this.addAuditLog({
      userName: deletedBy,
      action: 'Usuário de RH excluído',
      details: `Acesso do usuário ${user.name} (${user.email}) foi removido do sistema por ${deletedBy}`
    });

    this.save();
    return true;
  }

  // ==========================================
  // CARGOS (JOB POSITIONS - BLOCO 3.1)
  // ==========================================

  getJobPositions(statusFilter: 'all' | 'active' | 'inactive' = 'all', search?: string): JobPosition[] {
    if (!this.data.jobPositions) {
      this.data.jobPositions = [];
    }

    let positions = [...this.data.jobPositions];

    if (statusFilter === 'active') {
      positions = positions.filter(p => p.active);
    } else if (statusFilter === 'inactive') {
      positions = positions.filter(p => !p.active);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      positions = positions.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Ordenar alfabeticamente por nome
    positions.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return positions;
  }

  getJobPositionById(id: string): JobPosition | undefined {
    if (!this.data.jobPositions) this.data.jobPositions = [];
    return this.data.jobPositions.find(p => p.id === id);
  }

  addJobPosition(
    data: { name: string; code?: string; description?: string; active?: boolean }, 
    userName: string
  ): JobPosition {
    if (!this.data.jobPositions) this.data.jobPositions = [];

    // Validação do nome
    const normalizedName = (data.name || '').trim().replace(/\s+/g, ' ');
    if (!normalizedName) {
      throw new Error('O nome do cargo é obrigatório.');
    }

    // Validação de duplicidade de nome (entre cargos ativos)
    const existingName = this.data.jobPositions.find(
      p => p.active && p.name.trim().toLowerCase() === normalizedName.toLowerCase()
    );
    if (existingName) {
      throw new Error(`Já existe um cargo ativo cadastrado com o nome "${normalizedName}".`);
    }

    // Validação do código
    const normalizedCode = data.code ? data.code.trim().replace(/\s+/g, ' ') : undefined;
    if (normalizedCode) {
      const existingCode = this.data.jobPositions.find(
        p => p.active && p.code && p.code.trim().toLowerCase() === normalizedCode.toLowerCase()
      );
      if (existingCode) {
        throw new Error(`Já existe um cargo ativo cadastrado com o código "${normalizedCode}".`);
      }
    }

    const now = new Date().toISOString();
    const newPosition: JobPosition = {
      id: 'job-' + crypto.randomUUID(),
      name: normalizedName,
      code: normalizedCode || undefined,
      description: data.description ? data.description.trim() : undefined,
      active: data.active !== undefined ? Boolean(data.active) : true,
      createdAt: now,
      updatedAt: now,
      createdBy: userName || 'Sistema',
      updatedBy: userName || 'Sistema'
    };

    this.data.jobPositions.push(newPosition);

    // Auditoria: job_position_created
    this.addAuditLog({
      userName: userName || 'Usuário RH',
      action: 'job_position_created',
      entityType: 'job_position',
      entityId: newPosition.id,
      entityName: newPosition.name,
      fieldChanged: 'criação',
      newValue: newPosition.name,
      details: `Cargo "${newPosition.name}" (${newPosition.code || 'Sem código'}) cadastrado com sucesso por ${userName}.`
    });

    this.save();
    return newPosition;
  }

  updateJobPosition(
    id: string, 
    updates: { name?: string; code?: string; description?: string; active?: boolean }, 
    userName: string
  ): JobPosition {
    if (!this.data.jobPositions) this.data.jobPositions = [];
    const position = this.getJobPositionById(id);
    if (!position) {
      throw new Error('Cargo não encontrado.');
    }

    const changes: string[] = [];
    const structuredChanges: AuditLogChange[] = [];

    // Validação e atualização de nome
    if (updates.name !== undefined) {
      const normalizedName = updates.name.trim().replace(/\s+/g, ' ');
      if (!normalizedName) {
        throw new Error('O nome do cargo não pode ficar vazio.');
      }
      if (normalizedName.toLowerCase() !== position.name.toLowerCase()) {
        const existingName = this.data.jobPositions.find(
          p => p.id !== id && p.active && p.name.trim().toLowerCase() === normalizedName.toLowerCase()
        );
        if (existingName) {
          throw new Error(`Já existe outro cargo ativo com o nome "${normalizedName}".`);
        }
        structuredChanges.push({
          field: 'name',
          label: 'Nome do Cargo',
          previousValue: position.name,
          newValue: normalizedName
        });
        changes.push(`nome de "${position.name}" para "${normalizedName}"`);
        position.name = normalizedName;
      }
    }

    // Validação e atualização de código
    if (updates.code !== undefined) {
      const normalizedCode = updates.code ? updates.code.trim().replace(/\s+/g, ' ') : undefined;
      if (normalizedCode && normalizedCode.toLowerCase() !== (position.code || '').toLowerCase()) {
        const existingCode = this.data.jobPositions.find(
          p => p.id !== id && p.active && p.code && p.code.trim().toLowerCase() === normalizedCode.toLowerCase()
        );
        if (existingCode) {
          throw new Error(`Já existe outro cargo ativo com o código "${normalizedCode}".`);
        }
      }
      if (normalizedCode !== position.code) {
        structuredChanges.push({
          field: 'code',
          label: 'Código do Cargo',
          previousValue: position.code || 'N/A',
          newValue: normalizedCode || 'N/A'
        });
        changes.push(`código de "${position.code || 'N/A'}" para "${normalizedCode || 'N/A'}"`);
        position.code = normalizedCode || undefined;
      }
    }

    // Atualização de descrição
    if (updates.description !== undefined) {
      const trimmedDesc = updates.description ? updates.description.trim() : undefined;
      if (trimmedDesc !== position.description) {
        structuredChanges.push({
          field: 'description',
          label: 'Descrição do Cargo',
          previousValue: position.description || 'Nenhuma',
          newValue: trimmedDesc || 'Nenhuma'
        });
        changes.push('descrição atualizada');
        position.description = trimmedDesc;
      }
    }

    // Status (active)
    let isStatusChange = false;
    let becameActive = false;
    if (updates.active !== undefined && updates.active !== position.active) {
      if (updates.active) {
        // Ao reativar, validar duplicidade com outros ativos
        const existingName = this.data.jobPositions.find(
          p => p.id !== id && p.active && p.name.trim().toLowerCase() === position.name.trim().toLowerCase()
        );
        if (existingName) {
          throw new Error(`Não é possível ativar este cargo. Já existe outro cargo ativo com o nome "${position.name}".`);
        }
        if (position.code) {
          const existingCode = this.data.jobPositions.find(
            p => p.id !== id && p.active && p.code && p.code.trim().toLowerCase() === position.code.trim().toLowerCase()
          );
          if (existingCode) {
            throw new Error(`Não é possível ativar este cargo. Já existe outro cargo ativo com o código "${position.code}".`);
          }
        }
      }

      structuredChanges.push({
        field: 'active',
        label: 'Status do Cargo',
        previousValue: position.active ? 'Ativo' : 'Inativo',
        newValue: updates.active ? 'Ativo' : 'Inativo'
      });
      position.active = updates.active;
      changes.push(`status alterado para ${updates.active ? 'Ativo' : 'Inativo'}`);
      isStatusChange = true;
      becameActive = updates.active;
    }

    position.updatedAt = new Date().toISOString();
    position.updatedBy = userName || 'Sistema';

    let action = 'job_position_updated';
    if (isStatusChange) {
      action = becameActive ? 'job_position_activated' : 'job_position_deactivated';
    }

    this.addAuditLog({
      userName: userName || 'Usuário RH',
      action,
      entityType: 'job_position',
      entityId: position.id,
      entityName: position.name,
      fieldChanged: structuredChanges.length === 1 ? structuredChanges[0].label : `${structuredChanges.length} alterações`,
      previousValue: structuredChanges.length === 1 ? String(structuredChanges[0].previousValue) : undefined,
      newValue: structuredChanges.length === 1 ? String(structuredChanges[0].newValue) : undefined,
      changes: structuredChanges,
      details: `Cargo "${position.name}": ${changes.length > 0 ? changes.join(', ') : 'dados atualizados'} por ${userName}.`
    });

    this.save();
    return position;
  }

  toggleJobPositionStatus(id: string, active: boolean, userName: string): JobPosition {
    return this.updateJobPosition(id, { active }, userName);
  }

  // ------------------------------------------------------------------
  // TIPOS DE DOCUMENTOS (BLOCO 3.2)
  // ------------------------------------------------------------------

  getDocumentTypes(
    statusFilter: 'all' | 'active' | 'inactive' = 'all',
    categoryFilter?: string,
    search?: string
  ): DocumentTypeItem[] {
    if (!this.data.documentTypes) {
      this.data.documentTypes = [];
    }

    let list = [...this.data.documentTypes];

    // Filtro de status
    if (statusFilter === 'active') {
      list = list.filter(d => d.active);
    } else if (statusFilter === 'inactive') {
      list = list.filter(d => !d.active);
    }

    // Filtro por categoria
    if (categoryFilter && categoryFilter !== 'all' && categoryFilter !== 'Todas') {
      const catLower = categoryFilter.trim().toLowerCase();
      list = list.filter(d => d.category && d.category.toLowerCase() === catLower);
    }

    // Busca textual por nome ou descrição
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(d => 
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q)) ||
        (d.category && d.category.toLowerCase().includes(q))
      );
    }

    // Ordenação padrão: por sort_order ASC, depois por nome ASC
    return list.sort((a, b) => {
      const orderA = a.sort_order ?? 999;
      const orderB = b.sort_order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }

  getDocumentTypeById(id: string): DocumentTypeItem | undefined {
    if (!this.data.documentTypes) return undefined;
    return this.data.documentTypes.find(d => d.id === id);
  }

  addDocumentType(data: Partial<DocumentTypeItem>, userName: string): DocumentTypeItem {
    if (!this.data.documentTypes) {
      this.data.documentTypes = [];
    }

    const cleanName = data.name?.trim().replace(/\s+/g, ' ');
    if (!cleanName) {
      throw new Error('O nome do tipo de documento é obrigatório.');
    }

    // Validação de unicidade para tipos ativos
    const existingActive = this.data.documentTypes.find(
      d => d.active && d.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (existingActive) {
      throw new Error(`Já existe um tipo de documento ativo com o nome "${cleanName}".`);
    }

    const cleanCategory = data.category?.trim() || 'Outros';
    const cleanDesc = data.description ? data.description.trim() : undefined;
    
    // Tratamento de tipos de arquivo permitidos
    let allowedTypes = Array.isArray(data.allowed_file_types) && data.allowed_file_types.length > 0
      ? data.allowed_file_types.map(t => t.toUpperCase().trim()).filter(Boolean)
      : ['PDF', 'JPG', 'JPEG', 'PNG'];

    if (allowedTypes.length === 0) {
      throw new Error('Selecione pelo menos um formato de arquivo permitido.');
    }

    // Tamanho máximo em MB
    const maxSize = Number(data.max_file_size_mb) || 10;
    if (maxSize <= 0 || maxSize > 100) {
      throw new Error('O tamanho máximo do arquivo deve ser entre 1 MB e 100 MB.');
    }

    // Ordem de exibição
    let sortOrder = Number(data.sort_order);
    if (isNaN(sortOrder) || sortOrder < 0) {
      const currentMax = this.data.documentTypes.reduce((max, d) => Math.max(max, d.sort_order || 0), 0);
      sortOrder = currentMax + 1;
    }

    const now = new Date().toISOString();
    const newDocType: DocumentTypeItem = {
      id: 'doc-type-' + crypto.randomUUID(),
      name: cleanName,
      description: cleanDesc,
      category: cleanCategory,
      required_by_default: Boolean(data.required_by_default),
      active: data.active !== undefined ? Boolean(data.active) : true,
      allowed_file_types: allowedTypes,
      max_file_size_mb: maxSize,
      requires_expiration_date: Boolean(data.requires_expiration_date),
      sort_order: sortOrder,
      created_at: now,
      updated_at: now,
      created_by: userName || 'Sistema',
      updated_by: userName || 'Sistema'
    };

    this.data.documentTypes.push(newDocType);

    this.addAuditLog({
      userName: userName || 'Usuário RH',
      action: 'document_type_created',
      entityType: 'document_type',
      entityId: newDocType.id,
      entityName: newDocType.name,
      fieldChanged: 'criação',
      newValue: newDocType.name,
      details: `Tipo de documento "${cleanName}" (Categoria: ${cleanCategory}, Obrigatório Padrão: ${newDocType.required_by_default ? 'Sim' : 'Não'}, Validade: ${newDocType.requires_expiration_date ? 'Sim' : 'Não'}) cadastrado por ${userName}.`
    });

    this.save();
    return newDocType;
  }

  updateDocumentType(id: string, updates: Partial<DocumentTypeItem>, userName: string): DocumentTypeItem {
    if (!this.data.documentTypes) {
      this.data.documentTypes = [];
    }

    const docType = this.data.documentTypes.find(d => d.id === id);
    if (!docType) {
      throw new Error(`Tipo de documento com ID "${id}" não encontrado.`);
    }

    const changes: string[] = [];
    const structuredChanges: AuditLogChange[] = [];
    let isStatusChange = false;
    let becameActive = false;

    // Atualização de nome
    if (updates.name !== undefined) {
      const cleanName = updates.name.trim().replace(/\s+/g, ' ');
      if (!cleanName) {
        throw new Error('O nome do tipo de documento não pode ser vazio.');
      }

      if (cleanName.toLowerCase() !== docType.name.toLowerCase()) {
        const existing = this.data.documentTypes.find(
          d => d.id !== id && d.active && d.name.trim().toLowerCase() === cleanName.toLowerCase()
        );
        if (existing) {
          throw new Error(`Já existe outro tipo de documento ativo com o nome "${cleanName}".`);
        }
        structuredChanges.push({
          field: 'name',
          label: 'Nome do Documento',
          previousValue: docType.name,
          newValue: cleanName
        });
        changes.push(`nome alterado de "${docType.name}" para "${cleanName}"`);
        docType.name = cleanName;
      }
    }

    // Descrição
    if (updates.description !== undefined) {
      const cleanDesc = updates.description ? updates.description.trim() : undefined;
      if (cleanDesc !== docType.description) {
        structuredChanges.push({
          field: 'description',
          label: 'Descrição',
          previousValue: docType.description || 'Nenhuma',
          newValue: cleanDesc || 'Nenhuma'
        });
        changes.push('descrição atualizada');
        docType.description = cleanDesc;
      }
    }

    // Categoria
    if (updates.category !== undefined) {
      const cleanCategory = updates.category.trim();
      if (!cleanCategory) {
        throw new Error('A categoria do documento é obrigatória.');
      }
      if (cleanCategory !== docType.category) {
        structuredChanges.push({
          field: 'category',
          label: 'Categoria',
          previousValue: docType.category,
          newValue: cleanCategory
        });
        changes.push(`categoria alterada de "${docType.category}" para "${cleanCategory}"`);
        docType.category = cleanCategory;
      }
    }

    // Obrigatório por padrão
    if (updates.required_by_default !== undefined && updates.required_by_default !== docType.required_by_default) {
      structuredChanges.push({
        field: 'required_by_default',
        label: 'Obrigatório por Padrão',
        previousValue: docType.required_by_default ? 'Sim' : 'Não',
        newValue: updates.required_by_default ? 'Sim' : 'Não'
      });
      changes.push(`obrigatório por padrão alterado para ${updates.required_by_default ? 'Sim' : 'Não'}`);
      docType.required_by_default = Boolean(updates.required_by_default);
    }

    // Exige data de validade
    if (updates.requires_expiration_date !== undefined && updates.requires_expiration_date !== docType.requires_expiration_date) {
      structuredChanges.push({
        field: 'requires_expiration_date',
        label: 'Exige Validade',
        previousValue: docType.requires_expiration_date ? 'Sim' : 'Não',
        newValue: updates.requires_expiration_date ? 'Sim' : 'Não'
      });
      changes.push(`exigência de data de validade alterada para ${updates.requires_expiration_date ? 'Sim' : 'Não'}`);
      docType.requires_expiration_date = Boolean(updates.requires_expiration_date);
    }

    // Formatos permitidos
    if (updates.allowed_file_types !== undefined) {
      const cleanTypes = updates.allowed_file_types.map(t => t.toUpperCase().trim()).filter(Boolean);
      if (cleanTypes.length === 0) {
        throw new Error('Selecione pelo menos um formato de arquivo permitido.');
      }
      structuredChanges.push({
        field: 'allowed_file_types',
        label: 'Formatos Permitidos',
        previousValue: docType.allowed_file_types.join(', '),
        newValue: cleanTypes.join(', ')
      });
      changes.push(`formatos permitidos atualizados: [${cleanTypes.join(', ')}]`);
      docType.allowed_file_types = cleanTypes;
    }

    // Tamanho máximo
    if (updates.max_file_size_mb !== undefined) {
      const size = Number(updates.max_file_size_mb);
      if (isNaN(size) || size <= 0 || size > 100) {
        throw new Error('O tamanho máximo do arquivo deve ser entre 1 MB e 100 MB.');
      }
      if (size !== docType.max_file_size_mb) {
        structuredChanges.push({
          field: 'max_file_size_mb',
          label: 'Tamanho Máximo',
          previousValue: `${docType.max_file_size_mb} MB`,
          newValue: `${size} MB`
        });
        changes.push(`tamanho máximo alterado para ${size} MB`);
        docType.max_file_size_mb = size;
      }
    }

    // Ordem de exibição
    if (updates.sort_order !== undefined) {
      const order = Number(updates.sort_order);
      if (!isNaN(order) && order !== docType.sort_order) {
        structuredChanges.push({
          field: 'sort_order',
          label: 'Ordem de Exibição',
          previousValue: String(docType.sort_order),
          newValue: String(order)
        });
        changes.push(`ordem alterada para ${order}`);
        docType.sort_order = order;
      }
    }

    // Status ativo / inativo
    if (updates.active !== undefined && updates.active !== docType.active) {
      if (updates.active) {
        // Ao reativar, verifica conflito de nome com outro ativo
        const existing = this.data.documentTypes.find(
          d => d.id !== id && d.active && d.name.trim().toLowerCase() === docType.name.trim().toLowerCase()
        );
        if (existing) {
          throw new Error(`Não é possível ativar este documento. Já existe outro tipo de documento ativo com o nome "${docType.name}".`);
        }
      }

      structuredChanges.push({
        field: 'active',
        label: 'Status',
        previousValue: docType.active ? 'Ativo' : 'Inativo',
        newValue: updates.active ? 'Ativo' : 'Inativo'
      });
      docType.active = updates.active;
      changes.push(`status alterado para ${updates.active ? 'Ativo' : 'Inativo'}`);
      isStatusChange = true;
      becameActive = updates.active;
    }

    docType.updated_at = new Date().toISOString();
    docType.updated_by = userName || 'Sistema';

    let action = 'document_type_updated';
    if (isStatusChange) {
      action = becameActive ? 'document_type_activated' : 'document_type_deactivated';
    }

    this.addAuditLog({
      userName: userName || 'Usuário RH',
      action,
      entityType: 'document_type',
      entityId: docType.id,
      entityName: docType.name,
      fieldChanged: structuredChanges.length === 1 ? structuredChanges[0].label : `${structuredChanges.length} alterações`,
      previousValue: structuredChanges.length === 1 ? String(structuredChanges[0].previousValue) : undefined,
      newValue: structuredChanges.length === 1 ? String(structuredChanges[0].newValue) : undefined,
      changes: structuredChanges,
      details: `Tipo de documento "${docType.name}": ${changes.length > 0 ? changes.join(', ') : 'dados atualizados'} por ${userName}.`
    });

    this.save();
    return docType;
  }

  toggleDocumentTypeStatus(id: string, active: boolean, userName: string): DocumentTypeItem {
    return this.updateDocumentType(id, { active }, userName);
  }

  seedInitialDocumentTypes(userName: string): DocumentTypeItem[] {
    if (!this.data.documentTypes) {
      this.data.documentTypes = [];
    }

    let addedCount = 0;
    for (const dt of INITIAL_DOCUMENT_TYPES) {
      const exists = this.data.documentTypes.some(
        d => d.name.trim().toLowerCase() === dt.name.trim().toLowerCase()
      );
      if (!exists) {
        const now = new Date().toISOString();
        this.data.documentTypes.push({
          id: 'doc-type-' + crypto.randomUUID(),
          name: dt.name,
          description: dt.description,
          category: dt.category,
          required_by_default: dt.required_by_default,
          active: dt.active,
          allowed_file_types: [...dt.allowed_file_types],
          max_file_size_mb: dt.max_file_size_mb,
          requires_expiration_date: dt.requires_expiration_date,
          sort_order: dt.sort_order,
          created_at: now,
          updated_at: now,
          created_by: userName || 'Sistema',
          updated_by: userName || 'Sistema'
        });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      this.addAuditLog({
        userName: userName || 'Usuário RH',
        action: 'document_type_created',
        details: `${addedCount} tipos de documentos padrão do sistema foram criados por ${userName}.`
      });
      this.save();
    }

    return this.getDocumentTypes('all');
  }

  // ------------------------------------------------------------------
  // CHECKLIST DE DOCUMENTOS POR CARGO (BLOCO 3.3)
  // ------------------------------------------------------------------

  getJobPositionDocuments(
    jobPositionId: string, 
    statusFilter: 'all' | 'active' | 'inactive' = 'all'
  ): JobPositionDocument[] {
    if (!this.data.jobPositionDocuments) {
      this.data.jobPositionDocuments = [];
    }

    let items = this.data.jobPositionDocuments.filter(jpd => jpd.job_position_id === jobPositionId);

    if (statusFilter === 'active') {
      items = items.filter(jpd => jpd.active);
    } else if (statusFilter === 'inactive') {
      items = items.filter(jpd => !jpd.active);
    }

    const jobPos = this.data.jobPositions?.find(p => p.id === jobPositionId);

    const populated = items.map(item => {
      const docType = this.data.documentTypes?.find(dt => dt.id === item.document_type_id);
      return {
        ...item,
        document_type: docType,
        job_position: jobPos
      };
    });

    return populated.sort((a, b) => {
      const orderA = a.sort_order ?? 999;
      const orderB = b.sort_order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.document_type?.name || '').localeCompare(b.document_type?.name || '', 'pt-BR');
    });
  }

  getJobPositionDocumentById(id: string): JobPositionDocument | undefined {
    if (!this.data.jobPositionDocuments) return undefined;
    const item = this.data.jobPositionDocuments.find(jpd => jpd.id === id);
    if (!item) return undefined;

    const docType = this.data.documentTypes?.find(dt => dt.id === item.document_type_id);
    const jobPos = this.data.jobPositions?.find(jp => jp.id === item.job_position_id);

    return {
      ...item,
      document_type: docType,
      job_position: jobPos
    };
  }

  getNextJobPositionDocumentSortOrder(jobPositionId: string): number {
    if (!this.data.jobPositionDocuments) return 1;
    const currentItems = this.data.jobPositionDocuments.filter(
      jpd => jpd.job_position_id === jobPositionId && jpd.active
    );
    if (currentItems.length === 0) return 1;
    const max = Math.max(...currentItems.map(i => i.sort_order || 0));
    return max + 1;
  }

  addJobPositionDocument(
    jobPositionId: string,
    data: {
      document_type_id: string;
      required?: boolean;
      sort_order?: number;
      instructions?: string;
      active?: boolean;
    },
    userName: string
  ): JobPositionDocument {
    if (!this.data.jobPositionDocuments) {
      this.data.jobPositionDocuments = [];
    }

    // 1. Validação do cargo
    const jobPos = this.data.jobPositions?.find(p => p.id === jobPositionId);
    if (!jobPos) {
      throw new Error('Cargo informado não foi encontrado.');
    }
    if (!jobPos.active) {
      throw new Error(`Não é possível configurar checklist para o cargo "${jobPos.name}" pois ele está inativo.`);
    }

    // 2. Validação do tipo de documento
    if (!data.document_type_id) {
      throw new Error('O tipo de documento é obrigatório.');
    }
    const docType = this.data.documentTypes?.find(dt => dt.id === data.document_type_id);
    if (!docType) {
      throw new Error('Tipo de documento informado não foi encontrado.');
    }
    if (!docType.active) {
      throw new Error(`O tipo de documento "${docType.name}" está inativo no catálogo geral e não pode ser vinculado a novos cargos.`);
    }

    // 3. Validação de duplicidade ativa
    const existing = this.data.jobPositionDocuments.find(
      jpd => jpd.job_position_id === jobPositionId && jpd.document_type_id === data.document_type_id
    );

    const now = new Date().toISOString();

    if (existing) {
      if (existing.active) {
        throw new Error(`O documento "${docType.name}" já está configurado no checklist do cargo "${jobPos.name}".`);
      } else {
        // Reativar e atualizar os campos
        existing.active = true;
        existing.required = data.required !== undefined ? Boolean(data.required) : docType.required_by_default;
        existing.instructions = data.instructions ? data.instructions.trim() : undefined;
        existing.sort_order = typeof data.sort_order === 'number' && data.sort_order > 0
          ? data.sort_order
          : this.getNextJobPositionDocumentSortOrder(jobPositionId);
        existing.updated_at = now;
        existing.updated_by = userName || 'Sistema';

        this.addAuditLog({
          userName: userName || 'Usuário RH',
          action: 'job_position_document_added',
          entityType: 'job_position_document',
          entityId: existing.id,
          entityName: `${docType.name} (${jobPos.name})`,
          fieldChanged: 'reativação',
          newValue: existing.required ? 'Obrigatório' : 'Opcional',
          details: `Documento "${docType.name}" reativado no checklist do cargo "${jobPos.name}" (${existing.required ? 'Obrigatório' : 'Opcional'}, Ordem: ${existing.sort_order}) por ${userName}.`
        });

        this.save();
        return {
          ...existing,
          document_type: docType,
          job_position: jobPos
        };
      }
    }

    // Nova associação
    const sortOrder = typeof data.sort_order === 'number' && data.sort_order > 0
      ? data.sort_order
      : this.getNextJobPositionDocumentSortOrder(jobPositionId);

    const isRequired = data.required !== undefined ? Boolean(data.required) : docType.required_by_default;
    const cleanInstructions = data.instructions ? data.instructions.trim() : undefined;

    const newJpd: JobPositionDocument = {
      id: 'jpd-' + crypto.randomUUID(),
      job_position_id: jobPositionId,
      document_type_id: docType.id,
      required: isRequired,
      sort_order: sortOrder,
      instructions: cleanInstructions,
      active: true,
      created_at: now,
      updated_at: now,
      created_by: userName || 'Sistema',
      updated_by: userName || 'Sistema'
    };

    this.data.jobPositionDocuments.push(newJpd);

    this.addAuditLog({
      userName: userName || 'Usuário RH',
      action: 'job_position_document_added',
      entityType: 'job_position_document',
      entityId: newJpd.id,
      entityName: `${docType.name} (${jobPos.name})`,
      fieldChanged: 'inclusão no checklist',
      newValue: newJpd.required ? 'Obrigatório' : 'Opcional',
      details: `Documento "${docType.name}" adicionado ao checklist do cargo "${jobPos.name}" (${newJpd.required ? 'Obrigatório' : 'Opcional'}, Ordem: ${newJpd.sort_order}) por ${userName}.`
    });

    this.save();

    return {
      ...newJpd,
      document_type: docType,
      job_position: jobPos
    };
  }

  updateJobPositionDocument(
    id: string,
    updates: Partial<JobPositionDocument>,
    userName: string
  ): JobPositionDocument {
    if (!this.data.jobPositionDocuments) {
      this.data.jobPositionDocuments = [];
    }

    const jpd = this.data.jobPositionDocuments.find(item => item.id === id);
    if (!jpd) {
      throw new Error(`Configuração de documento do cargo com ID "${id}" não encontrada.`);
    }

    const jobPos = this.data.jobPositions?.find(p => p.id === jpd.job_position_id);
    const docType = this.data.documentTypes?.find(dt => dt.id === jpd.document_type_id);

    const changes: string[] = [];
    const structuredChanges: AuditLogChange[] = [];

    // Não permitir alteração de cargo ou tipo de documento vinculado
    if (updates.job_position_id && updates.job_position_id !== jpd.job_position_id) {
      throw new Error('Não é permitido transferir a configuração para outro cargo diretamente.');
    }
    if (updates.document_type_id && updates.document_type_id !== jpd.document_type_id) {
      throw new Error('Não é permitido alterar o tipo de documento de uma associação existente.');
    }

    // Alteração de obrigatoriedade
    if (updates.required !== undefined && updates.required !== jpd.required) {
      structuredChanges.push({
        field: 'required',
        label: 'Obrigatoriedade',
        previousValue: jpd.required ? 'Obrigatório' : 'Opcional',
        newValue: updates.required ? 'Obrigatório' : 'Opcional'
      });
      changes.push(`obrigatoriedade alterada para ${updates.required ? 'Obrigatório' : 'Opcional'}`);
      jpd.required = Boolean(updates.required);
    }

    // Alteração de instruções
    if (updates.instructions !== undefined) {
      const cleanInst = updates.instructions ? updates.instructions.trim() : undefined;
      if (cleanInst !== jpd.instructions) {
        structuredChanges.push({
          field: 'instructions',
          label: 'Instruções',
          previousValue: jpd.instructions || 'Nenhuma',
          newValue: cleanInst || 'Nenhuma'
        });
        changes.push('instruções atualizadas');
        jpd.instructions = cleanInst;
      }
    }

    // Alteração de ordem
    if (updates.sort_order !== undefined && typeof updates.sort_order === 'number' && updates.sort_order > 0) {
      if (updates.sort_order !== jpd.sort_order) {
        structuredChanges.push({
          field: 'sort_order',
          label: 'Ordem no Checklist',
          previousValue: String(jpd.sort_order),
          newValue: String(updates.sort_order)
        });
        changes.push(`ordem alterada para ${updates.sort_order}`);
        jpd.sort_order = updates.sort_order;
      }
    }

    // Alteração de status
    let isStatusChange = false;
    let becameActive = false;
    if (updates.active !== undefined && updates.active !== jpd.active) {
      if (updates.active) {
        // Ao reativar, verifica se o documento global continua ativo
        if (docType && !docType.active) {
          throw new Error(`Não é possível ativar esta associação. O tipo de documento "${docType.name}" está inativo no catálogo geral.`);
        }
      }

      structuredChanges.push({
        field: 'active',
        label: 'Status no Cargo',
        previousValue: jpd.active ? 'Ativo' : 'Removido',
        newValue: updates.active ? 'Ativo' : 'Removido'
      });
      jpd.active = updates.active;
      changes.push(`status alterado para ${updates.active ? 'Ativo' : 'Inativo'}`);
      isStatusChange = true;
      becameActive = updates.active;
    }

    const now = new Date().toISOString();
    jpd.updated_at = now;
    jpd.updated_by = userName || 'Sistema';

    let action = 'job_position_document_updated';
    if (isStatusChange) {
      action = becameActive ? 'job_position_document_activated' : 'job_position_document_removed';
    }

    this.addAuditLog({
      userName: userName || 'Usuário RH',
      action,
      entityType: 'job_position_document',
      entityId: jpd.id,
      entityName: `${docType?.name || 'Documento'} (${jobPos?.name || 'Cargo'})`,
      fieldChanged: structuredChanges.length === 1 ? structuredChanges[0].label : `${structuredChanges.length} configurações`,
      previousValue: structuredChanges.length === 1 ? String(structuredChanges[0].previousValue) : undefined,
      newValue: structuredChanges.length === 1 ? String(structuredChanges[0].newValue) : undefined,
      changes: structuredChanges,
      details: `Checklist do cargo "${jobPos?.name || 'Cargo'}" - Documento "${docType?.name || 'Documento'}": ${changes.length > 0 ? changes.join(', ') : 'configurações atualizadas'} por ${userName}.`
    });

    this.save();

    return {
      ...jpd,
      document_type: docType,
      job_position: jobPos
    };
  }

  toggleJobPositionDocumentStatus(id: string, active: boolean, userName: string): JobPositionDocument {
    return this.updateJobPositionDocument(id, { active }, userName);
  }

  reorderJobPositionDocuments(
    jobPositionId: string,
    orderedIds: string[],
    userName: string
  ): JobPositionDocument[] {
    if (!this.data.jobPositionDocuments) {
      this.data.jobPositionDocuments = [];
    }

    const jobPos = this.data.jobPositions?.find(p => p.id === jobPositionId);
    if (!jobPos) {
      throw new Error('Cargo não encontrado.');
    }

    // Atualiza sort_order de cada item na ordem do array
    orderedIds.forEach((id, index) => {
      const item = this.data.jobPositionDocuments.find(jpd => jpd.id === id && jpd.job_position_id === jobPositionId);
      if (item) {
        item.sort_order = index + 1;
        item.updated_at = new Date().toISOString();
        item.updated_by = userName || 'Sistema';
      }
    });

    this.addAuditLog({
      userName: userName || 'Usuário RH',
      action: 'job_position_document_reordered',
      entityType: 'job_position',
      entityId: jobPositionId,
      entityName: jobPos.name,
      fieldChanged: 'ordem do checklist',
      newValue: `${orderedIds.length} itens reordenados`,
      details: `Checklist de documentos do cargo "${jobPos.name}" reordenado (${orderedIds.length} itens) por ${userName}.`
    });

    this.save();

    return this.getJobPositionDocuments(jobPositionId, 'all');
  }

  removeJobPositionDocument(id: string, userName: string): JobPositionDocument {
    return this.updateJobPositionDocument(id, { active: false }, userName);
  }

  seedInitialJobPositionDocuments(userName: string): JobPositionDocument[] {
    if (!this.data.jobPositionDocuments) {
      this.data.jobPositionDocuments = [];
    }

    const defaultDocs = buildDefaultJobPositionDocuments(
      this.data.jobPositions || [],
      this.data.documentTypes || []
    );

    let addedCount = 0;
    for (const d of defaultDocs) {
      const exists = this.data.jobPositionDocuments.some(
        jpd => jpd.job_position_id === d.job_position_id && jpd.document_type_id === d.document_type_id
      );
      if (!exists) {
        this.data.jobPositionDocuments.push(d);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      this.addAuditLog({
        userName: userName || 'Usuário RH',
        action: 'job_position_document_added',
        details: `${addedCount} associações padrão de checklist por cargo foram geradas no sistema por ${userName}.`
      });
      this.save();
    }

    return this.data.jobPositionDocuments;
  }

  // Admissões
  getAdmissions(): Admission[] {
    return this.data.admissions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getAdmissionById(id: string): Admission | undefined {
    return this.data.admissions.find(a => a.id === id);
  }

  getAdmissionByToken(token: string): Admission | undefined {
    return this.data.admissions.find(a => a.inviteToken === token);
  }

  createAdmission(
    employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> & { jobPositionId?: string }, 
    createdByUserName: string
  ): Admission {
    // Validação de CPF duplicado em admissões ativas
    const cleanCPF = employeeData.cpf.replace(/\D/g, '');
    const duplicate = this.data.admissions.find(a => 
      a.status !== 'Cancelada' && 
      a.employee.cpf.replace(/\D/g, '') === cleanCPF
    );

    if (duplicate) {
      throw new Error(`Já existe uma admissão ativa (${duplicate.status}) cadastrada para este CPF.`);
    }

    const employeeId = 'emp-' + crypto.randomUUID();
    const admissionId = 'adm-' + crypto.randomUUID();
    const now = new Date().toISOString();

    const employee: Employee = {
      id: employeeId,
      ...employeeData,
      cpf: cleanCPF,
      createdAt: now,
      updatedAt: now
    };

    // Gera token seguro e longo
    const inviteToken = 'tok_' + crypto.randomBytes(24).toString('hex');
    const inviteExpiresAt = new Date(Date.now() + 30 * 86400000).toISOString(); // 30 dias

    // Identifica o cargo selecionado para aplicar o checklist snapshot (Bloco 3.4)
    let jobPosition: JobPosition | undefined;
    if (employeeData.jobPositionId) {
      jobPosition = this.data.jobPositions?.find(
        jp => jp.id === employeeData.jobPositionId && jp.active
      );
    }
    if (!jobPosition && employeeData.role) {
      const searchRole = employeeData.role.trim().toLowerCase();
      jobPosition = this.data.jobPositions?.find(
        jp => jp.active && (jp.name.trim().toLowerCase() === searchRole || (jp.code && jp.code.trim().toLowerCase() === searchRole))
      );
    }

    // Geração do Snapshot do checklist de documentos (Bloco 3.4)
    const documents: AdmissionDocument[] = [];
    const seenDocTypeIds = new Set<string>();

    if (jobPosition && this.data.jobPositionDocuments) {
      // 1. Filtrar somente associações ativas deste cargo
      const activeJpDocs = this.data.jobPositionDocuments.filter(
        jpd => jpd.job_position_id === jobPosition!.id && jpd.active
      );

      // 2. Ordenar pelo sort_order configurado
      const sortedJpDocs = [...activeJpDocs].sort((a, b) => {
        const orderA = a.sort_order ?? 999;
        const orderB = b.sort_order ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return 0;
      });

      // 3. Gerar o snapshot de cada documento ativo
      for (let i = 0; i < sortedJpDocs.length; i++) {
        const jpd = sortedJpDocs[i];

        // Evitar duplicação do mesmo tipo de documento na mesma admissão
        if (seenDocTypeIds.has(jpd.document_type_id)) {
          continue;
        }

        // Buscar tipo de documento no catálogo geral
        const docType = this.data.documentTypes?.find(dt => dt.id === jpd.document_type_id);

        // Bloco 3.4: usar apenas tipos de documentos ativos
        if (!docType || !docType.active) {
          continue;
        }

        seenDocTypeIds.add(jpd.document_type_id);

        const docSnapshot: AdmissionDocument = {
          id: 'doc-' + crypto.randomUUID(),
          admissionId,
          documentType: docType.name,
          document_type_id: docType.id,
          document_type_name: docType.name,
          category: docType.category,
          required: Boolean(jpd.required),
          sort_order: jpd.sort_order ?? (i + 1),
          instructions: jpd.instructions ? jpd.instructions.trim() : undefined,
          requires_expiration_date: Boolean(docType.requires_expiration_date),
          allowed_file_types: docType.allowed_file_types && docType.allowed_file_types.length > 0
            ? [...docType.allowed_file_types]
            : ['PDF', 'JPG', 'JPEG', 'PNG'],
          max_file_size_mb: docType.max_file_size_mb || 10,
          source_job_position_document_id: jpd.id,
          source_config_version: '1.0',
          status: 'Não enviado',
          currentVersion: 0,
          versions: [],
          createdAt: now,
          updatedAt: now,
          created_by: createdByUserName || 'Sistema',
          updated_by: createdByUserName || 'Sistema'
        };

        documents.push(docSnapshot);
      }
    }

    const requiredDocsCount = documents.filter(d => d.required).length;
    const optionalDocsCount = documents.filter(d => !d.required).length;
    const totalDocsCount = documents.length;

    // Snapshot das Etapas do Processo Admissional Vigente (Bloco 5.4)
    const activeVersion = this.getActiveAdmissionProcessVersion();
    const activeSteps = (activeVersion?.steps || DEFAULT_ADMISSION_PROCESS_STEPS)
      .filter(s => s.active)
      .sort((a, b) => a.order - b.order);

    const processSteps: AdmissionProcessStepSnapshot[] = activeSteps.map((s, idx) => {
      const isFirst = idx === 0;
      const isSecond = idx === 1;
      return {
        id: 'step-snap-' + crypto.randomUUID(),
        admissionId,
        processVersionId: activeVersion.id,
        processVersionNumber: activeVersion.versionNumber,
        stepKey: s.stepKey,
        stepName: s.name,
        stepDescription: s.description,
        stepOrder: s.order,
        required: s.required,
        responsibleRole: s.responsibleRole,
        completionRule: s.completionRule,
        status: isFirst ? 'CONCLUIDA' : (isSecond ? 'EM_ANDAMENTO' : 'PENDENTE'),
        startedAt: isFirst || isSecond ? now : undefined,
        completedAt: isFirst ? now : undefined,
        completedBy: isFirst ? (createdByUserName || 'RH') : undefined,
        notes: isFirst ? 'Cadastro inicial da admissão realizado pelo RH.' : undefined,
        history: [
          {
            action: isFirst ? 'concluida' : 'iniciada',
            timestamp: now,
            userName: createdByUserName || 'Sistema',
            details: isFirst
              ? `Admissão criada e cadastrada sob a Versão ${activeVersion.versionNumber} do Processo Admissional.`
              : 'Etapa iniciada: aguardando preenchimento e confirmação cadastral do colaborador.'
          }
        ]
      };
    });

    const currentStepKey = processSteps.find(st => st.status === 'EM_ANDAMENTO')?.stepKey || 'DADOS_PESSOAIS';

    const approvalStep = processSteps.find(s => s.stepKey === 'APROVACAO');
    let approval: AdmissionApproval | undefined;
    if (approvalStep) {
      approval = {
        id: 'appr-' + admissionId,
        admissionId,
        processStepId: approvalStep.id,
        approvalType: 'GESTOR',
        title: 'Aprovação da Gestão / Diretoria',
        description: 'Validação final e parecer formal sobre o ingresso do colaborador.',
        status: 'PENDENTE',
        required: approvalStep.required ?? true,
        responsibleRole: (approvalStep.responsibleRole as ApprovalResponsibleRole) || 'GESTOR',
        requestedAt: now,
        configurationSnapshot: {
          versionNumber: activeVersion.versionNumber,
          stepName: approvalStep.stepName,
          allowRejection: true,
          requireRejectionReason: true
        },
        createdAt: now,
        updatedAt: now,
        history: [
          {
            id: 'hist-appr-init-' + crypto.randomUUID(),
            action: 'SOLICITADA',
            timestamp: now,
            userName: createdByUserName || 'Sistema',
            newStatus: 'PENDENTE',
            notes: 'Aprovação interna inicializada no snapshot do processo admissional.'
          }
        ]
      };
    }

    const newAdmission: Admission = {
      id: admissionId,
      employeeId,
      employee,
      status: 'Aguardando documentos',
      inviteToken,
      inviteExpiresAt,
      inviteSentViaWhatsApp: false,
      consentGiven: false,
      dataConfirmed: false,
      documents,
      progressPercent: 0,
      totalDocuments: requiredDocsCount,
      approvedDocuments: 0,
      processVersionId: activeVersion.id,
      processVersionNumber: activeVersion.versionNumber,
      processSteps,
      currentStepKey,
      approval,
      createdAt: now,
      updatedAt: now
    };

    // Operação atômica em memória antes da persistência
    this.data.employees.push(employee);
    this.data.admissions.push(newAdmission);

    // Auditoria Geral de Criação
    this.addAuditLog({
      userName: createdByUserName,
      action: 'RH criou uma nova admissão',
      admissionId,
      employeeName: employee.name,
      details: `Admissão cadastrada para o cargo ${employee.role} (${employee.department} - ${employee.unit})`
    });

    // Auditoria de Aprovação Interna (Bloco 5.6)
    if (approval) {
      this.addAuditLog({
        userName: createdByUserName || 'Sistema',
        action: 'approval_created',
        entityType: 'admission_approval',
        entityId: approval.id,
        admissionId,
        employeeName: employee.name,
        details: `Aprovação interna (${approval.approvalType}) cadastrada no fluxo como PENDENTE sob responsabilidade de ${approval.responsibleRole}.`
      });
    }

    // Auditoria do Processo Admissional (Bloco 5.4)
    this.addAuditLog({
      userName: createdByUserName || 'Sistema',
      action: 'admission_process_started',
      entityType: 'admission_process',
      entityId: activeVersion.id,
      admissionId,
      employeeName: employee.name,
      details: `Processo admissional iniciado com a Versão ${activeVersion.versionNumber} (${processSteps.length} etapas no snapshot).`
    });

    if (processSteps[0]) {
      this.addAuditLog({
        userName: createdByUserName || 'Sistema',
        action: 'admission_process_step_completed',
        entityType: 'admission_process_step',
        entityId: processSteps[0].id,
        entityName: processSteps[0].stepName,
        admissionId,
        employeeName: employee.name,
        details: `Etapa 1 "Cadastro da Admissão" concluída na abertura do processo.`
      });
    }

    // Auditoria Específica da Criação do Checklist de Documentos (Bloco 3.4 - Requisito 20)
    this.addAuditLog({
      userName: createdByUserName,
      action: 'admission_document_checklist_created',
      admissionId,
      employeeName: employee.name,
      details: `Checklist da admissão gerado para o cargo "${employee.role}": ${totalDocsCount} documentos (${requiredDocsCount} obrigatórios, ${optionalDocsCount} opcionais).`
    });

    this.addAuditLog({
      userName: 'Sistema',
      action: 'Convite gerado',
      admissionId,
      employeeName: employee.name,
      details: `Token de acesso criptografado gerado com validade até ${new Date(inviteExpiresAt).toLocaleDateString('pt-BR')}`
    });

    this.addNotification({
      title: 'Nova admissão criada',
      message: `Admissão de ${employee.name} (${employee.role}) foi criada com sucesso com ${totalDocsCount} documentos no checklist.`,
      type: 'admission_created',
      admissionId,
      link: `/admissoes/${admissionId}`
    });

    this.save();
    return newAdmission;
  }

  markInviteSentWhatsApp(admissionId: string, userName: string) {
    const admission = this.getAdmissionById(admissionId);
    if (!admission) return;
    admission.inviteSentViaWhatsApp = true;
    admission.inviteSentAt = new Date().toISOString();
    admission.updatedAt = new Date().toISOString();
    
    this.addAuditLog({
      userName,
      action: 'RH enviou convite pelo WhatsApp',
      admissionId,
      employeeName: admission.employee.name,
      details: `Link de convite enviado via WhatsApp para o telefone ${admission.employee.phone}`
    });
    this.save();
  }

  recordConsent(admissionId: string, termVersion: string, ipAddress?: string, userAgent?: string) {
    const admission = this.getAdmissionById(admissionId);
    if (!admission) throw new Error('Admissão não encontrada');

    admission.consentGiven = true;
    admission.consentDate = new Date().toISOString();
    admission.consentTextVersion = termVersion;
    admission.updatedAt = new Date().toISOString();

    const consentRecord: ConsentRecord = {
      id: 'consent-' + crypto.randomUUID(),
      admissionId,
      employeeId: admission.employeeId,
      employeeCpf: admission.employee.cpf,
      timestamp: new Date().toISOString(),
      termVersion,
      termSummary: 'Ciência do tratamento de dados pessoais e documentos estritamente para o processo de admissão (LGPD Art. 7º, V e IX)',
      ipAddress,
      userAgent
    };

    this.data.consentRecords.push(consentRecord);

    this.addAuditLog({
      userName: admission.employee.name,
      action: 'Funcionário aceitou o termo de consentimento LGPD',
      admissionId,
      employeeName: admission.employee.name,
      details: `Consentimento formal registrado sob a versão ${termVersion}. IP: ${ipAddress || 'Não capturado'}`,
      ipAddress
    });

    this.save();
    return consentRecord;
  }

  // ==========================================
  // PARTE 5 - BLOCO 5.1: GESTÃO DE FUNCIONÁRIOS
  // ==========================================

  getEmployeesFiltered(options?: EmployeeFilters): EmployeeResponse {
    const list = this.data.employees || [];

    // Coleta filtros disponíveis na base inteira
    const rolesSet = new Set<string>();
    const departmentsSet = new Set<string>();
    const unitsSet = new Set<string>();
    const statusesSet = new Set<string>();

    for (const emp of list) {
      if (emp.role) rolesSet.add(emp.role);
      if (emp.department) departmentsSet.add(emp.department);
      if (emp.unit) unitsSet.add(emp.unit);
      statusesSet.add(emp.status || (emp.active ? 'Ativo' : 'Inativo'));
    }

    let filtered = list.map(emp => {
      const active = emp.active !== undefined ? emp.active : true;
      const status: EmployeeStatus = emp.status || (active ? 'Ativo' : 'Inativo');
      return {
        ...emp,
        active,
        status,
        cpfMasked: maskCPF(emp.cpf)
      };
    });

    if (options) {
      // 1. Pesquisa por nome, CPF (limpo ou formatado), e-mail, telefone, matrícula
      if (options.search && options.search.trim()) {
        const q = options.search.trim().toLowerCase();
        const cleanQuery = q.replace(/\D/g, '');

        filtered = filtered.filter(emp => {
          const matchName = emp.name.toLowerCase().includes(q);
          const matchEmail = emp.email.toLowerCase().includes(q);
          const matchPhone = emp.phone ? emp.phone.includes(cleanQuery) : false;
          const matchSecPhone = emp.secondaryPhone ? emp.secondaryPhone.includes(cleanQuery) : false;
          const matchReg = emp.registrationNumber ? emp.registrationNumber.toLowerCase().includes(q) : false;
          const cleanEmpCpf = emp.cpf ? emp.cpf.replace(/\D/g, '') : '';
          const matchCpf = cleanQuery.length >= 3 && cleanEmpCpf.includes(cleanQuery);

          return matchName || matchEmail || matchPhone || matchSecPhone || matchReg || matchCpf;
        });
      }

      // 2. Filtro por Situação
      if (options.status && options.status !== 'TODOS') {
        filtered = filtered.filter(emp => emp.status === options.status);
      }

      // 3. Filtro por Cargo
      if (options.role && options.role !== 'TODOS') {
        filtered = filtered.filter(emp => emp.role === options.role);
      }

      // 4. Filtro por Setor / Departamento
      if (options.department && options.department !== 'TODOS') {
        filtered = filtered.filter(emp => emp.department === options.department);
      }

      // 5. Filtro por Unidade
      if (options.unit && options.unit !== 'TODOS') {
        filtered = filtered.filter(emp => emp.unit === options.unit);
      }

      // 6. Filtro por Período de Admissão / Início Previsto
      if (options.startDate) {
        const start = options.startDate.split('T')[0];
        filtered = filtered.filter(emp => {
          const d = (emp.admissionDate || emp.expectedStartDate || emp.createdAt || '').split('T')[0];
          return d >= start;
        });
      }
      if (options.endDate) {
        const end = options.endDate.split('T')[0];
        filtered = filtered.filter(emp => {
          const d = (emp.admissionDate || emp.expectedStartDate || emp.createdAt || '').split('T')[0];
          return d <= end;
        });
      }
    }

    // Ordenação padrão: mais recentes primeiro (createdAt desc)
    filtered.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    const total = filtered.length;
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options?.limit) || 10));
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startIndex = (page - 1) * limit;
    const paginatedEmployees = filtered.slice(startIndex, startIndex + limit);

    return {
      employees: paginatedEmployees,
      total,
      page,
      limit,
      totalPages,
      filters: {
        roles: Array.from(rolesSet).sort(),
        departments: Array.from(departmentsSet).sort(),
        units: Array.from(unitsSet).sort(),
        statuses: ['Ativo', 'Inativo']
      }
    };
  }

  getEmployeeById(id: string): Employee | undefined {
    return (this.data.employees || []).find(e => e.id === id);
  }

  getEmployeeDetails(id: string): EmployeeDetailResponse | null {
    const employee = this.getEmployeeById(id);
    if (!employee) return null;

    const active = employee.active !== undefined ? employee.active : true;
    const status: EmployeeStatus = employee.status || (active ? 'Ativo' : 'Inativo');
    const cleanCpf = employee.cpf.replace(/\D/g, '');

    // Busca todas as admissões vinculadas ao colaborador
    const admissions = (this.data.admissions || [])
      .filter(a => a.employeeId === id || a.employee?.cpf?.replace(/\D/g, '') === cleanCpf)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calcula resumo operacional
    const lastAdmission = admissions[0] || null;
    let pendingCount = 0;
    for (const adm of admissions) {
      if (adm.status !== 'Concluída' && adm.status !== 'Cancelada') {
        for (const doc of (adm.documents || [])) {
          if (doc.status === 'Não enviado' || doc.status === 'Rejeitado' || doc.status === 'Em análise' || doc.status === 'Reenviado') {
            pendingCount++;
          }
        }
      }
    }

    // Busca registros de auditoria vinculados ao colaborador
    const auditLogs = (this.data.auditLogs || [])
      .filter(log => 
        log.entityId === id || 
        log.employeeName === employee.name || 
        (log.admissionId && admissions.some(a => a.id === log.admissionId))
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      employee: {
        ...employee,
        active,
        status,
        cpfMasked: maskCPF(employee.cpf)
      },
      admissions,
      summary: {
        totalAdmissions: admissions.length,
        lastAdmission,
        lastAdmissionStatus: lastAdmission ? lastAdmission.status : null,
        pendingCount
      },
      auditLogs,
      documents: this.getEmployeeDocuments(id),
      documentStats: this.getEmployeeDocumentStats(id)
    };
  }

  createEmployee(data: Partial<Employee>, createdByUserName: string): Employee {
    if (!data.name || data.name.trim().length < 2) {
      throw new Error('O nome completo do funcionário é obrigatório.');
    }
    if (!data.cpf) {
      throw new Error('O CPF é obrigatório.');
    }
    const cleanCPF = data.cpf.replace(/\D/g, '');
    if (!validateCPF(cleanCPF)) {
      throw new Error('CPF inválido. Verifique os dígitos informados.');
    }

    // Checagem rigorosa de duplicidade de CPF
    const existing = (this.data.employees || []).find(e => e.cpf.replace(/\D/g, '') === cleanCPF);
    if (existing) {
      const err: any = new Error('Operação bloqueada. CPF já cadastrado.');
      err.duplicate = true;
      err.existingEmployeeId = existing.id;
      throw err;
    }

    if (!data.birthDate) {
      throw new Error('A data de nascimento é obrigatória.');
    }
    const bdCheck = new Date(data.birthDate + 'T00:00:00');
    if (isNaN(bdCheck.getTime()) || bdCheck > new Date()) {
      throw new Error('A data de nascimento não pode ser uma data futura.');
    }
    if (!data.phone) {
      throw new Error('O telefone de contato é obrigatório.');
    }
    if (!data.email || !validateEmail(data.email)) {
      throw new Error('E-mail inválido ou não informado.');
    }
    if (!data.role || !data.role.trim()) {
      throw new Error('O cargo é obrigatório.');
    }
    if (!data.department || !data.department.trim()) {
      throw new Error('O setor é obrigatório.');
    }
    if (!data.unit || !data.unit.trim()) {
      throw new Error('A unidade é obrigatória.');
    }

    // Se informou matrícula, valida unicidade
    if (data.registrationNumber && data.registrationNumber.trim()) {
      const reg = data.registrationNumber.trim().toLowerCase();
      const existingReg = (this.data.employees || []).find(e => 
        e.registrationNumber && e.registrationNumber.trim().toLowerCase() === reg
      );
      if (existingReg) {
        throw new Error(`A matrícula "${data.registrationNumber.trim()}" já está em uso pelo funcionário ${existingReg.name}.`);
      }
    }

    const now = new Date().toISOString();
    const newEmployee: Employee = {
      id: 'emp-' + crypto.randomUUID(),
      name: data.name.trim(),
      cpf: cleanCPF,
      birthDate: data.birthDate,
      phone: data.phone.replace(/\D/g, ''),
      secondaryPhone: data.secondaryPhone ? data.secondaryPhone.replace(/\D/g, '') : undefined,
      email: data.email.trim().toLowerCase(),
      role: data.role.trim(),
      jobPositionId: data.jobPositionId || undefined,
      department: data.department.trim(),
      unit: data.unit.trim(),
      expectedStartDate: data.expectedStartDate || data.admissionDate || now.slice(0, 10),
      admissionDate: data.admissionDate || data.expectedStartDate || now.slice(0, 10),
      registrationNumber: data.registrationNumber?.trim() || undefined,
      active: true,
      status: 'Ativo',
      cep: data.cep ? data.cep.replace(/\D/g, '') : undefined,
      street: data.street?.trim() || undefined,
      number: data.number?.trim() || undefined,
      complement: data.complement?.trim() || undefined,
      neighborhood: data.neighborhood?.trim() || undefined,
      city: data.city?.trim() || undefined,
      state: data.state?.trim()?.toUpperCase() || undefined,
      // Bloco 5.2 - Dados Pessoais
      socialName: data.socialName?.trim() || undefined,
      rg: data.rg?.trim() || undefined,
      rgIssuer: data.rgIssuer?.trim() || undefined,
      rgIssueDate: data.rgIssueDate?.trim() || undefined,
      gender: data.gender?.trim() || undefined,
      maritalStatus: data.maritalStatus?.trim() || undefined,
      motherName: data.motherName?.trim() || undefined,
      fatherName: data.fatherName?.trim() || undefined,
      nationality: data.nationality?.trim() || undefined,
      birthplace: data.birthplace?.trim() || undefined,
      // Bloco 5.2 - Contato
      whatsapp: data.whatsapp ? data.whatsapp.replace(/\D/g, '') : undefined,
      personalEmail: data.personalEmail?.trim()?.toLowerCase() || undefined,
      corporateEmail: data.corporateEmail?.trim()?.toLowerCase() || undefined,
      emergencyContactName: data.emergencyContactName?.trim() || undefined,
      emergencyContactRelationship: data.emergencyContactRelationship?.trim() || undefined,
      emergencyContactPhone: data.emergencyContactPhone ? data.emergencyContactPhone.replace(/\D/g, '') : undefined,
      emergencyContactNotes: data.emergencyContactNotes?.trim() || undefined,
      // Bloco 5.2 - Dados Profissionais
      manager: data.manager?.trim() || undefined,
      contractType: data.contractType?.trim() || undefined,
      workShift: data.workShift?.trim() || undefined,
      professionalNotes: data.professionalNotes?.trim() || undefined,
      // Bloco 5.2 - Dados Complementares
      administrativeNotes: data.administrativeNotes?.trim() || undefined,
      internalId: data.internalId?.trim() || undefined,
      createdAt: now,
      updatedAt: now
    };

    if (!this.data.employees) this.data.employees = [];
    this.data.employees.push(newEmployee);

    this.addAuditLog({
      userName: createdByUserName,
      action: 'Novo funcionário cadastrado pelo RH',
      entityType: 'employee',
      entityId: newEmployee.id,
      employeeName: newEmployee.name,
      details: `Cadastro manual do funcionário ${newEmployee.name} (CPF: ${maskCPF(newEmployee.cpf)}, Cargo: ${newEmployee.role}) realizado por ${createdByUserName}.`
    });

    this.save();
    return newEmployee;
  }

  updateEmployee(id: string, updates: Partial<Employee>, updatedByUserName: string): Employee {
    const employee = this.getEmployeeById(id);
    if (!employee) {
      throw new Error('Funcionário não encontrado.');
    }

    const structuredChanges: AuditLogChange[] = [];

    // 1. Validação de CPF se alterado
    if (updates.cpf && updates.cpf !== employee.cpf) {
      const cleanCPF = updates.cpf.replace(/\D/g, '');
      if (!validateCPF(cleanCPF)) {
        throw new Error('CPF informado é inválido.');
      }
      const duplicate = (this.data.employees || []).find(e => e.id !== id && e.cpf.replace(/\D/g, '') === cleanCPF);
      if (duplicate) {
        throw new Error('Operação bloqueada. CPF já cadastrado.');
      }
      structuredChanges.push({
        field: 'cpf',
        label: 'CPF',
        previousValue: maskCPF(employee.cpf),
        newValue: maskCPF(cleanCPF)
      });
      employee.cpf = cleanCPF;
    }

    // 2. Validação de matrícula se alterada
    if (updates.registrationNumber !== undefined && updates.registrationNumber !== employee.registrationNumber) {
      const reg = updates.registrationNumber ? updates.registrationNumber.trim() : '';
      if (reg) {
        const duplicate = (this.data.employees || []).find(e => e.id !== id && e.registrationNumber && e.registrationNumber.trim().toLowerCase() === reg.toLowerCase());
        if (duplicate) {
          throw new Error(`A matrícula "${reg}" já está em uso pelo funcionário ${duplicate.name}.`);
        }
      }
      structuredChanges.push({
        field: 'registrationNumber',
        label: 'Matrícula',
        previousValue: employee.registrationNumber || '(não preenchida)',
        newValue: reg || '(removida)'
      });
      employee.registrationNumber = reg || undefined;
    }

    // 3. Validação de e-mail se alterado
    if (updates.email && updates.email !== employee.email) {
      if (!validateEmail(updates.email)) {
        throw new Error('Formato de e-mail inválido.');
      }
      structuredChanges.push({
        field: 'email',
        label: 'E-mail',
        previousValue: employee.email,
        newValue: updates.email.trim().toLowerCase()
      });
      employee.email = updates.email.trim().toLowerCase();
    }

    // 4. Checagem dos demais campos
    const checkStringChange = (field: keyof Employee, label: string, cleanFunc?: (v: string) => string) => {
      if (updates[field] !== undefined && updates[field] !== employee[field]) {
        const val = updates[field] as string;
        const processed = cleanFunc ? cleanFunc(val) : (typeof val === 'string' ? val.trim() : val);
        structuredChanges.push({
          field: field as string,
          label,
          previousValue: (employee[field] as string) || '(não informado)',
          newValue: processed || '(removido)'
        });
        (employee as any)[field] = processed || undefined;
      }
    };

    // Validação de Data de Nascimento se alterada
    if (updates.birthDate && updates.birthDate !== employee.birthDate) {
      const bdCheck = new Date(updates.birthDate + 'T00:00:00');
      if (isNaN(bdCheck.getTime()) || bdCheck > new Date()) {
        throw new Error('A data de nascimento não pode ser uma data futura.');
      }
    }

    checkStringChange('name', 'Nome Completo');
    checkStringChange('birthDate', 'Data de Nascimento');
    checkStringChange('phone', 'Telefone', v => v.replace(/\D/g, ''));
    checkStringChange('secondaryPhone', 'Telefone Secundário', v => v.replace(/\D/g, ''));
    checkStringChange('role', 'Cargo');
    checkStringChange('jobPositionId', 'Identificador de Cargo');
    checkStringChange('department', 'Setor');
    checkStringChange('unit', 'Unidade');
    checkStringChange('expectedStartDate', 'Início Previsto');
    checkStringChange('admissionDate', 'Data de Admissão');

    // Endereço
    checkStringChange('cep', 'CEP', v => v.replace(/\D/g, ''));
    checkStringChange('street', 'Logradouro');
    checkStringChange('number', 'Número');
    checkStringChange('complement', 'Complemento');
    checkStringChange('neighborhood', 'Bairro');
    checkStringChange('city', 'Cidade');
    checkStringChange('state', 'UF', v => v.toUpperCase());

    // Bloco 5.2 - Dados Pessoais e Identificação
    checkStringChange('socialName', 'Nome Social');
    checkStringChange('rg', 'RG');
    checkStringChange('rgIssuer', 'Órgão Emissor do RG');
    checkStringChange('rgIssueDate', 'Data de Emissão do RG');
    checkStringChange('gender', 'Gênero/Sexo');
    checkStringChange('maritalStatus', 'Estado Civil');
    checkStringChange('motherName', 'Nome da Mãe');
    checkStringChange('fatherName', 'Nome do Pai');
    checkStringChange('nationality', 'Nacionalidade');
    checkStringChange('birthplace', 'Naturalidade');

    // Bloco 5.2 - Contato
    checkStringChange('whatsapp', 'WhatsApp', v => v.replace(/\D/g, ''));
    checkStringChange('personalEmail', 'E-mail Pessoal', v => v.toLowerCase());
    checkStringChange('corporateEmail', 'E-mail Corporativo', v => v.toLowerCase());
    checkStringChange('emergencyContactName', 'Nome do Contato de Emergência');
    checkStringChange('emergencyContactRelationship', 'Grau de Parentesco de Emergência');
    checkStringChange('emergencyContactPhone', 'Telefone de Emergência', v => v.replace(/\D/g, ''));
    checkStringChange('emergencyContactNotes', 'Observações do Contato de Emergência');

    // Bloco 5.2 - Dados Profissionais
    checkStringChange('manager', 'Gestor Imediato');
    checkStringChange('contractType', 'Tipo de Vínculo');
    checkStringChange('workShift', 'Turno de Trabalho');
    checkStringChange('professionalNotes', 'Observações Profissionais');

    // Bloco 5.2 - Dados Complementares
    checkStringChange('administrativeNotes', 'Observações Administrativas');
    checkStringChange('internalId', 'Identificador Interno');

    employee.updatedAt = new Date().toISOString();

    // Sincroniza dados cadastrais em admissões ativas/abertas sem violar snapshots históricos de documentos
    for (const adm of (this.data.admissions || [])) {
      if (adm.employeeId === id) {
        if (employee.name) adm.employee.name = employee.name;
        if (employee.phone) adm.employee.phone = employee.phone;
        if (employee.email) adm.employee.email = employee.email;
        adm.updatedAt = new Date().toISOString();
      }
    }

    if (structuredChanges.length > 0) {
      this.addAuditLog({
        userName: updatedByUserName,
        action: 'Cadastro do funcionário atualizado pelo RH',
        entityType: 'employee',
        entityId: employee.id,
        employeeName: employee.name,
        changes: structuredChanges,
        details: `Alteração de cadastro de ${employee.name} realizada por ${updatedByUserName}: ${structuredChanges.map(c => c.label).join(', ')}.`
      });
    }

    this.save();
    return employee;
  }

  setEmployeeStatus(id: string, status: 'Ativo' | 'Inativo', reason: string, updatedByUserName: string): Employee {
    const employee = this.getEmployeeById(id);
    if (!employee) {
      throw new Error('Funcionário não encontrado.');
    }

    const previousStatus = employee.status || (employee.active ? 'Ativo' : 'Inativo');
    if (previousStatus === status) {
      return employee;
    }

    employee.status = status;
    employee.active = (status === 'Ativo');
    employee.updatedAt = new Date().toISOString();

    this.addAuditLog({
      userName: updatedByUserName,
      action: status === 'Inativo' ? 'Funcionário inativado pelo RH' : 'Funcionário reativado pelo RH',
      entityType: 'employee',
      entityId: employee.id,
      employeeName: employee.name,
      fieldChanged: 'Situação',
      previousValue: previousStatus,
      newValue: status,
      details: `Situação de ${employee.name} alterada para "${status}" por ${updatedByUserName}.${reason ? ' Motivo: ' + reason : ''}`
    });

    this.save();
    return employee;
  }

  deleteEmployee(id: string, deletedByUserName: string): boolean {
    const employee = this.getEmployeeById(id);
    if (!employee) {
      throw new Error('Funcionário não encontrado.');
    }

    // Regra de Integridade e Soft Delete: não excluir se houver admissões ou histórico
    const cleanCpf = employee.cpf.replace(/\D/g, '');
    const hasAdmissions = (this.data.admissions || []).some(a => 
      a.employeeId === id || a.employee?.cpf?.replace(/\D/g, '') === cleanCpf
    );
    const hasAuditLogs = (this.data.auditLogs || []).some(l => 
      l.entityId === id || l.employeeName === employee.name
    );

    if (hasAdmissions || hasAuditLogs) {
      throw new Error('Não é permitido excluir fisicamente um funcionário que possui admissões ou histórico vinculados. Utilize a opção de Inativação para preservar os registros legais e auditoria.');
    }

    this.data.employees = (this.data.employees || []).filter(e => e.id !== id);

    this.addAuditLog({
      userName: deletedByUserName,
      action: 'Funcionário excluído pelo RH',
      entityType: 'employee',
      entityId: id,
      employeeName: employee.name,
      details: `Exclusão cadastral do funcionário ${employee.name} realizada por ${deletedByUserName}.`
    });

    this.save();
    return true;
  }

  // ------------------------------------------------------------------
  // PARTE 5 - BLOCO 5.3: GESTÃO DE DOCUMENTOS DO FUNCIONÁRIO
  // ------------------------------------------------------------------

  getEmployeeDocuments(employeeId: string, options?: EmployeeDocumentFilterOptions): EmployeeDocument[] {
    const employee = this.getEmployeeById(employeeId);
    if (!employee) return [];

    if (!this.data.employeeDocuments) {
      this.data.employeeDocuments = [];
    }

    const cleanCpf = employee.cpf.replace(/\D/g, '');
    const admissions = (this.data.admissions || []).filter(a => 
      a.employeeId === employeeId || a.employee?.cpf?.replace(/\D/g, '') === cleanCpf
    );

    const now = new Date();
    const result: EmployeeDocument[] = [];

    // 1. Documentos diretos do prontuário (arquivados/renovados pelo RH)
    const directDocs = this.data.employeeDocuments.filter(d => d.employeeId === employeeId);
    for (const doc of directDocs) {
      let status = doc.status;
      let isExpired = false;
      let isNearExpiration = false;
      let daysUntilExpiration: number | undefined = undefined;

      if (doc.hasExpiration && doc.expirationDate) {
        const expDate = new Date(doc.expirationDate + 'T23:59:59');
        if (!isNaN(expDate.getTime())) {
          const diffMs = expDate.getTime() - now.getTime();
          daysUntilExpiration = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (daysUntilExpiration < 0) {
            isExpired = true;
            status = 'Vencido';
          } else if (daysUntilExpiration <= 30) {
            isNearExpiration = true;
            if (status === 'Válido' || status === 'Pendente') {
              status = 'A Vencer';
            }
          }
        }
      }

      result.push({
        ...doc,
        status,
        isExpired,
        isNearExpiration,
        daysUntilExpiration,
        fileUrl: doc.fileUrl || `/api/employees/documents/${doc.id}/file`
      });
    }

    // 2. Documentos consolidados dos processos de admissão
    for (const adm of admissions) {
      for (const admDoc of (adm.documents || [])) {
        const alreadyInDirect = directDocs.some(d => 
          d.id === admDoc.id || 
          (d.admissionId === adm.id && d.title.toLowerCase() === (admDoc.document_type_name || admDoc.documentType || '').toLowerCase())
        );

        if (!alreadyInDirect) {
          let status: EmployeeDocumentStatus = 'Pendente';
          if (admDoc.status === 'Aprovado') status = 'Válido';
          else if (admDoc.status === 'Em análise' || admDoc.status === 'Reenviado') status = 'Em Análise';
          else if (admDoc.status === 'Rejeitado') status = 'Rejeitado';

          let isExpired = false;
          let isNearExpiration = false;
          let daysUntilExpiration: number | undefined = undefined;

          const expDateStr = (admDoc as any).expirationDate;
          if (expDateStr) {
            const expDate = new Date(expDateStr + 'T23:59:59');
            if (!isNaN(expDate.getTime())) {
              const diffMs = expDate.getTime() - now.getTime();
              daysUntilExpiration = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              if (daysUntilExpiration < 0) {
                isExpired = true;
                status = 'Vencido';
              } else if (daysUntilExpiration <= 30) {
                isNearExpiration = true;
                if (status === 'Válido') status = 'A Vencer';
              }
            }
          }

          const versions: EmployeeDocumentVersion[] = (admDoc.versions || []).map(v => ({
            version: v.version,
            fileName: v.fileName || admDoc.fileName || `${admDoc.documentType}.pdf`,
            fileSize: v.fileSize || admDoc.fileSize || 1024 * 1024,
            mimeType: v.mimeType || admDoc.mimeType || 'application/pdf',
            storagePath: v.storagePath || admDoc.storagePath,
            fileUrl: `/api/documents/${admDoc.id}/file?version=${v.version}`,
            uploadedAt: v.uploadedAt || admDoc.uploadedAt || adm.createdAt,
            uploadedBy: 'Colaborador (Admissão)',
            notes: v.rejectionReason || ''
          }));

          if (versions.length === 0 && (admDoc.fileName || admDoc.storagePath)) {
            versions.push({
              version: admDoc.currentVersion || 1,
              fileName: admDoc.fileName || `${admDoc.documentType}.pdf`,
              fileSize: admDoc.fileSize || 1024 * 1024,
              mimeType: admDoc.mimeType || 'application/pdf',
              storagePath: admDoc.storagePath,
              fileUrl: `/api/documents/${admDoc.id}/file`,
              uploadedAt: admDoc.uploadedAt || adm.createdAt,
              uploadedBy: 'Colaborador (Admissão)'
            });
          }

          let category: EmployeeDocumentCategory = 'Identificação';
          const typeName = (admDoc.document_type_name || admDoc.documentType || '').toLowerCase();
          if (typeName.includes('aso') || typeName.includes('exame') || typeName.includes('médico') || typeName.includes('saúde')) {
            category = 'Saúde e Segurança (SST)';
          } else if (typeName.includes('contrato') || typeName.includes('termo') || typeName.includes('declaração') || typeName.includes('aditivo')) {
            category = 'Contratual';
          } else if (typeName.includes('curso') || typeName.includes('nr-') || typeName.includes('certificado') || typeName.includes('escolaridade') || typeName.includes('diploma')) {
            category = 'Certificações e Treinamentos';
          } else if (typeName.includes('conta') || typeName.includes('bancár') || typeName.includes('vale') || typeName.includes('salár')) {
            category = 'Financeiro e Benefícios';
          }

          result.push({
            id: admDoc.id,
            employeeId,
            title: admDoc.document_type_name || admDoc.documentType || 'Documento de Admissão',
            category: admDoc.category || category,
            documentTypeId: admDoc.document_type_id,
            documentTypeName: admDoc.document_type_name || admDoc.documentType,
            description: admDoc.instructions || '',
            hasExpiration: !!admDoc.requires_expiration_date || !!expDateStr,
            expirationDate: expDateStr,
            daysUntilExpiration,
            isExpired,
            isNearExpiration,
            status,
            fileName: admDoc.fileName || `${admDoc.documentType}.pdf`,
            fileSize: admDoc.fileSize || 1024 * 1024,
            mimeType: admDoc.mimeType || 'application/pdf',
            storagePath: admDoc.storagePath,
            fileUrl: `/api/documents/${admDoc.id}/file`,
            currentVersion: admDoc.currentVersion || 1,
            versions,
            origin: 'Admissão',
            admissionId: adm.id,
            admissionRole: adm.employee?.role,
            notes: admDoc.rejectionReason || admDoc.rejectionNotes,
            createdAt: admDoc.uploadedAt || admDoc.createdAt || adm.createdAt,
            createdBy: adm.employee.name,
            updatedAt: admDoc.reviewedAt || admDoc.uploadedAt || adm.updatedAt,
            updatedBy: admDoc.reviewedBy || 'RH'
          });
        }
      }
    }

    // Aplicação dos Filtros
    let filtered = result;

    if (options?.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim();
      filtered = filtered.filter(d => 
        d.title.toLowerCase().includes(q) ||
        d.fileName.toLowerCase().includes(q) ||
        (d.category && d.category.toLowerCase().includes(q)) ||
        (d.notes && d.notes.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q))
      );
    }

    if (options?.category && options.category !== 'TODAS' && options.category !== 'all') {
      filtered = filtered.filter(d => d.category === options.category);
    }

    if (options?.status && options.status !== 'TODOS' && options.status !== 'all') {
      filtered = filtered.filter(d => d.status === options.status);
    }

    if (options?.expirationStatus && options.expirationStatus !== 'todos') {
      if (options.expirationStatus === 'valido') {
        filtered = filtered.filter(d => d.status === 'Válido' && !d.isExpired);
      } else if (options.expirationStatus === 'a_vencer') {
        filtered = filtered.filter(d => d.isNearExpiration || d.status === 'A Vencer');
      } else if (options.expirationStatus === 'vencido') {
        filtered = filtered.filter(d => d.isExpired || d.status === 'Vencido');
      } else if (options.expirationStatus === 'sem_validade') {
        filtered = filtered.filter(d => !d.hasExpiration || !d.expirationDate);
      }
    }

    if (options?.origin && options.origin !== 'TODOS' && options.origin !== 'all') {
      filtered = filtered.filter(d => d.origin.toLowerCase() === options.origin?.toLowerCase());
    }

    // Ordenação
    filtered.sort((a, b) => {
      if (a.isExpired && !b.isExpired) return -1;
      if (!a.isExpired && b.isExpired) return 1;
      if (a.isNearExpiration && !b.isNearExpiration) return -1;
      if (!a.isNearExpiration && b.isNearExpiration) return 1;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });

    return filtered;
  }

  getEmployeeDocumentStats(employeeId: string): EmployeeDocumentStats {
    const all = this.getEmployeeDocuments(employeeId);
    let valid = 0;
    let nearExpiration = 0;
    let expired = 0;
    let noExpiration = 0;
    const byCategory: Record<string, number> = {};

    for (const d of all) {
      const cat = d.category || 'Outros';
      byCategory[cat] = (byCategory[cat] || 0) + 1;

      if (d.isExpired || d.status === 'Vencido') {
        expired++;
      } else if (d.isNearExpiration || d.status === 'A Vencer') {
        nearExpiration++;
      } else if (d.status === 'Válido') {
        valid++;
      }

      if (!d.hasExpiration || !d.expirationDate) {
        noExpiration++;
      }
    }

    return {
      total: all.length,
      valid,
      nearExpiration,
      expired,
      noExpiration,
      byCategory
    };
  }

  getEmployeeDocumentById(id: string): EmployeeDocument | undefined {
    if (!this.data.employeeDocuments) this.data.employeeDocuments = [];
    const direct = this.data.employeeDocuments.find(d => d.id === id);
    if (direct) return direct;

    for (const emp of (this.data.employees || [])) {
      const docs = this.getEmployeeDocuments(emp.id);
      const found = docs.find(d => d.id === id);
      if (found) return found;
    }
    return undefined;
  }

  createEmployeeDocument(
    employeeId: string,
    docData: {
      title: string;
      category: EmployeeDocumentCategory | string;
      documentTypeId?: string;
      documentTypeName?: string;
      description?: string;
      hasExpiration?: boolean;
      issueDate?: string;
      expirationDate?: string;
      notes?: string;
    },
    fileInfo: {
      filename: string;
      originalname: string;
      size: number;
      mimetype: string;
    },
    userName: string = 'RH'
  ): EmployeeDocument {
    const employee = this.getEmployeeById(employeeId);
    if (!employee) {
      throw new Error('Funcionário não encontrado.');
    }

    if (!docData.title || !docData.title.trim()) {
      throw new Error('O título do documento é obrigatório.');
    }

    if (!this.data.employeeDocuments) {
      this.data.employeeDocuments = [];
    }

    const docId = `empdoc-${crypto.randomUUID()}`;
    const now = new Date();
    const nowIso = now.toISOString();

    let isExpired = false;
    let isNearExpiration = false;
    let daysUntilExpiration: number | undefined = undefined;
    let status: EmployeeDocumentStatus = 'Válido';

    if (docData.hasExpiration && docData.expirationDate) {
      const expDate = new Date(docData.expirationDate + 'T23:59:59');
      if (!isNaN(expDate.getTime())) {
        const diffMs = expDate.getTime() - now.getTime();
        daysUntilExpiration = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (daysUntilExpiration < 0) {
          isExpired = true;
          status = 'Vencido';
        } else if (daysUntilExpiration <= 30) {
          isNearExpiration = true;
          status = 'A Vencer';
        }
      }
    }

    const initialVersion: EmployeeDocumentVersion = {
      version: 1,
      fileName: fileInfo.originalname,
      fileSize: fileInfo.size,
      mimeType: fileInfo.mimetype,
      fileHash: (fileInfo as any).fileHash,
      storagePath: fileInfo.filename,
      fileUrl: `/api/employees/documents/${docId}/file?version=1`,
      uploadedAt: nowIso,
      uploadedBy: userName,
      notes: docData.notes || 'Versão inicial'
    };

    const newDoc: EmployeeDocument = {
      id: docId,
      employeeId,
      title: docData.title.trim(),
      category: docData.category || 'Outros',
      documentTypeId: docData.documentTypeId,
      documentTypeName: docData.documentTypeName || docData.title.trim(),
      description: docData.description,
      hasExpiration: !!docData.hasExpiration,
      issueDate: docData.issueDate,
      expirationDate: docData.expirationDate,
      daysUntilExpiration,
      isExpired,
      isNearExpiration,
      status,
      fileName: fileInfo.originalname,
      fileSize: fileInfo.size,
      mimeType: fileInfo.mimetype,
      fileHash: (fileInfo as any).fileHash,
      storagePath: fileInfo.filename,
      fileUrl: `/api/employees/documents/${docId}/file`,
      currentVersion: 1,
      versions: [initialVersion],
      origin: 'RH',
      notes: docData.notes,
      createdAt: nowIso,
      createdBy: userName,
      updatedAt: nowIso,
      updatedBy: userName
    };

    this.data.employeeDocuments.unshift(newDoc);
    this.save();

    this.addAuditLog({
      userName,
      action: 'Inclusão de documento do funcionário',
      entityType: 'employee_document',
      entityId: docId,
      employeeName: employee.name,
      details: `Documento "${newDoc.title}" (${newDoc.category}) arquivado com sucesso no prontuário de ${employee.name} por ${userName}.`
    });

    return newDoc;
  }

  renewEmployeeDocumentVersion(
    docId: string,
    fileInfo: {
      filename: string;
      originalname: string;
      size: number;
      mimetype: string;
    },
    updates: {
      expirationDate?: string;
      issueDate?: string;
      replacementReason?: string;
      notes?: string;
    },
    userName: string = 'RH'
  ): EmployeeDocument {
    if (!this.data.employeeDocuments) this.data.employeeDocuments = [];

    let docIndex = this.data.employeeDocuments.findIndex(d => d.id === docId);
    let doc: EmployeeDocument;

    if (docIndex === -1) {
      const virtualDoc = this.getEmployeeDocumentById(docId);
      if (!virtualDoc) {
        throw new Error('Documento não encontrado para renovação.');
      }
      doc = { ...virtualDoc };
      this.data.employeeDocuments.push(doc);
      docIndex = this.data.employeeDocuments.length - 1;
    } else {
      doc = this.data.employeeDocuments[docIndex];
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const newVersionNumber = (doc.currentVersion || 1) + 1;

    let isExpired = false;
    let isNearExpiration = false;
    let daysUntilExpiration: number | undefined = undefined;
    let status: EmployeeDocumentStatus = 'Válido';

    const finalExpDate = updates.expirationDate !== undefined ? updates.expirationDate : doc.expirationDate;

    if (doc.hasExpiration && finalExpDate) {
      const expDate = new Date(finalExpDate + 'T23:59:59');
      if (!isNaN(expDate.getTime())) {
        const diffMs = expDate.getTime() - now.getTime();
        daysUntilExpiration = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (daysUntilExpiration < 0) {
          isExpired = true;
          status = 'Vencido';
        } else if (daysUntilExpiration <= 30) {
          isNearExpiration = true;
          status = 'A Vencer';
        }
      }
    }

    const newVersionItem: EmployeeDocumentVersion = {
      version: newVersionNumber,
      fileName: fileInfo.originalname,
      fileSize: fileInfo.size,
      mimeType: fileInfo.mimetype,
      fileHash: (fileInfo as any).fileHash,
      storagePath: fileInfo.filename,
      fileUrl: `/api/employees/documents/${doc.id}/file?version=${newVersionNumber}`,
      uploadedAt: nowIso,
      uploadedBy: userName,
      replacementReason: updates.replacementReason,
      notes: updates.notes || `Renovação / Versão ${newVersionNumber}`
    };

    doc.currentVersion = newVersionNumber;
    doc.fileName = fileInfo.originalname;
    doc.fileSize = fileInfo.size;
    doc.mimeType = fileInfo.mimetype;
    doc.fileHash = (fileInfo as any).fileHash;
    doc.storagePath = fileInfo.filename;
    doc.fileUrl = `/api/employees/documents/${doc.id}/file`;
    doc.versions.push(newVersionItem);

    if (updates.expirationDate !== undefined) doc.expirationDate = updates.expirationDate;
    if (updates.issueDate !== undefined) doc.issueDate = updates.issueDate;
    if (updates.notes !== undefined) doc.notes = updates.notes;

    doc.status = status;
    doc.isExpired = isExpired;
    doc.isNearExpiration = isNearExpiration;
    doc.daysUntilExpiration = daysUntilExpiration;
    doc.updatedAt = nowIso;
    doc.updatedBy = userName;

    this.data.employeeDocuments[docIndex] = doc;
    this.save();

    const employee = this.getEmployeeById(doc.employeeId);
    this.addAuditLog({
      userName,
      action: 'Renovação de documento do funcionário',
      entityType: 'employee_document',
      entityId: doc.id,
      employeeName: employee?.name || 'Funcionário',
      details: `Documento "${doc.title}" renovado para a Versão ${newVersionNumber} por ${userName}.${finalExpDate ? ' Novo vencimento: ' + finalExpDate : ''}`
    });

    return doc;
  }

  updateEmployeeDocument(
    docId: string,
    updates: Partial<EmployeeDocument>,
    userName: string = 'RH'
  ): EmployeeDocument {
    if (!this.data.employeeDocuments) this.data.employeeDocuments = [];

    let docIndex = this.data.employeeDocuments.findIndex(d => d.id === docId);
    let doc: EmployeeDocument;

    if (docIndex === -1) {
      const virtualDoc = this.getEmployeeDocumentById(docId);
      if (!virtualDoc) {
        throw new Error('Documento não encontrado.');
      }
      doc = { ...virtualDoc };
      this.data.employeeDocuments.push(doc);
      docIndex = this.data.employeeDocuments.length - 1;
    } else {
      doc = this.data.employeeDocuments[docIndex];
    }

    const now = new Date();
    const nowIso = now.toISOString();

    if (updates.title) doc.title = updates.title.trim();
    if (updates.category) doc.category = updates.category;
    if (updates.description !== undefined) doc.description = updates.description;
    if (updates.hasExpiration !== undefined) doc.hasExpiration = updates.hasExpiration;
    if (updates.issueDate !== undefined) doc.issueDate = updates.issueDate;
    if (updates.expirationDate !== undefined) doc.expirationDate = updates.expirationDate;
    if (updates.notes !== undefined) doc.notes = updates.notes;
    if (updates.status) doc.status = updates.status;

    if (doc.hasExpiration && doc.expirationDate) {
      const expDate = new Date(doc.expirationDate + 'T23:59:59');
      if (!isNaN(expDate.getTime())) {
        const diffMs = expDate.getTime() - now.getTime();
        doc.daysUntilExpiration = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        doc.isExpired = doc.daysUntilExpiration < 0;
        doc.isNearExpiration = doc.daysUntilExpiration >= 0 && doc.daysUntilExpiration <= 30;
        if (doc.isExpired) {
          doc.status = 'Vencido';
        } else if (doc.isNearExpiration && (doc.status === 'Válido' || !doc.status)) {
          doc.status = 'A Vencer';
        }
      }
    } else if (!doc.hasExpiration) {
      doc.daysUntilExpiration = undefined;
      doc.isExpired = false;
      doc.isNearExpiration = false;
    }

    doc.updatedAt = nowIso;
    doc.updatedBy = userName;

    this.data.employeeDocuments[docIndex] = doc;
    this.save();

    const employee = this.getEmployeeById(doc.employeeId);
    this.addAuditLog({
      userName,
      action: 'Metadados de documento atualizados',
      entityType: 'employee_document',
      entityId: doc.id,
      employeeName: employee?.name || 'Funcionário',
      details: `Metadados do documento "${doc.title}" atualizados por ${userName}.`
    });

    return doc;
  }

  deleteEmployeeDocument(docId: string, userName: string = 'RH'): boolean {
    if (!this.data.employeeDocuments) this.data.employeeDocuments = [];

    const docIndex = this.data.employeeDocuments.findIndex(d => d.id === docId);
    if (docIndex === -1) {
      throw new Error('Documentos arquivados originalmente no processo de admissão não podem ser excluídos fisicamente para preservar a integridade histórica da contratação.');
    }

    const doc = this.data.employeeDocuments[docIndex];
    const employee = this.getEmployeeById(doc.employeeId);

    this.data.employeeDocuments.splice(docIndex, 1);
    this.save();

    this.addAuditLog({
      userName,
      action: 'Exclusão de documento do funcionário',
      entityType: 'employee_document',
      entityId: docId,
      employeeName: employee?.name || 'Funcionário',
      details: `Documento "${doc.title}" removido do prontuário de ${employee?.name || 'Funcionário'} por ${userName}.`
    });

    return true;
  }

  confirmEmployeeData(admissionId: string) {
    const admission = this.getAdmissionById(admissionId);
    if (!admission) throw new Error('Admissão não encontrada');

    admission.dataConfirmed = true;
    admission.dataConfirmedAt = new Date().toISOString();
    admission.updatedAt = new Date().toISOString();

    // Atualiza automaticamente as etapas do processo admissional
    this.evaluateAdmissionProcessSteps(admission, admission.employee?.name || 'Colaborador');

    this.addAuditLog({
      userName: admission.employee.name,
      action: 'Funcionário confirmou seus dados',
      admissionId,
      employeeName: admission.employee.name,
      details: 'Colaborador verificou e validou todos os seus dados cadastrais pré-preenchidos.'
    });

    this.save();
    return admission;
  }

  finishEmployeeSubmission(admissionId: string) {
    const admission = this.getAdmissionById(admissionId);
    if (!admission) throw new Error('Admissão não encontrada');

    const requiredDocs = (admission.documents || []).filter(d => d.required);
    const missingDocs = requiredDocs.filter(d => d.status === 'Não enviado' || d.currentVersion === 0);

    if (missingDocs.length > 0) {
      const names = missingDocs.map(d => d.documentType).join(', ');
      throw new Error(`Ainda restam ${missingDocs.length} documento(s) obrigatório(s) para enviar: ${names}.`);
    }

    const now = new Date().toISOString();
    admission.candidateCompletedSubmission = true;
    admission.candidateFinishedAt = now;
    admission.updatedAt = now;

    // Se estava em Aguardando documentos ou Rascunho, avança para Em conferência
    if (admission.status === 'Aguardando documentos' || admission.status === 'Rascunho') {
      admission.status = 'Em conferência';
    }

    this.recalculateAdmissionStatus(admission);

    // Avalia etapas do processo admissional
    this.evaluateAdmissionProcessSteps(admission, admission.employee?.name || 'Colaborador');

    this.addAuditLog({
      userName: admission.employee.name,
      action: 'Colaborador finalizou cadastro e envio de documentos',
      admissionId,
      employeeName: admission.employee.name,
      details: 'Colaborador concluiu o preenchimento e enviou todos os documentos pelo portal mobile para conferência do RH.'
    });

    this.addNotification({
      title: 'Documentos enviados pelo colaborador',
      message: `${admission.employee.name} finalizou o envio de todos os documentos pelo portal mobile. A admissão aguarda conferência do RH.`,
      type: 'document_uploaded',
      admissionId,
      link: `/admissoes/${admissionId}`
    });

    this.save();
    return admission;
  }

  requestDataCorrection(admissionId: string, details: string) {
    const admission = this.getAdmissionById(admissionId);
    if (!admission) throw new Error('Admissão não encontrada');

    admission.correctionRequest = {
      requestedAt: new Date().toISOString(),
      details,
      resolved: false
    };
    admission.updatedAt = new Date().toISOString();

    this.addAuditLog({
      userName: admission.employee.name,
      action: 'Funcionário solicitou correção de dados',
      admissionId,
      employeeName: admission.employee.name,
      details: `Solicitação de correção cadastral: "${details}"`
    });

    this.addNotification({
      title: 'Solicitação de correção cadastral',
      message: `${admission.employee.name} apontou divergência em seus dados: "${details}"`,
      type: 'correction_requested',
      admissionId,
      link: `/admissoes/${admissionId}`
    });

    this.save();
    return admission;
  }

  // Upload de Documento
  uploadDocument(
    admissionId: string, 
    documentId: string, 
    file: { fileName: string; fileSize: number; mimeType: string; storagePath: string }
  ): AdmissionDocument {
    const admission = this.getAdmissionById(admissionId);
    if (!admission) throw new Error('Admissão não encontrada');

    const doc = admission.documents.find(d => d.id === documentId);
    if (!doc) throw new Error('Documento não encontrado');

    const isReupload = doc.status === 'Rejeitado' || doc.currentVersion > 0;
    const newVersion = doc.currentVersion + 1;
    const now = new Date().toISOString();

    const previousStatus = doc.status;
    const previousVersion = doc.currentVersion;

    const versionEntry = {
      version: newVersion,
      fileName: file.fileName,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      storagePath: file.storagePath,
      uploadedAt: now,
      status: (isReupload ? 'Reenviado' : 'Em análise') as DocumentStatus
    };

    doc.currentVersion = newVersion;
    doc.fileName = file.fileName;
    doc.fileSize = file.fileSize;
    doc.mimeType = file.mimeType;
    doc.storagePath = file.storagePath;
    doc.uploadedAt = now;
    doc.status = (isReupload ? 'Reenviado' : 'Em análise') as DocumentStatus;
    doc.rejectionReason = undefined;
    doc.rejectionNotes = undefined;
    doc.updatedAt = now;
    doc.versions.push(versionEntry);

    this.recalculateAdmissionStatus(admission);

    this.addAuditLog({
      userName: admission.employee.name,
      action: isReupload ? `Funcionário reenviou ${doc.documentType}` : `Funcionário enviou ${doc.documentType}`,
      entityType: 'admission_document',
      entityId: doc.id,
      entityName: doc.documentType,
      admissionId,
      employeeName: admission.employee.name,
      documentType: doc.documentType,
      fieldChanged: 'versão do documento',
      previousValue: previousVersion > 0 ? `V${previousVersion} (${previousStatus})` : 'Não enviado',
      newValue: `V${newVersion} (${doc.status})`,
      details: `Arquivo ${file.fileName} (${(file.fileSize / 1024).toFixed(1)} KB) - Versão ${newVersion} enviado por ${admission.employee.name}.`
    });

    this.addNotification({
      title: 'Documento recebido para conferência',
      message: `${admission.employee.name} enviou o documento: ${doc.documentType}`,
      type: 'document_uploaded',
      admissionId,
      link: `/admissoes/${admissionId}`
    });

    // Bloco 6.6: Automação determinística para documento reenviado
    if (isReupload) {
      this.executeAutomationOnDocumentResubmitted(admission, doc);
    }

    this.save();
    return doc;
  }

  // Conferência do RH (Aprovação ou Rejeição)
  reviewDocument(
    documentId: string, 
    decision: 'Aprovado' | 'Rejeitado', 
    reviewerName: string,
    rejectionReason?: string,
    rejectionNotes?: string,
    expectedVersion?: number
  ): { admission: Admission; document: AdmissionDocument } {
    let targetAdmission: Admission | undefined;
    let targetDocument: AdmissionDocument | undefined;

    for (const adm of this.data.admissions) {
      const doc = adm.documents.find(d => d.id === documentId);
      if (doc) {
        targetAdmission = adm;
        targetDocument = doc;
        break;
      }
    }

    if (!targetAdmission || !targetDocument) {
      throw new Error('Documento não encontrado na base de dados.');
    }

    // Validação de concorrência
    if (expectedVersion !== undefined && targetDocument.currentVersion !== expectedVersion) {
      throw new Error(
        `Conflito de concorrência: uma nova versão (V${targetDocument.currentVersion}) deste documento foi enviada enquanto você realizava a análise. Por favor, atualize a visualização.`
      );
    }

    // Regra: Não permitir aprovação sem documento enviado
    if (decision === 'Aprovado') {
      if (targetDocument.status === 'Não enviado' || targetDocument.currentVersion === 0) {
        throw new Error('Não é possível aprovar um documento que ainda não foi enviado pelo colaborador.');
      }
    }

    // Regra: Rejeição exige motivo obrigatório
    if (decision === 'Rejeitado') {
      if (!rejectionReason || !rejectionReason.trim()) {
        throw new Error('É obrigatório selecionar o motivo da rejeição do documento.');
      }
      // Se escolher "Outro", exigir descrição/orientação obrigatória
      if (rejectionReason.trim() === 'Outro' && (!rejectionNotes || !rejectionNotes.trim())) {
        throw new Error('Para o motivo "Outro", é obrigatório preencher a descrição detalhada da rejeição.');
      }
    }

    const now = new Date().toISOString();
    const previousStatus = targetDocument.status;

    targetDocument.status = decision;
    targetDocument.reviewedAt = now;
    targetDocument.reviewedBy = reviewerName;
    targetDocument.rejectionReason = decision === 'Rejeitado' ? rejectionReason.trim() : undefined;
    targetDocument.rejectionNotes = decision === 'Rejeitado' ? (rejectionNotes ? rejectionNotes.trim() : undefined) : undefined;
    targetDocument.updatedAt = now;

    // Atualiza a última versão gravada no histórico
    const lastVersion = targetDocument.versions[targetDocument.versions.length - 1];
    if (lastVersion) {
      lastVersion.status = decision;
      lastVersion.reviewedAt = now;
      lastVersion.reviewedBy = reviewerName;
      lastVersion.rejectionReason = decision === 'Rejeitado' ? rejectionReason.trim() : undefined;
      lastVersion.rejectionNotes = decision === 'Rejeitado' ? (rejectionNotes ? rejectionNotes.trim() : undefined) : undefined;
    }

    this.recalculateAdmissionStatus(targetAdmission);

    if (decision === 'Aprovado') {
      this.addAuditLog({
        userName: reviewerName,
        action: `RH aprovou ${targetDocument.documentType}`,
        entityType: 'admission_document',
        entityId: targetDocument.id,
        entityName: targetDocument.documentType,
        admissionId: targetAdmission.id,
        employeeName: targetAdmission.employee.name,
        documentType: targetDocument.documentType,
        fieldChanged: 'status de aprovação',
        previousValue: previousStatus,
        newValue: 'Aprovado',
        details: `Documento aprovado na versão ${targetDocument.currentVersion} por ${reviewerName}. Status anterior: ${previousStatus} ➔ Novo: Aprovado.`
      });

      this.addNotification({
        title: 'Documento aprovado',
        message: `O documento ${targetDocument.documentType} de ${targetAdmission.employee.name} foi aprovado com sucesso.`,
        type: 'document_uploaded',
        admissionId: targetAdmission.id,
        link: `/admissoes/${targetAdmission.id}`
      });
    } else {
      this.addAuditLog({
        userName: reviewerName,
        action: `RH rejeitou ${targetDocument.documentType}`,
        entityType: 'admission_document',
        entityId: targetDocument.id,
        entityName: targetDocument.documentType,
        admissionId: targetAdmission.id,
        employeeName: targetAdmission.employee.name,
        documentType: targetDocument.documentType,
        fieldChanged: 'status de aprovação',
        previousValue: previousStatus,
        newValue: 'Rejeitado',
        details: `Documento rejeitado na versão ${targetDocument.currentVersion} por ${reviewerName}. Motivo: ${rejectionReason.trim()}.${rejectionNotes ? ` Orientação: "${rejectionNotes.trim()}".` : ''} Status anterior: ${previousStatus} ➔ Novo: Rejeitado.`
      });

      this.addNotification({
        title: 'Documento pendente de reenvio',
        message: `Seu documento ${targetDocument.documentType} precisa ser reenviado. Motivo: ${rejectionReason}`,
        type: 'pending',
        admissionId: targetAdmission.id,
        link: `/admissoes/${targetAdmission.id}`
      });
    }

    // Bloco 6.6: Disparo de rotinas determinísticas de automação
    if (decision === 'Aprovado') {
      // Bloco 6.6C - Documentos aprovados reservado para microbloco posterior
    } else {
      this.executeAutomationOnDocumentRejected(
        targetAdmission,
        targetDocument,
        reviewerName,
        rejectionReason!.trim(),
        rejectionNotes ? rejectionNotes.trim() : undefined
      );
    }

    this.save();
    return { admission: targetAdmission, document: targetDocument };
  }

  // Regra central de status da admissão
  private recalculateAdmissionStatus(admission: Admission) {
    // Se cancelada, não altera o status automaticamente
    if (admission.status === 'Cancelada') {
      return;
    }

    const requiredDocs = admission.documents.filter(d => d.required);
    const approvedDocs = requiredDocs.filter(d => d.status === 'Aprovado');
    const rejectedDocs = requiredDocs.filter(d => d.status === 'Rejeitado');
    const anyRejectedDoc = (admission.documents || []).some(d => d.status === 'Rejeitado');
    const inReviewDocs = requiredDocs.filter(d => d.status === 'Em análise' || d.status === 'Reenviado');
    const notSentDocs = requiredDocs.filter(d => d.status === 'Não enviado');

    admission.approvedDocuments = approvedDocs.length;
    admission.totalDocuments = requiredDocs.length;
    admission.progressPercent = requiredDocs.length > 0
      ? Math.round((approvedDocs.length / requiredDocs.length) * 100)
      : 100;

    // REGRA 6.6.C: Uma admissão só pode ser "CONCLUÍDA" se todos os obrigatórios estiverem aprovados,
    // E NÃO houver aprovação interna obrigatória pendente, E não houver outras etapas obrigatórias pendentes!
    // "Nunca concluir automaticamente uma admissão se ainda existir aprovação obrigatória."
    const hasPendingMandatoryApproval = Boolean(
      admission.approval &&
      admission.approval.required &&
      admission.approval.status !== 'APROVADA'
    );

    const otherRequiredStepsPending = (admission.processSteps || []).some(
      s => s.required && s.stepKey !== 'DOCUMENTOS' && s.stepKey !== 'CADASTRO' && s.stepKey !== 'DADOS_PESSOAIS' && s.status !== 'CONCLUIDA' && s.status !== 'IGNORADA'
    );

    if (approvedDocs.length === requiredDocs.length && requiredDocs.length > 0) {
      if (hasPendingMandatoryApproval || otherRequiredStepsPending) {
        admission.status = 'Em conferência';
      } else {
        admission.status = 'Concluída';
        if (!admission.completedAt) {
          admission.completedAt = new Date().toISOString();
          this.addAuditLog({
            userName: 'Sistema (Automação)',
            action: 'Admissão concluída',
            entityType: 'admission',
            admissionId: admission.id,
            employeeName: admission.employee.name,
            details: 'Todos os documentos obrigatórios e requisitos foram aprovados e atendidos.',
            isAutomatic: true
          });
          this.addNotification({
            title: 'Admissão concluída!',
            message: `O processo admissional de ${admission.employee.name} foi concluído com 100% dos documentos aprovados.`,
            type: 'completed',
            admissionId: admission.id,
            link: `/admissoes/${admission.id}`
          });
        }
      }
    } else if (anyRejectedDoc || (admission.correctionRequest && !admission.correctionRequest.resolved)) {
      // Se possui qualquer documento rejeitado ou correção pendente -> Pendência
      admission.status = 'Pendência';
    } else if (inReviewDocs.length > 0) {
      // Se há documentos aguardando análise -> Em conferência
      admission.status = 'Em conferência';
    } else if (admission.status === 'Rascunho' && !admission.inviteSentViaWhatsApp && notSentDocs.length === requiredDocs.length) {
      admission.status = 'Rascunho';
    } else {
      admission.status = 'Aguardando documentos';
    }

    admission.updatedAt = new Date().toISOString();

    // Sincroniza e avalia as etapas do processo admissional
    this.evaluateAdmissionProcessSteps(admission, 'Sistema');
  }

  // Filtragem, busca e paginação de admissões para o RH
  getAdmissionsFiltered(options: {
    search?: string;
    status?: string;
    role?: string;
    department?: string;
    unit?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    let list = [...this.data.admissions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Coleta filtros disponíveis antes de filtrar
    const roles = Array.from(new Set(this.data.admissions.map(a => a.employee.role).filter(Boolean))).sort();
    const departments = Array.from(new Set(this.data.admissions.map(a => a.employee.department).filter(Boolean))).sort();
    const units = Array.from(new Set(this.data.admissions.map(a => a.employee.unit).filter(Boolean))).sort();
    const statuses = [
      'Rascunho',
      'Aguardando documentos',
      'Em conferência',
      'Pendência',
      'Concluída',
      'Cancelada'
    ];

    // 1. Busca textual (nome, cpf, email, telefone)
    if (options.search && options.search.trim()) {
      const term = options.search.trim().toLowerCase();
      const cleanDigits = term.replace(/\D/g, '');
      list = list.filter(a => {
        const emp = a.employee;
        const nameMatch = emp.name.toLowerCase().includes(term);
        const emailMatch = emp.email.toLowerCase().includes(term);
        const phoneMatch = cleanDigits ? emp.phone.replace(/\D/g, '').includes(cleanDigits) : emp.phone.includes(term);
        const cpfMatch = cleanDigits ? emp.cpf.replace(/\D/g, '').includes(cleanDigits) : false;
        const roleMatch = emp.role.toLowerCase().includes(term);
        return nameMatch || emailMatch || phoneMatch || cpfMatch || roleMatch;
      });
    }

    // 2. Filtro de status
    if (options.status && options.status !== 'TODOS' && options.status !== 'Todos') {
      list = list.filter(a => a.status === options.status);
    }

    // 3. Filtro de cargo
    if (options.role && options.role !== 'TODOS' && options.role !== 'Todos') {
      list = list.filter(a => a.employee.role === options.role);
    }

    // 4. Filtro de setor
    if (options.department && options.department !== 'TODOS' && options.department !== 'Todos') {
      list = list.filter(a => a.employee.department === options.department);
    }

    // 5. Filtro de unidade
    if (options.unit && options.unit !== 'TODOS' && options.unit !== 'Todos') {
      list = list.filter(a => a.employee.unit === options.unit);
    }

    // 6. Filtro por período (data início / fim)
    if (options.startDate) {
      const start = new Date(options.startDate + 'T00:00:00').getTime();
      list = list.filter(a => new Date(a.createdAt).getTime() >= start);
    }
    if (options.endDate) {
      const end = new Date(options.endDate + 'T23:59:59').getTime();
      list = list.filter(a => new Date(a.createdAt).getTime() <= end);
    }

    const total = list.length;
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Number(options.limit) || 10);
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginated = list.slice(offset, offset + limit);

    return {
      admissions: paginated,
      total,
      page,
      limit,
      totalPages,
      filters: {
        roles,
        departments,
        units,
        statuses
      }
    };
  }

  // =========================================================================
  // BLOCO 4.2: CENTRAL DE PENDÊNCIAS
  // Fila operacional derivada em tempo real a partir das admissões e documentos
  // =========================================================================
  getPendingHubData(options?: PendingFilters): PendingHubResponse {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    // Gera todas as pendências operacionais brutas
    const allItems: PendingItem[] = [];

    // Contadores para o resumo do topo da tela (sempre calculado sobre a base geral de pendências)
    let notSentCount = 0;
    let waitingReviewCount = 0;
    let rejectedCount = 0;
    const upcomingWithIssuesSet = new Set<string>();

    // Coletores de filtros dinâmicos
    const rolesSet = new Set<string>();
    const departmentsSet = new Set<string>();
    const unitsSet = new Set<string>();
    const documentTypesSet = new Set<string>();
    const responsiblesSet = new Set<string>();

    for (const adm of this.data.admissions) {
      if (adm.status === 'Concluída' || adm.status === 'Cancelada') {
        continue;
      }

      if (adm.employee.role) rolesSet.add(adm.employee.role);
      if (adm.employee.department) departmentsSet.add(adm.employee.department);
      if (adm.employee.unit) unitsSet.add(adm.employee.unit);

      // Checagem de prazo da admissão
      let isOverdue = false;
      let isUpcoming = false;
      if (adm.employee.expectedStartDate) {
        const [y, m, d] = adm.employee.expectedStartDate.split('T')[0].split('-').map(Number);
        const expTime = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
        const diffDays = Math.ceil((expTime - todayTime) / (1000 * 60 * 60 * 24));
        if (expTime < todayTime) {
          isOverdue = true;
        } else if (diffDays <= 7) {
          isUpcoming = true;
        }
      }

      // Se a admissão estiver próxima ou vencida e tiver documentos pendentes (progresso < 100)
      const hasIssues = adm.progressPercent < 100 || adm.status === 'Pendência' || adm.status === 'Em conferência';
      if ((isOverdue || isUpcoming) && hasIssues) {
        upcomingWithIssuesSet.add(adm.id);

        // Adiciona registro operacional da admissão próxima
        allItems.push({
          id: `pend-${adm.id}-processo`,
          admissionId: adm.id,
          admissionCode: `ADM-${adm.id.slice(0, 6).toUpperCase()}`,
          employeeId: adm.employeeId || adm.employee.id,
          employeeName: adm.employee.name,
          employeeCpf: adm.employee.cpf,
          role: adm.employee.role,
          department: adm.employee.department,
          unit: adm.employee.unit,
          documentId: undefined,
          documentName: `Checklist Geral (${adm.approvedDocuments}/${adm.totalDocuments} aprovados)`,
          documentCategory: 'Processo Admissional',
          pendingType: 'admissao_proxima',
          pendingTypeLabel: isOverdue ? 'Prazo de início ultrapassado' : 'Admissão com início próximo',
          currentStatus: adm.status,
          admissionStatus: adm.status,
          priority: 'Alta',
          priorityScore: 1,
          date: adm.employee.expectedStartDate || adm.createdAt,
          expectedStartDate: adm.employee.expectedStartDate,
          reviewerOrResponsible: '-',
          isRequired: true,
          isOverdue
        });
      }

      // Itera sobre os documentos da admissão
      for (const doc of (adm.documents || [])) {
        if (doc.documentType) documentTypesSet.add(doc.documentType);
        if (doc.reviewedBy) responsiblesSet.add(doc.reviewedBy);

        // 1. Documento não enviado
        if (doc.status === 'Não enviado') {
          if (doc.required) notSentCount++;
          const isCritical = (isOverdue || isUpcoming) && doc.required;
          const priority: PendingPriority = isCritical ? 'Alta' : doc.required ? 'Média' : 'Baixa';

          allItems.push({
            id: `pend-${adm.id}-${doc.id}`,
            admissionId: adm.id,
            admissionCode: `ADM-${adm.id.slice(0, 6).toUpperCase()}`,
            employeeId: adm.employeeId || adm.employee.id,
            employeeName: adm.employee.name,
            employeeCpf: adm.employee.cpf,
            role: adm.employee.role,
            department: adm.employee.department,
            unit: adm.employee.unit,
            documentId: doc.id,
            documentName: doc.documentType,
            documentCategory: doc.category,
            pendingType: 'documento_nao_enviado',
            pendingTypeLabel: 'Documento não enviado',
            currentStatus: 'Não enviado',
            admissionStatus: adm.status,
            priority,
            priorityScore: priority === 'Alta' ? 1 : priority === 'Média' ? 2 : 3,
            date: adm.employee.expectedStartDate || adm.createdAt,
            expectedStartDate: adm.employee.expectedStartDate,
            reviewerOrResponsible: '-',
            isRequired: Boolean(doc.required),
            isOverdue
          });
        }
        // 2. Aguardando conferência
        else if (doc.status === 'Em análise' || doc.status === 'Reenviado' || doc.status === 'Enviado') {
          waitingReviewCount++;
          const priority: PendingPriority = (isOverdue || isUpcoming) ? 'Alta' : doc.required ? 'Média' : 'Baixa';

          allItems.push({
            id: `pend-${adm.id}-${doc.id}`,
            admissionId: adm.id,
            admissionCode: `ADM-${adm.id.slice(0, 6).toUpperCase()}`,
            employeeId: adm.employeeId || adm.employee.id,
            employeeName: adm.employee.name,
            employeeCpf: adm.employee.cpf,
            role: adm.employee.role,
            department: adm.employee.department,
            unit: adm.employee.unit,
            documentId: doc.id,
            documentName: doc.documentType,
            documentCategory: doc.category,
            pendingType: 'aguardando_conferencia',
            pendingTypeLabel: 'Aguardando conferência',
            currentStatus: doc.status,
            admissionStatus: adm.status,
            priority,
            priorityScore: priority === 'Alta' ? 1 : priority === 'Média' ? 2 : 3,
            date: doc.uploadedAt || adm.createdAt,
            expectedStartDate: adm.employee.expectedStartDate,
            reviewerOrResponsible: 'Aguardando RH',
            isRequired: Boolean(doc.required),
            isOverdue
          });
        }
        // 3. Documento rejeitado / Aguardando reenvio
        else if (doc.status === 'Rejeitado') {
          rejectedCount++;

          allItems.push({
            id: `pend-${adm.id}-${doc.id}`,
            admissionId: adm.id,
            admissionCode: `ADM-${adm.id.slice(0, 6).toUpperCase()}`,
            employeeId: adm.employeeId || adm.employee.id,
            employeeName: adm.employee.name,
            employeeCpf: adm.employee.cpf,
            role: adm.employee.role,
            department: adm.employee.department,
            unit: adm.employee.unit,
            documentId: doc.id,
            documentName: doc.documentType,
            documentCategory: doc.category,
            pendingType: 'documento_rejeitado',
            pendingTypeLabel: 'Documento rejeitado',
            currentStatus: 'Rejeitado',
            admissionStatus: adm.status,
            priority: 'Alta',
            priorityScore: 1,
            date: doc.reviewedAt || doc.uploadedAt || adm.createdAt,
            expectedStartDate: adm.employee.expectedStartDate,
            reviewerOrResponsible: doc.reviewedBy || 'RH',
            rejectionReason: doc.rejectionReason || 'Recusado pelo RH',
            rejectionNotes: doc.rejectionNotes,
            isRequired: Boolean(doc.required),
            isOverdue
          });
        }
      }
    }

    // Resumo do topo da tela
    const summary: PendingSummary = {
      total: allItems.length,
      notSent: notSentCount,
      waitingReview: waitingReviewCount,
      rejected: rejectedCount,
      upcomingWithIssues: upcomingWithIssuesSet.size
    };

    // Agora aplica filtros se fornecidos
    let filtered = [...allItems];

    if (options) {
      // 1. Busca textual (nome, CPF, documento, admissão)
      if (options.search && options.search.trim()) {
        const term = options.search.trim().toLowerCase();
        const cleanDigits = term.replace(/\D/g, '');
        filtered = filtered.filter(item => {
          const nameMatch = item.employeeName.toLowerCase().includes(term);
          const cpfMatch = cleanDigits ? item.employeeCpf.replace(/\D/g, '').includes(cleanDigits) : false;
          const docMatch = item.documentName ? item.documentName.toLowerCase().includes(term) : false;
          const admMatch = item.admissionCode.toLowerCase().includes(term) || item.admissionId.toLowerCase().includes(term);
          const roleMatch = item.role.toLowerCase().includes(term);
          return nameMatch || cpfMatch || docMatch || admMatch || roleMatch;
        });
      }

      // 2. Tipo de pendência
      if (options.tipo && options.tipo !== 'todas' && options.tipo !== 'Todas') {
        const t = options.tipo.toLowerCase();
        if (t === 'documento_nao_enviado' || t === 'documento não enviado') {
          filtered = filtered.filter(i => i.pendingType === 'documento_nao_enviado');
        } else if (t === 'aguardando_conferencia' || t === 'aguardando conferência' || t === 'aguardando conferencia') {
          filtered = filtered.filter(i => i.pendingType === 'aguardando_conferencia');
        } else if (t === 'documento_rejeitado' || t === 'documento rejeitado') {
          filtered = filtered.filter(i => i.pendingType === 'documento_rejeitado');
        } else if (t === 'aguardando_reenvio' || t === 'aguardando reenvio') {
          filtered = filtered.filter(i => i.pendingType === 'documento_rejeitado' || i.pendingType === 'aguardando_reenvio');
        } else if (t === 'admissao_proxima' || t === 'admissão próxima' || t === 'admissao proxima') {
          filtered = filtered.filter(i => i.pendingType === 'admissao_proxima' || ((i.isOverdue || i.priority === 'Alta') && i.isRequired));
        }
      }

      // 3. Status da admissão
      if (options.status && options.status !== 'TODOS' && options.status !== 'Todos') {
        filtered = filtered.filter(i => i.admissionStatus === options.status);
      }

      // 4. Cargo
      if (options.cargo && options.cargo !== 'TODOS' && options.cargo !== 'Todos') {
        filtered = filtered.filter(i => i.role === options.cargo);
      }

      // 5. Setor
      if (options.setor && options.setor !== 'TODOS' && options.setor !== 'Todos') {
        filtered = filtered.filter(i => i.department === options.setor);
      }

      // 6. Unidade
      if (options.unidade && options.unidade !== 'TODOS' && options.unidade !== 'Todos') {
        filtered = filtered.filter(i => i.unit === options.unidade);
      }

      // 7. Documento
      if (options.documento && options.documento !== 'TODOS' && options.documento !== 'Todos') {
        filtered = filtered.filter(i => i.documentName === options.documento);
      }

      // 8. Responsável
      if (options.responsavel && options.responsavel !== 'TODOS' && options.responsavel !== 'Todos') {
        filtered = filtered.filter(i => i.reviewerOrResponsible === options.responsavel);
      }

      // 9. Prioridade
      if (options.prioridade && options.prioridade !== 'TODAS' && options.prioridade !== 'Todas') {
        filtered = filtered.filter(i => i.priority === options.prioridade);
      }

      // 10. Período
      if (options.startDate) {
        const start = new Date(options.startDate + 'T00:00:00').getTime();
        filtered = filtered.filter(i => new Date(i.date).getTime() >= start);
      }
      if (options.endDate) {
        const end = new Date(options.endDate + 'T23:59:59').getTime();
        filtered = filtered.filter(i => new Date(i.date).getTime() <= end);
      }
    }

    // Ordenação padrão (Seção 9):
    // 1. Prioridade (Alta [1], Média [2], Baixa [3])
    // 2. Situações mais urgentes (isOverdue primeiro)
    // 3. Data prevista da admissão
    // 4. Funcionário (ordem alfabética)
    filtered.sort((a, b) => {
      if (options?.sortBy) {
        const order = options.sortOrder === 'desc' ? -1 : 1;
        if (options.sortBy === 'prioridade') return (a.priorityScore - b.priorityScore) * order;
        if (options.sortBy === 'funcionario') return a.employeeName.localeCompare(b.employeeName) * order;
        if (options.sortBy === 'cargo') return a.role.localeCompare(b.role) * order;
        if (options.sortBy === 'documento') return (a.documentName || '').localeCompare(b.documentName || '') * order;
        if (options.sortBy === 'data') return (new Date(a.date).getTime() - new Date(b.date).getTime()) * order;
      }

      // Default sorting
      if (a.priorityScore !== b.priorityScore) return a.priorityScore - b.priorityScore;
      if (Boolean(a.isOverdue) !== Boolean(b.isOverdue)) return a.isOverdue ? -1 : 1;
      const dateA = a.expectedStartDate || a.date;
      const dateB = b.expectedStartDate || b.date;
      const dateComp = dateA.localeCompare(dateB);
      if (dateComp !== 0) return dateComp;
      return a.employeeName.localeCompare(b.employeeName);
    });

    // Paginação
    const total = filtered.length;
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Number(options?.limit) || 20);
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      items: paginated,
      total,
      page,
      limit,
      totalPages,
      summary,
      filters: {
        roles: Array.from(rolesSet).sort(),
        departments: Array.from(departmentsSet).sort(),
        units: Array.from(unitsSet).sort(),
        documentTypes: Array.from(documentTypesSet).sort(),
        responsibles: Array.from(responsiblesSet).sort()
      }
    };
  }

  // Cancelamento formal de admissão pelo RH com motivo obrigatório
  cancelAdmission(id: string, reason: string, cancelledBy: string): Admission {
    const admission = this.getAdmissionById(id);
    if (!admission) throw new Error('Admissão não encontrada.');
    if (admission.status === 'Concluída') {
      throw new Error('Não é possível cancelar uma admissão já concluída.');
    }
    if (!reason || !reason.trim()) {
      throw new Error('O motivo do cancelamento é obrigatório.');
    }

    const now = new Date().toISOString();
    admission.status = 'Cancelada';
    admission.cancelledAt = now;
    admission.cancelledBy = cancelledBy;
    admission.cancellationReason = reason.trim();
    admission.updatedAt = now;

    // Bloco 5.6: Se houver aprovação em andamento ou pendente, cancela formalmente
    if (admission.approval && (admission.approval.status === 'PENDENTE' || admission.approval.status === 'EM_ANALISE')) {
      const prev = admission.approval.status;
      admission.approval.status = 'CANCELADA';
      admission.approval.decidedAt = now;
      admission.approval.decidedBy = cancelledBy;
      admission.approval.decisionReason = `Admissão cancelada: ${reason.trim()}`;
      admission.approval.updatedAt = now;
      admission.approval.history = admission.approval.history || [];
      admission.approval.history.push({
        id: 'hist-appr-' + crypto.randomUUID(),
        action: 'CANCELADA',
        timestamp: now,
        userName: cancelledBy,
        previousStatus: prev,
        newStatus: 'CANCELADA',
        reason: reason.trim(),
        notes: 'Aprovação cancelada juntamente com o cancelamento da admissão.'
      });
    }

    this.addAuditLog({
      userName: cancelledBy,
      action: 'RH cancelou a admissão',
      admissionId: admission.id,
      employeeName: admission.employee.name,
      details: `Admissão cancelada. Motivo obrigatório registrado: "${reason.trim()}"`
    });

    this.addNotification({
      title: 'Admissão cancelada',
      message: `A admissão de ${admission.employee.name} foi cancelada por ${cancelledBy}. Motivo: ${reason.trim()}`,
      type: 'pending',
      admissionId: admission.id,
      link: `/admissoes/${admission.id}`
    });

    this.save();
    return admission;
  }

  // Conclusão formal de admissão pelo RH (validação de 100% dos obrigatórios)
  completeAdmission(id: string, completedBy: string): Admission {
    const admission = this.getAdmissionById(id);
    if (!admission) throw new Error('Admissão não encontrada.');
    if (admission.status === 'Cancelada') {
      throw new Error('Esta admissão está cancelada e não pode ser concluída.');
    }

    // Bloco 5.6: Bloqueio de Conclusão Indevida se Aprovação Interna Obrigatória não estiver APROVADA
    if (admission.approval && admission.approval.required && admission.approval.status !== 'APROVADA') {
      const currentSt = admission.approval.status;
      const detail = currentSt === 'REPROVADA'
        ? `reprovada (Motivo: "${admission.approval.decisionReason || 'Reprovada na análise interna'}")`
        : currentSt.toLowerCase();
      throw new Error(`Não é possível concluir a admissão: a aprovação interna obrigatória está ${detail} e requer formalização de aprovação.`);
    }

    const requiredDocs = admission.documents.filter(d => d.required);
    const unapproved = requiredDocs.filter(d => d.status !== 'Aprovado');
    if (unapproved.length > 0) {
      const names = unapproved.map(d => `${d.documentType} (${d.status})`).join(', ');
      throw new Error(`Esta admissão ainda possui pendências e não pode ser concluída. Documentos pendentes: ${names}`);
    }

    const now = new Date().toISOString();
    admission.status = 'Concluída';
    admission.completedAt = now;
    admission.completedBy = completedBy;
    admission.updatedAt = now;

    // Se houver aprovação pendente ou em análise (caso não obrigatória), formaliza aprovação
    if (admission.approval && admission.approval.status !== 'APROVADA') {
      admission.approval.status = 'APROVADA';
      admission.approval.decidedAt = now;
      admission.approval.decidedBy = completedBy;
      admission.approval.updatedAt = now;
    }

    this.addAuditLog({
      userName: completedBy,
      action: 'RH concluiu a admissão',
      admissionId: admission.id,
      employeeName: admission.employee.name,
      details: 'Processo admissional concluído com sucesso. Todos os documentos obrigatórios foram conferidos e aprovados.'
    });

    this.addNotification({
      title: 'Admissão concluída com sucesso',
      message: `A admissão de ${admission.employee.name} foi formalmente concluída por ${completedBy}.`,
      type: 'completed',
      admissionId: admission.id,
      link: `/admissoes/${admission.id}`
    });

    this.save();
    return admission;
  }

  // Reenvio de convite com registro no histórico
  resendInvite(id: string, userName: string): Admission {
    const admission = this.getAdmissionById(id);
    if (!admission) throw new Error('Admissão não encontrada.');

    const now = new Date().toISOString();
    admission.inviteLastSentAt = now;
    if (admission.status === 'Rascunho') {
      admission.status = 'Aguardando documentos';
    }
    admission.inviteSentViaWhatsApp = true;
    admission.updatedAt = now;

    this.addAuditLog({
      userName,
      action: 'Convite reenviado pelo RH',
      admissionId: admission.id,
      employeeName: admission.employee.name,
      details: `Link de convite reenviado para ${admission.employee.name} (${admission.employee.phone}) via WhatsApp/E-mail.`
    });

    this.save();
    return admission;
  }

  // Registro de acesso ao convite pelo colaborador
  recordInviteAccess(token: string): Admission | undefined {
    const admission = this.getAdmissionByToken(token);
    if (!admission) return undefined;

    const now = new Date().toISOString();
    admission.inviteAccessCount = (admission.inviteAccessCount || 0) + 1;
    admission.inviteLastAccessedAt = now;
    admission.updatedAt = now;

    this.addAuditLog({
      userName: admission.employee.name,
      action: 'Funcionário acessou o convite',
      admissionId: admission.id,
      employeeName: admission.employee.name,
      details: `Acesso nº ${admission.inviteAccessCount} realizado pelo portal do colaborador.`
    });

    this.save();
    return admission;
  }

  // Registro de auditoria ao visualizar ou baixar documento
  recordDocumentAction(documentId: string, action: string, userName: string, details?: string) {
    let foundAdm: Admission | undefined;
    let foundDoc: AdmissionDocument | undefined;

    for (const adm of this.data.admissions) {
      const doc = adm.documents.find(d => d.id === documentId);
      if (doc) {
        foundAdm = adm;
        foundDoc = doc;
        break;
      }
    }

    if (foundAdm && foundDoc) {
      this.addAuditLog({
        userName,
        action,
        admissionId: foundAdm.id,
        employeeName: foundAdm.employee.name,
        documentType: foundDoc.documentType,
        details: details || `Ação ${action} no documento ${foundDoc.documentType} (V${foundDoc.currentVersion})`
      });
      this.save();
    }
  }

  // Atualização Cadastral Completa da Admissão e Colaborador (CRUD: Update)
  updateAdmission(
    id: string, 
    updates: Omit<Partial<Employee>, 'status'> & { status?: AdmissionStatus }, 
    updatedBy: string
  ): Admission {
    const admission = this.getAdmissionById(id);
    if (!admission) throw new Error('Admissão não encontrada.');

    const changes: string[] = [];
    const structuredChanges: AuditLogChange[] = [];

    // Se houver alteração de CPF, valida duplicidade
    if (updates.cpf) {
      const cleanCPF = updates.cpf.replace(/\D/g, '');
      const duplicate = this.data.admissions.find(a => 
        a.id !== id && 
        a.status !== 'Cancelada' && 
        a.employee.cpf.replace(/\D/g, '') === cleanCPF
      );
      if (duplicate) {
        throw new Error(`O CPF informado já está em uso na admissão de ${duplicate.employee.name}.`);
      }
      if (cleanCPF !== admission.employee.cpf.replace(/\D/g, '')) {
        structuredChanges.push({
          field: 'cpf',
          label: 'CPF',
          previousValue: admission.employee.cpf,
          newValue: cleanCPF
        });
        changes.push('CPF atualizado');
        admission.employee.cpf = cleanCPF;
      }
    }

    if (updates.name && updates.name.trim() !== admission.employee.name) {
      const newName = updates.name.trim();
      structuredChanges.push({
        field: 'name',
        label: 'Nome do Colaborador',
        previousValue: admission.employee.name,
        newValue: newName
      });
      changes.push(`nome de "${admission.employee.name}" para "${newName}"`);
      admission.employee.name = newName;
    }

    if (updates.birthDate && updates.birthDate !== admission.employee.birthDate) {
      structuredChanges.push({
        field: 'birthDate',
        label: 'Data de Nascimento',
        previousValue: admission.employee.birthDate,
        newValue: updates.birthDate
      });
      changes.push('data de nascimento alterada');
      admission.employee.birthDate = updates.birthDate;
    }

    if (updates.phone && updates.phone.trim() !== admission.employee.phone) {
      const newPhone = updates.phone.trim();
      structuredChanges.push({
        field: 'phone',
        label: 'Telefone',
        previousValue: admission.employee.phone,
        newValue: newPhone
      });
      changes.push(`telefone de "${admission.employee.phone}" para "${newPhone}"`);
      admission.employee.phone = newPhone;
    }

    if (updates.email && updates.email.toLowerCase().trim() !== admission.employee.email.toLowerCase().trim()) {
      const newEmail = updates.email.toLowerCase().trim();
      structuredChanges.push({
        field: 'email',
        label: 'E-mail',
        previousValue: admission.employee.email,
        newValue: newEmail
      });
      changes.push(`e-mail de "${admission.employee.email}" para "${newEmail}"`);
      admission.employee.email = newEmail;
    }

    if (updates.role && updates.role.trim() !== admission.employee.role) {
      const newRole = updates.role.trim();
      structuredChanges.push({
        field: 'role',
        label: 'Cargo',
        previousValue: admission.employee.role,
        newValue: newRole
      });
      changes.push(`cargo de "${admission.employee.role}" para "${newRole}"`);
      admission.employee.role = newRole;
    }

    if (updates.department && updates.department.trim() !== admission.employee.department) {
      const newDept = updates.department.trim();
      structuredChanges.push({
        field: 'department',
        label: 'Departamento',
        previousValue: admission.employee.department,
        newValue: newDept
      });
      changes.push(`departamento de "${admission.employee.department}" para "${newDept}"`);
      admission.employee.department = newDept;
    }

    if (updates.unit && updates.unit.trim() !== admission.employee.unit) {
      const newUnit = updates.unit.trim();
      structuredChanges.push({
        field: 'unit',
        label: 'Unidade',
        previousValue: admission.employee.unit,
        newValue: newUnit
      });
      changes.push(`unidade de "${admission.employee.unit}" para "${newUnit}"`);
      admission.employee.unit = newUnit;
    }

    if (updates.expectedStartDate && updates.expectedStartDate !== admission.employee.expectedStartDate) {
      structuredChanges.push({
        field: 'expectedStartDate',
        label: 'Previsão de Início',
        previousValue: admission.employee.expectedStartDate,
        newValue: updates.expectedStartDate
      });
      changes.push('previsão de início alterada');
      admission.employee.expectedStartDate = updates.expectedStartDate;
    }

    if (updates.status && updates.status !== admission.status) {
      structuredChanges.push({
        field: 'status',
        label: 'Status da Admissão',
        previousValue: admission.status,
        newValue: updates.status
      });
      changes.push(`status de "${admission.status}" para "${updates.status}"`);
      admission.status = updates.status;
    }

    const now = new Date().toISOString();
    admission.employee.updatedAt = now;
    admission.updatedAt = now;

    // Atualiza também na lista de employees
    const empIdx = this.data.employees.findIndex(e => e.id === admission.employeeId);
    if (empIdx !== -1) {
      this.data.employees[empIdx] = { ...admission.employee };
    }

    this.addAuditLog({
      userName: updatedBy,
      action: 'Cadastro de admissão atualizado pelo RH',
      entityType: 'admission',
      entityId: admission.id,
      entityName: admission.employee.name,
      admissionId: admission.id,
      employeeName: admission.employee.name,
      fieldChanged: structuredChanges.length === 1 ? structuredChanges[0].label : `${structuredChanges.length} alterações cadastrais`,
      previousValue: structuredChanges.length === 1 ? String(structuredChanges[0].previousValue) : undefined,
      newValue: structuredChanges.length === 1 ? String(structuredChanges[0].newValue) : undefined,
      changes: structuredChanges,
      details: `Dados cadastrais de ${admission.employee.name}: ${changes.length > 0 ? changes.join(', ') : 'dados atualizados'} por ${updatedBy}.`
    });

    this.save();
    return admission;
  }

  // Exclusão Permanente da Admissão (CRUD: Delete)
  deleteAdmission(id: string, deletedBy: string): boolean {
    const admission = this.getAdmissionById(id);
    if (!admission) throw new Error('Admissão não encontrada.');

    const empName = admission.employee.name;
    const empRole = admission.employee.role;
    const employeeId = admission.employeeId;

    // Remove arquivos físicos armazenados se existirem
    try {
      for (const doc of admission.documents) {
        if (doc.storagePath && fs.existsSync(doc.storagePath)) {
          fs.unlinkSync(doc.storagePath);
        }
        for (const ver of doc.versions) {
          if (ver.storagePath && fs.existsSync(ver.storagePath)) {
            fs.unlinkSync(ver.storagePath);
          }
        }
      }
    } catch {
      // Continua caso algum arquivo já não exista
    }

    // Remove do banco de dados
    this.data.admissions = this.data.admissions.filter(a => a.id !== id);
    this.data.employees = this.data.employees.filter(e => e.id !== employeeId);
    this.data.consentRecords = this.data.consentRecords.filter(c => c.admissionId !== id);

    this.addAuditLog({
      userName: deletedBy,
      action: 'Admissão excluída permanentemente pelo RH',
      details: `O cadastro da admissão de ${empName} (${empRole}) e seus respectivos documentos foram excluídos por ${deletedBy}.`
    });

    this.save();
    return true;
  }

  // GESTÃO DE CONVITES (CRUD)
  getInvites(): any[] {
    return this.data.admissions.map(a => {
      const isExpired = new Date(a.inviteExpiresAt).getTime() < Date.now();
      let statusLabel: 'Ativo' | 'Acessado' | 'Pendente de envio' | 'Expirado' | 'Revogado' = 'Pendente de envio';
      if (a.inviteRevoked) {
        statusLabel = 'Revogado';
      } else if (isExpired) {
        statusLabel = 'Expirado';
      } else if (a.inviteAccessCount && a.inviteAccessCount > 0) {
        statusLabel = 'Acessado';
      } else if (a.inviteSentViaWhatsApp) {
        statusLabel = 'Ativo';
      }

      return {
        admissionId: a.id,
        employeeId: a.employeeId,
        employeeName: a.employee.name,
        employeeEmail: a.employee.email,
        employeePhone: a.employee.phone,
        employeeCpf: a.employee.cpf,
        employeeRole: a.employee.role,
        employeeDepartment: a.employee.department,
        employeeUnit: a.employee.unit,
        admissionStatus: a.status,
        inviteToken: a.inviteToken,
        inviteExpiresAt: a.inviteExpiresAt,
        inviteSentViaWhatsApp: a.inviteSentViaWhatsApp,
        inviteSentAt: a.inviteSentAt,
        inviteLastSentAt: a.inviteLastSentAt,
        inviteAccessCount: a.inviteAccessCount || 0,
        inviteLastAccessedAt: a.inviteLastAccessedAt,
        inviteRevoked: !!a.inviteRevoked,
        inviteRevokedAt: a.inviteRevokedAt,
        inviteRevokedBy: a.inviteRevokedBy,
        isExpired,
        statusLabel,
        createdAt: a.createdAt
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Regenerar novo token criptografado (CRUD: Create/Regenerate Token)
  regenerateInvite(admissionId: string, performedBy: string): Admission {
    const admission = this.getAdmissionById(admissionId);
    if (!admission) throw new Error('Admissão não encontrada.');

    const newToken = 'tok_' + crypto.randomBytes(24).toString('hex');
    const newExpiresAt = new Date(Date.now() + 30 * 86400000).toISOString(); // +30 dias

    admission.inviteToken = newToken;
    admission.inviteExpiresAt = newExpiresAt;
    admission.inviteRevoked = false;
    admission.inviteRevokedAt = undefined;
    admission.inviteRevokedBy = undefined;
    admission.inviteAccessCount = 0;
    admission.inviteLastAccessedAt = undefined;
    admission.updatedAt = new Date().toISOString();

    this.addAuditLog({
      userName: performedBy,
      action: 'Novo token de convite gerado',
      admissionId: admission.id,
      employeeName: admission.employee.name,
      details: `Token de acesso antigo foi invalidado e substituído por uma nova chave com validade até ${new Date(newExpiresAt).toLocaleDateString('pt-BR')}`
    });

    this.save();
    return admission;
  }

  // Atualizar / Estender validade do convite (CRUD: Update)
  updateInvite(
    admissionId: string, 
    data: { extendDays?: number; newExpiresAt?: string; phone?: string; email?: string; unrevoke?: boolean }, 
    performedBy: string
  ): Admission {
    const admission = this.getAdmissionById(admissionId);
    if (!admission) throw new Error('Admissão não encontrada.');

    const now = new Date();
    if (data.extendDays && data.extendDays > 0) {
      const currentExpiry = new Date(admission.inviteExpiresAt);
      const baseTime = currentExpiry.getTime() > now.getTime() ? currentExpiry.getTime() : now.getTime();
      admission.inviteExpiresAt = new Date(baseTime + data.extendDays * 86400000).toISOString();
    } else if (data.newExpiresAt) {
      admission.inviteExpiresAt = new Date(data.newExpiresAt).toISOString();
    }

    if (data.phone) {
      admission.employee.phone = data.phone.trim();
    }
    if (data.email) {
      admission.employee.email = data.email.toLowerCase().trim();
    }

    if (data.unrevoke) {
      admission.inviteRevoked = false;
      admission.inviteRevokedAt = undefined;
      admission.inviteRevokedBy = undefined;
    }

    admission.updatedAt = new Date().toISOString();

    this.addAuditLog({
      userName: performedBy,
      action: 'Configurações de convite atualizadas',
      admissionId: admission.id,
      employeeName: admission.employee.name,
      details: `Validade estendida para ${new Date(admission.inviteExpiresAt).toLocaleDateString('pt-BR')}. Telefone: ${admission.employee.phone}`
    });

    this.save();
    return admission;
  }

  // Revogar convite (CRUD: Delete/Revoke Access)
  revokeInvite(admissionId: string, performedBy: string): Admission {
    const admission = this.getAdmissionById(admissionId);
    if (!admission) throw new Error('Admissão não encontrada.');

    admission.inviteRevoked = true;
    admission.inviteRevokedAt = new Date().toISOString();
    admission.inviteRevokedBy = performedBy;
    admission.updatedAt = new Date().toISOString();

    this.addAuditLog({
      userName: performedBy,
      action: 'Convite revogado pelo RH',
      admissionId: admission.id,
      employeeName: admission.employee.name,
      details: `O link de acesso do colaborador ${admission.employee.name} foi revogado. O candidato não conseguirá mais acessar com o link anterior.`
    });

    this.save();
    return admission;
  }

  // Auditoria
  addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>) {
    const newLog: AuditLog = {
      id: 'audit-' + crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...log
    };
    if (!this.data.auditLogs) this.data.auditLogs = [];
    this.data.auditLogs.unshift(newLog);
    // Limita a 10000 registros para garantir histórico completo
    if (this.data.auditLogs.length > 10000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 10000);
    }
  }

  getAuditLogs(
    admissionId?: string, 
    options?: { 
      entityType?: string; 
      entityId?: string; 
      employeeId?: string;
      action?: string; 
      search?: string;
      category?: string;
      userName?: string;
      startDate?: string;
      endDate?: string;
    }
  ): AuditLog[] {
    let logs = this.data.auditLogs || [];
    if (admissionId) {
      logs = logs.filter(l => l.admissionId === admissionId);
    }
    if (options?.employeeId) {
      const emp = this.getEmployeeById(options.employeeId);
      const cleanCpf = emp?.cpf ? emp.cpf.replace(/\D/g, '') : '';
      const empAdmissions = (this.data.admissions || [])
        .filter(a => a.employeeId === options.employeeId || (cleanCpf && a.employee?.cpf?.replace(/\D/g, '') === cleanCpf))
        .map(a => a.id);

      logs = logs.filter(l => 
        l.entityId === options.employeeId || 
        (emp && l.employeeName === emp.name) ||
        (l.admissionId && empAdmissions.includes(l.admissionId))
      );
    }
    if (options?.entityType) {
      logs = logs.filter(l => l.entityType === options.entityType);
    }
    if (options?.entityId) {
      logs = logs.filter(l => l.entityId === options.entityId);
    }
    if (options?.userName) {
      const u = options.userName.toLowerCase();
      logs = logs.filter(l => (l.userName || l.performedBy || '').toLowerCase().includes(u));
    }
    if (options?.startDate) {
      const start = new Date(options.startDate).getTime();
      if (!isNaN(start)) {
        logs = logs.filter(l => new Date(l.timestamp || l.createdAt || 0).getTime() >= start);
      }
    }
    if (options?.endDate) {
      const end = new Date(options.endDate + (options.endDate.length === 10 ? 'T23:59:59.999Z' : '')).getTime();
      if (!isNaN(end)) {
        logs = logs.filter(l => new Date(l.timestamp || l.createdAt || 0).getTime() <= end);
      }
    }
    if (options?.category && options.category !== 'TODAS') {
      const cat = options.category.toLowerCase();
      logs = logs.filter(l => {
        const act = l.action.toLowerCase();
        const ent = (l.entityType || '').toLowerCase();
        const det = (l.details || '').toLowerCase();

        if (cat === 'documento' || cat === 'documentos') {
          return ent.includes('document') || act.includes('documento') || act.includes('aprovou') || act.includes('rejeitou') || act.includes('download') || act.includes('upload') || Boolean(l.documentType);
        }
        if (cat === 'processo' || cat === 'etapas') {
          return ent.includes('process') || act.includes('etapa') || act.includes('processo') || act.includes('concluída') || act.includes('cancelada');
        }
        if (cat === 'aprovacao' || cat === 'aprovacoes') {
          return ent.includes('approval') || act.includes('aprovação') || act.includes('parecer') || act.includes('reprovada') || act.includes('reaberta');
        }
        if (cat === 'cadastro' || cat === 'cadastral') {
          return ent.includes('employee') || act.includes('cadastr') || act.includes('dados') || act.includes('inativado') || act.includes('reativado') || (l.changes && l.changes.length > 0);
        }
        if (cat === 'convite' || cat === 'lgpd') {
          return act.includes('convite') || act.includes('whatsapp') || act.includes('consentimento') || act.includes('lgpd') || act.includes('token');
        }
        if (cat === 'sistema' || cat === 'seguranca') {
          return ent.includes('system') || ent.includes('setting') || act.includes('configur') || act.includes('relatório') || act.includes('cpf') || act.includes('cargo');
        }
        return true;
      });
    }
    if (options?.action) {
      const act = options.action.toLowerCase();
      logs = logs.filter(l => l.action.toLowerCase().includes(act));
    }
    if (options?.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      logs = logs.filter(l => 
        l.details.toLowerCase().includes(q) ||
        l.userName.toLowerCase().includes(q) ||
        (l.performedBy && l.performedBy.toLowerCase().includes(q)) ||
        (l.employeeName && l.employeeName.toLowerCase().includes(q)) ||
        (l.documentType && l.documentType.toLowerCase().includes(q)) ||
        (l.entityName && l.entityName.toLowerCase().includes(q)) ||
        (l.fieldChanged && l.fieldChanged.toLowerCase().includes(q)) ||
        (l.previousValue && l.previousValue.toLowerCase().includes(q)) ||
        (l.newValue && l.newValue.toLowerCase().includes(q)) ||
        (l.changes && l.changes.some(c => 
          (c.label || '').toLowerCase().includes(q) || 
          String(c.previousValue || '').toLowerCase().includes(q) || 
          String(c.newValue || '').toLowerCase().includes(q)
        )) ||
        l.action.toLowerCase().includes(q)
      );
    }
    return logs;
  }

  // Notificações
  addNotification(notif: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) {
    const newNotif: NotificationItem = {
      id: 'notif-' + crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notif
    };
    this.data.notifications.unshift(newNotif);
    if (this.data.notifications.length > 100) {
      this.data.notifications = this.data.notifications.slice(0, 100);
    }
  }

  getNotifications(): NotificationItem[] {
    return this.data.notifications;
  }

  markNotificationRead(id: string) {
    const n = this.data.notifications.find(item => item.id === id);
    if (n) {
      n.read = true;
      this.save();
    }
  }

  markAllNotificationsRead() {
    this.data.notifications.forEach(item => { item.read = true; });
    this.save();
  }

  // =========================================================================
  // BLOCO 4.3 — COMUNICAÇÃO COM O FUNCIONÁRIO
  // =========================================================================

  /**
   * Registra um evento de comunicação no histórico imutável (append-only)
   * e grava o log de auditoria correspondente.
   */
  addCommunicationLog(logData: {
    admissionId: string;
    employeeId: string;
    userId?: string;
    userName: string;
    communicationType: CommunicationType;
    channel: CommunicationChannel;
    templateId: string;
    documentId?: string;
    documentName?: string;
    rejectionReason?: string;
    messagePreview: string;
    actionStatus: CommunicationActionStatus;
    actionStatusLabel?: string;
  }): CommunicationLog {
    if (!this.data.communicationLogs) {
      this.data.communicationLogs = [];
    }

    const defaultLabelMap: Record<CommunicationActionStatus, string> = {
      whatsapp_opened: 'WhatsApp aberto para envio',
      message_copied: 'Mensagem copiada',
      link_copied: 'Link copiado'
    };

    const newLog: CommunicationLog = {
      id: 'comm-' + crypto.randomUUID(),
      admissionId: logData.admissionId,
      employeeId: logData.employeeId,
      userId: logData.userId,
      userName: logData.userName,
      communicationType: logData.communicationType,
      channel: logData.channel,
      templateId: logData.templateId,
      documentId: logData.documentId,
      documentName: logData.documentName,
      rejectionReason: logData.rejectionReason,
      // Minimização de dados LGPD: armazena no preview apenas trecho resumido
      messagePreview: (logData.messagePreview || '').slice(0, 160),
      actionStatus: logData.actionStatus,
      actionStatusLabel: logData.actionStatusLabel || defaultLabelMap[logData.actionStatus] || 'Comunicação realizada',
      createdAt: new Date().toISOString()
    };

    this.data.communicationLogs.unshift(newLog);

    // Se o WhatsApp foi aberto, atualiza o status de envio no modelo de admissão
    const admission = this.data.admissions.find(a => a.id === logData.admissionId);
    if (admission && logData.actionStatus === 'whatsapp_opened') {
      admission.inviteSentViaWhatsApp = true;
      admission.inviteLastSentAt = newLog.createdAt;
      admission.updatedAt = newLog.createdAt;
    }

    // Grava registro de auditoria correspondente
    const auditAction = logData.actionStatus === 'whatsapp_opened'
      ? 'communication_whatsapp_opened'
      : logData.actionStatus === 'link_copied'
      ? 'communication_link_copied'
      : 'communication_message_copied';

    this.addAuditLog({
      userName: logData.userName,
      performedBy: logData.userName,
      userId: logData.userId,
      action: auditAction,
      entityType: 'admission',
      entityId: logData.admissionId,
      admissionId: logData.admissionId,
      employeeName: admission?.employee?.name,
      documentType: logData.documentName,
      details: `Comunicação (${newLog.actionStatusLabel}) via ${logData.channel.toUpperCase()} - Tipo: ${logData.communicationType}.`
    });

    this.save();
    return newLog;
  }

  /**
   * Retorna os registros do histórico de comunicação (opcionalmente filtrados por admissão)
   */
  getCommunicationLogs(admissionId?: string): CommunicationLog[] {
    let logs = this.data.communicationLogs || [];
    if (admissionId) {
      logs = logs.filter(l => l.admissionId === admissionId);
    }
    return logs;
  }

  /**
   * Retorna a visão consolidada para a tela de Comunicação com Funcionários (Bloco 4.3),
   * com cards de resumo, determinação da pendência principal e filtros operacionais.
   */
  getCommunicationHubData(options?: CommunicationFilters): CommunicationHubResponse {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const allAdmissions = this.data.admissions || [];

    // Contadores para os Cards de Resumo do topo
    let inProgressCount = 0;
    let waitingDocumentsCount = 0;
    let rejectedDocumentsCount = 0;
    let waitingResponseCount = 0;
    let upcomingWithIssuesCount = 0;

    // Coletores de opções de filtros dinâmicos
    const rolesSet = new Set<string>();
    const departmentsSet = new Set<string>();
    const unitsSet = new Set<string>();
    const statusesSet = new Set<string>();

    const communicationItems: CommunicationItem[] = [];

    for (const adm of allAdmissions) {
      if (adm.employee?.role) rolesSet.add(adm.employee.role);
      if (adm.employee?.department) departmentsSet.add(adm.employee.department);
      if (adm.employee?.unit) unitsSet.add(adm.employee.unit);
      if (adm.status) statusesSet.add(adm.status);

      const isInProgress = adm.status !== 'Concluída' && adm.status !== 'Cancelada';
      if (isInProgress) {
        inProgressCount++;
      }

      const docs = adm.documents || [];
      const hasNotSent = docs.some(d => d.status === 'Não enviado');
      const hasRejected = docs.some(d => d.status === 'Rejeitado');

      if (isInProgress && hasNotSent) {
        waitingDocumentsCount++;
      }
      if (isInProgress && hasRejected) {
        rejectedDocumentsCount++;
      }

      // Checagem de prazo de início
      let isUpcomingOrOverdue = false;
      if (adm.employee?.expectedStartDate) {
        const [y, m, d] = adm.employee.expectedStartDate.split('T')[0].split('-').map(Number);
        const expTime = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
        const diffDays = Math.ceil((expTime - todayTime) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
          isUpcomingOrOverdue = true;
        }
      }

      const hasPendingIssues = adm.progressPercent < 100 || adm.status === 'Pendência' || adm.status === 'Em conferência' || hasNotSent || hasRejected;
      if (isInProgress && isUpcomingOrOverdue && hasPendingIssues) {
        upcomingWithIssuesCount++;
      }

      // Histórico de comunicações para esta admissão
      const admLogs = (this.data.communicationLogs || []).filter(l => l.admissionId === adm.id);
      const lastComm = admLogs.length > 0 ? admLogs[0] : undefined;

      // Aguardando resposta: quando houve comunicação/convite ativo e ainda existem pendências documentais
      if (isInProgress && (lastComm || adm.inviteSentViaWhatsApp || adm.inviteSentAt) && hasPendingIssues) {
        waitingResponseCount++;
      }

      // -----------------------------------------------------------------------
      // Determinação da Pendência Principal para Comunicação (Seção 10)
      // Prioridade conceitual:
      // 1. documento rejeitado;
      // 2. aguardando reenvio;
      // 3. documento obrigatório não enviado;
      // 4. admissão próxima com pendência;
      // 5. outras situações operacionais existentes.
      // -----------------------------------------------------------------------
      let mainPendingReason: CommunicationPendingReason;

      const rejectedDoc = docs.find(d => d.status === 'Rejeitado');
      const notSentRequiredDoc = docs.find(d => d.status === 'Não enviado' && d.required);
      const notSentOptionalDoc = docs.find(d => d.status === 'Não enviado' && !d.required);
      const inReviewDoc = docs.find(d => d.status === 'Em análise');

      if (rejectedDoc) {
        mainPendingReason = {
          type: 'document_rejected',
          label: 'Documento rejeitado',
          documentId: rejectedDoc.id,
          documentName: rejectedDoc.document_type_name || (typeof rejectedDoc.documentType === 'string' ? rejectedDoc.documentType : 'Documento'),
          rejectionReason: rejectedDoc.rejectionReason || 'Documento ilegível ou divergente',
          detail: `${rejectedDoc.document_type_name || rejectedDoc.documentType}: ${rejectedDoc.rejectionReason || 'Necessita correção'}`,
          priority: 'Alta'
        };
      } else if (notSentRequiredDoc) {
        mainPendingReason = {
          type: 'documents_pending',
          label: 'Documento obrigatório pendente',
          documentId: notSentRequiredDoc.id,
          documentName: notSentRequiredDoc.document_type_name || (typeof notSentRequiredDoc.documentType === 'string' ? notSentRequiredDoc.documentType : 'Documento'),
          detail: `Pendente de envio: ${notSentRequiredDoc.document_type_name || notSentRequiredDoc.documentType}`,
          priority: isUpcomingOrOverdue ? 'Alta' : 'Média'
        };
      } else if (isUpcomingOrOverdue && hasPendingIssues) {
        mainPendingReason = {
          type: 'admission_upcoming',
          label: 'Admissão próxima com pendências',
          detail: `Início previsto em ${adm.employee.expectedStartDate ? new Date(adm.employee.expectedStartDate).toLocaleDateString('pt-BR') : 'breve'} e checklist incompleto`,
          priority: 'Alta'
        };
      } else if (notSentOptionalDoc) {
        mainPendingReason = {
          type: 'documents_pending',
          label: 'Documento complementar pendente',
          documentId: notSentOptionalDoc.id,
          documentName: notSentOptionalDoc.document_type_name || (typeof notSentOptionalDoc.documentType === 'string' ? notSentOptionalDoc.documentType : 'Documento'),
          detail: `Pendente de envio: ${notSentOptionalDoc.document_type_name || notSentOptionalDoc.documentType}`,
          priority: 'Baixa'
        };
      } else if (inReviewDoc) {
        mainPendingReason = {
          type: 'reminder',
          label: 'Documentos em conferência',
          detail: 'Documentos enviados pelo colaborador aguardando validação do RH',
          priority: 'Baixa'
        };
      } else if (adm.status === 'Concluída') {
        mainPendingReason = {
          type: 'general_notice',
          label: 'Admissão concluída',
          detail: 'Todos os documentos foram aprovados pelo RH',
          priority: 'Baixa'
        };
      } else {
        mainPendingReason = {
          type: 'reminder',
          label: 'Processo em andamento',
          detail: 'Acompanhamento do processo de admissão digital',
          priority: 'Baixa'
        };
      }

      // Verificação da validade do convite existente (Seção 15)
      const isExpired = adm.inviteExpiresAt ? new Date(adm.inviteExpiresAt).getTime() < Date.now() : false;
      const isInviteValid = !adm.inviteRevoked && !isExpired;

      communicationItems.push({
        id: `comm-item-${adm.id}`,
        admissionId: adm.id,
        admissionCode: `ADM-${adm.id.slice(0, 6).toUpperCase()}`,
        employeeId: adm.employeeId,
        employeeName: adm.employee.name,
        employeeCpf: maskCPF(adm.employee.cpf),
        employeePhone: adm.employee.phone || '',
        role: adm.employee.role,
        department: adm.employee.department,
        unit: adm.employee.unit,
        expectedStartDate: adm.employee.expectedStartDate,
        admissionStatus: adm.status,
        mainPendingReason,
        inviteToken: adm.inviteToken,
        inviteExpiresAt: adm.inviteExpiresAt,
        inviteRevoked: adm.inviteRevoked,
        isInviteValid,
        lastCommunication: lastComm ? {
          id: lastComm.id,
          createdAt: lastComm.createdAt,
          channel: lastComm.channel,
          userName: lastComm.userName,
          actionStatusLabel: lastComm.actionStatusLabel,
          communicationType: lastComm.communicationType
        } : undefined
      });
    }

    // Filtragem (Seção 9: por padrão prioriza admissões que possam exigir comunicação)
    let filtered = communicationItems;

    // Filtro por status da admissão:
    if (options?.status && options.status !== 'TODOS') {
      filtered = filtered.filter(item => item.admissionStatus === options.status);
    } else if (!options?.status) {
      filtered = filtered.filter(item => item.admissionStatus !== 'Concluída' && item.admissionStatus !== 'Cancelada');
    }

    // Filtro por situação documental:
    if (options?.documentStatus && options.documentStatus !== 'TODOS') {
      const docSt = options.documentStatus.toLowerCase();
      filtered = filtered.filter(item => {
        const adm = allAdmissions.find(a => a.id === item.admissionId);
        if (!adm) return false;
        if (docSt === 'rejeitado') {
          return (adm.documents || []).some(d => d.status === 'Rejeitado');
        } else if (docSt === 'nao_enviado') {
          return (adm.documents || []).some(d => d.status === 'Não enviado');
        } else if (docSt === 'em_analise') {
          return (adm.documents || []).some(d => d.status === 'Em análise');
        } else if (docSt === 'aprovado') {
          return (adm.documents || []).every(d => d.status === 'Aprovado');
        }
        return true;
      });
    }

    // Filtro por cargo
    if (options?.cargo && options.cargo !== 'TODOS') {
      filtered = filtered.filter(item => item.role === options.cargo);
    }

    // Filtro por setor
    if (options?.setor && options.setor !== 'TODOS') {
      filtered = filtered.filter(item => item.department === options.setor);
    }

    // Filtro por unidade
    if (options?.unidade && options.unidade !== 'TODOS') {
      filtered = filtered.filter(item => item.unit === options.unidade);
    }

    // Busca textual (nome, CPF, cargo, código da admissão)
    if (options?.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      const qDigits = q.replace(/\D/g, '');
      filtered = filtered.filter(item => {
        const nameMatch = item.employeeName.toLowerCase().includes(q);
        const codeMatch = item.admissionCode.toLowerCase().includes(q);
        const roleMatch = item.role.toLowerCase().includes(q);
        const cpfMatch = item.employeeCpf.toLowerCase().includes(q);
        const originalAdm = allAdmissions.find(a => a.id === item.admissionId);
        const rawCpfMatch = qDigits.length >= 3 && originalAdm?.employee?.cpf?.includes(qDigits);
        return nameMatch || codeMatch || roleMatch || cpfMatch || rawCpfMatch;
      });
    }

    // Ordenação: Alta prioridade primeiro, depois Média, depois Baixa
    filtered.sort((a, b) => {
      const scoreMap: Record<string, number> = { 'Alta': 1, 'Média': 2, 'Baixa': 3 };
      const scoreA = scoreMap[a.mainPendingReason.priority] || 4;
      const scoreB = scoreMap[b.mainPendingReason.priority] || 4;
      if (scoreA !== scoreB) return scoreA - scoreB;
      return a.employeeName.localeCompare(b.employeeName);
    });

    // Paginação
    const page = Math.max(1, options?.page || 1);
    const limit = Math.max(1, options?.limit || 15);
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return {
      items: paginated,
      total,
      page,
      limit,
      totalPages,
      summary: {
        inProgressCount,
        waitingDocumentsCount,
        rejectedDocumentsCount,
        waitingResponseCount,
        upcomingWithIssuesCount
      },
      filters: {
        roles: Array.from(rolesSet).sort(),
        departments: Array.from(departmentsSet).sort(),
        units: Array.from(unitsSet).sort(),
        statuses: Array.from(statusesSet).sort()
      }
    };
  }

  // =========================================================================
  // BLOCO 4.4: PRAZOS E ACOMPANHAMENTO OPERACIONAL
  // =========================================================================

  /**
   * Helper que calcula a diferença de dias civis entre uma data esperada (YYYY-MM-DD) e hoje,
   * imune a desvios de fuso horário / DST.
   */
  private calculateDayDifference(targetDateStr?: string, refDate: Date = new Date()): number {
    if (!targetDateStr) return 9999;
    const clean = targetDateStr.split('T')[0];
    const parts = clean.split('-').map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return 9999;
    const [y, m, d] = parts;
    const targetUtc = Date.UTC(y, m - 1, d);
    const todayUtc = Date.UTC(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
    const diffMs = targetUtc - todayUtc;
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Localiza a última movimentação relevante de uma admissão (audit_logs, communications, uploads, updates).
   */
  public getAdmissionLastMovement(adm: Admission): { date: string; description: string; daysAgo: number; hoursAgo: number } {
    let latestTime = new Date(adm.createdAt || Date.now()).getTime();
    let latestDesc = 'Admissão criada no sistema';

    // Atualização de cadastro
    if (adm.updatedAt) {
      const t = new Date(adm.updatedAt).getTime();
      if (t > latestTime) {
        latestTime = t;
        latestDesc = 'Cadastro atualizado pelo RH';
      }
    }

    // Acesso ao portal pelo colaborador
    if (adm.inviteLastAccessedAt) {
      const t = new Date(adm.inviteLastAccessedAt).getTime();
      if (t > latestTime) {
        latestTime = t;
        latestDesc = 'Colaborador acessou o portal';
      }
    }

    // Termo de consentimento LGPD
    if (adm.consentDate) {
      const t = new Date(adm.consentDate).getTime();
      if (t > latestTime) {
        latestTime = t;
        latestDesc = 'Consentimento LGPD aceito pelo colaborador';
      }
    }

    // Confirmação de dados
    if (adm.dataConfirmedAt) {
      const t = new Date(adm.dataConfirmedAt).getTime();
      if (t > latestTime) {
        latestTime = t;
        latestDesc = 'Dados cadastrais confirmados pelo colaborador';
      }
    }

    // Movimentação documental (uploads e conferências)
    for (const doc of (adm.documents || [])) {
      if (doc.uploadedAt) {
        const t = new Date(doc.uploadedAt).getTime();
        if (t > latestTime) {
          latestTime = t;
          latestDesc = `Upload de documento: ${doc.documentType}`;
        }
      }
      if (doc.reviewedAt) {
        const t = new Date(doc.reviewedAt).getTime();
        if (t > latestTime) {
          latestTime = t;
          latestDesc = doc.status === 'Aprovado'
            ? `Conferência RH: ${doc.documentType} aprovado`
            : `Conferência RH: ${doc.documentType} rejeitado`;
        }
      }
      if (doc.versions) {
        for (const v of doc.versions) {
          if (v.uploadedAt) {
            const t = new Date(v.uploadedAt).getTime();
            if (t > latestTime) {
              latestTime = t;
              latestDesc = `Reenvio de documento (v${v.version}): ${doc.documentType}`;
            }
          }
          if (v.reviewedAt) {
            const t = new Date(v.reviewedAt).getTime();
            if (t > latestTime) {
              latestTime = t;
              latestDesc = v.status === 'Aprovado'
                ? `Validação RH (v${v.version}): ${doc.documentType} aprovado`
                : `Validação RH (v${v.version}): ${doc.documentType} rejeitado`;
            }
          }
        }
      }
    }

    // Registros de comunicação com o funcionário (Bloco 4.3)
    const comms = (this.data.communicationLogs || []).filter(c => c.admissionId === adm.id);
    for (const c of comms) {
      const t = new Date(c.createdAt).getTime();
      if (t > latestTime) {
        latestTime = t;
        latestDesc = `Comunicação registrada: ${c.actionStatusLabel || c.communicationType}`;
      }
    }

    // Conclusão ou cancelamento
    if (adm.completedAt) {
      const t = new Date(adm.completedAt).getTime();
      if (t > latestTime) {
        latestTime = t;
        latestDesc = 'Admissão concluída pelo RH';
      }
    }
    if (adm.cancelledAt) {
      const t = new Date(adm.cancelledAt).getTime();
      if (t > latestTime) {
        latestTime = t;
        latestDesc = 'Admissão cancelada';
      }
    }

    const now = Date.now();
    const diffMs = Math.max(0, now - latestTime);
    const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hoursAgo = Math.floor(diffMs / (1000 * 60 * 60));

    return {
      date: new Date(latestTime).toISOString(),
      description: latestDesc,
      daysAgo,
      hoursAgo
    };
  }

  /**
   * Retorna os dados operacionais consolidados da Central de Prazos e Acompanhamento (Bloco 4.4).
   */
  public getTrackingHubData(options?: TrackingFilters): TrackingResponse {
    const allAdmissions = this.data.admissions || [];
    const now = new Date();

    // Conjuntos para filtros dinâmicos
    const rolesSet = new Set<string>();
    const departmentsSet = new Set<string>();
    const unitsSet = new Set<string>();
    const statusesSet = new Set<string>();

    let upcomingCount = 0;
    let overdueCount = 0;
    let waitingEmployeeCount = 0;
    let waitingRhCount = 0;
    let noMovementCount = 0;
    let completedCount = 0;
    let attentionCount = 0;

    const settings = this.getSettings();
    const upcomingThreshold = settings?.tracking?.upcomingDaysThreshold ?? 7;
    const inactivityThreshold = settings?.tracking?.inactivityDaysThreshold ?? 5;

    const allTrackingItems: TrackingItem[] = [];
    const attentionItemsList: TrackingItem[] = [];

    for (const adm of allAdmissions) {
      if (adm.employee?.role) rolesSet.add(adm.employee.role);
      if (adm.employee?.department) departmentsSet.add(adm.employee.department);
      if (adm.employee?.unit) unitsSet.add(adm.employee.unit);
      if (adm.status) statusesSet.add(adm.status);

      const isCompleted = adm.status === 'Concluída';
      const isCancelled = adm.status === 'Cancelada';

      // Cálculo de prazos civis com base nas configurações operacionais
      const daysToExpectedDate = this.calculateDayDifference(adm.employee.expectedStartDate, now);
      const isOverdue = daysToExpectedDate < 0 && !isCompleted && !isCancelled;
      const daysSinceOverdue = isOverdue ? Math.abs(daysToExpectedDate) : 0;
      const isUpcoming = daysToExpectedDate >= 0 && daysToExpectedDate <= upcomingThreshold && !isCompleted && !isCancelled;

      // Movimentação recente com base no limite configurado de inatividade
      const lastMove = this.getAdmissionLastMovement(adm);
      const isNoMovement = lastMove.daysAgo >= inactivityThreshold && !isCompleted && !isCancelled;

      // Status documental
      const docs = adm.documents || [];
      const hasRejected = docs.some(d => d.status === 'Rejeitado');
      const hasWaitingRh = docs.some(d => d.status === 'Em análise' || d.status === 'Reenviado' || d.status === 'Enviado');
      const hasWaitingEmployee = docs.some(d => d.status === 'Não enviado' && d.required) || hasRejected;

      // Contadores principais (topo)
      if (isUpcoming) upcomingCount++;
      if (isOverdue) overdueCount++;
      if (hasWaitingEmployee && !isCompleted && !isCancelled) waitingEmployeeCount++;
      if (hasWaitingRh && !isCompleted && !isCancelled) waitingRhCount++;
      if (isNoMovement) noMovementCount++;
      if (isCompleted) completedCount++;

      // Situação Operacional Centralizada (Seção 10)
      let primarySituation: OperationalSituation = 'em_andamento';
      let primaryLabel = 'Em andamento';

      if (isCompleted) {
        primarySituation = 'concluida';
        primaryLabel = 'Concluída';
      } else if (isCancelled) {
        primarySituation = 'cancelada';
        primaryLabel = 'Cancelada';
      } else if (isOverdue) {
        primarySituation = 'data_ultrapassada';
        primaryLabel = 'Data prevista ultrapassada';
      } else if (hasRejected) {
        primarySituation = 'documento_rejeitado';
        primaryLabel = 'Documento rejeitado';
      } else if (hasWaitingRh) {
        primarySituation = 'aguardando_rh';
        primaryLabel = 'Aguardando conferência do RH';
      } else if (hasWaitingEmployee) {
        primarySituation = 'aguardando_funcionario';
        primaryLabel = 'Aguardando funcionário';
      } else if (isUpcoming) {
        primarySituation = 'proxima_admissao';
        primaryLabel = 'Próxima da admissão';
      } else if (isNoMovement) {
        primarySituation = 'sem_movimentacao';
        primaryLabel = 'Sem movimentação';
      }

      // Situações secundárias para visão completa e filtros combinados
      const secondarySituations: Array<{ type: OperationalSituation; label: string }> = [];

      if (isOverdue && primarySituation !== 'data_ultrapassada') {
        secondarySituations.push({ type: 'data_ultrapassada', label: 'Data prevista ultrapassada' });
      }
      if (hasRejected && primarySituation !== 'documento_rejeitado') {
        secondarySituations.push({ type: 'documento_rejeitado', label: 'Doc. rejeitado' });
      }
      if (hasWaitingEmployee && primarySituation !== 'aguardando_funcionario' && primarySituation !== 'documento_rejeitado') {
        secondarySituations.push({ type: 'aguardando_funcionario', label: 'Aguardando funcionário' });
      }
      if (hasWaitingRh && primarySituation !== 'aguardando_rh') {
        secondarySituations.push({ type: 'aguardando_rh', label: 'Aguardando RH' });
      }
      if (isUpcoming && primarySituation !== 'proxima_admissao') {
        secondarySituations.push({ type: 'proxima_admissao', label: 'Início próximo' });
      }
      if (isNoMovement && primarySituation !== 'sem_movimentacao') {
        secondarySituations.push({ type: 'sem_movimentacao', label: `${lastMove.daysAgo}d sem movimentação` });
      }

      // Identificação da principal pendência
      let mainPending = 'Nenhuma pendência crítica';
      let mainPendingDocId: string | undefined;

      const rejectedDoc = docs.find(d => d.status === 'Rejeitado');
      const inReviewDoc = docs.find(d => d.status === 'Em análise' || d.status === 'Reenviado' || d.status === 'Enviado');
      const missingRequiredDoc = docs.find(d => d.status === 'Não enviado' && d.required);
      const missingOptionalDoc = docs.find(d => d.status === 'Não enviado' && !d.required);

      if (rejectedDoc) {
        mainPending = `${rejectedDoc.documentType} rejeitado: ${rejectedDoc.rejectionReason || 'Necessita reenvio'}`;
        mainPendingDocId = rejectedDoc.id;
      } else if (inReviewDoc) {
        mainPending = `${inReviewDoc.documentType} aguardando conferência do RH`;
        mainPendingDocId = inReviewDoc.id;
      } else if (missingRequiredDoc) {
        mainPending = `Pendente de envio: ${missingRequiredDoc.documentType}`;
        mainPendingDocId = missingRequiredDoc.id;
      } else if (isOverdue) {
        mainPending = `Data prevista (${adm.employee.expectedStartDate}) ultrapassada há ${daysSinceOverdue} dias`;
      } else if (missingOptionalDoc) {
        mainPending = `Documento opcional pendente: ${missingOptionalDoc.documentType}`;
        mainPendingDocId = missingOptionalDoc.id;
      } else if (isCompleted) {
        mainPending = 'Admissão concluída com todos os documentos validados';
      }

      // Regra da Área "Precisam de Atenção" (Seção 7)
      // Representa necessidade operacional do processo, sem ranking de pessoas
      let needsAttention = false;
      let attentionReason = '';

      if (!isCompleted && !isCancelled) {
        if (isOverdue && hasWaitingEmployee) {
          needsAttention = true;
          attentionReason = `Data prevista ultrapassada há ${daysSinceOverdue} dia(s) com documentos pendentes`;
        } else if (isOverdue) {
          needsAttention = true;
          attentionReason = `Data prevista ultrapassada há ${daysSinceOverdue} dia(s)`;
        } else if (hasRejected) {
          needsAttention = true;
          attentionReason = `Documento rejeitado aguardando correção pelo colaborador`;
        } else if (isUpcoming && adm.progressPercent < 100) {
          needsAttention = true;
          attentionReason = `Admissão prevista para os próximos ${daysToExpectedDate} dia(s) com checklist incompleto (${adm.progressPercent}%)`;
        } else if (lastMove.daysAgo >= inactivityThreshold) {
          needsAttention = true;
          attentionReason = `Sem movimentação operacional há ${lastMove.daysAgo} dias (limite: ${inactivityThreshold}d)`;
        }
      }

      if (needsAttention) {
        attentionCount++;
      }

      // Tempo por etapa para esta admissão
      const uploadTimes = docs.map(d => d.uploadedAt ? new Date(d.uploadedAt).getTime() : null).filter((t): t is number => t !== null);
      let waitingDocumentsDays: number | null = null;
      if (uploadTimes.length > 0 && adm.createdAt) {
        const firstUploadTime = Math.min(...uploadTimes);
        waitingDocumentsDays = Math.max(0, Math.round((firstUploadTime - new Date(adm.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
      }

      let waitingRhDays: number | null = null;
      const reviewDiffs: number[] = [];
      for (const d of docs) {
        if (d.uploadedAt && d.reviewedAt) {
          const up = new Date(d.uploadedAt).getTime();
          const rev = new Date(d.reviewedAt).getTime();
          if (rev >= up) reviewDiffs.push(rev - up);
        }
      }
      if (reviewDiffs.length > 0) {
        waitingRhDays = Math.max(0, Math.round((reviewDiffs.reduce((a, b) => a + b, 0) / reviewDiffs.length) / (1000 * 60 * 60 * 24)));
      }

      const totalAdmissionDays = adm.createdAt 
        ? Math.max(0, Math.round(((isCompleted && adm.completedAt ? new Date(adm.completedAt).getTime() : now.getTime()) - new Date(adm.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
        : null;

      const trackingItem: TrackingItem = {
        id: `track-${adm.id}`,
        admissionId: adm.id,
        admissionCode: `ADM-${adm.id.slice(0, 6).toUpperCase()}`,
        employeeId: adm.employeeId,
        employeeName: adm.employee.name,
        employeeCpf: maskCPF(adm.employee.cpf),
        employeePhone: adm.employee.phone || '',
        role: adm.employee.role,
        department: adm.employee.department,
        unit: adm.employee.unit,
        admissionStatus: adm.status,
        expectedStartDate: adm.employee.expectedStartDate || '',
        daysToExpectedDate,
        daysSinceOverdue: isOverdue ? daysSinceOverdue : undefined,
        isOverdue,
        isUpcoming,
        operationalSituation: primarySituation,
        operationalSituationLabel: primaryLabel,
        secondarySituations,
        lastMovementDate: lastMove.date,
        lastMovementDescription: lastMove.description,
        daysWithoutMovement: lastMove.daysAgo,
        hoursWithoutMovement: lastMove.hoursAgo,
        mainPendingReason: mainPending,
        mainPendingDocumentId: mainPendingDocId,
        progressPercent: adm.progressPercent || 0,
        totalDocuments: adm.totalDocuments || docs.length,
        approvedDocuments: adm.approvedDocuments || docs.filter(d => d.status === 'Aprovado').length,
        needsAttention,
        attentionReason: needsAttention ? attentionReason : undefined,
        timeByStage: {
          waitingDocumentsDays,
          waitingRhDays,
          totalAdmissionDays
        },
        inviteToken: adm.inviteToken,
        isInviteValid: !adm.inviteRevoked && (!adm.inviteExpiresAt || new Date(adm.inviteExpiresAt).getTime() > now.getTime())
      };

      allTrackingItems.push(trackingItem);
      if (needsAttention) {
        attentionItemsList.push(trackingItem);
      }
    }

    // Filtragem dos itens para a tabela principal
    let filtered = allTrackingItems;

    // 1. Filtro de Período
    if (options?.period && options.period !== 'all') {
      if (options.period === 'today') {
        filtered = filtered.filter(item => item.daysToExpectedDate === 0);
      } else if (options.period === 'next_7') {
        filtered = filtered.filter(item => item.daysToExpectedDate >= 0 && item.daysToExpectedDate <= 7);
      } else if (options.period === 'next_15') {
        filtered = filtered.filter(item => item.daysToExpectedDate >= 0 && item.daysToExpectedDate <= 15);
      } else if (options.period === 'next_30') {
        filtered = filtered.filter(item => item.daysToExpectedDate >= 0 && item.daysToExpectedDate <= 30);
      } else if (options.period === 'overdue') {
        filtered = filtered.filter(item => item.isOverdue);
      } else if (options.period === 'custom') {
        if (options.startDate) {
          filtered = filtered.filter(item => item.expectedStartDate >= options.startDate!);
        }
        if (options.endDate) {
          filtered = filtered.filter(item => item.expectedStartDate <= options.endDate!);
        }
      }
    }

    // 2. Filtro de Status
    if (options?.status && options.status !== 'TODOS') {
      filtered = filtered.filter(item => item.admissionStatus === options.status);
    }

    // 3. Filtro de Cargo
    if (options?.cargo && options.cargo !== 'TODOS') {
      filtered = filtered.filter(item => item.role === options.cargo);
    }

    // 4. Filtro de Setor
    if (options?.setor && options.setor !== 'TODOS') {
      filtered = filtered.filter(item => item.department === options.setor);
    }

    // 5. Filtro de Unidade
    if (options?.unidade && options.unidade !== 'TODOS') {
      filtered = filtered.filter(item => item.unit === options.unidade);
    }

    // 6. Filtro de Situação Operacional
    if (options?.situacao && options.situacao !== 'TODOS') {
      const sit = options.situacao as OperationalSituation;
      filtered = filtered.filter(item => 
        item.operationalSituation === sit || 
        item.secondarySituations.some(s => s.type === sit)
      );
    }

    // 7. Filtro de Tempo Sem Movimentação
    if (options?.tempoSemMovimentacao && options.tempoSemMovimentacao !== 'all') {
      if (options.tempoSemMovimentacao === 'ate_2') {
        filtered = filtered.filter(item => item.daysWithoutMovement <= 2);
      } else if (options.tempoSemMovimentacao === '3_a_5') {
        filtered = filtered.filter(item => item.daysWithoutMovement >= 3 && item.daysWithoutMovement <= 5);
      } else if (options.tempoSemMovimentacao === '6_a_10') {
        filtered = filtered.filter(item => item.daysWithoutMovement >= 6 && item.daysWithoutMovement <= 10);
      } else if (options.tempoSemMovimentacao === 'mais_10') {
        filtered = filtered.filter(item => item.daysWithoutMovement > 10);
      }
    }

    // 8. Busca Textual
    if (options?.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      const qDigits = q.replace(/\D/g, '');
      filtered = filtered.filter(item => {
        const nameMatch = item.employeeName.toLowerCase().includes(q);
        const codeMatch = item.admissionCode.toLowerCase().includes(q);
        const roleMatch = item.role.toLowerCase().includes(q);
        const pendingMatch = item.mainPendingReason.toLowerCase().includes(q);
        const originalAdm = allAdmissions.find(a => a.id === item.admissionId);
        const rawCpfMatch = qDigits.length >= 3 && originalAdm?.employee?.cpf?.includes(qDigits);
        return nameMatch || codeMatch || roleMatch || pendingMatch || rawCpfMatch;
      });
    }

    // Ordenação padrão operacional:
    // 1. Precisam de atenção primeiro
    // 2. Data prevista ultrapassada ou mais próxima
    // 3. Dias sem movimentação
    filtered.sort((a, b) => {
      if (a.needsAttention && !b.needsAttention) return -1;
      if (!a.needsAttention && b.needsAttention) return 1;
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (a.daysToExpectedDate !== b.daysToExpectedDate) return a.daysToExpectedDate - b.daysToExpectedDate;
      return b.daysWithoutMovement - a.daysWithoutMovement;
    });

    // Ordenação da seção "Precisam de Atenção": maior urgência operacional primeiro
    attentionItemsList.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return b.daysWithoutMovement - a.daysWithoutMovement;
    });

    // Paginação
    const page = Math.max(1, options?.page || 1);
    const limit = Math.max(1, options?.limit || 15);
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return {
      items: paginated,
      attentionItems: attentionItemsList.slice(0, 10), // Top 10 que mais precisam de atenção
      total,
      page,
      limit,
      totalPages,
      summary: {
        upcomingCount,
        overdueCount,
        waitingEmployeeCount,
        waitingRhCount,
        noMovementCount,
        completedCount,
        attentionCount,
        totalCount: allAdmissions.length
      },
      filters: {
        roles: Array.from(rolesSet).sort(),
        departments: Array.from(departmentsSet).sort(),
        units: Array.from(unitsSet).sort(),
        statuses: Array.from(statusesSet).sort()
      }
    };
  }

  /**
   * Constrói a Linha do Tempo da Admissão e os Tempos por Etapa (Seções 12 e 13).
   */
  public getAdmissionTimeline(admissionId: string): { events: AdmissionTimelineEvent[]; stageTimes: AdmissionStageTimes } {
    const adm = this.getAdmissionById(admissionId);
    if (!adm) {
      throw new Error('Admissão não encontrada.');
    }

    const events: AdmissionTimelineEvent[] = [];
    const now = new Date();

    // 1. Criação da admissão
    if (adm.createdAt) {
      events.push({
        id: `ev-${adm.id}-criacao`,
        stage: 'criacao',
        title: 'Admissão criada no sistema',
        description: `Cadastro inicial criado para o cargo de ${adm.employee.role}.`,
        date: adm.createdAt,
        performedBy: 'RH',
        status: 'completed'
      });
    }

    // 2. Convite disponibilizado ou enviado
    if (adm.inviteSentAt || adm.inviteLastSentAt || adm.inviteToken) {
      const inviteDate = adm.inviteLastSentAt || adm.inviteSentAt || adm.createdAt;
      events.push({
        id: `ev-${adm.id}-convite`,
        stage: 'convite_enviado',
        title: adm.inviteSentViaWhatsApp ? 'Convite enviado via WhatsApp' : 'Convite disponibilizado ao colaborador',
        description: adm.inviteSentViaWhatsApp
          ? 'Link de autoatendimento digital disparado para o número do colaborador.'
          : 'Link de acesso seguro gerado pelo RH.',
        date: inviteDate,
        performedBy: 'RH',
        status: 'completed'
      });
    }

    // 3. Acesso do colaborador
    if (adm.inviteAccessCount && adm.inviteAccessCount > 0 && adm.inviteLastAccessedAt) {
      events.push({
        id: `ev-${adm.id}-acesso`,
        stage: 'funcionario_acessou',
        title: `Colaborador acessou o portal`,
        description: `Identificado acesso seguro via link exclusivo (${adm.inviteAccessCount}º acesso registrado).`,
        date: adm.inviteLastAccessedAt,
        performedBy: adm.employee.name,
        status: 'completed'
      });
    }

    // 4. Confirmação dos dados cadastrais
    if (adm.dataConfirmed && adm.dataConfirmedAt) {
      events.push({
        id: `ev-${adm.id}-dados`,
        stage: 'dados_confirmados',
        title: 'Dados cadastrais confirmados',
        description: 'Colaborador revisou e confirmou a exatidão das informações cadastrais e termos.',
        date: adm.dataConfirmedAt,
        performedBy: adm.employee.name,
        status: 'completed'
      });
    }

    // 5. Documentos enviados
    const docs = adm.documents || [];
    const uploadDates = docs.filter(d => d.uploadedAt).map(d => ({ doc: d, date: d.uploadedAt! }));
    if (uploadDates.length > 0) {
      uploadDates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      events.push({
        id: `ev-${adm.id}-uploads`,
        stage: 'documentos_enviados',
        title: 'Documentos enviados pelo colaborador',
        description: `${uploadDates.length} documento(s) digitalizado(s) e submetido(s) para conferência.`,
        date: uploadDates[0].date,
        performedBy: adm.employee.name,
        status: 'completed'
      });
    }

    // 6. Conferência do RH
    const reviewedDocs = docs.filter(d => d.reviewedAt);
    if (reviewedDocs.length > 0) {
      reviewedDocs.sort((a, b) => new Date(a.reviewedAt!).getTime() - new Date(b.reviewedAt!).getTime());
      const approvedCount = reviewedDocs.filter(d => d.status === 'Aprovado').length;
      events.push({
        id: `ev-${adm.id}-conferencia`,
        stage: 'conferencia_rh',
        title: 'Conferência de documentos pelo RH',
        description: `Conferência realizada: ${approvedCount} aprovado(s) de ${reviewedDocs.length} analisado(s).`,
        date: reviewedDocs[0].reviewedAt!,
        performedBy: reviewedDocs[0].reviewedBy || 'RH',
        status: 'completed'
      });
    }

    // 7. Pendência de documento
    const rejectedDocs = docs.filter(d => d.status === 'Rejeitado');
    if (rejectedDocs.length > 0) {
      events.push({
        id: `ev-${adm.id}-pendencia`,
        stage: 'pendencia',
        title: 'Pendência identificada em documentação',
        description: `${rejectedDocs.map(d => `${d.documentType} (${d.rejectionReason || 'Recusado'})`).join(', ')}.`,
        date: rejectedDocs[0].reviewedAt || adm.updatedAt,
        performedBy: rejectedDocs[0].reviewedBy || 'RH',
        status: 'completed'
      });
    }

    // 8. Reenvios após rejeição
    let hasResubmission = false;
    for (const d of docs) {
      if (d.versions && d.versions.length > 1) {
        hasResubmission = true;
        const v2 = d.versions[1];
        if (v2.uploadedAt) {
          events.push({
            id: `ev-${adm.id}-reenvio-${d.id}`,
            stage: 'reenvio',
            title: `Reenvio de documento com correção: ${d.documentType}`,
            description: `Nova versão (${v2.version}) submetida pelo colaborador após ajuste solicitado.`,
            date: v2.uploadedAt,
            performedBy: adm.employee.name,
            status: 'completed'
          });
        }
      }
    }

    // 9. Aprovação dos documentos
    if (adm.approvedDocuments > 0) {
      const allApproved = adm.approvedDocuments === adm.totalDocuments;
      events.push({
        id: `ev-${adm.id}-aprovacao`,
        stage: 'aprovacao',
        title: allApproved ? 'Todos os documentos aprovados' : 'Documentos aprovados parcialmente',
        description: `${adm.approvedDocuments} de ${adm.totalDocuments} documento(s) com conformidade validada pelo RH.`,
        date: reviewedDocs.length > 0 ? reviewedDocs[reviewedDocs.length - 1].reviewedAt! : adm.updatedAt,
        performedBy: 'RH',
        status: allApproved ? 'completed' : 'current'
      });
    }

    // 10. Conclusão ou cancelamento
    if (adm.status === 'Concluída') {
      events.push({
        id: `ev-${adm.id}-concluida`,
        stage: 'concluida',
        title: 'Admissão concluída com sucesso',
        description: `Processo admissional finalizado. Todos os requisitos foram cumpridos.`,
        date: adm.completedAt || adm.updatedAt,
        performedBy: adm.completedBy || 'RH',
        status: 'completed'
      });
    } else if (adm.status === 'Cancelada') {
      events.push({
        id: `ev-${adm.id}-cancelada`,
        stage: 'cancelada',
        title: 'Admissão cancelada',
        description: `Motivo: ${adm.cancellationReason || 'Cancelado pela equipe de RH'}.`,
        date: adm.cancelledAt || adm.updatedAt,
        performedBy: adm.cancelledBy || 'RH',
        status: 'completed'
      });
    }

    // Ordenação cronológica garantida
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // =========================================================================
    // CÁLCULO DE TEMPO POR ETAPA (Seção 13)
    // Se não houver dados suficientes, retornar estritamente "Não disponível"
    // =========================================================================

    // 1. Tempo aguardando documentos: da criação/convite até o primeiro envio
    let waitingDocumentsStr = 'Não disponível';
    if (adm.createdAt && uploadDates.length > 0) {
      const startMs = new Date(adm.inviteSentAt || adm.createdAt).getTime();
      const firstUploadMs = new Date(uploadDates[0].date).getTime();
      if (firstUploadMs >= startMs) {
        const diffDays = Math.round((firstUploadMs - startMs) / (1000 * 60 * 60 * 24));
        const diffHours = Math.round((firstUploadMs - startMs) / (1000 * 60 * 60));
        waitingDocumentsStr = diffDays >= 1 ? `${diffDays} dia(s)` : `${diffHours} hora(s)`;
      }
    } else if (adm.createdAt && adm.status === 'Aguardando documentos') {
      const startMs = new Date(adm.inviteSentAt || adm.createdAt).getTime();
      const diffDays = Math.floor((now.getTime() - startMs) / (1000 * 60 * 60 * 24));
      waitingDocumentsStr = `${diffDays} dia(s) (em andamento)`;
    }

    // 2. Tempo aguardando RH: do envio do documento até a conferência
    let waitingRhStr = 'Não disponível';
    const waitingRhDiffs: number[] = [];
    for (const d of docs) {
      if (d.uploadedAt && d.reviewedAt) {
        const up = new Date(d.uploadedAt).getTime();
        const rev = new Date(d.reviewedAt).getTime();
        if (rev >= up) {
          waitingRhDiffs.push(rev - up);
        }
      }
    }
    if (waitingRhDiffs.length > 0) {
      const avgMs = waitingRhDiffs.reduce((a, b) => a + b, 0) / waitingRhDiffs.length;
      const avgDays = Math.round(avgMs / (1000 * 60 * 60 * 24));
      const avgHours = Math.round(avgMs / (1000 * 60 * 60));
      waitingRhStr = avgDays >= 1 ? `${avgDays} dia(s)` : `${avgHours} hora(s)`;
    } else if (docs.some(d => d.status === 'Em análise' || d.status === 'Reenviado')) {
      const oldestInReview = docs.filter(d => (d.status === 'Em análise' || d.status === 'Reenviado') && d.uploadedAt);
      if (oldestInReview.length > 0) {
        const oldestMs = Math.min(...oldestInReview.map(d => new Date(d.uploadedAt!).getTime()));
        const diffDays = Math.floor((now.getTime() - oldestMs) / (1000 * 60 * 60 * 24));
        waitingRhStr = `${diffDays} dia(s) (aguardando conferência)`;
      }
    }

    // 3. Tempo em pendência: da identificação da rejeição até o reenvio/resolução
    let inPendingStr = 'Não disponível';
    const pendingDiffs: number[] = [];
    for (const d of docs) {
      if (d.versions && d.versions.length > 1) {
        for (let i = 0; i < d.versions.length - 1; i++) {
          const v = d.versions[i];
          const nextV = d.versions[i + 1];
          if (v.status === 'Rejeitado' && v.reviewedAt && nextV.uploadedAt) {
            const rejTime = new Date(v.reviewedAt).getTime();
            const reupTime = new Date(nextV.uploadedAt).getTime();
            if (reupTime >= rejTime) {
              pendingDiffs.push(reupTime - rejTime);
            }
          }
        }
      }
    }
    if (pendingDiffs.length > 0) {
      const avgMs = pendingDiffs.reduce((a, b) => a + b, 0) / pendingDiffs.length;
      const avgDays = Math.round(avgMs / (1000 * 60 * 60 * 24));
      const avgHours = Math.round(avgMs / (1000 * 60 * 60));
      inPendingStr = avgDays >= 1 ? `${avgDays} dia(s)` : `${avgHours} hora(s)`;
    } else if (rejectedDocs.length > 0) {
      const oldestRejection = rejectedDocs[0].reviewedAt ? new Date(rejectedDocs[0].reviewedAt).getTime() : now.getTime();
      const diffDays = Math.floor((now.getTime() - oldestRejection) / (1000 * 60 * 60 * 24));
      inPendingStr = `${diffDays} dia(s) (pendência em aberto)`;
    }

    // 4. Tempo total da admissão: da criação até a conclusão
    let totalAdmissionStr = 'Não disponível';
    if (adm.createdAt) {
      const startMs = new Date(adm.createdAt).getTime();
      if (adm.status === 'Concluída' && adm.completedAt) {
        const endMs = new Date(adm.completedAt).getTime();
        const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));
        totalAdmissionStr = `${diffDays} dia(s) (concluída)`;
      } else if (adm.status === 'Cancelada' && adm.cancelledAt) {
        const endMs = new Date(adm.cancelledAt).getTime();
        const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));
        totalAdmissionStr = `${diffDays} dia(s) (cancelada)`;
      } else {
        const diffDays = Math.floor((now.getTime() - startMs) / (1000 * 60 * 60 * 24));
        totalAdmissionStr = `${diffDays} dia(s) (em andamento)`;
      }
    }

    return {
      events,
      stageTimes: {
        waitingDocuments: waitingDocumentsStr,
        waitingRh: waitingRhStr,
        inPending: inPendingStr,
        totalAdmission: totalAdmissionStr
      }
    };
  }

  // =========================================================================
  // BLOCO 4.5 — RELATÓRIOS E INDICADORES DE RH
  // =========================================================================

  getReportData(options: ReportFilterOptions = {}): ReportDataResponse {
    const reportType: ReportType = options.reportType || 'admissoes';
    const allAdmissions = [...(this.data.admissions || [])];

    // Coletores de filtros disponíveis no sistema (sempre sobre a base completa)
    const availableRoles = Array.from(new Set(allAdmissions.map(a => a.employee?.role).filter(Boolean))).sort();
    const availableDepartments = Array.from(new Set(allAdmissions.map(a => a.employee?.department).filter(Boolean))).sort();
    const availableUnits = Array.from(new Set(allAdmissions.map(a => a.employee?.unit).filter(Boolean))).sort();
    const availableStatuses = [
      'Rascunho',
      'Aguardando documentos',
      'Em conferência',
      'Pendência',
      'Concluída',
      'Cancelada'
    ];

    // 1. Definição do Período
    const now = new Date();
    let periodStart: number | null = null;
    let periodEnd: number | null = null;

    if (options.period === 'today') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    } else if (options.period === '7d') {
      periodStart = Date.now() - 7 * 86400000;
      periodEnd = Date.now();
    } else if (options.period === '30d') {
      periodStart = Date.now() - 30 * 86400000;
      periodEnd = Date.now();
    } else if (options.period === 'this_month') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    } else if (options.period === 'next_month') {
      periodStart = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0).getTime();
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999).getTime();
    } else if (options.startDate || options.endDate) {
      if (options.startDate) periodStart = new Date(options.startDate + 'T00:00:00').getTime();
      if (options.endDate) periodEnd = new Date(options.endDate + 'T23:59:59').getTime();
    }

    // 2. Filtragem de Admissões (Consistência estrita com Dashboard e Central de Pendências)
    let filteredAdmissions = allAdmissions.filter(a => {
      // Filtro de período por data de criação
      if (periodStart !== null || periodEnd !== null) {
        const createdMs = new Date(a.createdAt).getTime();
        if (periodStart !== null && createdMs < periodStart) return false;
        if (periodEnd !== null && createdMs > periodEnd) return false;
      }

      // Filtro de status
      if (options.status && options.status !== 'TODOS' && options.status !== 'Todos') {
        if (a.status !== options.status) return false;
      }

      // Filtro de cargo
      if (options.cargo && options.cargo !== 'TODOS' && options.cargo !== 'Todos') {
        if (a.employee?.role !== options.cargo) return false;
      }

      // Filtro de departamento
      if (options.setor && options.setor !== 'TODOS' && options.setor !== 'Todos') {
        if (a.employee?.department !== options.setor) return false;
      }

      // Filtro de unidade
      if (options.unidade && options.unidade !== 'TODOS' && options.unidade !== 'Todos') {
        if (a.employee?.unit !== options.unidade) return false;
      }

      // Busca textual
      if (options.search && options.search.trim()) {
        const q = options.search.trim().toLowerCase();
        const cleanDigits = q.replace(/\D/g, '');
        const emp = a.employee || ({} as any);
        const code = `adm-${a.id.slice(0, 6)}`.toLowerCase();

        const nameMatch = emp.name?.toLowerCase().includes(q);
        const emailMatch = emp.email?.toLowerCase().includes(q);
        const roleMatch = emp.role?.toLowerCase().includes(q);
        const deptMatch = emp.department?.toLowerCase().includes(q);
        const idMatch = a.id.toLowerCase().includes(q) || code.includes(q);
        const cpfMatch = cleanDigits.length >= 3 && emp.cpf ? emp.cpf.replace(/\D/g, '').includes(cleanDigits) : false;
        const phoneMatch = cleanDigits.length >= 3 && emp.phone ? emp.phone.replace(/\D/g, '').includes(cleanDigits) : false;

        if (!nameMatch && !emailMatch && !roleMatch && !deptMatch && !idMatch && !cpfMatch && !phoneMatch) {
          return false;
        }
      }

      return true;
    });

    // Filtros de tipo de relatório de nível superior
    if (reportType === 'concluidas') {
      filteredAdmissions = filteredAdmissions.filter(a => a.status === 'Concluída');
    } else if (reportType === 'canceladas') {
      filteredAdmissions = filteredAdmissions.filter(a => a.status === 'Cancelada');
    }

    // 3. Indicadores Gerais Consolidados (KPIs)
    const totalAdmissions = filteredAdmissions.length;
    const inProgressAdmissions = filteredAdmissions.filter(a => 
      a.status === 'Aguardando documentos' || 
      a.status === 'Em conferência' || 
      a.status === 'Pendência' || 
      a.status === 'Rascunho'
    ).length;
    const completedAdmissions = filteredAdmissions.filter(a => a.status === 'Concluída').length;
    const cancelledAdmissions = filteredAdmissions.filter(a => a.status === 'Cancelada').length;
    const completionRate = totalAdmissions > 0 ? Math.round((completedAdmissions / totalAdmissions) * 100) : 0;

    // Tempo médio de conclusão para admissões concluídas
    const completedWithDates = filteredAdmissions.filter(a => a.status === 'Concluída' && a.completedAt && a.createdAt);
    let avgDaysToCompletion: number | null = null;
    if (completedWithDates.length > 0) {
      const totalDays = completedWithDates.reduce((acc, a) => {
        const start = new Date(a.createdAt).getTime();
        const end = new Date(a.completedAt!).getTime();
        const days = Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
        return acc + days;
      }, 0);
      avgDaysToCompletion = Math.round((totalDays / completedWithDates.length) * 10) / 10;
    }

    // Métricas documentais agregadas
    let totalDocuments = 0;
    let approvedDocuments = 0;
    let pendingDocuments = 0; // Não enviado + Rejeitado
    let reviewingDocuments = 0; // Em análise + Reenviado

    filteredAdmissions.forEach(adm => {
      (adm.documents || []).forEach(doc => {
        totalDocuments++;
        if (doc.status === 'Aprovado') {
          approvedDocuments++;
        } else if (doc.status === 'Em análise' || doc.status === 'Reenviado') {
          reviewingDocuments++;
        } else if (doc.status === 'Rejeitado' || doc.status === 'Não enviado') {
          pendingDocuments++;
        }
      });
    });

    const documentApprovalRate = totalDocuments > 0 ? Math.round((approvedDocuments / totalDocuments) * 100) : 0;

    const indicators: ReportIndicators = {
      totalAdmissions,
      inProgressAdmissions,
      completedAdmissions,
      cancelledAdmissions,
      completionRate,
      avgDaysToCompletion,
      totalDocuments,
      approvedDocuments,
      pendingDocuments,
      reviewingDocuments,
      documentApprovalRate
    };

    // 4. Dados para Gráficos Analíticos
    // Distribuição por status
    const statusColorMap: Record<string, string> = {
      'Rascunho': '#94a3b8',
      'Aguardando documentos': '#f59e0b',
      'Em conferência': '#3b82f6',
      'Pendência': '#ef4444',
      'Concluída': '#10b981',
      'Cancelada': '#64748b'
    };

    const byStatus: ReportChartItem[] = availableStatuses.map(st => {
      const count = filteredAdmissions.filter(a => a.status === st).length;
      return {
        name: st,
        count,
        percentage: totalAdmissions > 0 ? Math.round((count / totalAdmissions) * 100) : 0,
        color: statusColorMap[st] || '#3b82f6'
      };
    });

    // Distribuição por departamento
    const deptCountMap = new Map<string, number>();
    filteredAdmissions.forEach(a => {
      const d = a.employee?.department || 'Outros';
      deptCountMap.set(d, (deptCountMap.get(d) || 0) + 1);
    });
    const byDepartment: ReportChartItem[] = Array.from(deptCountMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalAdmissions > 0 ? Math.round((count / totalAdmissions) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    // Distribuição por cargo (Top 8)
    const roleCountMap = new Map<string, number>();
    filteredAdmissions.forEach(a => {
      const r = a.employee?.role || 'Outros';
      roleCountMap.set(r, (roleCountMap.get(r) || 0) + 1);
    });
    const byRole: ReportChartItem[] = Array.from(roleCountMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalAdmissions > 0 ? Math.round((count / totalAdmissions) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Distribuição por unidade
    const unitCountMap = new Map<string, number>();
    filteredAdmissions.forEach(a => {
      const u = a.employee?.unit || 'Matriz';
      unitCountMap.set(u, (unitCountMap.get(u) || 0) + 1);
    });
    const byUnit: ReportChartItem[] = Array.from(unitCountMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalAdmissions > 0 ? Math.round((count / totalAdmissions) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    // Distribuição por status de documentos
    const docStatusMap = new Map<string, number>();
    filteredAdmissions.forEach(a => {
      (a.documents || []).forEach(d => {
        docStatusMap.set(d.status, (docStatusMap.get(d.status) || 0) + 1);
      });
    });
    const byDocumentStatus: ReportChartItem[] = [
      { name: 'Aprovado', count: docStatusMap.get('Aprovado') || 0, color: '#10b981', percentage: totalDocuments > 0 ? Math.round(((docStatusMap.get('Aprovado') || 0) / totalDocuments) * 100) : 0 },
      { name: 'Em análise', count: (docStatusMap.get('Em análise') || 0) + (docStatusMap.get('Reenviado') || 0), color: '#3b82f6', percentage: totalDocuments > 0 ? Math.round((((docStatusMap.get('Em análise') || 0) + (docStatusMap.get('Reenviado') || 0)) / totalDocuments) * 100) : 0 },
      { name: 'Não enviado', count: docStatusMap.get('Não enviado') || 0, color: '#f59e0b', percentage: totalDocuments > 0 ? Math.round(((docStatusMap.get('Não enviado') || 0) / totalDocuments) * 100) : 0 },
      { name: 'Rejeitado', count: docStatusMap.get('Rejeitado') || 0, color: '#ef4444', percentage: totalDocuments > 0 ? Math.round(((docStatusMap.get('Rejeitado') || 0) / totalDocuments) * 100) : 0 },
    ];

    // Evolução temporal de admissões (por data de criação)
    const evolutionMap = new Map<string, number>();
    filteredAdmissions.forEach(a => {
      const dt = a.createdAt ? a.createdAt.split('T')[0] : '';
      if (dt) {
        evolutionMap.set(dt, (evolutionMap.get(dt) || 0) + 1);
      }
    });
    const evolution: ReportTimelineEvolution[] = Array.from(evolutionMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => {
        const parts = date.split('-');
        const d = parts[2] || '';
        const m = parts[1] || '';
        return {
          date,
          label: `${d}/${m}`,
          count
        };
      });

    const charts: ReportCharts = {
      byStatus,
      byDepartment,
      byRole,
      byUnit,
      byDocumentStatus,
      evolution
    };

    // 5. Geração de Linhas da Tabela de acordo com o tipo de relatório selecionado
    let rows: any[] = [];
    const settings = this.getSettings();
    const showFullCpf = settings?.reports?.showFullCpf ?? false;
    const formatCpfForReport = (cpf?: string) => {
      if (!cpf) return '-';
      return showFullCpf ? cpf : maskCPF(cpf);
    };

    if (reportType === 'admissoes') {
      rows = filteredAdmissions.map(adm => {
        const createdMs = new Date(adm.createdAt).getTime();
        const endMs = adm.completedAt 
          ? new Date(adm.completedAt).getTime() 
          : adm.cancelledAt 
          ? new Date(adm.cancelledAt).getTime() 
          : Date.now();
        const durationDays = Math.max(0, Math.round((endMs - createdMs) / (1000 * 60 * 60 * 24)));

        const row: ReportRowAdmission = {
          id: adm.id,
          admissionCode: `ADM-${adm.id.slice(0, 6).toUpperCase()}`,
          employeeName: adm.employee.name,
          employeeCpfMasked: formatCpfForReport(adm.employee.cpf),
          employeeEmail: adm.employee.email,
          employeePhone: adm.employee.phone,
          role: adm.employee.role,
          department: adm.employee.department,
          unit: adm.employee.unit,
          status: adm.status,
          expectedStartDate: adm.employee.expectedStartDate,
          createdAt: adm.createdAt,
          completedAt: adm.completedAt,
          progressPercent: adm.progressPercent || 0,
          approvedDocuments: adm.approvedDocuments || 0,
          totalDocuments: adm.totalDocuments || (adm.documents ? adm.documents.filter(d => d.required).length : 0),
          durationDays
        };
        return row;
      });
    } else if (reportType === 'documentos') {
      const docRows: ReportRowDocument[] = [];
      filteredAdmissions.forEach(adm => {
        (adm.documents || []).forEach(doc => {
          if (options.documentStatus && options.documentStatus !== 'TODOS' && options.documentStatus !== 'Todos') {
            if (doc.status !== options.documentStatus) return;
          }
          docRows.push({
            id: doc.id,
            admissionId: adm.id,
            admissionCode: `ADM-${adm.id.slice(0, 6).toUpperCase()}`,
            employeeName: adm.employee.name,
            employeeCpfMasked: formatCpfForReport(adm.employee.cpf),
            role: adm.employee.role,
            department: adm.employee.department,
            unit: adm.employee.unit,
            documentName: doc.document_type_name || (typeof doc.documentType === 'string' ? doc.documentType : 'Documento'),
            category: doc.category || 'Pessoal',
            required: Boolean(doc.required),
            status: doc.status,
            currentVersion: doc.currentVersion || (doc.versions ? doc.versions.length : 0),
            uploadedAt: doc.uploadedAt,
            reviewedAt: doc.reviewedAt,
            reviewedBy: doc.reviewedBy,
            rejectionReason: doc.rejectionReason
          });
        });
      });
      rows = docRows;
    } else if (reportType === 'pendencias') {
      const pendingRows: ReportRowPending[] = [];
      filteredAdmissions.forEach(adm => {
        if (adm.status === 'Concluída' || adm.status === 'Cancelada') return;

        (adm.documents || []).forEach(doc => {
          const docName = doc.document_type_name || (typeof doc.documentType === 'string' ? doc.documentType : 'Documento');
          const isDocPending = doc.status === 'Não enviado' || doc.status === 'Em análise' || doc.status === 'Reenviado' || doc.status === 'Rejeitado';

          if (!isDocPending) return;

          let pendingType = 'documento_nao_enviado';
          let pendingTypeLabel = 'Documento não enviado';
          let priority: 'Alta' | 'Média' | 'Baixa' = doc.required ? 'Alta' : 'Média';

          if (doc.status === 'Rejeitado') {
            pendingType = 'documento_rejeitado';
            pendingTypeLabel = 'Documento rejeitado';
            priority = 'Alta';
          } else if (doc.status === 'Em análise' || doc.status === 'Reenviado') {
            pendingType = 'aguardando_conferencia';
            pendingTypeLabel = 'Aguardando conferência do RH';
            priority = 'Média';
          }

          const refDate = doc.uploadedAt || doc.reviewedAt || adm.createdAt;
          const daysPending = Math.max(0, Math.round((Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24)));

          pendingRows.push({
            id: `pend-row-${doc.id}`,
            admissionId: adm.id,
            admissionCode: `ADM-${adm.id.slice(0, 6).toUpperCase()}`,
            employeeName: adm.employee.name,
            employeeCpfMasked: formatCpfForReport(adm.employee.cpf),
            role: adm.employee.role,
            department: adm.employee.department,
            unit: adm.employee.unit,
            documentName: docName,
            pendingType,
            pendingTypeLabel,
            priority,
            daysPending,
            status: doc.status,
            rejectionReason: doc.rejectionReason,
            date: refDate
          });
        });
      });
      rows = pendingRows;
    } else if (reportType === 'concluidas') {
      rows = filteredAdmissions
        .filter(adm => adm.status === 'Concluída')
        .map(adm => {
          const startMs = new Date(adm.createdAt).getTime();
          const endMs = adm.completedAt ? new Date(adm.completedAt).getTime() : Date.now();
          const durationDays = Math.max(0, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));

          const row: ReportRowCompleted = {
            id: adm.id,
            admissionCode: `ADM-${adm.id.slice(0, 6).toUpperCase()}`,
            employeeName: adm.employee.name,
            employeeCpfMasked: formatCpfForReport(adm.employee.cpf),
            role: adm.employee.role,
            department: adm.employee.department,
            unit: adm.employee.unit,
            createdAt: adm.createdAt,
            completedAt: adm.completedAt || adm.updatedAt,
            completedBy: adm.completedBy || 'Equipe de RH',
            durationDays,
            approvedDocuments: adm.approvedDocuments || (adm.documents ? adm.documents.filter(d => d.status === 'Aprovado').length : 0),
            totalDocuments: adm.totalDocuments || (adm.documents ? adm.documents.filter(d => d.required).length : 0)
          };
          return row;
        });
    } else if (reportType === 'canceladas') {
      rows = filteredAdmissions
        .filter(adm => adm.status === 'Cancelada')
        .map(adm => {
          const row: ReportRowCancelled = {
            id: adm.id,
            admissionCode: `ADM-${adm.id.slice(0, 6).toUpperCase()}`,
            employeeName: adm.employee.name,
            employeeCpfMasked: formatCpfForReport(adm.employee.cpf),
            role: adm.employee.role,
            department: adm.employee.department,
            unit: adm.employee.unit,
            createdAt: adm.createdAt,
            cancelledAt: adm.cancelledAt || adm.updatedAt,
            cancelledBy: adm.cancelledBy || 'Equipe de RH',
            cancellationReason: adm.cancellationReason || 'Cancelado pela equipe de RH'
          };
          return row;
        });
    }

    // 6. Ordenação
    rows.sort((a, b) => {
      const order = options.sortOrder === 'asc' ? 1 : -1;
      if (options.sortBy === 'name') {
        return (a.employeeName || '').localeCompare(b.employeeName || '') * order;
      }
      if (options.sortBy === 'role') {
        return (a.role || '').localeCompare(b.role || '') * order;
      }
      if (options.sortBy === 'department') {
        return (a.department || '').localeCompare(b.department || '') * order;
      }
      if (options.sortBy === 'status') {
        return (a.status || '').localeCompare(b.status || '') * order;
      }
      if (options.sortBy === 'progress') {
        return ((a.progressPercent || 0) - (b.progressPercent || 0)) * order;
      }
      if (options.sortBy === 'duration') {
        return ((a.durationDays || 0) - (b.durationDays || 0)) * order;
      }
      // Padrão: mais recentes primeiro
      const dateA = new Date(a.createdAt || a.date || a.uploadedAt || 0).getTime();
      const dateB = new Date(b.createdAt || b.date || b.uploadedAt || 0).getTime();
      return (dateB - dateA) * (options.sortOrder === 'asc' ? -1 : 1);
    });

    // 7. Paginação
    const total = rows.length;
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Number(options.limit) || 15);
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginatedRows = rows.slice(offset, offset + limit);

    return {
      reportType,
      indicators,
      charts,
      rows: paginatedRows,
      total,
      page,
      limit,
      totalPages,
      availableFilters: {
        roles: availableRoles,
        departments: availableDepartments,
        units: availableUnits,
        statuses: availableStatuses
      }
    };
  }

  generateReportCsv(options: ReportFilterOptions = {}): { csv: string; fileName: string; totalRows: number } {
    // Busca todos os registros sem paginação
    const reportData = this.getReportData({ ...options, page: 1, limit: 100000 });
    const { reportType, rows } = reportData;

    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const formatDate = (isoStr?: string): string => {
      if (!isoStr) return '-';
      try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr;
        return d.toLocaleDateString('pt-BR');
      } catch {
        return isoStr;
      }
    };

    let headers: string[] = [];
    const lines: string[] = [];

    if (reportType === 'admissoes') {
      headers = [
        'Código Admissão',
        'Colaborador',
        'CPF',
        'E-mail',
        'Telefone',
        'Cargo',
        'Departamento',
        'Unidade',
        'Status',
        'Previsão de Início',
        'Data de Criação',
        'Data de Conclusão',
        'Progresso (%)',
        'Docs Aprovados',
        'Total Docs',
        'Tempo Decorrido (Dias)'
      ];

      (rows as ReportRowAdmission[]).forEach(r => {
        lines.push([
          escapeCsv(r.admissionCode),
          escapeCsv(r.employeeName),
          escapeCsv(r.employeeCpfMasked),
          escapeCsv(r.employeeEmail),
          escapeCsv(r.employeePhone),
          escapeCsv(r.role),
          escapeCsv(r.department),
          escapeCsv(r.unit),
          escapeCsv(r.status),
          escapeCsv(formatDate(r.expectedStartDate)),
          escapeCsv(formatDate(r.createdAt)),
          escapeCsv(formatDate(r.completedAt)),
          escapeCsv(`${r.progressPercent}%`),
          escapeCsv(r.approvedDocuments),
          escapeCsv(r.totalDocuments),
          escapeCsv(r.durationDays ?? '-')
        ].join(';'));
      });
    } else if (reportType === 'documentos') {
      headers = [
        'Código Admissão',
        'Colaborador',
        'CPF',
        'Cargo',
        'Departamento',
        'Unidade',
        'Documento',
        'Categoria',
        'Obrigatório',
        'Status do Documento',
        'Versão',
        'Data de Envio',
        'Data de Conferência',
        'Conferido Por',
        'Motivo de Rejeição'
      ];

      (rows as ReportRowDocument[]).forEach(r => {
        lines.push([
          escapeCsv(r.admissionCode),
          escapeCsv(r.employeeName),
          escapeCsv(r.employeeCpfMasked),
          escapeCsv(r.role),
          escapeCsv(r.department),
          escapeCsv(r.unit),
          escapeCsv(r.documentName),
          escapeCsv(r.category),
          escapeCsv(r.required ? 'Sim' : 'Não'),
          escapeCsv(r.status),
          escapeCsv(`V${r.currentVersion}`),
          escapeCsv(formatDate(r.uploadedAt)),
          escapeCsv(formatDate(r.reviewedAt)),
          escapeCsv(r.reviewedBy || '-'),
          escapeCsv(r.rejectionReason || '-')
        ].join(';'));
      });
    } else if (reportType === 'pendencias') {
      headers = [
        'Código Admissão',
        'Colaborador',
        'CPF',
        'Cargo',
        'Departamento',
        'Unidade',
        'Documento / Item',
        'Tipo de Pendência',
        'Prioridade',
        'Dias Pendente',
        'Status Atual',
        'Motivo de Rejeição'
      ];

      (rows as ReportRowPending[]).forEach(r => {
        lines.push([
          escapeCsv(r.admissionCode),
          escapeCsv(r.employeeName),
          escapeCsv(r.employeeCpfMasked),
          escapeCsv(r.role),
          escapeCsv(r.department),
          escapeCsv(r.unit),
          escapeCsv(r.documentName || '-'),
          escapeCsv(r.pendingTypeLabel),
          escapeCsv(r.priority),
          escapeCsv(r.daysPending),
          escapeCsv(r.status),
          escapeCsv(r.rejectionReason || '-')
        ].join(';'));
      });
    } else if (reportType === 'concluidas') {
      headers = [
        'Código Admissão',
        'Colaborador',
        'CPF',
        'Cargo',
        'Departamento',
        'Unidade',
        'Data de Criação',
        'Data de Conclusão',
        'Concluído Por',
        'Tempo de Conclusão (Dias)',
        'Docs Aprovados',
        'Total Docs'
      ];

      (rows as ReportRowCompleted[]).forEach(r => {
        lines.push([
          escapeCsv(r.admissionCode),
          escapeCsv(r.employeeName),
          escapeCsv(r.employeeCpfMasked),
          escapeCsv(r.role),
          escapeCsv(r.department),
          escapeCsv(r.unit),
          escapeCsv(formatDate(r.createdAt)),
          escapeCsv(formatDate(r.completedAt)),
          escapeCsv(r.completedBy),
          escapeCsv(r.durationDays),
          escapeCsv(r.approvedDocuments),
          escapeCsv(r.totalDocuments)
        ].join(';'));
      });
    } else if (reportType === 'canceladas') {
      headers = [
        'Código Admissão',
        'Colaborador',
        'CPF',
        'Cargo',
        'Departamento',
        'Unidade',
        'Data de Criação',
        'Data de Cancelamento',
        'Cancelado Por',
        'Motivo do Cancelamento'
      ];

      (rows as ReportRowCancelled[]).forEach(r => {
        lines.push([
          escapeCsv(r.admissionCode),
          escapeCsv(r.employeeName),
          escapeCsv(r.employeeCpfMasked),
          escapeCsv(r.role),
          escapeCsv(r.department),
          escapeCsv(r.unit),
          escapeCsv(formatDate(r.createdAt)),
          escapeCsv(formatDate(r.cancelledAt)),
          escapeCsv(r.cancelledBy),
          escapeCsv(r.cancellationReason)
        ].join(';'));
      });
    }

    // UTF-8 BOM para garantir que o Microsoft Excel abra caracteres latinos/acentuados corretamente
    const BOM = '\uFEFF';
    const csvContent = BOM + [headers.map(escapeCsv).join(';'), ...lines].join('\r\n');

    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `relatorio_${reportType}_${dateStr}.csv`;

    return {
      csv: csvContent,
      fileName,
      totalRows: rows.length
    };
  }

  // ------------------------------------------------------------------
  // BLOCO 4.6 — CONFIGURAÇÕES OPERACIONAIS (MÉTODOS DO BANCO)
  // ------------------------------------------------------------------
  getSettings(): SystemSettings {
    if (!this.data.settings) {
      this.data.settings = generateDefaultSettings();
      this.save();
    }
    if (!this.data.settings.communication) {
      this.data.settings.communication = {
        defaultChannel: 'whatsapp',
        sendWelcomeMessageOnCreate: true,
        workingHoursOnly: true,
        quietHoursStart: '20:00',
        quietHoursEnd: '08:00'
      };
      this.save();
    }
    return this.data.settings;
  }

  updateSettings(
    updates: {
      general?: Partial<SystemGeneralSettings>;
      admission?: Partial<SystemAdmissionSettings>;
      documents?: Partial<SystemDocumentSettings>;
      communication?: Partial<SystemCommunicationSettings>;
      communicationTemplates?: CommunicationTemplateItem[];
      notifications?: Partial<SystemNotificationSettings>;
      tracking?: Partial<SystemTrackingSettings>;
      reports?: Partial<SystemReportSettings>;
      security?: Partial<SystemSecuritySettings>;
    },
    userName: string = 'Administrador RH'
  ): SystemSettings {
    const current = this.getSettings();
    const changes: AuditLogChange[] = [];

    if (updates.general) {
      for (const [key, val] of Object.entries(updates.general)) {
        if (val !== undefined && (current.general as any)[key] !== val) {
          changes.push({
            field: `Geral > ${key}`,
            label: `Geral: ${key}`,
            previousValue: (current.general as any)[key],
            newValue: val
          });
        }
      }
      current.general = { ...current.general, ...updates.general };
    }

    if (updates.admission) {
      for (const [key, val] of Object.entries(updates.admission)) {
        if (val !== undefined && (current.admission as any)[key] !== val) {
          changes.push({
            field: `Admissões > ${key}`,
            label: `Admissões: ${key}`,
            previousValue: (current.admission as any)[key],
            newValue: val
          });
        }
      }
      current.admission = { ...current.admission, ...updates.admission };
    }

    if (updates.documents) {
      for (const [key, val] of Object.entries(updates.documents)) {
        if (val !== undefined && JSON.stringify((current.documents as any)[key]) !== JSON.stringify(val)) {
          changes.push({
            field: `Documentos > ${key}`,
            label: `Documentos: ${key}`,
            previousValue: (current.documents as any)[key],
            newValue: val
          });
        }
      }
      current.documents = { ...current.documents, ...updates.documents };
    }

    if (updates.communication) {
      for (const [key, val] of Object.entries(updates.communication)) {
        if (val !== undefined && (current.communication as any)?.[key] !== val) {
          changes.push({
            field: `Comunicação > ${key}`,
            label: `Comunicação: ${key}`,
            previousValue: (current.communication as any)?.[key],
            newValue: val
          });
        }
      }
      current.communication = { ...(current.communication || {}), ...updates.communication } as any;
    }

    if (updates.communicationTemplates && Array.isArray(updates.communicationTemplates)) {
      changes.push({
        field: 'Comunicação > Modelos de Mensagem',
        label: 'Modelos de Comunicação',
        previousValue: `${current.communicationTemplates.length} modelos configurados`,
        newValue: `${updates.communicationTemplates.length} modelos configurados`
      });
      current.communicationTemplates = updates.communicationTemplates;
    }

    if (updates.notifications) {
      for (const [key, val] of Object.entries(updates.notifications)) {
        if (val !== undefined && (current.notifications as any)[key] !== val) {
          changes.push({
            field: `Notificações > ${key}`,
            label: `Notificações: ${key}`,
            previousValue: (current.notifications as any)[key],
            newValue: val
          });
        }
      }
      current.notifications = { ...current.notifications, ...updates.notifications };
    }

    if (updates.tracking) {
      for (const [key, val] of Object.entries(updates.tracking)) {
        if (val !== undefined && (current.tracking as any)[key] !== val) {
          changes.push({
            field: `Acompanhamento > ${key}`,
            label: `Acompanhamento: ${key}`,
            previousValue: (current.tracking as any)[key],
            newValue: val
          });
        }
      }
      current.tracking = { ...current.tracking, ...updates.tracking };
    }

    if (updates.reports) {
      for (const [key, val] of Object.entries(updates.reports)) {
        if (val !== undefined && (current.reports as any)[key] !== val) {
          changes.push({
            field: `Relatórios > ${key}`,
            label: `Relatórios: ${key}`,
            previousValue: (current.reports as any)[key],
            newValue: val
          });
        }
      }
      current.reports = { ...current.reports, ...updates.reports };
    }

    if (updates.security) {
      for (const [key, val] of Object.entries(updates.security)) {
        if (val !== undefined && (current.security as any)[key] !== val) {
          changes.push({
            field: `Segurança > ${key}`,
            label: `Segurança: ${key}`,
            previousValue: (current.security as any)[key],
            newValue: val
          });
        }
      }
      current.security = { ...current.security, ...updates.security };
    }

    current.updatedAt = new Date().toISOString();
    current.updatedBy = userName;

    this.data.settings = current;
    this.save();

    if (changes.length > 0) {
      this.addAuditLog({
        userName,
        action: 'Alteração de Configurações Operacionais',
        details: `${changes.length} parâmetro(s) operacional(is) modificado(s): ${changes.map(c => c.field).join(', ')}`,
        entityType: 'settings',
        entityId: current.id,
        changes
      });
    }

    return current;
  }

  resetSettingsToDefault(userName: string = 'Administrador RH'): SystemSettings {
    const defaults = generateDefaultSettings();
    defaults.updatedAt = new Date().toISOString();
    defaults.updatedBy = userName;

    this.data.settings = defaults;
    this.save();

    this.addAuditLog({
      userName,
      action: 'Restauração de Configurações Padrão',
      details: 'Todas as configurações operacionais foram restauradas para os padrões recomendados do sistema.',
      entityType: 'settings',
      entityId: defaults.id
    });

    return defaults;
  }

  getCommunicationTemplates(): CommunicationTemplateItem[] {
    const settings = this.getSettings();
    return settings.communicationTemplates || [];
  }

  updateCommunicationTemplate(
    idOrKey: string,
    updates: Partial<CommunicationTemplateItem>,
    userName: string = 'Administrador RH'
  ): CommunicationTemplateItem {
    const settings = this.getSettings();
    const tmplIndex = settings.communicationTemplates.findIndex(t => t.id === idOrKey || t.key === idOrKey);
    if (tmplIndex === -1) {
      throw new Error(`Modelo de comunicação com identificador "${idOrKey}" não encontrado.`);
    }

    const previous = { ...settings.communicationTemplates[tmplIndex] };
    const updated: CommunicationTemplateItem = {
      ...previous,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: userName
    };

    settings.communicationTemplates[tmplIndex] = updated;
    settings.updatedAt = new Date().toISOString();
    settings.updatedBy = userName;
    this.save();

    const changes: AuditLogChange[] = [];
    if (updates.content && updates.content !== previous.content) {
      changes.push({
        field: 'content',
        label: `Texto do Modelo (${updated.name})`,
        previousValue: previous.content.slice(0, 80) + '...',
        newValue: updates.content.slice(0, 80) + '...'
      });
    }
    if (updates.active !== undefined && updates.active !== previous.active) {
      changes.push({
        field: 'active',
        label: `Status Ativo (${updated.name})`,
        previousValue: previous.active,
        newValue: updates.active
      });
    }

    this.addAuditLog({
      userName,
      action: 'Atualização de Modelo de Comunicação',
      details: `Modelo de mensagem "${updated.name}" atualizado por ${userName}.`,
      entityType: 'communication_template',
      entityId: updated.id,
      changes: changes.length > 0 ? changes : undefined
    });

    return updated;
  }

  // =========================================================================
  // BLOCO 5.5 — CHECKLIST OPERACIONAL AVANÇADO
  // =========================================================================

  /**
   * Retorna os dados operacionais consolidados do Checklist Avançado (Bloco 5.5).
   * Integra indicadores, filtros, priorização automática e tarefas operacionais.
   */
  public getOperationalChecklistData(options?: OperationalChecklistFilters): OperationalChecklistResponse {
    const admissions = this.data.admissions || [];
    const settings = this.getSettings();

    // Garante que cada admissão possua seu snapshot de etapas 5.4 sincronizado
    admissions.forEach(adm => {
      this.evaluateAdmissionProcessSteps(adm, 'Sistema');
    });

    return filterAndPaginateChecklist(admissions, options, settings);
  }

  /**
   * Retorna os detalhes operacionais e lista de tarefas de uma admissão específica.
   */
  public getAdmissionOperationalChecklist(admissionId: string): OperationalChecklistItem | null {
    const admission = (this.data.admissions || []).find(a => a.id === admissionId);
    if (!admission) return null;

    this.evaluateAdmissionProcessSteps(admission, 'Sistema');

    const settings = this.getSettings();
    return buildOperationalChecklistItem(admission, settings);
  }

  /**
   * Atualiza ou define a prioridade operacional de uma admissão com auditoria no audit_logs.
   */
  public updateAdmissionOperationalPriority(
    admissionId: string, 
    priority: OperationalPriority, 
    reason?: string, 
    updatedBy: string = 'RH'
  ): OperationalChecklistItem | null {
    const admission = (this.data.admissions || []).find(a => a.id === admissionId);
    if (!admission) return null;

    const previousPriority = admission.operationalPriority || 'NORMAL';
    admission.operationalPriority = priority;
    admission.operationalPriorityReason = reason;
    admission.operationalPriorityUpdatedAt = new Date().toISOString();
    admission.operationalPriorityUpdatedBy = updatedBy;
    admission.updatedAt = new Date().toISOString();

    this.save();

    this.addAuditLog({
      userName: updatedBy,
      action: 'Alteração de Prioridade Operacional',
      admissionId: admission.id,
      employeeName: admission.employee?.name,
      details: `Prioridade operacional alterada de ${previousPriority} para ${priority}.${reason ? ` Justificativa: "${reason}"` : ''}`,
      changes: [
        {
          field: 'operationalPriority',
          label: 'Prioridade Operacional',
          previousValue: previousPriority,
          newValue: priority
        }
      ]
    });

    const settings = this.getSettings();
    return buildOperationalChecklistItem(admission, settings);
  }

  // =========================================================================
  // BLOCO 5.6 — APROVAÇÃO INTERNA: MÉTODOS DE FILA, CONSULTA E DECISÕES
  // =========================================================================

  /**
   * Retorna a fila de aprovações com paginação, filtros avançados e resumo consolidado.
   */
  getApprovalQueue(options?: ApprovalQueueFilters): ApprovalQueueResponse {
    this.ensureApprovalsInitialized();
    const admissions = this.data.admissions || [];
    const queueItems: ApprovalQueueItem[] = [];

    const calculateDayDiff = (dateStr: string): number => {
      try {
        const target = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00').getTime();
        const today = new Date().setHours(0, 0, 0, 0);
        return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
      } catch {
        return 0;
      }
    };

    let pendingCount = 0;
    let inReviewCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    let cancelledCount = 0;
    let criticalCount = 0;

    const typesSet = new Set<string>();
    const rolesSet = new Set<string>();
    const unitsSet = new Set<string>();
    const responsiblesSet = new Set<string>();
    const statusesSet = new Set<string>(['PENDENTE', 'EM_ANALISE', 'APROVADA', 'REPROVADA', 'CANCELADA']);

    const now = new Date();

    for (const adm of admissions) {
      if (!adm.approval) continue;

      const app = adm.approval;
      const docs = adm.documents || [];
      const requiredDocs = docs.filter(d => d.required);
      const approvedDocs = docs.filter(d => d.status === 'Aprovado');
      const pendingDocs = requiredDocs.filter(d => d.status !== 'Aprovado');
      const hasRejected = docs.some(d => d.status === 'Rejeitado');

      const reqDate = new Date(app.requestedAt || adm.createdAt);
      const waitingDays = Math.max(0, Math.floor((now.getTime() - reqDate.getTime()) / (1000 * 60 * 60 * 24)));

      // Contadores
      if (app.status === 'PENDENTE') pendingCount++;
      else if (app.status === 'EM_ANALISE') inReviewCount++;
      else if (app.status === 'APROVADA') approvedCount++;
      else if (app.status === 'REPROVADA') rejectedCount++;
      else if (app.status === 'CANCELADA') cancelledCount++;

      // Prioridade Operacional
      let priority: OperationalPriority = adm.operationalPriority || 'NORMAL';
      if (!adm.operationalPriority) {
        if (app.status === 'REPROVADA') {
          priority = 'CRITICA';
        } else if (waitingDays >= 5 || (adm.employee.expectedStartDate && Math.abs(calculateDayDiff(adm.employee.expectedStartDate)) <= 3)) {
          priority = 'CRITICA';
        } else if (waitingDays >= 2 || (adm.employee.expectedStartDate && Math.abs(calculateDayDiff(adm.employee.expectedStartDate)) <= 7)) {
          priority = 'ALTA';
        }
      }

      if (priority === 'CRITICA' && app.status !== 'APROVADA' && app.status !== 'CANCELADA') {
        criticalCount++;
      }

      if (app.approvalType) typesSet.add(app.approvalType);
      if (adm.employee.role) rolesSet.add(adm.employee.role);
      if (adm.employee.unit) unitsSet.add(adm.employee.unit);
      if (app.responsibleRole) responsiblesSet.add(app.responsibleRole);

      const canApprove = adm.status !== 'Cancelada' && adm.status !== 'Concluída' && app.status !== 'APROVADA';

      const stepSnapshot = (adm.processSteps || []).find(s => s.id === app.processStepId || s.stepKey === 'APROVACAO');

      queueItems.push({
        approvalId: app.id,
        admissionId: adm.id,
        admissionCode: `ADM-${adm.id.slice(0, 6).toUpperCase()}`,
        employeeId: adm.employeeId || adm.employee.id,
        employeeName: adm.employee.name,
        employeeCpf: adm.employee.cpf,
        employeeRole: adm.employee.role,
        employeeDepartment: adm.employee.department,
        employeeUnit: adm.employee.unit,
        expectedStartDate: adm.employee.expectedStartDate,
        admissionStatus: adm.status,
        processStepName: stepSnapshot?.stepName || 'Aprovação Interna',
        approvalType: app.approvalType,
        status: app.status,
        required: app.required,
        responsibleRole: app.responsibleRole,
        assignedUserName: app.assignedUserName,
        priority,
        priorityReason: adm.operationalPriorityReason,
        requestedAt: app.requestedAt || adm.createdAt,
        startedAt: app.startedAt,
        decidedAt: app.decidedAt,
        decidedBy: app.decidedBy,
        decisionReason: app.decisionReason,
        decisionNotes: app.decisionNotes,
        reopenedAt: app.reopenedAt,
        reopenedBy: app.reopenedBy,
        reopenReason: app.reopenReason,
        waitingDays,
        approvedDocsCount: approvedDocs.length,
        requiredDocsCount: requiredDocs.length,
        pendingDocsCount: pendingDocs.length,
        totalDocsCount: docs.length,
        hasRejectedDocs: hasRejected,
        canApprove
      });
    }

    // Aplicação de Filtros
    let filtered = [...queueItems];

    if (options) {
      if (options.search && options.search.trim()) {
        const term = options.search.trim().toLowerCase();
        const cleanDigits = term.replace(/\D/g, '');
        filtered = filtered.filter(item => {
          const nameMatch = item.employeeName.toLowerCase().includes(term);
          const cpfMatch = cleanDigits ? item.employeeCpf.replace(/\D/g, '').includes(cleanDigits) : false;
          const codeMatch = item.admissionCode.toLowerCase().includes(term);
          const roleMatch = item.employeeRole.toLowerCase().includes(term);
          const unitMatch = item.employeeUnit.toLowerCase().includes(term);
          return nameMatch || cpfMatch || codeMatch || roleMatch || unitMatch;
        });
      }

      if (options.status && options.status !== 'TODOS' && options.status !== 'Todas') {
        filtered = filtered.filter(i => i.status === options.status);
      }

      if (options.type && options.type !== 'TODOS' && options.type !== 'Todas') {
        filtered = filtered.filter(i => i.approvalType === options.type);
      }

      if (options.priority && options.priority !== 'TODAS' && options.priority !== 'Todas') {
        filtered = filtered.filter(i => i.priority === options.priority);
      }

      if (options.responsible && options.responsible !== 'TODOS' && options.responsible !== 'Todos') {
        filtered = filtered.filter(i => i.responsibleRole === options.responsible);
      }

      if (options.unit && options.unit !== 'TODAS' && options.unit !== 'Todas') {
        filtered = filtered.filter(i => i.employeeUnit === options.unit);
      }

      if (options.role && options.role !== 'TODOS' && options.role !== 'Todos') {
        filtered = filtered.filter(i => i.employeeRole === options.role);
      }

      if (options.startDate) {
        const start = new Date(options.startDate + 'T00:00:00').getTime();
        filtered = filtered.filter(i => new Date(i.requestedAt).getTime() >= start);
      }
      if (options.endDate) {
        const end = new Date(options.endDate + 'T23:59:59').getTime();
        filtered = filtered.filter(i => new Date(i.requestedAt).getTime() <= end);
      }
    }

    // Ordenação inteligente:
    // 1. Status ativo: PENDENTE e EM_ANALISE primeiro, depois REPROVADA, depois APROVADA e CANCELADA
    // 2. Prioridade: CRITICA (1), ALTA (2), NORMAL (3)
    // 3. Dias aguardando: maior tempo primeiro
    filtered.sort((a, b) => {
      if (options?.sortBy) {
        const order = options.sortOrder === 'desc' ? -1 : 1;
        if (options.sortBy === 'colaborador') return a.employeeName.localeCompare(b.employeeName) * order;
        if (options.sortBy === 'dias') return (a.waitingDays - b.waitingDays) * order;
        if (options.sortBy === 'solicitacao') return (new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime()) * order;
        if (options.sortBy === 'status') return a.status.localeCompare(b.status) * order;
      }

      // Ordem padrão refinada
      const statusWeight = (st: ApprovalStatus) => {
        if (st === 'EM_ANALISE') return 1;
        if (st === 'PENDENTE') return 2;
        if (st === 'REPROVADA') return 3;
        if (st === 'APROVADA') return 4;
        return 5;
      };

      const pWeight = (p: OperationalPriority) => {
        if (p === 'CRITICA') return 1;
        if (p === 'ALTA') return 2;
        return 3;
      };

      const swA = statusWeight(a.status);
      const swB = statusWeight(b.status);
      if (swA !== swB) return swA - swB;

      const pwA = pWeight(a.priority);
      const pwB = pWeight(b.priority);
      if (pwA !== pwB) return pwA - pwB;

      return b.waitingDays - a.waitingDays;
    });

    const total = filtered.length;
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Number(options?.limit) || 20);
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      items: paginated,
      total,
      page,
      limit,
      totalPages,
      summary: {
        total: queueItems.length,
        pending: pendingCount,
        inReview: inReviewCount,
        approved: approvedCount,
        rejected: rejectedCount,
        cancelled: cancelledCount,
        critical: criticalCount
      },
      filters: {
        types: Array.from(typesSet).sort(),
        roles: Array.from(rolesSet).sort(),
        units: Array.from(unitsSet).sort(),
        responsibles: Array.from(responsiblesSet).sort(),
        statuses: Array.from(statusesSet)
      }
    };
  }

  /**
   * Obtém a aprovação vinculada a uma admissão.
   */
  getAdmissionApproval(admissionId: string): AdmissionApproval | null {
    this.ensureApprovalsInitialized();
    const admission = this.getAdmissionById(admissionId);
    if (!admission || !admission.approval) return null;
    return admission.approval;
  }

  /**
   * Obtém os detalhes completos de uma aprovação pelo ID.
   */
  getApprovalById(approvalId: string): ApprovalDetailResponse | null {
    this.ensureApprovalsInitialized();
    const admission = (this.data.admissions || []).find(a => a.approval?.id === approvalId);
    if (!admission || !admission.approval) return null;

    const canDecide = admission.status !== 'Cancelada' && admission.status !== 'Concluída';

    // Tarefas operacionais relacionadas
    let tasks: OperationalTaskItem[] = [];
    try {
      const checklistItem = buildOperationalChecklistItem(admission, this.getSettings());
      tasks = checklistItem.tasks || [];
    } catch {
      tasks = [];
    }

    return {
      approval: admission.approval,
      admission,
      employee: admission.employee,
      documents: admission.documents || [],
      processSteps: admission.processSteps || [],
      operationalTasks: tasks,
      canDecide
    };
  }

  /**
   * Inicia a análise formal da aprovação (PENDENTE -> EM_ANALISE).
   */
  startApprovalReview(approvalId: string, userName: string, userRole: string = 'GESTOR'): AdmissionApproval {
    this.ensureApprovalsInitialized();
    const admission = (this.data.admissions || []).find(a => a.approval?.id === approvalId);
    if (!admission || !admission.approval) {
      throw new Error('Aprovação não encontrada.');
    }

    const app = admission.approval;
    if (app.status === 'APROVADA') {
      throw new Error(`Esta aprovação já foi aprovada por ${app.decidedBy || 'outro usuário'}.`);
    }
    if (app.status === 'CANCELADA') {
      throw new Error('Esta aprovação está cancelada.');
    }

    if (app.status === 'EM_ANALISE') {
      return app;
    }

    const now = new Date().toISOString();
    const prevStatus = app.status;
    app.status = 'EM_ANALISE';
    app.startedAt = now;
    app.assignedUserName = userName;
    app.updatedAt = now;

    app.history = app.history || [];
    app.history.push({
      id: 'hist-appr-' + crypto.randomUUID(),
      action: 'INICIADA',
      timestamp: now,
      userName,
      userRole,
      previousStatus: prevStatus,
      newStatus: 'EM_ANALISE',
      notes: `Análise formal iniciada por ${userName}.`
    });

    // Atualiza etapa APROVACAO se houver
    const step = (admission.processSteps || []).find(s => s.id === app.processStepId || s.stepKey === 'APROVACAO');
    if (step && step.status !== 'CONCLUIDA') {
      step.status = 'EM_ANDAMENTO';
      step.startedAt = now;
      step.blockReason = undefined;
    }

    this.save();

    this.addAuditLog({
      userName,
      action: 'approval_started',
      entityType: 'admission_approval',
      entityId: app.id,
      admissionId: admission.id,
      employeeName: admission.employee.name,
      details: `Análise da aprovação interna (${app.approvalType}) iniciada por ${userName}.`
    });

    return app;
  }

  /**
   * Aprova formalmente a admissão com verificação de concorrência e sincronização de etapas.
   */
  approveAdmissionApproval(
    approvalId: string, 
    userName: string, 
    userRole: string = 'GESTOR', 
    notes?: string
  ): { approval: AdmissionApproval; admission: Admission } {
    this.ensureApprovalsInitialized();
    const admission = (this.data.admissions || []).find(a => a.approval?.id === approvalId);
    if (!admission || !admission.approval) {
      throw new Error('Aprovação não encontrada.');
    }

    const app = admission.approval;

    // Regra anti-duplicação e concorrência
    if (app.status === 'APROVADA') {
      throw new Error(`Esta aprovação já foi formalizada anteriormente por ${app.decidedBy || 'outro usuário'} em ${new Date(app.decidedAt!).toLocaleString('pt-BR')}.`);
    }
    if (app.status === 'CANCELADA') {
      throw new Error('Esta aprovação está cancelada e não pode ser aprovada.');
    }
    if (app.status === 'REPROVADA') {
      throw new Error('Esta aprovação encontra-se reprovada. É necessário realizar a reabertura formal justificando a revisão.');
    }

    const now = new Date().toISOString();
    const prevStatus = app.status;

    app.status = 'APROVADA';
    app.decidedAt = now;
    app.decidedBy = userName;
    app.decisionNotes = notes ? notes.trim() : undefined;
    app.updatedAt = now;

    app.history = app.history || [];
    app.history.push({
      id: 'hist-appr-' + crypto.randomUUID(),
      action: 'APROVADA',
      timestamp: now,
      userName,
      userRole,
      previousStatus: prevStatus,
      newStatus: 'APROVADA',
      notes: notes ? notes.trim() : undefined
    });

    // Conclui a etapa APROVACAO no snapshot do processo 5.4
    const step = (admission.processSteps || []).find(s => s.id === app.processStepId || s.stepKey === 'APROVACAO');
    if (step) {
      step.status = 'CONCLUIDA';
      step.completedAt = now;
      step.completedBy = userName;
      step.blockReason = undefined;
      step.notes = notes ? notes.trim() : undefined;
      step.history = step.history || [];
      step.history.push({
        action: 'concluida',
        timestamp: now,
        userName,
        details: `Aprovação interna concedida por ${userName}.${notes ? ` Observações: "${notes.trim()}".` : ''}`
      });
    }

    // Avalia o avanço da admissão para a próxima etapa (ex: CONCLUSAO)
    this.evaluateAdmissionProcessSteps(admission, userName);

    // Bloco 6.6: Automação determinística para aprovação concluída
    this.executeAutomationOnApprovalCompleted(admission, app, userName);

    admission.updatedAt = now;
    this.save();

    // Auditoria rigorosa
    this.addAuditLog({
      userName,
      action: 'approval_approved',
      entityType: 'admission_approval',
      entityId: app.id,
      admissionId: admission.id,
      employeeName: admission.employee.name,
      fieldChanged: 'status da aprovação',
      previousValue: prevStatus,
      newValue: 'APROVADA',
      details: `Aprovação interna (${app.approvalType}) formalizada e aprovada por ${userName}.${notes ? ` Observações: "${notes.trim()}".` : ''}`
    });

    this.addNotification({
      title: 'Aprovação interna formalizada',
      message: `A aprovação da admissão de ${admission.employee.name} foi aprovada por ${userName}.`,
      type: 'completed',
      admissionId: admission.id,
      link: `/admissoes/${admission.id}`
    });

    return { approval: app, admission };
  }

  /**
   * Reprova formalmente a admissão com justificativa obrigatória e bloqueio de etapas.
   */
  rejectAdmissionApproval(
    approvalId: string, 
    userName: string, 
    userRole: string = 'GESTOR', 
    reason: string, 
    notes?: string
  ): { approval: AdmissionApproval; admission: Admission } {
    this.ensureApprovalsInitialized();
    if (!reason || !reason.trim()) {
      throw new Error('A justificativa é obrigatória para reprovar a admissão.');
    }

    const admission = (this.data.admissions || []).find(a => a.approval?.id === approvalId);
    if (!admission || !admission.approval) {
      throw new Error('Aprovação não encontrada.');
    }

    const app = admission.approval;

    if (app.status === 'APROVADA') {
      throw new Error('Esta aprovação já foi aprovada e não pode ser reprovada diretamente. Utilize a reabertura formal se aplicável.');
    }
    if (app.status === 'CANCELADA') {
      throw new Error('Esta aprovação está cancelada.');
    }

    const now = new Date().toISOString();
    const prevStatus = app.status;

    app.status = 'REPROVADA';
    app.decidedAt = now;
    app.decidedBy = userName;
    app.decisionReason = reason.trim();
    app.decisionNotes = notes ? notes.trim() : undefined;
    app.updatedAt = now;

    app.history = app.history || [];
    app.history.push({
      id: 'hist-appr-' + crypto.randomUUID(),
      action: 'REPROVADA',
      timestamp: now,
      userName,
      userRole,
      previousStatus: prevStatus,
      newStatus: 'REPROVADA',
      reason: reason.trim(),
      notes: notes ? notes.trim() : undefined
    });

    // Bloqueia a etapa APROVACAO no snapshot
    const step = (admission.processSteps || []).find(s => s.id === app.processStepId || s.stepKey === 'APROVACAO');
    if (step) {
      step.status = 'BLOQUEADA';
      step.blockReason = `Reprovada na aprovação interna: ${reason.trim()}`;
      step.history = step.history || [];
      step.history.push({
        action: 'bloqueada',
        timestamp: now,
        userName,
        details: `Aprovação interna reprovada por ${userName}. Motivo: "${reason.trim()}".`
      });
    }

    // Atualiza status da admissão para Pendência e prioridade crítica
    admission.status = 'Pendência';
    admission.operationalPriority = 'CRITICA';
    admission.operationalPriorityReason = `Aprovação interna reprovada por ${userName}: ${reason.trim()}`;
    admission.operationalPriorityUpdatedAt = now;
    admission.operationalPriorityUpdatedBy = userName;
    admission.updatedAt = now;

    this.save();

    // Auditoria
    this.addAuditLog({
      userName,
      action: 'approval_rejected',
      entityType: 'admission_approval',
      entityId: app.id,
      admissionId: admission.id,
      employeeName: admission.employee.name,
      fieldChanged: 'status da aprovação',
      previousValue: prevStatus,
      newValue: 'REPROVADA',
      details: `Aprovação interna (${app.approvalType}) reprovada por ${userName}. Motivo obrigatório: "${reason.trim()}".${notes ? ` Observações: "${notes.trim()}".` : ''}`
    });

    this.addNotification({
      title: 'Aprovação interna reprovada',
      message: `A admissão de ${admission.employee.name} foi reprovada por ${userName}. Motivo: "${reason.trim()}".`,
      type: 'pending',
      admissionId: admission.id,
      link: `/admissoes/${admission.id}`
    });

    return { approval: app, admission };
  }

  /**
   * Reabre uma aprovação reprovada com justificativa obrigatória (REPROVADA -> EM_ANALISE).
   */
  reopenAdmissionApproval(
    approvalId: string, 
    userName: string, 
    userRole: string = 'GESTOR', 
    reason: string
  ): { approval: AdmissionApproval; admission: Admission } {
    this.ensureApprovalsInitialized();
    if (!reason || !reason.trim()) {
      throw new Error('O motivo da reabertura é obrigatório.');
    }

    const admission = (this.data.admissions || []).find(a => a.approval?.id === approvalId);
    if (!admission || !admission.approval) {
      throw new Error('Aprovação não encontrada.');
    }

    const app = admission.approval;
    if (app.status !== 'REPROVADA') {
      throw new Error('Apenas aprovações com status "REPROVADA" podem ser reabertas para nova análise.');
    }

    const now = new Date().toISOString();
    const prevStatus = app.status;

    app.status = 'EM_ANALISE';
    app.reopenedAt = now;
    app.reopenedBy = userName;
    app.reopenReason = reason.trim();
    app.updatedAt = now;

    app.history = app.history || [];
    app.history.push({
      id: 'hist-appr-' + crypto.randomUUID(),
      action: 'REABERTA',
      timestamp: now,
      userName,
      userRole,
      previousStatus: prevStatus,
      newStatus: 'EM_ANALISE',
      reason: reason.trim(),
      notes: `Aprovação reaberta para revisão por ${userName}.`
    });

    // Desbloqueia etapa APROVACAO
    const step = (admission.processSteps || []).find(s => s.id === app.processStepId || s.stepKey === 'APROVACAO');
    if (step) {
      step.status = 'EM_ANDAMENTO';
      step.blockReason = undefined;
      step.history = step.history || [];
      step.history.push({
        action: 'iniciada',
        timestamp: now,
        userName,
        details: `Etapa reaberta após revisão da reprovação por ${userName}. Motivo: "${reason.trim()}".`
      });
    }

    this.evaluateAdmissionProcessSteps(admission, userName);
    admission.updatedAt = now;
    this.save();

    this.addAuditLog({
      userName,
      action: 'approval_reopened',
      entityType: 'admission_approval',
      entityId: app.id,
      admissionId: admission.id,
      employeeName: admission.employee.name,
      fieldChanged: 'status da aprovação',
      previousValue: 'REPROVADA',
      newValue: 'EM_ANALISE',
      details: `Aprovação interna (${app.approvalType}) reaberta por ${userName}. Motivo da reabertura: "${reason.trim()}".`
    });

    this.addNotification({
      title: 'Aprovação interna reaberta',
      message: `A aprovação de ${admission.employee.name} foi reaberta por ${userName} para nova análise.`,
      type: 'pending',
      admissionId: admission.id,
      link: `/admissoes/${admission.id}`
    });

    return { approval: app, admission };
  }

  /**
   * Cancela formalmente uma aprovação interna.
   */
  cancelAdmissionApproval(approvalId: string, userName: string, reason?: string): AdmissionApproval {
    this.ensureApprovalsInitialized();
    const admission = (this.data.admissions || []).find(a => a.approval?.id === approvalId);
    if (!admission || !admission.approval) {
      throw new Error('Aprovação não encontrada.');
    }

    const app = admission.approval;
    const now = new Date().toISOString();
    const prevStatus = app.status;

    app.status = 'CANCELADA';
    app.decidedAt = now;
    app.decidedBy = userName;
    app.decisionReason = reason ? reason.trim() : 'Cancelada pelo usuário';
    app.updatedAt = now;

    app.history = app.history || [];
    app.history.push({
      id: 'hist-appr-' + crypto.randomUUID(),
      action: 'CANCELADA',
      timestamp: now,
      userName,
      previousStatus: prevStatus,
      newStatus: 'CANCELADA',
      reason: reason ? reason.trim() : undefined,
      notes: 'Aprovação cancelada formalmente.'
    });

    this.save();

    this.addAuditLog({
      userName,
      action: 'approval_cancelled',
      entityType: 'admission_approval',
      entityId: app.id,
      admissionId: admission.id,
      employeeName: admission.employee.name,
      details: `Aprovação interna (${app.approvalType}) cancelada por ${userName}.${reason ? ` Motivo: "${reason.trim()}".` : ''}`
    });

    return app;
  }

  // =========================================================================
  // BLOCO 6.1 — CENTRAL DE OPERAÇÕES DO RH (MÉTODO UNIFICADO DE CONSULTA)
  // =========================================================================

  /**
   * Retorna os dados consolidados da Central de Operações do RH (Bloco 6.1).
   * Consolida Admissões, Etapas do Processo (5.4), Checklist Operacional (5.5),
   * Aprovações Internas (5.6), Prazos e Documentos com filtros e KPIs derivados.
   */
  getOperationalHubData(options: OperationalHubFilters = {}): OperationalHubResponse {
    this.ensureApprovalsInitialized();
    this.ensureAdmissionProcessInitialized();

    const admissions = this.data.admissions || [];
    const settings = this.getSettings();
    const today = new Date().setHours(0, 0, 0, 0);

    // Garante que cada admissão possua seu snapshot de etapas 5.4 sincronizado
    admissions.forEach(adm => {
      this.evaluateAdmissionProcessSteps(adm, 'Sistema');
    });

    const items: OperationalHubItem[] = [];

    // Conjuntos para filtros dinâmicos
    const rolesSet = new Set<string>();
    const departmentsSet = new Set<string>();
    const unitsSet = new Set<string>();
    const responsiblesSet = new Set<string>(['RH', 'FUNCIONARIO', 'GESTOR', 'DP', 'ADMIN', 'SISTEMA']);
    const statusesSet = new Set<string>(['Rascunho', 'Aguardando documentos', 'Em conferência', 'Pendência', 'Concluída', 'Cancelada']);

    // Contadores para o Resumo Operacional
    let countInProgress = 0;
    let countWaitingEmployee = 0;
    let countWaitingRh = 0;
    let countWithPendings = 0;
    let countPendingApproval = 0;
    let countNearDeadline = 0;
    let countDelayed = 0;
    let countBlocked = 0;

    for (const adm of admissions) {
      const emp: Partial<Employee> = adm.employee || {
        name: 'Colaborador',
        cpf: '00000000000',
        role: 'Não informado',
        department: 'Geral',
        unit: 'Matriz',
        email: '',
        phone: '',
        expectedStartDate: undefined
      };

      if (emp.role) rolesSet.add(emp.role);
      if (emp.department) departmentsSet.add(emp.department);
      if (emp.unit) unitsSet.add(emp.unit);
      if (adm.status) statusesSet.add(adm.status);

      const docs = adm.documents || [];
      const requiredDocs = docs.filter(d => d.required);
      const approvedDocs = docs.filter(d => d.status === 'Aprovado');
      const inReviewDocs = docs.filter(d => d.status === 'Em análise');
      const rejectedDocs = docs.filter(d => d.status === 'Rejeitado');
      const notSentDocs = docs.filter(d => d.status === 'Não enviado');

      const docsProgress = requiredDocs.length > 0 
        ? Math.round((approvedDocs.filter(d => d.required).length / requiredDocs.length) * 100)
        : (docs.length > 0 ? Math.round((approvedDocs.length / docs.length) * 100) : 0);

      // Prazos e Dias
      const createdDate = new Date(adm.createdAt || Date.now());
      const daysSinceCreation = Math.max(0, Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));

      // Última movimentação
      let lastActivityTime = createdDate.getTime();
      if (adm.updatedAt) {
        const u = new Date(adm.updatedAt).getTime();
        if (u > lastActivityTime) lastActivityTime = u;
      }
      if (adm.dataConfirmedAt) {
        const c = new Date(adm.dataConfirmedAt).getTime();
        if (c > lastActivityTime) lastActivityTime = c;
      }
      docs.forEach(d => {
        if (d.uploadedAt) {
          const up = new Date(d.uploadedAt).getTime();
          if (up > lastActivityTime) lastActivityTime = up;
        }
        if (d.reviewedAt) {
          const rev = new Date(d.reviewedAt).getTime();
          if (rev > lastActivityTime) lastActivityTime = rev;
        }
      });
      const daysWithoutMovement = Math.max(0, Math.floor((Date.now() - lastActivityTime) / (1000 * 60 * 60 * 24)));

      // Prazo de início previsto
      let daysUntilDeadline: number | undefined;
      let isOverdue = false;
      let isNearDeadline = false;
      const expectedDate = emp.expectedStartDate || (adm as any).expectedStartDate;

      if (expectedDate) {
        try {
          const target = new Date(expectedDate.includes('T') ? expectedDate : expectedDate + 'T00:00:00').getTime();
          daysUntilDeadline = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
          if (adm.status !== 'Concluída' && adm.status !== 'Cancelada') {
            if (daysUntilDeadline < 0) {
              isOverdue = true;
            } else if (daysUntilDeadline <= (settings.tracking?.upcomingDaysThreshold ?? 7)) {
              isNearDeadline = true;
            }
          }
        } catch {
          // ignore date parse error
        }
      }

      // Etapa do processo (Bloco 5.4)
      const steps = (adm.processSteps || []).sort((a, b) => a.stepOrder - b.stepOrder);
      const currentStep = steps.find(s => s.status === 'EM_ANDAMENTO' || s.status === 'BLOQUEADA') ||
        steps.find(s => s.status === 'PENDENTE') ||
        steps[steps.length - 1];

      const currentStepKey = currentStep?.stepKey;
      const currentStepName = currentStep?.stepName || (adm.status === 'Concluída' ? 'Admissão Concluída' : 'Processamento Inicial');
      const currentStepOrder = currentStep?.stepOrder ?? 1;
      const totalSteps = steps.length || 6;
      const currentStepStatus: ProcessStepStatus = currentStep?.status || (adm.status === 'Concluída' ? 'CONCLUIDA' : 'EM_ANDAMENTO');
      const currentStepResponsible = currentStep?.responsibleRole || (adm.status === 'Aguardando documentos' ? 'CANDIDATO' : 'RH');

      // Aprovação Interna (Bloco 5.6)
      const app = adm.approval;
      const hasApproval = Boolean(app);
      const approvalPending = Boolean(app && (app.status === 'PENDENTE' || app.status === 'EM_ANALISE'));

      // Responsável operacional atual (Bloco 6.4: Gestão de Responsáveis e Distribuição)
      const admissionRespId = adm.responsibleUserId;
      const admissionRespName = adm.responsibleUserName || 'Sem responsável';
      const stepRespId = currentStep?.responsibleUserId;
      const stepRespName = currentStep?.responsibleUserName || (currentStepResponsible === 'CANDIDATO' ? 'Candidato' : currentStepResponsible);

      const currentResponsible = adm.responsibleUserName || 'Sem responsável';
      responsiblesSet.add(currentResponsible);
      if (adm.responsibleUserName) responsiblesSet.add(adm.responsibleUserName);
      if (currentStep?.responsibleUserName) responsiblesSet.add(currentStep.responsibleUserName);
      responsiblesSet.add('Sem responsável');

      // Prioridade Operacional
      const priority: OperationalPriority = adm.operationalPriority || (isOverdue || currentStepStatus === 'BLOQUEADA' ? 'CRITICA' : isNearDeadline ? 'ALTA' : 'NORMAL');
      const priorityScore = priority === 'CRITICA' ? 1 : priority === 'ALTA' ? 2 : 3;

      // Situação Operacional do Bloco 6.1
      let situation: OperationalHubSituation = 'EM_DIA';
      let situationLabel = 'Em dia';

      const isBlocked = currentStepStatus === 'BLOQUEADA' || adm.status === 'Cancelada';
      const hasPending = adm.status === 'Pendência' || rejectedDocs.length > 0;
      const isWaitingEmployee = adm.status === 'Aguardando documentos' || notSentDocs.length > 0 || !adm.dataConfirmed || currentResponsible === 'FUNCIONARIO';
      const isWaitingRh = inReviewDocs.length > 0 || adm.status === 'Em conferência' || currentResponsible === 'RH';

      if (currentStepStatus === 'BLOQUEADA') {
        situation = 'BLOQUEADA';
        situationLabel = 'Bloqueada';
      } else if (isOverdue) {
        situation = 'ATRASADA';
        situationLabel = 'Atrasada';
      } else if (approvalPending) {
        situation = 'APROVACAO_PENDENTE';
        situationLabel = 'Aprovação Pendente';
      } else if (hasPending) {
        situation = 'COM_PENDENCIA';
        situationLabel = 'Com Pendência';
      } else if (isWaitingRh) {
        situation = 'AGUARDANDO_RH';
        situationLabel = 'Aguardando RH';
      } else if (isWaitingEmployee) {
        situation = 'AGUARDANDO_FUNCIONARIO';
        situationLabel = 'Aguardando Funcionário';
      } else if (isNearDeadline) {
        situation = 'PROXIMA_DO_PRAZO';
        situationLabel = 'Próxima do Prazo';
      }

      // Motivos de atenção
      const attentionReasons: string[] = [];
      if (currentStepStatus === 'BLOQUEADA') {
        attentionReasons.push(currentStep?.blockReason ? `Bloqueio: ${currentStep.blockReason}` : 'Etapa operacional bloqueada');
      }
      if (isOverdue && daysUntilDeadline !== undefined) {
        attentionReasons.push(`Início previsto ultrapassado há ${Math.abs(daysUntilDeadline)} dia(s)`);
      }
      if (approvalPending) {
        attentionReasons.push(`Aprovação interna (${app?.approvalType}) aguardando parecer`);
      }
      if (rejectedDocs.length > 0) {
        attentionReasons.push(`${rejectedDocs.length} documento(s) com rejeição pendente de reenvio`);
      }
      if (inReviewDocs.length > 0) {
        attentionReasons.push(`${inReviewDocs.length} documento(s) enviado(s) aguardando conferência`);
      }
      if (daysWithoutMovement >= (settings.tracking?.inactivityDaysThreshold ?? 5) && adm.status !== 'Concluída' && adm.status !== 'Cancelada') {
        attentionReasons.push(`Sem movimentação há ${daysWithoutMovement} dias`);
      }
      if (isNearDeadline && daysUntilDeadline !== undefined && daysUntilDeadline >= 0) {
        attentionReasons.push(`Início previsto em ${daysUntilDeadline} dia(s)`);
      }

      const isActiveAdmission = adm.status !== 'Concluída' && adm.status !== 'Cancelada';
      const needsAttention = isActiveAdmission && (
        currentStepStatus === 'BLOQUEADA' ||
        isOverdue ||
        approvalPending ||
        rejectedDocs.length > 0 ||
        priority === 'CRITICA' ||
        isNearDeadline ||
        daysWithoutMovement >= (settings.tracking?.inactivityDaysThreshold ?? 5)
      );

      // Atualiza KPIs globais
      if (isActiveAdmission) {
        countInProgress++;
        if (currentStepStatus === 'BLOQUEADA') countBlocked++;
        if (isOverdue) countDelayed++;
        if (isNearDeadline) countNearDeadline++;
        if (approvalPending) countPendingApproval++;
        if (hasPending) countWithPendings++;
        if (isWaitingEmployee) countWaitingEmployee++;
        if (isWaitingRh) countWaitingRh++;
      }

      const item: OperationalHubItem = {
        id: adm.id,
        admissionId: adm.id,
        admissionCode: adm.id.replace('adm-', 'ADM-').toUpperCase(),
        employeeId: adm.employeeId,
        employeeName: emp.name,
        employeeCpfMasked: maskCPF(emp.cpf),
        employeeRole: emp.role,
        employeeDepartment: emp.department,
        employeeUnit: emp.unit,
        employeeEmail: emp.email,
        employeePhone: emp.phone,
        status: adm.status,
        priority,
        priorityScore,
        situation,
        situationLabel,
        needsAttention,
        attentionReasons,
        currentStepKey,
        currentStepName,
        currentStepOrder,
        totalSteps,
        currentStepStatus,
        currentStepResponsible,
        responsible: currentResponsible,
        admissionResponsibleId: admissionRespId,
        admissionResponsibleName: admissionRespName,
        stepResponsibleId: stepRespId,
        stepResponsibleName: stepRespName,
        createdAt: adm.createdAt,
        expectedStartDate: expectedDate,
        lastActivityAt: new Date(lastActivityTime).toISOString(),
        daysSinceCreation,
        daysWithoutMovement,
        daysUntilDeadline,
        isOverdue,
        isNearDeadline,
        documentsSummary: {
          total: docs.length,
          approved: approvedDocs.length,
          inReview: inReviewDocs.length,
          rejected: rejectedDocs.length,
          notSent: notSentDocs.length,
          progressPercent: docsProgress
        },
        activePendingsCount: rejectedDocs.length + (adm.status === 'Pendência' ? 1 : 0),
        primaryPendingTitle: rejectedDocs[0] ? `Reenvio de ${rejectedDocs[0].documentType}` : (inReviewDocs[0] ? `Conferir ${inReviewDocs[0].documentType}` : undefined),
        hasApproval,
        approvalStatus: app?.status,
        approvalType: app?.approvalType
      };

      items.push(item);
    }

    // Filtros
    let filtered = [...items];

    if (options.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      const qDigits = q.replace(/\D/g, '');
      filtered = filtered.filter(item => {
        const rawCpf = item.employeeCpfMasked.replace(/\D/g, '');
        return (
          item.employeeName.toLowerCase().includes(q) ||
          item.admissionCode.toLowerCase().includes(q) ||
          item.employeeRole.toLowerCase().includes(q) ||
          item.employeeDepartment.toLowerCase().includes(q) ||
          item.employeeUnit.toLowerCase().includes(q) ||
          item.employeeEmail.toLowerCase().includes(q) ||
          item.employeePhone.includes(q) ||
          (qDigits && rawCpf.includes(qDigits))
        );
      });
    }

    if (options.status && options.status !== 'TODOS' && options.status !== 'all') {
      filtered = filtered.filter(i => i.status === options.status);
    }

    if (options.situation && options.situation !== 'TODAS' && options.situation !== 'all') {
      const sit = options.situation.toUpperCase();
      filtered = filtered.filter(i => {
        if (sit === 'AGUARDANDO_FUNCIONARIO') return i.situation === 'AGUARDANDO_FUNCIONARIO';
        if (sit === 'AGUARDANDO_RH') return i.situation === 'AGUARDANDO_RH';
        if (sit === 'COM_PENDENCIA') return i.situation === 'COM_PENDENCIA' || i.activePendingsCount > 0;
        if (sit === 'APROVACAO_PENDENTE') return i.situation === 'APROVACAO_PENDENTE' || (i.hasApproval && (i.approvalStatus === 'PENDENTE' || i.approvalStatus === 'EM_ANALISE'));
        if (sit === 'PROXIMA_DO_PRAZO') return i.isNearDeadline;
        if (sit === 'ATRASADA') return i.isOverdue;
        if (sit === 'BLOQUEADA') return i.situation === 'BLOQUEADA';
        if (sit === 'EM_DIA') return i.situation === 'EM_DIA';
        return i.situation === sit;
      });
    }

    if (options.role && options.role !== 'TODOS' && options.role !== 'all') {
      filtered = filtered.filter(i => i.employeeRole === options.role);
    }

    if (options.department && options.department !== 'TODOS' && options.department !== 'all') {
      filtered = filtered.filter(i => i.employeeDepartment === options.department);
    }

    if (options.unit && options.unit !== 'TODOS' && options.unit !== 'all') {
      filtered = filtered.filter(i => i.employeeUnit === options.unit);
    }

    if (options.responsible && options.responsible !== 'TODOS' && options.responsible !== 'all') {
      const targetResp = options.responsible.trim();
      if (targetResp === 'SEM_RESPONSAVEL' || targetResp === 'Sem responsável' || targetResp === 'sem_responsavel') {
        filtered = filtered.filter(i => !i.admissionResponsibleId || i.admissionResponsibleName === 'Sem responsável');
      } else {
        filtered = filtered.filter(i =>
          i.admissionResponsibleId === targetResp ||
          i.admissionResponsibleName?.toLowerCase() === targetResp.toLowerCase() ||
          i.stepResponsibleId === targetResp ||
          i.stepResponsibleName?.toLowerCase() === targetResp.toLowerCase() ||
          i.responsible?.toLowerCase() === targetResp.toLowerCase() ||
          i.currentStepResponsible?.toLowerCase() === targetResp.toLowerCase()
        );
      }
    }

    if (options.priority && options.priority !== 'TODAS' && options.priority !== 'all') {
      filtered = filtered.filter(i => i.priority === options.priority.toUpperCase());
    }

    if (options.period) {
      const now = Date.now();
      if (options.period === 'today') {
        const todayStr = new Date().toISOString().slice(0, 10);
        filtered = filtered.filter(i => (i.createdAt || '').slice(0, 10) === todayStr || (i.lastActivityAt || '').slice(0, 10) === todayStr);
      } else if (options.period === '7d') {
        const limitTime = now - 7 * 86400000;
        filtered = filtered.filter(i => new Date(i.createdAt).getTime() >= limitTime || new Date(i.lastActivityAt).getTime() >= limitTime);
      } else if (options.period === '30d') {
        const limitTime = now - 30 * 86400000;
        filtered = filtered.filter(i => new Date(i.createdAt).getTime() >= limitTime || new Date(i.lastActivityAt).getTime() >= limitTime);
      } else if (options.period === 'this_month') {
        const thisMonth = new Date().toISOString().slice(0, 7);
        filtered = filtered.filter(i => (i.createdAt || '').slice(0, 7) === thisMonth || (i.lastActivityAt || '').slice(0, 7) === thisMonth);
      } else if (options.period === 'custom' && options.startDate && options.endDate) {
        const s = new Date(options.startDate).getTime();
        const e = new Date(options.endDate + 'T23:59:59').getTime();
        filtered = filtered.filter(i => {
          const t = new Date(i.createdAt).getTime();
          return t >= s && t <= e;
        });
      }
    }

    // Ordenação inteligente
    const sortBy = options.sortBy || 'priority';
    const sortOrder = options.sortOrder || 'asc';

    filtered.sort((a, b) => {
      if (sortBy === 'priority') {
        // 1º: Itens que precisam de atenção primeiro
        if (a.needsAttention !== b.needsAttention) {
          return a.needsAttention ? -1 : 1;
        }
        // 2º: Score de prioridade (CRITICA=1, ALTA=2, NORMAL=3)
        if (a.priorityScore !== b.priorityScore) {
          return a.priorityScore - b.priorityScore;
        }
        // 3º: Atrasadas primeiro
        if (a.isOverdue !== b.isOverdue) {
          return a.isOverdue ? -1 : 1;
        }
        // 4º: Última atividade decrescente
        return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
      }

      if (sortBy === 'deadline') {
        const valA = a.daysUntilDeadline ?? 9999;
        const valB = b.daysUntilDeadline ?? 9999;
        return sortOrder === 'desc' ? valB - valA : valA - valB;
      }

      if (sortBy === 'lastMovement') {
        const tA = new Date(a.lastActivityAt).getTime();
        const tB = new Date(b.lastActivityAt).getTime();
        return sortOrder === 'asc' ? tA - tB : tB - tA;
      }

      if (sortBy === 'name') {
        return sortOrder === 'desc' 
          ? b.employeeName.localeCompare(a.employeeName, 'pt-BR')
          : a.employeeName.localeCompare(b.employeeName, 'pt-BR');
      }

      if (sortBy === 'createdAt') {
        const tA = new Date(a.createdAt).getTime();
        const tB = new Date(b.createdAt).getTime();
        return sortOrder === 'asc' ? tA - tB : tB - tA;
      }

      return 0;
    });

    // Itens da seção "O que precisa de atenção" (itens ativos e prioritários)
    const attentionItems = items
      .filter(i => i.needsAttention && i.status !== 'Concluída' && i.status !== 'Cancelada')
      .sort((a, b) => {
        if (a.priorityScore !== b.priorityScore) return a.priorityScore - b.priorityScore;
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        return (a.daysUntilDeadline ?? 999) - (b.daysUntilDeadline ?? 999);
      })
      .slice(0, 6);

    // Paginação
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 10));
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    return {
      items: paginatedItems,
      attentionItems,
      summary: {
        inProgress: countInProgress,
        waitingEmployee: countWaitingEmployee,
        waitingRh: countWaitingRh,
        withPendings: countWithPendings,
        pendingApproval: countPendingApproval,
        nearDeadline: countNearDeadline,
        delayed: countDelayed,
        blocked: countBlocked,
        total: admissions.length
      },
      total,
      page,
      limit,
      totalPages,
      filters: {
        roles: Array.from(rolesSet).sort(),
        departments: Array.from(departmentsSet).sort(),
        units: Array.from(unitsSet).sort(),
        responsibles: Array.from(responsiblesSet).sort(),
        statuses: Array.from(statusesSet),
        situations: [
          { key: 'TODAS', label: 'Todas as Situações' },
          { key: 'AGUARDANDO_FUNCIONARIO', label: 'Aguardando Funcionário' },
          { key: 'AGUARDANDO_RH', label: 'Aguardando RH' },
          { key: 'COM_PENDENCIA', label: 'Com Pendência' },
          { key: 'APROVACAO_PENDENTE', label: 'Aprovação Pendente' },
          { key: 'PROXIMA_DO_PRAZO', label: 'Próxima do Prazo' },
          { key: 'ATRASADA', label: 'Atrasada' },
          { key: 'BLOQUEADA', label: 'Bloqueada' },
          { key: 'EM_DIA', label: 'Em Dia' }
        ]
      }
    };
  }

  // =========================================================================
  // BLOCO 6.2 — INDICADORES E KPIS DE ADMISSÃO (CAMADA ANALÍTICA REAL)
  // =========================================================================

  /**
   * Calcula indicadores e KPIs sobre o processo admissional a partir dos dados reais do sistema.
   * Não gera números fictícios nem tabelas duplicadas.
   */
  getAdmissionKpiData(filters: KpiFilters = {}): KpiHubResponse {
    const now = new Date();
    const period = filters.period || '30d';
    let startTime = 0;
    let endTime = now.getTime();
    let periodLabel = 'Últimos 30 dias';
    let evolutionGrouping: 'day' | 'week' | 'month' = 'day';

    if (period === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      startTime = startOfDay.getTime();
      endTime = endOfDay.getTime();
      periodLabel = 'Hoje';
      evolutionGrouping = 'day';
    } else if (period === '7d') {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      startTime = start.getTime();
      endTime = now.getTime();
      periodLabel = 'Últimos 7 dias';
      evolutionGrouping = 'day';
    } else if (period === '30d') {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      startTime = start.getTime();
      endTime = now.getTime();
      periodLabel = 'Últimos 30 dias';
      evolutionGrouping = 'day';
    } else if (period === '90d') {
      const start = new Date(now);
      start.setDate(now.getDate() - 90);
      start.setHours(0, 0, 0, 0);
      startTime = start.getTime();
      endTime = now.getTime();
      periodLabel = 'Últimos 90 dias';
      evolutionGrouping = 'week';
    } else if (period === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      startTime = start.getTime();
      endTime = end.getTime();
      periodLabel = 'Este mês';
      evolutionGrouping = 'week';
    } else if (period === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      startTime = start.getTime();
      endTime = end.getTime();
      periodLabel = 'Mês anterior';
      evolutionGrouping = 'week';
    } else if (period === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      startTime = start.getTime();
      endTime = end.getTime();
      periodLabel = 'Este ano';
      evolutionGrouping = 'month';
    } else if (period === 'custom') {
      periodLabel = 'Personalizado';
      if (filters.startDate) {
        startTime = new Date(filters.startDate.includes('T') ? filters.startDate : filters.startDate + 'T00:00:00').getTime();
      } else {
        startTime = new Date(now.getTime() - 30 * 86400000).getTime();
      }
      if (filters.endDate) {
        endTime = new Date(filters.endDate.includes('T') ? filters.endDate : filters.endDate + 'T23:59:59').getTime();
      } else {
        endTime = now.getTime();
      }
      const daysDiff = Math.ceil((endTime - startTime) / 86400000);
      if (daysDiff > 90) evolutionGrouping = 'month';
      else if (daysDiff > 14) evolutionGrouping = 'week';
      else evolutionGrouping = 'day';
    }

    const admissions = this.data.admissions || [];
    const settings = this.data.settings || {};

    const rolesSet = new Set<string>();
    const departmentsSet = new Set<string>();
    const unitsSet = new Set<string>();
    const statusesSet = new Set<string>();
    const responsiblesSet = new Set<string>(['RH', 'FUNCIONARIO', 'GESTOR', 'ADMIN']);

    for (const a of admissions) {
      if (a.employee?.role) rolesSet.add(a.employee.role);
      if (a.employee?.department) departmentsSet.add(a.employee.department);
      if (a.employee?.unit) unitsSet.add(a.employee.unit);
      if (a.status) statusesSet.add(a.status);
    }

    // Filtrar admissões pelas dimensões solicitadas
    const dimensionFiltered = admissions.filter(adm => {
      const emp = adm.employee;
      if (filters.role && filters.role !== 'TODOS' && emp?.role !== filters.role) return false;
      if (filters.department && filters.department !== 'TODOS' && emp?.department !== filters.department) return false;
      if (filters.unit && filters.unit !== 'TODOS' && (emp?.unit || 'Matriz') !== filters.unit) return false;
      if (filters.status && filters.status !== 'TODOS' && adm.status !== filters.status) return false;
      return true;
    });

    const todayMs = now.getTime();

    // Auxiliar para determinar a situação operacional consistente com Bloco 6.1
    const getAdmissionSituation = (adm: Admission): { situation: OperationalHubSituation; label: string; responsible: string } => {
      const docs = adm.documents || [];
      const steps = adm.processSteps || [];
      const expectedDate = adm.employee?.expectedStartDate || (adm as any).expectedStartDate;
      const rejectedDocs = docs.filter(d => d.status === 'Rejeitado');
      const inReviewDocs = docs.filter(d => d.status === 'Em análise');
      const notSentDocs = docs.filter(d => !d.status || d.status === 'Não enviado');

      const isBlocked = steps.some(s => s.status === 'BLOQUEADA' || (s.history && s.history.some(h => h.action === 'bloqueada')));

      let isOverdue = false;
      let isNearDeadline = false;
      if (expectedDate && adm.status !== 'Concluída' && adm.status !== 'Cancelada') {
        try {
          const target = new Date(expectedDate.includes('T') ? expectedDate : expectedDate + 'T00:00:00').getTime();
          const daysDiff = Math.ceil((target - todayMs) / 86400000);
          if (daysDiff < 0) isOverdue = true;
          else if (daysDiff <= ((settings as any).tracking?.upcomingDaysThreshold ?? 7)) isNearDeadline = true;
        } catch {}
      }

      const hasApprovalPending = Boolean(adm.approval && (adm.approval.status === 'PENDENTE' || adm.approval.status === 'EM_ANALISE'));

      if (isBlocked) return { situation: 'BLOQUEADA', label: 'Bloqueada', responsible: 'RH' };
      if (isOverdue) return { situation: 'ATRASADA', label: 'Atrasada', responsible: 'RH' };
      if (hasApprovalPending) return { situation: 'APROVACAO_PENDENTE', label: 'Aprovação Pendente', responsible: adm.approval?.responsibleRole || 'GESTOR' };
      if (rejectedDocs.length > 0 || adm.status === 'Pendência') return { situation: 'COM_PENDENCIA', label: 'Com Pendência', responsible: 'FUNCIONARIO' };
      if (inReviewDocs.length > 0 || adm.status === 'Em conferência') return { situation: 'AGUARDANDO_RH', label: 'Aguardando RH', responsible: 'RH' };
      if (adm.status === 'Aguardando documentos' || notSentDocs.length > 0) return { situation: 'AGUARDANDO_FUNCIONARIO', label: 'Aguardando Funcionário', responsible: 'FUNCIONARIO' };
      if (isNearDeadline) return { situation: 'PROXIMA_DO_PRAZO', label: 'Próxima do Prazo', responsible: 'RH' };
      return { situation: 'EM_DIA', label: 'Em Dia', responsible: 'RH' };
    };

    // Avalia cada admissão e anexa situação calculada
    const evaluatedAdmissions = dimensionFiltered.map(adm => {
      const sitInfo = getAdmissionSituation(adm);
      return {
        adm,
        situation: sitInfo.situation,
        situationLabel: sitInfo.label,
        responsible: sitInfo.responsible
      };
    });

    // Filtro adicional por situação operacional e responsável se solicitado
    const filteredAll = evaluatedAdmissions.filter(item => {
      if (filters.situation && filters.situation !== 'TODAS' && item.situation !== filters.situation) return false;
      if (filters.responsible && filters.responsible !== 'TODOS' && item.responsible !== filters.responsible) return false;
      return true;
    });

    // 1. CARDS PRINCIPAIS
    const startedInPeriod: typeof filteredAll = [];
    const completedInPeriod: typeof filteredAll = [];
    const cancelledInPeriod: typeof filteredAll = [];
    const inProgressList: typeof filteredAll = [];

    const durationsMs: number[] = [];

    for (const item of filteredAll) {
      const { adm } = item;
      const createdTime = new Date(adm.createdAt).getTime();

      // Iniciadas
      if (createdTime >= startTime && createdTime <= endTime) {
        startedInPeriod.push(item);
      }

      // Concluídas
      if (adm.status === 'Concluída') {
        const completedTime = adm.completedAt 
          ? new Date(adm.completedAt).getTime() 
          : new Date(adm.updatedAt || adm.createdAt).getTime();
        
        if (completedTime >= startTime && completedTime <= endTime) {
          completedInPeriod.push(item);
          const duration = Math.max(0, completedTime - createdTime);
          durationsMs.push(duration);
        }
      }

      // Canceladas
      if (adm.status === 'Cancelada') {
        const cancelledTime = (adm as any).cancelledAt 
          ? new Date((adm as any).cancelledAt).getTime() 
          : new Date(adm.updatedAt || adm.createdAt).getTime();

        if (cancelledTime >= startTime && cancelledTime <= endTime) {
          cancelledInPeriod.push(item);
        }
      }

      // Em andamento
      if (adm.status !== 'Concluída' && adm.status !== 'Cancelada' && createdTime <= endTime) {
        inProgressList.push(item);
      }
    }

    const mainCards: KpiMainCards = {
      started: startedInPeriod.length,
      inProgress: inProgressList.length,
      completed: completedInPeriod.length,
      cancelled: cancelledInPeriod.length,
      waitingEmployee: inProgressList.filter(i => i.situation === 'AGUARDANDO_FUNCIONARIO').length,
      waitingRh: inProgressList.filter(i => i.situation === 'AGUARDANDO_RH').length,
      withPendings: inProgressList.filter(i => i.situation === 'COM_PENDENCIA').length,
      pendingApproval: inProgressList.filter(i => i.situation === 'APROVACAO_PENDENTE').length,
      delayed: inProgressList.filter(i => i.situation === 'ATRASADA').length
    };

    // 2. TAXAS E PERCENTUAIS
    const completionRate = mainCards.started > 0 
      ? Number(((mainCards.completed / mainCards.started) * 100).toFixed(1)) 
      : null;

    const cancellationRate = mainCards.started > 0 
      ? Number(((mainCards.cancelled / mainCards.started) * 100).toFixed(1)) 
      : null;

    // Métricas de Documentos das admissões analisadas no período
    let docsSubmitted = 0;
    let docsInReview = 0;
    let docsApproved = 0;
    let docsRejected = 0;
    let docsResent = 0;
    let docsPendingOrNotSent = 0;
    let docsMandatoryPending = 0;

    const targetAdmissionsForDocs = startedInPeriod.length > 0 ? startedInPeriod : inProgressList;
    for (const item of targetAdmissionsForDocs) {
      const docs = item.adm.documents || [];
      for (const doc of docs) {
        const hasFile = doc.status && doc.status !== 'Não enviado';
        if (hasFile) {
          docsSubmitted++;
        } else {
          docsPendingOrNotSent++;
          if (doc.required) docsMandatoryPending++;
        }

        if (doc.status === 'Em análise') docsInReview++;
        if (doc.status === 'Aprovado') docsApproved++;
        if (doc.status === 'Rejeitado') docsRejected++;

        if (doc.versions && doc.versions.length > 1) {
          const hadRejection = doc.versions.some(v => v.status === 'Rejeitado');
          if (hadRejection) {
            docsResent++;
          }
        }
      }
    }

    const approvedDocsRate = docsSubmitted > 0 
      ? Number(((docsApproved / docsSubmitted) * 100).toFixed(1)) 
      : null;

    const rejectionDocsRate = docsSubmitted > 0 
      ? Number(((docsRejected / docsSubmitted) * 100).toFixed(1)) 
      : null;

    const rates: KpiRates = {
      completionRate,
      cancellationRate,
      approvedDocsRate,
      rejectionDocsRate
    };

    // 3. MÉTRICAS DE TEMPO & MEDIANA REAIS
    let avgCompletionDays: number | null = null;
    let avgCompletionHours: number | null = null;
    let medianCompletionDays: number | null = null;
    let medianCompletionHours: number | null = null;
    const hasSufficientTimeData = durationsMs.length > 0;

    if (hasSufficientTimeData) {
      const sumMs = durationsMs.reduce((acc, d) => acc + d, 0);
      const avgMs = sumMs / durationsMs.length;
      avgCompletionDays = Number((avgMs / 86400000).toFixed(1));
      avgCompletionHours = Math.round(avgMs / 3600000);

      const sorted = [...durationsMs].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const medianMs = sorted.length % 2 !== 0 
        ? sorted[mid] 
        : (sorted[mid - 1] + sorted[mid]) / 2;
      medianCompletionDays = Number((medianMs / 86400000).toFixed(1));
      medianCompletionHours = Math.round(medianMs / 3600000);
    }

    const standardSteps: { key: string; name: string; order: number }[] = [
      { key: 'CADASTRO', name: 'Cadastro da Admissão', order: 1 },
      { key: 'DADOS_PESSOAIS', name: 'Dados do Funcionário', order: 2 },
      { key: 'DOCUMENTOS', name: 'Envio de Documentos', order: 3 },
      { key: 'CONFERENCIA', name: 'Conferência do RH', order: 4 },
      { key: 'APROVACAO', name: 'Aprovação Interna', order: 5 },
      { key: 'CONCLUSAO', name: 'Conclusão & Prontuário', order: 6 }
    ];

    const stepAvgTimes: KpiStepTimeItem[] = standardSteps.map(stepDef => {
      const stepDurationsMs: number[] = [];
      for (const item of filteredAll) {
        const steps = item.adm.processSteps || [];
        const step = steps.find(s => s.stepKey === stepDef.key);
        if (step && step.startedAt && step.completedAt) {
          const sTime = new Date(step.startedAt).getTime();
          const cTime = new Date(step.completedAt).getTime();
          if (cTime >= sTime) {
            stepDurationsMs.push(cTime - sTime);
          }
        }
      }

      if (stepDurationsMs.length > 0) {
        const sumStepMs = stepDurationsMs.reduce((acc, v) => acc + v, 0);
        const avgStepMs = sumStepMs / stepDurationsMs.length;
        return {
          stepKey: stepDef.key,
          stepName: stepDef.name,
          stepOrder: stepDef.order,
          avgDays: Number((avgStepMs / 86400000).toFixed(1)),
          avgHours: Math.round(avgStepMs / 3600000),
          sampleCount: stepDurationsMs.length,
          hasSufficientData: true
        };
      }

      return {
        stepKey: stepDef.key,
        stepName: stepDef.name,
        stepOrder: stepDef.order,
        avgDays: null,
        avgHours: null,
        sampleCount: 0,
        hasSufficientData: false
      };
    });

    const timeMetrics: KpiTimeMetrics = {
      avgCompletionDays,
      avgCompletionHours,
      medianCompletionDays,
      medianCompletionHours,
      completedCount: durationsMs.length,
      hasSufficientData: hasSufficientTimeData,
      stepAvgTimes
    };

    // 4. DOCUMENTOS
    const documentsMetrics: KpiDocumentsMetrics = {
      submitted: docsSubmitted,
      inReview: docsInReview,
      approved: docsApproved,
      rejected: docsRejected,
      resent: docsResent,
      pendingOrNotSent: docsPendingOrNotSent,
      mandatoryPending: docsMandatoryPending
    };

    // 5. APROVAÇÕES (Bloco 5.6)
    let appTotal = 0;
    let appPending = 0;
    let appApproved = 0;
    let appRejected = 0;
    let appReopened = 0;
    const appDurationsMs: number[] = [];

    for (const item of filteredAll) {
      if (item.adm.approval) {
        appTotal++;
        const st = item.adm.approval.status;
        if (st === 'PENDENTE' || st === 'EM_ANALISE') appPending++;
        if (st === 'APROVADA') appApproved++;
        if (st === 'REPROVADA') appRejected++;
        if (item.adm.approval.history && item.adm.approval.history.some(h => h.action === 'CANCELADA' || h.action === 'REABERTA')) {
          appReopened++;
        }
        if (item.adm.approval.requestedAt && item.adm.approval.decidedAt) {
          const reqTime = new Date(item.adm.approval.requestedAt).getTime();
          const decTime = new Date(item.adm.approval.decidedAt).getTime();
          if (decTime >= reqTime) {
            appDurationsMs.push(decTime - reqTime);
          }
        }
      }
    }

    const avgDecisionHours = appDurationsMs.length > 0 
      ? Math.round(appDurationsMs.reduce((acc, v) => acc + v, 0) / appDurationsMs.length / 3600000) 
      : null;

    const approvalsMetrics: KpiApprovalsMetrics = {
      total: appTotal,
      pending: appPending,
      approved: appApproved,
      rejected: appRejected,
      reopened: appReopened,
      avgDecisionHours,
      hasSufficientData: appDurationsMs.length > 0
    };

    // 6. EVOLUÇÃO TEMPORAL (GRÁFICO)
    const evolutionPoints: KpiEvolutionPoint[] = [];

    if (evolutionGrouping === 'day') {
      const daysCount = Math.max(1, Math.min(31, Math.ceil((endTime - startTime) / 86400000)));
      for (let i = 0; i < daysCount; i++) {
        const bucketStart = new Date(startTime + i * 86400000);
        bucketStart.setHours(0, 0, 0, 0);
        const bucketEnd = new Date(startTime + (i + 1) * 86400000 - 1);
        const bStartMs = bucketStart.getTime();
        const bEndMs = bucketEnd.getTime();

        const sCount = startedInPeriod.filter(item => {
          const t = new Date(item.adm.createdAt).getTime();
          return t >= bStartMs && t <= bEndMs;
        }).length;

        const cCount = completedInPeriod.filter(item => {
          const t = item.adm.completedAt 
            ? new Date(item.adm.completedAt).getTime() 
            : new Date(item.adm.updatedAt || item.adm.createdAt).getTime();
          return t >= bStartMs && t <= bEndMs;
        }).length;

        evolutionPoints.push({
          label: `${String(bucketStart.getDate()).padStart(2, '0')}/${String(bucketStart.getMonth() + 1).padStart(2, '0')}`,
          date: bucketStart.toISOString().split('T')[0],
          started: sCount,
          completed: cCount
        });
      }
    } else if (evolutionGrouping === 'week') {
      const totalWeeks = Math.max(1, Math.ceil((endTime - startTime) / (7 * 86400000)));
      for (let w = 0; w < totalWeeks; w++) {
        const wStartMs = startTime + w * 7 * 86400000;
        const wEndMs = Math.min(endTime, startTime + (w + 1) * 7 * 86400000 - 1);
        const wDate = new Date(wStartMs);

        const sCount = startedInPeriod.filter(item => {
          const t = new Date(item.adm.createdAt).getTime();
          return t >= wStartMs && t <= wEndMs;
        }).length;

        const cCount = completedInPeriod.filter(item => {
          const t = item.adm.completedAt 
            ? new Date(item.adm.completedAt).getTime() 
            : new Date(item.adm.updatedAt || item.adm.createdAt).getTime();
          return t >= wStartMs && t <= wEndMs;
        }).length;

        evolutionPoints.push({
          label: `Semana ${w + 1}`,
          date: wDate.toISOString().split('T')[0],
          started: sCount,
          completed: cCount
        });
      }
    } else {
      const startD = new Date(startTime);
      const endD = new Date(endTime);
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      
      let cur = new Date(startD.getFullYear(), startD.getMonth(), 1);
      while (cur.getTime() <= endD.getTime()) {
        const mStart = new Date(cur.getFullYear(), cur.getMonth(), 1, 0, 0, 0, 0).getTime();
        const mEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

        const sCount = startedInPeriod.filter(item => {
          const t = new Date(item.adm.createdAt).getTime();
          return t >= mStart && t <= mEnd;
        }).length;

        const cCount = completedInPeriod.filter(item => {
          const t = item.adm.completedAt 
            ? new Date(item.adm.completedAt).getTime() 
            : new Date(item.adm.updatedAt || item.adm.createdAt).getTime();
          return t >= mStart && t <= mEnd;
        }).length;

        evolutionPoints.push({
          label: `${months[cur.getMonth()]}/${String(cur.getFullYear()).slice(2)}`,
          date: cur.toISOString().split('T')[0],
          started: sCount,
          completed: cCount
        });

        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      }
    }

    // 7. DISTRIBUIÇÃO POR STATUS E SITUAÇÃO OPERACIONAL
    const statusCounts: Record<string, number> = {};
    for (const item of filteredAll) {
      const st = item.adm.status || 'Rascunho';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    }

    const statusColors: Record<string, string> = {
      'Concluída': '#059669',
      'Em conferência': '#2563eb',
      'Aguardando documentos': '#ea580c',
      'Pendência': '#e11d48',
      'Cancelada': '#64748b',
      'Rascunho': '#94a3b8'
    };

    const statusDistribution: KpiDistributionItem[] = Object.keys(statusCounts).map(st => ({
      category: st,
      label: st,
      count: statusCounts[st],
      color: statusColors[st] || '#64748b'
    }));

    const situationCounts: Record<string, { label: string; count: number; color: string }> = {
      'AGUARDANDO_FUNCIONARIO': { label: 'Aguardando Funcionário', count: 0, color: '#ea580c' },
      'AGUARDANDO_RH': { label: 'Aguardando RH', count: 0, color: '#2563eb' },
      'COM_PENDENCIA': { label: 'Com Pendência', count: 0, color: '#e11d48' },
      'APROVACAO_PENDENTE': { label: 'Aprovação Pendente', count: 0, color: '#7c3aed' },
      'PROXIMA_DO_PRAZO': { label: 'Próxima do Prazo', count: 0, color: '#d97706' },
      'ATRASADA': { label: 'Atrasada', count: 0, color: '#dc2626' },
      'BLOQUEADA': { label: 'Bloqueada', count: 0, color: '#475569' },
      'EM_DIA': { label: 'Em Dia', count: 0, color: '#059669' }
    };

    for (const item of inProgressList) {
      if (situationCounts[item.situation]) {
        situationCounts[item.situation].count++;
      }
    }

    const situationDistribution: KpiDistributionItem[] = Object.keys(situationCounts)
      .filter(k => situationCounts[k].count > 0)
      .map(k => ({
        category: k,
        label: situationCounts[k].label,
        count: situationCounts[k].count,
        color: situationCounts[k].color
      }));

    // 8. INDICADORES POR CARGO, UNIDADE E SETOR
    const buildDimensionMetrics = (keyExtractor: (item: typeof filteredAll[0]) => string): KpiByDimensionItem[] => {
      const map: Record<string, { started: number; completed: number; inProgress: number; cancelled: number; withPendings: number }> = {};

      for (const item of filteredAll) {
        const key = keyExtractor(item) || 'Não informado';
        if (!map[key]) {
          map[key] = { started: 0, completed: 0, inProgress: 0, cancelled: 0, withPendings: 0 };
        }

        const cTime = new Date(item.adm.createdAt).getTime();
        if (cTime >= startTime && cTime <= endTime) {
          map[key].started++;
        }

        if (item.adm.status === 'Concluída') {
          const compTime = item.adm.completedAt 
            ? new Date(item.adm.completedAt).getTime() 
            : new Date(item.adm.updatedAt || item.adm.createdAt).getTime();
          if (compTime >= startTime && compTime <= endTime) {
            map[key].completed++;
          }
        } else if (item.adm.status === 'Cancelada') {
          map[key].cancelled++;
        } else {
          map[key].inProgress++;
        }

        if (item.situation === 'COM_PENDENCIA') {
          map[key].withPendings++;
        }
      }

      return Object.keys(map).map(name => {
        const d = map[name];
        const rate = d.started > 0 ? Number(((d.completed / d.started) * 100).toFixed(1)) : null;
        return {
          name,
          started: d.started,
          completed: d.completed,
          inProgress: d.inProgress,
          cancelled: d.cancelled,
          withPendings: d.withPendings,
          completionRate: rate
        };
      }).sort((a, b) => (b.started + b.inProgress) - (a.started + a.inProgress));
    };

    const byRole = buildDimensionMetrics(i => i.adm.employee?.role || 'Não informado');
    const byUnit = buildDimensionMetrics(i => i.adm.employee?.unit || 'Matriz');
    const byDepartment = buildDimensionMetrics(i => i.adm.employee?.department || 'Geral');

    // 9. TABELA DETALHADA COM DRILL-DOWN (LIMITADA A 50 ITENS PARA PERFORMANCE)
    const detailedAdmissions: KpiDetailedAdmission[] = filteredAll.slice(0, 50).map(item => {
      const { adm } = item;
      const cTime = new Date(adm.createdAt).getTime();
      let durationDays: number | undefined;

      if (adm.status === 'Concluída') {
        const compTime = adm.completedAt 
          ? new Date(adm.completedAt).getTime() 
          : new Date(adm.updatedAt || adm.createdAt).getTime();
        durationDays = Number((Math.max(0, compTime - cTime) / 86400000).toFixed(1));
      }

      const pendingDocs = (adm.documents || []).filter(d => d.status === 'Rejeitado' || d.status === 'Não enviado').length;
      const hasApprovalPending = Boolean(adm.approval && (adm.approval.status === 'PENDENTE' || adm.approval.status === 'EM_ANALISE'));

      return {
        id: adm.id,
        code: `ADM-${adm.id.substring(0, 8).toUpperCase()}`,
        employeeName: adm.employee?.name || 'Não informado',
        employeeCpfMasked: adm.employee?.cpf ? maskCPF(adm.employee.cpf) : '***.***.***-**',
        role: adm.employee?.role || 'Não informado',
        department: adm.employee?.department || 'Geral',
        unit: adm.employee?.unit || 'Matriz',
        status: adm.status,
        situation: item.situation,
        situationLabel: item.situationLabel,
        startedAt: adm.createdAt,
        completedAt: adm.completedAt,
        cancelledAt: (adm as any).cancelledAt,
        durationDays,
        pendingDocsCount: pendingDocs,
        hasApprovalPending
      };
    });

    return {
      periodLabel,
      dateRange: {
        start: new Date(startTime).toISOString(),
        end: new Date(endTime).toISOString()
      },
      mainCards,
      rates,
      timeMetrics,
      documents: documentsMetrics,
      approvals: approvalsMetrics,
      evolution: evolutionPoints,
      evolutionGrouping,
      statusDistribution,
      situationDistribution,
      byRole,
      byUnit,
      byDepartment,
      detailedAdmissions,
      totalDetailed: filteredAll.length,
      page: 1,
      totalPages: Math.max(1, Math.ceil(filteredAll.length / 50)),
      availableFilters: {
        roles: Array.from(rolesSet).sort(),
        departments: Array.from(departmentsSet).sort(),
        units: Array.from(unitsSet).sort(),
        statuses: Array.from(statusesSet),
        situations: [
          { key: 'TODAS', label: 'Todas as Situações' },
          { key: 'AGUARDANDO_FUNCIONARIO', label: 'Aguardando Funcionário' },
          { key: 'AGUARDANDO_RH', label: 'Aguardando RH' },
          { key: 'COM_PENDENCIA', label: 'Com Pendência' },
          { key: 'APROVACAO_PENDENTE', label: 'Aprovação Pendente' },
          { key: 'PROXIMA_DO_PRAZO', label: 'Próxima do Prazo' },
          { key: 'ATRASADA', label: 'Atrasada' },
          { key: 'BLOQUEADA', label: 'Bloqueada' },
          { key: 'EM_DIA', label: 'Em Dia' }
        ],
        responsibles: Array.from(responsiblesSet).sort()
      }
    };
  }

  // =========================================================================
  // BLOCO 6.3 — ANÁLISE DE GARGALOS DO PROCESSO ADMISSIONAL
  // =========================================================================

  getBottleneckAnalysisData(filters: {
    period?: string;
    startDate?: string;
    endDate?: string;
    role?: string;
    department?: string;
    unit?: string;
    status?: string;
    situation?: string;
    responsible?: string;
  }): BottleneckHubResponse {
    const now = new Date();
    const period = filters.period || '30d';

    let startTime = 0;
    let endTime = now.getTime();
    let periodLabel = 'Últimos 30 dias';
    let evolutionGrouping: 'day' | 'week' | 'month' = 'day';

    if (period === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      startTime = todayStart.getTime();
      periodLabel = 'Hoje';
      evolutionGrouping = 'day';
    } else if (period === '7d') {
      startTime = now.getTime() - 7 * 86400000;
      periodLabel = 'Últimos 7 dias';
      evolutionGrouping = 'day';
    } else if (period === '30d') {
      startTime = now.getTime() - 30 * 86400000;
      periodLabel = 'Últimos 30 dias';
      evolutionGrouping = 'week';
    } else if (period === '90d') {
      startTime = now.getTime() - 90 * 86400000;
      periodLabel = 'Últimos 90 dias';
      evolutionGrouping = 'week';
    } else if (period === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      startTime = start.getTime();
      endTime = end.getTime();
      periodLabel = 'Este mês';
      evolutionGrouping = 'week';
    } else if (period === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      startTime = start.getTime();
      endTime = end.getTime();
      periodLabel = 'Mês anterior';
      evolutionGrouping = 'week';
    } else if (period === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      startTime = start.getTime();
      endTime = end.getTime();
      periodLabel = 'Este ano';
      evolutionGrouping = 'month';
    } else if (period === 'custom') {
      periodLabel = 'Personalizado';
      if (filters.startDate) {
        startTime = new Date(filters.startDate.includes('T') ? filters.startDate : filters.startDate + 'T00:00:00').getTime();
      } else {
        startTime = new Date(now.getTime() - 30 * 86400000).getTime();
      }
      if (filters.endDate) {
        endTime = new Date(filters.endDate.includes('T') ? filters.endDate : filters.endDate + 'T23:59:59').getTime();
      } else {
        endTime = now.getTime();
      }
      const daysDiff = Math.ceil((endTime - startTime) / 86400000);
      if (daysDiff > 90) evolutionGrouping = 'month';
      else if (daysDiff > 14) evolutionGrouping = 'week';
      else evolutionGrouping = 'day';
    }

    const admissions = this.data.admissions || [];
    const settings = this.data.settings || {};
    const auditLogs = this.data.auditLogs || [];

    const rolesSet = new Set<string>();
    const departmentsSet = new Set<string>();
    const unitsSet = new Set<string>();
    const statusesSet = new Set<string>();
    const responsiblesSet = new Set<string>(['RH', 'FUNCIONARIO', 'GESTOR', 'ADMIN']);

    for (const a of admissions) {
      if (a.employee?.role) rolesSet.add(a.employee.role);
      if (a.employee?.department) departmentsSet.add(a.employee.department);
      if (a.employee?.unit) unitsSet.add(a.employee.unit);
      if (a.status) statusesSet.add(a.status);
    }

    const todayMs = now.getTime();

    // Situação operacional alinhada ao Bloco 6.1
    const getAdmissionSituation = (adm: Admission): { situation: OperationalHubSituation; label: string; responsible: string } => {
      const docs = adm.documents || [];
      const steps = adm.processSteps || [];
      const expectedDate = adm.employee?.expectedStartDate || (adm as any).expectedStartDate;
      const rejectedDocs = docs.filter(d => d.status === 'Rejeitado');
      const inReviewDocs = docs.filter(d => d.status === 'Em análise');
      const notSentDocs = docs.filter(d => !d.status || d.status === 'Não enviado');

      const isBlocked = steps.some(s => s.status === 'BLOQUEADA' || (s.history && s.history.some(h => h.action === 'bloqueada')));

      let isOverdue = false;
      let isNearDeadline = false;
      if (expectedDate && adm.status !== 'Concluída' && adm.status !== 'Cancelada') {
        try {
          const target = new Date(expectedDate.includes('T') ? expectedDate : expectedDate + 'T00:00:00').getTime();
          const daysDiff = Math.ceil((target - todayMs) / 86400000);
          if (daysDiff < 0) isOverdue = true;
          else if (daysDiff <= ((settings as any).tracking?.upcomingDaysThreshold ?? 7)) isNearDeadline = true;
        } catch {}
      }

      const hasApprovalPending = Boolean(adm.approval && (adm.approval.status === 'PENDENTE' || adm.approval.status === 'EM_ANALISE'));

      if (isBlocked) return { situation: 'BLOQUEADA', label: 'Bloqueada', responsible: 'RH' };
      if (isOverdue) return { situation: 'ATRASADA', label: 'Atrasada', responsible: 'RH' };
      if (hasApprovalPending) return { situation: 'APROVACAO_PENDENTE', label: 'Aprovação Pendente', responsible: adm.approval?.responsibleRole || 'GESTOR' };
      if (rejectedDocs.length > 0 || adm.status === 'Pendência') return { situation: 'COM_PENDENCIA', label: 'Com Pendência', responsible: 'FUNCIONARIO' };
      if (inReviewDocs.length > 0 || adm.status === 'Em conferência') return { situation: 'AGUARDANDO_RH', label: 'Aguardando RH', responsible: 'RH' };
      if (adm.status === 'Aguardando documentos' || notSentDocs.length > 0) return { situation: 'AGUARDANDO_FUNCIONARIO', label: 'Aguardando Funcionário', responsible: 'FUNCIONARIO' };
      if (isNearDeadline) return { situation: 'PROXIMA_DO_PRAZO', label: 'Próxima do Prazo', responsible: 'RH' };
      return { situation: 'EM_DIA', label: 'Em Dia', responsible: 'RH' };
    };

    // Filtros dimensionais
    const dimensionFiltered = admissions.filter(adm => {
      const emp = adm.employee;
      if (filters.role && filters.role !== 'TODOS' && emp?.role !== filters.role) return false;
      if (filters.department && filters.department !== 'TODOS' && emp?.department !== filters.department) return false;
      if (filters.unit && filters.unit !== 'TODOS' && (emp?.unit || 'Matriz') !== filters.unit) return false;
      if (filters.status && filters.status !== 'TODOS' && adm.status !== filters.status) return false;
      return true;
    });

    const evaluated = dimensionFiltered.map(adm => {
      const sit = getAdmissionSituation(adm);
      return { adm, situation: sit.situation, situationLabel: sit.label, responsible: sit.responsible };
    }).filter(item => {
      if (filters.situation && filters.situation !== 'TODAS' && item.situation !== filters.situation) return false;
      if (filters.responsible && filters.responsible !== 'TODOS' && item.responsible !== filters.responsible) return false;
      return true;
    });

    // Helper de Mediana
    const calculateMedian = (values: number[]): number | null => {
      if (!values || values.length === 0) return null;
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      if (sorted.length % 2 === 1) {
        return Math.round(sorted[mid] * 10) / 10;
      } else {
        return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
      }
    };

    // 1. DETERMINAÇÃO DA ÚLTIMA MOVIMENTAÇÃO REAL DE CADA ADMISSÃO
    const findLastMovement = (adm: Admission) => {
      let maxTime = new Date(adm.createdAt).getTime();
      let action = 'Criação do processo admissional';
      let details: string | undefined = `Processo iniciado para ${adm.employee?.name || 'colaborador'}`;

      if (adm.updatedAt) {
        const u = new Date(adm.updatedAt).getTime();
        if (u > maxTime && u <= todayMs) {
          maxTime = u;
          action = 'Atualização cadastral do processo';
        }
      }
      if (adm.dataConfirmedAt) {
        const d = new Date(adm.dataConfirmedAt).getTime();
        if (d > maxTime && d <= todayMs) {
          maxTime = d;
          action = 'Confirmação de dados cadastrais';
          details = 'Colaborador validou seus dados pessoais no portal';
        }
      }
      if (adm.consentDate) {
        const c = new Date(adm.consentDate).getTime();
        if (c > maxTime && c <= todayMs) {
          maxTime = c;
          action = 'Aceite do termo de consentimento LGPD';
        }
      }
      if (adm.inviteLastAccessedAt) {
        const a = new Date(adm.inviteLastAccessedAt).getTime();
        if (a > maxTime && a <= todayMs) {
          maxTime = a;
          action = 'Acesso do colaborador ao portal';
        }
      }

      // Documentos
      for (const doc of (adm.documents || [])) {
        if (doc.uploadedAt) {
          const up = new Date(doc.uploadedAt).getTime();
          if (up > maxTime && up <= todayMs) {
            maxTime = up;
            action = `Envio de documento: ${doc.documentType}`;
            details = doc.fileName ? `Arquivo: ${doc.fileName}` : undefined;
          }
        }
        if (doc.reviewedAt) {
          const rev = new Date(doc.reviewedAt).getTime();
          if (rev > maxTime && rev <= todayMs) {
            maxTime = rev;
            action = `Avaliação de documento: ${doc.documentType} (${doc.status})`;
            details = doc.rejectionReason ? `Motivo: ${doc.rejectionReason}` : undefined;
          }
        }
        for (const v of (doc.versions || [])) {
          if (v.uploadedAt) {
            const vUp = new Date(v.uploadedAt).getTime();
            if (vUp > maxTime && vUp <= todayMs) {
              maxTime = vUp;
              action = `Reenvio de documento: ${doc.documentType} (v${v.version})`;
              details = v.fileName;
            }
          }
          if (v.reviewedAt) {
            const vRev = new Date(v.reviewedAt).getTime();
            if (vRev > maxTime && vRev <= todayMs) {
              maxTime = vRev;
              action = `Avaliação de versão: ${doc.documentType} (v${v.version} - ${v.status})`;
            }
          }
        }
      }

      // Etapas de processo
      for (const step of (adm.processSteps || [])) {
        if (step.startedAt) {
          const s = new Date(step.startedAt).getTime();
          if (s > maxTime && s <= todayMs) {
            maxTime = s;
            action = `Início da etapa: ${step.stepName}`;
          }
        }
        if (step.completedAt) {
          const c = new Date(step.completedAt).getTime();
          if (c > maxTime && c <= todayMs) {
            maxTime = c;
            action = `Conclusão da etapa: ${step.stepName}`;
          }
        }
        for (const h of (step.history || [])) {
          if (h.timestamp) {
            const ht = new Date(h.timestamp).getTime();
            if (ht > maxTime && ht <= todayMs) {
              maxTime = ht;
              action = `Etapa ${step.stepName}: ${h.action}`;
              details = h.details || h.reason;
            }
          }
        }
      }

      // Aprovação
      if (adm.approval) {
        if (adm.approval.requestedAt) {
          const r = new Date(adm.approval.requestedAt).getTime();
          if (r > maxTime && r <= todayMs) {
            maxTime = r;
            action = 'Aprovação interna solicitada';
          }
        }
        if (adm.approval.decidedAt) {
          const d = new Date(adm.approval.decidedAt).getTime();
          if (d > maxTime && d <= todayMs) {
            maxTime = d;
            action = `Decisão de aprovação: ${adm.approval.status}`;
            details = adm.approval.decisionReason;
          }
        }
      }

      // Logs de Auditoria
      for (const log of auditLogs) {
        if (log.admissionId === adm.id && log.timestamp) {
          const lt = new Date(log.timestamp).getTime();
          if (lt > maxTime && lt <= todayMs) {
            maxTime = lt;
            action = log.action;
            details = log.details;
          }
        }
      }

      return {
        timestamp: new Date(maxTime).toISOString(),
        action,
        details
      };
    };

    // 2. ADMISSÕES ATIVAS E SEM MOVIMENTAÇÃO RECENTE
    const activeAdmissions = evaluated.filter(item => item.adm.status !== 'Concluída' && item.adm.status !== 'Cancelada');

    const stalledAdmissions: BottleneckStalledAdmission[] = [];

    for (const item of activeAdmissions) {
      const adm = item.adm;
      const lastMove = findLastMovement(adm);
      const lastMoveMs = new Date(lastMove.timestamp).getTime();
      const diffMs = Math.max(0, todayMs - lastMoveMs);
      const stalledDays = Math.floor(diffMs / 86400000);
      const stalledHours = Math.floor((diffMs % 86400000) / 3600000);

      let stalledFormatted = '';
      if (stalledDays > 0) {
        stalledFormatted = stalledHours > 0 ? `${stalledDays}d ${stalledHours}h` : `${stalledDays} dia${stalledDays > 1 ? 's' : ''}`;
      } else {
        stalledFormatted = `${stalledHours} hora${stalledHours !== 1 ? 's' : ''}`;
      }

      const currentStep = (adm.processSteps || []).find(s => s.status === 'EM_ANDAMENTO') || (adm.processSteps || [])[0];

      stalledAdmissions.push({
        id: adm.id,
        code: adm.id.replace('adm-', 'ADM-').slice(0, 10).toUpperCase(),
        employeeName: adm.employee?.name || 'Não informado',
        employeeCpfMasked: adm.employee?.cpf ? maskCPF(adm.employee.cpf) : '***.***.***-**',
        role: adm.employee?.role || 'Não informado',
        unit: adm.employee?.unit || 'Matriz',
        department: adm.employee?.department || 'Geral',
        currentStepKey: currentStep?.stepKey || 'CADASTRO',
        currentStepName: currentStep?.stepName || 'Cadastro Inicial',
        situation: item.situation,
        situationLabel: item.situationLabel,
        lastMovementAt: lastMove.timestamp,
        lastMovementAction: lastMove.action,
        lastMovementDetails: lastMove.details,
        stalledDays,
        stalledHours,
        stalledFormatted,
        responsible: adm.responsibleUserName || 'Sem responsável'
      });
    }

    // Ordenar admissões paradas do maior tempo para o menor
    stalledAdmissions.sort((a, b) => {
      const msA = (a.stalledDays * 86400000) + (a.stalledHours * 3600000);
      const msB = (b.stalledDays * 86400000) + (b.stalledHours * 3600000);
      return msB - msA;
    });

    // Maior tempo observado
    const maxStalledFormatted = stalledAdmissions.length > 0 ? stalledAdmissions[0].stalledFormatted : 'Dados insuficientes';

    // 3. TEMPO MÉDIO DE PROCESSO (Reutilizando 6.2)
    const completedAdmissions = evaluated.filter(item => {
      if (item.adm.status !== 'Concluída') return false;
      const t = item.adm.completedAt 
        ? new Date(item.adm.completedAt).getTime() 
        : new Date(item.adm.updatedAt || item.adm.createdAt).getTime();
      return t >= startTime && t <= endTime;
    });

    const completionDurationsMs: number[] = [];
    for (const item of completedAdmissions) {
      const c = item.adm.completedAt 
        ? new Date(item.adm.completedAt).getTime() 
        : new Date(item.adm.updatedAt || item.adm.createdAt).getTime();
      const s = new Date(item.adm.createdAt).getTime();
      if (c >= s) completionDurationsMs.push(c - s);
    }

    const avgProcessDays = completionDurationsMs.length > 0 
      ? Math.round((completionDurationsMs.reduce((a, b) => a + b, 0) / completionDurationsMs.length / 86400000) * 10) / 10 
      : null;

    // 4. ANÁLISE POR ETAPA DO PROCESSO
    const stepsList = [
      { key: 'CADASTRO', name: 'Cadastro Inicial', order: 1 },
      { key: 'DADOS_PESSOAIS', name: 'Dados Pessoais', order: 2 },
      { key: 'DOCUMENTOS', name: 'Documentos', order: 3 },
      { key: 'CONFERENCIA', name: 'Conferência RH', order: 4 },
      { key: 'APROVACAO', name: 'Aprovação Interna', order: 5 },
      { key: 'CONCLUSAO', name: 'Conclusão & Prontuário', order: 6 }
    ];

    const stepMetrics: BottleneckStepMetrics[] = [];
    let slowestStepName: string | null = null;
    let slowestStepAvgDays: number | null = null;

    for (const stepDef of stepsList) {
      const durationsHours: number[] = [];
      let processCount = 0;
      let inProgressCount = 0;
      let stalledInStep = 0;

      for (const item of evaluated) {
        const step = (item.adm.processSteps || []).find(s => s.stepKey === stepDef.key);
        if (step) {
          processCount++;
          if (step.status === 'EM_ANDAMENTO') {
            inProgressCount++;
            // Verifica se está parada nesta etapa
            const isStalled = stalledAdmissions.some(sa => sa.id === item.adm.id && sa.stalledDays >= 1);
            if (isStalled) stalledInStep++;
          }

          if (step.startedAt && step.completedAt) {
            const st = new Date(step.startedAt).getTime();
            const ct = new Date(step.completedAt).getTime();
            if (ct >= st) durationsHours.push((ct - st) / 3600000);
          } else if (step.history && step.history.length > 1) {
            const startHist = step.history.find(h => h.action === 'iniciada');
            const endHist = step.history.find(h => h.action === 'concluida');
            if (startHist && endHist) {
              const st = new Date(startHist.timestamp).getTime();
              const ct = new Date(endHist.timestamp).getTime();
              if (ct >= st) durationsHours.push((ct - st) / 3600000);
            }
          }
        }
      }

      const hasSufficientData = durationsHours.length > 0;
      let avgHours: number | null = null;
      let avgDays: number | null = null;
      let medianHours: number | null = null;
      let medianDays: number | null = null;
      let maxHours: number | null = null;
      let maxDays: number | null = null;

      if (hasSufficientData) {
        avgHours = Math.round((durationsHours.reduce((a, b) => a + b, 0) / durationsHours.length) * 10) / 10;
        avgDays = Math.round((avgHours / 24) * 10) / 10;
        medianHours = calculateMedian(durationsHours);
        medianDays = medianHours !== null ? Math.round((medianHours / 24) * 10) / 10 : null;
        maxHours = Math.round(Math.max(...durationsHours) * 10) / 10;
        maxDays = Math.round((maxHours / 24) * 10) / 10;

        if (slowestStepAvgDays === null || (avgDays !== null && avgDays > slowestStepAvgDays)) {
          slowestStepAvgDays = avgDays;
          slowestStepName = stepDef.name;
        }
      }

      stepMetrics.push({
        stepKey: stepDef.key,
        stepName: stepDef.name,
        stepOrder: stepDef.order,
        processCount,
        inProgressCount,
        avgDays,
        avgHours,
        medianDays,
        medianHours,
        maxDays,
        maxHours,
        stalledCount: stalledInStep,
        hasSufficientData
      });
    }

    // 5. DOCUMENTOS, REJEIÇÕES E REENVIOS
    let rejectedDocsCount = 0;
    let resentDocsCount = 0;
    let waitingResendCount = 0;

    const rejectionReasonsMap = new Map<string, { count: number; docIds: Set<string>; admIds: Set<string> }>();
    const docTypesMap = new Map<string, { submitted: number; rejected: number; resent: number }>();
    const resendTimesHours: number[] = [];
    const reviewTimesHours: number[] = [];

    for (const item of evaluated) {
      const adm = item.adm;
      for (const doc of (adm.documents || [])) {
        const docName = (doc.documentType || doc.document_type_name || 'Documento Geral').trim();
        const typeStats = docTypesMap.get(docName) || { submitted: 0, rejected: 0, resent: 0 };

        const hasFile = Boolean(doc.status && doc.status !== 'Não enviado');
        if (hasFile) {
          typeStats.submitted++;
        }

        if (doc.status === 'Rejeitado') {
          rejectedDocsCount++;
          typeStats.rejected++;

          const rReason = (doc.rejectionReason || 'Não especificado').trim();
          const rStats = rejectionReasonsMap.get(rReason) || { count: 0, docIds: new Set<string>(), admIds: new Set<string>() };
          rStats.count++;
          rStats.docIds.add(doc.id);
          rStats.admIds.add(adm.id);
          rejectionReasonsMap.set(rReason, rStats);

          if (!doc.versions || doc.versions.length <= 1) {
            waitingResendCount++;
          }
        }

        if (doc.versions && doc.versions.length > 1) {
          resentDocsCount++;
          typeStats.resent++;

          // Calcular tempo de reenvio entre a versão 1 rejeitada e a versão 2 enviada
          for (let i = 1; i < doc.versions.length; i++) {
            const prevV = doc.versions[i - 1];
            const currV = doc.versions[i];
            if (prevV.reviewedAt && currV.uploadedAt) {
              const revT = new Date(prevV.reviewedAt).getTime();
              const upT = new Date(currV.uploadedAt).getTime();
              if (upT >= revT) {
                resendTimesHours.push((upT - revT) / 3600000);
              }
            }
          }
        }

        // Tempo de conferência (entre envio e aprovação)
        if (doc.status === 'Aprovado' && doc.uploadedAt && doc.reviewedAt) {
          const upT = new Date(doc.uploadedAt).getTime();
          const revT = new Date(doc.reviewedAt).getTime();
          if (revT >= upT) {
            reviewTimesHours.push((revT - upT) / 3600000);
          }
        }

        docTypesMap.set(docName, typeStats);
      }
    }

    // Tabela de Rejeições por Motivo
    const rejectionsByReason: BottleneckRejectionReasonItem[] = [];
    const totalRejectionOccurrences = Array.from(rejectionReasonsMap.values()).reduce((sum, v) => sum + v.count, 0);

    for (const [reason, stats] of rejectionReasonsMap.entries()) {
      rejectionsByReason.push({
        reason,
        count: stats.count,
        affectedDocsCount: stats.docIds.size,
        affectedAdmissionsCount: stats.admIds.size,
        percent: totalRejectionOccurrences > 0 ? Math.round((stats.count / totalRejectionOccurrences) * 100) : 0
      });
    }
    rejectionsByReason.sort((a, b) => b.count - a.count);

    // Tabela de Rejeições por Tipo de Documento
    const rejectionsByDocType: BottleneckDocTypeRejectionItem[] = [];
    for (const [docName, stats] of docTypesMap.entries()) {
      rejectionsByDocType.push({
        documentTypeName: docName,
        submittedCount: stats.submitted,
        rejectedCount: stats.rejected,
        resentCount: stats.resent,
        rejectionRate: stats.submitted > 0 ? Math.round((stats.rejected / stats.submitted) * 1000) / 10 : null
      });
    }
    rejectionsByDocType.sort((a, b) => (b.rejectedCount || 0) - (a.rejectedCount || 0));

    // Métricas de Reenvio
    const avgResendTimeHours = resendTimesHours.length > 0 
      ? Math.round((resendTimesHours.reduce((a, b) => a + b, 0) / resendTimesHours.length) * 10) / 10 
      : null;
    const medianResendTimeHours = calculateMedian(resendTimesHours);
    const maxResendTimeHours = resendTimesHours.length > 0 
      ? Math.round(Math.max(...resendTimesHours) * 10) / 10 
      : null;

    const resentMetrics: BottleneckResentMetrics = {
      resentDocsCount,
      waitingResendCount,
      avgResendTimeHours,
      medianResendTimeHours,
      maxResendTimeHours,
      hasSufficientResendData: resendTimesHours.length > 0
    };

    // Métricas de Tempo de Conferência
    const avgReviewHours = reviewTimesHours.length > 0
      ? Math.round((reviewTimesHours.reduce((a, b) => a + b, 0) / reviewTimesHours.length) * 10) / 10
      : null;
    const medianReviewHours = calculateMedian(reviewTimesHours);

    const reviewTimeMetrics: BottleneckReviewTimeMetrics = {
      avgReviewHours,
      medianReviewHours,
      sampleCount: reviewTimesHours.length,
      hasSufficientData: reviewTimesHours.length > 0
    };

    // 6. PENDÊNCIAS OBSERVADAS
    const pendingCategories: Record<string, { title: string; count: number; admIds: Set<string> }> = {
      NOT_SENT: { title: 'Documentos não enviados', count: 0, admIds: new Set<string>() },
      IN_REVIEW: { title: 'Aguardando conferência RH', count: 0, admIds: new Set<string>() },
      REJECTED: { title: 'Documentos rejeitados', count: 0, admIds: new Set<string>() },
      RESEND_WAITING: { title: 'Aguardando reenvio pelo colaborador', count: 0, admIds: new Set<string>() },
      APPROVAL_WAITING: { title: 'Aprovação interna pendente', count: 0, admIds: new Set<string>() },
      NEAR_DEADLINE: { title: 'Próxima do início previsto', count: 0, admIds: new Set<string>() },
      OVERDUE: { title: 'Início previsto ultrapassado', count: 0, admIds: new Set<string>() }
    };

    for (const item of evaluated) {
      const adm = item.adm;
      for (const doc of (adm.documents || [])) {
        if (doc.required && (!doc.status || doc.status === 'Não enviado')) {
          pendingCategories.NOT_SENT.count++;
          pendingCategories.NOT_SENT.admIds.add(adm.id);
        }
        if (doc.status === 'Em análise') {
          pendingCategories.IN_REVIEW.count++;
          pendingCategories.IN_REVIEW.admIds.add(adm.id);
        }
        if (doc.status === 'Rejeitado') {
          pendingCategories.REJECTED.count++;
          pendingCategories.REJECTED.admIds.add(adm.id);
          if (!doc.versions || doc.versions.length <= 1) {
            pendingCategories.RESEND_WAITING.count++;
            pendingCategories.RESEND_WAITING.admIds.add(adm.id);
          }
        }
      }

      if (adm.approval && (adm.approval.status === 'PENDENTE' || adm.approval.status === 'EM_ANALISE')) {
        pendingCategories.APPROVAL_WAITING.count++;
        pendingCategories.APPROVAL_WAITING.admIds.add(adm.id);
      }
      if (item.situation === 'PROXIMA_DO_PRAZO') {
        pendingCategories.NEAR_DEADLINE.count++;
        pendingCategories.NEAR_DEADLINE.admIds.add(adm.id);
      }
      if (item.situation === 'ATRASADA') {
        pendingCategories.OVERDUE.count++;
        pendingCategories.OVERDUE.admIds.add(adm.id);
      }
    }

    const totalPendingsCount = Object.values(pendingCategories).reduce((s, p) => s + p.count, 0);
    const pendingsByType: BottleneckPendingItem[] = Object.entries(pendingCategories).map(([key, data]) => ({
      typeKey: key,
      title: data.title,
      count: data.count,
      percent: totalPendingsCount > 0 ? Math.round((data.count / totalPendingsCount) * 100) : 0,
      affectedAdmissionsCount: data.admIds.size
    })).sort((a, b) => b.count - a.count);

    // 7. APROVAÇÕES INTERNAS
    let pendingApprovalsCount = 0;
    let approvedApprovalsCount = 0;
    let rejectedApprovalsCount = 0;
    let reopenedApprovalsCount = 0;
    const approvalDecisionTimesHours: number[] = [];

    for (const item of evaluated) {
      const appr = item.adm.approval;
      if (appr) {
        if (appr.status === 'PENDENTE' || appr.status === 'EM_ANALISE') pendingApprovalsCount++;
        if (appr.status === 'APROVADA') approvedApprovalsCount++;
        if (appr.status === 'REPROVADA') rejectedApprovalsCount++;
        if (appr.history && appr.history.some(h => h.action === 'CANCELADA' || h.action === 'REABERTA')) {
          reopenedApprovalsCount++;
        }
        if (appr.requestedAt && appr.decidedAt) {
          const reqT = new Date(appr.requestedAt).getTime();
          const decT = new Date(appr.decidedAt).getTime();
          if (decT >= reqT) approvalDecisionTimesHours.push((decT - reqT) / 3600000);
        }
      }
    }

    const approvals: KpiApprovalsMetrics = {
      total: pendingApprovalsCount + approvedApprovalsCount + rejectedApprovalsCount,
      pending: pendingApprovalsCount,
      approved: approvedApprovalsCount,
      rejected: rejectedApprovalsCount,
      reopened: reopenedApprovalsCount,
      avgDecisionHours: approvalDecisionTimesHours.length > 0 
        ? Math.round((approvalDecisionTimesHours.reduce((a, b) => a + b, 0) / approvalDecisionTimesHours.length) * 10) / 10 
        : null,
      hasSufficientData: approvalDecisionTimesHours.length > 0
    };

    // 8. PROCESSOS BLOQUEADOS E REABERTOS
    const blockedItems: BottleneckBlockedMetrics['items'] = [];
    const reopenedItems: BottleneckReopenedMetrics['items'] = [];

    for (const item of evaluated) {
      const adm = item.adm;
      for (const step of (adm.processSteps || [])) {
        if (step.status === 'BLOQUEADA' || step.blockReason) {
          blockedItems.push({
            admissionId: adm.id,
            employeeName: adm.employee?.name || 'Não informado',
            stepName: step.stepName,
            blockReason: step.blockReason || 'Bloqueio operacional registrado',
            blockedSince: step.history?.[step.history.length - 1]?.timestamp
          });
        }
        if (step.history && step.history.some(h => h.action === 'reaberta')) {
          reopenedItems.push({
            admissionId: adm.id,
            employeeName: adm.employee?.name || 'Não informado',
            stepOrType: step.stepName,
            reopenedAt: step.history.find(h => h.action === 'reaberta')?.timestamp || adm.updatedAt,
            reason: step.history.find(h => h.action === 'reaberta')?.reason
          });
        }
      }
    }

    const blockedMetrics: BottleneckBlockedMetrics = {
      blockedCount: blockedItems.length,
      items: blockedItems
    };

    const reopenedMetrics: BottleneckReopenedMetrics = {
      reopenedCount: reopenedItems.length,
      items: reopenedItems
    };

    // 9. PROCESSOS ATRASADOS
    const delayedCount = evaluated.filter(i => i.situation === 'ATRASADA').length;

    // 10. EVOLUÇÃO TEMPORAL DOS PONTOS DE ATENÇÃO
    const evolutionPoints: BottleneckEvolutionPoint[] = [];

    if (evolutionGrouping === 'day') {
      const numDays = Math.max(1, Math.min(31, Math.ceil((endTime - startTime) / 86400000)));
      for (let i = 0; i < numDays; i++) {
        const dStart = new Date(startTime + i * 86400000);
        const dayLabel = `${String(dStart.getDate()).padStart(2, '0')}/${String(dStart.getMonth() + 1).padStart(2, '0')}`;
        const dayStartMs = new Date(dStart.getFullYear(), dStart.getMonth(), dStart.getDate(), 0, 0, 0, 0).getTime();
        const dayEndMs = new Date(dStart.getFullYear(), dStart.getMonth(), dStart.getDate(), 23, 59, 59, 999).getTime();

        const completedCount = completedAdmissions.filter(item => {
          const t = item.adm.completedAt ? new Date(item.adm.completedAt).getTime() : new Date(item.adm.updatedAt || item.adm.createdAt).getTime();
          return t >= dayStartMs && t <= dayEndMs;
        }).length;

        // Contagem proporcional de rejeições e movimentações no dia
        const rejCount = rejectionsByReason.reduce((sum, r) => sum + r.count, 0);
        const dailyRej = Math.round(rejCount / numDays);
        const dailyResend = Math.round(resentDocsCount / numDays);
        const dailyStalled = stalledAdmissions.filter(s => s.stalledDays >= 1).length;

        evolutionPoints.push({
          label: dayLabel,
          date: dStart.toISOString().split('T')[0],
          pendings: totalPendingsCount,
          rejections: dailyRej,
          resends: dailyResend,
          stalled: dailyStalled,
          completed: completedCount
        });
      }
    } else if (evolutionGrouping === 'week') {
      const numWeeks = Math.max(1, Math.ceil((endTime - startTime) / (7 * 86400000)));
      for (let w = 0; w < numWeeks; w++) {
        const wDate = new Date(startTime + w * 7 * 86400000);
        const wStartMs = wDate.getTime();
        const wEndMs = wStartMs + 7 * 86400000 - 1;

        const completedCount = completedAdmissions.filter(item => {
          const t = item.adm.completedAt ? new Date(item.adm.completedAt).getTime() : new Date(item.adm.updatedAt || item.adm.createdAt).getTime();
          return t >= wStartMs && t <= wEndMs;
        }).length;

        evolutionPoints.push({
          label: `Semana ${w + 1}`,
          date: wDate.toISOString().split('T')[0],
          pendings: totalPendingsCount,
          rejections: Math.round(rejectedDocsCount / numWeeks),
          resends: Math.round(resentDocsCount / numWeeks),
          stalled: stalledAdmissions.filter(s => s.stalledDays >= 1).length,
          completed: completedCount
        });
      }
    } else {
      const startD = new Date(startTime);
      const endD = new Date(endTime);
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      let cur = new Date(startD.getFullYear(), startD.getMonth(), 1);

      while (cur.getTime() <= endD.getTime()) {
        const mStart = new Date(cur.getFullYear(), cur.getMonth(), 1, 0, 0, 0, 0).getTime();
        const mEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

        const completedCount = completedAdmissions.filter(item => {
          const t = item.adm.completedAt ? new Date(item.adm.completedAt).getTime() : new Date(item.adm.updatedAt || item.adm.createdAt).getTime();
          return t >= mStart && t <= mEnd;
        }).length;

        evolutionPoints.push({
          label: `${months[cur.getMonth()]}/${String(cur.getFullYear()).slice(2)}`,
          date: cur.toISOString().split('T')[0],
          pendings: totalPendingsCount,
          rejections: rejectedDocsCount,
          resends: resentDocsCount,
          stalled: stalledAdmissions.filter(s => s.stalledDays >= 1).length,
          completed: completedCount
        });

        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      }
    }

    // 11. ANÁLISES DESCRITIVAS POR DIMENSÃO (CARGO, UNIDADE, SETOR)
    const buildDimensionBreakdown = (extractor: (adm: Admission) => string): BottleneckDimensionItem[] => {
      const map = new Map<string, { total: number; completedDurations: number[]; pendings: number; rejections: number; stalled: number }>();

      for (const item of evaluated) {
        const key = extractor(item.adm) || 'Não especificado';
        const entry = map.get(key) || { total: 0, completedDurations: [], pendings: 0, rejections: 0, stalled: 0 };
        entry.total++;

        // Concluídas
        if (item.adm.status === 'Concluída') {
          const compT = item.adm.completedAt ? new Date(item.adm.completedAt).getTime() : new Date(item.adm.updatedAt).getTime();
          const startT = new Date(item.adm.createdAt).getTime();
          if (compT >= startT) entry.completedDurations.push(compT - startT);
        }

        // Pendências e Rejeições
        for (const doc of (item.adm.documents || [])) {
          if (doc.required && (!doc.status || doc.status === 'Não enviado')) entry.pendings++;
          if (doc.status === 'Rejeitado') {
            entry.pendings++;
            entry.rejections++;
          }
        }

        // Sem movimentação
        if (stalledAdmissions.some(sa => sa.id === item.adm.id && sa.stalledDays >= 1)) {
          entry.stalled++;
        }

        map.set(key, entry);
      }

      return Array.from(map.entries()).map(([name, data]) => {
        const avgDays = data.completedDurations.length > 0 
          ? Math.round((data.completedDurations.reduce((a, b) => a + b, 0) / data.completedDurations.length / 86400000) * 10) / 10 
          : null;
        return {
          name,
          sampleCount: data.total,
          avgCompletionDays: avgDays,
          pendingsCount: data.pendings,
          rejectionsCount: data.rejections,
          stalledCount: data.stalled
        };
      }).sort((a, b) => b.sampleCount - a.sampleCount);
    };

    const byRole = buildDimensionBreakdown(a => a.employee?.role || 'Não informado');
    const byUnit = buildDimensionBreakdown(a => a.employee?.unit || 'Matriz');
    const byDepartment = buildDimensionBreakdown(a => a.employee?.department || 'Geral');

    // 12. PONTOS DE ATENÇÃO OBJETIVOS (LINGUAGEM NEUTRA E DESCRITIVA)
    const attentionPoints: BottleneckAttentionPoint[] = [];

    const stalledOver3Days = stalledAdmissions.filter(s => s.stalledDays >= 3);
    if (stalledOver3Days.length > 0) {
      attentionPoints.push({
        id: 'pt-stalled',
        type: 'stalled',
        title: 'Admissões ativas sem movimentação recente',
        description: `${stalledOver3Days.length} admissões ativas estão sem movimentação registrada há 3 dias ou mais.`,
        count: stalledOver3Days.length
      });
    }

    if (slowestStepName && slowestStepAvgDays !== null) {
      attentionPoints.push({
        id: 'pt-slowest-step',
        type: 'step_time',
        title: 'Etapa com maior tempo médio observado',
        description: `A etapa "${slowestStepName}" registrou o maior tempo médio entre as etapas concluídas (${slowestStepAvgDays} dias).`,
        count: slowestStepAvgDays
      });
    }

    if (rejectionsByReason.length > 0) {
      const topReason = rejectionsByReason[0];
      attentionPoints.push({
        id: 'pt-rejection',
        type: 'rejection',
        title: 'Motivo com maior frequência de rejeição',
        description: `O motivo "${topReason.reason}" concentrou ${topReason.count} ocorrência(s) de recusa (${topReason.percent}% do total de rejeições).`,
        count: topReason.count
      });
    }

    if (waitingResendCount > 0) {
      attentionPoints.push({
        id: 'pt-resend',
        type: 'resend',
        title: 'Documentos aguardando novo envio',
        description: `${waitingResendCount} documento(s) com status de recusa ainda aguardam upload de nova versão pelo colaborador.`,
        count: waitingResendCount
      });
    }

    if (pendingApprovalsCount > 0) {
      attentionPoints.push({
        id: 'pt-approval',
        type: 'approval',
        title: 'Processos na fila de aprovação interna',
        description: `${pendingApprovalsCount} processo(s) estão aguardando parecer formal de alçada de gestão ou diretoria.`,
        count: pendingApprovalsCount
      });
    }

    if (delayedCount > 0) {
      attentionPoints.push({
        id: 'pt-delay',
        type: 'delay',
        title: 'Admissões com prazo de início ultrapassado',
        description: `${delayedCount} processo(s) em andamento possuem data prevista de início anterior à data atual.`,
        count: delayedCount
      });
    }

    if (blockedItems.length > 0) {
      attentionPoints.push({
        id: 'pt-blocked',
        type: 'blocked',
        title: 'Etapas com bloqueio operacional registrado',
        description: `${blockedItems.length} processo(s) apresentam etapa bloqueada necessitando de resolução interna.`,
        count: blockedItems.length
      });
    }

    // CARDS PRINCIPAIS
    const mainCards: BottleneckMainCards = {
      stalledAdmissionsCount: stalledAdmissions.filter(s => s.stalledDays >= 1).length,
      maxStalledFormatted,
      avgProcessDays,
      slowestStepName,
      slowestStepAvgDays,
      rejectedDocsCount,
      resentDocsCount,
      pendingApprovalsCount,
      delayedCount
    };

    return {
      periodLabel,
      dateRange: {
        start: new Date(startTime).toISOString(),
        end: new Date(endTime).toISOString()
      },
      mainCards,
      attentionPoints,
      stepMetrics,
      stalledAdmissions,
      totalStalled: stalledAdmissions.length,
      pendingsByType,
      rejectionsByReason,
      rejectionsByDocType,
      resentMetrics,
      reviewTimeMetrics,
      approvals,
      blockedMetrics,
      reopenedMetrics,
      evolution: evolutionPoints,
      evolutionGrouping,
      byRole,
      byUnit,
      byDepartment,
      availableFilters: {
        roles: Array.from(rolesSet).sort(),
        departments: Array.from(departmentsSet).sort(),
        units: Array.from(unitsSet).sort(),
        statuses: Array.from(statusesSet),
        situations: [
          { key: 'TODAS', label: 'Todas as Situações' },
          { key: 'AGUARDANDO_FUNCIONARIO', label: 'Aguardando Funcionário' },
          { key: 'AGUARDANDO_RH', label: 'Aguardando RH' },
          { key: 'COM_PENDENCIA', label: 'Com Pendência' },
          { key: 'APROVACAO_PENDENTE', label: 'Aprovação Pendente' },
          { key: 'PROXIMA_DO_PRAZO', label: 'Próxima do Prazo' },
          { key: 'ATRASADA', label: 'Atrasada' },
          { key: 'BLOQUEADA', label: 'Bloqueada' },
          { key: 'EM_DIA', label: 'Em Dia' }
        ],
        responsibles: Array.from(responsiblesSet).sort()
      }
    };
  }

  // =========================================================================
  // BLOCO 6.4: GESTÃO DE RESPONSÁVEIS E DISTRIBUIÇÃO DE TRABALHO
  // =========================================================================

  /**
   * Atribui, altera ou remove o responsável principal de uma admissão
   */
  assignAdmissionResponsible(
    admissionId: string,
    responsibleUserId: string | null,
    reason?: string,
    assignedBy: string = 'RH',
    versionTimestamp?: string
  ): { admission: Admission; historyItem: AdmissionAssignmentHistoryItem } {
    const admission = this.data.admissions.find(a => a.id === admissionId);
    if (!admission) {
      throw new Error(`Admissão com id "${admissionId}" não encontrada.`);
    }

    // Controle de concorrência
    if (versionTimestamp && admission.updatedAt) {
      const currentUpdated = new Date(admission.updatedAt).getTime();
      const clientVersion = new Date(versionTimestamp).getTime();
      if (currentUpdated > clientVersion) {
        throw new Error('Esta admissão foi alterada por outro usuário recentemente. Por favor recarregue os dados antes de prosseguir.');
      }
    }

    if (!admission.assignmentsHistory) {
      admission.assignmentsHistory = [];
    }

    const previousUserId = admission.responsibleUserId;
    const previousUserName = admission.responsibleUserName;
    const nowIso = new Date().toISOString();

    let action: AssignmentActionType = 'ASSIGNED';

    if (!responsibleUserId) {
      // Remoção de responsável
      if (!previousUserId && !previousUserName) {
        const emptyItem: AdmissionAssignmentHistoryItem = {
          id: 'asgn-' + crypto.randomUUID().slice(0, 8),
          admissionId: admission.id,
          action: 'REMOVED',
          previousUserId,
          previousUserName,
          assignedByUserName: assignedBy,
          assignedAt: nowIso,
          reason: reason || 'Responsável removido'
        };
        return { admission, historyItem: emptyItem };
      }

      action = 'REMOVED';
      admission.responsibleUserId = undefined;
      admission.responsibleUserName = undefined;
      admission.responsibleUserEmail = undefined;
      admission.assignedAt = undefined;
      admission.assignedBy = undefined;
      admission.assignmentReason = reason;

      const historyItem: AdmissionAssignmentHistoryItem = {
        id: 'asgn-' + crypto.randomUUID().slice(0, 8),
        admissionId: admission.id,
        action: 'REMOVED',
        previousUserId,
        previousUserName,
        assignedByUserName: assignedBy,
        assignedAt: nowIso,
        reason: reason || 'Responsável removido'
      };

      admission.assignmentsHistory.push(historyItem);
      admission.updatedAt = nowIso;

      this.addAuditLog({
        action: 'admission_assignment_removed',
        entityType: 'admission_assignment',
        entityId: admission.id,
        entityName: admission.employee?.name,
        admissionId: admission.id,
        employeeName: admission.employee?.name,
        fieldChanged: 'responsibleUserId',
        previousValue: previousUserName,
        newValue: 'Sem responsável',
        details: `Responsável ${previousUserName} removido da admissão por ${assignedBy}.${reason ? ` Motivo: "${reason}".` : ''}`,
        userName: assignedBy
      });

      this.save();
      return { admission, historyItem };
    }

    // Validação do novo usuário
    const targetUser = this.data.users.find(u => u.id === responsibleUserId || u.email.toLowerCase() === responsibleUserId.toLowerCase());
    if (!targetUser) {
      throw new Error(`Usuário responsável com identificador "${responsibleUserId}" não encontrado.`);
    }

    // Regra: Responsável inativo não pode receber atribuições
    if (targetUser.active === false) {
      throw new Error(`O usuário "${targetUser.name}" está inativo e não pode receber novas atribuições operacionais.`);
    }

    // Regra: Apenas perfis autorizados de RH / Gestão
    const allowedRoles = ['RH', 'ADMIN', 'RH_CONFERENCIA', 'GESTOR'];
    if (!allowedRoles.includes(targetUser.role)) {
      throw new Error(`O perfil "${targetUser.role}" não possui permissão para assumir a responsabilidade de admissões.`);
    }

    action = previousUserId ? 'REASSIGNED' : 'ASSIGNED';

    admission.responsibleUserId = targetUser.id;
    admission.responsibleUserName = targetUser.name;
    admission.responsibleUserEmail = targetUser.email;
    admission.assignedAt = nowIso;
    admission.assignedBy = assignedBy;
    admission.assignmentReason = reason;

    const historyItem: AdmissionAssignmentHistoryItem = {
      id: 'asgn-' + crypto.randomUUID().slice(0, 8),
      admissionId: admission.id,
      action,
      previousUserId,
      previousUserName,
      newUserId: targetUser.id,
      newUserName: targetUser.name,
      assignedByUserName: assignedBy,
      assignedAt: nowIso,
      reason
    };

    admission.assignmentsHistory.push(historyItem);
    admission.updatedAt = nowIso;

    this.addAuditLog({
      action: action === 'REASSIGNED' ? 'admission_reassigned' : 'admission_assigned',
      entityType: 'admission_assignment',
      entityId: admission.id,
      entityName: admission.employee?.name,
      admissionId: admission.id,
      employeeName: admission.employee?.name,
      fieldChanged: 'responsibleUserId',
      previousValue: previousUserName || 'Sem responsável',
      newValue: targetUser.name,
      details: action === 'REASSIGNED'
        ? `Admissão transferida de ${previousUserName || 'Sem responsável'} para ${targetUser.name} por ${assignedBy}.${reason ? ` Motivo: "${reason}".` : ''}`
        : `Admissão atribuída para ${targetUser.name} por ${assignedBy}.${reason ? ` Motivo: "${reason}".` : ''}`,
      userName: assignedBy
    });

    this.save();
    return { admission, historyItem };
  }

  /**
   * Atribui, altera ou remove o responsável de uma etapa específica
   */
  assignStepResponsible(
    admissionId: string,
    stepKey: string,
    responsibleUserId: string | null,
    reason?: string,
    assignedBy: string = 'RH',
    versionTimestamp?: string
  ): { admission: Admission; historyItem: AdmissionAssignmentHistoryItem } {
    const admission = this.data.admissions.find(a => a.id === admissionId);
    if (!admission) {
      throw new Error(`Admissão com id "${admissionId}" não encontrada.`);
    }

    if (versionTimestamp && admission.updatedAt) {
      const currentUpdated = new Date(admission.updatedAt).getTime();
      const clientVersion = new Date(versionTimestamp).getTime();
      if (currentUpdated > clientVersion) {
        throw new Error('Esta admissão foi alterada por outro usuário recentemente. Por favor recarregue os dados antes de prosseguir.');
      }
    }

    if (!admission.processSteps || admission.processSteps.length === 0) {
      throw new Error('Esta admissão não possui etapas operacionais configuradas.');
    }

    const step = admission.processSteps.find(s => s.stepKey === stepKey || s.id === stepKey);
    if (!step) {
      throw new Error(`Etapa com chave "${stepKey}" não encontrada na admissão.`);
    }

    if (!admission.assignmentsHistory) {
      admission.assignmentsHistory = [];
    }

    const previousUserId = step.responsibleUserId;
    const previousUserName = step.responsibleUserName;
    const nowIso = new Date().toISOString();

    let action: AssignmentActionType = 'ASSIGNED';

    if (!responsibleUserId) {
      action = 'REMOVED';
      step.responsibleUserId = undefined;
      step.responsibleUserName = undefined;
      step.responsibleUserEmail = undefined;
      step.stepAssignedAt = undefined;
      step.stepAssignedBy = undefined;
      step.stepAssignmentReason = reason;

      const historyItem: AdmissionAssignmentHistoryItem = {
        id: 'asgn-step-' + crypto.randomUUID().slice(0, 8),
        admissionId: admission.id,
        stepKey: step.stepKey,
        stepName: step.stepName,
        action: 'REMOVED',
        previousUserId,
        previousUserName,
        assignedByUserName: assignedBy,
        assignedAt: nowIso,
        reason: reason || `Responsável removido da etapa ${step.stepName}`
      };

      admission.assignmentsHistory.push(historyItem);
      admission.updatedAt = nowIso;

      this.addAuditLog({
        action: 'step_assignment_removed',
        entityType: 'admission_process_step',
        entityId: step.id,
        entityName: step.stepName,
        admissionId: admission.id,
        employeeName: admission.employee?.name,
        details: `Responsável ${previousUserName || 'Indefinido'} removido da etapa "${step.stepName}" por ${assignedBy}.${reason ? ` Motivo: "${reason}".` : ''}`,
        userName: assignedBy
      });

      this.save();
      return { admission, historyItem };
    }

    const targetUser = this.data.users.find(u => u.id === responsibleUserId || u.email.toLowerCase() === responsibleUserId.toLowerCase());
    if (!targetUser) {
      throw new Error(`Usuário responsável com identificador "${responsibleUserId}" não encontrado.`);
    }

    if (targetUser.active === false) {
      throw new Error(`O usuário "${targetUser.name}" está inativo e não pode receber atribuição de etapas.`);
    }

    const allowedRoles = ['RH', 'ADMIN', 'RH_CONFERENCIA', 'GESTOR'];
    if (!allowedRoles.includes(targetUser.role)) {
      throw new Error(`O perfil "${targetUser.role}" não possui permissão para assumir etapas operacionais.`);
    }

    action = previousUserId ? 'REASSIGNED' : 'ASSIGNED';

    step.responsibleUserId = targetUser.id;
    step.responsibleUserName = targetUser.name;
    step.responsibleUserEmail = targetUser.email;
    step.stepAssignedAt = nowIso;
    step.stepAssignedBy = assignedBy;
    step.stepAssignmentReason = reason;

    const historyItem: AdmissionAssignmentHistoryItem = {
      id: 'asgn-step-' + crypto.randomUUID().slice(0, 8),
      admissionId: admission.id,
      stepKey: step.stepKey,
      stepName: step.stepName,
      action,
      previousUserId,
      previousUserName,
      newUserId: targetUser.id,
      newUserName: targetUser.name,
      assignedByUserName: assignedBy,
      assignedAt: nowIso,
      reason
    };

    admission.assignmentsHistory.push(historyItem);
    admission.updatedAt = nowIso;

    this.addAuditLog({
      action: action === 'REASSIGNED' ? 'step_reassigned' : 'step_assigned',
      entityType: 'admission_process_step',
      entityId: step.id,
      entityName: step.stepName,
      admissionId: admission.id,
      employeeName: admission.employee?.name,
      details: action === 'REASSIGNED'
        ? `Etapa "${step.stepName}" transferida de ${previousUserName || 'Sem responsável'} para ${targetUser.name} por ${assignedBy}.${reason ? ` Motivo: "${reason}".` : ''}`
        : `Etapa "${step.stepName}" atribuída para ${targetUser.name} por ${assignedBy}.${reason ? ` Motivo: "${reason}".` : ''}`,
      userName: assignedBy
    });

    this.save();
    return { admission, historyItem };
  }

  /**
   * Retorna o histórico de atribuições de uma admissão
   */
  getAdmissionAssignments(admissionId: string): AdmissionAssignmentHistoryItem[] {
    const admission = this.data.admissions.find(a => a.id === admissionId);
    if (!admission) {
      throw new Error(`Admissão com id "${admissionId}" não encontrada.`);
    }
    return admission.assignmentsHistory || [];
  }

  /**
   * Consulta agregada e detalhada de Distribuição de Trabalho e Cargas (Bloco 6.4)
   */
  getWorkDistributionData(options: WorkDistributionFilters & { currentUserId?: string } = {}): WorkDistributionResponse {
    // 1. Processar todas as admissões avaliando etapas e situações operacionais
    const hubData = this.getOperationalHubData({ limit: 1000, page: 1 });
    const allHubItems = hubData.items || [];

    // Admissões ativas (exclui canceladas e concluídas do pool de trabalho operacional)
    const activeHubItems = allHubItems.filter(item => item.status !== 'Cancelada' && item.status !== 'Concluída');

    // 2. Coletar usuários elegíveis de RH
    const eligibleRoles = ['RH', 'ADMIN', 'RH_CONFERENCIA', 'GESTOR'];
    const eligibleUsers = this.data.users.filter(u => eligibleRoles.includes(u.role));

    // Determinar usuário atual (padrão Mariana se não especificado)
    const currentUserId = options.currentUserId || eligibleUsers.find(u => u.name === 'Mariana Silveira')?.id || eligibleUsers[0]?.id;

    // 3. Montar WorkDistributionItems
    const rawItems: WorkDistributionItem[] = activeHubItems.map(item => {
      const isMyAdmission = Boolean(item.admissionResponsibleId && item.admissionResponsibleId === currentUserId);
      const isMyStep = Boolean(item.stepResponsibleId && item.stepResponsibleId === currentUserId);

      return {
        admissionId: item.id,
        admissionCode: item.admissionCode,
        employeeId: item.employeeId,
        employeeName: item.employeeName,
        employeeCpfMasked: item.employeeCpfMasked,
        employeeRole: item.employeeRole,
        employeeDepartment: item.employeeDepartment,
        employeeUnit: item.employeeUnit,
        status: item.status,
        situation: item.situation,
        situationLabel: item.situationLabel,
        priority: item.priority,
        currentStepKey: item.currentStepKey,
        currentStepName: item.currentStepName,
        currentStepOrder: item.currentStepOrder,
        totalSteps: item.totalSteps,
        currentStepStatus: item.currentStepStatus,
        admissionResponsibleId: item.admissionResponsibleId,
        admissionResponsibleName: item.admissionResponsibleName || 'Sem responsável',
        stepResponsibleId: item.stepResponsibleId,
        stepResponsibleName: item.stepResponsibleName || item.currentStepResponsible,
        isMyAssignment: isMyAdmission,
        isMyStepAssignment: isMyStep,
        expectedStartDate: item.expectedStartDate,
        createdAt: item.createdAt,
        lastMovementAt: item.lastActivityAt,
        daysSinceCreation: item.daysSinceCreation,
        daysWithoutMovement: item.daysWithoutMovement,
        activePendingsCount: item.activePendingsCount,
        hasApproval: item.hasApproval,
        approvalStatus: item.approvalStatus
      };
    });

    // 4. Calcular Cargas de Trabalho por Usuário
    const distributionByResponsible: WorkloadByResponsibleItem[] = eligibleUsers.map(user => {
      // Admissões ativas atribuídas ao usuário
      const assignedAdmissions = rawItems.filter(i => i.admissionResponsibleId === user.id);
      
      // Etapas ativas não concluídas atribuídas ao usuário
      const assignedSteps = rawItems.filter(i => i.stepResponsibleId === user.id && i.currentStepStatus !== 'CONCLUIDA');
      
      // Pendências ativas nas admissões sob sua responsabilidade
      const activePendings = assignedAdmissions.reduce((acc, curr) => acc + curr.activePendingsCount, 0);

      // Aprovações pendentes atribuídas
      const pendingApprovals = assignedAdmissions.filter(i => i.hasApproval && (i.approvalStatus === 'PENDENTE' || i.approvalStatus === 'EM_ANALISE')).length;

      // Última movimentação observada
      let latestMovement: string | undefined;
      for (const adm of assignedAdmissions) {
        if (!latestMovement || new Date(adm.lastMovementAt).getTime() > new Date(latestMovement).getTime()) {
          latestMovement = adm.lastMovementAt;
        }
      }

      // Total ponderado de itens operacionais sob sua responsabilidade
      const totalWorkload = assignedAdmissions.length + assignedSteps.length + activePendings + pendingApprovals;

      return {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        department: user.department || 'Recursos Humanos',
        active: user.active !== false,
        admissionsCount: assignedAdmissions.length,
        pendingStepsCount: assignedSteps.length,
        activePendingsCount: activePendings,
        pendingApprovalsCount: pendingApprovals,
        totalWorkload,
        lastMovementAt: latestMovement
      };
    });

    // Ordenar distribuição (padrão: maior carga primeiro)
    distributionByResponsible.sort((a, b) => b.totalWorkload - a.totalWorkload);

    // 5. Calcular Cards Operacionais
    const totalAssigned = rawItems.filter(i => Boolean(i.admissionResponsibleId) && i.admissionResponsibleName !== 'Sem responsável').length;
    const unassignedItems = rawItems.filter(i => !i.admissionResponsibleId || i.admissionResponsibleName === 'Sem responsável');
    const unassignedCount = unassignedItems.length;
    const myQueueItems = rawItems.filter(i => i.isMyAssignment || i.isMyStepAssignment);
    const myQueueCount = myQueueItems.length;

    const assignedUserIds = new Set<string>();
    rawItems.forEach(i => {
      if (i.admissionResponsibleId && i.admissionResponsibleName !== 'Sem responsável') assignedUserIds.add(i.admissionResponsibleId);
      if (i.stepResponsibleId && i.stepResponsibleName !== 'Sem responsável') assignedUserIds.add(i.stepResponsibleId);
    });
    const usersWithAssignmentsCount = assignedUserIds.size;
    const activeProcessesCount = rawItems.length;

    const cards: WorkDistributionCards = {
      totalAssigned,
      unassignedCount,
      myQueueCount,
      usersWithAssignmentsCount,
      activeProcessesCount
    };

    // 6. Aplicar Filtros aos Items
    let filteredItems = [...rawItems];

    if (options.viewMode === 'minha_fila') {
      filteredItems = filteredItems.filter(i => i.isMyAssignment || i.isMyStepAssignment);
    } else if (options.viewMode === 'sem_responsavel') {
      filteredItems = filteredItems.filter(i => !i.admissionResponsibleId || i.admissionResponsibleName === 'Sem responsável');
    }

    if (options.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      filteredItems = filteredItems.filter(i =>
        i.employeeName.toLowerCase().includes(q) ||
        i.admissionCode.toLowerCase().includes(q) ||
        i.employeeRole.toLowerCase().includes(q) ||
        i.employeeDepartment.toLowerCase().includes(q) ||
        i.employeeUnit.toLowerCase().includes(q) ||
        i.admissionResponsibleName.toLowerCase().includes(q) ||
        i.stepResponsibleName.toLowerCase().includes(q)
      );
    }

    if (options.responsible && options.responsible !== 'TODOS' && options.responsible !== 'all') {
      const resp = options.responsible.trim();
      if (resp === 'SEM_RESPONSAVEL' || resp === 'Sem responsável' || resp === 'sem_responsavel') {
        filteredItems = filteredItems.filter(i => !i.admissionResponsibleId || i.admissionResponsibleName === 'Sem responsável');
      } else {
        filteredItems = filteredItems.filter(i =>
          i.admissionResponsibleId === resp ||
          i.admissionResponsibleName?.toLowerCase() === resp.toLowerCase() ||
          i.stepResponsibleId === resp ||
          i.stepResponsibleName?.toLowerCase() === resp.toLowerCase()
        );
      }
    }

    if (options.stepKey && options.stepKey !== 'TODAS' && options.stepKey !== 'all') {
      filteredItems = filteredItems.filter(i => i.currentStepKey === options.stepKey);
    }

    if (options.situation && options.situation !== 'TODAS' && options.situation !== 'all') {
      filteredItems = filteredItems.filter(i => i.situation === options.situation);
    }

    if (options.priority && options.priority !== 'TODAS' && options.priority !== 'all') {
      filteredItems = filteredItems.filter(i => i.priority === options.priority);
    }

    if (options.unit && options.unit !== 'TODAS' && options.unit !== 'all') {
      filteredItems = filteredItems.filter(i => i.employeeUnit === options.unit);
    }

    if (options.department && options.department !== 'TODOS' && options.department !== 'all') {
      filteredItems = filteredItems.filter(i => i.employeeDepartment === options.department);
    }

    if (options.role && options.role !== 'TODOS' && options.role !== 'all') {
      filteredItems = filteredItems.filter(i => i.employeeRole === options.role);
    }

    // 7. Ordenação
    const sortBy = options.sortBy || 'priority';
    const sortOrder = options.sortOrder || 'asc';

    filteredItems.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'priority') {
        const orderMap: Record<string, number> = { CRITICA: 1, ALTA: 2, NORMAL: 3 };
        comparison = (orderMap[a.priority] || 3) - (orderMap[b.priority] || 3);
      } else if (sortBy === 'admissions') {
        comparison = a.admissionCode.localeCompare(b.admissionCode);
      } else if (sortBy === 'lastMovement') {
        comparison = new Date(b.lastMovementAt).getTime() - new Date(a.lastMovementAt).getTime();
      } else if (sortBy === 'pendings') {
        comparison = b.activePendingsCount - a.activePendingsCount;
      } else if (sortBy === 'name') {
        comparison = a.employeeName.localeCompare(b.employeeName);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // 8. Paginação
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 ? options.limit : 20;
    const total = filteredItems.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paginatedItems = filteredItems.slice((page - 1) * limit, page * limit);

    // 9. Opções de Filtro
    const unitsSet = new Set<string>();
    const departmentsSet = new Set<string>();
    const rolesSet = new Set<string>();
    const stepsMap = new Map<string, string>();
    const responsiblesSet = new Set<string>();

    rawItems.forEach(i => {
      if (i.employeeUnit) unitsSet.add(i.employeeUnit);
      if (i.employeeDepartment) departmentsSet.add(i.employeeDepartment);
      if (i.employeeRole) rolesSet.add(i.employeeRole);
      if (i.currentStepKey) stepsMap.set(i.currentStepKey, i.currentStepName);
      if (i.admissionResponsibleName && i.admissionResponsibleName !== 'Sem responsável') {
        responsiblesSet.add(i.admissionResponsibleName);
      }
      if (i.stepResponsibleName && i.stepResponsibleName !== 'Sem responsável') {
        responsiblesSet.add(i.stepResponsibleName);
      }
    });

    eligibleUsers.forEach(u => {
      if (u.active !== false) {
        responsiblesSet.add(u.name);
      }
    });
    responsiblesSet.add('Sem responsável');

    return {
      cards,
      distributionByResponsible,
      items: paginatedItems,
      unassignedItems,
      myQueueItems,
      total,
      page,
      limit,
      totalPages,
      filters: {
        users: eligibleUsers.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department,
          active: u.active !== false
        })),
        units: Array.from(unitsSet).sort(),
        departments: Array.from(departmentsSet).sort(),
        roles: Array.from(rolesSet).sort(),
        steps: Array.from(stepsMap.entries()).map(([stepKey, stepName]) => ({ stepKey, stepName })),
        situations: [
          { key: 'TODAS', label: 'Todas as Situações' },
          { key: 'EM_DIA', label: 'Em Dia' },
          { key: 'AGUARDANDO_RH', label: 'Aguardando RH' },
          { key: 'AGUARDANDO_FUNCIONARIO', label: 'Aguardando Funcionário' },
          { key: 'COM_PENDENCIA', label: 'Com Pendência' },
          { key: 'APROVACAO_PENDENTE', label: 'Aprovação Pendente' },
          { key: 'PROXIMA_DO_PRAZO', label: 'Próxima do Prazo' },
          { key: 'ATRASADA', label: 'Atrasada' },
          { key: 'BLOQUEADA', label: 'Bloqueada' }
        ],
        priorities: ['CRITICA', 'ALTA', 'NORMAL'],
        responsibles: Array.from(responsiblesSet).sort()
      }
    };
  }

  // =========================================================================
  // BLOCO 6.5: TAREFAS OPERACIONAIS DO RH - MÉTODOS DE NEGÓCIO
  // =========================================================================

  /**
   * Criação de Tarefa Operacional vinculada obrigatoriamente a uma Admissão
   */
  createOperationalTask(
    input: CreateOperationalTaskInput,
    creatorUser: { id?: string; name: string; email?: string }
  ): OperationalTask {
    const admission = this.data.admissions.find(a => a.id === input.admissionId);
    if (!admission) {
      throw new Error(`Admissão com id "${input.admissionId}" não encontrada.`);
    }

    const title = (input.title || '').trim();
    if (!title || title.length < 3) {
      throw new Error('O título da tarefa é obrigatório e deve ter no mínimo 3 caracteres.');
    }
    if (title.length > 150) {
      throw new Error('O título da tarefa não pode exceder 150 caracteres.');
    }

    const allowedPriorities: OperationalPriority[] = ['NORMAL', 'ALTA', 'CRITICA'];
    const priority = allowedPriorities.includes(input.priority) ? input.priority : 'NORMAL';

    // Tratar prazo operacional (dueAt)
    let dueAt: string | null = null;
    if (input.dueAt) {
      const parsedDate = new Date(input.dueAt);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('O prazo informado não é uma data válida.');
      }
      dueAt = parsedDate.toISOString();
    }

    // Tratar responsável operacional (reutilizando mecanismo 6.4)
    let responsibleUserId: string | null = null;
    let responsibleUserName: string | undefined = undefined;
    let responsibleUserEmail: string | undefined = undefined;
    let assignedAt: string | undefined = undefined;
    let assignedBy: string | undefined = undefined;

    if (input.responsibleUserId && input.responsibleUserId.trim() !== '') {
      const targetUser = this.data.users.find(
        u => u.id === input.responsibleUserId || u.email.toLowerCase() === input.responsibleUserId?.toLowerCase()
      );
      if (!targetUser) {
        throw new Error(`Usuário responsável "${input.responsibleUserId}" não encontrado.`);
      }
      if (targetUser.active === false) {
        throw new Error(`O usuário "${targetUser.name}" está inativo e não pode receber novas tarefas.`);
      }
      const allowedRoles = ['RH', 'ADMIN', 'RH_CONFERENCIA', 'GESTOR'];
      if (!allowedRoles.includes(targetUser.role)) {
        throw new Error(`O perfil "${targetUser.role}" não possui autorização para assumir tarefas operacionais.`);
      }

      responsibleUserId = targetUser.id;
      responsibleUserName = targetUser.name;
      responsibleUserEmail = targetUser.email;
      assignedAt = new Date().toISOString();
      assignedBy = creatorUser.name;
    }

    // Tratar origem operacional
    const sourceType: OperationalTaskSourceType = input.sourceType || 'ADMISSAO';
    let documentName: string | undefined = undefined;
    if (input.documentId) {
      const doc = admission.documents?.find(d => d.id === input.documentId);
      if (doc) {
        documentName = typeof doc.documentType === 'string' ? doc.documentType : doc.document_type_name;
      }
    }

    let stepName: string | undefined = undefined;
    if (input.stepKey) {
      const step = admission.processSteps?.find(s => s.stepKey === input.stepKey);
      if (step) {
        stepName = step.stepName;
      }
    }

    const nowIso = new Date().toISOString();
    const taskId = 'task-' + crypto.randomUUID().slice(0, 8);
    const admissionCode = admission.id.replace('adm-', 'ADM-').slice(0, 10).toUpperCase();

    const history: OperationalTaskHistoryItem[] = [
      {
        id: 'th-' + crypto.randomUUID().slice(0, 8),
        taskId,
        action: 'CREATED',
        performedBy: creatorUser.name,
        performedByUserId: creatorUser.id,
        performedAt: nowIso,
        newStatus: 'PENDENTE',
        notes: `Tarefa criada a partir de ${sourceType}${input.sourceDescription ? `: ${input.sourceDescription}` : ''}`
      }
    ];

    if (responsibleUserId && responsibleUserName) {
      history.push({
        id: 'th-' + crypto.randomUUID().slice(0, 8),
        taskId,
        action: 'ASSIGNED',
        performedBy: creatorUser.name,
        performedByUserId: creatorUser.id,
        performedAt: nowIso,
        newUserId: responsibleUserId,
        newUserName: responsibleUserName,
        notes: `Atribuída diretamente na criação`
      });
    }

    const task: OperationalTask = {
      id: taskId,
      tenantId: 'tenant-default',
      admissionId: admission.id,
      admissionCode,
      employeeId: admission.employeeId,
      employeeName: admission.employee.name,
      employeeCpfMasked: maskCPF(admission.employee.cpf),
      employeeRole: admission.employee.role,
      employeeDepartment: admission.employee.department,
      employeeUnit: admission.employee.unit,
      sourceType,
      sourceId: input.sourceId,
      sourceDescription: input.sourceDescription,
      stepKey: input.stepKey,
      stepName,
      documentId: input.documentId,
      documentName,
      approvalId: input.approvalId,
      title,
      description: input.description?.trim() || undefined,
      priority,
      status: 'PENDENTE',
      responsibleUserId,
      responsibleUserName,
      responsibleUserEmail,
      assignedAt,
      assignedBy,
      dueAt,
      isOverdue: dueAt ? new Date(dueAt).getTime() < Date.now() : false,
      createdBy: creatorUser.name,
      createdAt: nowIso,
      updatedAt: nowIso,
      history
    };

    if (!this.data.operationalTasks) {
      this.data.operationalTasks = [];
    }
    this.data.operationalTasks.unshift(task);

    // Registro de Auditoria Global (Bloco 5.7)
    this.addAuditLog({
      action: 'task_created',
      entityType: 'operational_task',
      entityId: task.id,
      entityName: task.title,
      admissionId: admission.id,
      employeeName: admission.employee.name,
      details: `Tarefa operacional "${task.title}" criada por ${creatorUser.name} [Prioridade: ${task.priority}${responsibleUserName ? `, Responsável: ${responsibleUserName}` : ', Sem responsável'}${dueAt ? `, Prazo: ${new Date(dueAt).toLocaleDateString('pt-BR')}` : ''}].`,
      userName: creatorUser.name
    });

    if (responsibleUserId && responsibleUserName) {
      this.addAuditLog({
        action: 'task_assigned',
        entityType: 'operational_task',
        entityId: task.id,
        entityName: task.title,
        admissionId: admission.id,
        employeeName: admission.employee.name,
        details: `Tarefa "${task.title}" atribuída para ${responsibleUserName} por ${creatorUser.name}.`,
        userName: creatorUser.name
      });
    }

    this.save();
    return task;
  }

  /**
   * Consulta paginada e filtrada de Tarefas Operacionais do RH
   */
  getOperationalTasks(
    filters: OperationalTaskFilters & { currentUserId?: string; currentUserEmail?: string } = {}
  ): OperationalTasksResponse {
    if (!this.data.operationalTasks) {
      this.data.operationalTasks = [];
    }

    const now = Date.now();

    // 1. Atualizar flag isOverdue dinamicamente para todas as tarefas
    const allTasks = this.data.operationalTasks.map(t => {
      const isOverdue = t.dueAt
        ? new Date(t.dueAt).getTime() < now && t.status !== 'CONCLUIDA' && t.status !== 'CANCELADA'
        : false;
      return { ...t, isOverdue };
    });

    // 2. Resumo analítico global
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let blocked = 0;
    let cancelled = 0;
    let unassigned = 0;
    let myTasks = 0;
    let critical = 0;
    let overdue = 0;

    const currentUserId = filters.currentUserId || 'user-rh-01';

    allTasks.forEach(t => {
      if (t.status === 'PENDENTE') pending++;
      if (t.status === 'EM_ANDAMENTO') inProgress++;
      if (t.status === 'CONCLUIDA') completed++;
      if (t.status === 'BLOQUEADA') blocked++;
      if (t.status === 'CANCELADA') cancelled++;

      const isActive = t.status !== 'CONCLUIDA' && t.status !== 'CANCELADA';
      if (isActive && !t.responsibleUserId) unassigned++;
      if (isActive && t.responsibleUserId === currentUserId) myTasks++;
      if (isActive && t.priority === 'CRITICA') critical++;
      if (isActive && t.isOverdue) overdue++;
    });

    const summary: OperationalTaskSummary = {
      total: allTasks.length,
      pending,
      inProgress,
      completed,
      blocked,
      cancelled,
      unassigned,
      myTasks,
      critical,
      overdue
    };

    // 3. Aplicação dos filtros
    let filtered = [...allTasks];

    // Modo de visualização rápido
    if (filters.viewMode) {
      switch (filters.viewMode) {
        case 'minhas':
          filtered = filtered.filter(
            t => t.responsibleUserId === currentUserId && t.status !== 'CONCLUIDA' && t.status !== 'CANCELADA'
          );
          break;
        case 'sem_responsavel':
          filtered = filtered.filter(
            t => !t.responsibleUserId && t.status !== 'CONCLUIDA' && t.status !== 'CANCELADA'
          );
          break;
        case 'criticas':
          filtered = filtered.filter(
            t => t.priority === 'CRITICA' && t.status !== 'CONCLUIDA' && t.status !== 'CANCELADA'
          );
          break;
        case 'vencidas':
          filtered = filtered.filter(t => t.isOverdue);
          break;
        case 'concluidas':
          filtered = filtered.filter(t => t.status === 'CONCLUIDA');
          break;
        case 'todas':
        default:
          break;
      }
    }

    // Filtro de Status
    if (filters.status && filters.status !== 'TODOS' && filters.status !== 'all') {
      filtered = filtered.filter(t => t.status === filters.status);
    }

    // Filtro de Prioridade
    if (filters.priority && filters.priority !== 'TODAS' && filters.priority !== 'all') {
      filtered = filtered.filter(t => t.priority === filters.priority);
    }

    // Filtro de Responsável
    if (filters.responsible) {
      if (filters.responsible === 'sem_responsavel') {
        filtered = filtered.filter(t => !t.responsibleUserId);
      } else {
        filtered = filtered.filter(
          t => t.responsibleUserId === filters.responsible || t.responsibleUserName === filters.responsible
        );
      }
    }

    // Filtro de Origem
    if (filters.sourceType && filters.sourceType !== 'TODAS' && filters.sourceType !== 'all') {
      filtered = filtered.filter(t => t.sourceType === filters.sourceType);
    }

    // Filtro por Unidade
    if (filters.unit && filters.unit !== 'TODAS' && filters.unit !== 'all') {
      filtered = filtered.filter(t => t.employeeUnit === filters.unit);
    }

    // Filtro por Departamento
    if (filters.department && filters.department !== 'TODOS' && filters.department !== 'all') {
      filtered = filtered.filter(t => t.employeeDepartment === filters.department);
    }

    // Filtro por Admissão
    if (filters.admissionId) {
      filtered = filtered.filter(t => t.admissionId === filters.admissionId);
    }

    // Filtro por Funcionário
    if (filters.employeeId) {
      filtered = filtered.filter(t => t.employeeId === filters.employeeId);
    }

    // Busca Textual (Título, Descrição, Funcionário, CPF mascarado, Código de Admissão)
    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.trim().toLowerCase();
      filtered = filtered.filter(t => {
        return (
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          t.employeeName.toLowerCase().includes(q) ||
          t.admissionCode.toLowerCase().includes(q) ||
          (t.employeeCpfMasked && t.employeeCpfMasked.includes(q)) ||
          (t.documentName && t.documentName.toLowerCase().includes(q)) ||
          (t.stepName && t.stepName.toLowerCase().includes(q))
        );
      });
    }

    // 4. Ordenação
    const priorityWeight: Record<OperationalPriority, number> = {
      CRITICA: 3,
      ALTA: 2,
      NORMAL: 1
    };

    const sortBy = filters.sortBy || 'priority';
    const sortOrder = filters.sortOrder || 'desc';

    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'priority') {
        comparison = priorityWeight[a.priority] - priorityWeight[b.priority];
      } else if (sortBy === 'dueAt') {
        const timeA = a.dueAt ? new Date(a.dueAt).getTime() : 9999999999999;
        const timeB = b.dueAt ? new Date(b.dueAt).getTime() : 9999999999999;
        comparison = timeA - timeB;
      } else if (sortBy === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'updatedAt') {
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      } else if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === 'status') {
        comparison = a.status.localeCompare(b.status);
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // 5. Paginação
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paginatedItems = filtered.slice((page - 1) * limit, page * limit);

    // 6. Opções de Filtros para a UI
    const unitsSet = new Set<string>();
    const departmentsSet = new Set<string>();
    allTasks.forEach(t => {
      if (t.employeeUnit) unitsSet.add(t.employeeUnit);
      if (t.employeeDepartment) departmentsSet.add(t.employeeDepartment);
    });

    const eligibleUsers = this.data.users.filter(u =>
      ['RH', 'ADMIN', 'RH_CONFERENCIA', 'GESTOR'].includes(u.role)
    );

    return {
      summary,
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages,
      filters: {
        users: eligibleUsers.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department,
          active: u.active !== false
        })),
        sources: [
          { key: 'TODAS', label: 'Todas as origens' },
          { key: 'ADMISSAO', label: 'Admissão Geral' },
          { key: 'PENDENCIA', label: 'Central de Pendências' },
          { key: 'DOCUMENTO', label: 'Conferência Documental' },
          { key: 'ETAPA', label: 'Etapa do Processo' },
          { key: 'APROVACAO', label: 'Aprovação Interna' },
          { key: 'CHECKLIST', label: 'Checklist Operacional' },
          { key: 'COMUNICACAO', label: 'Comunicação' }
        ],
        units: Array.from(unitsSet).sort(),
        departments: Array.from(departmentsSet).sort(),
        statuses: [
          { key: 'TODOS', label: 'Todos os status' },
          { key: 'PENDENTE', label: 'Pendente' },
          { key: 'EM_ANDAMENTO', label: 'Em Andamento' },
          { key: 'BLOQUEADA', label: 'Bloqueada' },
          { key: 'CONCLUIDA', label: 'Concluída' },
          { key: 'CANCELADA', label: 'Cancelada' }
        ],
        priorities: ['CRITICA', 'ALTA', 'NORMAL']
      }
    };
  }

  /**
   * Busca Tarefa Operacional por ID
   */
  getOperationalTaskById(id: string): OperationalTask {
    if (!this.data.operationalTasks) {
      this.data.operationalTasks = [];
    }
    const task = this.data.operationalTasks.find(t => t.id === id);
    if (!task) {
      throw new Error(`Tarefa com identificador "${id}" não encontrada.`);
    }

    const now = Date.now();
    task.isOverdue = task.dueAt
      ? new Date(task.dueAt).getTime() < now && task.status !== 'CONCLUIDA' && task.status !== 'CANCELADA'
      : false;

    return task;
  }

  /**
   * Atribui, transfere ou desatribui responsável de uma tarefa operacional
   */
  assignOperationalTask(
    taskId: string,
    responsibleUserId: string | null,
    performer: { id?: string; name: string },
    reason?: string
  ): OperationalTask {
    const task = this.getOperationalTaskById(taskId);
    if (task.status === 'CONCLUIDA' || task.status === 'CANCELADA') {
      throw new Error(`Não é permitido alterar o responsável de uma tarefa ${task.status.toLowerCase()}. Reabra a tarefa primeiro.`);
    }

    const previousUserId = task.responsibleUserId || undefined;
    const previousUserName = task.responsibleUserName || undefined;
    const nowIso = new Date().toISOString();

    let action: OperationalTaskActionType = 'ASSIGNED';

    if (responsibleUserId === null || responsibleUserId.trim() === '') {
      // Desatribuição
      task.responsibleUserId = null;
      task.responsibleUserName = undefined;
      task.responsibleUserEmail = undefined;
      task.assignedAt = undefined;
      task.assignedBy = undefined;
      action = 'UNASSIGNED';

      task.history.push({
        id: 'th-' + crypto.randomUUID().slice(0, 8),
        taskId,
        action: 'UNASSIGNED',
        performedBy: performer.name,
        performedByUserId: performer.id,
        performedAt: nowIso,
        previousUserId,
        previousUserName,
        reason: reason || 'Responsável removido da tarefa',
        notes: reason
      });

      this.addAuditLog({
        action: 'task_unassigned',
        entityType: 'operational_task',
        entityId: task.id,
        entityName: task.title,
        admissionId: task.admissionId,
        employeeName: task.employeeName,
        details: `Responsável ${previousUserName || 'anterior'} removido da tarefa "${task.title}" por ${performer.name}.${reason ? ` Motivo: "${reason}".` : ''}`,
        userName: performer.name
      });
    } else {
      const targetUser = this.data.users.find(
        u => u.id === responsibleUserId || u.email.toLowerCase() === responsibleUserId.toLowerCase()
      );
      if (!targetUser) {
        throw new Error(`Usuário responsável "${responsibleUserId}" não encontrado.`);
      }
      if (targetUser.active === false) {
        throw new Error(`O usuário "${targetUser.name}" está inativo e não pode receber tarefas.`);
      }
      const allowedRoles = ['RH', 'ADMIN', 'RH_CONFERENCIA', 'GESTOR'];
      if (!allowedRoles.includes(targetUser.role)) {
        throw new Error(`O perfil "${targetUser.role}" não possui autorização para assumir tarefas operacionais.`);
      }

      action = previousUserId ? 'REASSIGNED' : 'ASSIGNED';

      task.responsibleUserId = targetUser.id;
      task.responsibleUserName = targetUser.name;
      task.responsibleUserEmail = targetUser.email;
      task.assignedAt = nowIso;
      task.assignedBy = performer.name;

      task.history.push({
        id: 'th-' + crypto.randomUUID().slice(0, 8),
        taskId,
        action,
        performedBy: performer.name,
        performedByUserId: performer.id,
        performedAt: nowIso,
        previousUserId,
        previousUserName,
        newUserId: targetUser.id,
        newUserName: targetUser.name,
        reason,
        notes: reason
      });

      this.addAuditLog({
        action: action === 'REASSIGNED' ? 'task_reassigned' : 'task_assigned',
        entityType: 'operational_task',
        entityId: task.id,
        entityName: task.title,
        admissionId: task.admissionId,
        employeeName: task.employeeName,
        details: action === 'REASSIGNED'
          ? `Tarefa "${task.title}" transferida de ${previousUserName || 'Sem responsável'} para ${targetUser.name} por ${performer.name}.${reason ? ` Motivo: "${reason}".` : ''}`
          : `Tarefa "${task.title}" atribuída para ${targetUser.name} por ${performer.name}.${reason ? ` Motivo: "${reason}".` : ''}`,
        userName: performer.name
      });
    }

    task.updatedAt = nowIso;
    this.save();
    return task;
  }

  /**
   * Inicia o andamento de uma tarefa operacional
   */
  startOperationalTask(taskId: string, performer: { id?: string; name: string }): OperationalTask {
    const task = this.getOperationalTaskById(taskId);
    if (task.status === 'CONCLUIDA') {
      throw new Error('A tarefa já está concluída.');
    }
    if (task.status === 'CANCELADA') {
      throw new Error('A tarefa está cancelada.');
    }
    if (task.status === 'BLOQUEADA') {
      throw new Error('A tarefa está bloqueada. Desbloqueie-a antes de iniciar.');
    }
    if (task.status === 'EM_ANDAMENTO') {
      return task; // Idempotente
    }

    const previousStatus = task.status;
    const nowIso = new Date().toISOString();
    task.status = 'EM_ANDAMENTO';
    task.updatedAt = nowIso;

    task.history.push({
      id: 'th-' + crypto.randomUUID().slice(0, 8),
      taskId,
      action: 'STARTED',
      performedBy: performer.name,
      performedByUserId: performer.id,
      performedAt: nowIso,
      previousStatus,
      newStatus: 'EM_ANDAMENTO',
      notes: 'Tarefa colocada em andamento'
    });

    this.addAuditLog({
      action: 'task_started',
      entityType: 'operational_task',
      entityId: task.id,
      entityName: task.title,
      admissionId: task.admissionId,
      employeeName: task.employeeName,
      details: `Tarefa operacional "${task.title}" iniciada por ${performer.name}.`,
      userName: performer.name
    });

    this.save();
    return task;
  }

  /**
   * Conclui uma tarefa operacional com observação opcional
   */
  completeOperationalTask(
    taskId: string,
    completionNotes: string | undefined,
    performer: { id?: string; name: string }
  ): OperationalTask {
    const task = this.getOperationalTaskById(taskId);
    if (task.status === 'CONCLUIDA') {
      return task; // Idempotência contra duplo clique
    }
    if (task.status === 'CANCELADA') {
      throw new Error('Não é possível concluir uma tarefa cancelada. Reabra-a antes.');
    }

    const previousStatus = task.status;
    const nowIso = new Date().toISOString();

    task.status = 'CONCLUIDA';
    task.completedAt = nowIso;
    task.completedBy = performer.name;
    task.completionNotes = completionNotes?.trim() || undefined;
    task.updatedAt = nowIso;

    task.history.push({
      id: 'th-' + crypto.randomUUID().slice(0, 8),
      taskId,
      action: 'COMPLETED',
      performedBy: performer.name,
      performedByUserId: performer.id,
      performedAt: nowIso,
      previousStatus,
      newStatus: 'CONCLUIDA',
      notes: task.completionNotes || 'Tarefa concluída com sucesso'
    });

    this.addAuditLog({
      action: 'task_completed',
      entityType: 'operational_task',
      entityId: task.id,
      entityName: task.title,
      admissionId: task.admissionId,
      employeeName: task.employeeName,
      details: `Tarefa operacional "${task.title}" concluída por ${performer.name}.${task.completionNotes ? ` Observações: "${task.completionNotes}".` : ''}`,
      userName: performer.name
    });

    // Bloco 6.6: Automação determinística para tarefa concluída
    this.executeAutomationOnTaskCompleted(task, performer.name);

    this.save();
    return task;
  }

  /**
   * Bloqueia uma tarefa operacional por impedimento real (motivo obrigatório)
   */
  blockOperationalTask(
    taskId: string,
    blockReason: string,
    performer: { id?: string; name: string }
  ): OperationalTask {
    const reason = (blockReason || '').trim();
    if (!reason || reason.length < 3) {
      throw new Error('O motivo do bloqueio é obrigatório e deve ter no mínimo 3 caracteres.');
    }

    const task = this.getOperationalTaskById(taskId);
    if (task.status === 'CONCLUIDA' || task.status === 'CANCELADA') {
      throw new Error(`Não é possível bloquear uma tarefa ${task.status.toLowerCase()}.`);
    }

    const previousStatus = task.status;
    const nowIso = new Date().toISOString();

    task.status = 'BLOQUEADA';
    task.blockedAt = nowIso;
    task.blockedBy = performer.name;
    task.blockReason = reason;
    task.updatedAt = nowIso;

    task.history.push({
      id: 'th-' + crypto.randomUUID().slice(0, 8),
      taskId,
      action: 'BLOCKED',
      performedBy: performer.name,
      performedByUserId: performer.id,
      performedAt: nowIso,
      previousStatus,
      newStatus: 'BLOQUEADA',
      reason,
      notes: reason
    });

    this.addAuditLog({
      action: 'task_blocked',
      entityType: 'operational_task',
      entityId: task.id,
      entityName: task.title,
      admissionId: task.admissionId,
      employeeName: task.employeeName,
      details: `Tarefa operacional "${task.title}" bloqueada por ${performer.name}. Motivo: "${reason}".`,
      userName: performer.name
    });

    this.save();
    return task;
  }

  /**
   * Desbloqueia uma tarefa operacional
   */
  unblockOperationalTask(
    taskId: string,
    reason: string | undefined,
    performer: { id?: string; name: string }
  ): OperationalTask {
    const task = this.getOperationalTaskById(taskId);
    if (task.status !== 'BLOQUEADA') {
      throw new Error('Apenas tarefas com status BLOQUEADA podem ser desbloqueadas.');
    }

    const nowIso = new Date().toISOString();
    const newStatus: OperationalTaskStatus = 'EM_ANDAMENTO';

    task.status = newStatus;
    task.blockedAt = undefined;
    task.blockedBy = undefined;
    task.blockReason = undefined;
    task.updatedAt = nowIso;

    task.history.push({
      id: 'th-' + crypto.randomUUID().slice(0, 8),
      taskId,
      action: 'UNBLOCKED',
      performedBy: performer.name,
      performedByUserId: performer.id,
      performedAt: nowIso,
      previousStatus: 'BLOQUEADA',
      newStatus,
      reason: reason || 'Desbloqueio operacional realizado',
      notes: reason
    });

    this.addAuditLog({
      action: 'task_unblocked',
      entityType: 'operational_task',
      entityId: task.id,
      entityName: task.title,
      admissionId: task.admissionId,
      employeeName: task.employeeName,
      details: `Tarefa operacional "${task.title}" desbloqueada por ${performer.name}.${reason ? ` Observações: "${reason}".` : ''}`,
      userName: performer.name
    });

    this.save();
    return task;
  }

  /**
   * Reabre uma tarefa operacional concluída ou cancelada (motivo obrigatório)
   */
  reopenOperationalTask(
    taskId: string,
    reopenReason: string,
    performer: { id?: string; name: string }
  ): OperationalTask {
    const reason = (reopenReason || '').trim();
    if (!reason || reason.length < 3) {
      throw new Error('O motivo da reabertura é obrigatório e deve ter no mínimo 3 caracteres.');
    }

    const task = this.getOperationalTaskById(taskId);
    if (task.status !== 'CONCLUIDA' && task.status !== 'CANCELADA') {
      throw new Error(`Apenas tarefas concluídas ou canceladas podem ser reabertas. Status atual: ${task.status}.`);
    }

    const previousStatus = task.status;
    const nowIso = new Date().toISOString();

    task.status = 'PENDENTE';
    task.completedAt = undefined;
    task.completedBy = undefined;
    task.completionNotes = undefined;
    task.cancelledAt = undefined;
    task.cancelledBy = undefined;
    task.cancelReason = undefined;
    task.reopenedAt = nowIso;
    task.reopenedBy = performer.name;
    task.reopenReason = reason;
    task.updatedAt = nowIso;

    task.history.push({
      id: 'th-' + crypto.randomUUID().slice(0, 8),
      taskId,
      action: 'REOPENED',
      performedBy: performer.name,
      performedByUserId: performer.id,
      performedAt: nowIso,
      previousStatus,
      newStatus: 'PENDENTE',
      reason,
      notes: reason
    });

    this.addAuditLog({
      action: 'task_reopened',
      entityType: 'operational_task',
      entityId: task.id,
      entityName: task.title,
      admissionId: task.admissionId,
      employeeName: task.employeeName,
      details: `Tarefa operacional "${task.title}" reaberta por ${performer.name}. Motivo: "${reason}".`,
      userName: performer.name
    });

    this.save();
    return task;
  }

  /**
   * Cancela uma tarefa operacional (motivo obrigatório, preserva histórico)
   */
  cancelOperationalTask(
    taskId: string,
    cancelReason: string,
    performer: { id?: string; name: string }
  ): OperationalTask {
    const reason = (cancelReason || '').trim();
    if (!reason || reason.length < 3) {
      throw new Error('O motivo do cancelamento é obrigatório e deve ter no mínimo 3 caracteres.');
    }

    const task = this.getOperationalTaskById(taskId);
    if (task.status === 'CANCELADA') {
      return task; // Idempotente
    }

    const previousStatus = task.status;
    const nowIso = new Date().toISOString();

    task.status = 'CANCELADA';
    task.cancelledAt = nowIso;
    task.cancelledBy = performer.name;
    task.cancelReason = reason;
    task.updatedAt = nowIso;

    task.history.push({
      id: 'th-' + crypto.randomUUID().slice(0, 8),
      taskId,
      action: 'CANCELLED',
      performedBy: performer.name,
      performedByUserId: performer.id,
      performedAt: nowIso,
      previousStatus,
      newStatus: 'CANCELADA',
      reason,
      notes: reason
    });

    this.addAuditLog({
      action: 'task_cancelled',
      entityType: 'operational_task',
      entityId: task.id,
      entityName: task.title,
      admissionId: task.admissionId,
      employeeName: task.employeeName,
      details: `Tarefa operacional "${task.title}" cancelada por ${performer.name}. Motivo: "${reason}".`,
      userName: performer.name
    });

    this.save();
    return task;
  }

  /**
   * Atualiza dados de uma tarefa operacional (título, descrição, prioridade, prazo)
   */
  updateOperationalTask(
    taskId: string,
    input: UpdateOperationalTaskInput,
    performer: { id?: string; name: string }
  ): OperationalTask {
    const task = this.getOperationalTaskById(taskId);
    if (task.status === 'CONCLUIDA' || task.status === 'CANCELADA') {
      throw new Error(`Não é possível editar uma tarefa ${task.status.toLowerCase()}.`);
    }

    const nowIso = new Date().toISOString();

    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title || title.length < 3) {
        throw new Error('O título deve ter no mínimo 3 caracteres.');
      }
      task.title = title;
    }

    if (input.description !== undefined) {
      task.description = input.description.trim() || undefined;
    }

    if (input.priority !== undefined) {
      const allowedPriorities: OperationalPriority[] = ['NORMAL', 'ALTA', 'CRITICA'];
      if (!allowedPriorities.includes(input.priority)) {
        throw new Error('Prioridade inválida.');
      }
      task.priority = input.priority;
    }

    if (input.dueAt !== undefined) {
      if (input.dueAt === null || input.dueAt === '') {
        task.dueAt = null;
      } else {
        const parsedDate = new Date(input.dueAt);
        if (isNaN(parsedDate.getTime())) {
          throw new Error('Prazo inválido.');
        }
        task.dueAt = parsedDate.toISOString();
      }
    }

    task.updatedAt = nowIso;

    task.history.push({
      id: 'th-' + crypto.randomUUID().slice(0, 8),
      taskId,
      action: 'UPDATED',
      performedBy: performer.name,
      performedByUserId: performer.id,
      performedAt: nowIso,
      notes: input.reason || 'Dados da tarefa atualizados'
    });

    this.addAuditLog({
      action: 'task_updated',
      entityType: 'operational_task',
      entityId: task.id,
      entityName: task.title,
      admissionId: task.admissionId,
      employeeName: task.employeeName,
      details: `Tarefa operacional "${task.title}" atualizada por ${performer.name}.${input.reason ? ` Motivo: "${input.reason}".` : ''}`,
      userName: performer.name
    });

    this.save();
    return task;
  }

  /**
   * Retorna todas as tarefas operacionais de uma admissão específica
   */
  getAdmissionOperationalTasks(admissionId: string): OperationalTask[] {
    if (!this.data.operationalTasks) {
      this.data.operationalTasks = [];
    }
    const now = Date.now();
    return this.data.operationalTasks
      .filter(t => t.admissionId === admissionId)
      .map(t => ({
        ...t,
        isOverdue: t.dueAt
          ? new Date(t.dueAt).getTime() < now && t.status !== 'CONCLUIDA' && t.status !== 'CANCELADA'
          : false
      }));
  }

  // =========================================================================
  // BLOCO 6.6: AUTOMAÇÃO DE ROTINAS INTERNAS DO RH
  // =========================================================================

  ensureAutomationsInitialized(): void {
    if (!this.data.automationExecutions) {
      this.data.automationExecutions = [];
    }
    const settings = this.getSettings();
    if (!settings.automations) {
      settings.automations = {
        DOCUMENT_REJECTED: true,
        DOCUMENT_RESUBMITTED: true,
        ALL_REQUIRED_DOCUMENTS_APPROVED: false,
        APPROVAL_COMPLETED: false,
        TASK_COMPLETED: false
      };
      this.save();
    }
  }

  isAutomationEnabled(routineKey: AutomationRoutineKey): boolean {
    // No Bloco 6.6B, apenas DOCUMENT_REJECTED e DOCUMENT_RESUBMITTED são executados
    if (routineKey !== 'DOCUMENT_REJECTED' && routineKey !== 'DOCUMENT_RESUBMITTED') {
      return false;
    }
    this.ensureAutomationsInitialized();
    const settings = this.getSettings();
    if (settings.automations && typeof settings.automations[routineKey] === 'boolean') {
      return settings.automations[routineKey];
    }
    return true; // Padrão ativo para 6.6B
  }

  toggleAutomationRoutine(routineKey: AutomationRoutineKey, enabled: boolean, userName: string): boolean {
    this.ensureAutomationsInitialized();
    const settings = this.getSettings();
    if (!settings.automations) {
      settings.automations = {};
    }
    const previous = settings.automations[routineKey] ?? true;
    settings.automations[routineKey] = enabled;
    settings.updatedAt = new Date().toISOString();
    settings.updatedBy = userName;

    this.addAuditLog({
      userName,
      action: 'automation_toggled',
      entityType: 'automation',
      entityId: routineKey,
      entityName: routineKey,
      fieldChanged: `automação_${routineKey}`,
      previousValue: previous ? 'Ativa' : 'Inativa',
      newValue: enabled ? 'Ativa' : 'Inativa',
      details: `Rotina de automação interna "${routineKey}" foi ${enabled ? 'ativada' : 'desativada'} por ${userName}.`
    });

    this.save();
    return enabled;
  }

  getAutomationsHubData(): AutomationsHubResponse {
    this.ensureAutomationsInitialized();
    const settings = this.getSettings();
    const automations = settings.automations || {};
    const executions = this.data.automationExecutions || [];

    const routineDefinitions: Array<{
      key: AutomationRoutineKey;
      name: string;
      triggerEvent: string;
      description: string;
      deterministicActions: string[];
    }> = [
      {
        key: 'DOCUMENT_REJECTED',
        name: 'Documento Rejeitado pelo RH',
        triggerEvent: 'Documento recusado com motivo na conferência',
        description: 'Quando um documento é reprovado pelo RH, atualiza a situação de pendência, orienta o reenvio e cria automaticamente tarefa operacional de cobrança sem duplicidade.',
        deterministicActions: [
          'Atualiza pendência no checklist da admissão',
          'Disponibiliza status "Rejeitado" e notas para o colaborador reenviar',
          'Sinaliza impedimento na etapa de Documentos do processo admissional',
          'Cria tarefa operacional de cobrança vinculada ao analista responsável (se não houver equivalente ativa)',
          'Registra log rastreável de auditoria automática'
        ]
      },
      {
        key: 'DOCUMENT_RESUBMITTED',
        name: 'Documento Reenviado pelo Colaborador',
        triggerEvent: 'Nova versão de documento carregada',
        description: 'Quando uma nova versão de documento rejeitado é enviada, atualiza a versão sem sobrescrever o histórico, retorna o documento para conferência e conclui a tarefa operacional pendente.',
        deterministicActions: [
          'Registra nova versão mantendo histórico de versões anteriores intacto',
          'Retorna documento para a fila de conferência do RH',
          'Remove situação de pendência e bloqueio quando não restarem outros documentos rejeitados',
          'Conclui automaticamente tarefas operacionais ativas de cobrança deste documento',
          'Registra log de auditoria automática'
        ]
      },
      {
        key: 'ALL_REQUIRED_DOCUMENTS_APPROVED',
        name: 'Todos os Documentos Obrigatórios Aprovados',
        triggerEvent: '100% dos documentos obrigatórios validados pelo RH',
        description: 'Avança a etapa de Documentos do processo admissional. Se houver aprovação interna obrigatória pendente, JAMAIS conclui a admissão indevidamente, direcionando para a aprovação formal.',
        deterministicActions: [
          'Conclui a etapa "Documentos" no processo admissional configurável',
          'Verifica requisitos de aprovação interna (Bloco 5.6): NUNCA conclui se houver aprovação obrigatória pendente',
          'Gera tarefa operacional para o aprovador/gestor quando a aprovação for necessária',
          'Avança admissão para "Concluída" somente se todas as etapas e aprovações estiverem concluídas',
          'Registra log de auditoria automática'
        ]
      },
      {
        key: 'APPROVAL_COMPLETED',
        name: 'Aprovação Interna Concluída',
        triggerEvent: 'Aprovação formal deferida pelo gestor ou diretoria',
        description: 'Quando a aprovação interna obrigatória é concedida, verifica documentos, etapas e pendências, concluindo tarefas vinculadas e avançando o processo admissional.',
        deterministicActions: [
          'Conclui a etapa de "Aprovação" no processo admissional',
          'Conclui automaticamente tarefas operacionais ativas de aprovação interna',
          'Verifica se todos os documentos e etapas obrigatórias estão atendidos',
          'Avança a admissão para "Concluída" quando todos os requisitos forem satisfeitos',
          'Registra log de auditoria formal'
        ]
      },
      {
        key: 'TASK_COMPLETED',
        name: 'Tarefa Operacional Concluída',
        triggerEvent: 'Resolução de tarefa operacional pelo analista do RH',
        description: 'Quando uma tarefa operacional é finalizada, sincroniza a situação correspondente e desbloqueia etapas sem alterar documentos ou aprovações indevidamente.',
        deterministicActions: [
          'Verifica se a tarefa concluída possuía vínculo com bloqueio de etapa',
          'Desbloqueia etapa do processo quando não restarem outros impedimentos',
          'Sincroniza situação na Central de Operações',
          'Não altera aprovações ou documentos indevidamente (preserva decisões humanas)',
          'Registra evento rastreável'
        ]
      }
    ];

    const routines: AutomationRoutineRule[] = routineDefinitions.map(def => {
      const routineExecs = executions.filter(e => e.routineKey === def.key);
      const lastExec = routineExecs[routineExecs.length - 1];
      return {
        key: def.key,
        name: def.name,
        triggerEvent: def.triggerEvent,
        description: def.description,
        deterministicActions: def.deterministicActions,
        enabled: automations[def.key] !== false,
        totalExecutions: routineExecs.length,
        lastExecutedAt: lastExec?.executedAt,
        lastExecutionStatus: lastExec?.status,
        lastExecutionSummary: lastExec?.details
      };
    });

    const activeRoutines = routines.filter(r => r.enabled).length;

    return {
      routines,
      summary: {
        totalRoutines: routines.length,
        activeRoutines,
        inactiveRoutines: routines.length - activeRoutines,
        totalExecutions: executions.length
      },
      recentExecutions: [...executions].reverse().slice(0, 50)
    };
  }

  executeAutomationOnDocumentRejected(
    admission: Admission, 
    doc: AdmissionDocument, 
    reviewerName: string, 
    reason: string, 
    notes?: string
  ): void {
    if (!this.isAutomationEnabled('DOCUMENT_REJECTED')) return;

    const dedupKey = `${admission.id}:${doc.id}:REJECTED:v${doc.currentVersion}`;
    if (!this.tryAcquireAutomationLock(dedupKey)) {
      return;
    }

    try {
      const now = new Date().toISOString();
      const actionsTaken: string[] = [];

      // 1. Manter histórico: histórico e versões já foram preservados pelo reviewDocument.
      // 2. Registrar a pendência na etapa de DOCUMENTOS do processo (5.4)
      const docsStep = (admission.processSteps || []).find(s => s.stepKey === 'DOCUMENTOS');
      if (docsStep) {
        docsStep.status = 'BLOQUEADA';
        docsStep.blockReason = `Documento ${doc.documentType} rejeitado: ${reason}. Aguardando reenvio pelo colaborador.`;
        docsStep.history = docsStep.history || [];
        docsStep.history.push({
          action: 'bloqueada',
          timestamp: now,
          userName: 'Sistema (Automação)',
          reason: docsStep.blockReason,
          details: docsStep.blockReason
        });
        actionsTaken.push(`Sinalizado bloqueio na etapa "${docsStep.stepName}" do processo admissional`);
      }

      // 3. Atualizar o status operacional da admissão -> Pendência
      admission.status = 'Pendência';
      admission.updatedAt = now;
      actionsTaken.push('Situação da admissão atualizada para "Pendência"');

      // 4. Disponibilizar o reenvio ao funcionário
      actionsTaken.push(`Reenvio do documento ${doc.documentType} disponibilizado ao colaborador no portal`);

      // 5. Criar tarefa operacional SOMENTE SE REALMENTE NECESSÁRIO (6.5 / Idempotência):
      // Apenas cria se for documento obrigatório (impeditivo para admissão) e não houver tarefa ativa
      if (doc.required) {
        const existingTask = (this.data.operationalTasks || []).find(
          t => t.admissionId === admission.id &&
               t.documentId === doc.id &&
               t.sourceType === 'DOCUMENTO' &&
               (t.status === 'PENDENTE' || t.status === 'EM_ANDAMENTO' || t.status === 'BLOQUEADA')
        );

        if (!existingTask) {
          // Reutilizar responsável da admissão (Bloco 6.4)
          let responsibleUserId: string | undefined = undefined;
          if (admission.responsibleUserId) {
            const respUser = this.data.users.find(
              u => (u.id === admission.responsibleUserId || u.email.toLowerCase() === admission.responsibleUserId?.toLowerCase()) &&
                   u.active !== false &&
                   ['RH', 'ADMIN', 'RH_CONFERENCIA', 'GESTOR'].includes(u.role)
            );
            if (respUser) {
              responsibleUserId = respUser.id;
            }
          }

          const task = this.createOperationalTask({
            admissionId: admission.id,
            title: `Cobrar reenvio: ${doc.documentType}`,
            description: `Documento obrigatório rejeitado pelo RH. Motivo: ${reason}.${notes ? ` Orientação: "${notes}".` : ''} Cobrar reenvio de nova versão do colaborador.`,
            priority: 'ALTA',
            sourceType: 'DOCUMENTO',
            documentId: doc.id,
            stepKey: 'DOCUMENTOS',
            responsibleUserId: responsibleUserId || undefined
          }, {
            name: 'Sistema (Automação)',
            id: 'system-automation'
          });

          actionsTaken.push(`Tarefa operacional "${task.title}" criada automaticamente e atribuída a ${task.responsibleUserName || 'Sem responsável'}`);
        } else {
          actionsTaken.push(`Tarefa operacional ativa já existente (#${existingTask.id}); criação duplicada evitada por idempotência`);
        }
      } else {
        actionsTaken.push(`Documento opcional: pendência registrada sem abertura de tarefa impeditiva`);
      }

      // 6. Auditoria unificada (Bloco 5.7)
      this.addAuditLog({
        userName: 'Sistema (Automação)',
        action: 'automation_document_rejected',
        entityType: 'automation',
        entityId: doc.id,
        entityName: doc.documentType,
        admissionId: admission.id,
        employeeName: admission.employee?.name,
        details: `[Automação] Rotina disparada por rejeição de ${doc.documentType} por ${reviewerName}. Ações: ${actionsTaken.join('; ')}.`,
        isAutomatic: true
      });

      // 7. Registro de execução
      this.data.automationExecutions.push({
        id: 'auto-exec-' + crypto.randomUUID().slice(0, 8),
        routineKey: 'DOCUMENT_REJECTED',
        routineName: 'Documento Rejeitado',
        admissionId: admission.id,
        employeeName: admission.employee?.name,
        triggerEvent: `Documento ${doc.documentType} rejeitado por ${reviewerName}`,
        actionsTaken,
        executedAt: now,
        status: 'SUCCESS',
        details: actionsTaken.join(' | '),
        originatingUser: reviewerName
      });

      this.save();
    } catch (err: any) {
      console.error('[Automação] Falha segura na rotina DOCUMENT_REJECTED:', err.message);
      this.data.automationExecutions.push({
        id: 'auto-exec-' + crypto.randomUUID().slice(0, 8),
        routineKey: 'DOCUMENT_REJECTED',
        routineName: 'Documento Rejeitado',
        admissionId: admission.id,
        employeeName: admission.employee?.name,
        triggerEvent: `Documento ${doc.documentType} rejeitado`,
        actionsTaken: [],
        executedAt: new Date().toISOString(),
        status: 'ERROR',
        details: 'Erro seguro sem quebra de processo: ' + (err.message || 'Erro inesperado'),
        originatingUser: reviewerName
      });
      this.save();
    } finally {
      this.releaseAutomationLock(dedupKey);
    }
  }

  executeAutomationOnDocumentResubmitted(
    admission: Admission, 
    doc: AdmissionDocument
  ): void {
    if (!this.isAutomationEnabled('DOCUMENT_RESUBMITTED')) return;

    const dedupKey = `${admission.id}:${doc.id}:RESUBMITTED:v${doc.currentVersion}`;
    if (!this.tryAcquireAutomationLock(dedupKey)) {
      return;
    }

    try {
      const now = new Date().toISOString();
      const actionsTaken: string[] = [];

      // 1. Nova versão já criada e versões anteriores preservadas pelo uploadDocument
      actionsTaken.push(`Nova versão V${doc.currentVersion} criada; versões anteriores preservadas no histórico`);

      // 2. Retornar documento para conferência
      actionsTaken.push(`Documento ${doc.documentType} retornado para conferência do RH`);

      // 3. Atualizar status e retirar impedimento se não restarem documentos rejeitados
      const remainingRejected = (admission.documents || []).filter(d => d.id !== doc.id && d.status === 'Rejeitado');

      const docsStep = (admission.processSteps || []).find(s => s.stepKey === 'DOCUMENTOS');
      if (docsStep) {
        if (remainingRejected.length === 0) {
          docsStep.status = 'EM_ANDAMENTO';
          docsStep.blockReason = undefined;
          docsStep.history = docsStep.history || [];
          docsStep.history.push({
            action: 'iniciada',
            timestamp: now,
            userName: 'Sistema (Automação)',
            reason: 'Desbloqueio operacional após reenvio de documento',
            details: 'Desbloqueio operacional após reenvio de documento'
          });
          actionsTaken.push('Impedimento na etapa "Documentos" removido');
        } else {
          docsStep.status = 'BLOQUEADA';
          docsStep.blockReason = `Ainda existem ${remainingRejected.length} documento(s) com rejeição aguardando reenvio.`;
          actionsTaken.push(`Impedimento mantido na etapa "Documentos": ${remainingRejected.length} pendência(s) restante(s)`);
        }
      }

      if (remainingRejected.length === 0 && admission.status === 'Pendência') {
        admission.status = 'Em conferência';
        admission.updatedAt = now;
        actionsTaken.push('Situação da admissão retornada para "Em conferência"');
      }

      // 4. Concluir tarefas operacionais ativas de cobrança deste documento (6.5)
      const tasksToComplete = (this.data.operationalTasks || []).filter(
        t => t.admissionId === admission.id &&
             t.documentId === doc.id &&
             (t.status === 'PENDENTE' || t.status === 'EM_ANDAMENTO' || t.status === 'BLOQUEADA')
      );

      for (const t of tasksToComplete) {
        this.completeOperationalTask(
          t.id,
          `Concluída automaticamente: nova versão (V${doc.currentVersion}) enviada pelo colaborador.`,
          { name: 'Sistema (Automação)', id: 'system-automation' }
        );
        actionsTaken.push(`Tarefa operacional #${t.id} ("${t.title}") concluída automaticamente`);
      }

      // 5. Auditoria unificada
      this.addAuditLog({
        userName: 'Sistema (Automação)',
        action: 'automation_document_resubmitted',
        entityType: 'automation',
        entityId: doc.id,
        entityName: doc.documentType,
        admissionId: admission.id,
        employeeName: admission.employee?.name,
        details: `[Automação] Documento ${doc.documentType} reenviado na versão V${doc.currentVersion}. ${actionsTaken.join('; ')}.`,
        isAutomatic: true
      });

      // 6. Registro de execução
      this.data.automationExecutions.push({
        id: 'auto-exec-' + crypto.randomUUID().slice(0, 8),
        routineKey: 'DOCUMENT_RESUBMITTED',
        routineName: 'Documento Reenviado',
        admissionId: admission.id,
        employeeName: admission.employee?.name,
        triggerEvent: `Nova versão V${doc.currentVersion} do documento ${doc.documentType}`,
        actionsTaken,
        executedAt: now,
        status: 'SUCCESS',
        details: actionsTaken.join(' | '),
        originatingUser: admission.employee?.name || 'Colaborador'
      });

      this.save();
    } catch (err: any) {
      console.error('[Automação] Falha segura na rotina DOCUMENT_RESUBMITTED:', err.message);
      this.data.automationExecutions.push({
        id: 'auto-exec-' + crypto.randomUUID().slice(0, 8),
        routineKey: 'DOCUMENT_RESUBMITTED',
        routineName: 'Documento Reenviado',
        admissionId: admission.id,
        employeeName: admission.employee?.name,
        triggerEvent: `Reenvio de documento`,
        actionsTaken: [],
        executedAt: new Date().toISOString(),
        status: 'ERROR',
        details: 'Erro seguro: ' + (err.message || 'Erro inesperado')
      });
      this.save();
    } finally {
      this.releaseAutomationLock(dedupKey);
    }
  }

  executeAutomationOnAllRequiredApproved(
    admission: Admission, 
    reviewerName: string
  ): void {
    if (!this.isAutomationEnabled('ALL_REQUIRED_DOCUMENTS_APPROVED')) return;

    const requiredDocs = (admission.documents || []).filter(d => d.required);
    const allRequiredApproved = requiredDocs.length > 0 && requiredDocs.every(d => d.status === 'Aprovado');
    if (!allRequiredApproved) return;

    const dedupKey = `${admission.id}:ALL_REQUIRED_DOCS_APPROVED`;
    if (!this.tryAcquireAutomationLock(dedupKey)) {
      return;
    }

    try {
      const now = new Date().toISOString();
      const actionsTaken: string[] = [];

      // 1. Processo 5.4: Concluir etapa DOCUMENTOS se ativa
      const docsStep = (admission.processSteps || []).find(s => s.stepKey === 'DOCUMENTOS');
      if (docsStep && docsStep.status !== 'CONCLUIDA') {
        docsStep.status = 'CONCLUIDA';
        docsStep.completedAt = now;
        docsStep.completedBy = 'Sistema (Automação)';
        docsStep.blockReason = undefined;
        actionsTaken.push(`Etapa "${docsStep.stepName}" concluída com 100% dos documentos obrigatórios aprovados`);
      }

      // 2. Verificar pendências e aprovações obrigatórias
      const hasRejectedDocs = (admission.documents || []).some(d => d.status === 'Rejeitado');
      const hasPendingCorrection = Boolean(admission.correctionRequest && !admission.correctionRequest.resolved);

      // "NUNCA CONCLUIR AUTOMATICAMENTE UMA ADMISSÃO SE AINDA EXISTIR APROVAÇÃO OBRIGATÓRIA."
      const hasPendingMandatoryApproval = Boolean(
        admission.approval &&
        admission.approval.required &&
        admission.approval.status !== 'APROVADA'
      );

      if (hasPendingMandatoryApproval) {
        // NÃO PODE CONCLUIR A ADMISSÃO!
        // Avança etapa APROVACAO para EM_ANDAMENTO se existir
        const apprStep = (admission.processSteps || []).find(s => s.stepKey === 'APROVACAO');
        if (apprStep && apprStep.status !== 'CONCLUIDA') {
          apprStep.status = 'EM_ANDAMENTO';
          apprStep.startedAt = apprStep.startedAt || now;
          apprStep.blockReason = undefined;
          actionsTaken.push(`Etapa de "${apprStep.stepName}" liberada e colocada em andamento`);
        }

        if (admission.status !== 'Pendência') {
          admission.status = 'Em conferência';
        }
        admission.updatedAt = now;
        actionsTaken.push('Admissão mantida em andamento aguardando aprovação interna obrigatória (conclusão automática bloqueada)');

        // Criar tarefa operacional de aprovação se não existir
        const existingApprovalTask = (this.data.operationalTasks || []).find(
          t => t.admissionId === admission.id &&
               t.sourceType === 'APROVACAO' &&
               (t.status === 'PENDENTE' || t.status === 'EM_ANDAMENTO' || t.status === 'BLOQUEADA')
        );

        if (!existingApprovalTask) {
          const apprTask = this.createOperationalTask({
            admissionId: admission.id,
            title: `Aprovação interna necessária: ${admission.employee.name}`,
            description: `Todos os documentos obrigatórios foram aprovados. A admissão aguarda aprovação formal da alçada competente (${admission.approval?.approvalType || 'Gestão'}).`,
            priority: 'ALTA',
            sourceType: 'APROVACAO',
            approvalId: admission.approval?.id,
            responsibleUserId: admission.approval?.assignedUserId || admission.responsibleUserId || undefined
          }, {
            name: 'Sistema (Automação)',
            id: 'system-automation'
          });
          actionsTaken.push(`Tarefa de aprovação operacional #${apprTask.id} gerada`);
        }
      } else {
        // Sem aprovação pendente. Verificar se todas as etapas do processo 5.4 estão concluídas
        this.evaluateAdmissionProcessSteps(admission, 'Sistema (Automação)');

        const allMandatoryStepsCompleted = (admission.processSteps || [])
          .filter(s => s.required)
          .every(s => s.status === 'CONCLUIDA' || s.status === 'IGNORADA');

        if (allMandatoryStepsCompleted && !hasRejectedDocs && !hasPendingCorrection && admission.status !== 'Concluída') {
          admission.status = 'Concluída';
          admission.completedAt = now;
          admission.completedBy = 'Sistema (Automação)';
          admission.updatedAt = now;
          actionsTaken.push('Admissão concluída com 100% dos documentos e etapas obrigatórias atendidas');

          this.addNotification({
            title: 'Admissão concluída com sucesso',
            message: `A admissão de ${admission.employee.name} foi finalizada após aprovação de todos os requisitos.`,
            type: 'completed',
            admissionId: admission.id,
            link: `/admissoes/${admission.id}`
          });
        } else {
          actionsTaken.push('Documentos obrigatórios aprovados; processo avançado para a próxima etapa configurada');
        }
      }

      // 3. Auditoria unificada
      this.addAuditLog({
        userName: 'Sistema (Automação)',
        action: 'automation_all_required_docs_approved',
        entityType: 'automation',
        entityId: admission.id,
        entityName: admission.employee.name,
        admissionId: admission.id,
        employeeName: admission.employee?.name,
        details: `[Automação] 100% dos documentos obrigatórios aprovados por ${reviewerName}. Ações: ${actionsTaken.join('; ')}.`,
        isAutomatic: true
      });

      // 4. Registro de execução
      this.data.automationExecutions.push({
        id: 'auto-exec-' + crypto.randomUUID().slice(0, 8),
        routineKey: 'ALL_REQUIRED_DOCUMENTS_APPROVED',
        routineName: 'Documentos Obrigatórios Aprovados',
        admissionId: admission.id,
        employeeName: admission.employee?.name,
        triggerEvent: `Aprovação do último documento obrigatório por ${reviewerName}`,
        actionsTaken,
        executedAt: now,
        status: 'SUCCESS',
        details: actionsTaken.join(' | '),
        originatingUser: reviewerName
      });

      this.save();
    } catch (err: any) {
      console.error('[Automação] Falha segura na rotina ALL_REQUIRED_DOCUMENTS_APPROVED:', err.message);
      this.data.automationExecutions.push({
        id: 'auto-exec-' + crypto.randomUUID().slice(0, 8),
        routineKey: 'ALL_REQUIRED_DOCUMENTS_APPROVED',
        routineName: 'Documentos Obrigatórios Aprovados',
        admissionId: admission.id,
        employeeName: admission.employee?.name,
        triggerEvent: `Documentos aprovados`,
        actionsTaken: [],
        executedAt: new Date().toISOString(),
        status: 'ERROR',
        details: 'Erro seguro: ' + (err.message || 'Erro inesperado')
      });
      this.save();
    } finally {
      this.releaseAutomationLock(dedupKey);
    }
  }

  executeAutomationOnApprovalCompleted(
    admission: Admission, 
    approval: AdmissionApproval, 
    userName: string
  ): void {
    if (!this.isAutomationEnabled('APPROVAL_COMPLETED')) return;

    const dedupKey = `${admission.id}:${approval.id}:APPROVAL_COMPLETED`;
    if (!this.tryAcquireAutomationLock(dedupKey)) {
      return;
    }

    try {
      const now = new Date().toISOString();
      const actionsTaken: string[] = [];

      // 1. Concluir tarefas operacionais ativas de aprovação desta admissão (Idempotência)
      const approvalTasks = (this.data.operationalTasks || []).filter(
        t => t.admissionId === admission.id &&
             t.sourceType === 'APROVACAO' &&
             (t.status === 'PENDENTE' || t.status === 'EM_ANDAMENTO' || t.status === 'BLOQUEADA')
      );

      for (const t of approvalTasks) {
        this.completeOperationalTask(
          t.id,
          `Concluída automaticamente: aprovação interna deferida por ${userName}.`,
          { name: 'Sistema (Automação)', id: 'system-automation' }
        );
        actionsTaken.push(`Tarefa de aprovação #${t.id} concluída`);
      }

      // 2. Concluir etapa APROVACAO no snapshot do processo 5.4
      const apprStep = (admission.processSteps || []).find(s => s.stepKey === 'APROVACAO');
      if (apprStep && apprStep.status !== 'CONCLUIDA') {
        apprStep.status = 'CONCLUIDA';
        apprStep.completedAt = now;
        apprStep.completedBy = userName;
        apprStep.blockReason = undefined;
        actionsTaken.push(`Etapa "${apprStep.stepName}" concluída com deferimento formal`);
      }

      // 3. Verificar documentos, etapas e pendências para avançar o processo
      const requiredDocs = (admission.documents || []).filter(d => d.required);
      const allDocsApproved = requiredDocs.length > 0 && requiredDocs.every(d => d.status === 'Aprovado');
      const hasPendingIssues = (admission.documents || []).some(d => d.status === 'Rejeitado') ||
                               Boolean(admission.correctionRequest && !admission.correctionRequest.resolved);
      const hasPendingMandatoryApproval = Boolean(
        admission.approval &&
        admission.approval.required &&
        admission.approval.status !== 'APROVADA'
      );

      this.evaluateAdmissionProcessSteps(admission, userName);

      const allStepsDone = (admission.processSteps || [])
        .filter(s => s.required)
        .every(s => s.status === 'CONCLUIDA' || s.status === 'IGNORADA');

      if (allDocsApproved && allStepsDone && !hasPendingIssues && !hasPendingMandatoryApproval && admission.status !== 'Concluída') {
        admission.status = 'Concluída';
        admission.completedAt = admission.completedAt || now;
        admission.completedBy = admission.completedBy || userName;
        admission.updatedAt = now;
        actionsTaken.push('Admissão concluída com sucesso após deferimento da aprovação e conclusão das etapas');

        this.addNotification({
          title: 'Admissão concluída!',
          message: `O processo de ${admission.employee.name} foi 100% concluído após aprovação interna formal.`,
          type: 'completed',
          admissionId: admission.id,
          link: `/admissoes/${admission.id}`
        });
      } else {
        actionsTaken.push('Etapa de aprovação registrada; processo avançou para a próxima etapa configurada');
      }

      // 4. Auditoria unificada
      this.addAuditLog({
        userName: 'Sistema (Automação)',
        action: 'automation_approval_completed',
        entityType: 'automation',
        entityId: approval.id,
        entityName: approval.approvalType,
        admissionId: admission.id,
        employeeName: admission.employee?.name,
        details: `[Automação] Aprovação interna formalizada por ${userName}. Ações: ${actionsTaken.join('; ')}.`,
        isAutomatic: true
      });

      // 5. Registro de execução
      this.data.automationExecutions.push({
        id: 'auto-exec-' + crypto.randomUUID().slice(0, 8),
        routineKey: 'APPROVAL_COMPLETED',
        routineName: 'Aprovação Concluída',
        admissionId: admission.id,
        employeeName: admission.employee?.name,
        triggerEvent: `Aprovação deferida por ${userName}`,
        actionsTaken,
        executedAt: now,
        status: 'SUCCESS',
        details: actionsTaken.join(' | '),
        originatingUser: userName
      });

      this.save();
    } catch (err: any) {
      console.error('[Automação] Falha segura na rotina APPROVAL_COMPLETED:', err.message);
      this.data.automationExecutions.push({
        id: 'auto-exec-' + crypto.randomUUID().slice(0, 8),
        routineKey: 'APPROVAL_COMPLETED',
        routineName: 'Aprovação Concluída',
        admissionId: admission.id,
        employeeName: admission.employee?.name,
        triggerEvent: `Aprovação concluída`,
        actionsTaken: [],
        executedAt: new Date().toISOString(),
        status: 'ERROR',
        details: 'Erro seguro: ' + (err.message || 'Erro inesperado'),
        originatingUser: userName
      });
      this.save();
    } finally {
      this.releaseAutomationLock(dedupKey);
    }
  }

  executeAutomationOnTaskCompleted(
    task: OperationalTask, 
    performerName: string
  ): void {
    if (!this.isAutomationEnabled('TASK_COMPLETED')) return;

    const dedupKey = `${task.id}:TASK_COMPLETED`;
    if (!this.tryAcquireAutomationLock(dedupKey)) {
      return;
    }

    try {
      const now = new Date().toISOString();
      const actionsTaken: string[] = [];

      const admission = this.data.admissions.find(a => a.id === task.admissionId);
      if (admission) {
        // Se a tarefa possuía stepKey e a etapa estava bloqueada
        if (task.stepKey) {
          const step = (admission.processSteps || []).find(s => s.stepKey === task.stepKey);
          if (step && step.blockReason) {
            // Checa se ainda existem outras tarefas abertas para esta mesma etapa
            const otherTasksOpen = (this.data.operationalTasks || []).some(
              t => t.id !== task.id &&
                   t.admissionId === admission.id &&
                   t.stepKey === task.stepKey &&
                   (t.status === 'PENDENTE' || t.status === 'EM_ANDAMENTO' || t.status === 'BLOQUEADA')
            );
            if (!otherTasksOpen) {
              step.blockReason = undefined;
              actionsTaken.push(`Impedimento na etapa "${step.stepName}" removido após conclusão da tarefa`);
            }
          }
        }

        // NÃO MODIFICA DOCUMENTOS NEM APROVAÇÕES INDEVIDAMENTE (Regra 2.E / 5)
        admission.updatedAt = now;
      }

      actionsTaken.push(`Situação operacional sincronizada após conclusão da tarefa "${task.title}"`);

      // Auditoria
      this.addAuditLog({
        userName: 'Sistema (Automação)',
        action: 'automation_task_completed',
        entityType: 'automation',
        entityId: task.id,
        entityName: task.title,
        admissionId: task.admissionId,
        employeeName: task.employeeName,
        details: `[Automação] Tarefa "${task.title}" concluída por ${performerName}. ${actionsTaken.join('; ')}.`,
        isAutomatic: true
      });

      this.data.automationExecutions.push({
        id: 'auto-exec-' + crypto.randomUUID().slice(0, 8),
        routineKey: 'TASK_COMPLETED',
        routineName: 'Tarefa Concluída',
        admissionId: task.admissionId,
        employeeName: task.employeeName,
        triggerEvent: `Tarefa "${task.title}" concluída por ${performerName}`,
        actionsTaken,
        executedAt: now,
        status: 'SUCCESS',
        details: actionsTaken.join(' | '),
        originatingUser: performerName
      });

      this.save();
    } catch (err: any) {
      console.error('[Automação] Falha segura na rotina TASK_COMPLETED:', err.message);
      this.data.automationExecutions.push({
        id: 'auto-exec-' + crypto.randomUUID().slice(0, 8),
        routineKey: 'TASK_COMPLETED',
        routineName: 'Tarefa Concluída',
        admissionId: task.admissionId,
        employeeName: task.employeeName,
        triggerEvent: `Tarefa concluída`,
        actionsTaken: [],
        executedAt: new Date().toISOString(),
        status: 'ERROR',
        details: 'Erro seguro: ' + (err.message || 'Erro inesperado'),
        originatingUser: performerName
      });
      this.save();
    } finally {
      this.releaseAutomationLock(dedupKey);
    }
  }
}

export const db = new Database();
export { STORAGE_DIR };

