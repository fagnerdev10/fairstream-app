import React, { useEffect, useState } from 'react';
import { preferenceService } from '../services/preferenceService';
import { authService } from '../services/authService';
import { User } from '../types';
import { Eye, ArrowLeft, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';

const IgnoredChannels: React.FC = () => {
  const [ignoredUsers, setIgnoredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { theme } = useSettings();

  const loadIgnoredChannels = async () => {
    setLoading(true);
    try {
      // 1. Pega os IDs ignorados
      const ignoredIds = preferenceService.getIgnoredChannels();
      
      if (ignoredIds.length === 0) {
        setIgnoredUsers([]);
        setLoading(false);
        return;
      }

      // 2. Busca todos os usuários
      const allUsers = await authService.getAllUsers();
      
      // 3. Filtra apenas os ignorados
      const filtered = allUsers.filter(user => ignoredIds.includes(user.id));
      setIgnoredUsers(filtered);
    } catch (error) {
      console.error("Erro ao carregar canais ignorados", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIgnoredChannels();
  }, []);

  const handleUnignore = (channelId: string) => {
    preferenceService.unignoreChannel(channelId);
    setIgnoredUsers(prev => prev.filter(user => user.id !== channelId));
    alert("Canal voltará a ser recomendado.");
  };

  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600';
  const bgCard = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-gray-600'}`}
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${textPrimary}`}>
            <EyeOff className="text-zinc-500" /> Canais Não Recomendados
          </h1>
          <p className={`text-sm ${textSecondary}`}>
            Estes canais foram ocultados das suas recomendações.
          </p>
        </div>
      </div>

      {loading ? (
        <div className={`text-center py-10 ${textSecondary}`}>Carregando...</div>
      ) : ignoredUsers.length === 0 ? (
        <div className={`text-center py-20 border rounded-xl border-dashed ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-300'}`}>
          <EyeOff size={48} className={`mx-auto mb-4 opacity-20 ${textPrimary}`} />
          <p className={textSecondary}>Sua lista de canais ignorados está vazia.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ignoredUsers.map(channel => (
            <div key={channel.id} className={`flex items-center justify-between p-4 border rounded-xl shadow-sm transition-all ${bgCard}`}>
              <div className="flex items-center gap-4">
                <img
                  src={channel.avatar}
                  alt={channel.name}
                  className="w-12 h-12 rounded-full object-cover border border-zinc-700/30"
                />
                <div>
                  <p className={`font-bold text-lg ${textPrimary}`}>{channel.name}</p>
                  <p className={`text-xs ${textSecondary}`}>ID: {channel.id}</p>
                </div>
              </div>

              <button
                onClick={() => handleUnignore(channel.id)}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
              >
                <Eye size={16} /> Voltar a Recomendar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IgnoredChannels;