import { db } from './server/db.ts';

async function runTests() {
  console.log('--- INICIANDO TESTES DO BLOCO 6.7C: INTEGRAÇÃO DAS AUTOMAÇÕES COM NOTIFICAÇÕES ---\n');
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

  function createTestAdmission(name: string, approvalRequired: boolean = true, assignedUserId?: string, responsibleRole: any = 'GESTOR') {
    const randomDigits = Math.floor(Math.random() * 899999999 + 100000000).toString();
    const testCPF = `${randomDigits.slice(0, 3)}.${randomDigits.slice(3, 6)}.${randomDigits.slice(6, 9)}-77`;
    const activeJob = db.getJobPositions().find(j => j.active) || db.getJobPositions()[0];

    const admission = db.createAdmission({
      name,
      cpf: testCPF,
      birthDate: '1995-05-15',
      expectedStartDate: '2026-12-15',
      phone: '(11) 98888-7777',
      email: `teste67c_${Date.now()}_${Math.floor(Math.random() * 10000)}@exemplo.com`,
      role: activeJob?.name || 'Operador de Produção',
      jobPositionId: activeJob?.id,
      department: (activeJob as any)?.department || 'Operações',
      unit: 'Unidade Matriz'
    }, 'RH Testes 6.7C');

    if (admission.approval) {
      admission.approval.required = approvalRequired;
      admission.approval.assignedUserId = assignedUserId;
      admission.approval.responsibleRole = responsibleRole;
      if (!approvalRequired) {
        admission.approval.status = 'APROVADA';
      }
    }

    return admission;
  }

  // =========================================================================
  // TESTE 1: REJEIÇÃO → NOTIFICAÇÃO
  // =========================================================================
  console.log('--- TESTE 1: Rejeição de Documento Gera Notificação Interna ---');
  const adm1 = createTestAdmission('Candidato Rejeicao 67C', true);
  const reqDoc1 = adm1.documents.find(d => d.required)!;

  // Realiza upload inicial
  db.uploadDocument(adm1.id, reqDoc1.id, {
    fileName: 'doc_teste1.pdf',
    fileSize: 10240,
    mimeType: 'application/pdf',
    storagePath: '/uploads/doc_teste1.pdf'
  });

  // Rejeita o documento pelo RH
  db.reviewDocument(reqDoc1.id, 'Rejeitado', 'Analista RH Testes', 'Documento ilegível ou rasurado', 'Por favor envie foto nítida do documento original.');

  // Consulta notificações geradas para este documento e admissão
  const notifsRej = db.getNotifications({
    admissionId: adm1.id,
    documentId: reqDoc1.id,
    category: 'DOCUMENTOS'
  });

  assert(notifsRej.length >= 1, 'Notificação interna gerada após rejeição de documento', notifsRej.length);
  const rejNotif = notifsRej.find(n => n.sourceEvent === 'automation_document_rejected');
  assert(Boolean(rejNotif), 'Notificação possui sourceEvent = "automation_document_rejected"');
  assert(rejNotif?.category === 'DOCUMENTOS', 'Categoria da notificação é "DOCUMENTOS"');
  assert(rejNotif?.documentId === reqDoc1.id, 'Notificação contém documentId correto', rejNotif?.documentId);
  assert(rejNotif?.admissionId === adm1.id, 'Notificação contém admissionId correto');
  assert(rejNotif?.priority === 'high', 'Documento obrigatório rejeitado possui prioridade "high"');
  assert(rejNotif?.message.includes('possui pendência/rejeição'), 'Mensagem informa pendência/rejeição do documento');
  assert(rejNotif?.dedupKey === `notif:automation_document_rejected:${adm1.id}:${reqDoc1.id}:v1`, 'dedupKey determinística gravada com sucesso', rejNotif?.dedupKey);
  assert(rejNotif?.targetRole === 'RH' || Boolean(rejNotif?.targetUserId), 'Destinatário definido adequadamente (RH ou usuário responsável)');

  // =========================================================================
  // TESTE 2: REENVIO → NOTIFICAÇÃO
  // =========================================================================
  console.log('\n--- TESTE 2: Reenvio de Documento Gera Notificação Interna ---');
  // Colaborador reenvia nova versão do documento rejeitado
  db.uploadDocument(adm1.id, reqDoc1.id, {
    fileName: 'doc_teste1_v2.pdf',
    fileSize: 12000,
    mimeType: 'application/pdf',
    storagePath: '/uploads/doc_teste1_v2.pdf'
  });

  const notifsResub = db.getNotifications({
    admissionId: adm1.id,
    documentId: reqDoc1.id,
    category: 'DOCUMENTOS'
  });

  const resubNotif = notifsResub.find(n => n.sourceEvent === 'automation_document_resubmitted');
  assert(Boolean(resubNotif), 'Notificação interna gerada após reenvio de documento (sourceEvent: automation_document_resubmitted)');
  assert(resubNotif?.category === 'DOCUMENTOS', 'Categoria do reenvio é "DOCUMENTOS"');
  assert(resubNotif?.message.includes('Existe novo documento para conferência'), 'Mensagem informa novo documento para conferência');
  assert(resubNotif?.targetRole === 'RH' || Boolean(resubNotif?.targetUserId), 'Destinatário da notificação de reenvio é RH / responsável');
  assert(resubNotif?.dedupKey === `notif:automation_document_resubmitted:${adm1.id}:${reqDoc1.id}:v2`, 'dedupKey determinística de reenvio gerada com versão V2', resubNotif?.dedupKey);

  // =========================================================================
  // TESTE 3: TODOS OS DOCUMENTOS OBRIGATÓRIOS APROVADOS → NOTIFICAÇÃO DE APROVAÇÃO
  // =========================================================================
  console.log('\n--- TESTE 3: Aprovação de Todos os Obrigatórios Gera Notificação para Próxima Aprovação ---');
  const gestorUser = db.getUsers().find(u => u.role === 'GESTOR') || db.getUsers()[0];
  const adm3 = createTestAdmission('Candidato Aprovacao 67C', true, gestorUser.id, 'GESTOR');
  const reqDocs3 = adm3.documents.filter(d => d.required);

  for (const doc of reqDocs3) {
    db.uploadDocument(adm3.id, doc.id, {
      fileName: `${doc.documentType}.pdf`,
      fileSize: 15000,
      mimeType: 'application/pdf',
      storagePath: `/uploads/${doc.id}.pdf`
    });
    db.reviewDocument(doc.id, 'Aprovado', 'Analista RH');
  }

  const notifsAppr = db.getNotifications({
    admissionId: adm3.id,
    category: 'APROVACAO'
  });

  assert(notifsAppr.length === 1, 'Exatamente 1 notificação de aprovação gerada', notifsAppr.length);
  const apprNotif = notifsAppr[0];
  assert(apprNotif?.category === 'APROVACAO', 'Categoria é "APROVACAO"');
  assert(apprNotif?.sourceEvent === 'automation_all_required_documents_approved', 'sourceEvent é "automation_all_required_documents_approved"');
  assert(apprNotif?.targetUserId === gestorUser.id, 'Notificação direcionada ao usuário responsável pela aprovação', apprNotif?.targetUserId);
  assert(apprNotif?.targetRole === 'GESTOR', 'Perfil de aprovação definido como GESTOR', apprNotif?.targetRole);
  assert(apprNotif?.priority === 'high', 'Prioridade da aprovação é "high"');
  assert(apprNotif?.dedupKey === `notif:automation_all_required_documents_approved:${adm3.id}:${adm3.approval?.id}`, 'dedupKey determinística gerada com ID da aprovação');

  // =========================================================================
  // TESTE 4: AUSÊNCIA DE DESTINATÁRIO APLICÁVEL
  // =========================================================================
  console.log('\n--- TESTE 4: Ausência de Destinatário Aplicável ---');
  // Cenário 4A: Admissão SEM aprovação obrigatória necessária (approval.required = false)
  const admNoAppr = createTestAdmission('Candidato Sem Aprovacao 67C', false);
  const reqDocsNoAppr = admNoAppr.documents.filter(d => d.required);

  for (const doc of reqDocsNoAppr) {
    db.uploadDocument(admNoAppr.id, doc.id, {
      fileName: `${doc.documentType}.pdf`,
      fileSize: 15000,
      mimeType: 'application/pdf',
      storagePath: `/uploads/${doc.id}.pdf`
    });
    db.reviewDocument(doc.id, 'Aprovado', 'Analista RH');
  }

  const notifsNoAppr = db.getNotifications({
    admissionId: admNoAppr.id,
    category: 'APROVACAO'
  });
  assert(notifsNoAppr.length === 0, 'NENHUMA notificação de categoria APROVACAO gerada quando não há aprovação pendente', notifsNoAppr.length);

  // Cenário 4B: Admissão COM aprovação pendente, mas SEM nenhum destinatário configurado (sem assignedUserId e sem role)
  const admNoRecipient = createTestAdmission('Candidato Sem Destinatario 67C', true);
  if (admNoRecipient.approval) {
    admNoRecipient.approval.assignedUserId = undefined;
    (admNoRecipient.approval as any).responsibleRole = undefined;
  }
  const reqDocsNoRec = admNoRecipient.documents.filter(d => d.required);
  for (const doc of reqDocsNoRec) {
    db.uploadDocument(admNoRecipient.id, doc.id, {
      fileName: `${doc.documentType}.pdf`,
      fileSize: 15000,
      mimeType: 'application/pdf',
      storagePath: `/uploads/${doc.id}.pdf`
    });
    db.reviewDocument(doc.id, 'Aprovado', 'Analista RH');
  }

  const notifsNoRec = db.getNotifications({
    admissionId: admNoRecipient.id,
    category: 'APROVACAO'
  });
  assert(notifsNoRec.length === 0, 'NENHUMA notificação gerada quando não há destinatário aplicável configurado (Regra 4)');

  // =========================================================================
  // TESTE 5: DEDUPLICAÇÃO DE NOTIFICAÇÕES EM DISPAROS REPETIDOS
  // =========================================================================
  console.log('\n--- TESTE 5: Deduplicação e Idempotência de Notificações ---');
  const admDedup = createTestAdmission('Candidato Dedup Notif 67C', true);
  const docDedup = admDedup.documents.find(d => d.required)!;

  db.uploadDocument(admDedup.id, docDedup.id, {
    fileName: 'doc_dedup.pdf',
    fileSize: 20000,
    mimeType: 'application/pdf',
    storagePath: '/uploads/doc_dedup.pdf'
  });

  // Primeiro disparo de rejeição
  db.executeAutomationOnDocumentRejected(admDedup, docDedup, 'Analista RH', 'Foto ilegível');
  const count1 = db.getNotifications({
    admissionId: admDedup.id,
    documentId: docDedup.id,
    sourceEvent: 'automation_document_rejected'
  }).length;
  assert(count1 === 1, 'Exatamente 1 notificação registrada no primeiro disparo');

  // Segundo disparo idêntico para o mesmo documento e mesma versão
  db.executeAutomationOnDocumentRejected(admDedup, docDedup, 'Analista RH', 'Foto ilegível repetida');
  const count2 = db.getNotifications({
    admissionId: admDedup.id,
    documentId: docDedup.id,
    sourceEvent: 'automation_document_rejected'
  }).length;
  assert(count2 === 1, 'Segunda execução repetida NÃO duplicou a notificação (idempotência preservada)', count2);

  // Terceiro disparo de reenvio
  docDedup.currentVersion = 2;
  db.executeAutomationOnDocumentResubmitted(admDedup, docDedup);
  const countResub1 = db.getNotifications({
    admissionId: admDedup.id,
    documentId: docDedup.id,
    sourceEvent: 'automation_document_resubmitted'
  }).length;
  assert(countResub1 === 1, 'Exatamente 1 notificação de reenvio gerada no primeiro envio de V2');

  // Repetição do reenvio para a mesma V2
  db.executeAutomationOnDocumentResubmitted(admDedup, docDedup);
  const countResub2 = db.getNotifications({
    admissionId: admDedup.id,
    documentId: docDedup.id,
    sourceEvent: 'automation_document_resubmitted'
  }).length;
  assert(countResub2 === 1, 'Repetição do reenvio NÃO gerou notificação duplicada');

  // =========================================================================
  // TESTE 6: CONCORRÊNCIA SIMULTÂNEA DE NOTIFICAÇÕES NAS AUTOMAÇÕES
  // =========================================================================
  console.log('\n--- TESTE 6: Concorrência Simultânea nas Automações ---');
  const admConc = createTestAdmission('Candidato Concorrencia 67C', true);
  const docConc = admConc.documents.find(d => d.required)!;

  db.uploadDocument(admConc.id, docConc.id, {
    fileName: 'doc_conc.pdf',
    fileSize: 18000,
    mimeType: 'application/pdf',
    storagePath: '/uploads/doc_conc.pdf'
  });

  // Executa 5 disparos simultâneos de rejeição com Promise.all
  const concurrentRejections = Array.from({ length: 5 }, (_, i) => {
    return Promise.resolve().then(() => {
      db.executeAutomationOnDocumentRejected(admConc, docConc, `Analista RH ${i}`, 'Concorrência');
    });
  });
  await Promise.all(concurrentRejections);

  const concNotifs = db.getNotifications({
    admissionId: admConc.id,
    documentId: docConc.id,
    sourceEvent: 'automation_document_rejected'
  });
  assert(concNotifs.length === 1, 'Apenas 1 notificação gerada mesmo sob 5 disparos simultâneos concorrentes', concNotifs.length);

  // =========================================================================
  // RESULTADO FINAL DO BLOCO 6.7C
  // =========================================================================
  console.log('\n======================================================');
  console.log(`TOTAL DE ASSERÇÕES BLOCO 6.7C: ${passedCount + failedCount}`);
  console.log(`PASSOU: ${passedCount}`);
  console.log(`FALHOU: ${failedCount}`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro fatal executando os testes do Bloco 6.7C:', err);
  process.exit(1);
});
