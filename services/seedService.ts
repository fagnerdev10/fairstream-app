
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
  {
    id: 'seed_bolo_chocolate_001',
    channelId: 'seed_channel_culinaria',
    title: 'Bolo de Chocolate FÁCIL em 15 Minutos - Receita Completa',
    description: '🔥 APRENDA A FAZER O MELHOR BOLO DE CHOCOLATE DA SUA VIDA! [SEED_USER:{"isSeed":true}]',
    videoUrl: 'https://www.youtube.com/embed/4NShV8gcfiY',
    thumbnail: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1280&h=720&fit=crop',
    duration: 925,
    views: 2450000,
    likes: 189000,
    publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    tags: ['receita', 'bolo', 'chocolate', 'culinária', 'fácil'],
    category: 'Culinária'
  },
  {
    id: 'seed_python_001',
    channelId: 'seed_channel_tech',
    title: 'Python para INICIANTES - Aprenda do ZERO em 1 HORA',
    description: '🚀 CURSO RÁPIDO DE PYTHON! [SEED_USER:{"isSeed":true}]',
    videoUrl: 'https://www.youtube.com/embed/rfscVS0vtbw',
    thumbnail: 'https://images.unsplash.com/photo-1526379879527-8559ecfcaec9?w=1280&h=720&fit=crop',
    duration: 3720,
    views: 1890000,
    likes: 124000,
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    tags: ['python', 'programação', 'tutorial', 'iniciantes', 'curso'],
    category: 'Tecnologia'
  },
  {
    id: 'seed_s24_review_001',
    channelId: 'seed_channel_tech',
    title: 'Samsung Galaxy S24 Ultra - Review COMPLETO 2024',
    description: '📱 TESTAMOS POR 2 SEMANAS O NOVO S24 ULTRA! [SEED_USER:{"isSeed":true}]',
    videoUrl: 'https://www.youtube.com/embed/9qyY5wXQ_bI',
    thumbnail: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=1280&h=720&fit=crop',
    duration: 2845,
    views: 3250000,
    likes: 198000,
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    tags: ['samsung', 's24', 'ultra', 'review', 'smartphone'],
    category: 'Tecnologia'
  },
  {
    id: 'seed_treino_casa_001',
    channelId: 'seed_channel_fitness',
    title: 'Treino em CASA para INICIANTES - 20 Minutos Todo Dia',
    description: '💪 TREINO COMPLETO SEM EQUIPAMENTOS! [SEED_USER:{"isSeed":true}]',
    videoUrl: 'https://www.youtube.com/embed/UBMk30rjy0o',
    thumbnail: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1280&h=720&fit=crop',
    duration: 1320,
    views: 4120000,
    likes: 245000,
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    tags: ['treino', 'fitness', 'em casa', 'exercícios', 'saúde'],
    category: 'Fitness'
  },
  {
    id: 'seed_gameplay_rpg_001',
    channelId: 'seed_channel_gamer',
    title: 'GAMEPLAY - Novo RPG de AÇÃO 2024 | 1 hora de Jogo',
    description: '🎮 PRIMEIRAS HORAS DO RPG MAIS AGUARDADO! [SEED_USER:{"isSeed":true}]',
    videoUrl: 'https://www.youtube.com/embed/4Q8d2F_LCoU',
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1280&h=720&fit=crop',
    duration: 3720,
    views: 5420000,
    likes: 356000,
    publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    tags: ['gameplay', 'rpg', 'games', '2024', 'review'],
    category: 'Games'
  },
  {
    id: 'seed_edicao_celular_001',
    channelId: 'seed_channel_tech',
    title: 'Como EDITAR VÍDEOS no CELULAR - Tutorial COMPLETO 2024',
    description: '🎬 EDITE VÍDEOS PROFISSIONAIS NO CELULAR! [SEED_USER:{"isSeed":true}]',
    videoUrl: 'https://www.youtube.com/embed/7ZbX4-caPvI',
    thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44c?w=1280&h=720&fit=crop',
    duration: 3520,
    views: 1780000,
    likes: 98000,
    publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    tags: ['edição', 'vídeo', 'tutorial', 'celular', 'apps'],
    category: 'Tutoriais'
  },
  {
    id: 'seed_viagens_001',
    channelId: 'seed_channel_viagens',
    title: 'TOP 10 Destinos para VIAJAR em 2024 - Lugares INCRÍVEIS',
    description: '✈️ GUIA COMPLETO! [SEED_USER:{"isSeed":true}]',
    videoUrl: 'https://www.youtube.com/embed/lcU3p5VyQg0',
    thumbnail: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1280&h=720&fit=crop',
    duration: 2945,
    views: 2670000,
    likes: 156000,
    publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    tags: ['viagem', 'destinos', 'turismo', '2024', 'guia'],
    category: 'Viagens'
  },
  {
    id: 'seed_ingles_001',
    channelId: 'seed_channel_educacao',
    title: 'APRENDER INGLÊS Sozinho - Método EFICAZ para INICIANTES',
    description: '🇺🇸 FLUÊNCIA EM CASA! [SEED_USER:{"isSeed":true}]',
    videoUrl: 'https://www.youtube.com/embed/FZBKQO0PUC8',
    thumbnail: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1280&h=720&fit=crop',
    duration: 3720,
    views: 1980000,
    likes: 124000,
    publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    tags: ['inglês', 'idiomas', 'aprender', 'aula', 'iniciantes'],
    category: 'Educação'
  },
  {
    id: 'seed_investimentos_001',
    channelId: 'seed_channel_financas',
    title: 'Como INVESTIR R$100 por Mês - Guia COMPLETO para INICIANTES',
    description: '💰 FAÇA SEU DINHEIRO RENDER! [SEED_USER:{"isSeed":true}]',
    videoUrl: 'https://www.youtube.com/embed/Tk-_2zpCk2I',
    thumbnail: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1280&h=720&fit=crop',
    duration: 3520,
    views: 3240000,
    likes: 198000,
    publishedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    tags: ['investimento', 'finanças', 'dinheiro', 'economia', 'iniciantes'],
    category: 'Finanças'
  },
  {
    id: 'seed_fotografia_001',
    channelId: 'seed_channel_fotografia',
    title: 'FOTOGRAFIA com CELULAR - Dicas PROFISSIONAIS 2024',
    description: '📸 FOTOS PROFISSIONAIS COM SMARTPHONE! [SEED_USER:{"isSeed":true}]',
    videoUrl: 'https://www.youtube.com/embed/4JMOh-_Kp9k',
    thumbnail: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1280&h=720&fit=crop',
    duration: 3720,
    views: 1560000,
    likes: 89000,
    publishedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    tags: ['fotografia', 'celular', 'tutorial', 'fotos', 'edição'],
    category: 'Fotografia'
  }
];

