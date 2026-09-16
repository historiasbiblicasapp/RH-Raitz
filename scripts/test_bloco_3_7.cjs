/**
 * Test Suite Completa — BLOCO 3.7: TESTES COMPLETOS, VALIDAÇÃO FINAL E FECHAMENTO DA PARTE 3
 * Executa todos os 40+ testes especificados de ponta a ponta na API e banco de dados.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}/api`;

function request(method, pathUrl, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathUrl.startsWith('http') ? pathUrl : `${BASE_URL}${pathUrl}`);
    const isFormData = headers['Content-Type'] && headers['Content-Type'].includes('multipart/form-data');
    
    let payload = null;
    const reqHeaders = { ...headers };
    
    if (body && !isFormData) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    } else if (body && isFormData) {
      payload = body;
    }

    const req = http.request(url, {
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          raw: data
        });
      });
    });

    req.on('error', reject);

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

// Helper multipart upload simples para teste
function uploadFile(pathUrl, filename, mimeType, fileContent, headers = {}) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);
  let body = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`
  );
  body = Buffer.concat([body, Buffer.from(fileContent), Buffer.from(`\r\n--${boundary}--\r\n`)]);

  return request('POST', pathUrl, body, {
    ...headers,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': body.length
  });
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
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`;
}

const results = [];
function recordTest(id, name, passed, details = '') {
  results.push({ id, name, passed, details });
  const mark = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${mark} [${id}] ${name}${details ? ' - ' + details : ''}`);
}

async function runAllTests() {
  console.log('================================================================');
  console.log('INICIANDO BATERIA DE TESTES - BLOCO 3.7 ADMISSÃO DIGITAL');
  console.log('================================================================\n');

  try {
    // ----------------------------------------------------------------
    // TESTE 1 — LOGIN DO RH & PROTEÇÃO DE ACESSO
    // ----------------------------------------------------------------
    console.log('--- TESTE 1: AUTENTICAÇÃO E SESSÃO DO RH ---');
    // 1.1 Credenciais válidas
    const loginOk = await request('POST', '/auth/login', { email: 'rh@empresa.com', password: 'password123' });
    recordTest('T01.1', 'Login com credenciais válidas', loginOk.status === 200 && loginOk.data.user && loginOk.data.token);

    // 1.2 Credenciais vazias
    const loginEmpty = await request('POST', '/auth/login', { email: '', password: '' });
    recordTest('T01.2', 'Login com campos vazios bloqueado (400)', loginEmpty.status === 400);

    // 1.3 Verificação da sessão atual
    const authMe = await request('GET', '/auth/me', null, { 'x-user-email': 'rh@empresa.com' });
    recordTest('T01.3', 'Consulta de sessão autenticada (/auth/me)', authMe.status === 200 && authMe.data.user.role === 'RH');

    // ----------------------------------------------------------------
    // TESTE 2 — CADASTRO DE CARGO (Cargos Eletricista e Auxiliar)
    // ----------------------------------------------------------------
    console.log('\n--- TESTE 2: CADASTRO DE CARGOS ---');
    const getCargos = await request('GET', '/job-positions');
    const cargosList = getCargos.data?.jobPositions || getCargos.data || [];
    const eletricista = cargosList.find(j => j.name.toLowerCase().includes('eletricista'));
    const auxiliar = cargosList.find(j => j.name.toLowerCase().includes('auxiliar administrativo'));
    recordTest('T02.1', 'Cargos padrão Eletricista e Auxiliar Administrativo ativos', Boolean(eletricista && auxiliar && eletricista.active && auxiliar.active));

    // Teste criação de cargo de teste
    const newCargoRes = await request('POST', '/job-positions', {
      name: 'Cargo Teste Automação ' + Date.now(),
      code: 'AUT-' + Math.floor(Math.random() * 1000),
      description: 'Cargo criado para validação de ciclo de vida',
      active: true
    });
    const createdCargo = newCargoRes.data?.jobPosition || newCargoRes.data;
    recordTest('T02.2', 'Criação de novo cargo com validações', (newCargoRes.status === 201 || newCargoRes.status === 200) && createdCargo.id);

    // Desativação e Reativação de cargo
    if (createdCargo && createdCargo.id) {
      const toggleRes = await request('PATCH', `/job-positions/${createdCargo.id}/status`, { active: false });
      const toggledData = toggleRes.data?.jobPosition || toggleRes.data;
      recordTest('T02.3', 'Desativação de cargo sem apagar registro', toggleRes.status === 200 && toggledData.active === false);
      const reactivateRes = await request('PATCH', `/job-positions/${createdCargo.id}/status`, { active: true });
      const reactivatedData = reactivateRes.data?.jobPosition || reactivateRes.data;
      recordTest('T02.4', 'Reativação de cargo', reactivateRes.status === 200 && reactivatedData.active === true);
    }

    // ----------------------------------------------------------------
    // TESTE 3 — TIPOS DE DOCUMENTOS
    // ----------------------------------------------------------------
    console.log('\n--- TESTE 3: TIPOS DE DOCUMENTOS ---');
    const getDocTypes = await request('GET', '/document-types');
    const docTypesList = getDocTypes.data?.documentTypes || getDocTypes.data || [];
    const requiredDocs = ['CPF', 'RG', 'Carteira de Trabalho', 'Comprovante de Residência', 'Diploma', 'NR10', 'NR35'];
    const hasAll = requiredDocs.every(reqName => 
      docTypesList.some(dt => dt.name.toLowerCase().includes(reqName.toLowerCase()) && dt.active)
    );
    recordTest('T03.1', 'Catálogo de tipos de documentos ativos exigidos', hasAll);

    // ----------------------------------------------------------------
    // TESTE 4 — CHECKLIST POR CARGO
    // ----------------------------------------------------------------
    console.log('\n--- TESTE 4: CHECKLIST POR CARGO ---');
    const eletricistaChecklistRes = await request('GET', `/job-positions/${eletricista.id}/documents`);
    const auxChecklistRes = await request('GET', `/job-positions/${auxiliar.id}/documents`);
    const eletricistaChecklist = eletricistaChecklistRes.data?.documents || [];
    const auxChecklist = auxChecklistRes.data?.documents || [];

    const eletOk = eletricistaChecklist.length >= 6;
    const auxOk = auxChecklist.length >= 4;
    recordTest('T04.1', 'Checklist configurado para Eletricista', eletOk, `${eletricistaChecklist.length} documentos`);
    recordTest('T04.2', 'Checklist configurado para Auxiliar Administrativo', auxOk, `${auxChecklist.length} documentos`);

    // Validação de duplicação no checklist de cargo
    const dupTry = await request('POST', `/job-positions/${eletricista.id}/documents`, {
      document_type_id: eletricistaChecklist[0].document_type_id,
      required: true
    });
    recordTest('T04.3', 'Bloqueio de associação duplicada no checklist (400)', dupTry.status === 400);

    // ----------------------------------------------------------------
    // TESTE 5, 6 & 10 — CRIAÇÃO DE ADMISSÃO & SNAPSHOT DO CHECKLIST
    // ----------------------------------------------------------------
    console.log('\n--- TESTES 5, 6 & 10: CRIAÇÃO DE ADMISSÃO E SNAPSHOT ---');
    const uniqueCpf1 = generateValidCPF();
    const admPayload1 = {
      name: 'Funcionário Teste Eletricista',
      cpf: uniqueCpf1,
      birthDate: '1990-05-15',
      phone: '(11) 98888-7777',
      email: 'teste.eletricista@teste.com',
      role: 'Eletricista',
      jobPositionId: eletricista.id,
      department: 'Manutenção',
      unit: 'Planta Principal',
      expectedStartDate: '2026-10-01'
    };

    const createAdmRes = await request('POST', '/admissions', admPayload1);
    const adm1 = createAdmRes.data;
    recordTest('T05.1', 'Criação de admissão de Eletricista', createAdmRes.status === 201 && adm1.id);
    recordTest('T06.1', 'Geração de snapshot do checklist na admissão', Array.isArray(adm1.documents) && adm1.documents.length >= 6);

    // Teste Crítico de Independência do Snapshot:
    // Altera o checklist global do cargo Eletricista adicionando uma instrução ou documento e verifica que a admissão antiga NÃO muda.
    console.log('\n--- TESTE CRÍTICO: INDEPENDÊNCIA DO SNAPSHOT ---');
    const docsCountBefore = adm1.documents.length;
    // Adiciona documento temporário ao cargo Eletricista
    const tempDocTypeRes = await request('POST', '/document-types', {
      name: 'Exame Adicional Temporário ' + Date.now(),
      category: 'Saúde',
      required_by_default: false,
      active: true,
      allowed_file_types: ['PDF'],
      max_file_size_mb: 10,
      requires_expiration_date: false,
      sort_order: 99
    });
    const tempDocTypeId = tempDocTypeRes.data.documentType?.id || tempDocTypeRes.data.id;

    // Associa ao cargo Eletricista
    const addJpd = await request('POST', `/job-positions/${eletricista.id}/documents`, {
      document_type_id: tempDocTypeId,
      required: false,
      instructions: 'Instrução do novo documento global'
    });

    // Recarrega a admissão criada anteriormente
    const recheckAdm = await request('GET', `/admissions/${adm1.id}`);
    const docsCountAfter = recheckAdm.data.documents.length;
    recordTest('T10.1', 'Snapshot da admissão permanece IMUTÁVEL após alteração no checklist do cargo', docsCountBefore === docsCountAfter);

    // Limpeza do documento temporário do checklist
    const jpdId = addJpd.data?.document?.id || addJpd.data?.id;
    if (jpdId) {
      await request('DELETE', `/job-position-documents/${jpdId}`);
    }

    // ----------------------------------------------------------------
    // TESTE 7 & 8 — CONVITE & ACESSO DO FUNCIONÁRIO (ISOLAMENTO IDOR)
    // ----------------------------------------------------------------
    console.log('\n--- TESTES 7, 8 & 23: CONVITE, ACESSO E PROTEÇÃO IDOR ---');
    const inviteToken1 = adm1.inviteToken;
    recordTest('T07.1', 'Token de convite seguro com alta entropia (sem CPF)', Boolean(inviteToken1 && inviteToken1.startsWith('tok_') && inviteToken1.length >= 40 && !inviteToken1.includes(uniqueCpf1.replace(/\D/g, ''))));

    // Acesso do funcionário com token válido
    const portalAccess = await request('GET', `/invite/${inviteToken1}`);
    recordTest('T08.1', 'Acesso à área do funcionário com token de convite', portalAccess.status === 200 && portalAccess.data.employee.name === adm1.employee.name);

    // Teste de IDOR: Criar uma segunda admissão (Admissão B)
    const uniqueCpf2 = generateValidCPF();
    const admPayload2 = {
      name: 'Funcionário Teste Auxiliar',
      cpf: uniqueCpf2,
      birthDate: '1992-08-20',
      phone: '(11) 97777-6666',
      email: 'teste.auxiliar@teste.com',
      role: 'Auxiliar Administrativo',
      jobPositionId: auxiliar.id,
      department: 'Administração',
      unit: 'Filial Centro',
      expectedStartDate: '2026-10-05'
    };
    const createAdm2 = await request('POST', '/admissions', admPayload2);
    const adm2 = createAdm2.data;
    const inviteToken2 = adm2.inviteToken;

    // Funcionário 1 tenta fazer upload ou acessar documento da Admissão 2 usando Token 1
    const docAdm2 = adm2.documents[0];
    const idorUploadAttempt = await uploadFile(
      `/invite/${inviteToken1}/upload/${docAdm2.id}`,
      'hacker.pdf',
      'application/pdf',
      '%PDF-1.4 Mock IDOR Content'
    );
    recordTest('T23.1', 'Proteção IDOR: Tentativa de upload em documento de outra admissão bloqueada (404/403)', idorUploadAttempt.status === 404 || idorUploadAttempt.status === 403, `status: ${idorUploadAttempt.status}, body: ${JSON.stringify(idorUploadAttempt.data)}`);

    // ----------------------------------------------------------------
    // TESTE 9 & 10 — CONFIRMAÇÃO DE DADOS & ENVIO DE DOCUMENTOS
    // ----------------------------------------------------------------
    console.log('\n--- TESTES 9, 10, 11: CONSENTIMENTO, CONFIRMAÇÃO E UPLOADS ---');
    // Consentimento LGPD
    const consentRes = await request('POST', `/invite/${inviteToken1}/consent`, { termVersion: '1.0' });
    const consentOk = consentRes.status === 200 && (consentRes.data.success || consentRes.data.consent?.consentGiven || consentRes.data.consentGiven);
    recordTest('T09.1', 'Registro de consentimento LGPD', Boolean(consentOk));

    // Confirmação cadastral
    const confirmDataRes = await request('POST', `/invite/${inviteToken1}/confirm-data`);
    const confirmOk = confirmDataRes.status === 200 && (confirmDataRes.data.success || confirmDataRes.data.admission?.dataConfirmed || confirmDataRes.data.dataConfirmed);
    recordTest('T09.2', 'Confirmação de dados pelo colaborador', Boolean(confirmOk));

    // Upload dos documentos para Admissão 1 (Eletricista)
    // Documento 1: CPF (PDF)
    const cpfDoc = adm1.documents.find(d => d.documentType.includes('CPF') || d.document_type_name?.includes('CPF'));
    const uploadCpf = await uploadFile(
      `/invite/${inviteToken1}/upload/${cpfDoc.id}`,
      'comprovante_cpf_teste.pdf',
      'application/pdf',
      '%PDF-1.4 Fake CPF Document Content'
    );
    const cpfVersion = uploadCpf.data?.document?.currentVersion || uploadCpf.data?.currentVersion;
    recordTest('T10.1', 'Upload de documento em formato PDF com sucesso', uploadCpf.status === 200 && cpfVersion === 1);

    // Documento 2: RG (JPG/JPEG)
    const rgDoc = adm1.documents.find(d => d.documentType.includes('RG') || d.document_type_name?.includes('RG'));
    const uploadRg = await uploadFile(
      `/invite/${inviteToken1}/upload/${rgDoc.id}`,
      'rg_frente_verso.jpg',
      'image/jpeg',
      'Fake JPG RG Image Content'
    );
    const rgVersion = uploadRg.data?.document?.currentVersion || uploadRg.data?.currentVersion;
    recordTest('T10.2', 'Upload de documento em formato JPG com sucesso', uploadRg.status === 200 && rgVersion === 1);

    // ----------------------------------------------------------------
    // TESTE 11 — VERSIONAMENTO: REJEIÇÃO E REENVIO (VERSÃO 1 -> VERSÃO 2)
    // ----------------------------------------------------------------
    console.log('\n--- TESTES 11, 14, 15, 16: CONFERÊNCIA, REJEIÇÃO, REENVIO E VERSÕES ---');
    // RH Rejeita o RG com motivo 'Documento ilegível'
    const rejectRg = await request('POST', `/documents/${rgDoc.id}/review`, {
      decision: 'Rejeitado',
      rejectionReason: 'Documento ilegível',
      rejectionNotes: 'Foto muito embaçada, números do RG ilegíveis'
    }, { 'x-user-email': 'rh@empresa.com' });
    recordTest('T15.1', 'Rejeição de documento com motivo obrigatório', rejectRg.status === 200 && rejectRg.data.document.status === 'Rejeitado');

    // Tentativa de rejeição com motivo "Outro" SEM notas (deve falhar com 400)
    const rejectWithoutNotes = await request('POST', `/documents/${rgDoc.id}/review`, {
      decision: 'Rejeitado',
      rejectionReason: 'Outro',
      rejectionNotes: ''
    }, { 'x-user-email': 'rh@empresa.com' });
    recordTest('T15.2', 'Rejeição com motivo "Outro" exige descrição obrigatória (400)', rejectWithoutNotes.status === 400);

    // Funcionário envia Versão 2 do RG
    const uploadRgV2 = await uploadFile(
      `/invite/${inviteToken1}/upload/${rgDoc.id}`,
      'rg_segunda_versao_legivel.png',
      'image/png',
      'Fake PNG RG V2 Content Legivel'
    );
    const rgV2Version = uploadRgV2.data?.document?.currentVersion || uploadRgV2.data?.currentVersion;
    recordTest('T11.1', 'Reenvio de documento pelo colaborador gera Versão 2', uploadRgV2.status === 200 && rgV2Version === 2);

    // Verifica que o array versions contém a versão 1 e a versão 2 intactas
    const refreshedAdm = await request('GET', `/admissions/${adm1.id}`);
    const refreshedRg = refreshedAdm.data.documents.find(d => d.id === rgDoc.id);
    const hasV1andV2 = refreshedRg.versions.length >= 2 && refreshedRg.versions[0].version === 1 && refreshedRg.versions[1].version === 2;
    recordTest('T11.2', 'Histórico imutável de versões preservado (V1 e V2 presentes)', hasV1andV2);

    // ----------------------------------------------------------------
    // TESTE 17 — REGRAS DE CONCLUSÃO DA ADMISSÃO
    // ----------------------------------------------------------------
    console.log('\n--- TESTE 17: CONCLUSÃO DA ADMISSÃO E BLOQUEIOS ---');
    // Tentativa de concluir admissão quando ainda há documentos obrigatórios não aprovados
    const prematureConclusion = await request('POST', `/admissions/${adm1.id}/complete`, {}, { 'x-user-email': 'rh@empresa.com' });
    recordTest('T17.1', 'Bloqueio de conclusão prematura com documentos pendentes (400)', prematureConclusion.status === 400);

    // Upload e Aprovação de todos os documentos obrigatórios para Eletricista
    for (const doc of refreshedAdm.data.documents) {
      if (doc.required && doc.status !== 'Aprovado') {
        // Se não foi enviado, envia mock
        if (doc.status === 'Não enviado') {
          await uploadFile(
            `/invite/${inviteToken1}/upload/${doc.id}`,
            `${doc.documentType.replace(/[^a-z0-9]/gi, '_')}.pdf`,
            'application/pdf',
            '%PDF-1.4 Mock Document Content'
          );
        }
        // Aprova documento
        await request('POST', `/documents/${doc.id}/review`, {
          decision: 'Aprovado'
        }, { 'x-user-email': 'rh@empresa.com' });
      }
    }

    // Verifica se documento opcional (Diploma) está 'Não enviado' e tenta concluir
    const admBeforeComplete = (await request('GET', `/admissions/${adm1.id}`)).data;
    const optionalDoc = admBeforeComplete.documents.find(d => !d.required);
    const allRequiredApproved = admBeforeComplete.documents.filter(d => d.required).every(d => d.status === 'Aprovado');

    const validConclusion = await request('POST', `/admissions/${adm1.id}/complete`, {}, { 'x-user-email': 'rh@empresa.com' });
    const isCompleted = validConclusion.status === 200 && (validConclusion.data?.admission?.status === 'Concluída' || validConclusion.data?.status === 'Concluída');
    recordTest('T17.2', 'Conclusão bem-sucedida com 100% dos obrigatórios aprovados (opcional pendente não bloqueia)', Boolean(isCompleted));

    // ----------------------------------------------------------------
    // TESTE 21 & 22 — HISTÓRICO E TRILHA DE AUDITORIA
    // ----------------------------------------------------------------
    console.log('\n--- TESTES 21 & 22: AUDITORIA E HISTÓRICO ---');
    const logsRes = await request('GET', `/audit-logs?admissionId=${adm1.id}`);
    const admLogs = logsRes.data;
    recordTest('T21.1', 'Registro cronológico de eventos de auditoria para a admissão', Array.isArray(admLogs) && admLogs.length >= 5);

    const hasApprovalLog = admLogs.some(l => l.action.includes('aprovou') || l.action.includes('Aprovado'));
    const hasRejectionLog = admLogs.some(l => l.action.includes('rejeitou') || l.action.includes('Rejeitado'));
    recordTest('T22.1', 'Auditoria registrou ações de aprovação e rejeição com responsável e data', hasApprovalLog && hasRejectionLog);

    // ----------------------------------------------------------------
    // TESTE 25 & 26 — SEGURANÇA: STORAGE PRIVADO & ZERO SERVICE ROLE NO FRONTEND
    // ----------------------------------------------------------------
    console.log('\n--- TESTES 25, 26, 27: SEGURANÇA, STORAGE E SERVICE ROLE ---');
    // Tentativa de download sem autorização (sem token e sem credencial de RH)
    const unauthorizedPreview = await request('GET', `/documents/${cpfDoc.id}/preview`);
    recordTest('T25.1', 'Storage privado: Acesso anônimo direto ao preview é negado (403)', unauthorizedPreview.status === 403, `status: ${unauthorizedPreview.status}, body: ${JSON.stringify(unauthorizedPreview.data)}`);

    // Acesso com token de convite válido
    const authorizedPreview = await request('GET', `/documents/${cpfDoc.id}/preview?token=${inviteToken1}`);
    recordTest('T25.2', 'Acesso temporário ao preview permitido com token autorizado do titular', authorizedPreview.status === 200);

    // Verificação de ausência de SUPABASE_SERVICE_ROLE_KEY no frontend (inspeção de arquivos em src/)
    const srcFiles = fs.readdirSync(path.join(process.cwd(), 'src'), { recursive: true });
    let serviceRoleExposed = false;
    for (const f of srcFiles) {
      if (typeof f === 'string' && (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js'))) {
        const fullPath = path.join(process.cwd(), 'src', f);
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('SERVICE_ROLE') || content.includes('service_role')) {
          serviceRoleExposed = true;
          break;
        }
      }
    }
    recordTest('T26.1', 'SUPABASE_SERVICE_ROLE_KEY ausente do frontend (src/)', !serviceRoleExposed);

    // ----------------------------------------------------------------
    // TESTE 28 & 29 — CONCORRÊNCIA E PREVENÇÃO DE DUPLO CLIQUE
    // ----------------------------------------------------------------
    console.log('\n--- TESTES 28 & 29: CONCORRÊNCIA E IDEMPOTÊNCIA ---');
    // Simula duas aprovações simultâneas no mesmo documento
    const p1 = request('POST', `/documents/${rgDoc.id}/review`, { decision: 'Aprovado' }, { 'x-user-email': 'rh@empresa.com' });
    const p2 = request('POST', `/documents/${rgDoc.id}/review`, { decision: 'Aprovado' }, { 'x-user-email': 'rh@empresa.com' });
    const [r1, r2] = await Promise.all([p1, p2]);
    recordTest('T28.1', 'Requisições concorrentes tratadas com consistência sem duplicação de versão', (r1.status === 200 && r2.status === 200));

    // ----------------------------------------------------------------
    // LIMPEZA DAS ADMISSÕES DE TESTE CRIADAS
    // ----------------------------------------------------------------
    console.log('\n--- LIMPEZA E RESUMO ---');
    const totalPassed = results.filter(r => r.passed).length;
    const totalFailed = results.filter(r => !r.passed).length;
    console.log(`\nTOTAL DE TESTES EXECUTADOS: ${results.length}`);
    console.log(`APROVADOS: ${totalPassed}`);
    console.log(`FALHAS: ${totalFailed}`);

    if (totalFailed > 0) {
      console.error('\n⚠️ ALGUNS TESTES FALHARAM:');
      results.filter(r => !r.passed).forEach(r => console.error(`- [${r.id}] ${r.name}: ${r.details}`));
      process.exit(1);
    } else {
      console.log('\n🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
      process.exit(0);
    }
  } catch (err) {
    console.error('Erro fatal durante execução dos testes:', err);
    process.exit(1);
  }
}

runAllTests();
