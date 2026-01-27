import React, { useEffect, useState } from 'react';
import { preferenceService } from '../services/preferenceService';
import { authService } from '../services/authService';
import { User } from '../types';
import { Unlock, ArrowLeft, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';

const BlockedChannels: React.FC = () => {
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { theme } = useSettings();

  const loadBlockedChannels = async () => {
    setLoading(true);
    try {
      // 1. Pega os IDs bloqueados do serviço correto
      const blockedIds = preferenceService.getBlockedChannels();
      
      if (blockedIds.length === 0) {
        setBlockedUsers([]);
        setLoading(false);
        return;
      }

      // 2. Busca todos os usuários para pegar nome e avatar
      const allUsers = await authService.getAllUsers();
      
      // 3. Filtra apenas os bloqueados
      const filtered = allUsers.filter(user => blockedIds.includes(user.id));
      setBlockedUsers(filtered);
    } catch (error) {
      console.error("Erro ao carregar canais bloqueados", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlockedChannels();
  }, []);

  const handleUnblock = (channelId: string) => {
    preferenceService.unblockChannel(channelId);
    // Atualiza a lista localmente
    setBlockedUsers(prev => prev.filter(user => user.id !== channelId));
    alert("Canal desbloqueado com sucesso.");
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
        <h1 className={`text-2xl font-bold flex items-center gap-2 ${textPrimary}`}>
          <UserX className="text-red-500" /> Canais Bloqueados
        </h1>
      </div>

      {loading ? (
        <div className={`text-center py-10 ${textSecondary}`}>Carregando...</div>
      ) : blockedUsers.length === 0 ? (
        <div className={`text-center py-20 border rounded-xl border-dashed ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-300'}`}>
          <UserX size={48} className={`mx-auto mb-4 opacity-20 ${textPrimary}`} />
          <p className={textSecondary}>Você não possui canais bloqueados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {blockedUsers.map(channel => (
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
                onClick={() => handleUnblock(channel.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <Unlock size={16} /> Desbloquear
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlockedChannels;