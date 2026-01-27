
// ======================================
// SERVIÇO DE RECOMENDAÇÃO PERSONALIZADA
// ======================================
// Aprende os interesses do usuário e recomenda vídeos relevantes
// SALVA NO SUPABASE para persistir entre dispositivos

import { Video } from '../types';
import { supabase } from './supabaseClient';

interface InterestProfile {
    // Mapa de palavras-chave → peso (quanto maior, mais interesse)
    keywords: Record<string, number>;
    // Criadores favoritos (inscrições + muitas visualizações)
    favoriteCreators: string[];
    // Tags que mais apareceram
    favoriteTags: string[];
    // Interesses escritos manualmente pelo usuário
    manualInterests: string[];
    // Última atualização
    lastUpdated: string;
}

const STORAGE_KEY = 'fairstream_user_interests';

// Cache local para evitar chamadas excessivas ao Supabase
let cachedProfile: InterestProfile | null = null;
let lastFetch: number = 0;
const CACHE_TTL = 60000; // 1 minuto

// Palavras comuns para ignorar (stop words)
const STOP_WORDS = new Set([
    'a', 'o', 'as', 'os', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das',
    'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem', 'que',
    'se', 'e', 'ou', 'mas', 'como', 'quando', 'onde', 'porque', 'pra',
    'pro', 'foi', 'era', 'vai', 'vou', 'ele', 'ela', 'eles', 'você',
    'não', 'sim', 'muito', 'mais', 'menos', 'ter', 'fazer', 'estar',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'of', 'and', 'in'
]);

const getDefaultProfile = (): InterestProfile => ({
    keywords: {},
    favoriteCreators: [],
    favoriteTags: [],
    manualInterests: [],
    lastUpdated: new Date().toISOString()
});

