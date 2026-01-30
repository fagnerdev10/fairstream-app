
export type UserRole = 'viewer' | 'creator' | 'advertiser' | 'owner';
export type PixKeyType = 'email' | 'phone' | 'cpf' | 'cnpj' | 'random';
export type ChannelStatus = 'active' | 'warned' | 'suspended';

export interface PlatformCampaign {
  id: string;
  title: string;
  imageUrl?: string;
  targetUrl: string;
  isActive: boolean;
  views: number;
  clicks: number;
  location: 'home' | 'sidebar' | 'footer';
  createdAt?: string;
  desktopDescription?: string;
  mobileDescription?: string;
}

// Nova interface para Inscrição Gratuita
export interface ChannelSubscription {
  followerId: string;
  creatorId: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  type: 'channel' | 'global';
  channelId?: string; // Only for channel subscription
  channelName?: string; // Cached for display
  channelAvatar?: string; // Cached for display
  price: number;
  startDate: string;
  nextBillingDate?: string;
  paymentMethod?: 'credit_card' | 'pix';
  status: 'active' | 'cancelled';
}

export interface BillingHistoryItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'paid' | 'refunded' | 'failed';
  paymentMethod: string;
}

export interface ManualCost {
  id: string;
  description: string;
  amount: number;
  date: string;
}

export interface SocialLinks {
  instagram?: string;
  website?: string;
}



export interface Balance {
  available: number;
  pending: number;
  totalEarned: number;
  totalWithdrawn: number;
  monetizationTotal?: number;
  membershipTotal?: number;
  viewsCount?: number;
  membershipCount?: number;
}

export interface SupportContribution {
  id: string;
  creatorId: string;
  amount: number;
  name: string;
  message: string;
  date: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  email?: string;
  phone?: string;
  role: UserRole;
  isCreator: boolean; // Kept for backward compatibility
  isPremium?: boolean; // Legacy field, mapped to Global Subscription
  subscriptions?: Subscription[]; // New field for active subscriptions
  interests: string[];
  pixKey?: string;
  pixKeyType?: PixKeyType;
  status?: ChannelStatus;
  warnings?: number;
  createdAt?: string;
  // Novos campos de perfil
  description?: string;
  channelMessage?: string; // Nova mensagem de destaque do canal
  socialLinks?: SocialLinks;
  isSeed?: boolean; // Flag para identificar conteúdo gerado automaticamente


  cpf?: string; // Novo campo para repasse mensal
  payoutEmail?: string; // Campo opcional para contato de repasse
  payoutHolderName?: string; // Nome do titular da conta para repasse
  membershipPrice?: number; // Preço da assinatura do canal
  lastActive?: number; // Timestamp da última atividade
  asaasWalletId?: string; // Carteira para Split Automático (Asaas)
  asaasApiKey?: string; // API Key da Subconta (Asaas)
  blockedChannels?: string[]; // IDs de canais bloqueados
  ignoredChannels?: string[]; // IDs de canais ignorados
  liveId?: string; // ID da Live do YouTube
}

export interface SupportTransaction {
  id: string;
  creatorId: string;
  supporterId?: string;
  supporterName: string;
  supporterAvatar: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending';
  pixKey?: string;
  paymentMethod: 'pix';
}


// Novos tipos para sistema de pagamentos
export interface PixPayment {
  id: string;
  creatorId: string;
  creatorPixKey: string;
  amount: number;
  qrCode: string;
  qrCodeBase64?: string;
  pixCopyPaste: string;
  status: 'pending' | 'completed' | 'expired';
  createdAt: string;
  completedAt?: string;
  supporterName?: string;
}


export interface SplitPaymentRecord {
  id: string;
  paymentId: string;
  creatorId: string;
  creatorToken: string;
  totalAmount: number;
  creatorShare: number;
  platformShare: number;
  platformFeePercentage: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  type: 'membership' | 'donation' | 'monetization';
  origin?: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface PayoutRequest {
  id: string;
  creatorId: string;
  amount: number;
  pixKey: string;
  pixKeyType: PixKeyType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  processedAt?: string;
  errorMessage?: string;
  transactionId?: string;
}

export interface Chapter {
  title: string;
  timestamp: string; // "MM:SS"
  description?: string;
}

export type ThumbnailSource = 'manual' | 'ai' | 'frame' | 'random';

// --- VIDEO QUALITY TYPES ---
export type VideoQualityLabel = 'Auto' | '1080p' | '720p' | '480p' | '360p' | '240p' | '144p';

export interface VideoSources {
  '1080p'?: string;
  '720p'?: string;
  '480p'?: string;
  '360p'?: string;
  '240p'?: string;
  '144p'?: string;
  [key: string]: string | undefined; // Fallback
}

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  thumbnailSource?: ThumbnailSource;
  videoUrl: string; // Fallback/Original URL
  sources?: VideoSources; // New field for multi-quality
  creator: User;
  views: number;
  uploadDate: string;
  duration: string;
  tags: string[];
  aiSummary?: string;
  transcription?: string; // Novo campo para busca profunda
  recommendationReason?: string;
  chapters?: Chapter[];
  likedBy?: string[];
  likes?: number;
  blockedUserIds?: string[]; // Moderation: blocked users for this context
  pinnedCommentId?: string; // Moderation: ID of the pinned comment
  relevanceScore?: number; // Campo temporário para ranking de busca
  isSeed?: boolean; // Flag para identificar conteúdo gerado automaticamente
  category?: string;

