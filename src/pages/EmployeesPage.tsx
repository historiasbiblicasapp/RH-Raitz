import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  UserCheck, 
  UserX, 
  ChevronRight, 
  ChevronLeft, 
  Eye, 
  Edit, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  Briefcase, 
  MapPin, 
  Mail, 
  Phone, 
  Calendar,
  X,
  RefreshCw,
  SlidersHorizontal,
  FileText,
  BadgeCheck,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { Employee, EmployeeFilters, EmployeeResponse, EmployeeStatus } from '../types/index.ts';
import { safeFetchJson } from '../lib/api.ts';
import { NewEmployeeModal } from '../components/NewEmployeeModal.tsx';

export const EmployeesPage: React.FC = () => {
  const navigate = useNavigate();

  // Estados principais de dados
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Filtros dinâmicos disponíveis
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [availableUnits, setAvailableUnits] = useState<string[]>([]);

  // Filtros selecionados
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'Ativo' | 'Inativo'>('TODOS');
  const [roleFilter, setRoleFilter] = useState('TODOS');
  const [departmentFilter, setDepartmentFilter] = useState('TODOS');
  const [unitFilter, setUnitFilter] = useState('TODOS');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Controle de UI
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [isNewEmployeeModalOpen, setIsNewEmployeeModalOpen] = useState(false);

  // Modal de Inativação / Reativação
  const [statusModalEmployee, setStatusModalEmployee] = useState<Employee | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Carrega listagem de funcionários
  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const query = new URLSearchParams();
    query.set('page', page.toString());
    query.set('limit', limit.toString());
    if (searchTerm.trim()) query.set('search', searchTerm.trim());
    if (statusFilter !== 'TODOS') query.set('status', statusFilter);
    if (roleFilter !== 'TODOS') query.set('role', roleFilter);
    if (departmentFilter !== 'TODOS') query.set('department', departmentFilter);
    if (unitFilter !== 'TODOS') query.set('unit', unitFilter);
    if (startDateFilter) query.set('startDate', startDateFilter);
    if (endDateFilter) query.set('endDate', endDateFilter);

    try {
      const res = await safeFetchJson<EmployeeResponse>(`/api/employees?${query.toString()}`);
      setEmployees(res.employees || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
      if (res.filters) {
        if (res.filters.roles?.length) setAvailableRoles(res.filters.roles);
        if (res.filters.departments?.length) setAvailableDepartments(res.filters.departments);
        if (res.filters.units?.length) setAvailableUnits(res.filters.units);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar a lista de funcionários.');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, searchTerm, statusFilter, roleFilter, departmentFilter, unitFilter, startDateFilter, endDateFilter]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('TODOS');
    setRoleFilter('TODOS');
    setDepartmentFilter('TODOS');
    setUnitFilter('TODOS');
    setStartDateFilter('');
    setEndDateFilter('');
    setPage(1);
  };

  const hasActiveFilters = 
    searchTerm.trim() !== '' || 
    statusFilter !== 'TODOS' || 
    roleFilter !== 'TODOS' || 
    departmentFilter !== 'TODOS' || 
    unitFilter !== 'TODOS' || 
    startDateFilter !== '' || 
    endDateFilter !== '';

  const handleStatusChangeSubmit = async () => {
    if (!statusModalEmployee) return;

    const newStatus: EmployeeStatus = statusModalEmployee.status === 'Ativo' ? 'Inativo' : 'Ativo';
    setIsUpdatingStatus(true);

    try {
      await safeFetchJson(`/api/employees/${statusModalEmployee.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          reason: statusReason.trim()
        })
      });

      setStatusModalEmployee(null);
      setStatusReason('');
      fetchEmployees();
    } catch (err: any) {
      alert(err.message || 'Falha ao alterar situação do funcionário.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Topo / Cabeçalho Operacional */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Funcionários</h1>
              <p className="text-sm text-slate-500 font-medium">
                Gestão cadastral centralizada de colaboradores da empresa
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => fetchEmployees()}
            title="Atualizar lista"
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsNewEmployeeModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition w-full md:w-auto"
          >
            <Plus className="w-4 h-4" />
            Novo Funcionário
          </button>
        </div>
      </div>

      {/* Barra de Busca & Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Input de Busca */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por nome, CPF, e-mail, telefone ou matrícula..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Botão de Toggle de Filtros Avançados no Mobile */}
          <button
            onClick={() => setShowFiltersMobile(!showFiltersMobile)}
            className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition md:hidden ${
              hasActiveFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros {hasActiveFilters && '(Ativos)'}
          </button>
        </div>

        {/* Linha de Filtros (Responsivo) */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-100 ${showFiltersMobile ? 'block' : 'hidden md:grid'}`}>
          {/* Filtro Situação */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Situação</label>
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="TODOS">Todas as Situações</option>
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>

          {/* Filtro Cargo */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Cargo</label>
            <select
              value={roleFilter}
              onChange={e => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none truncate"
            >
              <option value="TODOS">Todos os Cargos</option>
              {availableRoles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Filtro Setor */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Setor</label>
            <select
              value={departmentFilter}
              onChange={e => {
                setDepartmentFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none truncate"
            >
              <option value="TODOS">Todos os Setores</option>
              {availableDepartments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Filtro Unidade */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Unidade</label>
            <select
              value={unitFilter}
              onChange={e => {
                setUnitFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none truncate"
            >
              <option value="TODOS">Todas as Unidades</option>
              {availableUnits.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Botão de Limpar */}
          <div className="flex items-end">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Funcionários / Cards Mobile */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">Carregando quadro de funcionários...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-rose-700 mb-2">{error}</p>
            <button
              onClick={() => fetchEmployees()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
            >
              Tentar Novamente
            </button>
          </div>
        ) : employees.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Nenhum funcionário encontrado</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
              {hasActiveFilters 
                ? 'Nenhum registro corresponde aos filtros ou termo de busca informados.' 
                : 'Ainda não há funcionários cadastrados na base administrativa.'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Limpar Filtros
              </button>
            ) : (
              <button
                onClick={() => setIsNewEmployeeModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Primeiro Funcionário
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Visão Tabela Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Funcionário</th>
                    <th className="py-3.5 px-4">CPF (LGPD)</th>
                    <th className="py-3.5 px-4">Cargo / Setor</th>
                    <th className="py-3.5 px-4">Unidade</th>
                    <th className="py-3.5 px-4">Contato</th>
                    <th className="py-3.5 px-4">Situação</th>
                    <th className="py-3.5 px-4">Início / Admissão</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {employees.map(emp => {
                    const isAtivo = emp.status === 'Ativo';
                    const initials = emp.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

                    return (
                      <tr 
                        key={emp.id}
                        className="hover:bg-slate-50/70 transition group"
                      >
                        {/* Nome & Matrícula */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                              {initials}
                            </div>
                            <div>
                              <span 
                                onClick={() => navigate(`/funcionarios/${emp.id}`)}
                                className="font-semibold text-slate-800 hover:text-blue-600 cursor-pointer transition block"
                              >
                                {emp.name}
                              </span>
                              {emp.registrationNumber && (
                                <span className="text-xs text-slate-400 font-mono">
                                  Matrícula: {emp.registrationNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* CPF Mascarado */}
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                          {emp.cpfMasked || '***.***.***-**'}
                        </td>

                        {/* Cargo & Setor */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-800">{emp.role}</div>
                          <div className="text-xs text-slate-400">{emp.department}</div>
                        </td>

                        {/* Unidade */}
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {emp.unit}
                        </td>

                        {/* Contato */}
                        <td className="py-3.5 px-4">
                          <div className="text-xs text-slate-700">{emp.phone}</div>
                          <div className="text-xs text-slate-400 truncate max-w-[150px]">{emp.email}</div>
                        </td>

                        {/* Situação (Badge) */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isAtivo 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isAtivo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {emp.status || (emp.active ? 'Ativo' : 'Inativo')}
                          </span>
                        </td>

                        {/* Data Início */}
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {emp.admissionDate || emp.expectedStartDate || '-'}
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => navigate(`/funcionarios/${emp.id}`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition"
                              title="Ver ficha cadastral"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Ver Ficha
                            </button>

                            <button
                              onClick={() => setStatusModalEmployee(emp)}
                              className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                                isAtivo 
                                  ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50' 
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={isAtivo ? 'Inativar funcionário' : 'Reativar funcionário'}
                            >
                              {isAtivo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Visão Cards Mobile */}
            <div className="block lg:hidden divide-y divide-slate-100">
              {employees.map(emp => {
                const isAtivo = emp.status === 'Ativo';
                const initials = emp.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

                return (
                  <div key={emp.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                          {initials}
                        </div>
                        <div>
                          <h4 
                            onClick={() => navigate(`/funcionarios/${emp.id}`)}
                            className="font-bold text-slate-800 text-sm cursor-pointer hover:text-blue-600"
                          >
                            {emp.name}
                          </h4>
                          <span className="text-xs text-slate-400 font-mono">
                            CPF: {emp.cpfMasked || '***.***.***-**'}
                          </span>
                        </div>
                      </div>

                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        isAtivo 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {emp.status || (emp.active ? 'Ativo' : 'Inativo')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-700 block">Cargo:</span>
                        {emp.role} ({emp.department})
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700 block">Unidade:</span>
                        {emp.unit}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700 block">Telefone:</span>
                        {emp.phone}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700 block">Admissão:</span>
                        {emp.admissionDate || emp.expectedStartDate || '-'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => setStatusModalEmployee(emp)}
                        className={`text-xs font-semibold ${
                          isAtivo ? 'text-rose-600 hover:text-rose-700' : 'text-emerald-600 hover:text-emerald-700'
                        }`}
                      >
                        {isAtivo ? 'Inativar Funcionário' : 'Reativar Funcionário'}
                      </button>

                      <button
                        onClick={() => navigate(`/funcionarios/${emp.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
                      >
                        Ver Ficha Completa
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginação */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 font-medium">
                Mostrando <span className="font-semibold text-slate-700">{Math.min(total, (page - 1) * limit + 1)}</span> a{' '}
                <span className="font-semibold text-slate-700">{Math.min(total, page * limit)}</span> de{' '}
                <span className="font-semibold text-slate-700">{total}</span> colaboradores
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 mr-2">
                  <span className="text-xs text-slate-500">Por página:</span>
                  <select
                    value={limit}
                    onChange={e => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs text-slate-600 px-2 font-medium">
                  {page} de {totalPages}
                </span>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Próxima página"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de Novo Funcionário */}
      <NewEmployeeModal
        isOpen={isNewEmployeeModalOpen}
        onClose={() => setIsNewEmployeeModalOpen(false)}
        onSuccess={newEmp => {
          fetchEmployees();
          navigate(`/funcionarios/${newEmp.id}`);
        }}
        onOpenExisting={existingId => {
          navigate(`/funcionarios/${existingId}`);
        }}
      />

      {/* Modal de Confirmação de Alteração de Situação (Inativar / Reativar) */}
      {statusModalEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl ${
                statusModalEmployee.status === 'Ativo' 
                  ? 'bg-rose-100 text-rose-700' 
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {statusModalEmployee.status === 'Ativo' ? (
                  <UserX className="w-6 h-6" />
                ) : (
                  <UserCheck className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-800">
                  {statusModalEmployee.status === 'Ativo' ? 'Inativar Funcionário' : 'Reativar Funcionário'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Colaborador: <span className="font-semibold text-slate-700">{statusModalEmployee.name}</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {statusModalEmployee.status === 'Ativo' ? (
                'Ao inativar este colaborador, o registro cadastral será preservado para fins legais, mas o mesmo constará como Inativo em pesquisas e operações ativas. Admissões antigas e documentos permanecerão intactos.'
              ) : (
                'Ao reativar este colaborador, sua situação voltará a constar como Ativo no quadro da empresa.'
              )}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motivo da alteração (Registrado em Auditoria)
              </label>
              <textarea
                rows={2}
                placeholder={statusModalEmployee.status === 'Ativo' ? 'Ex: Desligamento formal, licença prolongada...' : 'Ex: Retorno às atividades, recontratação...'}
                value={statusReason}
                onChange={e => setStatusReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStatusModalEmployee(null)}
                disabled={isUpdatingStatus}
                className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleStatusChangeSubmit}
                disabled={isUpdatingStatus}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50 ${
                  statusModalEmployee.status === 'Ativo' 
                    ? 'bg-rose-600 hover:bg-rose-700' 
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isUpdatingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {statusModalEmployee.status === 'Ativo' ? 'Confirmar Inativação' : 'Confirmar Reativação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
