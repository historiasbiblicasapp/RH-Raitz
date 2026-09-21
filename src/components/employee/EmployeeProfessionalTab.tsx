import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Building2, 
  Calendar, 
  UserCheck, 
  Info, 
  AlertCircle, 
  Clock, 
  Tag, 
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { Employee, JobPosition } from '../../types/index.ts';
import { safeFetchJson } from '../../lib/api.ts';

interface EmployeeProfessionalTabProps {
  employee: Employee;
  isEditMode: boolean;
  editData: Partial<Employee>;
  onChangeField: (field: keyof Employee, value: any) => void;
  onBatchChangeFields?: (updates: Partial<Employee>) => void;
}

export const EmployeeProfessionalTab: React.FC<EmployeeProfessionalTabProps> = ({
  employee,
  isEditMode,
  editData,
  onChangeField,
  onBatchChangeFields
}) => {
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsLoadingJobs(true);
    safeFetchJson<{ items: JobPosition[] }>('/api/job-positions')
      .then(res => {
        if (!mounted) return;
        const activeJobs = (res?.items || []).filter(j => j.active);
        setJobPositions(activeJobs);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoadingJobs(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleJobPositionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const foundJob = jobPositions.find(j => j.id === selectedId);

    if (foundJob) {
      if (onBatchChangeFields) {
        onBatchChangeFields({
          jobPositionId: foundJob.id,
          role: foundJob.name
        });
      } else {
        onChangeField('jobPositionId', foundJob.id);
        onChangeField('role', foundJob.name);
      }
    } else {
      onChangeField('jobPositionId', undefined);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alerta Informativo Obrigatório (Seção 16) */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3 text-xs text-blue-800">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Regra de Integridade Histórica e Imutabilidade</p>
          <p className="text-blue-700 leading-relaxed">
            Alterações no cargo, setor ou unidade atual do funcionário pertencem ao seu cadastro permanente e <strong>não modificam retroativamente</strong> o histórico, snapshots ou checklists de documentos de admissões anteriores.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-600" />
            Dados do Vínculo Profissional Atual
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">Lotação e enquadramento</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* Matrícula */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">Matrícula</label>
            {isEditMode ? (
              <input
                type="text"
                value={editData.registrationNumber || ''}
                onChange={(e) => onChangeField('registrationNumber', e.target.value.trim())}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: 001245"
              />
            ) : (
              <p className="font-mono font-bold text-slate-900 text-sm">
                {employee.registrationNumber || '(Não cadastrada)'}
              </p>
            )}
          </div>

          {/* Cargo Atual (Seção 15 - Conectado a job_positions) */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-slate-500 font-medium block">
              Cargo Atual <span className="text-rose-500">*</span>
            </label>
            {isEditMode ? (
              <div className="space-y-1.5">
                <select
                  value={editData.jobPositionId || ''}
                  onChange={handleJobPositionChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um cargo da tabela ativa...</option>
                  {jobPositions.map(pos => (
                    <option key={pos.id} value={pos.id}>
                      {pos.name} {pos.code ? `(${pos.code})` : ''}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Ou digite o nome do cargo:</span>
                  <input
                    type="text"
                    value={editData.role || ''}
                    onChange={(e) => onChangeField('role', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-md text-xs font-medium"
                    placeholder="Nome customizado"
                  />
                </div>
              </div>
            ) : (
              <p className="font-bold text-slate-900 text-sm flex items-center gap-2">
                {employee.role}
                {employee.jobPositionId && (
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-normal">
                    Vinculado à tabela de cargos
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Setor / Departamento */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">
              Setor / Departamento <span className="text-rose-500">*</span>
            </label>
            {isEditMode ? (
              <input
                type="text"
                value={editData.department || ''}
                onChange={(e) => onChangeField('department', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Operações, Manutenção"
              />
            ) : (
              <p className="font-semibold text-slate-800">{employee.department}</p>
            )}
          </div>

          {/* Unidade */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">
              Unidade <span className="text-rose-500">*</span>
            </label>
            {isEditMode ? (
              <input
                type="text"
                value={editData.unit || ''}
                onChange={(e) => onChangeField('unit', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Matriz - Blumenau"
              />
            ) : (
              <p className="font-semibold text-slate-800">{employee.unit}</p>
            )}
          </div>

          {/* Gestor Imediato */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">Gestor Imediato</label>
            {isEditMode ? (
              <input
                type="text"
                value={editData.manager || ''}
                onChange={(e) => onChangeField('manager', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome do gestor ou supervisor"
              />
            ) : (
              <p className="font-semibold text-slate-800">{employee.manager || '(Não atribuído)'}</p>
            )}
          </div>

          {/* Data de Admissão Atual */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">Data de Início / Admissão</label>
            {isEditMode ? (
              <input
                type="date"
                value={editData.admissionDate || editData.expectedStartDate || ''}
                onChange={(e) => {
                  onChangeField('admissionDate', e.target.value);
                  onChangeField('expectedStartDate', e.target.value);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="font-semibold text-slate-800">
                {employee.admissionDate || employee.expectedStartDate 
                  ? new Date((employee.admissionDate || employee.expectedStartDate) + 'T00:00:00').toLocaleDateString('pt-BR') 
                  : '-'}
              </p>
            )}
          </div>

          {/* Tipo de Vínculo */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">Tipo de Vínculo</label>
            {isEditMode ? (
              <select
                value={editData.contractType || 'CLT'}
                onChange={(e) => onChangeField('contractType', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CLT">CLT (Efetivo)</option>
                <option value="Estágio">Estágio</option>
                <option value="Jovem Aprendiz">Jovem Aprendiz</option>
                <option value="PJ">PJ (Prestador)</option>
                <option value="Temporário">Temporário</option>
                <option value="Terceirizado">Terceirizado</option>
              </select>
            ) : (
              <p className="font-semibold text-slate-800">{employee.contractType || 'CLT (Efetivo)'}</p>
            )}
          </div>

          {/* Turno de Trabalho */}
          <div className="space-y-1">
            <label className="text-slate-500 font-medium block">Turno de Trabalho</label>
            {isEditMode ? (
              <select
                value={editData.workShift || 'Comercial'}
                onChange={(e) => onChangeField('workShift', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Comercial">Administrativo / Comercial (08h às 18h)</option>
                <option value="1º Turno">1º Turno (06h às 14h)</option>
                <option value="2º Turno">2º Turno (14h às 22h)</option>
                <option value="3º Turno">3º Turno / Noturno (22h às 06h)</option>
                <option value="Escala 12x36">Escala 12x36</option>
                <option value="Home Office / Flexível">Home Office / Flexível</option>
              </select>
            ) : (
              <p className="font-semibold text-slate-800">{employee.workShift || 'Administrativo / Comercial'}</p>
            )}
          </div>

          {/* Observações Profissionais */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
            <label className="text-slate-500 font-medium block">Observações Profissionais</label>
            {isEditMode ? (
              <textarea
                value={editData.professionalNotes || ''}
                onChange={(e) => onChangeField('professionalNotes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Informações contratuais, peculiaridades do posto ou requisitos de função..."
              />
            ) : (
              <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                {employee.professionalNotes || '(Nenhuma observação profissional registrada)'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
