
import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { CREATOR_STATS, MOCK_SUPPORT_TRANSACTIONS } from '../services/mockData';
import { DollarSign, Users, Heart, Video, Settings, HeartHandshake, Save, QrCode, Trash2, Edit, RefreshCw, TrendingUp, Ban, EyeOff, BarChart2, Camera, Upload, MessageSquare, Globe, Instagram, AlignLeft, AlertTriangle, MessageCircle, Mail, CheckCircle, Wand2, Loader2, X, Zap, ChevronRight, Clock, ArrowRight, Crown, CreditCard } from 'lucide-react';
import { User, Video as VideoType, Subscription, Message } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { videoService } from '../services/videoService';
import { adService } from '../services/adService';
import { pixService } from '../services/pixService';
import { SupportTransaction } from '../types';
import { preferenceService } from '../services/preferenceService';
import { authService } from '../services/authService';
import { supabase } from '../services/supabaseClient';
import { channelService } from '../services/channelService';
import { imageService } from '../services/imageService';
import { formatRelativeDate, formatCompactNumber } from '../services/utils';
import { messageService } from '../services/messageService';
import { generateAvatarVariations } from '../services/avatarSvgService';
import { useSettings } from '../contexts/SettingsContext';
import MembershipStats from '../components/MembershipStats';

