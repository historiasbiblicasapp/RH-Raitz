import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Sparkles, 
  Mail, 
  Building2, 
  Lock, 
  Check, 
  Edit2, 
  Trash2, 
  ArrowRightLeft, 
  UserCheck, 
  AlertCircle,
  X,
  User as UserIcon,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { User } from '../types/index.ts';
import { safeFetchJson } from '../lib/api.ts';
import { EditUserModal } from '../components/EditUserModal.tsx';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal.tsx';

export const UsersManagementPage: React.FC = () => {
  const { user: currentUser, switchUser, demoLogin } = useAuth();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal para cadastrar novo usuário
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDepartment, setNewDepartment] = useState('Recursos Humanos');
  const [newRole, setNewRole] = useState<'RH' | 'ADMIN' | 'FUNCIONARIO'>('RH');
  const [newPassword, setNewPassword] = useState('senha123');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modais de edição e exclusão
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await safeFetchJson<{ users: User[] }>('/api/users');
      setUsers(data.users || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao carregar lista de usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!newName.trim() || !newEmail.trim()) {
      setErrorMessage('Nome e e-mail corporativo são obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await safeFetchJson<{ user: User; message: string }>('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          department: newDepartment.trim() || 'Recursos Humanos',
          role: newRole,
          password: newPassword
        })
      });

      setSuccessMessage(data.message || `Usuário ${newName} cadastrado com sucesso!`);
      setNewName('');
      setNewEmail('');
      setNewDepartment('Recursos Humanos');
      setNewRole('RH');
      setNewPassword('senha123');
      setShowAddModal(false);
      await fetchUsers();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao cadastrar usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setIsDeleting(true);
      await safeFetchJson(`/api/users/${userToDelete.id}`, {
        method: 'DELETE'
      });

      setSuccessMessage(`Usuário ${userToDelete.name} removido com sucesso.`);
      setUserToDelete(null);
      await fetchUsers();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao remover usuário.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSwitchAccount = (targetUser: User) => {
    switchUser(targetUser);
    setSuccessMessage(`Você agora está conectado como "${targetUser.name}" (${targetUser.email}).`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleDemoSwitch = async () => {
    try {
      await demoLogin();
      setSuccessMessage('Sessão de demonstração padrão do RH ativada com sucesso!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao ativar sessão de demonstração.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Equipe & Gestão de Acessos do RH
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Administre as contas de analistas de RH, cadastre novos membros e gerencie acessos ao sistema.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Cadastrar Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Alertas de Sucesso e Erro */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Cartão de Sessão Atual */}
      <div className="bg-gradient-to-r from-blue-50/80 via-white to-slate-50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-base flex items-center justify-center shadow-xs">
            {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'RH'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                Sua Sessão Ativa
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Conectado
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              {currentUser?.name || 'Gestão de RH'}
            </h3>
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <span>{currentUser?.email}</span>
              <span>•</span>
              <span>{currentUser?.department || 'Recursos Humanos'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:self-center">
          <button
            type="button"
            onClick={handleDemoSwitch}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer"
            title="Alternar rapidamente para a conta de demonstração padrão"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Alternar para Conta Demo</span>
          </button>
        </div>
      </div>

      {/* Lista de Contas de RH Disponíveis */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              <span>Contas de RH Disponíveis ({users.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Aqui você pode alternar de conta, editar permissões ou cadastrar novos acessos operacionais.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium self-start sm:self-auto">
            Clique em "Alternar" para assumir outro perfil
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Carregando contas de RH cadastradas...
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Nenhuma conta encontrada. Utilize o botão acima para cadastrar a primeira conta de RH.
            </div>
          ) : (
            users.map((u) => {
              const isCurrent = currentUser?.email?.toLowerCase() === u.email.toLowerCase();
              return (
                <div 
                  key={u.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isCurrent ? 'bg-blue-50/40' : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                      isCurrent 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {u.name ? u.name.slice(0, 2).toUpperCase() : 'RH'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">{u.name}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                          {u.role || 'RH'}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                            Sessão Atual
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="font-mono text-slate-600">{u.email}</span>
                        <span>•</span>
                        <span>{u.department || 'Recursos Humanos'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ações para a conta */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleSwitchAccount(u)}
                        className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                        title="Alternar e usar o sistema com esta conta"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Alternar Conta</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setEditingUser(u)}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                      title="Editar dados"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      disabled={isCurrent}
                      onClick={() => setUserToDelete(u)}
                      className={`p-2 rounded-xl transition-colors ${
                        isCurrent 
                          ? 'text-slate-300 cursor-not-allowed' 
                          : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                      }`}
                      title={isCurrent ? 'Não é possível excluir a conta atualmente em uso' : 'Excluir usuário'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bloco de Demonstração e Simulação Segura */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Modo Demonstração & Treinamento Interno
            </h3>
            <p className="text-xs text-slate-500">
              Acesso rápido para simulações e treinamento de novos analistas de RH.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          O modo de demonstração permite navegar e apresentar os fluxos de conferência de documentos e disparo de convites utilizando dados fictícios para treinamento da equipe, garantindo a integridade dos cadastros reais.
        </p>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={handleDemoSwitch}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Entrar com Conta Demo (RH Raitz)</span>
          </button>
        </div>
      </div>

      {/* Modal para Cadastrar Novo Usuário */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Novo Usuário do RH</h3>
                  <p className="text-xs text-slate-500">Crie o acesso para um novo analista ou gestor</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome Completo</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo Silveira"
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
                    placeholder="carlos@galvanizacaoraitz.com.br"
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
                    placeholder="Recursos Humanos / Gente & Gestão"
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
                  <option value="RH">RH (Operacional & Análise de Documentos)</option>
                  <option value="ADMIN">ADMIN (Administrador com Acesso Total)</option>
                  <option value="FUNCIONARIO">FUNCIONARIO (Colaborador)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Senha Inicial</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="senha123"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-blue-600"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Padrão sugerido: <strong>senha123</strong>
                </span>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:text-slate-800 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>{isSubmitting ? 'Cadastrando...' : 'Cadastrar Usuário'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={(updated) => {
            setSuccessMessage(`Usuário ${updated.name} atualizado com sucesso!`);
            fetchUsers();
            setTimeout(() => setSuccessMessage(null), 4000);
          }}
        />
      )}

      {/* Modal de Exclusão */}
      {userToDelete && (
        <DeleteConfirmModal
          isOpen={!!userToDelete}
          title="Excluir Usuário do RH"
          description={`Tem certeza que deseja remover o acesso de "${userToDelete.name}" (${userToDelete.email})? Ele perderá acesso ao painel do RH.`}
          itemName={userToDelete.email}
          confirmLabel="Sim, Excluir Usuário"
          isDeleting={isDeleting}
          onClose={() => setUserToDelete(null)}
          onConfirm={handleDeleteUser}
        />
      )}
    </div>
  );
};
