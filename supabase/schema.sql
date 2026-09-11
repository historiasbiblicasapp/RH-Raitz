-- =========================================================
-- PROJETO: ADMISSÃO DIGITAL
-- Esquema Inicial de Banco de Dados PostgreSQL / Supabase
-- Com Row Level Security (RLS) e Políticas de Privacidade LGPD
-- =========================================================

-- Habilita extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE USUÁRIOS DO SISTEMA (Perfis RH e Administradores)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'RH' CHECK (role IN ('RH', 'ADMIN', 'GESTOR')),
    department VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. TABELA DE FUNCIONÁRIOS (Dados Pessoais e Cadastrais)
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    birth_date DATE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    unit VARCHAR(100) NOT NULL,
    expected_start_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. TABELA DE TIPOS DE DOCUMENTOS PERMITIDOS
CREATE TABLE IF NOT EXISTS public.document_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Inserção dos 5 documentos iniciais obrigatórios
INSERT INTO public.document_types (code, name, description, required) VALUES
('CPF', 'CPF', 'Cadastro de Pessoa Física regularizado', true),
('RG', 'RG', 'Documento de Identidade com foto recente e legível', true),
('CTPS', 'Carteira de Trabalho', 'CTPS física ou espelho da Carteira Digital', true),
('COMP_RESIDENCIA', 'Comprovante de residência', 'Emitido nos últimos 90 dias', true),
('DIPLOMA', 'Diploma/Certificado', 'Comprovante de escolaridade ou graduação exigida', true)
ON CONFLICT (code) DO NOTHING;

-- 3.1 TABELA DE CARGOS (Job Positions - Bloco 3.1)
CREATE TABLE IF NOT EXISTS public.job_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

-- Índices para pesquisa e verificação de duplicidade
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_positions_name_lower_active 
    ON public.job_positions (LOWER(TRIM(name))) WHERE active = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_positions_code_lower_active 
    ON public.job_positions (LOWER(TRIM(code))) WHERE active = TRUE AND code IS NOT NULL AND code <> '';

-- Inserção dos cargos iniciais do sistema
INSERT INTO public.job_positions (name, code, description, active) VALUES
('Auxiliar Administrativo', 'ADM-001', 'Rotinas de suporte administrativo e atendimento', true),
('Analista de TI', 'TI-001', 'Responsável por suporte, infraestrutura e sistemas de TI', true),
('Técnico de Segurança do Trabalho', 'SEG-001', 'Inspeções, laudos e conformidade com normas regulamentadoras', true),
('Eletricista', 'MAN-001', 'Manutenção e instalação de redes elétricas industriais', true),
('Mecânico', 'MAN-002', 'Manutenção preventiva e corretiva de máquinas e equipamentos', true),
('Operador de Produção', 'PROD-001', 'Operação de maquinário e linhas de produção industrial', true),
('Motorista', 'LOG-001', 'Transporte e entregas operacionais', true),
('Assistente Administrativo', 'ADM-002', 'Lançamentos, controle de documentos e suporte ao setor', true)
ON CONFLICT DO NOTHING;

-- 4. TABELA DE ADMISSÕES
CREATE TABLE IF NOT EXISTS public.admissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'Aguardando documentos' 
        CHECK (status IN ('Rascunho', 'Aguardando documentos', 'Em conferência', 'Pendência', 'Concluída', 'Cancelada')),
    invite_token VARCHAR(128) NOT NULL UNIQUE,
    invite_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    invite_sent_via_whatsapp BOOLEAN DEFAULT FALSE,
    invite_sent_at TIMESTAMP WITH TIME ZONE,
    consent_given BOOLEAN DEFAULT FALSE,
    consent_date TIMESTAMP WITH TIME ZONE,
    consent_text_version VARCHAR(20),
    data_confirmed BOOLEAN DEFAULT FALSE,
    data_confirmed_at TIMESTAMP WITH TIME ZONE,
    correction_requested BOOLEAN DEFAULT FALSE,
    correction_details TEXT,
    correction_requested_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. TABELA DE DOCUMENTOS DA ADMISSÃO
