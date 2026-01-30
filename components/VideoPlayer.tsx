import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { Video } from '../types';
import Hls from 'hls.js';
import { imageService } from '../services/imageService';

/**
 * ⚡ VIDEO PLAYER V48 - STEALTH SYNC (FINAL)
 * - REMOVIDO TODO BOTÃO DE "CLIQUE PARA OUVIR"
 * - O vídeo inicia mudo (necessário para autoplay no Chrome/Safari)
 * - Assim que o usuário toca em qualquer parte do site, o som ativa sozinho
 */

export interface VideoPlayerRef {
  seek: (time: number) => void;
  playWithSound: () => void;
}

interface VideoPlayerProps {
  video: Video;
  autoPlay?: boolean;
  onEnded?: () => void;
  isFocusMode?: boolean;
  children?: React.ReactNode;
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({
  video,
  autoPlay = false,
  onEnded,
  isFocusMode = false,
  children
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false); // V49: Inicia com som ativado
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const isYouTube = video.videoUrl && (video.videoUrl.includes('youtube.com/embed') || video.videoUrl.includes('youtu.be'));

  // V48 - Função de desmudo silencioso
  const silentUnmute = () => {
    const v = videoRef.current;
    if (!v || !v.muted) return;

    v.muted = false;
    v.volume = 1.0;
    setIsMuted(false);
    // Tenta play caso tenha pausado por erro de autoplay
    v.play().catch(() => { });
  };

  useImperativeHandle(ref, () => ({
    seek: (time: number) => {
      if (videoRef.current && !isYouTube) videoRef.current.currentTime = time;
    },
    playWithSound: silentUnmute
  }));

  useEffect(() => {
    const v = videoRef.current;
    if (!v || isYouTube) return;

    // V49: Não forçamos mudo. Deixamos o hardware tentar o áudio real.
    v.volume = 1.0;

    const start = () => {
      if (video.videoUrl.includes('.m3u8') && Hls.isSupported()) {
        if (hlsRef.current) hlsRef.current.destroy();
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(video.videoUrl);
        hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          // V49: Tenta play direto com áudio
          if (autoPlay) v.play().then(() => {
            setIsPlaying(true);
            setIsMuted(false);
          }).catch(() => {
            // Se falhar (bloqueio do navegador), mudo apenas como último recurso para o vídeo não ficar parado
            v.muted = true;
            v.play().then(() => setIsPlaying(true));
          });
        });
      } else {
        v.src = video.videoUrl;
        if (autoPlay) v.play().then(() => {
          setIsPlaying(true);
          setIsMuted(false);
        }).catch(() => {
          v.muted = true;
          v.play().then(() => setIsPlaying(true));
        });
      }
    };

    start();

    // V48 GLOBAL SYNC - Escuta qualquer interação no site
    const handleGlobalInteraction = () => {
      if (v.muted && !v.paused) silentUnmute();
    };

    window.addEventListener('POWER_AUDIO_ON', handleGlobalInteraction);
    window.addEventListener('touchstart', handleGlobalInteraction, { passive: true });
    window.addEventListener('click', handleGlobalInteraction, { passive: true });

    const updatePlaying = () => setIsPlaying(!v.paused);
    const updateTime = () => setCurrentTime(v.currentTime);
    const updateMeta = () => setDuration(v.duration);
    const updateMuted = () => setIsMuted(v.muted);

    v.addEventListener('play', updatePlaying);
    v.addEventListener('pause', updatePlaying);
    v.addEventListener('timeupdate', updateTime);
    v.addEventListener('loadedmetadata', updateMeta);
    v.addEventListener('volumechange', updateMuted);
    v.addEventListener('ended', () => onEnded && onEnded());

    return () => {
      window.removeEventListener('POWER_AUDIO_ON', handleGlobalInteraction);
      window.removeEventListener('touchstart', handleGlobalInteraction);
      window.removeEventListener('click', handleGlobalInteraction);
      v.removeEventListener('play', updatePlaying);
      v.removeEventListener('pause', updatePlaying);
      v.removeEventListener('timeupdate', updateTime);
      v.removeEventListener('loadedmetadata', updateMeta);
      v.removeEventListener('volumechange', updateMuted);
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [video.id, autoPlay]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;

    if (v.paused) {
      v.muted = false; // Ao clicar manualmente, libera o som
      v.play().catch(() => {
        v.muted = true;
        v.play();
      });
    } else {
      v.pause();
    }
  };

  if (isYouTube) {
    return (
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
        <iframe
          src={`${video.videoUrl}?autoplay=${autoPlay ? 1 : 0}&mute=1`}
          className="absolute inset-0 w-full h-full"
          allowFullScreen
          allow="autoplay"
        />
        {children}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-video bg-black group overflow-hidden select-none flex items-center justify-center ${isFocusMode ? 'max-h-[85vh]' : 'rounded-xl shadow-2xl'}`}
      onMouseMove={() => {
        setShowControls(true);
        const timer = setTimeout(() => isPlaying && setShowControls(false), 3000);
        return () => clearTimeout(timer);
      }}
    >
      <video
        ref={videoRef}
        key={video.id}
        className="w-full h-full object-contain cursor-pointer"
        poster={imageService.getSmartThumbnail(video, 1280)}
        onClick={toggle}
        playsInline
      />

      {/* V48: SEM OVERLAYS OU BOTÕES NO MEIO DO VÍDEO */}

      {/* CONTROLES */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/40 to-transparent p-4 md:p-6 transition-all duration-300 z-50 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <div className="relative h-1 mb-6 bg-white/20 rounded-full cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            if (videoRef.current) videoRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
          }}>
          <div className="absolute top-0 left-0 h-full bg-blue-600" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={toggle} className="text-white hover:text-blue-400">
              {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
            </button>
            <button
              onClick={() => { if (videoRef.current) videoRef.current.muted = !videoRef.current.muted; }}
              className="text-white hover:text-blue-400"
            >
              {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
            <span className="text-white/40 font-mono text-xs">
              {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <button
            onClick={() => { if (!document.fullscreenElement) containerRef.current?.requestFullscreen(); else document.exitFullscreen(); }}
            className="text-white hover:text-blue-400"
          >
            {isFullscreen ? <Minimize size={28} /> : <Maximize size={28} />}
          </button>
        </div>
      </div>
      {children}
    </div>
  );
});

export default VideoPlayer;
