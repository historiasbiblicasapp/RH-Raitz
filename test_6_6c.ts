import { db } from './server/db.ts';

async function runTests() {
  console.log('--- INICIANDO TESTES DO BLOCO 6.6C: AUTOMAÇÃO DE TODOS OS DOCUMENTOS OBRIGATÓRIOS APROVADOS ---\n');
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

  function createTestAdmission(name: string, approvalRequired: boolean = true) {
    const randomDigits = Math.floor(Math.random() * 899999999 + 100000000).toString();
    const testCPF = `${randomDigits.slice(0, 3)}.${randomDigits.slice(3, 6)}.${randomDigits.slice(6, 9)}-88`;
    const activeJob = db.getJobPositions().find(j => j.active) || db.getJobPositions()[0];

    const admission = db.createAdmission({
      name,
      cpf: testCPF,
      birthDate: '1992-04-15',
      expectedStartDate: '2026-11-01',
      phone: '(11) 97777-6666',
      email: `teste66c_${Date.now()}_${Math.floor(Math.random()*1000)}@exemplo.com`,
      role: activeJob?.name || 'Operador de Produção',
      jobPositionId: activeJob?.id,
      department: (activeJob as any)?.department || 'Operações',
      unit: 'Unidade Matriz'
    }, 'RH Testes');

    // Configurar se a aprovação é obrigatória ou não para o teste
    if (admission.approval) {
      admission.approval.required = approvalRequired;
      if (!approvalRequired) {
        admission.approval.status = 'APROVADA';
      }
    }

    return admission;
  }

  // =========================================================================
  // TESTE 1: Um documento obrigatório aprovado, mas outro pendente → NÃO conclui DOCUMENTOS
  // =========================================================================
  console.log('--- TESTE 1: Um documento obrigatório aprovado, mas outro pendente ---');
  const adm1 = createTestAdmission('Candidato Teste 1 6.6C', true);
  
  // Garantir que a admissão possua pelo menos 2 documentos obrigatórios
  const reqDocs1 = adm1.documents.filter(d => d.required);
  assert(reqDocs1.length >= 2, 'Admissão possui pelo menos 2 documentos obrigatórios para o teste');
  const doc1A = reqDocs1[0];
  const doc1B = reqDocs1[1];

  // Upload dos dois documentos
  db.uploadDocument(adm1.id, doc1A.id, {
    fileName: 'doc1A.pdf',
    fileSize: 120000,
    mimeType: 'application/pdf',
    storagePath: 'doc1A.pdf'
  });
  db.uploadDocument(adm1.id, doc1B.id, {
    fileName: 'doc1B.pdf',
    fileSize: 130000,
    mimeType: 'application/pdf',
    storagePath: 'doc1B.pdf'
  });

  // RH aprova SOMENTE o primeiro documento obrigatório
  db.reviewDocument(doc1A.id, 'Aprovado', 'Analista RH');

  let freshAdm1 = db.getAdmissionById(adm1.id)!;
  let freshDoc1A = freshAdm1.documents.find(d => d.id === doc1A.id)!;
  let freshDoc1B = freshAdm1.documents.find(d => d.id === doc1B.id)!;
  let docsStep1 = (freshAdm1.processSteps || []).find(s => s.stepKey === 'DOCUMENTOS')!;

  assert(freshDoc1A.status === 'Aprovado', 'Primeiro documento obrigatório está Aprovado');
  assert(freshDoc1B.status === 'Em análise' || freshDoc1B.status === 'Reenviado', 'Segundo documento obrigatório ainda está pendente de análise');
  assert(docsStep1.status !== 'CONCLUIDA', 'Etapa DOCUMENTOS NÃO foi concluída pois ainda resta obrigatório pendente');
  assert(freshAdm1.status !== 'Concluída', 'Admissão NÃO foi concluída');

  // =========================================================================
  // TESTE 2: Todos os obrigatórios aprovados → conclui DOCUMENTOS
  // =========================================================================
  console.log('\n--- TESTE 2: Todos os obrigatórios aprovados → conclui DOCUMENTOS ---');
  // Agora aprovar todos os demais documentos obrigatórios de adm1
  for (const doc of freshAdm1.documents.filter(d => d.required && d.status !== 'Aprovado')) {
    if (doc.status === 'Não enviado' || doc.currentVersion === 0) {
      db.uploadDocument(freshAdm1.id, doc.id, {
        fileName: `${doc.id}.pdf`,
        fileSize: 100000,
        mimeType: 'application/pdf',
        storagePath: `${doc.id}.pdf`
      });
    }
    db.reviewDocument(doc.id, 'Aprovado', 'Analista RH');
  }

  freshAdm1 = db.getAdmissionById(adm1.id)!;
  docsStep1 = (freshAdm1.processSteps || []).find(s => s.stepKey === 'DOCUMENTOS')!;
  const allReqApproved1 = freshAdm1.documents.filter(d => d.required).every(d => d.status === 'Aprovado');

  assert(allReqApproved1, 'Todos os documentos obrigatórios estão com status Aprovado');
  assert(docsStep1.status === 'CONCLUIDA', 'Etapa DOCUMENTOS foi concluída automaticamente');
  assert(docsStep1.blockReason === undefined, 'Eventual bloqueio da etapa DOCUMENTOS foi removido');
  assert(!!docsStep1.completedAt, 'Data de conclusão da etapa DOCUMENTOS registrada');

  // =========================================================================
  // TESTE 3: Todos aprovados + aprovação obrigatória pendente → NÃO conclui admissão
  // =========================================================================
  console.log('\n--- TESTE 3: Todos aprovados + aprovação obrigatória pendente → NÃO conclui admissão ---');
  // adm1 possui aprovação obrigatória pendente
  assert(!!freshAdm1.approval && freshAdm1.approval.required && freshAdm1.approval.status !== 'APROVADA', 'Admissão possui aprovação interna obrigatória pendente');
  assert(freshAdm1.status !== 'Concluída', 'Admissão NÃO foi concluída devido à aprovação obrigatória pendente');
  assert(freshAdm1.status === 'Em conferência', 'Admissão permanece em andamento ("Em conferência")');
  assert(!freshAdm1.completedAt, 'Data de conclusão da admissão não foi definida');

  // Verificar que foi gerada tarefa operacional para a aprovação
  const approvalTasks = (db.getOperationalTasks({ admissionId: adm1.id }).items || [])
    .filter(t => t.sourceType === 'APROVACAO');
  assert(approvalTasks.length === 1, 'Exatamente 1 tarefa operacional de aprovação foi criada automaticamente');
  assert(approvalTasks[0].priority === 'ALTA', 'Tarefa operacional de aprovação possui prioridade ALTA');

  // =========================================================================
  // TESTE 4: Todos aprovados + sem aprovação obrigatória pendente + etapas permitirem → conclui
  // =========================================================================
  console.log('\n--- TESTE 4: Todos aprovados + sem aprovação pendente + etapas permitirem → conclui ---');
  const adm4 = createTestAdmission('Candidato Teste 4 Sem Aprovação', false);
  
  // Garantir dados cadastrais confirmados
  db.confirmEmployeeData(adm4.id);

  // Marcar outras etapas que não DOCUMENTOS como concluídas para simular prontidão total
  let freshAdm4 = db.getAdmissionById(adm4.id)!;
  if (freshAdm4.processSteps) {
    freshAdm4.processSteps.forEach(s => {
      if (s.stepKey !== 'DOCUMENTOS') {
        s.status = 'CONCLUIDA';
      }
    });
  }

  // Upload e aprovação de todos os documentos obrigatórios
  for (const doc of freshAdm4.documents.filter(d => d.required)) {
    db.uploadDocument(adm4.id, doc.id, {
      fileName: `${doc.id}.pdf`,
      fileSize: 100000,
      mimeType: 'application/pdf',
      storagePath: `${doc.id}.pdf`
    });
    db.reviewDocument(doc.id, 'Aprovado', 'Analista RH');
  }

  freshAdm4 = db.getAdmissionById(adm4.id)!;
  const docsStep4 = (freshAdm4.processSteps || []).find(s => s.stepKey === 'DOCUMENTOS')!;

  assert(docsStep4.status === 'CONCLUIDA', 'Etapa DOCUMENTOS concluída');
  assert(freshAdm4.status === 'Concluída', 'Admissão avançou e foi CONCLUÍDA automaticamente');
  assert(!!freshAdm4.completedAt, 'completedAt registrado com sucesso');

  // =========================================================================
  // TESTE 5: Documento opcional pendente → não impede conclusão dos obrigatórios
  // =========================================================================
  console.log('\n--- TESTE 5: Documento opcional pendente → não impede conclusão dos obrigatórios ---');
  const adm5 = createTestAdmission('Candidato Teste 5 Opcional', false);

  // Adicionar documento opcional explícito se não existir
  let optDoc = adm5.documents.find(d => !d.required);
  if (!optDoc) {
    optDoc = {
      id: 'doc-opt-' + Date.now(),
      admissionId: adm5.id,
      documentType: 'Certificado de Cursos Complementares',
      category: 'Outros',
      required: false,
      status: 'Não enviado',
      currentVersion: 0,
      versions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    adm5.documents.push(optDoc);
  } else {
    optDoc.status = 'Não enviado';
  }

  // Upload e aprovação de APENAS os documentos obrigatórios
  for (const doc of adm5.documents.filter(d => d.required)) {
    db.uploadDocument(adm5.id, doc.id, {
      fileName: `${doc.id}.pdf`,
      fileSize: 100000,
      mimeType: 'application/pdf',
      storagePath: `${doc.id}.pdf`
    });
    db.reviewDocument(doc.id, 'Aprovado', 'Analista RH');
  }

  let freshAdm5 = db.getAdmissionById(adm5.id)!;
  let freshOptDoc = freshAdm5.documents.find(d => d.id === optDoc!.id)!;
  let docsStep5 = (freshAdm5.processSteps || []).find(s => s.stepKey === 'DOCUMENTOS')!;

  assert(freshOptDoc.status === 'Não enviado' || freshOptDoc.status === 'Em análise', 'Documento opcional continua pendente/não enviado');
  assert(docsStep5.status === 'CONCLUIDA', 'Etapa DOCUMENTOS concluída mesmo com documento opcional pendente');

  // =========================================================================
  // TESTE 6: Rejeitado existente → não conclui
  // =========================================================================
  console.log('\n--- TESTE 6: Rejeitado existente → não conclui ---');
  const adm6 = createTestAdmission('Candidato Teste 6 Rejeitado', false);

  // Garantir 2 documentos obrigatórios
  const reqDocs6 = adm6.documents.filter(d => d.required);
  const doc6A = reqDocs6[0];
  const doc6B = reqDocs6[1];

  db.uploadDocument(adm6.id, doc6A.id, {
    fileName: 'doc6A.pdf',
    fileSize: 100000,
    mimeType: 'application/pdf',
    storagePath: 'doc6A.pdf'
  });
  db.uploadDocument(adm6.id, doc6B.id, {
    fileName: 'doc6B.pdf',
    fileSize: 100000,
    mimeType: 'application/pdf',
    storagePath: 'doc6B.pdf'
  });

  // Rejeitar o primeiro documento
  db.reviewDocument(doc6A.id, 'Rejeitado', 'Analista RH', 'Documento ilegível');
  // Aprovar o segundo documento
  db.reviewDocument(doc6B.id, 'Aprovado', 'Analista RH');

  let freshAdm6 = db.getAdmissionById(adm6.id)!;
  let docsStep6 = (freshAdm6.processSteps || []).find(s => s.stepKey === 'DOCUMENTOS')!;

  assert(freshAdm6.status === 'Pendência', 'Admissão permanece em status "Pendência" devido ao documento rejeitado');
  assert(docsStep6.status !== 'CONCLUIDA', 'Etapa DOCUMENTOS NÃO foi concluída devido a documento rejeitado pendente');
  assert(freshAdm6.status !== 'Concluída', 'Admissão NÃO foi concluída');

  // Caso 6B: Todos os obrigatórios aprovados mas documento OPCIONAL rejeitado
  // A admissão NÃO pode concluir enquanto houver rejeição ativa pendente
  const adm6B = createTestAdmission('Candidato Teste 6B Opcional Rejeitado', false);
  let optDoc6B = adm6B.documents.find(d => !d.required);
  if (!optDoc6B) {
    optDoc6B = {
      id: 'doc-opt-6b-' + Date.now(),
      admissionId: adm6B.id,
      documentType: 'Comprovante Opcional',
      category: 'Outros',
      required: false,
      status: 'Não enviado',
      currentVersion: 0,
      versions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    adm6B.documents.push(optDoc6B);
  }

  // Upload e aprovação de todos os obrigatórios
  for (const doc of adm6B.documents.filter(d => d.required)) {
    db.uploadDocument(adm6B.id, doc.id, {
      fileName: `${doc.id}.pdf`,
      fileSize: 100000,
      mimeType: 'application/pdf',
      storagePath: `${doc.id}.pdf`
    });
    db.reviewDocument(doc.id, 'Aprovado', 'Analista RH');
  }

  // Upload e rejeição do documento opcional
  db.uploadDocument(adm6B.id, optDoc6B.id, {
    fileName: 'opt.pdf',
    fileSize: 50000,
    mimeType: 'application/pdf',
    storagePath: 'opt.pdf'
  });
  db.reviewDocument(optDoc6B.id, 'Rejeitado', 'Analista RH', 'Foto cortada');

  let freshAdm6B = db.getAdmissionById(adm6B.id)!;
  assert(freshAdm6B.status === 'Pendência', 'Admissão com documento rejeitado ativo permanece em "Pendência"');
  assert(freshAdm6B.status !== 'Concluída', 'Admissão com rejeição ativa NÃO conclui');

  // =========================================================================
  // TESTE 7: Execução duplicada → nenhum efeito duplicado
  // =========================================================================
  console.log('\n--- TESTE 7: Execução duplicada → nenhum efeito duplicado ---');
  // Usar adm1 onde a rotina já foi disparada
  const initialExecCount = (db as any).data.automationExecutions.filter(
    (e: any) => e.admissionId === adm1.id && e.routineKey === 'ALL_REQUIRED_DOCUMENTS_APPROVED'
  ).length;

  const initialApprovalTasks = (db.getOperationalTasks({ admissionId: adm1.id }).items || [])
    .filter(t => t.sourceType === 'APROVACAO').length;

  const docsStepBefore = (adm1.processSteps || []).find(s => s.stepKey === 'DOCUMENTOS')!;
  const historyLenBefore = (docsStepBefore.history || []).length;

  // Disparar novamente a automação de documentos aprovados
  db.executeAutomationOnAllRequiredApproved(adm1, 'Analista RH Teste');

  const afterExecCount = (db as any).data.automationExecutions.filter(
    (e: any) => e.admissionId === adm1.id && e.routineKey === 'ALL_REQUIRED_DOCUMENTS_APPROVED'
  ).length;

  const afterApprovalTasks = (db.getOperationalTasks({ admissionId: adm1.id }).items || [])
    .filter(t => t.sourceType === 'APROVACAO').length;

  const docsStepAfter = (adm1.processSteps || []).find(s => s.stepKey === 'DOCUMENTOS')!;
  const historyLenAfter = (docsStepAfter.history || []).length;

  assert(afterExecCount === initialExecCount, 'Nenhum registro extra de execução criado em chamada duplicada');
  assert(afterApprovalTasks === initialApprovalTasks, 'Nenhuma tarefa duplicada criada em chamada duplicada');
  assert(historyLenAfter === historyLenBefore, 'Etapa não foi duplicada nem recebeu histórico repetido');

  // =========================================================================
  // TESTE 8: Execução concorrente → sem duplicidade
  // =========================================================================
  console.log('\n--- TESTE 8: Execução concorrente → sem duplicidade ---');
  const adm8 = createTestAdmission('Candidato Teste 8 Concorrência', true);
  for (const doc of adm8.documents.filter(d => d.required)) {
    db.uploadDocument(adm8.id, doc.id, {
      fileName: `${doc.id}.pdf`,
      fileSize: 100000,
      mimeType: 'application/pdf',
      storagePath: `${doc.id}.pdf`
    });
    doc.status = 'Aprovado';
  }

  // Chamar duas vezes simultaneamente executeAutomationOnAllRequiredApproved
  db.executeAutomationOnAllRequiredApproved(adm8, 'Concorrente 1');
  db.executeAutomationOnAllRequiredApproved(adm8, 'Concorrente 2');

  const execCount8 = (db as any).data.automationExecutions.filter(
    (e: any) => e.admissionId === adm8.id && e.routineKey === 'ALL_REQUIRED_DOCUMENTS_APPROVED'
  ).length;
  const tasks8 = (db.getOperationalTasks({ admissionId: adm8.id }).items || [])
    .filter(t => t.sourceType === 'APROVACAO');

  assert(execCount8 === 1, 'Exatamente 1 execução registrada mesmo em chamadas sucessivas imediatas');
  assert(tasks8.length === 1, 'Exatamente 1 tarefa gerada sem duplicidade concorrente');

  // =========================================================================
  // TESTE 9: Auditoria automática registrada
  // =========================================================================
  console.log('\n--- TESTE 9: Auditoria automática registrada ---');
  const auditLogs = db.getAuditLogs(adm1.id);
  const autoLog = auditLogs.find(
    l => l.action === 'automation_all_required_documents_approved' && l.isAutomatic === true
  );

  assert(!!autoLog, 'Log de auditoria "automation_all_required_documents_approved" encontrado');
  assert(autoLog?.isAutomatic === true, 'Log possui isAutomatic === true');
  assert(autoLog?.userName === 'Sistema (Automação)', 'Log atribuído ao usuário Sistema (Automação)');
  assert(autoLog?.entityType === 'admission', 'Entidade do log vinculada à admissão');

  // =========================================================================
  // TESTE 10: Regressão do fluxo de aprovação/rejeição/reenvio do 6.6B
  // =========================================================================
  console.log('\n--- TESTE 10: Regressão do fluxo de aprovação/rejeição/reenvio do 6.6B ---');
  const adm10 = createTestAdmission('Candidato Regressão 6.6B', true);
  const reqDoc10 = adm10.documents.find(d => d.required)!;

  // 1. Upload inicial
  db.uploadDocument(adm10.id, reqDoc10.id, {
    fileName: 'doc_v1.pdf',
    fileSize: 80000,
    mimeType: 'application/pdf',
    storagePath: 'doc_v1.pdf'
  });

  // 2. Rejeição com motivo
  db.reviewDocument(reqDoc10.id, 'Rejeitado', 'Analista RH', 'Foto embaçada', 'Tirar foto com boa iluminação');

  let freshAdm10 = db.getAdmissionById(adm10.id)!;
  let freshDoc10 = freshAdm10.documents.find(d => d.id === reqDoc10.id)!;
  let docsStep10 = (freshAdm10.processSteps || []).find(s => s.stepKey === 'DOCUMENTOS')!;
  let tasks10 = (db.getOperationalTasks({ admissionId: adm10.id }).items || [])
    .filter(t => t.documentId === reqDoc10.id);

  assert(freshDoc10.status === 'Rejeitado', '6.6B Regressão: Documento rejeitado com sucesso');
  assert(freshDoc10.rejectionReason === 'Foto embaçada', '6.6B Regressão: Motivo registrado');
  assert(docsStep10.status === 'BLOQUEADA', '6.6B Regressão: Etapa DOCUMENTOS bloqueada');
  assert(tasks10.length === 1, '6.6B Regressão: Criada 1 tarefa operacional de cobrança');
  assert(tasks10[0].status === 'PENDENTE', '6.6B Regressão: Tarefa de cobrança está PENDENTE');

  // 3. Reenvio
  db.uploadDocument(adm10.id, reqDoc10.id, {
    fileName: 'doc_v2.pdf',
    fileSize: 90000,
    mimeType: 'application/pdf',
    storagePath: 'doc_v2.pdf'
  });

  freshAdm10 = db.getAdmissionById(adm10.id)!;
  freshDoc10 = freshAdm10.documents.find(d => d.id === reqDoc10.id)!;
  docsStep10 = (freshAdm10.processSteps || []).find(s => s.stepKey === 'DOCUMENTOS')!;
  tasks10 = (db.getOperationalTasks({ admissionId: adm10.id }).items || [])
    .filter(t => t.documentId === reqDoc10.id);

  assert(freshDoc10.status === 'Reenviado', '6.6B Regressão: Documento reenviado em status "Reenviado" (sem auto-aprovação)');
  assert(freshDoc10.currentVersion === 2, '6.6B Regressão: Versão incrementada para V2');
  assert(freshDoc10.versions.length === 2, '6.6B Regressão: Versões anteriores preservadas');
  assert(docsStep10.status === 'EM_ANDAMENTO', '6.6B Regressão: Bloqueio removido após reenvio');
  assert(tasks10[0].status === 'CONCLUIDA', '6.6B Regressão: Tarefa operacional concluída automaticamente pelo reenvio');

  console.log('\n=================================================');
  console.log(`RESULTADO DOS TESTES 6.6C: ${passedCount} PASSOU | ${failedCount} FALHOU`);
  console.log('=================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro fatal ao executar testes:', err);
  process.exit(1);
});
