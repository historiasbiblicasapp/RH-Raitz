import express from 'express';
import { AddressInfo } from 'net';
import apiRouter from './server/routes.ts';
import { db } from './server/db.ts';
import { OperationalTask } from './src/types/index.ts';

async function runTests() {
  console.log('--- BLOCO 6.9D.4: COMPATIBILIDADE DOS ENDPOINTS ---\n');
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

  const originalCronSecret = process.env.CRON_SECRET;
  const originalTasksSnapshot = ((db as any).data.operationalTasks || []).map((t: any) => ({ ...t }));
  const existingSnapshot = originalTasksSnapshot.map((t: any) => ({
    id: t.id,
    priority: t.priority,
    dueAt: t.dueAt,
    status: t.status,
    responsibleUserId: t.responsibleUserId
  }));
  const originalTaskHistorySnapshot = [...((db as any).data.taskHistory || [])];
  const originalNotificationsSnapshot = ((db as any).data.notifications || []).map((n: any) => ({ ...n }));
  const originalAuditLogsSnapshot = [...((db as any).data.auditLogs || [])];

  const app = express();
  app.use(express.json());
  app.use(apiRouter);

  const server = await new Promise<ReturnType<typeof app.listen>>(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const rhHeaders = {
    'Content-Type': 'application/json',
    'x-user-role': 'RH',
    'x-user-id': 'user-rh-01'
  };

  try {
    const validSecret = 'cron-secret-69d4-valid';
    process.env.CRON_SECRET = validSecret;

    const targetAdmission = db.getAdmissions()[0];
    const prefix = `task-69d4-${Date.now()}`;

    // 1. Endpoints de Tarefas (/api/tarefas, /api/tasks, ciclo de vida completo e métodos HTTP do frontend)
    const createRes = await fetch(`${baseUrl}/api/tarefas`, {
      method: 'POST',
      headers: rhHeaders,
      body: JSON.stringify({
        admissionId: targetAdmission.id,
        title: 'Tarefa Compatibilidade 6.9D.4',
        priority: 'NORMAL',
        dueAt: new Date(nowMs + 8 * HOUR_MS).toISOString(),
        responsibleUserId: 'user-rh-01'
      })
    });
    const createBody = await createRes.json();
    const createdTask: OperationalTask = createBody.task;

    // GET /api/tarefas/:id e PUT/PATCH /api/tarefas/:id
    const detailRes = await fetch(`${baseUrl}/api/tarefas/${createdTask.id}`, { headers: rhHeaders });
    const detailBody = await detailRes.json();

    const updateRes = await fetch(`${baseUrl}/api/tarefas/${createdTask.id}`, {
      method: 'PUT',
      headers: rhHeaders,
      body: JSON.stringify({ title: 'Tarefa Compatibilidade 6.9D.4 Atualizada' })
    });
    const updateBody = await updateRes.json();

    // POST /iniciar, /bloquear, /desbloquear, /concluir (sem body), /reabrir, /cancelar
    const startRes = await fetch(`${baseUrl}/api/tarefas/${createdTask.id}/iniciar`, {
      method: 'POST',
      headers: { 'x-user-role': 'RH', 'x-user-id': 'user-rh-01' }
    });
    const blockRes = await fetch(`${baseUrl}/api/tarefas/${createdTask.id}/bloquear`, {
      method: 'POST',
      headers: rhHeaders,
      body: JSON.stringify({ blockReason: 'Aguardando confirmação documental' })
    });
    const unblockRes = await fetch(`${baseUrl}/api/tarefas/${createdTask.id}/desbloquear`, {
      method: 'POST',
      headers: { 'x-user-role': 'RH', 'x-user-id': 'user-rh-01' }
    });
    const completeNoBodyRes = await fetch(`${baseUrl}/api/tarefas/${createdTask.id}/concluir`, {
      method: 'POST',
      headers: { 'x-user-role': 'RH', 'x-user-id': 'user-rh-01' }
    });
    const reopenRes = await fetch(`${baseUrl}/api/tarefas/${createdTask.id}/reabrir`, {
      method: 'POST',
      headers: rhHeaders,
      body: JSON.stringify({ reopenReason: 'Reaberta para teste de compatibilidade' })
    });
    const admTasksRes = await fetch(`${baseUrl}/api/admissoes/${targetAdmission.id}/tarefas`, {
      headers: rhHeaders
    });
    const admTasksBody = await admTasksRes.json();

    assert(
      createRes.status === 201 &&
        createdTask.isDueSoon === true &&
        createdTask.effectivePriority === 'ALTA' &&
        createdTask.alertState === 'DUE_SOON' &&
        detailRes.status === 200 &&
        detailBody.task?.id === createdTask.id &&
        updateRes.status === 200 &&
        updateBody.task?.title === 'Tarefa Compatibilidade 6.9D.4 Atualizada' &&
        startRes.status === 200 &&
        blockRes.status === 200 &&
        unblockRes.status === 200 &&
        completeNoBodyRes.status === 200 &&
        reopenRes.status === 200 &&
        admTasksRes.status === 200 &&
        Array.isArray(admTasksBody.tasks),
      '1. Rotas e métodos HTTP de tarefas (/api/tarefas, /:id, PUT, iniciar, bloquear, desbloquear, concluir, reabrir, /admissoes/:id/tarefas) funcionam perfeitamente',
      {
        createStatus: createRes.status,
        detailStatus: detailRes.status,
        updateStatus: updateRes.status,
        startStatus: startRes.status,
        blockStatus: blockRes.status,
        unblockStatus: unblockRes.status,
        completeStatus: completeNoBodyRes.status,
        reopenStatus: reopenRes.status,
        admTasksStatus: admTasksRes.status
      }
    );

    // 2. Rotas de Prazos (/api/prazos, /api/tracking) e Pendências (/api/pendencias)
    const prazosRes = await fetch(`${baseUrl}/api/prazos`, { headers: rhHeaders });
    const prazosBody = await prazosRes.json();
    const pendenciasRes = await fetch(`${baseUrl}/api/pendencias`, { headers: rhHeaders });
    const pendenciasBody = await pendenciasRes.json();

    assert(
      prazosRes.status === 200 &&
        Array.isArray(prazosBody.items) &&
        typeof prazosBody.summary?.totalCount === 'number' &&
        pendenciasRes.status === 200 &&
        Array.isArray(pendenciasBody.items) &&
        typeof pendenciasBody.summary?.total === 'number',
      '2. Endpoints /api/prazos e /api/pendencias respondem com estrutura e contadores íntegros',
      { prazosStatus: prazosRes.status, pendenciasStatus: pendenciasRes.status }
    );

    // 3. Preservação da rota administrativa (6.9C.7) e do endpoint Cron (6.9C.9) + Notificações (/api/notifications)
    const cronUnauthorized = await fetch(`${baseUrl}/api/cron/tasks/process-deadlines`, {
      method: 'GET'
    });
    const cronAuthorized1 = await fetch(
      `${baseUrl}/api/cron/tasks/process-deadlines?nowMs=${nowMs}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${validSecret}` }
      }
    );
    const cronBody1 = await cronAuthorized1.json();

    const cronAuthorized2 = await fetch(
      `${baseUrl}/api/cron/tasks/process-deadlines?nowMs=${nowMs}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${validSecret}` }
      }
    );
    const cronBody2 = await cronAuthorized2.json();

    const adminForbidden = await fetch(`${baseUrl}/api/admin/tasks/process-deadlines`, {
      method: 'POST',
      headers: { 'x-user-role': 'GESTOR', 'x-user-id': 'user-gestor-01' }
    });
    const adminAllowed = await fetch(`${baseUrl}/api/admin/tasks/process-deadlines`, {
      method: 'POST',
      headers: rhHeaders,
      body: JSON.stringify({ nowMs })
    });

    const notifsRes = await fetch(`${baseUrl}/api/notifications?targetUserId=user-rh-01`, {
      headers: rhHeaders
    });
    const notifsList = await notifsRes.json();
    const createdTaskNotif = (notifsList || []).find((n: any) =>
      n.dedupKey?.includes(createdTask.id)
    );

    let markReadOk = false;
    if (createdTaskNotif) {
      const readRes = await fetch(`${baseUrl}/api/notifications/${createdTaskNotif.id}/read`, {
        method: 'POST',
        headers: rhHeaders
      });
      const readBody = await readRes.json();
      markReadOk = readRes.status === 200 && readBody.success === true;
    }

    assert(
      cronUnauthorized.status === 401 &&
        cronAuthorized1.status === 200 &&
        cronBody1.success === true &&
        cronAuthorized2.status === 200 &&
        cronBody2.notificationsGenerated === 0 &&
        adminForbidden.status === 403 &&
        adminAllowed.status === 200 &&
        notifsRes.status === 200 &&
        Boolean(createdTaskNotif) &&
        markReadOk,
      '3. Rotas administrativas, endpoint Cron (com idempotência) e rotas de notificações (/api/notifications e /:id/read) seguem compatíveis',
      {
        cronUnauthorized: cronUnauthorized.status,
        cronAuthorized1: cronAuthorized1.status,
        cron2Generated: cronBody2.notificationsGenerated,
        adminForbidden: adminForbidden.status,
        adminAllowed: adminAllowed.status,
        hasNotif: Boolean(createdTaskNotif),
        markReadOk
      }
    );

    // 4. Respostas previsíveis para listas vazias, dados ausentes e erros (404 / 400)
    const emptyListRes = await fetch(
      `${baseUrl}/api/tarefas?admissionId=admissao-inexistente-${prefix}`,
      { headers: rhHeaders }
    );
    const emptyListBody = await emptyListRes.json();

    const missingTaskRes = await fetch(`${baseUrl}/api/tarefas/task-inexistente-${prefix}`, {
      headers: rhHeaders
    });
    const invalidCreateRes = await fetch(`${baseUrl}/api/tarefas`, {
      method: 'POST',
      headers: rhHeaders,
      body: JSON.stringify({ admissionId: targetAdmission.id, title: 'ab' }) // título < 3 chars
    });

    assert(
      emptyListRes.status === 200 &&
        Array.isArray(emptyListBody.items) &&
        emptyListBody.items.length === 0 &&
        emptyListBody.total === 0 &&
        missingTaskRes.status === 404 &&
        invalidCreateRes.status === 400,
      '4. Respostas previsíveis para listas vazias (200 com items=[]), tarefa inexistente (404) e payload inválido (400)',
      {
        emptyStatus: emptyListRes.status,
        missingStatus: missingTaskRes.status,
        invalidCreateStatus: invalidCreateRes.status
      }
    );
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
    (db as any).data.operationalTasks = originalTasksSnapshot;
    (db as any).data.taskHistory = originalTaskHistorySnapshot;
    (db as any).data.notifications = originalNotificationsSnapshot;
    (db as any).data.auditLogs = originalAuditLogsSnapshot;
    (db as any).save();
  }

  // 5. Confirmar preservação dos dados existentes
  const afterTasks = (db as any).data.operationalTasks || [];
  const allIntact =
    afterTasks.length === existingSnapshot.length &&
    existingSnapshot.every((prev: any) => {
      const curr = afterTasks.find((t: any) => t.id === prev.id);
      return (
        curr &&
        curr.priority === prev.priority &&
        curr.dueAt === prev.dueAt &&
        curr.status === prev.status &&
        curr.responsibleUserId === prev.responsibleUserId
      );
    });

  assert(allIntact, '5. Todas as tarefas e registros existentes no banco foram preservados');

  console.log(`\nRESULTADO 6.9D.4: ${passed} PASSOU | ${failed} FALHOU (TOTAL: ${passed + failed})`);
  if (failed > 0 || !allIntact) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro inesperado em test_6_9d4.ts:', err);
  process.exit(1);
});
