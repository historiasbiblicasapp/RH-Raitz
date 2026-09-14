import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  UserPlus, 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  User, 
  Briefcase, 
  Calendar,
  Building2,
  FileText,
  FileCheck2,
  CheckCircle2,
  Info,
  ExternalLink,
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { formatCPF, formatPhone, validateCPF } from '../lib/cpf.ts';
import { Admission, JobPosition, JobPositionDocument } from '../types/index.ts';
import { InviteModal } from '../components/InviteModal.tsx';
import { safeFetchJson } from '../lib/api.ts';

// Schema Zod rigoroso com mensagens em português e validação matemática de CPF
const newAdmissionSchema = z.object({
  name: z.string().min(3, 'Nome completo deve ter no mínimo 3 caracteres'),
  cpf: z.string().refine((val) => validateCPF(val), {
    message: 'CPF inválido. Verifique os dígitos digitados.'
  }),
  birthDate: z.string().min(10, 'Informe uma data de nascimento válida'),
  phone: z.string().min(14, 'Informe um telefone de contato válido com DDD'),
  email: z.string().email('Informe um e-mail válido para contato'),
  role: z.string().min(2, 'Informe o cargo a ser ocupado'),
  department: z.string().min(2, 'Informe o setor ou departamento'),
  unit: z.string().min(2, 'Informe a unidade ou filial'),
  expectedStartDate: z.string().min(10, 'Informe a data prevista para início das atividades')
});

type NewAdmissionFormData = z.infer<typeof newAdmissionSchema>;

