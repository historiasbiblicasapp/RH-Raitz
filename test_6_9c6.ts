import { db } from './server/db.ts';
import { OperationalTask } from './src/types/index.ts';

async function runTests() {
  console.log('--- BLOCO 6.9C.6: TESTES DO RUNNER CENTRAL DE PRAZOS DE TAREFAS ---\n');
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
      id: 'task-test-69c6-base',
      admissionId: 'adm-test-69c6',
      admissionCode: 'ADM-69C6',
      employeeId: 'emp-test-69c6',
      employeeName: 'Colaborador Teste 6.9C.6',
      sourceType: 'DOCUMENTO',
      title: 'Validar pendências operacionais',
      priority: 'NORMAL',
      status: 'PENDENTE',
      dueAt: new Date(nowMs - 4 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c6',
      responsibleUserName: 'Analista RH Teste 6.9C.6',
      createdBy: 'Sistema',
      createdAt: new Date(nowMs - DAY_MS).toISOString(),
      updatedAt: new Date(nowMs - DAY_MS).toISOString(),
      history: [],
      ...overrides
    };
  }

  const runPrefix = `task-test-69c6-${Date.now()}`;

  try {
    // 1. Execução com tarefa OVERDUE
    const taskOverdue = buildTask({
      id: `${runPrefix}-overdue`,
      dueAt: new Date(nowMs - 4 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c6',
      status: 'PENDENTE'
    });
    const expectedOverdueDedupKey = `notif:operational_task_overdue:${taskOverdue.id}`;

    (db as any).data.operationalTasks = [taskOverdue];
    const createdOverdue = db.processOperationalTaskDeadlines(nowMs);
    const storedOverdue = db
      .getNotifications({ targetUserId: 'user-rh-69c6' })
      .filter(n => n.dedupKey === expectedOverdueDedupKey);

    assert(
      createdOverdue.length === 1 &&
        storedOverdue.length === 1 &&
        storedOverdue[0].category === 'PRAZOS' &&
        storedOverdue[0].priority === 'urgent',
      '1. Execução com tarefa OVERDUE',
      { createdCount: createdOverdue.length, storedCount: storedOverdue.length }
    );

    // 2. Execução com tarefa DUE_SOON
    const dueSoonIso = new Date(nowMs + 8 * HOUR_MS).toISOString();
    const taskDueSoon = buildTask({
      id: `${runPrefix}-duesoon`,
      dueAt: dueSoonIso,
      responsibleUserId: 'user-rh-69c6',
      status: 'PENDENTE'
    });
    const expectedDueSoonDedupKey = `notif:operational_task_due_soon:${taskDueSoon.id}:${dueSoonIso}`;

    (db as any).data.operationalTasks = [taskDueSoon];
    const createdDueSoon = db.processOperationalTaskDeadlines(nowMs);
    const storedDueSoon = db
      .getNotifications({ targetUserId: 'user-rh-69c6' })
      .filter(n => n.dedupKey === expectedDueSoonDedupKey);

    assert(
      createdDueSoon.length === 1 &&
        storedDueSoon.length === 1 &&
        storedDueSoon[0].category === 'PRAZOS' &&
        storedDueSoon[0].priority === 'high',
      '2. Execução com tarefa DUE_SOON',
      { createdCount: createdDueSoon.length, storedCount: storedDueSoon.length }
    );

    // 3. Execução repetida sem duplicação
    (db as any).data.operationalTasks = [taskOverdue, taskDueSoon];
    const createdRepeat = db.processOperationalTaskDeadlines(nowMs);
    const storedOverdueRepeat = db
      .getNotifications({ targetUserId: 'user-rh-69c6' })
      .filter(n => n.dedupKey === expectedOverdueDedupKey);
    const storedDueSoonRepeat = db
      .getNotifications({ targetUserId: 'user-rh-69c6' })
      .filter(n => n.dedupKey === expectedDueSoonDedupKey);

    assert(
      createdRepeat.length === 0 &&
        storedOverdueRepeat.length === 1 &&
        storedDueSoonRepeat.length === 1,
      '3. Execução repetida sem duplicação',
      {
        createdRepeatCount: createdRepeat.length,
        storedOverdueRepeatCount: storedOverdueRepeat.length,
        storedDueSoonRepeatCount: storedDueSoonRepeat.length
      }
    );

    // 4. Tarefa NORMAL sem notificação
    const taskNormal = buildTask({
      id: `${runPrefix}-normal`,
      dueAt: new Date(nowMs + 3 * DAY_MS).toISOString(),
      responsibleUserId: 'user-rh-69c6',
      status: 'PENDENTE'
    });
    (db as any).data.operationalTasks = [taskNormal];
    const createdNormal = db.processOperationalTaskDeadlines(nowMs);
    const storedNormal = (db as any).data.notifications.filter(
      (n: any) => n.dedupKey && n.dedupKey.includes(taskNormal.id)
    );

    assert(
      createdNormal.length === 0 && storedNormal.length === 0,
      '4. Tarefa NORMAL sem notificação',
      { createdNormalCount: createdNormal.length, storedNormalCount: storedNormal.length }
    );

    // 5. Tarefa sem responsável sem notificação
    const taskOverdueNoResp = buildTask({
      id: `${runPrefix}-overdue-noresp`,
      dueAt: new Date(nowMs - 4 * HOUR_MS).toISOString(),
      responsibleUserId: null,
      status: 'PENDENTE'
    });
    const taskDueSoonNoResp = buildTask({
      id: `${runPrefix}-duesoon-noresp`,
      dueAt: dueSoonIso,
      responsibleUserId: null,
      status: 'PENDENTE'
    });
    (db as any).data.operationalTasks = [taskOverdueNoResp, taskDueSoonNoResp];
    const createdNoResp = db.processOperationalTaskDeadlines(nowMs);
    const storedNoResp = (db as any).data.notifications.filter(
      (n: any) =>
        n.dedupKey &&
        (n.dedupKey.includes(taskOverdueNoResp.id) || n.dedupKey.includes(taskDueSoonNoResp.id))
    );

    assert(
      createdNoResp.length === 0 && storedNoResp.length === 0,
      '5. Tarefa sem responsável sem notificação',
      { createdNoRespCount: createdNoResp.length, storedNoRespCount: storedNoResp.length }
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

  console.log(`\nRESULTADO 6.9C.6: ${passed} PASSOU | ${failed} FALHOU (TOTAL: ${passed + failed})`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Erro nos testes 6.9C.6:', err);
  process.exit(1);
});
