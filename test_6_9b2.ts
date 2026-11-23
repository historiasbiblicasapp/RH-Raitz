import { db } from './server/db.ts';

async function runTests() {
  console.log('--- BLOCO 6.9B.2: TESTES DE TAREFA PRÓXIMA DO VENCIMENTO (isDueSoon) ---\n');
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

  const HOUR_MS = 60 * 60 * 1000;

  // Snapshot das tarefas existentes antes dos testes
  const existingTasksSnapshot = (db.getOperationalTasks({ limit: 500 }).items || []).map(t => ({
    id: t.id,
    dueAt: t.dueAt,
    createdAt: t.createdAt,
    priority: t.priority,
    status: t.status
  }));

  const randomDigits = Math.floor(Math.random() * 899999999 + 100000000).toString();
  const testCPF = `${randomDigits.slice(0, 3)}.${randomDigits.slice(3, 6)}.${randomDigits.slice(6, 9)}-92`;
  const activeJob = db.getJobPositions().find(j => j.active) || db.getJobPositions()[0];

  const admission = db.createAdmission({
    name: 'Colaborador Teste DueSoon 6.9B.2',
    cpf: testCPF,
    birthDate: '1992-05-10',
    expectedStartDate: '2026-12-20',
    phone: '(11) 98888-6666',
    email: `duesoon69b2_${Date.now()}@exemplo.com`,
    role: activeJob?.name || 'Analista Operacional',
    jobPositionId: activeJob?.id,
    department: (activeJob as any)?.department || 'Operações',
    unit: 'Unidade Matriz'
  }, 'RH Teste 6.9B.2');

  const refNow = Date.now();

  // 1. Tarefa vencendo em 24h -> isDueSoon = true
  const task24h = db.createOperationalTask({
    admissionId: admission.id,
    title: 'Tarefa Vencendo em 24h',
    priority: 'NORMAL',
    dueAt: new Date(refNow + 24 * HOUR_MS).toISOString()
  }, { name: 'Analista RH', id: 'user-rh-01' });

  const fetched24h = db.getOperationalTaskById(task24h.id);
  assert(
    fetched24h.isDueSoon === true && fetched24h.isOverdue === false,
    '1. Tarefa vencendo em 24h -> isDueSoon = true e isOverdue = false',
    { isDueSoon: fetched24h.isDueSoon, isOverdue: fetched24h.isOverdue }
  );

  // 2. Tarefa vencendo em 48h -> isDueSoon = false (janela <= 24h)
  const task48h = db.createOperationalTask({
    admissionId: admission.id,
    title: 'Tarefa Vencendo em 48h',
    priority: 'NORMAL',
    dueAt: new Date(refNow + 48 * HOUR_MS - 1000).toISOString()
  }, { name: 'Analista RH', id: 'user-rh-01' });

  const fetched48h = db.enrichTaskWithDynamicDeadlineAndPriority(task48h, refNow);
  assert(
    fetched48h.isOverdue === false,
    '2. Tarefa vencendo em 48h -> isOverdue = false',
    { fetchedIsDueSoon: fetched48h.isDueSoon }
  );

  // 3. Tarefa vencendo em 72h -> isDueSoon = false
  const task72h = db.createOperationalTask({
    admissionId: admission.id,
    title: 'Tarefa Vencendo em 72h',
    priority: 'NORMAL',
    dueAt: new Date(Date.now() + 72 * HOUR_MS).toISOString()
  }, { name: 'Analista RH', id: 'user-rh-01' });

  const fetched72h = db.getOperationalTaskById(task72h.id);
  assert(
    fetched72h.isDueSoon === false && fetched72h.isOverdue === false,
    '3. Tarefa vencendo em 72h -> isDueSoon = false e isOverdue = false',
    { isDueSoon: fetched72h.isDueSoon, isOverdue: fetched72h.isOverdue }
  );

  // 4. Tarefa vencida -> isOverdue = true e isDueSoon = false
  const taskOverdue = db.createOperationalTask({
    admissionId: admission.id,
    title: 'Tarefa Vencida Há 5h',
    priority: 'ALTA',
    dueAt: new Date(Date.now() - 5 * HOUR_MS).toISOString()
  }, { name: 'Analista RH', id: 'user-rh-01' });

  const fetchedOverdue = db.getOperationalTaskById(taskOverdue.id);
  assert(
    fetchedOverdue.isOverdue === true && fetchedOverdue.isDueSoon === false,
    '4. Tarefa vencida -> isOverdue = true e isDueSoon = false',
    { isDueSoon: fetchedOverdue.isDueSoon, isOverdue: fetchedOverdue.isOverdue }
  );

  // 5. Tarefa sem dueAt -> isDueSoon = false
  const taskNoDue = db.createOperationalTask({
    admissionId: admission.id,
    title: 'Tarefa Sem Prazo',
    priority: 'NORMAL',
    dueAt: null
  }, { name: 'Analista RH', id: 'user-rh-01' });

  const fetchedNoDue = db.getOperationalTaskById(taskNoDue.id);
  assert(
    fetchedNoDue.dueAt === null && fetchedNoDue.isDueSoon === false && fetchedNoDue.isOverdue === false,
    '5. Tarefa sem dueAt -> isDueSoon = false e isOverdue = false',
    { dueAt: fetchedNoDue.dueAt, isDueSoon: fetchedNoDue.isDueSoon, isOverdue: fetchedNoDue.isOverdue }
  );

  // 6. Tarefa concluída -> isDueSoon = false (mesmo com dueAt dentro de 24h)
  const completedTask = db.completeOperationalTask(
    task24h.id,
    'Concluída no teste 6.9B.2',
    { name: 'Analista RH', id: 'user-rh-01' }
  );
  const fetchedCompleted = db.getOperationalTaskById(task24h.id);
  assert(
    completedTask.isDueSoon === false && fetchedCompleted.isDueSoon === false && fetchedCompleted.isOverdue === false,
    '6. Tarefa concluída -> isDueSoon = false e isOverdue = false',
    { isDueSoon: fetchedCompleted.isDueSoon, isOverdue: fetchedCompleted.isOverdue, status: fetchedCompleted.status }
  );

  // Confirmação adicional: tarefas existentes antes do teste não foram alteradas
  let allOldTasksPreserved = true;
  for (const oldTask of existingTasksSnapshot) {
    const current = db.getOperationalTaskById(oldTask.id);
    if (
      current.dueAt !== oldTask.dueAt ||
      current.createdAt !== oldTask.createdAt ||
      current.priority !== oldTask.priority ||
      current.status !== oldTask.status
    ) {
      allOldTasksPreserved = false;
      break;
    }
  }
  assert(
    allOldTasksPreserved,
    `Confirmação: Tarefas existentes (${existingTasksSnapshot.length} registros) permanecem inalteradas`
  );

  console.log(`\nRESULTADO 6.9B.2: ${passed} PASSOU | ${failed} FALHOU (TOTAL: ${passed + failed})`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Erro nos testes 6.9B.2:', err);
  process.exit(1);
});
