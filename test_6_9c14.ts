import express from 'express';
import { AddressInfo } from 'net';
import apiRouter from './server/routes.ts';
import { db } from './server/db.ts';
import { OperationalTask } from './src/types/index.ts';

async function runTests() {
  console.log('--- BLOCO 6.9C.14: VALIDAÇÃO INTEGRADA FINAL DO CICLO DE PRAZOS ---\n');
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

  // Snapshot completo do estado inicial para preservação estrita
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
  const originalAuditLogsSnapshot = [...((db as any).data.auditLogs || [])];

  function buildTask(overrides: Partial<OperationalTask>): OperationalTask {
    return {
      id: 'task-test-69c14-base',
      admissionId: 'adm-test-69c14',
      admissionCode: 'ADM-69C14',
      employeeId: 'emp-test-69c14',
      employeeName: 'Colaborador Teste 6.9C.14',
      sourceType: 'DOCUMENTO',
      title: 'Validar ciclo integrado de prazos 6.9C.14',
      priority: 'NORMAL',
      status: 'PENDENTE',
      dueAt: new Date(nowMs - 4 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c14',
      responsibleUserName: 'Analista RH Teste 6.9C.14',
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
  const adminUrl = `http://127.0.0.1:${port}/api/tasks/process-deadlines`;
  const runPrefix = `task-test-69c14-${Date.now()}`;
  const validSecret = 'cron-secret-test-69c14-valid';

  try {
    process.env.CRON_SECRET = validSecret;

    const dueSoonIso = new Date(nowMs + 6 * HOUR_MS).toISOString();
    const taskOverdue = buildTask({
      id: `${runPrefix}-overdue`,
      dueAt: new Date(nowMs - 4 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c14',
      status: 'PENDENTE'
    });
    const taskDueSoon = buildTask({
      id: `${runPrefix}-duesoon`,
      dueAt: dueSoonIso,
      responsibleUserId: 'user-rh-69c14',
      status: 'PENDENTE'
    });
    const taskNormal = buildTask({
      id: `${runPrefix}-normal`,
      dueAt: new Date(nowMs + 48 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c14',
      status: 'PENDENTE'
    });
    const taskNoDueAt = buildTask({
      id: `${runPrefix}-nodueat`,
      dueAt: null,
      responsibleUserId: 'user-rh-69c14',
      status: 'PENDENTE'
    });
    const taskNoResponsible = buildTask({
      id: `${runPrefix}-noresp`,
      dueAt: new Date(nowMs - 2 * HOUR_MS).toISOString(),
      responsibleUserId: null,
      responsibleUserName: undefined,
      status: 'PENDENTE'
    });

    (db as any).data.operationalTasks = [
      taskOverdue,
      taskDueSoon,
      taskNormal,
      taskNoDueAt,
      taskNoResponsible
    ];

    // 8. Segurança do CRON_SECRET antes do processamento
    const resNoHeader = await fetch(`${cronUrl}?nowMs=${nowMs}`, { method: 'GET' });
    const resWrongSecret = await fetch(`${cronUrl}?nowMs=${nowMs}`, {
      method: 'GET',
      headers: { Authorization: 'Bearer wrong-secret' }
    });

    assert(
      resNoHeader.status === 401 && resWrongSecret.status === 401,
      '8. Segurança do CRON_SECRET bloqueia chamadas sem token ou com token inválido (401)',
      { noHeaderStatus: resNoHeader.status, wrongSecretStatus: resWrongSecret.status }
    );

    // Execução válida do endpoint Cron processando as 5 tarefas
    const resCron1 = await fetch(`${cronUrl}?nowMs=${nowMs}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${validSecret}` }
    });
    const bodyCron1 = await resCron1.json();

    const expectedOverdueDedupKey = `notif:operational_task_overdue:${taskOverdue.id}`;
    const expectedDueSoonDedupKey = `notif:operational_task_due_soon:${taskDueSoon.id}:${dueSoonIso}`;

    const allUserNotifs = db.getNotifications({ targetUserId: 'user-rh-69c14' });
    const overdueNotifs = allUserNotifs.filter(n => n.dedupKey === expectedOverdueDedupKey);
    const dueSoonNotifs = allUserNotifs.filter(n => n.dedupKey === expectedDueSoonDedupKey);
    const normalNotifs = (db as any).data.notifications.filter((n: any) =>
      n.dedupKey?.includes(taskNormal.id)
    );
    const noDueAtNotifs = (db as any).data.notifications.filter((n: any) =>
      n.dedupKey?.includes(taskNoDueAt.id)
    );
    const noRespNotifs = (db as any).data.notifications.filter((n: any) =>
      n.dedupKey?.includes(taskNoResponsible.id)
    );

    // 1. Tarefa OVERDUE -> processamento -> notificação
    assert(
      resCron1.status === 200 &&
        overdueNotifs.length === 1 &&
        overdueNotifs[0].sourceEvent === 'operational_task_overdue' &&
        overdueNotifs[0].targetUserId === 'user-rh-69c14',
      '1. Tarefa OVERDUE processada gera notificação correspondente ao responsável',
      { overdueNotifs }
    );

    // 2. Tarefa DUE_SOON -> processamento -> notificação
    assert(
      resCron1.status === 200 &&
        dueSoonNotifs.length === 1 &&
        dueSoonNotifs[0].sourceEvent === 'operational_task_due_soon' &&
        dueSoonNotifs[0].targetUserId === 'user-rh-69c14',
      '2. Tarefa DUE_SOON processada gera notificação correspondente ao responsável',
      { dueSoonNotifs }
    );

    // 3. Tarefa NORMAL -> nenhuma notificação
    assert(
      normalNotifs.length === 0,
      '3. Tarefa NORMAL (prazo > 24h) não gera nenhuma notificação',
      { normalNotifs }
    );

    // 4. Tarefa sem dueAt -> nenhuma notificação
    assert(
      noDueAtNotifs.length === 0,
      '4. Tarefa sem dueAt não gera nenhuma notificação',
      { noDueAtNotifs }
    );

    // 5. Tarefa sem responsável -> nenhuma notificação
    assert(
      noRespNotifs.length === 0,
      '5. Tarefa sem responsável não gera nenhuma notificação',
      { noRespNotifs }
    );

    // 6. Executar o endpoint Cron repetidamente -> nenhuma duplicação
    const resCron2 = await fetch(`${cronUrl}?nowMs=${nowMs}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${validSecret}` }
    });
    const bodyCron2 = await resCron2.json();

    const resCron3 = await fetch(cronUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validSecret}`
      },
      body: JSON.stringify({ nowMs })
    });
    const bodyCron3 = await resCron3.json();

    const overdueAfterRepeat = db
      .getNotifications({ targetUserId: 'user-rh-69c14' })
      .filter(n => n.dedupKey === expectedOverdueDedupKey);
    const dueSoonAfterRepeat = db
      .getNotifications({ targetUserId: 'user-rh-69c14' })
      .filter(n => n.dedupKey === expectedDueSoonDedupKey);

    assert(
      resCron2.status === 200 &&
        bodyCron2.notificationsGenerated === 0 &&
        resCron3.status === 200 &&
        bodyCron3.notificationsGenerated === 0 &&
        overdueAfterRepeat.length === 1 &&
        dueSoonAfterRepeat.length === 1,
      '6. Execução repetida do endpoint Cron (GET e POST) não duplica notificações',
      {
        cron2Generated: bodyCron2.notificationsGenerated,
        cron3Generated: bodyCron3.notificationsGenerated,
        overdueCount: overdueAfterRepeat.length,
        dueSoonCount: dueSoonAfterRepeat.length
      }
    );

    // 7. Confirmar que a rota administrativa do 6.9C.7 continua funcionando
    const taskAdminOverdue = buildTask({
      id: `${runPrefix}-admin-overdue`,
      dueAt: new Date(nowMs - 3 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c14',
      status: 'PENDENTE'
    });
    (db as any).data.operationalTasks.push(taskAdminOverdue);

    const resAdminForbidden = await fetch(adminUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'FUNCIONARIO',
        'x-user-id': 'emp-test-69c14'
      },
      body: JSON.stringify({ nowMs })
    });

    const resAdminOk = await fetch(adminUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'ADMIN',
        'x-user-id': 'user-admin-01'
      },
      body: JSON.stringify({ nowMs })
    });
    const bodyAdminOk = await resAdminOk.json();

    assert(
      resAdminForbidden.status === 403 &&
        resAdminOk.status === 200 &&
        bodyAdminOk.success === true &&
        bodyAdminOk.notificationsGenerated === 1 &&
        bodyAdminOk.notifications[0]?.dedupKey ===
          `notif:operational_task_overdue:${taskAdminOverdue.id}`,
      '7. Rota administrativa POST /api/tasks/process-deadlines (6.9C.7) continua funcional e protegida por perfil',
      {
        forbiddenStatus: resAdminForbidden.status,
        okStatus: resAdminOk.status,
        bodyAdminOk
      }
    );
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
    // Restaurar estado original do banco
    (db as any).data.operationalTasks = originalTasksRef;
    (db as any).data.notifications = originalNotificationsSnapshot;
    (db as any).data.auditLogs = originalAuditLogsSnapshot;
    (db as any).save();
  }

  // 9. Confirmar que nenhuma tarefa existente foi modificada indevidamente
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

  assert(
    allIntact,
    '9. Nenhuma tarefa existente no banco foi modificada indevidamente'
  );

  console.log(`\nIntegridade das tarefas existentes no banco: ${allIntact ? 'PRESERVADA' : 'FALHOU'}`);
  console.log(`\nResultado Final: ${passed} aprovados, ${failed} falharam (Total: ${passed + failed})`);

  if (failed > 0 || !allIntact) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro inesperado na execução dos testes:', err);
  process.exit(1);
});
