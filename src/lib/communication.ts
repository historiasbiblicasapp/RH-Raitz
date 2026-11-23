import { CommunicationType } from '../types/index.ts';

export interface PhoneValidationResult {
  isValid: boolean;
  cleanDigits: string;
  displayPhone: string;
  error?: string;
}

/**
 * Normaliza e valida número de telefone brasileiro para envio de mensagem via WhatsApp.
 * Suporta formatos: (XX) 9XXXX-XXXX, XX9XXXXXXXX, +55..., etc.
 */
export function normalizeBrazilianPhone(rawPhone?: string | null): PhoneValidationResult {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return {
      isValid: false,
      cleanDigits: '',
      displayPhone: '',
      error: 'Funcionário sem telefone cadastrado.'
    };
  }

  // Remove caracteres não-dígitos
  let digits = rawPhone.replace(/\D/g, '');

  // Se já começar com o DDI do Brasil (55)
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }

  // Celular brasileiro com DDD (11 dígitos) ou Fixo (10 dígitos)
  if (digits.length !== 10 && digits.length !== 11) {
    return {
      isValid: false,
      cleanDigits: '',
      displayPhone: rawPhone,
      error: 'Telefone inválido (deve conter DDD e 8 ou 9 dígitos).'
    };
  }

  const ddd = parseInt(digits.slice(0, 2), 10);
  // DDDs válidos no Brasil: de 11 a 99
  if (ddd < 11 || ddd > 99) {
    return {
      isValid: false,
      cleanDigits: '',
      displayPhone: rawPhone,
      error: 'DDD inválido.'
    };
  }

  // Para celular (11 dígitos), o terceiro dígito deve ser 9
  if (digits.length === 11 && digits[2] !== '9') {
    return {
      isValid: false,
      cleanDigits: '',
      displayPhone: rawPhone,
      error: 'Celular deve iniciar com o dígito 9 após o DDD.'
    };
  }

  // Formata visualmente para exibição
  const displayPhone = digits.length === 11
    ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    : `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;

  // Formato internacional DDI 55 para o WhatsApp
  const cleanDigits = `55${digits}`;

  return {
    isValid: true,
    cleanDigits,
    displayPhone
  };
}

export interface CommunicationTemplateConfig {
  id: CommunicationType;
  title: string;
  description: string;
  templateText: string;
}

export const RAITZ_RECRUITMENT_FORM_URL =
  'https://forms.office.com/Pages/ResponsePage.aspx?id=Rm71rDoniEuk9TsXvsiUOj06PglpGvNGh0Rz9gqwUHBUREkxQlo1WFlBWVVDNFI5TU9PNlJQVzZCMC4u';

export function buildRaitzRecruitmentMessage(role?: string): string {
  const vacancy = role && role.trim() ? role.trim() : 'Auxiliar de Produção';
  return `Olá \n\nSomos da empresa Raitz Resende, recebemos o seu currículo para vaga de ${vacancy} e estamos felizes em saber que você tem interesse em fazer parte do nosso time.\n\npedimos por gentileza que preencha o link abaixo:\n\n${RAITZ_RECRUITMENT_FORM_URL}\n\nApós o preenchimento do link peço por gentileza que aguarde, retornaremos o contato em breve.\n\nBoa sorte!`;
}

export const DEFAULT_RAITZ_RECRUITMENT_MESSAGE = buildRaitzRecruitmentMessage('Auxiliar de Produção');

export const COMMUNICATION_TEMPLATES: Record<CommunicationType, CommunicationTemplateConfig> = {
  documents_pending: {
    id: 'documents_pending',
    title: 'Documentos pendentes',
    description: 'Avisa o colaborador sobre envio de documentos obrigatórios pendentes.',
    templateText: `Olá, [NOME].

Sua admissão está em andamento e ainda existem documentos pendentes de envio.

Acesse seu link de admissão para verificar os documentos necessários e continuar o processo.

