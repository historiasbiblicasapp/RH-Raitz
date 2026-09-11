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

export interface Employee {
  id: string;
  name: string;
  cpf: string;
  birthDate: string;
  phone: string;
  email: string;
  role: string;
  department: string;
  unit: string;
  expectedStartDate: string;
  createdAt: string;
  updatedAt: string;
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
  documentType: DocumentType;
  required: boolean;
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

export interface AuditLog {
  id: string;
  timestamp: string;
  userId?: string;
  userName: string;
  performedBy?: string;
  action: string;
  admissionId?: string;
  employeeName?: string;
  documentType?: string;
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

export interface DashboardStats {
  newAdmissions: number;
  waitingDocuments: number;
  waitingReview: number;
  pendingIssues: number;
  completed: number;
  totalActive: number;
}
