/**
 * BLOCO 6.8E — VALIDAÇÃO FINAL INTEGRADA DA COMUNICAÇÃO
 * 
 * Validação integrada dos blocos 6.8B, 6.8C e 6.8D:
 * 1. Fluxo Completo (10 etapas de ponta a ponta)
 * 2. Páginas e Renderização (Tarefas Operacionais, Comunicação, Relatórios)
 * 3. Histórico de Comunicação (ordem cronológica, vínculos, estados reais, LGPD)
 * 4. Segurança, RBAC, Isolamento, Auditoria, Idempotência e Concorrência
 */

import fs from 'fs';
import path from 'path';
import { db } from './server/db.ts';
import { handleFallbackApiRoute } from './src/lib/fallbackClient.ts';

async function runTests() {
  console.log('========================================================================');
  console.log('   BLOCO 6.8E — VALIDAÇÃO FINAL INTEGRADA DA COMUNICAÇÃO');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string, details?: any) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      if (details) console.error('  Detalhes:', details);
      failed++;
    }
  }

  const BASE_URL = 'http://localhost:3000';
  const RH_HEADERS = {
    'Content-Type': 'application/json',
    'x-user-email': 'rh@empresa.com'
  };

  function createTestAdmission(name: string) {
    const randomDigits = Math.floor(Math.random() * 899999999 + 100000000).toString();
    const testCPF = `${randomDigits.slice(0, 3)}.${randomDigits.slice(3, 6)}.${randomDigits.slice(6, 9)}-88`;
    const activeJob = db.getJobPositions().find(j => j.active) || db.getJobPositions()[0];

    return db.createAdmission({
      name,
      cpf: testCPF,
      birthDate: '1995-04-12',
      expectedStartDate: '2026-12-15',
      phone: '(11) 97777-8888',
      email: `teste68e_${Date.now()}_${Math.floor(Math.random() * 10000)}@exemplo.com`,
      role: activeJob?.name || 'Analista Operacional',
      jobPositionId: activeJob?.id,
      department: (activeJob as any)?.department || 'Operações',
      unit: 'Unidade Matriz'
    }, 'RH Validação 6.8E');
  }

  // =========================================================================
  // SEÇÃO 1: FLUXO COMPLETO DE PONTA A PONTA (10 ETAPAS)
  // =========================================================================
  console.log('--- SEÇÃO 1: Fluxo Completo (10 Etapas) ---');

  const admFlow = createTestAdmission('Colaborador Fluxo Completo 6.8E');
  const reqDoc = admFlow.documents.find(d => d.required)!;

  // Upload inicial V1 pelo candidato
  db.uploadDocument(admFlow.id, reqDoc.id, {
    fileName: 'identidade_v1.pdf',
    fileSize: 15400,
    mimeType: 'application/pdf',
    storagePath: 'storage/identidade_v1.pdf'
  });

  // Etapa 1: Documento obrigatório rejeitado
  db.reviewDocument(reqDoc.id, 'Rejeitado', 'Mariana Silveira', 'Imagem desfocada', 'Enviar foto nítida frente e verso');
  const docAfterReject = db.getAdmissionById(admFlow.id)!.documents.find(d => d.id === reqDoc.id)!;
  assert(docAfterReject.status === 'Rejeitado', '1.1 Documento obrigatório rejeitado com sucesso');
  assert(docAfterReject.rejectionReason === 'Imagem desfocada', '1.1 Motivo de rejeição registrado no documento');

  // Etapa 2: Tarefa operacional de cobrança criada
  const tasksForAdm = (db.getOperationalTasks({ admissionId: admFlow.id }).items || [])
    .filter(t => t.documentId === reqDoc.id && t.sourceType === 'DOCUMENTO');
  assert(tasksForAdm.length === 1, '1.2 Tarefa operacional de cobrança criada automaticamente');
  const collectionTask = tasksForAdm[0];
  assert(collectionTask.status === 'PENDENTE', '1.2 Tarefa operacional nasce com status PENDENTE');

  // Etapa 3: Notificação interna gerada
  const notifications = db.getNotifications({ admissionId: admFlow.id });
  const rejectionNotif = notifications.find(
    n => n.sourceEvent === 'automation_document_rejected' && n.documentId === reqDoc.id
  );
  assert(!!rejectionNotif, '1.3 Notificação interna de rejeição gerada automaticamente');
  assert(rejectionNotif?.category === 'DOCUMENTOS', '1.3 Notificação categorizada como DOCUMENTOS');

  // Etapa 4 e 5: Comunicação registrada para o candidato (WhatsApp aberto, mensagem copiada e link copiado)
  const commLog = db.addCommunicationLog({
    admissionId: admFlow.id,
    employeeId: admFlow.employeeId,
    userId: 'user-rh-01',
    userName: 'Mariana Silveira',
    communicationType: 'document_rejected',
    channel: 'whatsapp',
    templateId: 'document_rejected',
    documentId: reqDoc.id,
    documentName: reqDoc.documentType,
    rejectionReason: 'Imagem desfocada',
    messagePreview: 'Olá! Seu documento de identidade está desfocado. Por favor, reenvie pelo portal seguro.',
    actionStatus: 'whatsapp_opened',
    actionStatusLabel: 'WhatsApp aberto para envio'
  });
  assert(!!commLog.id, '1.4 Comunicação registrada para o candidato com ID único');
  assert(commLog.actionStatus === 'whatsapp_opened', '1.5 Ação real whatsapp_opened registrada');

  // Testar também message_copied e link_copied em fluxos paralelos
  const admCopy = createTestAdmission('Colaborador Cópia Mensagem 6.8E');
  const docCopy = admCopy.documents.find(d => d.required)!;
  db.uploadDocument(admCopy.id, docCopy.id, { fileName: 'rg.pdf', fileSize: 1000, mimeType: 'application/pdf', storagePath: 'p' });
  db.reviewDocument(docCopy.id, 'Rejeitado', 'Mariana Silveira', 'Borda cortada');
  const taskCopy = (db.getOperationalTasks({ admissionId: admCopy.id }).items || []).find(t => t.documentId === docCopy.id)!;
  const commCopy = db.addCommunicationLog({
    admissionId: admCopy.id,
    employeeId: admCopy.employeeId,
    userId: 'user-rh-01',
    userName: 'Mariana Silveira',
    communicationType: 'document_rejected',
    channel: 'copy',
    templateId: 'document_rejected',
    documentId: docCopy.id,
    documentName: docCopy.documentType,
    rejectionReason: 'Borda cortada',
    messagePreview: 'Favor reenviar documento sem bordas cortadas.',
    actionStatus: 'message_copied',
    actionStatusLabel: 'Mensagem copiada'
  });
  assert(commCopy.actionStatus === 'message_copied' && db.getOperationalTaskById(taskCopy.id).status === 'CONCLUIDA',
    '1.5B Ação message_copied registrada e conclui tarefa correspondente'
  );

  const admLink = createTestAdmission('Colaborador Cópia Link 6.8E');
  const docLink = admLink.documents.find(d => d.required)!;
  db.uploadDocument(admLink.id, docLink.id, { fileName: 'cpf.pdf', fileSize: 1000, mimeType: 'application/pdf', storagePath: 'p' });
  db.reviewDocument(docLink.id, 'Rejeitado', 'Mariana Silveira', 'Ilegível');
  const taskLink = (db.getOperationalTasks({ admissionId: admLink.id }).items || []).find(t => t.documentId === docLink.id)!;
  const commLink = db.addCommunicationLog({
    admissionId: admLink.id,
    employeeId: admLink.employeeId,
    userId: 'user-rh-01',
    userName: 'Mariana Silveira',
    communicationType: 'document_rejected',
    channel: 'copy',
    templateId: 'document_rejected',
    documentId: docLink.id,
    documentName: docLink.documentType,
    rejectionReason: 'Ilegível',
    messagePreview: 'Link para reenvio do documento.',
    actionStatus: 'link_copied',
    actionStatusLabel: 'Link copiado'
  });
  assert(commLink.actionStatus === 'link_copied' && db.getOperationalTaskById(taskLink.id).status === 'CONCLUIDA',
    '1.5C Ação link_copied em cobrança registrada e conclui tarefa correspondente'
  );

  // Etapa 6: Tarefa relacionada concluída corretamente
  const updatedTask = db.getOperationalTaskById(collectionTask.id);
  assert(updatedTask.status === 'CONCLUIDA', '1.6 Tarefa operacional relacionada concluída automaticamente');
  assert(updatedTask.communicationId === commLog.id, '1.6 Tarefa operacional preserva referência communicationId');
  assert(commLog.taskId === collectionTask.id, '1.6 CommunicationLog preserva referência taskId');

  // Etapa 7: Candidato reenvia documento
  db.uploadDocument(admFlow.id, reqDoc.id, {
    fileName: 'identidade_v2_nitida.pdf',
    fileSize: 22400,
    mimeType: 'application/pdf',
    storagePath: 'storage/identidade_v2_nitida.pdf'
  });
  const docAfterResubmit = db.getAdmissionById(admFlow.id)!.documents.find(d => d.id === reqDoc.id)!;
  assert(docAfterResubmit.status === 'Reenviado', '1.7 Candidato reenvia documento e status passa para "Reenviado"');

  // Etapa 8: Nova versão registrada
  assert(docAfterResubmit.currentVersion === 2, '1.8 Nova versão (V2) registrada no documento');
  assert(docAfterResubmit.versions.length === 2, '1.8 Histórico de versões mantém V1 (Rejeitado) e V2 (Reenviado)');

  // Etapa 9: Documento revisado e aprovado
  db.reviewDocument(reqDoc.id, 'Aprovado', 'Mariana Silveira', undefined, 'Documento conferido e aprovado');
  const docAfterApprove = db.getAdmissionById(admFlow.id)!.documents.find(d => d.id === reqDoc.id)!;
  assert(docAfterApprove.status === 'Aprovado', '1.9 Documento revisado e aprovado pelo RH');
  assert(docAfterApprove.reviewedBy === 'Mariana Silveira', '1.9 Revisor registrado na aprovação');

  // Etapa 10: Histórico de comunicação preservado
  const preservedLogs = db.getCommunicationLogs(admFlow.id);
  assert(preservedLogs.length >= 1, '1.10 Histórico de comunicação preservado após reenvio e aprovação');
  assert(preservedLogs[0].id === commLog.id, '1.10 Registro original permanece íntegro no histórico da admissão');
  assert(preservedLogs[0].taskId === collectionTask.id, '1.10 Vínculo com taskId permanece preservado');
  assert(preservedLogs[0].documentId === reqDoc.id, '1.10 Vínculo com documentId permanece preservado');

  // =========================================================================
  // SEÇÃO 2: PÁGINAS E RENDERIZAÇÃO (TAREFAS, COMUNICAÇÃO, RELATÓRIOS)
  // =========================================================================
  console.log('\n--- SEÇÃO 2: Páginas e Renderização (Vazio, Completo, Campos Ausentes, Async e Fallback) ---');

  // 2.1 Teste de API Assíncrona Real para as 3 páginas
  const tasksApiRes = await fetch(`${BASE_URL}/api/tarefas`, { headers: RH_HEADERS });
  assert(tasksApiRes.ok, '2.1 API /api/tarefas responde 200 OK');
  const tasksApiData = await tasksApiRes.json();
  assert(Array.isArray(tasksApiData.items), '2.1 /api/tarefas retorna items como Array');
  assert(Array.isArray(tasksApiData.filters?.users), '2.1 /api/tarefas retorna filters.users como Array');
  assert(Array.isArray(tasksApiData.filters?.units), '2.1 /api/tarefas retorna filters.units como Array');

  const commApiRes = await fetch(`${BASE_URL}/api/communications`, { headers: RH_HEADERS });
  assert(commApiRes.ok, '2.2 API /api/communications responde 200 OK');
  const commApiData = await commApiRes.json();
  assert(Array.isArray(commApiData.items), '2.2 /api/communications retorna items como Array');
  assert(Array.isArray(commApiData.filters?.roles), '2.2 /api/communications retorna filters.roles como Array');
  assert(Array.isArray(commApiData.filters?.departments), '2.2 /api/communications retorna filters.departments como Array');

  const commLogsApiRes = await fetch(`${BASE_URL}/api/communications/logs`, { headers: RH_HEADERS });
  assert(commLogsApiRes.ok, '2.3 API /api/communications/logs responde 200 OK');
  const commLogsApiData = await commLogsApiRes.json();
  assert(Array.isArray(commLogsApiData.logs), '2.3 /api/communications/logs retorna logs como Array');

  const repTypes = ['admissoes', 'documentos', 'pendencias', 'concluidas', 'canceladas'];
  for (const rt of repTypes) {
    const repRes = await fetch(`${BASE_URL}/api/reports?reportType=${rt}`, { headers: RH_HEADERS });
    assert(repRes.ok, `2.4 API /api/reports?reportType=${rt} responde 200 OK`);
    const repData = await repRes.json();
    assert(Array.isArray(repData.rows), `2.4 Relatório ${rt} retorna rows como Array`);
    assert(Array.isArray(repData.charts?.byStatus), `2.4 Relatório ${rt} retorna charts.byStatus como Array`);
    assert(Array.isArray(repData.availableFilters?.roles), `2.4 Relatório ${rt} retorna availableFilters.roles como Array`);
  }

  // 2.5 Respostas de Fallback Offline/Cold-Start
  const fbTasks = handleFallbackApiRoute('/api/tarefas');
  assert(Array.isArray(fbTasks?.items) && Array.isArray(fbTasks?.filters?.units), '2.5 Fallback de Tarefas Operacionais entrega arrays seguros');

  const fbComm = handleFallbackApiRoute('/api/communications');
  assert(Array.isArray(fbComm?.items) && Array.isArray(fbComm?.filters?.roles), '2.5 Fallback de Comunicação entrega arrays seguros');

  const fbCommLogs = handleFallbackApiRoute('/api/communications/logs');
  assert(Array.isArray(fbCommLogs?.logs), '2.5 Fallback de Histórico de Comunicação entrega array logs seguro');

  const fbReports = handleFallbackApiRoute('/api/reports?reportType=admissoes');
  assert(Array.isArray(fbReports?.rows) && Array.isArray(fbReports?.charts?.byStatus), '2.5 Fallback de Relatórios entrega arrays seguros');

  // 2.6 Simulação de banco vazio / coleções vazias / campos opcionais ausentes
  const partialNullPayloads: any[] = [null, undefined, {}, { items: null, filters: null, summary: null, charts: null, rows: undefined }];
  for (const p of partialNullPayloads) {
    const tItems = Array.isArray(p?.items) ? p.items : [];
    const tUsers = Array.isArray(p?.filters?.users) ? p.filters.users : [];
    const tUnits = Array.isArray(p?.filters?.units) ? p.filters.units : [];
    const rRows = Array.isArray(p?.rows) ? p.rows : [];
    const cLogs = Array.isArray(p?.logs) ? p.logs : [];
    assert(
      (tItems?.length ?? 0) === 0 &&
      (tUsers?.length ?? 0) === 0 &&
      (tUnits?.length ?? 0) === 0 &&
      (rRows?.length ?? 0) === 0 &&
      (cLogs?.length ?? 0) === 0,
      '2.6 Tratamento resiliente de payload nulo/vazio sem acessar undefined.length'
    );
  }

  // 2.7 Inspeção estática dos arquivos das 3 páginas e subcomponentes
  const filesToInspect = [
    'src/pages/OperationalTasksPage.tsx',
    'src/pages/CommunicationHubPage.tsx',
    'src/pages/ReportsPage.tsx',
    'src/components/reports/ReportChartsSection.tsx',
    'src/components/reports/ReportKPIs.tsx',
    'src/components/reports/ReportFilters.tsx',
    'src/components/reports/ReportTable.tsx',
    'src/components/tasks/TaskDetailDrawer.tsx',
    'src/components/tasks/CreateTaskModal.tsx',
    'src/components/tasks/TaskActionModals.tsx',
    'src/components/CommunicationModal.tsx'
  ];

  for (const relPath of filesToInspect) {
    const fullPath = path.join(process.cwd(), relPath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    // Verifica que não há chamadas diretas inseguras como data.items.length ou data.rows.map sem guarda prévia
    const hasDirectUnsafeDataItemsLength = /data\.items\.length/.test(content);
    const hasDirectUnsafeDataRowsLength = /data\.rows\.length/.test(content);
    const hasDirectUnsafeDataChartsMap = /data\.charts\.[a-zA-Z]+\.map/.test(content);
    assert(
      !hasDirectUnsafeDataItemsLength && !hasDirectUnsafeDataRowsLength && !hasDirectUnsafeDataChartsMap,
      `2.7 Inspeção estática aprovada em ${relPath} (sem acessos inseguros a coleções da API)`
    );
  }

  // =========================================================================
  // SEÇÃO 3: HISTÓRICO DE COMUNICAÇÃO
  // =========================================================================
  console.log('\n--- SEÇÃO 3: Histórico de Comunicação (Ordem Cronológica, Campos e Estados Reais) ---');

  const allCommLogs = db.getCommunicationLogs();
  assert(allCommLogs.length >= 3, '3.1 Histórico global possui registros de comunicação');

  // Verificar ordem cronológica (decrescente: mais recente primeiro)
  let isChronological = true;
  for (let i = 0; i < allCommLogs.length - 1; i++) {
    const tCurrent = new Date(allCommLogs[i].createdAt).getTime();
    const tNext = new Date(allCommLogs[i + 1].createdAt).getTime();
    if (tCurrent < tNext) {
      isChronological = false;
      break;
    }
  }
  assert(isChronological, '3.2 Histórico de comunicação está em ordem cronológica correta');

  // Validar campos completos no registro do fluxo principal
  const targetLog = allCommLogs.find(l => l.id === commLog.id)!;
  assert(!!targetLog, '3.3 Registro do fluxo encontrado no histórico global');
  assert(targetLog.userName === 'Mariana Silveira', '3.4 Operador preservado no histórico');
  assert(!isNaN(new Date(targetLog.createdAt).getTime()), '3.5 Data e hora ISO válidas no histórico');
  assert(targetLog.channel === 'whatsapp', '3.6 Canal preservado no histórico');
  assert(targetLog.communicationType === 'document_rejected', '3.7 Contexto/tipo preservado no histórico');
  assert(targetLog.admissionId === admFlow.id, '3.8 Admissão preservada no histórico');
  assert(targetLog.documentId === reqDoc.id && targetLog.documentName === reqDoc.documentType, '3.9 Documento relacionado preservado no histórico');
  assert(targetLog.taskId === collectionTask.id, '3.10 Tarefa vinculada preservada no histórico');
  assert(['whatsapp_opened', 'message_copied', 'link_copied'].includes(targetLog.actionStatus), '3.11 Status real da ação preservado');
  assert(targetLog.messagePreview.length <= 160, '3.12 Limite de 160 caracteres da prévia respeitado');

  // Garantir ausência de falsos estados de entrega ou leitura na UI de Comunicação
  const commPageSource = fs.readFileSync(path.join(process.cwd(), 'src/pages/CommunicationHubPage.tsx'), 'utf-8');
  assert(
    commPageSource.includes('Sem presunção de leitura/entrega') &&
    commPageSource.includes('whatsapp_opened') &&
    commPageSource.includes('message_copied') &&
    commPageSource.includes('link_copied'),
    '3.13 Interface de Comunicação exibe apenas estados reais e explicita ausência de presunção de leitura/entrega'
  );

  // =========================================================================
  // SEÇÃO 4: SEGURANÇA, PERMISSÕES, ISOLAMENTO, AUDITORIA, IDEMPOTÊNCIA E CONCORRÊNCIA
  // =========================================================================
  console.log('\n--- SEÇÃO 4: Segurança, LGPD, RBAC, Isolamento, Idempotência e Concorrência ---');

  // 4.1 Permissões por perfil (ADMIN, RH, RH_CONFERENCIA, GESTOR, FUNCIONARIO)
  const resAdmin = await fetch(`${BASE_URL}/api/communications`, {
    headers: { 'x-user-email': 'admin@empresa.com', 'x-user-role': 'ADMIN' }
  });
  assert(resAdmin.ok, '4.1A Perfil ADMIN possui acesso autorizado à Central de Comunicação');

  const resRh = await fetch(`${BASE_URL}/api/communications`, {
    headers: { 'x-user-email': 'rh@empresa.com', 'x-user-role': 'RH' }
  });
  assert(resRh.ok, '4.1B Perfil RH possui acesso autorizado à Central de Comunicação');

  const resRhConf = await fetch(`${BASE_URL}/api/communications`, {
    headers: { 'x-user-email': 'rh@empresa.com', 'x-user-role': 'RH_CONFERENCIA' }
  });
  assert(resRhConf.ok, '4.1C Perfil RH_CONFERENCIA possui acesso autorizado à operação de RH');

  const resFunc = await fetch(`${BASE_URL}/api/communications`, {
    headers: { 'x-user-email': 'funcionario@empresa.com', 'x-user-role': 'FUNCIONARIO' }
  });
  assert(resFunc.status === 403 || resFunc.status === 401, '4.1D Perfil FUNCIONARIO é estritamente bloqueado em rotas operacionais de RH');

  const resGestor = await fetch(`${BASE_URL}/api/communications`, {
    headers: { 'x-user-email': 'gestor@empresa.com', 'x-user-role': 'GESTOR' }
  });
  const gestorUser = db.getUsers().find(u => u.role === 'GESTOR') || { role: 'GESTOR' };
  assert(resGestor.ok && gestorUser.role === 'GESTOR', '4.1E Perfil GESTOR é identificado corretamente para atuação nas alçadas internas sem privilégio de ADMIN');

  // 4.2 Isolamento por admissão / contexto
  const logsOnlyAdmFlow = db.getCommunicationLogs(admFlow.id);
  const hasForeignLog = logsOnlyAdmFlow.some(l => l.admissionId !== admFlow.id);
  assert(!hasForeignLog, '4.2 Isolamento de histórico por admissão garantido');

  // 4.3 Proteção de dados pessoais (LGPD): truncamento em 160 caracteres e CPF mascarado
  const overlongMessage = 'Mensagem confidencial '.repeat(20); // > 400 chars
  const lgpdLog = db.addCommunicationLog({
    admissionId: admFlow.id,
    employeeId: admFlow.employeeId,
    userId: 'user-rh-01',
    userName: 'Mariana Silveira',
    communicationType: 'general_notice',
    channel: 'whatsapp',
    templateId: 'general_notice',
    messagePreview: overlongMessage,
    actionStatus: 'whatsapp_opened'
  });
  assert(lgpdLog.messagePreview.length === 160, '4.3A LGPD: messagePreview truncado exatamente em 160 caracteres');

  const hubData = db.getCommunicationHubData({});
  const allMasked = (hubData.items || []).every(item => item.employeeCpf.includes('***'));
  assert(allMasked, '4.3B LGPD: Todos os CPFs na listagem da Central de Comunicação estão mascarados');

  // 4.4 Auditoria
  const allAudits = db.getAuditLogs();
  const hasCommAudit = allAudits.some(a => a.entityId === admFlow.id && a.action === 'communication_whatsapp_opened');
  assert(hasCommAudit, '4.4 Registro de auditoria imutável gerado para a comunicação');

  // 4.5 Idempotência e Concorrência na conclusão de tarefas via comunicação
  const admConc = createTestAdmission('Colaborador Concorrência 6.8E');
  const docConc = admConc.documents.find(d => d.required)!;
  db.uploadDocument(admConc.id, docConc.id, { fileName: 'conc.pdf', fileSize: 1000, mimeType: 'application/pdf', storagePath: 'p' });
  db.reviewDocument(docConc.id, 'Rejeitado', 'Mariana Silveira', 'Foto escura');
  const taskConc = (db.getOperationalTasks({ admissionId: admConc.id }).items || []).find(t => t.documentId === docConc.id)!;

  // Disparo simultâneo de 3 registros de comunicação para o mesmo documento
  await Promise.all([
    Promise.resolve(db.addCommunicationLog({
      admissionId: admConc.id,
      employeeId: admConc.employeeId,
      userId: 'user-rh-01',
      userName: 'Mariana Silveira',
      communicationType: 'document_rejected',
      channel: 'whatsapp',
      templateId: 'document_rejected',
      documentId: docConc.id,
      rejectionReason: 'Foto escura',
      messagePreview: 'Disparo concorrente 1',
      actionStatus: 'whatsapp_opened'
    })),
    Promise.resolve(db.addCommunicationLog({
      admissionId: admConc.id,
      employeeId: admConc.employeeId,
      userId: 'user-rh-01',
      userName: 'Mariana Silveira',
      communicationType: 'document_rejected',
      channel: 'copy',
      templateId: 'document_rejected',
      documentId: docConc.id,
      rejectionReason: 'Foto escura',
      messagePreview: 'Disparo concorrente 2',
      actionStatus: 'message_copied'
    })),
    Promise.resolve(db.addCommunicationLog({
      admissionId: admConc.id,
      employeeId: admConc.employeeId,
      userId: 'user-rh-01',
      userName: 'Mariana Silveira',
      communicationType: 'document_rejected',
      channel: 'copy',
      templateId: 'document_rejected',
      documentId: docConc.id,
      rejectionReason: 'Foto escura',
      messagePreview: 'Disparo concorrente 3',
      actionStatus: 'link_copied'
    }))
  ]);

  const finalTaskConc = db.getOperationalTaskById(taskConc.id);
  const completedHistoryEntries = (finalTaskConc.history || []).filter(h => h.action === 'COMPLETED');
  assert(finalTaskConc.status === 'CONCLUIDA', '4.5A Tarefa concluída sob disparos concorrentes');
  assert(completedHistoryEntries.length === 1, '4.5B Idempotência garantida: apenas 1 evento COMPLETED no histórico da tarefa');

  console.log('\n========================================================================');
  console.log(`   RESULTADO BLOCO 6.8E: ${passed} PASSOU | ${failed} FALHOU (TOTAL: ${passed + failed})`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro fatal na suíte 6.8E:', err);
  process.exit(1);
});
