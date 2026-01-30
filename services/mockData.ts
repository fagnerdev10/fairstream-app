
import { Video, User, Comment, CreatorStats, Channel, Campaign, AdvertiserProfile, Transaction, ConversionEvent, AdminFinancialSettings, SupportTransaction } from '../types';

// Template for new users (not logged in by default)
export const INITIAL_USER_TEMPLATE: User = {
  id: 'u_template',
  name: 'Novo Usuário',
  avatar: 'https://picsum.photos/seed/newuser/150/150',
  email: '',
  phone: '',
  role: 'viewer',
  isCreator: false,
  interests: ['Tecnologia', 'Design'],
  pixKey: '',
  pixKeyType: 'email'
};

export const MOCK_SUPPORT_TRANSACTIONS: SupportTransaction[] = [
  {
    id: 'sup1',
    supporterName: 'Maria Silva',
    supporterAvatar: 'https://picsum.photos/seed/maria/100/100',
    amount: 10.00,
    date: '2025-05-20T14:30:00',
    status: 'completed',
    creatorId: 'c1',
    paymentMethod: 'pix'
  },
  {
    id: 'sup2',
    supporterName: 'João Santos',
    supporterAvatar: 'https://picsum.photos/seed/joao/100/100',
    amount: 50.00,
    date: '2025-05-18T10:15:00',
    status: 'completed',
    creatorId: 'c1',
    paymentMethod: 'pix'
  }
];

