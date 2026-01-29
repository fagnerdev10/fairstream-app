import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { Video, VideoQualityLabel } from '../types';
import Hls from 'hls.js';
import { imageService } from '../services/imageService';

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

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(autoPlay);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedQuality, setSelectedQuality] = useState<VideoQualityLabel>('Auto');
  const [currentResolution, setCurrentResolution] = useState<string>('Auto');
  const [showSettings, setShowSettings] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [skipFeedback, setSkipFeedback] = useState<{ show: boolean, direction: 'left' | 'right', amount: number }>({ show: false, direction: 'right', amount: 10 });

  const lastTapRef = useRef<number>(0);

  useImperativeHandle(ref, () => ({
    seek: (time: number) => {
      if (videoRef.current && !isYouTube) {
        videoRef.current.currentTime = time;
        if (videoRef.current.paused) videoRef.current.play().catch(() => { });
      }
    }
  }));

  const getSourceUrl = (quality: VideoQualityLabel): string => {
    if (quality === 'Auto') return video.videoUrl;
    if (video.sources && video.sources[quality]) {
      return video.sources[quality]!;
    }
    return video.videoUrl;
  };

  // UNIFIED LIFECYCLE EFFECT
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || isYouTube) return;

    const source = getSourceUrl(selectedQuality);
    const isM3U8 = source.includes('.m3u8');

    setLoadError(null);
    setIsBuffering(true);

    // Event Handlers
    const onPlaying = () => { setIsPlaying(true); setIsBuffering(false); };
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);
    const onTimeUpdate = () => setCurrentTime(videoEl.currentTime);
    const onDurationChange = () => setDuration(videoEl.duration);
    const onError = () => {
      console.error("[VideoPlayer] Error loading video source:", source);
      setLoadError("Erro ao carregar vídeo. Verifique sua conexão.");
      setIsBuffering(false);
    };

    // Attach listeners BEFORE setting source to catch early events
    videoEl.addEventListener('playing', onPlaying);
    videoEl.addEventListener('play', onPlaying);
    videoEl.addEventListener('pause', onPause);
    videoEl.addEventListener('waiting', onWaiting);
    videoEl.addEventListener('canplay', onCanPlay);
    videoEl.addEventListener('timeupdate', onTimeUpdate);
    videoEl.addEventListener('durationchange', onDurationChange);
    videoEl.addEventListener('loadedmetadata', onDurationChange);
    videoEl.addEventListener('error', onError);
    if (onEnded) videoEl.addEventListener('ended', onEnded);

    // Setup Source
    if (isM3U8 && Hls.isSupported()) {
      if (hlsRef.current) hlsRef.current.destroy();
      const hls = new Hls({ autoStartLoad: true });
      hlsRef.current = hls;
      hls.loadSource(source);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (selectedQuality !== 'Auto') {
          const lIndex = hls.levels.findIndex(l => l.height === parseInt(selectedQuality));
          if (lIndex !== -1) hls.currentLevel = lIndex;
        }
        if (autoPlay) {
          videoEl.muted = true;
          setIsMuted(true);
          videoEl.play().catch(() => { });
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const level = hls.levels[data.level];
        if (level) setCurrentResolution(`${level.height}p`);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error("[VideoPlayer] HLS fatal error:", data);
          setLoadError("Erro fatal no streaming HLS.");
        }
      });
    } else {
      videoEl.src = source;
      videoEl.load();
      if (autoPlay) {
        videoEl.muted = true;
        setIsMuted(true);
        videoEl.play().catch(() => { });
      }
    }

    // Safety check: if video is already ready but isBuffering is true
    const checkReady = setInterval(() => {
      if (videoEl.readyState >= 3 && isBuffering) {
        setIsBuffering(false);
      }
    }, 500);

    return () => {
      clearInterval(checkReady);
      videoEl.removeEventListener('playing', onPlaying);
      videoEl.removeEventListener('play', onPlaying);
      videoEl.removeEventListener('pause', onPause);
      videoEl.removeEventListener('waiting', onWaiting);
      videoEl.removeEventListener('canplay', onCanPlay);
      videoEl.removeEventListener('timeupdate', onTimeUpdate);
      videoEl.removeEventListener('durationchange', onDurationChange);
      videoEl.removeEventListener('loadedmetadata', onDurationChange);
      videoEl.removeEventListener('error', onError);
      if (onEnded) videoEl.removeEventListener('ended', onEnded);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [video.videoUrl, selectedQuality, autoPlay, onEnded]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) videoRef.current.play().catch(() => { });
    else videoRef.current.pause();
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      const nextMuted = val === 0;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  const seekRelative = (amount: number) => {
    if (videoRef.current && !isYouTube) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + amount));
      setSkipFeedback({ show: true, direction: amount > 0 ? 'right' : 'left', amount: 10 });
      setTimeout(() => setSkipFeedback(prev => ({ ...prev, show: false })), 600);
    }
  };

  // Accessibility & Shortcuts
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
    const h = Math.floor(time / 3600);
    const m = Math.floor((time % 3600) / 60);
    const s = Math.floor(time % 60);
    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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
      className={`relative w-full aspect-video bg-black group overflow-hidden select-none flex items-center justify-center transition-all duration-500 ${isFocusMode ? 'max-h-[90vh]' : 'rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)]'}`}
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
        onClick={(e) => {
          if (window.innerWidth < 1024) {
            const now = Date.now();
            if (now - lastTapRef.current < 300) {
              const rect = e.currentTarget.getBoundingClientRect();
              seekRelative(e.clientX - rect.left > rect.width / 2 ? 10 : -10);
            } else {
              lastTapRef.current = now;
              setShowControls(!showControls);
            }
          } else {
            togglePlay();
          }
        }}
        playsInline
        preload="auto"
      />

      {/* ERROR DISPLAY */}
      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-[100] bg-black/80 p-6 text-center">
          <AlertCircle size={48} className="text-red-500 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Ops! Algo deu errado</h3>
          <p className="text-zinc-400 text-sm mb-6 max-w-xs">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-white text-black rounded-full font-bold hover:bg-zinc-200 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* BUFFERING SPINNER */}
      {isBuffering && !loadError && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none bg-black/10">
          <div className="w-16 h-16 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
        </div>
      )}

      {/* SKIP FEEDBACK */}
      {skipFeedback.show && (
        <div className={`absolute inset-y-0 ${skipFeedback.direction === 'right' ? 'right-0 rounded-l-[100px]' : 'left-0 rounded-r-[100px]'} w-1/4 bg-blue-500/10 backdrop-blur-sm flex flex-col items-center justify-center z-40 animate-in fade-in zoom-in duration-300 pointer-events-none`}>
          <div className="bg-black/60 p-5 rounded-full flex flex-col items-center gap-2 border border-white/10">
            <ChevronRight size={32} className={`text-white transition-transform ${skipFeedback.direction === 'left' ? 'rotate-180' : ''}`} />
            <span className="text-sm font-black text-white">{skipFeedback.amount}s</span>
          </div>
        </div>
      )}

      {children}

      {/* SETTINGS MENU */}
      {showSettings && (
        <div className="absolute bottom-20 right-4 bg-[#0f0f0f]/95 backdrop-blur-xl text-white rounded-2xl overflow-hidden min-w-[240px] z-[60] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-2 fade-in duration-200">
          {!showQualityMenu ? (
            <div className="py-2">
              <div className="px-4 py-2 border-b border-white/5 mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Configurações</div>
              <button
                onClick={() => setShowQualityMenu(true)}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/5 transition-all group"
              >
                <div className="flex items-center gap-3 text-sm font-medium"><Settings size={18} className="text-zinc-400 group-hover:text-white" /> Qualidade</div>
                <div className="flex items-center gap-1.5 text-xs text-blue-500 font-bold bg-blue-500/10 px-2 py-1 rounded-md">
                  {selectedQuality === 'Auto' ? `Auto (${currentResolution})` : selectedQuality} <ChevronRight size={14} />
                </div>
              </button>
            </div>
          ) : (
            <div className="py-2 max-h-[350px] overflow-y-auto custom-scrollbar">
              <button onClick={() => setShowQualityMenu(false)} className="w-full px-4 py-3 border-b border-white/5 mb-2 text-left text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white flex items-center gap-2">
                <ChevronRight size={16} className="rotate-180" /> Voltar
              </button>
              <button onClick={() => { setSelectedQuality('Auto'); setShowQualityMenu(false); setShowSettings(false); }} className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between hover:bg-white/5 transition-all ${selectedQuality === 'Auto' ? 'bg-blue-500/10 text-blue-500' : ''}`}>
                <span className="font-medium">Automático</span>
                {selectedQuality === 'Auto' && <Check size={16} />}
              </button>
              {qualities.map(q => (
                <button key={q} onClick={() => { setSelectedQuality(q); setShowQualityMenu(false); setShowSettings(false); }} className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between hover:bg-white/5 transition-all ${selectedQuality === q ? 'bg-blue-500/10 text-blue-500' : ''}`}>
                  <span className="font-medium">{q}</span>
                  {selectedQuality === q && <Check size={16} />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTROLS OVERLAY */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 md:p-6 pb-4 md:pb-6 pt-20 transition-all duration-500 z-50 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>

        {/* PROGRESS BAR */}
        <div
          className="relative h-1.5 group/progress bg-white/10 rounded-full cursor-pointer mb-6 transition-all hover:h-2"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            if (videoRef.current) videoRef.current.currentTime = pos * duration;
          }}
        >
          {/* Buffer Bar */}
          <div className="absolute top-0 left-0 h-full bg-white/10 rounded-full transition-all duration-300" style={{ width: '0%' }} />

          {/* Progress Bar */}
          <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-75 relative" style={{ width: `${(currentTime / duration) * 100}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] scale-0 group-hover/progress:scale-100 transition-transform duration-200" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={togglePlay} className="text-white hover:text-blue-400 transition-all transform hover:scale-110 active:scale-90">
              {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
            </button>

            <div className="flex items-center gap-3 group/volume">
              <button onClick={toggleMute} className="text-white hover:text-blue-400 transition-all transform hover:scale-110">
                {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
              <div className="w-0 overflow-hidden group-hover/volume:w-24 transition-all duration-300 flex items-center">
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-24 accent-blue-500 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer hover:bg-white/30"
                />
              </div>
            </div>

            <div className="text-white text-sm font-black tracking-tighter opacity-80 select-none">
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
            <button onClick={toggleFullscreen} className="text-white hover:text-blue-400 transition-all transform hover:scale-125 active:scale-75">
              {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default VideoPlayer;
