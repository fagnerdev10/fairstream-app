
import { adService } from './adService';
import { Transaction, Campaign, AdvertiserProfile } from '../types';

// Simulação de resposta do Gateway
interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  message?: string;
}

export const paymentService = {
  /**
   * Processa o pagamento de uma campanha específica.
   * Transforma o status de 'pending_payment' para 'waiting_approval'.
   */
  processCampaignPayment: async (
    campaign: Campaign, 
    method: 'pix' | 'credit_card',
    advertiser: AdvertiserProfile
  ): Promise<PaymentResponse> => {
    console.log(`[PaymentService] Iniciando processamento para campanha: ${campaign.id}`);

    // Simulação de delay de rede do Mercado Pago
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Lógica de sucesso (Simulada)
    const isSuccess = true; 

    if (isSuccess) {
      // 1. Registra a transação financeira no sistema existente
      const transaction: Transaction = {
        id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        advertiserId: advertiser.id,
        amount: campaign.budget,
        method: method === 'pix' ? 'pix' : 'credit_card', // Adaptação para o tipo existente
        status: 'completed',
        type: 'spend',
        date: new Date().toISOString(),
        description: `Pagamento de Campanha: ${campaign.title}`
      };
      
      adService.addTransaction(transaction);

      // 2. Atualiza o status da campanha para a fila de aprovação
      // Isso "ativa" a flag lógica de 'paid: true' implicitamente pelo status
      adService.updateCampaignStatus(campaign.id, 'waiting_approval');

      return {
        success: true,
        transactionId: transaction.id,
        message: 'Pagamento confirmado com sucesso.'
      };
    } else {
      return {
        success: false,
        message: 'Pagamento recusado pela operadora.'
      };
    }
  },

  /**
   * Verifica se uma campanha foi paga baseada no status.
   * Útil para UI de badges.
   */
  isCampaignPaid: (campaign: Campaign): boolean => {
    // Campanhas nestes status já passaram pelo fluxo de pagamento
    const paidStatuses = ['waiting_approval', 'active', 'paused', 'rejected'];
    return paidStatuses.includes(campaign.status);
  }
};
