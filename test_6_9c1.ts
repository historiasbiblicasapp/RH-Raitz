import { db } from './server/db.ts';
import { OperationalTask } from './src/types/index.ts';

async function runTests() {
  console.log('--- BLOCO 6.9C.1: TESTES DE DETECÇÃO DE TAREFAS PARA ALERTA ---\n');
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

  // Snapshot das tarefas existentes no banco antes dos testes
  const existingSnapshot = ((db as any).data.operationalTasks || []).map((t: any) => ({
    id: t.id,
    priority: t.priority,
    dueAt: t.dueAt,
    status: t.status
  }));

  function buildTask(overrides: Partial<OperationalTask>): OperationalTask {
    return {
      id: 'task-test-69c1',
      admissionId: 'adm-test-69c1',
      admissionCode: 'ADM-69C1',
      employeeId: 'emp-test-69c1',
      employeeName: 'Colaborador Teste 6.9C.1',
      sourceType: 'DOCUMENTO',
      title: 'Tarefa Teste Alerta',
      priority: 'NORMAL',
      status: 'PENDENTE',
      dueAt: null,
      createdBy: 'Sistema',
      createdAt: new Date(nowMs - DAY_MS).toISOString(),
      updatedAt: new Date(nowMs - DAY_MS).toISOString(),
      history: [],
      ...overrides
    };
  }

  // 1. Tarefa sem dueAt -> NORMAL
  const taskNoDueAt = buildTask({ dueAt: null, status: 'PENDENTE' });
  const stateNoDueAt = db.classifyOperationalTaskAlertState(taskNoDueAt, nowMs);
  assert(stateNoDueAt === 'NORMAL', '1. Tarefa sem dueAt -> NORMAL', { stateNoDueAt });

  // 2. Tarefa com prazo normal (+3 dias) -> NORMAL
  const taskNormalDue = buildTask({
    dueAt: new Date(nowMs + 3 * DAY_MS).toISOString(),
    status: 'PENDENTE'
  });
  const stateNormalDue = db.classifyOperationalTaskAlertState(taskNormalDue, nowMs);
  assert(stateNormalDue === 'NORMAL', '2. Tarefa com prazo normal -> NORMAL', { stateNormalDue });

  // 3. Tarefa dueSoon (+10 horas) -> DUE_SOON
  const taskDueSoon = buildTask({
    dueAt: new Date(nowMs + 10 * HOUR_MS).toISOString(),
    status: 'EM_ANDAMENTO'
  });
  const stateDueSoon = db.classifyOperationalTaskAlertState(taskDueSoon, nowMs);
  assert(stateDueSoon === 'DUE_SOON', '3. Tarefa dueSoon -> DUE_SOON', { stateDueSoon });

  // 4. Tarefa vencida (-3 horas) -> OVERDUE
  const taskOverdue = buildTask({
    dueAt: new Date(nowMs - 3 * HOUR_MS).toISOString(),
    status: 'PENDENTE'
  });
  const stateOverdue = db.classifyOperationalTaskAlertState(taskOverdue, nowMs);
  assert(stateOverdue === 'OVERDUE', '4. Tarefa vencida -> OVERDUE', { stateOverdue });

  // 5. Tarefa concluída (mesmo com dueAt vencido ou dueSoon) -> NORMAL
  const taskCompleted = buildTask({
    dueAt: new Date(nowMs - 5 * HOUR_MS).toISOString(),
    status: 'CONCLUIDA'
  });
  const stateCompleted = db.classifyOperationalTaskAlertState(taskCompleted, nowMs);
  assert(stateCompleted === 'NORMAL', '5. Tarefa concluída -> NORMAL', { stateCompleted });

  // 6. Tarefa cancelada (mesmo com dueAt vencido ou dueSoon) -> NORMAL
  const taskCancelled = buildTask({
    dueAt: new Date(nowMs - 5 * HOUR_MS).toISOString(),
    status: 'CANCELADA'
  });
  const stateCancelled = db.classifyOperationalTaskAlertState(taskCancelled, nowMs);
  assert(stateCancelled === 'NORMAL', '6. Tarefa cancelada -> NORMAL', { stateCancelled });

  // Confirmação de que nenhuma tarefa existente no banco foi alterada
  const afterTasks = (db as any).data.operationalTasks || [];
  let allIntact = afterTasks.length === existingSnapshot.length;
  for (const prev of existingSnapshot) {
    const curr = afterTasks.find((t: any) => t.id === prev.id);
    if (!curr || curr.priority !== prev.priority || curr.dueAt !== prev.dueAt || curr.status !== prev.status) {
      allIntact = false;
      break;
    }
  }
  if (!allIntact) {
    console.error('[FAIL] Alguma tarefa existente foi alterada.');
    failed++;
  }

  console.log(`\nRESULTADO 6.9C.1: ${passed} PASSOU | ${failed} FALHOU (TOTAL: ${passed + failed})`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Erro nos testes 6.9C.1:', err);
  process.exit(1);
});
