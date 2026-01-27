
import { User, Video, Chapter } from '../types';

const USERS_DB_KEY = 'fairstream_users_db_v4';
const VIDEOS_DB_KEY = 'fairstream_videos_db_v8';

// --- HELPER FUNCTIONS ---

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 7) return `há ${days} dias`;
  if (days < 30) return `há ${Math.floor(days / 7)} semana${Math.floor(days / 7) > 1 ? 's' : ''}`;
  if (days < 365) return `há ${Math.floor(days / 30)} mês${Math.floor(days / 30) > 1 ? 'es' : ''}`;
  return `há ${Math.floor(days / 365)} ano${Math.floor(days / 365) > 1 ? 's' : ''}`;
};

// --- RICH SEED DATA ---

const SEED_CHANNELS_DATA = [
    {
      id: 'seed_channel_tech',
      name: 'Tech Academy Pro',
      handle: '@techacademypro',
      description: 'Cursos de programação e tecnologia do zero ao avançado.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TechAcademyPro',
      banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1200&h=300&fit=crop',
      subscribers: 356000,
      createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
      category: 'Tecnologia'
    },
    {
      id: 'seed_channel_culinaria',
      name: 'Chef Maria Culinária',
      handle: '@chefmariacozinha',
      description: 'Receitas tradicionais e técnicas profissionais.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ChefMaria',
      banner: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=300&fit=crop',
      subscribers: 289000,
      createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      category: 'Culinária'
    },
    {
      id: 'seed_channel_gamer',
      name: 'Game Masters BR',
      handle: '@gamemastersbr',
      description: 'Gameplays e reviews do universo gamer.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=GameMastersBR',
      banner: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&h=300&fit=crop',
      subscribers: 542000,
      createdAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
      category: 'Games'
    },
    {
      id: 'seed_channel_fitness',
      name: 'Fitness Evolution',
      handle: '@fitnessevolution',
      description: 'Transforme seu corpo com treinos em casa.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=FitnessEvolution',
      banner: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&h=300&fit=crop',
      subscribers: 412000,
      createdAt: new Date(Date.now() - 220 * 24 * 60 * 60 * 1000),
      category: 'Fitness'
    },
    {
      id: 'seed_channel_viagens',
      name: 'Mundo Viajante Pro',
      handle: '@mundoviajantepro',
      description: 'Descubra os melhores destinos do mundo.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MundoViajantePro',
      banner: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=300&fit=crop',
      subscribers: 267000,
      createdAt: new Date(Date.now() - 170 * 24 * 60 * 60 * 1000),
      category: 'Viagens'
    },
    {
      id: 'seed_channel_educacao',
      name: 'Aprenda Fácil Pro',
      handle: '@aprendafacilpro',
      description: 'Cursos online para desenvolvimento pessoal.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AprendaFacilPro',
      banner: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=300&fit=crop',
      subscribers: 198000,
      createdAt: new Date(Date.now() - 160 * 24 * 60 * 60 * 1000),
      category: 'Educação'
    },
    {
      id: 'seed_channel_financas',
      name: 'Finanças Inteligentes',
      handle: '@financasinteligentes',
      description: 'Educação financeira e investimentos.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=FinancasInteligentes',
      banner: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&h=300&fit=crop',
      subscribers: 324000,
      createdAt: new Date(Date.now() - 190 * 24 * 60 * 60 * 1000),
      category: 'Finanças'
    },
    {
      id: 'seed_channel_fotografia',
      name: 'Fotografia Master',
      handle: '@fotografiamaster',
      description: 'Técnicas profissionais de fotografia.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=FotografiaMaster',
      banner: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&h=300&fit=crop',
      subscribers: 156000,
      createdAt: new Date(Date.now() - 140 * 24 * 60 * 60 * 1000),
      category: 'Fotografia'
    }
];

