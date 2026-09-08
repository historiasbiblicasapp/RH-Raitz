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
  Building2
} from 'lucide-react';
import { formatCPF, formatPhone, validateCPF } from '../lib/cpf.ts';
import { Admission } from '../types/index.ts';
import { InviteModal } from '../components/InviteModal.tsx';

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
  
  const navigate = useNavigate();

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

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('cpf', formatCPF(e.target.value), { shouldValidate: true });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('phone', formatPhone(e.target.value), { shouldValidate: true });
  };

  const onSubmit = async (data: NewAdmissionFormData) => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Erro ao registrar admissão.');
      }

      setCreatedAdmission(result);
    } catch (err: any) {
      setServerError(err.message || 'Falha ao salvar admissão.');
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

        <span className="text-xs text-slate-400 font-medium">
          Checklist de 5 documentos gerado automaticamente
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
                Preencha os dados do novo colaborador para criar a admissão e gerar o convite digital.
              </p>
            </div>
          </div>
        </div>

        {/* Mensagem de erro do servidor (ex: CPF duplicado) */}
        {serverError && (
          <div className="m-6 mb-0 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Não foi possível criar a admissão:</p>
              <p>{serverError}</p>
            </div>
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
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Cargo a Ocupar *
                </label>
                <input
                  type="text"
                  {...register('role')}
                  placeholder="Ex: Desenvolvedor Frontend Pleno"
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                />
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
              <div>
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

          {/* Nota de conformidade LGPD */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">Conformidade com a LGPD e Inicialização Automática</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ao cadastrar a admissão, o sistema criará a checklist com os 5 documentos obrigatórios (CPF, RG, CTPS, Comprovante de Residência e Diploma) e um link individual com token aleatório inviolável.
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
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-50"
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
