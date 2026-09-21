import React, { useState } from 'react';
import { 
  User, 
  Eye, 
  EyeOff, 
  Calendar, 
  ShieldCheck, 
  AlertCircle, 
  Users, 
  Globe,
  Loader2
} from 'lucide-react';
import { Employee } from '../../types/index.ts';
import { maskCPF, formatCPF, validateCPF, calculateAge } from '../../lib/cpf.ts';
import { safeFetchJson } from '../../lib/api.ts';

interface EmployeePersonalTabProps {
  employee: Employee;
  isEditMode: boolean;
  editData: Partial<Employee>;
  onChangeField: (field: keyof Employee, value: any) => void;
}

export const EmployeePersonalTab: React.FC<EmployeePersonalTabProps> = ({
  employee,
  isEditMode,
  editData,
  onChangeField
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [fullCpf, setFullCpf] = useState<string | null>(null);
  const [isLoadingReveal, setIsLoadingReveal] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);

  const currentBirthDate = isEditMode ? editData.birthDate : employee.birthDate;
  const dynamicAge = calculateAge(currentBirthDate);

  const handleToggleRevealCpf = async () => {
    if (isRevealed) {
      setIsRevealed(false);
      return;
    }

    setIsLoadingReveal(true);
    setRevealError(null);
    try {
      const res = await safeFetchJson<{ cpf: string }>(`/api/employees/${employee.id}/reveal-cpf`, {
        method: 'POST'
      });
      setFullCpf(res.cpf);
      setIsRevealed(true);
    } catch (err: any) {
      setRevealError(err.message || 'Erro ao consultar CPF desmascarado.');
    } finally {
      setIsLoadingReveal(false);
    }
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    onChangeField('cpf', formatCPF(raw));
  };

  return (
    <div className="space-y-6">
      {/* Bloco 1: Identificação (Seção 8) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Identificação Civil e Pessoal
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">Dados essenciais</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* Nome Completo */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-slate-500 font-medium block">
              Nome Completo <span className="text-rose-500">*</span>
            </label>
            {isEditMode ? (
              <input
                type="text"
                value={editData.name || ''}
                onChange={(e) => onChangeField('name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome completo do colaborador"
              />
            ) : (
              <p className="font-bold text-slate-900 text-sm">{employee.name}</p>
            )}
          </div>

          {/* Nome Social */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">Nome Social</label>
            {isEditMode ? (
              <input
                type="text"
                value={editData.socialName || ''}
                onChange={(e) => onChangeField('socialName', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Opcional"
              />
            ) : (
              <p className="font-semibold text-slate-800">{employee.socialName || '(Não informado)'}</p>
            )}
          </div>

          {/* CPF com Proteção e Revelação Auditada (Seção 9) */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium flex items-center justify-between">
              <span>CPF <span className="text-rose-500">*</span></span>
              {!isEditMode && (
                <span className="text-[10px] text-slate-400 font-normal">Protegido LGPD</span>
              )}
            </label>
            {isEditMode ? (
              <div>
                <input
                  type="text"
                  value={editData.cpf ? formatCPF(editData.cpf) : ''}
                  onChange={handleCpfChange}
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
                {editData.cpf && !validateCPF(editData.cpf) && (
                  <p className="text-[10px] text-rose-600 font-medium mt-1">
                    CPF inválido (dígitos verificadores incorretos).
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="font-mono font-bold text-slate-900 text-sm">
                  {isRevealed && fullCpf ? formatCPF(fullCpf) : (employee.cpfMasked || maskCPF(employee.cpf))}
                </p>
                <button
                  type="button"
                  onClick={handleToggleRevealCpf}
                  disabled={isLoadingReveal}
                  className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition"
                  title={isRevealed ? "Ocultar CPF" : "Visualizar CPF completo (ação auditada)"}
                >
                  {isLoadingReveal ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : isRevealed ? (
                    <EyeOff className="w-4 h-4 text-slate-600" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}
            {revealError && (
              <p className="text-[10px] text-rose-600">{revealError}</p>
            )}
          </div>

          {/* RG */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">RG / Identidade</label>
            {isEditMode ? (
              <input
                type="text"
                value={editData.rg || ''}
                onChange={(e) => onChangeField('rg', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Número do documento"
              />
            ) : (
              <p className="font-semibold text-slate-800">{employee.rg || '(Não informado)'}</p>
            )}
          </div>

          {/* Órgão Emissor do RG */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">Órgão Emissor</label>
            {isEditMode ? (
              <input
                type="text"
                value={editData.rgIssuer || ''}
                onChange={(e) => onChangeField('rgIssuer', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: SSP/SC, DETRAN"
              />
            ) : (
              <p className="font-semibold text-slate-800">{employee.rgIssuer || '(Não informado)'}</p>
            )}
          </div>

          {/* Data de Emissão do RG */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">Data de Emissão do RG</label>
            {isEditMode ? (
              <input
                type="date"
                value={editData.rgIssueDate || ''}
                onChange={(e) => onChangeField('rgIssueDate', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="font-semibold text-slate-800">
                {employee.rgIssueDate ? new Date(employee.rgIssueDate + 'T00:00:00').toLocaleDateString('pt-BR') : '(Não informada)'}
              </p>
            )}
          </div>

          {/* Data de Nascimento com Idade Dinâmica (Seção 10) */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">
              Data de Nascimento <span className="text-rose-500">*</span>
            </label>
            {isEditMode ? (
              <div>
                <input
                  type="date"
                  value={editData.birthDate || ''}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => onChangeField('birthDate', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {dynamicAge !== null && (
                  <p className="text-[11px] text-blue-600 font-medium mt-1">
                    Idade calculada: {dynamicAge} {dynamicAge === 1 ? 'ano' : 'anos'}
                  </p>
                )}
              </div>
            ) : (
              <p className="font-semibold text-slate-900">
                {employee.birthDate ? new Date(employee.birthDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                {dynamicAge !== null && (
                  <span className="text-slate-500 font-normal ml-1">
                    ({dynamicAge} {dynamicAge === 1 ? 'ano' : 'anos'})
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Sexo / Gênero */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">Sexo / Gênero</label>
            {isEditMode ? (
              <select
                value={editData.gender || ''}
                onChange={(e) => onChangeField('gender', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione...</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
                <option value="Prefiro não informar">Prefiro não informar</option>
              </select>
            ) : (
              <p className="font-semibold text-slate-800">{employee.gender || '(Não informado)'}</p>
            )}
          </div>

          {/* Estado Civil */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">Estado Civil</label>
            {isEditMode ? (
              <select
                value={editData.maritalStatus || ''}
                onChange={(e) => onChangeField('maritalStatus', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione...</option>
                <option value="Solteiro(a)">Solteiro(a)</option>
                <option value="Casado(a)">Casado(a)</option>
                <option value="União Estável">União Estável</option>
                <option value="Divorciado(a)">Divorciado(a)</option>
                <option value="Viúvo(a)">Viúvo(a)</option>
              </select>
            ) : (
              <p className="font-semibold text-slate-800">{employee.maritalStatus || '(Não informado)'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Bloco 2: Filiação (Seção 8) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Filiação
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">Registro parental</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Nome da Mãe */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">Nome da Mãe</label>
            {isEditMode ? (
              <input
                type="text"
                value={editData.motherName || ''}
                onChange={(e) => onChangeField('motherName', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome completo da mãe"
              />
            ) : (
              <p className="font-semibold text-slate-800">{employee.motherName || '(Não informado)'}</p>
            )}
          </div>

          {/* Nome do Pai */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">Nome do Pai</label>
            {isEditMode ? (
              <input
                type="text"
                value={editData.fatherName || ''}
                onChange={(e) => onChangeField('fatherName', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome completo do pai (opcional)"
              />
            ) : (
              <p className="font-semibold text-slate-800">{employee.fatherName || '(Não informado)'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Bloco 3: Outros Dados / Origem (Seção 8) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" />
            Origem e Nacionalidade
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">Naturalidade</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Nacionalidade */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">Nacionalidade</label>
            {isEditMode ? (
              <input
                type="text"
                value={editData.nationality || ''}
                onChange={(e) => onChangeField('nationality', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Brasileira"
              />
            ) : (
              <p className="font-semibold text-slate-800">{employee.nationality || 'Brasileira'}</p>
            )}
          </div>

          {/* Naturalidade */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">Naturalidade (Cidade/UF)</label>
            {isEditMode ? (
              <input
                type="text"
                value={editData.birthplace || ''}
                onChange={(e) => onChangeField('birthplace', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Blumenau - SC"
              />
            ) : (
              <p className="font-semibold text-slate-800">{employee.birthplace || '(Não informada)'}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
