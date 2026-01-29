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

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({ video, autoPlay = false, onEnded, isFocusMode = false, children }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<any>(null);
  const hlsRef = useRef<Hls | null>(null);

  const isYouTube = video.videoUrl && (video.videoUrl.includes('youtube.com/embed') || video.videoUrl.includes('youtu.be'));

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

  // 1. CARREGAMENTO E AUTOPLAY
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || isYouTube) return;

    const source = getSourceUrl(selectedQuality);
    const isM3U8 = source.includes('.m3u8');

    setIsBuffering(true);

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
      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        const level = hls.levels[data.level];
        if (level) setCurrentResolution(`${level.height}p`);
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

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [video.videoUrl, selectedQuality, autoPlay]);

  // 2. EVENTOS E CONTROLES
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const onTimeUpdate = () => setCurrentTime(videoEl.currentTime);
    const onDurationChange = () => setDuration(videoEl.duration);
    const onBuffering = () => setIsBuffering(true);
    const onBufferEnd = () => setIsBuffering(false);
    const onPlay = () => { setIsPlaying(true); setIsBuffering(false); };
    const onPause = () => setIsPlaying(false);
    const onEndedEvent = () => onEnded?.();

    videoEl.addEventListener('timeupdate', onTimeUpdate);
    videoEl.addEventListener('durationchange', onDurationChange);
    videoEl.addEventListener('loadedmetadata', onDurationChange);
    videoEl.addEventListener('waiting', onBuffering);
    videoEl.addEventListener('playing', onPlay);
    videoEl.addEventListener('canplay', onBufferEnd);
    videoEl.addEventListener('play', onPlay);
    videoEl.addEventListener('pause', onPause);
    videoEl.addEventListener('ended', onEndedEvent);

    return () => {
      videoEl.removeEventListener('timeupdate', onTimeUpdate);
      videoEl.removeEventListener('durationchange', onDurationChange);
      videoEl.removeEventListener('loadedmetadata', onDurationChange);
      videoEl.removeEventListener('waiting', onBuffering);
      videoEl.removeEventListener('playing', onPlay);
      videoEl.removeEventListener('canplay', onBufferEnd);
      videoEl.removeEventListener('play', onPlay);
      videoEl.removeEventListener('pause', onPause);
      videoEl.removeEventListener('ended', onEndedEvent);
    };
  }, [onEnded]);

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
      <div ref={containerRef} className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
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
      className={`relative w-full aspect-video bg-black group overflow-hidden select-none flex items-center justify-center ${isFocusMode ? 'max-h-[90vh]' : 'rounded-xl shadow-2xl'}`}
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
          if (window.innerWidth < 768) {
            const now = Date.now();
            if (now - lastTapRef.current < 300) {
              const rect = e.currentTarget.getBoundingClientRect();
              seekRelative(e.clientX - rect.left > rect.width / 2 ? 10 : -10);
            } else {
              lastTapRef.current = now;
              setShowControls(true);
            }
          } else {
            togglePlay();
          }
        }}
        playsInline
      />

      {/* Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="w-12 h-12 border-4 border-white/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Skip Animation */}
      {skipFeedback.show && (
        <div className={`absolute inset-y-0 ${skipFeedback.direction === 'right' ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'} w-1/3 bg-white/10 flex flex-col items-center justify-center z-40 animate-pulse pointer-events-none`}>
          <div className="bg-black/40 p-4 rounded-full flex flex-col items-center gap-1">
            <ChevronRight size={32} className={skipFeedback.direction === 'left' ? 'rotate-180' : ''} />
            <span className="text-xs font-bold text-white">10s</span>
          </div>
        </div>
      )}

      {children}

      {/* Settings Menu */}
      {showSettings && (
        <div className="absolute bottom-20 right-4 bg-black/95 text-white rounded-xl overflow-hidden min-w-[200px] z-[60] border border-white/10 shadow-2xl animate-fade-in">
          {!showQualityMenu ? (
            <div className="py-2">
              <button onClick={() => setShowQualityMenu(true)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-2 text-sm"><Settings size={16} /> Qualidade</div>
                <div className="flex items-center gap-1 text-xs text-zinc-400">
                  {selectedQuality === 'Auto' ? `Auto (${currentResolution})` : selectedQuality} <ChevronRight size={14} />
                </div>
              </button>
            </div>
          ) : (
            <div className="py-2 max-h-[300px] overflow-y-auto">
              <button onClick={() => setShowQualityMenu(false)} className="w-full px-4 py-2 border-b border-white/10 mb-2 text-left text-xs font-bold uppercase text-zinc-400 hover:text-white">
                &lt; Voltar
              </button>
              <button onClick={() => { setSelectedQuality('Auto'); setShowQualityMenu(false); setShowSettings(false); }} className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/10 transition-colors">
                {selectedQuality === 'Auto' && <Check size={14} className="text-blue-500" />}
                <span className={selectedQuality === 'Auto' ? 'text-blue-500 font-bold' : ''}>Automático</span>
              </button>
              {qualities.map(q => (
                <button key={q} onClick={() => { setSelectedQuality(q); setShowQualityMenu(false); setShowSettings(false); }} className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/10 transition-colors">
                  {selectedQuality === q && <Check size={14} className="text-blue-500" />}
                  <span className={selectedQuality === q ? 'text-blue-500 font-bold' : ''}>{q}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTROLES */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 pb-4 pt-12 transition-opacity duration-300 z-50 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Timeline */}
        <div
          className="relative h-1.5 group/progress bg-white/20 rounded-full cursor-pointer mb-4 transition-all"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            if (videoRef.current) videoRef.current.currentTime = pos * duration;
          }}
        >
          <div className="absolute top-0 left-0 h-full bg-red-600 rounded-full transition-all duration-100" style={{ width: `${(currentTime / duration) * 100}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-red-600 rounded-full border-2 border-white opacity-0 group-hover/progress:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button onClick={togglePlay} className="text-white hover:text-red-500 transition-colors hover:scale-110 active:scale-95">
              {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
            </button>

            <div className="flex items-center gap-3 group/volume">
              <button onClick={toggleMute} className="text-white hover:text-blue-400 transition-colors">
                {isMuted || volume === 0 ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>
              <input
                type="range" min="0" max="1" step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover/volume:w-24 overflow-hidden transition-all accent-white h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="text-white text-sm font-mono tracking-wider">{formatTime(currentTime)} / {formatTime(duration)}</div>
          </div>

          <div className="flex items-center gap-5">
            <button onClick={() => { setShowSettings(!showSettings); setShowQualityMenu(false); }} className={`text-white transition-all ${showSettings ? 'rotate-90 text-blue-500 scale-110' : 'hover:rotate-45 hover:scale-110'}`}>
              <Settings size={22} />
            </button>
            <button onClick={toggleFullscreen} className="text-white hover:scale-125 transition-transform active:scale-90">
              {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default VideoPlayer;
