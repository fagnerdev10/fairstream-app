import { Video } from "../types";
import { MOCK_VIDEOS } from "./mockData";
import { supabase } from "./supabaseClient";
import { r2Service } from "./r2Service";
import { imageService } from "./imageService";

// --- MAPPERS (Snake <-> Camel) ---

const mapDbToVideo = (v: any): Video => {
  const creatorProfile = v.profiles || v.creator || {};

  return {
    id: v.id,
    title: v.title || 'Sem Título',
    description: v.description || '',
    thumbnailUrl: v.thumbnail_url || '',
    videoUrl: v.video_url || '',
    creator: {
      id: v.creator_id,
      name: creatorProfile.name || 'Criador',
      avatar: creatorProfile.avatar || `https://ui-avatars.com/api/?name=${v.creator_id}`,
      role: (creatorProfile.role as any) || 'creator',
      isCreator: true,
      interests: [],
      status: creatorProfile.status || 'active',
      membershipPrice: creatorProfile.membership_price || 5.0,
      pixKey: creatorProfile.pix_key || ''
    },
    views: v.views || 0,
    uploadDate: v.created_at || new Date().toISOString(),
    duration: v.duration || '0:00',
    tags: Array.isArray(v.tags) ? v.tags : [],
    category: v.category || 'Geral',
    likes: v.likes || 0,
    adImpressions: v.ad_impressions || 0,
    paidAdImpressions: v.paid_ad_impressions || 0,
    likedBy: v.liked_by || [],
    bunnyVideoId: v.bunny_video_id || '',
    chapters: Array.isArray(v.chapters) ? v.chapters : [],
    aiSummary: v.ai_summary || '',
    thumbnailSource: v.thumbnail_source || (v.thumbnail_url?.includes('picsum.photos') || !v.thumbnail_url ? 'random' : 'manual')
  };
};

const STORAGE_KEY = "fairstream_videos_db_v8";
const DELETED_KEY = "fairstream_deleted_videos";

const getDeletedIds = (): string[] => {
  try { return JSON.parse(localStorage.getItem(DELETED_KEY) || '[]'); } catch { return []; }
};

const saveDeletedId = (id: string) => {
  const ids = getDeletedIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(DELETED_KEY, JSON.stringify(ids));
  }
};

