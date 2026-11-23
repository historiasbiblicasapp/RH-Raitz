import { db } from './server/db.ts';

async function runTests() {
  console.log('--- BLOCO 6.9B.1: TESTES DE SLA BÁSICO DAS TAREFAS ---\n');
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

  const DAY_MS = 24 * 60 * 60 * 1000;

  // Snapshot das tarefas existentes antes dos testes
  const existingTasksSnapshot = (db.getOperationalTasks({ limit: 500 }).items || []).map(t => ({
    id: t.id,
    dueAt: t.dueAt,
    createdAt: t.createdAt,
    priority: t.priority,
    status: t.status
  }));

  const randomDigits = Math.floor(Math.random() * 899999999 + 100000000).toString();
  const testCPF = `${randomDigits.slice(0, 3)}.${randomDigits.slice(3, 6)}.${randomDigits.slice(6, 9)}-91`;
  const activeJob = db.getJobPositions().find(j => j.active) || db.getJobPositions()[0];

  const admission = db.createAdmission({
    name: 'Colaborador Teste SLA 6.9B.1',
    cpf: testCPF,
    birthDate: '1993-08-14',
    expectedStartDate: '2026-12-20',
    phone: '(11) 98888-7777',
    email: `sla69b1_${Date.now()}@exemplo.com`,
    role: activeJob?.name || 'Analista Operacional',
    jobPositionId: activeJob?.id,
    department: (activeJob as any)?.department || 'Operações',
    unit: 'Unidade Matriz'
  }, 'RH Teste 6.9B.1');

  // 1. Prioridade NORMAL recebe +3 dias a partir de createdAt
  const taskNormal = db.createOperationalTask({
    admissionId: admission.id,
    title: 'Tarefa SLA Prioridade Normal',
    priority: 'NORMAL',
    sourceType: 'DOCUMENTO'
  }, { name: 'Sistema (Automação)', id: 'system-automation' });

  const diffNormalMs = new Date(taskNormal.dueAt!).getTime() - new Date(taskNormal.createdAt).getTime();
  assert(
    Boolean(taskNormal.dueAt) && diffNormalMs === 3 * DAY_MS,
    '1. Tarefa com prioridade NORMAL recebe dueAt = createdAt + 3 dias',
    { createdAt: taskNormal.createdAt, dueAt: taskNormal.dueAt, diffDays: diffNormalMs / DAY_MS }
  );

  // 2. Prioridade ALTA recebe +2 dias a partir de createdAt (incluindo automação 6.6)
  const reqDoc = admission.documents.find(d => d.required)!;
  db.uploadDocument(admission.id, reqDoc.id, {
    fileName: 'doc_sla.pdf',
    fileSize: 12000,
    mimeType: 'application/pdf',
    storagePath: 'storage/doc_sla.pdf'
  });
  db.reviewDocument(reqDoc.id, 'Rejeitado', 'Analista RH', 'Imagem ilegível');

  const autoTaskAlta = (db.getOperationalTasks({ admissionId: admission.id }).items || [])
    .find(t => t.documentId === reqDoc.id && t.sourceType === 'DOCUMENTO')!;

  const diffAltaMs = new Date(autoTaskAlta.dueAt!).getTime() - new Date(autoTaskAlta.createdAt).getTime();
  assert(
    Boolean(autoTaskAlta?.dueAt) && autoTaskAlta.priority === 'ALTA' && diffAltaMs === 2 * DAY_MS,
    '2. Tarefa com prioridade ALTA (automação 6.6) recebe dueAt = createdAt + 2 dias',
    { createdAt: autoTaskAlta?.createdAt, dueAt: autoTaskAlta?.dueAt, diffDays: diffAltaMs / DAY_MS }
  );

  // 3. Prioridade CRITICA recebe +1 dia a partir de createdAt
  const taskCritica = db.createOperationalTask({
    admissionId: admission.id,
    title: 'Tarefa SLA Prioridade Crítica',
    priority: 'CRITICA',
    sourceType: 'APROVACAO'
  }, { name: 'Sistema (Automação)', id: 'system-automation' });

  const diffCriticaMs = new Date(taskCritica.dueAt!).getTime() - new Date(taskCritica.createdAt).getTime();
  assert(
    Boolean(taskCritica.dueAt) && diffCriticaMs === 1 * DAY_MS,
    '3. Tarefa com prioridade CRITICA recebe dueAt = createdAt + 1 dia',
    { createdAt: taskCritica.createdAt, dueAt: taskCritica.dueAt, diffDays: diffCriticaMs / DAY_MS }
  );

  // 4. dueAt informado manualmente é preservado sem sobrescrever
  const explicitDueAt = '2027-01-15T18:00:00.000Z';
  const taskManualDue = db.createOperationalTask({
    admissionId: admission.id,
    title: 'Tarefa com Prazo Explícito Manual',
    priority: 'CRITICA',
    dueAt: explicitDueAt,
    sourceType: 'ADMISSAO'
  }, { name: 'Analista RH', id: 'user-rh-01' });

  assert(
    taskManualDue.dueAt === explicitDueAt,
    '4. dueAt informado manualmente é preservado exatamente como enviado',
    { expected: explicitDueAt, actual: taskManualDue.dueAt }
  );

  // 5. Tarefas antigas não são alteradas
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
    `5. Tarefas antigas (${existingTasksSnapshot.length} registros) permanecem inalteradas`
  );

  console.log(`\nRESULTADO 6.9B.1: ${passed} PASSOU | ${failed} FALHOU (TOTAL: ${passed + failed})`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Erro nos testes 6.9B.1:', err);
  process.exit(1);
});
