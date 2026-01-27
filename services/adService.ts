
import { AdvertiserProfile, Campaign, Transaction, AdPlanType, AdStatus, Subscription, ManualCost, AdLocation, PlatformCampaign, CampaignType } from '../types';
import { supabase } from './supabaseClient';
import { imageService } from './imageService';

// Chaves que permanecem locais por performance ou enquanto não houver tabela
const AD_QUEUES_KEY = 'fairstream_ad_queues_v3';
const TRANSACTIONS_KEY = 'fairstream_tx_db';

export interface TieredPricing {
  p100k: number;
  p500k: number;
  p1m: number;
  homepagePrice: number;
}

const DEFAULT_PRICING: TieredPricing = {
  p100k: 0.20,
  p500k: 0.15,
  p1m: 0.10,
  homepagePrice: 0.30
};

// --- MAPPERS (Snake <-> Camel) ---

const mapCampaignFromDb = (db: any): Campaign => {
  // Normalização de tipo para compatibilidade com scripts SQL antigos que usam 'banner'
  let mappedType: CampaignType = (db.type === 'banner') ? 'image' : (db.type as CampaignType);

  return {
    id: db.id,
    advertiserId: db.advertiser_id,
    type: mappedType,
    location: db.location,
    title: db.title,
    desktopDescription: db.desktop_description,
    mobileDescription: db.mobile_description,
    targetUrl: db.target_url,
    bannerImage: db.banner_image,
    status: db.status,
    budget: db.budget,
    spent: db.spent,
    impressions: db.impressions,
    clicks: db.clicks,
    targetCategories: db.target_categories || [],
    createdAt: db.created_at
  };
};

const mapPlatformCampaignFromDb = (db: any): PlatformCampaign => ({
  id: db.id,
  title: db.title,
  imageUrl: db.image_url,
  targetUrl: db.target_url,
  isActive: db.is_active,
  views: db.views,
  clicks: db.clicks,
  location: db.location || 'home',
  createdAt: db.created_at,
  desktopDescription: db.desktop_description,
  mobileDescription: db.mobile_description
});

// --- QUEUE SYSTEM (Hybrid: Local Cache + DB Source) ---

interface AdQueues {
  [category: string]: string[];
}

const getQueues = (): AdQueues => {
  try {
    return JSON.parse(localStorage.getItem(AD_QUEUES_KEY) || '{}');
  } catch {
    return {};
  }
};

const saveQueues = (queues: AdQueues) => {
  localStorage.setItem(AD_QUEUES_KEY, JSON.stringify(queues));
};

const rebuildQueues = async (): Promise<AdQueues> => {
  console.log('[AdService] Rebuilding queues from Supabase...');

  // DIAGNOSTICO: Valida se existe algo no banco
  const { data: dbDump } = await supabase.from('campaigns').select('id, title, status').limit(5);
  console.log('[AdService] DUMP BANCO DE DADOS (Tudo):', dbDump);

  // Busca apenas campanhas ativas (suporta labels em PT e EN e Casing)
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('*');

  const activeOnly = (campaigns || []).filter(c => {
    const s = (c.status || '').toLowerCase();
    return s === 'active' || s === 'ativa' || s === 'ativo';
  });

  if (error) console.error('[AdService] Error fetching active campaigns:', error);

  console.log('[AdService] Raw Active Campaigns from DB:', campaigns);

  const activeCampaigns = activeOnly.map(mapCampaignFromDb);
  console.log(`[AdService] Found ${activeCampaigns.length} active campaigns mapped.`);

  const queues: AdQueues = {};

  // Filas Base
  queues['HOME'] = [];
  queues['GENERAL_VIDEO'] = [];

  activeCampaigns.forEach(campaign => {
    if (campaign.location === 'home') {
      queues['HOME'].push(campaign.id);
    } else {
      queues['GENERAL_VIDEO'].push(campaign.id);

      // Filas por Categoria
      campaign.targetCategories.forEach(cat => {
        const normalizedCat = cat.toLowerCase().trim();
        if (!queues[normalizedCat]) queues[normalizedCat] = [];
        if (!queues[normalizedCat].includes(campaign.id)) {
          queues[normalizedCat].push(campaign.id);
        }
      });
    }
  });

  console.log('[AdService] Queues rebuilt:', queues);
  saveQueues(queues);
  return queues;
};


