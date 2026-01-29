
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { videoService } from '../services/videoService';
import { ThumbsUp, Share2, Sparkles, MessageCircle, DollarSign, X, ExternalLink, Flag, Crown, CheckCircle, Loader2, Copy, Check, Facebook, Twitter, AlertTriangle, PlayCircle, Maximize2, Minimize2, ArrowRight, QrCode, Send, EyeOff } from 'lucide-react';
import { Campaign, Video, Comment, PixPayment, Subscription } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { reportService } from '../services/reportService';
import { channelService } from '../services/channelService';
import { userPreferences } from '../services/userPreferences';
import { subscriptionService } from '../services/subscriptionService';
import { pixService } from '../services/pixService';
import { preferenceService } from '../services/preferenceService';
import { useSmartAd } from '../hooks/useSmartAd';
import VideoPlayer, { VideoPlayerRef } from '../components/VideoPlayer';
import CommentItem from '../components/CommentItem';
import { commentService } from '../services/commentService';
import { likeService } from '../services/likeService';
import { formatRelativeDate, formatCompactNumber } from '../services/utils';

const PRAISE_KEYWORDS = ["incrível", "ótimo", "perfeito", "excelente", "maravilhoso", "impecável", "gostei", "amei", "parabéns", "brilhante"];

const REPORT_REASONS = [
  "Violência e Criminalidade",
  "Pornografia e Exploração Sexual",
  "Desinformação e Alarmismo",
  "Política Sensacionalista",
  "Ódio, Discriminação e Assédio",
  "Conteúdo Infantil Inadequado",
  "Atividades Ilegais",
  "Spam, Golpes e Manipulação"
];

