-- === SUPABASE FIX PAYMENTS (V24.1) ===
-- ADICIONA CAMPOS PARA APOIOS PIX E DOAÇÕES NO BANCO DE DADOS

-- 1. Adiciona colunas para identificar apoiadores anônimos ou com mensagens
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS supporter_name TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS supporter_avatar TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'pix';

-- 2. Garante que os tipos de pagamento permitam doação
DO $$
BEGIN
    ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_type_check;
    ALTER TABLE public.payments ADD CONSTRAINT payments_type_check CHECK (type IN ('donation', 'membership', 'ad_revenue', 'referral', 'payout'));
EXCEPTION
    WHEN undefined_table THEN
        NULL;
END $$;

-- 3. Atualiza comentários para limpar cache (Sintaxe Corrigida)
DO $$
BEGIN
    EXECUTE format('COMMENT ON TABLE public.payments IS %L', 'Payments V24.1 - Suporte a Apoio Pix ' || now());
END $$;

-- 4. Permissões
GRANT ALL ON public.payments TO anon, authenticated, postgres, service_role;
