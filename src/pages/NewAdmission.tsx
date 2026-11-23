import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Check,
  AlertCircle,
  ShieldCheck,
  User,
  Phone
} from 'lucide-react';
import { formatPhone } from '../lib/cpf.ts';
import { Admission } from '../types/index.ts';
import { InviteModal } from '../components/InviteModal.tsx';
import { safeFetchJson } from '../lib/api.ts';

const newAdmissionSchema = z.object({
  name: z.string().trim().min(3, 'Nome completo deve ter no mínimo 3 caracteres'),
  phone: z.string().refine(
    (val) => {
      const digits = val.replace(/\D/g, '');
      return digits.length === 10 || digits.length === 11;
    },
    { message: 'Informe um telefone válido com DDD (10 ou 11 dígitos)' }
  )
});

type NewAdmissionFormData = z.infer<typeof newAdmissionSchema>;

export const NewAdmission: React.FC = () => {
  const [createdAdmission, setCreatedAdmission] = useState<Admission | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openWithRecruitmentForm, setOpenWithRecruitmentForm] = useState<boolean>(true);

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
      phone: ''
    }
  });

  const rawPhone = watch('phone');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('phone', formatPhone(e.target.value), { shouldValidate: true });
  };

  const onSubmit = async (data: NewAdmissionFormData) => {
    setServerError(null);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setServerError(
        'Seu navegador está sem conexão com a internet (ERR_INTERNET_DISCONNECTED). Verifique sua rede e tente novamente.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await safeFetchJson<Admission>('/api/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name.trim(),
          phone: data.phone.trim()
        })
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
        setServerError(
          'Falha de conexão com o servidor (ERR_INTERNET_DISCONNECTED). Verifique se você está conectado à internet e tente novamente.'
        );
      } else {
        setServerError(err.message || 'Falha ao salvar admissão.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Topo com botão voltar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Dashboard</span>
        </button>
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
                Informe o nome e o telefone do candidato para cadastrar e enviar a mensagem.
              </p>
            </div>
          </div>
        </div>

        {/* Mensagem de erro do servidor */}
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

        {/* Formulário reduzido para Nome e Telefone */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Nome Completo */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Nome *</span>
            </label>
            <input
              type="text"
              {...register('name')}
              placeholder="Ex: Lucas Gabriel Albuquerque"
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
            />
            {errors.name && (
              <p className="text-[11px] text-rose-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Telefone / WhatsApp */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-600" />
              <span>Telefone / WhatsApp *</span>
            </label>
            <input
              type="tel"
              maxLength={15}
              value={rawPhone}
              onChange={handlePhoneChange}
              placeholder="(47) 99999-0000"
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
            />
            {errors.phone && (
              <p className="text-[11px] text-rose-600 mt-1">{errors.phone.message}</p>
            )}
          </div>

          {/* Opção de Mensagem de Boas-vindas / Formulário após cadastro */}
          <label className="flex items-start gap-3 p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl cursor-pointer hover:bg-emerald-50 transition-colors">
            <input
              type="checkbox"
              checked={openWithRecruitmentForm}
              onChange={(e) => setOpenWithRecruitmentForm(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-800 block">
                Abrir opção de envio da mensagem do formulário (Raitz Resende) após cadastrar
              </span>
              <span className="text-[11px] text-slate-600 block mt-0.5">
                Permite enviar imediatamente por WhatsApp ou copiar a mensagem com o link do formulário.
              </span>
            </div>
          </label>

          {/* Nota de conformidade LGPD */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500">
              Os demais dados cadastrais poderão ser complementados posteriormente na ficha da admissão.
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-800 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Cadastrando...' : 'Cadastrar Admissão'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Convite / Mensagem exibido após o cadastro com sucesso */}
      <InviteModal
        admission={createdAdmission}
        isOpen={!!createdAdmission}
        initialTab={openWithRecruitmentForm ? 'recruitment_form' : 'portal'}
        onClose={() => {
          setCreatedAdmission(null);
          navigate('/dashboard');
        }}
      />
    </div>
  );
};
