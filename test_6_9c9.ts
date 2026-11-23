import express from 'express';
import { AddressInfo } from 'net';
import apiRouter from './server/routes.ts';
import { db } from './server/db.ts';
import { OperationalTask } from './src/types/index.ts';

async function runTests() {
  console.log('--- BLOCO 6.9C.9: TESTES DA ROTA DE EXECUÇÃO AUTOMÁTICA (CRON_SECRET) ---\n');
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
      id: 'task-test-69c9-base',
      admissionId: 'adm-test-69c9',
      admissionCode: 'ADM-69C9',
      employeeId: 'emp-test-69c9',
      employeeName: 'Colaborador Teste 6.9C.9',
      sourceType: 'DOCUMENTO',
      title: 'Validar pendências operacionais 6.9C.9',
      priority: 'NORMAL',
      status: 'PENDENTE',
      dueAt: new Date(nowMs - 4 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c9',
      responsibleUserName: 'Analista RH Teste 6.9C.9',
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
  const runPrefix = `task-test-69c9-${Date.now()}`;
  const validSecret = 'cron-secret-test-69c9-valid';

  try {
    const taskOverdue = buildTask({
      id: `${runPrefix}-overdue`,
      dueAt: new Date(nowMs - 4 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c9',
      status: 'PENDENTE'
    });

    const dueSoonIso = new Date(nowMs + 6 * HOUR_MS).toISOString();
    const taskDueSoon = buildTask({
      id: `${runPrefix}-duesoon`,
      dueAt: dueSoonIso,
      responsibleUserId: 'user-rh-69c9',
      status: 'PENDENTE'
    });

    (db as any).data.operationalTasks = [taskOverdue, taskDueSoon];

    // 1. Segredo correto -> execução permitida
    process.env.CRON_SECRET = validSecret;
    const resValid = await fetch(cronUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validSecret}`
      },
      body: JSON.stringify({ nowMs })
    });
    const bodyValid = await resValid.json();

    assert(
      resValid.status === 200 &&
        bodyValid.success === true &&
        bodyValid.notificationsGenerated === 2 &&
        Array.isArray(bodyValid.notifications) &&
        bodyValid.notifications.length === 2,
      '1. Segredo correto -> execução permitida',
      { status: resValid.status, bodyValid }
    );

    // 2. Segredo incorreto -> 401
    process.env.CRON_SECRET = validSecret;
    const resWrongSecret = await fetch(cronUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer segredo-incorreto-123'
      },
      body: JSON.stringify({ nowMs })
    });
    const bodyWrongSecret = await resWrongSecret.json();

    assert(
      resWrongSecret.status === 401 && !!bodyWrongSecret.error,
      '2. Segredo incorreto -> 401',
      { status: resWrongSecret.status, bodyWrongSecret }
    );

    // 3. Sem Authorization -> 401
    process.env.CRON_SECRET = validSecret;
    const resNoAuth = await fetch(cronUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nowMs })
    });
    const bodyNoAuth = await resNoAuth.json();

    assert(
      resNoAuth.status === 401 && !!bodyNoAuth.error,
      '3. Sem Authorization -> 401',
      { status: resNoAuth.status, bodyNoAuth }
    );

    // 4. CRON_SECRET inexistente -> 401
    delete process.env.CRON_SECRET;
    const resMissingEnv = await fetch(cronUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validSecret}`
      },
      body: JSON.stringify({ nowMs })
    });
    const bodyMissingEnv = await resMissingEnv.json();

    assert(
      resMissingEnv.status === 401 && !!bodyMissingEnv.error,
      '4. CRON_SECRET inexistente -> 401',
      { status: resMissingEnv.status, bodyMissingEnv }
    );

    // 5. Execução repetida -> permanece idempotente
    process.env.CRON_SECRET = validSecret;
    const resRepeat = await fetch(cronUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validSecret}`
      },
      body: JSON.stringify({ nowMs })
    });
    const bodyRepeat = await resRepeat.json();

    const expectedOverdueDedupKey = `notif:operational_task_overdue:${taskOverdue.id}`;
    const expectedDueSoonDedupKey = `notif:operational_task_due_soon:${taskDueSoon.id}:${dueSoonIso}`;
    const storedOverdue = db
      .getNotifications({ targetUserId: 'user-rh-69c9' })
      .filter(n => n.dedupKey === expectedOverdueDedupKey);
    const storedDueSoon = db
      .getNotifications({ targetUserId: 'user-rh-69c9' })
      .filter(n => n.dedupKey === expectedDueSoonDedupKey);

    assert(
      resRepeat.status === 200 &&
        bodyRepeat.success === true &&
        bodyRepeat.notificationsGenerated === 0 &&
        storedOverdue.length === 1 &&
        storedDueSoon.length === 1,
      '5. Execução repetida -> permanece idempotente',
      {
        status: resRepeat.status,
        notificationsGenerated: bodyRepeat.notificationsGenerated,
        storedOverdueCount: storedOverdue.length,
        storedDueSoonCount: storedDueSoon.length
      }
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
  console.log(`\nResultado Final: ${passed} aprovados, ${failed} falharam (Total: ${passed + failed})`);

  if (failed > 0 || !allIntact) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro inesperado na execução dos testes:', err);
  process.exit(1);
});
