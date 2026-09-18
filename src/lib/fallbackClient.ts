// Client-side Fallback Data Handler para deploys estáticos (como Vercel SPA) ou quando a API estiver inacessível.
import { initialDbData } from '../data/initialDb.ts';
import { Admission, DashboardStats, JobPosition, DocumentTypeItem, SystemSettings } from '../types/index.ts';

const LOCAL_STORAGE_KEY = 'admissao_digital_local_db_v1';

function getLocalData(): any {
  if (typeof window === 'undefined') {
    return initialDbData;
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.admissions?.length) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[FallbackDB] Falha ao ler localStorage:', e);
  }
  // Inicializa localStorage com o snapshot completo de 25 admissões
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialDbData));
  } catch {}
  return initialDbData;
}

function saveLocalData(data: any) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[FallbackDB] Falha ao salvar localStorage:', e);
  }
}

export function computeStats(options?: {
  period?: string;
  role?: string;
  department?: string;
  unit?: string;
  status?: string;
}): DashboardStats {
  const db = getLocalData();
  let allAdmissions: Admission[] = [...(db.admissions || [])];

  if (options?.role && options.role !== 'TODOS' && options.role !== 'Todos') {
    allAdmissions = allAdmissions.filter(a => a.employee?.role === options.role);
  }
  if (options?.department && options.department !== 'TODOS' && options.department !== 'Todos') {
    allAdmissions = allAdmissions.filter(a => a.employee?.department === options.department);
  }
  if (options?.unit && options.unit !== 'TODOS' && options.unit !== 'Todos') {
    allAdmissions = allAdmissions.filter(a => a.employee?.unit === options.unit);
  }

  const now = new Date();
  const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();

  const waitingDocuments = allAdmissions.filter(a => a.status === 'Aguardando documentos').length;
  const waitingReview = allAdmissions.filter(a => a.status === 'Em conferência').length;
  const pendingIssues = allAdmissions.filter(a => a.status === 'Pendência').length;
  const completed = allAdmissions.filter(a => a.status === 'Concluída').length;
  const cancelled = allAdmissions.filter(a => a.status === 'Cancelada').length;
  const totalActive = allAdmissions.filter(a => a.status !== 'Cancelada').length;

  const upcoming = allAdmissions.filter(a => {
    if (a.status === 'Concluída' || a.status === 'Cancelada') return false;
    if (!a.employee?.expectedStartDate) return false;
    const expectedTime = new Date(a.employee.expectedStartDate + 'T23:59:59').getTime();
    return expectedTime >= todayZero;
  }).length;

  return {
    newAdmissions: allAdmissions.length,
    waitingDocuments,
    waitingReview,
    pendingIssues,
    completed,
    totalActive,
    cancelled,
    upcoming
  };
}

