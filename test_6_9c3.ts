import { db } from './server/db.ts';
import { OperationalTask } from './src/types/index.ts';

async function runTests() {
  console.log('--- BLOCO 6.9C.3: TESTES DE NOTIFICAÇÃO DE TAREFA PRÓXIMA DO VENCIMENTO ---\n');
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
    effectivePriority: t.effectivePriority,
    dueAt: t.dueAt,
    status: t.status,
    responsibleUserId: t.responsibleUserId
  }));

  function buildTask(overrides: Partial<OperationalTask>): OperationalTask {
    return {
      id: 'task-test-69c3-01',
      admissionId: 'adm-test-69c3',
      admissionCode: 'ADM-69C3',
      employeeId: 'emp-test-69c3',
      employeeName: 'Colaborador Teste 6.9C.3',
      sourceType: 'DOCUMENTO',
      title: 'Conferir documentos enviados pelo candidato',
      priority: 'NORMAL',
      status: 'PENDENTE',
      dueAt: new Date(nowMs + 8 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c3',
      responsibleUserName: 'Analista RH Teste 6.9C.3',
      createdBy: 'Sistema',
      createdAt: new Date(nowMs - DAY_MS).toISOString(),
      updatedAt: new Date(nowMs - DAY_MS).toISOString(),
      history: [],
      ...overrides
    };
  }

  const uniqueTaskId = `task-test-69c3-${Date.now()}`;
  const dueSoonIso = new Date(nowMs + 8 * HOUR_MS).toISOString();
  const expectedDedupKey = `notif:operational_task_due_soon:${uniqueTaskId}:${dueSoonIso}`;

  const dueSoonWithResponsible = buildTask({
    id: uniqueTaskId,
    dueAt: dueSoonIso,
    responsibleUserId: 'user-rh-69c3',
    admissionId: 'adm-test-69c3',
    priority: 'NORMAL',
    status: 'PENDENTE'
  });

  // 1. Tarefa DUE_SOON com responsável -> cria 1 notificação
  const notif1 = db.notifyDueSoonOperationalTask(dueSoonWithResponsible, nowMs);
  const matchingAfterFirst = db
    .getNotifications({ targetUserId: 'user-rh-69c3' })
    .filter(n => n.dedupKey === expectedDedupKey);

  assert(
    notif1 !== null && matchingAfterFirst.length === 1,
    '1. Tarefa DUE_SOON com responsável cria 1 notificação',
    { notifId: notif1?.id, count: matchingAfterFirst.length }
  );

  // 2. targetUserId correto
  assert(
    notif1?.targetUserId === 'user-rh-69c3',
    '2. targetUserId correto',
    { targetUserId: notif1?.targetUserId }
  );

  // 3. Categoria = PRAZOS
  assert(
    notif1?.category === 'PRAZOS',
    '3. Categoria = PRAZOS',
    { category: notif1?.category }
  );

  // 4. Prioridade = high
  assert(
    notif1?.priority === 'high',
    '4. Prioridade = high',
    { priority: notif1?.priority }
  );

  // 5. admissionId preservado quando existir
  assert(
    notif1?.admissionId === 'adm-test-69c3',
    '5. admissionId preservado quando existir',
    { admissionId: notif1?.admissionId }
  );

  // 6. sourceEvent correto
  assert(
    notif1?.sourceEvent === 'operational_task_due_soon' &&
      notif1?.message.toLowerCase().includes('próxima do vencimento'),
    '6. sourceEvent correto (operational_task_due_soon)',
    { sourceEvent: notif1?.sourceEvent, message: notif1?.message }
  );

  // 7. dedupKey determinístico (ID da tarefa + evento + janela de vencimento)
  assert(
    notif1?.dedupKey === expectedDedupKey,
    '7. dedupKey determinístico baseado no ID da tarefa + evento + janela de vencimento',
    { dedupKey: notif1?.dedupKey, expectedDedupKey }
  );

  // 8. Chamada repetida não duplica a notificação
  const notif2 = db.notifyDueSoonOperationalTask(dueSoonWithResponsible, nowMs);
  const matchingAfterSecond = db
    .getNotifications({ targetUserId: 'user-rh-69c3' })
    .filter(n => n.dedupKey === expectedDedupKey);

  assert(
    notif2?.id === notif1?.id &&
      matchingAfterSecond.length === 1 &&
      dueSoonWithResponsible.priority === 'NORMAL' &&
      dueSoonWithResponsible.effectivePriority === undefined,
    '8. Chamada repetida não duplica a notificação e não altera priority/effectivePriority da tarefa',
    { count: matchingAfterSecond.length, firstId: notif1?.id, secondId: notif2?.id }
  );

  // 9. Tarefa não DUE_SOON (NORMAL, OVERDUE, CONCLUIDA, CANCELADA) -> não cria notificação
  const taskNormal = buildTask({
    id: `${uniqueTaskId}-normal`,
    dueAt: new Date(nowMs + 3 * DAY_MS).toISOString(),
    responsibleUserId: 'user-rh-69c3',
    status: 'PENDENTE'
  });
  const taskOverdue = buildTask({
    id: `${uniqueTaskId}-overdue`,
    dueAt: new Date(nowMs - 4 * HOUR_MS).toISOString(),
    responsibleUserId: 'user-rh-69c3',
    status: 'PENDENTE'
  });
  const taskCompleted = buildTask({
    id: `${uniqueTaskId}-completed`,
    dueAt: dueSoonIso,
    responsibleUserId: 'user-rh-69c3',
    status: 'CONCLUIDA'
  });
  const taskCancelled = buildTask({
    id: `${uniqueTaskId}-cancelled`,
    dueAt: dueSoonIso,
    responsibleUserId: 'user-rh-69c3',
    status: 'CANCELADA'
  });

  const notifNormal = db.notifyDueSoonOperationalTask(taskNormal, nowMs);
  const notifOverdue = db.notifyDueSoonOperationalTask(taskOverdue, nowMs);
  const notifCompleted = db.notifyDueSoonOperationalTask(taskCompleted, nowMs);
  const notifCancelled = db.notifyDueSoonOperationalTask(taskCancelled, nowMs);

  assert(
    notifNormal === null &&
      notifOverdue === null &&
      notifCompleted === null &&
      notifCancelled === null,
    '9. Tarefa não DUE_SOON não cria notificação',
    { notifNormal, notifOverdue, notifCompleted, notifCancelled }
  );

  // 10. Tarefa sem responsável -> não cria notificação
  const dueSoonWithoutResponsible = buildTask({
    id: `${uniqueTaskId}-no-resp`,
    dueAt: dueSoonIso,
    responsibleUserId: null,
    status: 'PENDENTE'
  });
  const notifNoResp = db.notifyDueSoonOperationalTask(dueSoonWithoutResponsible, nowMs);
  assert(
    notifNoResp === null,
    '10. Tarefa sem responsável não cria notificação',
    { notifNoResp }
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
      curr.effectivePriority !== prev.effectivePriority ||
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

  console.log(`\nRESULTADO 6.9C.3: ${passed} PASSOU | ${failed} FALHOU (TOTAL: ${passed + failed})`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Erro nos testes 6.9C.3:', err);
  process.exit(1);
});
