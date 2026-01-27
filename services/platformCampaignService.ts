
import { adService } from './adService';
import { PlatformCampaign } from '../types';

export type { PlatformCampaign };

export const platformCampaignService = {
    getRandomActiveCampaign: async (): Promise<PlatformCampaign | null> => {
        const campaigns = await adService.getPlatformCampaigns();
        const active = campaigns.filter(c => c.isActive);
        if (active.length === 0) return null;
        return active[Math.floor(Math.random() * active.length)];
    },

    getAllCampaigns: async (): Promise<PlatformCampaign[]> => {
        return await adService.getPlatformCampaigns();
    },

    trackImpression: async (campaignId: string) => {
        await adService.trackPlatformImpression(campaignId);
    },

    trackClick: async (campaignId: string) => {
        await adService.trackPlatformClick(campaignId);
    },

    hasActiveCampaigns: async (): Promise<boolean> => {
        const campaigns = await adService.getPlatformCampaigns();
        return campaigns.some(c => c.isActive);
    }
};
