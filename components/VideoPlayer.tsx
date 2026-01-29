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
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<any>(null);

  const isYouTube = video.videoUrl && (video.videoUrl.includes('youtube.com/embed') || video.videoUrl.includes('youtu.be'));

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(autoPlay); // Se tem autoplay, começa mudo
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);

  useImperativeHandle(ref, () => ({
    seek: (time: number) => {
      if (videoRef.current && !isYouTube) {
        videoRef.current.currentTime = time;
        if (videoRef.current.paused) videoRef.current.play().catch(() => { });
      }
    }
  }));

  // 1. GERENCIAMENTO DE FONTE E CARREGAMENTO
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || isYouTube) return;

    const source = video.videoUrl;
    const isM3U8 = source.includes('.m3u8');

    setIsBuffering(true);

    if (isM3U8 && Hls.isSupported()) {
      if (hlsRef.current) hlsRef.current.destroy();
      const hls = new Hls({ autoStartLoad: true });
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
    } else {
      // MP4 DIRETO OU HLS NATIVO (SAFARI)
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
  }, [video.videoUrl, autoPlay]);

  // 2. EVENTOS DE PLAYBACK E BUFFER
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);
    const handlePlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(videoEl.currentTime);
    const handleLoadedMetadata = () => setDuration(videoEl.duration);
    const handleEndedEvent = () => onEnded?.();

    videoEl.addEventListener('waiting', handleWaiting);
    videoEl.addEventListener('canplay', handleCanPlay);
    videoEl.addEventListener('playing', handlePlaying);
    videoEl.addEventListener('play', handlePlaying);
    videoEl.addEventListener('pause', handlePause);
    videoEl.addEventListener('timeupdate', handleTimeUpdate);
    videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoEl.addEventListener('ended', handleEndedEvent);

    return () => {
      videoEl.removeEventListener('waiting', handleWaiting);
      videoEl.removeEventListener('canplay', handleCanPlay);
      videoEl.removeEventListener('playing', handlePlaying);
      videoEl.removeEventListener('play', handlePlaying);
      videoEl.removeEventListener('pause', handlePause);
      videoEl.removeEventListener('timeupdate', handleTimeUpdate);
      videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoEl.removeEventListener('ended', handleEndedEvent);
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
          src={`${video.videoUrl}?autoplay=${autoPlay ? 1 : 0}&mute=${autoPlay ? 1 : 0}`}
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
      className={`relative w-full aspect-video bg-black group overflow-hidden select-none flex items-center justify-center ${isFocusMode ? 'max-h-[90vh]' : 'rounded-xl'}`}
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
        onClick={togglePlay}
        playsInline
        muted={isMuted}
        crossOrigin="anonymous"
      />

      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="w-12 h-12 border-4 border-white/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {children}

      {/* CONTROLES */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 pb-4 pt-12 transition-opacity duration-300 z-40 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Timeline */}
        <div
          className="relative h-1.5 bg-white/20 rounded-full cursor-pointer mb-4"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            if (videoRef.current) videoRef.current.currentTime = pos * duration;
          }}
        >
          <div className="absolute top-0 left-0 h-full bg-red-600 rounded-full" style={{ width: `${(currentTime / duration) * 100}%` }} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="text-white hover:text-red-500 transition-colors">
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>

            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-white hover:text-blue-500 transition-colors">
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range" min="0" max="1" step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 accent-blue-500 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="text-white text-xs font-mono">{formatTime(currentTime)} / {formatTime(duration)}</div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={toggleFullscreen} className="text-white hover:scale-110 transition-transform">
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default VideoPlayer;
