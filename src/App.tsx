import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.tsx';
import { Layout } from './components/Layout.tsx';

// Manipulador para restauração de rota caso haja redirecionamento de host estático (404.html)
function SpaRedirectHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    try {
      const redirectPath = sessionStorage.getItem('spa_redirect_path');
      if (redirectPath) {
        sessionStorage.removeItem('spa_redirect_path');
        navigate(redirectPath, { replace: true });
      }
    } catch {
      // ignora se sessionStorage indisponível
    }
  }, [navigate]);
  return null;
}

// Páginas de RH
import { Login } from './pages/Login.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { NewAdmission } from './pages/NewAdmission.tsx';
import { AdmissionsList } from './pages/AdmissionsList.tsx';
import { AdmissionDetails } from './pages/AdmissionDetails.tsx';
import { DocumentReviewPage } from './pages/DocumentReviewPage.tsx';
import { AuditLogPage } from './pages/AuditLogPage.tsx';
import { NotificationsPage } from './pages/NotificationsPage.tsx';
import { ReportsPage } from './pages/ReportsPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { InvitesPage } from './pages/InvitesPage.tsx';
import { UsersManagementPage } from './pages/UsersManagementPage.tsx';
import { JobPositionsPage } from './pages/JobPositionsPage.tsx';
import { DocumentTypesPage } from './pages/DocumentTypesPage.tsx';
import { JobPositionChecklistPage } from './pages/JobPositionChecklistPage.tsx';
import { PendingHubPage } from './pages/PendingHubPage.tsx';
import { CommunicationHubPage } from './pages/CommunicationHubPage.tsx';
import { PrazosPage } from './pages/PrazosPage.tsx';
import { EmployeesPage } from './pages/EmployeesPage.tsx';
import { EmployeeDetailsPage } from './pages/EmployeeDetailsPage.tsx';
import { OperationalChecklistPage } from './pages/OperationalChecklistPage.tsx';
import { ApprovalQueue } from './pages/ApprovalQueue.tsx';
import { OperationsHubPage } from './pages/OperationsHubPage.tsx';
import { AdmissionKpiPage } from './pages/AdmissionKpiPage.tsx';
import { AdmissionBottleneckPage } from './pages/AdmissionBottleneckPage.tsx';
import { WorkDistributionPage } from './pages/WorkDistributionPage.tsx';

// Página do Funcionário (Mobile-first)
import { EmployeePortal } from './pages/EmployeePortal.tsx';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SpaRedirectHandler />
        <Routes>
          {/* Rota Pública de Autenticação do RH */}
          <Route path="/login" element={<Login />} />

          {/* Rota do Colaborador (Convite individual e seguro) */}
          <Route path="/convite/:token" element={<EmployeePortal />} />

          {/* Rotas Autenticadas do Setor de RH */}
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/indicadores" element={<AdmissionKpiPage />} />
            <Route path="/kpis" element={<AdmissionKpiPage />} />
            <Route path="/admissoes/indicadores" element={<AdmissionKpiPage />} />
            <Route path="/gargalos" element={<AdmissionBottleneckPage />} />
            <Route path="/bottlenecks" element={<AdmissionBottleneckPage />} />
            <Route path="/analise-gargalos" element={<AdmissionBottleneckPage />} />
            <Route path="/admissoes/gargalos" element={<AdmissionBottleneckPage />} />
            <Route path="/operacao" element={<OperationsHubPage />} />
            <Route path="/operacoes" element={<OperationsHubPage />} />
            <Route path="/central-de-operacoes" element={<OperationsHubPage />} />
            <Route path="/distribuicao" element={<WorkDistributionPage />} />
            <Route path="/distribuicao-trabalho" element={<WorkDistributionPage />} />
            <Route path="/responsaveis" element={<WorkDistributionPage />} />
            <Route path="/gestao-responsaveis" element={<WorkDistributionPage />} />
            <Route path="/admissoes" element={<AdmissionsList />} />
            <Route path="/aprovacoes" element={<ApprovalQueue />} />
            <Route path="/admissoes/aprovacoes" element={<ApprovalQueue />} />
            <Route path="/checklist" element={<OperationalChecklistPage />} />
            <Route path="/checklist-operacional" element={<OperationalChecklistPage />} />
            <Route path="/admissoes/checklist" element={<OperationalChecklistPage />} />
            <Route path="/funcionarios" element={<EmployeesPage />} />
            <Route path="/funcionarios/:id" element={<EmployeeDetailsPage />} />
            <Route path="/colaboradores" element={<EmployeesPage />} />
            <Route path="/colaboradores/:id" element={<EmployeeDetailsPage />} />
            <Route path="/prazos" element={<PrazosPage />} />
            <Route path="/acompanhamento" element={<PrazosPage />} />
            <Route path="/pendencias" element={<PendingHubPage />} />
            <Route path="/comunicacao" element={<CommunicationHubPage />} />
            <Route path="/admissoes/nova" element={<NewAdmission />} />
            <Route path="/nova-admissao" element={<NewAdmission />} />
            <Route path="/admissoes/:id" element={<AdmissionDetails />} />
            <Route path="/convites" element={<InvitesPage />} />
            <Route path="/documentos" element={<DocumentReviewPage />} />
            <Route path="/historico" element={<AuditLogPage />} />
            <Route path="/notificacoes" element={<NotificationsPage />} />
            <Route path="/relatorios" element={<ReportsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/usuarios-rh" element={<UsersManagementPage />} />
            <Route path="/usuarios" element={<UsersManagementPage />} />
            <Route path="/cadastros/cargos" element={<JobPositionsPage />} />
            <Route path="/cargos" element={<JobPositionsPage />} />
            <Route path="/cadastros/documentos" element={<DocumentTypesPage />} />
            <Route path="/tipos-documentos" element={<DocumentTypesPage />} />
            <Route path="/cadastros/checklists" element={<JobPositionChecklistPage />} />
            <Route path="/checklists" element={<JobPositionChecklistPage />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
