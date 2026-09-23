import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckSquare, 
  User, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Layers, 
  CheckCircle2,
  ShieldCheck,
  Search,
  ChevronDown
} from 'lucide-react';
import { 
  OperationalPriority, 
  OperationalTaskSourceType, 
  OperationalTask,
  CreateOperationalTaskInput
} from '../../types/index.ts';
import { safeFetchJson } from '../../lib/api.ts';

interface EligibleUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  active: boolean;
}

interface AdmissionSimple {
  id: string;
  code: string;
  employeeName: string;
  role?: string;
  unit?: string;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (task: OperationalTask) => void;
  initialAdmissionId?: string;
  initialAdmissionCode?: string;
  initialEmployeeName?: string;
  initialSourceType?: OperationalTaskSourceType;
  initialSourceId?: string;
  initialSourceDescription?: string;
  initialStepKey?: string;
  initialDocumentId?: string;
  initialDocumentName?: string;
  initialApprovalId?: string;
  initialTitle?: string;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialAdmissionId,
  initialAdmissionCode,
  initialEmployeeName,
  initialSourceType = 'ADMISSAO',
  initialSourceId,
  initialSourceDescription,
  initialStepKey,
  initialDocumentId,
  initialDocumentName,
  initialApprovalId,
  initialTitle = ''
}) => {
  const [admissionId, setAdmissionId] = useState(initialAdmissionId || '');
  const [selectedAdmission, setSelectedAdmission] = useState<AdmissionSimple | null>(null);
  const [admissionsList, setAdmissionsList] = useState<AdmissionSimple[]>([]);
  const [admissionSearch, setAdmissionSearch] = useState('');
  const [isAdmissionsDropdownOpen, setIsAdmissionsDropdownOpen] = useState(false);

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<OperationalPriority>('NORMAL');
  const [sourceType, setSourceType] = useState<OperationalTaskSourceType>(initialSourceType);
  const [sourceDescription, setSourceDescription] = useState(initialSourceDescription || '');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('18:00');
  const [hasDueDate, setHasDueDate] = useState(false);

  const [responsibleUserId, setResponsibleUserId] = useState<string>('');
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Carregar usuários elegíveis para atribuição
  useEffect(() => {
    if (!isOpen) return;

    safeFetchJson<{ users: EligibleUser[] }>('/api/responsaveis/elegiveis')
      .then(res => {
        if (res?.users) {
          setEligibleUsers(res.users.filter(u => u.active !== false));
        }
      })
      .catch(err => {
        console.warn('Erro ao carregar usuários elegíveis:', err);
      });

    // Se não veio com admissionId fixo, busca lista de admissões ativas
    if (!initialAdmissionId) {
      safeFetchJson<{ admissions: any[] }>('/api/admissions?limit=50&status=Aguardando%20documentos')
        .then(res => {
          if (res?.admissions) {
            const list: AdmissionSimple[] = res.admissions.map(a => ({
              id: a.id,
              code: a.id.replace('adm-', 'ADM-').slice(0, 10).toUpperCase(),
              employeeName: a.employee?.name || 'Colaborador',
              role: a.employee?.role,
              unit: a.employee?.unit
            }));
            setAdmissionsList(list);
          }
        })
        .catch(err => console.warn('Erro ao carregar lista de admissões:', err));
    }
  }, [isOpen, initialAdmissionId]);

  // Inicializa dados quando abre o modal
  useEffect(() => {
    if (isOpen) {
      setAdmissionId(initialAdmissionId || '');
      setTitle(initialTitle);
      setDescription('');
      setPriority('NORMAL');
      setSourceType(initialSourceType);
      setSourceDescription(initialSourceDescription || '');
      setHasDueDate(false);
      setDueDate('');
      setDueTime('18:00');
      setResponsibleUserId('');
      setErrorMsg(null);
      setIsSubmitting(false);

      if (initialAdmissionId && initialEmployeeName) {
        setSelectedAdmission({
          id: initialAdmissionId,
          code: initialAdmissionCode || initialAdmissionId.replace('adm-', 'ADM-').slice(0, 10).toUpperCase(),
          employeeName: initialEmployeeName
        });
      }
    }
  }, [
    isOpen,
    initialAdmissionId,
    initialAdmissionCode,
    initialEmployeeName,
    initialSourceType,
    initialSourceDescription,
    initialTitle
  ]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle || trimmedTitle.length < 3) {
      setErrorMsg('Informe um título claro e descritivo com pelo menos 3 caracteres.');
      return;
    }

    if (!admissionId) {
      setErrorMsg('Selecione obrigatoriamente a admissão vinculada a esta tarefa operacional.');
      return;
    }

    let dueAt: string | null = null;
    if (hasDueDate && dueDate) {
      try {
        const fullDateStr = `${dueDate}T${dueTime || '18:00'}:00`;
        const dateObj = new Date(fullDateStr);
        if (isNaN(dateObj.getTime())) {
          setErrorMsg('A data/hora do prazo operacional é inválida.');
          return;
        }
        dueAt = dateObj.toISOString();
      } catch {
        setErrorMsg('Data ou hora de prazo inválida.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload: CreateOperationalTaskInput = {
      admissionId,
      title: trimmedTitle,
      description: description.trim() || undefined,
      priority,
      dueAt,
      responsibleUserId: responsibleUserId ? responsibleUserId : null,
      sourceType,
      sourceId: initialSourceId,
      sourceDescription: sourceDescription.trim() || undefined,
      stepKey: initialStepKey,
      documentId: initialDocumentId,
      approvalId: initialApprovalId
    };

    try {
      const response = await fetch('/api/tarefas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao registrar tarefa operacional.');
      }

      onSuccess(data.task);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao salvar a tarefa. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  const filteredAdmissions = admissionsList.filter(a => {
    if (!admissionSearch) return true;
    const q = admissionSearch.toLowerCase();
    return a.employeeName.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) || (a.role && a.role.toLowerCase().includes(q));
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-task-title"
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-task-title" className="text-base font-bold text-slate-900 leading-snug">
                Nova Tarefa Operacional do RH
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Vincule uma ação de resolução ao processo admissional
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Contexto da Admissão */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Admissão / Funcionário <span className="text-red-500">*</span>
            </label>
            {initialAdmissionId && selectedAdmission ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    {selectedAdmission.employeeName}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {selectedAdmission.code}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  Admissão Vinculada
                </span>
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAdmissionsDropdownOpen(!isAdmissionsDropdownOpen)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-left text-xs sm:text-sm text-slate-700 flex items-center justify-between hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <span>
                    {selectedAdmission 
                      ? `${selectedAdmission.employeeName} (${selectedAdmission.code})` 
                      : 'Selecione o funcionário ou admissão...'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {isAdmissionsDropdownOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto p-2 space-y-1">
                    <div className="px-2 pb-1.5">
                      <input
                        type="text"
                        placeholder="Buscar por nome ou código..."
                        value={admissionSearch}
                        onChange={(e) => setAdmissionSearch(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
                        autoFocus
                      />
                    </div>
                    {filteredAdmissions.length === 0 ? (
                      <div className="py-2 px-3 text-xs text-slate-400 text-center">
                        Nenhuma admissão encontrada
                      </div>
                    ) : (
                      filteredAdmissions.map(adm => (
                        <button
                          key={adm.id}
                          type="button"
                          onClick={() => {
                            setAdmissionId(adm.id);
                            setSelectedAdmission(adm);
                            setIsAdmissionsDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-slate-50 flex items-center justify-between"
                        >
                          <span className="font-semibold text-slate-800">{adm.employeeName}</span>
                          <span className="font-mono text-slate-400 text-[11px]">{adm.code}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Origem e Contexto Opcional */}
          {(initialDocumentName || initialStepKey || initialSourceDescription) && (
            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">
                Contexto de Origem: {sourceType}
              </span>
              {initialDocumentName && (
                <div className="text-slate-700 flex items-center gap-1.5 font-medium">
                  <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Documento: <strong>{initialDocumentName}</strong></span>
                </div>
              )}
              {initialStepKey && (
                <div className="text-slate-700 flex items-center gap-1.5 font-medium">
                  <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Etapa: <strong>{initialStepKey}</strong></span>
                </div>
              )}
              {initialSourceDescription && (
                <div className="text-slate-600 text-[11px]">
                  {initialSourceDescription}
                </div>
              )}
            </div>
          )}

          {/* Título da Tarefa */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Título da Ação Operacional <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={150}
              placeholder="Ex: Solicitar novo RG com foto nítida / Confirmar dados bancários"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>

          {/* Descrição Detalhada */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Instruções / Detalhamento Operacional (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Descreva detalhes ou observações pertinentes para quem for executar a ação..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Grid de Prioridade e Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Prioridade */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Prioridade Operacional
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['NORMAL', 'ALTA', 'CRITICA'] as OperationalPriority[]).map((p) => {
                  const isSelected = priority === p;
                  const labelMap = { NORMAL: 'Normal', ALTA: 'Alta', CRITICA: 'Crítica' };
                  const colorMap = {
                    NORMAL: isSelected ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100',
                    ALTA: isSelected ? 'bg-amber-600 text-white border-amber-600' : 'bg-amber-50/50 text-amber-700 border-amber-200 hover:bg-amber-100/50',
                    CRITICA: isSelected ? 'bg-rose-600 text-white border-rose-600' : 'bg-rose-50/50 text-rose-700 border-rose-200 hover:bg-rose-100/50'
                  };
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition-colors cursor-pointer ${colorMap[p]}`}
                    >
                      {labelMap[p]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Responsável Operacional */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Responsável
              </label>
              <select
                value={responsibleUserId}
                onChange={(e) => setResponsibleUserId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              >
                <option value="">Sem responsável (Pool aberto)</option>
                {eligibleUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Prazo Operacional */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasDueDate}
                  onChange={(e) => setHasDueDate(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-700">
                  Definir prazo operacional de conclusão
                </span>
              </label>
              {!hasDueDate && (
                <span className="text-[11px] text-slate-400 font-medium italic">
                  Sem prazo definido
                </span>
              )}
            </div>

            {hasDueDate && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50/80 border border-slate-200 rounded-xl animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Data Limite
                  </label>
                  <input
                    type="date"
                    required={hasDueDate}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Horário Limite
                  </label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Rodapé e Botões */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4" />
                  <span>Criar Tarefa</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