const SEED_VIDEOS_DATA = [
    // 1. BOLO DE CHOCOLATE
    {
      id: 'seed_bolo_chocolate_001',
      channelId: 'seed_channel_culinaria',
      title: 'Bolo de Chocolate FÁCIL em 15 Minutos - Receita Completa',
      description: '🔥 APRENDA A FAZER O MELHOR BOLO DE CHOCOLATE DA SUA VIDA! Receita passo a passo com ingredientes simples que você tem em casa. Perfeito para café da tarde, aniversários ou quando bate aquela vontade de doce.',
      videoUrl: 'https://www.youtube.com/embed/4NShV8gcfiY',
      thumbnail: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1280&h=720&fit=crop',
      duration: 925,
      views: 2450000,
      likes: 189000,
      publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      tags: ['receita', 'bolo', 'chocolate', 'culinária', 'fácil'],
      category: 'Culinária',
      // Metadata Extra
      difficulty: 'Fácil',
      ingredients: ['farinha', 'açúcar', 'cacau', 'ovos', 'leite', 'óleo', 'fermento'],
      simulatedContent: [
        '00:00 - Introdução e ingredientes',
        '02:15 - Preparando a massa',
        '05:30 - Segredo da fofura',
        '08:45 - Assando',
        '11:20 - Cobertura de chocolate',
        '13:50 - Degustação'
      ]
    },

    // 2. APRENDER PYTHON
    {
      id: 'seed_python_001',
      channelId: 'seed_channel_tech',
      title: 'Python para INICIANTES - Aprenda do ZERO em 1 HORA',
      description: '🚀 CURSO RÁPIDO DE PYTHON! Aprenda a programar em Python mesmo se nunca tiver escrito uma linha de código. Variáveis, funções, loops e muito mais com exemplos práticos.',
      videoUrl: 'https://www.youtube.com/embed/rfscVS0vtbw',
      thumbnail: 'https://images.unsplash.com/photo-1526379879527-8559ecfcaec9?w=1280&h=720&fit=crop',
      duration: 3720,
      views: 1890000,
      likes: 124000,
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      tags: ['python', 'programação', 'tutorial', 'iniciantes', 'curso'],
      category: 'Tecnologia',
      // Metadata Extra
      difficulty: 'Iniciante',
      prerequisites: 'Nenhum',
      simulatedContent: [
        '00:00 - Por que Python?',
        '05:20 - Instalação (VS Code)',
        '12:45 - Hello World',
        '18:30 - Variáveis',
        '32:40 - Condicionais (if/else)',
        '42:10 - Loops',
        '55:40 - Projeto Final'
      ]
    },

    // 3. REVIEW SAMSUNG S24
    {
      id: 'seed_s24_review_001',
      channelId: 'seed_channel_tech',
      title: 'Samsung Galaxy S24 Ultra - Review COMPLETO 2024',
      description: '📱 TESTAMOS POR 2 SEMANAS O NOVO S24 ULTRA! Análise completa da câmera de 200MP, processador Snapdragon 8 Gen 3 e recursos de IA. Vale a pena o investimento?',
      videoUrl: 'https://www.youtube.com/embed/9qyY5wXQ_bI',
      thumbnail: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=1280&h=720&fit=crop',
      duration: 2845,
      views: 3250000,
      likes: 198000,
      publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      tags: ['samsung', 's24', 'ultra', 'review', 'smartphone'],
      category: 'Tecnologia',
      // Metadata Extra
      rating: 4.8,
      simulatedContent: [
        '00:00 - Unboxing',
        '04:30 - Design',
        '10:15 - Tela AMOLED',
        '17:40 - Performance',
        '25:20 - Câmeras e Zoom',
        '35:50 - Bateria',
        '42:10 - Galaxy AI',
        '48:30 - Veredito'
      ]
    },

    // 4. TREINO EM CASA
    {
      id: 'seed_treino_casa_001',
      channelId: 'seed_channel_fitness',
      title: 'Treino em CASA para INICIANTES - 20 Minutos Todo Dia',
      description: '💪 TREINO COMPLETO SEM EQUIPAMENTOS! Sequência de exercícios para queimar gordura e tonificar. Apenas 20 minutos por dia para transformar seu corpo.',
      videoUrl: 'https://www.youtube.com/embed/UBMk30rjy0o',
      thumbnail: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1280&h=720&fit=crop',
      duration: 1320,
      views: 4120000,
      likes: 245000,
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      tags: ['treino', 'fitness', 'em casa', 'exercícios', 'saúde'],
      category: 'Fitness',
      // Metadata Extra
      difficulty: 'Iniciante',
      calories: '200 kcal',
      simulatedContent: [
        '00:00 - Aquecimento',
        '03:15 - Agachamentos',
        '07:30 - Flexões',
        '11:45 - Abdominal',
        '16:50 - Cardio intenso',
        '19:50 - Alongamento'
      ]
    },

    // 5. GAMEPLAY RPG
    {
      id: 'seed_gameplay_rpg_001',
      channelId: 'seed_channel_gamer',
      title: 'GAMEPLAY - Novo RPG de AÇÃO 2024 | 1 hora de Jogo',
      description: '🎮 PRIMEIRAS HORAS DO RPG MAIS AGUARDADO! Gameplay completo sem cortes, mostrando combate, exploração e gráficos em 4K. Vale a pena comprar?',
      videoUrl: 'https://www.youtube.com/embed/4Q8d2F_LCoU',
      thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1280&h=720&fit=crop',
      duration: 3720,
      views: 5420000,
      likes: 356000,
      publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      tags: ['gameplay', 'rpg', 'games', '2024', 'review'],
      category: 'Games',
      // Metadata Extra
      platform: 'PC / PS5',
      rating: 9.5,
      simulatedContent: [
        '00:00 - Criação de Personagem',
        '08:45 - Tutorial',
        '17:30 - Primeira Missão',
        '28:15 - Mundo Aberto',
        '44:20 - Boss Fight',
        '58:30 - Opinião Final'
      ]
    },

    // 6. EDIÇÃO DE VÍDEO NO CELULAR
    {
      id: 'seed_edicao_celular_001',
      channelId: 'seed_channel_tech',
      title: 'Como EDITAR VÍDEOS no CELULAR - Tutorial COMPLETO 2024',
      description: '🎬 EDITE VÍDEOS PROFISSIONAIS NO CELULAR! Tutorial completo usando apps gratuitos. Cortes, transições, efeitos e correção de cor.',
      videoUrl: 'https://www.youtube.com/embed/7ZbX4-caPvI',
      thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44c?w=1280&h=720&fit=crop',
      duration: 3520,
      views: 1780000,
      likes: 98000,
      publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      tags: ['edição', 'vídeo', 'tutorial', 'celular', 'apps'],
      category: 'Tutoriais',
      // Metadata Extra
      apps: ['CapCut', 'InShot'],
      difficulty: 'Intermediário',
      simulatedContent: [
        '00:00 - Melhores Apps',
        '06:30 - Cortes Básicos',
        '14:20 - Transições',
        '22:45 - Efeitos e Filtros',
        '38:25 - Áudio e Música',
        '52:15 - Exportação'
      ]
    },

    // 7. DESTINOS DE VIAGEM 2024
    {
      id: 'seed_viagens_001',
      channelId: 'seed_channel_viagens',
      title: 'TOP 10 Destinos para VIAJAR em 2024 - Lugares INCRÍVEIS',
      description: '✈️ GUIA COMPLETO! Descubra paraísos escondidos, cidades vibrantes e experiências únicas para suas próximas férias. Dicas de orçamento incluídas.',
      videoUrl: 'https://www.youtube.com/embed/lcU3p5VyQg0',
      thumbnail: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1280&h=720&fit=crop',
      duration: 2945,
      views: 2670000,
      likes: 156000,
      publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      tags: ['viagem', 'destinos', 'turismo', '2024', 'guia'],
      category: 'Viagens',
      // Metadata Extra
      bestTime: 'Primavera/Verão',
      simulatedContent: [
        '00:00 - Intro',
        '04:20 - Destino #10',
        '11:30 - Destino #7 (Praia)',
        '19:45 - Destino #5 (Europa)',
        '27:10 - Destino #3 (Aventura)',
        '35:25 - O Melhor Destino de 2024'
      ]
    },

    // 8. APRENDER INGLÊS SOZINHO
    {
      id: 'seed_ingles_001',
      channelId: 'seed_channel_educacao',
      title: 'APRENDER INGLÊS Sozinho - Método EFICAZ para INICIANTES',
      description: '🇺🇸 FLUÊNCIA EM CASA! Método comprovado baseado em imersão e prática diária. Aprenda inglês rápido e de graça.',
      videoUrl: 'https://www.youtube.com/embed/FZBKQO0PUC8',
      thumbnail: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1280&h=720&fit=crop',
      duration: 3720,
      views: 1980000,
      likes: 124000,
      publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      tags: ['inglês', 'idiomas', 'aprender', 'aula', 'iniciantes'],
      category: 'Educação',
      // Metadata Extra
      level: 'Iniciante',
      studyTime: '30 min/dia',
      simulatedContent: [
        '00:00 - O Método',
        '07:15 - Materiais Gratuitos',
        '15:30 - Pronúncia',
        '24:45 - Vocabulário Essencial',
        '41:10 - Listening (Séries)',
        '55:40 - Cronograma de Estudos'
      ]
    },

    // 9. INVESTIMENTOS PARA INICIANTES
    {
      id: 'seed_investimentos_001',
      channelId: 'seed_channel_financas',
      title: 'Como INVESTIR R$100 por Mês - Guia COMPLETO para INICIANTES',
      description: '💰 FAÇA SEU DINHEIRO RENDER! Guia passo a passo para começar a investir com pouco. Tesouro Direto, CDB e Ações explicados de forma simples.',
      videoUrl: 'https://www.youtube.com/embed/Tk-_2zpCk2I',
      thumbnail: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1280&h=720&fit=crop',
      duration: 3520,
      views: 3240000,
      likes: 198000,
      publishedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      tags: ['investimento', 'finanças', 'dinheiro', 'economia', 'iniciantes'],
      category: 'Finanças',
      // Metadata Extra
      minInvestment: 'R$ 100',
      risk: 'Baixo/Moderado',
      simulatedContent: [
        '00:00 - Por que investir?',
        '06:30 - Juros Compostos',
        '14:20 - Renda Fixa vs Variável',
        '23:45 - Abrindo Conta',
        '31:10 - Tesouro Direto',
        '45:40 - Onde investir R$ 100'
      ]
    },

    // 10. FOTOGRAFIA COM CELULAR
    {
      id: 'seed_fotografia_001',
      channelId: 'seed_channel_fotografia',
      title: 'FOTOGRAFIA com CELULAR - Dicas PROFISSIONAIS 2024',
      description: '📸 FOTOS PROFISSIONAIS COM SMARTPHONE! Técnicas de composição, iluminação e edição para transformar suas fotos.',
      videoUrl: 'https://www.youtube.com/embed/4JMOh-_Kp9k',
      thumbnail: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1280&h=720&fit=crop',
      duration: 3720,
      views: 1560000,
      likes: 89000,
      publishedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      tags: ['fotografia', 'celular', 'tutorial', 'fotos', 'edição'],
      category: 'Fotografia',
      // Metadata Extra
      apps: ['Lightroom', 'Snapseed'],
      difficulty: 'Fácil',
      simulatedContent: [
        '00:00 - Configurações da Câmera',
        '08:15 - Regra dos Terços',
        '16:30 - Iluminação Natural',
        '25:45 - Modo Retrato',
        '33:20 - Edição Básica',
        '48:25 - Dicas Criativas'
      ]
    }
];

