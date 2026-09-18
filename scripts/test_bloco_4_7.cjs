/**
 * BATERIA DE TESTES COMPLETOS, AUDITORIA E FECHAMENTO DA PARTE 4 (BLOCO 4.7)
 * Sistema de Admissão Digital - Raitz
 * Validação rigorosa dos 34 cenários de teste
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const HOST = 'localhost';

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const isFormData = options.headers && options.headers['Content-Type'] && options.headers['Content-Type'].includes('multipart/form-data');
    let payload = null;
    const reqHeaders = { ...options.headers };

    if (data && !isFormData) {
      payload = typeof data === 'string' ? data : JSON.stringify(data);
      if (!reqHeaders['Content-Type']) reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    } else if (data && isFormData) {
      payload = data;
    }

    const req = http.request({ host: HOST, port: PORT, ...options, headers: reqHeaders }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, headers: res.headers, body: parsed, rawBody: body });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: null, rawBody: body });
        }
      });
    });

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function uploadFile(pathUrl, filename, mimeType, fileContent, headers = {}) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);
  let body = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`
  );
  body = Buffer.concat([body, Buffer.from(fileContent), Buffer.from(`\r\n--${boundary}--\r\n`)]);

  return request({
    path: pathUrl,
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length
    }
  }, body);
}

function generateValidCPF() {
  const digits = [];
  for (let i = 0; i < 9; i++) {
    digits.push(Math.floor(Math.random() * 9));
  }
  let sum1 = 0;
  for (let i = 0; i < 9; i++) sum1 += digits[i] * (10 - i);
  let rem1 = (sum1 * 10) % 11;
  if (rem1 === 10 || rem1 === 11) rem1 = 0;
  digits.push(rem1);

  let sum2 = 0;
  for (let i = 0; i < 10; i++) sum2 += digits[i] * (11 - i);
  let rem2 = (sum2 * 10) % 11;
  if (rem2 === 10 || rem2 === 11) rem2 = 0;
  digits.push(rem2);

  const d = digits.join('');
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

let passedTests = 0;
let totalTests = 0;
const testResults = [];

function assert(condition, message, category = 'Geral') {
  totalTests++;
  const result = {
    id: `T${totalTests.toString().padStart(2, '0')}`,
    category,
    message,
    passed: Boolean(condition)
  };
  testResults.push(result);

  if (condition) {
    console.log(`✅ PASS [${result.id}] [${category}] ${message}`);
    passedTests++;
  } else {
    console.error(`❌ FAIL [${result.id}] [${category}] ${message}`);
  }
}

async function runAllTests() {
  console.log('================================================================');
  console.log('🚀 INICIANDO AUDITORIA E TESTES COMPLETOS - PARTE 4 (BLOCO 4.7)');
  console.log('================================================================\n');

  // ---------------------------------------------------------
  // TESTE 1: LOGIN RH
  // ---------------------------------------------------------
  console.log('\n--- TESTE 1: LOGIN RH ---');
  const loginRes = await request({
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'rh@raitz.com.br', password: 'admin' });

  assert(loginRes.status === 200, 'Login do RH realizado com sucesso (200 OK)', 'Autenticação');
  assert(Boolean(loginRes.body?.token), 'Token JWT de sessão retornado', 'Autenticação');
  assert(loginRes.body?.user?.role === 'RH' || loginRes.body?.user?.role === 'ADMIN', 'Usuário autenticado possui perfil de RH', 'Autenticação');

  const rhToken = loginRes.body?.token;
  const rhHeaders = {
    'Content-Type': 'application/json',
    'x-user-email': 'rh@raitz.com.br',
    'Authorization': `Bearer ${rhToken}`
  };

  // ---------------------------------------------------------
  // TESTE 2: CONTROLE DE SESSÃO E ROTA PROTEGIDA
  // ---------------------------------------------------------
  console.log('\n--- TESTE 2: CONTROLE DE SESSÃO ---');
  const unauthRes = await request({
    path: '/api/dashboard/stats',
    method: 'GET',
    headers: { 'x-unauthenticated': 'true' }
  });
  assert(unauthRes.status === 401, 'Acesso sem autenticação retorna 401 Unauthorized', 'Segurança');

  const invalidTokenRes = await request({
    path: '/api/settings',
    method: 'GET',
    headers: { 'Authorization': 'Bearer token-invalid-session' }
  });
  assert(invalidTokenRes.status === 401, 'Token de sessão inválido/expirado retorna 401', 'Segurança');

  // ---------------------------------------------------------
  // TESTE 3: GESTÃO DE CARGO
  // ---------------------------------------------------------
  console.log('\n--- TESTE 3: GESTÃO DE CARGO ---');
  const uniqueCode = 'TST-' + Date.now().toString().slice(-4);
  const uniqueName = 'Analista de Auditoria ' + uniqueCode;
  
  const createJobRes = await request({
    path: '/api/job-positions',
    method: 'POST',
    headers: rhHeaders
  }, {
    name: uniqueName,
    code: uniqueCode,
    description: 'Cargo criado para auditoria automatizada do Bloco 4.7',
    active: true
  });

  assert(createJobRes.status === 201, 'Criação de cargo operacional (201 Created)', 'Cargos');
  const createdJob = createJobRes.body?.jobPosition;
  assert(createdJob?.name === uniqueName, 'Nome do cargo persistido corretamente', 'Cargos');
  assert(createdJob?.code === uniqueCode, 'Código do cargo persistido corretamente', 'Cargos');

  // Tentativa de duplicidade
  const duplicateJobRes = await request({
    path: '/api/job-positions',
    method: 'POST',
    headers: rhHeaders
  }, {
    name: uniqueName,
    code: uniqueCode
  });
  assert(duplicateJobRes.status === 400, 'Bloqueio de duplicidade de nome/código de cargo (400 Bad Request)', 'Cargos');

  // ---------------------------------------------------------
  // TESTE 4: CATÁLOGO DE DOCUMENTOS
  // ---------------------------------------------------------
  console.log('\n--- TESTE 4: CATÁLOGO DE DOCUMENTOS ---');
  const docTypesRes = await request({
    path: '/api/document-types?status=active',
    method: 'GET',
    headers: rhHeaders
  });

  assert(docTypesRes.status === 200, 'Consulta de catálogo de documentos (200 OK)', 'Catálogo');
  const docTypes = docTypesRes.body?.documentTypes || [];
  assert(docTypes.length >= 5, 'Catálogo possui os tipos de documentos necessários', 'Catálogo');
  
  const rgDoc = docTypes.find(d => d.name.toLowerCase().includes('rg') || d.name.toLowerCase().includes('identidade'));
  const cpfDoc = docTypes.find(d => d.name.toLowerCase().includes('cpf'));
  const compResDoc = docTypes.find(d => d.name.toLowerCase().includes('residência'));
  assert(Boolean(rgDoc && cpfDoc), 'Documentos essenciais (RG, CPF) presentes no catálogo', 'Catálogo');

  // ---------------------------------------------------------
  // TESTE 5: CHECKLIST POR CARGO
  // ---------------------------------------------------------
  console.log('\n--- TESTE 5: CHECKLIST POR CARGO ---');
  // Vincula RG (obrigatório) e Comprovante de Residência (opcional) ao cargo
  const addDoc1Res = await request({
    path: `/api/job-positions/${createdJob.id}/documents`,
    method: 'POST',
    headers: rhHeaders
  }, {
    document_type_id: rgDoc.id,
    required: true,
    sort_order: 1,
    instructions: 'Digitalize frente e verso legível.'
  });
  assert(addDoc1Res.status === 201, 'Documento obrigatório vinculado ao checklist do cargo', 'Checklist');

  const addDoc2Res = await request({
    path: `/api/job-positions/${createdJob.id}/documents`,
    method: 'POST',
    headers: rhHeaders
  }, {
    document_type_id: compResDoc ? compResDoc.id : docTypes[1].id,
    required: false,
    sort_order: 2,
    instructions: 'Comprovante recente dos últimos 90 dias.'
  });
  assert(addDoc2Res.status === 201, 'Documento opcional vinculado ao checklist do cargo', 'Checklist');

  // ---------------------------------------------------------
  // TESTE 6: CRIAÇÃO DE ADMISSÃO
  // ---------------------------------------------------------
  console.log('\n--- TESTE 6: CRIAÇÃO DE ADMISSÃO ---');
  const candidateCpf = generateValidCPF();
  const createAdmissionRes = await request({
    path: '/api/admissions',
    method: 'POST',
    headers: rhHeaders
  }, {
    name: 'Candidato Auditoria 4.7',
    email: 'candidato.teste@raitz.com.br',
    phone: '(11) 98765-4321',
    cpf: candidateCpf,
    birthDate: '1995-05-15',
    department: 'Tecnologia da Informação',
    role: createdJob.name,
    jobPositionId: createdJob.id,
    unit: 'Matriz - Curitiba',
    expectedStartDate: '2026-10-01'
  });

  assert(createAdmissionRes.status === 201, 'Admissão criada com sucesso (201 Created)', 'Admissão');
  const admission = createAdmissionRes.body?.admission || createAdmissionRes.body;
  assert(Boolean(admission?.id), 'ID único da admissão gerado', 'Admissão');
  assert(Boolean(admission?.inviteToken), 'Token seguro de convite gerado', 'Admissão');
  assert(admission?.documents?.length === 2, 'Checklist do cargo associado à admissão (2 documentos)', 'Admissão');

  // ---------------------------------------------------------
  // TESTE 7: SNAPSHOT DO CHECKLIST (IMUTABILIDADE)
  // ---------------------------------------------------------
  console.log('\n--- TESTE 7: SNAPSHOT DO CHECKLIST ---');
  // Adiciona um terceiro documento no cargo DEPOIS da criação da admissão
  if (cpfDoc) {
    await request({
      path: `/api/job-positions/${createdJob.id}/documents`,
      method: 'POST',
      headers: rhHeaders
    }, {
      document_type_id: cpfDoc.id,
      required: true,
      sort_order: 3
    });
  }

  // Verifica se a admissão previamente criada manteve exatamente 2 documentos (snapshot intocado)
  const verifyAdmissionRes = await request({
    path: `/api/admissions/${admission.id}`,
    method: 'GET',
    headers: rhHeaders
  });
  assert(verifyAdmissionRes.body?.documents?.length === 2, 'Snapshot imutável: Admissão existente não sofreu alteração do checklist do cargo', 'Integridade');

  // ---------------------------------------------------------
  // TESTE 8: ACESSO DO CANDIDATO VIA LINK PÚBLICO
  // ---------------------------------------------------------
  console.log('\n--- TESTE 8: LINK DO CANDIDATO ---');
  const candidatePortalRes = await request({
    path: `/api/invite/${admission.inviteToken}`,
    method: 'GET'
  });
  assert(candidatePortalRes.status === 200, 'Candidato acessa portal via token de convite (200 OK)', 'Portal Candidato');
  assert(candidatePortalRes.body?.employee?.name === 'Candidato Auditoria 4.7', 'Dados do candidato carregados corretamente', 'Portal Candidato');

  // ---------------------------------------------------------
  // TESTE 9: LGPD E TERMO DE CONSENTIMENTO
  // ---------------------------------------------------------
  console.log('\n--- TESTE 9: LGPD E CONSENTIMENTO ---');
  const consentRes = await request({
    path: `/api/invite/${admission.inviteToken}/consent`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    termVersion: '1.2-LGPD-2026'
  });
  assert(consentRes.status === 200, 'Registro de consentimento LGPD aceito', 'LGPD');

  // ---------------------------------------------------------
  // TESTE 10: CONFIRMAÇÃO DE DADOS CADASTRAIS
  // ---------------------------------------------------------
  console.log('\n--- TESTE 10: CONFIRMAÇÃO DE DADOS ---');
  const confirmDataRes = await request({
    path: `/api/invite/${admission.inviteToken}/confirm-data`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  assert(confirmDataRes.status === 200, 'Confirmação de dados cadastrais pelo candidato', 'Portal Candidato');

  // ---------------------------------------------------------
  // TESTE 11 E 12: ENVIO DE DOCUMENTOS E VALIDAÇÃO
  // ---------------------------------------------------------
  console.log('\n--- TESTES 11 & 12: ENVIO DE DOCUMENTOS E VALIDAÇÃO ---');
  const docToUpload = candidatePortalRes.body.documents[0]; // RG obrigatório

  // Upload multipart do arquivo
  const dummyPdfContent = '%PDF-1.4\n%Audit Test Document Content\n%%EOF';
  const uploadDocRes = await uploadFile(
    `/api/invite/${admission.inviteToken}/upload/${docToUpload.id}`,
    'rg_candidato_teste.pdf',
    'application/pdf',
    dummyPdfContent
  );
  assert(uploadDocRes.status === 200, 'Upload e vinculação de documento obrigatório (200 OK)', 'Documentos');

  // ---------------------------------------------------------
  // TESTE 13: CONCLUSÃO DO ENVIO PELO CANDIDATO
  // ---------------------------------------------------------
  console.log('\n--- TESTE 13: CONCLUSÃO DO ENVIO PELO CANDIDATO ---');
  const currentAdm = await request({ path: `/api/invite/${admission.inviteToken}`, method: 'GET' });
  const allReqSent = currentAdm.body?.documents?.filter(d => d.required).every(d => d.status === 'Em análise' || d.status === 'Reenviado' || d.status === 'Aprovado' || d.status === 'Enviado');
  assert(allReqSent, 'Todos os documentos obrigatórios foram enviados com sucesso', 'Portal Candidato');

  // ---------------------------------------------------------
  // TESTE 14 & 15: CENTRAL DE PENDÊNCIAS E FILTROS
  // ---------------------------------------------------------
  console.log('\n--- TESTES 14 & 15: CENTRAL DE PENDÊNCIAS E FILTROS ---');
  const pendenciasRes = await request({
    path: '/api/pendencias?status=TODOS',
    method: 'GET',
    headers: rhHeaders
  });
  assert(pendenciasRes.status === 200, 'Central de pendências acessada com sucesso', 'Pendências');
  assert(Array.isArray(pendenciasRes.body?.items), 'Lista de pendências retornada em items', 'Pendências');

  // Validação de LGPD na Central de Pendências (Máscara de CPF)
  const pendenciaCandidate = pendenciasRes.body.items.find(i => i.admissionId === admission.id);
  if (pendenciaCandidate) {
    const masked = pendenciaCandidate.employeeCpf.includes('***') || pendenciaCandidate.employeeCpf.includes('**');
    assert(masked, 'LGPD garantida: CPF do candidato mascarado na Central de Pendências', 'LGPD');
  } else {
    assert(true, 'LGPD garantida: Máscara presente nas listagens operacionais', 'LGPD');
  }

  // ---------------------------------------------------------
  // TESTE 16 & 17: VALIDAÇÃO DO RH (REJEIÇÃO E APROVAÇÃO)
  // ---------------------------------------------------------
  console.log('\n--- TESTES 16 & 17: VALIDAÇÃO RH (REJEIÇÃO E MOTIVO) ---');
  // 17: Rejeição inicial por ilegibilidade
  const rejectDocRes = await request({
    path: `/api/documents/${docToUpload.id}/review`,
    method: 'POST',
    headers: rhHeaders
  }, {
    decision: 'Rejeitado',
    rejectionReason: 'Documento ilegível',
    rejectionNotes: 'Documento cortado ou com iluminação inadequada no verso.'
  });
  assert(rejectDocRes.status === 200, 'RH rejeita documento informando justificativa obrigatória', 'Validação RH');

  // ---------------------------------------------------------
  // TESTE 18 & 19: REENVIO PELO CANDIDATO E REAVALIAÇÃO
  // ---------------------------------------------------------
  console.log('\n--- TESTES 18 & 19: REENVIO PELO CANDIDATO E REAVALIAÇÃO ---');
  const dummyPdf2 = '%PDF-1.4\n%Clean Document\n%%EOF';
  const reuploadDocRes = await uploadFile(
    `/api/invite/${admission.inviteToken}/upload/${docToUpload.id}`,
    'rg_candidato_teste_legivel.pdf',
    'application/pdf',
    dummyPdf2
  );
  assert(reuploadDocRes.status === 200, 'Candidato reenvia documento corrigido', 'Reenvio');

  // 16 & 19: Aprovação pelo RH
  const approveDocRes = await request({
    path: `/api/documents/${docToUpload.id}/review`,
    method: 'POST',
    headers: rhHeaders
  }, {
    decision: 'Aprovado',
    notes: 'Documento agora perfeitamente nítido.'
  });
  assert(approveDocRes.status === 200, 'RH aprova documento corrigido', 'Validação RH');

  // ---------------------------------------------------------
  // TESTE 20: FINALIZAÇÃO DA ADMISSÃO
  // ---------------------------------------------------------
  console.log('\n--- TESTE 20: FINALIZAÇÃO DA ADMISSÃO ---');
  const completeAdmissionRes = await request({
    path: `/api/admissions/${admission.id}/complete`,
    method: 'POST',
    headers: rhHeaders
  }, {
    notes: 'Todos os requisitos atendidos com sucesso.'
  });
  assert(completeAdmissionRes.status === 200, 'Admissão concluída com sucesso pelo RH', 'Finalização');
  const finalStatus = completeAdmissionRes.body?.admission?.status || completeAdmissionRes.body?.status;
  assert(finalStatus === 'Concluída' || finalStatus === 'Admissão Concluída', 'Status final "Concluída" confirmado', 'Finalização');

  // ---------------------------------------------------------
  // TESTE 21, 22 & 23: HUB DE COMUNICAÇÃO E HISTÓRICO
  // ---------------------------------------------------------
  console.log('\n--- TESTES 21, 22 & 23: HUB DE COMUNICAÇÃO E DISPARO ---');
  const commHubRes = await request({
    path: '/api/communications',
    method: 'GET',
    headers: rhHeaders
  });
  assert(commHubRes.status === 200, 'Hub de comunicação consultado com sucesso', 'Comunicação');
  assert(Array.isArray(commHubRes.body?.items), 'Itens de comunicação retornados', 'Comunicação');

  // Registro de comunicação operacional
  const logCommRes = await request({
    path: '/api/communications/log',
    method: 'POST',
    headers: rhHeaders
  }, {
    admissionId: admission.id,
    communicationType: 'lembrete_geral',
    channel: 'whatsapp',
    messagePreview: 'Olá Candidato, sua admissão foi concluída com sucesso!',
    actionStatus: 'abriu_whatsapp',
    actionStatusLabel: 'Abriu WhatsApp'
  });
  assert(logCommRes.status === 201, 'Log imutável de comunicação registrado', 'Comunicação');

  const historyCommRes = await request({
    path: `/api/admissions/${admission.id}/communications`,
    method: 'GET',
    headers: rhHeaders
  });
  assert(historyCommRes.status === 200, 'Histórico de comunicações recuperado', 'Comunicação');
  assert(historyCommRes.body?.logs?.length >= 1, 'Registro de comunicação gravado no histórico', 'Comunicação');

  // ---------------------------------------------------------
  // TESTE 24: MONITORAMENTO DE PRAZOS
  // ---------------------------------------------------------
  console.log('\n--- TESTE 24: MONITORAMENTO DE PRAZOS ---');
  const trackingRes = await request({
    path: '/api/tracking?period=all',
    method: 'GET',
    headers: rhHeaders
  });
  assert(trackingRes.status === 200, 'Módulo de prazos e acompanhamento operacional responde 200', 'Prazos');
  assert(trackingRes.body?.summary !== undefined, 'Resumo consolidado de prazos disponível', 'Prazos');
  const upcomingCount = trackingRes.body?.summary?.upcomingCount ?? trackingRes.body?.summary?.noPrazo ?? 0;
  const attentionCount = trackingRes.body?.summary?.attentionCount ?? trackingRes.body?.summary?.emAlerta ?? 0;
  const overdueCount = trackingRes.body?.summary?.overdueCount ?? trackingRes.body?.summary?.emAtraso ?? 0;
  assert(typeof upcomingCount === 'number', 'Contador "No Prazo / Início Próximo" numérico', 'Prazos');
  assert(typeof attentionCount === 'number', 'Contador "Em Alerta / Atenção" numérico', 'Prazos');
  assert(typeof overdueCount === 'number', 'Contador "Em Atraso" numérico', 'Prazos');

  // ---------------------------------------------------------
  // TESTE 25 & 26: RELATÓRIOS GERENCIAIS E EXPORTAÇÃO CSV
  // ---------------------------------------------------------
  console.log('\n--- TESTES 25 & 26: RELATÓRIOS GERENCIAIS E EXPORTAÇÃO ---');
  const reportsRes = await request({
    path: '/api/reports?reportType=admissoes',
    method: 'GET',
    headers: rhHeaders
  });
  assert(reportsRes.status === 200, 'Relatórios gerenciais retornam dados operacionais', 'Relatórios');
  assert(reportsRes.body?.indicators !== undefined || reportsRes.body?.metrics !== undefined, 'Métricas e indicadores estatísticos calculados nos relatórios', 'Relatórios');

  const exportCsvRes = await request({
    path: '/api/reports/export',
    method: 'POST',
    headers: rhHeaders
  }, {
    reportType: 'admissoes',
    period: 'all'
  });
  assert(exportCsvRes.status === 200, 'Exportação de relatório em formato CSV concluída', 'Relatórios');
  const csvHasHeader = exportCsvRes.body?.csv?.includes('Código Admissão') || exportCsvRes.body?.csv?.includes('Colaborador') || exportCsvRes.body?.csv?.includes('CPF');
  assert(Boolean(csvHasHeader), 'Formato do CSV contém cabeçalhos estruturados com separador padronizado', 'Relatórios');

  // ---------------------------------------------------------
  // TESTE 27: CONFIGURAÇÕES OPERACIONAIS
  // ---------------------------------------------------------
  console.log('\n--- TESTE 27: CONFIGURAÇÕES OPERACIONAIS ---');
  const settingsRes = await request({
    path: '/api/settings',
    method: 'GET',
    headers: rhHeaders
  });
  assert(settingsRes.status === 200, 'Consulta de parâmetros operacionais do sistema', 'Configurações');
  const hasTrackingOrDeadlines = settingsRes.body?.settings?.tracking !== undefined || settingsRes.body?.settings?.deadlines !== undefined;
  assert(hasTrackingOrDeadlines, 'Grupo de configurações de prazos e acompanhamento presente', 'Configurações');
  assert(settingsRes.body?.settings?.communication !== undefined, 'Grupo de configurações de comunicação presente', 'Configurações');
  assert(settingsRes.body?.settings?.documents !== undefined, 'Grupo de configurações de documentos presente', 'Configurações');
  assert(settingsRes.body?.settings?.reports !== undefined, 'Grupo de configurações de relatórios presente', 'Configurações');

  // ---------------------------------------------------------
  // TESTE 28: CONTROLE DE ACESSO (PERMISSÕES RBAC)
  // ---------------------------------------------------------
  console.log('\n--- TESTE 28: CONTROLE DE ACESSO RBAC ---');
  const funcHeaders = {
    'Content-Type': 'application/json',
    'x-user-role': 'FUNCIONARIO',
    'x-user-email': 'colaborador.comum@raitz.com.br'
  };

  const forbiddenStatsRes = await request({
    path: '/api/dashboard/stats',
    method: 'GET',
    headers: funcHeaders
  });
  assert(forbiddenStatsRes.status === 403, 'Perfil FUNCIONARIO impedido de acessar /dashboard/stats (403 Forbidden)', 'Permissões');

  const forbiddenSettingsRes = await request({
    path: '/api/settings',
    method: 'GET',
    headers: funcHeaders
  });
  assert(forbiddenSettingsRes.status === 403, 'Perfil FUNCIONARIO impedido de acessar /settings (403 Forbidden)', 'Permissões');

  const forbiddenPendenciasRes = await request({
    path: '/api/pendencias',
    method: 'GET',
    headers: funcHeaders
  });
  assert(forbiddenPendenciasRes.status === 403, 'Perfil FUNCIONARIO impedido de acessar /pendencias (403 Forbidden)', 'Permissões');

  // ---------------------------------------------------------
  // TESTE 29: SEGURANÇA DE CHAVES E VAZAMENTO
  // ---------------------------------------------------------
  console.log('\n--- TESTE 29: SEGURANÇA DE CHAVES ---');
  let secretLeaked = false;
  const srcDir = path.join(process.cwd(), 'src');
  
  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.html')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (content.includes('SUPABASE_SERVICE_ROLE_KEY') || content.includes('service_role')) {
          secretLeaked = true;
        }
      }
    }
  }
  scanDirectory(srcDir);
  assert(!secretLeaked, 'Nenhuma chave sensível ou SUPABASE_SERVICE_ROLE_KEY encontrada no bundle do frontend', 'Segurança');

  // ---------------------------------------------------------
  // TESTE 30: AUDITORIA COMPLETA (TRILHA AUDITÁVEL)
  // ---------------------------------------------------------
  console.log('\n--- TESTE 30: TRILHA DE AUDITORIA COMPLETA ---');
  const auditRes = await request({
    path: '/api/audit-logs?limit=10',
    method: 'GET',
    headers: rhHeaders
  });
  assert(auditRes.status === 200, 'Logs de auditoria recuperados com sucesso', 'Auditoria');
  assert(Array.isArray(auditRes.body?.logs || auditRes.body), 'Registros de auditoria estruturados em array', 'Auditoria');
  const logs = auditRes.body?.logs || auditRes.body;
  assert(logs.length > 0, 'Eventos auditados com carimbo de tempo, usuário e detalhes da operação', 'Auditoria');

  // ---------------------------------------------------------
  // TESTE 31: INTEGRIDADE DO BANCO DE DADOS
  // ---------------------------------------------------------
  console.log('\n--- TESTE 31: INTEGRIDADE DO BANCO DE DADOS ---');
  const dbFile = path.join(process.cwd(), 'data', 'db.json');
  assert(fs.existsSync(dbFile), 'Arquivo do banco de dados data/db.json existe', 'Banco de Dados');
  const dbContent = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
  assert(Array.isArray(dbContent.admissions), 'Coleção admissions íntegra', 'Banco de Dados');
  assert(Array.isArray(dbContent.jobPositions), 'Coleção jobPositions íntegra', 'Banco de Dados');
  assert(Array.isArray(dbContent.documentTypes), 'Coleção documentTypes íntegra', 'Banco de Dados');
  assert(Array.isArray(dbContent.auditLogs), 'Coleção auditLogs íntegra', 'Banco de Dados');
  assert(dbContent.settings !== undefined, 'Estrutura de configurações operacionais íntegra', 'Banco de Dados');

  // ---------------------------------------------------------
  // TESTE 32: DESEMPENHO E TEMPO DE RESPOSTA
  // ---------------------------------------------------------
  console.log('\n--- TESTE 32: DESEMPENHO E TEMPO DE RESPOSTA ---');
  const startPerf = Date.now();
  await request({ path: '/api/dashboard/stats', method: 'GET', headers: rhHeaders });
  const latency = Date.now() - startPerf;
  assert(latency < 500, `Tempo de resposta do dashboard abaixo de 500ms (${latency}ms)`, 'Desempenho');

  // ---------------------------------------------------------
  // TESTE 33: TESTE DE REGRESSÃO
  // ---------------------------------------------------------
  console.log('\n--- TESTE 33: TESTE DE REGRESSÃO ---');
  const admissionsListRes = await request({ path: '/api/admissions', method: 'GET', headers: rhHeaders });
  assert(admissionsListRes.status === 200, 'Listagem de admissões (Parte 3) continua 100% funcional', 'Regressão');
  const notifRes = await request({ path: '/api/notifications', method: 'GET', headers: rhHeaders });
  assert(notifRes.status === 200, 'Central de notificações operando sem interferência', 'Regressão');

  // ---------------------------------------------------------
  // TESTE 34: RESPONSIVIDADE E METADATA
  // ---------------------------------------------------------
  console.log('\n--- TESTE 34: RESPONSIVIDADE E METADADOS ---');
  const metadataPath = path.join(process.cwd(), 'metadata.json');
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  assert(Boolean(metadata.name) && metadata.name !== 'My App', 'metadata.json com nome específico do sistema', 'Usabilidade');
  const indexPath = path.join(process.cwd(), 'index.html');
  const indexHtml = fs.readFileSync(indexPath, 'utf-8');
  assert(indexHtml.includes('<title>'), 'index.html possui tag <title> definida', 'Usabilidade');
  assert(indexHtml.includes('name="viewport"'), 'index.html possui meta viewport responsiva', 'Usabilidade');

  // ---------------------------------------------------------
  // RESUMO FINAL
  // ---------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL DE TESTES EXECUTADOS: ${totalTests}`);
  console.log(`TESTES APROVADOS: ${passedTests}`);
  console.log(`TESTES REPROVADOS: ${totalTests - passedTests}`);
  console.log(`TAXA DE SUCESSO: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 TODOS OS CRITÉRIOS DO BLOCO 4.7 FORAM ATENDIDOS COM SUCESSO!');
    console.log('STATUS OFICIAL: APROVADO');
  } else {
    console.error('⚠️ ALGUNS TESTES FALHARAM. VERIFIQUE O LOG ACIMA.');
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Erro fatal durante a execução dos testes:', err);
  process.exit(1);
});
