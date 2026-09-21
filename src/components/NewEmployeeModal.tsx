import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserPlus, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  Briefcase, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Calendar,
  ExternalLink,
  Search,
  Loader2
} from 'lucide-react';
import { Employee, JobPosition } from '../types/index.ts';
import { formatCPF, validateCPF, formatPhone, formatCEP, validateCEP, validateEmail } from '../lib/cpf.ts';
import { safeFetchJson } from '../lib/api.ts';

interface NewEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (employee: Employee) => void;
  onOpenExisting?: (employeeId: string) => void;
}

export const NewEmployeeModal: React.FC<NewEmployeeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenExisting
}) => {
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [email, setEmail] = useState('');
  
  const [role, setRole] = useState('');
  const [jobPositionId, setJobPositionId] = useState('');
  const [department, setDepartment] = useState('');
  const [unit, setUnit] = useState('Matriz - Blumenau');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split('T')[0]);

  // Endereço
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SC');

  // Estados de apoio e controle
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [duplicateEmployee, setDuplicateEmployee] = useState<{ id: string; name: string } | null>(null);

  // Carrega cargos disponíveis
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setIsLoadingJobs(true);
    safeFetchJson<{ items: JobPosition[] }>('/api/job-positions')
      .then(res => {
        if (!mounted) return;
        const activeJobs = (res?.items || []).filter(j => j.active);
        setJobPositions(activeJobs);
        if (activeJobs.length > 0 && !role) {
          setRole(activeJobs[0].name);
          setJobPositionId(activeJobs[0].id);
        }
      })
      .catch(() => {
        // Fallback de cargos padrão
        if (mounted) {
          const defaults = [
            { id: 'job-01', name: 'Operador de Produção I', active: true, code: 'OP-01', createdAt: '', updatedAt: '', createdBy: '', updatedBy: '' },
            { id: 'job-02', name: 'Auxiliar de Galvanização', active: true, code: 'AG-01', createdAt: '', updatedAt: '', createdBy: '', updatedBy: '' },
            { id: 'job-03', name: 'Soldador Especializado', active: true, code: 'SE-01', createdAt: '', updatedAt: '', createdBy: '', updatedBy: '' },
            { id: 'job-04', name: 'Assistente Administrativo', active: true, code: 'AA-01', createdAt: '', updatedAt: '', createdBy: '', updatedBy: '' },
            { id: 'job-05', name: 'Técnico de Segurança do Trabalho', active: true, code: 'TST-01', createdAt: '', updatedAt: '', createdBy: '', updatedBy: '' },
          ];
          setJobPositions(defaults);
          if (!role) {
            setRole(defaults[0].name);
            setJobPositionId(defaults[0].id);
          }
        }
      })
      .finally(() => {
        if (mounted) setIsLoadingJobs(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  // Checagem prévia de duplicidade de CPF ao digitar
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);
    setDuplicateEmployee(null);
    setErrorMessage('');
  };

  const handleCepSearch = async (inputCep: string) => {
    const clean = inputCep.replace(/\D/g, '');
    if (clean.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        if (data.logradouro) setStreet(data.logradouro);
        if (data.bairro) setNeighborhood(data.bairro);
        if (data.localidade) setCity(data.localidade);
        if (data.uf) setState(data.uf);
      }
    } catch {
      // Falha silenciosa de CEP
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedJobName = e.target.value;
    setRole(selectedJobName);
    const found = jobPositions.find(j => j.name === selectedJobName);
    if (found) {
      setJobPositionId(found.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setDuplicateEmployee(null);

    // Validações
    if (!name.trim()) {
      setErrorMessage('Por favor, informe o nome completo.');
      return;
    }

    const cleanCpf = cpf.replace(/\D/g, '');
    if (!validateCPF(cleanCpf)) {
      setErrorMessage('O CPF digitado é inválido. Verifique os 11 dígitos.');
      return;
    }

    if (!birthDate) {
      setErrorMessage('Por favor, selecione a data de nascimento.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Informe um telefone de contato válido com DDD.');
      return;
    }

    if (!validateEmail(email)) {
      setErrorMessage('Informe um endereço de e-mail válido.');
      return;
    }

    if (!role.trim()) {
      setErrorMessage('O cargo do funcionário é obrigatório.');
      return;
    }

    if (!department.trim()) {
      setErrorMessage('O setor/departamento é obrigatório.');
      return;
    }

    if (!unit.trim()) {
      setErrorMessage('A unidade da empresa é obrigatória.');
      return;
    }

    if (cep && !validateCEP(cep)) {
      setErrorMessage('O CEP digitado possui formato inválido.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: name.trim(),
      cpf: cleanCpf,
      birthDate,
      phone: cleanPhone,
      secondaryPhone: secondaryPhone ? secondaryPhone.replace(/\D/g, '') : undefined,
      email: email.trim().toLowerCase(),
      role: role.trim(),
      jobPositionId: jobPositionId || undefined,
      department: department.trim(),
      unit: unit.trim(),
      admissionDate,
      expectedStartDate: admissionDate,
      registrationNumber: registrationNumber.trim() || undefined,
      cep: cep ? cep.replace(/\D/g, '') : undefined,
      street: street.trim() || undefined,
      number: number.trim() || undefined,
      complement: complement.trim() || undefined,
      neighborhood: neighborhood.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim()?.toUpperCase() || undefined
    };

    try {
      const res = await safeFetchJson<Employee>('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      onSuccess(res);
      onClose();
    } catch (err: any) {
      if (err.status === 409 || err.duplicate) {
        setErrorMessage(err.message || 'Já existe um funcionário cadastrado com este CPF.');
        if (err.existingEmployeeId) {
          setDuplicateEmployee({
            id: err.existingEmployeeId,
            name: 'Funcionário com este CPF'
          });
        }
      } else {
        setErrorMessage(err.message || 'Ocorreu um erro ao cadastrar o funcionário. Verifique os dados.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        id="modal-new-employee"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Novo Funcionário</h2>
              <p className="text-xs text-slate-500">Cadastro administrativo na base permanente da empresa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Mensagem de Erro / Alerta de Duplicidade */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
              {duplicateEmployee && onOpenExisting && (
                <div className="pt-2 border-t border-rose-200 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenExisting(duplicateEmployee.id);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold shadow-sm transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir ficha do funcionário existente
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Seção 1: Dados Pessoais */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">1. Dados Pessoais</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo de Oliveira"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CPF <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="000.000.000-00"
                  maxLength={14}
                  value={cpf}
                  onChange={handleCpfChange}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data de Nascimento <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefone Principal (WhatsApp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(47) 99999-0000"
                  maxLength={15}
                  value={phone}
                  onChange={e => setPhone(formatPhone(e.target.value))}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefone Secundário / Recado (Opcional)
                </label>
                <input
                  type="tel"
                  placeholder="(47) 98888-1111"
                  maxLength={15}
                  value={secondaryPhone}
                  onChange={e => setSecondaryPhone(formatPhone(e.target.value))}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail do Funcionário <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="colaborador@empresa.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Dados Profissionais */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">2. Dados Profissionais</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cargo <span className="text-rose-500">*</span>
                </label>
                {jobPositions.length > 0 ? (
                  <select
                    value={role}
                    onChange={handleRoleChange}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition"
                  >
                    {jobPositions.map(j => (
                      <option key={j.id} value={j.name}>{j.name} ({j.code || 'Geral'})</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Ex: Operador de Produção I"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Setor / Departamento <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Produção, Expedição, Manutenção"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unidade <span className="text-rose-500">*</span>
                </label>
                <select
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition"
                >
                  <option value="Matriz - Blumenau">Matriz - Blumenau</option>
                  <option value="Filial - Joinville">Filial - Joinville</option>
                  <option value="Filial - Itajaí">Filial - Itajaí</option>
                  <option value="Unidade Industrial">Unidade Industrial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Matrícula (Código Interno Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: MAT-1042"
                  value={registrationNumber}
                  onChange={e => setRegistrationNumber(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data de Admissão / Início Previsto <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={admissionDate}
                  onChange={e => setAdmissionDate(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Endereço (Opcional) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">3. Endereço Residencial (Opcional)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CEP
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="89000-000"
                    maxLength={9}
                    value={cep}
                    onChange={e => {
                      const formatted = formatCEP(e.target.value);
                      setCep(formatted);
                      if (formatted.replace(/\D/g, '').length === 8) {
                        handleCepSearch(formatted);
                      }
                    }}
                    className="w-full px-3.5 py-2 pr-9 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono"
                  />
                  {isLoadingCep && (
                    <div className="absolute right-2.5 top-2.5">
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Logradouro (Rua, Avenida)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Rua São Paulo"
                  value={street}
                  onChange={e => setStreet(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número
                </label>
                <input
                  type="text"
                  placeholder="Ex: 1250"
                  value={number}
                  onChange={e => setNumber(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Complemento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Apto 302, Bloco B"
                  value={complement}
                  onChange={e => setComplement(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bairro
                </label>
                <input
                  type="text"
                  placeholder="Ex: Victor Konder"
                  value={neighborhood}
                  onChange={e => setNeighborhood(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  placeholder="Ex: Blumenau"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estado (UF)
                </label>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="SC"
                  value={state}
                  onChange={e => setState(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition uppercase text-center"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-slate-700 hover:bg-slate-200 text-sm font-medium rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando Cadastro...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Salvar Funcionário
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
