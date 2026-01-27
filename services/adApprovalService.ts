
import { adService } from './adService';
import { Campaign } from '../types';

export const adApprovalService = {
  /**
   * Retorna apenas campanhas que já foram pagas e aguardam revisão.
   */
  getPendingApprovals: async (): Promise<Campaign[]> => {
    const allCampaigns = await adService.getCampaigns();
    // Filtra estritamente pelo status intermediário
    return allCampaigns.filter(c => (c.status as string) === 'waiting_approval');
  },

  /**
   * Aprova uma campanha, inserindo-a efetivamente no sistema de Round Robin.
   * O adService.updateCampaignStatus já lida com a reconstrução das filas internamente.
   */
  approveCampaign: async (campaignId: string) => {
    console.log(`[AdApproval] Aprovando campanha ${campaignId}`);
    // Ao mudar para 'active', o adService reconstrói as filas e a campanha entra no rodízio
    await adService.updateCampaignStatus(campaignId, 'active');
  },

  /**
   * Rejeita uma campanha por violação de regras.
   * O saldo permanece pago, mas a campanha não é exibida.
   * (Futuramente pode-se implementar estorno aqui).
   */
  rejectCampaign: async (campaignId: string, reason?: string) => {
    console.log(`[AdApproval] Rejeitando campanha ${campaignId}. Motivo: ${reason}`);
    await adService.updateCampaignStatus(campaignId, 'rejected');
  },

  /**
   * Retorna estatísticas de aprovação para o painel
   */
  getApprovalStats: async () => {
    const all = await adService.getCampaigns();
    return {
      pending: all.filter(c => (c.status as string) === 'waiting_approval').length,
      approved: all.filter(c => (c.status as string) === 'active').length,
      rejected: all.filter(c => (c.status as string) === 'rejected').length
    };
  }
};
