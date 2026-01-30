// ======================================
// CONFIGURAÇÃO DO SUPABASE
// ======================================
// Cliente para autenticação e banco de dados

import { createClient } from '@supabase/supabase-js';

// Credenciais do Supabase (Carregadas de variáveis de ambiente)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Cria o cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

// --- ESCUDO V9: DETECTOR DE FALHAS DE INFRAESTRUTURA ---


// ======================================
// TIPOS DAS TABELAS
// ======================================

export interface DbUser {
    id: string;
    email: string;
    name: string;
    avatar: string;
    role: 'viewer' | 'creator' | 'owner' | 'admin';
    is_verified: boolean;
    created_at: string;
    updated_at: string;
    // Dados do criador (se aplicável)
    bio?: string;
    banner?: string;
    subscribers_count?: number;
    pix_key?: string;
    pix_key_type?: string;
    social_links?: any;
    phone?: string;
    cpf?: string;
    membership_price?: number;
    asaas_wallet_id?: string;
    channel_message?: string;
}

export interface DbVideo {
    id: string;
    creator_id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    thumbnail_source?: string;
    video_url: string;
    duration: string;
    views: number;
    likes: number;
    tags: string[];
    is_published: boolean;
    is_members_only: boolean;
    created_at: string;
    updated_at: string;
}

export interface DbComment {
    id: string;
    video_id: string;
    user_id: string;
    content: string;
    likes: number;
    is_pinned: boolean;
    parent_id?: string;
    created_at: string;
}

export interface DbSubscription {
    id: string;
    subscriber_id: string;
    creator_id: string;
    created_at: string;
}

export interface DbMembership {
    id: string;
    user_id: string;
    creator_id: string;
    tier: string;
    price: number;
    status: 'active' | 'cancelled' | 'expired';
    payment_method: string;
    created_at: string;
    expires_at: string;
}

export interface DbPayment {
    id: string;
    from_user_id: string;
    to_creator_id: string;
    amount: number;
    type: 'donation' | 'membership' | 'ad_revenue';
    status: 'pending' | 'completed' | 'failed';
    payment_id?: string;
    created_at: string;
}

export interface DbCampaign {
    id: string;
    advertiser_id: string;
    title: string;
    type: 'image' | 'text';
    banner_image?: string;
    description?: string;
    target_url: string;
    budget: number;
    spent: number;
    cpm: number;
    status: 'active' | 'paused' | 'completed';
    location: string[];
    impressions: number;
    clicks: number;
    created_at: string;
}

// ======================================
// HELPERS
// ======================================

// Verifica se o usuário está logado
export const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

// Verifica a sessão atual
export const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
};

// Logout
export const signOut = async () => {
    await supabase.auth.signOut();
};

console.log('✅ Supabase configurado:', supabaseUrl);

// Utilitário para verificar erros do Supabase
export const isSupabaseIssue = (error: any): boolean => {
    return !!error?.code || !!error?.message;
};
