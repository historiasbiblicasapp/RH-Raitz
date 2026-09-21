import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Clock, 
  Layers, 
  User, 
  Info,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  FileCheck2,
  Check
} from 'lucide-react';
import { 
  AdmissionProcessConfig, 
  AdmissionProcessVersion, 
  ConfigurableProcessStep, 
  ProcessStepCompletionRule, 
  ProcessStepResponsibleRole 
} from '../../types/index.ts';
import { safeFetchJson } from '../../lib/api.ts';
import { handleFallbackApiRoute } from '../../lib/fallbackClient.ts';

export const AdmissionProcessConfigTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [processData, setProcessData] = useState<{
    process: AdmissionProcessConfig;
    activeVersion: AdmissionProcessVersion;
    allVersions: AdmissionProcessVersion[];
  } | null>(null);

  // Etapas em edição local
  const [editableSteps, setEditableSteps] = useState<ConfigurableProcessStep[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Modal de Criação de Nova Versão
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [changeNotes, setChangeNotes] = useState('');
  const [isSavingVersion, setIsSavingVersion] = useState(false);

  // Feedback & Erros
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Histórico de Versões Expandido
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedHistoryVersion, setSelectedHistoryVersion] = useState<AdmissionProcessVersion | null>(null);

  // Modal de Adicionar Nova Etapa
  const [showAddStepModal, setShowAddStepModal] = useState(false);
  const [newStepName, setNewStepName] = useState('');
  const [newStepKey, setNewStepKey] = useState('');
  const [newStepDesc, setNewStepDesc] = useState('');
  const [newStepRole, setNewStepRole] = useState<ProcessStepResponsibleRole>('RH');
  const [newStepRule, setNewStepRule] = useState<ProcessStepCompletionRule>('APROVACAO_MANUAL');
  const [newStepRequired, setNewStepRequired] = useState(true);

  const fetchProcessConfig = async () => {
    try {
      setLoading(true);
      const data = await safeFetchJson<any>('/api/admission-process');
      if (data?.activeVersion) {
        setProcessData(data);
        setEditableSteps(JSON.parse(JSON.stringify(data.activeVersion.steps || [])));
        setHasUnsavedChanges(false);
      }
    } catch (err: any) {
      console.warn('Carregando processo admissional do fallback:', err);
      const fallback = handleFallbackApiRoute('/api/admission-process');
      if (fallback?.activeVersion) {
        setProcessData(fallback);
        setEditableSteps(JSON.parse(JSON.stringify(fallback.activeVersion.steps || [])));
        setHasUnsavedChanges(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcessConfig();
  }, []);

  // Manipulação de Etapas
  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= editableSteps.length) return;

    const updated = [...editableSteps];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Atualiza order numericamente
    updated.forEach((s, idx) => {
      s.order = idx + 1;
    });

    setEditableSteps(updated);
    setHasUnsavedChanges(true);
  };

  const handleToggleActive = (index: number) => {
    const updated = [...editableSteps];
    updated[index].active = !updated[index].active;
    setEditableSteps(updated);
    setHasUnsavedChanges(true);
  };

  const handleToggleRequired = (index: number) => {
    const updated = [...editableSteps];
    updated[index].required = !updated[index].required;
    setEditableSteps(updated);
    setHasUnsavedChanges(true);
  };

  const handleUpdateField = <K extends keyof ConfigurableProcessStep>(
    index: number, 
    field: K, 
    value: ConfigurableProcessStep[K]
  ) => {
    const updated = [...editableSteps];
    updated[index][field] = value;
    setEditableSteps(updated);
    setHasUnsavedChanges(true);
  };

  const handleDeleteStep = (index: number) => {
    const stepToDelete = editableSteps[index];
    if (['CADASTRO', 'DADOS_PESSOAIS', 'DOCUMENTOS', 'CONCLUSAO'].includes(stepToDelete.stepKey)) {
      if (!confirm(`A etapa "${stepToDelete.name}" é uma etapa estrutural padrão. Tem certeza que deseja removê-la da nova versão?`)) {
        return;
      }
    }
    const updated = editableSteps.filter((_, i) => i !== index);
    updated.forEach((s, idx) => {
      s.order = idx + 1;
    });
    setEditableSteps(updated);
    setHasUnsavedChanges(true);
  };

  // Adicionar Nova Etapa
  const handleAddNewStep = () => {
    if (!newStepName.trim()) {
      alert('Informe o nome da nova etapa.');
      return;
    }

    const generatedKey = newStepKey.trim() 
      ? newStepKey.toUpperCase().replace(/\s+/g, '_') 
      : newStepName.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 30);

    const newStep: ConfigurableProcessStep = {
      id: 'step-custom-' + Date.now(),
      stepKey: generatedKey,
      name: newStepName.trim(),
      description: newStepDesc.trim() || 'Etapa personalizada do processo admissional',
      order: editableSteps.length + 1,
      active: true,
      required: newStepRequired,
      responsibleRole: newStepRole,
      completionRule: newStepRule
    };

    setEditableSteps([...editableSteps, newStep]);
    setHasUnsavedChanges(true);
    setShowAddStepModal(false);
    setNewStepName('');
    setNewStepKey('');
    setNewStepDesc('');
  };

  // Salvar Nova Versão (POST /api/admission-process/version)
  const handleSaveNewVersion = async () => {
    if (!changeNotes.trim()) {
      alert('A justificativa da alteração da versão é obrigatória para manter a rastreabilidade e auditoria do processo.');
      return;
    }

    try {
      setIsSavingVersion(true);
      setStatusMessage(null);

      const response = await safeFetchJson<any>('/api/admission-process/version', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steps: editableSteps,
          changeNotes: changeNotes.trim()
        })
      });

      if (response?.success && response?.version) {
        setStatusMessage({
          type: 'success',
          text: `Versão ${response.version.versionNumber} criada e ativada com sucesso! As admissões existentes preservaram seus snapshots originais.`
        });
        setShowNewVersionModal(false);
        setChangeNotes('');
        setHasUnsavedChanges(false);
        await fetchProcessConfig();
        setTimeout(() => setStatusMessage(null), 5000);
      } else {
        throw new Error(response?.error || 'Erro ao publicar nova versão.');
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Falha ao salvar nova versão do processo.'
      });
    } finally {
      setIsSavingVersion(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500 text-xs">
        <Clock className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
        <p className="font-semibold">Carregando configuração do processo admissional...</p>
      </div>
    );
  }

  const activeVersion = processData?.activeVersion;

  return (
    <div className="space-y-6">
      {/* Alerta de Status */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in duration-150 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button 
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 px-2 py-1"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Regra Fundamental de Versionamento (Aviso do Bloco 5.4) */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-blue-900 flex items-start gap-3.5 shadow-xs">
        <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <h4 className="font-bold text-blue-950 flex items-center gap-2">
            <span>Regra Fundamental de Versionamento do Processo Admissional</span>
            <span className="px-2 py-0.5 bg-blue-200 text-blue-900 text-[10px] font-extrabold rounded-full">
              BLOCO 5.4
            </span>
          </h4>
          <p className="text-blue-800 leading-relaxed">
            Toda alteração nas etapas cria uma <strong>nova versão estrutural</strong> do processo admissional. 
            Admissões já existentes <strong>preservam seu snapshot imutável</strong> e nunca sofrem alterações retroativas automáticas.
          </p>
        </div>
      </div>

      {/* Cartão da Versão Vigente & Ações */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <GitBranch className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Versão Vigente: Versão {activeVersion?.versionNumber || 1}.0</h3>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                  Ativa para Novas Admissões
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeVersion?.description || 'Configuração padrão de etapas'} • Criada por {activeVersion?.createdBy || 'RH'} em {activeVersion?.createdAt ? new Date(activeVersion.createdAt).toLocaleDateString('pt-BR') : 'Hoje'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Botão Ver Histórico de Versões */}
          <button
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            <span>Versões Anteriores ({processData?.allVersions?.length || 1})</span>
          </button>

          {/* Botão Adicionar Etapa */}
          <button
            onClick={() => setShowAddStepModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Etapa</span>
          </button>

          {/* Botão Salvar Nova Versão */}
          <button
            onClick={() => setShowNewVersionModal(true)}
            disabled={!hasUnsavedChanges}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Publicar Nova Versão</span>
          </button>
        </div>
      </div>

      {/* Histórico de Versões Expandível */}
      {showVersionHistory && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3 animate-in fade-in duration-100">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <span>Histórico de Versões do Processo Admissional</span>
            </h4>
            <button
              onClick={() => setShowVersionHistory(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Recolher
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {(processData?.allVersions || []).map(ver => (
              <div 
                key={ver.id}
                onClick={() => setSelectedHistoryVersion(ver)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  ver.status === 'ativa' 
                    ? 'bg-white border-emerald-300 ring-2 ring-emerald-500/10' 
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900">Versão {ver.versionNumber}.0</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    ver.status === 'ativa' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {ver.status === 'ativa' ? 'Ativa' : 'Arquivada'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 italic line-clamp-2">
                  "{ver.changeNotes || 'Sem notas registradas'}"
                </p>
                <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                  <span>{ver.steps?.length || 0} etapas</span>
                  <span>{new Date(ver.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editor de Etapas da Versão */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Configuração das Etapas do Processo</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Reordene, ative, configure o papel responsável e a regra de conclusão para cada etapa.
            </p>
          </div>
          {hasUnsavedChanges && (
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Alterações pendentes de publicação
            </span>
          )}
        </div>

        {/* Tabela / Lista de Etapas */}
        <div className="space-y-3">
          {editableSteps.map((step, index) => (
            <div 
              key={step.id}
              className={`p-4 rounded-xl border transition-all ${
                step.active 
                  ? 'bg-slate-50/70 border-slate-200 hover:border-slate-300' 
                  : 'bg-slate-100/50 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Lado Esquerdo: Reordenação e Identificação */}
                <div className="flex items-start gap-3">
                  {/* Controles de Ordem */}
                  <div className="flex flex-col items-center gap-1 mt-1 shrink-0">
                    <button
                      onClick={() => handleMoveStep(index, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-20 transition"
                      title="Mover para cima"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-extrabold text-slate-700 w-5 text-center">
                      {step.order}
                    </span>
                    <button
                      onClick={() => handleMoveStep(index, 'down')}
                      disabled={index === editableSteps.length - 1}
                      className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-20 transition"
                      title="Mover para baixo"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Campos de Nome e Descrição */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) => handleUpdateField(index, 'name', e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none w-56 sm:w-64"
                      />
                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {step.stepKey}
                      </span>
                    </div>

                    <input
                      type="text"
                      value={step.description}
                      onChange={(e) => handleUpdateField(index, 'description', e.target.value)}
                      placeholder="Descrição sucinta do objetivo desta etapa..."
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-600 focus:ring-2 focus:ring-blue-600 focus:outline-none w-full"
                    />
                  </div>
                </div>

                {/* Centro/Direita: Parâmetros (Responsável, Regra, Switches) */}
                <div className="flex flex-wrap items-center gap-3 self-end lg:self-center shrink-0">
                  {/* Responsável */}
                  <div className="text-xs space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 block">Responsável</label>
                    <select
                      value={step.responsibleRole}
                      onChange={(e) => handleUpdateField(index, 'responsibleRole', e.target.value as ProcessStepResponsibleRole)}
                      className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="RH">RH (Operacional)</option>
                      <option value="RH_CONFERENCIA">RH (Conferência)</option>
                      <option value="GESTOR">Gestor Imediato</option>
                      <option value="DP">Departamento Pessoal</option>
                      <option value="ADMIN">Administrador</option>
                      <option value="CANDIDATO">Colaborador</option>
                    </select>
                  </div>

                  {/* Regra de Conclusão */}
                  <div className="text-xs space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 block">Regra de Avanço</label>
                    <select
                      value={step.completionRule}
                      onChange={(e) => handleUpdateField(index, 'completionRule', e.target.value as ProcessStepCompletionRule)}
                      className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none max-w-44 truncate"
                    >
                      <option value="CADASTRO_INICIAL">Cadastro Inicial do RH</option>
                      <option value="DADOS_PREENCHIDOS">Confirmação de Dados</option>
                      <option value="DOCUMENTOS_APROVADOS">Documentos Aprovados</option>
                      <option value="CONFERENCIA_FINALIZADA">Conferência RH</option>
                      <option value="APROVACAO_MANUAL">Aprovação Manual</option>
                      <option value="ETAPAS_ANTERIORES_CONCLUIDAS">Todas Etapas Anteriores</option>
                    </select>
                  </div>

                  {/* Toggle Obrigatória */}
                  <div className="text-xs space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 block">Obrigatória?</label>
                    <button
                      type="button"
                      onClick={() => handleToggleRequired(index)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                        step.required 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {step.required ? 'Sim' : 'Não'}
                    </button>
                  </div>

                  {/* Toggle Ativa */}
                  <div className="text-xs space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 block">Status</label>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(index)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                        step.active 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                    >
                      {step.active ? 'Ativa' : 'Inativa'}
                    </button>
                  </div>

                  {/* Botão Remover */}
                  <div className="text-xs space-y-1 pt-3">
                    <button
                      onClick={() => handleDeleteStep(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Excluir etapa desta versão"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Adicionar Nova Etapa */}
      {showAddStepModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Adicionar Nova Etapa ao Processo</span>
              </h3>
              <button 
                onClick={() => setShowAddStepModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Nome da Etapa <span className="text-rose-600">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={newStepName}
                  onChange={(e) => setNewStepName(e.target.value)}
                  placeholder="Ex: Exame Admissional ASO"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Chave Identificadora (opcional):
                </label>
                <input
                  type="text"
                  value={newStepKey}
                  onChange={(e) => setNewStepKey(e.target.value)}
                  placeholder="Ex: EXAME_ASO (gerada automaticamente se vazio)"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none uppercase font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Descrição:
                </label>
                <textarea
                  rows={2}
                  value={newStepDesc}
                  onChange={(e) => setNewStepDesc(e.target.value)}
                  placeholder="Instruções ou objetivo da etapa..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Papel Responsável:</label>
                  <select
                    value={newStepRole}
                    onChange={(e) => setNewStepRole(e.target.value as ProcessStepResponsibleRole)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="RH">RH (Operacional)</option>
                    <option value="RH_CONFERENCIA">RH (Conferência)</option>
                    <option value="GESTOR">Gestor Imediato</option>
                    <option value="DP">Departamento Pessoal</option>
                    <option value="ADMIN">Administrador</option>
                    <option value="CANDIDATO">Colaborador</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Regra de Avanço:</label>
                  <select
                    value={newStepRule}
                    onChange={(e) => setNewStepRule(e.target.value as ProcessStepCompletionRule)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="APROVACAO_MANUAL">Aprovação Manual</option>
                    <option value="CONFERENCIA_FINALIZADA">Conferência RH</option>
                    <option value="DOCUMENTOS_APROVADOS">Docs Aprovados</option>
                    <option value="ETAPAS_ANTERIORES_CONCLUIDAS">Etapas Anteriores</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-new-step-required"
                  checked={newStepRequired}
                  onChange={(e) => setNewStepRequired(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <label htmlFor="chk-new-step-required" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Etapa de cumprimento obrigatório para conclusão do processo
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowAddStepModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddNewStep}
                disabled={!newStepName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                Adicionar Etapa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Publicar Nova Versão */}
      {showNewVersionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl shrink-0">
                <GitBranch className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Publicar Versão {(activeVersion?.versionNumber || 1) + 1}.0 do Processo
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Esta ação gerará uma nova versão estrutural para todas as novas admissões.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                Garantia de Imutabilidade das Admissões Antigas
              </p>
              <p>Nenhuma admissão atualmente em andamento ou concluída terá suas etapas alteradas. O histórico de processos anteriores permanece 100% íntegro.</p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block font-semibold text-slate-800">
                Justificativa / Notas da Versão <span className="text-rose-600 font-bold">*</span>:
              </label>
              <textarea
                rows={3}
                required
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                placeholder="Ex: Inclusão de etapa de validação da diretoria e reordenação da conferência documental..."
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowNewVersionModal(false)}
                disabled={isSavingVersion}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNewVersion}
                disabled={isSavingVersion || !changeNotes.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                {isSavingVersion ? 'Publicando...' : 'Confirmar e Publicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes de Versão do Histórico */}
      {selectedHistoryVersion && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Snapshot da Versão {selectedHistoryVersion.versionNumber}.0
                </h3>
                <p className="text-xs text-slate-500">
                  Criada em {new Date(selectedHistoryVersion.createdAt).toLocaleString('pt-BR')} por {selectedHistoryVersion.createdBy}
                </p>
              </div>
              <button 
                onClick={() => setSelectedHistoryVersion(null)}
                className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 rounded"
              >
                Fechar
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="font-semibold text-slate-700">Justificativa da Versão:</p>
              <p className="text-slate-600 italic">"{selectedHistoryVersion.changeNotes || 'Sem justificativa registrada'}"</p>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              <p className="text-xs font-bold text-slate-800">Etapas nesta versão ({selectedHistoryVersion.steps?.length || 0}):</p>
              {(selectedHistoryVersion.steps || []).map(st => (
                <div key={st.id} className="p-2.5 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">#{st.order} {st.name}</span>
                    <p className="text-[11px] text-slate-500">{st.description}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                    {st.responsibleRole}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedHistoryVersion(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
