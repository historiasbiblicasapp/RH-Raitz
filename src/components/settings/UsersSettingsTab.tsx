import React, { useState } from 'react';
import { Users, UserPlus, User, Mail, Building2, Edit2, Trash2, Check, X } from 'lucide-react';
import { User as UserType } from '../../types/index.ts';
import { EditUserModal } from '../EditUserModal.tsx';
import { DeleteConfirmModal } from '../DeleteConfirmModal.tsx';

interface UsersSettingsTabProps {
  users: UserType[];
  loadingUsers: boolean;
  onRefreshUsers: () => void;
}

export const UsersSettingsTab: React.FC<UsersSettingsTabProps> = ({
  users,
  loadingUsers,
  onRefreshUsers
}) => {
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
          role: newRole
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
      onRefreshUsers();
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
      onRefreshUsers();
      setTimeout(() => setUserSuccessMessage(null), 4000);
    } catch (err: any) {
      setUserErrorMessage(err.message || 'Falha ao remover usuário.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bloco Gestão de Usuários do RH */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Equipe e Usuários de Acesso ao RH</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Gerencie os operadores com permissão para visualizar e homologar admissões.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddUserModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors cursor-pointer w-fit shadow-xs"
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
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Editar usuário"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserToDelete(u)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
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
                  className="px-3.5 py-2 text-slate-600 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
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
            onRefreshUsers();
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
