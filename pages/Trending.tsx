
import React, { useState, useEffect } from 'react';
import VideoCard from '../components/VideoCard';
import { videoService } from '../services/videoService';
import { preferenceService } from '../services/preferenceService';
import { Video } from '../types';
import { Flame } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

const Trending: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const { theme } = useSettings();

  const loadContent = async () => {
    const allVideos = await videoService.getAll();
    // Filter blocked/ignored channels AND Suspended Channels
    const filtered = allVideos.filter(v =>
      !preferenceService.isBlockedOrIgnored(v.creator.id) &&
      v.creator.status !== 'suspended'
    );
    const sorted = [...filtered].sort((a, b) => b.views - a.views);
    setVideos(sorted);
  };

  useEffect(() => {
    loadContent();
    window.addEventListener('preferences-updated', loadContent);
    // Escuta também atualizações globais de vídeo (incluindo bans)
    window.addEventListener('video-update', loadContent);

    return () => {
      window.removeEventListener('preferences-updated', loadContent);
      window.removeEventListener('video-update', loadContent);
    };
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-[2000px] mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-red-600/20 rounded-full">
          <Flame className="text-red-500" size={24} />
        </div>
        <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Em Alta</h1>
      </div>

      {videos.length === 0 ? (
        <div className={`text-center py-20 ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>
          Nenhum vídeo em alta disponível.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
          {videos.map((video, idx) => (
            <VideoCard key={`trending-${video.id}-${idx}`} video={video} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Trending;
