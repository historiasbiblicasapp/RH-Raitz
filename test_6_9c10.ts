import express from 'express';
import { AddressInfo } from 'net';
import apiRouter from './server/routes.ts';
import { db } from './server/db.ts';
import { OperationalTask } from './src/types/index.ts';

async function runTests() {
  console.log('--- BLOCO 6.9C.10: VALIDAÇÃO DE INTEGRAÇÃO COMPLETA (/api/cron/tasks/process-deadlines) ---\n');
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

  // Snapshot das tarefas, notificações e CRON_SECRET existentes antes dos testes
  const originalCronSecret = process.env.CRON_SECRET;
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
      id: 'task-test-69c10-base',
      admissionId: 'adm-test-69c10',
      admissionCode: 'ADM-69C10',
      employeeId: 'emp-test-69c10',
      employeeName: 'Colaborador Teste 6.9C.10',
      sourceType: 'DOCUMENTO',
      title: 'Validar pendências operacionais 6.9C.10',
      priority: 'NORMAL',
      status: 'PENDENTE',
      dueAt: new Date(nowMs - 4 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c10',
      responsibleUserName: 'Analista RH Teste 6.9C.10',
      createdBy: 'Sistema',
      createdAt: new Date(nowMs - DAY_MS).toISOString(),
      updatedAt: new Date(nowMs - DAY_MS).toISOString(),
      history: [],
      ...overrides
    };
  }

  const app = express();
  app.use(express.json());
  app.use(apiRouter);

  const server = await new Promise<ReturnType<typeof app.listen>>(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const port = (server.address() as AddressInfo).port;
  const cronUrl = `http://127.0.0.1:${port}/api/cron/tasks/process-deadlines`;
  const runPrefix = `task-test-69c10-${Date.now()}`;
  const validSecret = 'cron-secret-test-69c10-valid';

  async function callCronEndpoint() {
    const res = await fetch(cronUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validSecret}`
      },
      body: JSON.stringify({ nowMs })
    });
    const body = await res.json();
    return { status: res.status, body };
  }

  try {
    process.env.CRON_SECRET = validSecret;

    // 1. Tarefa OVERDUE com responsável -> gera a notificação esperada (urgent, PRAZOS, operational_task_overdue)
    const overdueIso = new Date(nowMs - 5 * HOUR_MS).toISOString();
    const taskOverdue = buildTask({
      id: `${runPrefix}-overdue`,
      admissionId: 'adm-overdue-69c10',
      dueAt: overdueIso,
      responsibleUserId: 'user-rh-69c10-overdue',
      status: 'PENDENTE'
    });
    const expectedOverdueDedupKey = `notif:operational_task_overdue:${taskOverdue.id}`;

    (db as any).data.operationalTasks = [taskOverdue];
    const overdueRun = await callCronEndpoint();
    const storedOverdue = db
      .getNotifications({ targetUserId: 'user-rh-69c10-overdue' })
      .filter(n => n.dedupKey === expectedOverdueDedupKey);

    assert(
      overdueRun.status === 200 &&
        overdueRun.body.success === true &&
        overdueRun.body.notificationsGenerated === 1 &&
        storedOverdue.length === 1 &&
        storedOverdue[0].category === 'PRAZOS' &&
        storedOverdue[0].priority === 'urgent' &&
        storedOverdue[0].sourceEvent === 'operational_task_overdue' &&
        storedOverdue[0].admissionId === 'adm-overdue-69c10',
      '1. Tarefa OVERDUE com responsável gera a notificação esperada via /api/cron/tasks/process-deadlines',
      { overdueRun, storedOverdue }
    );

    // 2. Tarefa DUE_SOON com responsável -> gera a notificação esperada (high, PRAZOS, operational_task_due_soon)
    const dueSoonIso = new Date(nowMs + 6 * HOUR_MS).toISOString();
    const taskDueSoon = buildTask({
      id: `${runPrefix}-duesoon`,
      admissionId: 'adm-duesoon-69c10',
      dueAt: dueSoonIso,
      responsibleUserId: 'user-rh-69c10-duesoon',
      status: 'PENDENTE'
    });
    const expectedDueSoonDedupKey = `notif:operational_task_due_soon:${taskDueSoon.id}:${dueSoonIso}`;

    (db as any).data.operationalTasks = [taskDueSoon];
    const dueSoonRun = await callCronEndpoint();
    const storedDueSoon = db
      .getNotifications({ targetUserId: 'user-rh-69c10-duesoon' })
      .filter(n => n.dedupKey === expectedDueSoonDedupKey);

    assert(
      dueSoonRun.status === 200 &&
        dueSoonRun.body.success === true &&
        dueSoonRun.body.notificationsGenerated === 1 &&
        storedDueSoon.length === 1 &&
        storedDueSoon[0].category === 'PRAZOS' &&
        storedDueSoon[0].priority === 'high' &&
        storedDueSoon[0].sourceEvent === 'operational_task_due_soon' &&
        storedDueSoon[0].admissionId === 'adm-duesoon-69c10',
      '2. Tarefa DUE_SOON com responsável gera a notificação esperada via /api/cron/tasks/process-deadlines',
      { dueSoonRun, storedDueSoon }
    );

    // 3. Executar o endpoint duas vezes com OVERDUE e DUE_SOON e confirmar idempotência
    const taskOverdueIdemp = buildTask({
      id: `${runPrefix}-overdue-idemp`,
      dueAt: overdueIso,
      responsibleUserId: 'user-rh-69c10-idemp',
      status: 'PENDENTE'
    });
    const taskDueSoonIdemp = buildTask({
      id: `${runPrefix}-duesoon-idemp`,
      dueAt: dueSoonIso,
      responsibleUserId: 'user-rh-69c10-idemp',
      status: 'PENDENTE'
    });
    const expectedOverdueIdempKey = `notif:operational_task_overdue:${taskOverdueIdemp.id}`;
    const expectedDueSoonIdempKey = `notif:operational_task_due_soon:${taskDueSoonIdemp.id}:${dueSoonIso}`;

    (db as any).data.operationalTasks = [taskOverdueIdemp, taskDueSoonIdemp];
    const firstExec = await callCronEndpoint();
    const secondExec = await callCronEndpoint();

    const storedOverdueIdemp = db
      .getNotifications({ targetUserId: 'user-rh-69c10-idemp' })
      .filter(n => n.dedupKey === expectedOverdueIdempKey);
    const storedDueSoonIdemp = db
      .getNotifications({ targetUserId: 'user-rh-69c10-idemp' })
      .filter(n => n.dedupKey === expectedDueSoonIdempKey);

    assert(
      firstExec.status === 200 &&
        firstExec.body.notificationsGenerated === 2 &&
        secondExec.status === 200 &&
        secondExec.body.notificationsGenerated === 0 &&
        storedOverdueIdemp.length === 1 &&
        storedDueSoonIdemp.length === 1,
      '3. Executar o endpoint duas vezes confirma idempotência (1ª = 2 notificações, 2ª = 0 duplicadas)',
      {
        firstGenerated: firstExec.body.notificationsGenerated,
        secondGenerated: secondExec.body.notificationsGenerated,
        storedOverdueCount: storedOverdueIdemp.length,
        storedDueSoonCount: storedDueSoonIdemp.length
      }
    );

    // 4. Confirmar que tarefa NORMAL não gera notificação
    const taskNormal = buildTask({
      id: `${runPrefix}-normal`,
      dueAt: new Date(nowMs + 4 * DAY_MS).toISOString(),
      responsibleUserId: 'user-rh-69c10-normal',
      status: 'PENDENTE'
    });
    (db as any).data.operationalTasks = [taskNormal];
    const normalRun = await callCronEndpoint();
    const storedNormal = (db as any).data.notifications.filter(
      (n: any) => n.dedupKey && n.dedupKey.includes(taskNormal.id)
    );

    assert(
      normalRun.status === 200 &&
        normalRun.body.notificationsGenerated === 0 &&
        storedNormal.length === 0,
      '4. Tarefa NORMAL não gera notificação',
      { normalRun, storedNormalCount: storedNormal.length }
    );

    // 5. Confirmar que tarefas sem responsável ou sem dueAt não geram notificações
    const taskOverdueNoResp = buildTask({
      id: `${runPrefix}-overdue-noresp`,
      dueAt: overdueIso,
      responsibleUserId: null,
      status: 'PENDENTE'
    });
    const taskDueSoonNoResp = buildTask({
      id: `${runPrefix}-duesoon-noresp`,
      dueAt: dueSoonIso,
      responsibleUserId: null,
      status: 'PENDENTE'
    });
    const taskNoDueAt = buildTask({
      id: `${runPrefix}-no-dueat`,
      dueAt: null,
      responsibleUserId: 'user-rh-69c10-nodueat',
      status: 'PENDENTE'
    });

    (db as any).data.operationalTasks = [taskOverdueNoResp, taskDueSoonNoResp, taskNoDueAt];
    const ignoredRun = await callCronEndpoint();
    const storedIgnored = (db as any).data.notifications.filter(
      (n: any) =>
        n.dedupKey &&
        (n.dedupKey.includes(taskOverdueNoResp.id) ||
          n.dedupKey.includes(taskDueSoonNoResp.id) ||
          n.dedupKey.includes(taskNoDueAt.id))
    );

    assert(
      ignoredRun.status === 200 &&
        ignoredRun.body.notificationsGenerated === 0 &&
        storedIgnored.length === 0,
      '5. Tarefas sem responsável ou sem dueAt não geram notificações',
      { ignoredRun, storedIgnoredCount: storedIgnored.length }
    );
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
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

  console.log(`\nIntegridade das tarefas existentes no banco: ${allIntact ? 'PRESERVADA' : 'FALHOU'}`);
  console.log(`\nResultado Final 6.9C.10: ${passed} aprovados, ${failed} falharam (Total: ${passed + failed})`);

  if (failed > 0 || !allIntact) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro inesperado na execução dos testes 6.9C.10:', err);
  process.exit(1);
});
