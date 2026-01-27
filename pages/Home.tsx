
import React, { useState, useEffect, useRef } from 'react';
import VideoCard from '../components/VideoCard';
import { videoService } from '../services/videoService';
import { adService } from '../services/adService';
import { smartAdService } from '../services/smartAdService';
import { preferenceService } from '../services/preferenceService';
import { userPreferences } from '../services/userPreferences';
import { recommendationService } from '../services/recommendationService';
import { Video, Campaign } from '../types';
import { ExternalLink, Sparkles, MousePointer, PanelLeftClose, PanelLeftOpen, Search, X, Info, Heart } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchEngine } from '../services/searchEngine';
import InterestsModal from '../components/InterestsModal';

const Home: React.FC = () => {
  console.log('🔥 HOME CARREGADO - VERSÃO v3.0 - Sistema de Recomendação ATIVO');
  const [videos, setVideos] = useState<Video[]>([]);
  const [isCompact, setIsCompact] = useState(userPreferences.getCompactModePreference());
  const { theme } = useSettings();

  // Search States
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchQuery = searchParams.get('q') || '';
  const [isSearching, setIsSearching] = useState(false);

  // Modal de Interesses
  const [showInterestsModal, setShowInterestsModal] = useState(false);

  // Ad State (Lista de anúncios para intercalar)
  const [homeAds, setHomeAds] = useState<Campaign[]>([]);

  const loadContent = async () => {
    // Carrega TODOS os vídeos
    let allVideos = await videoService.getAll();

    // FILTROS GLOBAIS DE SEGURANÇA:
    allVideos = allVideos.filter(v => !preferenceService.isBlockedOrIgnored(v.creator.id));

    // Carrega vídeos (Busca ou Padrão com Recomendação)
    if (searchQuery.trim().length > 0) {
      setIsSearching(true);
      // Registra a pesquisa para aprender interesses
      recommendationService.trackSearch(searchQuery);
      const rankedVideos = searchEngine.search(searchQuery, allVideos);
      setVideos(rankedVideos);
    } else {
      setIsSearching(false);
      // USA O SISTEMA DE RECOMENDAÇÃO para ordenar
      const rankedVideos = recommendationService.rankVideos(allVideos);
      setVideos(rankedVideos);
    }
  };

  // Effect separado para carregar anúncios quando a lista de vídeos mudar
  const adsLoadedRef = React.useRef(false);

  useEffect(() => {
    console.log('[Home] Ad loading effect triggered, videos:', videos.length);
    if (videos.length === 0) {
      console.log('[Home] No videos, skipping ad load');
      return;
    }

    // Previne múltiplas execuções no mesmo ciclo de render
    if (adsLoadedRef.current) {
      console.log('[Home] Ads already loaded, skipping');
      return;
    }
    adsLoadedRef.current = true;

    const loadAds = async () => {
      // Calcula quantos slots de anúncios precisamos (1 a cada 3 vídeos, mínimo 1 se houver ao menos 1 vídeo)
      const slots = Math.max(1, Math.floor(videos.length / 3));
      console.log(`[Home] Calculated ${slots} ad slots for ${videos.length} videos`);
      const ads: Campaign[] = [];

      // Carrega anúncios usando Round-Robin (sem retry para não quebrar alternância)
      for (let i = 0; i < slots; i++) {
        console.log(`[Home] Loading ad ${i + 1}/${slots} with index ${i}`);
        const ad = await smartAdService.getHomeAd([], i) as Campaign;
        console.log(`[Home] Ad ${i + 1} result:`, ad ? `${ad.title} (TIPO: ${ad.type}, ID: ${ad.id})` : 'null');

        if (ad) {
          ads.push(ad);
        }
      }
      console.log(`[Home] Final ads loaded: ${ads.length}`, ads.map(a => `${a.title} (${a.type})`));
      setHomeAds(ads);
    };

    loadAds();

    // Reset flag quando o componente desmonta para permitir recarga em nova navegação
    return () => {
      adsLoadedRef.current = false;
    };
  }, [videos]);

  // Carregar conteúdo inicial e ouvir mudanças de preferências
  useEffect(() => {
    loadContent();

    const handleUpdate = () => {
      console.log('🔄 [Home] Atualização detectada, recarregando conteúdo...');
      loadContent();
    };

    const handleCompactUpdate = () => setIsCompact(userPreferences.getCompactModePreference());
    const handleInterestsUpdate = () => loadContent();

    window.addEventListener('preferences-updated', handleUpdate);
    window.addEventListener('compact-mode-update', handleCompactUpdate);
    window.addEventListener('video-update', handleUpdate);
    window.addEventListener('ad-update', handleUpdate);
    window.addEventListener('interests-updated', handleInterestsUpdate);

    return () => {
      window.removeEventListener('preferences-updated', handleUpdate);
      window.removeEventListener('compact-mode-update', handleCompactUpdate);
      window.removeEventListener('video-update', handleUpdate);
      window.removeEventListener('ad-update', handleUpdate);
      window.removeEventListener('interests-updated', handleInterestsUpdate);
    };
  }, [searchQuery]);

  const toggleCompactMode = () => {
    const newValue = !isCompact;
    setIsCompact(newValue);
    userPreferences.setCompactModePreference(newValue);
  };

  const handleClearSearch = () => {
    navigate('/');
  };

  // Funções reais de tracking 
  const handleImpression = (campaign: Campaign) => {
    // @ts-ignore
    if (campaign.isPlatform) {
      adService.trackPlatformImpression(campaign.id);
    } else {
      adService.trackImpression(campaign.id);
    }
  };

  const handleClick = (e: React.MouseEvent, campaign: Campaign) => {
    e.stopPropagation();
    // @ts-ignore
    if (campaign.isPlatform) {
      adService.trackPlatformClick(campaign.id);
    } else {
      // Regular tracking (via link mostly, but if we want to log internal db click)
      // clickTracker is responsible? OR adService has no trackClick for regular ads exposed here?
      // Campaign clicks are usually tracked via redirect or useSmartAd click handler.
      // But Home uses direct link.
      // Previously handleClick logged to console.
      // clickTracker.registerClick(campaign.id) should be called?
      // smartAdService uses clickTracker.
      // Let's import clickTracker if needed or leave console log if not critical.
      // Wait, clickTracker.ts was updated to use Supabase.
      // I should use clickTracker here for regular ads.
      import('../services/clickTracker').then(({ clickTracker }) => clickTracker.registerClick(campaign.id));
    }
    console.log(`Clique registrado na Home para campanha ${campaign.id}`);
  };

  const AdCard: React.FC<{ ad: Campaign, index: number }> = ({ ad, index }) => {
    const [imgError, setImgError] = useState(false);
    const isImage = ad.type === 'image' && ad.bannerImage && !imgError;

    const hasTrackedRef = useRef(false);

    useEffect(() => {
      if (!hasTrackedRef.current) {
        handleImpression(ad);
        hasTrackedRef.current = true;
      }
    }, [ad.id]);

    return (
      <div
        className="group cursor-pointer flex flex-col gap-2 relative"
        onClick={(e) => {
          handleClick(e, ad);
          window.open(ad.targetUrl, '_blank', 'noopener,noreferrer');
        }}
      >
        <div className={`relative rounded-xl overflow-hidden border transition-all duration-300 ${isImage ? 'aspect-video' : 'min-h-[240px]'} ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800 hover:border-blue-500/50' : 'bg-white border-gray-200 hover:border-blue-400'}`}>
          {isImage ? (
            <>
              <img
                src={ad.bannerImage}
                alt={ad.title}
                className="w-full h-full object-cover"
                onError={() => {
                  console.warn(`[AdCard] Erro ao carregar imagem do anúncio: ${ad.title}. Mudando para modo texto.`);
                  setImgError(true);
                }}
              />
              <div className="absolute top-2 right-2 bg-[#FFD700] text-black text-[10px] font-bold px-2 py-0.5 rounded shadow-lg z-20 uppercase tracking-wide">
                PATROCINADO
              </div>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                <a
                  href={ad.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => { handleClick(e, ad); }}
                  className="bg-white text-black text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all"
                >
                  <ExternalLink size={14} /> Visitar Site
                </a>
              </div>
            </>
          ) : (
            <div className={`w-full h-full p-6 flex flex-col justify-center relative z-10 ${theme === 'dark' ? 'bg-gradient-to-br from-zinc-900 to-zinc-950' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-[#FFD700] text-black text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">PATROCINADO</span>
                <h3 className={`font-bold text-lg leading-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{ad.title}</h3>
              </div>

              <div className="mb-4">
                <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}`}>
                  {ad.desktopDescription || 'Confira esta oportunidade exclusiva.'}
                </p>
              </div>

              <a
                href={ad.targetUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => handleClick(e, ad)}
                className="mt-auto pt-3 border-t border-white/10 flex items-center gap-1 text-blue-500 text-xs font-bold uppercase tracking-wider hover:underline"
              >
                <ExternalLink size={14} /> Visitar Site
              </a>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-1">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${!isImage ? 'bg-blue-900/20 border-blue-600/50 text-blue-500' : 'bg-purple-600/20 border-purple-600/50 text-purple-600'}`}>
            <span className="font-bold text-xs">AD</span>
          </div>
          <div className="flex-1">
            <h3 className={`text-base font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{ad.title}</h3>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    const items = [];
    let adIndex = 0;

    for (let i = 0; i < videos.length; i++) {
      items.push(
        <VideoCard
          key={`vid-${videos[i].id}`}
          video={videos[i]}
          variant={isSearching ? 'list' : 'grid'}
        />
      );

      // Inserir um anúncio a cada 3 vídeos (índices 2, 5, 8...)
      if (!isSearching && (i + 1) % 3 === 0 && adIndex < homeAds.length) {
        const currentAd = homeAds[adIndex];
        items.push(<AdCard key={`ad-${currentAd.id}-${i}`} ad={currentAd} index={i} />);
        adIndex++;
      }
    }
    return items;
  };

  return (
    <div className={`p-4 md:p-6 mx-auto w-full transition-all duration-300`}>

      <div className="mb-6 flex items-center gap-4">

        {isSearching ? (
          <div className={`flex-1 flex items-center gap-3 p-3 rounded-lg border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-blue-50 border-blue-200'}`}>
            <div className="bg-blue-600 text-white p-2 rounded-full">
              <Search size={18} />
            </div>
            <div className="flex-1">
              <span className={`text-sm ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>
                {videos.length} Resultados para:
              </span>
              <span className={`block font-bold text-lg leading-none ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>"{searchQuery}"</span>
            </div>
            <button
              onClick={handleClearSearch}
              className="ml-auto bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-full transition-colors"
              title="Limpar busca"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide flex-1 items-center">
            {['Tudo', 'Tecnologia', 'Design', 'Ao Vivo', 'Música', 'Jogos', 'Notícias', 'Natureza'].map((category, idx) => (
              <button
                key={idx}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${idx === 0
                  ? (theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white')
                  : (theme === 'dark' ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
                  }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {!isSearching && <div className={`h-6 w-px ${theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-300'}`}></div>}

        <button
          onClick={toggleCompactMode}
          className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${theme === 'dark'
            ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          title={isCompact ? "Restaurar Menu Lateral" : "Modo Compacto (Esconder Menu)"}
        >
          {isCompact ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          <span className="hidden sm:inline">{isCompact ? 'Expandir' : 'Compactar'}</span>
        </button>

        {/* Botão Meus Interesses */}
        <button
          onClick={() => setShowInterestsModal(true)}
          className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold border transition-all bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/30 text-purple-400 hover:from-purple-600/30 hover:to-pink-600/30 hover:text-purple-300"
          title="Personalizar seus interesses"
        >
          <Heart size={18} />
          <span className="hidden sm:inline">Interesses</span>
        </button>
      </div>

      {videos.length === 0 ? (
        <div className={`text-center py-20 flex flex-col items-center gap-4 ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>
          <Info size={48} className="opacity-50" />
          <p>
            {isSearching
              ? `Nenhum vídeo encontrado para "${searchQuery}". Tente termos mais genéricos.`
              : 'Nenhum vídeo disponível no momento.'}
          </p>
          {isSearching && (
            <button onClick={handleClearSearch} className="text-blue-500 hover:underline">Voltar para a página inicial</button>
          )}
        </div>
      ) : (
        <div className={isSearching
          ? "flex flex-col gap-4 max-w-5xl mx-auto"
          : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8"
        }>
          {renderContent()}
        </div>
      )}

      {/* Modal de Interesses */}
      <InterestsModal
        isOpen={showInterestsModal}
        onClose={() => setShowInterestsModal(false)}
      />
    </div>
  );
};

export default Home;
