import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { Video } from '../types';
import Hls from 'hls.js';
import { imageService } from '../services/imageService';

/**
 * ⚡ VIDEO PLAYER - VERSÃO NUCLEAR V5 (ULTRA-RESILIENTE)
 * - LOGS AGRESSIVOS: Veja o console (F12) para depurar.
 * - PLAY FORÇADO: Botão visual se o navegador bloquear o autoplay.
 * - SOM GARANTIDO: Botão de ativação se iniciar mudo.
 */

console.log("%c >>> VIDEO PLAYER V5 BOOTING <<< ", "background: #000; color: #0f0; font-size: 20px; font-weight: bold;");

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
  // VERSÃO V20.1 - ESTE PLAYER ESTÁ ATUALIZADO

  // Estados Essenciais
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false); // Sempre tentar começar com SOM
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [autoplayFailed, setAutoplayFailed] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    seek: (time: number) => {
      console.log(`[V5] Seek para: ${time}`);
      if (videoRef.current && !isYouTube) {
        videoRef.current.currentTime = time;
        videoRef.current.play().catch(e => console.warn("[V5] Erro no seek play:", e));
      }
    }
  }));

  // LÓGICA DE CARREGAMENTO E EVENTOS
  useEffect(() => {
    const v = videoRef.current;
    if (!v || isYouTube) return;

    const source = video.videoUrl;
    console.log(`[V5] Carregando: ${source} (ID: ${video.id})`);

    const onPlay = () => { console.log("[V5] Evento: Play"); setIsPlaying(true); setAutoplayFailed(false); setVideoError(null); };
    const onPause = () => { console.log("[V5] Evento: Pause"); setIsPlaying(false); };
    const onTime = () => setCurrentTime(v.currentTime);
    const onMeta = () => { console.log("[V5] Metadados carregados, Duração:", v.duration); setDuration(v.duration); setVideoError(null); };
    const onError = (e: any) => {
      console.error("[V5] Erro no Vídeo:", v.error);
      setVideoError("Vídeo indisponível ou link inválido.");
    };

    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('error', onError);
    if (onEnded) v.addEventListener('ended', onEnded);

    v.volume = volume;
    v.muted = false; // V19: Força desmudo NATIVO no carregamento (HTML5 Style)

    const handlePlayAttempt = async () => {
      if (autoPlay) {
        console.log("[V5] Tentando Autoplay com SOM...");
        v.muted = false; // Primeiro tenta com som
        try {
          await v.play();
          setIsPlaying(true);
        } catch (error: any) {
          console.warn("[V5] Autoplay com som BLOQUEADO. Tentando MUDO...", error.name);
          v.muted = true; // Se falhou, muta e tenta de novo
          setIsMuted(true);
          try {
            await v.play();
            setIsPlaying(true);
            setAutoplayFailed(false);
          } catch (muteError) {
            console.error("[V5] Falha total no autoplay:", muteError);
            setAutoplayFailed(true);
          }
        }
      }
    };

    if (source.includes('.m3u8') && Hls.isSupported()) {
      if (hlsRef.current) hlsRef.current.destroy();
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(source);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, handlePlayAttempt);
    } else {
      v.src = source;
      v.load();
      handlePlayAttempt();
    }

    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('error', onError);
      if (onEnded) v.removeEventListener('ended', onEnded);
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [video.id]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      // Tenta tirar o mute se estiver pausado e o usuário clicou (gesto válido)
      if (isMuted) {
        videoRef.current.muted = false;
        setIsMuted(false);
        if (volume === 0) {
          videoRef.current.volume = 0.5;
          setVolume(0.5);
        }
      }
      videoRef.current.play().catch(e => {
        console.error("[V5] Erro no Play manual:", e);
        setAutoplayFailed(true);
      });
    } else {
      videoRef.current.pause();
    }
  };

  // SICRONIZAÇÃO DIRETA DE SOM (V18 - ESTILO HTML5 PURO)
  useEffect(() => {
    if (videoRef.current) {
      console.log(`[V18] Forçando Sound property: Muted=${isMuted}, Volume=${volume}`);
      videoRef.current.muted = isMuted;
      videoRef.current.volume = volume;
    }
  }, [isMuted, volume]);

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && volume === 0) {
      videoRef.current.volume = 0.5;
      setVolume(0.5);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => (videoRef.current as any)?.webkitEnterFullscreen?.());
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFS);
    return () => document.removeEventListener('fullscreenchange', handleFS);
  }, []);

  // MARTELO DO ÁUDIO V19: Desmudo absoluto em QUALQUER clique na página
  useEffect(() => {
    const hammerUnmute = () => {
      if (videoRef.current) {
        console.log("🔨 [Martelo do Áudio V19] Forçando desmudo nativo por clique global.");
        videoRef.current.muted = false;
        videoRef.current.volume = 1.0;
        setIsMuted(false);
        setVolume(1.0);
      }
    };
    document.addEventListener('click', hammerUnmute);
    return () => document.removeEventListener('click', hammerUnmute);
  }, []);

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (isYouTube) {
    return (
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
        <iframe
          src={`${video.videoUrl}?autoplay=${autoPlay ? 1 : 0}&mute=0&enablejsapi=1&modestbranding=1&rel=0`}
          className="absolute inset-0 w-full h-full"
          allowFullScreen
          allow="autoplay; encrypted-media; clipboard-write"
        />
        {children}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-video bg-black group overflow-hidden select-none flex items-center justify-center transition-all duration-300 ${isFocusMode ? 'max-h-[85vh] md:max-h-[90vh]' : 'rounded-xl shadow-2xl'}`}
      onMouseMove={() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        if (isPlaying) controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
      }}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        key={video.id}
        className="w-full h-full object-contain cursor-pointer bg-black"
        poster={imageService.getSmartThumbnail(video, 1280)}
        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
        playsInline
        preload="auto"
      />

      {/* FEEDBACK DE ERRO NO VÍDEO */}
      {videoError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-50 p-6 text-center">
          <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mb-4">
            <VolumeX size={32} className="text-red-500" />
          </div>
          <h2 className="text-white font-black text-xl uppercase mb-2">Ops! Falha ao carregar</h2>
          <p className="text-zinc-500 text-sm max-w-xs">{videoError}</p>
          <button onClick={() => window.location.reload()} className="mt-6 bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-xl text-xs font-bold transition-all">
            Tentar Novamente
          </button>
        </div>
      )}

      {/* BOTÃO DE PLAY FORÇADO (QUANDO O NAVEGADOR BLOQUEIA AUTOPLAY) */}
      {autoplayFailed && !isPlaying && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-[60] animate-fade-in pointer-events-auto">
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="w-24 h-24 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.6)] transition-all transform hover:scale-110 active:scale-95 border-4 border-white"
          >
            <Play size={48} fill="currentColor" className="ml-2" />
          </button>
          <h2 className="mt-6 text-white font-black text-2xl uppercase tracking-tighter drop-shadow-lg">Clique para Assistir AGORA</h2>
          <p className="text-zinc-400 text-sm mt-2">Vídeo carregado e pronto para reprodução.</p>
        </div>
      )}

      {/* OVERLAY DE SOM */}
      {isMuted && isPlaying && (
        <button
          onClick={(e) => { e.stopPropagation(); toggleMute(); }}
          className="absolute top-6 left-6 z-[70] bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full flex items-center gap-3 text-sm font-black shadow-2xl animate-bounce border-2 border-white/30"
        >
          <VolumeX size={22} /> ATIVAR SOM AGORA
        </button>
      )}

      {/* BUFFERING */}
      {!isPlaying && !autoplayFailed && duration === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-40">
          <div className="w-12 h-12 border-4 border-white/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {children}

      {/* CONTROLES */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-4 md:p-8 transition-all duration-500 z-50 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 translate-y-4 pointer-events-none'}`}>

        <div className="relative h-1.5 mb-8 bg-white/20 rounded-full cursor-pointer group/progress"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            if (videoRef.current) videoRef.current.currentTime = pos * duration;
          }}>
          <div className="absolute top-0 left-0 h-full bg-blue-500 rounded-full" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg scale-0 group-hover/progress:scale-100 transition-transform" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button onClick={togglePlay} className="text-white hover:text-blue-400 transition-all active:scale-90">
              {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
            </button>
            <div className="flex items-center gap-3 group/vol">
              <button onClick={toggleMute} className="text-white hover:text-blue-400">
                {isMuted || volume === 0 ? <VolumeX size={28} /> : <Volume2 size={28} />}
              </button>
              <input
                type="range" min="0" max="1" step="0.1" value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  if (videoRef.current) {
                    videoRef.current.volume = val;
                    videoRef.current.muted = val === 0;
                    setIsMuted(val === 0);
                  }
                }}
                className="w-0 group-hover/vol:w-24 transition-all accent-blue-500"
              />
            </div>
            <span className="text-white text-sm font-bold font-mono tracking-tighter">
              <span className="text-blue-500">{formatTime(currentTime)}</span>
              <span className="mx-2 text-zinc-600">/</span>
              <span className="text-zinc-400">{formatTime(duration)}</span>
            </span>
          </div>
          <button onClick={toggleFullscreen} className="text-white hover:text-blue-400 transition-all active:scale-75">
            {isFullscreen ? <Minimize size={28} /> : <Maximize size={28} />}
          </button>
        </div>
      </div>
    </div>
  );
});

export default VideoPlayer;
