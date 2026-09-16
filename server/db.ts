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
  AuditLogChange
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
  jobPositions: JobPosition[];
  documentTypes: DocumentTypeItem[];
  jobPositionDocuments: JobPositionDocument[];
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
    jobPositionDocuments: initialJobPositionDocs
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
      evolution
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
    // Limita a 1000 registros mais recentes em memória
    if (this.data.auditLogs.length > 1000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 1000);
    }
  }

  getAuditLogs(
    admissionId?: string, 
    options?: { entityType?: string; entityId?: string; action?: string; search?: string }
  ): AuditLog[] {
    let logs = this.data.auditLogs || [];
    if (admissionId) {
      logs = logs.filter(l => l.admissionId === admissionId);
    }
    if (options?.entityType) {
      logs = logs.filter(l => l.entityType === options.entityType);
    }
    if (options?.entityId) {
      logs = logs.filter(l => l.entityId === options.entityId);
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
        (l.employeeName && l.employeeName.toLowerCase().includes(q)) ||
        (l.documentType && l.documentType.toLowerCase().includes(q)) ||
        (l.entityName && l.entityName.toLowerCase().includes(q)) ||
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
}

export const db = new Database();
export { STORAGE_DIR };
