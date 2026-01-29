import React, { useState, useEffect } from 'react';
import { UserPlus, Info, Save, Film, Image as ImageIcon, Trash2, RefreshCw, Wand2, ShieldAlert, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { videoService } from '../services/videoService';
import { seedService } from '../services/seedService';
import { generateAvatarSvgBase64 } from '../services/avatarSvgService';
import { Video } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { supabase } from '../services/supabaseClient';

/**
 * PAINEL SEED V5 - SINCRONIZAÇÃO GLOBAL GARANTIDA
 * - Gerador de UUID manual para evitar erro de banco.
 * - Injeção de metadados na descrição para persistência sem FK.
 * - Logs detalhados para depuração.
 */

// Gerador de UUID Robusto (Fallback para browsers/ambientes sem crypto.randomUUID)
function generateSafeUUID() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  } catch (e) {
    return `seed-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  }
}

const AdminSeed: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme } = useSettings();

  useEffect(() => {
    seedService.cleanupOrphanedSeedUsers();
  }, []);

  const [customChannel, setCustomChannel] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customCategory, setCustomCategory] = useState('Tecnologia');
  const [customDesc, setCustomDesc] = useState('');
  const [customVideoFile, setCustomVideoFile] = useState<File | null>(null);
  const [customThumbFile, setCustomThumbFile] = useState<File | null>(null);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recentSyncs, setRecentSyncs] = useState<Array<{ id: string, title: string, status: 'success' | 'error', error?: string }>>([]);

  const bgPage = theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600';
  const bgCard = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200';
  const inputBg = theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900';

  const handleGenerateAvatar = async () => {
    if (!customChannel) { alert("Nome do canal é obrigatório."); return; }
    setIsGenerating(true);
    try {
      const avatarBase64 = await generateAvatarSvgBase64(customChannel, customCategory);
      setCustomAvatar(avatarBase64);
    } catch (error) {
      alert("Erro ao gerar avatar.");
    } finally {
      setIsGenerating(false);
    }
  };

  const injectSeed = async () => {
    if (!customChannel || !customTitle) {
      alert("Preencha ao menos o Nome do Canal e o Título do Vídeo.");
      return;
    }

    setIsSaving(true);
    try {
      console.log("🚀 [AdminSeed] Iniciando injeção global via descrição...");

      // 1. Dados do Usuário Fake
      const fakeUser = {
        name: customChannel,
        avatar: customAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${customChannel}`,
        isSeed: true,
        role: 'creator'
      };

      // 2. ID do Vídeo
      const newVideoId = generateSafeUUID();

      // 3. URLs do Vídeo (Big Buck Bunny como fallback garantido para Seed)
      const videoUrl = 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      const thumbnailUrl = `https://picsum.photos/seed/${newVideoId}/1280/720`;

      // 4. Metadados na Descrição (GARANTIA DE SINCRONIZAÇÃO GLOBAL)
      const metadata = `[SEED_USER:${JSON.stringify(fakeUser)}]`;
      const finalDescription = `${metadata}\n\n${customDesc}`;

      const newVideo: Video = {
        id: newVideoId,
        title: customTitle,
        description: finalDescription,
        thumbnailUrl: thumbnailUrl,
        videoUrl: videoUrl,
        creator: user as any, // Fagner como dono no banco
        views: Math.floor(Math.random() * 50000) + 500,
        uploadDate: new Date().toISOString(),
        duration: '10:00',
        tags: [customCategory, 'Seed'],
        category: customCategory,
        likes: Math.floor(Math.random() * 5000),
        isSeed: true,
        thumbnailSource: 'random',
        chapters: []
      };

      // 5. Salvar no Supabase
      const savedVideo = await videoService.save(newVideo);

      setRecentSyncs(prev => [{
        id: newVideoId,
        title: customTitle,
        status: 'success'
      }, ...prev].slice(0, 5));

      alert('CANAL CRIADO! 🎉\n\nEste canal agora é visível em QUALQUER dispositivo (celular, aba anônima, etc) através dos metadados globais na descrição.');

      setCustomChannel('');
      setCustomTitle('');
      setCustomDesc('');
      setCustomAvatar(null);
    } catch (error: any) {
      setRecentSyncs(prev => [{
        id: 'error-' + Date.now(),
        title: customTitle || 'Tentativa Falhou',
        status: 'error',
        error: error.message
      }, ...prev].slice(0, 5));
      alert(`ERRO DE SINCRONIZAÇÃO: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearSeeds = () => {
    if (window.confirm("Remover vídeos seed?")) {
      seedService.removeAllSeedContent();
      alert("Limpeza solicitada.");
      window.location.reload();
    }
  };

  const isAdmin = user?.role === 'owner' || user?.email === 'admin@fairstream.com';
  if (!user || !isAdmin) return <div className="p-10 text-center text-white">Acesso Negado</div>;

  return (
    <div className={`min-h-screen p-6 ${bgPage}`}>
      <div className="max-w-6xl mx-auto space-y-8">

        <div className="border-b border-zinc-800 pb-6">
          <h1 className={`text-4xl font-black ${textPrimary} flex items-center gap-4 tracking-tighter`}>
            <UserPlus className="text-blue-500" size={40} />
            SINCRONIZAÇÃO GLOBAL SEED
          </h1>
          <p className={`${textSecondary} mt-2 text-lg`}>
            Crie canais que aparecem para <strong>todos os usuários</strong> da plataforma instantaneamente.
          </p>
        </div>

        <section className={`rounded-3xl border-2 p-8 ${bgCard} shadow-2xl transition-all hover:border-blue-500/50`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className={`p-6 border-2 border-dashed rounded-3xl flex items-center gap-6 ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-gray-100 border-gray-300'}`}>
                <div className="relative w-24 h-24 flex-shrink-0 animate-pulse-slow">
                  <img
                    src={customAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${customChannel || 'placeholder'}`}
                    className="w-full h-full rounded-full object-cover border-4 border-zinc-800 shadow-xl bg-zinc-900"
                  />
                  {isGenerating && <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full"><RefreshCw className="animate-spin text-white" /></div>}
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase text-blue-500 mb-2 block tracking-widest">Avatar do Canal</label>
                  <button
                    onClick={handleGenerateAvatar}
                    disabled={isGenerating}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                  >
                    <Wand2 size={18} /> {isGenerating ? 'Gerando...' : 'Trocar Estilo'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-black text-zinc-500 uppercase mb-2 block tracking-widest">Nome do Canal</label>
                <input
                  type="text" value={customChannel} onChange={(e) => setCustomChannel(e.target.value)}
                  placeholder="Ex: Curiosidades do Mundo"
                  className={`w-full rounded-2xl px-5 py-4 font-bold text-lg outline-none focus:ring-4 focus:ring-blue-500/20 transition-all ${inputBg}`}
                />
              </div>

              <div>
                <label className="text-sm font-black text-zinc-500 uppercase mb-2 block tracking-widest">Título do Primeiro Vídeo</label>
                <input
                  type="text" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Ex: 10 coisas que você não sabia"
                  className={`w-full rounded-2xl px-5 py-4 font-bold text-lg outline-none focus:ring-4 focus:ring-blue-500/20 transition-all ${inputBg}`}
                />
              </div>
            </div>

            <div className="space-y-6 flex flex-col">
              <div>
                <label className="text-sm font-black text-zinc-500 uppercase mb-2 block tracking-widest">Categoria Global</label>
                <select
                  value={customCategory} onChange={(e) => setCustomCategory(e.target.value)}
                  className={`w-full rounded-2xl px-5 py-4 font-bold outline-none focus:ring-4 focus:ring-blue-500/20 transition-all ${inputBg}`}
                >
                  {['Tecnologia', 'Jogos', 'Educação', 'Música', 'Esportes', 'Notícias', 'Viagens', 'Finanças'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex-1">
                <label className="text-sm font-black text-zinc-500 uppercase mb-2 block tracking-widest">Descrição</label>
                <textarea
                  value={customDesc} onChange={(e) => setCustomDesc(e.target.value)} rows={5}
                  placeholder="Conteúdo do canal..."
                  className={`w-full rounded-2xl px-5 py-4 font-medium outline-none focus:ring-4 focus:ring-blue-500/20 transition-all resize-none ${inputBg}`}
                />
              </div>

              <button
                onClick={injectSeed}
                disabled={isSaving}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="animate-spin" /> : <Save size={24} />}
                {isSaving ? 'SINCRONIZANDO...' : 'LANÇAR CANAL GLOBALMENTE'}
              </button>
            </div>
          </div>
        </section>

        <div className="bg-red-600 text-white p-6 rounded-3xl text-center font-black uppercase tracking-tighter text-4xl mb-8 animate-pulse shadow-[0_0_50px_rgba(220,38,38,0.5)] border-4 border-white">
          FAGNER, O CÓDIGO LOCAL ESTÁ MUDANDO! (V21)
          <p className="text-xs mt-2 opacity-80 italic">Verifique os arquivos em Downloads\Colei COPY 23</p>
        </div>

        {/* PAINEL DE MONITORAMENTO V13 */}
        {recentSyncs.length > 0 && (
          <section className={`p-8 rounded-3xl border-2 ${bgCard} shadow-2xl animate-in slide-in-from-bottom duration-500`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-green-500/10 p-2 rounded-lg">
                <RefreshCw className="text-green-500" size={20} />
              </div>
              <h2 className="text-white font-black uppercase text-sm tracking-widest">Monitor de Sincronização Real</h2>
            </div>

            <div className="space-y-3">
              {recentSyncs.map(sync => (
                <div key={sync.id} className={`p-4 rounded-2xl flex items-center justify-between border ${theme === 'dark' ? 'bg-zinc-950/50' : 'bg-gray-50'} ${sync.status === 'success' ? 'border-green-500/30' : 'border-red-500/30'}`}>
                  <div className="flex items-center gap-3">
                    {sync.status === 'success' ? <CheckCircle className="text-green-500" size={20} /> : <ShieldAlert className="text-red-500" size={20} />}
                    <div>
                      <h4 className="font-bold text-sm text-white">{sync.title}</h4>
                      {sync.error && <p className="text-[10px] text-red-400 mt-0.5">{sync.error}</p>}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${sync.status === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {sync.status === 'success' ? 'Garantido no Banco' : 'Falhou'}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className={`p-8 rounded-3xl border-2 border-dashed ${theme === 'dark' ? 'border-zinc-800 bg-zinc-900/30' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex gap-4">
              <div className="bg-blue-500/10 p-3 rounded-2xl"><Info className="text-blue-500" size={24} /></div>
              <div>
                <h3 className="font-bold text-white uppercase text-sm tracking-widest">Por que é Global?</h3>
                <p className="text-zinc-500 text-sm mt-1">Os dados do canal são embutidos no banco de dados do Supabase. <br />Diferente do anterior, isto funciona em qualquer aba anônima ou celular.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={handleClearSeeds} className="text-zinc-500 hover:text-red-500 font-black text-xs uppercase tracking-widest flex items-center gap-2 px-6 py-4 border border-zinc-800 rounded-2xl hover:bg-red-500/5 transition-all">
                <Trash2 size={16} /> Limpar Seeds
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminSeed;