export const NewAdmission: React.FC = () => {
  const [createdAdmission, setCreatedAdmission] = useState<Admission | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableJobPositions, setAvailableJobPositions] = useState<JobPosition[]>([]);
  
  // Estados para o Bloco 3.4 — Prévia automática do checklist por cargo
  const [selectedCargoDocs, setSelectedCargoDocs] = useState<JobPositionDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(false);
  const [selectedJobPosition, setSelectedJobPosition] = useState<JobPosition | null>(null);
  
  const navigate = useNavigate();

  React.useEffect(() => {
    safeFetchJson<{ jobPositions: JobPosition[] }>('/api/job-positions?status=active')
      .then((data) => {
        if (data && data.jobPositions) {
          setAvailableJobPositions(data.jobPositions);
        }
      })
      .catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<NewAdmissionFormData>({
    resolver: zodResolver(newAdmissionSchema),
    defaultValues: {
      name: '',
      cpf: '',
      birthDate: '',
      phone: '',
      email: '',
      role: '',
      department: '',
      unit: 'Matriz - São Paulo',
      expectedStartDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
    }
  });

  const rawCpf = watch('cpf');
  const rawPhone = watch('phone');
  const watchedRole = watch('role');

  // Efeito reativo para carregar e atualizar a prévia do checklist do cargo selecionado (Bloco 3.4)
  React.useEffect(() => {
    if (!watchedRole || watchedRole.trim() === '' || availableJobPositions.length === 0) {
      setSelectedJobPosition(null);
      setSelectedCargoDocs([]);
      return;
    }

    const matched = availableJobPositions.find(
      pos => pos.name.trim().toLowerCase() === watchedRole.trim().toLowerCase() || pos.id === watchedRole
    );

    if (matched) {
      setSelectedJobPosition(matched);
      setLoadingDocs(true);
      safeFetchJson<{ jobPosition: JobPosition; documents: JobPositionDocument[] }>(
        `/api/job-positions/${matched.id}/documents?status=active`
      )
        .then((data) => {
          if (data && data.documents) {
            setSelectedCargoDocs(data.documents);
          } else {
            setSelectedCargoDocs([]);
          }
        })
        .catch(() => {
          setSelectedCargoDocs([]);
        })
        .finally(() => {
          setLoadingDocs(false);
        });
    } else {
      setSelectedJobPosition(null);
      setSelectedCargoDocs([]);
    }
  }, [watchedRole, availableJobPositions]);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('cpf', formatCPF(e.target.value), { shouldValidate: true });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('phone', formatPhone(e.target.value), { shouldValidate: true });
  };

  const requiredCount = selectedCargoDocs.filter(d => d.required).length;
  const optionalCount = selectedCargoDocs.filter(d => !d.required).length;

  const onSubmit = async (data: NewAdmissionFormData) => {
    setServerError(null);

    // Verificação proativa de conexão antes de disparar o envio
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setServerError('Seu navegador está sem conexão com a internet (ERR_INTERNET_DISCONNECTED). Verifique sua rede e tente novamente.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...data,
        jobPositionId: selectedJobPosition?.id,
        role: selectedJobPosition?.name || data.role
      };

      const result = await safeFetchJson<Admission>('/api/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setCreatedAdmission(result);
    } catch (err: any) {
      console.error('Erro ao cadastrar admissão:', err);
      const isNetworkErr = 
        !navigator.onLine || 
        err.message?.includes('fetch') || 
        err.message?.includes('NetworkError') ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('DISCONNECTED');

      if (isNetworkErr) {
        setServerError('Falha de conexão com o servidor (ERR_INTERNET_DISCONNECTED). Verifique se você está conectado à internet e tente novamente.');
      } else {
        setServerError(err.message || 'Falha ao salvar admissão.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Topo com botão voltar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Dashboard</span>
        </button>

        <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          {selectedJobPosition ? (
            <span>
              Checklist para <strong>{selectedJobPosition.name}</strong> ({selectedCargoDocs.length} documentos)
            </span>
          ) : (
            <span>Checklist por cargo gerado automaticamente</span>
          )}
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <img
              src="/raitz-logo.jpg"
              alt="Logo Raitz"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl object-cover shadow-xs border border-slate-200 shrink-0"
            />
            <div>
              <h1 className="text-lg font-bold text-slate-900">Nova Admissão</h1>
              <p className="text-xs text-slate-500">
                Preencha os dados do novo colaborador para criar a admissão e gerar o convite digital com checklist de documentos.
              </p>
            </div>
          </div>
        </div>

        {/* Mensagem de erro do servidor (ex: CPF duplicado ou queda de internet) */}
        {serverError && (
          <div className="m-6 mb-0 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start justify-between gap-3 text-rose-800 text-xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Não foi possível criar a admissão:</p>
                <p className="mt-0.5 text-rose-700">{serverError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setServerError(null)}
              className="text-rose-500 hover:text-rose-700 font-bold px-1.5 py-0.5 cursor-pointer"
              title="Fechar aviso"
            >
              ✕
            </button>
          </div>
        )}

        {/* Formulário com validação Zod */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Seção 1: Dados Pessoais */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Dados Pessoais do Colaborador</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome Completo */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  {...register('name')}
                  placeholder="Ex: Lucas Gabriel Albuquerque"
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                />
                {errors.name && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* CPF com máscara e validação matemática */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  CPF (com validação) *
                </label>
                <input
                  type="text"
                  maxLength={14}
                  value={rawCpf}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                />
                {errors.cpf && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.cpf.message}</p>
                )}
              </div>

              {/* Data de Nascimento */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Data de Nascimento *
                </label>
                <input
                  type="date"
                  {...register('birthDate')}
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                />
                {errors.birthDate && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.birthDate.message}</p>
                )}
              </div>

              {/* Telefone / WhatsApp com máscara */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Telefone / WhatsApp *
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={rawPhone}
                  onChange={handlePhoneChange}
                  placeholder="(11) 98765-4321"
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                />
                {errors.phone && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.phone.message}</p>
                )}
              </div>

              {/* E-mail */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  E-mail Pessoal / Contato *
                </label>
                <input
                  type="email"
                  {...register('email')}
                  placeholder="lucas.albuquerque@email.com"
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                />
                {errors.email && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.email.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Seção 2: Dados Profissionais e Admissão */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Briefcase className="w-3.5 h-3.5 text-blue-600" />
              <span>Dados Profissionais e Enquadramento</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Cargo */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Cargo a Ocupar *
                  </label>
                  {availableJobPositions.length > 0 && (
                    <span className="text-[11px] text-blue-600 font-medium">
                      {availableJobPositions.length} cargos cadastrados
                    </span>
                  )}
                </div>
                {availableJobPositions.length > 0 ? (
                  <select
                    {...register('role')}
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all text-slate-900"
                  >
                    <option value="">Selecione um cargo cadastrado...</option>
                    {availableJobPositions.map((pos) => (
                      <option key={pos.id} value={pos.name}>
                        {pos.name} {pos.code ? `(${pos.code})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    {...register('role')}
                    placeholder="Ex: Desenvolvedor Frontend Pleno"
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                  />
                )}
                {errors.role && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.role.message}</p>
                )}
              </div>

              {/* Setor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Setor / Departamento *
                </label>
                <input
                  type="text"
                  {...register('department')}
                  placeholder="Ex: Tecnologia da Informação"
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                />
                {errors.department && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.department.message}</p>
                )}
              </div>

              {/* Unidade */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Unidade / Filial *
                </label>
                <input
                  type="text"
                  {...register('unit')}
                  placeholder="Ex: Matriz - São Paulo"
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                />
                {errors.unit && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.unit.message}</p>
                )}
              </div>

              {/* Data Prevista de Admissão */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Data Prevista de Admissão *
                </label>
                <input
                  type="date"
                  {...register('expectedStartDate')}
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                />
                {errors.expectedStartDate && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.expectedStartDate.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Seção 3: Prévia dos Documentos Necessários (Bloco 3.4) */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Documentos Necessários</span>
              </div>

              {selectedJobPosition && !loadingDocs && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-700">
                    Cargo: <span className="text-blue-700">{selectedJobPosition.name}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Caso 1: Nenhum cargo selecionado ainda */}
            {!selectedJobPosition && !watchedRole && (
              <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                <Info className="w-4 h-4 mx-auto mb-1 text-slate-400" />
                <span>Selecione um cargo acima para visualizar a prévia do checklist de documentos configurado.</span>
              </div>
            )}

            {/* Caso 2: Carregando documentos do cargo */}
            {loadingDocs && (
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center gap-3 text-xs text-slate-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Identificando checklist configurado para {selectedJobPosition?.name}...</span>
              </div>
            )}

            {/* Caso 3: Cargo selecionado e possui documentos */}
            {!loadingDocs && selectedJobPosition && selectedCargoDocs.length > 0 && (
              <div className="space-y-3">
                {/* Resumo de contadores */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs">
                  <div className="flex items-center gap-2 font-medium text-slate-700">
                    <span>Checklist configurado:</span>
                    <span className="font-bold text-slate-900">{selectedCargoDocs.length} documentos</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {requiredCount} {requiredCount === 1 ? 'obrigatório' : 'obrigatórios'}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded-full">
                      {optionalCount} {optionalCount === 1 ? 'opcional' : 'opcionais'}
                    </span>
                  </div>
                </div>

                {/* Alerta se não houver documentos obrigatórios configurados (Requisito 17) */}
                {requiredCount === 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Este cargo não possui documentos obrigatórios configurados.</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        A admissão será criada com os documentos opcionais existentes no checklist.
                      </p>
                    </div>
                  </div>
                )}

                {/* Tabela detalhada da prévia informativa */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          <th className="py-2.5 px-3 w-12 text-center">Ordem</th>
                          <th className="py-2.5 px-3">Documento</th>
                          <th className="py-2.5 px-3">Categoria</th>
                          <th className="py-2.5 px-3 text-center">Obrigatoriedade</th>
                          <th className="py-2.5 px-3">Instruções / Formatos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedCargoDocs.map((doc, idx) => {
                          const docName = doc.document_type?.name || 'Documento';
                          const category = doc.document_type?.category || 'Geral';
                          const formats = doc.document_type?.allowed_file_types || ['PDF', 'JPG', 'PNG'];
                          const maxSize = doc.document_type?.max_file_size_mb || 10;
                          
                          return (
                            <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                                #{doc.sort_order || (idx + 1)}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                <div className="flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>{docName}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded">
                                  {category}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {doc.required ? (
                                  <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    Obrigatório
                                  </span>
                                ) : (
                                  <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
                                    Opcional
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {doc.instructions ? (
                                  <p className="text-[11px] text-blue-800 bg-blue-50/80 px-2 py-0.5 rounded inline-block font-medium mb-1">
                                    {doc.instructions}
                                  </p>
                                ) : null}
                                <div className="text-[10px] text-slate-400">
                                  Formatos: {formats.join(', ')} • Máx: {maxSize}MB
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-2.5 bg-slate-50/80 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>
                      ℹ️ Esta prévia é informativa. O checklist será gravado como fotografia imutável (snapshot) na confirmação.
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      Total: {selectedCargoDocs.length}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Caso 4: Cargo selecionado MAS NÃO possui checklist configurado (Requisito 8) */}
            {!loadingDocs && selectedJobPosition && selectedCargoDocs.length === 0 && (
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-amber-900">
                      Este cargo ainda não possui checklist de documentos configurado.
                    </h3>
                    <p className="text-[11px] text-amber-800 mt-1">
                      Configure o checklist de documentos deste cargo em <strong>Cadastros → Checklist por cargo</strong> antes de continuar para solicitar os documentos corretos.
                    </p>
                    <p className="text-[11px] text-amber-700/80 mt-1">
                      Nenhum documento aleatório será gerado se a admissão for criada sem checklist configurado.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-amber-200/60">
                  <button
                    type="button"
                    onClick={() => navigate(`/cargos/${selectedJobPosition.id}/checklist`)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-amber-100/90 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Configurar Checklist deste Cargo</span>
                  </button>
                  <span className="text-[10px] text-amber-700">
                    (Você poderá voltar e continuar o cadastro após salvar o checklist)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Nota de conformidade LGPD */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">Conformidade com a LGPD e Inicialização Automática</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ao cadastrar a admissão, o sistema gravará o snapshot do checklist de documentos configurado para o cargo selecionado e gerará um link individual com token aleatório inviolável.
              </p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-800 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Cadastrando admissão...' : 'Criar Admissão e Gerar Convite'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Convite exibido após o cadastro com sucesso */}
      <InviteModal
        admission={createdAdmission}
        isOpen={!!createdAdmission}
        onClose={() => {
          setCreatedAdmission(null);
          navigate('/dashboard');
        }}
      />
    </div>
  );
};
