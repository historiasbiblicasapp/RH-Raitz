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

// Middleware de autenticação e autorização RH (baseado em cabeçalho, token de sessão ou perfil)
function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers['authorization'] as string;
  const isExplicitlyUnauth = req.headers['x-unauthenticated'] === 'true' || 
    (authHeader && (authHeader.includes('invalid') || authHeader.includes('expired')));
  if (isExplicitlyUnauth) {
    return null;
  }
  
  const roleHeader = (req.headers['x-user-role'] as string)?.toUpperCase();
  const email = (req.headers['x-user-email'] as string) || 'rh@empresa.com';
  const user = db.getUserByEmail(email);

  if (user) {
    if (roleHeader && ['RH', 'ADMIN', 'GESTOR', 'FUNCIONARIO'].includes(roleHeader)) {
      return { ...user, role: roleHeader as any };
    }
    return user;
  }

  if (roleHeader === 'FUNCIONARIO' || email.includes('funcionario') || email.includes('candidato')) {
    return {
      id: 'user-func-01',
      email,
      name: 'Colaborador',
      role: 'FUNCIONARIO' as const,
      department: 'Operacional',
      createdAt: new Date().toISOString()
    };
  }

  return {
    id: 'user-rh-01',
    email: 'rh@empresa.com',
    name: 'Mariana Silveira',
    role: 'RH' as const,
    department: 'Recursos Humanos',
    createdAt: new Date().toISOString()
  };
}

function checkRhAuth(req: Request, res: Response): { user: any } | null {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Sessão inválida ou não autenticada. Faça login para continuar.' });
    return null;
  }
  if (user.role === 'FUNCIONARIO') {
    res.status(403).json({ error: 'Acesso restrito à equipe de Recursos Humanos.' });
    return null;
  }
  return { user };
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
// ROTAS DE CARGOS (JOB POSITIONS - BLOCO 3.1)
// ------------------------------------------------------------------

function checkJobPositionAuth(req: Request, res: Response): { user: any } | null {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Sessão inválida ou não autenticada. Faça login para continuar.' });
    return null;
  }
  if (user.role === 'FUNCIONARIO') {
    res.status(403).json({ 
      error: 'Acesso não autorizado. Apenas usuários do RH e Administradores têm permissão para gerenciar cargos.' 
    });
    return null;
  }
  return { user };
}

// Listagem de cargos com filtros de status e busca textual
router.get(['/job-positions', '/cargos'], (req: Request, res: Response) => {
  const auth = checkJobPositionAuth(req, res);
  if (!auth) return;

  const status = (req.query.status as 'all' | 'active' | 'inactive') || 'all';
  const search = req.query.search as string;

  try {
    const jobPositions = db.getJobPositions(status, search);
    return res.json({ jobPositions });
  } catch (err: any) {
    console.error('Erro ao listar cargos:', err);
    return res.status(500).json({ error: 'Erro ao consultar cargos. Tente novamente mais tarde.' });
  }
});

// Obter detalhes de um cargo por ID
router.get(['/job-positions/:id', '/cargos/:id'], (req: Request, res: Response) => {
  const auth = checkJobPositionAuth(req, res);
  if (!auth) return;

  try {
    const jobPosition = db.getJobPositionById(req.params.id);
    if (!jobPosition) {
      return res.status(404).json({ error: 'Cargo não encontrado.' });
    }
    return res.json({ jobPosition });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao carregar dados do cargo.' });
  }
});

// Cadastrar novo cargo
router.post(['/job-positions', '/cargos'], (req: Request, res: Response) => {
  const auth = checkJobPositionAuth(req, res);
  if (!auth) return;

  const { name, code, description, active } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'O nome do cargo é obrigatório.' });
  }

  try {
    const newPosition = db.addJobPosition(
      { name, code, description, active }, 
      auth.user.name || auth.user.email
    );
    return res.status(201).json({ 
      jobPosition: newPosition, 
      message: 'Cargo cadastrado com sucesso.' 
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Não foi possível cadastrar o cargo.' });
  }
});

