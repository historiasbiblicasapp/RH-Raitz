import { db } from './server/db.ts';
import { OperationalTask } from './src/types/index.ts';

async function runTests() {
  console.log('--- BLOCO 6.9B.3: TESTES DE PRIORIZAÇÃO DINÂMICA POR PRAZO ---\n');
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
  const existingSnapshot = (db.getOperationalTasks({ limit: 500 }).items || []).map(t => ({
    id: t.id,
    priority: t.priority,
    dueAt: t.dueAt,
    status: t.status
  }));

  function buildSampleTask(
    priority: 'NORMAL' | 'ALTA' | 'CRITICA',
    dueOffsetMs: number
  ): OperationalTask {
    return {
      id: `sample-${priority}-${dueOffsetMs}`,
      admissionId: 'adm-sample',
      admissionCode: 'ADM-SAMPLE',
      employeeId: 'emp-sample',
      employeeName: 'Colaborador Sample',
      sourceType: 'DOCUMENTO',
      title: `Tarefa ${priority}`,
      priority,
      status: 'PENDENTE',
      dueAt: new Date(nowMs + dueOffsetMs).toISOString(),
      createdBy: 'Sistema',
      createdAt: new Date(nowMs - DAY_MS).toISOString(),
      updatedAt: new Date(nowMs - DAY_MS).toISOString(),
      history: []
    };
  }

  // 1. NORMAL + prazo normal (+3 dias) -> NORMAL
  const tNormalPrazoNormal = db.enrichTaskWithDynamicDeadlineAndPriority(
    buildSampleTask('NORMAL', 3 * DAY_MS),
    nowMs
  );
  assert(
    !tNormalPrazoNormal.isOverdue &&
    !tNormalPrazoNormal.isDueSoon &&
    tNormalPrazoNormal.effectivePriority === 'NORMAL' &&
    tNormalPrazoNormal.priority === 'NORMAL',
    '1. NORMAL + prazo normal -> effectivePriority NORMAL (priority original NORMAL)'
  );

  // 2. NORMAL + dueSoon (+12 horas) -> ALTA
  const tNormalDueSoon = db.enrichTaskWithDynamicDeadlineAndPriority(
    buildSampleTask('NORMAL', 12 * HOUR_MS),
    nowMs
  );
  assert(
    !tNormalDueSoon.isOverdue &&
    tNormalDueSoon.isDueSoon === true &&
    tNormalDueSoon.effectivePriority === 'ALTA' &&
    tNormalDueSoon.priority === 'NORMAL',
    '2. NORMAL + dueSoon -> effectivePriority ALTA (priority original permanece NORMAL)'
  );

  // 3. NORMAL + vencida (-2 horas) -> CRITICA
  const tNormalVencida = db.enrichTaskWithDynamicDeadlineAndPriority(
    buildSampleTask('NORMAL', -2 * HOUR_MS),
    nowMs
  );
  assert(
    tNormalVencida.isOverdue === true &&
    !tNormalVencida.isDueSoon &&
    tNormalVencida.effectivePriority === 'CRITICA' &&
    tNormalVencida.priority === 'NORMAL',
    '3. NORMAL + vencida -> effectivePriority CRITICA (priority original permanece NORMAL)'
  );

  // 4. ALTA + prazo normal (+2 dias) -> ALTA
  const tAltaPrazoNormal = db.enrichTaskWithDynamicDeadlineAndPriority(
    buildSampleTask('ALTA', 2 * DAY_MS),
    nowMs
  );
  assert(
    !tAltaPrazoNormal.isOverdue &&
    !tAltaPrazoNormal.isDueSoon &&
    tAltaPrazoNormal.effectivePriority === 'ALTA' &&
    tAltaPrazoNormal.priority === 'ALTA',
    '4. ALTA + prazo normal -> effectivePriority ALTA (nunca reduz)'
  );

  // 5. ALTA + vencida (-5 horas) -> CRITICA
  const tAltaVencida = db.enrichTaskWithDynamicDeadlineAndPriority(
    buildSampleTask('ALTA', -5 * HOUR_MS),
    nowMs
  );
  assert(
    tAltaVencida.isOverdue === true &&
    tAltaVencida.effectivePriority === 'CRITICA' &&
    tAltaVencida.priority === 'ALTA',
    '5. ALTA + vencida -> effectivePriority CRITICA (priority original permanece ALTA)'
  );

  // 6. CRITICA + qualquer prazo (normal, dueSoon, vencida) -> CRITICA
  const tCriticaNormal = db.enrichTaskWithDynamicDeadlineAndPriority(
    buildSampleTask('CRITICA', 5 * DAY_MS),
    nowMs
  );
  const tCriticaDueSoon = db.enrichTaskWithDynamicDeadlineAndPriority(
    buildSampleTask('CRITICA', 6 * HOUR_MS),
    nowMs
  );
  const tCriticaVencida = db.enrichTaskWithDynamicDeadlineAndPriority(
    buildSampleTask('CRITICA', -6 * HOUR_MS),
    nowMs
  );
  assert(
    tCriticaNormal.effectivePriority === 'CRITICA' &&
    tCriticaDueSoon.effectivePriority === 'CRITICA' &&
    tCriticaVencida.effectivePriority === 'CRITICA' &&
    tCriticaNormal.priority === 'CRITICA',
    '6. CRITICA + qualquer prazo -> permanece CRITICA (nunca reduz)'
  );

  // 7. Prioridade original e tarefas existentes no banco permanecem intactas
  const afterSnapshot = db.getOperationalTasks({ limit: 500 }).items || [];
  let allIntact = existingSnapshot.length === afterSnapshot.length;
  for (const prev of existingSnapshot) {
    const curr = afterSnapshot.find(t => t.id === prev.id);
    if (!curr || curr.priority !== prev.priority || curr.dueAt !== prev.dueAt || curr.status !== prev.status) {
      allIntact = false;
      break;
    }
  }
  assert(
    allIntact,
    `7. Prioridade original e todas as ${existingSnapshot.length} tarefas existentes permanecem intactas`
  );

  console.log(`\nRESULTADO 6.9B.3: ${passed} PASSOU | ${failed} FALHOU (TOTAL: ${passed + failed})`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Erro nos testes 6.9B.3:', err);
  process.exit(1);
});