// Banner overlay para anúncios de ANUNCIANTES em vídeos (location='video')
const BannerOverlay: React.FC<{ campaign: Campaign; onClose: () => void; onAdClick: (e?: React.MouseEvent) => void }> = ({ campaign, onClose, onAdClick }) => {
  if (campaign.type === 'image') {
    return (
      <div className="absolute bottom-12 md:bottom-16 left-1/2 -translate-x-1/2 w-[95%] sm:w-[85%] md:w-[70%] max-w-[600px] aspect-video z-[9999] animate-fade-in group pointer-events-auto">
        <div className="relative w-full h-full rounded-xl md:rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] border-2 border-white/20 hover:border-blue-500 transition-all bg-black">
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-2 right-2 bg-red-600/90 hover:bg-red-600 text-white p-1.5 rounded-full z-[10000] shadow-xl border border-white/20 transition-all"><X size={18} /></button>
          <a href={campaign.targetUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full cursor-pointer group" onClick={(e) => onAdClick(e)}>
            <img src={campaign.bannerImage} alt={campaign.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-6">
              <div className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                Visitar Site <ExternalLink size={16} />
              </div>
            </div>
          </a>
        </div>
      </div>
    );
  }
  // Anúncio de TEXTO
  return (
    <div className="absolute bottom-12 md:bottom-16 left-1/2 -translate-x-1/2 w-[95%] sm:w-[90%] md:w-[600px] bg-zinc-900/98 backdrop-blur-3xl border border-white/20 p-3 md:p-6 rounded-xl md:rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[9999] flex flex-col gap-2 md:gap-4 animate-in slide-in-from-bottom-5 fade-in duration-500 pointer-events-auto">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-black bg-[#FFD700] text-black px-1.5 py-0.5 rounded uppercase tracking-tighter">Patrocinado</span>
          </div>
          <h4 className="font-bold text-white text-sm md:text-lg leading-tight truncate">{campaign.title}</h4>
          <p className="hidden md:block text-sm text-zinc-200 mt-2 leading-relaxed">
            {campaign.desktopDescription || "Confira agora."}
          </p>
          <p className="md:hidden text-[11px] text-zinc-300 mt-0.5 leading-tight line-clamp-2">
            {campaign.mobileDescription || campaign.desktopDescription?.substring(0, 70) || "Toque para ver."}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="bg-red-600/90 text-white p-1 rounded-full hover:bg-red-600 z-[10000] shadow-xl border border-white/10 flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      <a
        href={campaign.targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white text-center text-xs md:text-sm font-bold py-2 md:py-3 rounded-lg md:rounded-xl transition-all shadow-lg active:scale-[0.98] group"
        onClick={(e) => onAdClick(e)}
      >
        Visitar Site <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
      </a>
    </div>
  );
};


const Watch: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useSettings();
  const playerRef = useRef<VideoPlayerRef>(null);

  const [video, setVideo] = useState<Video | null>(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [activeTab, setActiveTab] = useState<'comments' | 'chapters'>('comments');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isChannelMember, setIsChannelMember] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [subCount, setSubCount] = useState(0);

  // Modals
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportStep, setSupportStep] = useState<'amount' | 'qr'>('amount');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [currentPixPayment, setCurrentPixPayment] = useState<PixPayment | null>(null);
  const [memberPaymentData, setMemberPaymentData] = useState<any>(null);
  const [tempSubscription, setTempSubscription] = useState<any>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberPlan, setMemberPlan] = useState<'channel' | 'global'>('channel');
  const [isProcessingSub, setIsProcessingSub] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const [recommendedVideos, setRecommendedVideos] = useState<Video[]>([]);

  // Preferências
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(userPreferences.getAutoPlayPreference());
  const [isFocusMode, setIsFocusMode] = useState(userPreferences.getFocusModePreference());

  // Hook para buscar anúncios de ANUNCIANTES com location='video'
  const { ad: smartAd, onAdClick } = useSmartAd('video', video ? video.tags : [], video?.id, video?.creator.id);

  // Carrega vídeo, comentários e likes do Supabase
  useEffect(() => {
    if (id) {
      const initWatch = async () => {
        const v = await videoService.getById(id);

        if (v) {
          setVideo(v);
          videoService.incrementViews(id);

          // Carrega vídeos recomendados
          const all = await videoService.getAll();
          setRecommendedVideos(all.filter(rec => rec.id !== id).slice(0, 15));

          // Carrega comentários do Supabase
          commentService.getCommentsByVideo(id).then(supabaseComments => {
            if (supabaseComments.length > 0) {
              const formattedComments: Comment[] = supabaseComments.map(c => ({
                id: c.id,
                userId: c.user_id,
                userName: c.user_name,
                userAvatar: c.user_avatar || '/avatar-placeholder.png',
                text: c.content,
                timestamp: new Date(c.created_at).toLocaleDateString('pt-BR'),
                likes: c.likes,
                fixado: c.is_pinned,
                denunciado: false,
                elogio: false,
                isQualityComment: false,
                replies: c.replies?.map((r: any) => ({
                  id: r.id,
                  userId: r.user_id,
                  userName: r.user_name,
                  userAvatar: r.user_avatar || '/avatar-placeholder.png',
                  text: r.content,
                  timestamp: new Date(r.created_at).toLocaleDateString('pt-BR'),
                  likes: r.likes,
                  fixado: false,
                  denunciado: false,
                  elogio: false,
                  isQualityComment: false,
                  replies: []
                })) || []
              }));
              setComments(formattedComments);
            }
          });

          // Carrega likes do Supabase
          likeService.getLikeCount(id).then(count => setLikesCount(count));
          if (user) {
            likeService.hasUserLiked(id, user.id).then(liked => setHasLiked(liked));
            channelService.isSubscribed(user.id, v.creator.id).then(subscribed => setIsSubscribed(subscribed));
            subscriptionService.getUserSubscriptions(user.id).then(subs => {
              setIsChannelMember(subs.some(s => s.type === 'channel' && s.channelId === v.creator.id && s.status === 'active'));
            });
          }

          // Carrega contador de inscritos
          channelService.getSubscriberCount(v.creator.id).then(count => setSubCount(count));

          // Incrementa e atualiza visualizações localmente se necessário
          videoService.incrementViews(id).then(updated => {
            if (updated) setVideo(updated);
          });
        } else {
          navigate('/');
        }
      };

      initWatch();
    }
  }, [id, user]);

  // Exibe anúncio de ANUNCIANTE ou PLATAFORMA (location='video')
  useEffect(() => {
    if (!video) return;
    setActiveCampaign(null);
    if (smartAd) {
      console.log('[Watch] ✅ Anúncio detectado, exibindo:', smartAd.title, `(isPlatform: ${(smartAd as any).isPlatform || false})`);
      const timer = setTimeout(() => setActiveCampaign(smartAd), 1000);
      return () => clearTimeout(timer);
    }
  }, [video, smartAd]);





  // Toggle like usando Supabase
  const handleToggleLike = async () => {
    if (!user) { navigate('/auth'); return; }
    const result = await likeService.toggleLike(video!.id, user.id);
    setLikesCount(result.totalLikes);
    setHasLiked(result.liked);
  };

  // Adicionar comentário usando Supabase
  const handlePostComment = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!commentText.trim()) return;

    const isCreatorComment = user.id === video!.creator.id;
    const newComment = await commentService.addComment(
      video!.id,
      user.id,
      user.name,
      user.avatar,
      commentText,
      undefined,
      isCreatorComment
    );

    if (newComment) {
      const elogio = PRAISE_KEYWORDS.some(p => commentText.toLowerCase().includes(p));
      const formattedComment: Comment = {
        id: newComment.id,
        userId: newComment.user_id,
        userName: newComment.user_name,
        userAvatar: newComment.user_avatar || '/avatar-placeholder.png',
        text: newComment.content,
        timestamp: 'Agora mesmo',
        likes: 0,
        elogio,
        isQualityComment: false,
        denunciado: false,
        fixado: false,
        replies: []
      };
      setComments(prev => [formattedComment, ...prev]);
    }
    setCommentText('');
  };

  // Responder comentário usando Supabase
  const handleResponder = async (parentId: string, texto: string) => {
    if (!user) return;

    const isCreatorComment = user.id === video!.creator.id;
    const newReply = await commentService.addComment(
      video!.id,
      user.id,
      user.name,
      user.avatar,
      texto,
      parentId,
      isCreatorComment
    );

    if (newReply) {
      const reply: Comment = {
        id: newReply.id,
        userId: newReply.user_id,
        userName: newReply.user_name,
        userAvatar: newReply.user_avatar || '/avatar-placeholder.png',
        text: newReply.content,
        timestamp: 'Agora mesmo',
        likes: 0,
        isQualityComment: false,
        denunciado: false,
        elogio: false,
        fixado: false,
        replies: []
      };
      setComments(prev => {
        const addReply = (list: Comment[]): Comment[] => list.map(c => {
          if (c.id === parentId) return { ...c, replies: [...(c.replies || []), reply] };
          if (c.replies) return { ...c, replies: addReply(c.replies) };
          return c;
        });
        return addReply(prev);
      });
    }
  };

  // Excluir comentário usando Supabase
  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    // Verifica se é o dono do vídeo ou o autor do comentário
    const isVideoOwner = user.id === video?.creator.id;
    let deleted = false;

    if (isVideoOwner) {
      deleted = await commentService.deleteCommentAsAdmin(commentId);
    } else {
      deleted = await commentService.deleteComment(commentId, user.id);
    }

    if (deleted) {
      setComments(prev => {
        const removeComment = (list: Comment[]): Comment[] => {
          return list.filter(c => {
            if (c.id === commentId) return false;
            if (c.replies) c.replies = removeComment(c.replies);
            return true;
          });
        };
        return removeComment(prev);
      });
    }
  };

  const handleReportComment = (commentId: string) => {
    if (!user) { navigate('/auth'); return; }

    setComments(prev => {
      const markAsReported = (list: Comment[]): Comment[] => list.map(c => {
        if (c.id === commentId) return { ...c, denunciado: true };
        if (c.replies) return { ...c, replies: markAsReported(c.replies) };
        return c;
      });
      return markAsReported(prev);
    });

    alert('Comentário denunciado! Nossa equipe irá revisar.');
  };

  const handleBlockUser = (creatorId: string) => {
    if (!user) { navigate('/auth'); return; }

    if (window.confirm("Deseja realmente bloquear este canal? Você não verá mais os vídeos e comentários dele.")) {
      console.log(`🚫 [Watch] Bloqueando canal: ${creatorId}`);
      preferenceService.blockChannel(creatorId);

      // Notifica para atualização imediata (AuthContext e Home já vão reagir)

      setComments(prev => {
        // Remove todos os comentários desse usuário
        const removeUserComments = (list: Comment[]): Comment[] => {
          return list.filter(c => {
            if (c.userId === creatorId) return false;
            if (c.replies) c.replies = removeUserComments(c.replies);
            return true;
          });
        };
        return removeUserComments(prev);
      });

      alert("Canal bloqueado com sucesso.");

      // Se estiver bloqueando o dono do vídeo atual, sai fora da página
      if (creatorId === video?.creator.id) {
        navigate('/');
      }
    }
  };

  const handleIgnoreChannel = () => {
    if (!user || !video) { navigate('/auth'); return; }

    if (window.confirm("Ocultar este canal das suas recomendações?")) {
      preferenceService.ignoreChannel(video.creator.id);
      alert("Canal ignorado. Ele não aparecerá mais em suas recomendações.");
      navigate('/');
    }
  };



  const handleSubscribe = async () => {
    if (!user) { navigate('/auth'); return; }
    const newState = await channelService.toggleSubscribe(user.id, video!.creator.id);
    setIsSubscribed(newState);
    // Atualiza contagem local para feedback imediato
    setSubCount(prev => newState ? prev + 1 : Math.max(0, prev - 1));
  };

  const handleJoin = () => {
    if (!user) { navigate('/auth'); return; }
    if (isChannelMember) { navigate('/viewer-panel'); return; }
    setShowMemberModal(true);
  };

  const handleSupport = () => { if (!user) { navigate('/auth'); return; } setShowSupportModal(true); setSupportStep('amount'); };

  const generatePix = (amount: number) => {
    setSelectedAmount(amount);
    if (video) {
      // Gera o payload Pix REAL para o QR Code funcionar
      const payment = pixService.generatePixPayment(
        video.creator.id,
        video.creator.pixKey || 'seed@pix.com',
        video.creator.name,
        amount,
        user?.name
      );
      setCurrentPixPayment(payment);
    }
    setSupportStep('qr');
  };

  const handleConfirmPix = async () => {
    if (!currentPixPayment || !user || !video) return;
    const success = await pixService.confirmPixPayment(
      video.creator.id,
      user.id,
      user.name,
      user.avatar,
      currentPixPayment.amount
    );
    if (success) {
      alert(`✅ Pix confirmado! Você apoiou ${video.creator.name}!`);
      setShowSupportModal(false);
      setCustomAmount('');
      setCurrentPixPayment(null);
    } else {
      alert("❌ Erro ao confirmar Pix. Tente novamente.");
    }
  };

  const handleCopyPix = () => {
    const key = video?.creator.pixKey || 'seed@pix.com';

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(key).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }).catch(() => {
        // Fallback para HTTP
        const input = document.createElement('input');
        input.value = key;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    } else {
      // Fallback para navegadores antigos
      const input = document.createElement('input');
      input.value = key;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };


  const handleConfirmMembership = async () => {
    if (!user || !video) return;
    setIsProcessingSub(true);

    // Simula processamento Asaas com Split
    // Removendo setTimeout para chamada real ou mantendo delay visual
    await new Promise(resolve => setTimeout(resolve, 1500));

    const newSub: Subscription = {
      id: `sub_${Date.now()}`,
      userId: user.id,
      channelId: video.creator.id,
      channelName: video.creator.name,
      channelAvatar: video.creator.avatar,
      price: video.creator.membershipPrice || 9.90,
      status: 'active',
      startDate: new Date().toISOString(),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      paymentMethod: 'pix',
      type: memberPlan
    };

    let charge;
    try {
      charge = await subscriptionService.createSubscription(newSub);
    } catch (err: any) {
      alert(`Erro ao criar cobrança no Asaas: ${err.message}`);
      setIsProcessingSub(false);
      return;
    }

    if (charge && charge.id) {
      setTempSubscription(newSub);

      try {
        const pixData = await import('../services/asaasService').then(m => m.asaasService.getPixQrCode(charge.id));
        setMemberPaymentData({ ...pixData, id: charge.id });
        setIsProcessingSub(false);
        return; // Mantém modal aberto para exibir Pix e Polling
      } catch (e: any) {
        console.error("Erro ao pegar Pix do membro", e);
        alert(`Erro ao gerar QR Code: ${e.message}`);
        setIsProcessingSub(false);
        return;
      }
    } else {
      alert("Erro: O Asaas não retornou uma cobrança válida. O Criador configurou a Carteira?");
      setIsProcessingSub(false);
      return;
    }
  };

  const toggleFocusMode = () => {
    const val = !isFocusMode;
    setIsFocusMode(val);
    userPreferences.setFocusModePreference(val);
    // Sincroniza com a Sidebar do App.tsx
    userPreferences.setCompactModePreference(val);
  };

  const toggleAutoPlay = () => {
    const val = !autoPlayEnabled;
    setAutoPlayEnabled(val);
    userPreferences.setAutoPlayPreference(val);
  };

  const shareOn = (platform: 'fb' | 'tw' | 'wa') => {
    const url = window.location.href;
    const text = `Confira este vídeo no FairStream: ${video?.title}`;
    let shareUrl = '';
    if (platform === 'fb') shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    if (platform === 'tw') shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    if (platform === 'wa') shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`;
    window.open(shareUrl, '_blank');
  };



  if (!video) return null;

  const sortedComments = [...comments].sort((a, b) => (a.fixado ? -1 : b.fixado ? 1 : 0));
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';

  return (
    <div className={`p-0 md:p-6 mx-auto w-full flex ${isFocusMode ? 'flex-col items-center' : 'flex-col lg:flex-row gap-6 max-w-[1800px]'}`}>

      {/* AREA PRINCIPAL */}
      <div className={`flex-1 min-w-0 ${isFocusMode ? 'w-full flex flex-col items-center' : ''}`}>
        <div className={`relative bg-black group/player w-full overflow-hidden rounded-xl shadow-xl transition-all duration-500 ${isFocusMode ? 'max-w-[90vw] border border-zinc-800' : ''}`}>
          <VideoPlayer ref={playerRef} video={video} autoPlay={autoPlayEnabled} isFocusMode={isFocusMode}>
            {isFocusMode && (
              <button onClick={toggleFocusMode} className="absolute top-4 right-4 bg-black/60 hover:bg-red-600 text-white p-2 rounded-full opacity-0 group-hover/player:opacity-100 transition-all z-50"><Minimize2 size={24} /></button>
            )}
            {activeCampaign && <BannerOverlay campaign={activeCampaign} onClose={() => setActiveCampaign(null)} onAdClick={onAdClick} />}
          </VideoPlayer>
        </div>

        {/* INFO VÍDEO RESTAURADO */}
        <div className={`w-full mt-4 px-4 md:px-0 ${isFocusMode ? 'max-w-[90vw]' : ''}`}>
          <h1 className={`text-xl md:text-2xl font-bold ${textPrimary}`}>{video.title}</h1>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mt-3 gap-4 border-b border-zinc-800/50 pb-4">
            {/* AREA CRIADOR & SUBS (RESPONSIVA) */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Link to={`/channel/${video.creator.id}`}><img src={video.creator.avatar} className="w-10 h-10 rounded-full object-cover border border-zinc-800" alt="" /></Link>
                  <div className="min-w-0">
                    <Link to={`/channel/${video.creator.id}`} className={`font-bold hover:underline block truncate ${textPrimary}`}>{video.creator.name}</Link>
                    <p className="text-xs text-zinc-500">{formatCompactNumber(subCount)} inscritos</p>
                  </div>
                </div>
                {/* BOTÃO INSCREVER (A DIREITA NO MOBILE) */}
                <button onClick={handleSubscribe} className={`lg:ml-4 px-6 py-2 rounded-full font-bold text-sm shrink-0 transition-colors ${isSubscribed ? 'bg-zinc-800 text-zinc-300' : 'bg-white text-black hover:bg-zinc-200'}`}>
                  {isSubscribed ? 'Inscrito' : 'Inscrever-se'}
                </button>
              </div>

              {/* BOTÕES EXTRAS (OCUPAM LINHA SEPARADA NO MOBILE) */}
              <div className="flex gap-2 lg:hidden">
                <button onClick={handleJoin} className={`flex-1 border border-blue-500/30 text-blue-500 hover:bg-blue-500/10 px-4 py-2.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 ${isChannelMember ? 'bg-blue-500/10' : ''}`}>
                  {isChannelMember && <Crown size={14} />} {isChannelMember ? 'Membro Ativo' : 'Seja Membro'}
                </button>
                <button onClick={handleSupport} className="flex-1 border border-zinc-700 text-white hover:bg-zinc-800 px-4 py-2.5 rounded-full font-bold flex items-center justify-center gap-2 transition-colors"><DollarSign size={16} className="text-green-500" /> Apoiar</button>
              </div>
            </div>

            {/* BARRA DE INTERAÇÕES (DESLIZANTE NO MOBILE) */}
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-2 mr-2">
                <button onClick={handleJoin} className={`border border-blue-500/30 text-blue-500 hover:bg-blue-500/10 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 ${isChannelMember ? 'bg-blue-500/10' : ''}`}>
                  {isChannelMember && <Crown size={14} />} {isChannelMember ? 'Membro Ativo' : 'Seja Membro'}
                </button>
                <button onClick={handleSupport} className="border border-zinc-700 text-white hover:bg-zinc-800 px-4 py-2 rounded-full font-bold flex items-center gap-2 transition-colors"><DollarSign size={16} className="text-green-500" /> Apoiar</button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar w-full lg:w-auto">
                <button onClick={handleToggleLike} className={`flex items-center gap-2 px-4 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors shrink-0 ${hasLiked ? 'text-blue-500' : 'text-white'}`}><ThumbsUp size={18} className={hasLiked ? 'fill-current' : ''} /><span>{likesCount}</span></button>
                <button onClick={() => setShowShareModal(true)} className="flex items-center gap-2 px-4 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/30 hover:scale-105 shrink-0"><Share2 size={18} /><span>Compartilhar</span></button>
                <button onClick={() => setShowReportModal(true)} className="flex items-center gap-2 px-4 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition-colors hover:text-red-500 shrink-0"><Flag size={18} /><span>Denunciar</span></button>
                <button onClick={handleIgnoreChannel} className="flex items-center gap-2 px-4 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition-colors hover:text-orange-500 shrink-0" title="Não recomendar mais este canal"><EyeOff size={18} /><span>Ignorar</span></button>
                {!isFocusMode && <button onClick={toggleFocusMode} className="flex items-center gap-2 px-4 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition-colors shrink-0"><Maximize2 size={18} /><span>Foco</span></button>}
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="flex gap-3 mb-2 font-bold text-sm text-white">
              <span>{formatCompactNumber(video.views)} visualizações</span>
              <span>•</span>
              <span>{formatRelativeDate(video.uploadDate)}</span>
            </div>
            <p className="text-sm text-zinc-400 whitespace-pre-wrap">{video.description}</p>
          </div>

          {/* COMENTÁRIOS ABAIXO NO MODO FOCO */}
          {isFocusMode && (
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
              <div className="lg:col-span-2">
                <div className="bg-[#0f0f0f] border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-[600px]">
                  <div className="p-4 border-b border-zinc-800 font-bold text-white">Comentários</div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {sortedComments.map(c => <CommentItem key={c.id} comment={c} creatorId={video.creator.id} depth={0} onResponder={handleResponder} onDelete={handleDeleteComment} onReport={handleReportComment} onBlock={handleBlockUser} currentUser={user} />)}
                  </div>
                  <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex gap-3">
                    <img src={user?.avatar || 'https://picsum.photos/32'} className="w-8 h-8 rounded-full" alt="" />
                    <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handlePostComment()} placeholder="Adicione um comentário..." className="flex-1 bg-zinc-950 border border-zinc-700 rounded-full px-4 py-2 text-sm text-white outline-none focus:border-blue-500" />
                    <button onClick={handlePostComment} className="text-blue-500 hover:scale-110 transition-transform"><Sparkles size={18} /></button>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-bold text-white">Recomendados</h3>
                {recommendedVideos.map(v => (
                  <div key={v.id} className="flex gap-3 cursor-pointer group" onClick={() => navigate(`/watch/${v.id}`)}>
                    <div className="relative w-40 h-24 shrink-0 rounded-lg overflow-hidden border border-zinc-800"><img src={v.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" /></div>
                    <div className="min-w-0"><h4 className="text-sm font-bold line-clamp-2 text-white group-hover:text-blue-500">{v.title}</h4><p className="text-xs text-zinc-500 mt-1">{v.creator.name}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SIDEBAR MODO PADRÃO RESTAURADA */}
      {!isFocusMode && (
        <div className="w-full lg:w-[400px] flex-shrink-0 flex flex-col gap-4">
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex justify-between items-center">
            <div className="flex items-center gap-2"><PlayCircle size={20} className={autoPlayEnabled ? "text-green-500" : "text-zinc-500"} /><span className="text-sm font-bold text-white">Auto-Play</span></div>
            <button onClick={toggleAutoPlay} className={`w-10 h-5 rounded-full relative transition-colors ${autoPlayEnabled ? 'bg-green-500' : 'bg-zinc-600'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${autoPlayEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} /></button>
          </div>

          <div className="bg-[#0f0f0f] border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-[500px]">
            <div className="p-3 border-b border-zinc-800 flex gap-4">
              <button onClick={() => setActiveTab('comments')} className={`text-sm font-bold transition-colors ${activeTab === 'comments' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Comentários</button>
              <button onClick={() => setActiveTab('chapters')} className={`text-sm font-bold transition-colors ${activeTab === 'chapters' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Capítulos</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
              {activeTab === 'comments' ? (
                sortedComments.map(c => <CommentItem key={c.id} comment={c} creatorId={video.creator.id} depth={0} onResponder={handleResponder} onDelete={handleDeleteComment} onReport={handleReportComment} onBlock={handleBlockUser} currentUser={user} />)
              ) : (
                video.chapters?.map((ch, i) => <button key={i} onClick={() => playerRef.current?.seek(parseInt(ch.timestamp.split(':')[0]) * 60 + parseInt(ch.timestamp.split(':')[1]))} className="w-full text-left p-2 hover:bg-zinc-800 rounded flex gap-3 items-center group transition-colors"><span className="text-blue-500 font-mono text-xs group-hover:text-white">{ch.timestamp}</span><span className="text-zinc-300 text-sm group-hover:text-white">{ch.title}</span></button>)
              )}
            </div>
            <div className="p-3 border-t border-zinc-800 bg-zinc-900/50 flex gap-2">
              <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handlePostComment()} placeholder="Comentar..." className="flex-1 bg-zinc-950 border border-zinc-700 rounded-full px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500" />
              <button onClick={handlePostComment} className="text-blue-500 hover:text-blue-400 transition-colors"><Send size={18} /></button>
            </div>
          </div>

          <div className="space-y-4">
            {recommendedVideos.map((v) => (
              <div key={v.id} className="flex gap-3 cursor-pointer group" onClick={() => navigate(`/watch/${v.id}`)}>
                <div className="relative w-40 h-24 shrink-0 rounded-xl overflow-hidden shadow-sm border border-zinc-800">
                  <img src={v.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" />
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <h4 className="text-sm font-bold line-clamp-2 leading-snug text-white group-hover:text-blue-500 transition-colors">{v.title}</h4>
                  <span className="text-xs text-zinc-500">{v.creator.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL APOIO PIX RESTAURADO COM COPIA E COLA */}
      {showSupportModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#18181b] border border-zinc-800 rounded-xl w-full max-w-md p-6 relative animate-fade-in shadow-2xl">
            <button onClick={() => setShowSupportModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
            {supportStep === 'amount' ? (
              <>
                <h2 className="text-xl font-bold mb-1 flex items-center gap-2 text-white"><span className="text-green-500 text-2xl font-black">$</span> Apoiar {video.creator.name}</h2>
                <p className="text-zinc-400 text-xs mb-6">Seu apoio vai 100% para o criador (0% taxa). Chave Pix: <span className="bg-zinc-800 px-1.5 py-0.5 rounded font-mono ml-1">{video.creator.pixKey || 'seed@pix.com'}</span></p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[5, 10, 20, 50, 100].map(amount => (
                    <button key={amount} onClick={() => generatePix(amount)} className="bg-zinc-800/50 hover:bg-zinc-700 border border-zinc-700 hover:border-green-500 rounded-lg py-4 text-lg font-bold text-white transition-all">R$ {amount}</button>
                  ))}
                </div>
                <div className="space-y-3">
                  <div className="relative"><input type="number" value={customAmount} onChange={e => setCustomAmount(e.target.value)} placeholder="R$ Outro valor" className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-white outline-none focus:border-green-500 text-sm font-bold" /></div>
                  {customAmount && Number(customAmount) > 0 && (
                    <button onClick={() => generatePix(Number(customAmount))} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
                      Gerar QR Code Pix <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center">
                <h2 className="text-xl font-bold mb-4 text-white">Escaneie para pagar</h2>
                <div className="bg-white p-3 rounded-xl inline-block mb-4">
                  {/* USA O QR CODE GERADO PELO PIX SERVICE (REAL BR CODE) */}
                  <img src={currentPixPayment?.qrCode || ''} className="w-48 h-48 mx-auto" alt="QR Code Pix" />
                </div>
                <p className="text-2xl font-bold text-green-400 mb-1">R$ {selectedAmount?.toFixed(2).replace('.', ',')}</p>
                <p className="text-zinc-500 text-xs mb-6">Beneficiário: {video.creator.name}</p>

                <div className="mb-6 relative">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 pr-12 flex items-center justify-between overflow-hidden">
                    {/* EXIBE APENAS A CHAVE LIMPA */}
                    <span className="text-zinc-400 font-mono text-sm truncate select-all">
                      {video.creator.pixKey || 'seed@pix.com'}
                    </span>
                    <button onClick={handleCopyPix} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors">
                      {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-zinc-400" />}
                    </button>
                  </div>
                  {isCopied && <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] px-2 py-1 rounded shadow-lg animate-fade-in">Copiado!</div>}
                </div>

                <button onClick={handleConfirmPix} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98]">Já fiz o Pix</button>

                <button onClick={() => setSupportStep('amount')} className="mt-4 text-zinc-500 hover:text-white text-xs font-medium underline">Voltar</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SHARE MODAL RESTAURADO COM REDES SOCIAIS */}
      {showShareModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-white">Compartilhar</h2>
              <button onClick={() => setShowShareModal(false)} className="text-zinc-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <button onClick={() => shareOn('fb')} className="flex flex-col items-center gap-2 p-3 rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-colors group">
                <Facebook className="text-blue-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs text-white">Facebook</span>
              </button>
              <button onClick={() => shareOn('tw')} className="flex flex-col items-center gap-2 p-3 rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-colors group">
                <Twitter className="text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs text-white">Twitter</span>
              </button>
              <button onClick={() => shareOn('wa')} className="flex flex-col items-center gap-2 p-3 rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-colors group">
                <MessageCircle className="text-green-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs text-white">WhatsApp</span>
              </button>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg border border-zinc-700 bg-zinc-950">
              <input readOnly value={window.location.href} className="flex-1 bg-transparent text-sm outline-none px-2 truncate text-zinc-400" />
              <button onClick={() => {
                const url = window.location.href;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(url).then(() => {
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }).catch(() => {
                    // Fallback para HTTP
                    const input = document.createElement('input');
                    input.value = url;
                    document.body.appendChild(input);
                    input.select();
                    document.execCommand('copy');
                    document.body.removeChild(input);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  });
                } else {
                  // Fallback para navegadores antigos
                  const input = document.createElement('input');
                  input.value = url;
                  document.body.appendChild(input);
                  input.select();
                  document.execCommand('copy');
                  document.body.removeChild(input);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }
              }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-bold transition-colors">
                {isCopied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white"><AlertTriangle className="text-red-500" /> Denunciar Vídeo</h2>
            <div className="space-y-2 mb-6 max-h-[400px] overflow-y-auto custom-scrollbar">
              {REPORT_REASONS.map((r, i) => (
                <button key={i} onClick={async () => {
                  if (user && video) {
                    await reportService.create({
                      reason: r,
                      videoId: video.id,
                      videoTitle: video.title,
                      reporterId: user.id,
                      reporterName: user.name
                    });
                  }
                  setReportSuccess(true);
                  setTimeout(() => setShowReportModal(false), 2000);
                }} className="w-full text-left p-3 rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-colors text-zinc-300 text-sm">{r}</button>
              ))}
            </div>
            {reportSuccess && <div className="text-green-500 text-sm font-bold text-center mb-4 animate-fade-in">Denúncia enviada! Obrigado por ajudar a manter a comunidade segura.</div>}
            <button onClick={() => setShowReportModal(false)} className="w-full py-2 text-zinc-500 hover:text-white text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* MODAL MEMBROS RESTAURADO */}
      {showMemberModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-[#18181b] border border-zinc-800 rounded-2xl w-full max-w-[440px] p-8 relative animate-in fade-in zoom-in-95 shadow-2xl">
            <button onClick={() => { setShowMemberModal(false); setMemberPaymentData(null); }} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"><X size={24} /></button>

            {memberPaymentData ? (
              <div className="flex flex-col items-center animate-in fade-in space-y-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><QrCode className="text-green-500" /> Pagamento Pix</h2>
                <p className="text-zinc-400 text-center text-sm">Escaneie o QR Code abaixo para ativar sua assinatura de membro.</p>

                <div className="bg-white p-2 rounded-xl shadow-lg">
                  <img src={`data:image/png;base64,${memberPaymentData.encodedImage}`} alt="QR Code Pix" className="w-56 h-56" />
                </div>

                <div className="w-full bg-zinc-900/50 p-3 rounded-xl border border-zinc-700/50 flex items-center gap-3">
                  <code className="text-xs text-zinc-500 flex-1 truncate font-mono">{memberPaymentData.payload}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(memberPaymentData.payload); alert("Código Copia e Cola copiado!"); }}
                    className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    title="Copiar Código"
                  >
                    <Copy size={18} />
                  </button>
                </div>

                <button
                  onClick={() => {
                    setShowMemberModal(false);
                    setMemberPaymentData(null);
                    setIsChannelMember(true);
                    alert("Obrigado! Assim que o pagamento for compensado, sua assinatura será ativada.");
                    window.location.reload(); // Força atualização para mostrar status de membro
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-[0.98]"
                >
                  Já Fiz o Pagamento
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-8"><h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2"><Crown size={24} className="text-yellow-500" /> Escolha sua Assinatura</h2></div>
                <div className="space-y-4 mb-8">
                  <button onClick={() => setMemberPlan('channel')} className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center gap-4 group border-blue-600 bg-blue-600/5 ring-1 ring-blue-600`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors bg-blue-600 text-white`}><Check size={20} /></div>
                    <div className="flex-1 min-w-0"><div className="flex justify-between items-center"><h3 className="text-lg font-bold text-white">Membro do Canal</h3><div className="text-right text-lg font-bold text-white">R$ {(video.creator.membershipPrice || 9.90).toFixed(2).replace('.', ',')}<span className="text-[10px] text-zinc-500 block font-normal">/mês</span></div></div><p className="text-xs text-zinc-400 mt-1">Sem anúncios neste canal + Conteúdo exclusivo.</p></div>
                  </button>
                </div>
                <button onClick={handleConfirmMembership} disabled={isProcessingSub} className="w-full bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]">{isProcessingSub ? <Loader2 className="animate-spin" size={24} /> : 'Assinar Agora'}</button>
                <p className="text-[10px] text-zinc-500 text-center mt-6 uppercase tracking-wider font-medium">Cobrança recorrente mensal. Cancele quando quiser.</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Watch;
