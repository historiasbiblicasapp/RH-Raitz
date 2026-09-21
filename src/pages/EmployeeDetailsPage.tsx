import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, 
  UserCheck, 
  Phone, 
  MapPin, 
  Briefcase, 
  FileText, 
  Layers, 
  FolderOpen, 
  History, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  X
} from 'lucide-react';
import { Employee, EmployeeDetailResponse, EmployeeStatus } from '../types/index.ts';
import { safeFetchJson } from '../lib/api.ts';
import { validateCPF, validateEmail, formatCPF } from '../lib/cpf.ts';

// Componentes modulares da Ficha Cadastral (Bloco 5.2)
import { EmployeeHeader } from '../components/employee/EmployeeHeader.tsx';
import { EmployeeSummaryTab } from '../components/employee/EmployeeSummaryTab.tsx';
import { EmployeePersonalTab } from '../components/employee/EmployeePersonalTab.tsx';
import { EmployeeContactTab } from '../components/employee/EmployeeContactTab.tsx';
import { EmployeeAddressTab } from '../components/employee/EmployeeAddressTab.tsx';
import { EmployeeProfessionalTab } from '../components/employee/EmployeeProfessionalTab.tsx';
import { EmployeeComplementaryTab } from '../components/employee/EmployeeComplementaryTab.tsx';
import { EmployeeAdmissionsTab } from '../components/employee/EmployeeAdmissionsTab.tsx';
import { EmployeeDocumentsTab } from '../components/employee/EmployeeDocumentsTab.tsx';
import { EmployeeHistoryTab } from '../components/employee/EmployeeHistoryTab.tsx';
import { CriticalChangeModal } from '../components/employee/CriticalChangeModal.tsx';
import { UnsavedChangesModal } from '../components/employee/UnsavedChangesModal.tsx';
import { EmployeeStatusModal } from '../components/employee/EmployeeStatusModal.tsx';

export type EmployeeTab = 
  | 'resumo' 
  | 'pessoais' 
  | 'contato' 
  | 'endereco' 
  | 'profissionais' 
  | 'complementares' 
  | 'admissoes' 
  | 'documentos' 
  | 'historico';

