import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, ChevronRight, Check } from 'lucide-react';
import { Video, VideoQualityLabel } from '../types';
import Hls from 'hls.js';
import { imageService } from '../services/imageService';

/**
 * VIDEO PLAYER - VERSÃO NUCLEAR BRUTA
 * Fagner, fiz esse player para NÃO FALHAR.
 * - Controle direto do DOM para volume e mute (evita bloqueio do navegador).
 * - Sem spinner no início (elimina "loading infinito").
 * - Carregamento nativo ultra-veloz para MP4.
 */

export interface VideoPlayerRef {
  seek: (time: number) => void;
}

interface VideoPlayerProps {
  video: Video;
  autoPlay?: boolean;
  onEnded?: () => void;
  isFocusMode?: boolean;
  children?: React.ReactNode;
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({ video, autoPlay = false, onEnded, isFocusMode = false, children }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<any>(null);

  const isYouTube = video.videoUrl && (video.videoUrl.includes('youtube.com/embed') || video.videoUrl.includes('youtu.be'));

  // Estados
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(autoPlay);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);

  const [selectedQuality, setSelectedQuality] = useState<VideoQualityLabel>('Auto');
  const [currentResolution, setCurrentResolution] = useState<string>('Auto');
  const [showSettings, setShowSettings] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [skipFeedback, setSkipFeedback] = useState<{ show: boolean, direction: 'left' | 'right', amount: number }>({ show: false, direction: 'right', amount: 10 });

  useImperativeHandle(ref, () => ({
    seek: (time: number) => {
      if (videoRef.current && !isYouTube) {
        videoRef.current.currentTime = time;
        videoRef.current.play().catch(() => { });
      }
    }
  }));

  const getSourceUrl = (quality: VideoQualityLabel): string => {
    if (quality === 'Auto') return video.videoUrl;
    return (video.sources && video.sources[quality]) || video.videoUrl;
  };