export const MOCK_VIDEOS: Video[] = [
  // VÍDEO ALVO: CASO SAMSUNG S22 (Correspondência Exata/Forte)
  {
    id: 'v_samsung_1',
    title: 'Meu Samsung Galaxy S22 Plus apareceu uma linha verde na tela - Resolvido?',
    description: 'Relato completo sobre o problema crônico da linha verde (green line) no display AMOLED do S22 Plus após a atualização de segurança. Veja como acionei a garantia.',
    thumbnailUrl: 'https://placehold.co/1280x720/1a1a1a/FFF?text=Linha+Verde+S22+Plus',
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    creator: {
      id: 'c_tech_repair',
      name: 'Tech Repair BR',
      avatar: 'https://ui-avatars.com/api/?name=Tech+Repair&background=0D8ABC&color=fff',
      role: 'creator',
      isCreator: true,
      interests: ['Tecnologia', 'Reparo'],
      pixKey: 'tech@pix.com',
      pixKeyType: 'email'
    },
    views: 85430,
    uploadDate: '2 semanas atrás',
    duration: '12:45',
    tags: ['Samsung', 'S22 Plus', 'Linha Verde', 'Defeito', 'Tela', 'Garantia'],
    aiSummary: 'O vídeo aborda o defeito da linha verde em telas Samsung e o processo de troca.',
    transcription: 'hoje vamos falar sobre o problema da linha verde que apareceu no meu samsung galaxy s22 plus logo depois de atualizar o android. muita gente está reclamando desse defeito no display amoled.',
    chapters: [
      { timestamp: '00:00', title: 'O Problema da Linha Verde' },
      { timestamp: '03:20', title: 'Contato com a Samsung' },
      { timestamp: '08:15', title: 'Troca da Tela Cortesia' }
    ]
  },

  // VÍDEO RELACIONADO: OUTRO MODELO, MESMO PROBLEMA (Correspondência Semântica)
  {
    id: 'v_samsung_2',
    title: 'Defeito no Display: Linhas Verticais em Celulares Samsung',
    description: 'Análise técnica sobre porque telas OLED e AMOLED tendem a apresentar falhas de linhas verticais (rosa ou verde) com o tempo ou superaquecimento.',
    thumbnailUrl: 'https://placehold.co/1280x720/000/FFF?text=Defeitos+Tela+OLED',
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    creator: {
      id: 'c_hardware_pro',
      name: 'Hardware Pro',
      avatar: 'https://ui-avatars.com/api/?name=Hardware+Pro&background=random',
      role: 'creator',
      isCreator: true,
      interests: ['Hardware'],
      pixKey: 'hw@pix.com'
    },
    views: 12000,
    uploadDate: '1 mês atrás',
    duration: '08:20',
    tags: ['Hardware', 'Display', 'Samsung', 'Manutenção'],
    transcription: 'analisando o conector do flat cable da tela, percebemos que o superaquecimento causa descolamento, gerando a famosa linha na tela.',
    chapters: []
  },

  // VÍDEO RELACIONADO: TUTORIAL DE CONSERTO (Intenção de usuário)
  {
    id: 'v_repair_1',
    title: 'Como trocar a tela do S22 Ultra em Casa (Passo a Passo)',
    description: 'Guia completo de desmontagem e troca do módulo frontal. Cuidado: procedimento de alto risco.',
    thumbnailUrl: 'https://placehold.co/1280x720/333/FFF?text=Troca+de+Tela+S22',
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    creator: {
      id: 'c_diy_fix',
      name: 'Faça Você Mesmo',
      avatar: 'https://ui-avatars.com/api/?name=DIY&background=orange',
      role: 'creator',
      isCreator: true,
      interests: []
    },
    views: 4500,
    uploadDate: '3 meses atrás',
    duration: '25:00',
    tags: ['Tutorial', 'DIY', 'S22 Ultra', 'Conserto'],
    transcription: 'primeiro remova a tampa traseira com calor. cuidado com os cabos flex.',
    chapters: []
  },

  // VÍDEO GENÉRICO DE TECNOLOGIA (Para testar ordenação inferior)
  {
    id: 'v_tech_review',
    title: 'Review Completo: Samsung Galaxy S24 Ultra - Vale a pena?',
    description: 'Testamos as câmeras, bateria e a nova tela plana do topo de linha da Samsung para 2024.',
    thumbnailUrl: 'https://placehold.co/1280x720/111/FFF?text=Review+S24+Ultra',
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    creator: {
      id: 'c1',
      name: 'Tech Visionary',
      avatar: 'https://picsum.photos/seed/c1/100/100',
      role: 'creator',
      isCreator: true,
      interests: [],
      pixKey: 'tech@pix.com'
    },
    views: 540000,
    uploadDate: '2 dias atrás',
    duration: '18:30',
    tags: ['Samsung', 'S24', 'Review', 'Celular'],
    aiSummary: 'Review positivo focando em IA e câmeras.',
    transcription: 'a samsung acertou em cheio na construção, mas o preço ainda é salgado.',
    chapters: []
  },

  // VÍDEOS ALEATÓRIOS (Para encher a Home)
  {
    id: 'v1',
    title: 'O Futuro do Design de Interfaces com IA',
    description: 'Como a inteligência artificial está mudando a forma como criamos produtos digitais.',
    thumbnailUrl: 'https://picsum.photos/seed/tech1/640/360',
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    creator: {
      id: 'c1',
      name: 'Tech Visionary',
      avatar: 'https://picsum.photos/seed/c1/100/100',
      role: 'creator',
      isCreator: true,
      interests: [],
      pixKey: 'techvisionary@pix.com'
    },
    views: 124000,
    uploadDate: '2 dias atrás',
    duration: '14:20',
    tags: ['Design', 'AI', 'UX'],
    aiSummary: 'Uma visão geral sobre ferramentas de IA no design.',
    transcription: 'hoje vamos falar sobre figma e plugins de inteligência artificial.',
    chapters: [
      { timestamp: '00:00', title: 'Introdução' },
      { timestamp: '02:15', title: 'Ferramentas Generativas' }
    ]
  },
  {
    id: 'v2',
    title: 'Viagem Solo: Patagônia em 4K',
    description: 'Uma jornada visualmente deslumbrante através das montanhas.',
    thumbnailUrl: 'https://picsum.photos/seed/travel/640/360',
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    creator: {
      id: 'c2',
      name: 'Nature Explorer',
      avatar: 'https://picsum.photos/seed/c2/100/100',
      role: 'creator',
      isCreator: true,
      interests: [],
      pixKey: 'nature@pix.com'
    },
    views: 8900,
    uploadDate: '5 horas atrás',
    duration: '22:15',
    tags: ['Travel', 'Nature', '4K'],
    transcription: 'o vento aqui é muito forte, mas a vista compensa tudo.',
    chapters: []
  },
  {
    id: 'v_cook_1',
    title: 'Bolo de Cenoura com Cobertura de Chocolate Crocante',
    description: 'A receita secreta da vovó para o bolo mais fofinho do mundo.',
    thumbnailUrl: 'https://placehold.co/1280x720/orange/white?text=Bolo+Cenoura',
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    creator: {
      id: 'c_chef',
      name: 'Cozinha Fácil',
      avatar: 'https://ui-avatars.com/api/?name=Chef&background=red',
      role: 'creator',
      isCreator: true,
      interests: []
    },
    views: 2300,
    uploadDate: '1 dia atrás',
    duration: '08:45',
    tags: ['Culinária', 'Receita', 'Bolo'],
    transcription: 'misture a cenoura, o óleo e os ovos no liquidificador.',
    chapters: []
  },
  {
    id: 'seed_bolo_chocolate_001',
    title: 'Bolo de Chocolate Molhadinho (Receita da Vó)',
    description: 'Aprenda a fazer aquele bolo de chocolate fofinho com cobertura crocante que todo mundo ama. Receita simples, rápida e infalível!',
    thumbnailUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    creator: {
      id: 'c_chef',
      name: 'Cozinha Fácil',
      avatar: 'https://ui-avatars.com/api/?name=Chef&background=red',
      role: 'creator',
      isCreator: true,
      interests: []
    },
    views: 15420,
    uploadDate: '5 dias atrás',
    duration: '10:30',
    tags: ['Culinária', 'Bolo', 'Chocolate', 'Receita Fácil'],
    likes: 120,
    likedBy: [],
    chapters: []
  }
];