export function handleFallbackApiRoute(urlStr: string, options?: RequestInit): any | undefined {
  const urlObj = new URL(urlStr, 'http://localhost');
  const path = urlObj.pathname;
  const db = getLocalData();
  const method = (options?.method || 'GET').toUpperCase();

  // 1. Dashboard Stats
  if (path === '/api/dashboard/stats' || path === '/dashboard/stats') {
    const period = urlObj.searchParams.get('period') || undefined;
    const role = urlObj.searchParams.get('role') || undefined;
    const department = urlObj.searchParams.get('department') || undefined;
    const unit = urlObj.searchParams.get('unit') || undefined;
    const status = urlObj.searchParams.get('status') || undefined;
    return computeStats({ period, role, department, unit, status });
  }

  // 2. Admissions List
  if (path === '/api/admissions' || path === '/admissions') {
    if (method === 'GET') {
      let list: Admission[] = [...(db.admissions || [])];
      const status = urlObj.searchParams.get('status');
      const role = urlObj.searchParams.get('role');
      const department = urlObj.searchParams.get('department');
      const unit = urlObj.searchParams.get('unit');
      const search = (urlObj.searchParams.get('search') || '').toLowerCase().trim();

      if (status && status !== 'TODOS') list = list.filter(a => a.status === status);
      if (role && role !== 'TODOS') list = list.filter(a => a.employee?.role === role);
      if (department && department !== 'TODOS') list = list.filter(a => a.employee?.department === department);
      if (unit && unit !== 'TODOS') list = list.filter(a => a.employee?.unit === unit);

      if (search) {
        list = list.filter(a => 
          a.employee?.name.toLowerCase().includes(search) ||
          a.employee?.cpf?.includes(search) ||
          a.employee?.role?.toLowerCase().includes(search)
        );
      }

      const roles = Array.from(new Set(db.admissions.map((a: any) => a.employee?.role).filter(Boolean)));
      const departments = Array.from(new Set(db.admissions.map((a: any) => a.employee?.department).filter(Boolean)));
      const units = Array.from(new Set(db.admissions.map((a: any) => a.employee?.unit).filter(Boolean)));

      return {
        admissions: list,
        total: list.length,
        filters: { roles, departments, units }
      };
    }
  }

  // 3. Single Admission by ID
  const admMatch = path.match(/^\/api\/admissions\/([^/]+)$/);
  if (admMatch) {
    const id = admMatch[1];
    const item = (db.admissions || []).find((a: any) => a.id === id);
    if (item) return { admission: item };
    return { admission: db.admissions?.[0] };
  }

  // 4. Job Positions
  if (path.includes('/job-positions') || path.includes('/cargos')) {
    return { jobPositions: db.jobPositions || [] };
  }

  // 5. Document Types
  if (path.includes('/document-types') || path.includes('/tipos-documentos')) {
    return { documentTypes: db.documentTypes || [] };
  }

  // 6. Checklists por Cargo
  if (path.includes('/job-position-documents') || path.includes('/cargos-documentos')) {
    return { documents: db.jobPositionDocuments || [] };
  }

  // 7. Central de Pendências
  if (path.includes('/pendencias')) {
    const pendingAdmissions = (db.admissions || []).filter((a: any) => a.status === 'Pendência');
    const items = pendingAdmissions.map((a: any) => {
      const rejectedDoc = (a.documents || []).find((d: any) => d.status === 'Rejeitado');
      return {
        id: 'pend-' + a.id,
        admissionId: a.id,
        employeeName: a.employee?.name,
        employeeCpf: a.employee?.cpf,
        role: a.employee?.role,
        department: a.employee?.department,
        status: a.status,
        documentName: rejectedDoc?.name || 'Documento com Pendência',
        rejectionReason: rejectedDoc?.rejectionReason || 'Documento ilegível ou incorreto',
        createdAt: a.updatedAt || a.createdAt
      };
    });
    return {
      items,
      summary: {
        total: items.length,
        alta: items.length,
        media: 0,
        baixa: 0
      }
    };
  }

  // 8. Prazos & Acompanhamento
  if (path.includes('/tracking') || path.includes('/prazos')) {
    const items = (db.admissions || []).map((a: any) => ({
      id: a.id,
      employeeName: a.employee?.name,
      employeeCpf: a.employee?.cpf,
      role: a.employee?.role,
      department: a.employee?.department,
      status: a.status,
      expectedStartDate: a.employee?.expectedStartDate,
      daysUntilStart: a.employee?.expectedStartDate ? 5 : null,
      situation: a.status === 'Pendência' ? 'Atenção' : (a.status === 'Concluída' ? 'Concluído' : 'No Prazo')
    }));

    return {
      items,
      summary: {
        total: items.length,
        upcomingCount: 15,
        attentionCount: 1,
        overdueCount: 0
      }
    };
  }

  // 9. Comunicação Hub
  if (path.includes('/communication') || path.includes('/comunicacao')) {
    return {
      items: db.communicationLogs || [],
      templates: db.settings?.communicationTemplates || [],
      summary: {
        totalSent: (db.communicationLogs || []).length,
        whatsappSent: (db.communicationLogs || []).length,
        emailSent: 0
      }
    };
  }

  // 10. Relatórios
  if (path.includes('/reports')) {
    return {
      indicators: {
        totalAdmissions: db.admissions?.length || 25,
        completedAdmissions: 9,
        pendingAdmissions: 1,
        inProgressAdmissions: 15,
        averageDaysToComplete: 3.5
      },
      admissions: db.admissions || [],
      charts: {
        byStatus: [
          { name: 'Aguardando documentos', count: 11 },
          { name: 'Concluída', count: 9 },
          { name: 'Em conferência', count: 4 },
          { name: 'Pendência', count: 1 }
        ]
      }
    };
  }

  // 11. Configurações
  if (path.includes('/settings') || path.includes('/configuracoes')) {
    return { settings: db.settings };
  }

  // 12. Notificações
  if (path.includes('/notifications') || path.includes('/notificacoes')) {
    return { notifications: db.notifications || [] };
  }

  // 13. Auditoria / Histórico
  if (path.includes('/audit-logs') || path.includes('/historico')) {
    return { logs: db.auditLogs || [] };
  }

  // 14. Usuários
  if (path.includes('/users') || path.includes('/usuarios')) {
    return { users: db.users || [] };
  }

  // 15. Convite do Candidato (/api/invite/:token)
  const inviteMatch = path.match(/^\/api\/invite\/([^/]+)$/);
  if (inviteMatch) {
    const token = inviteMatch[1];
    const match = (db.admissions || []).find((a: any) => a.inviteToken === token);
    if (match) return match;
    // Fallback: primeira admissão aguardando documentos
    return (db.admissions || []).find((a: any) => a.status === 'Aguardando documentos') || db.admissions?.[0];
  }

  return undefined;
}