  // 1. SINCRONIZAÇÃO TOTAL COM O DOM (FORÇADA)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // Sincroniza volume e mudo sempre que o estado mudar
    v.muted = isMuted;
    v.volume = volume;
  }, [isMuted, volume]);

  // 2. CICLO DE VIDA DO VÍDEO
  useEffect(() => {
    const v = videoRef.current;
    if (!v || isYouTube) return;

    const source = getSourceUrl(selectedQuality);
    const isM3U8 = source.includes('.m3u8');

    // Reset de interface
    setIsBuffering(false);
    setCurrentTime(0);

    const onPlay = () => setIsPlaying(true);
    const onPlaying = () => { setIsPlaying(true); setIsBuffering(false); };
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);
    const onTime = () => setCurrentTime(v.currentTime);
    const onMeta = () => setDuration(v.duration);

    v.addEventListener('play', onPlay);
    v.addEventListener('playing', onPlaying);
    v.addEventListener('pause', onPause);
    v.addEventListener('waiting', onWaiting);
    v.addEventListener('canplay', onCanPlay);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onMeta);
    if (onEnded) v.addEventListener('ended', onEnded);

    if (isM3U8 && Hls.isSupported()) {
      if (hlsRef.current) hlsRef.current.destroy();
      const hls = new Hls({ autoStartLoad: true });
      hlsRef.current = hls;
      hls.loadSource(source);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (selectedQuality !== 'Auto') {
          const lIndex = hls.levels.findIndex(l => l.height === parseInt(selectedQuality));
          if (lIndex !== -1) hls.currentLevel = lIndex;
        }
        if (autoPlay) {
          v.muted = true;
          setIsMuted(true);
          v.play().catch(() => { });
        }
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const level = hls.levels[data.level];
        if (level) setCurrentResolution(`${level.height}p`);
      });
    } else {
      // CARREGAMENTO NATIVO (ELIMINA TRAVA)
      v.src = source;
      v.load();
      if (autoPlay) {
        v.muted = true;
        setIsMuted(true);
        v.play().catch(() => { });
      }
    }

    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('playing', onPlaying);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('waiting', onWaiting);
      v.removeEventListener('canplay', onCanPlay);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onMeta);
      if (onEnded) v.removeEventListener('ended', onEnded);
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [video.videoUrl, selectedQuality]);

  // FUNÇÕES DE CONTROLE (CLIQUE DO USUÁRIO = FORÇA NO DOM)
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => { });
    } else {
      videoRef.current.pause();
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;

    // Força no DOM na hora (dentro do clique do usuario)
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);

    if (!nextMuted && volume === 0) {
      videoRef.current.volume = 0.5;
      setVolume(0.5);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const val = parseFloat(e.target.value);

    videoRef.current.volume = val;
    videoRef.current.muted = val === 0;

    setVolume(val);
    setIsMuted(val === 0);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  const seekRelative = (amount: number) => {
    if (!videoRef.current || isYouTube) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + amount));
    setSkipFeedback({ show: true, direction: amount > 0 ? 'right' : 'left', amount: 10 });
    setTimeout(() => setSkipFeedback(prev => ({ ...prev, show: false })), 600);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); seekRelative(10); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); seekRelative(-10); }
      else if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'f') { e.preventDefault(); toggleFullscreen(); }
      else if (e.key === 'm') { e.preventDefault(); toggleMute(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration, isMuted, volume]);

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (isYouTube) {
    return (
      <div ref={containerRef} className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
        <iframe
          src={`${video.videoUrl}?autoplay=${autoPlay ? 1 : 0}&mute=${autoPlay ? 1 : 0}&modestbranding=1&rel=0`}
          className="absolute inset-0 w-full h-full"
          allowFullScreen
          allow="autoplay"
        />
        {children}
      </div>
    );
  }

  const qualities: VideoQualityLabel[] = ['1080p', '720p', '480p', '360p', '240p', '144p'];

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-video bg-black group overflow-hidden select-none flex items-center justify-center transition-all duration-500 ${isFocusMode ? 'max-h-[90vh]' : 'rounded-xl shadow-2xl'}`}
      onMouseMove={() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        if (isPlaying) controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
      }}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        poster={imageService.getSmartThumbnail(video, 1280)}
        onClick={() => {
          if (window.innerWidth < 1024) setShowControls(!showControls);
          else togglePlay();
        }}
        playsInline
        preload="auto"
      />

      {/* BLOQUEIO ANTI-SPINNER (SÓ APARECE SE TIVER DURAÇÃO E ESTIVER BUFFERING) */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="w-12 h-12 border-4 border-white/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {/* FEEDBACK DE PULO */}
      {skipFeedback.show && (
        <div className={`absolute inset-y-0 ${skipFeedback.direction === 'right' ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'} w-1/4 bg-white/5 flex flex-col items-center justify-center z-40 duration-300 pointer-events-none`}>
          <div className="bg-black/60 p-4 rounded-full flex flex-col items-center border border-white/10">
            <ChevronRight size={32} className={`text-white ${skipFeedback.direction === 'left' ? 'rotate-180' : ''}`} />
            <span className="text-[10px] font-bold text-white uppercase mt-1">10s</span>
          </div>
        </div>
      )}

      {children}

      {/* CONFIGURAÇÕES ABAIXO */}
      {showSettings && (
        <div className="absolute bottom-20 right-4 bg-black/95 text-white rounded-xl overflow-hidden min-w-[200px] z-[60] border border-white/10 shadow-2xl animate-fade-in">
          {!showQualityMenu ? (
            <div className="py-2">
              <button onClick={() => setShowQualityMenu(true)} className="w-full px-4 py-3.3 flex items-center justify-between hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-2 text-sm font-medium"><Settings size={16} /> Qualidade</div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 bg-white/5 px-2 py-0.5 rounded">
                  {selectedQuality === 'Auto' ? `Auto (${currentResolution})` : selectedQuality} <ChevronRight size={14} />
                </div>
              </button>
            </div>
          ) : (
            <div className="py-2 max-h-[300px] overflow-y-auto custom-scrollbar">
              <button onClick={() => setShowQualityMenu(false)} className="w-full px-4 py-2 border-b border-white/10 mb-2 text-left text-[10px] font-bold uppercase text-zinc-500 hover:text-white">
                &lt; Voltar
              </button>
              <button key="auto" onClick={() => { setSelectedQuality('Auto'); setShowQualityMenu(false); setShowSettings(false); }} className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-white/10 ${selectedQuality === 'Auto' ? 'text-blue-500 font-bold bg-blue-500/5' : ''}`}>
                {selectedQuality === 'Auto' ? <Check size={14} /> : <div className="w-3.5" />}
                <span>Automático</span>
              </button>
              {qualities.map(q => (
                <button key={q} onClick={() => { setSelectedQuality(q); setShowQualityMenu(false); setShowSettings(false); }} className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-white/10 ${selectedQuality === q ? 'text-blue-500 font-bold bg-blue-500/5' : ''}`}>
                  {selectedQuality === q ? <Check size={14} /> : <div className="w-3.5" />}
                  <span>{q}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BARRA DE CONTROLES */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 md:p-6 pb-4 md:pb-6 pt-20 transition-all duration-500 z-50 ${showControls ? 'opacity-100' : 'opacity-0 translate-y-4 pointer-events-none'}`}>

        {/* PROGRESSO */}
        <div
          className="relative h-1.5 group/progress bg-white/20 rounded-full cursor-pointer mb-6 transition-all hover:h-2"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            if (videoRef.current) videoRef.current.currentTime = pos * duration;
          }}
        >
          <div className="absolute top-0 left-0 h-full bg-blue-600 rounded-full transition-all relative" style={{ width: `${(currentTime / duration) * 100}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,1)] scale-0 group-hover/progress:scale-100 transition-transform" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={togglePlay} className="text-white hover:text-blue-400 transition-all transform active:scale-90">
              {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
            </button>

            <div className="flex items-center gap-3 group/volume">
              <button onClick={toggleMute} className="text-white hover:text-blue-400 transition-colors">
                {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
              <div className="w-0 overflow-hidden group-hover/volume:w-24 transition-all duration-300 flex items-center">
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-24 accent-blue-500 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer hover:bg-white/50"
                />
              </div>
            </div>

            <div className="text-white text-xs font-black tracking-tighter opacity-90 select-none">
              <span className="text-blue-400">{formatTime(currentTime)}</span>
              <span className="mx-1 text-zinc-600">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-5 md:gap-7">
            <button
              onClick={() => { setShowSettings(!showSettings); setShowQualityMenu(false); }}
              className={`text-white transition-all transform hover:scale-110 ${showSettings ? 'rotate-90 text-blue-500' : 'hover:rotate-45'}`}
            >
              <Settings size={24} />
            </button>
            <button onClick={toggleFullscreen} className="text-white hover:text-blue-400 transition-all transform active:scale-75">
              {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default VideoPlayer;
