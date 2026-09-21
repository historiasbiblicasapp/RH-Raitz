// Tipos centrais do sistema Admissão Digital

export type AdmissionStatus = 
  | 'Rascunho'
  | 'Aguardando documentos'
  | 'Em conferência'
  | 'Pendência'
  | 'Concluída'
  | 'Cancelada';

export type DocumentType = 
  | 'CPF'
  | 'RG'
  | 'Carteira de Trabalho'
  | 'Comprovante de residência'
  | 'Diploma/Certificado'
  | 'Certidão de Nascimento/Casamento'
  | 'Título de Eleitor'
  | 'Outro';

export type DocumentStatus = 
  | 'Não enviado'
  | 'Enviado'
  | 'Em análise'
  | 'Aprovado'
  | 'Rejeitado'
  | 'Reenviado';

export type UserRole = 'RH' | 'ADMIN' | 'FUNCIONARIO' | 'RH_CONFERENCIA' | 'GESTOR';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface JobPosition {
  id: string;
  name: string;
  code?: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export type DocumentCategory = 
  | 'Pessoal'
  | 'Trabalhista'
  | 'Residencial'
  | 'Escolar'
  | 'Profissional'
  | 'Certificação'
  | 'Saúde'
  | 'Outros';

export const DOCUMENT_CATEGORIES: readonly DocumentCategory[] = [
  'Pessoal',
  'Trabalhista',
  'Residencial',
  'Escolar',
  'Profissional',
  'Certificação',
  'Saúde',
  'Outros'
] as const;

export const ALLOWED_FILE_FORMATS = ['PDF', 'JPG', 'JPEG', 'PNG'] as const;
export type AllowedFileFormat = typeof ALLOWED_FILE_FORMATS[number];

export interface DocumentTypeItem {
  id: string;
  name: string;
  description?: string;
  category: DocumentCategory | string;
  required_by_default: boolean;
  active: boolean;
  allowed_file_types: string[];
  max_file_size_mb: number;
  requires_expiration_date: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface JobPositionDocument {
  id: string;
  job_position_id: string;
  document_type_id: string;
  required: boolean;
  sort_order: number;
  instructions?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  // Campos populados opcionais para visualização
  document_type?: DocumentTypeItem;
  job_position?: JobPosition;
}

export type EmployeeStatus = 'Ativo' | 'Inativo';

export interface Employee {
  id: string;
  name: string;
  cpf: string;
  cpfMasked?: string;
  birthDate: string;
  phone: string;
  secondaryPhone?: string;
  email: string;
  role: string;
  jobPositionId?: string;
  department: string;
  unit: string;
  expectedStartDate: string;
  admissionDate?: string;
  registrationNumber?: string; // Matrícula
  active?: boolean;
  status?: EmployeeStatus;
  // Endereço
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  // Dados Pessoais e Identificação (Bloco 5.2)
  socialName?: string;
  rg?: string;
  rgIssuer?: string;
  rgIssueDate?: string;
  gender?: string;
  maritalStatus?: string;
  motherName?: string;
  fatherName?: string;
  nationality?: string;
  birthplace?: string;
  // Contato (Bloco 5.2)
  whatsapp?: string;
  personalEmail?: string;
  corporateEmail?: string;
  // Contato de Emergência (Bloco 5.2)
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  emergencyContactNotes?: string;
  // Dados Profissionais (Bloco 5.2)
  manager?: string;
  contractType?: string;
  workShift?: string;
  professionalNotes?: string;
  // Dados Complementares (Bloco 5.2)
  administrativeNotes?: string;
  internalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeFilters {
  search?: string;
  status?: EmployeeStatus | 'TODOS';
  role?: string;
  department?: string;
  unit?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface EmployeeResponse {
  employees: Employee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: {
    roles: string[];
    departments: string[];
    units: string[];
    statuses: string[];
  };
}

export interface EmployeeDetailResponse {
  employee: Employee;
  admissions: Admission[];
  summary: {
    totalAdmissions: number;
    lastAdmission?: Admission | null;
    lastAdmissionStatus?: string | null;
    pendingCount: number;
  };
  auditLogs: AuditLog[];
  documents?: EmployeeDocument[];
  documentStats?: EmployeeDocumentStats;
}

// ------------------------------------------------------------------
// BLOCO 5.3: GESTÃO DE DOCUMENTOS DO FUNCIONÁRIO
// ------------------------------------------------------------------

export type EmployeeDocumentCategory = 
  | 'Identificação'
  | 'Contratual'
  | 'Saúde e Segurança (SST)'
  | 'Certificações e Treinamentos'
  | 'Financeiro e Benefícios'
  | 'Outros';

export type EmployeeDocumentStatus = 
  | 'Válido'
  | 'A Vencer'
  | 'Vencido'
  | 'Em Análise'
  | 'Rejeitado'
  | 'Arquivado'
  | 'Pendente';

export type EmployeeDocumentExpirationStatus = 'valid' | 'near_expiration' | 'expired' | 'no_expiration';

export interface EmployeeDocumentVersion {
  version: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath?: string;
  fileUrl?: string;
  fileHash?: string;
  uploadedAt: string;
  uploadedBy: string;
  replacementReason?: string;
  notes?: string;
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  title: string;
  category: EmployeeDocumentCategory | string;
  documentTypeId?: string;
  documentTypeName?: string;
  description?: string;
  
  // Controle de Vigência e Vencimento
  hasExpiration: boolean;
  issueDate?: string;
  expirationDate?: string;
  daysUntilExpiration?: number;
  isExpired?: boolean;
  isNearExpiration?: boolean;
  expirationStatus?: EmployeeDocumentExpirationStatus;
  
  // Status de validação/conferência
  status: EmployeeDocumentStatus;
  
  // Arquivo Atual e Versionamento
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileHash?: string;
  storagePath?: string;
  fileUrl?: string;
  currentVersion: number;
  versions: EmployeeDocumentVersion[];
  
  // Origem do Documento
  origin: 'Admissão' | 'RH' | 'Upload Direto';
  admissionId?: string;
  admissionRole?: string;
  
  // Auditoria e Metadados
  notes?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  uploadedBy?: string;
}

export interface EmployeeDocumentStats {
  total: number;
  valid: number;
  nearExpiration: number; // A vencer nos próximos 30 dias
  expired: number;
  noExpiration: number;
  byCategory: Record<string, number>;
}

export interface EmployeeDocumentFilterOptions {
  category?: string;
  status?: string;
  expirationStatus?: 'todos' | 'valido' | 'a_vencer' | 'vencido' | 'sem_validade';
  search?: string;
  origin?: string;
}

export interface EmployeeDocumentsResponse {
  documents: EmployeeDocument[];
  stats: EmployeeDocumentStats;
  total: number;
}


export interface DocumentVersion {
  version: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  uploadedAt: string;
  status: DocumentStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  rejectionNotes?: string;
}

export interface AdmissionDocument {
  id: string;
  admissionId: string;
  documentType: DocumentType | string;
  document_type_id?: string;
  document_type_name?: string;
  category?: DocumentCategory | string;
  required: boolean;
  sort_order?: number;
  instructions?: string;
  requires_expiration_date?: boolean;
  allowed_file_types?: string[];
  max_file_size_mb?: number;
  source_job_position_document_id?: string;
  source_config_version?: string;
  status: DocumentStatus;
  currentVersion: number;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  storagePath?: string;
  uploadedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  rejectionNotes?: string;
  versions: DocumentVersion[];
  createdAt: string;
  updatedAt: string;
  created_by?: string;
  updated_by?: string;
}

export interface DataCorrectionRequest {
  requestedAt: string;
  details: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export const REJECTION_REASONS = [
  'Documento ilegível',
  'Documento incompleto',
  'Documento vencido',
  'Documento incorreto',
  'Foto cortada',
  'Dados divergentes',
  'Arquivo inválido',
  'Outro'
] as const;

export type RejectionReason = typeof REJECTION_REASONS[number];

export interface Admission {
  id: string;
  employeeId: string;
  employee: Employee;
  status: AdmissionStatus;
  inviteToken: string;
  inviteExpiresAt: string;
  inviteSentViaWhatsApp: boolean;
  inviteSentAt?: string;
  inviteLastSentAt?: string;
  inviteAccessCount?: number;
  inviteLastAccessedAt?: string;
  inviteRevoked?: boolean;
  inviteRevokedAt?: string;
  inviteRevokedBy?: string;
  consentGiven: boolean;
  consentDate?: string;
  consentTextVersion?: string;
  dataConfirmed: boolean;
  dataConfirmedAt?: string;
  correctionRequest?: DataCorrectionRequest;
  documents: AdmissionDocument[];
  progressPercent: number;
  totalDocuments: number;
  approvedDocuments: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  completedBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;

  // Bloco 5.4: Processo Admissional Configurável
  processVersionId?: string;
  processVersionNumber?: number;
  processSteps?: AdmissionProcessStepSnapshot[];
  currentStepKey?: string;

  // Bloco 5.5: Checklist Operacional Avançado
  operationalPriority?: OperationalPriority;
  operationalPriorityReason?: string;
  operationalPriorityUpdatedAt?: string;
  operationalPriorityUpdatedBy?: string;
}

// ------------------------------------------------------------------
// BLOCO 5.4: PROCESSO ADMISSIONAL CONFIGURÁVEL
// ------------------------------------------------------------------

export type ProcessStepKey =
  | 'CADASTRO'
  | 'DADOS_PESSOAIS'
  | 'DOCUMENTOS'
  | 'CONFERENCIA'
  | 'APROVACAO'
  | 'CONCLUSAO'
  | string;

export type ProcessStepStatus =
  | 'PENDENTE'
  | 'EM_ANDAMENTO'
  | 'CONCLUIDA'
  | 'BLOQUEADA'
  | 'IGNORADA';

export type ProcessStepCompletionRule =
  | 'CADASTRO_INICIAL'
  | 'DADOS_PREENCHIDOS'
  | 'DOCUMENTOS_APROVADOS'
  | 'CONFERENCIA_FINALIZADA'
  | 'APROVACAO_MANUAL'
  | 'ETAPAS_ANTERIORES_CONCLUIDAS'
  | 'MANUAL';

export type ProcessStepResponsibleRole = 'ADMIN' | 'RH' | 'GESTOR' | 'RH_CONFERENCIA' | 'DP' | 'CANDIDATO';

export interface ConfigurableProcessStep {
  id: string;
  stepKey: ProcessStepKey;
  name: string;
  description: string;
  order: number;
  active: boolean;
  required: boolean;
  responsibleRole: ProcessStepResponsibleRole;
  completionRule: ProcessStepCompletionRule;
}

export interface AdmissionProcessVersion {
  id: string;
  versionNumber: number;
  status: 'ativa' | 'historica';
  description?: string;
  changeNotes?: string;
  createdAt: string;
  createdBy: string;
  steps: ConfigurableProcessStep[];
}

export interface AdmissionProcessConfig {
  id: string;
  name: string;
  description?: string;
  currentVersion: number;
  activeVersionId: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface AdmissionProcessStepHistoryItem {
  action: 'iniciada' | 'concluida' | 'bloqueada' | 'reaberta';
  timestamp: string;
  userName: string;
  reason?: string;
  details?: string;
}

export interface AdmissionProcessStepSnapshot {
  id: string;
  admissionId: string;
  processVersionId: string;
  processVersionNumber: number;
  stepKey: ProcessStepKey;
  stepName: string;
  stepDescription: string;
  stepOrder: number;
  required: boolean;
  responsibleRole: string;
  completionRule: ProcessStepCompletionRule;
  status: ProcessStepStatus;
  blockReason?: string;
  startedAt?: string;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  history?: AdmissionProcessStepHistoryItem[];
}

export interface AdmissionProcessResponse {
  process: AdmissionProcessConfig;
  activeVersion: AdmissionProcessVersion;
  allVersions: AdmissionProcessVersion[];
}

export interface InviteItem {
  admissionId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeePhone: string;
  employeeCpf: string;
  employeeRole: string;
  employeeDepartment: string;
  employeeUnit: string;
  admissionStatus: AdmissionStatus;
  inviteToken: string;
  inviteExpiresAt: string;
  inviteSentViaWhatsApp: boolean;
  inviteSentAt?: string;
  inviteLastSentAt?: string;
  inviteAccessCount: number;
  inviteLastAccessedAt?: string;
  inviteRevoked: boolean;
  inviteRevokedAt?: string;
  inviteRevokedBy?: string;
  isExpired: boolean;
  statusLabel: 'Ativo' | 'Acessado' | 'Pendente de envio' | 'Expirado' | 'Revogado';
  createdAt: string;
}

export interface AdmissionsListResponse {
  admissions: Admission[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: {
    roles: string[];
    departments: string[];
    units: string[];
    statuses: string[];
  };
}

export interface AuditLogChange {
  field: string;
  label: string;
  previousValue: any;
  newValue: any;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  createdAt?: string;
  userId?: string;
  userName: string;
  performedBy?: string;
  action: string;
  entityType?: 'job_position' | 'document_type' | 'job_position_document' | 'admission' | 'admission_document' | 'user' | 'system' | 'settings' | 'communication_template' | 'employee' | 'employee_document' | 'admission_process' | 'admission_process_step';
  entityId?: string;
  entityName?: string;
  admissionId?: string;
  employeeName?: string;
  documentType?: string;
  fieldChanged?: string;
  previousValue?: string;
  newValue?: string;
  changes?: AuditLogChange[];
  details: string;
  ipAddress?: string;
}

export interface NotificationItem {
  id: string;
  timestamp: string;
  createdAt?: string;
  title: string;
  message: string;
  type: 'admission_created' | 'document_uploaded' | 'document_reviewed' | 'pending' | 'completed' | 'correction_requested';
  admissionId?: string;
  read: boolean;
  link?: string;
}

export type SystemNotification = NotificationItem;

export interface ConsentRecord {
  id: string;
  admissionId: string;
  employeeId: string;
  employeeCpf: string;
  timestamp: string;
  termVersion: string;
  termSummary: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface DocumentStats {
  notSent: number;
  sent: number;
  inReview: number;
  approved: number;
  rejected: number;
  waitingResend: number;
  total: number;
  requiredTotal: number;
  requiredApproved: number;
  approvalRate: number;
}

export interface DashboardStats {
  newAdmissions: number;
  waitingDocuments: number;
  waitingReview: number;
  pendingIssues: number;
  completed: number;
  totalActive: number;
  cancelled?: number;
  upcoming?: number;
  documentStats?: DocumentStats;
  byStatus?: {
    'Rascunho': number;
    'Aguardando documentos': number;
    'Em conferência': number;
    'Pendência': number;
    'Concluída': number;
    'Cancelada': number;
    [key: string]: number;
  };
  evolution?: Array<{
    date: string;
    label: string;
    count: number;
  }>;
  byProcessStep?: Record<string, {
    name: string;
    count: number;
    stepOrder: number;
  }>;
}

export interface DashboardStatsOptions {
  period?: 'today' | '7d' | '30d' | 'this_month' | 'next_month' | 'custom' | string;
  startDate?: string;
  endDate?: string;
  status?: string;
  role?: string;
  department?: string;
  unit?: string;
}

// =========================================================================
// BLOCO 4.2: CENTRAL DE PENDÊNCIAS
// =========================================================================

export type PendingType = 
  | 'documento_nao_enviado'
  | 'aguardando_conferencia'
  | 'documento_rejeitado'
  | 'aguardando_reenvio'
  | 'admissao_proxima';

export type PendingPriority = 'Alta' | 'Média' | 'Baixa';

export interface PendingItem {
  id: string;
  admissionId: string;
  admissionCode: string;
  employeeId?: string;
  employeeName: string;
  employeeCpf: string;
  role: string;
  department: string;
  unit?: string;
  documentId?: string;
  documentName?: string;
  documentCategory?: string;
  pendingType: PendingType;
  pendingTypeLabel: string;
  currentStatus: string;
  admissionStatus: AdmissionStatus;
  priority: PendingPriority;
  priorityScore: number; // 1: Alta, 2: Média, 3: Baixa
  date: string; // Data relevante da pendência ou data prevista
  expectedStartDate?: string;
  reviewerOrResponsible?: string;
  rejectionReason?: string;
  rejectionNotes?: string;
  isRequired: boolean;
  isOverdue?: boolean;
}

export interface PendingSummary {
  total: number;
  notSent: number;
  waitingReview: number;
  rejected: number;
  upcomingWithIssues: number;
}

export interface PendingFilters {
  tipo?: string;
  status?: string;
  cargo?: string;
  setor?: string;
  unidade?: string;
  documento?: string;
  responsavel?: string;
  prioridade?: string;
  search?: string;
  periodo?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PendingHubResponse {
  items: PendingItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: PendingSummary;
  filters: {
    roles: string[];
    departments: string[];
    units: string[];
    documentTypes: string[];
    responsibles: string[];
  };
}

// ------------------------------------------------------------------
// BLOCO 4.3 — COMUNICAÇÃO COM O FUNCIONÁRIO
// ------------------------------------------------------------------

export type CommunicationType = 
  | 'documents_pending' 
  | 'document_rejected' 
  | 'reminder' 
  | 'admission_upcoming'
  | 'general_notice';

export type CommunicationChannel = 'whatsapp' | 'copy';

export type CommunicationActionStatus = 'whatsapp_opened' | 'message_copied' | 'link_copied';

export interface CommunicationLog {
  id: string;
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
  actionStatusLabel: string;
  createdAt: string;
}

export interface CommunicationPendingReason {
  type: CommunicationType;
  label: string;
  documentId?: string;
  documentName?: string;
  rejectionReason?: string;
  detail: string;
  priority: 'Alta' | 'Média' | 'Baixa';
}

export interface CommunicationItem {
  id: string;
  admissionId: string;
  admissionCode: string;
  employeeId: string;
  employeeName: string;
  employeeCpf: string; // Mascarado
  employeePhone: string;
  role: string;
  department: string;
  unit?: string;
  expectedStartDate?: string;
  admissionStatus: AdmissionStatus;
  mainPendingReason: CommunicationPendingReason;
  inviteToken: string;
  inviteExpiresAt: string;
  inviteRevoked?: boolean;
  isInviteValid: boolean;
  lastCommunication?: {
    id: string;
    createdAt: string;
    channel: CommunicationChannel;
    userName: string;
    actionStatusLabel: string;
    communicationType: CommunicationType;
  };
}

export interface CommunicationSummary {
  inProgressCount: number;
  waitingDocumentsCount: number;
  rejectedDocumentsCount: number;
  waitingResponseCount: number;
  upcomingWithIssuesCount: number;
}

export interface CommunicationFilters {
  search?: string;
  status?: string;
  documentStatus?: string;
  cargo?: string;
  setor?: string;
  unidade?: string;
  page?: number;
  limit?: number;
}

export interface CommunicationHubResponse {
  items: CommunicationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: CommunicationSummary;
  filters: {
    roles: string[];
    departments: string[];
    units: string[];
    statuses: string[];
  };
}

// =========================================================================
// BLOCO 4.4: PRAZOS E ACOMPANHAMENTO OPERACIONAL
// =========================================================================

export type OperationalSituation =
  | 'proxima_admissao'
  | 'data_ultrapassada'
  | 'aguardando_funcionario'
  | 'aguardando_rh'
  | 'documento_rejeitado'
  | 'sem_movimentacao'
  | 'em_andamento'
  | 'concluida'
  | 'cancelada';

export interface TrackingTimeByStage {
  waitingDocumentsDays?: number | null;
  waitingRhDays?: number | null;
  inPendingDays?: number | null;
  totalAdmissionDays?: number | null;
}

export interface TrackingItem {
  id: string;
  admissionId: string;
  admissionCode: string;
  employeeId: string;
  employeeName: string;
  employeeCpf: string; // Mascarado LGPD
  employeePhone: string;
  role: string;
  department: string;
  unit: string;
  admissionStatus: AdmissionStatus;
  expectedStartDate: string;
  daysToExpectedDate: number; // Negativo se data ultrapassada
  daysSinceOverdue?: number; // >= 0 se data ultrapassada
  isOverdue: boolean;
  isUpcoming: boolean;
  operationalSituation: OperationalSituation;
  operationalSituationLabel: string;
  secondarySituations: Array<{ type: OperationalSituation; label: string }>;
  lastMovementDate: string;
  lastMovementDescription: string;
  daysWithoutMovement: number;
  hoursWithoutMovement: number;
  mainPendingReason: string;
  mainPendingDocumentId?: string;
  progressPercent: number;
  totalDocuments: number;
  approvedDocuments: number;
  needsAttention: boolean;
  attentionReason?: string;
  timeByStage?: TrackingTimeByStage;
  inviteToken?: string;
  isInviteValid?: boolean;
}

export interface TrackingSummary {
  upcomingCount: number;
  overdueCount: number;
  waitingEmployeeCount: number;
  waitingRhCount: number;
  noMovementCount: number;
  completedCount: number;
  attentionCount: number;
  totalCount: number;
}

export interface TrackingFilters {
  period?: string; // 'all' | 'today' | 'next_7' | 'next_15' | 'next_30' | 'overdue' | 'custom'
  startDate?: string;
  endDate?: string;
  status?: string;
  cargo?: string;
  setor?: string;
  unidade?: string;
  situacao?: string;
  tempoSemMovimentacao?: string; // 'all' | 'ate_2' | '3_a_5' | '6_a_10' | 'mais_10'
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TrackingResponse {
  items: TrackingItem[];
  attentionItems: TrackingItem[];
  summary: TrackingSummary;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: {
    roles: string[];
    departments: string[];
    units: string[];
    statuses: string[];
  };
}

// Linha do tempo da admissão (Seção 12)
export interface AdmissionTimelineEvent {
  id: string;
  stage: 
    | 'criacao' 
    | 'convite_enviado' 
    | 'funcionario_acessou' 
    | 'dados_confirmados' 
    | 'documentos_enviados' 
    | 'conferencia_rh' 
    | 'pendencia' 
    | 'reenvio' 
    | 'aprovacao' 
    | 'concluida' 
    | 'cancelada';
  title: string;
  description: string;
  date: string;
  performedBy?: string;
  status: 'completed' | 'current' | 'pending';
  metadata?: Record<string, any>;
}

export interface AdmissionStageTimes {
  waitingDocuments: string; // Ex: "2 dias" ou "Não disponível"
  waitingRh: string; // Ex: "4 horas" ou "Não disponível"
  inPending: string; // Ex: "1 dia" ou "Não disponível"
  totalAdmission: string; // Ex: "5 dias" ou "Não disponível"
}

// =========================================================================
// BLOCO 4.5 — RELATÓRIOS E INDICADORES DE RH
// =========================================================================

export type ReportType = 
  | 'admissoes' 
  | 'documentos' 
  | 'pendencias' 
  | 'concluidas' 
  | 'canceladas';

export interface ReportFilterOptions {
  reportType?: ReportType;
  period?: string; // 'all' | 'today' | '7d' | '30d' | 'this_month' | 'next_month' | 'custom'
  startDate?: string;
  endDate?: string;
  status?: string;
  cargo?: string;
  setor?: string;
  unidade?: string;
  documentStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ReportIndicators {
  totalAdmissions: number;
  inProgressAdmissions: number;
  completedAdmissions: number;
  cancelledAdmissions: number;
  completionRate: number;
  avgDaysToCompletion: number | null;
  totalDocuments: number;
  approvedDocuments: number;
  pendingDocuments: number;
  reviewingDocuments: number;
  documentApprovalRate: number;
}

export interface ReportChartItem {
  name: string;
  count: number;
  percentage: number;
  color?: string;
}

export interface ReportTimelineEvolution {
  date: string;
  label: string;
  count: number;
}

export interface ReportCharts {
  byStatus: ReportChartItem[];
  byDepartment: ReportChartItem[];
  byRole: ReportChartItem[];
  byUnit: ReportChartItem[];
  byDocumentStatus: ReportChartItem[];
  evolution: ReportTimelineEvolution[];
}

export interface ReportRowAdmission {
  id: string;
  admissionCode: string;
  employeeName: string;
  employeeCpfMasked: string;
  employeeEmail: string;
  employeePhone: string;
  role: string;
  department: string;
  unit: string;
  status: AdmissionStatus;
  expectedStartDate?: string;
  createdAt: string;
  completedAt?: string;
  progressPercent: number;
  approvedDocuments: number;
  totalDocuments: number;
  durationDays?: number;
}

export interface ReportRowDocument {
  id: string;
  admissionId: string;
  admissionCode: string;
  employeeName: string;
  employeeCpfMasked: string;
  role: string;
  department: string;
  unit: string;
  documentName: string;
  category: string;
  required: boolean;
  status: DocumentStatus;
  currentVersion: number;
  uploadedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface ReportRowPending {
  id: string;
  admissionId: string;
  admissionCode: string;
  employeeName: string;
  employeeCpfMasked: string;
  role: string;
  department: string;
  unit: string;
  documentName?: string;
  pendingType: string;
  pendingTypeLabel: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  daysPending: number;
  status: string;
  rejectionReason?: string;
  date: string;
}

export interface ReportRowCompleted {
  id: string;
  admissionCode: string;
  employeeName: string;
  employeeCpfMasked: string;
  role: string;
  department: string;
  unit: string;
  createdAt: string;
  completedAt: string;
  completedBy: string;
  durationDays: number;
  approvedDocuments: number;
  totalDocuments: number;
}

export interface ReportRowCancelled {
  id: string;
  admissionCode: string;
  employeeName: string;
  employeeCpfMasked: string;
  role: string;
  department: string;
  unit: string;
  createdAt: string;
  cancelledAt: string;
  cancelledBy: string;
  cancellationReason: string;
}

export interface ReportDataResponse {
  reportType: ReportType;
  indicators: ReportIndicators;
  charts: ReportCharts;
  rows: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  availableFilters: {
    roles: string[];
    departments: string[];
    units: string[];
    statuses: string[];
  };
}

// =========================================================================
// BLOCO 4.6 — CONFIGURAÇÕES OPERACIONAIS (TIPOS)
// =========================================================================

export interface SystemGeneralSettings {
  companyName: string;
  companyLogoUrl?: string;
  defaultUnit?: string;
  timezone?: string;
  cnpj?: string;
  systemName?: string;
  termVersion?: string;
  supportEmail?: string;
  supportPhone?: string;
  businessHours?: string;
}

export interface SystemAdmissionSettings {
  allowCancelAdmission: boolean;
  requireCancellationReason: boolean;
  allowEditDataAfterCreation: boolean;
  allowEditRoleAfterCreation: boolean;
  allowManualCompletion: boolean;
  upcomingDaysThreshold?: number;
  inactivityThresholdDays?: number;
  blockRetroactiveStartDate?: boolean;
  maxFutureDaysStartDate?: number;
}

export type DocumentExpirationHandling = 'only_inform' | 'alert_near_expiration' | 'alert_expired';

export interface SystemDocumentSettings {
  defaultMaxFileSizeMb: number;
  defaultAllowedFileTypes: string[];
  requireRhReview?: boolean;
  allowResubmissionAfterRejection?: boolean;
  allowMultipleVersions?: boolean;
  requireRejectionReason: boolean;
  expirationHandling?: DocumentExpirationHandling;
  alertExpiringDocumentsDays?: number;
  notifyEmployeeOnRejection?: boolean;
  allowUnlimitedResubmission?: boolean;
  maxResubmissionAttempts?: number;
}

export interface CommunicationTemplateItem {
  id: string;
  key: string; // 'documents_pending' | 'document_rejected' | 'reminder' | 'admission_upcoming' | 'general_notice'
  name: string;
  description: string;
  content: string;
  active: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export type CommunicationTemplate = CommunicationTemplateItem;

export interface SystemCommunicationSettings {
  defaultChannel: 'whatsapp' | 'email' | 'manual';
  sendWelcomeMessageOnCreate: boolean;
  workingHoursOnly: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface SystemNotificationSettings {
  notifyNewDocumentUploaded?: boolean;
  notifyDocumentRejected?: boolean;
  notifyNewPending?: boolean;
  notifyAdmissionUpcoming?: boolean;
  notifyAdmissionCompleted?: boolean;
  recipientsRole?: 'RH' | 'RH_CONFERENCIA' | 'ADMIN';
  notifyRhOnAllDocumentsSubmitted?: boolean;
  notifyRhOnDocumentResubmitted?: boolean;
  alertInactivityDaily?: boolean;
  digestEmailAddress?: string;
  digestNotificationHour?: string;
}

export interface SystemTrackingSettings {
  upcomingDaysThreshold: number; // Antecedência para destacar próximas admissões (padrão: 7)
  inactivityDaysThreshold: number; // Considerar sem movimentação após (padrão: 5)
}

export interface SystemReportSettings {
  showFullCpf: boolean; // Padrão: false (mascarar por padrão em conformidade com LGPD)
  allowExportCsv: boolean; // Padrão: true
  allowExportXlsx?: boolean; // Padrão: false
  allowPrint?: boolean; // Padrão: true
  auditExports: boolean; // Padrão: true
  retentionAuditDays?: number;
}

export interface SystemSecuritySettings {
  sessionTimeoutMinutes: number; // Padrão: 480 (8 horas)
  restrictAccessToRhAndAdmin: boolean; // Padrão: true
  enforceAuditLogging: boolean; // Padrão: true
}

export interface SystemSettings {
  id: string;
  general: SystemGeneralSettings;
  admission: SystemAdmissionSettings;
  documents: SystemDocumentSettings;
  communication?: SystemCommunicationSettings;
  communicationTemplates: CommunicationTemplateItem[];
  notifications: SystemNotificationSettings;
  tracking: SystemTrackingSettings;
  reports: SystemReportSettings;
  security: SystemSecuritySettings;
  updatedAt: string;
  updatedBy?: string;
}

// ------------------------------------------------------------------
// BLOCO 5.5: CHECKLIST OPERACIONAL AVANÇADO
// ------------------------------------------------------------------

export type OperationalPriority = 'NORMAL' | 'ALTA' | 'CRITICA';

export type OperationalChecklistSituation = 
  | 'EM_DIA' 
  | 'PROXIMA' 
  | 'ATRASADA' 
  | 'SEM_MOVIMENTACAO' 
  | 'BLOQUEADA';

export type OperationalResponsible = 
  | 'FUNCIONARIO' 
  | 'RH' 
  | 'GESTOR' 
  | 'RH_CONFERENCIA' 
  | 'DP' 
  | 'ADMIN' 
  | 'SISTEMA';

export interface OperationalPendingSummary {
  totalInCourse: number;       // Admissões ativas em andamento
  criticalPendings: number;    // Admissões com prioridade Crítica
  employeePendings: number;    // Pendências sob responsabilidade do Funcionário
  rhPendings: number;          // Pendências sob responsabilidade do RH
  waitingReviewDocs: number;   // Documentos enviados aguardando conferência
  upcomingAdmissions: number;  // Admissões próximas do início previsto
  delayedAdmissions: number;   // Admissões atrasadas (data prevista ultrapassada)
  inactiveAdmissions: number;  // Admissões sem movimentação há mais tempo que o limiar
  blockedAdmissions: number;   // Admissões com etapa ou processo bloqueado
}

export interface OperationalTaskItem {
  id: string;
  title: string;
  description?: string;
  category: 'CADASTRO' | 'DADOS' | 'DOCUMENTO' | 'CONFERENCIA' | 'APROVACAO' | 'CONCLUSAO' | 'ETAPA' | 'GERAL';
  responsible: OperationalResponsible;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'BLOQUEADA' | 'REJEITADA';
  documentId?: string;
  documentName?: string;
  rejectionReason?: string;
  rejectionNotes?: string;
  stepId?: string;
  stepName?: string;
  priority: OperationalPriority;
  actionRequired?: string;
  completedAt?: string;
  completedBy?: string;
}

export interface OperationalChecklistItem {
  admissionId: string;
  admissionCode: string;
  employeeId: string;
  employeeName: string;
  employeeCpf: string;
  employeeCpfMasked: string;
  employeeRole: string;
  employeeDepartment: string;
  employeeUnit: string;
  employeeEmail: string;
  employeePhone: string;
  
  // Datas e Prazos Operacionais
  createdAt: string;
  expectedStartDate?: string;
  lastActivityAt: string;
  lastActivityDescription?: string;
  daysSinceCreation: number;
  daysWithoutMovement: number;
  daysInCurrentStep: number;

  // Processo & Etapa (Bloco 5.4)
  currentStepKey?: string;
  currentStepName: string;
  currentStepOrder: number;
  totalSteps: number;
  completedSteps: number;
  currentStepStatus: ProcessStepStatus;
  currentStepResponsible: string;
  currentStepBlockReason?: string;

  // Progresso Consolidado
  progressPercent: number; // Percentual ponderado global
  documentsProgressPercent: number;
  totalDocuments: number;
  approvedDocuments: number;
  inReviewDocuments: number;
  rejectedDocuments: number;
  notSentDocuments: number;

  // Operacional
  status: AdmissionStatus;
  operationalPriority: OperationalPriority;
  operationalPriorityReason?: string;
  operationalSituation: OperationalChecklistSituation;
  operationalSituationLabel: string;
  primaryPending: {
    type: 
      | 'BLOQUEIO' 
      | 'DOC_REJEITADO' 
      | 'DOC_NAO_ENVIADO' 
      | 'DOC_CONFERENCIA' 
      | 'ETAPA_RESPONSAVEL' 
      | 'ADMISSAO_PROXIMA' 
      | 'SEM_MOVIMENTACAO' 
      | 'NENHUMA';
    title: string;
    description: string;
    responsible: OperationalResponsible;
    documentId?: string;
    stepId?: string;
  };
  currentResponsible: OperationalResponsible;

  // Tarefas operacionais desta admissão
  tasks?: OperationalTaskItem[];
}

export interface OperationalChecklistFilters {
  search?: string;
  status?: string;
  step?: string;
  responsible?: string;
  priority?: string;
  situation?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OperationalChecklistResponse {
  items: OperationalChecklistItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: OperationalPendingSummary;
  filters: {
    roles: string[];
    departments: string[];
    units: string[];
    steps: { key: string; name: string }[];
    responsibles: string[];
    statuses: string[];
  };
}