export const EmployeeDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Estados de dados principais
  const [data, setData] = useState<EmployeeDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Navegação por abas (9 abas conforme Seção 6)
  const [activeTab, setActiveTab] = useState<EmployeeTab>('resumo');
  const [pendingTabChange, setPendingTabChange] = useState<EmployeeTab | null>(null);

  // Modo de Edição e Rastreamento de Alterações
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Employee>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Modais de segurança e confirmação
  const [isCriticalModalOpen, setIsCriticalModalOpen] = useState(false);
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // Carrega dados completos do funcionário
  const fetchDetails = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await safeFetchJson<EmployeeDetailResponse>(`/api/employees/${id}`);
      setData(res);
      setEditFormData(res.employee);
    } catch (err: any) {
      setError(err.message || 'Funcionário não encontrado ou erro ao carregar detalhes.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Limpa mensagens de sucesso após alguns segundos
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Identifica alterações não salvas (isDirty)
  const hasUnsavedChanges = useMemo(() => {
    if (!isEditMode || !data?.employee) return false;
    const original = data.employee as any;
    const current = editFormData as any;

    const fieldsToCompare: (keyof Employee)[] = [
      'name', 'socialName', 'cpf', 'rg', 'rgIssuer', 'rgIssueDate',
      'birthDate', 'gender', 'maritalStatus', 'motherName', 'fatherName',
      'nationality', 'birthplace', 'phone', 'secondaryPhone', 'whatsapp',
      'email', 'personalEmail', 'corporateEmail', 'emergencyContactName',
      'emergencyContactRelationship', 'emergencyContactPhone', 'emergencyContactNotes',
      'cep', 'street', 'number', 'complement', 'neighborhood', 'city', 'state',
      'registrationNumber', 'role', 'jobPositionId', 'department', 'unit',
      'manager', 'admissionDate', 'expectedStartDate', 'contractType', 'workShift',
      'professionalNotes', 'internalId', 'administrativeNotes'
    ];

    return fieldsToCompare.some(field => {
      const origVal = (original[field] ?? '').toString().trim();
      const currVal = (current[field] ?? '').toString().trim();
      return origVal !== currVal;
    });
  }, [isEditMode, data, editFormData]);

  // Lista de alterações estruturais críticas (CPF, Matrícula, Cargo, Setor, Unidade)
  const criticalChanges = useMemo(() => {
    if (!data?.employee) return [];
    const orig = data.employee;
    const curr = editFormData;
    const items: Array<{ label: string; from: string; to: string }> = [];

    if (curr.cpf && curr.cpf.replace(/\D/g, '') !== orig.cpf.replace(/\D/g, '')) {
      items.push({
        label: 'CPF',
        from: orig.cpfMasked || orig.cpf,
        to: formatCPF(curr.cpf)
      });
    }

    if (curr.registrationNumber !== undefined && (curr.registrationNumber.trim()) !== (orig.registrationNumber || '')) {
      items.push({
        label: 'Matrícula',
        from: orig.registrationNumber || '(não cadastrada)',
        to: curr.registrationNumber || '(removida)'
      });
    }

    if (curr.role && curr.role.trim() !== orig.role.trim()) {
      items.push({
        label: 'Cargo Atual',
        from: orig.role,
        to: curr.role
      });
    }

    if (curr.department && curr.department.trim() !== orig.department.trim()) {
      items.push({
        label: 'Setor / Departamento',
        from: orig.department,
        to: curr.department
      });
    }

    if (curr.unit && curr.unit.trim() !== orig.unit.trim()) {
      items.push({
        label: 'Unidade de Lotação',
        from: orig.unit,
        to: curr.unit
      });
    }

    return items;
  }, [data, editFormData]);

  // Modificação de campos individuais
  const handleChangeField = useCallback((field: keyof Employee, value: any) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Modificação em lote de campos (ex: busca de CEP ou seleção de cargo)
  const handleBatchChangeFields = useCallback((updates: Partial<Employee>) => {
    setEditFormData(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  // Troca de aba com proteção contra perda de dados não salvos
  const handleSelectTab = (tab: EmployeeTab) => {
    if (tab === activeTab) return;
    if (isEditMode && hasUnsavedChanges) {
      setPendingTabChange(tab);
      setIsUnsavedModalOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  // Descartar alterações e mudar de aba
  const handleDiscardChanges = () => {
    if (data?.employee) {
      setEditFormData(data.employee);
    }
    setIsEditMode(false);
    setIsUnsavedModalOpen(false);
    if (pendingTabChange) {
      setActiveTab(pendingTabChange);
      setPendingTabChange(null);
    }
  };

  // Continuar editando
  const handleContinueEditing = () => {
    setIsUnsavedModalOpen(false);
    setPendingTabChange(null);
  };

  // Alternar modo de edição
  const handleToggleEditMode = () => {
    if (isEditMode) {
      if (hasUnsavedChanges) {
        setIsUnsavedModalOpen(true);
        return;
      }
      setIsEditMode(false);
    } else {
      if (data?.employee) {
        setEditFormData(data.employee);
      }
      setIsEditMode(true);
      if (activeTab === 'resumo' || activeTab === 'admissoes' || activeTab === 'documentos' || activeTab === 'historico') {
        setActiveTab('pessoais');
      }
    }
  };

  // Cancelar edição
  const handleCancelEdit = () => {
    if (hasUnsavedChanges) {
      setIsUnsavedModalOpen(true);
    } else {
      setIsEditMode(false);
      if (data?.employee) {
        setEditFormData(data.employee);
      }
    }
  };

  // Validação antes do salvamento
  const validateForm = (): string | null => {
    if (!editFormData.name || !editFormData.name.trim()) {
      return 'O nome completo do funcionário é obrigatório.';
    }
    if (!editFormData.cpf || !validateCPF(editFormData.cpf)) {
      return 'CPF inválido. Verifique os números digitados.';
    }
    if (!editFormData.birthDate) {
      return 'A data de nascimento é obrigatória.';
    }
    const bd = new Date(editFormData.birthDate + 'T00:00:00');
    if (isNaN(bd.getTime()) || bd > new Date()) {
      return 'A data de nascimento não pode ser uma data futura.';
    }
    if (!editFormData.phone || editFormData.phone.replace(/\D/g, '').length < 10) {
      return 'Informe um telefone de contato válido com DDD.';
    }
    if (!editFormData.email || !validateEmail(editFormData.email)) {
      return 'Informe um e-mail pessoal válido.';
    }
    if (editFormData.corporateEmail && !validateEmail(editFormData.corporateEmail)) {
      return 'O formato do e-mail corporativo é inválido.';
    }
    if (!editFormData.role || !editFormData.role.trim()) {
      return 'O cargo atual é obrigatório.';
    }
    if (!editFormData.department || !editFormData.department.trim()) {
      return 'O setor é obrigatório.';
    }
    if (!editFormData.unit || !editFormData.unit.trim()) {
      return 'A unidade é obrigatória.';
    }
    return null;
  };

  // Pré-salvamento: checa alterações críticas
  const handleInitiateSave = () => {
    const valError = validateForm();
    if (valError) {
      setError(valError);
      return;
    }

    if (criticalChanges.length > 0) {
      setIsCriticalModalOpen(true);
    } else {
      handleExecuteSave();
    }
  };

  // Execução do salvamento via API
  const handleExecuteSave = async () => {
    if (!id) return;
    setIsSaving(true);
    setError(null);

    try {
      const updated = await safeFetchJson<Employee>(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });

      setIsCriticalModalOpen(false);
      setIsEditMode(false);
      setSuccessMessage('Ficha cadastral atualizada com sucesso!');
      await fetchDetails();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar dados do funcionário.');
    } finally {
      setIsSaving(false);
    }
  };

  // Alteração de situação (Ativo / Inativo)
  const handleConfirmStatusChange = async (newStatus: EmployeeStatus, reason: string) => {
    if (!id) return;
    setIsSavingStatus(true);
    try {
      await safeFetchJson(`/api/employees/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason })
      });
      setSuccessMessage(`Situação do funcionário alterada para "${newStatus}" com sucesso.`);
      await fetchDetails();
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Contagem total de documentos das admissões
  const totalDocumentsCount = useMemo(() => {
    if (!data?.admissions) return 0;
    return data.admissions.reduce((acc, adm) => acc + (adm.documents ? adm.documents.length : 0), 0);
  }, [data]);

  // Estado de Carregamento
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">
          Carregando ficha cadastral completa do colaborador...
        </p>
      </div>
    );
  }

  // Estado de Erro Grave (Funcionário não encontrado)
  if (error && !data) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Não foi possível carregar o funcionário</h2>
        <p className="text-xs text-slate-600 leading-relaxed">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/funcionarios')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
        >
          Voltar para Lista de Funcionários
        </button>
      </div>
    );
  }

  if (!data || !data.employee) return null;

  const employee = data.employee;

  // Definição das 9 abas exigidas (Seção 6)
  const tabs: Array<{ id: EmployeeTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }> = [
    { id: 'resumo', label: 'Resumo', icon: User },
    { id: 'pessoais', label: 'Dados Pessoais', icon: UserCheck },
    { id: 'contato', label: 'Contato', icon: Phone },
    { id: 'endereco', label: 'Endereço', icon: MapPin },
    { id: 'profissionais', label: 'Dados Profissionais', icon: Briefcase },
    { id: 'complementares', label: 'Dados Complementares', icon: FileText },
    { id: 'admissoes', label: 'Admissões', icon: Layers, badge: data.admissions?.length },
    { id: 'documentos', label: 'Documentos', icon: FolderOpen, badge: totalDocumentsCount },
    { id: 'historico', label: 'Histórico & Auditoria', icon: History, badge: data.auditLogs?.length }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Mensagens de Notificação / Feedback */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-800 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2 text-xs text-rose-800 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setError(null)}
            className="text-rose-700 hover:text-rose-900 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Cabeçalho da Ficha Conforme Especificação (Seção 5) */}
      <EmployeeHeader
        employee={isEditMode ? { ...employee, ...editFormData } as Employee : employee}
        isEditMode={isEditMode}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        onToggleEditMode={handleToggleEditMode}
        onSave={handleInitiateSave}
        onCancelEdit={handleCancelEdit}
        onOpenStatusModal={() => setIsStatusModalOpen(true)}
      />

      {/* 2. Barra de Navegação das 9 Abas (Seção 6) */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-1.5 overflow-x-auto scrollbar-thin">
        <nav className="flex items-center gap-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 3. Conteúdo da Aba Selecionada */}
      <div className="transition-all">
        {activeTab === 'resumo' && (
          <EmployeeSummaryTab
            employee={employee}
            summary={data.summary}
            admissions={data.admissions || []}
            allDocumentsCount={totalDocumentsCount}
            onNavigateToTab={handleSelectTab}
          />
        )}

        {activeTab === 'pessoais' && (
          <EmployeePersonalTab
            employee={employee}
            isEditMode={isEditMode}
            editData={editFormData}
            onChangeField={handleChangeField}
          />
        )}

        {activeTab === 'contato' && (
          <EmployeeContactTab
            employee={employee}
            isEditMode={isEditMode}
            editData={editFormData}
            onChangeField={handleChangeField}
          />
        )}

        {activeTab === 'endereco' && (
          <EmployeeAddressTab
            employee={employee}
            isEditMode={isEditMode}
            editData={editFormData}
            onChangeField={handleChangeField}
            onBatchChangeFields={handleBatchChangeFields}
          />
        )}

        {activeTab === 'profissionais' && (
          <EmployeeProfessionalTab
            employee={employee}
            isEditMode={isEditMode}
            editData={editFormData}
            onChangeField={handleChangeField}
            onBatchChangeFields={handleBatchChangeFields}
          />
        )}

        {activeTab === 'complementares' && (
          <EmployeeComplementaryTab
            employee={employee}
            isEditMode={isEditMode}
            editData={editFormData}
            onChangeField={handleChangeField}
          />
        )}

        {activeTab === 'admissoes' && (
          <EmployeeAdmissionsTab
            admissions={data.admissions || []}
          />
        )}

        {activeTab === 'documentos' && (
          <EmployeeDocumentsTab
            employee={employee}
            admissions={data.admissions || []}
            initialDocuments={data.documents || []}
            initialStats={data.documentStats}
            onDocumentsUpdated={fetchDetails}
          />
        )}

        {activeTab === 'historico' && (
          <EmployeeHistoryTab
            auditLogs={data.auditLogs || []}
          />
        )}
      </div>

      {/* 4. Modais de Confirmação e Segurança */}
      <CriticalChangeModal
        isOpen={isCriticalModalOpen}
        onClose={() => setIsCriticalModalOpen(false)}
        onConfirm={handleExecuteSave}
        criticalFieldsChanged={criticalChanges}
        isSaving={isSaving}
      />

      <UnsavedChangesModal
        isOpen={isUnsavedModalOpen}
        onContinueEditing={handleContinueEditing}
        onDiscardChanges={handleDiscardChanges}
      />

      <EmployeeStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        employee={employee}
        onConfirm={handleConfirmStatusChange}
        isSaving={isSavingStatus}
      />
    </div>
  );
};
