import { db } from './server/db.ts';
import { OperationalTask } from './src/types/index.ts';

async function runTests() {
  console.log('--- BLOCO 6.9C.5: TESTES DE PROCESSAMENTO DE TAREFAS DUE_SOON ---\n');
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

  // Snapshot das tarefas e notificações existentes no banco antes dos testes
  const originalTasksRef = (db as any).data.operationalTasks || [];
  const existingTasksSnapshot = originalTasksRef.map((t: any) => ({
    id: t.id,
    priority: t.priority,
    effectivePriority: t.effectivePriority,
    dueAt: t.dueAt,
    status: t.status,
    responsibleUserId: t.responsibleUserId
  }));
  const originalNotificationsSnapshot = [...((db as any).data.notifications || [])];

  function buildTask(overrides: Partial<OperationalTask>): OperationalTask {
    return {
      id: 'task-test-69c5-base',
      admissionId: 'adm-test-69c5',
      admissionCode: 'ADM-69C5',
      employeeId: 'emp-test-69c5',
      employeeName: 'Colaborador Teste 6.9C.5',
      sourceType: 'DOCUMENTO',
      title: 'Conferir documentos enviados',
      priority: 'NORMAL',
      status: 'PENDENTE',
      dueAt: new Date(nowMs + 8 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c5',
      responsibleUserName: 'Analista RH Teste 6.9C.5',
      createdBy: 'Sistema',
      createdAt: new Date(nowMs - DAY_MS).toISOString(),
      updatedAt: new Date(nowMs - DAY_MS).toISOString(),
      history: [],
      ...overrides
    };
  }

  const runPrefix = `task-test-69c5-${Date.now()}`;

  try {
    // 1. Tarefa DUE_SOON com responsável -> 1 notificação
    const dueSoonIso = new Date(nowMs + 8 * HOUR_MS).toISOString();
    const taskDueSoonWithResp = buildTask({
      id: `${runPrefix}-duesoon-resp`,
      dueAt: dueSoonIso,
      responsibleUserId: 'user-rh-69c5',
      status: 'PENDENTE'
    });
    const expectedDueSoonDedupKey = `notif:operational_task_due_soon:${taskDueSoonWithResp.id}:${dueSoonIso}`;

    (db as any).data.operationalTasks = [taskDueSoonWithResp];
    const createdFirstRun = db.processOverdueOperationalTasks(nowMs);
    const storedDueSoon = db
      .getNotifications({ targetUserId: 'user-rh-69c5' })
      .filter(n => n.dedupKey === expectedDueSoonDedupKey);

    assert(
      createdFirstRun.length === 1 &&
        storedDueSoon.length === 1 &&
        storedDueSoon[0].category === 'PRAZOS' &&
        storedDueSoon[0].priority === 'high' &&
        storedDueSoon[0].sourceEvent === 'operational_task_due_soon',
      '1. Tarefa DUE_SOON com responsável -> 1 notificação',
      { createdCount: createdFirstRun.length, storedCount: storedDueSoon.length }
    );

    // 2. Executar novamente -> nenhuma duplicação
    const createdSecondRun = db.processOverdueOperationalTasks(nowMs);
    const storedAfterSecondRun = db
      .getNotifications({ targetUserId: 'user-rh-69c5' })
      .filter(n => n.dedupKey === expectedDueSoonDedupKey);

    assert(
      createdSecondRun.length === 0 && storedAfterSecondRun.length === 1,
      '2. Executar novamente -> nenhuma duplicação',
      { createdSecondRunCount: createdSecondRun.length, storedAfterSecondRunCount: storedAfterSecondRun.length }
    );

    // 3. Tarefa OVERDUE -> continua gerando notificação
    const taskOverdue = buildTask({
      id: `${runPrefix}-overdue`,
      dueAt: new Date(nowMs - 4 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c5',
      status: 'PENDENTE'
    });
    const expectedOverdueDedupKey = `notif:operational_task_overdue:${taskOverdue.id}`;

    (db as any).data.operationalTasks = [taskOverdue];
    const createdOverdue = db.processOverdueOperationalTasks(nowMs);
    const storedOverdue = db
      .getNotifications({ targetUserId: 'user-rh-69c5' })
      .filter(n => n.dedupKey === expectedOverdueDedupKey);

    assert(
      createdOverdue.length === 1 &&
        storedOverdue.length === 1 &&
        storedOverdue[0].category === 'PRAZOS' &&
        storedOverdue[0].priority === 'urgent' &&
        storedOverdue[0].sourceEvent === 'operational_task_overdue',
      '3. Tarefa OVERDUE -> continua gerando notificação',
      { createdOverdueCount: createdOverdue.length, storedOverdueCount: storedOverdue.length }
    );

    // 4. Tarefa NORMAL -> nenhuma notificação
    const taskNormal = buildTask({
      id: `${runPrefix}-normal`,
      dueAt: new Date(nowMs + 3 * DAY_MS).toISOString(),
      responsibleUserId: 'user-rh-69c5',
      status: 'PENDENTE'
    });
    (db as any).data.operationalTasks = [taskNormal];
    const createdNormal = db.processOverdueOperationalTasks(nowMs);
    const storedNormal = (db as any).data.notifications.filter(
      (n: any) => n.dedupKey && n.dedupKey.includes(taskNormal.id)
    );
    assert(
      createdNormal.length === 0 && storedNormal.length === 0,
      '4. Tarefa NORMAL -> nenhuma notificação',
      { createdNormalCount: createdNormal.length, storedNormalCount: storedNormal.length }
    );

    // 5. Tarefa sem dueAt -> nenhuma notificação
    const taskNoDueAt = buildTask({
      id: `${runPrefix}-nodue`,
      dueAt: null,
      responsibleUserId: 'user-rh-69c5',
      status: 'PENDENTE'
    });
    (db as any).data.operationalTasks = [taskNoDueAt];
    const createdNoDue = db.processOverdueOperationalTasks(nowMs);
    const storedNoDue = (db as any).data.notifications.filter(
      (n: any) => n.dedupKey && n.dedupKey.includes(taskNoDueAt.id)
    );
    assert(
      createdNoDue.length === 0 && storedNoDue.length === 0,
      '5. Tarefa sem dueAt -> nenhuma notificação',
      { createdNoDueCount: createdNoDue.length, storedNoDueCount: storedNoDue.length }
    );

    // 6. Tarefa DUE_SOON sem responsável -> nenhuma notificação
    const taskDueSoonNoResp = buildTask({
      id: `${runPrefix}-duesoon-noresp`,
      dueAt: dueSoonIso,
      responsibleUserId: null,
      status: 'PENDENTE'
    });
    (db as any).data.operationalTasks = [taskDueSoonNoResp];
    const createdDueSoonNoResp = db.processOverdueOperationalTasks(nowMs);
    const storedDueSoonNoResp = (db as any).data.notifications.filter(
      (n: any) => n.dedupKey && n.dedupKey.includes(taskDueSoonNoResp.id)
    );
    assert(
      createdDueSoonNoResp.length === 0 && storedDueSoonNoResp.length === 0,
      '6. Tarefa DUE_SOON sem responsável -> nenhuma notificação',
      { createdDueSoonNoRespCount: createdDueSoonNoResp.length, storedDueSoonNoRespCount: storedDueSoonNoResp.length }
    );

    // 7. Tarefa concluída -> nenhuma notificação
    const taskCompleted = buildTask({
      id: `${runPrefix}-completed`,
      dueAt: dueSoonIso,
      responsibleUserId: 'user-rh-69c5',
      status: 'CONCLUIDA'
    });
    (db as any).data.operationalTasks = [taskCompleted];
    const createdCompleted = db.processOverdueOperationalTasks(nowMs);
    const storedCompleted = (db as any).data.notifications.filter(
      (n: any) => n.dedupKey && n.dedupKey.includes(taskCompleted.id)
    );
    assert(
      createdCompleted.length === 0 && storedCompleted.length === 0,
      '7. Tarefa concluída -> nenhuma notificação',
      { createdCompletedCount: createdCompleted.length, storedCompletedCount: storedCompleted.length }
    );

    // 8. Tarefa cancelada -> nenhuma notificação
    const taskCancelled = buildTask({
      id: `${runPrefix}-cancelled`,
      dueAt: dueSoonIso,
      responsibleUserId: 'user-rh-69c5',
      status: 'CANCELADA'
    });
    (db as any).data.operationalTasks = [taskCancelled];
    const createdCancelled = db.processOverdueOperationalTasks(nowMs);
    const storedCancelled = (db as any).data.notifications.filter(
      (n: any) => n.dedupKey && n.dedupKey.includes(taskCancelled.id)
    );
    assert(
      createdCancelled.length === 0 && storedCancelled.length === 0,
      '8. Tarefa cancelada -> nenhuma notificação',
      { createdCancelledCount: createdCancelled.length, storedCancelledCount: storedCancelled.length }
    );
  } finally {
    // Restaurar as tarefas e notificações originais do banco
    (db as any).data.operationalTasks = originalTasksRef;
    (db as any).data.notifications = originalNotificationsSnapshot;
    (db as any).save();
  }

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

  console.log(`\nRESULTADO 6.9C.5: ${passed} PASSOU | ${failed} FALHOU (TOTAL: ${passed + failed})`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Erro nos testes 6.9C.5:', err);
  process.exit(1);
});
