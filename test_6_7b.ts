import { db } from './server/db.ts';

async function runTests() {
  console.log('--- INICIANDO TESTES DO BLOCO 6.7B: MODELO E BACKEND DE NOTIFICAÇÕES ---\n');
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error('  Detalhes:', details);
      failedCount++;
    }
  }

  // =========================================================================
  // TESTE 1: CRIAÇÃO DE NOTIFICAÇÃO ENRIQUECIDA
  // =========================================================================
  console.log('--- TESTE 1: Criação de Notificação Enriquecida ---');
  const enrichedInput = {
    title: 'Documento Pendente de Correção',
    message: 'O RG enviado está ilegível e precisa de novo envio.',
    type: 'pending' as const,
    admissionId: 'adm-test-67b-01',
    link: '/admissoes/adm-test-67b-01',
    targetUserId: 'user-func-99',
    targetRole: 'FUNCIONARIO',
    category: 'document',
    sourceEvent: 'automation_document_rejected',
    priority: 'high',
    dedupKey: 'notif-custom-test-01'
  };

  const created1 = db.addNotification(enrichedInput);
  assert(Boolean(created1), 'addNotification retornou a notificação criada');
  assert(Boolean(created1?.id && created1.id.startsWith('notif-')), 'Notificação possui ID gerado com prefixo correto', created1?.id);
  assert(Boolean(created1?.timestamp), 'Notificação possui timestamp ISO');
  assert(created1?.read === false, 'Notificação nasce com read = false');
  assert(created1?.targetUserId === 'user-func-99', 'targetUserId foi gravado corretamente', created1?.targetUserId);
  assert(created1?.targetRole === 'FUNCIONARIO', 'targetRole foi gravado corretamente', created1?.targetRole);
  assert(created1?.category === 'document', 'category foi gravada corretamente', created1?.category);
  assert(created1?.sourceEvent === 'automation_document_rejected', 'sourceEvent gravado', created1?.sourceEvent);
  assert(created1?.priority === 'high', 'priority foi gravada corretamente', created1?.priority);
  assert(created1?.dedupKey === 'notif-custom-test-01', 'dedupKey foi gravada corretamente', created1?.dedupKey);

  // =========================================================================
  // TESTE 2: COMPATIBILIDADE COM NOTIFICAÇÕES ANTIGAS / LEGADAS
  // =========================================================================
  console.log('\n--- TESTE 2: Compatibilidade com Notificações Legadas ---');
  const legacyInput = {
    title: 'Nova Admissão Iniciada',
    message: 'Uma admissão legada foi cadastrada no sistema.',
    type: 'admission_created' as const,
    admissionId: 'adm-legacy-01',
    link: '/admissoes/adm-legacy-01'
  };

  const createdLegacy = db.addNotification(legacyInput);
  assert(Boolean(createdLegacy), 'addNotification aceita payload legado sem quebrar');
  assert(createdLegacy?.read === false, 'Notificação legada possui read = false');
  assert(createdLegacy?.category === 'general', 'Notificação legada recebe default category: general', createdLegacy?.category);
  assert(createdLegacy?.priority === 'normal', 'Notificação legada recebe default priority: normal', createdLegacy?.priority);
  assert(createdLegacy?.targetUserId === undefined, 'targetUserId permanece undefined em notificação legada');
  assert(createdLegacy?.targetRole === undefined, 'targetRole permanece undefined em notificação legada');

  // =========================================================================
  // TESTE 3: FILTRO POR CATEGORIA
  // =========================================================================
  console.log('\n--- TESTE 3: Filtro por Categoria ---');
  const catAdmId = 'adm-cat-' + Date.now();
  db.addNotification({
    title: 'Aprovação Concluída',
    message: 'Diretoria aprovou o processo.',
    type: 'completed',
    category: 'approval',
    admissionId: catAdmId
  });
  db.addNotification({
    title: 'Tarefa Operacional',
    message: 'Conferir crachá do colaborador.',
    type: 'pending',
    category: 'task',
    admissionId: catAdmId
  });
  db.addNotification({
    title: 'Manutenção Programada',
    message: 'Sistema passará por melhorias.',
    type: 'completed',
    category: 'system'
  });

  const approvalNotifs = db.getNotifications({ category: 'approval', admissionId: catAdmId });
  assert(approvalNotifs.length === 1 && approvalNotifs[0].category === 'approval', 'Filtro por category: approval funciona exatamente', approvalNotifs.length);

  const taskNotifsCaseInsensitive = db.getNotifications({ category: 'TASK', admissionId: catAdmId });
  assert(taskNotifsCaseInsensitive.length === 1 && taskNotifsCaseInsensitive[0].category === 'task', 'Filtro por category é insensível a maiúsculas/minúsculas');

  // =========================================================================
  // TESTE 4: FILTRO POR PRIORIDADE
  // =========================================================================
  console.log('\n--- TESTE 4: Filtro por Prioridade ---');
  const prioAdmId = 'adm-prio-' + Date.now();
  db.addNotification({
    title: 'Bloqueio Iminente',
    message: 'Prazo limite expirando em 2 horas.',
    type: 'pending',
    priority: 'urgent',
    admissionId: prioAdmId
  });
  db.addNotification({
    title: 'Alerta Regular',
    message: 'Documento recebido para análise normal.',
    type: 'document_uploaded',
    priority: 'low',
    admissionId: prioAdmId
  });

  const urgentNotifs = db.getNotifications({ priority: 'urgent', admissionId: prioAdmId });
  assert(urgentNotifs.length === 1 && urgentNotifs[0].priority === 'urgent', 'Filtro por prioridade urgent funciona', urgentNotifs.length);

  const lowNotifs = db.getNotifications({ priority: 'low', admissionId: prioAdmId });
  assert(lowNotifs.length === 1 && lowNotifs[0].priority === 'low', 'Filtro por prioridade low funciona', lowNotifs.length);

  // =========================================================================
  // TESTE 5: FILTRO POR STATUS DE LEITURA (READ / UNREAD)
  // =========================================================================
  console.log('\n--- TESTE 5: Filtro por Leitura (Read / Unread) ---');
  const readAdmId = 'adm-read-' + Date.now();
  const nUnread = db.addNotification({
    title: 'Não Lida Teste',
    message: 'Mensagem ainda não lida.',
    type: 'pending',
    admissionId: readAdmId
  });
  const nRead = db.addNotification({
    title: 'Lida Teste',
    message: 'Mensagem já lida.',
    type: 'completed',
    admissionId: readAdmId
  });
  if (nRead) {
    db.markNotificationRead(nRead.id);
  }

  const unreadOnlyList = db.getNotifications({ admissionId: readAdmId, unreadOnly: true });
  assert(unreadOnlyList.length === 1 && unreadOnlyList[0].id === nUnread?.id, 'Filtro unreadOnly: true retorna apenas a não lida');

  const readOnlyList = db.getNotifications({ admissionId: readAdmId, read: true });
  assert(readOnlyList.length === 1 && readOnlyList[0].id === nRead?.id, 'Filtro read: true retorna apenas a notificação marcada como lida');

  // =========================================================================
  // TESTE 6: DIRECIONAMENTO POR USUÁRIO (targetUserId) E SEGURANÇA
  // =========================================================================
  console.log('\n--- TESTE 6: Direcionamento por Usuário ---');
  const userAdmId = 'adm-user-' + Date.now();
  const nColabA = db.addNotification({
    title: 'Notificação Pessoal Colab A',
    message: 'Exclusivo para Colaborador A.',
    type: 'pending',
    targetUserId: 'user-colab-A',
    admissionId: userAdmId
  });
  const nColabB = db.addNotification({
    title: 'Notificação Pessoal Colab B',
    message: 'Exclusivo para Colaborador B.',
    type: 'pending',
    targetUserId: 'user-colab-B',
    admissionId: userAdmId
  });

  const listUserA = db.getNotifications({ targetUserId: 'user-colab-A', admissionId: userAdmId });
  assert(listUserA.length === 1 && listUserA[0].id === nColabA?.id, 'Filtro estrito por targetUserId user-colab-A retorna apenas a do Colab A');
  assert(!listUserA.some(n => n.id === nColabB?.id), 'Notificação do Colab B NÃO é retornada para o Colab A');

  // Regra 8: Modo de Audiência de Colaborador (Garantir isolamento do usuário comum)
  const audienceColabA = db.getNotifications({
    userId: 'user-colab-A',
    audience: true,
    admissionId: userAdmId
  });
  assert(audienceColabA.some(n => n.id === nColabA?.id), 'Modo audiência inclui notificação própria do usuário');
  assert(!audienceColabA.some(n => n.id === nColabB?.id), 'Modo audiência EXCLUI estritamente notificações de outro usuário');

  // =========================================================================
  // TESTE 7: DIRECIONAMENTO POR PERFIL / ROLE (targetRole) E SEGURANÇA
  // =========================================================================
  console.log('\n--- TESTE 7: Direcionamento por Perfil / Role ---');
  const roleAdmId = 'adm-role-' + Date.now();
  const nRh = db.addNotification({
    title: 'Ação Restrita de RH',
    message: 'Conferência interna de DP.',
    type: 'pending',
    targetRole: 'RH',
    admissionId: roleAdmId
  });
  const nFunc = db.addNotification({
    title: 'Aviso ao Funcionário',
    message: 'Aviso sobre benefícios.',
    type: 'completed',
    targetRole: 'FUNCIONARIO',
    admissionId: roleAdmId
  });

  const listRh = db.getNotifications({ targetRole: 'RH', admissionId: roleAdmId });
  assert(listRh.length === 1 && listRh[0].id === nRh?.id, 'Filtro por targetRole: RH retorna notificação de RH');
  assert(!listRh.some(n => n.id === nFunc?.id), 'Filtro por RH não inclui notificação exclusiva de FUNCIONARIO');

  // Regra 8: Usuário comum (FUNCIONARIO) não pode ver notificações restritas a RH
  const audienceFunc = db.getNotifications({
    role: 'FUNCIONARIO',
    audience: true,
    admissionId: roleAdmId
  });
  assert(audienceFunc.some(n => n.id === nFunc?.id), 'Funcionário vê sua notificação de perfil');
  assert(!audienceFunc.some(n => n.id === nRh?.id), 'Funcionário NUNCA vê notificações restritas a RH no modo audiência');

  // =========================================================================
  // TESTE 8: MARCAÇÃO COMO LIDA (UNITÁRIA E EM LOTE)
  // =========================================================================
  console.log('\n--- TESTE 8: Marcação como Lida ---');
  const readBatchAdmId = 'adm-batch-read-' + Date.now();
  const notif1 = db.addNotification({
    title: 'Lote 1',
    message: 'Msg 1',
    type: 'pending',
    targetUserId: 'user-bulk-01',
    admissionId: readBatchAdmId
  });
  const notif2 = db.addNotification({
    title: 'Lote 2',
    message: 'Msg 2',
    type: 'pending',
    targetUserId: 'user-bulk-01',
    admissionId: readBatchAdmId
  });
  const notifOther = db.addNotification({
    title: 'Outro Usuário',
    message: 'Msg outro',
    type: 'pending',
    targetUserId: 'user-bulk-02',
    admissionId: readBatchAdmId
  });

  // Marcação unitária
  if (notif1) {
    const success = db.markNotificationRead(notif1.id);
    assert(success === true, 'markNotificationRead retornou sucesso true');
    const updated = db.getNotifications({ admissionId: readBatchAdmId }).find(n => n.id === notif1.id);
    assert(updated?.read === true, 'Notificação 1 foi marcada como lida com sucesso');
  }

  // Marcação em lote filtrada por usuário (markAllNotificationsRead com userId)
  db.markAllNotificationsRead('user-bulk-01');
  const bulkUser1Notifs = db.getNotifications({ targetUserId: 'user-bulk-01', admissionId: readBatchAdmId });
  assert(bulkUser1Notifs.every(n => n.read === true), 'Todas as notificações de user-bulk-01 foram marcadas como lidas');

  const otherUserNotif = db.getNotifications({ targetUserId: 'user-bulk-02', admissionId: readBatchAdmId }).find(n => n.id === notifOther?.id);
  assert(otherUserNotif?.read === false, 'Notificação de user-bulk-02 NÃO foi afetada pela marcação de user-bulk-01');

  // =========================================================================
  // TESTE 9: DEDUPLICAÇÃO E IDEMPOTÊNCIA (dedupKey e sourceEvent)
  // =========================================================================
  console.log('\n--- TESTE 9: Deduplicação e Idempotência ---');
  const dedupKeyTest = 'notif-dedup-unique-key-' + Date.now();
  const firstAdd = db.addNotification({
    title: 'Evento Único Idempotente',
    message: 'Primeiro disparo do evento.',
    type: 'pending',
    dedupKey: dedupKeyTest
  });
  assert(Boolean(firstAdd), 'Primeiro disparo adicionou a notificação com sucesso');

  const countBeforeSecond = db.getNotifications().filter(n => n.dedupKey === dedupKeyTest).length;
  assert(countBeforeSecond === 1, 'Exatamente 1 notificação com a dedupKey antes da repetição');

  // Segundo disparo com a MESMA dedupKey
  const secondAdd = db.addNotification({
    title: 'Evento Único Idempotente - Repetição',
    message: 'Segundo disparo idêntico do evento.',
    type: 'pending',
    dedupKey: dedupKeyTest
  });
  assert(secondAdd?.id === firstAdd?.id, 'Segundo disparo retornou a notificação original existente (idempotência)');

  const countAfterSecond = db.getNotifications().filter(n => n.dedupKey === dedupKeyTest).length;
  assert(countAfterSecond === 1, 'Nenhuma notificação duplicada foi criada para a mesma dedupKey');

  // Deduplicação automática baseada em sourceEvent + contexto
  const sourceEventId = 'adm-se-' + Date.now();
  const seNotif1 = db.addNotification({
    title: 'Documento Obrigatório Rejeitado',
    message: 'O documento RG foi rejeitado.',
    type: 'pending',
    sourceEvent: 'automation_document_rejected',
    admissionId: sourceEventId,
    targetUserId: 'colab-se-1'
  });
  assert(Boolean(seNotif1?.dedupKey), 'Notificação com sourceEvent gerou dedupKey determinística automaticamente', seNotif1?.dedupKey);

  const seNotif2 = db.addNotification({
    title: 'Documento Obrigatório Rejeitado',
    message: 'O documento RG foi rejeitado repetido.',
    type: 'pending',
    sourceEvent: 'automation_document_rejected',
    admissionId: sourceEventId,
    targetUserId: 'colab-se-1'
  });
  assert(seNotif2?.id === seNotif1?.id, 'Repetição de evento com mesmo sourceEvent e contexto NÃO gera notificação duplicada');

  // =========================================================================
  // TESTE 10: CONCORRÊNCIA SIMULTÂNEA DE NOTIFICAÇÕES (RACE CONDITIONS)
  // =========================================================================
  console.log('\n--- TESTE 10: Concorrência Simultânea de Notificações ---');
  const concurrentKey = 'concurrent-dedup-' + Date.now();
  const concurrentCalls = Array.from({ length: 10 }, (_, i) => {
    return Promise.resolve().then(() => {
      return db.addNotification({
        title: 'Notificação Concorrente',
        message: `Disparo concorrente ${i}`,
        type: 'pending',
        dedupKey: concurrentKey
      });
    });
  });

  const results = await Promise.all(concurrentCalls);
  const createdConcurrent = results.filter(r => Boolean(r));
  assert(createdConcurrent.length > 0, 'Pelo menos um disparo concorrente obteve sucesso');

  const storedConcurrent = db.getNotifications().filter(n => n.dedupKey === concurrentKey);
  assert(storedConcurrent.length === 1, 'Mesmo sob concorrência simultânea, apenas 1 notificação foi persistida', storedConcurrent.length);

  // =========================================================================
  // TESTE 11: COMBINAÇÃO DE MÚLTIPLOS FILTROS
  // =========================================================================
  console.log('\n--- TESTE 11: Combinação de Múltiplos Filtros ---');
  const comboAdmId = 'adm-combo-' + Date.now();
  db.addNotification({
    title: 'Combo Match',
    message: 'Documento urgente não lido.',
    type: 'document_uploaded',
    category: 'document',
    priority: 'urgent',
    admissionId: comboAdmId
  });
  db.addNotification({
    title: 'Combo Mismatch Prio',
    message: 'Documento baixa prioridade.',
    type: 'document_uploaded',
    category: 'document',
    priority: 'low',
    admissionId: comboAdmId
  });
  const comboRead = db.addNotification({
    title: 'Combo Mismatch Read',
    message: 'Documento urgente já lido.',
    type: 'document_uploaded',
    category: 'document',
    priority: 'urgent',
    admissionId: comboAdmId
  });
  if (comboRead) {
    db.markNotificationRead(comboRead.id);
  }

  const multiFiltered = db.getNotifications({
    admissionId: comboAdmId,
    category: 'document',
    priority: 'urgent',
    unreadOnly: true
  });
  assert(multiFiltered.length === 1 && multiFiltered[0].title === 'Combo Match', 'Combinação de múltiplos filtros retornou apenas a correspondência exata');

  // =========================================================================
  // RESULTADO FINAL
  // =========================================================================
  console.log('\n======================================================');
  console.log(`TOTAL DE ASSERÇÕES BLOCO 6.7B: ${passedCount + failedCount}`);
  console.log(`PASSOU: ${passedCount}`);
  console.log(`FALHOU: ${failedCount}`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro fatal executando os testes do Bloco 6.7B:', err);
  process.exit(1);
});