export const seedService = {
  /**
   * Injects fake content if the platform has fewer than 100 real creators.
   * Ensures the platform looks alive on cold start.
   */
  injectSeedContent: () => {
    let users: User[] = [];
    let videos: Video[] = [];

    try {
      users = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '[]');
      videos = JSON.parse(localStorage.getItem(VIDEOS_DB_KEY) || '[]');
    } catch {
      users = [];
      videos = [];
    }

    // 1. Check Maturity: Count real creators (non-seed)
    const realCreatorsCount = users.filter(u => u.role === 'creator' && !u.isSeed).length;

    // If we have enough real creators, do NOT inject seeds.
    if (realCreatorsCount >= 100) return;

    // 2. Check if we already have seed content to avoid duplication
    const hasSeedContent = users.some(u => u.isSeed);
    if (hasSeedContent) return;

    console.log('[SeedService] Platform cold start detected. Injecting seed content...');

    // 3. Create Seed Channels (Users)
    const seedUsers: User[] = SEED_CHANNELS_DATA.map(ch => ({
      id: ch.id,
      name: ch.name,
      email: `${ch.handle.replace('@', '')}@seed.fairstream.com`,
      avatar: ch.avatar,
      role: 'creator',
      isCreator: true,
      interests: [],
      pixKey: 'seed@pix.com',
      pixKeyType: 'email',
      status: 'active',
      warnings: 0,
      createdAt: new Date().toISOString(),
      description: ch.description,
      channelMessage: `Bem-vindo ao canal oficial ${ch.name}!`,
      isSeed: true
    }));

    // 4. Create Seed Videos
    const seedVideos: Video[] = SEED_VIDEOS_DATA.map((v) => {
      // Find the creator for this video
      const creator = seedUsers.find(u => u.id === v.channelId);
      
      if (!creator) return null;

      // Converte simulatedContent (strings) em Chapters reais para o player
      const chapters: Chapter[] = v.simulatedContent?.map(item => {
          const [timestamp, ...titleParts] = item.split(' - ');
          return {
              timestamp: timestamp.trim(),
              title: titleParts.join(' - ').trim(),
              description: 'Segmento automático'
          };
      }) || [];

      return {
        id: v.id,
        title: v.title,
        description: v.description,
        thumbnailUrl: v.thumbnail,
        thumbnailSource: 'random',
        videoUrl: v.videoUrl, // YouTube Embed URL
        creator: creator,
        views: v.views,
        uploadDate: getTimeAgo(v.publishedAt),
        duration: formatDuration(v.duration),
        tags: v.tags,
        aiSummary: 'Conteúdo popular da internet (Seed Content).',
        // Fallback sources pointing to the embed URL
        sources: { '1080p': v.videoUrl },
        chapters: chapters,
        likedBy: [],
        likes: v.likes,
        isSeed: true,
        category: v.category,
        
        // Novos metadados ricos
        simulatedContent: v.simulatedContent,
        difficulty: v.difficulty,
        ingredients: v.ingredients,
        apps: v.apps,
        rating: v.rating,
        calories: v.calories,
        platform: v.platform,
        bestTime: v.bestTime,
        level: v.level,
        studyTime: v.studyTime,
        minInvestment: v.minInvestment,
        risk: v.risk,
        prerequisites: v.prerequisites
      };
    }).filter(v => v !== null) as Video[];

    // 5. Save to Storage
    const newUsers = [...users, ...seedUsers];
    const newVideos = [...videos, ...seedVideos];

    try {
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(newUsers));
      localStorage.setItem(VIDEOS_DB_KEY, JSON.stringify(newVideos));
      
      // Force UI Update
      window.dispatchEvent(new Event("video-update"));
      window.dispatchEvent(new Event("storage"));
      console.log(`[SeedService] Successfully injected ${seedUsers.length} channels and ${seedVideos.length} videos.`);
    } catch (e) {
      console.error("[SeedService] Failed to inject seed content (Quota exceeded?)", e);
    }
  },

  /**
   * Checks if the platform has reached maturity (>= 100 real creators).
   * If so, removes all seed content.
   */
  checkAndRemoveSeedContent: () => {
    let users: User[] = [];
    try {
        users = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '[]');
    } catch { return; }

    // Count real creators
    const realCreatorsCount = users.filter(u => u.role === 'creator' && !u.isSeed).length;

    if (realCreatorsCount >= 100) {
        seedService.removeAllSeedContent();
    }
  },

  /**
   * Remove TODOS os usuários e vídeos marcados como 'isSeed: true'.
   * Usado pelo botão de limpeza no Admin e pela automação.
   */
  removeAllSeedContent: () => {
    console.log('[SeedService] Removing ALL seed content...');
    
    // Remove Seed Users
    let users: User[] = [];
    try {
        users = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '[]');
    } catch { users = []; }
    
    const cleanUsers = users.filter(u => !u.isSeed);
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(cleanUsers));

    // Remove Seed Videos
    let videos: Video[] = [];
    try {
        videos = JSON.parse(localStorage.getItem(VIDEOS_DB_KEY) || '[]');
    } catch { videos = []; }

    const cleanVideos = videos.filter(v => !v.isSeed);
    localStorage.setItem(VIDEOS_DB_KEY, JSON.stringify(cleanVideos));

    // Notify UI
    window.dispatchEvent(new Event("video-update"));
    window.dispatchEvent(new Event("storage"));
  },

  /**
   * Remove usuários seed que não possuem vídeos (canais órfãos).
   * Útil para limpar lixo gerado por ferramentas de seed antigas.
   */
  cleanupOrphanedSeedUsers: () => {
    let users: User[] = [];
    let videos: Video[] = [];

    try {
      users = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '[]');
      videos = JSON.parse(localStorage.getItem(VIDEOS_DB_KEY) || '[]');
    } catch { return; }

    // Mapeia IDs de criadores que têm vídeos
    const activeCreatorIds = new Set(videos.map(v => v.creator.id));

    // Filtra usuários:
    // Mantém se: NÃO for seed OU (for seed E tiver vídeo)
    const validUsers = users.filter(u => {
      if (!u.isSeed) return true; // Mantém usuários reais
      return activeCreatorIds.has(u.id); // Mantém seeds que têm vídeos
    });

    const removedCount = users.length - validUsers.length;

    if (removedCount > 0) {
      console.log(`[SeedService] Cleaning up ${removedCount} orphaned seed users...`);
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(validUsers));
      window.dispatchEvent(new Event("storage"));
    }
  }
};
