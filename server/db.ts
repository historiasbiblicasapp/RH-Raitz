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

  return {
    users: [userRaitzRH, adminUser, userAdminRaitz],
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
        if (!this.data.users) this.data.users = [];

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
    updates: Partial<Employee> & { status?: AdmissionStatus }, 
    updatedBy: string
  ): Admission {
    const admission = this.getAdmissionById(id);
    if (!admission) throw new Error('Admissão não encontrada.');

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
      admission.employee.cpf = cleanCPF;
    }

    if (updates.name) admission.employee.name = updates.name.trim();
    if (updates.birthDate) admission.employee.birthDate = updates.birthDate;
    if (updates.phone) admission.employee.phone = updates.phone.trim();
    if (updates.email) admission.employee.email = updates.email.toLowerCase().trim();
    if (updates.role) admission.employee.role = updates.role.trim();
    if (updates.department) admission.employee.department = updates.department.trim();
    if (updates.unit) admission.employee.unit = updates.unit.trim();
    if (updates.expectedStartDate) admission.employee.expectedStartDate = updates.expectedStartDate;

    if (updates.status && updates.status !== admission.status) {
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
      admissionId: admission.id,
      employeeName: admission.employee.name,
      details: `Dados cadastrais do colaborador ${admission.employee.name} (${admission.employee.role}) foram alterados.`
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
