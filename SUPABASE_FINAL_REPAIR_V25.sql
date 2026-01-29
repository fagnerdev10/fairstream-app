-- ============================================================================
-- SCRIPT DE REPARAÇÃO FINAL (V25) - CORREÇÃO ERRO 406 E SINCRONIA
-- ============================================================================
-- RODE ESTE SCRIPT NO SQL EDITOR DO SUPABASE PARA RESOLVER O ERRO 406.

-- 1. Reparação da Tabela platform_settings (Fim do Erro 406)
-- Removemos e recriamos para garantir que o ID seja TEXT e não INTEGER.
DROP TABLE IF EXISTS public.platform_settings CASCADE;

CREATE TABLE public.platform_settings (
    id TEXT PRIMARY KEY DEFAULT 'global_settings',
    asaas_key TEXT,
    asaas_wallet_id TEXT,
    is_maintenance_mode BOOLEAN DEFAULT false,
    max_warnings INTEGER DEFAULT 3,
    allow_registrations BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Inserir o registro que o sistema procura
INSERT INTO public.platform_settings (id, is_maintenance_mode, max_warnings, allow_registrations)
VALUES ('global_settings', false, 3, true);

-- 2. Garantir que a tabela videos aceite UUIDs e Metadados
-- Adiciona a coluna is_seed se não existir
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS is_seed BOOLEAN DEFAULT false;

-- 3. Função de Incremento de Views (RPC)
-- Garante que o contador de views funcione no Supabase
CREATE OR REPLACE FUNCTION public.increment_video_views(video_id_input TEXT)
RETURNS void AS $$
BEGIN
    UPDATE public.videos
    SET views = COALESCE(views, 0) + 1
    WHERE id = video_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Configuração de RLS (Segurança)
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso público leitura settings" ON public.platform_settings;
CREATE POLICY "Acesso público leitura settings" ON public.platform_settings 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin full access settings" ON public.platform_settings;
CREATE POLICY "Admin full access settings" ON public.platform_settings 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.role IN ('owner', 'admin')
    )
);

-- 5. Permissões Globais
GRANT ALL ON public.platform_settings TO anon, authenticated, postgres, service_role;
GRANT ALL ON public.videos TO anon, authenticated, postgres, service_role;

-- FIM DO SCRIPT DE REPARAÇÃO V25
