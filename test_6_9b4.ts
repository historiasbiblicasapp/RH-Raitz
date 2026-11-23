import { db } from './server/db.ts';

async function runTests() {
  console.log('--- BLOCO 6.9B.4: CONSOLIDAÇÃO DA PRIORIDADE EFETIVA ---\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string, details?: any) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      if (details) console.error('  Detalhes:', details);
      failed++;
    }
  }

  const nowMs = Date.now();
  const HOUR_MS = 60 * 60 * 1000;
  const DAY_MS = 24 * HOUR_MS;

  // Snapshot das tarefas existentes no banco antes dos testes
  const existingSnapshot = ((db as any).data.operationalTasks || []).map((t: any) => ({
    id: t.id,
    priority: t.priority,
    dueAt: t.dueAt,
    status: t.status,
    hasPersistedEffective: Object.prototype.hasOwnProperty.call(t, 'effectivePriority')
  }));

  const randomDigits = Math.floor(Math.random() * 899999999 + 100000000).toString();
  const testCPF = `${randomDigits.slice(0, 3)}.${randomDigits.slice(3, 6)}.${randomDigits.slice(6, 9)}-94`;
  const activeJob = db.getJobPositions().find(j => j.active) || db.getJobPositions()[0];

  const admission = db.createAdmission({
    name: 'Colaborador Teste 6.9B.4',
    cpf: testCPF,
    birthDate: '1991-05-10',
    expectedStartDate: '2026-12-28',
    phone: '(11) 97777-1234',
    email: `teste69b4_${Date.now()}@exemplo.com`,
    role: activeJob?.name || 'Analista Operacional',
    jobPositionId: activeJob?.id,
    department: (activeJob as any)?.department || 'Operações',
    unit: 'Unidade Matriz'
  }, 'RH Teste 6.9B.4');

  // Criar 3 tarefas reais para validar getOperationalTasks e getOperationalTaskById:
  // A) Tarefa NORMAL com prazo normal (+3 dias)
  const taskNormal = db.createOperationalTask({
    admissionId: admission.id,
    title: 'Tarefa Normal Prazo Normal 6.9B.4',
    priority: 'NORMAL',
    dueAt: new Date(nowMs + 3 * DAY_MS).toISOString(),
    sourceType: 'ADMISSAO'
  }, { name: 'RH Teste', id: 'user-rh-01' });

  // B) Tarefa NORMAL próxima do vencimento (dueSoon: +8 horas)
  const taskDueSoon = db.createOperationalTask({
    admissionId: admission.id,
    title: 'Tarefa Normal DueSoon 6.9B.4',
    priority: 'NORMAL',
    dueAt: new Date(nowMs + 8 * HOUR_MS).toISOString(),
    sourceType: 'DOCUMENTO'
  }, { name: 'RH Teste', id: 'user-rh-01' });

  // C) Tarefa NORMAL vencida (overdue: -4 horas)
  const taskOverdue = db.createOperationalTask({
    admissionId: admission.id,
    title: 'Tarefa Normal Vencida 6.9B.4',
    priority: 'NORMAL',
    dueAt: new Date(nowMs - 4 * HOUR_MS).toISOString(),
    sourceType: 'PENDENCIA'
  }, { name: 'RH Teste', id: 'user-rh-01' });

  // D) Tarefa CRITICA com prazo amplo (+5 dias) para garantir que nunca reduz
  const taskCritica = db.createOperationalTask({
    admissionId: admission.id,
    title: 'Tarefa Crítica Prazo Amplo 6.9B.4',
    priority: 'CRITICA',
    dueAt: new Date(nowMs + 5 * DAY_MS).toISOString(),
    sourceType: 'APROVACAO'
  }, { name: 'RH Teste', id: 'user-rh-01' });

  // Consulta via getOperationalTasks
  const listResult = db.getOperationalTasks({ admissionId: admission.id, limit: 50 });
  const listNormal = listResult.items.find(t => t.id === taskNormal.id)!;
  const listDueSoon = listResult.items.find(t => t.id === taskDueSoon.id)!;
  const listOverdue = listResult.items.find(t => t.id === taskOverdue.id)!;
  const listCritica = listResult.items.find(t => t.id === taskCritica.id)!;

  // Consulta via getOperationalTaskById
  const byIdNormal = db.getOperationalTaskById(taskNormal.id);
  const byIdDueSoon = db.getOperationalTaskById(taskDueSoon.id);
  const byIdOverdue = db.getOperationalTaskById(taskOverdue.id);
  const byIdCritica = db.getOperationalTaskById(taskCritica.id);

  // 1. getOperationalTasks retorna effectivePriority corretamente
  assert(
    listNormal.effectivePriority === 'NORMAL' &&
    listDueSoon.effectivePriority === 'ALTA' &&
    listOverdue.effectivePriority === 'CRITICA' &&
    listCritica.effectivePriority === 'CRITICA',
    '1. getOperationalTasks retorna effectivePriority corretamente para todos os cenários'
  );

  // 2. getOperationalTaskById retorna exatamente o mesmo effectivePriority
  assert(
    byIdNormal.effectivePriority === listNormal.effectivePriority &&
    byIdDueSoon.effectivePriority === listDueSoon.effectivePriority &&
    byIdOverdue.effectivePriority === listOverdue.effectivePriority &&
    byIdCritica.effectivePriority === listCritica.effectivePriority,
    '2. getOperationalTaskById retorna exatamente o mesmo effectivePriority que getOperationalTasks'
  );

  // 3. Tarefa vencida -> CRITICA
  assert(
    byIdOverdue.isOverdue === true && byIdOverdue.effectivePriority === 'CRITICA',
    '3. Tarefa vencida retorna effectivePriority = CRITICA'
  );

  // 4. Tarefa dueSoon -> pelo menos ALTA (e CRITICA permanece CRITICA)
  assert(
    byIdDueSoon.isDueSoon === true && byIdDueSoon.effectivePriority === 'ALTA' &&
    byIdCritica.effectivePriority === 'CRITICA',
    '4. Tarefa dueSoon retorna pelo menos ALTA e prioridade CRITICA nunca é reduzida'
  );

  // 5. Tarefa normal preserva a prioridade original
  assert(
    byIdNormal.effectivePriority === 'NORMAL' && byIdNormal.priority === 'NORMAL',
    '5. Tarefa com prazo normal preserva a prioridade original (NORMAL)'
  );

  // 6. Prioridade original armazenada permanece intacta e effectivePriority não é persistida no banco
  const rawStoredNormal = ((db as any).data.operationalTasks || []).find((t: any) => t.id === taskNormal.id);
  const rawStoredDueSoon = ((db as any).data.operationalTasks || []).find((t: any) => t.id === taskDueSoon.id);
  const rawStoredOverdue = ((db as any).data.operationalTasks || []).find((t: any) => t.id === taskOverdue.id);

  let oldTasksUnchanged = true;
  for (const prev of existingSnapshot) {
    const rawCurr = ((db as any).data.operationalTasks || []).find((t: any) => t.id === prev.id);
    if (!rawCurr || rawCurr.priority !== prev.priority || rawCurr.dueAt !== prev.dueAt || rawCurr.status !== prev.status) {
      oldTasksUnchanged = false;
      break;
    }
  }

  assert(
    rawStoredNormal.priority === 'NORMAL' &&
    rawStoredDueSoon.priority === 'NORMAL' &&
    rawStoredOverdue.priority === 'NORMAL' &&
    !Object.prototype.hasOwnProperty.call(rawStoredDueSoon, 'effectivePriority') &&
    !Object.prototype.hasOwnProperty.call(rawStoredOverdue, 'effectivePriority') &&
    oldTasksUnchanged,
    `6. Prioridade original armazenada permanece intacta, effectivePriority não é persistida e as ${existingSnapshot.length} tarefas anteriores seguem inalteradas`
  );

  console.log(`\nRESULTADO 6.9B.4: ${passed} PASSOU | ${failed} FALHOU (TOTAL: ${passed + failed})`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Erro nos testes 6.9B.4:', err);
  process.exit(1);
});