CREATE TABLE IF NOT EXISTS public.admission_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admission_id UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    required BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) NOT NULL DEFAULT 'Não enviado'
        CHECK (status IN ('Não enviado', 'Enviado', 'Em análise', 'Aprovado', 'Rejeitado', 'Reenviado')),
    current_version INT DEFAULT 0,
    file_name VARCHAR(255),
    file_size BIGINT,
    mime_type VARCHAR(100),
    storage_path TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(255),
    rejection_reason VARCHAR(255),
    rejection_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. TABELA DE VERSÕES DE DOCUMENTOS (Histórico completo)
CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admission_document_id UUID NOT NULL REFERENCES public.admission_documents(id) ON DELETE CASCADE,
    version INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_path TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    status VARCHAR(50) NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(255),
    rejection_reason VARCHAR(255),
    rejection_notes TEXT
);

-- 7. TABELA DE REGISTROS DE CONSENTIMENTO LGPD
CREATE TABLE IF NOT EXISTS public.consent_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admission_id UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_cpf VARCHAR(14) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    term_version VARCHAR(20) NOT NULL,
    term_summary TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- 8. TABELA DE AUDITORIA (Trilha de Auditoria LGPD e Operacional)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    user_id UUID,
    user_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    admission_id UUID REFERENCES public.admissions(id) ON DELETE SET NULL,
    employee_name VARCHAR(255),
    document_type VARCHAR(100),
    details TEXT NOT NULL,
    ip_address VARCHAR(45)
);

-- 9. TABELA DE NOTIFICAÇÕES INTERNAS DO RH
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    admission_id UUID REFERENCES public.admissions(id) ON DELETE CASCADE,
    read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255)
);

-- =========================================================
-- CONFIGURAÇÃO DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- =========================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_positions ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários autenticados (Equipe de RH)
CREATE POLICY "RH e Administradores podem visualizar cargos"
    ON public.job_positions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Apenas usuários autorizados de RH/ADMIN podem cadastrar cargos"
    ON public.job_positions FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('ADMIN', 'RH', 'GESTOR')
        )
    );

CREATE POLICY "Apenas usuários autorizados de RH/ADMIN podem alterar ou desativar cargos"
    ON public.job_positions FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('ADMIN', 'RH', 'GESTOR')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('ADMIN', 'RH', 'GESTOR')
        )
    );

-- Políticas para usuários autenticados (Equipe de RH)
CREATE POLICY "RH pode visualizar todos os usuários do sistema"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "RH pode gerenciar dados de funcionários"
    ON public.employees FOR ALL
    TO authenticated
    USING (true);

CREATE POLICY "RH pode gerenciar todas as admissões"
    ON public.admissions FOR ALL
    TO authenticated
    USING (true);

CREATE POLICY "RH pode gerenciar documentos de admissões"
    ON public.admission_documents FOR ALL
    TO authenticated
    USING (true);

CREATE POLICY "RH pode consultar histórico de versões"
    ON public.document_versions FOR ALL
    TO authenticated
    USING (true);

CREATE POLICY "RH pode consultar notificações"
    ON public.notifications FOR ALL
    TO authenticated
    USING (true);

CREATE POLICY "Auditoria pode ser visualizada por RH e gravada pelo sistema"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (true);

-- =========================================================
-- BUCKET DE STORAGE PRIVADO NO SUPABASE
-- =========================================================
-- O bucket 'admission-documents' deve ser criado como PRIVADO (public = false).
-- Inserção na tabela storage.buckets:
INSERT INTO storage.buckets (id, name, public) 
VALUES ('admission-documents', 'admission-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Política de Storage: Apenas usuários autenticados do RH ou requisições autorizadas via backend
-- têm acesso aos arquivos. URLs temporárias assinadas (Signed URLs) são utilizadas para visualização.
