// 🚀 FAIRSTREAM SMART AD SERVICE - VERSION V38 (ULTIMATE FIX)
// BUILD-ID: 20240228_2105_NO_RPC

import { Campaign, AdLocation, PlatformCampaign, AdvertiserProfile } from '../types';
import { platformCampaignService } from './platformCampaignService';
import { adService } from './adService';
import { supabase } from './supabaseClient';

console.log("%c [V38] SMART AD SERVICE LOADED. ZERO RPC MODE. ", "background: #70f; color: #fff; font-weight: bold; border: 2px solid white;");

const SMART_QUEUE_KEY = 'fairstream_smart_queue_v3';

// Seletores de sementes para Round-Robin persistente na sessão (reseta ao fechar aba)
const getSessionCounter = (key: string): number => {
  try {
    const val = sessionStorage.getItem(`fairstream_ad_counter_${key}`);
    return val ? parseInt(val) : 0;
  } catch { return 0; }
};

const setSessionCounter = (key: string, val: number) => {
  try {
    sessionStorage.setItem(`fairstream_ad_counter_${key}`, val.toString());
  } catch { }
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'geral': ['vlog', 'entretenimento', 'curiosidade', 'diversos', 'variedades', 'geral', 'all'],
  'tecnologia': ['tech', 'celular', 'smartphone', 'iphone', 'android', 'samsung', 'xiaomi', 'motorola', 'pc', 'computador', 'notebook', 'hardware', 'software', 'dev', 'programacao', 'gadget', 'review', 'unboxing', 'eletronico'],
  'culinária e gastronomia': ['culinaria', 'gastronomia', 'receita', 'cozinha', 'comida', 'bolo', 'doce', 'salgado', 'chef', 'sabor', 'restaurante', 'jantar', 'almoco', 'lanche', 'churrasco', 'vegan'],
  'viagem e turismo': ['viagem', 'turismo', 'ferias', 'viajar', 'trip', 'hotel', 'pousada', 'praia', 'montanha', 'natureza', 'voo', 'aeroporto', 'mala', 'roteiro', 'passeio', 'intercambio'],
  'jogos': ['game', 'jogo', 'playstation', 'xbox', 'nintendo', 'steam', 'pc gamer', 'minecraft', 'roblox', 'free fire', 'fortnite', 'lol', 'gameplay', 'stream', 'esports'],
  'negócios e finanças': ['negocio', 'financa', 'dinheiro', 'investimento', 'economia', 'empreendedor', 'venda', 'marketing', 'bolsa', 'cripto', 'bitcoin', 'renda', 'lucro', 'banco'],
  'educação': ['educacao', 'aula', 'curso', 'tutorial', 'aprender', 'ensino', 'escola', 'faculdade', 'dica', 'estudo', 'ciencia', 'historia', 'matematica'],
  'entretenimento': ['humor', 'comedia', 'vlog', 'desafio', 'react', 'curiosidade', 'viral', 'meme', 'famoso', 'celebridade', 'filme', 'serie', 'cinema', 'anime'],
  'moda e beleza': ['moda', 'beleza', 'maquiagem', 'makeup', 'cabelo', 'penteado', 'look', 'roupa', 'estilo', 'skincare', 'unha'],
  'esporte': ['futebol', 'basquete', 'volei', 'academia', 'treino', 'fitness', 'saude', 'crossfit', 'corrida', 'atleta', 'gol', 'neymar'],
  'automóveis e veículos': ['carro', 'moto', 'veiculo', 'automovel', 'transito', 'motor', '4x4', 'f1', 'corrida', 'piloto']
};

