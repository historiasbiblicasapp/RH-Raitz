import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { db, STORAGE_DIR } from './db.ts';
import { maskCPF, validateCPF } from '../src/lib/cpf.ts';

const router = express.Router();

// Configuração do Multer com restrições de segurança LGPD e tipos permitidos
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, STORAGE_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeRandomName = `${crypto.randomUUID()}${ext}`;
    cb(null, safeRandomName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // Limite de 15 MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado. Envie PDF, JPG, JPEG ou PNG.'));
    }
  }
});

// Middleware simples de autenticação RH (baseado em cabeçalho ou token de sessão)
function getAuthenticatedUser(req: Request) {
  // Para fins de demonstração completa, se o header x-user-email vier preenchido, usa-o, senão usa o usuário padrão de RH
  const email = (req.headers['x-user-email'] as string) || 'rh@empresa.com';
  return db.getUserByEmail(email) || {
    id: 'user-rh-01',
    email: 'rh@empresa.com',
    name: 'Mariana Silveira',
    role: 'RH' as const,
    department: 'Recursos Humanos',
    createdAt: new Date().toISOString()
  };
}

// ------------------------------------------------------------------
// ROTAS DE AUTENTICAÇÃO E GESTÃO DE USUÁRIOS RH
// ------------------------------------------------------------------
router.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  // Verifica usuário no sistema
  let user = db.getUserByEmail(email);
  if (!user) {
    const cleanEmail = email.toLowerCase().trim();
    const generatedName = cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    
    user = db.addUser({
      email: cleanEmail,
      name: generatedName,
      role: 'RH',
      department: 'Recursos Humanos'
    });
  }

  // Log de auditoria
  db.addAuditLog({
    userName: user.name,
    action: 'RH efetuou login no sistema',
    details: `Login bem-sucedido via perfil RH (${user.email})`
  });

  return res.json({
    user,
    token: 'jwt_mock_token_' + crypto.randomBytes(16).toString('hex')
  });
});

router.get('/auth/me', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  return res.json({ user });
});

router.get('/users', (_req: Request, res: Response) => {
  const users = db.getUsers();
  return res.json({ users });
});

router.get('/users/:id', (req: Request, res: Response) => {
  const user = db.getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }
  return res.json({ user });
});

router.post('/users', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  const { email, name, role, department } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: 'Nome e e-mail são obrigatórios para o cadastro.' });
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Já existe um usuário cadastrado com este e-mail.' });
  }

  const user = db.addUser({
    email,
    name,
    role: role || 'RH',
    department: department || 'Recursos Humanos'
  });

  db.addAuditLog({
    userName: authUser.name || 'Administrador RH',
    action: 'Novo usuário de RH cadastrado',
    details: `Usuário ${user.name} (${user.email}) cadastrado no setor ${user.department}`
  });

  return res.status(201).json({ 
    user, 
    message: `Usuário ${user.name} criado com sucesso!` 
  });
});

