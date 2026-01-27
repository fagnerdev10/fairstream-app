-- ======================================
-- SCHEMA DO BANCO DE DADOS - FAIRSTREAM
-- ======================================
-- Execute este script no SQL Editor do Supabase

-- 1. TABELA DE PERFIS (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  avatar TEXT DEFAULT '',
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'creator', 'admin')),
  is_verified BOOLEAN DEFAULT false,
  bio TEXT DEFAULT '',
  banner TEXT DEFAULT '',
  subscribers_count INTEGER DEFAULT 0,
  pix_key TEXT DEFAULT '',
  pix_key_type TEXT DEFAULT '',
  asaas_customer_id TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA DE VÍDEOS
CREATE TABLE IF NOT EXISTS videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  video_url TEXT NOT NULL,
  duration TEXT DEFAULT '0:00',
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT true,
  is_members_only BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA DE COMENTÁRIOS
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA DE INSCRIÇÕES (seguir canais)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subscriber_id, creator_id)
);

-- 5. TABELA DE MEMBROS (assinaturas pagas)
CREATE TABLE IF NOT EXISTS memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tier TEXT DEFAULT 'basic',
  price DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  payment_method TEXT DEFAULT 'pix',
  payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, creator_id)
);

-- 6. TABELA DE PAGAMENTOS
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  to_creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('donation', 'membership', 'ad_revenue')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TABELA DE CAMPANHAS (anúncios)
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  advertiser_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'image' CHECK (type IN ('image', 'text')),
  banner_image TEXT,
  description TEXT,
  target_url TEXT NOT NULL,
  budget DECIMAL(10,2) DEFAULT 0,
  spent DECIMAL(10,2) DEFAULT 0,
  cpm DECIMAL(10,2) DEFAULT 5.00,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  location TEXT[] DEFAULT '{home}',
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. TABELA DE LIKES EM VÍDEOS
CREATE TABLE IF NOT EXISTS video_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id, user_id)
);

-- 9. TABELA DE LIKES EM COMENTÁRIOS
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- 10. TABELA DE MENSAGENS (inbox do criador)
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. TABELA DE PREFERÊNCIAS DO USUÁRIO
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  interests TEXT[] DEFAULT '{}',
  blocked_creators TEXT[] DEFAULT '{}',
  ignored_creators TEXT[] DEFAULT '{}',
  compact_mode BOOLEAN DEFAULT false,
  theme TEXT DEFAULT 'dark',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================================
-- ÍNDICES PARA PERFORMANCE
-- ======================================

CREATE INDEX IF NOT EXISTS idx_videos_creator ON videos(creator_id);
CREATE INDEX IF NOT EXISTS idx_videos_created ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_video ON comments(video_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_creator ON subscriptions(creator_id);
CREATE INDEX IF NOT EXISTS idx_memberships_creator ON memberships(creator_id);
CREATE INDEX IF NOT EXISTS idx_payments_creator ON payments(to_creator_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- ======================================
-- ROW LEVEL SECURITY (RLS)
-- ======================================

-- Ativa RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- ======================================
-- POLÍTICAS DE ACESSO
-- ======================================

-- PROFILES: Todos podem ver, só o próprio pode editar
CREATE POLICY "Profiles são visíveis para todos" ON profiles FOR SELECT USING (true);
CREATE POLICY "Usuários podem editar próprio perfil" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Usuários podem inserir próprio perfil" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- VIDEOS: Todos podem ver publicados, criador pode tudo
CREATE POLICY "Vídeos publicados são visíveis" ON videos FOR SELECT USING (is_published = true);
CREATE POLICY "Criador pode gerenciar seus vídeos" ON videos FOR ALL USING (auth.uid() = creator_id);

-- COMMENTS: Todos podem ver, usuários logados podem comentar
CREATE POLICY "Comentários são visíveis" ON comments FOR SELECT USING (true);
CREATE POLICY "Usuários podem comentar" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar próprios comentários" ON comments FOR DELETE USING (auth.uid() = user_id);

-- SUBSCRIPTIONS: Usuário pode gerenciar suas inscrições
CREATE POLICY "Ver próprias inscrições" ON subscriptions FOR SELECT USING (auth.uid() = subscriber_id OR auth.uid() = creator_id);
CREATE POLICY "Gerenciar próprias inscrições" ON subscriptions FOR ALL USING (auth.uid() = subscriber_id);

-- MEMBERSHIPS: Similar a subscriptions
CREATE POLICY "Ver próprias assinaturas" ON memberships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = creator_id);
CREATE POLICY "Gerenciar próprias assinaturas" ON memberships FOR ALL USING (auth.uid() = user_id);

-- PAYMENTS: Ver próprios pagamentos
CREATE POLICY "Ver pagamentos relacionados" ON payments FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_creator_id);
CREATE POLICY "Criar pagamentos" ON payments FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- CAMPAIGNS: Anunciante gerencia suas campanhas
CREATE POLICY "Campanhas ativas são visíveis" ON campaigns FOR SELECT USING (status = 'active');
CREATE POLICY "Anunciante gerencia campanhas" ON campaigns FOR ALL USING (auth.uid() = advertiser_id);

-- LIKES: Usuário gerencia seus likes
CREATE POLICY "Likes visíveis" ON video_likes FOR SELECT USING (true);
CREATE POLICY "Gerenciar próprios likes" ON video_likes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Comment likes visíveis" ON comment_likes FOR SELECT USING (true);
CREATE POLICY "Gerenciar próprios comment likes" ON comment_likes FOR ALL USING (auth.uid() = user_id);

-- MESSAGES: Usuário vê suas mensagens
CREATE POLICY "Ver mensagens" ON messages FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "Enviar mensagens" ON messages FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- PREFERENCES: Usuário gerencia preferências
CREATE POLICY "Ver preferências" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Gerenciar preferências" ON user_preferences FOR ALL USING (auth.uid() = user_id);

-- ======================================
-- TRIGGER PARA CRIAR PERFIL AUTOMATICAMENTE
-- ======================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cria o trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ======================================
-- FIM DO SCHEMA
-- ======================================
