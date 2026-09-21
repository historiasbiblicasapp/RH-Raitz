import React, { useState } from 'react';
import { 
  MapPin, 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { Employee } from '../../types/index.ts';
import { formatCEP, validateCEP } from '../../lib/cpf.ts';

interface EmployeeAddressTabProps {
  employee: Employee;
  isEditMode: boolean;
  editData: Partial<Employee>;
  onChangeField: (field: keyof Employee, value: any) => void;
  onBatchChangeFields?: (updates: Partial<Employee>) => void;
}

export const EmployeeAddressTab: React.FC<EmployeeAddressTabProps> = ({
  employee,
  isEditMode,
  editData,
  onChangeField,
  onBatchChangeFields
}) => {
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [cepSuccess, setCepSuccess] = useState<string | null>(null);

  const handleCepSearch = async (cepValue: string) => {
    const clean = cepValue.replace(/\D/g, '');
    if (clean.length !== 8) return;

    setIsSearchingCep(true);
    setCepError(null);
    setCepSuccess(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await response.json();

      if (data.erro) {
        setCepError('CEP não encontrado na base dos Correios.');
      } else {
        setCepSuccess('Endereço localizado com sucesso!');
        if (onBatchChangeFields) {
          onBatchChangeFields({
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: (data.uf || '').toUpperCase()
          });
        } else {
          if (data.logradouro) onChangeField('street', data.logradouro);
          if (data.bairro) onChangeField('neighborhood', data.bairro);
          if (data.localidade) onChangeField('city', data.localidade);
          if (data.uf) onChangeField('state', data.uf.toUpperCase());
        }
      }
    } catch {
      setCepError('Falha ao consultar CEP automaticamente.');
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleCepInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    onChangeField('cep', raw);
    if (raw.length === 8) {
      handleCepSearch(raw);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          Endereço Residencial do Colaborador
        </h3>
        <span className="text-[11px] text-slate-400 font-medium">Localização e residência</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* CEP */}
        <div className="space-y-1">
          <label className="text-slate-500 font-medium flex items-center justify-between">
            <span>CEP</span>
            {isSearchingCep && (
              <span className="text-blue-600 flex items-center gap-1 text-[10px]">
                <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
              </span>
            )}
          </label>
          {isEditMode ? (
            <div>
              <div className="relative">
                <input
                  type="text"
                  value={editData.cep ? formatCEP(editData.cep) : ''}
                  onChange={handleCepInputChange}
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                  placeholder="00000-000"
                  maxLength={9}
                />
                <button
                  type="button"
                  onClick={() => editData.cep && handleCepSearch(editData.cep)}
                  disabled={isSearchingCep || !editData.cep || editData.cep.replace(/\D/g, '').length !== 8}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 disabled:opacity-40"
                  title="Consultar CEP"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
              {cepError && (
                <p className="text-[10px] text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {cepError}
                </p>
              )}
              {cepSuccess && (
                <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {cepSuccess}
                </p>
              )}
            </div>
          ) : (
            <p className="font-mono font-bold text-slate-800 text-sm">
              {employee.cep ? formatCEP(employee.cep) : '(Não informado)'}
            </p>
          )}
        </div>

        {/* Logradouro */}
        <div className="space-y-1 sm:col-span-2 lg:col-span-3">
          <label className="text-slate-500 font-medium block">Logradouro (Rua, Avenida, etc.)</label>
          {isEditMode ? (
            <input
              type="text"
              value={editData.street || ''}
              onChange={(e) => onChangeField('street', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Rua XV de Novembro"
            />
          ) : (
            <p className="font-semibold text-slate-900">{employee.street || '(Não informado)'}</p>
          )}
        </div>

        {/* Número */}
        <div className="space-y-1">
          <label className="text-slate-500 font-medium block">Número</label>
          {isEditMode ? (
            <input
              type="text"
              value={editData.number || ''}
              onChange={(e) => onChangeField('number', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: 123"
            />
          ) : (
            <p className="font-semibold text-slate-800">{employee.number || 'S/N'}</p>
          )}
        </div>

        {/* Complemento */}
        <div className="space-y-1 sm:col-span-2 lg:col-span-3">
          <label className="text-slate-500 font-medium block">Complemento</label>
          {isEditMode ? (
            <input
              type="text"
              value={editData.complement || ''}
              onChange={(e) => onChangeField('complement', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Apto 402, Bloco B"
            />
          ) : (
            <p className="font-semibold text-slate-800">{employee.complement || '(Sem complemento)'}</p>
          )}
        </div>

        {/* Bairro */}
        <div className="space-y-1">
          <label className="text-slate-500 font-medium block">Bairro</label>
          {isEditMode ? (
            <input
              type="text"
              value={editData.neighborhood || ''}
              onChange={(e) => onChangeField('neighborhood', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Centro"
            />
          ) : (
            <p className="font-semibold text-slate-800">{employee.neighborhood || '(Não informado)'}</p>
          )}
        </div>

        {/* Cidade */}
        <div className="space-y-1 sm:col-span-2">
          <label className="text-slate-500 font-medium block">Cidade</label>
          {isEditMode ? (
            <input
              type="text"
              value={editData.city || ''}
              onChange={(e) => onChangeField('city', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Blumenau"
            />
          ) : (
            <p className="font-semibold text-slate-800">{employee.city || '(Não informada)'}</p>
          )}
        </div>

        {/* Estado (UF) */}
        <div className="space-y-1">
          <label className="text-slate-500 font-medium block">Estado (UF)</label>
          {isEditMode ? (
            <select
              value={editData.state || ''}
              onChange={(e) => onChangeField('state', e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">UF</option>
              {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          ) : (
            <p className="font-semibold text-slate-800">{employee.state || '(UF não informada)'}</p>
          )}
        </div>
      </div>
    </div>
  );
};
