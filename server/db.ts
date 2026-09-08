import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  Admission, 
  Employee, 
  AdmissionDocument, 
  AuditLog, 
  NotificationItem, 
  ConsentRecord,
  DashboardStats,
  DocumentType,
  DocumentStatus,
  AdmissionStatus,
  User
} from '../src/types/index.ts';

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

function generateInitialData(): DatabaseSchema {
  const adminUser: User = {
    id: 'user-rh-01',
    email: 'rh@empresa.com',
    name: 'Mariana Silveira',
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

  return {
    users: [adminUser],
    employees: [emp1, emp2, emp3],
    admissions: [adm1, adm2, adm3],
    auditLogs,
    notifications,
    consentRecords: []
  };
}

export class Database {
  private data: DatabaseSchema;

  constructor() {
    ensureDirectories();
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (e) {
        console.error('Error reading db.json, generating initial data:', e);
        this.data = generateInitialData();
        this.save();
      }
    } else {
      this.data = generateInitialData();
      this.save();
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving db.json:', e);
    }
  }

  // Estatísticas do Dashboard
  getStats(): DashboardStats {
    const admissions = this.data.admissions.filter(a => a.status !== 'Cancelada');
    
    // Novas admissões (últimos 7 dias)
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const newAdmissions = admissions.filter(a => new Date(a.createdAt).getTime() >= sevenDaysAgo).length;
    
    const waitingDocuments = admissions.filter(a => a.status === 'Aguardando documentos').length;
    const waitingReview = admissions.filter(a => a.status === 'Em conferência').length;
    const pendingIssues = admissions.filter(a => a.status === 'Pendência').length;
    const completed = admissions.filter(a => a.status === 'Concluída').length;

    return {
      newAdmissions,
      waitingDocuments,
      waitingReview,
      pendingIssues,
      completed,
      totalActive: admissions.length
    };
  }

  // Usuários
  getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
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

  createAdmission(employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>, createdByUserName: string): Admission {
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

    // Checklist inicial dos 5 documentos obrigatórios
    const documents: AdmissionDocument[] = INITIAL_DOC_TYPES.map(item => ({
      id: 'doc-' + crypto.randomUUID(),
      admissionId,
      documentType: item.type,
      required: item.required,
      status: 'Não enviado',
      currentVersion: 0,
      versions: [],
      createdAt: now,
      updatedAt: now
    }));

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
      totalDocuments: documents.length,
      approvedDocuments: 0,
      createdAt: now,
      updatedAt: now
    };

    this.data.employees.push(employee);
    this.data.admissions.push(newAdmission);

    // Auditoria
    this.addAuditLog({
      userName: createdByUserName,
      action: 'RH criou uma nova admissão',
      admissionId,
      employeeName: employee.name,
      details: `Admissão cadastrada para o cargo ${employee.role} (${employee.department} - ${employee.unit})`
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
      message: `Admissão de ${employee.name} (${employee.role}) foi criada com sucesso.`,
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

  confirmEmployeeData(admissionId: string) {
    const admission = this.getAdmissionById(admissionId);
    if (!admission) throw new Error('Admissão não encontrada');

    admission.dataConfirmed = true;
    admission.dataConfirmedAt = new Date().toISOString();
    admission.updatedAt = new Date().toISOString();

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
      admissionId,
      employeeName: admission.employee.name,
      documentType: doc.documentType,
      details: `Arquivo ${file.fileName} (${(file.fileSize / 1024).toFixed(1)} KB) - Versão ${newVersion}`
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
    rejectionNotes?: string
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
      throw new Error('Documento não encontrado na base de dados');
    }

    if (decision === 'Rejeitado' && !rejectionReason) {
      throw new Error('É obrigatório informar o motivo da rejeição');
    }

    const now = new Date().toISOString();
    targetDocument.status = decision;
    targetDocument.reviewedAt = now;
    targetDocument.reviewedBy = reviewerName;
    targetDocument.rejectionReason = decision === 'Rejeitado' ? rejectionReason : undefined;
    targetDocument.rejectionNotes = decision === 'Rejeitado' ? rejectionNotes : undefined;
    targetDocument.updatedAt = now;

    // Atualiza a última versão gravada no histórico
    const lastVersion = targetDocument.versions[targetDocument.versions.length - 1];
    if (lastVersion) {
      lastVersion.status = decision;
      lastVersion.reviewedAt = now;
      lastVersion.reviewedBy = reviewerName;
      lastVersion.rejectionReason = decision === 'Rejeitado' ? rejectionReason : undefined;
      lastVersion.rejectionNotes = decision === 'Rejeitado' ? rejectionNotes : undefined;
    }

    this.recalculateAdmissionStatus(targetAdmission);

    if (decision === 'Aprovado') {
      this.addAuditLog({
        userName: reviewerName,
        action: `RH aprovou ${targetDocument.documentType}`,
        admissionId: targetAdmission.id,
        employeeName: targetAdmission.employee.name,
        documentType: targetDocument.documentType,
        details: `Documento aprovado na versão ${targetDocument.currentVersion}`
      });
    } else {
      this.addAuditLog({
        userName: reviewerName,
        action: `RH rejeitou ${targetDocument.documentType}`,
        admissionId: targetAdmission.id,
        employeeName: targetAdmission.employee.name,
        documentType: targetDocument.documentType,
        details: `Motivo: ${rejectionReason}. Observação: ${rejectionNotes || 'Sem observações adicionais'}`
      });

      this.addNotification({
        title: 'Documento rejeitado',
        message: `${targetDocument.documentType} de ${targetAdmission.employee.name} foi recusado: "${rejectionReason}"`,
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
    const requiredDocs = admission.documents.filter(d => d.required);
    const approvedDocs = requiredDocs.filter(d => d.status === 'Aprovado');
    const rejectedDocs = requiredDocs.filter(d => d.status === 'Rejeitado');
    const inReviewDocs = requiredDocs.filter(d => d.status === 'Em análise' || d.status === 'Reenviado');
    const notSentDocs = requiredDocs.filter(d => d.status === 'Não enviado');

    admission.approvedDocuments = approvedDocs.length;
    admission.totalDocuments = requiredDocs.length;
    admission.progressPercent = Math.round((approvedDocs.length / requiredDocs.length) * 100);

    // REGRA 25: Uma admissão somente poderá ficar como "CONCLUÍDA" quando TODOS os documentos obrigatórios estiverem "APROVADOS"
    if (approvedDocs.length === requiredDocs.length) {
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
    } else if (rejectedDocs.length > 0) {
      // Se possui qualquer documento rejeitado -> Pendência
      admission.status = 'Pendência';
    } else if (inReviewDocs.length > 0) {
      // Se há documentos aguardando análise -> Em conferência
      admission.status = 'Em conferência';
    } else if (notSentDocs.length === requiredDocs.length) {
      admission.status = 'Aguardando documentos';
    } else {
      admission.status = 'Aguardando documentos';
    }

    admission.updatedAt = new Date().toISOString();
  }

  // Auditoria
  addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>) {
    const newLog: AuditLog = {
      id: 'audit-' + crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...log
    };
    this.data.auditLogs.unshift(newLog);
    // Limita a 500 registros mais recentes em memória
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
  }

  getAuditLogs(admissionId?: string): AuditLog[] {
    if (admissionId) {
      return this.data.auditLogs.filter(l => l.admissionId === admissionId);
    }
    return this.data.auditLogs;
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
}

export const db = new Database();
export { STORAGE_DIR };
