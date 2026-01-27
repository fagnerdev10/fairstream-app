
// ======================================
// SERVIÇO DE COMENTÁRIOS - SUPABASE
// ======================================
// Gerencia comentários dos vídeos no Supabase
// Dados persistem e não são perdidos ao limpar navegador

import { supabase } from './supabaseClient';

export interface VideoComment {
    id: string;
    video_id: string;
    user_id: string;
    user_name: string;
    user_avatar?: string;
    content: string;
    parent_id?: string | null;
    likes: number;
    is_pinned: boolean;
    is_creator_comment: boolean;
    created_at: string;
    updated_at: string;
    // Para respostas aninhadas
    replies?: VideoComment[];
}

export const commentService = {

    // ========== BUSCAR COMENTÁRIOS ==========

    // Busca todos os comentários de um vídeo
    async getCommentsByVideo(videoId: string): Promise<VideoComment[]> {
        try {
            const { data, error } = await supabase
                .from('video_comments')
                .select('*')
                .eq('video_id', videoId)
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao buscar comentários:', error);
                return [];
            }

            // Organiza em árvore (comentários principais + respostas)
            const mainComments = (data || []).filter(c => !c.parent_id);
            const replies = (data || []).filter(c => c.parent_id);

            mainComments.forEach(comment => {
                comment.replies = replies.filter(r => r.parent_id === comment.id);
            });

            return mainComments;
        } catch (e) {
            console.error('Erro ao buscar comentários:', e);
            return [];
        }
    },

    // ========== ADICIONAR COMENTÁRIO ==========

    async addComment(
        videoId: string,
        userId: string,
        userName: string,
        userAvatar: string | undefined,
        content: string,
        parentId?: string,
        isCreatorComment: boolean = false
    ): Promise<VideoComment | null> {
        try {
            const { data, error } = await supabase
                .from('video_comments')
                .insert({
                    video_id: videoId,
                    user_id: userId,
                    user_name: userName,
                    user_avatar: userAvatar || '',
                    content: content,
                    parent_id: parentId || null,
                    is_creator_comment: isCreatorComment,
                    likes: 0,
                    is_pinned: false
                })
                .select()
                .single();

            if (error) {
                console.error('Erro ao adicionar comentário:', error);
                return null;
            }

            console.log('[CommentService] Comentário adicionado:', data);
            return data;
        } catch (e) {
            console.error('Erro ao adicionar comentário:', e);
            return null;
        }
    },

    // ========== EDITAR COMENTÁRIO ==========

    async updateComment(commentId: string, userId: string, newContent: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('video_comments')
                .update({ content: newContent, updated_at: new Date().toISOString() })
                .eq('id', commentId)
                .eq('user_id', userId); // Só o próprio usuário pode editar

            if (error) {
                console.error('Erro ao editar comentário:', error);
                return false;
            }

            return true;
        } catch (e) {
            console.error('Erro ao editar comentário:', e);
            return false;
        }
    },

    // ========== EXCLUIR COMENTÁRIO ==========

    async deleteComment(commentId: string, userId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('video_comments')
                .delete()
                .eq('id', commentId)
                .eq('user_id', userId); // Só o próprio usuário pode excluir

            if (error) {
                console.error('Erro ao excluir comentário:', error);
                return false;
            }

            console.log('[CommentService] Comentário excluído:', commentId);
            return true;
        } catch (e) {
            console.error('Erro ao excluir comentário:', e);
            return false;
        }
    },

    // Excluir como admin/criador do vídeo (sem check de user_id)
    async deleteCommentAsAdmin(commentId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('video_comments')
                .delete()
                .eq('id', commentId);

            if (error) {
                console.error('Erro ao excluir comentário como admin:', error);
                return false;
            }

            return true;
        } catch (e) {
            console.error('Erro ao excluir comentário:', e);
            return false;
        }
    },

    // ========== CURTIR COMENTÁRIO ==========

    async likeComment(commentId: string): Promise<boolean> {
        try {
            // Incrementa o contador de likes
            const { data: comment } = await supabase
                .from('video_comments')
                .select('likes')
                .eq('id', commentId)
                .single();

            const newLikes = (comment?.likes || 0) + 1;

            const { error } = await supabase
                .from('video_comments')
                .update({ likes: newLikes })
                .eq('id', commentId);

            if (error) {
                console.error('Erro ao curtir comentário:', error);
                return false;
            }

            return true;
        } catch (e) {
            console.error('Erro ao curtir comentário:', e);
            return false;
        }
    },

    // ========== FIXAR COMENTÁRIO ==========

    async pinComment(commentId: string, isPinned: boolean): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('video_comments')
                .update({ is_pinned: isPinned })
                .eq('id', commentId);

            if (error) {
                console.error('Erro ao fixar comentário:', error);
                return false;
            }

            return true;
        } catch (e) {
            console.error('Erro ao fixar comentário:', e);
            return false;
        }
    },

    // ========== CONTAR COMENTÁRIOS ==========

    async getCommentCount(videoId: string): Promise<number> {
        try {
            const { count, error } = await supabase
                .from('video_comments')
                .select('*', { count: 'exact', head: true })
                .eq('video_id', videoId);

            if (error) {
                console.error('Erro ao contar comentários:', error);
                return 0;
            }

            return count || 0;
        } catch (e) {
            console.error('Erro ao contar comentários:', e);
            return 0;
        }
    }
};
