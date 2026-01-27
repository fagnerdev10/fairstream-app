
import { useState } from 'react';
import { paymentService } from '../services/paymentService';
import { Campaign, AdvertiserProfile } from '../types';

export const usePayment = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successTx, setSuccessTx] = useState<string | null>(null);

  const payCampaign = async (
    campaign: Campaign, 
    method: 'pix' | 'credit_card',
    advertiser: AdvertiserProfile
  ) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await paymentService.processCampaignPayment(campaign, method, advertiser);
      
      if (result.success && result.transactionId) {
        setSuccessTx(result.transactionId);
        return true;
      } else {
        setError(result.message || 'Erro desconhecido');
        return false;
      }
    } catch (err) {
      setError('Falha na comunicação com o gateway.');
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const resetPaymentState = () => {
    setIsProcessing(false);
    setError(null);
    setSuccessTx(null);
  };

  return {
    isProcessing,
    error,
    successTx,
    payCampaign,
    resetPaymentState
  };
};
