
// ======================================
// SERVIÇO DE LIKES - SUPABASE
// ======================================
// Gerencia likes dos vídeos no Supabase
// Dados persistem e não são perdidos ao limpar navegador

import { supabase } from './supabaseClient';

export interface VideoLike {
    id: string;
    video_id: string;
    user_id: string;
    created_at: string;
}

export const likeService = {

    // ========== VERIFICAR SE USUÁRIO CURTIU ==========

    async hasUserLiked(videoId: string, userId: string): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('video_likes')
                .select('id')
                .eq('video_id', videoId)
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                console.error('Erro ao verificar like:', error);
            }

            return !!data;
        } catch (e) {
            console.error('Erro ao verificar like:', e);
            return false;
        }
    },

    // ========== TOGGLE LIKE ==========

    async toggleLike(videoId: string, userId: string): Promise<{ liked: boolean; totalLikes: number }> {
        try {
            const isLiked = await this.hasUserLiked(videoId, userId);

            if (isLiked) {
                // Remove like
                const { error } = await supabase
                    .from('video_likes')
                    .delete()
                    .eq('video_id', videoId)
                    .eq('user_id', userId);

                if (error) {
                    console.error('Erro ao remover like:', error);
                    return { liked: true, totalLikes: await this.getLikeCount(videoId) };
                }

                console.log('[LikeService] Like removido:', videoId);
                const totalLikes = await this.getLikeCount(videoId);

                // Sincroniza com a tabela videos
                await supabase.from('videos').update({ likes: totalLikes }).eq('id', videoId);

                return { liked: false, totalLikes };
            } else {
                // Adiciona like
                const { error } = await supabase
                    .from('video_likes')
                    .insert({
                        video_id: videoId,
                        user_id: userId
                    });

                if (error) {
                    console.error('Erro ao adicionar like:', error);
                    return { liked: false, totalLikes: await this.getLikeCount(videoId) };
                }

                console.log('[LikeService] Like adicionado:', videoId);
                const totalLikes = await this.getLikeCount(videoId);

                // Sincroniza com a tabela videos
                await supabase.from('videos').update({ likes: totalLikes }).eq('id', videoId);

                return { liked: true, totalLikes };
            }
        } catch (e) {
            console.error('Erro ao toggle like:', e);
            return { liked: false, totalLikes: 0 };
        }
    },

    // ========== CONTAR LIKES ==========

    async getLikeCount(videoId: string): Promise<number> {
        try {
            const { count, error } = await supabase
                .from('video_likes')
                .select('*', { count: 'exact', head: true })
                .eq('video_id', videoId);

            if (error) {
                console.error('Erro ao contar likes:', error);
                return 0;
            }

            return count || 0;
        } catch (e) {
            console.error('Erro ao contar likes:', e);
            return 0;
        }
    },

    // ========== BUSCAR USUÁRIOS QUE CURTIRAM ==========

    async getLikedBy(videoId: string): Promise<string[]> {
        try {
            const { data, error } = await supabase
                .from('video_likes')
                .select('user_id')
                .eq('video_id', videoId);

            if (error) {
                console.error('Erro ao buscar likes:', error);
                return [];
            }

            return (data || []).map(l => l.user_id);
        } catch (e) {
            console.error('Erro ao buscar likes:', e);
            return [];
        }
    },

    // ========== BUSCAR VÍDEOS CURTIDOS POR UM USUÁRIO ==========

    async getLikedVideosByUser(userId: string): Promise<string[]> {
        try {
            const { data, error } = await supabase
                .from('video_likes')
                .select('video_id')
                .eq('user_id', userId);

            if (error) {
                console.error('Erro ao buscar vídeos curtidos:', error);
                return [];
            }

            return (data || []).map(l => l.video_id);
        } catch (e) {
            console.error('Erro ao buscar vídeos curtidos:', e);
            return [];
        }
    }
};
