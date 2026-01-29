
import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { MOCK_CONVERSIONS } from '../services/mockData';
import { Plus, Layout, DollarSign, MousePointer, Eye, Activity, RefreshCw, Lock, Code, Copy, MessageSquare, Monitor, TabletSmartphone, Image, Type, Upload, Trash2, PauseCircle, PlayCircle, Ban, Filter, Loader2, AlertCircle, AlertTriangle, X, Shield, Zap, Star, Package, XCircle, CheckCircle, Crown, ShoppingCart, Calculator, Send, Video, Home, Clock, ArrowRight, ExternalLink, Share2, Sparkles } from 'lucide-react';
import { Campaign, AdStatus, AdPlanType, ConversionEvent, Transaction, PaymentMethod, AdvertiserProfile, Message, CampaignType, AdLocation } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { adService, TieredPricing } from '../services/adService';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { messageService } from '../services/messageService';
import { mercadoPagoService } from '../services/mercadoPagoService';
import { imageService } from '../services/imageService';

const CATEGORIES = [
  "Animais e Pets", "Arte e Animação", "Automóveis e Veículos", "Ciência",
  "Culinária e Gastronomia", "Design", "Educação", "Entretenimento", "Esporte",
  "Filmes e Animações", "Fitness e Saúde", "Jogos", "LGBTQ+", "Moda e Beleza",
  "Natureza", "Negócios e Finanças", "Religião e Espiritualismo", "Tecnologia", "Viagem e Turismo", "Vlogs e Vida Pessoal"
];

// Estado inicial definido fora para garantir reset limpo
const INITIAL_CAMPAIGN_STATE = {
  type: 'text' as CampaignType,
  location: 'video' as AdLocation,
  title: '',
  desktopDescription: '',
  mobileDescription: '',
  targetUrl: '',
  bannerImage: '',
  bannerSource: 'manual' as 'manual' | 'random',
  targetCategories: [] as string[],
  budget: 100
};

const AdvertiserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const { theme } = useSettings();

  // Purchase Simulation State
  const [targetViews, setTargetViews] = useState<number>(10000);
  const [packageType, setPackageType] = useState<'standard' | 'home'>('standard');

  // Dynamic Pricing State
  const [tieredPricing, setTieredPricing] = useState<TieredPricing | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  const userId = user?.id || 'adv1';

  // INICIALIZAÇÃO SEGURA DO ESTADO (Padrão enquanto carrega async)
  const [advertiser, setAdvertiser] = useState<AdvertiserProfile>({
    id: userId,
    companyName: user?.name || 'Novo Anunciante',
    balance: 0,
    standardImpressions: 0,
    homepageImpressions: 0,
    plan: 'basic'
  });

  useEffect(() => {
    if (user) {
      const loadInit = async () => {
        // Se não existir, o refreshData vai lidar ou o próprio user context
        // Apenas dispara refresh
        await refreshData();
        // Carrega preços do Admin
        const pricing = await adService.getTieredPricing();
        setTieredPricing(pricing);
      };
      loadInit();
    }
  }, [user, userId]);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [conversions, setConversions] = useState<ConversionEvent[]>(MOCK_CONVERSIONS);
  const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'packs' | 'messages'>('overview');

  // Messages State (Chat)
  const [conversation, setConversation] = useState<Message[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Polling para o Chat
  useEffect(() => {
    if (!user || activeTab !== 'messages') return;

    const poll = setInterval(() => {
      refreshData();
    }, 5000);

    return () => clearInterval(poll);
  }, [user, activeTab]);

  // Filtro de Campanhas
  const [statusFilter, setStatusFilter] = useState<'all' | AdStatus>('all');

  // Modals
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [showCampaignPaymentModal, setShowCampaignPaymentModal] = useState<Campaign | null>(null);
  const [showBannerPreview, setShowBannerPreview] = useState(false);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);

  // Payment State
  const [fundsStep, setFundsStep] = useState(1);
  const [depositAmount, setDepositAmount] = useState(100);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // New Campaign State
  const [newCampaign, setNewCampaign] = useState(INITIAL_CAMPAIGN_STATE);
  const [isCreating, setIsCreating] = useState(false); // TRAVA DE CRIAÇÃO

  // PIX STATES
  const [pixPaymentData, setPixPaymentData] = useState<{ id: string, qrCode: string, pixCopyPaste: string } | null>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);

  const handleGeneratePix = async () => {
    setIsGeneratingPix(true);
    setPixPaymentData(null);
    try {
      // ✅ DINHEIRO VAI 100% PARA A PLATAFORMA
      // Depois a plataforma repassa no dia 05
      const { asaasService } = await import('../services/asaasService');

      // Usa um cliente genérico da plataforma (não precisa criar cliente do anunciante)
      // O Asaas permite criar cobrança usando qualquer customer existente
      let customerId = '';

      try {
        // Busca qualquer cliente existente para usar na cobrança
        const customers = await asaasService.getCustomers(1);
        if (customers && customers.length > 0) {
          customerId = customers[0].id;
          console.log('[Advertiser] Usando cliente existente:', customerId);
        } else {
          // Se não tem nenhum, cria um genérico da plataforma
          const platformCustomer = await asaasService.createCustomer({
            name: 'Plataforma FairStream',
            cpfCnpj: '24971563792',
            email: 'plataforma@fairstream.com',
            phone: '47988888888'
          });

          if (platformCustomer && platformCustomer.id) {
            customerId = platformCustomer.id;
            console.log('[Advertiser] Cliente plataforma criado:', customerId);
          }
        }
      } catch (err) {
        console.error('[Advertiser] Erro ao buscar/criar cliente:', err);
        throw new Error('Falha ao preparar cliente');
      }

      if (!customerId) {
        throw new Error('Customer ID não disponível');
      }

      // Cria cobrança PIX SIMPLES - dinheiro vai 100% para a plataforma
      const paymentData = {
        customer: customerId,
        billingType: 'PIX' as const,
        value: depositAmount,
        dueDate: new Date().toISOString().split('T')[0],
        description: `Depósito Anunciante - ${advertiser.companyName || 'Anunciante'}`,
        externalReference: `deposit_platform_${advertiser.id}_${Date.now()}`
      };

      console.log('[Advertiser] Criando cobrança PIX para plataforma:', paymentData);
      const payment = await asaasService.createPayment(paymentData);

      if (!payment || !payment.id) {
        throw new Error('Falha ao criar cobrança');
      }

      console.log('[Advertiser] ✅ Cobrança criada - Dinheiro vai para PLATAFORMA:', payment.id);

      // Obtém QR Code
      const pixData = await asaasService.getPixQrCode(payment.id);

      if (!pixData || !pixData.encodedImage || !pixData.payload) {
        throw new Error('Falha ao gerar QR Code');
      }

      console.log('[Advertiser] QR Code gerado - Pagamento vai 100% para a plataforma');

      const data = {
        id: payment.id,
        qrCode: `data:image/png;base64,${pixData.encodedImage}`,
        pixCopyPaste: pixData.payload
      };

      setPixPaymentData(data);
      setFundsStep(3);
    } catch (error: any) {
      console.error('[Advertiser] ERRO:', error);
      alert("Erro ao gerar Pix: " + (error.message || error));
    } finally {
      setIsGeneratingPix(false);
    }
  };

  const handleCheckPayment = async () => {
    if (!pixPaymentData) return;
    setIsCheckingPayment(true);
    try {
      // ✅ VERIFICA STATUS VIA ASAAS
      const { asaasService } = await import('../services/asaasService');

      const status = await asaasService.getPaymentStatus(pixPaymentData.id);

      if (status === 'RECEIVED' || status === 'CONFIRMED') {
        // SUCESSO! Pagamento confirmado
        handleAddFunds(true); // true indica que é pagamento real confirmado
      } else {
        alert(`Pagamento ainda não confirmado (Status: ${status || 'pendente'}). Tente novamente em alguns segundos.`);
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao verificar status.");
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // Atualiza dados quando o usuário muda ou a tela carrega
  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (activeTab === 'messages') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

      // Marca como lido ao abrir a aba
      if (unreadMessages > 0) {
        // CRÍTICO: Marca como lido apenas as mensagens no contexto de 'advertiser'
        messageService.markConversationAsRead(userId, 'admin')
          .then(() => setUnreadMessages(0))
          .catch(err => console.error("Erro ao marcar como lido:", err));
      }
    }
  }, [conversation, activeTab, userId, unreadMessages]);

  const refreshData = async () => {
    if (!user) return;
    const currentUserId = user.id;

    const adv = await adService.getAdvertiser(currentUserId);
    if (adv) setAdvertiser(adv);

    // const campaigns = await adService.getCampaigns(currentUserId);
    const campaigns = await adService.getCampaigns(undefined);
    setCampaigns(campaigns);
    setTransactions(await adService.getTransactions(currentUserId));

    // Busca conversa E contagem de não lidos
    try {
      const msgs = await messageService.getConversation('admin', currentUserId);
      setConversation(msgs);

      const unread = msgs.filter((m: any) => m.toId === currentUserId && !m.read).length;
      setUnreadMessages(unread);
    } catch (e) {
      console.error("Erro ao carregar chat:", e);
    }
  };

  const totalImpressions = campaigns.reduce((acc, curr) => acc + curr.impressions, 0);
  const totalClicks = campaigns.reduce((acc, curr) => acc + curr.clicks, 0);
  const totalSpent = campaigns.reduce((acc, curr) => acc + curr.spent, 0);
  const totalRevenue = conversions.reduce((acc, curr) => acc + curr.value, 0);
  const roas = totalSpent > 0 ? (totalRevenue / totalSpent).toFixed(1) + 'x' : '0x';

  // --- LOGIC FOR DYNAMIC PRICING ---
  const getPricePerView = (views: number, type: 'standard' | 'home'): number => {
    if (!tieredPricing) return 0.20;

    // Homepage logic: Preço fixo definido pelo admin para a Home
    if (type === 'home') {
      return tieredPricing.homepagePrice ?? 0.30;
    }

    // Standard logic (Tiered) - com fallbacks seguros
    if (views >= 1000000) return tieredPricing.p1m ?? 0.10;
    if (views >= 500000) return tieredPricing.p500k ?? 0.15;
    return tieredPricing.p100k ?? 0.20;
  };

  const currentPricePerView = getPricePerView(targetViews, packageType);
  const totalCost = targetViews * currentPricePerView;

  const handleBuyViews = async () => {
    if (advertiser.balance < totalCost) {
      alert("Saldo insuficiente para esta compra. Por favor, adicione fundos.");
      setShowAddFundsModal(true);
      return;
    }

    // Deduz saldo monetário
    const newMoneyBalance = advertiser.balance - totalCost;

    // Incrementa saldo de impressões apropriado
    let newStandardBalance = advertiser.standardImpressions;
    let newHomepageBalance = advertiser.homepageImpressions;

    if (packageType === 'home') {
      newHomepageBalance += targetViews;
    } else {
      newStandardBalance += targetViews;
    }

    const updatedAdvertiser = {
      ...advertiser,
      balance: newMoneyBalance,
      standardImpressions: newStandardBalance,
      homepageImpressions: newHomepageBalance
    };

    // Atualiza serviço
    await adService.updateAdvertiser(updatedAdvertiser);
    setAdvertiser(updatedAdvertiser);

    // Registra transação
    const tx: Transaction = {
      id: `tx_buy_views_${Date.now()}`,
      advertiserId: advertiser.id,
      amount: totalCost,
      method: 'balance_deduction',
      status: 'completed',
      type: 'spend',
      date: new Date().toISOString(),
      description: `Compra de ${targetViews.toLocaleString()} visualizações (${packageType === 'home' ? 'Página Principal' : 'Padrão'})`
    };
    await adService.addTransaction(tx);
    setTransactions(prev => [tx, ...prev]);

    alert(`Compra confirmada! ${targetViews.toLocaleString()} visualizações foram adicionadas ao seu saldo de ${packageType === 'home' ? 'Home' : 'Padrão'}.`);
  };

  // State for upload error message
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Centralized image optimization used via handleBannerUpload

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setIsProcessingImage(false);

    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsProcessingImage(true);
        // 1. Otimiza a imagem
        const optimizedBlob = await imageService.optimizeImage(file, 1024, 0.7);

        // 2. Upload DIRETO para o Storage (evita Base64 sujo no estado)
        const publicUrl = await imageService.uploadToSupabase(optimizedBlob, 'campaigns', `adv_banner_${Date.now()}`);

        if (publicUrl) {
          setNewCampaign(prev => ({
            ...prev,
            bannerImage: publicUrl,
            bannerSource: 'manual'
          }));
        } else {
          throw new Error("Upload falhou");
        }
        setIsProcessingImage(false);
      } catch (err) {
        console.error("Image processing error:", err);
        setIsProcessingImage(false);
        setUploadError("Erro ao subir imagem para o Supabase. Tente novamente.");
      }
    }
  };

  // State for creation errors
  const [createError, setCreateError] = useState<string | null>(null);

  // --- NOVA LÓGICA DE CRIAÇÃO (SEM PAGAMENTO EXTRA - BASEADO EM SALDO DE VIEWS) ---
  const handleCreateCampaign = async () => {
    setCreateError(null); // Clear previous errors
    console.log("handleCreateCampaign called"); // DEBUG LOG

    if (isCreating) {
      console.log("Already creating (isCreating=true), ignoring click");
      return;
    }
    setIsCreating(true);

    try {
      const currentAdv = await adService.getAdvertiser(advertiser.id) || advertiser;
      console.log("Current Advertiser:", currentAdv); // DEBUG
      console.log("New Campaign input state:", newCampaign); // DEBUG

      // 1. Verificação de Saldo (Apenas Aviso, não bloqueia criação)
      const MIN_VIEWS = 1000;
      let hasEnoughBalance = true;

      if (newCampaign.location === 'home') {
        if (currentAdv.homepageImpressions < MIN_VIEWS) {
          hasEnoughBalance = false;
        }
      } else {
        if (currentAdv.standardImpressions < MIN_VIEWS) {
          hasEnoughBalance = false;
        }
      }

      if (newCampaign.targetCategories.length === 0) {
        setCreateError("Selecione pelo menos uma categoria alvo.");
        setIsCreating(false);
        return;
      }

      // Validações por tipo
      if (newCampaign.type === 'text') {
        if (!newCampaign.desktopDescription.trim() || !newCampaign.mobileDescription.trim()) {
          setCreateError("Preencha ambas as descrições (Computador e Celular).");
          setIsCreating(false);
          return;
        }
      } else if (newCampaign.type === 'image') {
        if (!newCampaign.bannerImage.trim() && newCampaign.bannerSource === 'manual') {
          setCreateError("Por favor, selecione uma imagem.");
          setIsCreating(false);
          return;
        }
      }

      if (!newCampaign.targetUrl.trim()) {
        setCreateError("Preencha a URL de destino.");
        setIsCreating(false);
        return;
      }

      // Banner final é o que foi upado manualmente
      let finalBanner = newCampaign.bannerImage;

      const campaignId = `camp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const campaign: Campaign = {
        id: campaignId,
        advertiserId: currentAdv.id,
        type: newCampaign.type,
        location: newCampaign.location,
        title: newCampaign.title,
        desktopDescription: newCampaign.type === 'text' ? newCampaign.desktopDescription : '',
        mobileDescription: newCampaign.type === 'text' ? newCampaign.mobileDescription : '',
        targetUrl: newCampaign.targetUrl,
        bannerImage: finalBanner,
        status: 'waiting_approval',
        budget: 0,
        spent: 0,
        impressions: 0,
        clicks: 0,
        targetCategories: newCampaign.targetCategories,
        createdAt: new Date().toISOString()
      };

      await adService.addCampaign(campaign);

      // Força refresh imediato dos dados locais
      await refreshData();

      if (!hasEnoughBalance) {
        alert('Campanha enviada para aprovação! Note que você não tem saldo de visualizações para este local. Compre um pacote após a aprovação para que o anúncio comece a rodar.');
      } else {
        alert('Campanha criada com sucesso! Ela foi enviada para análise e aguarda aprovação para começar a rodar.');
      }
      setShowNewCampaignModal(false);
      setNewCampaign(INITIAL_CAMPAIGN_STATE);

    } catch (e: any) {
      console.error(e);
      let msg = "Erro ao criar campanha.";
      if (e.name === 'QuotaExceededError' || e.message?.includes('quota')) {
        msg = "Erro: O armazenamento do navegador está cheio. A imagem do banner é muito pesada para salvar localmente. Tente uma imagem menor ou comprimida.";
      } else if (e.message) {
        msg = `Erro: ${e.message}`;
      }
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  // --- SIMULAÇÃO DE PAGAMENTO DE CAMPANHA (MERCADO PAGO) ---
  const handlePayCampaign = () => {
    if (!showCampaignPaymentModal) return;

    setIsProcessingPayment(true);

    // Simula webhook do Mercado Pago
    setTimeout(async () => {
      setIsProcessingPayment(false);

      // Atualiza status para WAITING_APPROVAL
      await adService.updateCampaignStatus(showCampaignPaymentModal.id, 'waiting_approval');

      // Registra transação financeira
      const tx: Transaction = {
        id: `tx_pay_cmp_${Date.now()}`,
        advertiserId: advertiser.id,
        amount: showCampaignPaymentModal.budget,
        method: 'credit_card', // Assumindo CC para simplificar simulação
        status: 'completed',
        type: 'spend',
        date: new Date().toISOString(),
        description: `Pagamento Campanha: ${showCampaignPaymentModal.title} (Via Mercado Pago)`
      };
      await adService.addTransaction(tx);
      setTransactions(prev => [tx, ...prev]);

      // Refresh list
      setCampaigns(prev => prev.map(c => c.id === showCampaignPaymentModal.id ? { ...c, status: 'waiting_approval' } : c));

      alert("Pagamento confirmado! Sua campanha foi enviada para aprovação.");
      setShowCampaignPaymentModal(null);
    }, 2000);
  };

  const handleUpdateStatus = async (campaignId: string, newStatus: AdStatus) => {
    if (newStatus === 'cancelled') {
      if (!confirm('Tem certeza que deseja cancelar esta campanha? Ela não poderá ser reativada.')) return;
    }

    await adService.updateCampaignStatus(campaignId, newStatus);

    setCampaigns(prev => prev.map(c =>
      c.id === campaignId ? { ...c, status: newStatus } : c
    ));
  };

  const handleToggleCategory = (category: string) => {
    if (newCampaign.targetCategories.includes(category)) {
      setNewCampaign({
        ...newCampaign,
        targetCategories: newCampaign.targetCategories.filter(c => c !== category)
      });
    } else {
      setNewCampaign({
        ...newCampaign,
        targetCategories: [...newCampaign.targetCategories, category]
      });
    }
  };

  const handleToggleAllCategories = () => {
    if (newCampaign.targetCategories.length === CATEGORIES.length) {
      setNewCampaign({ ...newCampaign, targetCategories: [] });
    } else {
      setNewCampaign({ ...newCampaign, targetCategories: [...CATEGORIES] });
    }
  };

  const handleAddFunds = async (isRealPayment = false) => {
    if (!selectedMethod && !isRealPayment) return;

    // Se for PIX e não veio da verificação real (isRealPayment), ignora (não deve acontecer com a nova UI)
    if (selectedMethod === 'pix' && !isRealPayment) return;

    const newTransaction: Transaction = {
      id: `tx_${Date.now()}`,
      advertiserId: advertiser.id,
      amount: depositAmount,
      method: selectedMethod,
      status: 'completed',
      type: 'deposit',
      date: new Date().toISOString(),
      description: selectedMethod === 'pix' ? 'Adição de Saldo - Pix' : 'Adição de Saldo - Cartão'
    };

    const updatedAdvertiser = { ...advertiser, balance: advertiser.balance + depositAmount };

    await adService.addTransaction(newTransaction);
    await adService.updateAdvertiser(updatedAdvertiser);

    setAdvertiser(updatedAdvertiser);
    setTransactions(prev => [newTransaction, ...prev]);

    alert('Pagamento confirmado! Seu saldo foi atualizado.');

    setShowAddFundsModal(false);
    setFundsStep(1);
    setSelectedMethod(null);
  };

  const handleSendChatMessage = async () => {
    if (!chatMessage.trim() || !user) return;

    try {
      await messageService.sendMessage({
        fromId: user.id,
        toId: 'admin',
        subject: 'Chat com Anunciante',
        body: chatMessage,
        fromName: advertiser.companyName || user.name || 'Anunciante',
        type: 'chat',
        fromRole: 'advertiser',
        toRole: 'owner'
      });

      setChatMessage('');
      await refreshData();
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      alert("Erro ao enviar mensagem para o suporte.");
    }
  };

  const handlePreviewBanner = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    console.log("handlePreviewBanner called", newCampaign);

    // Cria um objeto de campanha temporário simulação
    const simCampaign: Campaign = {
      id: 'preview',
      advertiserId: 'preview',
      type: newCampaign.type,
      location: newCampaign.location,
      title: newCampaign.title,
      desktopDescription: newCampaign.desktopDescription,
      mobileDescription: newCampaign.mobileDescription,
      targetUrl: newCampaign.targetUrl,
      bannerImage: newCampaign.bannerImage,
      status: 'active',
      budget: 0,
      spent: 0,
      impressions: 0,
      clicks: 0,
      targetCategories: newCampaign.targetCategories,
      createdAt: new Date().toISOString()
    };

    setPreviewCampaign(simCampaign);
  };

  const getStatusBadge = (status: AdStatus) => {
    const styles = {
      active: 'bg-green-900/30 text-green-400 border-green-800',
      pending: 'bg-zinc-800 text-zinc-400 border-zinc-700', // Legacy pending
      pending_payment: 'bg-orange-900/20 text-orange-400 border-orange-800',
      waiting_approval: 'bg-blue-900/30 text-blue-400 border-blue-800',
      rejected: 'bg-red-900/30 text-red-400 border-red-800',
      paused: 'bg-yellow-900/10 text-yellow-500 border-yellow-800',
      cancelled: 'bg-zinc-800 text-zinc-500 border-zinc-700 line-through'
    };

    const labels = {
      active: 'Ativa',
      pending: 'Rascunho',
      pending_payment: 'Aguardando Pagto',
      waiting_approval: 'Em Análise',
      rejected: 'Rejeitada',
      paused: 'Pausada',
      cancelled: 'Cancelada'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-bold border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const filteredCampaigns = campaigns.filter(c => {
    if (statusFilter === 'all') return true;
    return c.status === statusFilter;
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-blue-500" size={48} />
          <p className="text-zinc-400">Carregando painel...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-zinc-900 p-8 rounded-xl border border-zinc-800">
          <Lock className="mx-auto mb-4 text-yellow-500" size={48} />
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-zinc-400 mb-4">Faça login para acessar o Painel do Anunciante.</p>
          <button
            onClick={() => navigate('/auth')}
            className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg font-medium"
          >
            Fazer Login
          </button>
        </div>
      </div>
    );
  }

  return (
    // CONTAINER PRINCIPAL RESTRITO A 1200px E CENTRALIZADO
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layout className="text-blue-500" />
            Painel do Anunciante
          </h1>
          <p className="text-zinc-400">Gerencie suas campanhas e acompanhe resultados em tempo real.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <div className="text-xs text-zinc-400">Saldo Disponível</div>
            <div className="text-xl font-bold text-green-400">R$ {advertiser?.balance?.toFixed(2) || '0.00'}</div>
          </div>
          <button
            onClick={() => { setFundsStep(1); setShowAddFundsModal(true); }}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg hover:shadow-green-900/20"
          >
            <DollarSign size={18} /> Adicionar Saldo
          </button>
          <button
            onClick={() => setShowNewCampaignModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus size={18} /> Nova Campanha
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-zinc-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'border-blue-500 text-white' : 'border-transparent text-zinc-400 hover:text-white'}`}
        >
          Visão Geral
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'finance' ? 'border-green-500 text-white' : 'border-transparent text-zinc-400 hover:text-white'}`}
        >
          <DollarSign size={14} /> Financeiro
        </button>
        <button
          onClick={() => setActiveTab('packs')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'packs' ? 'border-purple-500 text-white' : 'border-transparent text-zinc-400 hover:text-white'}`}
        >
          <ShoppingCart size={14} /> Comprar Views
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap relative ${activeTab === 'messages' ? 'border-blue-300 text-white' : 'border-transparent text-zinc-400 hover:text-white'}`}
        >
          <MessageSquare size={14} /> Mensagens {unreadMessages > 0 && <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full absolute -top-1 -right-3">{unreadMessages}</span>}
        </button>
      </div>

      {/* ... (Overview, Finance, Packs sections remain unchanged) ... */}
      {/* CONTENT: Overview */}
      {activeTab === 'overview' && (
        <>
          {/* --- SEÇÃO DE SALDOS VISÍVEIS (SEPARADO) --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs uppercase font-bold tracking-wider flex items-center gap-2 mb-1"><Video size={14} className="text-blue-400" /> SALDO PADRÃO (VÍDEOS)</p>
                <div className="text-2xl font-bold text-white">{advertiser.standardImpressions.toLocaleString()} <span className="text-sm font-normal text-zinc-500">views</span></div>
              </div>
              <button onClick={() => setActiveTab('packs')} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded transition-colors">Comprar Mais</button>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs uppercase font-bold tracking-wider flex items-center gap-2 mb-1"><Layout size={14} className="text-purple-400" /> SALDO PÁGINA PRINCIPAL</p>
                <div className="text-2xl font-bold text-white">{advertiser.homepageImpressions.toLocaleString()} <span className="text-sm font-normal text-zinc-500">views</span></div>
              </div>
              <button onClick={() => setActiveTab('packs')} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded transition-colors">Comprar Mais</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-900/20 rounded-lg"><Eye size={20} className="text-blue-400" /></div>
                <span className="text-zinc-400 text-sm">Impressões</span>
              </div>
              <h3 className="text-2xl font-bold">{totalImpressions.toLocaleString()}</h3>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-900/20 rounded-lg"><MousePointer size={20} className="text-purple-400" /></div>
                <span className="text-zinc-400 text-sm">Cliques</span>
              </div>
              <h3 className="text-2xl font-bold">{totalClicks.toLocaleString()}</h3>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-900/20 rounded-lg"><DollarSign size={20} className="text-green-400" /></div>
                <span className="text-zinc-400 text-sm">Investimento</span>
              </div>
              <h3 className="text-2xl font-bold">R$ {totalSpent.toFixed(2)}</h3>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-yellow-900/20 rounded-lg"><Activity size={20} className="text-yellow-400" /></div>
                <span className="text-zinc-400 text-sm">ROAS</span>
              </div>
              <h3 className="text-2xl font-bold">{roas}</h3>
              <p className="text-xs text-zinc-500">Retorno sobre ad spend</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
            <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden w-full">
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                <h3 className="font-semibold text-white">Todas as Campanhas</h3>
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-zinc-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-zinc-950 border border-zinc-700 text-zinc-300 text-xs rounded px-2 py-1 outline-none"
                  >
                    <option value="all">Todas</option>
                    <option value="active">Ativas</option>
                    <option value="pending_payment">Aguardando Pagto</option>
                    <option value="waiting_approval">Em Análise</option>
                    <option value="paused">Pausadas</option>
                    <option value="rejected">Rejeitadas</option>
                    <option value="cancelled">Canceladas</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-950 text-zinc-400">
                    <tr>
                      <th className="p-4">Campanha</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Cliques</th>
                      <th className="p-4 text-center">Vistas</th>
                      <th className="p-4">Local</th>
                      <th className="p-4">Orçamento</th>
                      <th className="p-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {filteredCampaigns.map(campaign => (
                      <tr key={campaign.id} className="hover:bg-zinc-800/50">
                        <td className="p-4">
                          <div className="font-medium text-white">{campaign.title}</div>
                          <div className="text-xs text-zinc-500 flex items-center gap-1">
                            {campaign.type === 'image' ? <Image size={10} /> : <Type size={10} />}
                            {campaign.targetCategories.length} categorias
                          </div>
                        </td>
                        <td className="p-4">{getStatusBadge(campaign.status)}</td>
                        <td className="p-4 text-center font-bold text-purple-400">{(campaign.clicks || 0).toLocaleString()}</td>
                        <td className="p-4 text-center font-bold text-blue-400">{(campaign.impressions || 0).toLocaleString()}</td>
                        <td className="p-4 text-zinc-300 text-xs">{campaign.location === 'home' ? 'Home' : 'Vídeos'}</td>
                        <td className="p-4">R$ {campaign.budget.toFixed(2)}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2 items-center">

                            {/* Preview */}
                            <button onClick={() => setPreviewCampaign(campaign)} title="Visualizar Campanha" className="text-blue-400 hover:text-blue-300 p-2 bg-blue-900/10 rounded hover:bg-blue-900/30 transition-colors">
                              <Eye size={18} />
                            </button>

                            {/* PAGAR AGORA (Para pending_payment) */}
                            {campaign.status === 'pending_payment' && (
                              <button
                                onClick={() => setShowCampaignPaymentModal(campaign)}
                                className="text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 shadow-lg shadow-green-900/20"
                              >
                                <DollarSign size={14} /> Pagar
                              </button>
                            )}

                            {/* Pausar */}
                            {campaign.status === 'active' && (
                              <button onClick={() => handleUpdateStatus(campaign.id, 'paused')} title="Pausar Campanha" className="text-yellow-500 hover:text-yellow-400 p-2 bg-yellow-900/10 rounded hover:bg-yellow-900/30 transition-colors">
                                <PauseCircle size={18} />
                              </button>
                            )}

                            {/* Retomar */}
                            {campaign.status === 'paused' && (
                              <button onClick={() => handleUpdateStatus(campaign.id, 'active')} title="Retomar Campanha" className="text-green-500 hover:text-green-400 p-2 bg-green-900/10 rounded hover:bg-green-900/30 transition-colors">
                                <PlayCircle size={18} />
                              </button>
                            )}

                            {/* Cancelar */}
                            {(['active', 'paused', 'pending', 'pending_payment'].includes(campaign.status)) && (
                              <button onClick={() => handleUpdateStatus(campaign.id, 'cancelled')} title="Cancelar Definitivamente" className="text-red-500 hover:text-red-400 p-2 bg-red-900/10 rounded hover:bg-red-900/30 transition-colors">
                                <Ban size={18} />
                              </button>
                            )}

                            {/* Contestação */}
                            {campaign.status === 'rejected' && (
                              <button
                                onClick={() => { setActiveTab('messages'); setChatMessage(`Contestação da campanha "${campaign.title}": `); }}
                                className="text-xs bg-zinc-800 text-zinc-300 border border-zinc-600 px-3 py-1.5 rounded hover:bg-zinc-700 transition-colors"
                              >
                                Contestar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredCampaigns.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-zinc-500">Nenhuma campanha encontrada com este filtro.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Financeiro */}
      {activeTab === 'finance' && (
        <div className="space-y-6 w-full">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 w-full">
            <div>
              <h2 className="text-lg font-bold">Saldo Disponível</h2>
              <div className="text-3xl font-bold text-green-400 mt-2">R$ {advertiser?.balance?.toFixed(2) || '0.00'}</div>
              <p className="text-sm text-zinc-500 mt-1">Utilizado para campanhas e renovação de plano.</p>
            </div>
            <button
              onClick={() => { setFundsStep(1); setShowAddFundsModal(true); }}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-green-900/20"
            >
              <Plus size={20} /> Adicionar Créditos
            </button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden w-full">
            <div className="p-4 border-b border-zinc-800 font-semibold flex justify-between items-center">
              <span>Histórico de Transações</span>
              <button onClick={refreshData} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                <RefreshCw size={12} /> Atualizar
              </button>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-950 text-zinc-400">
                  <tr>
                    <th className="p-4">Data</th>
                    <th className="p-4">Descrição</th>
                    <th className="p-4">Método</th>
                    <th className="p-4">Valor</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-zinc-800/50">
                      <td className="p-4 text-zinc-300">{new Date(tx.date).toLocaleDateString()}</td>
                      <td className="p-4 font-medium text-white">{tx.description}</td>
                      <td className="p-4 capitalize text-zinc-300">{tx.method === 'balance_deduction' ? 'Saldo' : tx.method}</td>
                      <td className={`p-4 font-bold ${tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.type === 'deposit' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                      </td>
                      <td className="p-4">
                        <span className="text-xs px-2 py-0.5 rounded bg-green-900/30 text-green-400">Concluído</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- ABA PACOTES DE IMPRESSÕES / COMPRA DE VIEWS --- */}
      {activeTab === 'packs' && (
        <div className="space-y-8 animate-fade-in w-full">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Compre Visualizações (Preço Dinâmico)</h2>
            <p className="text-zinc-400">Quanto mais você compra, menos você paga por view.</p>
          </div>

          {/* --- SEÇÃO DE SALDO VISUAL (SEPARADO) --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-8">
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-center">
              <p className="text-zinc-400 text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2"><Video size={14} /> Saldo Padrão (Vídeos)</p>
              <div className="text-3xl font-bold text-blue-400 mt-2">{advertiser.standardImpressions.toLocaleString()}</div>
              <p className="text-xs text-zinc-500 mt-1">visualizações disponíveis</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-center">
              <p className="text-zinc-400 text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2"><Layout size={14} /> Saldo Página Principal</p>
              <div className="text-3xl font-bold text-purple-400 mt-2">{advertiser.homepageImpressions.toLocaleString()}</div>
              <p className="text-xs text-zinc-500 mt-1">visualizações disponíveis</p>
            </div>
          </div>

          {/* --- CALCULADORA DINÂMICA DE VIEWS --- */}
          <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-8">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Calculator className="text-blue-400" /> Simulador de Compra
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-4">
                  1. Escolha o Tipo de Pacote
                </label>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    onClick={() => setPackageType('standard')}
                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${packageType === 'standard' ? 'bg-blue-900/20 border-blue-500 text-blue-400' : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
                  >
                    <Video size={20} />
                    <span className="text-xs font-bold">Padrão</span>
                  </button>
                  <button
                    onClick={() => setPackageType('home')}
                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${packageType === 'home' ? 'bg-purple-900/20 border-purple-500 text-purple-400' : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
                  >
                    <Layout size={20} />
                    <span className="text-xs font-bold">Página Principal</span>
                  </button>
                </div>

                <label className="block text-sm font-medium text-zinc-300 mb-4">
                  2. Quantidade de Views Desejada
                </label>
                <input
                  type="range"
                  min="1000"
                  max="2000000"
                  step="1000"
                  value={targetViews}
                  onChange={(e) => setTargetViews(Number(e.target.value))}
                  className="w-full accent-blue-500 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer mb-4"
                />
                <div className="flex items-center gap-4 mb-8">
                  <input
                    type="number"
                    value={targetViews}
                    onChange={(e) => setTargetViews(Math.max(1000, Number(e.target.value)))}
                    className="bg-zinc-950 border border-zinc-700 rounded p-2 text-white w-32 font-bold text-lg text-center"
                  />
                  <span className="text-zinc-500">views</span>
                </div>

                {packageType === 'standard' ? (
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-zinc-400 mb-2">Tabela de Preços (Vídeos):</p>
                    <div className={`p-3 rounded-lg border transition-colors flex justify-between items-center ${targetViews < 500000 ? 'bg-blue-900/20 border-blue-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                      <span>Até 499k views</span>
                      <span className="font-bold">R$ {(tieredPricing?.p100k ?? 0.20).toFixed(2)} / view</span>
                    </div>
                    <div className={`p-3 rounded-lg border transition-colors flex justify-between items-center ${targetViews >= 500000 && targetViews < 1000000 ? 'bg-blue-900/20 border-blue-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                      <span>500k - 999k views</span>
                      <span className="font-bold">R$ {(tieredPricing?.p500k ?? 0.15).toFixed(2)} / view</span>
                    </div>
                    <div className={`p-3 rounded-lg border transition-colors flex justify-between items-center ${targetViews >= 1000000 ? 'bg-blue-900/20 border-blue-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                      <span>Acima de 1M views</span>
                      <span className="font-bold">R$ {(tieredPricing?.p1m ?? 0.10).toFixed(2)} / view</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-zinc-400 mb-2">Preço Fixo (Home):</p>
                    <div className="p-3 rounded-lg border bg-purple-900/20 border-purple-500 text-white flex justify-between items-center">
                      <span>Qualquer quantidade</span>
                      <span className="font-bold">R$ {(tieredPricing?.homepagePrice ?? 0.30).toFixed(2)} / view</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <p className="text-zinc-400 text-sm mb-1">Preço aplicado por view</p>
                  <p className="text-2xl font-bold text-white mb-6">R$ {currentPricePerView.toFixed(2)}</p>

                  <div className="border-t border-zinc-800 my-4"></div>

                  <div className="flex justify-between items-center mb-2">
                    <span className="text-zinc-400">Quantidade</span>
                    <span className="text-white font-medium">{targetViews.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-zinc-400">Total a Pagar</span>
                    <span className="text-3xl font-bold text-green-400">R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {advertiser.balance < totalCost && (
                    <div className="bg-red-900/20 border border-red-900/50 p-3 rounded text-sm text-red-300 flex items-center gap-2 mb-4 animate-pulse">
                      <AlertCircle size={16} /> Saldo insuficiente (R$ {advertiser.balance.toFixed(2)}). Adicione fundos para continuar.
                    </div>
                  )}

                  <button
                    onClick={handleBuyViews}
                    disabled={advertiser.balance < totalCost}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg shadow-lg shadow-green-900/20 transition-all flex items-center justify-center gap-2"
                  >
                    {advertiser.balance < totalCost ? (
                      <>
                        <Lock size={20} /> Saldo Insuficiente
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} /> Confirmar Compra de Views
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CHAT TAB --- */}
      {activeTab === 'messages' && (
        <div className="space-y-4 animate-fade-in flex flex-col h-[700px]">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2"><MessageSquare className="text-blue-400" /> Chat com Suporte/Admin</h2>
            <button onClick={refreshData} className="text-zinc-500 hover:text-white p-2"><RefreshCw size={16} /></button>
          </div>

          <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white/5">
              {conversation.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                  <MessageSquare size={48} className="mb-4 opacity-20" />
                  <p>Envie uma mensagem para iniciar o atendimento.</p>
                </div>
              ) : (
                conversation.map(msg => {
                  const isMe = msg.fromId === userId;
                  return (
                    <div key={msg.id} className={`flex w-full mb-[8px] ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-[12px_16px] rounded-[8px] text-[18px] font-medium font-['Segoe_UI','Roboto','Arial','sans-serif'] shadow-sm text-[#333333] ${isMe ? 'bg-[#e6f7ff]' : 'bg-[#f9f9f9]'}`}>
                        <div className="flex justify-between gap-4 mb-1 text-[12px] opacity-70 border-b border-black/10 pb-1">
                          <span className="font-bold">{msg.fromName}</span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-zinc-900 border-t border-zinc-800">
              <div className="flex gap-3 items-end">
                <textarea
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChatMessage();
                    }
                  }}
                  placeholder="Digite sua mensagem para o suporte..."
                  className="flex-1 w-full min-h-[120px] p-[12px] text-[18px] font-medium font-['Segoe_UI','Roboto','Arial','sans-serif'] text-[#333333] bg-[#f9f9f9] border border-[#cccccc] rounded-[8px] shadow-[0_1px_3px_rgba(0,0,0,0.1)] outline-none focus:border-blue-500 focus:shadow-md resize-none placeholder-zinc-400 custom-scrollbar"
                />
                <button
                  onClick={handleSendChatMessage}
                  disabled={!chatMessage.trim()}
                  className="bg-[#f0f0f0] border border-[#cccccc] hover:bg-[#e0e0e0] disabled:opacity-50 disabled:cursor-not-allowed text-[#333333] rounded-[8px] px-6 py-3 font-medium flex items-center justify-center gap-2 transition-colors shadow-sm h-fit text-[16px]"
                >
                  <Send size={20} />
                  <span className="text-sm">Enviar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}
      {/* ... (Modals remain unchanged for brevity, only the Chat logic was crucial) ... */}
      {showCampaignPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md p-6 relative flex flex-col animate-fade-in text-center">
            <button
              onClick={() => { if (!isProcessingPayment) setShowCampaignPaymentModal(null); }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
              disabled={isProcessingPayment}
            >
              <X size={24} />
            </button>

            <h3 className="text-xl font-bold mb-2">Pagamento de Campanha</h3>
            <p className="text-zinc-400 mb-6 text-sm">{showCampaignPaymentModal.title}</p>

            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-6">
              <p className="text-xs text-zinc-500 uppercase font-bold">Valor Total</p>
              <p className="text-3xl font-bold text-green-400">R$ {showCampaignPaymentModal.budget.toFixed(2)}</p>
            </div>

            {isProcessingPayment ? (
              <div className="py-8 flex flex-col items-center">
                <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
                <p className="font-bold text-white">Processando no Mercado Pago...</p>
                <p className="text-xs text-zinc-500">Aguardando confirmação do webhook</p>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handlePayCampaign}
                  className="w-full bg-[#009EE3] hover:bg-[#008CC9] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <span className="font-bold">Pagar com Mercado Pago</span>
                </button>
                <p className="text-xs text-zinc-500">
                  Ao confirmar, sua campanha será enviada para aprovação da administração.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {showNewCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg relative flex flex-col max-h-[90vh] overflow-hidden">

            {/* --- HEADER FIXO --- */}
            <div className="p-6 pb-2 border-b border-zinc-800 shrink-0 flex justify-between items-center bg-zinc-900 z-10">
              <h2 className="text-xl font-bold">Criar Nova Campanha</h2>
              <button
                onClick={() => setShowNewCampaignModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <XCircle size={24} />
              </button>
            </div>

            {/* --- CONTEÚDO SCROLLÁVEL --- */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

              {/* 1. TIPO DE CAMPANHA */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setNewCampaign({ ...newCampaign, type: 'text' })}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${newCampaign.type === 'text' ? 'bg-blue-900/20 border-blue-500 text-blue-400' : 'bg-zinc-950 border-zinc-700 hover:border-zinc-500 text-zinc-400'}`}
                >
                  <Type size={24} />
                  <span className="font-bold text-sm">Anúncio de Texto</span>
                </button>
                <button
                  onClick={() => setNewCampaign({ ...newCampaign, type: 'image' })}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${newCampaign.type === 'image' ? 'bg-purple-900/20 border-purple-500 text-purple-400' : 'bg-zinc-950 border-zinc-700 hover:border-zinc-500 text-zinc-400'}`}
                >
                  <Image size={24} />
                  <span className="font-bold text-sm">Banner Visual</span>
                </button>
              </div>

              {/* 2. TÍTULO */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Título da Campanha</label>
                <input
                  type="text"
                  value={newCampaign.title}
                  onChange={e => setNewCampaign({ ...newCampaign, title: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-white font-medium"
                  placeholder="Ex: Promoção de Verão"
                />
              </div>

              {/* 3. DESCRIÇÃO OU IMAGEM */}
              {newCampaign.type === 'text' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1 flex items-center gap-2">
                      <Monitor size={14} className="text-blue-400" />
                      Descrição do Anúncio (até 500 caracteres)
                    </label>
                    <textarea
                      value={newCampaign.desktopDescription}
                      onChange={e => setNewCampaign({
                        ...newCampaign,
                        desktopDescription: e.target.value,
                        mobileDescription: e.target.value
                      })}
                      className={`w-full bg-zinc-950 border rounded-lg px-3 py-2 outline-none resize-none h-28 transition-colors text-white ${newCampaign.desktopDescription.length > 500
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-zinc-700 focus:border-blue-500'
                        }`}
                      placeholder="Escreva a descrição que aparecerá tanto no computador quanto no celular..."
                    />
                    <div className={`text-right text-xs mt-1 font-medium ${newCampaign.desktopDescription.length > 500 ? 'text-red-500' : 'text-zinc-500'}`}>
                      {newCampaign.desktopDescription.length} / 500
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <Image size={14} className="text-purple-400" /> Banner da Campanha
                    </label>
                  </div>

                  <div className="space-y-4">
                    {isProcessingImage && (
                      <div className="bg-blue-900/20 border border-blue-500/50 rounded p-3 mb-3 text-sm text-blue-400 font-bold flex items-center gap-2 animate-pulse">
                        <Loader2 size={16} className="animate-spin" />
                        Processando e otimizando imagem...
                      </div>
                    )}

                    {uploadError && (
                      <div className="bg-red-900/20 border border-red-500/50 rounded p-3 mb-3 text-sm text-red-400 font-bold flex items-center gap-2">
                        <AlertCircle size={16} />
                        {uploadError}
                      </div>
                    )}

                    {!newCampaign.bannerImage ? (
                      <div className="relative w-full h-32">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBannerUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="w-full h-full border-2 border-zinc-700 border-dashed rounded-lg flex flex-col items-center justify-center bg-zinc-950 hover:bg-zinc-900 transition-colors">
                          <Upload size={24} className="text-zinc-500 mb-2" />
                          <p className="mb-1 text-sm text-zinc-400 font-bold">Clique para enviar</p>
                          <p className="text-[10px] text-zinc-500 mb-1 font-medium">Recomendado: 1280x720 (16:9)</p>
                          <p className="text-xs text-zinc-600">JPG, PNG ou GIF</p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full h-40 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-700 flex items-center justify-center">
                        <img src={newCampaign.bannerImage} alt="Preview" className="h-full object-contain" />
                        <button
                          onClick={() => setNewCampaign(prev => ({ ...prev, bannerImage: '' }))}
                          className="absolute top-2 right-2 bg-black/70 hover:bg-red-600 text-white p-2 rounded-full transition-colors z-20"
                          title="Remover imagem"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 4. URL DE DESTINO */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">URL de Destino</label>
                <input
                  type="text"
                  value={newCampaign.targetUrl}
                  onChange={e => setNewCampaign({ ...newCampaign, targetUrl: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-white font-medium"
                  placeholder="https://sualoja.com.br/produto"
                />
                <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1 font-bold">
                  <AlertTriangle size={12} /> Se detectarmos links maliciosos sua conta será banida!
                </p>
              </div>

              {/* 5. LOCAL DE EXIBIÇÃO */}
              <div className="pt-2 border-t border-zinc-800">
                <label className="block text-sm font-medium text-zinc-300 mb-3">Local de Exibição</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${newCampaign.location === 'video' ? 'bg-blue-900/10 border-blue-500' : 'bg-zinc-900 border-zinc-700'}`}>
                    <input
                      type="radio"
                      name="location"
                      checked={newCampaign.location === 'video'}
                      onChange={() => setNewCampaign({ ...newCampaign, location: 'video' })}
                      className="accent-blue-500"
                    />
                    <div>
                      <span className="block text-white font-bold text-sm">Em Vídeos</span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${advertiser.homepageImpressions > 0
                    ? (newCampaign.location === 'home' ? 'bg-purple-900/10 border-purple-500 cursor-pointer' : 'bg-zinc-900 border-zinc-700 cursor-pointer')
                    : 'bg-zinc-950 border-zinc-800 opacity-60 cursor-not-allowed'
                    }`}>
                    <input
                      type="radio"
                      name="location"
                      checked={newCampaign.location === 'home'}
                      onChange={() => {
                        if (advertiser.homepageImpressions > 0) setNewCampaign({ ...newCampaign, location: 'home' });
                      }}
                      disabled={advertiser.homepageImpressions <= 0}
                      className="accent-purple-500"
                    />
                    <div>
                      <span className="block text-white font-bold text-sm">Página Principal</span>
                    </div>
                  </label>
                </div>
                {advertiser.homepageImpressions <= 0 && (
                  <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle size={10} /> Sem saldo para Home.
                  </p>
                )}
              </div>

              {/* 6. CATEGORIAS */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-zinc-300">Categorias Alvo</label>
                  <button
                    onClick={handleToggleAllCategories}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    {newCampaign.targetCategories.length === CATEGORIES.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                  </button>
                </div>

                <div className="bg-zinc-950 border border-zinc-700 rounded-lg p-3 h-40 overflow-y-auto grid grid-cols-1 gap-2 custom-scrollbar">
                  {CATEGORIES.map(cat => (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer hover:bg-zinc-900 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={newCampaign.targetCategories.includes(cat)}
                        onChange={() => handleToggleCategory(cat)}
                        className="rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-zinc-300">{cat}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Selecionado: {newCampaign.targetCategories.length} categorias
                </p>
              </div>

            </div>

            {/* --- FOOTER FIXO (BOTÕES) --- */}
            <div className="p-6 pt-4 border-t border-zinc-800 bg-zinc-900 shrink-0">
              {createError && (
                <div className="bg-red-900/20 border border-red-500/50 rounded p-3 text-sm text-red-400 font-bold flex items-center gap-2 mb-3 animate-pulse">
                  <AlertCircle size={16} />
                  {createError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handlePreviewBanner}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2"
                >
                  <Eye size={18} /> Visualizar
                </button>
                <div className="flex-[2]">
                  <button
                    onClick={handleCreateCampaign}
                    disabled={isCreating}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
                  >
                    {isCreating ? <Loader2 className="animate-spin" /> : 'Lançar Campanha'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {
        showBannerPreview && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
            <div className="relative max-w-sm w-full bg-transparent">
              {/* Simulação do componente BannerOverlay */}
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden shadow-2xl border-2 border-zinc-800 hover:border-blue-500 transition-colors bg-black group">
                <button
                  onClick={() => setShowBannerPreview(false)}
                  className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full hover:bg-red-600 z-30 transition-colors"
                >
                  <X size={16} />
                </button>
                <a
                  href={newCampaign.targetUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full h-full cursor-pointer"
                  onClick={(e) => e.preventDefault()} // Previne navegação no preview
                >
                  <img src={newCampaign.bannerImage} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 bg-black/70 text-white text-[10px] px-2 py-0.5">Patrocinado</div>
                </a>
              </div>
              <p className="text-center text-zinc-400 text-sm mt-4">Pré-visualização do Banner</p>
              <button onClick={() => setShowBannerPreview(false)} className="mx-auto block mt-2 text-white hover:underline">Fechar</button>
            </div>
          </div>
        )
      }

      {/* CAMPAIGN PREVIEW MODAL */}
      {
        previewCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-5xl relative animate-fade-in overflow-hidden shadow-2xl">
              <button
                onClick={() => setPreviewCampaign(null)}
                className="absolute top-4 right-4 z-50 bg-black/50 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
              >
                <X size={24} />
              </button>

              <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Eye className="text-blue-500" /> Visualização da Campanha
                </h2>
                <p className="text-sm text-zinc-400">Simulação de como sua campanha aparece para os usuários na plataforma.</p>
              </div>

              <div className="p-8 bg-[#000000] min-h-[500px] flex flex-col items-center justify-center relative">

                {/* VIDEO ADS PREVIEW (Dynamic) */}
                {previewCampaign.location === 'video' && (
                  <div className="w-full max-w-[800px] bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden shadow-2xl">
                    {/* Simulated Player */}
                    <div className="aspect-video bg-zinc-900 relative group overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <PlayCircle size={64} className="text-zinc-800 opacity-50" />
                      </div>

                      {/* VIDEO AD OVERLAY LOGIC */}
                      {previewCampaign.type === 'image' ? (
                        /* --- IMAGE AD (POPUP STYLE) --- */
                        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[70%] aspect-video bg-transparent z-50 animate-fade-in pointer-events-none md:pointer-events-auto">
                          <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl border-2 border-zinc-800 bg-black group">
                            <div className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full z-50"><X size={12} /></div>

                            {previewCampaign.bannerImage || newCampaign.bannerImage ? (
                              <img src={previewCampaign.bannerImage || newCampaign.bannerImage} alt="Ad" className="w-full h-full object-cover" />
                            ) : (
                              <img
                                src={`https://picsum.photos/seed/adv_camp_${encodeURIComponent(previewCampaign.title || 'generic')}/1280/720`}
                                alt="Ad"
                                className="w-full h-full object-cover"
                              />
                            )}

                            {/* Overlay de texto sobre a imagem para garantir que apareça (como no print) */}
                            <div className="absolute bottom-0 left-0 bg-black/70 text-white text-[10px] px-2 py-0.5">Patrocinado</div>
                          </div>
                        </div>
                      ) : (
                        /* --- TEXT AD (BOTTOM BAR STYLE) --- */
                        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[90%] max-w-[600px] bg-zinc-900/95 backdrop-blur-md border border-zinc-700 p-6 rounded-xl shadow-2xl z-50 flex flex-col gap-4 animate-fade-in pointer-events-none md:pointer-events-auto">
                          <div className="flex justify-between items-start relative">
                            <div className="flex-1 pr-6">
                              <span className="text-xs font-bold bg-[#FFD700] text-black px-2 py-1 rounded uppercase tracking-wide">PATROCINADO</span>
                              <h4 className="font-bold text-white text-lg mt-2">{previewCampaign.title || "Título do Anúncio"}</h4>
                              <p className="text-sm text-zinc-200 mt-2 leading-relaxed whitespace-pre-wrap">{previewCampaign.desktopDescription || "Descrição do anúncio..."}</p>
                            </div>
                            <div className="text-zinc-500 hover:text-white p-1 rounded-full absolute top-0 right-0 cursor-pointer"><X size={14} /></div>
                          </div>
                          <button className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-center text-sm font-bold py-3 rounded-lg transition-colors shadow-lg mt-3 shrink-0">
                            Visitar Site <ExternalLink size={14} />
                          </button>
                        </div>
                      )}

                      {/* Fake Progress Bar */}
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-zinc-800">
                        <div className="w-1/3 h-full bg-red-600"></div>
                      </div>
                    </div>

                    {/* Simulated Video Metadata (The Context) */}
                    <div className="p-4 bg-black">
                      <h3 className="text-xl font-bold text-white mb-3 line-clamp-1">Tutorial: Como Criar Campanhas de Sucesso 2024</h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">FA</div>
                          <div>
                            <div className="font-bold text-white text-sm">Fagner Advertiser</div>
                            <div className="text-zinc-500 text-xs">1.2M inscritos</div>
                          </div>
                          <button className="ml-2 bg-white text-black text-xs font-bold px-4 py-2 rounded-full hover:bg-zinc-200 transition-colors">
                            Inscrito
                          </button>
                        </div>
                        <div className="flex gap-2 text-zinc-400">
                          <div className="flex items-center gap-1 bg-zinc-900 px-3 py-1.5 rounded-full"><Type size={16} /><span className="text-xs font-bold">12K</span></div>
                          <div className="flex items-center gap-1 bg-zinc-900 px-3 py-1.5 rounded-full"><Share2 size={16} /><span className="text-xs font-bold">Compartilhar</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* HOME BANNER PREVIEW (Dynamic Faithful Replica) */}
                {previewCampaign.location === 'home' && (
                  <div className="w-full flex justify-center py-8 bg-black/50">
                    <div className="w-full max-w-[360px] flex flex-col gap-2 relative animate-fade-in group pointer-events-none md:pointer-events-auto">
                      {/* Main Visual Card */}
                      <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-zinc-800 transition-colors shadow-2xl">
                        {newCampaign.type === 'image' ? (
                          <>
                            <img
                              src={newCampaign.bannerSource === 'random'
                                ? `https://picsum.photos/seed/adv_camp_${encodeURIComponent(newCampaign.title || 'generic')}/1280/720`
                                : (newCampaign.bannerImage || "https://placehold.co/800x400/101010/FFF?text=Sem+Imagem")
                              }
                              alt={newCampaign.title}
                              className="w-full h-full object-contain bg-zinc-950"
                            />
                            <div className="absolute top-2 right-2 bg-purple-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg z-20">
                              PATROCINADO
                            </div>
                          </>
                        ) : (
                          // Layout Visual para Anúncio de Texto (Igual Home.tsx)
                          <div className="w-full h-full p-6 flex flex-col justify-between bg-gradient-to-br from-zinc-900 to-zinc-950 text-left">
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">ANÚNCIO</span>
                                <h3 className="font-bold text-lg leading-tight text-white line-clamp-2">{previewCampaign.title || "Título do Anúncio"}</h3>
                              </div>
                              <p className="text-sm text-zinc-400 line-clamp-4">
                                {previewCampaign.desktopDescription || "Descrição do anúncio aparecerá aqui..."}
                              </p>
                            </div>
                            <div className="mt-2 flex items-center gap-1 text-blue-500 text-xs font-bold uppercase tracking-wider">
                              <ExternalLink size={14} /> Saiba Mais
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer do Card (Igual Home.tsx) */}
                      <div className="flex gap-3 px-1 text-left">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center border shrink-0 ${previewCampaign.type === 'text' ? 'bg-blue-900/20 border-blue-600/50 text-blue-500' : 'bg-purple-600/20 border-purple-600/50 text-purple-600'}`}>
                          <span className="font-bold text-xs">AD</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold truncate text-white">{previewCampaign.title || "Título do Anúncio"}</h3>

                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-zinc-950 p-4 text-center text-xs text-zinc-500 border-t border-zinc-800">
                * Esta é uma simulação (mockup). O resultado final pode variar dependendo do dispositivo do usuário.
              </div>
            </div>
          </div>
        )
      }

      {
        showAddFundsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg p-6 relative animate-fade-in">
              <button
                onClick={() => { setShowAddFundsModal(false); setFundsStep(1); setSelectedMethod(null); }}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white"
              >
                <XCircle size={24} />
              </button>

              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <DollarSign className="text-green-500" /> Adicionar Saldo
              </h2>

              {fundsStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Quanto você quer adicionar?</label>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {[50, 100, 500, 1000, 2000, 5000].map(val => (
                        <button
                          key={val}
                          onClick={() => setDepositAmount(val)}
                          className={`py-3 rounded-lg border font-medium transition-all ${depositAmount === val
                            ? 'bg-green-600 border-green-500 text-white'
                            : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500'
                            }`}
                        >
                          R$ {val}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-zinc-500">R$</span>
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(Number(e.target.value))}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 outline-none focus:border-green-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setFundsStep(2)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg"
                  >
                    Continuar
                  </button>
                </div>
              )}

              {fundsStep === 2 && (
                <div className="space-y-6">
                  <p className="text-zinc-400 text-sm">Valor selecionado: <span className="text-white font-bold">R$ {depositAmount.toFixed(2)}</span></p>
                  <div className="space-y-3">
                    <button
                      onClick={() => setSelectedMethod('pix')}
                      className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all ${selectedMethod === 'pix' ? 'bg-green-900/20 border-green-500' : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-750'}`}
                    >
                      <div className="text-left flex-1">
                        <div className="font-bold text-white">Pix (Instantâneo)</div>
                      </div>
                      {selectedMethod === 'pix' && <CheckCircle className="text-green-500" />}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      if (selectedMethod === 'pix') {
                        handleGeneratePix();
                      } else {
                        // Outros métodos (simulação antiga ou futuro)
                        setFundsStep(3);
                      }
                    }}
                    disabled={!selectedMethod || isGeneratingPix}
                    className="flex-1 w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
                  >
                    {isGeneratingPix ? <Loader2 className="animate-spin" /> : 'Gerar Pagamento'}
                  </button>
                </div>
              )}

              {fundsStep === 3 && (
                <div className="text-center py-4">
                  {selectedMethod === 'pix' && pixPaymentData ? (
                    <div className="flex flex-col items-center animate-fade-in">
                      <p className="text-zinc-300 mb-4 text-sm font-bold">Escaneie o QR Code para pagar via Pix</p>

                      <div className="bg-white p-2 rounded-lg mb-4">
                        <img src={pixPaymentData.qrCode} alt="Pix QR Code" className="w-48 h-48" />
                      </div>

                      <div className="w-full bg-zinc-950 p-3 rounded border border-zinc-800 mb-4 flex items-center justify-between gap-2">
                        <span className="text-xs text-zinc-500 truncate max-w-[200px]">{pixPaymentData.pixCopyPaste}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(pixPaymentData.pixCopyPaste);
                            alert("Código Pix Copiado!");
                          }}
                          className="text-blue-500 text-xs font-bold hover:underline"
                        >
                          Copiar
                        </button>
                      </div>

                      <button
                        onClick={handleCheckPayment}
                        disabled={isCheckingPayment}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
                      >
                        {isCheckingPayment ? <Loader2 className="animate-spin" size={18} /> : 'Pronto, já paguei!'}
                      </button>
                      <p className="text-xs text-zinc-500 mt-2">O saldo será liberado automaticamente após a confirmação.</p>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-zinc-300 mb-6 text-sm">Simulação de Pagamento...</p>
                      <button
                        onClick={() => handleAddFunds(false)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg"
                      >
                        Confirmar Simulação
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      }
    </div >
  );
};

export default AdvertiserDashboard;