export const seedService = {
  injectSeedContent: () => {
    let users: User[] = [];
    let videos: Video[] = [];
    try {
      users = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '[]');
      videos = JSON.parse(localStorage.getItem(VIDEOS_DB_KEY) || '[]');
    } catch { }

    if (users.some(u => u.isSeed)) return;

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

    const seedVideos: Video[] = SEED_VIDEOS_DATA.map((v) => {
      const creator = seedUsers.find(u => u.id === v.channelId);
      if (!creator) return null;

      return {
        id: v.id,
        title: v.title,
        description: v.description,
        thumbnailUrl: v.thumbnail,
        videoUrl: v.videoUrl,
        creator: creator,
        views: v.views,
        uploadDate: getTimeAgo(v.publishedAt),
        duration: formatDuration(v.duration),
        tags: v.tags,
        likes: v.likes,
        isSeed: true,
        category: v.category,
        likedBy: [],
        chapters: [],
        aiSummary: 'Conteúdo popular da internet (Seed Content).'
      };
    }).filter(v => v !== null) as Video[];

    localStorage.setItem(USERS_DB_KEY, JSON.stringify([...users, ...seedUsers]));
    localStorage.setItem(VIDEOS_DB_KEY, JSON.stringify([...videos, ...seedVideos]));

    window.dispatchEvent(new Event("video-update"));
    window.dispatchEvent(new Event("storage"));
  },

  checkAndRemoveSeedContent: () => { },
  removeAllSeedContent: () => {
    localStorage.removeItem(USERS_DB_KEY);
    localStorage.removeItem(VIDEOS_DB_KEY);
    window.dispatchEvent(new Event("video-update"));
    window.dispatchEvent(new Event("storage"));
  },
  cleanupOrphanedSeedUsers: () => { }
};