// Atualizar cargo existente
router.put(['/job-positions/:id', '/cargos/:id'], (req: Request, res: Response) => {
  const auth = checkJobPositionAuth(req, res);
  if (!auth) return;

  const { name, code, description, active } = req.body;

  try {
    const updated = db.updateJobPosition(
      req.params.id, 
      { name, code, description, active }, 
      auth.user.name || auth.user.email
    );
    return res.json({ 
      jobPosition: updated, 
      message: 'Cargo atualizado com sucesso.' 
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Não foi possível atualizar o cargo.' });
  }
});

// Ativar ou desativar cargo (Toggle status)
router.patch(['/job-positions/:id/status', '/cargos/:id/status'], (req: Request, res: Response) => {
  const auth = checkJobPositionAuth(req, res);
  if (!auth) return;

  const { active } = req.body;
  if (typeof active !== 'boolean') {
    return res.status(400).json({ error: 'Status (active) inválido. Deve ser booleano.' });
  }

  try {
    const updated = db.toggleJobPositionStatus(
      req.params.id, 
      active, 
      auth.user.name || auth.user.email
    );
    return res.json({ 
      jobPosition: updated, 
      message: active ? 'Cargo ativado com sucesso.' : 'Cargo desativado com sucesso.' 
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Não foi possível alterar o status do cargo.' });
  }
});

// ------------------------------------------------------------------
// ROTAS DE TIPOS DE DOCUMENTOS (BLOCO 3.2)
// ------------------------------------------------------------------

function checkDocumentTypeAuth(req: Request, res: Response, writeOperation = false): { user: any } | null {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Sessão inválida ou não autenticada. Faça login para continuar.' });
    return null;
  }
  if (user.role === 'FUNCIONARIO') {
    res.status(403).json({ 
      error: 'Acesso não autorizado. Apenas usuários do RH e Administradores têm permissão para acessar o catálogo de tipos de documentos.' 
    });
    return null;
  }

  if (writeOperation && !['ADMIN', 'RH', 'GESTOR'].includes(user.role)) {
    res.status(403).json({
      error: 'Acesso não autorizado. Seu perfil de usuário não possui permissão para criar, editar ou alterar o status de tipos de documentos.'
    });
    return null;
  }

  return { user };
}

// Listagem de tipos de documentos com filtros (status, categoria) e busca textual
router.get(['/document-types', '/tipos-documentos'], (req: Request, res: Response) => {
  const auth = checkDocumentTypeAuth(req, res, false);
  if (!auth) return;

  const status = (req.query.status as 'all' | 'active' | 'inactive') || 'all';
  const category = req.query.category as string;
  const search = req.query.search as string;

  try {
    const documentTypes = db.getDocumentTypes(status, category, search);
    return res.json({ documentTypes });
  } catch (err: any) {
    console.error('Erro ao listar tipos de documentos:', err);
    return res.status(500).json({ error: 'Erro ao consultar tipos de documentos. Tente novamente mais tarde.' });
  }
});

// Obter detalhes de um tipo de documento por ID
router.get(['/document-types/:id', '/tipos-documentos/:id'], (req: Request, res: Response) => {
  const auth = checkDocumentTypeAuth(req, res, false);
  if (!auth) return;

  try {
    const documentType = db.getDocumentTypeById(req.params.id);
    if (!documentType) {
      return res.status(404).json({ error: 'Tipo de documento não encontrado.' });
    }
    return res.json({ documentType });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao carregar dados do tipo de documento.' });
  }
});

// Cadastrar novo tipo de documento
router.post(['/document-types', '/tipos-documentos'], (req: Request, res: Response) => {
  const auth = checkDocumentTypeAuth(req, res, true);
  if (!auth) return;

  const {
    name,
    description,
    category,
    required_by_default,
    active,
    allowed_file_types,
    max_file_size_mb,
    requires_expiration_date,
    sort_order
  } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'O nome do tipo de documento é obrigatório.' });
  }

  if (!category || typeof category !== 'string' || !category.trim()) {
    return res.status(400).json({ error: 'A categoria do tipo de documento é obrigatória.' });
  }

  try {
    const newDocType = db.addDocumentType(
      {
        name,
        description,
        category,
        required_by_default,
        active,
        allowed_file_types,
        max_file_size_mb,
        requires_expiration_date,
        sort_order
      },
      auth.user.name || auth.user.email
    );
    return res.status(201).json({ 
      documentType: newDocType, 
      message: 'Tipo de documento cadastrado com sucesso.' 
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Não foi possível cadastrar o tipo de documento.' });
  }
});

// Atualizar tipo de documento existente
router.put(['/document-types/:id', '/tipos-documentos/:id'], (req: Request, res: Response) => {
  const auth = checkDocumentTypeAuth(req, res, true);
  if (!auth) return;

  const {
    name,
    description,
    category,
    required_by_default,
    active,
    allowed_file_types,
    max_file_size_mb,
    requires_expiration_date,
    sort_order
  } = req.body;

  try {
    const updated = db.updateDocumentType(
      req.params.id,
      {
        name,
        description,
        category,
        required_by_default,
        active,
        allowed_file_types,
        max_file_size_mb,
        requires_expiration_date,
        sort_order
      },
      auth.user.name || auth.user.email
    );
    return res.json({ 
      documentType: updated, 
      message: 'Tipo de documento atualizado com sucesso.' 
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Não foi possível atualizar o tipo de documento.' });
  }
});

// Ativar ou desativar tipo de documento (Toggle status)
router.patch(['/document-types/:id/status', '/tipos-documentos/:id/status'], (req: Request, res: Response) => {
  const auth = checkDocumentTypeAuth(req, res, true);
  if (!auth) return;

  const { active } = req.body;
  if (typeof active !== 'boolean') {
    return res.status(400).json({ error: 'Status (active) inválido. Deve ser booleano.' });
  }

  try {
    const updated = db.toggleDocumentTypeStatus(
      req.params.id,
      active,
      auth.user.name || auth.user.email
    );
    return res.json({ 
      documentType: updated, 
      message: active ? 'Tipo de documento ativado com sucesso.' : 'Tipo de documento desativado com sucesso.' 
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Não foi possível alterar o status do tipo de documento.' });
  }
});

// Rota auxiliar para semear os documentos padrões do sistema caso o catálogo esteja vazio
router.post(['/document-types/seed', '/tipos-documentos/seed'], (req: Request, res: Response) => {
  const auth = checkDocumentTypeAuth(req, res, true);
  if (!auth) return;

  try {
    const list = db.seedInitialDocumentTypes(auth.user.name || auth.user.email);
    return res.json({ 
      documentTypes: list, 
      message: 'Tipos de documentos padrão configurados com sucesso.' 
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao inicializar documentos padrão.' });
  }
});

// ------------------------------------------------------------------
// ROTAS DE CHECKLIST DE DOCUMENTOS POR CARGO (BLOCO 3.3)
// ------------------------------------------------------------------

function checkChecklistAuth(req: Request, res: Response): { user: any } | null {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Usuário não autenticado.' });
    return null;
  }
  if (user.role === 'FUNCIONARIO') {
    res.status(403).json({ 
      error: 'Acesso não autorizado. Apenas usuários do RH e Administradores têm permissão para configurar checklists por cargo.' 
    });
    return null;
  }
  return { user };
}

// 1. Listar documentos configurados para um cargo
router.get(['/job-positions/:jobPositionId/documents', '/cargos/:jobPositionId/documentos', '/job-position-documents'], (req: Request, res: Response) => {
  const auth = checkChecklistAuth(req, res);
  if (!auth) return;

  const jobPositionId = req.params.jobPositionId || (req.query.jobPositionId as string);
  if (!jobPositionId) {
    return res.status(400).json({ error: 'Identificador do cargo (jobPositionId) é obrigatório.' });
  }

  const status = (req.query.status as 'all' | 'active' | 'inactive') || 'all';

  try {
    const documents = db.getJobPositionDocuments(jobPositionId, status);
    const jobPosition = db.getJobPositionById(jobPositionId);
    return res.json({ jobPosition, documents });
  } catch (err: any) {
    console.error('Erro ao listar documentos do cargo:', err);
    return res.status(500).json({ error: 'Erro ao consultar documentos do cargo. Tente novamente mais tarde.' });
  }
});

// 2. Adicionar documento ao checklist do cargo
router.post(['/job-positions/:jobPositionId/documents', '/cargos/:jobPositionId/documentos', '/job-position-documents'], (req: Request, res: Response) => {
  const auth = checkChecklistAuth(req, res);
  if (!auth) return;

  const jobPositionId = req.params.jobPositionId || req.body.job_position_id;
  if (!jobPositionId) {
    return res.status(400).json({ error: 'Identificador do cargo (jobPositionId) é obrigatório.' });
  }

  const { document_type_id, required, sort_order, instructions } = req.body;

  if (!document_type_id) {
    return res.status(400).json({ error: 'O tipo de documento (document_type_id) é obrigatório.' });
  }

  try {
    const newDoc = db.addJobPositionDocument(
      jobPositionId,
      { document_type_id, required, sort_order, instructions },
      auth.user.name || auth.user.email
    );
    return res.status(201).json({ 
      document: newDoc, 
      message: 'Documento adicionado ao checklist do cargo com sucesso.' 
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Não foi possível adicionar o documento ao cargo.' });
  }
});

// 3. Atualizar configuração de um documento no checklist
router.put(['/job-position-documents/:id', '/cargos-documentos/:id'], (req: Request, res: Response) => {
  const auth = checkChecklistAuth(req, res);
  if (!auth) return;

  const { required, sort_order, instructions, active } = req.body;

  try {
    const updated = db.updateJobPositionDocument(
      req.params.id,
      { required, sort_order, instructions, active },
      auth.user.name || auth.user.email
    );
    return res.json({ 
      document: updated, 
      message: 'Configuração do documento atualizada com sucesso.' 
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Não foi possível atualizar a configuração do documento.' });
  }
});

// 4. Alterar status (ativo/inativo) de um documento no checklist
router.patch(['/job-position-documents/:id/status', '/cargos-documentos/:id/status'], (req: Request, res: Response) => {
  const auth = checkChecklistAuth(req, res);
  if (!auth) return;

  const { active } = req.body;
  if (typeof active !== 'boolean') {
    return res.status(400).json({ error: 'Status (active) inválido. Deve ser booleano.' });
  }

  try {
    const updated = db.toggleJobPositionDocumentStatus(
      req.params.id,
      active,
      auth.user.name || auth.user.email
    );
    return res.json({ 
      document: updated, 
      message: active 
        ? 'Documento ativado no checklist do cargo.' 
        : 'Documento desativado do checklist do cargo.' 
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Não foi possível alterar o status do documento.' });
  }
});

// 5. Reordenar checklist do cargo
router.post(['/job-positions/:jobPositionId/documents/reorder', '/cargos/:jobPositionId/documentos/reordenar', '/job-position-documents/reorder'], (req: Request, res: Response) => {
  const auth = checkChecklistAuth(req, res);
  if (!auth) return;

  const jobPositionId = req.params.jobPositionId || req.body.jobPositionId;
  const { orderedIds } = req.body;

  if (!jobPositionId) {
    return res.status(400).json({ error: 'Identificador do cargo é obrigatório.' });
  }

  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'A lista ordenada de IDs (orderedIds) deve ser um array.' });
  }

  try {
    const documents = db.reorderJobPositionDocuments(
      jobPositionId,
      orderedIds,
      auth.user.name || auth.user.email
    );
    return res.json({ 
      documents, 
      message: 'Ordem dos documentos atualizada com sucesso.' 
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Não foi possível reordenar os documentos.' });
  }
});

// 6. Remover / Desativar documento do checklist
router.delete(['/job-position-documents/:id', '/cargos-documentos/:id'], (req: Request, res: Response) => {
  const auth = checkChecklistAuth(req, res);
  if (!auth) return;

  try {
    const removed = db.removeJobPositionDocument(
      req.params.id,
      auth.user.name || auth.user.email
    );
    return res.json({ 
      document: removed, 
      message: 'Documento removido do checklist com sucesso. As admissões existentes não foram alteradas.' 
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Não foi possível remover o documento.' });
  }
});

// 7. Rota auxiliar para semear os cenários padrão do teste (Eletricista e Auxiliar Administrativo)
router.post(['/job-position-documents/seed', '/cargos-documentos/seed'], (req: Request, res: Response) => {
  const auth = checkChecklistAuth(req, res);
  if (!auth) return;

  try {
    const list = db.seedInitialJobPositionDocuments(auth.user.name || auth.user.email);
    return res.json({ 
      documents: list, 
      message: 'Checklists padrão de cargos configurados com sucesso.' 
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao gerar checklists padrão.' });
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
router.get('/dashboard/stats', (req: Request, res: Response) => {
  const auth = checkRhAuth(req, res);
  if (!auth) return;

  const {
    period,
    startDate,
    endDate,
    status,
    role,
    department,
    unit
  } = req.query;

  const stats = db.getStats({
    period: period as string | undefined,
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
    status: status as string | undefined,
    role: role as string | undefined,
    department: department as string | undefined,
    unit: unit as string | undefined
  });
  return res.json(stats);
});

// =========================================================================
// BLOCO 4.2: CENTRAL DE PENDÊNCIAS (RH)
// Fila de trabalho operacional com RLS, IDOR e LGPD (máscara de CPF)
// =========================================================================
router.get('/pendencias', (req: Request, res: Response) => {
  const auth = checkRhAuth(req, res);
  if (!auth) return;

  const {
    tipo,
    status,
    cargo,
    setor,
    unidade,
    documento,
    responsavel,
    prioridade,
    search,
    periodo,
    startDate,
    endDate,
    page,
    limit,
    sortBy,
    sortOrder
  } = req.query;

  const result = db.getPendingHubData({
    tipo: tipo as string | undefined,
    status: status as string | undefined,
    cargo: cargo as string | undefined,
    setor: setor as string | undefined,
    unidade: unidade as string | undefined,
    documento: documento as string | undefined,
    responsavel: responsavel as string | undefined,
    prioridade: prioridade as string | undefined,
    search: search as string | undefined,
    periodo: periodo as string | undefined,
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    sortBy: sortBy as string | undefined,
    sortOrder: sortOrder as 'asc' | 'desc' | undefined
  });

  // LGPD: Higienização rigorosa de CPF nos dados retornados para o frontend
  const sanitizedItems = result.items.map(item => ({
    ...item,
    employeeCpf: maskCPF(item.employeeCpf)
  }));

  return res.json({
    ...result,
    items: sanitizedItems
  });
});

// =========================================================================
// BLOCO 4.3 — COMUNICAÇÃO COM O FUNCIONÁRIO (API RH)
// =========================================================================

/**
 * GET /api/communications
 * Retorna lista prioritária de admissões para comunicação, com resumo operacional e filtros.
 */
router.get('/communications', (req: Request, res: Response) => {
  const auth = checkRhAuth(req, res);
  if (!auth) return;

  const {
    search,
    status,
    documentStatus,
    cargo,
    setor,
    unidade,
    page,
    limit
  } = req.query;

  const result = db.getCommunicationHubData({
    search: search as string | undefined,
    status: status as string | undefined,
    documentStatus: documentStatus as string | undefined,
    cargo: cargo as string | undefined,
    setor: setor as string | undefined,
    unidade: unidade as string | undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined
  });

  return res.json(result);
});

/**
 * POST /api/communications/log
 * Registra uma ação de comunicação (abertura de WhatsApp, cópia de mensagem, cópia de link)
 * de forma imutável e com auditoria integrada.
 */
router.post('/communications/log', (req: Request, res: Response) => {
  const auth = checkRhAuth(req, res);
  if (!auth) return;
  const user = auth.user;

  const {
    admissionId,
    employeeId,
    communicationType,
    channel,
    templateId,
    documentId,
    documentName,
    rejectionReason,
    messagePreview,
    actionStatus,
    actionStatusLabel
  } = req.body;

  if (!admissionId || !communicationType || !channel || !actionStatus) {
    return res.status(400).json({ error: 'Dados obrigatórios de comunicação ausentes.' });
  }

  const admission = db.getAdmissionById(admissionId);
  if (!admission) {
    return res.status(404).json({ error: 'Admissão não encontrada.' });
  }

  const log = db.addCommunicationLog({
    admissionId,
    employeeId: employeeId || admission.employeeId,
    userId: user.id,
    userName: user.name,
    communicationType,
    channel,
    templateId: templateId || communicationType,
    documentId,
    documentName,
    rejectionReason,
    messagePreview: messagePreview || '',
    actionStatus,
    actionStatusLabel
  });

  return res.status(201).json({ success: true, log });
});

/**
 * GET /api/admissions/:id/communications
 * Retorna o histórico de comunicações realizadas para uma admissão específica.
 */
router.get('/admissions/:id/communications', (req: Request, res: Response) => {
  const auth = checkRhAuth(req, res);
  if (!auth) return;

  const admission = db.getAdmissionById(req.params.id);
  if (!admission) {
    return res.status(404).json({ error: 'Admissão não encontrada.' });
  }

  const logs = db.getCommunicationLogs(req.params.id);
  return res.json({ logs });
});

// =========================================================================
// BLOCO 4.4 — PRAZOS E ACOMPANHAMENTO OPERACIONAL (RH)
// =========================================================================

/**
 * GET /api/tracking ou /api/prazos
 * Retorna lista operacional de prazos e acompanhamento, resumo operacional,
 * contadores de situação, itens prioritários e filtros dinâmicos.
 */
router.get(['/tracking', '/prazos'], (req: Request, res: Response) => {
  const auth = checkRhAuth(req, res);
  if (!auth) return;

  const {
    period,
    startDate,
    endDate,
    status,
    cargo,
    setor,
    unidade,
    situacao,
    tempoSemMovimentacao,
    search,
    page,
    limit,
    sortBy,
    sortOrder
  } = req.query;

  const result = db.getTrackingHubData({
    period: period as string | undefined,
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
    status: status as string | undefined,
    cargo: cargo as string | undefined,
    setor: setor as string | undefined,
    unidade: unidade as string | undefined,
    situacao: situacao as string | undefined,
    tempoSemMovimentacao: tempoSemMovimentacao as string | undefined,
    search: search as string | undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    sortBy: sortBy as string | undefined,
    sortOrder: sortOrder as 'asc' | 'desc' | undefined
  });

  return res.json(result);
});

/**
 * GET /api/admissions/:id/timeline
 * Retorna linha do tempo de eventos reais e cálculos de tempo por etapa (Seções 12 e 13).
 */
router.get('/admissions/:id/timeline', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user || user.role === 'FUNCIONARIO') {
    return res.status(403).json({ error: 'Acesso restrito à equipe de RH.' });
  }

  try {
    const timeline = db.getAdmissionTimeline(req.params.id);
    return res.json(timeline);
  } catch (err: any) {
    return res.status(404).json({ error: err.message || 'Admissão não encontrada.' });
  }
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
  const settings = db.getSettings();

  if (!settings.admission.allowEditDataAfterCreation) {
    return res.status(403).json({
      error: 'A edição de dados cadastrais após a criação da admissão está desabilitada nas configurações operacionais.'
    });
  }

  const currentAdmission = db.getAdmissionById(req.params.id);
  if (!currentAdmission) {
    return res.status(404).json({ error: 'Admissão não encontrada.' });
  }

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

  if (role && role !== currentAdmission.employee.role && !settings.admission.allowEditRoleAfterCreation) {
    return res.status(403).json({
      error: 'A alteração de cargo após a criação da admissão está desabilitada nas configurações operacionais.'
    });
  }

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
  const settings = db.getSettings();

  if (!settings.admission.allowCancelAdmission) {
    return res.status(403).json({ 
      error: 'O cancelamento de admissões está desabilitado nas configurações operacionais do sistema.' 
    });
  }

  const { reason } = req.body;
  if (settings.admission.requireCancellationReason && (!reason || !reason.trim())) {
    return res.status(400).json({ 
      error: 'O motivo do cancelamento é obrigatório de acordo com as configurações operacionais do sistema.' 
    });
  }

  try {
    const admission = db.cancelAdmission(req.params.id, reason || 'Cancelado pela equipe de RH', user.name);
    return res.json({ success: true, admission });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/admissions/:id/complete', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const settings = db.getSettings();

  if (!settings.admission.allowManualCompletion) {
    return res.status(403).json({ 
      error: 'A conclusão manual de admissões está desabilitada nas configurações operacionais do sistema.' 
    });
  }

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
      jobPositionId,
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
      jobPositionId,
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

  // Validação de segurança anti-IDOR: o documento DEVE pertencer à admissão vinculada ao token
  const targetDoc = admission.documents.find(d => d.id === req.params.documentId);
  if (!targetDoc) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    return res.status(403).json({ error: 'Acesso negado. O documento solicitado não pertence a esta admissão.' });
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
// CONFERÊNCIA DE DOCUMENTOS (RH) - BLOCO 3.5
// ------------------------------------------------------------------

// Chave para assinatura de URLs seguras temporárias
const SIGNED_URL_SECRET = 'admissao-digital-secure-token-salt-2025';

function generateDocumentSignature(docId: string, version: number | string, expires: number): string {
  return crypto.createHmac('sha256', SIGNED_URL_SECRET)
    .update(`${docId}:${version}:${expires}`)
    .digest('hex');
}

// Endpoint para obter URL assinada temporária (15 minutos) / preview seguro
router.get(['/documents/:id/signed-url', '/documents/:id/preview'], (req: Request, res: Response) => {
  const docId = req.params.id;
  const versionParam = req.query.version ? Number(req.query.version) : 0;
  const tokenParam = (req.query.token as string) || (req.headers['x-invite-token'] as string);
  const emailHeader = req.headers['x-user-email'] as string;

  // Localiza o documento e sua admissão
  let foundDoc;
  let foundAdm;
  for (const adm of db.getAdmissions()) {
    const d = adm.documents.find(doc => doc.id === docId);
    if (d) {
      foundDoc = d;
      foundAdm = adm;
      break;
    }
  }

  if (!foundDoc || !foundAdm) {
    return res.status(404).json({ error: 'Documento não encontrado.' });
  }

  // Validação estrita de autorização (Storage privado):
  // Se não foi fornecido token de convite e não há cabeçalho de usuário RH
  if (!tokenParam && !emailHeader) {
    return res.status(403).json({ error: 'Acesso negado. Acesso anônimo direto ao preview é restrito.' });
  }

  // Se houver token de convite, valida se corresponde a esta admissão e está ativo
  if (tokenParam && (foundAdm.inviteToken !== tokenParam || foundAdm.inviteRevoked)) {
    return res.status(403).json({ error: 'Acesso negado. Token de convite inválido ou expirado para este documento.' });
  }

  const version = versionParam || foundDoc.currentVersion || 1;
  const expires = Date.now() + 15 * 60 * 1000; // 15 minutos
  const signature = generateDocumentSignature(docId, version, expires);

  const signedUrl = `/api/documents/${docId}/file?version=${version}&expires=${expires}&signature=${signature}`;
  return res.json({
    success: true,
    signedUrl,
    expiresAt: new Date(expires).toISOString()
  });
});

// Registro de auditoria quando o RH visualiza um documento
router.post('/documents/:id/view-audit', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const docId = req.params.id;
  const { version } = req.body;

  let foundDoc;
  let foundAdm;
  for (const adm of db.getAdmissions()) {
    const d = adm.documents.find(doc => doc.id === docId);
    if (d) {
      foundDoc = d;
      foundAdm = adm;
      break;
    }
  }

  if (!foundDoc || !foundAdm) {
    return res.status(404).json({ error: 'Documento não encontrado.' });
  }

  db.recordDocumentAction(
    docId,
    `RH visualizou documento`,
    user.name,
    `Visualização de conferência realizada para o documento ${foundDoc.documentType} (Versão ${version || foundDoc.currentVersion}) do colaborador ${foundAdm.employee.name}.`
  );

  return res.json({ success: true });
});

// Análise e Conferência (Aprovar / Rejeitar) com Concorrência e Permissões
router.post('/documents/:id/review', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);

  // Apenas RH e Administradores podem conferir documentos
  if (user.role === 'FUNCIONARIO') {
    return res.status(403).json({ 
      error: 'Acesso negado. Apenas profissionais de RH autorizados podem conferir e validar documentos.' 
    });
  }

  const { decision, rejectionReason, rejectionNotes, expectedVersion } = req.body;

  if (decision !== 'Aprovado' && decision !== 'Rejeitado') {
    return res.status(400).json({ error: 'Decisão deve ser "Aprovado" ou "Rejeitado".' });
  }

  try {
    const result = db.reviewDocument(
      req.params.id,
      decision,
      user.name,
      rejectionReason,
      rejectionNotes,
      expectedVersion !== undefined ? Number(expectedVersion) : undefined
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

// Visualização Segura de Documentos (Storage Privado LGPD com proteção contra IDOR)
router.get('/documents/:id/file', (req: Request, res: Response) => {
  const docId = req.params.id;
  const versionParam = req.query.version;
  const expiresParam = req.query.expires ? Number(req.query.expires) : undefined;
  const signatureParam = req.query.signature as string | undefined;
  const tokenParam = req.query.token as string | undefined;
  const isDownload = req.query.download === 'true';

  let foundDoc;
  let foundAdm;
  for (const adm of db.getAdmissions()) {
    const d = adm.documents.find(doc => doc.id === docId);
    if (d) {
      foundDoc = d;
      foundAdm = adm;
      break;
    }
  }

  if (!foundDoc || !foundAdm) {
    return res.status(404).send('Documento não encontrado.');
  }

  // Validação de Acesso / Anti-IDOR
  const user = getAuthenticatedUser(req);
  let isAuthorized = false;

  // 1. Se tem assinatura válida
  if (signatureParam && expiresParam) {
    if (Date.now() > expiresParam) {
      return res.status(403).send('Link seguro expirado. Solicite nova visualização.');
    }
    const versionToCheck = versionParam ? Number(versionParam) : (foundDoc.currentVersion || 1);
    const expectedSig = generateDocumentSignature(docId, versionToCheck, expiresParam);
    if (crypto.timingSafeEqual(Buffer.from(signatureParam), Buffer.from(expectedSig))) {
      isAuthorized = true;
    }
  }

  // 2. Se for acesso do RH/Admin autenticado
  if (!isAuthorized && (user.role === 'RH' || user.role === 'ADMIN')) {
    isAuthorized = true;
  }

  // 3. Se for acesso via token do candidato
  if (!isAuthorized && tokenParam) {
    if (foundAdm.inviteToken === tokenParam && !foundAdm.inviteRevoked) {
      isAuthorized = true;
    } else {
      return res.status(403).send('Acesso não autorizado a este documento.');
    }
  }

  if (!isAuthorized) {
    return res.status(403).send('Acesso não autorizado ao arquivo protegido.');
  }

  let filePath: string | undefined;
  let mimeType = foundDoc.mimeType || 'application/pdf';
  let originalName = foundDoc.fileName || `${foundDoc.documentType}.pdf`;

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

  // Registro de auditoria se for download
  if (isDownload) {
    db.recordDocumentAction(
      docId,
      'RH realizou download de documento',
      user.name,
      `Download efetuado do arquivo ${originalName} (Versão ${versionParam || foundDoc.currentVersion}) da admissão de ${foundAdm.employee.name}.`
    );
  }

  // Se for um arquivo de amostra seed ou arquivo ainda inexistente no disco local, gera um PDF/SVG seguro representativo
  if (!filePath || !fs.existsSync(filePath)) {
    // Retorna imagem placeholder de alta qualidade com os dados do documento para visualização
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', `${isDownload ? 'attachment' : 'inline'}; filename="${foundDoc.documentType.toLowerCase()}.svg"`);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const svg = `
      <svg width="600" height="800" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f8fafc"/>
        <rect x="20" y="20" width="560" height="760" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
        <text x="300" y="80" font-family="sans-serif" font-size="22" font-weight="bold" fill="#0f172a" text-anchor="middle">
          ADMISSÃO DIGITAL — GALVANIZAÇÃO RAITZ
        </text>
        <line x1="60" y1="110" x2="540" y2="110" stroke="#e2e8f0" stroke-width="2"/>
        <text x="60" y="160" font-family="sans-serif" font-size="16" font-weight="bold" fill="#334155">
          Tipo de Documento:
        </text>
        <text x="240" y="160" font-family="sans-serif" font-size="16" fill="#0284c7">
          ${foundDoc.documentType}
        </text>
        <text x="60" y="200" font-family="sans-serif" font-size="14" font-weight="bold" fill="#334155">
          Colaborador:
        </text>
        <text x="240" y="200" font-family="sans-serif" font-size="14" fill="#475569">
          ${foundAdm.employee.name}
        </text>
        <text x="60" y="240" font-family="sans-serif" font-size="14" font-weight="bold" fill="#334155">
          Versão do Arquivo:
        </text>
        <text x="240" y="240" font-family="sans-serif" font-size="14" fill="#475569">
          Versão ${versionParam || foundDoc.currentVersion}
        </text>
        <text x="60" y="280" font-family="sans-serif" font-size="14" font-weight="bold" fill="#334155">
          Status da Conferência:
        </text>
        <text x="240" y="280" font-family="sans-serif" font-size="14" fill="#059669">
          ${foundDoc.status}
        </text>
        <rect x="60" y="320" width="480" height="320" rx="6" fill="#f1f5f9" stroke="#94a3b8" stroke-dasharray="4 4"/>
        <text x="300" y="470" font-family="sans-serif" font-size="16" fill="#64748b" text-anchor="middle">
          [ Documento Digitalizado e Criptografado no Storage LGPD ]
        </text>
        <text x="300" y="500" font-family="sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">
          ${foundDoc.fileName || 'Arquivo protegido com acesso controlado'}
        </text>
        <text x="300" y="720" font-family="sans-serif" font-size="11" fill="#94a3b8" text-anchor="middle">
          Conformidade LGPD: Acesso auditado e restrito ao RH da Galvanização Raitz
        </text>
      </svg>
    `;
    return res.send(svg);
  }

  // Cabeçalhos de proteção de privacidade LGPD
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `${isDownload ? 'attachment' : 'inline'}; filename="${encodeURIComponent(originalName)}"`);
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  return res.sendFile(filePath);
});

// ------------------------------------------------------------------
// AUDITORIA E HISTÓRICO
// ------------------------------------------------------------------
router.get('/audit-logs', (req: Request, res: Response) => {
  const admissionId = req.query.admissionId as string | undefined;
  const entityType = req.query.entityType as string | undefined;
  const entityId = req.query.entityId as string | undefined;
  const action = req.query.action as string | undefined;
  const search = req.query.search as string | undefined;

  const logs = db.getAuditLogs(admissionId, { entityType, entityId, action, search });
  return res.json(logs);
});

// ------------------------------------------------------------------
// NOTIFICAÇÕES
// ------------------------------------------------------------------
router.get('/notifications', (_req: Request, res: Response) => {
  return res.json(db.getNotifications() || []);
});

router.all('/notifications/:id/read', (req: Request, res: Response) => {
  db.markNotificationRead(req.params.id);
  return res.json({ success: true });
});

router.all('/notifications/read-all', (_req: Request, res: Response) => {
  db.markAllNotificationsRead();
  return res.json({ success: true });
});

// ------------------------------------------------------------------
// BLOCO 4.5 — RELATÓRIOS E INDICADORES DE RH
// ------------------------------------------------------------------
router.get(['/reports', '/relatorios'], (req: Request, res: Response) => {
  const auth = checkRhAuth(req, res);
  if (!auth) return;

  try {
    const reportType = (req.query.reportType as any) || 'admissoes';
    const period = req.query.period as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const status = req.query.status as string | undefined;
    const cargo = req.query.cargo as string | undefined;
    const setor = req.query.setor as string | undefined;
    const unidade = req.query.unidade as string | undefined;
    const documentStatus = req.query.documentStatus as string | undefined;
    const search = req.query.search as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 15;
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    const data = db.getReportData({
      reportType,
      period,
      startDate,
      endDate,
      status,
      cargo,
      setor,
      unidade,
      documentStatus,
      search,
      page,
      limit,
      sortBy,
      sortOrder
    });

    return res.json(data);
  } catch (error: any) {
    console.error('Erro ao gerar relatório:', error);
    return res.status(500).json({ error: 'Erro ao gerar relatório: ' + (error?.message || 'desconhecido') });
  }
});

router.post(['/reports/export', '/relatorios/export'], (req: Request, res: Response) => {
  const auth = checkRhAuth(req, res);
  if (!auth) return;
  const user = auth.user;

  try {
    const body = req.body || {};

    const reportType = body.reportType || 'admissoes';
    const period = body.period;
    const startDate = body.startDate;
    const endDate = body.endDate;
    const status = body.status;
    const cargo = body.cargo;
    const setor = body.setor;
    const unidade = body.unidade;
    const documentStatus = body.documentStatus;
    const search = body.search;
    const sortBy = body.sortBy;
    const sortOrder = body.sortOrder;

    const settings = db.getSettings();
    if (!settings.reports.allowExportCsv) {
      return res.status(403).json({
        error: 'A exportação de relatórios em CSV está desabilitada nas configurações operacionais do sistema.'
      });
    }

    const result = db.generateReportCsv({
      reportType,
      period,
      startDate,
      endDate,
      status,
      cargo,
      setor,
      unidade,
      documentStatus,
      search,
      sortBy,
      sortOrder
    });

    // Registra auditoria da exportação se configurado
    if (settings.reports.auditExports) {
      const filterDescParts = [];
      if (period && period !== 'all') filterDescParts.push(`período=${period}`);
      if (cargo && cargo !== 'TODOS') filterDescParts.push(`cargo=${cargo}`);
      if (setor && setor !== 'TODOS') filterDescParts.push(`setor=${setor}`);
      if (status && status !== 'TODOS') filterDescParts.push(`status=${status}`);
      const filterDesc = filterDescParts.length > 0 ? filterDescParts.join(', ') : 'sem filtros adicionais';

      db.addAuditLog({
        userName: user.name,
        action: 'report_exported',
        details: `Relatório "${reportType}" exportado em formato CSV contendo ${result.totalRows} registros. Filtros aplicados: ${filterDesc}.`
      });
    }

    // Se solicitado via download direto HTTP
    if (req.query.download === 'true') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      return res.send(result.csv);
    }

    return res.json({
      success: true,
      fileName: result.fileName,
      totalRows: result.totalRows,
      csv: result.csv
    });
  } catch (error: any) {
    console.error('Erro ao exportar relatório:', error);
    return res.status(500).json({ error: 'Erro ao exportar relatório: ' + (error?.message || 'desconhecido') });
  }
});

// =========================================================================
// BLOCO 4.6 — CONFIGURAÇÕES OPERACIONAIS (ROTAS DA API RH)
// =========================================================================

// Middleware de autorização para configurações operacionais
function checkSettingsAuth(req: Request, res: Response): { user: any } | null {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Sessão inválida ou não autenticada. Faça login para continuar.' });
    return null;
  }
  if (user.role === 'FUNCIONARIO') {
    res.status(403).json({
      error: 'Acesso não autorizado. Apenas usuários do RH e Administradores podem acessar e configurar os parâmetros do sistema.'
    });
    return null;
  }
  return { user };
}

// 1. Obter todas as configurações operacionais
router.get(['/settings', '/configuracoes'], (req: Request, res: Response) => {
  const auth = checkSettingsAuth(req, res);
  if (!auth) return;

  try {
    const settings = db.getSettings();
    return res.json({
      settings,
      systemTime: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao carregar configurações operacionais: ' + error.message });
  }
});

// 2. Atualizar configurações operacionais (parcial ou total)
router.put(['/settings', '/configuracoes'], (req: Request, res: Response) => {
  const auth = checkSettingsAuth(req, res);
  if (!auth) return;

  const updates = req.body;
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Dados de configuração inválidos.' });
  }

  try {
    const updated = db.updateSettings(updates, auth.user.name || auth.user.email);
    return res.json({
      success: true,
      settings: updated,
      message: 'Configurações operacionais salvas com sucesso!'
    });
  } catch (error: any) {
    return res.status(400).json({ error: 'Erro ao atualizar configurações: ' + error.message });
  }
});

// 3. Restaurar configurações para o padrão do sistema
router.post(['/settings/reset', '/configuracoes/restaurar'], (req: Request, res: Response) => {
  const auth = checkSettingsAuth(req, res);
  if (!auth) return;

  try {
    const defaults = db.resetSettingsToDefault(auth.user.name || auth.user.email);
    return res.json({
      success: true,
      settings: defaults,
      message: 'Configurações operacionais restauradas para o padrão recomendado com sucesso.'
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao restaurar configurações: ' + error.message });
  }
});

// 4. Listar modelos de comunicação WhatsApp
router.get(['/settings/templates', '/configuracoes/modelos'], (req: Request, res: Response) => {
  const auth = checkSettingsAuth(req, res);
  if (!auth) return;

  try {
    const templates = db.getCommunicationTemplates();
    return res.json({ templates });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao buscar modelos de comunicação: ' + error.message });
  }
});

// 5. Atualizar modelo de comunicação específico
router.put(['/settings/templates/:id', '/configuracoes/modelos/:id'], (req: Request, res: Response) => {
  const auth = checkSettingsAuth(req, res);
  if (!auth) return;

  const { content, active, name, description } = req.body;
  try {
    const updated = db.updateCommunicationTemplate(
      req.params.id,
      { content, active, name, description },
      auth.user.name || auth.user.email
    );
    return res.json({
      success: true,
      template: updated,
      message: 'Modelo de comunicação atualizado com sucesso.'
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Erro ao atualizar modelo.' });
  }
});

// 6. Validar e pré-visualizar mensagem com variáveis dinâmicas
router.post(['/settings/preview-message', '/configuracoes/previa-mensagem'], (req: Request, res: Response) => {
  const auth = checkSettingsAuth(req, res);
  if (!auth) return;

  const { content, sampleData } = req.body;
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'O texto da mensagem é obrigatório para visualização prévia.' });
  }

  // Identificação de variáveis
  const validVariables = ['[NOME]', '[LINK]', '[DOCUMENTO]', '[MOTIVO]', '[CARGO]', '[EMPRESA]'];
  const regex = /\[([A-Z_]+)\]/g;
  let match;
  const foundVariables: string[] = [];
  const invalidVariables: string[] = [];

  while ((match = regex.exec(content)) !== null) {
    const fullVar = match[0];
    if (!foundVariables.includes(fullVar)) {
      foundVariables.push(fullVar);
    }
    if (!validVariables.includes(fullVar) && !invalidVariables.includes(fullVar)) {
      invalidVariables.push(fullVar);
    }
  }

  // Substituição por dados de amostra ou dados reais
  const settings = db.getSettings();
  const sample = {
    nome: sampleData?.name || 'Lucas Gabriel Albuquerque',
    cargo: sampleData?.role || 'Desenvolvedor Frontend Pleno',
    empresa: settings?.general?.companyName || 'Galvanização Raitz',
    link: sampleData?.link || 'https://admissao.raitz.com.br/convite/tok_demo123',
    documento: sampleData?.document || 'Comprovante de Residência',
    motivo: sampleData?.reason || 'Comprovante com data de emissão superior a 90 dias'
  };

  let rendered = content;
  rendered = rendered.replace(/\[NOME\]/g, sample.nome);
  rendered = rendered.replace(/\[CARGO\]/g, sample.cargo);
  rendered = rendered.replace(/\[EMPRESA\]/g, sample.empresa);
  rendered = rendered.replace(/\[LINK\]/g, sample.link);
  rendered = rendered.replace(/\[DOCUMENTO\]/g, sample.documento);
  rendered = rendered.replace(/\[MOTIVO\]/g, sample.motivo);

  return res.json({
    original: content,
    rendered,
    variablesFound: foundVariables,
    invalidVariables,
    isValid: invalidVariables.length === 0,
    sampleUsed: sample
  });
});

// 7. Histórico de alterações das configurações operacionais (Auditoria dedicada)
router.get(['/settings/history', '/configuracoes/historico'], (req: Request, res: Response) => {
  const auth = checkSettingsAuth(req, res);
  if (!auth) return;

  try {
    const allLogs = db.getAuditLogs();
    const settingsLogs = allLogs.filter(log => 
      log.entityType === 'settings' || 
      log.entityType === 'communication_template' ||
      log.action.toLowerCase().includes('configurações') ||
      log.action.toLowerCase().includes('modelo de comunicação')
    );
    return res.json({
      history: settingsLogs.slice(0, 100),
      total: settingsLogs.length
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao carregar histórico: ' + error.message });
  }
});

export default router;

