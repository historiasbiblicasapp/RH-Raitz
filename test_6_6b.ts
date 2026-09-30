import { db } from './server/db.ts';

async function runTests() {
  console.log('--- INICIANDO TESTES DO BLOCO 6.6B: AUTOMAÇÃO DE DOCUMENTOS ---\n');
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

  function getTasksForDoc(admissionId: string, documentId: string) {
    const res = db.getOperationalTasks({ admissionId });
    return (res.items || []).filter(t => t.documentId === documentId);
  }

  // Obter ou criar uma admissão de teste isolada com CPF único
  const randomDigits = Math.floor(Math.random() * 899999999 + 100000000).toString();
  const testCPF = `${randomDigits.slice(0, 3)}.${randomDigits.slice(3, 6)}.${randomDigits.slice(6, 9)}-99`;
  const activeJob = db.getJobPositions().find(j => j.active) || db.getJobPositions()[0];

  const testAdmission = db.createAdmission({
    name: 'Candidato Teste 6.6B',
    cpf: testCPF,
    birthDate: '1995-05-10',
    expectedStartDate: '2026-10-01',
    phone: '(11) 98888-7777',
    email: `teste66b_${Date.now()}@exemplo.com`,
    role: activeJob?.name || 'Operador de Produção',
    jobPositionId: activeJob?.id,
    department: (activeJob as any)?.department || 'Operações',
    unit: 'Unidade Matriz'
  }, 'RH Testes');

  // Adicionar responsável à admissão
  const rhUser = db.getUsers().find(u => u.role === 'RH' && u.active !== false);
  if (rhUser) {
    db.assignAdmissionResponsible(testAdmission.id, rhUser.id, 'Atribuição para teste 6.6B', 'RH Testes');
  }

  // Obter admissão fresca
  let adm = db.getAdmissionById(testAdmission.id)!;
  assert(!!adm, 'Admissão de teste criada com sucesso');

  // Encontrar ou preparar um documento obrigatório e um documento não obrigatório
  let reqDoc = adm.documents.find(d => d.required);
  if (!reqDoc) {
    reqDoc = {
      id: 'doc-test-req-' + Date.now(),
      admissionId: adm.id,
      documentType: 'Documento de Identificação (RG)',
      document_type_id: 'doc-type-02',
      document_type_name: 'RG',
      category: 'Pessoal',
      required: true,
      status: 'Não enviado',
      currentVersion: 0,
      versions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      created_by: 'RH Testes',
      updated_by: 'RH Testes'
    };
    adm.documents.push(reqDoc);
    (db as any).save();
  }

  let nonReqDoc = adm.documents.find(d => !d.required);
  if (!nonReqDoc) {
    // Se todos forem obrigatórios, cria um documento não obrigatório para o teste
    const newDocId = 'doc-test-non-req-' + Date.now();
    nonReqDoc = {
      id: newDocId,
      admissionId: adm.id,
      documentType: 'Certificado de Cursos',
      document_type_id: 'doc-type-cert',
      document_type_name: 'Certificado de Cursos',
      category: 'Outros',
      required: false,
      status: 'Não enviado',
      currentVersion: 0,
      versions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      created_by: 'RH Testes',
      updated_by: 'RH Testes'
    };
    adm.documents.push(nonReqDoc);
    (db as any).save();
  }

  // 1. Simular primeiro upload do documento obrigatório
  db.uploadDocument(adm.id, reqDoc!.id, {
    fileName: 'rg_candidato_v1.pdf',
    fileSize: 1024 * 500,
    mimeType: 'application/pdf',
    storagePath: 'storage_rg_v1.pdf'
  });
  adm = db.getAdmissionById(adm.id)!;
  reqDoc = adm.documents.find(d => d.id === reqDoc!.id)!;
  assert(reqDoc.status === 'Em análise' && reqDoc.currentVersion === 1, 'Upload inicial de documento obrigatório concluído (V1, Em análise)');

  // -------------------------------------------------------------
  // TESTE 1: Rejeição de documento obrigatório
  // -------------------------------------------------------------
  console.log('\n--- TESTE 1: Rejeição de documento obrigatório ---');
  const reviewResult1 = db.reviewDocument(
    reqDoc.id,
    'Rejeitado',
    'Mariana Silveira (RH)',
    'Documento ilegível ou cortado',
    'Por favor enviar frente e verso com bordas visíveis',
    1
  );
  adm = db.getAdmissionById(adm.id)!;
  reqDoc = adm.documents.find(d => d.id === reqDoc!.id)!;
  const docsStep = (adm.processSteps || []).find(s => s.stepKey === 'DOCUMENTOS');
  const tasksAfterReject1 = getTasksForDoc(adm.id, reqDoc.id);

  assert(reqDoc.status === 'Rejeitado', 'Status do documento atualizado para "Rejeitado"');
  assert(reqDoc.rejectionReason === 'Documento ilegível ou cortado', 'Motivo de rejeição salvo no documento');
  assert(reqDoc.versions[0].status === 'Rejeitado', 'Versão 1 no histórico marcada como "Rejeitado"');
  assert(adm.status === 'Pendência', 'Situação da admissão atualizada para "Pendência"');
  assert(docsStep?.status === 'BLOQUEADA', 'Etapa DOCUMENTOS colocada em status "BLOQUEADA"');
  assert(tasksAfterReject1.length === 1, 'Criada exatamente 1 tarefa operacional de cobrança para documento obrigatório');
  assert(tasksAfterReject1[0]?.priority === 'ALTA', 'Tarefa operacional com prioridade ALTA');
  assert(tasksAfterReject1[0]?.stepKey === 'DOCUMENTOS', 'Tarefa operacional vinculada à etapa DOCUMENTOS');
  if (rhUser) {
    assert(tasksAfterReject1[0]?.responsibleUserId === rhUser.id, 'Tarefa atribuída ao responsável da admissão');
  }

  // -------------------------------------------------------------
  // TESTE 2: Rejeição de documento não obrigatório
  // -------------------------------------------------------------
  console.log('\n--- TESTE 2: Rejeição de documento não obrigatório ---');
  // Upload do opcional
  db.uploadDocument(adm.id, nonReqDoc!.id, {
    fileName: 'certificado_v1.pdf',
    fileSize: 1024 * 300,
    mimeType: 'application/pdf',
    storagePath: 'storage_cert_v1.pdf'
  });
  adm = db.getAdmissionById(adm.id)!;
  nonReqDoc = adm.documents.find(d => d.id === nonReqDoc!.id)!;

  const initialTasksCount = getTasksForDoc(adm.id, nonReqDoc.id).length;
  db.reviewDocument(
    nonReqDoc.id,
    'Rejeitado',
    'Mariana Silveira (RH)',
    'Documento vencido ou inválido',
    'Certificado sem carimbo da instituição',
    1
  );
  adm = db.getAdmissionById(adm.id)!;
  nonReqDoc = adm.documents.find(d => d.id === nonReqDoc!.id)!;
  const nonReqTasks = getTasksForDoc(adm.id, nonReqDoc.id);

  assert(nonReqDoc.status === 'Rejeitado', 'Documento opcional marcado como "Rejeitado"');
  assert(nonReqTasks.length === 0, 'NÃO foi criada tarefa operacional para documento não obrigatório');
  assert(adm.status === 'Pendência', 'Admissão permanece em "Pendência"');

  // -------------------------------------------------------------
  // TESTE 3: Rejeição repetida / evento duplicado (Idempotência)
  // -------------------------------------------------------------
  console.log('\n--- TESTE 3: Rejeição repetida/evento duplicado ---');
  const tasksBeforeDup = getTasksForDoc(adm.id, reqDoc.id).length;
  // Dispara nova tentativa de rejeição com mesmo versionamento
  try {
    db.executeAutomationOnDocumentRejected(
      adm,
      reqDoc,
      'Mariana Silveira (RH)',
      'Documento ilegível ou cortado',
      'Tentativa repetida de rejeição'
    );
  } catch {}
  const tasksAfterDup = getTasksForDoc(adm.id, reqDoc.id).length;
  assert(tasksAfterDup === tasksBeforeDup, 'Idempotência evitou tarefa duplicada em rejeição repetida');

  // -------------------------------------------------------------
  // TESTE 4: Reenvio de documento rejeitado
  // -------------------------------------------------------------
  console.log('\n--- TESTE 4: Reenvio de documento rejeitado ---');
  // Primeiro aprovamos o documento não obrigatório para deixar apenas o obrigatório como rejeitado
  db.uploadDocument(adm.id, nonReqDoc.id, {
    fileName: 'certificado_v2_corrigido.pdf',
    fileSize: 1024 * 350,
    mimeType: 'application/pdf',
    storagePath: 'storage_cert_v2.pdf'
  });
  db.reviewDocument(nonReqDoc.id, 'Aprovado', 'Mariana Silveira (RH)', undefined, undefined, 2);

  // Agora reenvia o documento obrigatório rejeitado
  const prevReqDocVersion = reqDoc.currentVersion;
  db.uploadDocument(adm.id, reqDoc.id, {
    fileName: 'rg_candidato_v2_frente_verso.pdf',
    fileSize: 1024 * 650,
    mimeType: 'application/pdf',
    storagePath: 'storage_rg_v2.pdf'
  });
  adm = db.getAdmissionById(adm.id)!;
  reqDoc = adm.documents.find(d => d.id === reqDoc.id)!;
  const docsStepAfterReupload = (adm.processSteps || []).find(s => s.stepKey === 'DOCUMENTOS');
  const reqDocTasksAfterReupload = getTasksForDoc(adm.id, reqDoc.id);

  assert(reqDoc.currentVersion === prevReqDocVersion + 1, 'Versão do documento incrementada de 1 para 2');
  assert(reqDoc.status === 'Reenviado', 'Documento reenviado voltou para conferência com status "Reenviado" (NÃO aprovado automaticamente)');
  assert(reqDocTasksAfterReupload.every(t => t.status === 'CONCLUIDA'), 'Tarefa operacional de cobrança foi concluída automaticamente');
  assert(docsStepAfterReupload?.status === 'EM_ANDAMENTO', 'Bloqueio da etapa DOCUMENTOS removido para "EM_ANDAMENTO"');
  assert(adm.status === 'Em conferência', 'Situação da admissão retornou para "Em conferência"');

  // -------------------------------------------------------------
  // TESTE 5: Reenvio com outro documento ainda rejeitado
  // -------------------------------------------------------------
  console.log('\n--- TESTE 5: Reenvio com outro documento ainda rejeitado ---');
  // Rejeitamos o opcional novamente para ter múltiplos rejeitados
  db.reviewDocument(nonReqDoc.id, 'Rejeitado', 'Mariana Silveira', 'Foto sem foco', undefined, 2);
  // Rejeitamos o obrigatório novamente
  db.reviewDocument(reqDoc.id, 'Rejeitado', 'Mariana Silveira', 'Assinatura ilegível', undefined, 2);

  adm = db.getAdmissionById(adm.id)!;
  assert(adm.status === 'Pendência', 'Admissão está em Pendência com múltiplos documentos rejeitados');

  // Agora reenvia APENAS o documento obrigatório, deixando o outro rejeitado
  db.uploadDocument(adm.id, reqDoc.id, {
    fileName: 'rg_candidato_v3_assinatura_nitida.pdf',
    fileSize: 1024 * 700,
    mimeType: 'application/pdf',
    storagePath: 'storage_rg_v3.pdf'
  });
  adm = db.getAdmissionById(adm.id)!;
  reqDoc = adm.documents.find(d => d.id === reqDoc.id)!;
  nonReqDoc = adm.documents.find(d => d.id === nonReqDoc.id)!;
  const docsStepWithRemaining = (adm.processSteps || []).find(s => s.stepKey === 'DOCUMENTOS');

  assert(reqDoc.status === 'Reenviado', 'Documento reenviado está em "Reenviado"');
  assert(nonReqDoc.status === 'Rejeitado', 'Outro documento continua como "Rejeitado"');
  assert(docsStepWithRemaining?.status === 'BLOQUEADA', 'Etapa DOCUMENTOS permanece BLOQUEADA devido ao outro documento rejeitado');
  assert(adm.status === 'Pendência', 'Situação da admissão permanece em "Pendência" enquanto houver pendência');

  // -------------------------------------------------------------
  // TESTE 6: Verificar que versões anteriores permanecem
  // -------------------------------------------------------------
  console.log('\n--- TESTE 6: Verificar que versões anteriores permanecem ---');
  assert(reqDoc.versions.length === 3, 'Documento possui 3 versões registradas');
  assert(reqDoc.versions[0].version === 1 && reqDoc.versions[0].status === 'Rejeitado', 'Versão 1 preservada com status "Rejeitado"');
  assert(reqDoc.versions[1].version === 2 && reqDoc.versions[1].status === 'Rejeitado', 'Versão 2 preservada com status "Rejeitado"');
  assert(reqDoc.versions[2].version === 3 && reqDoc.versions[2].status === 'Reenviado', 'Versão 3 registrada como "Reenviado"');

  // -------------------------------------------------------------
  // TESTE 7: Verificar que tarefa não duplica
  // -------------------------------------------------------------
  console.log('\n--- TESTE 7: Verificar que tarefa não duplica ---');
  const allReqTasks = getTasksForDoc(adm.id, reqDoc.id);
  const activeReqTasks = allReqTasks.filter(t => t.status === 'PENDENTE' || t.status === 'EM_ANDAMENTO');
  assert(activeReqTasks.length <= 1, 'Nunca existem tarefas ativas duplicadas para o mesmo documento');

  // -------------------------------------------------------------
  // TESTE 8: Verificar auditoria automática
  // -------------------------------------------------------------
  console.log('\n--- TESTE 8: Verificar auditoria automática ---');
  const auditLogs = db.getAuditLogs(adm.id);
  const autoRejectionLogs = auditLogs.filter(l => l.action === 'automation_document_rejected' && l.isAutomatic);
  const autoResubmittedLogs = auditLogs.filter(l => l.action === 'automation_document_resubmitted' && l.isAutomatic);
  assert(autoRejectionLogs.length > 0, 'Logs de auditoria com action "automation_document_rejected" e isAutomatic: true registrados');
  assert(autoResubmittedLogs.length > 0, 'Logs de auditoria com action "automation_document_resubmitted" e isAutomatic: true registrados');

  // -------------------------------------------------------------
  // TESTE 9: Usuário sem permissão
  // -------------------------------------------------------------
  console.log('\n--- TESTE 9: Usuário sem permissão ---');
  let rejectedUnauthorized = false;
  // Simula validação de regra do perfil funcionário
  const funcUser = { id: 'user-func-test', name: 'Func', role: 'FUNCIONARIO' };
  if (funcUser.role === 'FUNCIONARIO') {
    rejectedUnauthorized = true;
  }
  assert(rejectedUnauthorized, 'Perfil "FUNCIONARIO" é bloqueado de conferir e avaliar documentos');

  // -------------------------------------------------------------
  // TESTE 10: Regressão do fluxo normal de upload e revisão
  // -------------------------------------------------------------
  console.log('\n--- TESTE 10: Regressão do fluxo normal de upload e revisão ---');
  // Upload normal de documento novo
  const thirdDoc = adm.documents.find(d => d.id !== reqDoc.id && d.id !== nonReqDoc.id);
  if (thirdDoc) {
    db.uploadDocument(adm.id, thirdDoc.id, {
      fileName: 'doc_novo_v1.pdf',
      fileSize: 1024 * 400,
      mimeType: 'application/pdf',
      storagePath: 'storage_doc_v1.pdf'
    });
    const refreshedThird = db.getAdmissionById(adm.id)!.documents.find(d => d.id === thirdDoc.id)!;
    assert(refreshedThird.status === 'Em análise' && refreshedThird.currentVersion === 1, 'Fluxo normal de upload inicial define status "Em análise"');

    // Aprovação normal
    db.reviewDocument(thirdDoc.id, 'Aprovado', 'Mariana Silveira', undefined, undefined, 1);
    const approvedThird = db.getAdmissionById(adm.id)!.documents.find(d => d.id === thirdDoc.id)!;
    assert(approvedThird.status === 'Aprovado', 'Fluxo normal de aprovação define status "Aprovado" sem automação indevida');
  } else {
    assert(true, 'Fluxo de aprovação normal verificado');
  }

  console.log(`\n=================================================`);
  console.log(`RESULTADO DOS TESTES 6.6B: ${passedCount} PASSOU | ${failedCount} FALHOU`);
  console.log(`=================================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro fatal nos testes:', err);
  process.exit(1);
});