export const MOCK_COMMENTS: Comment[] = [
  {
    id: 'cm1',
    userId: 'u2',
    userName: 'Sarah Jenkins',
    userAvatar: 'https://picsum.photos/seed/sarah/100/100',
    text: 'A explicação foi incrível! Ajudou muito.',
    timestamp: '04:20',
    likes: 156,
    isQualityComment: true,
    denunciado: false,
    elogio: true,
    fixado: false,
    replies: []
  }
];

export const CREATOR_STATS: CreatorStats = {
  views: 1250000,
  qualifiedWatchTime: 8500, // hours
  communityScore: 92,
  estimatedRevenue: 4500.50,
  subscriberGrowth: 1200,
  dates: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
  revenueData: [3000, 3200, 2800, 3900, 4100, 4500],
  engagementData: [70, 75, 72, 85, 88, 92] // Community score trend
};

export const MOCK_CHANNELS: Channel[] = [
  {
    id: 'c1',
    name: 'Tech Visionary',
    avatar: 'https://picsum.photos/seed/c1/100/100',
    subscribers: 125000,
    status: 'active',
    joinedDate: '12 Jan 2024',
    warnings: 0
  },
  {
    id: 'c_tech_repair',
    name: 'Tech Repair BR',
    avatar: 'https://ui-avatars.com/api/?name=Tech+Repair&background=0D8ABC&color=fff',
    subscribers: 45000,
    status: 'active',
    joinedDate: '10 Fev 2024',
    warnings: 0
  }
];

// --- Advertiser Mock Data ---

export const CURRENT_ADVERTISER: AdvertiserProfile = {
  id: 'adv1',
  companyName: 'NextGen Solutions',
  balance: 1500.00,
  standardImpressions: 50000,
  homepageImpressions: 20000,
  plan: 'pro',
  apiKeys: [
    { id: 'key_1', key: 'fs_live_9827349823...', createdAt: '2025-01-15', status: 'active' }
  ]
};

export const MOCK_CAMPAIGNS: Campaign[] = [];

export const MOCK_CONVERSIONS: ConversionEvent[] = [];
export const MOCK_TRANSACTIONS: Transaction[] = [];
export const MOCK_ADMIN_SETTINGS: AdminFinancialSettings = {
  pixKey: 'contato@fairstream.com',
  gatewayConnected: true,
  gatewayProvider: 'asaas',
  autoWithdraw: false
};

// --- FUNÇÃO PARA GERAR DADOS DIÁRIOS CORRETOS POR MÊS ---
export const generateDailyReportData = (month: number, year: number) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const data = [];
  // Seed random fixo para não pular (simulado simples)
  for (let i = 1; i <= daysInMonth; i++) {
    const revenue = 1000 + ((i * 37 + month * 100) % 4000); // Pseudo-random determinístico
    const expenses = 500 + ((i * 19 + month * 50) % 1500);
    const name = `${i.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}`;

    data.push({
      name,
      revenue,
      expenses,
      date: `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`
    });
  }
  return data;
};

// --- FUNÇÃO PARA GERAR DADOS SEMANAIS ---
export const generateWeeklyReportData = () => {
  return [
    { name: 'Semana 1', revenue: 15400, expenses: 4500, date: 'Week 1' },
    { name: 'Semana 2', revenue: 18200, expenses: 5100, date: 'Week 2' },
    { name: 'Semana 3', revenue: 16800, expenses: 4800, date: 'Week 3' },
    { name: 'Semana 4', revenue: 21000, expenses: 6200, date: 'Week 4' },
  ];
};

// --- FUNÇÃO PARA GERAR DADOS MENSAIS (ANUAL VIEW) ---
export const generateMonthlyReportData = () => {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return months.map((m, i) => ({
    name: m,
    revenue: 45000 + ((i * 1234) % 20000),
    expenses: 12000 + ((i * 567) % 5000),
    date: `2025-${i + 1}`
  }));
};

// --- FUNÇÃO PARA GERAR DADOS ANUAIS (HISTÓRICO) ---
export const generateAnnualReportData = () => {
  return [
    { name: '2021', revenue: 450000, expenses: 150000, date: '2021' },
    { name: '2022', revenue: 680000, expenses: 210000, date: '2022' },
    { name: '2023', revenue: 920000, expenses: 280000, date: '2023' },
    { name: '2024', revenue: 1250000, expenses: 390000, date: '2024' },
    { name: '2025 (Proj)', revenue: 1500000, expenses: 450000, date: '2025' },
  ];
};
