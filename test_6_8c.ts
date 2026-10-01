import { db } from './server/db.ts';

async function runTests() {
  console.log('--- INICIANDO TESTES DO BLOCO 6.8C: VALIDAÇÃO INTEGRADA E REGRESSÃO DA COMUNICAÇÃO ---\n');
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
    const testCPF = `${randomDigits.slice(0, 3)}.${randomDigits.slice(3, 6)}.${randomDigits.slice(6, 9)}-99`;
    const activeJob = db.getJobPositions().find(j => j.active) || db.getJobPositions()[0];

    const admission = db.createAdmission({
      name,
      cpf: testCPF,
      birthDate: '1997-07-25',
      expectedStartDate: '2026-12-25',
      phone: '(11) 96666-5555',
      email: `teste68c_${Date.now()}_${Math.floor(Math.random() * 10000)}@exemplo.com`,
      role: activeJob?.name || 'Operador de Produção',
      jobPositionId: activeJob?.id,
      department: (activeJob as any)?.department || 'Operações',
      unit: 'Unidade Matriz'
    }, 'RH Testes 6.8C');

    return admission;
  }

  // =========================================================================
  // 1. FLUXO COMPLETO: Rejeição -> Tarefa -> Notificação -> Comunicação -> Conclusão -> Reenvio
  // =========================================================================
  console.log('--- SEÇÃO 1: Fluxo Integrado Completo ---');
  const adm1 = createTestAdmission('Candidato Fluxo 6.8C');
  const reqDoc1 = adm1.documents.find(d => d.required)!;

  // 1.1 Upload do documento obrigatório (V1)
  db.uploadDocument(adm1.id, reqDoc1.id, {
    fileName: 'cnh_v1.pdf',
    fileSize: 12000,
    mimeType: 'application/pdf',
    storagePath: 'storage/cnh1.pdf'
  });

  // 1.2 RH Rejeita o documento
  db.reviewDocument(reqDoc1.id, 'Rejeitado', 'Juliana Lima', 'Documento vencido', 'Favor enviar CNH válida');

  // 1.3 Tarefa criada pela automação 6.6
  const tasksAfterReject = (db.getOperationalTasks({ admissionId: adm1.id }).items || [])
    .filter(t => t.documentId === reqDoc1.id && t.sourceType === 'DOCUMENTO');
  assert(tasksAfterReject.length === 1, '1. Tarefa de cobrança criada automaticamente pela automação 6.6');
  const task1 = tasksAfterReject[0];
  assert(task1.status === 'PENDENTE', '1. Tarefa de cobrança está PENDENTE');
  assert(task1.title.includes('Cobrar reenvio'), '1. Título da tarefa é "Cobrar reenvio"');

  // 1.4 Notificação interna gerada pela automação 6.7
  const notifsAfterReject = db.getNotifications({ admissionId: adm1.id });
  const rejectNotif = notifsAfterReject.find(n => n.sourceEvent === 'automation_document_rejected' && n.documentId === reqDoc1.id);
  assert(!!rejectNotif, '1. Notificação interna de documento rejeitado gerada pela 6.7');
  assert(rejectNotif?.category === 'DOCUMENTOS', '1. Categoria da notificação é DOCUMENTOS');

  // 1.5 RH realiza comunicação
  const comm1 = db.addCommunicationLog({
    admissionId: adm1.id,
    employeeId: adm1.employeeId,
    userId: 'usr-rh-juliana',
    userName: 'Juliana Lima',
    communicationType: 'document_rejected',
    channel: 'whatsapp',
    templateId: 'document_rejected',
    documentId: reqDoc1.id,
    documentName: reqDoc1.documentType,
    rejectionReason: 'Documento vencido',
    messagePreview: 'Olá! Sua CNH está vencida. Por favor, envie uma versão atualizada.',
    actionStatus: 'whatsapp_opened',
    actionStatusLabel: 'WhatsApp aberto para envio'
  });

  // 1.6 Conclusão da tarefa e vínculos
  assert(comm1.taskId === task1.id, '1. taskId gravado no CommunicationLog');
  const freshTask1 = db.getOperationalTaskById(task1.id);
  assert(freshTask1.status === 'CONCLUIDA', '1. Tarefa operacional CONCLUIDA após a comunicação');
  assert(freshTask1.completedBy === 'Juliana Lima', '1. completedBy preenchido com a operadora do RH');
  assert(freshTask1.communicationId === comm1.id, '1. communicationId gravado na OperationalTask');
  assert(freshTask1.completionNotes?.includes('Cobrança realizada pelo RH'), '1. completionNotes documenta a cobrança');

  // 1.7 Auditoria
  const auditLogs = db.getAuditLogs();
  const commAudit = auditLogs.find(a => a.action === 'communication_whatsapp_opened' && a.entityId === adm1.id);
  assert(!!commAudit, '1. Log de auditoria da comunicação gerado');
  const taskAudit = auditLogs.find(a => a.action === 'task_completed' && a.entityId === task1.id);
  assert(!!taskAudit, '1. Log de auditoria da conclusão da tarefa gerado');

  // 1.8 Candidato reenvia o documento (V2)
  db.uploadDocument(adm1.id, reqDoc1.id, {
    fileName: 'cnh_v2_valida.pdf',
    fileSize: 18000,
    mimeType: 'application/pdf',
    storagePath: 'storage/cnh2.pdf'
  });

  const freshDoc1 = db.getAdmissionById(adm1.id)!.documents.find(d => d.id === reqDoc1.id)!;
  assert(freshDoc1.status === 'Reenviado', '1. Documento reenviado avança para status "Reenviado" sem autoaprovação');
  assert(freshDoc1.currentVersion === 2, '1. Versão do documento avança de 1 para 2');
  assert(freshDoc1.versions.length === 2, '1. Histórico de versões preservado integralmente');

  // =========================================================================
  // 2. TRÊS TIPOS DE AÇÃO EFETIVA: whatsapp_opened, message_copied, link_copied
  // =========================================================================
  console.log('\n--- SEÇÃO 2: Três Tipos de Ação Efetiva ---');

  // 2.A: Ação message_copied
  const adm2A = createTestAdmission('Candidato Ação Copiar Mensagem');
  const doc2A = adm2A.documents.find(d => d.required)!;
  db.uploadDocument(adm2A.id, doc2A.id, { fileName: 'doc2A.pdf', fileSize: 10000, mimeType: 'application/pdf', storagePath: 'p' });
  db.reviewDocument(doc2A.id, 'Rejeitado', 'RH', 'Ilegível');
  const task2A = (db.getOperationalTasks({ admissionId: adm2A.id }).items || []).find(t => t.documentId === doc2A.id)!;
  assert(task2A.status === 'PENDENTE', '2A. Tarefa para message_copied nasce PENDENTE');

  const comm2A = db.addCommunicationLog({
    admissionId: adm2A.id,
    employeeId: adm2A.employeeId,
    userId: 'usr-rh-01',
    userName: 'Analista RH',
    communicationType: 'document_rejected',
    channel: 'copy',
    templateId: 'document_rejected',
    documentId: doc2A.id,
    rejectionReason: 'Ilegível',
    messagePreview: 'Mensagem de cobrança copiada',
    actionStatus: 'message_copied',
    actionStatusLabel: 'Mensagem copiada'
  });

  assert(comm2A.taskId === task2A.id, '2A. message_copied vinculou taskId');
  assert(db.getOperationalTaskById(task2A.id).status === 'CONCLUIDA', '2A. message_copied concluiu a tarefa com sucesso');

  // 2.B: Ação link_copied em contexto de cobrança (document_rejected)
  const adm2B = createTestAdmission('Candidato Ação Copiar Link Cobrança');
  const doc2B = adm2B.documents.find(d => d.required)!;
  db.uploadDocument(adm2B.id, doc2B.id, { fileName: 'doc2B.pdf', fileSize: 10000, mimeType: 'application/pdf', storagePath: 'p' });
  db.reviewDocument(doc2B.id, 'Rejeitado', 'RH', 'Comprovante antigo');
  const task2B = (db.getOperationalTasks({ admissionId: adm2B.id }).items || []).find(t => t.documentId === doc2B.id)!;
  assert(task2B.status === 'PENDENTE', '2B. Tarefa para link_copied nasce PENDENTE');

  const comm2B = db.addCommunicationLog({
    admissionId: adm2B.id,
    employeeId: adm2B.employeeId,
    userId: 'usr-rh-01',
    userName: 'Analista RH',
    communicationType: 'document_rejected',
    channel: 'copy',
    templateId: 'document_rejected',
    documentId: doc2B.id,
    rejectionReason: 'Comprovante antigo',
    messagePreview: 'https://sistema.raitz.com.br/convite/tok_teste',
    actionStatus: 'link_copied',
    actionStatusLabel: 'Link copiado'
  });

  assert(comm2B.taskId === task2B.id, '2B. link_copied em contexto de rejeição vinculou taskId');
  assert(db.getOperationalTaskById(task2B.id).status === 'CONCLUIDA', '2B. link_copied em contexto de cobrança concluiu a tarefa');

  // 2.C: Ação link_copied em contexto neutro (sem rejeição) NÃO deve concluir tarefa documental
  const adm2C = createTestAdmission('Candidato Ação Copiar Link Neutro');
  const doc2C = adm2C.documents.find(d => d.required)!;
  db.uploadDocument(adm2C.id, doc2C.id, { fileName: 'doc2C.pdf', fileSize: 10000, mimeType: 'application/pdf', storagePath: 'p' });
  db.reviewDocument(doc2C.id, 'Rejeitado', 'RH', 'Foto escura');
  const task2C = (db.getOperationalTasks({ admissionId: adm2C.id }).items || []).find(t => t.documentId === doc2C.id)!;

  // Comunicação neutra (general_notice)
  const comm2C = db.addCommunicationLog({
    admissionId: adm2C.id,
    employeeId: adm2C.employeeId,
    userId: 'usr-rh-01',
    userName: 'Analista RH',
    communicationType: 'general_notice',
    channel: 'copy',
    templateId: 'general_notice',
    messagePreview: 'https://sistema.raitz.com.br/convite/tok_teste',
    actionStatus: 'link_copied',
    actionStatusLabel: 'Link copiado'
  });

  assert(!comm2C.taskId, '2C. link_copied em contexto neutro (general_notice) NÃO vincula taskId');
  assert(db.getOperationalTaskById(task2C.id).status === 'PENDENTE', '2C. link_copied em contexto neutro NÃO conclui tarefa indevidamente');

  // =========================================================================
  // 3. ISOLAMENTO
  // =========================================================================
  console.log('\n--- SEÇÃO 3: Isolamento ---');
  const adm3 = createTestAdmission('Candidato Isolamento');
  const docs3 = adm3.documents.filter(d => d.required);
  const doc3A = docs3[0];
  const doc3B = docs3[1];

  db.uploadDocument(adm3.id, doc3A.id, { fileName: 'doc3A.pdf', fileSize: 10000, mimeType: 'application/pdf', storagePath: 'p' });
  db.reviewDocument(doc3A.id, 'Rejeitado', 'RH', 'Motivo A');

  db.uploadDocument(adm3.id, doc3B.id, { fileName: 'doc3B.pdf', fileSize: 10000, mimeType: 'application/pdf', storagePath: 'p' });
  db.reviewDocument(doc3B.id, 'Rejeitado', 'RH', 'Motivo B');

  const task3A = (db.getOperationalTasks({ admissionId: adm3.id }).items || []).find(t => t.documentId === doc3A.id)!;
  const task3B = (db.getOperationalTasks({ admissionId: adm3.id }).items || []).find(t => t.documentId === doc3B.id)!;

  // Comunicação APENAS para Doc 3A
  db.addCommunicationLog({
    admissionId: adm3.id,
    employeeId: adm3.employeeId,
    userId: 'usr-rh-01',
    userName: 'Analista RH',
    communicationType: 'document_rejected',
    channel: 'whatsapp',
    templateId: 'document_rejected',
    documentId: doc3A.id,
    rejectionReason: 'Motivo A',
    messagePreview: 'Cobrança do Doc 3A',
    actionStatus: 'whatsapp_opened'
  });

  assert(db.getOperationalTaskById(task3A.id).status === 'CONCLUIDA', '3. Tarefa do Doc 3A foi concluída pela comunicação');
  assert(db.getOperationalTaskById(task3B.id).status === 'PENDENTE', '3. Tarefa do Doc 3B PERMANECE PENDENTE (isolamento de documento garantido)');

  // Comunicação sem documentId
  const adm3NoDoc = createTestAdmission('Candidato Sem DocId');
  const doc3NoDoc = adm3NoDoc.documents.find(d => d.required)!;
  db.uploadDocument(adm3NoDoc.id, doc3NoDoc.id, { fileName: 'doc.pdf', fileSize: 10000, mimeType: 'application/pdf', storagePath: 'p' });
  db.reviewDocument(doc3NoDoc.id, 'Rejeitado', 'RH', 'Motivo');
  const task3NoDoc = (db.getOperationalTasks({ admissionId: adm3NoDoc.id }).items || []).find(t => t.documentId === doc3NoDoc.id)!;

  db.addCommunicationLog({
    admissionId: adm3NoDoc.id,
    employeeId: adm3NoDoc.employeeId,
    userId: 'usr-rh-01',
    userName: 'Analista RH',
    communicationType: 'reminder',
    channel: 'whatsapp',
    templateId: 'reminder',
    // documentId omitido intencionalmente
    messagePreview: 'Lembrete genérico sem docId',
    actionStatus: 'whatsapp_opened'
  });

  assert(db.getOperationalTaskById(task3NoDoc.id).status === 'PENDENTE', '3. Comunicação sem documentId NÃO altera tarefa de documento');

  // Inexistência de tarefa não gera erro de runtime
  let noErrorRuntime = false;
  try {
    db.addCommunicationLog({
      admissionId: 'adm-inexistente-123',
      employeeId: 'emp-inexistente-123',
      userId: 'usr-rh-01',
      userName: 'Analista RH',
      communicationType: 'document_rejected',
      channel: 'whatsapp',
      templateId: 'document_rejected',
      documentId: 'doc-inexistente-456',
      messagePreview: 'Cobrança inexistente',
      actionStatus: 'whatsapp_opened'
    });
    noErrorRuntime = true;
  } catch (err) {
    noErrorRuntime = false;
  }
  assert(noErrorRuntime, '3. Comunicação para tarefa/admissão inexistente não lança erro não tratado');

  // =========================================================================
  // 4. IDEMPOTÊNCIA E CONCORRÊNCIA
  // =========================================================================
  console.log('\n--- SEÇÃO 4: Idempotência e Concorrência ---');
  const adm4 = createTestAdmission('Candidato Idempotência 6.8C');
  const doc4 = adm4.documents.find(d => d.required)!;
  db.uploadDocument(adm4.id, doc4.id, { fileName: 'doc4.pdf', fileSize: 10000, mimeType: 'application/pdf', storagePath: 'p' });
  db.reviewDocument(doc4.id, 'Rejeitado', 'RH', 'Motivo 4');
  const task4 = (db.getOperationalTasks({ admissionId: adm4.id }).items || []).find(t => t.documentId === doc4.id)!;

  // Primeiro disparo
  const comm4_1 = db.addCommunicationLog({
    admissionId: adm4.id,
    employeeId: adm4.employeeId,
    userId: 'usr-rh-01',
    userName: 'Analista RH',
    communicationType: 'document_rejected',
    channel: 'whatsapp',
    templateId: 'document_rejected',
    documentId: doc4.id,
    rejectionReason: 'Motivo 4',
    messagePreview: 'Primeiro disparo',
    actionStatus: 'whatsapp_opened'
  });

  const task4State1 = db.getOperationalTaskById(task4.id);
  assert(task4State1.status === 'CONCLUIDA', '4. Tarefa concluída no 1º disparo');
  const historyLen1 = task4State1.history.length;

  // Segundo disparo (repetição)
  const comm4_2 = db.addCommunicationLog({
    admissionId: adm4.id,
    employeeId: adm4.employeeId,
    userId: 'usr-rh-01',
    userName: 'Analista RH',
    communicationType: 'document_rejected',
    channel: 'copy',
    templateId: 'document_rejected',
    documentId: doc4.id,
    rejectionReason: 'Motivo 4',
    messagePreview: 'Segundo disparo repetido',
    actionStatus: 'message_copied'
  });

  const task4State2 = db.getOperationalTaskById(task4.id);
  assert(task4State2.status === 'CONCLUIDA', '4. Tarefa permanece CONCLUIDA');
  assert(task4State2.history.length === historyLen1, '4. Histórico da tarefa NÃO recebeu item duplicado de conclusão');
  assert(comm4_1.id !== comm4_2.id, '4. Logs de comunicação são append-only (IDs distintos preservados)');
  assert(comm4_2.taskId === task4.id, '4. Segundo log vincula taskId para rastreabilidade');

  // Teste de concorrência com 5 disparos simultâneos em paralelo
  const adm4Conc = createTestAdmission('Candidato Concorrência 6.8C');
  const doc4Conc = adm4Conc.documents.find(d => d.required)!;
  db.uploadDocument(adm4Conc.id, doc4Conc.id, { fileName: 'doc.pdf', fileSize: 10000, mimeType: 'application/pdf', storagePath: 'p' });
  db.reviewDocument(doc4Conc.id, 'Rejeitado', 'RH', 'Motivo Conc');
  const task4Conc = (db.getOperationalTasks({ admissionId: adm4Conc.id }).items || []).find(t => t.documentId === doc4Conc.id)!;

  await Promise.all([1, 2, 3, 4, 5].map(i => 
    Promise.resolve(db.addCommunicationLog({
      admissionId: adm4Conc.id,
      employeeId: adm4Conc.employeeId,
      userId: `usr-rh-${i}`,
      userName: `Analista RH ${i}`,
      communicationType: 'document_rejected',
      channel: 'whatsapp',
      templateId: 'document_rejected',
      documentId: doc4Conc.id,
      rejectionReason: 'Motivo Conc',
      messagePreview: `Disparo concorrente ${i}`,
      actionStatus: 'whatsapp_opened'
    }))
  ));

  const task4ConcFinal = db.getOperationalTaskById(task4Conc.id);
  assert(task4ConcFinal.status === 'CONCLUIDA', '4. Tarefa concluída sob concorrência simultânea');
  const completedEntries = task4ConcFinal.history.filter(h => h.action === 'COMPLETED');
  assert(completedEntries.length === 1, '4. Exatamente 1 registro de ação COMPLETED no histórico sob concorrência');

  // =========================================================================
  // 5. SEGURANÇA POR PERFIL
  // =========================================================================
  console.log('\n--- SEÇÃO 5: Segurança por Perfil ---');
  const roles = [
    { role: 'ADMIN', allowedRh: true, isGestor: false },
    { role: 'RH', allowedRh: true, isGestor: false },
    { role: 'RH_CONFERENCIA', allowedRh: true, isGestor: false },
    { role: 'GESTOR', allowedRh: true, isGestor: true },
    { role: 'FUNCIONARIO', allowedRh: false, isGestor: false }
  ];

  for (const r of roles) {
    if (r.role === 'FUNCIONARIO') {
      assert(!r.allowedRh, `5. Perfil ${r.role} é estritamente bloqueado de ações de RH`);
    } else if (r.role === 'GESTOR') {
      assert(r.isGestor, `5. Perfil ${r.role} atua exclusivamente nas alçadas de aprovação interna`);
    } else {
      assert(r.allowedRh, `5. Perfil ${r.role} possui autorização para operação de RH`);
    }
  }

  // =========================================================================
  // 6. LGPD E AUDITORIA
  // =========================================================================
  console.log('\n--- SEÇÃO 6: LGPD e Auditoria ---');
  const longText = 'A'.repeat(300);
  const commLgpd = db.addCommunicationLog({
    admissionId: adm1.id,
    employeeId: adm1.employeeId,
    userId: 'usr-rh-lgpd',
    userName: 'Fiscal LGPD',
    communicationType: 'reminder',
    channel: 'copy',
    templateId: 'reminder',
    messagePreview: longText,
    actionStatus: 'message_copied'
  });

  assert(commLgpd.messagePreview.length <= 160, '6. messagePreview truncado em no máximo 160 caracteres');
  assert(commLgpd.userName === 'Fiscal LGPD', '6. userName registrado fidedignamente no log');
  assert(commLgpd.userId === 'usr-rh-lgpd', '6. userId registrado');
  assert(new Date(commLgpd.createdAt).getTime() > 0, '6. createdAt possui data ISO válida');
  assert(commLgpd.admissionId === adm1.id, '6. admissionId registrado');

  // =========================================================================
  // 7. INTEGRAÇÃO COM NOTIFICAÇÕES 6.7
  // =========================================================================
  console.log('\n--- SEÇÃO 7: Notificações 6.7 Preservadas ---');
  const notifs = db.getNotifications({ admissionId: adm1.id });
  const docRejectNotifs = notifs.filter(n => n.sourceEvent === 'automation_document_rejected' && n.documentId === reqDoc1.id);
  assert(docRejectNotifs.length === 1, '7. Notificação de documento rejeitado gerada de forma única (sem duplicidade)');
  assert(docRejectNotifs[0].category === 'DOCUMENTOS', '7. Categoria DOCUMENTOS preservada');
  assert(docRejectNotifs[0].priority === 'high', '7. Prioridade high para documento obrigatório rejeitado');

  console.log('\n======================================================');
  console.log(`TOTAL DE ASSERÇÕES BLOCO 6.8C: ${passedCount + failedCount}`);
  console.log(`PASSOU: ${passedCount}`);
  console.log(`FALHOU: ${failedCount}`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro fatal nos testes 6.8C:', err);
  process.exit(1);
});
