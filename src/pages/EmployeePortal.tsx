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
  X,
  Send,
  CheckCheck,
  FileCheck,
  LogOut,
  RotateCcw
} from 'lucide-react';
import { Admission, AdmissionDocument } from '../types/index.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { formatCPF } from '../lib/cpf.ts';
import { safeFetchJson } from '../lib/api.ts';

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

  // Estado de finalização do cadastro / envio pelo colaborador
  const [isFinishingSubmission, setIsFinishingSubmission] = useState(false);
  const [finishSuccessModal, setFinishSuccessModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showDocumentsDetail, setShowDocumentsDetail] = useState(false);
  const [isSessionClosed, setIsSessionClosed] = useState(false);

  const fetchAdmission = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await safeFetchJson<Admission>(`/api/invite/${token}`);
      if (!data) {
        throw new Error('Convite de admissão inválido, expirado ou cancelado.');
      }
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
      await safeFetchJson(`/api/invite/${token}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termVersion: '1.0-2025' })
      });
      
      setAdmission(prev => prev ? { ...prev, consentGiven: true } : null);
      setActiveStep(2);
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar consentimento.');
    } finally {
      setIsSubmittingConsent(false);
    }
  };

  // Ação 2: Confirmar Dados Pessoais
  const handleConfirmData = async () => {
    setIsSubmittingData(true);
    try {
      const data = await safeFetchJson<{ admission: Admission }>(`/api/invite/${token}/confirm-data`, {
        method: 'POST'
      });
      
      if (data?.admission) {
        setAdmission(data.admission);
      }
      setActiveStep(3);
    } catch (err: any) {
      alert(err.message || 'Erro ao confirmar dados.');
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
      const data = await safeFetchJson<{ admission: Admission }>(`/api/invite/${token}/request-correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details: correctionDetails })
      });
      
      if (data?.admission) {
        setAdmission(data.admission);
      }
      setShowCorrectionModal(false);
      setActiveStep(3);
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar solicitação.');
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

      let data: any = null;
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(data?.error || `Falha no servidor (${res.status}) ao enviar arquivo.`);
      }

      if (data?.admission) {
        setAdmission(data.admission);
      }
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

  // Ação 4: Finalizar Cadastro e Envio de Documentos
  const handleFinishSubmission = async () => {
    if (!token || !admission) return;

    // Verificar se todos os obrigatórios foram enviados
    const requiredDocs = admission.documents.filter(d => d.required);
    const missingDocs = requiredDocs.filter(d => d.status === 'Não enviado' || d.currentVersion === 0);

    if (missingDocs.length > 0) {
      const names = missingDocs.map(d => d.documentType).join(', ');
      alert(`Ainda é necessário enviar todos os documentos obrigatórios antes de finalizar:\n\n• ${names}`);
      return;
    }

    setIsFinishingSubmission(true);
    setUploadErrorMessage(null);
    try {
      const data = await safeFetchJson<{ success: boolean; message: string; admission: Admission }>(
        `/api/invite/${token}/finish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (data?.admission) {
        setAdmission(data.admission);
      }
      setFinishSuccessModal(true);
    } catch (err: any) {
      alert(err.message || 'Erro ao finalizar envio.');
    } finally {
      setIsFinishingSubmission(false);
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

  if (isSessionClosed) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 text-center shadow-lg space-y-5 animate-in zoom-in-95">
          <div className="flex items-center justify-center gap-2 mb-1">
            <img
              src="/raitz-logo.jpg"
              alt="Logo Raitz"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl object-cover shadow-xs border border-slate-200"
            />
            <div className="text-left">
              <span className="font-bold text-slate-900 text-sm block leading-none">
                Admissão Digital
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Galvanização Raitz</span>
            </div>
          </div>

          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCheck className="w-9 h-9" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {admission?.candidateCompletedSubmission
                ? 'Cadastro Finalizado e Entregue!'
                : 'Cadastro Salvo com Sucesso!'}
            </h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {admission?.candidateCompletedSubmission
                ? `Obrigado, ${firstName}! Seus dados e documentos já foram encaminhados à equipe de RH. Você pode fechar o navegador do seu celular com tranquilidade.`
                : `Seu progresso e documentos foram salvos com segurança. Você pode fechar o navegador agora e retornar quando desejar pelo link do seu convite.`}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 text-slate-800 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Dados protegidos pela LGPD</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Para encerrar totalmente no seu celular, basta fechar esta aba no seu navegador (Google Chrome, Safari, etc.).
            </p>
          </div>

          <button
            type="button"
            id="btn-reopen-portal"
            onClick={() => setIsSessionClosed(false)}
            className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reabrir Meu Cadastro</span>
          </button>
        </div>
      </div>
    );
  }

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

          <div className="flex items-center gap-2">
            <div className="hidden xs:flex items-center gap-1.5 text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Acesso Seguro</span>
            </div>

            <button
              type="button"
              id="btn-header-close-portal"
              onClick={() => setShowExitModal(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300/80 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Terminar ou Fechar Cadastro"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-600" />
              <span>Terminar / Fechar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal (Mobile-First Container) */}
      <main className="max-w-lg mx-auto p-4 space-y-4 pb-32">
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
        {(admission.dataConfirmed || admission.correctionRequest || activeStep === 3) && (() => {
          const requiredDocs = admission.documents.filter(d => d.required);
          const pendingRequiredDocs = requiredDocs.filter(d => d.status === 'Não enviado' || d.currentVersion === 0);
          const isAllRequiredSent = requiredDocs.length > 0 && pendingRequiredDocs.length === 0;

          return (
            <div className="space-y-4">
              {/* TELA DE CONCLUSÃO / CADASTRO FINALIZADO (quando já enviado pelo colaborador) */}
              {admission.candidateCompletedSubmission && (
                <div className="bg-white rounded-2xl border-2 border-emerald-500/40 p-5 shadow-sm space-y-4 animate-in fade-in">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <CheckCheck className="w-7 h-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 mb-1">
                        <Sparkles className="w-3 h-3" />
                        Envio Finalizado pelo Candidato
                      </span>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        Cadastro Finalizado com Sucesso!
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Obrigado, <strong>{firstName}</strong>! Seus dados e documentos foram enviados para o RH da Raitz em {new Date(admission.candidateFinishedAt || admission.updatedAt).toLocaleDateString('pt-BR')} às {new Date(admission.candidateFinishedAt || admission.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.
                      </p>
                    </div>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-xs space-y-1.5">
                    <p className="font-semibold text-emerald-950">Status atual: Em conferência pelo RH</p>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Nossa equipe de Recursos Humanos já recebeu seus dados e iniciou a validação. Você já pode fechar esta página no seu celular com tranquilidade. Se precisarmos de algo, você será avisado via WhatsApp.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      id="btn-close-completed-screen"
                      onClick={() => setShowExitModal(true)}
                      className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Fechar / Terminar Cadastro</span>
                    </button>

                    <button
                      type="button"
                      id="btn-toggle-docs-detail"
                      onClick={() => setShowDocumentsDetail(prev => !prev)}
                      className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>{showDocumentsDetail ? 'Ocultar Documentos' : 'Ver Documentos Enviados'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* AVISO DE TUDO PREENCHIDO / BOTÃO DE TERMINAR O CADASTRO (quando ainda não finalizou) */}
              {!admission.candidateCompletedSubmission && isAllRequiredSent && (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl shadow-xs space-y-3 animate-in fade-in">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                        Todos os documentos obrigatórios foram carregados!
                      </h3>
                      <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                        Excelente, você anexou tudo o que é necessário. Clique no botão abaixo para concluir o envio e notificar a equipe de RH.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="btn-employee-top-finish-submission"
                    onClick={handleFinishSubmission}
                    disabled={isFinishingSubmission}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>{isFinishingSubmission ? 'Finalizando cadastro...' : 'Concluir e Finalizar Cadastro Agora'}</span>
                  </button>
                </div>
              )}

              {/* Lista dos Documentos (visível se ainda não concluiu OU se clicou em ver detalhes) */}
              {(!admission.candidateCompletedSubmission || showDocumentsDetail) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm font-bold text-slate-900">
                      {admission.candidateCompletedSubmission ? 'Documentos Enviados' : 'Meus Documentos'}
                    </h2>
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
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              doc.required ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {doc.required ? 'Obrigatório' : 'Opcional'}
                            </span>
                            {doc.category && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                {doc.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <StatusBadge status={doc.status} size="sm" />
                    </div>

                    {/* Instruções específicas para o candidato cadastradas no checklist */}
                    {doc.instructions && (
                      <div className="my-2 p-2.5 bg-blue-50/70 border border-blue-100/60 rounded-xl text-[11px] text-blue-900">
                        <span className="font-semibold text-blue-950">Orientações:</span> {doc.instructions}
                      </div>
                    )}

                    {/* Formatos e tamanhos aceitos */}
                    {(doc.allowed_file_types || doc.max_file_size_mb) && (
                      <p className="text-[10px] text-slate-400 mb-2">
                        Formatos aceitos: {(doc.allowed_file_types || ['PDF', 'JPG', 'PNG']).join(', ')} • Tamanho máximo: {doc.max_file_size_mb || 10}MB
                      </p>
                    )}

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

              {/* Ação Operacional do Colaborador: Finalizar / Concluir Envio do Cadastro */}
              {!isCompleted && !admission.candidateCompletedSubmission && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 mt-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                      isAllRequiredSent ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Send className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-bold text-slate-900">
                        {isAllRequiredSent 
                          ? 'Tudo Pronto para Concluir' 
                          : 'Finalizar e Concluir Envio de Documentos'}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        {isAllRequiredSent ? (
                          'Todos os seus documentos obrigatórios foram carregados! Clique no botão abaixo para concluir o envio e notificar a equipe de Recursos Humanos para conferência.'
                        ) : (
                          `Você já enviou ${admission.documents.filter(d => d.currentVersion > 0).length} de ${admission.totalDocuments} documento(s). Restam ${pendingRequiredDocs.length} obrigatório(s) para poder concluir o envio.`
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      id="btn-employee-finish-submission"
                      onClick={handleFinishSubmission}
                      disabled={isFinishingSubmission || !isAllRequiredSent}
                      className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                        isAllRequiredSent
                          ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white ring-2 ring-emerald-500/20'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      }`}
                    >
                      {isFinishingSubmission ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Finalizando cadastro...</span>
                        </>
                      ) : (
                        <>
                          <CheckCheck className="w-4 h-4" />
                          <span>
                            {isAllRequiredSent
                              ? 'Concluir e Finalizar Envio para o RH'
                              : `Preencha os obrigatórios para finalizar (${pendingRequiredDocs.length} pendente)`}
                          </span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowExitModal(true)}
                      className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Fechar Cadastro</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Modal de Sucesso após Finalizar Envio */}
        {finishSuccessModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-xl animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Cadastro Concluído com Sucesso!</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Obrigado, <strong>{firstName}</strong>! Seus dados e documentos foram enviados e nossa equipe de Recursos Humanos já recebeu a notificação para iniciar a conferência.
                </p>
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 text-left space-y-1">
                  <p className="font-semibold text-slate-700">O que acontece agora?</p>
                  <p>1. O RH fará a análise e conferência dos seus documentos.</p>
                  <p>2. Se algum documento precisar de reajuste, você receberá orientações por aqui.</p>
                  <p>3. Você pode fechar esta página no seu celular com tranquilidade.</p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-finish-modal"
                onClick={() => {
                  setFinishSuccessModal(false);
                  setIsSessionClosed(true);
                }}
                className="w-full py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-colors cursor-pointer"
              >
                Concluir e Fechar Cadastro
              </button>
            </div>
          </div>
        )}

        {/* Modal de Fechamento / Saída do Portal */}
        {showExitModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-xl animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
                <LogOut className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Fechar Cadastro</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {admission.candidateCompletedSubmission ? (
                    'Seu cadastro já foi finalizado e enviado com sucesso ao RH! Você pode fechar esta tela com total segurança.'
                  ) : admission.documents.filter(d => d.required && (d.status === 'Não enviado' || d.currentVersion === 0)).length === 0 ? (
                    'Você já carregou todos os documentos obrigatórios! Deseja concluir o envio agora para o RH ou fechar para continuar mais tarde?'
                  ) : (
                    'Seu progresso e documentos já enviados ficam salvos automaticamente na nuvem. Você pode fechar agora e retornar a qualquer momento pelo mesmo link recebido.'
                  )}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                {!admission.candidateCompletedSubmission && admission.documents.filter(d => d.required && (d.status === 'Não enviado' || d.currentVersion === 0)).length === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowExitModal(false);
                      handleFinishSubmission();
                    }}
                    className="w-full py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Concluir e Finalizar Envio</span>
                  </button>
                )}

                <button
                  type="button"
                  id="btn-confirm-exit-portal"
                  onClick={() => {
                    setShowExitModal(false);
                    try {
                      window.close();
                    } catch {}
                    setIsSessionClosed(true);
                  }}
                  className="w-full py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Fechar Janela / Salvar Sessão
                </button>

                <button
                  type="button"
                  onClick={() => setShowExitModal(false)}
                  className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Continuar no Portal
                </button>
              </div>
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

      {/* Barra Fixa Inferior Mobile para Terminar/Fechar Cadastro */}
      {admission && (admission.dataConfirmed || admission.correctionRequest || activeStep === 3) && (() => {
        const requiredDocs = admission.documents.filter(d => d.required);
        const pendingRequiredDocs = requiredDocs.filter(d => d.status === 'Não enviado' || d.currentVersion === 0);
        const isAllRequiredSent = requiredDocs.length > 0 && pendingRequiredDocs.length === 0;

        return (
          <aside aria-label="Ações de Conclusão e Fechamento" className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl px-4 py-3">
            <div className="max-w-lg mx-auto flex items-center gap-2.5">
              {admission.candidateCompletedSubmission ? (
                <button
                  type="button"
                  id="btn-sticky-close-completed"
                  onClick={() => setShowExitModal(true)}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cadastro Finalizado • Fechar Janela</span>
                </button>
              ) : isAllRequiredSent ? (
                <>
                  <button
                    type="button"
                    id="btn-sticky-finish-submission"
                    onClick={handleFinishSubmission}
                    disabled={isFinishingSubmission}
                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer ring-2 ring-emerald-500/30"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>{isFinishingSubmission ? 'Finalizando...' : 'Concluir e Finalizar'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowExitModal(true)}
                    className="py-3 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
                    title="Fechar ou Sair"
                  >
                    Fechar
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-slate-800 block truncate">
                      {admission.documents.filter(d => d.currentVersion > 0).length}/{admission.totalDocuments} documentos enviados
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      Faltam {pendingRequiredDocs.length} obrigatório(s)
                    </span>
                  </div>
                  <button
                    type="button"
                    id="btn-sticky-save-exit"
                    onClick={() => setShowExitModal(true)}
                    className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Salvar e Fechar</span>
                  </button>
                </>
              )}
            </div>
          </aside>
        );
      })()}
    </div>
  );
};
