
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Campaign, AdLocation } from '../types';
import { smartAdService } from '../services/smartAdService';
import { clickTracker } from '../services/clickTracker';

/**
 * Hook para buscar anúncios com segmentação inteligente.
 * Conta impressão TODA VEZ que o hook é montado (usuário entra na página).
 */
export const useSmartAd = (location: AdLocation, contextTags: string[] = [], videoId?: string, creatorId?: string) => {
  const [ad, setAd] = useState<Campaign | null>(null);

  // Previne múltiplas impressões para a mesma campanha nesta montagem
  const hasTrackedRef = useRef<string | null>(null);

  // Carrega o anúncio SEMPRE que o componente monta
  useEffect(() => {
    // Reset do estado ao trocar de vídeo
    setAd(null);
    hasTrackedRef.current = null;

    const timer = setTimeout(async () => {
      const foundAd = await smartAdService.getNextTargetedAd(location, contextTags);
      if (foundAd) {
        console.log(`[UseSmartAd] Match encontrado: "${foundAd.title}" para tags [${contextTags.join(', ')}]`);
        setAd(foundAd);

        // ✅ SÓ CONTA SE AINDA NÃO FOI RASTREADO NESTA MONTAGEM
        if (hasTrackedRef.current !== foundAd.id) {
          hasTrackedRef.current = foundAd.id;
          smartAdService.trackSmartImpression(foundAd.id, videoId, creatorId).catch(console.error);
          console.log(`[UseSmartAd] ✅ Impressão ÚNICA registrada no vídeo ${videoId || 'N/A'}`);
        }
      } else {
        console.log(`[UseSmartAd] Nenhum anúncio relevante para [${contextTags.join(', ')}]`);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [location, videoId, creatorId]); // Depende de location, videoId e creatorId

  // Handler de clique
  const handleAdClick = useCallback(async (e?: React.MouseEvent) => {
    if (ad) {
      await clickTracker.registerClick(ad.id);
      console.log(`[UseSmartAd] Clique registrado: ${ad.title}`);
    }
  }, [ad]);

  return {
    ad,
    onAdClick: handleAdClick
  };
};
