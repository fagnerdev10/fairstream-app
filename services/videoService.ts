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
  // Se a descrição contiver o padrão [SEED_USER:{...}], extraímos o perfil fake.
  // Usamos uma regex robusta que ignora quebras de linha e espaços.
  if (finalDescription.includes('[SEED_USER:')) {
    try {
      // Pequeno truque: pegamos o conteúdo entre o primeiro { e o último } dentro do marcador
      const startTag = finalDescription.indexOf('[SEED_USER:');
      const endTag = finalDescription.indexOf(']', startTag);
      if (startTag !== -1 && endTag !== -1) {
        const jsonPart = finalDescription.substring(startTag + 11, endTag);
        const seedData = JSON.parse(jsonPart);
        creatorProfile = { ...creatorProfile, ...seedData };
        // Remove a tag da descrição visível
        finalDescription = (finalDescription.substring(0, startTag) + finalDescription.substring(endTag + 1)).trim();
      }
    } catch (e) {
      console.warn('[VideoService] Erro ao processar metadados de seed:', e);
    }
  }

  // --- TRAVA ANTI-BLOB (FIM DO ERR_FILE_NOT_FOUND) ---
  // Se o banco retornar um link de blob (lixo de outra sessão), trocamos por um link real.
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

    // Prioridade 1: Supabase
    try {
      console.log('📡 [VideoService] Buscando vídeos do Supabase...');
      const { data, error } = await supabase
        .from('videos')
        .select('*, profiles:creator_id(*)');

      if (error) {
        console.warn('❌ [VideoService] Erro ao buscar vídeos do Supabase:', error.message);
      } else if (data) {
        console.log(`✅ [VideoService] ${data.length} vídeos recebidos do Supabase.`);
        data.forEach(v => {
          const video = mapDbToVideo(v);
          if (video.isSeed) console.log(`🌱 [VideoService] Vídeo SEED detectado via metadados: ${video.title} (${video.creator.name})`);
          if (!deletedIds.includes(video.id)) {
            videoMap.set(video.id, video);
          }
        });
      }
    } catch (e: any) {
      if (!isSupabaseIssue(e)) {
        console.error('❌ [VideoService] Erro fatal Supabase:', e);
      }
    }

    // Prioridade 2: LocalStorage (Videos recém criados)
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
      // TRAVA V14: Impede salvar vídeo ou capa com link de Blob temporário
      if (video.videoUrl.startsWith('blob:') || video.thumbnailUrl.startsWith('blob:')) {
        console.error('🚫 [VideoService] Tentativa de salvar link temporário (blob:) bloqueada.');
        throw new Error("Falha no upload! O arquivo não foi enviado para a nuvem. Tente novamente.");
      }

      console.log('[VideoService] Payload para Supabase:', dbPayload);
      const { error } = await supabase.from('videos').upsert(dbPayload);
      if (error) throw error;
      console.log('%c ✅ [VideoService] SUCESSO: Vídeo persistido globalmente no Supabase.', 'background: #008000; color: #fff; font-weight: bold;');
    } catch (e: any) {
      const errorMsg = e.message || JSON.stringify(e);
      console.error('%c ❌ [VideoService] FALHA NA PERSISTÊNCIA SUPABASE:', 'background: #ff0000; color: #fff; font-weight: bold;', e);

      // Diagnóstico detalhado para o Fagner
      let diagnostic = `Erro: ${errorMsg}`;
      if (errorMsg.includes('406')) diagnostic = '⚠️ Erro 406: Supabase bloqueado ou Pausado (Verifique o Painel do Supabase).';
      if (errorMsg.includes('PGRST116')) diagnostic = '⚠️ Erro PGRST116: Registro não encontrado ou RLS bloqueando.';
      if (errorMsg.includes('23503')) diagnostic = '⚠️ Erro de FK: O usuário que você está usando não existe na tabela de perfis.';

      // Fallback Local
      localStorage.setItem(STORAGE_KEY, JSON.stringify([video, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')].slice(0, 100)));

      throw new Error(diagnostic);
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
        console.warn('[VideoService] RPC increment_video_views falhou:', rpcError.message);
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
