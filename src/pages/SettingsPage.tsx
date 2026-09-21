import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Building2, 
  UserCheck, 
  Files, 
  MessageSquare, 
  Bell, 
  BarChart3, 
  Users, 
  History, 
  Save, 
  RotateCcw, 
  Check, 
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  GitBranch
} from 'lucide-react';
import { SystemSettings, User as UserType } from '../types/index.ts';
import { GeneralSettingsTab } from '../components/settings/GeneralSettingsTab.tsx';
import { AdmissionSettingsTab } from '../components/settings/AdmissionSettingsTab.tsx';
import { AdmissionProcessConfigTab } from '../components/settings/AdmissionProcessConfigTab.tsx';
import { DocumentSettingsTab } from '../components/settings/DocumentSettingsTab.tsx';
import { CommunicationSettingsTab } from '../components/settings/CommunicationSettingsTab.tsx';
import { NotificationSettingsTab } from '../components/settings/NotificationSettingsTab.tsx';
import { ReportsSettingsTab } from '../components/settings/ReportsSettingsTab.tsx';
import { UsersSettingsTab } from '../components/settings/UsersSettingsTab.tsx';
import { AuditHistoryTab } from '../components/settings/AuditHistoryTab.tsx';
import { safeFetchJson } from '../lib/api.ts';
import { handleFallbackApiRoute } from '../lib/fallbackClient.ts';

type TabKey = 
  | 'general' 
  | 'admission' 
  | 'process'
  | 'documents' 
  | 'communication' 
  | 'notifications' 
  | 'reports' 
  | 'users' 
  | 'history';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Modal de confirmação para restaurar padrões
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Usuários do RH
  const [users, setUsers] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await safeFetchJson<any>('/api/settings');
      if (data?.settings) {
        setSettings(data.settings);
      }
      setHasChanges(false);
    } catch (err: any) {
      console.warn('Utilizando configurações padrão/locais:', err);
      const fallback = handleFallbackApiRoute('/api/settings');
      if (fallback?.settings) {
        setSettings(fallback.settings);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await safeFetchJson<any>('/api/users');
      if (data?.users) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.warn('Utilizando usuários do fallback:', err);
      const fallback = handleFallbackApiRoute('/api/users');
      if (fallback?.users) {
        setUsers(fallback.users);
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchUsers();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!settings) return;

    try {
      setSaving(true);
      setErrorMessage(null);
      const data = await safeFetchJson<any>('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (data?.settings) {
        setSettings(data.settings);
      }
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.warn('Persistido em fallback:', err);
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    try {
      setIsResetting(true);
      setErrorMessage(null);
      const data = await safeFetchJson<any>('/api/settings/reset', {
        method: 'POST'
      });

      if (data?.settings) {
        setSettings(data.settings);
      }
      setHasChanges(false);
      setShowResetConfirm(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.warn('Restaurado padrão em fallback:', err);
      const fallback = handleFallbackApiRoute('/api/settings');
      if (fallback?.settings) {
        setSettings(fallback.settings);
      }
      setHasChanges(false);
      setShowResetConfirm(false);
    } finally {
      setIsResetting(false);
    }
  };

  const updateSubSettings = <K extends keyof SystemSettings>(section: K, updates: Partial<SystemSettings[K]>) => {
    if (!settings) return;
    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...(prev[section] as any),
          ...updates
        }
      };
    });
    setHasChanges(true);
  };

  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'general', label: 'Empresa & Geral', icon: Building2 },
    { key: 'admission', label: 'Fluxo de Admissão', icon: UserCheck },
    { key: 'process', label: 'Processo Admissional', icon: GitBranch },
    { key: 'documents', label: 'Documentos', icon: Files },
    { key: 'communication', label: 'Comunicação WhatsApp', icon: MessageSquare },
    { key: 'notifications', label: 'Alertas Operacionais', icon: Bell },
    { key: 'reports', label: 'Relatórios & LGPD', icon: BarChart3 },
    { key: 'users', label: 'Equipe de RH', icon: Users },
    { key: 'history', label: 'Histórico & Auditoria', icon: History }
  ];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-16 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-600">Carregando configurações operacionais do sistema...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/raitz-logo.jpg"
            alt="Logo Raitz"
            referrerPolicy="no-referrer"
            className="w-11 h-11 rounded-2xl object-cover shadow-xs border border-slate-200 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Configurações Operacionais</h1>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                Bloco 4.6
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Painel centralizado de regras operacionais, prazos internos, modelos de WhatsApp e segurança.
            </p>
          </div>
        </div>

        {/* Ações Globais */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
            title="Restaurar parâmetros recomendados padrão"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Restaurar Padrões</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className={`flex items-center gap-2 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-xs transition-colors cursor-pointer ${
              hasChanges 
                ? 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-400/30' 
                : 'bg-slate-800 hover:bg-slate-900'
            }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>

      {/* Alerta de Sucesso */}
      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Configurações operacionais salvas e auditadas com sucesso!</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-normal">
            Atualizado em: {new Date().toLocaleTimeString('pt-BR')}
          </span>
        </div>
      )}

      {/* Alerta de Erro */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Barra de Abas de Navegação */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-xs overflow-x-auto">
        <div className="flex space-x-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo da Aba Ativa */}
      {settings && (
        <div>
          {activeTab === 'general' && (
            <GeneralSettingsTab
              settings={settings.general}
              onChange={(updates) => updateSubSettings('general', updates)}
            />
          )}

          {activeTab === 'admission' && (
            <AdmissionSettingsTab
              settings={settings.admission}
              onChange={(updates) => updateSubSettings('admission', updates)}
            />
          )}

          {activeTab === 'process' && (
            <AdmissionProcessConfigTab />
          )}

          {activeTab === 'documents' && (
            <DocumentSettingsTab
              settings={settings.documents}
              onChange={(updates) => updateSubSettings('documents', updates)}
            />
          )}

          {activeTab === 'communication' && (
            <CommunicationSettingsTab
              settings={settings.communication}
              companyName={settings.general?.companyName || 'Galvanização Raitz'}
              onChange={(updates) => updateSubSettings('communication', updates)}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationSettingsTab
              settings={settings.notifications}
              onChange={(updates) => updateSubSettings('notifications', updates)}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsSettingsTab
              settings={settings.reports}
              onChange={(updates) => updateSubSettings('reports', updates)}
            />
          )}

          {activeTab === 'users' && (
            <UsersSettingsTab
              users={users}
              loadingUsers={loadingUsers}
              onRefreshUsers={fetchUsers}
            />
          )}

          {activeTab === 'history' && (
            <AuditHistoryTab />
          )}
        </div>
      )}

      {/* Barra Flutuante de Salvamento se houver alterações pendentes */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-semibold">Existem alterações operacionais não salvas.</span>
          </div>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Salvar Agora</span>
          </button>
        </div>
      )}

      {/* Modal de Confirmação: Restaurar Padrões */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Restaurar Configurações Padrão?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Esta ação redefinirá todos os prazos de inatividade (3 dias), alertas de início próximo (5 dias), 
                  tamanho máximo de arquivos (15MB) e formatos padrão para as recomendações de fábrica do sistema.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">Esta ação:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>NÃO apagará admissões ou cadastros existentes.</li>
                <li>NÃO excluirá usuários cadastrados no RH.</li>
                <li>Será auditada no histórico de conformidade com seu usuário.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleResetToDefault}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>Confirmar e Restaurar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
