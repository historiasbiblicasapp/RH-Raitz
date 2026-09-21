import React from 'react';
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  AlertTriangle, 
  ExternalLink, 
  UserCheck, 
  ShieldAlert
} from 'lucide-react';
import { Employee } from '../../types/index.ts';
import { formatPhone, validateEmail } from '../../lib/cpf.ts';

interface EmployeeContactTabProps {
  employee: Employee;
  isEditMode: boolean;
  editData: Partial<Employee>;
  onChangeField: (field: keyof Employee, value: any) => void;
}

export const EmployeeContactTab: React.FC<EmployeeContactTabProps> = ({
  employee,
  isEditMode,
  editData,
  onChangeField
}) => {
  const currentWhatsapp = isEditMode ? editData.whatsapp : (employee.whatsapp || employee.phone);
  const cleanWhatsapp = currentWhatsapp ? currentWhatsapp.replace(/\D/g, '') : '';
  const waUrl = cleanWhatsapp.length >= 10 ? `https://wa.me/55${cleanWhatsapp}` : null;

  const handlePhoneChange = (field: 'phone' | 'secondaryPhone' | 'whatsapp' | 'emergencyContactPhone', val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    onChangeField(field, raw);
  };

  return (
    <div className="space-y-6">
      {/* Bloco 1: Canais de Comunicação Direta (Seção 11) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Phone className="w-4 h-4 text-blue-600" />
            Canais de Contato do Colaborador
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">Telefonia e Mensagens</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* Telefone Principal */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">
              Telefone Principal <span className="text-rose-500">*</span>
            </label>
            {isEditMode ? (
              <input
                type="text"
                value={editData.phone ? formatPhone(editData.phone) : ''}
                onChange={(e) => handlePhoneChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            ) : (
              <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {employee.phone ? formatPhone(employee.phone) : '(Não informado)'}
              </p>
            )}
          </div>

          {/* Telefone Secundário */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">Telefone Secundário / Recado</label>
            {isEditMode ? (
              <input
                type="text"
                value={editData.secondaryPhone ? formatPhone(editData.secondaryPhone) : ''}
                onChange={(e) => handlePhoneChange('secondaryPhone', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(00) 0000-0000"
                maxLength={15}
              />
            ) : (
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {employee.secondaryPhone ? formatPhone(employee.secondaryPhone) : '(Não informado)'}
              </p>
            )}
          </div>

          {/* WhatsApp com Link Direto */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">WhatsApp</label>
            {isEditMode ? (
              <input
                type="text"
                value={editData.whatsapp ? formatPhone(editData.whatsapp) : ''}
                onChange={(e) => handlePhoneChange('whatsapp', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(00) 90000-0000"
                maxLength={15}
              />
            ) : (
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                  {employee.whatsapp ? formatPhone(employee.whatsapp) : (employee.phone ? formatPhone(employee.phone) : '(Não informado)')}
                </p>
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded text-[11px] border border-emerald-200 transition"
                  >
                    Conversar
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* E-mail Principal / Pessoal */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-1">
            <label className="text-slate-500 font-medium block">
              E-mail Principal (Pessoal) <span className="text-rose-500">*</span>
            </label>
            {isEditMode ? (
              <div>
                <input
                  type="email"
                  value={editData.email || ''}
                  onChange={(e) => onChangeField('email', e.target.value.trim().toLowerCase())}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@pessoal.com"
                />
                {editData.email && !validateEmail(editData.email) && (
                  <p className="text-[10px] text-rose-600 font-medium mt-1">E-mail inválido.</p>
                )}
              </div>
            ) : (
              <p className="font-semibold text-slate-900 flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {employee.email || '(Não informado)'}
              </p>
            )}
          </div>

          {/* E-mail Corporativo */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-2">
            <label className="text-slate-500 font-medium block">E-mail Corporativo</label>
            {isEditMode ? (
              <div>
                <input
                  type="email"
                  value={editData.corporateEmail || ''}
                  onChange={(e) => onChangeField('corporateEmail', e.target.value.trim().toLowerCase())}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="nome.sobrenome@empresa.com.br"
                />
                {editData.corporateEmail && !validateEmail(editData.corporateEmail) && (
                  <p className="text-[10px] text-rose-600 font-medium mt-1">E-mail inválido.</p>
                )}
              </div>
            ) : (
              <p className="font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 text-blue-500" />
                {employee.corporateEmail || '(Não cadastrado)'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bloco 2: Contato de Emergência (Seção 12) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            Contato de Emergência
          </h3>
          <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
            Acionamento médico ou operacional
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* Nome do Contato */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">Nome do Contato</label>
            {isEditMode ? (
              <input
                type="text"
                value={editData.emergencyContactName || ''}
                onChange={(e) => onChangeField('emergencyContactName', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome da pessoa para contato"
              />
            ) : (
              <p className="font-semibold text-slate-800">
                {employee.emergencyContactName || '(Não informado)'}
              </p>
            )}
          </div>

          {/* Grau de Parentesco */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">Grau de Parentesco</label>
            {isEditMode ? (
              <select
                value={editData.emergencyContactRelationship || ''}
                onChange={(e) => onChangeField('emergencyContactRelationship', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione...</option>
                <option value="Cônjuge / Companheiro(a)">Cônjuge / Companheiro(a)</option>
                <option value="Mãe">Mãe</option>
                <option value="Pai">Pai</option>
                <option value="Filho(a)">Filho(a)</option>
                <option value="Irmão / Irmã">Irmão / Irmã</option>
                <option value="Outro Familiar">Outro Familiar</option>
                <option value="Amigo(a)">Amigo(a)</option>
              </select>
            ) : (
              <p className="font-semibold text-slate-800">
                {employee.emergencyContactRelationship || '(Não informado)'}
              </p>
            )}
          </div>

          {/* Telefone de Emergência */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">Telefone de Emergência</label>
            {isEditMode ? (
              <input
                type="text"
                value={editData.emergencyContactPhone ? formatPhone(editData.emergencyContactPhone) : ''}
                onChange={(e) => handlePhoneChange('emergencyContactPhone', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            ) : (
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-500" />
                {employee.emergencyContactPhone ? formatPhone(employee.emergencyContactPhone) : '(Não informado)'}
              </p>
            )}
          </div>

          {/* Observações de Emergência */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
            <label className="text-slate-500 font-medium block">Instruções / Observações</label>
            {isEditMode ? (
              <input
                type="text"
                value={editData.emergencyContactNotes || ''}
                onChange={(e) => onChangeField('emergencyContactNotes', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Ligar preferencialmente após as 18h ou avisar no trabalho do cônjuge"
              />
            ) : (
              <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {employee.emergencyContactNotes || '(Nenhuma instrução adicional registrada)'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
