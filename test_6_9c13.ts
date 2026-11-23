import express from 'express';
import { AddressInfo } from 'net';
import apiRouter from './server/routes.ts';
import { db } from './server/db.ts';
import { OperationalTask } from './src/types/index.ts';

async function runTests() {
  console.log('--- BLOCO 6.9C.13: TESTES DO REGISTRO TÉCNICO DE AUDITORIA DA EXECUÇÃO CRON ---\n');
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

  // Snapshot das tarefas, notificações, logs de auditoria e CRON_SECRET antes dos testes
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
      id: 'task-test-69c13-base',
      admissionId: 'adm-test-69c13',
      admissionCode: 'ADM-69C13',
      employeeId: 'emp-test-69c13',
      employeeName: 'Colaborador Teste 6.9C.13',
      sourceType: 'DOCUMENTO',
      title: 'Validar pendências operacionais 6.9C.13',
      priority: 'NORMAL',
      status: 'PENDENTE',
      dueAt: new Date(nowMs - 4 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c13',
      responsibleUserName: 'Analista RH Teste 6.9C.13',
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
  const runPrefix = `task-test-69c13-${Date.now()}`;
  const validSecret = 'cron-secret-test-69c13-valid';

  try {
    process.env.CRON_SECRET = validSecret;

    const dueSoonIso = new Date(nowMs + 6 * HOUR_MS).toISOString();
    const taskOverdue = buildTask({
      id: `${runPrefix}-overdue`,
      dueAt: new Date(nowMs - 4 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-69c13',
      status: 'PENDENTE'
    });
    const taskDueSoon = buildTask({
      id: `${runPrefix}-duesoon`,
      dueAt: dueSoonIso,
      responsibleUserId: 'user-rh-69c13',
      status: 'PENDENTE'
    });

    (db as any).data.operationalTasks = [taskOverdue, taskDueSoon];
    (db as any).data.auditLogs = [];

    // 1. Primeira execução via endpoint Cron -> gera 2 notificações e registra auditoria técnica
    const resFirst = await fetch(`${cronUrl}?nowMs=${nowMs}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${validSecret}`
      }
    });
    const bodyFirst = await resFirst.json();

    const auditLogsAfterFirst = db.getAuditLogs(undefined, {
      action: 'cron_operational_task_deadlines_processed'
    });
    const firstLog = auditLogsAfterFirst[0];

    assert(
      resFirst.status === 200 &&
        bodyFirst.success === true &&
        bodyFirst.notificationsGenerated === 2 &&
        auditLogsAfterFirst.length === 1 &&
        firstLog?.userName === 'Sistema (Cron)' &&
        firstLog?.isAutomatic === true &&
        firstLog?.entityType === 'automation' &&
        firstLog?.newValue === '2' &&
        firstLog?.details.includes('Execução Automática / Cron') &&
        firstLog?.details.includes('Notificações geradas: 2'),
      '1. Execução via endpoint Cron registra auditoria técnica com origem Cron e notificações geradas (2)',
      { status: resFirst.status, auditLogsCount: auditLogsAfterFirst.length, firstLog }
    );

    // 2. Execução repetida via endpoint Cron -> registra nova execução técnica (0 geradas) sem duplicar efeitos nas tarefas ou notificações
    const resSecond = await fetch(`${cronUrl}?nowMs=${nowMs}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${validSecret}`
      }
    });
    const bodySecond = await resSecond.json();

    const auditLogsAfterSecond = db.getAuditLogs(undefined, {
      action: 'cron_operational_task_deadlines_processed'
    });
    const latestLog = auditLogsAfterSecond[0];

    const expectedOverdueDedupKey = `notif:operational_task_overdue:${taskOverdue.id}`;
    const expectedDueSoonDedupKey = `notif:operational_task_due_soon:${taskDueSoon.id}:${dueSoonIso}`;
    const storedOverdue = db
      .getNotifications({ targetUserId: 'user-rh-69c13' })
      .filter(n => n.dedupKey === expectedOverdueDedupKey);
    const storedDueSoon = db
      .getNotifications({ targetUserId: 'user-rh-69c13' })
      .filter(n => n.dedupKey === expectedDueSoonDedupKey);

    assert(
      resSecond.status === 200 &&
        bodySecond.success === true &&
        bodySecond.notificationsGenerated === 0 &&
        auditLogsAfterSecond.length === 2 &&
        latestLog?.userName === 'Sistema (Cron)' &&
        latestLog?.isAutomatic === true &&
        latestLog?.newValue === '0' &&
        latestLog?.details.includes('Notificações geradas: 0') &&
        storedOverdue.length === 1 &&
        storedDueSoon.length === 1 &&
        taskOverdue.status === 'PENDENTE' &&
        taskOverdue.priority === 'NORMAL' &&
        taskDueSoon.status === 'PENDENTE' &&
        taskDueSoon.priority === 'NORMAL',
      '2. Execução repetida registra evento informativo (0 notificações geradas) sem duplicar notificações ou alterar tarefas',
      {
        status: resSecond.status,
        auditLogsCount: auditLogsAfterSecond.length,
        latestLog,
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
    // Restaurar estado original do banco
    (db as any).data.operationalTasks = originalTasksRef;
    (db as any).data.notifications = originalNotificationsSnapshot;
    (db as any).data.auditLogs = originalAuditLogsSnapshot;
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
