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

  const parseDuration = (str?: string) => {
    if (!str || !str.includes(':')) return 0;
    const parts = str.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  const storedDurationSec = parseDuration(video.duration);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(storedDurationSec || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(autoPlay); // Mudo se for autoplay
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);

  const [selectedQuality, setSelectedQuality] = useState<VideoQualityLabel>('Auto');
  const [currentResolution, setCurrentResolution] = useState<string>('Auto');
  const [showSettings, setShowSettings] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [skipFeedback, setSkipFeedback] = useState<{ show: boolean, direction: 'left' | 'right', amount: number }>({ show: false, direction: 'right', amount: 10 });
  const lastTapRef = useRef<number>(0);

  const hlsRef = useRef<Hls | null>(null);

  const getSourceUrl = (quality: VideoQualityLabel): string => {
    if (quality === 'Auto') return video.videoUrl;
    if (video.sources && video.sources[quality]) {
      return video.sources[quality]!;
    }
    return video.videoUrl;
  };

  // 1. GERENCIAMENTO DE SOURCE (HLS OU MP4)
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !video.videoUrl) return;

    const source = getSourceUrl(selectedQuality);
    const isM3U8 = source.includes('.m3u8');

    setIsBuffering(true);

    if (isM3U8) {
      if (Hls.isSupported()) {
        if (hlsRef.current) hlsRef.current.destroy();
        const hls = new Hls({ capLevelToPlayerSize: true, autoStartLoad: true });
        hlsRef.current = hls;

        hls.loadSource(source);
        hls.attachMedia(videoEl);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoPlay) {
            videoEl.muted = true;
            setIsMuted(true);
            videoEl.play().catch(() => { });
          }
        });
      } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = source;
      }
    } else {
      // MP4 DIRETO (Perfis Fake, etc)
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
  }, [video.videoUrl, selectedQuality]); // Recarrega se a URL base ou a qualidade (no caso de MP4) mudar

  // 2. LISTENERS DE EVENTOS DO VÍDEO
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const onTimeUpdate = () => setCurrentTime(videoEl.currentTime);
    const onLoadedMetadata = () => setDuration(videoEl.duration);
    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);
    const onPlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };
    const onPause = () => setIsPlaying(false);
    const onEnded = () => { if (onEnded) onEnded(); };

    videoEl.addEventListener('timeupdate', onTimeUpdate);
    videoEl.addEventListener('loadedmetadata', onLoadedMetadata);
    videoEl.addEventListener('waiting', onWaiting);
    videoEl.addEventListener('canplay', onCanPlay);
    videoEl.addEventListener('playing', onPlaying);
    videoEl.addEventListener('play', onPlaying);
    videoEl.addEventListener('pause', onPause);
    videoEl.addEventListener('ended', onEnded);

    return () => {
      videoEl.removeEventListener('timeupdate', onTimeUpdate);
      videoEl.removeEventListener('loadedmetadata', onLoadedMetadata);
      videoEl.removeEventListener('waiting', onWaiting);
      videoEl.removeEventListener('canplay', onCanPlay);
      videoEl.removeEventListener('playing', onPlaying);
      videoEl.removeEventListener('play', onPlaying);
      videoEl.removeEventListener('pause', onPause);
      videoEl.removeEventListener('ended', onEnded);
    };
  }, [onEnded]);

  // 3. OUTROS (Fullscreen, Bandwidth, Keyboard)
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePlay = async () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      try { await videoRef.current.play(); } catch (e) { }
    } else {
      videoRef.current.pause();
    }
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
    const val = Number(e.target.value);
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

  const formatTime = (time: number) => {
    if (!time || isNaN(time) || time === Infinity) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (isYouTube) {
    return (
      <div ref={containerRef} className={`relative w-full aspect-video bg-black overflow-hidden group ${isFocusMode ? 'max-h-[85vh]' : ''}`}>
        <iframe
          src={`${video.videoUrl}?autoplay=${autoPlay ? 1 : 0}&modestbranding=1&rel=0`}
          title={video.title}
          className="absolute top-0 left-0 w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        {children}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-video bg-black group overflow-hidden select-none transition-all flex items-center justify-center ${isFocusMode ? 'max-h-[90vh]' : ''}`}
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
        onClick={() => togglePlay()}
        playsInline
        muted={isMuted}
      />

      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="w-12 h-12 border-4 border-white/30 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      )}

      {children}

      {/* CONTROLES */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-4 pb-4 pt-12 transition-opacity duration-300 z-40 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Timeline */}
        <div className="relative h-1.5 hover:h-2.5 bg-white/20 rounded-full cursor-pointer mb-4 transition-all" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pos = (e.clientX - rect.left) / rect.width;
          if (videoRef.current) videoRef.current.currentTime = pos * duration;
        }}>
          <div className="absolute top-0 left-0 h-full bg-red-600 rounded-full" style={{ width: `${(currentTime / duration) * 100}%` }} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button onClick={togglePlay} className="text-white hover:text-red-500 transition-colors">
              {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
            </button>

            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="text-white hover:text-zinc-300">
                {isMuted || volume === 0 ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>
              <input type="range" min="0" max="1" step="0.1" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-24 accent-white h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer" />
            </div>

            <div className="text-white text-sm font-mono">{formatTime(currentTime)} / {formatTime(duration)}</div>
          </div>

          <div className="flex items-center gap-5">
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
