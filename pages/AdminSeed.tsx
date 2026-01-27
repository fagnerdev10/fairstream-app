
import React, { useState, useEffect } from 'react';
import { UserPlus, Info, Save, Film, Image as ImageIcon, Trash2, Sparkles, RefreshCw, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { videoService } from '../services/videoService';
import { authService } from '../services/authService';
import { seedService } from '../services/seedService';
import { generateAvatarSvgBase64 } from '../services/avatarSvgService';
import { User, Video } from '../types';
import { useSettings } from '../contexts/SettingsContext';

const AdminSeed: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme } = useSettings();

  // Limpeza de canais órfãos ao montar o componente
  useEffect(() => {
    seedService.cleanupOrphanedSeedUsers();
  }, []);

  // Custom Form State
  const [customChannel, setCustomChannel] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customCategory, setCustomCategory] = useState('Tecnologia');
  const [customDesc, setCustomDesc] = useState('');
  const [customVideoFile, setCustomVideoFile] = useState<File | null>(null);
  const [customThumbFile, setCustomThumbFile] = useState<File | null>(null);

  // Avatar AI State
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Helpers de Estilo
  const bgPage = theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600';
  const bgCard = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200';
  const inputBg = theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900';

  const handleGenerateAvatar = async () => {
    if (!customChannel || !customCategory) {
      alert("Preencha o nome do canal e a categoria primeiro.");
      return;
    }

    setIsGenerating(true);
    try {
      const avatarBase64 = await generateAvatarSvgBase64(customChannel, customCategory);
      setCustomAvatar(avatarBase64);
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar avatar.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Lógica de Injeção
  const injectSeed = async (
    channelName: string,
    videoTitle: string,
    description: string,
    category: string,
    files?: { video?: File, thumb?: File }
  ) => {
    try {
      // 1. Criar Usuário Falso (Canal)
      const allUsers = await authService.getAllUsers();
      let creator = allUsers.find(u => u.name === channelName && u.isSeed);

      if (!creator) {
        const newUserId = `seed_user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // Usa o avatar gerado pela IA se existir, senão usa o Dicebear
        const avatarUrl = customAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${channelName}`;

        const newUser: User = {
          id: newUserId,
          name: channelName,
          email: `${channelName.toLowerCase().replace(/\s/g, '')}@seed.fairstream.fake`,
          role: 'creator',
          isCreator: true,
          avatar: avatarUrl,
          interests: [],
          createdAt: new Date().toISOString(),
          isSeed: true,
          status: 'active',
          description: `Canal oficial ${channelName} (Perfil Gerado Automaticamente)`,
          channelMessage: "Bem-vindo ao meu canal!"
        };

        // CORREÇÃO: Pegar apenas os usuários locais para salvar, não todos
        const localUsersRaw = localStorage.getItem('fairstream_users_db_v4') || '[]';
        const localUsers = JSON.parse(localUsersRaw);
        const updatedLocalUsers = [...localUsers, newUser];
        localStorage.setItem('fairstream_users_db_v4', JSON.stringify(updatedLocalUsers));
        creator = newUser;
      }

      // 2. Criar Vídeo Falso
      const newVideoId = `seed_vid_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // URLs Simuladas ou Blobs
      let videoUrl = 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      if (files?.video) {
        videoUrl = URL.createObjectURL(files.video); // Nota: Blob URLs duram apenas a sessão
      }

      let thumbnailUrl = `https://picsum.photos/seed/${newVideoId}/1280/720`;
      if (files?.thumb) {
        const reader = new FileReader();
        reader.readAsDataURL(files.thumb);
        await new Promise(resolve => reader.onload = resolve);
        thumbnailUrl = reader.result as string;
      }

      const newVideo: Video = {
        id: newVideoId,
        title: videoTitle,
        description: description,
        thumbnailUrl: thumbnailUrl,
        thumbnailSource: 'random',
        videoUrl: videoUrl,
        sources: { '1080p': videoUrl },
        creator: creator,
        views: Math.floor(Math.random() * 50000) + 1000,
        uploadDate: 'Há 2 dias',
        duration: '10:00',
        tags: [category, 'Seed', 'Viral'],
        aiSummary: 'Conteúdo gerado via Painel do Dono.',
        isSeed: true,
        category: category,
        likes: Math.floor(Math.random() * 5000),
        chapters: []
      };

      await videoService.save(newVideo);

      alert('Perfil Personalizado Criado com Sucesso!');
      // Reset form
      setCustomChannel('');
      setCustomTitle('');
      setCustomDesc('');
      setCustomAvatar(null);
      setCustomVideoFile(null);
      setCustomThumbFile(null);

    } catch (error) {
      console.error(error);
      alert('Erro ao injetar seed.');
    }
  };

  const handleClearSeeds = () => {
    if (window.confirm("ATENÇÃO: Isso removerá TODOS os usuários e vídeos marcados como 'seed'. Deseja continuar?")) {
      seedService.removeAllSeedContent();
      alert("Limpeza concluída.");
      window.location.reload();
    }
  };

  const isAdmin = user?.role === 'owner' || user?.email === 'admin@fairstream.com';
  if (!user || !isAdmin) return <div className="p-10 text-center">Acesso Negado</div>;

  return (
    <div className={`min-h-screen p-6 ${bgPage}`}>
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Cabeçalho */}
        <div className="border-b border-zinc-700 pb-6">
          <h1 className={`text-3xl font-bold ${textPrimary} flex items-center gap-3`}>
            <UserPlus className="text-green-500" size={32} />
            Painel do Dono – Criar Perfis Falsos
          </h1>
          <p className={`${textSecondary} mt-2 text-lg`}>
            Gerencie e injete conteúdo "seed" (sementes) para popular a página inicial da plataforma.
          </p>
        </div>

        {/* Adicionar Novo Perfil Personalizado */}
        <section className={`rounded-xl border p-6 ${bgCard}`}>
          <h2 className={`text-xl font-bold ${textPrimary} mb-6 border-b border-zinc-800 pb-4`}>
            Adicionar Novo Perfil Personalizado
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">

              {/* AVATAR DO CANAL (COM GERAÇÃO SVG AUTOMÁTICO) */}
              <div className={`p-4 border rounded-xl flex items-center gap-4 ${theme === 'dark' ? 'bg-zinc-950 border-zinc-700' : 'bg-gray-100 border-gray-300'}`}>
                <div className="relative w-20 h-20 flex-shrink-0">
                  <img
                    src={customAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${customChannel || 'placeholder'}`}
                    alt="Avatar Preview"
                    className="w-full h-full rounded-full object-cover border-2 border-zinc-600 bg-zinc-800"
                  />
                  {isGenerating && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <RefreshCw className="animate-spin text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>Avatar do Canal (Auto)</label>
                  <button
                    onClick={handleGenerateAvatar}
                    disabled={isGenerating}
                    className="flex items-center gap-2 text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-bold transition-colors disabled:opacity-50"
                    title={!customChannel ? "Preencha o nome primeiro" : "Gerar Automático"}
                  >
                    <Wand2 size={14} />
                    {isGenerating ? 'Gerando...' : 'Gerar Estilo Google'}
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Nome do Canal</label>
                <input
                  type="text"
                  value={customChannel}
                  onChange={(e) => setCustomChannel(e.target.value)}
                  placeholder="Ex: Viajante Cósmico"
                  className={`w-full rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Título do Vídeo</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Ex: Minha viagem para Marte"
                  className={`w-full rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Categoria</label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className={`w-full rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors ${inputBg}`}
                >
                  <option>Tecnologia</option>
                  <option>Jogos</option>
                  <option>Vlogs</option>
                  <option>Educação</option>
                  <option>Culinária</option>
                  <option>Música</option>
                  <option>Esportes</option>
                  <option>Notícias</option>
                  <option>Viagens</option>
                  <option>Finanças</option>
                  <option>Fotografia</option>
                  <option>Fitness</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Descrição</label>
                <textarea
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  rows={4}
                  placeholder="Descreva o conteúdo do vídeo..."
                  className={`w-full rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors resize-none ${inputBg}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Arquivo de Vídeo (MP4)</label>
                  <div className={`relative w-full h-12 border border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-zinc-800 transition-colors ${theme === 'dark' ? 'border-zinc-700' : 'border-gray-300'}`}>
                    <input type="file" accept="video/mp4" onChange={(e) => setCustomVideoFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <span className="text-xs text-zinc-500 flex items-center gap-2">
                      <Film size={14} /> {customVideoFile ? customVideoFile.name : 'Selecionar'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textSecondary}`}>Capa (Thumbnail)</label>
                  <div className={`relative w-full h-12 border border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-zinc-800 transition-colors ${theme === 'dark' ? 'border-zinc-700' : 'border-gray-300'}`}>
                    <input type="file" accept="image/*" onChange={(e) => setCustomThumbFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <span className="text-xs text-zinc-500 flex items-center gap-2">
                      <ImageIcon size={14} /> {customThumbFile ? customThumbFile.name : 'Selecionar'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => injectSeed(customChannel, customTitle, customDesc, customCategory, { video: customVideoFile || undefined, thumb: customThumbFile || undefined })}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 mt-auto shadow-lg"
              >
                <Save size={18} /> ENVIAR PERFIL
              </button>
            </div>
          </div>
        </section>

        {/* Notas Técnicas (Rodapé) */}
        <section className={`p-6 rounded-xl border border-dashed ${theme === 'dark' ? 'border-yellow-900/50 bg-yellow-900/10' : 'border-yellow-200 bg-yellow-50'}`}>
          <h3 className="text-sm font-bold text-yellow-500 mb-4 flex items-center gap-2">
            <Info size={16} /> Notas Técnicas
          </h3>
          <ul className={`list-disc list-inside text-sm space-y-1 ${theme === 'dark' ? 'text-yellow-200/70' : 'text-yellow-800'}`}>
            <li><strong>Flag de Sistema:</strong> Todos os perfis criados nesta página serão salvos no banco de dados com a propriedade <code>isSeed: true</code>.</li>
            <li><strong>Comportamento:</strong> Eles aparecerão na Home e nas recomendações misturados com usuários reais, mas não terão login ativo.</li>
            <li><strong>Limpeza:</strong> Use a função "Limpar Seeds" abaixo para remover todos esses perfis de uma vez quando a plataforma tiver usuários reais suficientes.</li>
          </ul>

          <div className="mt-6 pt-4 border-t border-yellow-900/30 flex justify-end">
            <button
              onClick={handleClearSeeds}
              className="text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-2 hover:underline"
            >
              <Trash2 size={14} /> LIMPAR TODOS OS SEEDS
            </button>
          </div>
        </section>

      </div>
    </div>
  );
};

export default AdminSeed;
