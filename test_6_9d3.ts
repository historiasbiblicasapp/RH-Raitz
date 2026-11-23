import { db } from './server/db.ts';
import { OperationalTask } from './src/types/index.ts';

async function runTests() {
  console.log('--- BLOCO 6.9D.3: CONSOLIDAÇÃO DOS CONTADORES DE PRAZOS ---\n');
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

  const originalTasksRef = (db as any).data.operationalTasks || [];
  const existingSnapshot = originalTasksRef.map((t: any) => ({
    id: t.id,
    priority: t.priority,
    dueAt: t.dueAt,
    status: t.status,
    responsibleUserId: t.responsibleUserId
  }));

  const prefix = `task-69d3-${Date.now()}`;

  function buildTask(overrides: Partial<OperationalTask>): OperationalTask {
    return {
      id: `${prefix}-base`,
      admissionId: 'adm-69d3',
      admissionCode: 'ADM-69D3',
      employeeId: 'emp-69d3',
      employeeName: 'Colaborador Contadores 6.9D.3',
      sourceType: 'DOCUMENTO',
      title: 'Tarefa Contador 6.9D.3',
      priority: 'NORMAL',
      status: 'PENDENTE',
      dueAt: new Date(nowMs + 3 * DAY_MS).toISOString(),
      responsibleUserId: 'user-rh-01',
      responsibleUserName: 'Ana Ribeiro',
      createdBy: 'Sistema',
      createdAt: new Date(nowMs - DAY_MS).toISOString(),
      updatedAt: new Date(nowMs - DAY_MS).toISOString(),
      history: [],
      ...overrides
    };
  }

  try {
    // Conjunto controlado com totais exatamente conhecidos:
    // Ativas (6 no total):
    // - 2 OVERDUE (1 PENDENTE, 1 EM_ANDAMENTO)
    // - 2 DUE_SOON (1 PENDENTE, 1 BLOQUEADA)
    // - 2 NORMAL (1 PENDENTE com prazo > 24h, 1 EM_ANDAMENTO sem dueAt)
    // Inativas (3 no total):
    // - 2 CONCLUIDA (1 com dueAt vencido, 1 com dueAt em < 24h)
    // - 1 CANCELADA (com dueAt vencido)
    const controlledTasks: OperationalTask[] = [
      buildTask({
        id: `${prefix}-overdue-1`,
        status: 'PENDENTE',
        priority: 'NORMAL',
        dueAt: new Date(nowMs - 2 * HOUR_MS).toISOString(),
        responsibleUserId: 'user-rh-01'
      }),
      buildTask({
        id: `${prefix}-overdue-2`,
        status: 'EM_ANDAMENTO',
        priority: 'ALTA',
        dueAt: new Date(nowMs - 24 * HOUR_MS).toISOString(),
        responsibleUserId: null
      }),
      buildTask({
        id: `${prefix}-duesoon-1`,
        status: 'PENDENTE',
        priority: 'NORMAL',
        dueAt: new Date(nowMs + 5 * HOUR_MS).toISOString(),
        responsibleUserId: 'user-rh-01'
      }),
      buildTask({
        id: `${prefix}-duesoon-2`,
        status: 'BLOQUEADA',
        priority: 'CRITICA',
        dueAt: new Date(nowMs + 18 * HOUR_MS).toISOString(),
        responsibleUserId: 'user-rh-02'
      }),
      buildTask({
        id: `${prefix}-normal-1`,
        status: 'PENDENTE',
        priority: 'NORMAL',
        dueAt: new Date(nowMs + 72 * HOUR_MS).toISOString(),
        responsibleUserId: 'user-rh-01'
      }),
      buildTask({
        id: `${prefix}-normal-2-nodue`,
        status: 'EM_ANDAMENTO',
        priority: 'NORMAL',
        dueAt: null,
        responsibleUserId: null
      }),
      buildTask({
        id: `${prefix}-completed-pastdue`,
        status: 'CONCLUIDA',
        priority: 'CRITICA',
        dueAt: new Date(nowMs - 10 * HOUR_MS).toISOString(),
        responsibleUserId: 'user-rh-01'
      }),
      buildTask({
        id: `${prefix}-completed-duesoon`,
        status: 'CONCLUIDA',
        priority: 'ALTA',
        dueAt: new Date(nowMs + 3 * HOUR_MS).toISOString(),
        responsibleUserId: 'user-rh-01'
      }),
      buildTask({
        id: `${prefix}-cancelled-pastdue`,
        status: 'CANCELADA',
        priority: 'CRITICA',
        dueAt: new Date(nowMs - 6 * HOUR_MS).toISOString(),
        responsibleUserId: 'user-rh-01'
      })
    ];

    (db as any).data.operationalTasks = controlledTasks;

    const res = db.getOperationalTasks({ currentUserId: 'user-rh-01', nowMs });
    const s = res.summary;

    // 1. Totais de tarefas ativas, vencidas, próximas do vencimento e normais
    assert(
      s.total === 9 &&
        s.active === 6 &&
        s.overdue === 2 &&
        s.dueSoon === 2 &&
        s.normal === 2,
      '1. Contadores consolidados calculam exatamente total=9, active=6, overdue=2, dueSoon=2 e normal=2',
      s
    );

    // 2. Tarefas concluídas ou canceladas não são contabilizadas como pendências ativas
    assert(
      s.completed === 2 &&
        s.cancelled === 1 &&
        s.active === s.total - s.completed - s.cancelled &&
        s.myTasks === 3 && // apenas as 3 ativas de user-rh-01 (exclui CONCLUIDA/CANCELADA)
        s.unassigned === 2 && // apenas as 2 ativas sem responsável
        s.critical === 3, // 2 overdue (escaladas p/ CRITICA) + 1 dueSoon originalmente CRITICA (exclui CONCLUIDA/CANCELADA)
      '2. Tarefas concluídas (2) e canceladas (1) não entram nos contadores de pendências ativas, fila ou críticas',
      s
    );

    // 3. Evitar contagem duplicada da mesma tarefa (soma das partições = active e deduplicação por ID)
    (db as any).data.operationalTasks = [
      ...controlledTasks,
      controlledTasks[0], // referência duplicada de tarefa OVERDUE
      controlledTasks[2] // referência duplicada de tarefa DUE_SOON
    ];
    const resDedup = db.getOperationalTasks({ currentUserId: 'user-rh-01', nowMs });
    const sDedup = resDedup.summary;

    assert(
      sDedup.total === 9 &&
        sDedup.active === 6 &&
        sDedup.overdue + sDedup.dueSoon + sDedup.normal === sDedup.active &&
        sDedup.overdue === 2 &&
        sDedup.dueSoon === 2 &&
        sDedup.normal === 2,
      '3. Nenhuma tarefa é contada em duplicidade (overdue + dueSoon + normal === active, mesmo com referências repetidas)',
      sDedup
    );

    // 4. Fonte única de verdade: contadores do summary batem exatamente com a listagem filtrada por cada estado
    const listOverdue = db.getOperationalTasks({ deadlineState: 'OVERDUE', nowMs });
    const listDueSoon = db.getOperationalTasks({ deadlineState: 'DUE_SOON', nowMs });
    const listNormalActive = db.getOperationalTasks({ status: 'ATIVA', deadlineState: 'NORMAL', nowMs });
    const listActive = db.getOperationalTasks({ status: 'ATIVA', nowMs });

    assert(
      listOverdue.total === sDedup.overdue &&
        listDueSoon.total === sDedup.dueSoon &&
        listNormalActive.total === sDedup.normal &&
        listActive.total === sDedup.active,
      '4. Fonte única de verdade: contadores do summary coincidem exatamente com os totais das consultas filtradas',
      {
        summary: sDedup,
        filteredTotals: {
          overdue: listOverdue.total,
          dueSoon: listDueSoon.total,
          normalActive: listNormalActive.total,
          active: listActive.total
        }
      }
    );
  } finally {
    (db as any).data.operationalTasks = originalTasksRef;
  }

  // 5. Confirmar que nenhum registro existente foi alterado
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

  assert(allIntact, '5. Registros existentes no banco permanecem inalterados');

  console.log(`\nRESULTADO 6.9D.3: ${passed} PASSOU | ${failed} FALHOU (TOTAL: ${passed + failed})`);
  if (failed > 0 || !allIntact) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro inesperado em test_6_9d3.ts:', err);
  process.exit(1);
});
