import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, ChevronRight, Check } from 'lucide-react';
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

const estimateBandwidth = () => {
  // @ts-ignore
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection) {
    return connection.downlink;
  }
  return 10;
};

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({ video, autoPlay = false, onEnded, isFocusMode = false, children }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<any>(null);

  const isYouTube = video.videoUrl && (video.videoUrl.includes('youtube.com/embed') || video.videoUrl.includes('youtu.be'));

  useImperativeHandle(ref, () => ({
    seek: (time: number) => {
      if (videoRef.current && !isYouTube) {
        videoRef.current.currentTime = time;
        if (videoRef.current.paused) {
          videoRef.current.play().catch(() => { });
        }
      }
    }
  }));

  // Parse stored duration string (e.g. "05:30") to seconds for fallback
  const parseDuration = (str?: string) => {
    if (!str || !str.includes(':')) return 0;
    const parts = str.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1]; // MM:SS
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
    return 0;
  };

  const storedDurationSec = parseDuration(video.duration);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(storedDurationSec || 0); // Initialize with stored duration
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);

  const [selectedQuality, setSelectedQuality] = useState<VideoQualityLabel>('Auto');
  const [currentResolution, setCurrentResolution] = useState<string>('Auto');
  const [showSettings, setShowSettings] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const getSourceUrl = (quality: VideoQualityLabel): string => {
    if (quality === 'Auto') return video.videoUrl;
    if (video.sources && video.sources[quality]) {
      return video.sources[quality]!;
    }
    return video.videoUrl;
  };

  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const source = getSourceUrl(selectedQuality);
    const isM3U8 = source.includes('.m3u8');

    if (isM3U8) {
      if (Hls.isSupported()) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }

        const hls = new Hls({
          capLevelToPlayerSize: true,
          autoStartLoad: true
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn('[VideoPlayer] Erro de rede fatal, tentando recuperar...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn('[VideoPlayer] Erro de mídia fatal, tentando recuperar...');
                hls.recoverMediaError();
                break;
              default:
                console.error('[VideoPlayer] Erro fatal irrecuperável:', data);
                setIsBuffering(false);
                break;
            }
          }
        });

        hls.loadSource(source);
        hls.attachMedia(videoEl);
        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          // Sync quality levels if needed
          if (selectedQuality !== 'Auto') {
            const levelIndex = data.levels.findIndex(l => l.height === parseInt(selectedQuality));
            if (levelIndex !== -1) {
              hls.currentLevel = levelIndex;
            }
          }
          if (autoPlay) {
            videoEl.muted = true;
            videoEl.play().catch(() => { });
          }
        });
      } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = source;
      }
    } else {
      videoEl.src = source;
      if (autoPlay) {
        videoEl.muted = true; // Necessário para autoplay na maioria dos browsers
        videoEl.play().catch(err => console.warn('[VideoPlayer] Autoplay falhou:', err));
      }
    }

    // Listener para erros globais da tag <video>
    const handleGlobalError = (e: any) => {
      console.error('[VideoPlayer] Erro no carregamento do vídeo:', e);
      if (videoEl.error?.code === 4 || source.includes('b-cdn.net')) {
        // Provável 404 ou erro de transcodificação no Bunny
        setIsBuffering(true); // Mantém o spinner
        setTimeout(() => {
          if (videoEl.paused) {
            console.log('[VideoPlayer] Tentando recarregar vídeo após erro...');
            videoEl.load();
          }
        }, 5000);
      }
    };

    videoEl.addEventListener('error', handleGlobalError);

    return () => {
      videoEl.removeEventListener('error', handleGlobalError);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [video.videoUrl, autoPlay]); // Only reload on base URL change

  // Separate effect for quality switching without reload
  useEffect(() => {
    if (hlsRef.current && hlsRef.current.levels.length > 0) {
      if (selectedQuality === 'Auto') {
        hlsRef.current.currentLevel = -1; // Auto
      } else {
        const targetHeight = parseInt(selectedQuality);
        const levelIndex = hlsRef.current.levels.findIndex(l => l.height === targetHeight);
        if (levelIndex !== -1) {
          hlsRef.current.currentLevel = levelIndex;
        }
      }
    }
  }, [selectedQuality]);

  useEffect(() => {
    if (selectedQuality === 'Auto') {
      const checkBandwidth = () => {
        if (hlsRef.current && hlsRef.current.currentLevel !== -1) {
          const level = hlsRef.current.levels[hlsRef.current.currentLevel];
          if (level) {
            setCurrentResolution(`${level.height}p`);
            return;
          }
        }

        const speed = estimateBandwidth();
        let autoRes = '1080p';
        if (speed < 1) autoRes = '144p';
        else if (speed < 2) autoRes = '240p';
        else if (speed < 3.5) autoRes = '360p';
        else if (speed < 6) autoRes = '480p';
        else if (speed < 10) autoRes = '720p';
        else autoRes = '1080p';
        setCurrentResolution(autoRes);
      };
      checkBandwidth();
      const interval = setInterval(checkBandwidth, 5000);
      return () => clearInterval(interval);
    } else {
      setCurrentResolution(selectedQuality);
    }
  }, [selectedQuality]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const updateTime = () => setCurrentTime(videoEl.currentTime);
    const updateDuration = () => setDuration(videoEl.duration);
    const handleEnded = () => { if (onEnded) onEnded(); };
    const handleBuffer = () => setIsBuffering(true);
    const handleBufferEnd = () => setIsBuffering(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    videoEl.addEventListener('timeupdate', updateTime);
    videoEl.addEventListener('loadedmetadata', updateDuration);
    videoEl.addEventListener('ended', handleEnded);
    videoEl.addEventListener('waiting', handleBuffer);
    videoEl.addEventListener('playing', handleBufferEnd);
    videoEl.addEventListener('play', handlePlay);
    videoEl.addEventListener('pause', handlePause);

    return () => {
      videoEl.removeEventListener('timeupdate', updateTime);
      videoEl.removeEventListener('loadedmetadata', updateDuration);
      videoEl.removeEventListener('ended', handleEnded);
      videoEl.removeEventListener('waiting', handleBuffer);
      videoEl.removeEventListener('playing', handleBufferEnd);
      videoEl.removeEventListener('play', handlePlay);
      videoEl.removeEventListener('pause', handlePause);
    };
  }, [onEnded]);

  const togglePlay = async () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        try { await videoRef.current.play(); } catch (e) { }
      } else {
        videoRef.current.pause();
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time) || time === Infinity) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const qualities: VideoQualityLabel[] = ['1080p', '720p', '480p', '360p', '240p', '144p'];

  if (isYouTube) {
    return (
      <div
        ref={containerRef}
        className={`relative w-full aspect-video bg-black overflow-hidden group ${isFocusMode ? 'max-h-[85vh]' : ''}`}
      >
        <iframe
          src={`${video.videoUrl}?autoplay=${autoPlay ? 1 : 0}&modestbranding=1&rel=0`}
          title={video.title}
          className="absolute top-0 left-0 w-full h-full z-0"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        {/* Render overlays (Ads, Focus Button) on top of YouTube iframe */}
        {children}
      </div>
    );
  }

  // Mantém 16:9 exato e evita cortes na imagem usando object-contain
  const containerClasses = `relative w-full aspect-video bg-black group overflow-hidden select-none transition-all flex items-center justify-center ${isFocusMode ? 'max-h-[85vh]' : ''}`;

  const videoClasses = `w-full h-full object-contain cursor-pointer z-0`;

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className={videoClasses}
        poster={imageService.getSmartThumbnail(video, 1280)}
        onClick={togglePlay}
        playsInline
        muted={autoPlay}
      />

      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="w-12 h-12 border-4 border-white/30 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Children Elements (e.g. Ads) */}
      {children}

      {/* Settings Menu */}
      {showSettings && (
        <div className="absolute bottom-20 right-4 bg-black/90 text-white rounded-xl overflow-hidden min-w-[200px] z-50 border border-white/10 shadow-2xl">
          {!showQualityMenu ? (
            <div className="py-2">
              <button onClick={() => setShowQualityMenu(true)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/10">
                <div className="flex items-center gap-2 text-sm"><Settings size={16} /> Qualidade</div>
                <div className="flex items-center gap-1 text-xs text-zinc-400">
                  {selectedQuality === 'Auto' ? `Auto (${currentResolution})` : selectedQuality} <ChevronRight size={14} />
                </div>
              </button>
            </div>
          ) : (
            <div className="py-2">
              <button onClick={() => setShowQualityMenu(false)} className="w-full px-4 py-2 border-b border-white/10 mb-2 text-left text-xs font-bold uppercase text-zinc-400 hover:text-white">
                &lt; Voltar
              </button>
              <button onClick={() => { setSelectedQuality('Auto'); setShowQualityMenu(false); setShowSettings(false); }} className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/10">
                {selectedQuality === 'Auto' && <Check size={14} className="text-blue-500" />}
                <span className={selectedQuality === 'Auto' ? 'text-blue-500 font-bold' : ''}>Automático</span>
              </button>
              {qualities.map(q => (
                <button key={q} onClick={() => { setSelectedQuality(q); setShowQualityMenu(false); setShowSettings(false); }} className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/10">
                  {selectedQuality === q && <Check size={14} className="text-blue-500" />}
                  <span className={selectedQuality === q ? 'text-blue-500 font-bold' : ''}>{q}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Player Controls Container */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-4 pb-4 pt-12 transition-opacity duration-300 z-40 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

        {/* Timeline / Progress Bar */}
        <div className="relative group/progress h-1.5 hover:h-2.5 bg-white/20 rounded-full cursor-pointer mb-4 transition-all" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pos = (e.clientX - rect.left) / rect.width;
          if (videoRef.current) {
            videoRef.current.currentTime = pos * duration;
            setCurrentTime(pos * duration);
          }
        }}>
          <div className="absolute top-0 left-0 h-full bg-red-600 rounded-full" style={{ width: `${(currentTime / duration) * 100}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-red-600 rounded-full scale-0 group-hover/progress:scale-100 transition-transform shadow-lg border-2 border-white/20"></div>
          </div>
        </div>

        {/* Buttons Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button onClick={togglePlay} className="text-white hover:text-red-500 transition-colors transform active:scale-90">
              {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
            </button>

            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="text-white hover:text-zinc-300">
                {isMuted || volume === 0 ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>
              <input type="range" min="0" max="1" step="0.1" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-0 overflow-hidden group-hover/volume:w-24 transition-all accent-white h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer" />
            </div>

            <div className="text-white text-sm font-medium font-mono tracking-tight">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-5">
            <button onClick={() => { setShowSettings(!showSettings); setShowQualityMenu(false); }} className={`text-white transition-transform ${showSettings ? 'rotate-90 text-blue-500' : 'hover:rotate-45'}`}>
              <Settings size={22} />
            </button>
            <button onClick={toggleFullscreen} className="text-white hover:scale-110 transition-transform">
              {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default VideoPlayer;
