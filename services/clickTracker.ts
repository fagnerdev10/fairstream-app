
import { supabase } from './supabaseClient';

export const clickTracker = {
  /**
   * Registra um clique na campanha especificada.
   * Incrementa o contador 'clicks' no Supabase.
   */
  registerClick: async (campaignId: string) => {
    try {
      const { data } = await supabase.from('campaigns').select('clicks').eq('id', campaignId).single();
      if (data) {
        const { error } = await supabase.from('campaigns').update({ clicks: (data.clicks || 0) + 1 }).eq('id', campaignId);
        if (error) throw error;
        console.log(`[ClickTracker] Clique registrado para campanha ${campaignId}`);
      } else {
        // Tenta platform campaigns? 
        // Se for platform campaign, id pode estar em outra tabela.
        // Assume campaigns table for now.
        // Se falhar, tenta platform_campaigns
        const { data: pData } = await supabase.from('platform_campaigns').select('clicks').eq('id', campaignId).single();
        if (pData) {
          await supabase.from('platform_campaigns').update({ clicks: (pData.clicks || 0) + 1 }).eq('id', campaignId);
          console.log(`[ClickTracker] Clique registrado para campanha da plataforma ${campaignId}`);
        }
      }
    } catch (error) {
      console.error("[ClickTracker] Erro ao registrar clique:", error);
    }
  }
};
