
import { useState, useEffect, useCallback } from 'react';
import { adApprovalService } from '../services/adApprovalService';
import { Campaign } from '../types';

export const useCampaignApproval = () => {
  const [pendingCampaigns, setPendingCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const pending = await adApprovalService.getPendingApprovals();
      const statistics = await adApprovalService.getApprovalStats();

      setPendingCampaigns(pending);
      setStats(statistics);
    } catch (err) {
      console.error("Error refreshing approval data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();

    // Opcional: Escutar eventos de update se o sistema disparar
    // window.addEventListener('ads-updated', refreshData);
    // return () => window.removeEventListener('ads-updated', refreshData);
  }, [refreshData]);

  const approve = async (id: string) => {
    await adApprovalService.approveCampaign(id);
    await refreshData();
  };

  const reject = async (id: string) => {
    await adApprovalService.rejectCampaign(id);
    await refreshData();
  };

  return {
    pendingCampaigns,
    stats,
    isLoading,
    approve,
    reject,
    refreshData
  };
};
