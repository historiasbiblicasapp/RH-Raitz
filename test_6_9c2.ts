import { db } from './server/db.ts';
import { OperationalTask } from './src/types/index.ts';

async function runTests() {
  console.log('--- BLOCO 6.9C.2: TESTES DE NOTIFICAÇÃO DE TAREFA VENCIDA ---\n');
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
  const existingTasksSnapshot = ((db as any).data.operationalTasks || []).map((t: any) => ({
    id: t.id,
    priority: t.priority,
    dueAt: t.dueAt,
    status: t.status,
    responsibleUserId: t.responsibleUserId
  }));

  function buildTask(overrides: Partial<OperationalTask>): OperationalTask {
    return {
      id: 'task-test-69c2-01',
      admissionId: 'adm-test-69c2',
      admissionCode: 'ADM-69C2',
      employeeId: 'emp-test-69c2',
      employeeName: 'Colaborador Teste 6.9C.2',
      sourceType: 'DOCUMENTO',
      title: 'Cobrar documento pendente do candidato',
      priority: 'NORMAL',
      status: 'PENDENTE',
      dueAt: new Date(nowMs - 4 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c2',
      responsibleUserName: 'Analista RH Teste',
      createdBy: 'Sistema',
      createdAt: new Date(nowMs - 2 * DAY_MS).toISOString(),
      updatedAt: new Date(nowMs - 2 * DAY_MS).toISOString(),
      history: [],
      ...overrides
    };
  }

  const uniqueTaskId = `task-test-69c2-${Date.now()}`;
  const expectedDedupKey = `notif:operational_task_overdue:${uniqueTaskId}`;

  // 1. Tarefa vencida com responsável -> cria 1 notificação
  const overdueWithResponsible = buildTask({
    id: uniqueTaskId,
    dueAt: new Date(nowMs - 3 * HOUR_MS).toISOString(),
    responsibleUserId: 'user-rh-69c2',
    admissionId: 'adm-test-69c2',
    status: 'PENDENTE'
  });

  const notif1 = db.notifyOverdueOperationalTask(overdueWithResponsible, nowMs);
  const matchingAfterFirst = db
    .getNotifications({ targetUserId: 'user-rh-69c2' })
    .filter(n => n.dedupKey === expectedDedupKey);

  assert(
    notif1 !== null && matchingAfterFirst.length === 1,
    '1. Tarefa vencida com responsável cria 1 notificação',
    { notifId: notif1?.id, count: matchingAfterFirst.length }
  );

  // 2. Notificação contém targetUserId correto
  assert(
    notif1?.targetUserId === 'user-rh-69c2',
    '2. Notificação contém targetUserId correto',
    { targetUserId: notif1?.targetUserId }
  );

  // 3. Categoria = PRAZOS
  assert(
    notif1?.category === 'PRAZOS',
    '3. Categoria = PRAZOS',
    { category: notif1?.category }
  );

  // 4. Prioridade = urgent (e inclui admissionId, sourceEvent e mensagem de vencimento)
  assert(
    notif1?.priority === 'urgent' &&
      notif1?.admissionId === 'adm-test-69c2' &&
      notif1?.sourceEvent === 'operational_task_overdue' &&
      notif1?.dedupKey === expectedDedupKey &&
      notif1?.message.toLowerCase().includes('vencida'),
    '4. Prioridade = urgent, admissionId, sourceEvent e dedupKey preenchidos corretamente',
    {
      priority: notif1?.priority,
      admissionId: notif1?.admissionId,
      sourceEvent: notif1?.sourceEvent,
      dedupKey: notif1?.dedupKey
    }
  );

  // 5. Idempotência: chamar novamente para a mesma tarefa não duplica notificação
  const notif2 = db.notifyOverdueOperationalTask(overdueWithResponsible, nowMs);
  const matchingAfterSecond = db
    .getNotifications({ targetUserId: 'user-rh-69c2' })
    .filter(n => n.dedupKey === expectedDedupKey);

  assert(
    notif2?.id === notif1?.id && matchingAfterSecond.length === 1,
    '5. Segunda chamada com a mesma tarefa vencida não cria duplicata (dedupKey determinístico)',
    { count: matchingAfterSecond.length, firstId: notif1?.id, secondId: notif2?.id }
  );

  // 6. Tarefa vencida sem responsibleUserId -> NÃO cria notificação
  const overdueWithoutResponsible = buildTask({
    id: `${uniqueTaskId}-no-resp`,
    dueAt: new Date(nowMs - 3 * HOUR_MS).toISOString(),
    responsibleUserId: null,
    status: 'PENDENTE'
  });
  const notifNoResp = db.notifyOverdueOperationalTask(overdueWithoutResponsible, nowMs);
  assert(
    notifNoResp === null,
    '6. Tarefa vencida sem responsibleUserId NÃO cria notificação',
    { notifNoResp }
  );

  // 7. Tarefa não vencida (DUE_SOON, NORMAL, CONCLUIDA) -> NÃO cria notificação
  const taskDueSoon = buildTask({
    id: `${uniqueTaskId}-duesoon`,
    dueAt: new Date(nowMs + 6 * HOUR_MS).toISOString(),
    responsibleUserId: 'user-rh-69c2',
    status: 'PENDENTE'
  });
  const taskNormal = buildTask({
    id: `${uniqueTaskId}-normal`,
    dueAt: new Date(nowMs + 3 * DAY_MS).toISOString(),
    responsibleUserId: 'user-rh-69c2',
    status: 'PENDENTE'
  });
  const taskCompleted = buildTask({
    id: `${uniqueTaskId}-completed`,
    dueAt: new Date(nowMs - 5 * HOUR_MS).toISOString(),
    responsibleUserId: 'user-rh-69c2',
    status: 'CONCLUIDA'
  });

  const notifDueSoon = db.notifyOverdueOperationalTask(taskDueSoon, nowMs);
  const notifNormal = db.notifyOverdueOperationalTask(taskNormal, nowMs);
  const notifCompleted = db.notifyOverdueOperationalTask(taskCompleted, nowMs);

  assert(
    notifDueSoon === null && notifNormal === null && notifCompleted === null,
    '7. Tarefas não vencidas (DUE_SOON, NORMAL, CONCLUIDA) NÃO criam notificação',
    { notifDueSoon, notifNormal, notifCompleted }
  );

  // Limpar a notificação sintética criada no teste para não poluir o banco
  (db as any).data.notifications = ((db as any).data.notifications || []).filter(
    (n: any) => n.dedupKey !== expectedDedupKey
  );
  (db as any).save();

  // Confirmação de que nenhuma tarefa existente no banco foi alterada
  const afterTasks = (db as any).data.operationalTasks || [];
  let allIntact = afterTasks.length === existingTasksSnapshot.length;
  for (const prev of existingTasksSnapshot) {
    const curr = afterTasks.find((t: any) => t.id === prev.id);
    if (
      !curr ||
      curr.priority !== prev.priority ||
      curr.dueAt !== prev.dueAt ||
      curr.status !== prev.status ||
      curr.responsibleUserId !== prev.responsibleUserId
    ) {
      allIntact = false;
      break;
    }
  }
  if (!allIntact) {
    console.error('[FAIL] Alguma tarefa existente foi alterada.');
    failed++;
  }

  console.log(`\nRESULTADO 6.9C.2: ${passed} PASSOU | ${failed} FALHOU (TOTAL: ${passed + failed})`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Erro nos testes 6.9C.2:', err);
  process.exit(1);
});