  // ✅ NOVOS CAMPOS PARA MONETIZAÇÃO POR ANÚNCIOS
  adImpressions?: number; // Total de impressões de anúncios neste vídeo
  paidAdImpressions?: number; // Impressões já pagas ao criador
  paidViews?: number; // DEPRECATED: Usar paidAdImpressions em vez disso

  // Novos metadados para Seed Data Rico
  simulatedContent?: string[]; // Array de strings com timestamp e título
  difficulty?: string;
  ingredients?: string[];
  apps?: string[];
  rating?: number;
  calories?: string;
  platform?: string;
  bestTime?: string;
  level?: string;
  studyTime?: string;
  minInvestment?: string;
  risk?: string;
  prerequisites?: string;
  bunnyVideoId?: string; // GUID do Bunny.net
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: string;
  isQualityComment: boolean;
  replies?: Comment[];

  // Moderation & Interaction fields
  ehCriador?: boolean;
  denunciado?: boolean;
  elogio?: boolean;
  fixado?: boolean;
  likes?: number;
}

export interface CreatorStats {
  views: number;
  qualifiedWatchTime: number;
  communityScore: number;
  estimatedRevenue: number;
  subscriberGrowth: number;
  dates: string[];
  revenueData: number[];
  engagementData: number[];
}

export enum AiActionStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error'
}

export interface Channel {
  id: string;
  name: string;
  avatar: string;
  subscribers: number;
  status: ChannelStatus;
  joinedDate: string;
  warnings: number;
}

// --- Advertiser System Types ---

export type AdStatus = 'active' | 'pending' | 'rejected' | 'paused' | 'cancelled' | 'pending_payment' | 'waiting_approval';
export type AdPlanType = 'basic' | 'pro' | 'premium';
export type CampaignType = 'text' | 'image';
export type AdLocation = 'video' | 'home';

export interface AdPlan {
  id: AdPlanType;
  name: string;
  price: number;
  features: string[];
}

export interface Campaign {
  id: string;
  advertiserId: string;
  type: CampaignType;
  location: AdLocation;
  title: string;
  desktopDescription?: string;
  mobileDescription?: string;
  targetUrl: string;
  bannerImage?: string;
  status: AdStatus;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  targetCategories: string[];
  createdAt: string;
}

export interface AdvertiserProfile {
  id: string;
  companyName: string;
  balance: number;
  standardImpressions: number;
  homepageImpressions: number;
  plan: AdPlanType;
  cpfCnpj?: string;
  apiKeys?: ApiKey[];
}


// --- Conversion API Types ---

export interface ApiKey {
  id: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
  status: 'active' | 'revoked';
}

export interface ConversionEvent {
  id: string;
  campaignId: string;
  eventName: string;
  value: number;
  currency: string;
  timestamp: string;
  source: 'api' | 'pixel';
}

// --- Financial System Types ---

export type PaymentMethod = 'pix' | 'credit_card' | 'boleto';
export type TransactionStatus = 'completed' | 'pending' | 'failed';
export type TransactionType = 'deposit' | 'spend' | 'subscription' | 'membership_revenue';

export interface Transaction {
  id: string;
  advertiserId: string;
  amount: number;
  method: PaymentMethod | 'balance_deduction';
  status: TransactionStatus;
  type: TransactionType;
  date: string;
  description: string;
  invoiceUrl?: string;
  platformShare?: number;
  creatorShare?: number;
  creatorId?: string;
}

export interface AdminFinancialSettings {
  pixKey: string;
  pixKeyType: 'cpf' | 'email' | 'phone' | 'random';
  entityType: 'cpf' | 'cnpj';
  gatewayConnected: boolean;
  gatewayProvider: 'asaas' | 'stripe';
  autoWithdraw: boolean;
}

export interface Message {
  id: string;
  fromId: string;
  toId: string;
  subject: string;
  body: string;
  fromName: string;
  read?: boolean;
  type?: 'chat' | 'warning' | 'system';
  fromRole?: UserRole; // Quem enviou
  toRole?: UserRole;   // Quem recebe (contexto da thread)
  createdAt: string;
}

// --- Broadcast System Types ---

export type BroadcastRole = 'all' | 'creator' | 'advertiser' | 'viewer';
export type BroadcastStyle = 'info' | 'warning' | 'alert' | 'success';

export interface BroadcastMessage {
  id: string;
  content: string;
  targetRole: BroadcastRole;
  style: BroadcastStyle;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

// --- Report System Types ---

export interface Report {
  id: string;
  videoId: string;
  videoTitle: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  createdAt: string;
  status: 'pending' | 'reviewed';
}
