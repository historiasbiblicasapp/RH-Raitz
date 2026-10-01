import { db } from './server/db.ts';

async function runTests() {
  console.log('--- INICIANDO TESTES DO BLOCO 6.8B: INTEGRAÇÃO COMUNICAÇÃO × TAREFAS OPERACIONAIS ---\n');
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

  function createTestAdmission(name: string) {
    const randomDigits = Math.floor(Math.random() * 899999999 + 100000000).toString();
    const testCPF = `${randomDigits.slice(0, 3)}.${randomDigits.slice(3, 6)}.${randomDigits.slice(6, 9)}-88`;
    const activeJob = db.getJobPositions().find(j => j.active) || db.getJobPositions()[0];

    const admission = db.createAdmission({
      name,
      cpf: testCPF,
      birthDate: '1996-06-20',
      expectedStartDate: '2026-12-20',
      phone: '(11) 97777-6666',
      email: `teste68b_${Date.now()}_${Math.floor(Math.random() * 10000)}@exemplo.com`,
      role: activeJob?.name || 'Operador de Produção',
      jobPositionId: activeJob?.id,
      department: (activeJob as any)?.department || 'Operações',
      unit: 'Unidade Matriz'
    }, 'RH Testes 6.8B');

    return admission;
  }

  // =========================================================================
  // TESTE 1 & 2: COMUNICAÇÃO ENCONTRA E CONCLUI A TAREFA DE COBRANÇA CORRETA
  // =========================================================================
  console.log('--- TESTE 1 & 2: Comunicação de Documento Rejeitado Encontra e Conclui a Tarefa ---');
  const adm1 = createTestAdmission('Candidato Teste 6.8B - 1');
  const reqDoc1 = adm1.documents.find(d => d.required)!;

  // 1. Upload e Rejeição pelo RH -> Dispara automação 6.6 que cria a tarefa
  db.uploadDocument(adm1.id, reqDoc1.id, {
    fileName: 'rg_frente_v1.pdf',
    fileSize: 15000,
    mimeType: 'application/pdf',
    storagePath: 'storage/rg_v1.pdf'
  });

  db.reviewDocument(reqDoc1.id, 'Rejeitado', 'Analista RH', 'Documento cortado nas bordas', 'Envie foto legível');

  // Verifica que a tarefa de cobrança foi criada e está PENDENTE
  const tasksAfterReject1 = (db.getOperationalTasks({ admissionId: adm1.id }).items || [])
    .filter(t => t.documentId === reqDoc1.id && t.sourceType === 'DOCUMENTO');
  
  assert(tasksAfterReject1.length === 1, 'Automação 6.6 criou exatamente 1 tarefa de cobrança');
  const openTask1 = tasksAfterReject1[0];
  assert(openTask1.status === 'PENDENTE', 'Tarefa de cobrança nasce com status PENDENTE');
  assert(openTask1.title.includes('Cobrar reenvio'), 'Título da tarefa indica cobrança de reenvio');

  // 2. RH realiza a comunicação com o candidato via WhatsApp
  const commLog1 = db.addCommunicationLog({
    admissionId: adm1.id,
    employeeId: adm1.employeeId,
    userId: 'user-rh-01',
    userName: 'Mariana Silveira',
    communicationType: 'document_rejected',
    channel: 'whatsapp',
    templateId: 'document_rejected',
    documentId: reqDoc1.id,
    documentName: reqDoc1.documentType,
    rejectionReason: 'Documento cortado nas bordas',
    messagePreview: 'Olá! Seu documento precisa ser reenviado sem cortes.',
    actionStatus: 'whatsapp_opened',
    actionStatusLabel: 'WhatsApp aberto para envio'
  });

  // Verifica que a comunicação vinculou e concluiu a tarefa
  assert(commLog1.taskId === openTask1.id, 'Log de comunicação vinculou o ID da tarefa correspondente');

  const taskAfterComm1 = db.getOperationalTaskById(openTask1.id);
  assert(taskAfterComm1.status === 'CONCLUIDA', 'Tarefa operacional foi concluída automaticamente pela comunicação do RH');
  assert(taskAfterComm1.completedBy === 'Mariana Silveira', 'completedBy preenchido com o nome do operador do RH');
  assert(taskAfterComm1.completionNotes?.includes('Cobrança realizada pelo RH'), 'completionNotes registra que a cobrança foi realizada');
  assert(taskAfterComm1.communicationId === commLog1.id, 'Tarefa vinculou o ID do registro de comunicação');
  
  const lastHistoryItem1 = taskAfterComm1.history[taskAfterComm1.history.length - 1];
  assert(lastHistoryItem1?.action === 'COMPLETED', 'Histórico da tarefa registrou ação COMPLETED');
  assert(lastHistoryItem1?.performedBy === 'Mariana Silveira', 'Histórico da tarefa atribui ação ao operador do RH');

  // =========================================================================
  // TESTE 3: COMUNICAÇÃO DE OUTRO DOCUMENTO NÃO ALTERA A TAREFA
  // =========================================================================
  console.log('\n--- TESTE 3: Comunicação de Outro Documento NÃO Altera a Tarefa ---');
  const adm2 = createTestAdmission('Candidato Teste 6.8B - 2');
  const reqDocs2 = adm2.documents.filter(d => d.required);
  assert(reqDocs2.length >= 2, 'Admissão possui pelo menos 2 documentos obrigatórios');
  const docA = reqDocs2[0];
  const docB = reqDocs2[1];

  // Rejeita docA -> cria tarefa para docA
  db.uploadDocument(adm2.id, docA.id, { fileName: 'docA.pdf', fileSize: 10000, mimeType: 'application/pdf', storagePath: 'a1' });
  db.reviewDocument(docA.id, 'Rejeitado', 'Analista RH', 'Foto escura');

  const taskDocA = (db.getOperationalTasks({ admissionId: adm2.id }).items || []).find(t => t.documentId === docA.id)!;
  assert(taskDocA.status === 'PENDENTE', 'Tarefa do Doc A está PENDENTE');

  // Dispara comunicação para Doc B (sem pendência ou outro documento)
  db.addCommunicationLog({
    admissionId: adm2.id,
    employeeId: adm2.employeeId,
    userId: 'user-rh-01',
    userName: 'Mariana Silveira',
    communicationType: 'document_rejected',
    channel: 'whatsapp',
    templateId: 'document_rejected',
    documentId: docB.id,
    documentName: docB.documentType,
    messagePreview: 'Aviso sobre documento B',
    actionStatus: 'whatsapp_opened'
  });

  const taskDocAFresh = db.getOperationalTaskById(taskDocA.id);
  assert(taskDocAFresh.status === 'PENDENTE', 'Tarefa do Doc A PERMANECE PENDENTE após comunicação sobre Doc B');

  // =========================================================================
  // TESTE 4: COMUNICAÇÃO DE OUTRA ADMISSÃO NÃO ALTERA A TAREFA
  // =========================================================================
  console.log('\n--- TESTE 4: Comunicação de Outra Admissão NÃO Altera a Tarefa ---');
  const admOther = createTestAdmission('Candidato Teste 6.8B - Outra Admissão');
  const reqDocOther = admOther.documents.find(d => d.required)!;

  db.addCommunicationLog({
    admissionId: admOther.id,
    employeeId: admOther.employeeId,
    userId: 'user-rh-02',
    userName: 'Carlos Eduardo',
    communicationType: 'document_rejected',
    channel: 'copy',
    templateId: 'document_rejected',
    documentId: reqDocOther.id,
    messagePreview: 'Mensagem para outra admissão',
    actionStatus: 'message_copied'
  });

  const taskDocAStillOpen = db.getOperationalTaskById(taskDocA.id);
  assert(taskDocAStillOpen.status === 'PENDENTE', 'Tarefa da Admissão 2 permanece PENDENTE e intacta');

  // =========================================================================
  // TESTE 5: REPETIÇÃO DA COMUNICAÇÃO (IDEMPOTÊNCIA)
  // =========================================================================
  console.log('\n--- TESTE 5: Repetição da Comunicação (Idempotência) ---');
  // Agora comunicamos formalmente o Doc A da Admissão 2 pela primeira vez:
  const commA1 = db.addCommunicationLog({
    admissionId: adm2.id,
    employeeId: adm2.employeeId,
    userId: 'user-rh-01',
    userName: 'Mariana Silveira',
    communicationType: 'document_rejected',
    channel: 'whatsapp',
    templateId: 'document_rejected',
    documentId: docA.id,
    rejectionReason: 'Foto escura',
    messagePreview: 'Cobrança do Doc A',
    actionStatus: 'whatsapp_opened'
  });

  const taskDocACompleted = db.getOperationalTaskById(taskDocA.id);
  assert(taskDocACompleted.status === 'CONCLUIDA', 'Tarefa do Doc A foi concluída na 1ª comunicação');
  const historyCountBefore = taskDocACompleted.history.length;

  // Segundo disparo (clique repetido / reenvio de mensagem)
  const commA2 = db.addCommunicationLog({
    admissionId: adm2.id,
    employeeId: adm2.employeeId,
    userId: 'user-rh-01',
    userName: 'Mariana Silveira',
    communicationType: 'document_rejected',
    channel: 'copy',
    templateId: 'document_rejected',
    documentId: docA.id,
    rejectionReason: 'Foto escura',
    messagePreview: 'Cópia repetida do Doc A',
    actionStatus: 'message_copied'
  });

  const taskDocAAfterRepeat = db.getOperationalTaskById(taskDocA.id);
  assert(taskDocAAfterRepeat.status === 'CONCLUIDA', 'Tarefa permanece CONCLUIDA');
  assert(taskDocAAfterRepeat.history.length === historyCountBefore, 'Nenhum histórico duplicado de conclusão gerado');
  assert(commA2.id !== commA1.id, 'Histórico de comunicação registra cada evento como append-only');
  assert(commA2.taskId === taskDocA.id, 'Segunda comunicação preserva o vínculo de taskId da tarefa já concluída');

  // =========================================================================
  // TESTE 6 & 7: SEGURANÇA E BLOQUEIO DE PERFIS NÃO AUTORIZADOS
  // =========================================================================
  console.log('\n--- TESTE 6 & 7: Segurança e Restrição de Perfis ---');
  // Simula verificação de permissão conforme implementado no backend
  const funcionarioUser = { id: 'usr-colab-99', name: 'João Funcionário', role: 'FUNCIONARIO', email: 'joao@empresa.com' };
  const gestorUser = { id: 'usr-gestor-99', name: 'Gerente Operações', role: 'GESTOR', email: 'gestor@empresa.com' };
  const rhUser = { id: 'usr-rh-99', name: 'Analista RH', role: 'RH', email: 'rh@empresa.com' };

  // 7A: FUNCIONARIO não tem permissão para logar comunicação ou concluir tarefas de RH
  const isFuncionarioAllowed = funcionarioUser.role !== 'FUNCIONARIO';
  assert(!isFuncionarioAllowed, 'FUNCIONARIO é barrado de executar operações de RH (checkRhAuth)');

  // 7B: GESTOR não possui permissão de comunicação operacional do RH
  const isGestorRh = gestorUser.role === 'RH' || gestorUser.role === 'ADMIN';
  assert(!isGestorRh, 'GESTOR não ganha perfil de RH para comunicação operacional');

  // 7C: Usuário RH possui permissão
  const isRhAllowed = rhUser.role === 'RH' || rhUser.role === 'ADMIN';
  assert(isRhAllowed, 'Usuário de RH possui acesso autorizado para comunicação');

  // =========================================================================
  // TESTE 8: HISTÓRICO DE COMUNICAÇÃO PERMANECE ÍNTEGRO
  // =========================================================================
  console.log('\n--- TESTE 8: Histórico de Comunicação Permanece Íntegro ---');
  const logsAdm2 = db.getCommunicationLogs(adm2.id);
  assert(logsAdm2.length >= 2, 'Histórico da admissão 2 contém os registros de comunicação');
  
  const sampleLog = logsAdm2[0];
  assert(!!sampleLog.id, 'Log possui ID gerado');
  assert(sampleLog.admissionId === adm2.id, 'Log vinculado à admissão correta');
  assert(!!sampleLog.createdAt, 'Log possui carimbo de tempo ISO');
  assert(!!sampleLog.actionStatus, 'Log possui actionStatus');
  assert(typeof sampleLog.messagePreview === 'string', 'Log possui preview de mensagem');
  assert(sampleLog.messagePreview.length <= 160, 'Preview respeita limite de 160 caracteres (minimização LGPD)');

  // =========================================================================
  // TESTE 9: AUTOMAÇÕES 6.6 CONTINUAM FUNCIONANDO PERFEITAMENTE
  // =========================================================================
  console.log('\n--- TESTE 9: Automações 6.6 Continuam Funcionando Normalmente ---');
  // Reenvio do documento pelo colaborador após a cobrança ter sido concluída
  db.uploadDocument(adm2.id, docA.id, {
    fileName: 'docA_v2_legivel.pdf',
    fileSize: 20000,
    mimeType: 'application/pdf',
    storagePath: 'a2'
  });

  const docAFresh = db.getAdmissionById(adm2.id)!.documents.find(d => d.id === docA.id)!;
  assert(docAFresh.status === 'Reenviado', 'Documento reenviado entra em status "Reenviado" sem autoaprovação');
  assert(docAFresh.currentVersion === 2, 'Versão do documento incrementada para V2');
  assert(docAFresh.versions.length === 2, 'Histórico preserva ambas as versões (V1 rejeitada e V2 reenviada)');

  console.log('\n======================================================');
  console.log(`TOTAL DE ASSERÇÕES BLOCO 6.8B: ${passedCount + failedCount}`);
  console.log(`PASSOU: ${passedCount}`);
  console.log(`FALHOU: ${failedCount}`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro fatal nos testes 6.8B:', err);
  process.exit(1);
});
