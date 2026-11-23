import { db } from './server/db.ts';
import { OperationalTask } from './src/types/index.ts';

async function runTests() {
  console.log('--- BLOCO 6.9C.4: TESTES DE PROCESSAMENTO AUTOMÁTICO DE TAREFAS VENCIDAS ---\n');
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
      id: 'task-test-69c4-base',
      admissionId: 'adm-test-69c4',
      admissionCode: 'ADM-69C4',
      employeeId: 'emp-test-69c4',
      employeeName: 'Colaborador Teste 6.9C.4',
      sourceType: 'DOCUMENTO',
      title: 'Validar documentação pendente',
      priority: 'NORMAL',
      status: 'PENDENTE',
      dueAt: new Date(nowMs - 5 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c4',
      responsibleUserName: 'Analista RH Teste 6.9C.4',
      createdBy: 'Sistema',
      createdAt: new Date(nowMs - 2 * DAY_MS).toISOString(),
      updatedAt: new Date(nowMs - 2 * DAY_MS).toISOString(),
      history: [],
      ...overrides
    };
  }

  const runPrefix = `task-test-69c4-${Date.now()}`;

  try {
    // 1. 1 tarefa vencida com responsável -> 1 notificação
    const overdueWithResponsible = buildTask({
      id: `${runPrefix}-overdue-resp`,
      dueAt: new Date(nowMs - 4 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c4',
      status: 'PENDENTE'
    });
    (db as any).data.operationalTasks = [overdueWithResponsible];

    const createdFirstRun = db.processOverdueOperationalTasks(nowMs);
    const storedForOverdue = db
      .getNotifications({ targetUserId: 'user-rh-69c4' })
      .filter(n => n.dedupKey === `notif:operational_task_overdue:${overdueWithResponsible.id}`);

    assert(
      createdFirstRun.length === 1 &&
        storedForOverdue.length === 1 &&
        storedForOverdue[0].category === 'PRAZOS' &&
        storedForOverdue[0].priority === 'urgent',
      '1. 1 tarefa vencida com responsável -> 1 notificação',
      { createdCount: createdFirstRun.length, storedCount: storedForOverdue.length }
    );

    // 2. Executar novamente -> nenhuma duplicação
    const createdSecondRun = db.processOverdueOperationalTasks(nowMs);
    const storedAfterSecondRun = db
      .getNotifications({ targetUserId: 'user-rh-69c4' })
      .filter(n => n.dedupKey === `notif:operational_task_overdue:${overdueWithResponsible.id}`);

    assert(
      createdSecondRun.length === 0 && storedAfterSecondRun.length === 1,
      '2. Executar novamente -> nenhuma duplicação',
      { createdSecondRunCount: createdSecondRun.length, storedAfterSecondRunCount: storedAfterSecondRun.length }
    );

    // 3. Tarefa normal -> nenhuma notificação
    const taskNormal = buildTask({
      id: `${runPrefix}-normal`,
      dueAt: new Date(nowMs + 3 * DAY_MS).toISOString(),
      responsibleUserId: 'user-rh-69c4',
      status: 'PENDENTE'
    });
    (db as any).data.operationalTasks = [taskNormal];
    const createdNormal = db.processOverdueOperationalTasks(nowMs);
    const storedNormal = (db as any).data.notifications.filter(
      (n: any) => n.dedupKey === `notif:operational_task_overdue:${taskNormal.id}`
    );
    assert(
      createdNormal.length === 0 && storedNormal.length === 0,
      '3. Tarefa normal -> nenhuma notificação',
      { createdNormalCount: createdNormal.length, storedNormalCount: storedNormal.length }
    );

    // 4. Tarefa DUE_SOON -> nenhuma notificação
    const taskDueSoon = buildTask({
      id: `${runPrefix}-duesoon`,
      dueAt: new Date(nowMs + 6 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c4',
      status: 'EM_ANDAMENTO'
    });
    (db as any).data.operationalTasks = [taskDueSoon];
    const createdDueSoon = db.processOverdueOperationalTasks(nowMs);
    const storedDueSoon = (db as any).data.notifications.filter(
      (n: any) => n.dedupKey && n.dedupKey.includes(taskDueSoon.id)
    );
    assert(
      createdDueSoon.length === 0 && storedDueSoon.length === 0,
      '4. Tarefa DUE_SOON -> nenhuma notificação',
      { createdDueSoonCount: createdDueSoon.length, storedDueSoonCount: storedDueSoon.length }
    );

    // 5. Tarefa sem dueAt -> nenhuma notificação
    const taskNoDueAt = buildTask({
      id: `${runPrefix}-nodue`,
      dueAt: null,
      responsibleUserId: 'user-rh-69c4',
      status: 'PENDENTE'
    });
    (db as any).data.operationalTasks = [taskNoDueAt];
    const createdNoDue = db.processOverdueOperationalTasks(nowMs);
    const storedNoDue = (db as any).data.notifications.filter(
      (n: any) => n.dedupKey === `notif:operational_task_overdue:${taskNoDueAt.id}`
    );
    assert(
      createdNoDue.length === 0 && storedNoDue.length === 0,
      '5. Tarefa sem dueAt -> nenhuma notificação',
      { createdNoDueCount: createdNoDue.length, storedNoDueCount: storedNoDue.length }
    );

    // 6. Tarefa vencida sem responsável -> nenhuma notificação
    const taskOverdueNoResp = buildTask({
      id: `${runPrefix}-overdue-noresp`,
      dueAt: new Date(nowMs - 4 * HOUR_MS).toISOString(),
      responsibleUserId: null,
      status: 'PENDENTE'
    });
    (db as any).data.operationalTasks = [taskOverdueNoResp];
    const createdOverdueNoResp = db.processOverdueOperationalTasks(nowMs);
    const storedOverdueNoResp = (db as any).data.notifications.filter(
      (n: any) => n.dedupKey === `notif:operational_task_overdue:${taskOverdueNoResp.id}`
    );
    assert(
      createdOverdueNoResp.length === 0 && storedOverdueNoResp.length === 0,
      '6. Tarefa vencida sem responsável -> nenhuma notificação',
      { createdOverdueNoRespCount: createdOverdueNoResp.length, storedOverdueNoRespCount: storedOverdueNoResp.length }
    );

    // 7. Tarefa concluída -> nenhuma notificação
    const taskCompleted = buildTask({
      id: `${runPrefix}-completed`,
      dueAt: new Date(nowMs - 4 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c4',
      status: 'CONCLUIDA'
    });
    (db as any).data.operationalTasks = [taskCompleted];
    const createdCompleted = db.processOverdueOperationalTasks(nowMs);
    const storedCompleted = (db as any).data.notifications.filter(
      (n: any) => n.dedupKey === `notif:operational_task_overdue:${taskCompleted.id}`
    );
    assert(
      createdCompleted.length === 0 && storedCompleted.length === 0,
      '7. Tarefa concluída -> nenhuma notificação',
      { createdCompletedCount: createdCompleted.length, storedCompletedCount: storedCompleted.length }
    );

    // 8. Tarefa cancelada -> nenhuma notificação
    const taskCancelled = buildTask({
      id: `${runPrefix}-cancelled`,
      dueAt: new Date(nowMs - 4 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c4',
      status: 'CANCELADA'
    });
    (db as any).data.operationalTasks = [taskCancelled];
    const createdCancelled = db.processOverdueOperationalTasks(nowMs);
    const storedCancelled = (db as any).data.notifications.filter(
      (n: any) => n.dedupKey === `notif:operational_task_overdue:${taskCancelled.id}`
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

  console.log(`\nRESULTADO 6.9C.4: ${passed} PASSOU | ${failed} FALHOU (TOTAL: ${passed + failed})`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Erro nos testes 6.9C.4:', err);
  process.exit(1);
});
