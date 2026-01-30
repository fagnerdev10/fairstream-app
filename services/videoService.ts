import { Video } from "../types";
import { MOCK_VIDEOS } from "./mockData";
import { supabase } from "./supabaseClient";
import { r2Service } from "./r2Service";
import { imageService } from "./imageService";

// --- MAPPERS (Snake <-> Camel) ---

const mapDbToVideo = (v: any): Video => {
  let creatorProfile = v.profiles || v.creator || {};
  let finalDescription = v.description || '';

  // --- HACK DE SINCRONIZAÇÃO GLOBAL (SEED METADATA) ---
  if (finalDescription.includes('[SEED_USER:')) {
    try {
      const startTag = finalDescription.indexOf('[SEED_USER:');
      const endTag = finalDescription.indexOf(']', startTag);
      if (startTag !== -1 && endTag !== -1) {
        const jsonPart = finalDescription.substring(startTag + 11, endTag);
        const seedData = JSON.parse(jsonPart);
        creatorProfile = { ...creatorProfile, ...seedData };
        finalDescription = (finalDescription.substring(0, startTag) + finalDescription.substring(endTag + 1)).trim();
      }
    } catch (e) {
      console.warn('[VideoService] Erro ao processar metadados de seed:', e);
    }
  }

  // --- TRAVA ANTI-BLOB (FIM DO ERR_FILE_NOT_FOUND) ---
  let validThumbnail = v.thumbnail_url || '';
  if (validThumbnail.startsWith('blob:') || validThumbnail.startsWith('data:video')) {
    validThumbnail = v.category ? imageService.getRandomThumbnailByCategory(v.category) : `https://picsum.photos/seed/${v.id}/1280/720`;
  }

  let validVideoUrl = v.video_url || '';
  if (validVideoUrl.startsWith('blob:') || validVideoUrl.startsWith('data:video')) {
    validVideoUrl = 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  }

  return {
    id: v.id,
    title: v.title || 'Sem Título',
    description: finalDescription,
    thumbnailUrl: validThumbnail,
    videoUrl: validVideoUrl,
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
    thumbnailSource: v.thumbnail_source || (validThumbnail.includes('picsum.photos') || !validThumbnail ? 'random' : 'manual'),
    isSeed: v.is_seed || finalDescription.includes('[SEED_USER:') || creatorProfile.isSeed
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

    // Prioridade 1: LocalStorage (Buffer de Vídeos Novos)
    try {
      const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      local.forEach((v: Video) => {
        if (!deletedIds.includes(v.id)) {
          videoMap.set(v.id, v);
        }
      });
    } catch (e) { }

    // Prioridade 2: Supabase (Sincronia Mestra)
    try {
      console.log('📡 [VideoService] Buscando vídeos do Supabase...');
      const { data, error } = await supabase
        .from('videos')
        .select('*, profiles:creator_id(*)');

      if (error) {
        console.warn('❌ [VideoService] Erro ao buscar vídeos do Supabase:', error.message);
      } else if (data) {
        data.forEach(v => {
          const video = mapDbToVideo(v);
          if (!deletedIds.includes(video.id)) {
            // Mescla dados do Supabase (likes/views) com o local
            if (videoMap.has(video.id)) {
              videoMap.set(video.id, { ...videoMap.get(video.id)!, ...video });
            } else {
              videoMap.set(video.id, video);
            }
          }
        });
      }
    } catch (e: any) {
      console.error('❌ [VideoService] Erro fatal Supabase:', e);
    }

    // Prioridade 3: Mocks
    if (videoMap.size < 5) {
      MOCK_VIDEOS.forEach(v => {
        if (!deletedIds.includes(v.id) && !videoMap.has(v.id)) {
          videoMap.set(v.id, v);
        }
      });
    }

    return Array.from(videoMap.values()).sort((a, b) => {
      const dateA = new Date(a.uploadDate).getTime();
      const dateB = new Date(b.uploadDate).getTime();
      if (!isNaN(dateA) && !isNaN(dateB)) return dateB - dateA;
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
    return filtered;
  },

  save: async (video: Video): Promise<Video> => {
    console.log('💾 [VideoService] Salvando vídeo (Híbrido):', video.title);

    // 1. Salva Local (Velocidade)
    try {
      const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const idx = local.findIndex((v: Video) => v.id === video.id);
      if (idx >= 0) local[idx] = video;
      else local.push(video);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
    } catch (e) { }

    // 2. Salva Remoto (Persistência)
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
      created_at: video.uploadDate,
      chapters: video.chapters || [],
      ai_summary: video.aiSummary || null,
      thumbnail_source: video.thumbnailSource || 'random'
    };

    try {
      if (!video.videoUrl.startsWith('blob:')) {
        await supabase.from('videos').upsert(dbPayload);
      }
    } catch (e: any) {
      console.warn('⚠️ [VideoService] Falha ao persistir no Supabase, mantido localmente.');
    }

    window.dispatchEvent(new Event("video-update"));
    return video;
  },

  delete: async (id: string): Promise<void> => {
    saveDeletedId(id);

    // Remove local
    try {
      const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const filtered = local.filter((v: Video) => v.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) { }

    // Remove remoto
    try {
      await supabase.from('videos').delete().eq('id', id);
    } catch (e) {
      console.error('[VideoService] Erro ao deletar do Supabase:', e);
    }

    window.dispatchEvent(new Event("video-update"));
  },

  incrementViews: async (videoId: string): Promise<Video | undefined> => {
    const now = Date.now();
    const sessionKey = `view_debounce_${videoId}`;
    const lastView = Number(sessionStorage.getItem(sessionKey) || 0);

    if (now - lastView < 2000) return await videoService.getById(videoId);
    sessionStorage.setItem(sessionKey, String(now));

    try {
      await supabase.rpc('increment_video_views', { video_id_input: videoId });
      const updated = await videoService.getById(videoId);
      window.dispatchEvent(new Event("video-update"));
      return updated;
    } catch (e) {
      return undefined;
    }
  },

  updateCreatorAvatarInVideos: () => { window.dispatchEvent(new Event("video-update")); },
  updateCreatorStatusInVideos: () => { window.dispatchEvent(new Event("video-update")); },
  updateCreatorMembershipPriceInVideos: () => { window.dispatchEvent(new Event("video-update")); },
  updateCreatorPixKeyInVideos: () => { window.dispatchEvent(new Event("video-update")); },
  updateCreatorNameInVideos: () => { window.dispatchEvent(new Event("video-update")); }
};
