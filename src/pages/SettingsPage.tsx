import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Database, 
  FileCheck, 
  Check, 
  Save, 
  Users, 
  UserPlus, 
  Mail, 
  Building2, 
  Lock, 
  X,
  User,
  Edit2,
  Trash2
} from 'lucide-react';
import { User as UserType } from '../types/index.ts';
import { EditUserModal } from '../components/EditUserModal.tsx';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal.tsx';

export const SettingsPage: React.FC = () => {
  const [termVersion, setTermVersion] = useState('1.0-2025');
  const [companyName, setCompanyName] = useState('Raitz Comércio e Serviços');
  const [saved, setSaved] = useState(false);

  // Usuários do RH
  const [users, setUsers] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDepartment, setNewDepartment] = useState('Recursos Humanos');
  const [newRole, setNewRole] = useState<'RH' | 'ADMIN' | 'FUNCIONARIO'>('RH');
  const [userSuccessMessage, setUserSuccessMessage] = useState<string | null>(null);
  const [userErrorMessage, setUserErrorMessage] = useState<string | null>(null);

  // Edição e Exclusão
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserType | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserErrorMessage(null);
    setUserSuccessMessage(null);

    if (!newName.trim() || !newEmail.trim()) {
      setUserErrorMessage('Nome e e-mail são obrigatórios.');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          department: newDepartment.trim() || 'Recursos Humanos',
          role: 'RH'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar usuário.');
      }

      setUserSuccessMessage(`Usuário ${newName} cadastrado com sucesso!`);
      setNewName('');
      setNewEmail('');
      setNewDepartment('Recursos Humanos');
      setNewRole('RH');
      setShowAddUserModal(false);
      fetchUsers();
      setTimeout(() => setUserSuccessMessage(null), 4000);
    } catch (err: any) {
      setUserErrorMessage(err.message || 'Erro ao criar usuário.');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setIsDeletingUser(true);
      const res = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir usuário.');
      }

      setUserSuccessMessage(`Usuário ${userToDelete.name} removido com sucesso.`);
      setUserToDelete(null);
      fetchUsers();
      setTimeout(() => setUserSuccessMessage(null), 4000);
    } catch (err: any) {
      setUserErrorMessage(err.message || 'Falha ao remover usuário.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <img
          src="/raitz-logo.jpg"
          alt="Logo Raitz"
          referrerPolicy="no-referrer"
          className="w-10 h-10 rounded-xl object-cover shadow-xs border border-slate-200 shrink-0"
        />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Configurações do Sistema</h1>
          <p className="text-xs text-slate-500">
            Gerenciamento de parâmetros operacionais, segurança da informação e termos LGPD.
          </p>
        </div>
      </div>

      {saved && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Configurações salvas com sucesso!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Bloco Empresa */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-600" />
            <span>Dados da Empresa Empregadora</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Razão Social / Nome de Exibição</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Versão Atual do Termo LGPD</label>
              <input
                type="text"
                value={termVersion}
                onChange={(e) => setTermVersion(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Bloco LGPD e Segurança */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Políticas de Segurança e LGPD</span>
          </h2>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2 text-slate-600">
            <p className="font-semibold text-slate-800">Diretrizes Implementadas:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Mascaramento visual de CPF em todas as listagens de tela para proteção contra visualizações indevidas.</li>
              <li>Links de acesso com token criptográfico seguro e único por admissão (sem uso de CPF como senha).</li>
              <li>Armazenamento privativo em disco isolado ou bucket restrito com validação de tipos MIME (PDF, JPG, PNG).</li>
              <li>Histórico de auditoria com data, hora, IP/agente e detalhe de cada aprovação ou recusa.</li>
            </ul>
          </div>
        </div>

        {/* Bloco Gestão de Usuários do RH */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Equipe e Usuários de Acesso ao RH</span>
            </h2>
            <button
              type="button"
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Novo Usuário de RH</span>
            </button>
          </div>

          {userSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{userSuccessMessage}</span>
            </div>
          )}

          {userErrorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
              {userErrorMessage}
            </div>
          )}

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {loadingUsers ? (
              <div className="p-4 text-center text-xs text-slate-400">Carregando usuários...</div>
            ) : users.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">Nenhum usuário cadastrado.</div>
            ) : (
              users.map((u) => (
                <div key={u.id} className="p-3.5 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                      {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{u.name}</span>
                        <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                          {u.role || 'RH'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{u.email}</span>
                        <span>•</span>
                        <span>{u.department || 'Recursos Humanos'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-200 hidden sm:inline-block">
                      Senha: senha123
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingUser(u)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar usuário"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserToDelete(u)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Excluir usuário"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bloco Checklist de Documentos Padrão */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-blue-600" />
            <span>Documentos Obrigatórios da Admissão</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {['CPF', 'RG', 'Carteira de Trabalho (CTPS)', 'Comprovante de residência', 'Diploma ou Comprovante de escolaridade'].map((doc) => (
              <div key={doc} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-medium">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{doc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 px-5 rounded-xl shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Configurações</span>
          </button>
        </div>
      </form>

      {/* Modal para adicionar novo usuário */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Novo Usuário de RH</h3>
                  <p className="text-xs text-slate-500">Cadastre um novo membro para gerenciar admissões</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome Completo</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ana Beatriz Lima"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">E-mail Corporativo</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="ana.lima@empresa.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Departamento / Setor</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Recursos Humanos / Departamento Pessoal"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Perfil de Permissão</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-blue-600"
                >
                  <option value="RH">RH (Operacional & Análise)</option>
                  <option value="ADMIN">ADMIN (Administrador Completo)</option>
                  <option value="FUNCIONARIO">FUNCIONARIO (Colaborador)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:text-slate-800 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <span>Cadastrar Usuário</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Usuário */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={(updated) => {
            setUserSuccessMessage(`Usuário ${updated.name} atualizado com sucesso!`);
            fetchUsers();
            setTimeout(() => setUserSuccessMessage(null), 4000);
          }}
        />
      )}

      {/* Modal de Confirmação de Exclusão de Usuário */}
      {userToDelete && (
        <DeleteConfirmModal
          isOpen={!!userToDelete}
          title="Excluir Usuário do RH"
          description={`Tem certeza que deseja remover permanentemente o acesso do usuário "${userToDelete.name}" (${userToDelete.email})? Ele não poderá mais acessar o painel de RH.`}
          itemName={userToDelete.email}
          confirmLabel="Sim, Excluir Usuário"
          isDeleting={isDeletingUser}
          onClose={() => setUserToDelete(null)}
          onConfirm={handleDeleteUser}
        />
      )}
    </div>
  );
};
