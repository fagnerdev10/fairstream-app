
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { Save, Radio, Youtube, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CreatorLive: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useSettings();
  const navigate = useNavigate();

  const [liveId, setLiveId] = useState('');
  const [savedId, setSavedId] = useState('');

  // Carrega ID salvo no perfil do usuário
  useEffect(() => {
    if (user?.liveId) {
      setLiveId(user.liveId);
      setSavedId(user.liveId);
    }
  }, [user]);

  const handleSave = async () => {
    if (user) {
      try {
        await authService.updateUser(user.id, { liveId });
        setSavedId(liveId);
        alert("ID da Live salvo no seu canal com sucesso!");
      } catch (error) {
        console.error("Erro ao salvar ID da live:", error);
        alert("Erro ao salvar ID da live no banco de dados.");
      }
    }
  };

  const bgPage = theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600';
  const cardBg = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200';
  const inputBg = theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900';

  if (!user) return null;

  return (
    <div className={`min-h-screen p-6 ${bgPage}`}>
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className={`text-2xl font-bold flex items-center gap-2 ${textPrimary}`}>
              <Radio className="text-red-600" /> Transmitir ao Vivo
            </h1>
            <p className={textSecondary}>Integre sua transmissão do YouTube diretamente na FairStream.</p>
          </div>
          <button
            onClick={() => navigate('/creator/live-guide')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${theme === 'dark' ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'border-gray-300 hover:bg-gray-100 text-gray-600'}`}
          >
            <Info size={16} /> Como Fazer?
          </button>
        </div>

        {/* Configuração */}
        <div className={`p-6 rounded-xl border ${cardBg}`}>
          <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>ID da Live do YouTube</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className={`flex-1 flex items-center px-4 rounded-lg border ${inputBg}`}>
              <Youtube size={20} className="text-red-600 mr-3 flex-shrink-0" />
              <input
                type="text"
                value={liveId}
                onChange={(e) => setLiveId(e.target.value)}
                placeholder="Ex: dQw4w9WgXcQ"
                className="w-full py-3 bg-transparent outline-none"
              />
            </div>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Save size={18} /> Salvar ID
            </button>
          </div>
          <p className={`text-xs mt-2 ${textSecondary}`}>
            Cole apenas o código final da URL (ex: youtube.com/watch?v=<b>ID_AQUI</b>).
          </p>
        </div>

        {/* Player Preview */}
        {savedId && (
          <div className="space-y-4">
            <h2 className={`text-xl font-bold ${textPrimary}`}>Pré-visualização da Transmissão</h2>
            <div className="aspect-video w-full rounded-xl overflow-hidden shadow-2xl bg-black">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${savedId}?autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </div>
            <div className={`p-4 rounded-lg border border-green-500/30 bg-green-500/10 text-green-500 text-sm flex items-center gap-2`}>
              <Radio size={16} className="animate-pulse" />
              Sua live está configurada e visível para os espectadores que acessarem seu perfil.
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CreatorLive;
