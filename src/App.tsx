import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.tsx';
import { Layout } from './components/Layout.tsx';

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

// Página do Funcionário (Mobile-first)
import { EmployeePortal } from './pages/EmployeePortal.tsx';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rota Pública de Autenticação do RH */}
          <Route path="/login" element={<Login />} />

          {/* Rota do Colaborador (Convite individual e seguro) */}
          <Route path="/convite/:token" element={<EmployeePortal />} />

          {/* Rotas Autenticadas do Setor de RH */}
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admissoes" element={<AdmissionsList />} />
            <Route path="/admissoes/nova" element={<NewAdmission />} />
            <Route path="/admissoes/:id" element={<AdmissionDetails />} />
            <Route path="/documentos" element={<DocumentReviewPage />} />
            <Route path="/historico" element={<AuditLogPage />} />
            <Route path="/notificacoes" element={<NotificationsPage />} />
            <Route path="/relatorios" element={<ReportsPage />} />
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
