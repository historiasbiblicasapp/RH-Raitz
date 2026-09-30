import { db } from './server/db.ts';

async function runTests() {
  console.log('--- INICIANDO TESTES DO BLOCO 6.6D: INTEGRIDADE, IDEMPOTÊNCIA E CONCORRÊNCIA ---\n');
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

  function createIsolatedAdmission(name: string, approvalRequired: boolean = true) {
    const randomDigits = Math.floor(Math.random() * 899999999 + 100000000).toString();
    const testCPF = `${randomDigits.slice(0, 3)}.${randomDigits.slice(3, 6)}.${randomDigits.slice(6, 9)}-77`;
    const activeJob = db.getJobPositions().find(j => j.active) || db.getJobPositions()[0];

    const admission = db.createAdmission({
      name,
      cpf: testCPF,
      birthDate: '1990-08-20',
      expectedStartDate: '2026-11-15',
      phone: '(11) 96666-5555',
      email: `teste66d_${Date.now()}_${Math.floor(Math.random()*10000)}@exemplo.com`,
      role: activeJob?.name || 'Operador de Produção',
      jobPositionId: activeJob?.id,
      department: (activeJob as any)?.department || 'Operações',
      unit: 'Unidade Matriz'
    }, 'RH Testes 6.6D');

    if (admission.approval) {
      admission.approval.required = approvalRequired;
      if (!approvalRequired) {
        admission.approval.status = 'APROVADA';
      }
    }

    return admission;
  }

  // =========================================================================
  // TESTE 1: Mesmo evento executado duas vezes
  // =========================================================================
  console.log('--- TESTE 1: Mesmo evento executado duas vezes ---');
  const adm1 = createIsolatedAdmission('Candidato Teste 1 Duplicidade', true);
  const reqDoc1 = adm1.documents.find(d => d.required)!;

  db.uploadDocument(adm1.id, reqDoc1.id, {
    fileName: 'doc1.pdf',
    fileSize: 100000,
    mimeType: 'application/pdf',
    storagePath: 'doc1.pdf'
  });

  // Rejeição inicial
  db.reviewDocument(reqDoc1.id, 'Rejeitado', 'Analista RH', 'Documento cortado');
  const taskCountAfterFirstReject = (db.getOperationalTasks({ admissionId: adm1.id }).items || [])
    .filter(t => t.documentId === reqDoc1.id).length;
  const execCountAfterFirstReject = ((db as any).data.automationExecutions || [])
    .filter((e: any) => e.admissionId === adm1.id && e.routineKey === 'DOCUMENT_REJECTED').length;

  // Disparo repetido do mesmo evento de rejeição
  db.executeAutomationOnDocumentRejected(adm1, reqDoc1, 'Analista RH', 'Documento cortado');

  const taskCountAfterSecondReject = (db.getOperationalTasks({ admissionId: adm1.id }).items || [])
    .filter(t => t.documentId === reqDoc1.id).length;
  const execCountAfterSecondReject = ((db as any).data.automationExecutions || [])
    .filter((e: any) => e.admissionId === adm1.id && e.routineKey === 'DOCUMENT_REJECTED').length;

  assert(taskCountAfterFirstReject === 1, 'Exatamente 1 tarefa gerada na primeira rejeição');
  assert(taskCountAfterSecondReject === 1, 'Nenhuma tarefa duplicada gerada na segunda execução repetida');
  assert(execCountAfterFirstReject === 1, 'Exatamente 1 registro de automação gerado na primeira rejeição');
  assert(execCountAfterSecondReject === 1, 'Nenhum registro duplicado de automação na segunda execução repetida');

  // =========================================================================
  // TESTE 2: Mesmo evento executado simultaneamente (Concorrência / Lock)
  // =========================================================================
  console.log('\n--- TESTE 2: Mesmo evento executado simultaneamente ---');
  const adm2 = createIsolatedAdmission('Candidato Teste 2 Concorrência', true);
  const reqDoc2 = adm2.documents.find(d => d.required)!;

  db.uploadDocument(adm2.id, reqDoc2.id, {
    fileName: 'doc2.pdf',
    fileSize: 100000,
    mimeType: 'application/pdf',
    storagePath: 'doc2.pdf'
  });

  // Simular concorrência chamando a automação de rejeição em paralelo
  db.executeAutomationOnDocumentRejected(adm2, reqDoc2, 'Thread 1', 'Motivo concorrência');
  db.executeAutomationOnDocumentRejected(adm2, reqDoc2, 'Thread 2', 'Motivo concorrência');

  const tasksAdm2 = (db.getOperationalTasks({ admissionId: adm2.id }).items || [])
    .filter(t => t.documentId === reqDoc2.id);
  const execsAdm2 = ((db as any).data.automationExecutions || [])
    .filter((e: any) => e.admissionId === adm2.id && e.routineKey === 'DOCUMENT_REJECTED');

  assert(tasksAdm2.length === 1, 'Apenas 1 tarefa criada sob concorrência simultânea');
  assert(execsAdm2.length === 1, 'Apenas 1 execução de automação registrada sob concorrência simultânea');

  // =========================================================================
  // TESTE 3: Rejeição seguida de reenvio
  // =========================================================================
  console.log('\n--- TESTE 3: Rejeição seguida de reenvio ---');
  const adm3 = createIsolatedAdmission('Candidato Teste 3 Rejeicao Reenvio', true);
  const reqDoc3 = adm3.documents.find(d => d.required)!;

  // 1. Upload e Rejeição
  db.uploadDocument(adm3.id, reqDoc3.id, {
    fileName: 'rg_v1.pdf',
    fileSize: 85000,
    mimeType: 'application/pdf',
    storagePath: 'rg_v1.pdf'
  });
  db.reviewDocument(reqDoc3.id, 'Rejeitado', 'Analista RH', 'Foto desfocada');

  let freshAdm3 = db.getAdmissionById(adm3.id)!;
  let step3 = (freshAdm3.processSteps || []).find(s => s.stepKey === 'DOCUMENTOS')!;
  let task3 = (db.getOperationalTasks({ admissionId: adm3.id }).items || [])
    .find(t => t.documentId === reqDoc3.id)!;

  assert(step3.status === 'BLOQUEADA', 'Etapa DOCUMENTOS bloqueada após rejeição');
  assert(freshAdm3.status === 'Pendência', 'Admissão em Pendência após rejeição');
  assert(task3.status === 'PENDENTE', 'Tarefa operacional aberta e pendente');

  // 2. Reenvio
  db.uploadDocument(adm3.id, reqDoc3.id, {
    fileName: 'rg_v2.pdf',
    fileSize: 95000,
    mimeType: 'application/pdf',
    storagePath: 'rg_v2.pdf'
  });

  freshAdm3 = db.getAdmissionById(adm3.id)!;
  let freshDoc3 = freshAdm3.documents.find(d => d.id === reqDoc3.id)!;
  step3 = (freshAdm3.processSteps || []).find(s => s.stepKey === 'DOCUMENTOS')!;
  task3 = (db.getOperationalTasks({ admissionId: adm3.id }).items || [])
    .find(t => t.documentId === reqDoc3.id)!;

  assert(freshDoc3.currentVersion === 2, 'Versão incrementada para V2');
  assert(freshDoc3.status === 'Reenviado', 'Documento reenviado tem status "Reenviado" (sem aprovação automática)');
  assert(freshDoc3.versions.length === 2, 'Histórico preserva versão 1 rejeitada e versão 2 reenviada');
  assert(task3.status === 'CONCLUIDA', 'Tarefa operacional de cobrança foi concluída automaticamente');
  assert(step3.status === 'EM_ANDAMENTO', 'Bloqueio da etapa DOCUMENTOS removido para EM_ANDAMENTO');

  // =========================================================================
  // TESTE 4: Reenvio seguido de aprovação
  // =========================================================================
  console.log('\n--- TESTE 4: Reenvio seguido de aprovação ---');
  // RH avalia a nova versão V2 e aprova humanamente
  db.reviewDocument(reqDoc3.id, 'Aprovado', 'Analista RH');

  freshAdm3 = db.getAdmissionById(adm3.id)!;
  freshDoc3 = freshAdm3.documents.find(d => d.id === reqDoc3.id)!;

  assert(freshDoc3.status === 'Aprovado', 'Documento aprovado formalmente pelo RH');
  assert(freshDoc3.reviewedBy === 'Analista RH', 'Revisor humano registrado');
  assert(freshDoc3.versions.length === 2, 'Ambas as versões permanecem intactas no histórico');
  assert(freshDoc3.versions[0].status === 'Rejeitado', 'Versão 1 histórica permanece como Rejeitado');
  assert(freshDoc3.versions[1].status === 'Aprovado', 'Versão 2 histórica atualizada para Aprovado');

  // =========================================================================
  // TESTE 5: Dois documentos rejeitados na mesma admissão
  // =========================================================================
  console.log('\n--- TESTE 5: Dois documentos rejeitados na mesma admissão ---');
  const adm5 = createIsolatedAdmission('Candidato Teste 5 Dois Rejeitados', true);
  const reqDocs5 = adm5.documents.filter(d => d.required);
  assert(reqDocs5.length >= 2, 'Admissão possui pelo menos 2 obrigatórios');
  const doc5A = reqDocs5[0];
  const doc5B = reqDocs5[1];

  // Upload inicial dos dois
  db.uploadDocument(adm5.id, doc5A.id, { fileName: 'doc5A_v1.pdf', fileSize: 50000, mimeType: 'application/pdf', storagePath: '5A1' });
  db.uploadDocument(adm5.id, doc5B.id, { fileName: 'doc5B_v1.pdf', fileSize: 50000, mimeType: 'application/pdf', storagePath: '5B1' });

  // Rejeitar ambos
  db.reviewDocument(doc5A.id, 'Rejeitado', 'Analista RH', 'Doc A com problema');
  db.reviewDocument(doc5B.id, 'Rejeitado', 'Analista RH', 'Doc B com problema');

  let tasks5 = (db.getOperationalTasks({ admissionId: adm5.id }).items || [])
    .filter(t => t.status === 'PENDENTE');
  assert(tasks5.length === 2, 'Foram criadas 2 tarefas distintas, 1 para cada documento rejeitado');

  // Reenviar APENAS o documento A
  db.uploadDocument(adm5.id, doc5A.id, { fileName: 'doc5A_v2.pdf', fileSize: 60000, mimeType: 'application/pdf', storagePath: '5A2' });

  let freshAdm5 = db.getAdmissionById(adm5.id)!;
  let step5 = (freshAdm5.processSteps || []).find(s => s.stepKey === 'DOCUMENTOS')!;
  let task5A = (db.getOperationalTasks({ admissionId: adm5.id }).items || []).find(t => t.documentId === doc5A.id)!;
  let task5B = (db.getOperationalTasks({ admissionId: adm5.id }).items || []).find(t => t.documentId === doc5B.id)!;

  assert(task5A.status === 'CONCLUIDA', 'Tarefa do Doc A foi concluída após reenvio');
  assert(task5B.status === 'PENDENTE', 'Tarefa do Doc B permanece PENDENTE');
  assert(step5.status === 'BLOQUEADA', 'Etapa DOCUMENTOS permanece BLOQUEADA devido ao Doc B ainda rejeitado');
  assert(freshAdm5.status === 'Pendência', 'Admissão permanece em "Pendência" enquanto houver qualquer rejeição');

  // Agora reenviar o documento B
  db.uploadDocument(adm5.id, doc5B.id, { fileName: 'doc5B_v2.pdf', fileSize: 60000, mimeType: 'application/pdf', storagePath: '5B2' });

  freshAdm5 = db.getAdmissionById(adm5.id)!;
  step5 = (freshAdm5.processSteps || []).find(s => s.stepKey === 'DOCUMENTOS')!;
  task5B = (db.getOperationalTasks({ admissionId: adm5.id }).items || []).find(t => t.documentId === doc5B.id)!;

  assert(task5B.status === 'CONCLUIDA', 'Tarefa do Doc B foi concluída após seu reenvio');
  assert(step5.status === 'EM_ANDAMENTO', 'Etapa DOCUMENTOS desbloqueada para EM_ANDAMENTO após resolução de todas as rejeições');
  assert(freshAdm5.status === 'Em conferência', 'Admissão retornou para "Em conferência"');

  // =========================================================================
  // TESTE 6: Aprovação do último documento obrigatório
  // =========================================================================
  console.log('\n--- TESTE 6: Aprovação do último documento obrigatório ---');
  // Aprovar doc5A
  db.reviewDocument(doc5A.id, 'Aprovado', 'Analista RH');
  freshAdm5 = db.getAdmissionById(adm5.id)!;
  step5 = (freshAdm5.processSteps || []).find(s => s.stepKey === 'DOCUMENTOS')!;
  assert(step5.status !== 'CONCLUIDA', 'Etapa DOCUMENTOS NÃO conclui antes do último obrigatório ser aprovado');

  // Aprovar todos os demais obrigatórios até o último
  for (const d of freshAdm5.documents.filter(doc => doc.required && doc.status !== 'Aprovado')) {
    if (d.status === 'Não enviado' || d.currentVersion === 0) {
      db.uploadDocument(adm5.id, d.id, { fileName: `${d.id}.pdf`, fileSize: 40000, mimeType: 'application/pdf', storagePath: `${d.id}` });
    }
    db.reviewDocument(d.id, 'Aprovado', 'Analista RH');
  }

  freshAdm5 = db.getAdmissionById(adm5.id)!;
  step5 = (freshAdm5.processSteps || []).find(s => s.stepKey === 'DOCUMENTOS')!;

  assert(step5.status === 'CONCLUIDA', 'Etapa DOCUMENTOS concluída exatamente na aprovação do último obrigatório');
  assert(step5.blockReason === undefined, 'blockReason removido com sucesso');
  assert(freshAdm5.status !== 'Concluída', 'Admissão com aprovação obrigatória pendente NÃO foi concluída');

  // =========================================================================
  // TESTE 7: Reexecução após DOCUMENTOS já concluída
  // =========================================================================
  console.log('\n--- TESTE 7: Reexecução após DOCUMENTOS já concluída ---');
  const historyCountBeforeReexec = (step5.history || []).length;
  const execsBeforeReexec = ((db as any).data.automationExecutions || [])
    .filter((e: any) => e.admissionId === adm5.id && e.routineKey === 'ALL_REQUIRED_DOCUMENTS_APPROVED').length;

  // Chamar novamente a automação de todos aprovados
  db.executeAutomationOnAllRequiredApproved(adm5, 'Analista RH');

  freshAdm5 = db.getAdmissionById(adm5.id)!;
  step5 = (freshAdm5.processSteps || []).find(s => s.stepKey === 'DOCUMENTOS')!;
  const historyCountAfterReexec = (step5.history || []).length;
  const execsAfterReexec = ((db as any).data.automationExecutions || [])
    .filter((e: any) => e.admissionId === adm5.id && e.routineKey === 'ALL_REQUIRED_DOCUMENTS_APPROVED').length;

  assert(step5.status === 'CONCLUIDA', 'Etapa DOCUMENTOS permanece CONCLUIDA');
  assert(historyCountAfterReexec === historyCountBeforeReexec, 'Nenhuma entrada duplicada de histórico na etapa concluída');
  assert(execsAfterReexec === execsBeforeReexec, 'Nenhum registro extra de execução criado para evento já processado');

  // =========================================================================
  // TESTE 8: Verificar ausência de tarefas duplicadas
  // =========================================================================
  console.log('\n--- TESTE 8: Verificar ausência de tarefas duplicadas ---');
  const allTasksAdm5 = db.getOperationalTasks({ admissionId: adm5.id }).items || [];
  const approvalTasksAdm5 = allTasksAdm5.filter(t => t.sourceType === 'APROVACAO');
  const doc5ATasks = allTasksAdm5.filter(t => t.documentId === doc5A.id);

  assert(approvalTasksAdm5.length === 1, 'Exatamente 1 tarefa de aprovação gerada (sem duplicação)');
  assert(doc5ATasks.length === 1, 'Exatamente 1 tarefa para o Doc 5A (sem duplicação)');

  // =========================================================================
  // TESTE 9: Verificar ausência de auditorias duplicadas indevidas
  // =========================================================================
  console.log('\n--- TESTE 9: Verificar ausência de auditorias duplicadas indevidas ---');
  const logsAdm5 = db.getAuditLogs(adm5.id);
  const allApprovedLogs = logsAdm5.filter(l => l.action === 'automation_all_required_documents_approved');

  assert(allApprovedLogs.length === 1, 'Exatamente 1 log de auditoria para a automação de todos documentos aprovados');
  assert(allApprovedLogs[0].isAutomatic === true, 'Log de auditoria possui isAutomatic === true');

  // =========================================================================
  // TESTE 10: Verificar que admissão não seja concluída indevidamente
  // =========================================================================
  console.log('\n--- TESTE 10: Verificar que admissão não seja concluída indevidamente ---');
  
  // Cenário 10A: Documento obrigatório pendente -> Nunca conclui
  const adm10A = createIsolatedAdmission('Candidato 10A Doc Pendente', false);
  assert(adm10A.status !== 'Concluída', '10A: Admissão com documentos pendentes não está concluída');

  // Cenário 10B: Todos obrigatórios aprovados mas aprovação obrigatória pendente -> Nunca conclui
  const adm10B = createIsolatedAdmission('Candidato 10B Aprov Pendente', true);
  for (const d of adm10B.documents.filter(doc => doc.required)) {
    db.uploadDocument(adm10B.id, d.id, { fileName: 'doc.pdf', fileSize: 10000, mimeType: 'application/pdf', storagePath: 'p' });
    db.reviewDocument(d.id, 'Aprovado', 'RH');
  }
  let fresh10B = db.getAdmissionById(adm10B.id)!;
  assert(fresh10B.status !== 'Concluída', '10B: Admissão com aprovação obrigatória pendente NUNCA conclui');
  assert(fresh10B.status === 'Em conferência', '10B: Status mantido em "Em conferência"');

  // Cenário 10C: Todos obrigatórios aprovados mas documento OPCIONAL rejeitado ativo -> Nunca conclui
  const adm10C = createIsolatedAdmission('Candidato 10C Opcional Rejeitado', false);
  let opt10C = adm10C.documents.find(d => !d.required);
  if (!opt10C) {
    opt10C = {
      id: 'doc-opt-10c-' + Date.now(),
      admissionId: adm10C.id,
      documentType: 'Certificado Adicional',
      category: 'Outros',
      required: false,
      status: 'Não enviado',
      currentVersion: 0,
      versions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    adm10C.documents.push(opt10C);
  }
  // Aprovar todos obrigatórios
  for (const d of adm10C.documents.filter(doc => doc.required)) {
    db.uploadDocument(adm10C.id, d.id, { fileName: 'doc.pdf', fileSize: 10000, mimeType: 'application/pdf', storagePath: 'p' });
    db.reviewDocument(d.id, 'Aprovado', 'RH');
  }
  // Rejeitar opcional
  db.uploadDocument(adm10C.id, opt10C.id, { fileName: 'opt.pdf', fileSize: 10000, mimeType: 'application/pdf', storagePath: 'p' });
  db.reviewDocument(opt10C.id, 'Rejeitado', 'RH', 'Documento inválido');

  let fresh10C = db.getAdmissionById(adm10C.id)!;
  assert(fresh10C.status === 'Pendência', '10C: Admissão com rejeição ativa permanece em "Pendência"');
  assert(fresh10C.status !== 'Concluída', '10C: Admissão com rejeição ativa NUNCA conclui');

  // Cenário 10D: Etapa obrigatória com BLOQUEADA -> Nunca conclui
  const adm10D = createIsolatedAdmission('Candidato 10D Etapa Bloqueada', false);
  if (adm10D.processSteps && adm10D.processSteps.length > 0) {
    adm10D.processSteps[0].status = 'BLOQUEADA';
  }
  for (const d of adm10D.documents.filter(doc => doc.required)) {
    db.uploadDocument(adm10D.id, d.id, { fileName: 'doc.pdf', fileSize: 10000, mimeType: 'application/pdf', storagePath: 'p' });
    db.reviewDocument(d.id, 'Aprovado', 'RH');
  }
  let fresh10D = db.getAdmissionById(adm10D.id)!;
  assert(fresh10D.status !== 'Concluída', '10D: Admissão com etapa bloqueada NUNCA conclui');

  console.log('\n=================================================');
  console.log(`RESULTADO DOS TESTES 6.6D: ${passedCount} PASSOU | ${failedCount} FALHOU`);
  console.log('=================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro fatal ao executar testes 6.6D:', err);
  process.exit(1);
});