[LINK]`
  },

  document_rejected: {
    id: 'document_rejected',
    title: 'Documento rejeitado',
    description: 'Comunica necessidade de correção em documento que não foi aprovado pelo RH.',
    templateText: `Olá, [NOME].

Um documento enviado para sua admissão precisa ser corrigido.

Acesse seu link de admissão para verificar o motivo da pendência e enviar uma nova versão.

[LINK]`
  },

  document_approved: {
    id: 'document_approved',
    title: 'Documento aprovado',
    description: 'Comunica ao colaborador que seu documento foi conferido e aprovado pelo RH.',
    templateText: `Olá, [NOME].

Seu documento [DOCUMENTO] foi conferido e aprovado com sucesso pela equipe de Recursos Humanos da Raitz!

Você pode acompanhar o andamento da sua admissão pelo seu link de acesso:

[LINK]`
  },

  reminder: {
    id: 'reminder',
    title: 'Lembrete de admissão',
    description: 'Lembrete amigável sobre o andamento do processo admissional.',
    templateText: `Olá, [NOME].

Este é um lembrete sobre sua admissão.

Acesse seu link de admissão para verificar se existem documentos pendentes e continuar o processo.

[LINK]`
  },

  admission_upcoming: {
    id: 'admission_upcoming',
    title: 'Admissão próxima',
    description: 'Alerta sobre a proximidade da data prevista de início das atividades.',
    templateText: `Olá, [NOME].

Sua data prevista de admissão está próxima.

Pedimos que acesse seu link de admissão e verifique se todos os documentos solicitados já foram enviados.

[LINK]`
  },

  recruitment_form: {
    id: 'recruitment_form',
    title: 'Formulário Raitz Resende',
    description: 'Mensagem de boas-vindas com o link do formulário inicial para vaga de Auxiliar de Produção.',
    templateText: DEFAULT_RAITZ_RECRUITMENT_MESSAGE
  },

  general_notice: {
    id: 'general_notice',
    title: 'Aviso geral',
    description: 'Mensagem institucional padrão sobre o processo de admissão.',
    templateText: `Olá, [NOME].

Acesse o portal da sua admissão para conferir informações e atualizações sobre o seu processo admissional.

[LINK]`
  }
};

export interface RenderTemplateOptions {
  employeeName: string;
  inviteUrl: string;
  documentName?: string;
  rejectionReason?: string;
  role?: string;
}

/**
 * Renderiza o template de mensagem substituindo placeholders de forma segura.
 * Suporta [NOME], [LINK], [DOCUMENTO], [MOTIVO], [CARGO].
 */
export function renderTemplate(template: string, options: RenderTemplateOptions): string {
  // Se for o template exato de recrutamento sem placeholders, preserva exatamente a formatação original
  if (template === DEFAULT_RAITZ_RECRUITMENT_MESSAGE) {
    return template;
  }

  let text = template;

  // Substitui [NOME]
  const firstName = options.employeeName.trim();
  text = text.replace(/\[NOME\]/g, firstName);

  // Substitui [LINK]
  text = text.replace(/\[LINK\]/g, options.inviteUrl || '');

  // Substitui [CARGO]
  text = text.replace(/\[CARGO\]/g, options.role?.trim() || 'Auxiliar de Produção');

  // Substitui [DOCUMENTO] se presente
  if (options.documentName) {
    text = text.replace(/\[DOCUMENTO\]/g, options.documentName);
  } else {
    text = text.replace(/\[DOCUMENTO\]/g, 'documento solicitado');
  }

  // Substitui [MOTIVO] se presente
  if (options.rejectionReason) {
    text = text.replace(/\[MOTIVO\]/g, options.rejectionReason);
  } else {
    text = text.replace(/\[MOTIVO\]/g, 'inconsistência na análise');
  }

  return text.trim();
}

/**
 * Gera a URL segura para abertura do WhatsApp Web ou aplicativo.
 */
export function generateWhatsAppLink(phoneDigits: string, message: string): string {
  const clean = phoneDigits.replace(/\D/g, '');
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${clean}?text=${encodedText}`;
}
