import express from 'express';
import { AddressInfo } from 'net';
import apiRouter from './server/routes.ts';
import { db } from './server/db.ts';
import { OperationalTask } from './src/types/index.ts';

async function runTests() {
  console.log('--- BLOCO 6.9C.7: TESTES DA ROTA DE ADMINISTRAÇÃO DO RUNNER DE PRAZOS ---\n');
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
      id: 'task-test-69c7-base',
      admissionId: 'adm-test-69c7',
      admissionCode: 'ADM-69C7',
      employeeId: 'emp-test-69c7',
      employeeName: 'Colaborador Teste 6.9C.7',
      sourceType: 'DOCUMENTO',
      title: 'Validar pendências operacionais 6.9C.7',
      priority: 'NORMAL',
      status: 'PENDENTE',
      dueAt: new Date(nowMs - 4 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c7',
      responsibleUserName: 'Analista RH Teste 6.9C.7',
      createdBy: 'Sistema',
      createdAt: new Date(nowMs - DAY_MS).toISOString(),
      updatedAt: new Date(nowMs - DAY_MS).toISOString(),
      history: [],
      ...overrides
    };
  }

  // Inicializar servidor Express de teste em porta efêmera montando o router oficial
  const app = express();
  app.use(express.json());
  app.use(apiRouter);

  const server = await new Promise<ReturnType<typeof app.listen>>(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const port = (server.address() as AddressInfo).port;
  const endpointUrl = `http://127.0.0.1:${port}/api/admin/tasks/process-deadlines`;
  const runPrefix = `task-test-69c7-${Date.now()}`;

  try {
    const taskOverdue = buildTask({
      id: `${runPrefix}-overdue`,
      dueAt: new Date(nowMs - 4 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c7',
      status: 'PENDENTE'
    });

    const dueSoonIso = new Date(nowMs + 6 * HOUR_MS).toISOString();
    const taskDueSoon = buildTask({
      id: `${runPrefix}-duesoon`,
      dueAt: dueSoonIso,
      responsibleUserId: 'user-rh-69c7',
      status: 'PENDENTE'
    });

    // 1. ADMIN consegue executar
    (db as any).data.operationalTasks = [taskOverdue];
    const resAdmin = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'admin@empresa.com',
        'x-user-role': 'ADMIN'
      },
      body: JSON.stringify({ nowMs })
    });
    const bodyAdmin = await resAdmin.json();

    assert(
      resAdmin.status === 200 &&
        bodyAdmin.success === true &&
        bodyAdmin.notificationsGenerated === 1 &&
        Array.isArray(bodyAdmin.notifications) &&
        bodyAdmin.notifications.length === 1,
      '1. ADMIN consegue executar',
      { status: resAdmin.status, bodyAdmin }
    );

    // 2. RH consegue executar
    (db as any).data.operationalTasks = [taskDueSoon];
    const resRh = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'rh@empresa.com',
        'x-user-role': 'RH'
      },
      body: JSON.stringify({ nowMs })
    });
    const bodyRh = await resRh.json();

    assert(
      resRh.status === 200 &&
        bodyRh.success === true &&
        bodyRh.notificationsGenerated === 1 &&
        Array.isArray(bodyRh.notifications) &&
        bodyRh.notifications.length === 1,
      '2. RH consegue executar',
      { status: resRh.status, bodyRh }
    );

    // 3. GESTOR recebe 403
    const resGestor = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'gestor@empresa.com',
        'x-user-role': 'GESTOR'
      },
      body: JSON.stringify({ nowMs })
    });
    const bodyGestor = await resGestor.json();

    assert(
      resGestor.status === 403 && !!bodyGestor.error,
      '3. GESTOR recebe 403',
      { status: resGestor.status, bodyGestor }
    );

    // 4. FUNCIONARIO recebe 403
    const resFuncionario = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'funcionario@empresa.com',
        'x-user-role': 'FUNCIONARIO'
      },
      body: JSON.stringify({ nowMs })
    });
    const bodyFuncionario = await resFuncionario.json();

    assert(
      resFuncionario.status === 403 && !!bodyFuncionario.error,
      '4. FUNCIONARIO recebe 403',
      { status: resFuncionario.status, bodyFuncionario }
    );

    // 5. Execução repetida permanece idempotente
    (db as any).data.operationalTasks = [taskOverdue, taskDueSoon];
    const resRepeat = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'admin@empresa.com',
        'x-user-role': 'ADMIN'
      },
      body: JSON.stringify({ nowMs })
    });
    const bodyRepeat = await resRepeat.json();

    const expectedOverdueDedupKey = `notif:operational_task_overdue:${taskOverdue.id}`;
    const expectedDueSoonDedupKey = `notif:operational_task_due_soon:${taskDueSoon.id}:${dueSoonIso}`;
    const storedOverdue = db
      .getNotifications({ targetUserId: 'user-rh-69c7' })
      .filter(n => n.dedupKey === expectedOverdueDedupKey);
    const storedDueSoon = db
      .getNotifications({ targetUserId: 'user-rh-69c7' })
      .filter(n => n.dedupKey === expectedDueSoonDedupKey);

    assert(
      resRepeat.status === 200 &&
        bodyRepeat.success === true &&
        bodyRepeat.notificationsGenerated === 0 &&
        storedOverdue.length === 1 &&
        storedDueSoon.length === 1,
      '5. Execução repetida permanece idempotente',
      {
        status: resRepeat.status,
        notificationsGenerated: bodyRepeat.notificationsGenerated,
        storedOverdueCount: storedOverdue.length,
        storedDueSoonCount: storedDueSoon.length
      }
    );
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
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
