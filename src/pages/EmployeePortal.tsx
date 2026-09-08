import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Camera, 
  Upload, 
  FileText, 
  Check, 
  AlertTriangle, 
  ArrowRight, 
  User, 
  ChevronRight, 
  Sparkles, 
  Lock,
  Phone,
  Mail,
  Calendar,
  Building2,
  Briefcase,
  X
} from 'lucide-react';
import { Admission, AdmissionDocument } from '../types/index.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { formatCPF } from '../lib/cpf.ts';

export const EmployeePortal: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [admission, setAdmission] = useState<Admission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Etapas do fluxo do funcionário:
  // 1: Consentimento LGPD (se ainda não dado)
  // 2: Confirmação dos dados cadastrais (se ainda não confirmados)
  // 3: Checklist e envio de documentos
  // 4: Conclusão
  const [activeStep, setActiveStep] = useState<number>(1);

  // Estado do termo LGPD
  const [consentChecked, setConsentChecked] = useState(false);
  const [isSubmittingConsent, setIsSubmittingConsent] = useState(false);

  // Estado da confirmação de dados
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionDetails, setCorrectionDetails] = useState('');
  const [isSubmittingData, setIsSubmittingData] = useState(false);

  // Estado de upload de documento
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [targetDocForUpload, setTargetDocForUpload] = useState<AdmissionDocument | null>(null);

  const fetchAdmission = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/invite/${token}`);
      if (!res.ok) {
        throw new Error('Convite de admissão inválido, expirado ou cancelado.');
      }
      const data: Admission = await res.json();
      setAdmission(data);

      // Determina a etapa adequada baseada no progresso real do candidato
      if (!data.consentGiven) {
        setActiveStep(1);
      } else if (!data.dataConfirmed && !data.correctionRequest) {
        setActiveStep(2);
      } else {
        setActiveStep(3);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar seu convite.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmission();
  }, [token]);

  // Ação 1: Aceitar Consentimento LGPD
  const handleAcceptConsent = async () => {
    if (!consentChecked) {
      alert('Por favor, marque a caixa de ciência para prosseguir.');
      return;
    }
    setIsSubmittingConsent(true);
    try {
      const res = await fetch(`/api/invite/${token}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termVersion: '1.0-2025' })
      });
      if (!res.ok) throw new Error('Erro ao registrar consentimento.');
      
      setAdmission(prev => prev ? { ...prev, consentGiven: true } : null);
      setActiveStep(2);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingConsent(false);
    }
  };

  // Ação 2: Confirmar Dados Pessoais
  const handleConfirmData = async () => {
    setIsSubmittingData(true);
    try {
      const res = await fetch(`/api/invite/${token}/confirm-data`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Erro ao confirmar dados.');
      
      const data = await res.json();
      setAdmission(data.admission);
      setActiveStep(3);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingData(false);
    }
  };

  // Ação 2 (alternativa): Apontar divergência / solicitar correção
  const handleSendCorrectionRequest = async () => {
    if (!correctionDetails.trim()) {
      alert('Informe quais campos precisam de correção.');
      return;
    }
    setIsSubmittingData(true);
    try {
      const res = await fetch(`/api/invite/${token}/request-correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details: correctionDetails })
      });
      if (!res.ok) throw new Error('Erro ao registrar solicitação.');
      
      const data = await res.json();
      setAdmission(data.admission);
      setShowCorrectionModal(false);
      setActiveStep(3);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingData(false);
    }
  };

  // Ação 3: Upload de Documento
  const handleTriggerUpload = (doc: AdmissionDocument, useCamera: boolean) => {
    setTargetDocForUpload(doc);
    setUploadErrorMessage(null);
    setUploadSuccessMessage(null);

    if (useCamera && cameraInputRef.current) {
      cameraInputRef.current.click();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetDocForUpload || !token) return;

    // Validações no cliente: tamanho e extensão
    const maxBytes = 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadErrorMessage('O arquivo é muito grande. O tamanho máximo permitido é 15 MB.');
      return;
    }

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      setUploadErrorMessage('Formato inválido. Por favor, envie arquivos em formato PDF, JPG ou PNG.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploadingDocId(targetDocForUpload.id);
    setUploadErrorMessage(null);

    try {
      const res = await fetch(`/api/invite/${token}/upload/${targetDocForUpload.id}`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao enviar arquivo.');
      }

      setAdmission(data.admission);
      setUploadSuccessMessage(`Documento "${targetDocForUpload.documentType}" enviado com sucesso! Status: Em análise.`);
      
      // Limpa os inputs
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      
      setTimeout(() => setUploadSuccessMessage(null), 5000);
    } catch (err: any) {
      setUploadErrorMessage(err.message || 'Erro ao realizar upload do documento.');
    } finally {
      setUploadingDocId(null);
      setTargetDocForUpload(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Abrindo seu portal admissional...</p>
        </div>
      </div>
    );
  }

  if (error || !admission) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-1">Convite Não Encontrado</h2>
          <p className="text-xs text-slate-500 mb-4">
            {error || 'O link pode estar expirado ou incorreto. Por favor, entre em contato com a equipe de Recursos Humanos da empresa.'}
          </p>
        </div>
      </div>
    );
  }

  const firstName = admission.employee.name.split(' ')[0];
  const isCompleted = admission.status === 'Concluída';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-12">
      {/* Hidden inputs para upload de arquivo e câmera */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf,image/jpeg,image/png,image/jpg"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Topo fixo da marca */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 py-3 shadow-xs">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/raitz-logo.jpg"
              alt="Logo Raitz"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-lg object-cover shadow-xs border border-slate-200 shrink-0"
            />
            <div>
              <span className="font-bold text-slate-900 text-xs sm:text-sm block leading-none">
                Admissão Digital
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Raitz • Portal do Colaborador</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Acesso Seguro</span>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal (Mobile-First Container) */}
      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Banner de Boas-Vindas */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <img
                src="/raitz-logo.jpg"
                alt="Logo Raitz"
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-md object-cover shadow-xs border border-white/20 shrink-0"
              />
              <div className="inline-flex items-center gap-1.5 bg-white/15 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                <Sparkles className="w-3 h-3" />
                <span>Novo Colaborador • Raitz</span>
              </div>
            </div>
            <h1 className="text-xl font-bold leading-tight">
              Bem-vindo(a), {firstName}! 👋
            </h1>
            <p className="text-xs text-blue-100 mt-1">
              Cargo: <strong className="text-white">{admission.employee.role}</strong> • {admission.employee.department}
            </p>

            {/* Progresso de Envio */}
            <div className="mt-4 pt-3 border-t border-white/15">
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span>Progresso da sua admissão</span>
                <span>{admission.progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${admission.progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-blue-200 mt-1">
                {admission.approvedDocuments} de {admission.totalDocuments} documentos aprovados pelo RH
              </p>
            </div>
          </div>
        </div>

        {/* Notificações e feedbacks de upload */}
        {uploadSuccessMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{uploadSuccessMessage}</span>
          </div>
        )}

        {uploadErrorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{uploadErrorMessage}</span>
          </div>
        )}

        {/* PASSO 1: Termo de Consentimento e Ciência LGPD */}
        {!admission.consentGiven && activeStep === 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">1. Termo de Ciência e Privacidade</h2>
                <p className="text-[11px] text-slate-500">Conformidade com a Lei Geral de Proteção de Dados (LGPD)</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 text-xs text-slate-600 border border-slate-200 leading-relaxed max-h-48 overflow-y-auto">
              <p className="font-semibold text-slate-800 mb-1.5">
                Tratamento de Dados Pessoais para Admissão
              </p>
              <p className="mb-2">
                Os seus dados cadastrais e os documentos digitais enviados através desta plataforma serão utilizados estritamente para a finalidade de análise e formalização do seu processo de admissão, cumprimento de obrigações legais (como o envio ao eSocial) e elaboração do contrato de trabalho, nos termos dos artigos 7º, incisos V e IX da Lei Federal nº 13.709/2018 (LGPD).
              </p>
              <p className="text-[11px] text-slate-500">
                Seus documentos serão mantidos em armazenamento privativo criptografado e acessíveis apenas pela equipe autorizada do setor de Recursos Humanos.
              </p>
            </div>

            <label className="flex items-start gap-3 p-3 bg-blue-50/60 rounded-xl border border-blue-100 cursor-pointer text-xs select-none">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
              />
              <span className="font-semibold text-slate-800">
                Li e estou ciente do uso dos meus dados e documentos para o processo de admissão.
              </span>
            </label>

            <button
              type="button"
              disabled={!consentChecked || isSubmittingConsent}
              onClick={handleAcceptConsent}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-3 px-4 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              <span>{isSubmittingConsent ? 'Registrando ciência...' : 'Prosseguir para Conferência'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* PASSO 2: Conferência dos Dados Cadastrais */}
        {admission.consentGiven && !admission.dataConfirmed && !admission.correctionRequest && activeStep === 2 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">2. Conferência dos seus Dados</h2>
                <p className="text-[11px] text-slate-500">Verifique se as informações abaixo estão corretas</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 divide-y divide-slate-200/80 text-xs space-y-2">
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">Nome completo:</span>
                <span className="font-bold text-slate-900 text-right">{admission.employee.name}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">CPF:</span>
                <span className="font-bold text-slate-900 font-mono">{formatCPF(admission.employee.cpf)}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Data de nascimento:</span>
                <span className="font-semibold text-slate-900">
                  {new Date(admission.employee.birthDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Telefone:</span>
                <span className="font-semibold text-slate-900">{admission.employee.phone}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">E-mail:</span>
                <span className="font-semibold text-slate-900 truncate max-w-[180px]">{admission.employee.email}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Cargo:</span>
                <span className="font-semibold text-slate-900">{admission.employee.role}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Setor:</span>
                <span className="font-semibold text-slate-900">{admission.employee.department}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={isSubmittingData}
                onClick={handleConfirmData}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-3 px-4 rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar meus dados</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCorrectionModal(true)}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-medium py-2"
              >
                Preciso corrigir meus dados
              </button>
            </div>
          </div>
        )}

        {/* Modal de Solicitação de Correção de Dados */}
        {showCorrectionModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Solicitar Correção de Dados</h3>
                <button onClick={() => setShowCorrectionModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Descreva abaixo o que precisa ser corrigido. Nossa equipe de RH será notificada imediatamente.
              </p>

              <textarea
                rows={3}
                value={correctionDetails}
                onChange={(e) => setCorrectionDetails(e.target.value)}
                placeholder="Ex: Meu sobrenome está incorreto / Minha data de nascimento é 15/05/1994..."
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={isSubmittingData}
                  onClick={handleSendCorrectionRequest}
                  className="flex-1 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                >
                  {isSubmittingData ? 'Enviando...' : 'Enviar para o RH'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Aviso caso correção cadastral tenha sido solicitada */}
        {admission.correctionRequest && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Solicitação de correção em análise pelo RH</span>
            </div>
            <p className="text-[11px] text-amber-800">
              Você informou: "{admission.correctionRequest.details}". Enquanto isso, você já pode adiantar o envio dos documentos abaixo.
            </p>
          </div>
        )}

        {/* PASSO 3: Checklist de Documentos e Envio */}
        {(admission.dataConfirmed || admission.correctionRequest || activeStep === 3) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-slate-900">Meus Documentos</h2>
              <span className="text-xs text-slate-500 font-medium">
                {admission.approvedDocuments}/{admission.totalDocuments} aprovados
              </span>
            </div>

            {/* Lista dos 5 Documentos com Status e Ações */}
            <div className="space-y-2.5">
              {admission.documents.map((doc) => {
                const isUploadingThis = uploadingDocId === doc.id;
                const isApproved = doc.status === 'Aprovado';
                const isRejected = doc.status === 'Rejeitado';
                const isInAnalysis = doc.status === 'Em análise' || doc.status === 'Reenviado';

                return (
                  <div
                    key={doc.id}
                    className={`bg-white rounded-2xl border p-4 transition-all shadow-xs ${
                      isRejected 
                        ? 'border-rose-300 ring-2 ring-rose-500/10' 
                        : isApproved 
                        ? 'border-emerald-200' 
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl border ${
                          isApproved
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isRejected
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : isInAnalysis
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-slate-900">{doc.documentType}</h3>
                          <span className="text-[10px] text-slate-400">Obrigatório</span>
                        </div>
                      </div>

                      <StatusBadge status={doc.status} size="sm" />
                    </div>

                    {/* Feedback específico se foi recusado pelo RH */}
                    {isRejected && (
                      <div className="my-2.5 p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-xs">
                        <div className="flex items-center gap-1.5 text-rose-800 font-bold mb-0.5">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Documento recusado: {doc.rejectionReason}</span>
                        </div>
                        {doc.rejectionNotes && (
                          <p className="text-[11px] text-rose-700 pl-5">
                            "{doc.rejectionNotes}"
                          </p>
                        )}
                        <p className="text-[10px] text-rose-500 font-medium pl-5 mt-1">
                          Envie um novo documento ou foto mais nítida para nova conferência.
                        </p>
                      </div>
                    )}

                    {/* Detalhes do arquivo atual */}
                    {doc.fileName && (
                      <div className="text-[11px] text-slate-500 mb-2.5 flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded-lg">
                        <span className="truncate max-w-[200px]">{doc.fileName}</span>
                        <span>V{doc.currentVersion}</span>
                      </div>
                    )}

                    {/* Botões de Ação para Envio (Tirar Foto ou Escolher Arquivo) */}
                    {!isApproved && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {/* Botão Tirar Foto (Câmera do celular) */}
                        <button
                          type="button"
                          disabled={isUploadingThis}
                          onClick={() => handleTriggerUpload(doc, true)}
                          className="flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs py-2 px-3 rounded-xl transition-colors disabled:opacity-50"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{isRejected ? 'Tirar nova foto' : 'Tirar foto'}</span>
                        </button>

                        {/* Botão Escolher Arquivo / PDF */}
                        <button
                          type="button"
                          disabled={isUploadingThis}
                          onClick={() => handleTriggerUpload(doc, false)}
                          className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2 px-3 rounded-xl transition-colors disabled:opacity-50"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isUploadingThis ? 'Enviando...' : 'Arquivo / PDF'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Celebração de Conclusão */}
        {isCompleted && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center shadow-xs">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-base font-bold text-emerald-900">Parabéns! Sua admissão está concluída!</h2>
            <p className="text-xs text-emerald-700 mt-1 max-w-xs mx-auto">
              Todos os seus documentos obrigatórios foram analisados e aprovados pelo setor de Recursos Humanos.
            </p>
          </div>
        )}

        {/* Rodapé informativo */}
        <div className="text-center text-[11px] text-slate-400 pt-4">
          <p>Admissão Digital • Sistema Seguro em conformidade com a LGPD</p>
        </div>
      </main>
    </div>
  );
};