export const smartAdService = {
  normalize: (str: string): string => {
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  },

  checkRelevance: (campaignCategories: string[], videoTags: string[]): boolean => {
    if (!campaignCategories || campaignCategories.length === 0) return true;
    if (!videoTags || videoTags.length === 0) return true;

    const normVideoTags = videoTags.map(smartAdService.normalize);

    const isMatch = campaignCategories.some(catRaw => {
      const cat = smartAdService.normalize(catRaw || "");
      if (cat === 'geral' || cat === 'all' || cat === 'todos') return true;

      if (normVideoTags.some(tag => tag.includes(cat) || cat.includes(tag))) return true;

      const keywords = CATEGORY_KEYWORDS[catRaw.toLowerCase()] || [];
      return keywords.some(keyword => {
        const normKey = smartAdService.normalize(keyword);
        return normVideoTags.some(tag => tag.includes(normKey));
      });
    });

    return isMatch;
  },

  getNextTargetedAd: async (location: AdLocation, contextTags: string[], forceIndex?: number): Promise<Campaign | null> => {
    try {
      const campaigns = await adService.getCampaigns();

      let paidCandidates = campaigns.filter(campaign => {
        const status = (campaign.status || '').toLowerCase();
        const campaignLocation = (campaign.location || '').toLowerCase();
        const requestedLocation = (location || '').toLowerCase();

        if (status !== 'active' && status !== 'ativa' && status !== 'ativo') return false;
        if (campaignLocation !== requestedLocation) return false;
        return true;
      });

      if (location === 'video' && paidCandidates.length > 0) {
        const strictMatches = paidCandidates.filter(c => {
          if (!c.targetCategories || c.targetCategories.length === 0) return false;
          return smartAdService.checkRelevance(c.targetCategories, contextTags);
        });

        if (strictMatches.length > 0) {
          paidCandidates = strictMatches;
        } else {
          const generalAds = paidCandidates.filter(c => !c.targetCategories || c.targetCategories.length === 0);
          if (generalAds.length > 0) {
            paidCandidates = generalAds;
          }
        }
      }

      const platformCampaigns = await adService.getPlatformCampaigns();
      const activePlatformCampaigns = platformCampaigns
        .filter(pc => {
          if (!pc.isActive) return false;
          const pcLocation = (pc.location || 'home').toLowerCase();
          return pcLocation === location.toLowerCase();
        })
        .map(pc => ({
          advertiserId: 'platform',
          type: (pc.imageUrl && pc.imageUrl.startsWith('http')) ? 'image' : 'text',
          location: pc.location || location,
          title: pc.title,
          desktopDescription: pc.desktopDescription || 'Campanha da Plataforma',
          bannerImage: (pc.imageUrl && pc.imageUrl.startsWith('http')) ? pc.imageUrl : undefined,
          status: 'active',
          isPlatform: true,
          id: pc.id,
          targetUrl: pc.targetUrl
        } as any as Campaign));

      const candidates = [...paidCandidates, ...activePlatformCampaigns].map(c => {
        const hasValidImage = c.bannerImage && c.bannerImage.startsWith('http') && c.bannerImage.length > 10;
        if (c.type === 'image' && !hasValidImage) {
          return { ...c, type: 'text' as const };
        }
        return c;
      });

      if (candidates.length === 0) return null;

      const sortedCandidates = [...candidates].sort((a, b) => a.id.localeCompare(b.id));
      const images = sortedCandidates.filter(c => c.type === 'image');
      const texts = sortedCandidates.filter(c => c.type === 'text');

      const callCounter = forceIndex !== undefined ? forceIndex : getSessionCounter(location);
      if (forceIndex === undefined) setSessionCounter(location, callCounter + 1);

      const wantImage = (callCounter % 2) === 0;
      const imageIndex = Math.floor(callCounter / 2);
      const textIndex = Math.floor(callCounter / 2);

      let selected: Campaign;

      if (wantImage && images.length > 0) {
        selected = images[imageIndex % images.length];
      } else if (!wantImage && texts.length > 0) {
        selected = texts[textIndex % texts.length];
      } else {
        const all = [...images, ...texts];
        selected = all[callCounter % all.length];
      }

      return selected;

    } catch (error) {
      console.error("[SmartAdService] Erro ao selecionar anúncio:", error);
      return null;
    }
  },

  trackSmartImpression: async (campaignId: string, videoId?: string, creatorId?: string) => {
    try {
      // 1. Rastreia na tabela de campanhas (Ads)
      await adService.trackImpression(campaignId);

      // 2. Incrementa contador no vídeo (UPDATE DIRETO - NO RPC)
      if (videoId) {
        try {
          const { data: currentVideo } = await supabase
            .from('videos')
            .select('ad_impressions, accumulated_revenue')
            .eq('id', videoId)
            .maybeSingle();

          if (currentVideo) {
            console.log(`[V38] Contador antes: ${currentVideo.ad_impressions}`);
            await supabase
              .from('videos')
              .update({
                ad_impressions: (currentVideo.ad_impressions || 0) + 1,
                accumulated_revenue: (Number(currentVideo.accumulated_revenue) || 0) + 0.20
              })
              .eq('id', videoId);

            console.log(`[V38] ✅ Vídeo ${videoId} atualizado com sucesso via UPDATE.`);
          }
        } catch (e) {
          console.warn("[V38] Erro no update do vídeo:", e);
        }

        window.dispatchEvent(new Event("video-update"));
        window.dispatchEvent(new Event("payout-processed"));
        window.dispatchEvent(new Event("balance-updated"));
      }
    } catch (e) {
      console.error("[V38] Erro fatal:", e);
    }
  },

  getHomeAd: async (contextTags: string[], index?: number): Promise<Campaign | null> => {
    try {
      return await smartAdService.getNextTargetedAd('home', contextTags, index);
    } catch (error) { return null; }
  }
};