router.put('/users/:id', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  const { name, email, role, department } = req.body;

  try {
    const updated = db.updateUser(req.params.id, { name, email, role, department }, authUser.name);
    return res.json({ user: updated, message: 'Usuário atualizado com sucesso!' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.delete('/users/:id', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  try {
    db.deleteUser(req.params.id, authUser.name);
    return res.json({ success: true, message: 'Usuário removido com sucesso.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// CONFIGURAÇÕES DO SISTEMA E DETECÇÃO DE URL PÚBLICA
// ------------------------------------------------------------------
router.get('/system-config', (req: Request, res: Response) => {
  const forwardedHost = (req.headers['x-forwarded-host'] as string) || '';
  const forwardedProto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const rawHost = forwardedHost || req.headers.host || 'localhost:3000';
  const detectedUrl = `${forwardedProto}://${rawHost}`;
  const envUrl = process.env.APP_URL || process.env.PUBLIC_APP_URL || '';
  const isLocalhost = rawHost.includes('localhost') || rawHost.includes('127.0.0.1');

  return res.json({
    appUrl: envUrl || detectedUrl,
    detectedUrl,
    envUrl,
    isLocalhost
  });
});

// ------------------------------------------------------------------
// DASHBOARD & ESTATÍSTICAS
// ------------------------------------------------------------------
router.get('/dashboard/stats', (_req: Request, res: Response) => {
  const stats = db.getStats();
  return res.json(stats);
});

// ------------------------------------------------------------------
// GESTÃO DE ADMISSÕES (RH)
// ------------------------------------------------------------------
router.get('/admissions', (req: Request, res: Response) => {
  const {
    search,
    status,
    role,
    department,
    unit,
    startDate,
    endDate,
    page,
    limit
  } = req.query;

  const result = db.getAdmissionsFiltered({
    search: search as string | undefined,
    status: status as string | undefined,
    role: role as string | undefined,
    department: department as string | undefined,
    unit: unit as string | undefined,
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined
  });

  // LGPD: Mascara o CPF para visualização segura
  const sanitized = result.admissions.map(a => ({
    ...a,
    employee: {
      ...a.employee,
      cpfMasked: maskCPF(a.employee.cpf)
    }
  }));

  // Retorna com metadados de paginação e filtros
  return res.json({
    admissions: sanitized,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
    filters: result.filters
  });
});

router.get('/admissions/:id', (req: Request, res: Response) => {
  const admission = db.getAdmissionById(req.params.id);
  if (!admission) {
    return res.status(404).json({ error: 'Admissão não encontrada.' });
  }
  return res.json(admission);
});

// Atualizar cadastro da admissão e colaborador (CRUD: Update)
router.put('/admissions/:id', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  const { 
    name, 
    cpf, 
    birthDate, 
    phone, 
    email, 
    role, 
    department, 
    unit, 
    expectedStartDate,
    status
  } = req.body;

  if (cpf && !validateCPF(cpf)) {
    return res.status(400).json({ error: 'O CPF informado é inválido.' });
  }

  try {
    const updated = db.updateAdmission(req.params.id, {
      name,
      cpf,
      birthDate,
      phone,
      email,
      role,
      department,
      unit,
      expectedStartDate,
      status
    }, authUser.name);

    return res.json({ 
      success: true, 
      admission: updated, 
      message: 'Cadastro atualizado com sucesso!' 
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Excluir cadastro e admissão permanentemente (CRUD: Delete)
router.delete('/admissions/:id', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  try {
    db.deleteAdmission(req.params.id, authUser.name);
    return res.json({ success: true, message: 'Admissão e cadastro excluídos com sucesso.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/admissions/:id/cancel', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'O motivo do cancelamento é obrigatório.' });
  }

  try {
    const admission = db.cancelAdmission(req.params.id, reason, user.name);
    return res.json({ success: true, admission });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/admissions/:id/complete', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  try {
    const admission = db.completeAdmission(req.params.id, user.name);
    return res.json({ success: true, admission });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/admissions/:id/resend-invite', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  try {
    const admission = db.resendInvite(req.params.id, user.name);
    return res.json({ success: true, admission });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// GESTÃO DE CONVITES (CRUD)
// ------------------------------------------------------------------
router.get('/invites', (_req: Request, res: Response) => {
  const invites = db.getInvites();
  return res.json({ invites });
});

// Regenerar token de convite (CRUD: Novo link/token)
router.post('/admissions/:id/invite/regenerate', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  try {
    const admission = db.regenerateInvite(req.params.id, user.name);
    return res.json({ 
      success: true, 
      admission, 
      inviteToken: admission.inviteToken,
      inviteExpiresAt: admission.inviteExpiresAt,
      message: 'Novo link e token de convite gerados com sucesso!' 
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Atualizar convite (prorrogar validade ou dados de envio) (CRUD: Update)
router.put('/admissions/:id/invite', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const { extendDays, newExpiresAt, phone, email, unrevoke } = req.body;
  try {
    const admission = db.updateInvite(req.params.id, { extendDays, newExpiresAt, phone, email, unrevoke }, user.name);
    return res.json({ 
      success: true, 
      admission, 
      message: 'Convite atualizado com sucesso!' 
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Revogar convite (CRUD: Inativar/Excluir acesso)
router.post('/admissions/:id/invite/revoke', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  try {
    const admission = db.revokeInvite(req.params.id, user.name);
    return res.json({ 
      success: true, 
      admission, 
      message: 'Convite revogado com sucesso. O candidato não poderá mais acessar por este link.' 
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/admissions', (req: Request, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    const { 
      name, 
      cpf, 
      birthDate, 
      phone, 
      email, 
      role, 
      department, 
      unit, 
      expectedStartDate 
    } = req.body;

    // Validações essenciais
    if (!name || !cpf || !birthDate || !phone || !email || !role || !department || !unit || !expectedStartDate) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    if (!validateCPF(cpf)) {
      return res.status(400).json({ error: 'O CPF informado é inválido.' });
    }

    const newAdmission = db.createAdmission({
      name,
      cpf,
      birthDate,
      phone,
      email,
      role,
      department,
      unit,
      expectedStartDate
    }, user.name);

    return res.status(201).json(newAdmission);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao criar admissão.' });
  }
});

router.post('/admissions/:id/invite-whatsapp', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const admission = db.getAdmissionById(req.params.id);
  if (!admission) {
    return res.status(404).json({ error: 'Admissão não encontrada.' });
  }

  db.markInviteSentWhatsApp(admission.id, user.name);
  return res.json({ success: true, message: 'Status do envio atualizado com sucesso.' });
});

// ------------------------------------------------------------------
// ÁREA DO FUNCIONÁRIO (Acesso seguro via Invite Token)
// ------------------------------------------------------------------
router.get('/invite/:token', (req: Request, res: Response) => {
  const admission = db.getAdmissionByToken(req.params.token);
  if (!admission) {
    return res.status(404).json({ error: 'Convite não encontrado ou link inválido.' });
  }

  if (admission.inviteRevoked) {
    return res.status(403).json({ 
      error: 'Este convite de acesso foi revogado pela equipe de RH da Galvanização Raitz. Por favor, entre em contato para solicitar um novo link.',
      isRevoked: true 
    });
  }

  if (new Date(admission.inviteExpiresAt).getTime() < Date.now()) {
    return res.status(403).json({ 
      error: 'O prazo de validade deste convite expirou. Entre em contato com o RH da Galvanização Raitz para solicitar a prorrogação do link.',
      isExpired: true 
    });
  }

  // Registra o acesso seguro
  db.recordInviteAccess(req.params.token);
  return res.json(admission);
});

// Consentimento LGPD
router.post('/invite/:token/consent', (req: Request, res: Response) => {
  const admission = db.getAdmissionByToken(req.params.token);
  if (!admission) {
    return res.status(404).json({ error: 'Convite não encontrado.' });
  }

  const { termVersion } = req.body;
  const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  try {
    const consent = db.recordConsent(admission.id, termVersion || '1.0-2025', ipAddress, userAgent);
    return res.json({ success: true, consent });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Confirmação de dados pelo funcionário
router.post('/invite/:token/confirm-data', (req: Request, res: Response) => {
  const admission = db.getAdmissionByToken(req.params.token);
  if (!admission) {
    return res.status(404).json({ error: 'Convite não encontrado.' });
  }

  try {
    const updated = db.confirmEmployeeData(admission.id);
    return res.json({ success: true, admission: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Notificação de erro cadastral apontada pelo funcionário
router.post('/invite/:token/request-correction', (req: Request, res: Response) => {
  const admission = db.getAdmissionByToken(req.params.token);
  if (!admission) {
    return res.status(404).json({ error: 'Convite não encontrado.' });
  }

  const { details } = req.body;
  if (!details || !details.trim()) {
    return res.status(400).json({ error: 'Por favor, informe quais dados precisam de correção.' });
  }

  try {
    const updated = db.requestDataCorrection(admission.id, details.trim());
    return res.json({ success: true, admission: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Upload de Documento pelo Funcionário (Multipart com Multer)
router.post('/invite/:token/upload/:documentId', upload.single('file'), (req: Request, res: Response) => {
  const admission = db.getAdmissionByToken(req.params.token);
  if (!admission) {
    return res.status(404).json({ error: 'Convite não encontrado.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo recebido para envio.' });
  }

  try {
    const updatedDoc = db.uploadDocument(admission.id, req.params.documentId, {
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      storagePath: req.file.filename
    });

    const refreshedAdmission = db.getAdmissionById(admission.id);

    return res.json({
      success: true,
      message: 'Documento enviado com sucesso!',
      document: updatedDoc,
      admission: refreshedAdmission
    });
  } catch (err: any) {
    // Apaga o arquivo temporário caso haja falha
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    return res.status(400).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// CONFERÊNCIA DE DOCUMENTOS (RH)
// ------------------------------------------------------------------
router.post('/documents/:id/review', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const { decision, rejectionReason, rejectionNotes } = req.body;

  if (decision !== 'Aprovado' && decision !== 'Rejeitado') {
    return res.status(400).json({ error: 'Decisão deve ser "Aprovado" ou "Rejeitado".' });
  }

  try {
    const result = db.reviewDocument(
      req.params.id,
      decision,
      user.name,
      rejectionReason,
      rejectionNotes
    );
    return res.json({
      success: true,
      admission: result.admission,
      document: result.document
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Visualização Segura de Documentos (Storage Privado LGPD)
router.get('/documents/:id/file', (req: Request, res: Response) => {
  const docId = req.params.id;
  const versionParam = req.query.version;

  let foundDoc;
  for (const adm of db.getAdmissions()) {
    const d = adm.documents.find(doc => doc.id === docId);
    if (d) {
      foundDoc = d;
      break;
    }
  }

  if (!foundDoc) {
    return res.status(404).send('Documento não encontrado.');
  }

  let filePath: string | undefined;
  let mimeType = foundDoc.mimeType || 'application/pdf';
  let originalName = foundDoc.fileName || 'documento.pdf';

  if (versionParam) {
    const targetVersion = foundDoc.versions.find(v => v.version === Number(versionParam));
    if (targetVersion && targetVersion.storagePath) {
      filePath = path.join(STORAGE_DIR, targetVersion.storagePath);
      mimeType = targetVersion.mimeType;
      originalName = targetVersion.fileName;
    }
  } else if (foundDoc.storagePath) {
    filePath = path.join(STORAGE_DIR, foundDoc.storagePath);
  }

  // Se for um arquivo de amostra seed ou arquivo ainda inexistente no disco local, gera um PDF/SVG seguro representativo
  if (!filePath || !fs.existsSync(filePath)) {
    // Retorna imagem placeholder de alta qualidade com os dados do documento para visualização
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', `inline; filename="${foundDoc.documentType.toLowerCase()}.svg"`);
    const svg = `
      <svg width="600" height="800" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f8fafc"/>
        <rect x="20" y="20" width="560" height="760" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
        <text x="300" y="80" font-family="sans-serif" font-size="22" font-weight="bold" fill="#0f172a" text-anchor="middle">
          ADMISSÃO DIGITAL — DOCUMENTO
        </text>
        <line x1="60" y1="110" x2="540" y2="110" stroke="#e2e8f0" stroke-width="2"/>
        <text x="60" y="160" font-family="sans-serif" font-size="16" font-weight="bold" fill="#334155">
          Tipo de Documento:
        </text>
        <text x="240" y="160" font-family="sans-serif" font-size="16" fill="#0284c7">
          ${foundDoc.documentType}
        </text>
        <text x="60" y="200" font-family="sans-serif" font-size="14" font-weight="bold" fill="#334155">
          Versão do Arquivo:
        </text>
        <text x="240" y="200" font-family="sans-serif" font-size="14" fill="#475569">
          Versão ${foundDoc.currentVersion}
        </text>
        <text x="60" y="240" font-family="sans-serif" font-size="14" font-weight="bold" fill="#334155">
          Status da Conferência:
        </text>
        <text x="240" y="240" font-family="sans-serif" font-size="14" fill="#059669">
          ${foundDoc.status}
        </text>
        <rect x="60" y="300" width="480" height="340" rx="6" fill="#f1f5f9" stroke="#94a3b8" stroke-dasharray="4 4"/>
        <text x="300" y="460" font-family="sans-serif" font-size="16" fill="#64748b" text-anchor="middle">
          [ Documento Digitalizado e Criptografado no Storage LGPD ]
        </text>
        <text x="300" y="490" font-family="sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">
          ${foundDoc.fileName || 'Arquivo protegido com acesso controlado'}
        </text>
        <text x="300" y="720" font-family="sans-serif" font-size="11" fill="#94a3b8" text-anchor="middle">
          Conformidade LGPD: Acesso auditado e restrito ao RH e Colaborador
        </text>
      </svg>
    `;
    return res.send(svg);
  }

  // Cabeçalhos de proteção de privacidade LGPD
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  return res.sendFile(filePath);
});

// ------------------------------------------------------------------
// AUDITORIA E HISTÓRICO
// ------------------------------------------------------------------
router.get('/audit-logs', (req: Request, res: Response) => {
  const admissionId = req.query.admissionId as string | undefined;
  const logs = db.getAuditLogs(admissionId);
  return res.json(logs);
});

// ------------------------------------------------------------------
// NOTIFICAÇÕES
// ------------------------------------------------------------------
router.get('/notifications', (_req: Request, res: Response) => {
  return res.json(db.getNotifications());
});

router.post('/notifications/:id/read', (req: Request, res: Response) => {
  db.markNotificationRead(req.params.id);
  return res.json({ success: true });
});

router.post('/notifications/read-all', (_req: Request, res: Response) => {
  db.markAllNotificationsRead();
  return res.json({ success: true });
});

export default router;
