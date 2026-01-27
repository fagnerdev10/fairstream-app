-- ============================================================================
-- SCRIPT DE REPARAÇÃO DEFINITIVA: PLATFORM SETTINGS
-- ============================================================================
-- Este script força a recriação da tabela se o ID estiver com tipo errado (INTEGER).
-- RODE ESTE NO SQL EDITOR DO SUPABASE.

-- 1. Remove a tabela antiga para garantir o tipo correto das colunas
DROP TABLE IF EXISTS public.platform_settings CASCADE;

-- 2. Recria a tabela com os tipos corretos (ID como TEXT)
CREATE TABLE public.platform_settings (
    id TEXT PRIMARY KEY DEFAULT 'global_settings',
    asaas_key TEXT,
    asaas_wallet_id TEXT,
    is_maintenance_mode BOOLEAN DEFAULT false,
    max_warnings INTEGER DEFAULT 3,
    allow_registrations BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Inserir registro global inicial
INSERT INTO public.platform_settings (id, is_maintenance_mode, max_warnings, allow_registrations)
VALUES ('global_settings', false, 3, true);

-- 4. Configuração de Segurança (RLS)
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin access platform_settings" ON public.platform_settings;
CREATE POLICY "Admin access platform_settings" ON public.platform_settings 
FOR ALL USING (
    auth.jwt() ->> 'email' = 'admin@fairstream.com' OR 
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.role IN ('owner', 'admin')
    )
);

-- 5. Permissões
GRANT ALL ON public.platform_settings TO anon, authenticated, postgres, service_role;

-- FIM DO SCRIPT
