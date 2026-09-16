/**
 * Bateria de Testes Automatizados - Bloco 4.1: Dashboard Operacional do RH
 * Sistema de Admissão Digital
 */

const http = require('http');

const PORT = 3000;
const HOST = 'localhost';

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: HOST, port: PORT, ...options }, (res) => {
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
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ PASS [T${totalTests.toString().padStart(2, '0')}] ${message}`);
    passedTests++;
  } else {
    console.error(`❌ FAIL [T${totalTests.toString().padStart(2, '0')}] ${message}`);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('INICIANDO BATERIA DE TESTES - BLOCO 4.1 DASHBOARD OPERACIONAL DO RH');
  console.log('================================================================\n');

  // Login como RH para obter token e credenciais
  const loginRes = await request({
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'rh@raitz.com.br', password: 'admin' });

  const rhToken = loginRes.body?.token;
  const rhEmail = 'rh@raitz.com.br';
  const authHeaders = {
    'x-user-email': rhEmail,
    'Authorization': `Bearer ${rhToken}`
  };

  // --- TESTE 1: STATS PADRÃO DO DASHBOARD ---
  console.log('--- TESTE 1: ESTATÍSTICAS BÁSICAS DO DASHBOARD ---');
  const defaultStatsRes = await request({
    path: '/api/dashboard/stats',
    method: 'GET',
    headers: authHeaders
  });

  assert(defaultStatsRes.status === 200, 'Endpoint /api/dashboard/stats responde 200 OK');
  const stats = defaultStatsRes.body;
  assert(typeof stats.newAdmissions === 'number', 'Possui campo newAdmissions (numérico)');
  assert(typeof stats.waitingDocuments === 'number', 'Possui campo waitingDocuments (numérico)');
  assert(typeof stats.waitingReview === 'number', 'Possui campo waitingReview (numérico)');
  assert(typeof stats.pendingIssues === 'number', 'Possui campo pendingIssues (numérico)');
  assert(typeof stats.completed === 'number', 'Possui campo completed (numérico)');
  assert(typeof stats.totalActive === 'number', 'Possui campo totalActive (numérico)');
  assert(typeof stats.cancelled === 'number', 'Possui campo cancelled (numérico)');
  assert(typeof stats.upcoming === 'number', 'Possui campo upcoming (numérico)');

  // --- TESTE 2: INDICADORES DETALHADOS DE DOCUMENTOS ---
  console.log('\n--- TESTE 2: RESUMO CONSOLIDADO DE DOCUMENTOS ---');
  assert(stats.documentStats !== undefined, 'Possui objeto documentStats com contadores');
  assert(typeof stats.documentStats?.notSent === 'number', 'Possui contagem de Não enviados');
  assert(typeof stats.documentStats?.sent === 'number', 'Possui contagem de Enviados');
  assert(typeof stats.documentStats?.inReview === 'number', 'Possui contagem de Em análise / Reenviados');
  assert(typeof stats.documentStats?.approved === 'number', 'Possui contagem de Aprovados');
  assert(typeof stats.documentStats?.rejected === 'number', 'Possui contagem de Rejeitados');
  assert(typeof stats.documentStats?.total === 'number', 'Possui total consolidado de documentos');
  assert(typeof stats.documentStats?.approvalRate === 'number', 'Possui taxa de aprovação calculada');

  // --- TESTE 3: DISTRIBUIÇÃO POR STATUS & EVOLUÇÃO TEMPORAL ---
  console.log('\n--- TESTE 3: DADOS PARA GRÁFICOS ANALÍTICOS ---');
  assert(stats.byStatus !== undefined, 'Possui objeto byStatus para o gráfico de distribuição');
  assert(Array.isArray(stats.evolution), 'Possui array evolution para o gráfico de evolução temporal');

  // --- TESTE 4: FILTROS DO DASHBOARD VIA API ---
  console.log('\n--- TESTE 4: FILTROS POR PERÍODO, STATUS E CARGO ---');
  // Filtro por período 'today'
  const todayStatsRes = await request({
    path: '/api/dashboard/stats?period=today',
    method: 'GET',
    headers: authHeaders
  });
  assert(todayStatsRes.status === 200, 'Filtro por período period=today responde com sucesso');

  // Filtro por cargo
  const roleStatsRes = await request({
    path: '/api/dashboard/stats?role=Eletricista',
    method: 'GET',
    headers: authHeaders
  });
  assert(roleStatsRes.status === 200, 'Filtro por cargo role=Eletricista responde com sucesso');

  // Filtro por status
  const statusStatsRes = await request({
    path: `/api/dashboard/stats?status=${encodeURIComponent('Pendência')}`,
    method: 'GET',
    headers: authHeaders
  });
  assert(statusStatsRes.status === 200, 'Filtro por status status=Pendência responde com sucesso');

  // Filtro personalizado com datas
  const customStatsRes = await request({
    path: '/api/dashboard/stats?period=custom&startDate=2026-01-01&endDate=2026-12-31',
    method: 'GET',
    headers: authHeaders
  });
  assert(customStatsRes.status === 200, 'Filtro por período personalizado startDate/endDate responde com sucesso');

  // --- TESTE 5: LISTAGEM DE ADMISSÕES COM METADADOS PARA O DASHBOARD ---
  console.log('\n--- TESTE 5: METADADOS DAS ADMISSÕES NO DASHBOARD ---');
  const admissionsRes = await request({
    path: '/api/admissions?limit=50',
    method: 'GET',
    headers: authHeaders
  });
  assert(admissionsRes.status === 200, 'Endpoint /api/admissions responde com sucesso para o Dashboard');
  const admissionsList = admissionsRes.body?.admissions || [];
  assert(Array.isArray(admissionsList), 'Retorna lista de admissões');

  if (admissionsList.length > 0) {
    const firstAdm = admissionsList[0];
    assert(firstAdm.employee !== undefined, 'Admissão contém dados do colaborador');
    assert(typeof firstAdm.progressPercent === 'number', 'Admissão contém snapshot progressPercent');
    assert(typeof firstAdm.approvedDocuments === 'number', 'Admissão contém approvedDocuments');
    assert(typeof firstAdm.totalDocuments === 'number', 'Admissão contém totalDocuments');
    assert(firstAdm.employee.role !== undefined, 'Admissão contém cargo');
    assert(firstAdm.employee.expectedStartDate !== undefined, 'Admissão contém expectedStartDate');
  }

  // --- RESUMO FINAL ---
  console.log('\n================================================================');
  console.log(`TOTAL DE TESTES EXECUTADOS: ${totalTests}`);
  console.log(`APROVADOS: ${passedTests}`);
  console.log(`FALHAS: ${totalTests - passedTests}`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 TODOS OS TESTES DO BLOCO 4.1 PASSARAM COM 100% DE SUCESSO!');
    process.exit(0);
  } else {
    console.error('❌ HOUVE FALHAS NA SUÍTE DE TESTES DO BLOCO 4.1.');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