export const recommendationService = {

    // ========== PERFIL DO USUÁRIO ==========

    // Obtém o ID do usuário atual (logado ou anônimo)
    getCurrentUserId(): string | null {
        try {
            const storedUser = localStorage.getItem('fairstream_user');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                return user?.id || null;
            }
        } catch (e) {
            console.error('Erro ao obter usuário:', e);
        }
        return null;
    },

    // Carrega perfil do localStorage (fallback/cache)
    getProfileFromLocal(): InterestProfile {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Erro ao carregar perfil local:', e);
        }
        return getDefaultProfile();
    },

    // Carrega perfil do Supabase (para usuários logados)
    async getProfileFromSupabase(userId: string): Promise<InterestProfile | null> {
        try {
            const { data, error } = await supabase
                .from('user_interests')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error || !data) return null;

            return {
                keywords: data.keywords || {},
                favoriteCreators: data.favorite_creators || [],
                favoriteTags: data.favorite_tags || [],
                manualInterests: data.manual_interests || [],
                lastUpdated: data.updated_at || new Date().toISOString()
            };
        } catch (e) {
            console.error('Erro ao carregar perfil do Supabase:', e);
            return null;
        }
    },

    // Obtém perfil (prioriza Supabase para logados, senão localStorage)
    getProfile(): InterestProfile {
        // Usa cache se ainda válido
        if (cachedProfile && (Date.now() - lastFetch < CACHE_TTL)) {
            return cachedProfile;
        }

        // Carrega do localStorage imediatamente
        const localProfile = this.getProfileFromLocal();
        cachedProfile = localProfile;
        lastFetch = Date.now();

        // Tenta carregar do Supabase em background (para usuários logados)
        const userId = this.getCurrentUserId();
        if (userId) {
            this.getProfileFromSupabase(userId).then(supabaseProfile => {
                if (supabaseProfile) {
                    // Supabase é mais recente? Usa ele
                    if (supabaseProfile.lastUpdated > localProfile.lastUpdated) {
                        cachedProfile = supabaseProfile;
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(supabaseProfile));
                        console.log('[Recommendation] Perfil sincronizado do Supabase');
                    }
                }
            });
        }

        return localProfile;
    },

    // Salva perfil (localStorage + Supabase se logado)
    saveProfile(profile: InterestProfile): void {
        profile.lastUpdated = new Date().toISOString();

        // Salva no localStorage (sempre)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        cachedProfile = profile;
        lastFetch = Date.now();

        // Salva no Supabase (se logado)
        const userId = this.getCurrentUserId();
        if (userId) {
            this.saveProfileToSupabase(userId, profile);
        }

        // Dispara evento para atualizar a Home
        window.dispatchEvent(new CustomEvent('interests-updated'));
    },

    // Salva perfil no Supabase
    async saveProfileToSupabase(userId: string, profile: InterestProfile): Promise<void> {
        try {
            const { error } = await supabase
                .from('user_interests')
                .upsert({
                    user_id: userId,
                    keywords: profile.keywords,
                    favorite_creators: profile.favoriteCreators,
                    favorite_tags: profile.favoriteTags,
                    manual_interests: profile.manualInterests,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) {
                console.error('Erro ao salvar no Supabase:', error);
            } else {
                console.log('[Recommendation] Perfil salvo no Supabase');
            }
        } catch (e) {
            console.error('Erro ao salvar perfil no Supabase:', e);
        }
    },

    // Sincroniza localStorage → Supabase quando usuário faz login
    async syncOnLogin(userId: string): Promise<void> {
        const localProfile = this.getProfileFromLocal();
        const supabaseProfile = await this.getProfileFromSupabase(userId);

        if (!supabaseProfile) {
            // Primeira vez logando: envia localStorage para Supabase
            await this.saveProfileToSupabase(userId, localProfile);
            console.log('[Recommendation] Perfil local enviado para Supabase');
        } else if (localProfile.lastUpdated > supabaseProfile.lastUpdated) {
            // Local é mais recente: atualiza Supabase
            await this.saveProfileToSupabase(userId, localProfile);
        } else {
            // Supabase é mais recente: atualiza local
            localStorage.setItem(STORAGE_KEY, JSON.stringify(supabaseProfile));
            cachedProfile = supabaseProfile;
        }
    },


    // ========== EXTRAÇÃO DE PALAVRAS-CHAVE ==========

    extractKeywords(text: string): string[] {
        if (!text) return [];

        // Normaliza e limpa
        const clean = text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove acentos
            .replace(/[^a-z0-9\s]/g, ' ')    // Remove pontuação
            .split(/\s+/)
            .filter(word => word.length > 2 && !STOP_WORDS.has(word));

        // Remove duplicatas
        return [...new Set(clean)];
    },

    // ========== REGISTRAR AÇÕES DO USUÁRIO ==========

    // Quando o usuário PESQUISA algo
    trackSearch(query: string): void {
        if (!query || query.trim().length < 2) return;

        const profile = this.getProfile();
        const keywords = this.extractKeywords(query);

        keywords.forEach(kw => {
            profile.keywords[kw] = (profile.keywords[kw] || 0) + 5; // +5 por pesquisa
        });

        this.saveProfile(profile);
        console.log('[Recommendation] Pesquisa registrada:', keywords);
    },

    // Quando o usuário ASSISTE um vídeo
    trackView(video: Video, watchedPercent: number = 50): void {
        const profile = this.getProfile();

        // Peso baseado em quanto assistiu
        const weight = watchedPercent >= 80 ? 10 : watchedPercent >= 50 ? 5 : 2;

        // Extrai palavras do título e descrição
        const titleKw = this.extractKeywords(video.title);
        const descKw = this.extractKeywords(video.description).slice(0, 10); // Limita descrição

        [...titleKw, ...descKw].forEach(kw => {
            profile.keywords[kw] = (profile.keywords[kw] || 0) + weight;
        });

        // Adiciona tags com peso maior
        video.tags.forEach(tag => {
            const cleanTag = tag.toLowerCase().trim();
            if (!profile.favoriteTags.includes(cleanTag)) {
                if (profile.favoriteTags.length < 50) { // Limite de 50 tags
                    profile.favoriteTags.push(cleanTag);
                }
            }
            profile.keywords[cleanTag] = (profile.keywords[cleanTag] || 0) + (weight * 2);
        });

        this.saveProfile(profile);
        console.log('[Recommendation] View registrada:', video.title, 'peso:', weight);
    },

    // Quando o usuário DÁ LIKE
    trackLike(video: Video): void {
        const profile = this.getProfile();

        const titleKw = this.extractKeywords(video.title);
        titleKw.forEach(kw => {
            profile.keywords[kw] = (profile.keywords[kw] || 0) + 15; // Alto peso para likes
        });

        video.tags.forEach(tag => {
            const cleanTag = tag.toLowerCase().trim();
            profile.keywords[cleanTag] = (profile.keywords[cleanTag] || 0) + 20;
        });

        this.saveProfile(profile);
        console.log('[Recommendation] Like registrado:', video.title);
    },

    // Quando o usuário SE INSCREVE em um canal
    trackSubscription(creatorId: string): void {
        const profile = this.getProfile();

        if (!profile.favoriteCreators.includes(creatorId)) {
            profile.favoriteCreators.push(creatorId);
        }

        this.saveProfile(profile);
        console.log('[Recommendation] Inscrição registrada:', creatorId);
    },

    // ========== INTERESSES MANUAIS ==========

    // Usuário escreve seus interesses
    setManualInterests(interests: string): void {
        const profile = this.getProfile();

        // Separa por vírgula e limpa
        const items = interests
            .split(/[,\n;]+/)
            .map(i => i.trim().toLowerCase())
            .filter(i => i.length > 2);

        profile.manualInterests = items;

        // Adiciona as palavras como keywords com peso alto
        items.forEach(interest => {
            const kws = this.extractKeywords(interest);
            kws.forEach(kw => {
                profile.keywords[kw] = (profile.keywords[kw] || 0) + 25; // Peso muito alto
            });
        });

        this.saveProfile(profile);
        console.log('[Recommendation] Interesses manuais salvos:', items);
    },

    getManualInterests(): string[] {
        return this.getProfile().manualInterests;
    },

    // ========== CÁLCULO DE RELEVÂNCIA ==========

    calculateRelevance(video: Video): number {
        const profile = this.getProfile();
        let score = 0;

        // Prepara textos do vídeo para comparação
        const vTitle = video.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const vDesc = video.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // 1. CRIADOR FAVORITO (maior peso)
        if (profile.favoriteCreators.includes(video.creator.id)) {
            score += 50;
        }

        // 2. TAGS FAVORITAS
        video.tags.forEach(tag => {
            const cleanTag = tag.toLowerCase().trim();
            if (profile.favoriteTags.includes(cleanTag)) {
                score += 20;
            }
            // Também verifica no mapa de keywords
            if (profile.keywords[cleanTag]) {
                score += Math.min(profile.keywords[cleanTag], 30); // Máximo 30 pts por tag
            }
        });

        // 3. PALAVRAS-CHAVE NO TÍTULO
        const titleKw = this.extractKeywords(video.title);
        titleKw.forEach(kw => {
            if (profile.keywords[kw]) {
                score += Math.min(profile.keywords[kw], 15); // Máximo 15 pts por palavra
            }
        });

        // 4. INTERESSES MANUAIS - FRASES E PALAVRAS
        profile.manualInterests.forEach(interest => {
            // Normaliza o interesse para comparação
            const cleanInterest = interest.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            // 4a. MATCH DE FRASE COMPLETA (peso máximo)
            if (vTitle.includes(cleanInterest)) {
                score += 100; // Título contém a frase exata
            } else if (vDesc.includes(cleanInterest)) {
                score += 50; // Descrição contém a frase exata
            }

            // 4b. MATCH DE PALAVRAS INDIVIDUAIS
            const interestKw = this.extractKeywords(interest);
            let matchCount = 0;

            interestKw.forEach(ikw => {
                if (titleKw.includes(ikw)) {
                    score += 25;
                    matchCount++;
                }
                video.tags.forEach(tag => {
                    if (tag.toLowerCase().includes(ikw)) {
                        score += 20;
                        matchCount++;
                    }
                });
            });

            // Bônus se encontrou várias palavras da frase
            if (interestKw.length > 1 && matchCount >= interestKw.length / 2) {
                score += 30; // Bônus por encontrar maioria das palavras
            }
        });

        return score;
    },

    // ========== RANKING PERSONALIZADO ==========

    rankVideos(videos: Video[]): Video[] {
        // Calcula score de relevância para cada vídeo
        const scored = videos.map(video => ({
            video,
            relevance: this.calculateRelevance(video)
        }));

        // Ordena: Primeiro por recência (vídeos novos), depois por relevância
        scored.sort((a, b) => {
            // Vídeos muito recentes (human-readable ou ISO recente)
            const isHumanNewA = !!a.video.uploadDate.toLowerCase().match(/(agora|segundos|minutos|hora|hoje)/);
            const isHumanNewB = !!b.video.uploadDate.toLowerCase().match(/(agora|segundos|minutos|hora|hoje)/);

            // Verifica se é ISO e se é das últimas 24h
            const timestampA = new Date(a.video.uploadDate).getTime();
            const timestampB = new Date(b.video.uploadDate).getTime();
            const isRecentA = !isNaN(timestampA) && (Date.now() - timestampA < 24 * 60 * 60 * 1000);
            const isRecentB = !isNaN(timestampB) && (Date.now() - timestampB < 24 * 60 * 60 * 1000);

            const isNewA = isHumanNewA || isRecentA;
            const isNewB = isHumanNewB || isRecentB;

            if (isNewA && !isNewB) return -1;
            if (!isNewA && isNewB) return 1;

            // Se ambos forem novos ou ambos antigos, desempata pela relevância
            if (b.relevance !== a.relevance) {
                return b.relevance - a.relevance;
            }

            // Se relevância for igual, sorteia ou usa data absoluta se disponível
            if (!isNaN(timestampA) && !isNaN(timestampB)) {
                return timestampB - timestampA;
            }

            return 0;
        });

        console.log('[Recommendation] Top 5 ranqueados:',
            scored.slice(0, 5).map(s => `${s.video.title} (${s.relevance} pts)`)
        );

        return scored.map(s => s.video);
    },

    // ========== UTILITÁRIOS ==========

    // Retorna os principais interesses do usuário (para exibir)
    getTopInterests(limit: number = 10): { keyword: string; weight: number }[] {
        const profile = this.getProfile();

        return Object.entries(profile.keywords)
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .slice(0, limit)
            .map(([keyword, weight]) => ({ keyword, weight: weight as number }));
    },

    // Limpa todo o perfil de interesses
    clearProfile(): void {
        localStorage.removeItem(STORAGE_KEY);
        cachedProfile = null;

        // Também limpa do Supabase se logado
        const userId = this.getCurrentUserId();
        if (userId) {
            supabase.from('user_interests').delete().eq('user_id', userId)
                .then(() => console.log('[Recommendation] Perfil removido do Supabase'));
        }

        window.dispatchEvent(new CustomEvent('interests-updated'));
        console.log('[Recommendation] Perfil limpo');
    }
};