export const videoService = {
  uploadThumbnail: async (videoId: string, userId: string, file: Blob | File): Promise<string | null> => {
    try {
      console.log(`☁️ [VideoService] Fazendo upload de thumbnail para Cloudflare R2...`);
      const fileName = `thumb_${videoId}_${Date.now()}.jpg`;
      const publicUrl = await imageService.uploadToSupabase(file as Blob, 'thumbnails', fileName);
      return publicUrl || null;
    } catch (e) {
      console.error('[VideoService] Erro inesperado no upload R2:', e);
      return null;
    }
  },

  getAll: async (): Promise<Video[]> => {
    const videoMap = new Map<string, Video>();
    const deletedIds = getDeletedIds();

    // Prioridade 1: Supabase
    try {
      console.log('📡 [VideoService] Buscando vídeos do Supabase...');
      const { data, error } = await supabase
        .from('videos')
        .select('*, profiles:creator_id(*)');

      if (error) {
        console.warn('[VideoService] Erro ao buscar vídeos do Supabase:', error.message);
      } else if (data) {
        data.forEach(v => {
          const video = mapDbToVideo(v);
          if (!deletedIds.includes(video.id)) {
            videoMap.set(video.id, video);
          }
        });
      }
    } catch (e) {
      console.error('[VideoService] Erro fatal Supabase:', e);
    }

    // Prioridade 2: LocalStorage (Videos recém criados)
    // Se um vídeo tiver videoUrl no localStorage e não tiver no Supabase (dummy record), o local vence.
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const local = JSON.parse(stored);
        local.forEach((v: Video) => {
          if (deletedIds.includes(v.id)) return;

          const existing = videoMap.get(v.id);
          // Se não existe OU se o existente no banco for um registro "vazio" (sem URL), o local ganha
          if (!existing || (!existing.videoUrl && v.videoUrl)) {
            videoMap.set(v.id, v);
          }
        });
      }
    } catch (e) {
      console.error('[VideoService] Erro LocalStorage:', e);
    }

    // Prioridade 3: Mocks (Se a plataforma estiver vazia)
    if (videoMap.size < 5) {
      MOCK_VIDEOS.forEach(v => {
        if (!deletedIds.includes(v.id) && !videoMap.has(v.id)) {
          videoMap.set(v.id, v);
        }
      });
    }

    // Ordenação Segura (Lida com ISO e strings humanas)
    return Array.from(videoMap.values()).sort((a, b) => {
      const dateA = new Date(a.uploadDate).getTime();
      const dateB = new Date(b.uploadDate).getTime();

      // Se ambos forem datas válidas, ordena por tempo
      if (!isNaN(dateA) && !isNaN(dateB)) {
        return dateB - dateA;
      }
      // Se um for inválido (como '2 dias atrás'), coloca no final ou mantém ordem
      if (isNaN(dateA)) return 1;
      if (isNaN(dateB)) return -1;
      return 0;
    });
  },

  getById: async (id: string): Promise<Video | undefined> => {
    const all = await videoService.getAll();
    return all.find(v => String(v.id) === String(id));
  },

  getByCreator: async (creatorId: string): Promise<Video[]> => {
    const all = await videoService.getAll();
    const filtered = all.filter(v => String(v.creator.id).toLowerCase() === String(creatorId).toLowerCase());
    console.log(`🔍 [VideoService] Buscando vídeos para o criador ${creatorId}. Encontrados: ${filtered.length}. (Total na Plataforma: ${all.length})`);
    return filtered;
  },

  save: async (video: Video): Promise<Video> => {
    console.log('💾 [VideoService] Salvando vídeo no Supabase:', video.title);

    // Mapeamento App -> DB
    const dbPayload = {
      id: video.id,
      creator_id: video.creator.id,
      title: video.title,
      description: video.description,
      thumbnail_url: video.thumbnailUrl,
      video_url: video.videoUrl,
      duration: video.duration,
      tags: video.tags,
      category: video.category || 'Geral',
      views: video.views || 0,
      likes: video.likes || 0,
      ad_impressions: video.adImpressions || 0,
      paid_ad_impressions: video.paidAdImpressions || 0,
      bunny_video_id: video.bunnyVideoId || null,
      created_at: video.uploadDate, // Garantir que usamos o que veio (ISO)
      chapters: video.chapters || [],
      ai_summary: video.aiSummary || null,
      thumbnail_source: video.thumbnailSource || 'random'
    };

    try {
      const { error } = await supabase.from('videos').upsert(dbPayload);
      if (error) throw error;
      console.log('✅ [VideoService] Vídeo persistido no Supabase.');
    } catch (e) {
      console.error('[VideoService] Falha na persistência Supabase:', e);
      // Fallback Local
      const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const index = local.findIndex((v: any) => v.id === video.id);
      if (index >= 0) local[index] = video; else local.unshift(video);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
    }

    window.dispatchEvent(new Event("video-update"));
    return video;
  },

  delete: async (id: string): Promise<void> => {
    saveDeletedId(id);
    try {
      await supabase.from('videos').delete().eq('id', id);
    } catch (e) {
      console.error('[VideoService] Erro ao deletar do Supabase:', e);
    }

    const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const updated = local.filter((v: any) => String(v.id) !== String(id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("video-update"));
  },

  toggleLike: async (videoId: string, userId: string): Promise<Video | null> => {
    try {
      const video = await videoService.getById(videoId);
      if (!video) return null;

      let likedBy = video.likedBy || [];
      const userIndex = likedBy.indexOf(userId);

      if (userIndex >= 0) {
        likedBy.splice(userIndex, 1);
      } else {
        likedBy.push(userId);
      }

      const newLikes = likedBy.length;

      const { error } = await supabase
        .from('videos')
        .update({
          likes: newLikes,
          // Se decidirmos persistir o array de quem deu like, precisaremos da coluna liked_by
          // Por enquanto, apenas o número de likes é garantido no schema
        })
        .eq('id', videoId);

      if (error) throw error;

      const updatedVideo = { ...video, likes: newLikes, likedBy };
      window.dispatchEvent(new Event("video-update"));
      return updatedVideo;
    } catch (e) {
      console.error('[VideoService] Erro ao toggle like:', e);
      return null;
    }
  },

  incrementViews: async (videoId: string): Promise<Video | undefined> => {
    const now = Date.now();
    const sessionKey = `view_debounce_${videoId}`;
    const lastView = Number(sessionStorage.getItem(sessionKey) || 0);

    // Debounce de 2 segundos para evitar spam (per-session)
    if (now - lastView < 2000) {
      return await videoService.getById(videoId);
    }

    sessionStorage.setItem(sessionKey, String(now));

    try {
      console.log(`📈 [VideoService] Incrementando views para: ${videoId}`);

      // 1. ATUALIZAÇÃO LOCAL IMEDIATA (Cache LocalStorage)
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const local = JSON.parse(stored);
          const idx = local.findIndex((v: Video) => String(v.id) === String(videoId));
          if (idx >= 0) {
            local[idx].views = (local[idx].views || 0) + 1;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
          }
        }
      } catch (err) {
        console.warn('[VideoService] Erro ao atualizar cache local:', err);
      }

      // 2. ATUALIZAÇÃO NO SUPABASE via RPC
      const { error: rpcError } = await supabase.rpc('increment_video_views', { video_id_input: videoId });

      if (rpcError) {
        console.warn('[VideoService] RPC increment_video_views falhou, tentando fallback direto:', rpcError.message);

        // Tentativa 2: Update direto (Fallback)
        const { data: currentVideo } = await supabase
          .from('videos')
          .select('views')
          .eq('id', videoId)
          .maybeSingle();

        if (currentVideo) {
          await supabase
            .from('videos')
            .update({ views: (currentVideo.views || 0) + 1 })
            .eq('id', videoId);
        }
      }

      const updated = await videoService.getById(videoId);
      window.dispatchEvent(new Event("video-update"));
      return updated;
    } catch (e) {
      console.error('[VideoService] Erro fatal ao incrementar views:', e);
      return undefined;
    }
  },

  // Os métodos de sincronização de massa (updateCreatorXInVideos) 
  // agora são menos necessários se os joins forem feitos no getAll, 
  // mas vamos manter o disparo de evento para refresh da UI
  updateCreatorAvatarInVideos: () => {
    window.dispatchEvent(new Event("video-update"));
  },

  updateCreatorStatusInVideos: () => {
    window.dispatchEvent(new Event("video-update"));
  },

  updateCreatorMembershipPriceInVideos: () => {
    window.dispatchEvent(new Event("video-update"));
  },

  updateCreatorPixKeyInVideos: () => {
    window.dispatchEvent(new Event("video-update"));
  },

  updateCreatorNameInVideos: () => {
    window.dispatchEvent(new Event("video-update"));
  }
};
