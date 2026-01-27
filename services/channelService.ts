import { Channel } from '../types';
import { supabase } from './supabaseClient';

const FOLLOWS_KEY = 'fairstream_follows';

export const channelService = {
  getFollows: (): string[] => {
    const saved = localStorage.getItem(FOLLOWS_KEY);
    return saved ? JSON.parse(saved) : [];
  },

  saveFollows: (follows: string[]) => {
    localStorage.setItem(FOLLOWS_KEY, JSON.stringify(follows));
    // Dispara evento para atualizar UI se necessário
    window.dispatchEvent(new Event('follows-update'));
  },

  getSubscriberCount: async (channelId: string): Promise<number> => {
    // Fallback para IDs de seed (não-UUID)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(channelId);
    if (!isUUID) {
      // Para seeds, podemos simular um número baseado no ID ou retornar 0
      if (channelId.startsWith('seed_')) {
        // Gera um número "bonito" para o seed não parecer vazio
        return Math.floor(Math.abs(channelId.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0)) % 100000);
      }
      return 0;
    }

    try {
      const { count, error } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', channelId)
        .eq('status', 'active');

      if (error) throw error;
      return count || 0;
    } catch (e) {
      console.error("[ChannelService] Error getting sub count:", e);
      return 0;
    }
  },

  isSubscribed: async (userId: string, channelId: string): Promise<boolean> => {
    // Fallback para IDs de seed (não-UUID)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(channelId);
    if (!isUUID) return false;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('channel_id', channelId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (e) {
      return false;
    }
  },

  toggleSubscribe: async (userId: string, channelId: string) => {
    // Fallback para IDs de seed (não-UUID) - Não salvamos inscrições de seeds no Supabase
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(channelId);
    if (!isUUID) return false;

    try {
      const isSub = await channelService.isSubscribed(userId, channelId);

      if (isSub) {
        await supabase
          .from('subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('channel_id', channelId);
        return false;
      } else {
        await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            channel_id: channelId,
            type: 'channel',
            status: 'active',
            start_date: new Date().toISOString()
          });
        return true;
      }
    } catch (e) {
      console.error("[ChannelService] Error toggling subscribe:", e);
      return false;
    }
  }
};
