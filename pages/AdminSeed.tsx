import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, Info, Save, Film, Image as ImageIcon, Trash2, RefreshCw, Wand2, ShieldAlert, CheckCircle, Upload, Check, X, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { videoService } from '../services/videoService';
import { seedService } from '../services/seedService';
import { generateAvatarSvgBase64 } from '../services/avatarSvgService';
import { Video } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { r2Service } from '../services/r2Service';

const CORS_JSON_STRING = `[
  {
    "AllowedOrigins": ["*", "http://localhost:3000", "http://localhost:3001"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Range", "x-amz-request-id", "x-amz-id-2"],
    "MaxAgeSeconds": 3600
  }
]`;

function generateSafeUUID() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  } catch (e) {
    return Math.random().toString(36).substring(2, 10);
  }
}

const AdminSeed: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme } = useSettings();

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const [customChannel, setCustomChannel] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customCategory, setCustomCategory] = useState('Tecnologia');
  const [customDesc, setCustomDesc] = useState('');
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);

  const [customVideoFile, setCustomVideoFile] = useState<File | null>(null);
  const [customThumbFile, setCustomThumbFile] = useState<File | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showCorsHelp, setShowCorsHelp] = useState(false);

  // Estados de Diagnóstico
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await r2Service.testConnection();
      setTestResult(result);
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || "Erro desconhecido" });
    } finally {
      setIsTesting(false);
    }
  };

  const categories = [
    'Tecnologia', 'Jogos', 'Educação', 'Música', 'Esportes', 'Notícias', 'Viagens', 'Finanças',
    'Entretenimento', 'Vlogs', 'Cinema e TV', 'Humor', 'Podcast', 'Automotivo', 'Culinária',
    'Beleza e Moda', 'Religião e Espiritualidade', 'Ciência', 'Kids', 'Documentários',
    'Lifestyle', 'Animais', 'Arte e Cultura', 'Saúde', 'Política'
  ];


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
    setUploadProgress(0);

    try {
      const fakeUser = {
        id: generateSafeUUID(),
        name: customChannel,
        avatar: customAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${customChannel}`,
        isSeed: true,
        role: 'creator',
        isCreator: true
      };

      const newId = generateSafeUUID();
      let vUrl = 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      let tUrl = 'https://picsum.photos/seed/' + newId + '/1280/720';

      if (customThumbFile) {
        tUrl = await r2Service.uploadThumbnail(customThumbFile, newId);
      }

      if (customVideoFile) {
        vUrl = await r2Service.uploadVideo(customVideoFile, customVideoFile.name, (p) => setUploadProgress(p));
      }

      const newVideo: Video = {
        id: newId,
        title: customTitle,
        description: '[SEED_USER:' + JSON.stringify(fakeUser) + ']\n\n' + customDesc,
        thumbnailUrl: tUrl,
        videoUrl: vUrl,
        creator: fakeUser as any,
        views: Math.floor(Math.random() * 50000) + 500,
        uploadDate: new Date().toISOString(),
        duration: '10:00',
        tags: [customCategory, 'Seed'],
        category: customCategory,
        likes: Math.floor(Math.random() * 5000),
        isSeed: true,
        thumbnailSource: customThumbFile ? 'manual' : 'random'
      };

      await videoService.save(newVideo);
      alert('PERFIL ENVIADO COM SUCESSO! ✅');

      setCustomChannel('');
      setCustomTitle('');
      setCustomDesc('');
      setCustomAvatar(null);
      setCustomVideoFile(null);
      setCustomThumbFile(null);
      setUploadProgress(0);
    } catch (error: any) {
      console.error(error);
      alert('❌ ERRO NO ENVIO: ' + (error.message || 'Erro de conexão/CORS'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearSeeds = () => {
    if (window.confirm("Remover todos os vídeos seed?")) {
      seedService.removeAllSeedContent();
      window.location.reload();
    }
  };

  const isAdmin = user?.role === 'owner' || user?.email === 'admin@fairstream.com';
  if (!user || !isAdmin) return <div className="p-10 text-center text-white">Acesso Negado</div>;

  return (
    <div className="min-h-screen p-6 bg-[#0f0f0f]">
      <div className="max-w-6xl mx-auto space-y-10">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <UserPlus className="text-[#10b981]" size={32} />
              Painel do Dono
            </h1>
            <p className="text-zinc-500 mt-2">Injeção de conteúdo seed e diagnóstico de rede.</p>
          </div>

          <div className="flex items-center gap-4 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 shadow-xl">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">Relógio</span>
              <div className="flex items-center gap-2 mt-1 font-mono text-emerald-400 text-xs font-bold px-2">
                {currentTime.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>


        <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#10b981]" />
          <h2 className="text-lg font-bold text-white mb-8 pl-4">Injetar Novo Conteúdo</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

            <div className="space-y-8">
              <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl flex items-center gap-6">
                <div className="relative w-24 h-24 flex-shrink-0">
                  <img
                    alt="Avatar"
                    src={customAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${customChannel || 'placeholder'}`}
                    className="w-full h-full rounded-full object-cover border-4 border-zinc-800 shadow-xl"
                  />
                  {isGenerating && <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full"><RefreshCw className="animate-spin text-white" /></div>}
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[#10b981] mb-2 block tracking-wider">Avatar do Canal</label>
                  <button
                    onClick={handleGenerateAvatar}
                    disabled={isGenerating}
                    className="bg-[#10b981] hover:bg-[#059669] text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Wand2 size={16} /> {isGenerating ? 'Gerando...' : 'Gerar Estilo Google'}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block tracking-widest">Canal</label>
                  <input
                    type="text" value={customChannel} onChange={(e) => setCustomChannel(e.target.value)}
                    placeholder="Ex: Viajante Cósmico"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-white font-medium outline-none focus:border-[#10b981] transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block tracking-widest">Título</label>
                  <input
                    type="text" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Ex: Minha viagem para Marte"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-white font-medium outline-none focus:border-[#10b981] transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block tracking-widest">Categoria</label>
                  <select
                    value={customCategory} onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-white font-bold outline-none focus:border-[#10b981] transition-all"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-6 flex flex-col">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block tracking-widest">Descrição</label>
                <textarea
                  value={customDesc} onChange={(e) => setCustomDesc(e.target.value)} rows={4}
                  placeholder="Descreva o conteúdo do vídeo..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-white font-medium outline-none focus:border-[#10b981] transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* 🛠️ Barra de Diagnóstico R2 */}
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-200">Status da Conexão R2</h3>
                  <p className="text-xs text-slate-400">Valide suas credenciais e CORS antes de enviar</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {testResult && (
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 ${testResult.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                    {testResult.success ? <CheckCircle className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                    {testResult.message}
                  </div>
                )}

                <button
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-600"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Testar Conexão
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => videoInputRef.current?.click()}
                className={`w-full border-2 border-dashed p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${customVideoFile ? 'bg-green-900/20 border-[#10b981] text-[#10b981]' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}
              >
                <Film size={24} />
                <span className="text-[10px] font-bold">{customVideoFile ? customVideoFile.name : 'VÍDEO MP4'}</span>
              </button>
              <button
                onClick={() => thumbInputRef.current?.click()}
                className={`w-full border-2 border-dashed p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${customThumbFile ? 'bg-green-900/20 border-[#10b981] text-[#10b981]' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}
              >
                <ImageIcon size={24} />
                <span className="text-[10px] font-bold">{customThumbFile ? customThumbFile.name : 'CAPA IMG'}</span>
              </button>
            </div>

            <input type="file" accept="video/mp4" className="hidden" ref={videoInputRef} onChange={(e) => setCustomVideoFile(e.target.files?.[0] || null)} />
            <input type="file" accept="image/*" className="hidden" ref={thumbInputRef} onChange={(e) => setCustomThumbFile(e.target.files?.[0] || null)} />

            {isSaving && (
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div className="bg-[#10b981] h-full transition-all duration-300" style={{ width: String(uploadProgress) + '%' }} />
              </div>
            )}

            <button
              onClick={injectSeed}
              disabled={isSaving}
              className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-black py-5 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 mt-auto"
            >
              {isSaving ? <RefreshCw className="animate-spin" /> : <Save size={24} />}
              {isSaving ? 'ENVIANDO...' : 'ENVIAR PERFIL'}
            </button>
          </div>

          <div className="mt-8 flex justify-end">
            <button onClick={handleClearSeeds} className="text-red-500 hover:text-red-400 font-bold text-[10px] uppercase flex items-center gap-1 transition-colors">
              <Trash2 size={12} /> LIMPAR TODOS OS SEEDS
            </button>
          </div>
        </section>

        {showCorsHelp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
            <div className="bg-zinc-900 border border-emerald-500/30 rounded-3xl max-w-2xl w-full p-8 shadow-2xl animate-fade-in">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/20 rounded-2xl">
                    <ShieldAlert className="text-emerald-500" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Guia de Solução R2</h2>
                    <p className="text-zinc-500 text-sm">Siga os passos para liberar o acesso.</p>
                  </div>
                </div>
                <button onClick={() => setShowCorsHelp(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400"><X /></button>
              </div>

              <div className="space-y-6">
                <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl text-zinc-300 text-sm space-y-4">
                  <div>
                    <p className="text-emerald-400 font-bold uppercase tracking-widest text-[10px] mb-2">Passo 1: Cloudflare</p>
                    <p>Vá em <strong>R2 &gt; fairstream-media &gt; Settings &gt; CORS Policy</strong> e salve o JSON abaixo.</p>
                  </div>
                  <div className="border-t border-zinc-800 pt-4">
                    <p className="text-emerald-400 font-bold uppercase tracking-widest text-[10px] mb-2">Passo 2: Limpeza</p>
                    <p>Pressione <strong>CTRL + F5</strong> para garantir que o navegador não use regras antigas.</p>
                  </div>
                  <div className="border-t border-zinc-800 pt-4">
                    <p className="text-yellow-500 font-bold uppercase tracking-widest text-[10px] mb-2">Atenção</p>
                    <p>Certifique-se de que sua conta R2 está <strong>Ativada</strong> (requer cartão no painel da Cloudflare).</p>
                  </div>
                </div>
                <pre className="bg-black p-5 rounded-2xl border border-zinc-800 text-[10px] text-emerald-400 font-mono overflow-auto max-h-40">
                  {CORS_JSON_STRING}
                </pre>
                <div className="flex gap-4">
                  <button onClick={() => setShowCorsHelp(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-2xl">Fechar</button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(CORS_JSON_STRING); alert("Copiado!"); }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/20"
                  >
                    Copiar JSON
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSeed;
