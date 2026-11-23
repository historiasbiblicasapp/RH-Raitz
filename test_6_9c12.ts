import express from 'express';
import { AddressInfo } from 'net';
import apiRouter from './server/routes.ts';
import { db } from './server/db.ts';
import { OperationalTask } from './src/types/index.ts';

async function runTests() {
  console.log('--- BLOCO 6.9C.12: VALIDAÇÃO FINAL DA SEGURANÇA DO ENDPOINT CRON E ROTA ADMINISTRATIVA ---\n');
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
      id: 'task-test-69c12-base',
      admissionId: 'adm-test-69c12',
      admissionCode: 'ADM-69C12',
      employeeId: 'emp-test-69c12',
      employeeName: 'Colaborador Teste 6.9C.12',
      sourceType: 'DOCUMENTO',
      title: 'Validar pendências operacionais 6.9C.12',
      priority: 'NORMAL',
      status: 'PENDENTE',
      dueAt: new Date(nowMs - 4 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c12',
      responsibleUserName: 'Analista RH Teste 6.9C.12',
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
  const adminUrl = `http://127.0.0.1:${port}/api/admin/tasks/process-deadlines`;
  const runPrefix = `task-test-69c12-${Date.now()}`;
  const validSecret = 'cron-secret-test-69c12-valid';

  try {
    process.env.CRON_SECRET = validSecret;

    const taskCron = buildTask({
      id: `${runPrefix}-cron-overdue`,
      dueAt: new Date(nowMs - 4 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c12',
      status: 'PENDENTE'
    });

    const taskAdmin = buildTask({
      id: `${runPrefix}-admin-overdue`,
      dueAt: new Date(nowMs - 5 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c12',
      status: 'PENDENTE'
    });

    const taskRh = buildTask({
      id: `${runPrefix}-rh-duesoon`,
      dueAt: new Date(nowMs + 6 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c12',
      status: 'PENDENTE'
    });

    // 1. Validar Authorization: Bearer <CRON_SECRET> no endpoint Cron
    (db as any).data.operationalTasks = [taskCron];
    const resCronValid = await fetch(`${cronUrl}?nowMs=${nowMs}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${validSecret}`
      }
    });
    const bodyCronValid = await resCronValid.json();

    assert(
      resCronValid.status === 200 &&
        bodyCronValid.success === true &&
        bodyCronValid.notificationsGenerated === 1,
      '1. Endpoint Cron aceita Authorization: Bearer <CRON_SECRET> válido (200)',
      { status: resCronValid.status, bodyCronValid }
    );

    // 2. Confirmar 401 para segredo incorreto no endpoint Cron
    const resCronWrong = await fetch(cronUrl, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer segredo-invalido-69c12'
      }
    });
    const bodyCronWrong = await resCronWrong.json();

    assert(
      resCronWrong.status === 401 && !!bodyCronWrong.error,
      '2. Endpoint Cron retorna 401 para segredo incorreto',
      { status: resCronWrong.status, bodyCronWrong }
    );

    // 3. Confirmar 401 sem Authorization no endpoint Cron
    const resCronNoAuth = await fetch(cronUrl, {
      method: 'GET'
    });
    const bodyCronNoAuth = await resCronNoAuth.json();

    assert(
      resCronNoAuth.status === 401 && !!bodyCronNoAuth.error,
      '3. Endpoint Cron retorna 401 sem header Authorization',
      { status: resCronNoAuth.status, bodyCronNoAuth }
    );

    // 4. Confirmar que ADMIN e RH continuam usando a rota administrativa do 6.9C.7 normalmente
    (db as any).data.operationalTasks = [taskAdmin];
    const resAdmin = await fetch(adminUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'admin@empresa.com',
        'x-user-role': 'ADMIN'
      },
      body: JSON.stringify({ nowMs })
    });
    const bodyAdmin = await resAdmin.json();

    (db as any).data.operationalTasks = [taskRh];
    const resRh = await fetch(adminUrl, {
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
      resAdmin.status === 200 &&
        bodyAdmin.success === true &&
        bodyAdmin.notificationsGenerated === 1 &&
        resRh.status === 200 &&
        bodyRh.success === true &&
        bodyRh.notificationsGenerated === 1,
      '4. ADMIN e RH continuam usando a rota administrativa (/api/admin/tasks/process-deadlines) normalmente (200)',
      {
        adminStatus: resAdmin.status,
        adminGenerated: bodyAdmin.notificationsGenerated,
        rhStatus: resRh.status,
        rhGenerated: bodyRh.notificationsGenerated
      }
    );

    // 5. Confirmar que GESTOR e FUNCIONARIO continuam recebendo 403 na rota administrativa
    const resGestor = await fetch(adminUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'gestor@empresa.com',
        'x-user-role': 'GESTOR'
      },
      body: JSON.stringify({ nowMs })
    });
    const bodyGestor = await resGestor.json();

    const resFuncionario = await fetch(adminUrl, {
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
      resGestor.status === 403 &&
        !!bodyGestor.error &&
        resFuncionario.status === 403 &&
        !!bodyFuncionario.error,
      '5. GESTOR e FUNCIONARIO continuam recebendo 403 na rota administrativa',
      {
        gestorStatus: resGestor.status,
        funcionarioStatus: resFuncionario.status
      }
    );

    // 6. Confirmar que o endpoint Cron NÃO aceita autenticação por perfil de usuário (mesmo ADMIN ou RH)
    const resCronWithAdminRoleGet = await fetch(cronUrl, {
      method: 'GET',
      headers: {
        'x-user-email': 'admin@empresa.com',
        'x-user-role': 'ADMIN'
      }
    });
    const resCronWithRhRolePost = await fetch(cronUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'rh@empresa.com',
        'x-user-role': 'RH'
      },
      body: JSON.stringify({ nowMs })
    });

    assert(
      resCronWithAdminRoleGet.status === 401 && resCronWithRhRolePost.status === 401,
      '6. Endpoint Cron rejeita (401) autenticação por perfil de usuário (ADMIN/RH sem Bearer CRON_SECRET)',
      {
        cronAdminRoleGetStatus: resCronWithAdminRoleGet.status,
        cronRhRolePostStatus: resCronWithRhRolePost.status
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
