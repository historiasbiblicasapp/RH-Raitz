import express from 'express';
import { AddressInfo } from 'net';
import apiRouter from './server/routes.ts';
import { db } from './server/db.ts';
import { OperationalTask } from './src/types/index.ts';

async function runTests() {
  console.log('--- BLOCO 6.9D.2: PADRONIZAÇÃO DE FILTROS DA API ---\n');
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

  const prefix = `task-69d2-${Date.now()}`;
  const admId = `adm-69d2-${Date.now()}`;

  function buildTask(overrides: Partial<OperationalTask>): OperationalTask {
    return {
      id: `${prefix}-base`,
      admissionId: admId,
      admissionCode: 'ADM-69D2',
      employeeId: 'emp-69d2',
      employeeName: 'Colaborador Filtro 6.9D.2',
      sourceType: 'DOCUMENTO',
      title: 'Tarefa Filtro 6.9D.2',
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

  const app = express();
  app.use(express.json());
  app.use(apiRouter);

  const server = await new Promise<ReturnType<typeof app.listen>>(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const rhHeaders = { 'x-user-role': 'RH', 'x-user-id': 'user-rh-01' };

  try {
    const tOverdueRh1 = buildTask({
      id: `${prefix}-overdue-rh1`,
      priority: 'NORMAL', // effectivePriority = CRITICA
      status: 'PENDENTE',
      dueAt: new Date(nowMs - 4 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-01',
      responsibleUserName: 'Ana Ribeiro'
    });
    const tDueSoonRh2 = buildTask({
      id: `${prefix}-duesoon-rh2`,
      priority: 'NORMAL', // effectivePriority = ALTA
      status: 'EM_ANDAMENTO',
      dueAt: new Date(nowMs + 6 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-02',
      responsibleUserName: 'Carlos Mendes'
    });
    const tNormalUnassigned = buildTask({
      id: `${prefix}-normal-unassigned`,
      priority: 'NORMAL', // effectivePriority = NORMAL
      status: 'PENDENTE',
      dueAt: new Date(nowMs + 72 * HOUR_MS).toISOString(),
      responsibleUserId: null,
      responsibleUserName: undefined
    });
    const tCompletedPastDue = buildTask({
      id: `${prefix}-completed`,
      priority: 'ALTA', // effectivePriority = ALTA, alertState = NORMAL
      status: 'CONCLUIDA',
      dueAt: new Date(nowMs - 12 * HOUR_MS).toISOString(),
      responsibleUserId: 'user-rh-01',
      responsibleUserName: 'Ana Ribeiro'
    });

    (db as any).data.operationalTasks = [
      ...originalTasksRef,
      tOverdueRh1,
      tDueSoonRh2,
      tNormalUnassigned,
      tCompletedPastDue
    ];

    // 1. Filtro por estado do prazo (deadlineState=OVERDUE, DUE_SOON, NORMAL)
    const resOverdue = await fetch(
      `${baseUrl}/api/tarefas?admissionId=${admId}&deadlineState=OVERDUE&nowMs=${nowMs}`,
      { headers: rhHeaders }
    );
    const bodyOverdue = await resOverdue.json();

    const resDueSoon = await fetch(
      `${baseUrl}/api/tarefas?admissionId=${admId}&deadlineState=DUE_SOON&nowMs=${nowMs}`,
      { headers: rhHeaders }
    );
    const bodyDueSoon = await resDueSoon.json();

    const resNormal = await fetch(
      `${baseUrl}/api/tarefas?admissionId=${admId}&deadlineState=NORMAL&status=ATIVA&nowMs=${nowMs}`,
      { headers: rhHeaders }
    );
    const bodyNormal = await resNormal.json();

    assert(
      resOverdue.status === 200 &&
        bodyOverdue.items.length === 1 &&
        bodyOverdue.items[0].id === tOverdueRh1.id &&
        resDueSoon.status === 200 &&
        bodyDueSoon.items.length === 1 &&
        bodyDueSoon.items[0].id === tDueSoonRh2.id &&
        resNormal.status === 200 &&
        bodyNormal.items.length === 1 &&
        bodyNormal.items[0].id === tNormalUnassigned.id,
      '1. Filtro por estado do prazo (OVERDUE, DUE_SOON, NORMAL) retorna exatamente as tarefas esperadas',
      {
        overdueIds: bodyOverdue.items.map((i: any) => i.id),
        dueSoonIds: bodyDueSoon.items.map((i: any) => i.id),
        normalIds: bodyNormal.items.map((i: any) => i.id)
      }
    );

    // 2. Filtro por prioridade efetiva (priority / effectivePriority)
    const resCritica = await fetch(
      `${baseUrl}/api/tarefas?admissionId=${admId}&effectivePriority=CRITICA&nowMs=${nowMs}`,
      { headers: rhHeaders }
    );
    const bodyCritica = await resCritica.json();

    const resAlta = await fetch(
      `${baseUrl}/api/tarefas?admissionId=${admId}&priority=ALTA&status=EM_ANDAMENTO&nowMs=${nowMs}`,
      { headers: rhHeaders }
    );
    const bodyAlta = await resAlta.json();

    assert(
      resCritica.status === 200 &&
        bodyCritica.items.length === 1 &&
        bodyCritica.items[0].id === tOverdueRh1.id &&
        resAlta.status === 200 &&
        bodyAlta.items.length === 1 &&
        bodyAlta.items[0].id === tDueSoonRh2.id,
      '2. Filtro por prioridade efetiva (effectivePriority / priority) considera escalonamento dinâmico por prazo',
      {
        criticaIds: bodyCritica.items.map((i: any) => i.id),
        altaIds: bodyAlta.items.map((i: any) => i.id)
      }
    );

    // 3. Filtro por responsável (usuário específico e sem_responsavel)
    const resRespRh2 = await fetch(
      `${baseUrl}/api/tarefas?admissionId=${admId}&responsibleUserId=user-rh-02&nowMs=${nowMs}`,
      { headers: rhHeaders }
    );
    const bodyRespRh2 = await resRespRh2.json();

    const resUnassigned = await fetch(
      `${baseUrl}/api/tarefas?admissionId=${admId}&responsible=sem_responsavel&nowMs=${nowMs}`,
      { headers: rhHeaders }
    );
    const bodyUnassigned = await resUnassigned.json();

    assert(
      resRespRh2.status === 200 &&
        bodyRespRh2.items.length === 1 &&
        bodyRespRh2.items[0].id === tDueSoonRh2.id &&
        resUnassigned.status === 200 &&
        bodyUnassigned.items.length === 1 &&
        bodyUnassigned.items[0].id === tNormalUnassigned.id,
      '3. Filtro por responsável (responsible / responsibleUserId / sem_responsavel) funciona consistentemente',
      {
        rh2Ids: bodyRespRh2.items.map((i: any) => i.id),
        unassignedIds: bodyUnassigned.items.map((i: any) => i.id)
      }
    );

    // 4. Filtro por situação/status e combinação múltipla de filtros
    const resCombo = await fetch(
      `${baseUrl}/api/tarefas?admissionId=${admId}&situation=ATIVA&responsible=user-rh-01&deadlineState=OVERDUE&effectivePriority=CRITICA&nowMs=${nowMs}`,
      { headers: rhHeaders }
    );
    const bodyCombo = await resCombo.json();

    assert(
      resCombo.status === 200 &&
        bodyCombo.items.length === 1 &&
        bodyCombo.items[0].id === tOverdueRh1.id,
      '4. Combinação de filtros (situation + responsible + deadlineState + effectivePriority) funciona corretamente',
      { comboIds: bodyCombo.items.map((i: any) => i.id) }
    );

    // 5. Parâmetros inválidos nos endpoints de tarefas, prazos e pendências não provocam erro 500
    const resInvalidTasks = await fetch(
      `${baseUrl}/api/tarefas?page=abc&limit=-99&sortBy=campo_inexistente&sortOrder=invalido&deadlineState=ESTADO_INVALIDO&status=STATUS_INVALIDO&viewMode=modo_invalido`,
      { headers: rhHeaders }
    );
    const bodyInvalidTasks = await resInvalidTasks.json();

    const resInvalidPrazos = await fetch(
      `${baseUrl}/api/prazos?page=xyz&limit=-5&period=periodo_invalido&situacao=inexistente&sortOrder=errado`,
      { headers: rhHeaders }
    );
    const bodyInvalidPrazos = await resInvalidPrazos.json();

    const resInvalidPendencias = await fetch(
      `${baseUrl}/api/pendencias?page=NaN&limit=0&prioridade=invalida&sortOrder=errado`,
      { headers: rhHeaders }
    );
    const bodyInvalidPendencias = await resInvalidPendencias.json();

    assert(
      resInvalidTasks.status === 200 &&
        Array.isArray(bodyInvalidTasks.items) &&
        bodyInvalidTasks.items.length === 0 &&
        resInvalidPrazos.status === 200 &&
        Array.isArray(bodyInvalidPrazos.items) &&
        resInvalidPendencias.status === 200 &&
        Array.isArray(bodyInvalidPendencias.items),
      '5. Parâmetros inválidos em /api/tarefas, /api/prazos e /api/pendencias são tratados sem provocar erro 500',
      {
        tasksStatus: resInvalidTasks.status,
        prazosStatus: resInvalidPrazos.status,
        pendenciasStatus: resInvalidPendencias.status
      }
    );
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    (db as any).data.operationalTasks = originalTasksRef;
  }

  // 6. Confirmar integridade das tarefas existentes
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

  assert(allIntact, '6. Dados existentes no banco permanecem inalterados');

  console.log(`\nRESULTADO 6.9D.2: ${passed} PASSOU | ${failed} FALHOU (TOTAL: ${passed + failed})`);
  if (failed > 0 || !allIntact) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro inesperado em test_6_9d2.ts:', err);
  process.exit(1);
});