const Dashboard: React.FC = () => {
  const { user, login, isLoading } = useAuth();
  const { theme } = useSettings();
  const navigate = useNavigate();
  // Adicionadas novas abas: messages, warnings
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'settings' | 'supporters' | 'messages' | 'warnings'>('overview');
  const [userSettings, setUserSettings] = useState<User | null>(null);
  const [myVideos, setMyVideos] = useState<VideoType[]>([]);

  // --- MESSAGES & WARNINGS STATE ---
  const [inboxMessages, setInboxMessages] = useState<Message[]>([]);
  const [warningMessages, setWarningMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);


  // --- REAL DATA FOR CREATOR MONETIZATION ---
  const [realViews, setRealViews] = useState(0);
  const [realRevenue, setRealRevenue] = useState(0);

  // --- MEMBERS STATE ---
  const [channelMembers, setChannelMembers] = useState<Subscription[]>([]);

  // --- STATS ADICIONAIS ---
  const [blockedCount, setBlockedCount] = useState(0);
  const [ignoredCount, setIgnoredCount] = useState(0);
  const [subscriberCount, setSubscriberCount] = useState(0);

  // --- FEEDBACK VISUAL ---
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

  // --- AVATAR SELECTION STATE ---
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [avatarOptions, setAvatarOptions] = useState<string[]>([]);
  const [membershipPrice, setMembershipPrice] = useState(9.90);
  const [userSupporters, setUserSupporters] = useState<SupportTransaction[]>([]);
  const [totalApuradoPix, setTotalApuradoPix] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate('/auth');
      } else {
        setUserSettings({
          ...user,
          socialLinks: user.socialLinks || {},
          channelMessage: user.channelMessage || '',
          description: user.description || ''
        });
        setMembershipPrice(Math.max(user.membershipPrice || 0, 9.90));
        loadMyVideos(user.id);

        adService.getAllSubscriptions().then(subs => {
          const myMembers = subs.filter(s => s.channelId === user.id);
          setChannelMembers(myMembers);
        });

        setBlockedCount(preferenceService.getBlockedChannels().length);
        setIgnoredCount(preferenceService.getIgnoredChannels().length);

        loadMessages(user.id);

        // Fetch Real Stats from Supabase
        loadRealStats(user.id);
      }
    }
  }, [user, isLoading, navigate]);

  const loadRealStats = async (userId: string) => {
    try {
      // 1. Visualizações Totais e Vídeos (Unificado via Service)
      // O videoService já combina Supabase + LocalStorage
      const myVideosList = await videoService.getByCreator(userId);
      const totalViews = myVideosList.reduce((acc, v) => acc + (v.views || 0), 0);
      setRealViews(totalViews);
      setMyVideos(myVideosList);

      // 2. Receita (Membros e Apoios)
      const { data: payments } = await supabase.from('payments').select('amount').eq('to_creator_id', userId).eq('status', 'completed');
      const totalRev = (payments || []).reduce((acc, p) => acc + (p.amount || 0), 0);
      setRealRevenue(totalRev);

      // 3. Inscritos (Async)
      const count = await channelService.getSubscriberCount(userId);
      setSubscriberCount(count);

      // 4. Apoiadores Pix (Real de verdade agora)
      const supporters = await pixService.getSupportTransactionsByCreator(userId);
      setUserSupporters(supporters);

      const totalPix = await pixService.getTotalSupportByCreator(userId);
      setTotalApuradoPix(totalPix);

    } catch (e) {
      console.error("Error loading real stats:", e);
    }
  };

  // Listen for global updates
  useEffect(() => {
    if (!user) return;

    const handleFollowsUpdate = async () => {
      const count = await channelService.getSubscriberCount(user.id);
      setSubscriberCount(count);
    };

    const handleMessagesUpdate = () => {
      loadMessages(user.id);
    };

    const handleSupportUpdate = () => {
      loadRealStats(user.id);
    };

    window.addEventListener('follows-update', handleFollowsUpdate);
    window.addEventListener('messages-update', handleMessagesUpdate);
    window.addEventListener('support-update', handleSupportUpdate);

    return () => {
      window.removeEventListener('follows-update', handleFollowsUpdate);
      window.removeEventListener('messages-update', handleMessagesUpdate);
      window.removeEventListener('support-update', handleSupportUpdate);
    };

  }, [user]);

  const loadMyVideos = async (userId: string) => {
    const videos = await videoService.getByCreator(userId);
    setMyVideos(videos);
  };

  const loadMessages = async (userId: string) => {
    // Para notificações de advertências, usa getMessages (só mensagens RECEBIDAS)
    const notifications = await messageService.getMessages(userId);
    setWarningMessages(notifications.filter(m => m.type === 'warning'));

    // Para o CHAT, usa getAllUserMessages (todas as mensagens enviadas e recebidas)
    const allMsgs = await messageService.getAllUserMessages(userId);
    setInboxMessages(allMsgs.filter(m => m.type !== 'warning'));
  };

  // Scroll automático para o final das mensagens
  useEffect(() => {
    if (activeTab === 'messages' && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [inboxMessages.length, activeTab]);

  const handleSendMessage = async () => {
    if (!user || !newMessageText.trim()) return;

    try {
      console.log('✉️ [Dashboard] Enviando mensagem para o suporte...', { from: user.id, text: newMessageText });

      const sent = await messageService.sendMessage({
        fromId: user.id,
        toId: 'admin', // Envia sempre para o Dono/Suporte
        fromName: user.name,
        subject: 'Contato do Criador',
        body: newMessageText,
        type: 'chat',
        fromRole: user.role,
        toRole: 'owner'
      });

      if (sent) {
        console.log('✅ [Dashboard] Mensagem enviada com sucesso!');
        setNewMessageText('');
        await loadMessages(user.id);
      } else {
        console.error('❌ [Dashboard] Falha ao enviar: Serviço retornou nulo');
        alert("Erro ao enviar mensagem. Tente novamente.");
      }
    } catch (e: any) {
      console.error('❌ [Dashboard] Erro fatal no envio:', e);
      alert("ERRO NO ENVIO: " + (e?.message || "Erro de conexão com o banco"));
    }
  };

  const markAsRead = async (msgId: string) => {
    await messageService.markAsRead(msgId);
    await loadMessages(user?.id || '');
  };

  const isDemoUser = user?.id === 'c1' || user?.email === 'demo@fairstream.com';

  const currentStats = isDemoUser ? CREATOR_STATS : {
    views: 0,
    qualifiedWatchTime: 0,
    communityScore: 100,
    estimatedRevenue: 0,
    subscriberGrowth: 0,
    dates: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    revenueData: [0, 0, 0, 0, 0, 0],
    engagementData: [0, 0, 0, 0, 0, 0]
  };

  const data = currentStats.dates.map((date, index) => ({
    name: date,
    revenue: currentStats.revenueData[index],
    engagement: currentStats.engagementData[index],
    views: Math.floor(currentStats.revenueData[index] * 10)
  }));


  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const handleSaveSettings = async () => {
    if (!user || !userSettings) return;

    if (membershipPrice < 9.90) {
      alert("O valor mínimo para o Clube de Membros é R$ 9,90.");
      return;
    }

    try {
      setIsSavingSettings(true);
      console.log('☁️ [Dashboard] Iniciando salvamento no Supabase...');

      let finalAvatar = userSettings.avatar;

      // Se o avatar for um dataUrl (nova imagem), faz upload para Storage
      if (finalAvatar && finalAvatar.startsWith('data:')) {
        console.log('📤 [Dashboard] Enviando avatar para Storage...');
        const response = await fetch(finalAvatar);
        const blob = await response.blob();
        finalAvatar = await imageService.uploadToSupabase(blob, 'avatars', `avatar_${user.id}`);

        if (!finalAvatar) {
          throw new Error("Falha ao subir a imagem para o servidor. Verifique sua conexão ou configurações do R2.");
        }
        console.log('✅ [Dashboard] Avatar enviado:', finalAvatar);
      }

      const updatedUser = await authService.updateUser(user.id, {
        name: userSettings.name,
        description: userSettings.description,
        channelMessage: userSettings.channelMessage,
        socialLinks: userSettings.socialLinks,
        avatar: finalAvatar,
        membershipPrice
      });

      console.log('✅ [Dashboard] Sucesso: Configurações persistidas');

      // Sincroniza estado para a UI
      setUserSettings(updatedUser);
      login(updatedUser);

      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (e: any) {
      console.error('❌ [Dashboard] Falha ao salvar:', e);
      alert("ERRO AO SALVAR NO BANCO: " + (e?.message || "Erro de conexão. Verifique se as colunas existem no banco (Rode o SQL V27)"));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Otimiza para perfil: 256px, WebP, 0.8 quality
      const optimizedBlob = await imageService.optimizeImage(file, 256, 0.8);

      const reader = new FileReader();
      reader.onloadend = () => {
        setUserSettings(prev => prev ? ({ ...prev, avatar: reader.result as string }) : null);
      };
      reader.readAsDataURL(optimizedBlob);
    } catch (err) {
      console.error("Erro ao processar avatar:", err);
      alert("Erro ao processar imagem.");
    }
  };

  const handleOpenAvatarGenerator = async () => {
    if (!userSettings?.name) return;

    setIsGeneratingAvatar(true);
    setAvatarOptions([]); // Limpa anteriores

    try {
      const category = userSettings.interests?.[0] || 'Geral';
      // Gera 6 variações
      const options = await generateAvatarVariations(userSettings.name, category, 6);
      setAvatarOptions(options);
      setShowAvatarSelector(true);
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar opções de avatar.");
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  const handleSelectAvatar = (avatarUrl: string) => {
    setUserSettings(prev => prev ? ({ ...prev, avatar: avatarUrl }) : null);
    setShowAvatarSelector(false);
  };

  const handleEditVideo = (videoId: string) => {
    navigate(`/upload?edit=${videoId}`);
  };

  const handleDeleteVideo = (id: string) => {
    // Exclusão direta para evitar bloqueio de popup
    // if (window.confirm("...")) {
    console.log("Excluindo vídeo:", id);

    // 1. Atualiza UI imediatamente (Otimista)
    setMyVideos(current => current.filter(v => String(v.id) !== String(id)));

    // 2. Chama serviço (que agora persiste exclusão de Mocks)
    videoService.delete(id);

    // 3. Pequeno delay e recarrega para garantir sincronia
    setTimeout(() => {
      if (user) loadMyVideos(user.id);
    }, 100);

    // Feedback visual não intrusivo (opcional, mas bom para debug agora)
    // alert("Vídeo excluído.");
    // }
  };

  const handleRowClick = (e: React.MouseEvent, videoId: string) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    navigate(`/watch/${videoId}`);
  };

  const handleManageComments = (videoId: string) => {
    navigate(`/creator/video/${videoId}`);
  };

  const StatCard = ({ icon: Icon, label, value, subtext, color }: any) => (
    <div className={`border p-6 rounded-xl w-full ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-500'}`}>{label}</p>
          <h3 className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{value}</h3>
        </div>
        <div className={`p-2 rounded-lg ${color.split(' ')[0]}/20`}>
          <Icon size={24} className={color.split(' ')[1]} />
        </div>
      </div>
      <p className="text-xs text-zinc-500">{subtext}</p>
    </div>
  );

  const inputBg = theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900';
  const labelColor = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600';

  if (isLoading || !user || !userSettings) return <div className="p-10 text-center">Carregando painel...</div>;

  const unreadWarnings = warningMessages.filter(m => !m.read).length;
  const unreadMessagesCount = inboxMessages.filter(m => !m.read && m.toId === user.id).length;

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto w-full space-y-8 relative">

      {/* MODAL DE SELEÇÃO DE AVATAR */}
      {showAvatarSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className={`w-full max-w-2xl p-6 rounded-xl shadow-2xl relative ${theme === 'dark' ? 'bg-zinc-900 border border-zinc-700' : 'bg-white border border-gray-200'}`}>
            <button
              onClick={() => setShowAvatarSelector(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-red-500 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Escolha seu Avatar</h2>
            <p className="text-zinc-500 text-sm mb-6">Selecione uma das opções geradas abaixo ou gere novamente para ver mais.</p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {avatarOptions.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectAvatar(opt)}
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${theme === 'dark' ? 'border-zinc-700 hover:border-blue-500' : 'border-gray-200 hover:border-blue-500'}`}
                >
                  <img src={opt} alt={`Opção ${idx + 1}`} className="w-full h-full object-cover bg-zinc-100" />
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAvatarSelector(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${theme === 'dark' ? 'text-zinc-300 hover:bg-zinc-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Cancelar
              </button>
              <button
                onClick={handleOpenAvatarGenerator}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={16} /> Gerar Outros
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Painel do Criador</h1>
        <p className="text-zinc-500">Visão geral da sua performance e monetização justa.</p>
        <p className="text-sm text-zinc-500 mt-1">Bem-vindo, {user.name}</p>
      </div>

      <div className={`flex gap-4 border-b overflow-x-auto w-full pb-1 custom-scrollbar ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
        <button onClick={() => setActiveTab('overview')} className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'border-red-600 text-red-600' : 'border-transparent text-zinc-500'}`}>Visão Geral</button>
        <button onClick={() => setActiveTab('videos')} className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'videos' ? 'border-red-600 text-red-600' : 'border-transparent text-zinc-500'}`}>Seus Vídeos</button>
        <button onClick={() => setActiveTab('supporters')} className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'supporters' ? 'border-red-600 text-red-600' : 'border-transparent text-zinc-500'}`}>Apoiadores Pix ({userSupporters.length})</button>

        <button onClick={() => setActiveTab('messages')} className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1 ${activeTab === 'messages' ? 'border-red-600 text-red-600' : 'border-transparent text-zinc-500'}`}>Mensagens {unreadMessagesCount > 0 && <span className="bg-blue-500 text-white text-[10px] px-1.5 rounded-full">{unreadMessagesCount}</span>}</button>
        <button onClick={() => setActiveTab('warnings')} className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1 ${activeTab === 'warnings' ? 'border-red-600 text-red-600' : 'border-transparent text-zinc-500'}`}>Advertências {unreadWarnings > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{unreadWarnings}</span>}</button>
        <button onClick={() => setActiveTab('settings')} className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'border-red-600 text-red-600' : 'border-transparent text-zinc-500'}`}>Configurações</button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fade-in w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            <StatCard icon={Video} label="Total de Vídeos" value={myVideos.length} subtext="Publicados no canal" color="bg-blue-500 text-blue-500" />
            <StatCard icon={Users} label="Inscritos" value={formatCompactNumber(subscriberCount)} subtext="Total de seguidores" color="bg-red-500 text-red-500" />
            <StatCard icon={EyeOff} label="Canais Ignorados" value={ignoredCount} subtext="Suas preferências pessoais" color="bg-orange-500 text-orange-500" />
            <StatCard icon={TrendingUp} label="Visualizações Totais" value={formatCompactNumber(realViews)} subtext="Acumuladas em todos os vídeos" color="bg-blue-600 text-blue-600" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            <StatCard icon={DollarSign} label="Receita PENDENTE" value={`R$ ${realRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} subtext="Aguardando fechamento do mês" color="bg-green-600 text-green-600" />
            <StatCard icon={Heart} label="Score da Comunidade" value={100} subtext="Engajamento saudável" color="bg-purple-500 text-purple-500" />
          </div>

          <div
            onClick={() => navigate('/dashboard/financial')}
            className={`group cursor-pointer relative overflow-hidden border p-8 rounded-2xl flex items-center justify-between transition-all hover:shadow-2xl hover:shadow-green-500/10 hover:border-green-600/30 active:scale-95 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}
          >
            {/* Background Decorative Element */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-green-600/5 rounded-full blur-3xl group-hover:bg-green-600/10 transition-colors" />

            <div className="flex items-center gap-6 relative z-10">
              <div className="bg-gradient-to-br from-green-500 to-green-700 p-4 rounded-xl shadow-lg shadow-green-600/20 group-hover:scale-110 transition-transform">
                <DollarSign className="text-white" size={28} />
              </div>
              <div>
                <h3 className={`text-2xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Painel Financeiro <span className="text-green-500">Completo</span>
                </h3>
                <p className="text-zinc-500 font-medium text-sm mt-1">Gerencie seus ganhos e repasses automáticos em tempo real.</p>

                <div className="flex flex-wrap gap-3 mt-4">
                  <span className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg font-bold border transition-colors ${theme === 'dark' ? 'bg-zinc-800/50 border-zinc-700 text-zinc-400 group-hover:border-green-600/50 group-hover:text-green-500' : 'bg-gray-100 border-gray-200 text-gray-600 group-hover:border-green-600/50 group-hover:text-green-600'}`}>
                    <CheckCircle size={12} /> Saques Automáticos
                  </span>
                  <span className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg font-bold border transition-colors ${theme === 'dark' ? 'bg-zinc-800/50 border-zinc-700 text-zinc-400 group-hover:border-blue-600/50 group-hover:text-blue-500' : 'bg-gray-100 border-gray-200 text-gray-600 group-hover:border-blue-600/50 group-hover:text-blue-600'}`}>
                    <BarChart2 size={12} /> Relatórios Detalhados
                  </span>
                  <span className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg font-bold border transition-colors ${theme === 'dark' ? 'bg-zinc-800/50 border-zinc-700 text-zinc-400 group-hover:border-purple-600/50 group-hover:text-purple-500' : 'bg-gray-100 border-gray-200 text-gray-600 group-hover:border-purple-600/50 group-hover:text-purple-600'}`}>
                    <CreditCard size={12} /> Split Payments
                  </span>
                </div>
              </div>
            </div>

            <div className={`p-2 rounded-full border transition-all group-hover:translate-x-1 ${theme === 'dark' ? 'border-zinc-800 bg-zinc-800/50 group-hover:border-green-600/50' : 'border-gray-200 bg-gray-50 group-hover:border-green-600/50'}`}>
              <ChevronRight className={`transition-colors ${theme === 'dark' ? 'text-zinc-600 group-hover:text-green-500' : 'text-gray-400 group-hover:text-green-600'}`} size={20} />
            </div>
          </div>

          <div className={`border p-6 rounded-xl w-full ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
            <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              <BarChart2 className="text-blue-500" /> Desempenho (Últimos 6 meses)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "#333" : "#eee"} vertical={false} />
                  <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#18181b' : '#fff', border: theme === 'dark' ? '1px solid #333' : '1px solid #eee', borderRadius: '8px' }} itemStyle={{ color: theme === 'dark' ? '#fff' : '#000' }} />
                  <Area type="monotone" dataKey="views" name="Visualizações" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <MembershipStats />
        </div>
      )}

      {/* SUPPORTERS TAB */}
      {activeTab === 'supporters' && (
        <div className="space-y-8 animate-fade-in w-full">
          {/* BANNER TOTAL ARRECADADO */}
          <div className="bg-gradient-to-r from-green-600 to-green-800 p-8 rounded-2xl text-white shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="bg-white/20 p-4 rounded-full shadow-inner">
                <HeartHandshake size={48} />
              </div>
              <div>
                <h2 className="text-3xl font-black">R$ {totalApuradoPix.toFixed(2)}</h2>
                <p className="text-green-100 font-medium text-lg">Total arrecadado com apoios diretos (Pix)</p>
              </div>
            </div>
            <div className="hidden md:block text-right">
              <div className="text-sm opacity-80 mb-1">Crescimento Mensal</div>
              <div className="text-2xl font-bold flex items-center justify-end gap-2">
                <TrendingUp size={24} /> +32%
              </div>
            </div>
          </div>

          <div className={`border rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
            <div className={`p-4 border-b flex justify-between items-center ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
              <h3 className={`font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Histórico de Apoios (Pix)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className={theme === 'dark' ? 'bg-zinc-950 text-zinc-400' : 'bg-gray-50 text-gray-500'}>
                  <tr>
                    <th className="p-4">Apoiador</th>
                    <th className="p-4">Valor</th>
                    <th className="p-4 text-right">Data</th>
                  </tr>
                </thead>
                <tbody className={theme === 'dark' ? 'divide-y divide-zinc-800' : 'divide-y divide-gray-200'}>
                  {userSupporters.length > 0 ? userSupporters.map(sub => (
                    <tr key={sub.id} className={theme === 'dark' ? 'hover:bg-zinc-800/30' : 'hover:bg-gray-50'}>
                      <td className="p-4 flex items-center gap-3">
                        <img src={sub.supporterAvatar} className="w-8 h-8 rounded-full" alt="" />
                        <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{sub.supporterName}</span>
                      </td>
                      <td className="p-4 text-green-500 font-bold text-base">R$ {sub.amount.toFixed(2)}</td>
                      <td className="p-4 text-zinc-500 text-right">{new Date(sub.date).toLocaleDateString()}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="p-12 text-center text-zinc-500">Nenhum apoio recebido ainda.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIDEOS TAB */}
      {activeTab === 'videos' && (
        <div className={`border rounded-xl overflow-hidden animate-fade-in w-full ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
          <div className={`p-4 border-b flex justify-between items-center ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
            <h3 className={`font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Seus Vídeos Enviados
              <button onClick={() => user && loadMyVideos(user.id)} title="Recarregar lista" className="text-zinc-500 hover:text-blue-500"><RefreshCw size={14} /></button>
            </h3>
            <button onClick={() => navigate('/upload')} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 font-medium">Novo Upload</button>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm">
              <thead className={theme === 'dark' ? 'bg-zinc-950 text-zinc-400' : 'bg-gray-50 text-gray-500'}>
                <tr>
                  <th className="p-4">Vídeo</th>
                  <th className="p-4 hidden sm:table-cell">Likes</th>
                  <th className="p-4">Visualizações</th>
                  <th className="p-4 hidden sm:table-cell">Data</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className={theme === 'dark' ? 'divide-y divide-zinc-800' : 'divide-y divide-gray-200'}>
                {myVideos.length > 0 ? myVideos.map(video => (
                  <tr key={video.id} className={`cursor-pointer ${theme === 'dark' ? 'hover:bg-zinc-800/50' : 'hover:bg-gray-50'}`} onClick={(e) => handleRowClick(e, video.id)}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-24 h-14 rounded overflow-hidden flex-shrink-0 relative border ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-200 border-gray-300'}`}>
                          <img src={imageService.getSmartThumbnail(video)} className="w-full h-full object-cover" alt="Thumbnail" />
                          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded">{video.duration}</span>
                        </div>
                        <div className={`font-medium line-clamp-2 max-w-xs ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{video.title}</div>
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell text-zinc-400 font-bold">
                      <span className="flex items-center gap-1"><Heart size={14} className="text-red-500" /> {video.likes || 0}</span>
                    </td>
                    <td className={`p-4 ${theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}`}>{formatCompactNumber(video.views)}</td>
                    <td className="p-4 hidden sm:table-cell text-zinc-500">{formatRelativeDate(video.uploadDate)}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 relative z-10">

                        <button type="button" onClick={(e) => { e.stopPropagation(); handleEditVideo(video.id); }} className="text-blue-500 hover:text-blue-600 flex items-center gap-1 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors" title="Editar">
                          <Edit size={16} /> <span className="hidden md:inline">Editar</span>
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteVideo(video.id); }} className="text-red-500 hover:text-red-600 flex items-center gap-1 ml-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/30 px-3 py-1.5 rounded transition-colors border border-red-100 dark:border-red-900/20" title="Excluir">
                          <Trash2 size={16} /> <span className="hidden md:inline font-medium">Excluir</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="p-12 text-center text-zinc-500"><Video size={48} className="mx-auto mb-4 opacity-20" /><p className="mb-2">Você ainda não postou vídeos.</p><button onClick={() => navigate('/upload')} className="text-blue-400 hover:underline">Faça seu primeiro upload agora</button></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WARNINGS TAB */}
      {activeTab === 'warnings' && (
        <div className="space-y-6 animate-fade-in w-full">
          <h2 className="text-xl font-bold flex items-center gap-2 text-red-500">
            <AlertTriangle size={24} /> Advertências do Sistema
          </h2>
          <p className="text-zinc-500">
            Notificações importantes sobre o status do seu canal e violações de regras.
          </p>

          <div className={`border rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
            {warningMessages.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">
                <CheckCircle size={48} className="mx-auto mb-4 opacity-20 text-green-500" />
                <p>Nenhuma advertência. Seu canal está em dia!</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {warningMessages.map(msg => (
                  <div key={msg.id} className="p-4 hover:bg-red-900/10 transition-colors border-l-4 border-l-red-500">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-red-400 flex items-center gap-2">
                        <AlertTriangle size={16} /> {msg.subject}
                      </h4>
                      <span className="text-xs text-zinc-500">{new Date(msg.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-zinc-300 mb-2">{msg.body}</p>
                    {!msg.read && (
                      <button onClick={() => markAsRead(msg.id)} className="text-xs text-zinc-400 hover:text-white underline">
                        Marcar como ciente
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MESSAGES TAB (CHAT) */}
      {activeTab === 'messages' && (
        <div className="space-y-6 animate-fade-in w-full min-h-[calc(100vh-300px)] flex flex-col">
          <h2 className="text-xl font-bold flex items-center gap-2 text-blue-500">
            <MessageCircle size={24} /> Caixa de Mensagens
          </h2>
          <p className="text-zinc-500">
            Comunicação direta com a administração da plataforma.
          </p>

          <div className={`flex-1 border rounded-xl overflow-hidden flex flex-col min-h-[500px] ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
            {/* LISTA DE MENSAGENS */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950/30">
              {inboxMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                  <Mail size={48} className="mb-4 opacity-20" />
                  <p>Sua caixa de mensagens está vazia.</p>
                </div>
              ) : (
                inboxMessages.map(msg => {
                  const isMe = msg.fromId === user?.id;
                  return (
                    <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] md:max-w-[70%] p-3 rounded-xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-zinc-800 text-zinc-200 rounded-tl-none'}`}>
                        {!isMe && <div className="text-xs font-bold text-blue-300 mb-1">{msg.fromName}</div>}
                        <p className="whitespace-pre-wrap">{msg.body}</p>
                        <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-zinc-500'}`}>
                          {new Date(msg.createdAt).toLocaleString()}
                        </div>
                        {!isMe && !msg.read && (
                          <button onClick={() => markAsRead(msg.id)} className="text-[10px] underline mt-1 block">Marcar lida</button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {/* Referência para scroll automático */}
              <div ref={messagesEndRef} />
            </div>

            {/* INPUT - ÁREA DE ESCRITA EXTRA GRANDE */}
            <div className="p-8 border-t border-zinc-800 bg-zinc-900">
              <div className="flex flex-col gap-4">
                <textarea
                  value={newMessageText}
                  onChange={e => setNewMessageText(e.target.value)}
                  placeholder="Escreva uma mensagem para o suporte..."
                  rows={6}
                  style={{ fontSize: '24px', lineHeight: '1.6' }}
                  className="w-full bg-zinc-950 border-2 border-zinc-700 rounded-2xl px-8 py-8 text-white outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-500 resize-none min-h-[200px]"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <div className="flex justify-end">
                  <button onClick={handleSendMessage} className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-2xl font-bold text-xl transition-colors shadow-lg shadow-blue-900/30">
                    Enviar Mensagem
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className={`w-full border rounded-xl p-6 animate-fade-in ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-xl font-bold mb-6 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            <Settings className="text-zinc-400" /> Configurações do Canal
          </h2>

          <div className="space-y-8">

            {/* --- SEÇÃO FOTO DE PERFIL --- */}
            <div className={`p-6 border rounded-lg ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-gray-50 border-gray-300'}`}>
              <h3 className={`font-bold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <Camera size={20} className="text-blue-500" /> Foto de Perfil
              </h3>

              <div className="flex items-center gap-6">
                <div className="relative group">
                  <img
                    src={userSettings?.avatar}
                    alt="Avatar Atual"
                    className="w-24 h-24 rounded-full object-cover border-4 border-zinc-800 shadow-lg"
                  />

                  {/* BOTÃO GERAR SVG AUTOMÁTICO (ATUALIZADO) */}
                  <button
                    onClick={handleOpenAvatarGenerator}
                    disabled={isGeneratingAvatar}
                    className="absolute bottom-0 -right-2 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full cursor-pointer transition-colors shadow-sm z-20 disabled:opacity-50"
                    title="Gerar Novo Avatar"
                  >
                    {isGeneratingAvatar ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
                  </button>

                  <label className="absolute bottom-0 -right-12 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer transition-colors shadow-sm z-10">
                    <Upload size={16} />
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </label>
                </div>
                <div className="flex-1 ml-10">
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Alterar imagem</p>
                  <p className="text-xs text-zinc-500 mb-2">Recomendado: 256x256 px. Máximo 2MB (JPG/PNG).</p>
                  <div className="text-xs bg-blue-900/20 text-blue-300 px-3 py-2 rounded inline-block border border-blue-900/30">
                    Essa foto será exibida no seu canal, comentários e vídeos.
                  </div>
                </div>
              </div>
            </div>

            {/* --- SEÇÃO INFORMAÇÕES DO CANAL (DESCRIÇÃO E HEADLINE) --- */}
            <div className={`p-6 border rounded-lg ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-gray-50 border-gray-300'}`}>
              <h3 className={`font-bold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <AlignLeft size={20} className="text-purple-500" /> Informações do Canal
              </h3>

              <div className="space-y-4">
                <div>
                  <label className={`block text-xs font-bold mb-1 ${labelColor}`}>Nome do Canal</label>
                  <input
                    type="text"
                    value={userSettings?.name || ''}
                    onChange={(e) => setUserSettings(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className={`w-full border rounded-lg px-3 py-2 outline-none focus:border-purple-500 ${inputBg}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${labelColor}`}>Mensagem de Destaque (Headline)</label>
                  <input
                    type="text"
                    value={userSettings?.channelMessage || ''}
                    onChange={(e) => setUserSettings(prev => prev ? { ...prev, channelMessage: e.target.value } : null)}
                    placeholder="Ex: Vídeos novos toda terça!"
                    className={`w-full border rounded-lg px-3 py-2 outline-none focus:border-purple-500 ${inputBg}`}
                    maxLength={100}
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Aparece logo abaixo do seu nome na página do canal.</p>
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${labelColor}`}>Descrição Completa (Sobre)</label>
                  <textarea
                    value={userSettings?.description || ''}
                    onChange={(e) => setUserSettings(prev => prev ? { ...prev, description: e.target.value } : null)}
                    placeholder="Conte a história do seu canal..."
                    className={`w-full border rounded-lg px-3 py-2 outline-none focus:border-purple-500 resize-none h-32 ${inputBg}`}
                  />
                </div>
              </div>
            </div>

            {/* --- SEÇÃO REDES SOCIAIS --- */}
            <div className={`p-6 border rounded-lg ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-gray-50 border-gray-300'}`}>
              <h3 className={`font-bold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <Globe size={20} className="text-blue-400" /> Redes Sociais
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold mb-1 flex items-center gap-1 ${labelColor}`}>
                    <Instagram size={12} /> Instagram (usuário)
                  </label>
                  <input
                    type="text"
                    value={userSettings?.socialLinks?.instagram || ''}
                    onChange={(e) => setUserSettings(prev => prev ? { ...prev, socialLinks: { ...prev.socialLinks, instagram: e.target.value } } : null)}
                    placeholder="ex: seunome"
                    className={`w-full border rounded-lg px-3 py-2 outline-none focus:border-blue-500 ${inputBg}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 flex items-center gap-1 ${labelColor}`}>
                    <Globe size={12} /> Website (URL completa)
                  </label>
                  <input
                    type="text"
                    value={userSettings?.socialLinks?.website || ''}
                    onChange={(e) => setUserSettings(prev => prev ? { ...prev, socialLinks: { ...prev.socialLinks, website: e.target.value } } : null)}
                    placeholder="https://seu-site.com"
                    className={`w-full border rounded-lg px-3 py-2 outline-none focus:border-blue-500 ${inputBg}`}
                  />
                </div>
              </div>
            </div>

            {/* --- SEÇÃO PIX --- */}
            <div className={`p-6 border rounded-lg ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-gray-50 border-gray-300'}`}>
              <div className="flex gap-4 mb-4">
                <QrCode size={24} className="text-green-500" />
                <div>
                  <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Recebimento via Pix</h3>
                  <p className="text-xs text-zinc-500">Cadastre sua chave para receber apoios.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className={`block text-xs font-bold mb-1 ${labelColor}`}>Tipo de Chave</label>
                  <select
                    className={`w-full border rounded-lg px-3 py-2 outline-none focus:border-green-500 ${inputBg}`}
                    value={userSettings?.pixKeyType || 'email'}
                    onChange={(e) => setUserSettings(prev => prev ? { ...prev, pixKeyType: e.target.value as any } : null)}
                  >
                    <option value="email">E-mail</option>
                    <option value="phone">Celular</option>
                    <option value="cpf">CPF</option>
                    <option value="random">Aleatória</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={`block text-xs font-bold mb-1 ${labelColor}`}>Sua Chave Pix</label>
                  <input
                    type="text"
                    value={userSettings?.pixKey || ''}
                    onChange={(e) => setUserSettings(prev => prev ? { ...prev, pixKey: e.target.value } : null)}
                    className={`w-full border rounded-lg px-3 py-2 outline-none focus:border-green-500 ${inputBg}`}
                    placeholder="ex: nome@email.com"
                  />
                </div>
              </div>
            </div>

            {/* --- CLUBE DE MEMBROS --- */}
            <div className={`p-6 border rounded-lg ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-gray-50 border-gray-300'}`}>
              <div className="flex gap-4 mb-4">
                <Crown size={24} className="text-yellow-500" />
                <div>
                  <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Clube de Membros</h3>
                  <p className="text-xs text-zinc-500">Defina o valor mensal para ser membro do seu canal.</p>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelColor}`}>Preço Mensal (Mínimo R$ 9,90)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-zinc-500 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.10"
                    min="9.90"
                    value={membershipPrice}
                    onChange={(e) => setMembershipPrice(Number(e.target.value))}
                    className={`w-full border rounded-lg pl-10 pr-3 py-2 outline-none focus:border-yellow-500 font-bold ${inputBg}`}
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  * Você recebe 70% deste valor via Pix automático (taxa de 30% da plataforma).
                </p>
              </div>
            </div>


            <div className={`pt-4 border-t flex flex-col items-end gap-3 ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
              {showSuccessMessage && (
                <div className={`px-4 py-2 rounded-lg text-sm font-bold border flex items-center gap-2 transition-all animate-in fade-in slide-in-from-bottom-2 ${theme === 'dark' ? 'bg-green-900/20 border-green-900/50 text-green-400' : 'bg-green-100 border-green-200 text-green-700'}`}>
                  ✅ Alterações salvas com sucesso!
                </div>
              )}
              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className={`bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 shadow-lg shadow-red-900/20 transition-all ${isSavingSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSavingSettings ? (
                  <><Loader2 className="animate-spin" size={18} /> Salvando...</>
                ) : (
                  <><Save size={18} /> Salvar Alterações</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
