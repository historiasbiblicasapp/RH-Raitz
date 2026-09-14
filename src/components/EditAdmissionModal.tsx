import React, { useState } from 'react';
import { 
  X, 
  User, 
  Briefcase, 
  Calendar, 
  Phone, 
  Mail, 
  Building, 
  Save, 
  AlertCircle,
  Layers,
  Edit3
} from 'lucide-react';
import { Admission, AdmissionStatus } from '../types/index.ts';
import { maskCPF, validateCPF } from '../lib/cpf.ts';

interface EditAdmissionModalProps {
  admission: Admission;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedAdmission: Admission) => void;
}

export const EditAdmissionModal: React.FC<EditAdmissionModalProps> = ({
  admission,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [name, setName] = useState(admission.employee.name);
  const [cpf, setCpf] = useState(maskCPF(admission.employee.cpf));
  const [birthDate, setBirthDate] = useState(admission.employee.birthDate || '');
  const [phone, setPhone] = useState(admission.employee.phone);
  const [email, setEmail] = useState(admission.employee.email);
  const [role, setRole] = useState(admission.employee.role);
  const [department, setDepartment] = useState(admission.employee.department);
  const [unit, setUnit] = useState(admission.employee.unit);
  const [expectedStartDate, setExpectedStartDate] = useState(admission.employee.expectedStartDate || '');
  const [status, setStatus] = useState<AdmissionStatus>(admission.status);
  const [availableJobPositions, setAvailableJobPositions] = useState<{ id: string; name: string; code?: string }[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    fetch('/api/job-positions?status=active')
      .then(res => res.json())
      .then(data => {
        if (data && data.jobPositions) {
          setAvailableJobPositions(data.jobPositions);
        }
      })
      .catch(() => {});
  }, []);

  if (!isOpen) return null;

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw.length <= 11) {
      setCpf(maskCPF(raw));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf && !validateCPF(cleanCpf)) {
      setError('O CPF informado é inválido. Por favor, confira os números.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/admissions/${admission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          cpf: cleanCpf,
          birthDate,
          phone: phone.trim(),
          email: email.trim(),
          role: role.trim(),
          department: department.trim(),
          unit: unit.trim(),
          expectedStartDate,
          status
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar dados cadastrais.');
      }

      onSuccess(data.admission);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar alterações.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 border border-slate-200 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Editar Cadastro da Admissão</h3>
              <p className="text-xs text-slate-500">
                Altere informações do colaborador e parâmetros da vaga
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Seção 1: Dados Pessoais */}
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              1. Informações Pessoais do Colaborador
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome Completo *</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">CPF (apenas números) *</label>
                <input
                  type="text"
                  required
                  value={cpf}
                  onChange={handleCpfChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Data de Nascimento</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Telefone / WhatsApp *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">E-mail *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2: Dados Contratuais e Vaga */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              2. Cargo, Lotação e Início
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cargo *</label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  {availableJobPositions.length > 0 ? (
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600 text-slate-900 text-xs"
                    >
                      <option value={role}>{role} (Atual)</option>
                      {availableJobPositions
                        .filter(p => p.name !== role)
                        .map(p => (
                          <option key={p.id} value={p.name}>
                            {p.name} {p.code ? `(${p.code})` : ''}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600"
                    />
                  )}
                </div>
              </div>

              {role.trim().toLowerCase() !== (admission.employee.role || '').trim().toLowerCase() && (
                <div className="sm:col-span-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-950">
                      Alterar o cargo pode alterar os documentos necessários para esta admissão. O checklist atual já foi registrado para esta admissão.
                    </p>
                    <p className="text-[11px] text-amber-800 mt-1">
                      Por segurança, o checklist original desta admissão será preservado como histórico imutável. Documentos e versões já enviados não serão apagados.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Setor / Departamento *</label>
                <div className="relative">
                  <Layers className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Unidade / Fábrica *</label>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Data Prevista de Início *</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={expectedStartDate}
                    onChange={(e) => setExpectedStartDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Status do Processo</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AdmissionStatus)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-blue-600"
                >
                  <option value="Rascunho">Rascunho</option>
                  <option value="Aguardando documentos">Aguardando documentos</option>
                  <option value="Em conferência">Em conferência</option>
                  <option value="Pendência">Pendência</option>
                  <option value="Concluída">Concluída</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ações do Modal */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-xl transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
