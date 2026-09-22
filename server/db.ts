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
  ApprovalDetailResponse
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

  constructor() {
    ensureDirectories();
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.users) this.data.users = [];
        if (!this.data.communicationLogs) this.data.communicationLogs = [];

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

        // Garante a existência dos usuários padrão de RH
        const defaultUsers = [
          {
            email: 'rh@galvanizacaoraitz.com.br',
            name: 'RH Galvanização Raitz',
            role: 'RH' as const,
            department: 'Recursos Humanos / Gente & Gestão'
          },
          {
            email: 'admin@raitz.com.br',
            name: 'Coordenação Raitz RH',
            role: 'RH' as const,
            department: 'Recursos Humanos'
          },
          {
            email: 'rh@empresa.com',
            name: 'Mariana Silveira',
            role: 'RH' as const,
            department: 'Recursos Humanos'
          }
        ];

        let updated = false;
        for (const def of defaultUsers) {
          if (!this.data.users.some(u => u.email.toLowerCase() === def.email.toLowerCase())) {
            this.data.users.push({
              id: 'user-rh-' + crypto.randomUUID().slice(0, 8),
              email: def.email,
              name: def.name,
              role: def.role,
              department: def.department,
              createdAt: new Date().toISOString()
            });
            updated = true;
          }
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
    const inReviewDocs = requiredDocs.filter(d => d.status === 'Em análise' || d.status === 'Reenviado');
    const notSentDocs = requiredDocs.filter(d => d.status === 'Não enviado');

    admission.approvedDocuments = approvedDocs.length;
    admission.totalDocuments = requiredDocs.length;
    admission.progressPercent = requiredDocs.length > 0
      ? Math.round((approvedDocs.length / requiredDocs.length) * 100)
      : 100;

    // REGRA: Uma admissão só pode ser "CONCLUÍDA" se todos os obrigatórios estiverem aprovados
    if (approvedDocs.length === requiredDocs.length && requiredDocs.length > 0) {
      admission.status = 'Concluída';
      if (!admission.completedAt) {
        admission.completedAt = new Date().toISOString();
        this.addAuditLog({
          userName: 'Sistema',
          action: 'Admissão concluída',
          admissionId: admission.id,
          employeeName: admission.employee.name,
          details: 'Todos os documentos obrigatórios foram aprovados pela equipe de RH.'
        });
        this.addNotification({
          title: 'Admissão concluída!',
          message: `O processo admissional de ${admission.employee.name} foi concluído com 100% dos documentos aprovados.`,
          type: 'completed',
          admissionId: admission.id,
          link: `/admissoes/${admission.id}`
        });
      }
    } else if (rejectedDocs.length > 0 || (admission.correctionRequest && !admission.correctionRequest.resolved)) {
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
}

export const db = new Database();
export { STORAGE_DIR };

