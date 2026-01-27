
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Video, PixPayment } from '../types';
import { videoService } from '../services/videoService';
import { authService } from '../services/authService';
import { channelService } from '../services/channelService';
import { subscriptionService } from '../services/subscriptionService';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import VideoCard from '../components/VideoCard';
import { Bell, CheckCircle, DollarSign, Edit, Crown, X, Loader2, Check, Copy, Info, Calendar, Globe, Instagram } from 'lucide-react';
import { pixService } from '../services/pixService';
import { membershipPaymentService } from '../services/membershipPaymentService';
import { formatCompactNumber } from '../services/utils';

const ChannelPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { theme } = useSettings();

  const [creator, setCreator] = useState<User | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isChannelMember, setIsChannelMember] = useState(false);
  const [subCount, setSubCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'videos' | 'about'>('videos');

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberStep, setMemberStep] = useState<'plans' | 'payment'>('plans');
  const [memberQrCode, setMemberQrCode] = useState<any>(null);
  const [isProcessingSub, setIsProcessingSub] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportStep, setSupportStep] = useState<'amount' | 'qr'>('amount');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [currentPixPayment, setCurrentPixPayment] = useState<PixPayment | null>(null);


  useEffect(() => {
    // Se eu sou o dono, já posso mostrar meus dados antes mesmo do banco responder (INSTANTÂNEO)
    if (user && id === user.id) {
      setCreator(user);
      setLoading(false);
    }

    if (id && !authLoading) {
      loadData();
    }
  }, [id, user, authLoading]);

  const loadData = async () => {
    if (!id) return;

    // Se já temos o criador (porque é o dono), não precisamos da tela cinza total
    const needsFullLoading = !creator;
    if (needsFullLoading) setLoading(true);

    try {
      const found = await authService.getUserById(id);

      if (found) {
        setCreator(found);
      } else if (user && user.id === id) {
        setCreator(user);
      } else {
        setCreator(null);
      }

      const targetId = id;
      const creatorVideos = await videoService.getByCreator(targetId);
      setVideos(creatorVideos);
      const count = await channelService.getSubscriberCount(targetId);
      setSubCount(count);

      if (user) {
        const subscribed = await channelService.isSubscribed(user.id, targetId);
        setIsSubscribed(subscribed);
        const subs = await subscriptionService.getUserSubscriptions(user.id);
        setIsChannelMember(subs.some(s => s.type === 'channel' && s.channelId === targetId && s.status === 'active'));
      }
    } catch (e) {
      console.error('Erro ao carregar canal:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user) { navigate('/auth'); return; }
    const newState = await channelService.toggleSubscribe(user.id, id!);
    setIsSubscribed(newState);
    setSubCount(prev => newState ? prev + 1 : prev - 1);
  };

  const handleJoin = () => {
    if (!user) { navigate('/auth'); return; }
    if (isChannelMember) { navigate('/viewer-panel'); return; }
    setShowMemberModal(true);
  };

  const handleSupport = () => { if (!user) { navigate('/auth'); return; } setShowSupportModal(true); setSupportStep('amount'); };

  const generatePix = (amount: number) => {
    if (!creator || !user) return;
    setSelectedAmount(amount);
    const payment = pixService.generatePixPayment(creator.id, creator.pixKey || 'seed@pix.com', creator.name, amount, user.name);

    setCurrentPixPayment(payment);
    setSupportStep('qr');
  };

  const handleCopyPix = () => {
    if (!currentPixPayment) return;
    navigator.clipboard.writeText(currentPixPayment.pixCopyPaste);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleConfirmPix = async () => {
    if (!currentPixPayment || !user || !creator) return;
    const success = await pixService.confirmPixPayment(
      creator.id,
      user.id,
      user.name,
      user.avatar,
      currentPixPayment.amount
    );
    if (success) {
      alert(`✅ Pix confirmado! Você apoiou ${creator!.name}!`);
      setShowSupportModal(false);
      setCustomAmount('');
      setCurrentPixPayment(null);
    } else {
      alert("❌ Erro ao confirmar Pix. Tente novamente.");
    }
  };

  const handleConfirmMembership = async () => {
    if (!creator || !user) return;
    setIsProcessingSub(true);
    try {
      const paymentData = await membershipPaymentService.createMembershipPayment(
        user.id, user.name, user.email || '', user.cpf || '', user.phone || '',
        creator.id, creator.name, creator.asaasWalletId || '', creator.membershipPrice || 9.90
      );
      setMemberQrCode(paymentData);
      setMemberStep('payment');
    } catch (e: any) {
      alert(e.message || "Erro ao gerar pagamento.");
    } finally { setIsProcessingSub(false); }
  };

  const handleFinalizeMembership = () => {
    if (!creator || !user || !memberQrCode) return;
    const success = membershipPaymentService.confirmMembershipPayment(memberQrCode.paymentId || memberQrCode.id, user.id, creator.id, creator.name, creator.avatar, creator.membershipPrice || 9.90);
    if (success) {
      setIsChannelMember(true);
      setShowMemberModal(false);
      setMemberStep('plans');
      alert(`Parabéns! Agora você é membro do canal ${creator.name}!`);
    } else { alert('Erro ao ativar assinatura.'); }
  };

  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600';

  if (loading || authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-zinc-400 animate-pulse">Sincronizando canal...</p>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50'}`}>
        <div className="text-center p-8">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-white mb-2">Canal não encontrado</h1>
          <p className="text-zinc-400 mb-6">Não conseguimos localizar este canal no banco de dados.</p>
          <button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors">Voltar para o Início</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50'}`}>
      <div className="h-48 bg-zinc-900 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/50 to-purple-900/50"></div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 -mt-16 mb-8 relative z-10">
          <img src={creator.avatar} className="w-40 h-40 rounded-full border-4 border-[#0f0f0f] shadow-xl object-cover bg-zinc-800" alt="" />
          <div className="flex-1 pt-16 text-center md:text-left">
            <h1 className={`text-3xl font-bold flex items-center justify-center md:justify-start gap-2 ${textPrimary}`}>{creator.name} <CheckCircle size={20} className="text-blue-500 fill-current" /></h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-zinc-500 justify-center md:justify-start">
              <span>@{creator.id.substring(0, 8)}</span>
              <span>•</span>
              <span>{formatCompactNumber(subCount)} inscritos</span>
              <span>•</span>
              <span>{videos.length} vídeos</span>
            </div>
            {creator.channelMessage && (
              <p className="mt-3 text-sm text-zinc-400 font-medium italic">"{creator.channelMessage}"</p>
            )}

            {/* REDES SOCIAIS NA HEADER (QUICK ACCESS) */}
            <div className="flex gap-3 mt-4 justify-center md:justify-start">
              {creator.socialLinks?.instagram && (
                <a href={`https://instagram.com/${String(creator.socialLinks.instagram).replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 font-bold"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </a>
              )}
              {creator.socialLinks?.website && (
                <a href={creator.socialLinks.website.startsWith('http') ? creator.socialLinks.website : `https://${creator.socialLinks.website}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all">
                  <Globe size={18} />
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 md:pt-16">
            {user?.id === creator.id ? (
              <button onClick={() => navigate('/dashboard')} className="px-6 py-2.5 rounded-full font-bold bg-zinc-800 text-white flex items-center gap-2 hover:bg-zinc-700 transition-colors"><Edit size={18} /> Gerenciar</button>
            ) : (
              <>
                <button onClick={handleSubscribe} className={`px-6 py-2.5 rounded-full font-bold flex items-center gap-2 transition-all ${isSubscribed ? 'bg-zinc-800 text-zinc-300' : 'bg-white text-black hover:bg-zinc-200'}`}>{isSubscribed ? <><Bell size={18} /> Inscrito</> : 'Inscrever-se'}</button>
                <button onClick={handleJoin} className={`px-6 py-2.5 rounded-full font-bold flex items-center gap-2 border transition-all ${isChannelMember ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'border-zinc-700 text-white hover:bg-zinc-800'}`}>{isChannelMember && <Crown size={18} />} {isChannelMember ? 'Membro Ativo' : 'Seja Membro'}</button>
                <button onClick={handleSupport} className="border border-zinc-700 text-white hover:bg-zinc-800 px-6 py-2.5 rounded-full font-bold flex items-center gap-2 transition-colors"><DollarSign size={18} className="text-green-500" /> Apoiar</button>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-8 border-b border-zinc-800 mb-8">
          <button onClick={() => setActiveTab('videos')} className={`pb-4 text-sm font-bold transition-colors relative ${activeTab === 'videos' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Vídeos</button>
          <button onClick={() => setActiveTab('about')} className={`pb-4 text-sm font-bold transition-colors relative ${activeTab === 'about' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Sobre</button>
        </div>

        {activeTab === 'videos' ? (
          <div className="space-y-10 pb-20">
            {/* LIVE PLAYER (IF ACTIVE) */}
            {creator.liveId && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.8)]"></div>
                  <h2 className={`text-xl font-bold ${textPrimary}`}>AO VIVO AGORA</h2>
                </div>
                <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-2xl bg-black border border-zinc-800">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${creator.liveId}?autoplay=0`}
                    title="Live de ${creator.name}"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {videos.map(v => <VideoCard key={v.id} video={v} />)}
              {videos.length === 0 && !creator.liveId && <div className="col-span-full py-20 text-center text-zinc-500">Nenhum vídeo postado ainda.</div>}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pb-20">
            <div className="md:col-span-2 space-y-8">
              <section>
                <h3 className={`text-xl font-bold mb-4 ${textPrimary}`}>Descrição</h3>
                <p className={`text-zinc-400 whitespace-pre-wrap leading-relaxed`}>{creator.description || "O criador ainda não definiu uma descrição."}</p>

                {/* REDES SOCIAIS DETALHADAS */}
                {(creator.socialLinks?.instagram || creator.socialLinks?.website) && (
                  <div className="mt-12">
                    <h3 className={`text-xl font-bold mb-4 ${textPrimary}`}>Redes Sociais</h3>
                    <div className="space-y-3">
                      {creator.socialLinks?.instagram && (
                        <a href={`https://instagram.com/${String(creator.socialLinks.instagram).replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-zinc-400 hover:text-blue-400 transition-colors">
                          <span className="p-2 rounded-lg bg-zinc-900 border border-zinc-800"><Instagram size={18} /></span>
                          <span>Instagram: <span className="text-zinc-300 font-bold">@{String(creator.socialLinks.instagram).replace('@', '')}</span></span>
                        </a>
                      )}
                      {creator.socialLinks?.website && (
                        <a href={creator.socialLinks.website.startsWith('http') ? creator.socialLinks.website : `https://${creator.socialLinks.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-zinc-400 hover:text-blue-400 transition-colors">
                          <span className="p-2 rounded-lg bg-zinc-900 border border-zinc-800"><Globe size={18} /></span>
                          <span>Website: <span className="text-zinc-300 font-bold">{creator.socialLinks.website}</span></span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <h4 className={`font-bold mb-4 ${textPrimary}`}>Estatísticas</h4>
                <div className="space-y-4 text-sm text-zinc-400">
                  <div className="flex items-center gap-3"><Calendar size={18} /> Inscrito em {new Date(creator.createdAt || '').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</div>
                  <div className="flex items-center gap-3"><Info size={18} /> {formatCompactNumber(subCount)} inscritos</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL APOIO PIX */}
      {showSupportModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#18181b] border border-zinc-800 rounded-xl w-full max-w-md p-6 relative animate-fade-in shadow-2xl text-center">
            <button onClick={() => setShowSupportModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
            {supportStep === 'amount' ? (
              <div className="text-left">
                <h2 className="text-xl font-bold mb-1 flex items-center gap-2 text-white"><span className="text-green-500 text-2xl font-black">$</span> Apoiar {creator.name}</h2>
                <div className="grid grid-cols-3 gap-3 my-6">
                  {[5, 10, 20, 50, 100].map(amount => (
                    <button key={amount} onClick={() => generatePix(amount)} className="bg-zinc-800/50 hover:bg-zinc-700 border border-zinc-700 hover:border-green-500 rounded-lg py-4 text-lg font-bold text-white transition-all">R$ {amount}</button>
                  ))}
                </div>
                <input type="number" value={customAmount} onChange={e => setCustomAmount(e.target.value)} placeholder="Outro valor" className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-white outline-none mb-4" />
                {customAmount && <button onClick={() => generatePix(Number(customAmount))} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg">Gerar Pix</button>}
              </div>
            ) : (
              <div className="text-center">
                <h2 className="text-xl font-bold mb-4 text-white">Escaneie para pagar</h2>
                <div className="bg-white p-3 rounded-xl inline-block mb-4">
                  <img src={currentPixPayment?.qrCode} className="w-48 h-48 mx-auto" alt="QR Code" />
                </div>
                <p className="text-2xl font-bold text-green-400 mb-6 font-mono">R$ {selectedAmount?.toFixed(2)}</p>
                <div className="flex gap-2 mb-4">
                  <button onClick={handleCopyPix} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-lg flex items-center justify-center gap-2"><Copy size={18} /> {isCopied ? 'Copiado!' : 'Pix Copia e Cola'}</button>
                </div>
                <button onClick={handleConfirmPix} className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-bold py-4 rounded-xl shadow-lg">Já fiz o Pix</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL MEMBROS */}
      {showMemberModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-[#18181b] border border-zinc-800 rounded-2xl w-full max-w-[440px] p-8 relative animate-in fade-in zoom-in-95 shadow-2xl">
            <button onClick={() => { setShowMemberModal(false); setMemberStep('plans'); }} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"><X size={24} /></button>
            <div className="text-center mb-8"><h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2"><Crown size={24} className="text-yellow-500" /> {memberStep === 'plans' ? 'Seja Membro' : 'Pague com Pix'}</h2></div>
            {memberStep === 'plans' ? (
              <>
                <div className="w-full text-left p-5 rounded-2xl border-2 border-blue-600 bg-blue-600/5 ring-1 ring-blue-600 flex items-center gap-4 mb-8">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-600 text-white"><Check size={20} /></div>
                  <div className="flex-1 min-w-0"><h3 className="text-lg font-bold text-white">R$ {(creator.membershipPrice || 9.90).toFixed(2)}/mês</h3><p className="text-xs text-zinc-400 mt-1">Apoie o canal e libere benefícios exclusivos.</p></div>
                </div>
                <button onClick={handleConfirmMembership} disabled={isProcessingSub} className="w-full bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">{isProcessingSub ? <Loader2 className="animate-spin" /> : 'Gerar Pix'}</button>
              </>
            ) : (
              <div className="text-center">
                <div className="bg-white p-3 rounded-xl inline-block mb-4"><img src={memberQrCode?.qrCode} className="w-48 h-48 mx-auto" alt="QR" /></div>
                <p className="text-xl font-bold text-white mb-6">R$ {(creator.membershipPrice || 9.90).toFixed(2)}/mês</p>
                <div className="flex gap-2 mb-4">
                  <button onClick={() => { navigator.clipboard.writeText(memberQrCode?.pixCopyPaste || ''); alert('Copiado!'); }} className="flex-1 bg-zinc-800 text-white py-3 rounded-lg flex items-center justify-center gap-2"><Copy size={18} /> Copiar Código</button>
                </div>
                <button onClick={handleFinalizeMembership} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl">Já realizei o pagamento</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelPage;
