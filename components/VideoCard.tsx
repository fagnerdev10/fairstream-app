
import React, { useState, useEffect, useRef } from 'react';
import { Video } from '../types';
import { MoreVertical, Sparkles, Ban, EyeOff, CheckCircle, Wand2, Heart } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { preferenceService } from '../services/preferenceService';
import { imageService } from '../services/imageService';
import { formatRelativeDate, formatCompactNumber } from '../services/utils';

interface VideoCardProps {
  video: Video;
  variant?: 'grid' | 'list';
}

const VideoCard: React.FC<VideoCardProps> = ({ video, variant = 'grid' }) => {
  const navigate = useNavigate();
  const { theme } = useSettings();
  const [showExplanation, setShowExplanation] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const isList = variant === 'list';

  // Obtém a URL da capa otimizada (400px para grid, 640px para lista)
  const thumbnailUrl = imageService.getSmartThumbnail(video, isList ? 640 : 400);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (preferenceService.isBlockedOrIgnored(video.creator.id)) {
      setIsHidden(true);
    }
  }, [video.creator.id]);

  const handleAction = (e: React.MouseEvent, action: 'block' | 'ignore') => {
    e.stopPropagation();
    if (action === 'block') {
      preferenceService.blockChannel(video.creator.id);
      setFeedbackMessage("Canal bloqueado com sucesso.");
    } else {
      preferenceService.ignoreChannel(video.creator.id);
      setFeedbackMessage("Canal removido das recomendações.");
    }
    setShowMenu(false);
    setTimeout(() => {
      setIsHidden(true);
    }, 1500);
  };

  if (isHidden && !feedbackMessage) return null;

  if (feedbackMessage) {
    return (
      <div className={`rounded-xl flex flex-col items-center justify-center p-4 text-center animate-in fade-in zoom-in duration-300 border ${isList ? 'w-full my-2 h-32' : 'aspect-video'} ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-100 border-gray-200'}`}>
        <CheckCircle className="text-green-500 mb-2" size={24} />
        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{feedbackMessage}</p>
        <button
          onClick={(e) => { e.stopPropagation(); setFeedbackMessage(null); setIsHidden(true); }}
          className="mt-2 text-xs text-blue-500 hover:underline"
        >
          Desfazer
        </button>
      </div>
    );
  }

  const likeCount = video.likes !== undefined ? video.likes : (video.likedBy?.length || 0);

  // Layout ajustado para modo lista
  const containerClasses = isList
    ? "group cursor-pointer flex flex-col sm:flex-row gap-4 w-full items-start"
    : "group cursor-pointer flex flex-col gap-2 relative";

  // Thumbnail no modo lista tem tamanho fixo em Desktop (md) para parecer YouTube
  const thumbnailContainerClasses = isList
    ? "relative w-full sm:w-[320px] sm:min-w-[320px] aspect-video rounded-xl overflow-hidden flex-shrink-0"
    : "relative aspect-video rounded-xl overflow-hidden";

  return (
    <div className={containerClasses}>
      {/* Thumbnail Container */}
      <div
        className={thumbnailContainerClasses}
        onClick={() => navigate(`/watch/${video.id}`)}
      >
        <img
          src={thumbnailUrl}
          alt={video.title}
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src || !target.src.startsWith('http')) return;

            if (video.thumbnailSource === 'manual' || video.thumbnailSource === 'frame') {
              const urlObj = new URL(target.src);
              const currentRetry = parseInt(urlObj.searchParams.get('retry-count') || '0');
              if (currentRetry < 10) {
                setTimeout(() => {
                  // Se falhou no host padrão, tenta o host customizado como plano B após 3 tentativas
                  if (currentRetry === 3 && urlObj.hostname.includes('581585')) {
                    urlObj.hostname = 'vz-614d418d-4cc.b-cdn.net';
                  } else if (currentRetry === 6 && urlObj.hostname.includes('614d418d-4cc')) {
                    urlObj.hostname = 'vz-581585.b-cdn.net'; // Volta pro original se o plano B também falhar
                  }

                  urlObj.searchParams.set('v', Date.now().toString());
                  urlObj.searchParams.set('retry-count', (currentRetry + 1).toString());
                  target.src = urlObj.toString();
                }, 3000);
              } else {
                target.src = `https://picsum.photos/seed/${video.id}/1280/720`;
              }
            } else {
              target.src = `https://picsum.photos/seed/${video.id}/1280/720`;
            }
          }}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />

        {/* Badges */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white px-1.5 py-0.5 rounded text-xs font-medium">
          {video.duration}
        </div>

        {video.thumbnailSource === 'ai' && (
          <div className="absolute top-2 right-2 bg-purple-600/90 text-white px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm">
            <Wand2 size={10} /> Capa IA
          </div>
        )}

        {/* Recomendação AI (Só no Grid) */}
        {!isList && (
          <div
            className="absolute top-2 left-2"
            onMouseEnter={() => setShowExplanation(true)}
            onMouseLeave={() => setShowExplanation(false)}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-black/60 backdrop-blur-sm p-1.5 rounded-full hover:bg-blue-600/80 transition-colors">
              <Sparkles size={14} className="text-blue-200" />
            </div>
            {showExplanation && (
              <div className={`absolute top-8 left-0 w-64 p-3 rounded-lg shadow-xl z-10 text-xs ${theme === 'dark' ? 'bg-zinc-900/95 border border-zinc-700' : 'bg-white/95 border border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={12} className="text-blue-400" />
                  <span className={`font-bold ${theme === 'dark' ? 'text-blue-100' : 'text-blue-900'}`}>Recomendação</span>
                </div>
                <p className={theme === 'dark' ? 'text-zinc-300' : 'text-gray-600'}>
                  {video.recommendationReason || "Baseado nos seus interesses."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Meta Info */}
      <div className={`flex gap-3 relative ${isList ? 'flex-1 pt-0' : ''}`}>
        {/* Avatar só aparece na esquerda no modo Grid */}
        {!isList && (
          <Link
            to={`/channel/${video.creator.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0"
          >
            <img
              src={video.creator.avatar}
              alt={video.creator.name}
              className="w-9 h-9 rounded-full mt-1 object-cover hover:opacity-80 transition-opacity"
            />
          </Link>
        )}

        <div className="flex-1 pr-6">
          <h3
            className={`${isList ? 'text-lg md:text-xl mb-1 line-clamp-2' : 'text-base line-clamp-2'} font-semibold group-hover:text-blue-500 transition-colors ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
            onClick={() => navigate(`/watch/${video.id}`)}
          >
            {video.title}
          </h3>

          <div className={`text-sm flex flex-wrap items-center gap-1 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>
            {!isList && (
              <Link
                to={`/channel/${video.creator.id}`}
                onClick={(e) => e.stopPropagation()}
                className={`hover:text-current transition-colors ${theme === 'dark' ? 'hover:text-white' : 'hover:text-black'}`}
              >
                {video.creator.name}
              </Link>
            )}

            {/* Metadata Line */}
            <div className="flex items-center gap-1">
              <span>{formatCompactNumber(video.views)} visualizações</span>
              <span className="text-[10px]">•</span>
              <span>{formatRelativeDate(video.uploadDate)}</span>
            </div>
          </div>

          {/* Dados do Canal no Modo Lista (aparece embaixo do título) */}
          {isList && (
            <div className="flex items-center gap-2 my-2">
              <Link to={`/channel/${video.creator.id}`} onClick={(e) => e.stopPropagation()} className="shrink-0">
                <img src={video.creator.avatar} className="w-6 h-6 rounded-full object-cover hover:opacity-80 transition-opacity" alt="" />
              </Link>
              <Link
                to={`/channel/${video.creator.id}`}
                onClick={(e) => e.stopPropagation()}
                className={`text-xs hover:text-current transition-colors ${theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-gray-600 hover:text-black'}`}
              >
                {video.creator.name}
              </Link>
            </div>
          )}

          {/* Descrição no Modo Lista */}
          {isList && (
            <p className={`text-xs line-clamp-2 mt-2 ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-600'}`}>
              {video.description}
            </p>
          )}

          {isList && video.relevanceScore !== undefined && (
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-900/30 border border-blue-900/50 text-[10px] text-blue-300">
              <Sparkles size={10} /> Relevância: {Math.floor(video.relevanceScore)}%
            </div>
          )}

          {/* Coração removido por solicitação do usuário */}
        </div>

        {/* Botão de Menu */}
        <div className="absolute top-0 right-0" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className={`opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full ${theme === 'dark' ? 'text-white hover:bg-zinc-800' : 'text-gray-900 hover:bg-gray-200'}`}
          >
            <MoreVertical size={20} />
          </button>

          {showMenu && (
            <div className={`absolute right-0 top-8 w-56 rounded-lg shadow-xl border overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'}`}>
              <button
                onClick={(e) => handleAction(e, 'ignore')}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 text-sm transition-colors ${theme === 'dark' ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <EyeOff size={16} /> Não recomendar este canal
              </button>
              <button
                onClick={(e) => handleAction(e, 'block')}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 text-sm transition-colors ${theme === 'dark' ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <Ban size={16} /> Bloquear canal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
