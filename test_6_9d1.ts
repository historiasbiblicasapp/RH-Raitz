import { db } from './server/db.ts';
import { OperationalTask } from './src/types/index.ts';

async function runTests() {
  console.log('--- BLOCO 6.9D.1: CONSOLIDAÇÃO DO ESTADO DAS TAREFAS ---\n');
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

  // Snapshot completo das tarefas existentes no banco para garantir preservação estrita
  const originalTasksRef = (db as any).data.operationalTasks || [];
  const existingSnapshot = originalTasksRef.map((t: any) => ({
    id: t.id,
    priority: t.priority,
    dueAt: t.dueAt,
    status: t.status,
    responsibleUserId: t.responsibleUserId,
    hasPersistedEffective: Object.prototype.hasOwnProperty.call(t, 'effectivePriority'),
    hasPersistedAlertState: Object.prototype.hasOwnProperty.call(t, 'alertState'),
    hasPersistedDeadlineState: Object.prototype.hasOwnProperty.call(t, 'deadlineState')
  }));

  const prefix = `task-69d1-${Date.now()}`;

  function buildRawTask(overrides: Partial<OperationalTask>): OperationalTask {
    return {
      id: `${prefix}-base`,
      admissionId: 'adm-69d1',
      admissionCode: 'ADM-69D1',
      employeeId: 'emp-69d1',
      employeeName: 'Colaborador Teste 6.9D.1',
      sourceType: 'DOCUMENTO',
      title: 'Tarefa de Consolidação 6.9D.1',
      priority: 'NORMAL',
      status: 'PENDENTE',
      dueAt: new Date(nowMs + 3 * DAY_MS).toISOString(),
      responsibleUserId: 'user-rh-01',
      responsibleUserName: 'Analista RH',
      createdBy: 'Sistema',
      createdAt: new Date(nowMs - DAY_MS).toISOString(),
      updatedAt: new Date(nowMs - DAY_MS).toISOString(),
      history: [],
      ...overrides
    };
  }

  try {
    const rawNormal = buildRawTask({
      id: `${prefix}-normal`,
      priority: 'NORMAL',
      status: 'PENDENTE',
      dueAt: new Date(nowMs + 3 * DAY_MS).toISOString()
    });
    const rawDueSoon = buildRawTask({
      id: `${prefix}-duesoon`,
      priority: 'NORMAL',
      status: 'EM_ANDAMENTO',
      dueAt: new Date(nowMs + 8 * HOUR_MS).toISOString()
    });
    const rawOverdue = buildRawTask({
      id: `${prefix}-overdue`,
      priority: 'NORMAL',
      status: 'PENDENTE',
      dueAt: new Date(nowMs - 5 * HOUR_MS).toISOString()
    });
    const rawCompleted = buildRawTask({
      id: `${prefix}-completed`,
      priority: 'NORMAL',
      status: 'CONCLUIDA',
      dueAt: new Date(nowMs - 10 * HOUR_MS).toISOString(), // mesmo com prazo passado
      completedAt: new Date(nowMs - HOUR_MS).toISOString()
    });
    const rawCancelled = buildRawTask({
      id: `${prefix}-cancelled`,
      priority: 'ALTA',
      status: 'CANCELADA',
      dueAt: new Date(nowMs + 4 * HOUR_MS).toISOString(), // mesmo dentro de 24h
      cancelledAt: new Date(nowMs - HOUR_MS).toISOString()
    });

    (db as any).data.operationalTasks = [
      ...originalTasksRef,
      rawNormal,
      rawDueSoon,
      rawOverdue,
      rawCompleted,
      rawCancelled
    ];

    const listResp = db.getOperationalTasks({ admissionId: 'adm-69d1', limit: 50, nowMs });
    const byList = (id: string) => listResp.items.find(t => t.id === id)!;

    // 1. Tarefa NORMAL (prazo > 24h)
    const listNormal = byList(rawNormal.id);
    const idNormal = db.getOperationalTaskById(rawNormal.id, nowMs);
    assert(
      listNormal.isOverdue === false &&
        listNormal.isDueSoon === false &&
        listNormal.effectivePriority === 'NORMAL' &&
        listNormal.alertState === 'NORMAL' &&
        listNormal.deadlineState === 'NORMAL' &&
        idNormal.isOverdue === listNormal.isOverdue &&
        idNormal.isDueSoon === listNormal.isDueSoon &&
        idNormal.effectivePriority === listNormal.effectivePriority &&
        idNormal.alertState === listNormal.alertState &&
        idNormal.deadlineState === listNormal.deadlineState,
      '1. Tarefa NORMAL retorna consistentemente effectivePriority=NORMAL, isDueSoon=false, isOverdue=false e estado=NORMAL em ambas as consultas',
      { listNormal, idNormal }
    );

    // 2. Tarefa DUE_SOON (vence em <= 24h)
    const listDueSoon = byList(rawDueSoon.id);
    const idDueSoon = db.getOperationalTaskById(rawDueSoon.id, nowMs);
    assert(
      listDueSoon.isOverdue === false &&
        listDueSoon.isDueSoon === true &&
        listDueSoon.effectivePriority === 'ALTA' &&
        listDueSoon.priority === 'NORMAL' &&
        listDueSoon.alertState === 'DUE_SOON' &&
        listDueSoon.deadlineState === 'DUE_SOON' &&
        idDueSoon.isOverdue === listDueSoon.isOverdue &&
        idDueSoon.isDueSoon === listDueSoon.isDueSoon &&
        idDueSoon.effectivePriority === listDueSoon.effectivePriority &&
        idDueSoon.alertState === listDueSoon.alertState &&
        idDueSoon.deadlineState === listDueSoon.deadlineState,
      '2. Tarefa DUE_SOON retorna consistentemente effectivePriority=ALTA, isDueSoon=true, isOverdue=false e estado=DUE_SOON sem alterar priority original',
      { listDueSoon, idDueSoon }
    );

    // 3. Tarefa OVERDUE (vencida)
    const listOverdue = byList(rawOverdue.id);
    const idOverdue = db.getOperationalTaskById(rawOverdue.id, nowMs);
    assert(
      listOverdue.isOverdue === true &&
        listOverdue.isDueSoon === false &&
        listOverdue.effectivePriority === 'CRITICA' &&
        listOverdue.priority === 'NORMAL' &&
        listOverdue.alertState === 'OVERDUE' &&
        listOverdue.deadlineState === 'OVERDUE' &&
        idOverdue.isOverdue === listOverdue.isOverdue &&
        idOverdue.isDueSoon === listOverdue.isDueSoon &&
        idOverdue.effectivePriority === listOverdue.effectivePriority &&
        idOverdue.alertState === listOverdue.alertState &&
        idOverdue.deadlineState === listOverdue.deadlineState,
      '3. Tarefa OVERDUE retorna consistentemente effectivePriority=CRITICA, isDueSoon=false, isOverdue=true e estado=OVERDUE sem alterar priority original',
      { listOverdue, idOverdue }
    );

    // 4. Tarefa CONCLUIDA (mesmo com dueAt no passado)
    const listCompleted = byList(rawCompleted.id);
    const idCompleted = db.getOperationalTaskById(rawCompleted.id, nowMs);
    assert(
      listCompleted.status === 'CONCLUIDA' &&
        listCompleted.isOverdue === false &&
        listCompleted.isDueSoon === false &&
        listCompleted.effectivePriority === 'NORMAL' &&
        listCompleted.alertState === 'NORMAL' &&
        listCompleted.deadlineState === 'NORMAL' &&
        idCompleted.isOverdue === false &&
        idCompleted.isDueSoon === false &&
        idCompleted.effectivePriority === 'NORMAL' &&
        idCompleted.alertState === 'NORMAL',
      '4. Tarefa CONCLUIDA retorna isOverdue=false, isDueSoon=false, effectivePriority original e estado=NORMAL',
      { listCompleted, idCompleted }
    );

    // 5. Tarefa CANCELADA (mesmo com dueAt nas próximas 24h)
    const listCancelled = byList(rawCancelled.id);
    const idCancelled = db.getOperationalTaskById(rawCancelled.id, nowMs);
    assert(
      listCancelled.status === 'CANCELADA' &&
        listCancelled.isOverdue === false &&
        listCancelled.isDueSoon === false &&
        listCancelled.effectivePriority === 'ALTA' &&
        listCancelled.alertState === 'NORMAL' &&
        listCancelled.deadlineState === 'NORMAL' &&
        idCancelled.isOverdue === false &&
        idCancelled.isDueSoon === false &&
        idCancelled.effectivePriority === 'ALTA' &&
        idCancelled.alertState === 'NORMAL',
      '5. Tarefa CANCELADA retorna isOverdue=false, isDueSoon=false, effectivePriority original e estado=NORMAL',
      { listCancelled, idCancelled }
    );

    // 6. Garantir que campos dinâmicos não foram persistidos nos objetos brutos em memória/banco
    const noDynamicPersisted = [rawNormal, rawDueSoon, rawOverdue, rawCompleted, rawCancelled].every(
      raw =>
        !Object.prototype.hasOwnProperty.call(raw, 'effectivePriority') &&
        !Object.prototype.hasOwnProperty.call(raw, 'isDueSoon') &&
        !Object.prototype.hasOwnProperty.call(raw, 'alertState') &&
        !Object.prototype.hasOwnProperty.call(raw, 'deadlineState')
    );
    assert(
      noDynamicPersisted,
      '6. Campos dinâmicos (effectivePriority, isDueSoon, alertState, deadlineState) não são persistidos nos registros brutos'
    );
  } finally {
    (db as any).data.operationalTasks = originalTasksRef;
  }

  // 7. Confirmar que nenhuma tarefa existente foi alterada
  const afterTasks = (db as any).data.operationalTasks || [];
  let allIntact = afterTasks.length === existingSnapshot.length;
  for (const prev of existingSnapshot) {
    const curr = afterTasks.find((t: any) => t.id === prev.id);
    if (
      !curr ||
      curr.priority !== prev.priority ||
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
    `7. Todas as ${existingSnapshot.length} tarefas existentes permanecem intactas no banco`
  );

  console.log(`\nRESULTADO 6.9D.1: ${passed} PASSOU | ${failed} FALHOU (TOTAL: ${passed + failed})`);
  if (failed > 0 || !allIntact) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro inesperado em test_6_9d1.ts:', err);
  process.exit(1);
});