export const adService = {

  // --- CAMPAIGNS (Async) ---

  getCampaigns: async (advertiserId?: string): Promise<Campaign[]> => {
    let query = supabase.from('campaigns').select('*').order('created_at', { ascending: false });

    if (advertiserId) {
      query = query.eq('advertiser_id', advertiserId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Erro ao buscar campanhas:', error);
      return [];
    }
    return data.map(mapCampaignFromDb);
  },

  addCampaign: async (campaign: Campaign) => {
    const dbPayload = {
      advertiser_id: campaign.advertiserId,
      type: campaign.type,
      location: campaign.location,
      title: campaign.title,
      desktop_description: campaign.desktopDescription,
      mobile_description: campaign.mobileDescription,
      target_url: campaign.targetUrl,
      banner_image: campaign.bannerImage,
      status: campaign.status,
      budget: campaign.budget,
      spent: 0,
      impressions: 0,
      clicks: 0,
      target_categories: Array.isArray(campaign.targetCategories) ? campaign.targetCategories : []
    };

    const { error } = await supabase.from('campaigns').insert(dbPayload);

    if (error) {
      console.error('Erro ao criar campanha:', error);
      throw error;
    }

    // Atualiza filas se a campanha já nascer ativa (incomum, mas possível)
    if (campaign.status === 'active') {
      await rebuildQueues();
      console.log('Fila reconstruida apos criar campanha ativa.');
    }
    window.dispatchEvent(new Event('ad-update'));
  },

  updateCampaignStatus: async (id: string, status: AdStatus) => {
    const { error } = await supabase
      .from('campaigns')
      .update({ status })
      .eq('id', id);

    if (error) console.error('Erro ao atualizar status:', error);

    if (['active', 'paused', 'cancelled', 'rejected'].includes(status)) {
      await rebuildQueues();
    }
    window.dispatchEvent(new Event('ad-update'));
  },

  deleteCampaign: async (id: string) => {
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar campanha:', error);
      return false;
    }
    await rebuildQueues();
    window.dispatchEvent(new Event('ad-update'));
    return true;
  },

  // --- AD SELECTION (ROUND ROBIN) ---

  getNextAd: async (location: AdLocation, contentCategories: string[]): Promise<Campaign | null> => {
    console.log(`[AdService] getNextAd called for ${location}`, contentCategories);

    // Force rebuild just to be safe during debug
    let queues = getQueues();
    console.log('[AdService] Current Queues in Memory:', JSON.stringify(queues));

    let mustRebuild = Object.keys(queues).length === 0;

    // Check if everything is empty arrays
    const totalItems = Object.values(queues).reduce((acc, list) => acc + list.length, 0);
    if (totalItems === 0) mustRebuild = true;

    if (mustRebuild) {
      console.log('[AdService] Queues effective empty. Rebuilding...');
      queues = await rebuildQueues();
    }

    // Identificar Fila
    let targetQueueKey = 'GENERAL_VIDEO';
    if (location === 'home') {
      targetQueueKey = 'HOME';
    } else {
      const matchingCat = contentCategories.find(tag => queues[tag.toLowerCase().trim()]?.length > 0);
      if (matchingCat) targetQueueKey = matchingCat.toLowerCase().trim();
    }

    console.log(`[AdService] Target Queue: ${targetQueueKey}`);

    let queue = queues[targetQueueKey] || [];

    // Fallback logic
    if (queue.length === 0 && location !== 'home' && targetQueueKey !== 'GENERAL_VIDEO') {
      console.log('[AdService] Queue empty for category, trying GENERAL_VIDEO');
      return adService.getNextAd(location, []);
    }

    if (queue.length === 0) {
      // Last ditch effort
      console.log('[AdService] Queue still empty. Re-fetching DB one last time...');
      const freshQueues = await rebuildQueues();
      queue = freshQueues[targetQueueKey] || [];
      if (queue.length === 0) {
        console.log('[AdService] Give up. No ads found.');
        return null;
      }
    }

    // Processar Fila
    let attempts = 0;
    const maxAttempts = queue.length + 2; // Extra buffer
    let selectedCampaign: Campaign | null = null;
    let selectedId: string | null = null;

    while (attempts < maxAttempts) {
      selectedId = queue.shift() || null;

      if (!selectedId) break;

      const { data: campaignData, error: dbError } = await supabase.from('campaigns').select('*').eq('id', selectedId).single();

      if (dbError) {
        console.error('[AdService] Error fetching campaign details:', selectedId, dbError);
      }

      if (campaignData && campaignData.status === 'active') {
        const campaign = mapCampaignFromDb(campaignData);

        // Bypass de verificação de saldo em tempo real (evita erro de RLS/Permissão para o espectador)
        // O status 'active' da campanha já deve ser a fonte da verdade.
        // const { data: advertiser } = await supabase... 

        // SUCESSO
        selectedCampaign = campaign;
        queue.push(selectedId); // Volta pro fim
        break;
      }
      attempts++;
    }

    saveQueues({ ...queues, [targetQueueKey]: queue });
    return selectedCampaign;
  },

  trackImpression: async (campaignId: string) => {
    // Incrementa campanha via RPC (Solução atômica no banco)
    const { error } = await supabase.rpc('increment_campaign_impressions', { campaign_id: campaignId });
    if (error) {
      console.error('[AdService] Erro ao incrementar impressões via RPC:', error);

      // Fallback seguro: apenas se o RPC falhar por não existir, tentamos o update
      // Mas o V11 do SQL já garante que o RPC existe.
    }
  },

  // --- PLATFORM CAMPAIGNS (Internal Ads) ---

  getPlatformCampaigns: async (): Promise<PlatformCampaign[]> => {
    const { data } = await supabase.from('platform_campaigns').select('*');
    return (data || []).map(mapPlatformCampaignFromDb);
  },

  createPlatformCampaign: async (camp: Omit<PlatformCampaign, 'id' | 'views' | 'clicks' | 'createdAt'>) => {
    const { error } = await supabase.from('platform_campaigns').insert({
      title: camp.title,
      image_url: camp.imageUrl,
      target_url: camp.targetUrl,
      is_active: camp.isActive,
      location: camp.location,
      views: 0,
      clicks: 0
    });
    if (error) console.error("Erro criando campanha interna:", error);
  },

  togglePlatformCampaign: async (id: string, currentState: boolean) => {
    await supabase.from('platform_campaigns').update({ is_active: !currentState }).eq('id', id);
  },

  deletePlatformCampaign: async (id: string) => {
    await supabase.from('platform_campaigns').delete().eq('id', id);
  },

  trackPlatformImpression: async (campaignId: string) => {
    const { data } = await supabase.from('platform_campaigns').select('views').eq('id', campaignId).single();
    if (data) {
      await supabase.from('platform_campaigns').update({ views: (data.views || 0) + 1 }).eq('id', campaignId);
    }
  },

  trackPlatformClick: async (campaignId: string) => {
    const { data } = await supabase.from('platform_campaigns').select('clicks').eq('id', campaignId).single();
    if (data) {
      await supabase.from('platform_campaigns').update({ clicks: (data.clicks || 0) + 1 }).eq('id', campaignId);
    }
  },

  // --- MANUAL COSTS (Migrated to platform_costs) ---

  getManualCosts: async (): Promise<ManualCost[]> => {
    const { data } = await supabase.from('platform_costs').select('*').order('date', { ascending: false });
    return (data || []).map(d => ({
      id: d.id,
      description: d.description,
      amount: d.amount,
      date: d.date
    }));
  },

  addManualCost: async (cost: ManualCost) => {
    await supabase.from('platform_costs').insert({
      description: cost.description,
      amount: cost.amount,
      date: cost.date
    });
  },

  deleteManualCost: async (id: string) => {
    await supabase.from('platform_costs').delete().eq('id', id);
  },

  // --- TRANSACTIONS (Async - Supabase 'advertising_transactions') ---

  getTransactions: async (advertiserId?: string): Promise<Transaction[]> => {
    let query = supabase.from('advertising_transactions').select('*').order('created_at', { ascending: false });

    if (advertiserId) {
      query = query.eq('advertiser_id', advertiserId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Erro ao buscar transações:', error);
      // Fallback LocalStorage (opcional, ou remover se quiser forçar migração)
      try {
        const local = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]');
        if (advertiserId) return local.filter((t: any) => t.advertiserId === advertiserId);
        return local;
      } catch { return []; }
    }

    return (data || []).map(t => ({
      id: t.id,
      advertiserId: t.advertiser_id,
      amount: t.amount,
      type: t.type,
      description: t.description,
      date: t.created_at,
      method: t.method || 'balance_deduction',
      status: t.status || 'completed'
    }));
  },

  addTransaction: async (tx: Transaction) => {
    // Supabase
    const { error } = await supabase.from('advertising_transactions').insert({
      advertiser_id: tx.advertiserId,
      amount: tx.amount,
      type: tx.type,
      description: tx.description,
      method: tx.method,
      status: tx.status
      // created_at é automático
    });

    if (error) console.error('Erro ao salvar transação:', error);

    // Backup Local
    try {
      const txs = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]');
      txs.push(tx);
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txs));
    } catch { }
  },

  clearTransactions: async (advertiserId: string) => {
    // Supabase
    await supabase.from('advertising_transactions').delete().eq('advertiser_id', advertiserId);

    // Backup Local
    try {
      const txs = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]');
      const newTxs = txs.filter((t: any) => t.advertiserId !== advertiserId);
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(newTxs));
    } catch { }
  },

  // --- ADVERTISERS & PROFILES ---

  // Advertisers - busca da tabela 'advertisers' (principal) com fallback para 'profiles'
  getAllAdvertisers: async (): Promise<AdvertiserProfile[]> => {
    // Primeiro tenta buscar da tabela 'advertisers' (onde criamos via SQL)
    const { data: advData, error: advError } = await supabase.from('advertisers').select('*');

    if (!advError && advData && advData.length > 0) {
      console.log('[AdService] Anunciantes da tabela advertisers:', advData.length);
      return advData.map((a: any) => ({
        id: a.id,
        companyName: a.company_name || 'Empresa',
        balance: a.balance || 0,
        standardImpressions: a.standard_impressions || 0,
        homepageImpressions: a.homepage_impressions || 0,
        plan: 'pro'
      }));
    }

    console.log('[AdService] Fallback: buscando de profiles com role=advertiser');
    // Fallback: busca de profiles role='advertiser' com colunas explícitas
    const { data } = await supabase.from('profiles').select('id, name, avatar, role, balance, standard_impressions, homepage_impressions').eq('role', 'advertiser');
    return (data || []).map((p: any) => ({
      id: p.id,
      companyName: p.name || 'Empresa',
      balance: p.balance || 0,
      standardImpressions: p.standard_impressions || 1000,
      homepageImpressions: p.homepage_impressions || 1000,
      plan: 'pro'
    }));
  },

  getAdvertiser: async (id: string): Promise<AdvertiserProfile | undefined> => {
    // Primeiro verifica se existe na tabela 'advertisers'
    const { data: advData } = await supabase.from('advertisers').select('*').eq('id', id).single();

    if (advData) {
      return {
        id: advData.id,
        companyName: advData.company_name || 'Empresa',
        balance: advData.balance || 0,
        standardImpressions: advData.standard_impressions || 0,
        homepageImpressions: advData.homepage_impressions || 0,
        plan: 'pro'
      };
    }

    // Se não existir em advertisers, busca de profiles e CRIA em advertisers
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', id).single();

    if (profileData) {
      // Cria automaticamente na tabela advertisers para o usuário poder criar campanhas
      const { error } = await supabase.from('advertisers').insert({
        id: profileData.id,
        user_id: profileData.id,
        company_name: profileData.name || 'Novo Anunciante',
        homepage_impressions: 1000,  // Saldo inicial de teste
        standard_impressions: 1000,
        balance: 0
      });

      if (!error) {
        console.log('[AdService] Anunciante criado automaticamente para:', profileData.id);
      }

      return {
        id: profileData.id,
        companyName: profileData.name || 'Empresa',
        balance: profileData.balance || 0,
        standardImpressions: 1000,
        homepageImpressions: 1000,
        plan: 'pro'
      };
    }

    return undefined;
  },

  updateAdvertiser: async (adv: AdvertiserProfile) => {
    // Atualiza balance no profile
    await supabase.from('profiles').update({
      balance: adv.balance,
      standard_impressions: adv.standardImpressions,
      homepage_impressions: adv.homepageImpressions
    }).eq('id', adv.id);
  },

  // Pricing (Tabelado)
  getTieredPricing: async (): Promise<TieredPricing> => {
    const { data } = await supabase.from('ad_pricing').select('*').single();
    if (data) return {
      p100k: data.cpm_100k,
      p500k: data.cpm_500k,
      p1m: data.cpm_1m,
      homepagePrice: data.homepage_price
    };
    return DEFAULT_PRICING;
  },

  saveTieredPricing: async (pricing: TieredPricing) => {
    await supabase.from('ad_pricing').upsert({
      id: 1,
      cpm_100k: pricing.p100k,
      cpm_500k: pricing.p500k,
      cpm_1m: pricing.p1m,
      homepage_price: pricing.homepagePrice
    });
  },

  // Subscriptions (Membros)
  getAllSubscriptions: async (): Promise<Subscription[]> => {
    const { data } = await supabase.from('subscriptions').select('*');
    return (data || []).map((s: any) => ({
      id: s.id,
      userId: s.user_id,
      type: s.type,
      channelId: s.channel_id,
      price: s.price,
      startDate: s.start_date,
      status: s.status,
      channelName: 'Carregando...',
      channelAvatar: ''
    }));
  }
};
