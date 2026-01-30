
// ======================================
// SERVIÇO DE LIKES - SUPABASE (HÍBRIDO V27.0)
// ======================================

import { supabase } from './supabaseClient';

export interface VideoLike {
    id: string;
    video_id: string;
    user_id: string;
    created_at: string;
}

export const likeService = {
    async hasUserLiked(videoId: string, userId: string): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('video_likes')
                .select('id')
                .eq('video_id', videoId)
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') return false;
            return !!data;
        } catch (e) {
            return false;
        }
    },

    async toggleLike(videoId: string, userId: string): Promise<{ liked: boolean; totalLikes: number }> {
        try {
            const isSeed = String(videoId).startsWith('seed_');
            const isLiked = await this.hasUserLiked(videoId, userId);

            if (isLiked) {
                if (!isSeed) {
                    await supabase
                        .from('video_likes')
                        .delete()
                        .eq('video_id', videoId)
                        .eq('user_id', userId);
                }

                const totalLikes = await this.getLikeCount(videoId);
                if (!isSeed) {
                    await supabase.from('videos').update({ likes: totalLikes }).eq('id', videoId);
                }
                return { liked: false, totalLikes };
            } else {
                if (!isSeed) {
                    await supabase
                        .from('video_likes')
                        .insert({
                            video_id: videoId,
                            user_id: userId
                        });
                }

                const totalLikes = await this.getLikeCount(videoId);
                if (!isSeed) {
                    await supabase.from('videos').update({ likes: totalLikes }).eq('id', videoId);
                }
                return { liked: true, totalLikes };
            }
        } catch (e) {
            console.error('Erro ao toggle like:', e);
            return { liked: false, totalLikes: 0 };
        }
    },

    async getLikeCount(videoId: string): Promise<number> {
        try {
            const { count, error } = await supabase
                .from('video_likes')
                .select('*', { count: 'exact', head: true })
                .eq('video_id', videoId);

            if (error) return 0;
            return count || 0;
        } catch (e) {
            return 0;
        }
    }
};
