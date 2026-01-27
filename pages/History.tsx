
import React, { useState, useEffect } from 'react';
import { videoService } from '../services/videoService';
import { Video } from '../types';
import { Clock, Trash2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const History: React.FC = () => {
  const navigate = useNavigate();
  const [historyVideos, setHistoryVideos] = useState<Video[]>([]);

  useEffect(() => {
    // Simula histórico pegando vídeos e revertendo
    const loadHistory = async () => {
      const all = await videoService.getAll();
      setHistoryVideos([...all].reverse());
    };
    loadHistory();
  }, []);

  const handleClearHistory = () => {
    alert("Histórico limpo com sucesso! (Simulação)");
    setHistoryVideos([]);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Clock className="text-zinc-400" size={24} />
          <h1 className="text-2xl font-bold">Histórico de Exibição</h1>
        </div>
        <button
          onClick={handleClearHistory}
          className="text-sm text-zinc-400 hover:text-red-400 flex items-center gap-1 px-3 py-1 hover:bg-zinc-800 rounded transition-colors"
        >
          <Trash2 size={16} /> Limpar tudo
        </button>
      </div>

      <div className="space-y-4">
        {historyVideos.map((video) => (
          <div
            key={`hist-${video.id}`}
            className="flex flex-col sm:flex-row gap-4 p-2 rounded-xl hover:bg-zinc-900 transition-colors cursor-pointer group"
            onClick={() => navigate(`/watch/${video.id}`)}
          >
            <div className="relative w-full sm:w-64 aspect-video flex-shrink-0 rounded-lg overflow-hidden">
              <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
              <span className="absolute bottom-1 right-1 bg-black/80 text-xs px-1 rounded font-medium text-white">
                {video.duration}
              </span>
              <div className="absolute bottom-0 left-0 h-1 bg-red-600 w-[80%]"></div>
            </div>

            <div className="flex-1 py-1">
              <h3 className="text-lg font-semibold line-clamp-2 text-white group-hover:text-blue-400 mb-1">
                {video.title}
              </h3>
              <div className="text-sm text-zinc-400 flex flex-col gap-1">
                <Link
                  to={`/channel/${video.creator.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:text-white transition-colors w-fit"
                >
                  {video.creator.name}
                </Link>
                <span className="text-xs text-zinc-500">
                  Visualizado agora mesmo
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-2 line-clamp-1 sm:line-clamp-2">
                {video.description}
              </p>
            </div>
          </div>
        ))}
        {historyVideos.length === 0 && (
          <div className="text-center text-zinc-500 py-10">Histórico vazio.</div>
        )}
      </div>
    </div>
  );
};

export default History;
