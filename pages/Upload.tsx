
import React, { useState, useEffect, useRef } from 'react';
import { Upload as UploadIcon, Sparkles, Check, X, List, Save, Image as ImageIcon, Camera, Loader2, AlertTriangle, ShieldAlert, RefreshCw } from 'lucide-react';
import { generateVideoMetadata, generateChapters, isApiKeyAvailable } from '../services/geminiService';
import { AiActionStatus, Chapter, Video, ThumbnailSource } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { videoService } from '../services/videoService';
import { useSettings } from '../contexts/SettingsContext';
import * as bunnyService from '../services/bunnyService';
import { imageService } from '../services/imageService';
import { r2Service } from '../services/r2Service';
import { channelService } from '../services/channelService';

const SUGGESTED_TAGS = [
  "Religião e Espiritualismo", "Tecnologia", "Educação", "Vlogs", "Games", "Música", "Natureza", "Finanças"
];

const Upload: React.FC = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { theme } = useSettings();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const videoRef = useRef<HTMLVideoElement>(null);

  // States Básicos
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [rawContext, setRawContext] = useState('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [category, setCategory] = useState('Geral');

  // Thumbnail State
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailSource, setThumbnailSource] = useState<ThumbnailSource>('manual');

  // Status AI
  const [aiStatus, setAiStatus] = useState<AiActionStatus>(AiActionStatus.IDLE);
  const [chapterStatus, setChapterStatus] = useState<AiActionStatus>(AiActionStatus.IDLE);

  // Copyright Warning Modal
  const [showCopyrightModal, setShowCopyrightModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Video Duration
  const [formattedDuration, setFormattedDuration] = useState('0:00');
  const [durationInSeconds, setDurationInSeconds] = useState(0);
  const [captureTime, setCaptureTime] = useState(0);
  const [subscriberCount, setSubscriberCount] = useState(0);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    } else if (user) {
      // Carregar contagem de inscritos
      channelService.getSubscriberCount(user.id).then(setSubscriberCount);
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (editId) {
      const loadVideoToEdit = async () => {
        const videoToEdit = await videoService.getById(editId);
        if (videoToEdit) {
          if (user && videoToEdit.creator.id !== user.id) {
            alert("Você não tem permissão para editar este vídeo.");
            navigate('/dashboard');
            return;
          }

          setTitle(videoToEdit.title);
          setDescription(videoToEdit.description);
          setTags(videoToEdit.tags);
          setCategory(videoToEdit.category || 'Geral');
          setChapters(videoToEdit.chapters || []);
          setPreviewUrl(videoToEdit.videoUrl);
          setThumbnailUrl(videoToEdit.thumbnailUrl);
          setThumbnailSource(videoToEdit.thumbnailSource || 'manual');
          setUploadProgress(100); // Já está carregado
        }
      };
      loadVideoToEdit();
    }
  }, [editId, user, navigate]);

  // Simula progresso de upload
  const simulateUpload = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  /*
   * SOLUÇÃO SIMPLIFICADA PARA DEMONSTRAÇÃO:
   * Todos os vídeos usam URLs públicas de exemplo
   * Em produção real, seria enviado para servidor (S3, Cloudinary, etc.)
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // Validação de tipo de arquivo
      if (!selectedFile.type.startsWith('video/')) {
        alert("Por favor, selecione um arquivo de vídeo válido.");
        return;
      }

      setFile(selectedFile);
      setUploadProgress(0);

      const fileSizeMB = selectedFile.size / (1024 * 1024);
      console.log(`[Upload] File size: ${fileSizeMB.toFixed(2)}MB`);

      // Cria preview imediato com Blob URL (apenas para visualização local)
      const blobUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(blobUrl);

      // Obter duração para validação de Tier
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.onloadedmetadata = () => {
        window.URL.revokeObjectURL(tempVideo.src);
        setDurationInSeconds(tempVideo.duration);
      };
      tempVideo.src = blobUrl;
    }
  };

  const [customThumbnailFile, setCustomThumbnailFile] = useState<Blob | null>(null);

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        // Usa o serviço centralizado para otimização
        const optimizedBlob = await imageService.optimizeImage(file, 1280, 0.9);
        setCustomThumbnailFile(optimizedBlob);
        setThumbnailUrl(URL.createObjectURL(optimizedBlob));
        setThumbnailSource('manual');
      } catch (err) {
        console.error("Erro ao processar thumbnail:", err);
      }
    }
  };

  const handleCaptureFrame = async (force = false) => {
    if (videoRef.current && videoRef.current.readyState >= 2) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const videoRatio = video.videoWidth / video.videoHeight;
        const targetRatio = canvas.width / canvas.height;
        let dW, dH, oX, oY;
        if (videoRatio > targetRatio) {
          dW = canvas.width; dH = canvas.width / videoRatio;
          oX = 0; oY = (canvas.height - dH) / 2;
        } else {
          dH = canvas.height; dW = canvas.height * videoRatio;
          oX = (canvas.width - dW) / 2; oY = 0;
        }

        try {
          ctx.drawImage(video, oX, oY, dW, dH);

          // Captura como Blob para tratar igual a um upload manual
          canvas.toBlob((blob) => {
            if (blob) {
              const dataUrl = URL.createObjectURL(blob);
              setCaptureTime(video.currentTime);

              // SÓ altera a fonte e a URL se não for manual E não for aleatório,
              // OU se for um clique FORÇADO no botão de captura.
              if (force || (thumbnailSource !== 'manual' && thumbnailSource !== 'random')) {
                setThumbnailSource('frame');
                setThumbnailUrl(dataUrl);
                setCustomThumbnailFile(blob); // Agora guardamos o BLOB da captura!
              }
            }
          }, 'image/jpeg', 0.9);
        } catch (err) {
          console.error("Erro na captura:", err);
        }
      }
    }
  };

  const handleGenerateMetadata = async () => {
    if (!rawContext) return;
    setAiStatus(AiActionStatus.LOADING);

    try {
      const metadata = await generateVideoMetadata(rawContext);
      setTitle(metadata.title);
      setDescription(metadata.description);
      setTags(metadata.tags || []);

      if (metadata.chapters && Array.isArray(metadata.chapters)) {
        setChapters(metadata.chapters);
      }

      setAiStatus(AiActionStatus.SUCCESS);
    } catch (error) {
      console.error(error);
      setAiStatus(AiActionStatus.ERROR);
    }
  };

  const handleGenerateChapters = async () => {
    if (!description && !rawContext) return;
    setChapterStatus(AiActionStatus.LOADING);
    try {
      const generatedChapters = await generateChapters(description || rawContext);
      setChapters(generatedChapters);
      setChapterStatus(AiActionStatus.SUCCESS);
    } catch (error) {
      console.error(error);
      setChapterStatus(AiActionStatus.ERROR);
    }
  };

  const getChannelTier = (count: number) => {
    if (count >= 500000) return { maxMinutes: 60, quality: '1080p', label: 'Lendário (500k+)' };
    if (count >= 300000) return { maxMinutes: 60, quality: '720p', label: 'Estratega (300k+)' };
    if (count >= 50000) return { maxMinutes: 40, quality: '1080p', label: 'Influenciador (50k+)' };
    if (count >= 10000) return { maxMinutes: 40, quality: '720p', label: 'Consolidado (10k+)' };
    return { maxMinutes: 15, quality: '720p', label: 'Iniciante' };
  };

  const currentTier = getChannelTier(subscriberCount);

  // Validates inputs and triggers copyright modal
  const handlePrePublish = () => {
    if (!editId && !file && !previewUrl) {
      alert("Por favor, selecione um arquivo de vídeo para fazer upload.");
      return;
    }

    // Validação de Duração por Tier
    const durationMinutes = durationInSeconds / 60;
    if (durationMinutes > currentTier.maxMinutes) {
      alert(`Ops! Seu nível atual (${currentTier.label}) permite vídeos de até ${currentTier.maxMinutes} minutos. Seu vídeo tem ${Math.floor(durationMinutes)} minutos. Continue crescendo para desbloquear mais tempo!`);
      return;
    }

    if (!title.trim()) {
      alert("O vídeo precisa de um título.");
      return;
    }
    setShowCopyrightModal(true);
  };

  const handlePublishOrUpdate = async () => {
    try {
      if (!user) return;
      if (!title.trim()) {
        alert("O vídeo precisa de um título.");
        return;
      }

      setShowCopyrightModal(false);
      setIsUploading(true);
      setUploadProgress(0);

      let finalVideoUrl = previewUrl || '';

      // TRAVA V7: Se finalVideoUrl ainda for um Blob (e não houver arquivo para subir), 
      // algo deu errado no fluxo de edição ou upload.
      if (!file && finalVideoUrl.startsWith('blob:') && !editId) {
        throw new Error("O link temporário expirou. Por favor, selecione o arquivo novamente.");
      }

      let finalThumbnail = thumbnailUrl;
      let finalSource = thumbnailSource;

      // Busca vídeo existente para recuperar o ID do Bunny se for edição
      let existingVideo = null;
      if (editId) {
        existingVideo = await videoService.getById(editId);
      }

      const generateId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      };

      const finalId = editId || generateId();
      let bunnyId = existingVideo?.bunnyVideoId || '';

      // Se houver um novo arquivo
      if (file) {
        console.log('🚀 [Upload] Iniciando upload EXCLUSIVO para Cloudflare R2...');
        const r2Url = await r2Service.uploadVideo(file, file.name, (progress) => {
          setUploadProgress(progress);
        });

        if (r2Url) {
          finalVideoUrl = r2Url;
          console.log('✅ [Upload] Sucesso R2:', r2Url);
        } else {
          throw new Error("Falha ao obter URL do R2.");
        }
      }

      // Upload da Capa (Thumbnail) no R2
      if ((thumbnailSource === 'frame' || thumbnailSource === 'manual') && customThumbnailFile) {
        console.log(`📤 [Upload] Enviando capa para Cloudflare R2...`);
        const r2ThumbUrl = await imageService.uploadToSupabase(customThumbnailFile, 'thumbnails', `thumb_${finalId}_${Date.now()}.jpg`);
        if (r2ThumbUrl) {
          finalThumbnail = r2ThumbUrl;
          finalSource = thumbnailSource;
        }
      }


      // FORÇAR AS VARIÁVEIS FINAIS: Não deixa nada mudar o que o usuário escolheu
      if (thumbnailSource === 'manual' || thumbnailSource === 'frame') {
        const timestamp = Date.now();
        finalSource = thumbnailSource;

        // SÓ busca link da Bunny se ainda NÃO tivermos um link definitivo (ex: do Supabase)
        if (!finalThumbnail || !finalThumbnail.startsWith('http')) {
          const cleanUrl = bunnyId ? bunnyService.getThumbnailUrl(bunnyId) : thumbnailUrl;
          finalThumbnail = cleanUrl.startsWith('http') ? `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}v=${timestamp}` : cleanUrl;
        } else if (finalThumbnail.includes('supabase')) {
          // Se for Supabase, apenas garante que tem um timestamp para evitar cache
          if (!finalThumbnail.includes('v=')) {
            finalThumbnail = `${finalThumbnail}${finalThumbnail.includes('?') ? '&' : '?'}v=${timestamp}`;
          }
        }
      } else if (thumbnailSource === 'random') {
        finalSource = 'random';
        // Garante que é uma URL do Picsum
        if (!finalThumbnail || !finalThumbnail.includes('picsum.photos')) {
          finalThumbnail = `https://picsum.photos/seed/${finalId}/1280/720`;
        }
      } else if (!finalThumbnail || finalThumbnail.startsWith('blob:') || (finalThumbnail.startsWith('data:') && !editId)) {
        finalThumbnail = bunnyId ? bunnyService.getThumbnailUrl(bunnyId) : '';
        finalSource = bunnyId ? 'frame' : 'random';
      }
      const videoData: Video = {
        id: finalId,
        title: title,
        description: description,
        thumbnailUrl: finalThumbnail,
        thumbnailSource: finalSource,
        videoUrl: finalVideoUrl,
        bunnyVideoId: bunnyId || (existingVideo?.bunnyVideoId),
        sources: {
          '1080p': finalVideoUrl,
          '720p': finalVideoUrl,
          '480p': finalVideoUrl,
          'Auto': finalVideoUrl
        },
        creator: {
          ...user,
          isCreator: true,
          interests: [],
          pixKey: user.pixKey || user.email,
          pixKeyType: user.pixKeyType || 'email'
        },
        views: existingVideo ? existingVideo.views : 0,
        uploadDate: existingVideo ? existingVideo.uploadDate : new Date().toISOString(),
        duration: formattedDuration !== '00:00' ? formattedDuration : '0:00',
        tags: tags,
        category: category,
        aiSummary: description.substring(0, 150) + '...',
        chapters: chapters.length > 0 ? chapters : undefined
      };

      await videoService.save(videoData);
      alert(editId ? "Vídeo atualizado com sucesso!" : "Vídeo publicado com sucesso!");
      navigate('/dashboard');

    } catch (error: any) {
      console.error("Erro ao publicar:", error);
      alert("Erro ao publicar vídeo: " + (error.message || "Erro desconhecido. Verifique o console."));
    } finally {
      setIsUploading(false);
    }
  };

  const bgPanel = theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200 shadow-sm';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600';
  const inputBg = theme === 'dark' ? 'bg-zinc-950 border-zinc-700' : 'bg-gray-50 border-gray-300';

  if (isLoading) return <div className="p-10 text-center">Carregando...</div>;
  if (!user) return null;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto pb-40">
      <div className={`text-2xl font-bold mb-2 ${textPrimary}`}>{editId ? 'Editar Vídeo' : 'Upload de Estúdio'}</div>

      {/* Tier Status Badge */}
      <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between ${theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-blue-50 border-blue-100'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${subscriberCount >= 50000 ? 'bg-purple-500' : 'bg-blue-500'} text-white`}>
            {subscriberCount >= 50000 ? <Sparkles size={20} /> : <UploadIcon size={20} />}
          </div>
          <div>
            <div className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-blue-900'}`}>Nível: {currentTier.label}</div>
            <div className="text-xs text-zinc-500">{subscriberCount.toLocaleString()} inscritos • Limite: {currentTier.maxMinutes} min • Qualidade recomendada: {currentTier.quality}</div>
          </div>
        </div>
        <div className="hidden md:block">
          {subscriberCount < 500000 && (
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Próximo Nível em breve</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUNA ESQUERDA: VÍDEO & CAPA */}
        <div className="lg:col-span-1 space-y-6">

          {/* UPLOAD DO VÍDEO */}
          <div className={`border-2 border-dashed rounded-xl aspect-video flex flex-col items-center justify-center relative overflow-hidden transition-colors ${theme === 'dark' ? 'border-zinc-700 bg-zinc-900/50' : 'border-gray-300 bg-gray-50'}`}>
            {previewUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={previewUrl}
                  className="w-full h-full object-contain bg-black"
                  controls
                  onLoadedMetadata={(e) => {
                    const sec = e.currentTarget.duration;
                    if (!isNaN(sec)) {
                      const m = Math.floor(sec / 60);
                      const s = Math.floor(sec % 60);
                      const str = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                      setFormattedDuration(str);
                      setTimeout(handleCaptureFrame, 500);
                    }
                  }}
                  onSeeked={() => {
                    // Pequeno delay para garantir que o frame foi renderizado antes da captura
                    setTimeout(handleCaptureFrame, 150);
                  }}
                  crossOrigin="anonymous"
                />
                <button
                  onClick={() => { setFile(null); setPreviewUrl(null); setUploadProgress(0); }}
                  className="absolute top-2 right-2 p-1 bg-black/60 rounded-full hover:bg-red-600 text-white z-10"
                  title="Remover vídeo"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <UploadIcon size={32} className="text-zinc-400" />
                </div>
                <h3 className={`font-semibold text-lg mb-2 ${textPrimary}`}>Arraste e solte o vídeo</h3>
                <label className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-full cursor-pointer transition-colors inline-block">
                  Selecionar Arquivos
                  <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
            )}

            {/* Barra de Progresso */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="absolute bottom-0 left-0 w-full h-2 bg-zinc-800">
                <div className="h-full bg-blue-500 transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            )}
          </div>

          {/* UPLOAD DA CAPA (THUMBNAIL) */}
          <div className={`p-4 rounded-xl border ${bgPanel}`}>
            <h3 className={`font-bold mb-3 flex items-center gap-2 ${textPrimary}`}>
              <ImageIcon size={18} className="text-blue-500" /> Capa do Vídeo (Thumbnail)
            </h3>

            {/* Área de Preview da Capa Selecionada */}
            <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4 relative group border border-zinc-700">
              {(thumbnailUrl || thumbnailSource === 'random') ? (
                <img
                  src={thumbnailSource === 'random' ? `https://picsum.photos/seed/${editId || title || 'new'}/1280/720` : thumbnailUrl}
                  alt="Capa"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 flex-col gap-2">
                  <ImageIcon size={32} opacity={0.5} />
                  <span className="text-xs">Nenhuma capa selecionada</span>
                </div>
              )}

              {thumbnailUrl && (
                <div className="absolute top-3 left-3 px-2 py-1 bg-black/80 backdrop-blur-md rounded-md text-[10px] text-white font-black uppercase tracking-wider border border-white/10 z-10 shadow-xl">
                  {thumbnailSource === 'manual' ? '🖼️ Arquivo Local' :
                    thumbnailSource === 'frame' ? '📸 Momento do Vídeo' :
                      '✨ Capa Aleatória'}
                </div>
              )}

              {/* Botões de Ação na Capa */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <label className="p-2 bg-white text-black rounded-full cursor-pointer hover:scale-110 transition-transform shadow-lg" title="Upload Manual do Dispositivo">
                  <UploadIcon size={20} />
                  <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
                </label>
                {previewUrl && (
                  <button
                    onClick={() => handleCaptureFrame(true)}
                    className="p-2 bg-blue-500 text-white rounded-full hover:scale-110 transition-transform shadow-lg"
                    title="Capturar este momento do vídeo"
                  >
                    <Camera size={20} />
                  </button>
                )}
                <button
                  onClick={() => { setThumbnailUrl(''); setThumbnailSource('random'); setCustomThumbnailFile(null); }}
                  className="p-2 bg-zinc-800 text-zinc-300 rounded-full hover:scale-110 transition-transform shadow-lg border border-zinc-700"
                  title="Usar capa profissional aleatória"
                >
                  <RefreshCw size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: DADOS E IA */}
        <div className="lg:col-span-2 space-y-6">

          {/* PAINEL IA - Metadata apenas */}
          <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-900/50 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="text-blue-400" size={20} />
              <h3 className="font-bold text-blue-100">Assistente de IA 🤗</h3>
            </div>

            <p className="text-sm text-blue-200 mb-3">
              Descreva seu vídeo e deixe nossa IA gerar títulos, descrições, tags e capítulos automaticamente.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={rawContext}
                onChange={(e) => setRawContext(e.target.value)}
                placeholder="Ex: Um vlog de viagem para o Japão focado em comida de rua..."
                className="flex-1 bg-black/30 border border-blue-800/50 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white"
              />
              <button
                onClick={handleGenerateMetadata}
                disabled={aiStatus === AiActionStatus.LOADING}
                className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 whitespace-nowrap transition-all bg-blue-600 hover:bg-blue-500 text-white disabled:bg-zinc-700 disabled:text-zinc-400"
              >
                {aiStatus === AiActionStatus.LOADING ? <span className="animate-spin">⏳</span> : <Sparkles size={16} />}
                Gerar Tudo
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Título</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors ${inputBg} ${textPrimary}`}
                placeholder="Título do seu vídeo"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className={`w-full rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors resize-none ${inputBg} ${textPrimary}`}
                placeholder="Conte aos espectadores sobre o seu vídeo..."
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className={`block text-sm font-medium ${textPrimary}`}>Capítulos</label>
                <button
                  onClick={handleGenerateChapters}
                  disabled={chapterStatus === AiActionStatus.LOADING || !isApiKeyAvailable()}
                  className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1"
                >
                  {chapterStatus === AiActionStatus.LOADING ? 'Gerando...' : <><Sparkles size={12} /> Gerar Capítulos</>}
                </button>
              </div>

              <div className={`border rounded-lg p-3 space-y-2 ${bgPanel}`}>
                {chapters.length === 0 ? (
                  <p className={`text-sm text-center py-2 ${textSecondary}`}>Nenhum capítulo definido.</p>
                ) : (
                  chapters.map((chap, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        value={chap.timestamp}
                        onChange={(e) => {
                          const newChaps = [...chapters];
                          newChaps[idx].timestamp = e.target.value;
                          setChapters(newChaps);
                        }}
                        className={`w-20 border rounded px-2 py-1 text-sm font-mono text-center ${inputBg} ${textPrimary}`}
                        placeholder="00:00"
                      />
                      <input
                        value={chap.title}
                        onChange={(e) => {
                          const newChaps = [...chapters];
                          newChaps[idx].title = e.target.value;
                          setChapters(newChaps);
                        }}
                        className={`flex-1 border rounded px-2 py-1 text-sm ${inputBg} ${textPrimary}`}
                        placeholder="Título do capítulo"
                      />
                      <button onClick={() => setChapters(chapters.filter((_, i) => i !== idx))} className="text-zinc-500 hover:text-red-500">
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
                <button
                  onClick={() => setChapters([...chapters, { timestamp: '00:00', title: 'Novo Capítulo' }])}
                  className={`w-full py-2 border border-dashed text-sm rounded transition-colors ${theme === 'dark' ? 'border-zinc-700 text-zinc-500 hover:bg-zinc-800' : 'border-gray-300 text-gray-500 hover:bg-gray-100'}`}
                >
                  + Adicionar Manualmente
                </button>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Tags (Sugestões Automáticas)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, idx) => (
                  <span key={idx} className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${theme === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-200 text-gray-800'}`}>
                    #{tag}
                    <button onClick={() => setTags(tags.filter((_, i) => i !== idx))} className="hover:text-red-500"><X size={12} /></button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                className={`w-full rounded-lg px-4 py-2 outline-none focus:border-blue-500 text-sm mb-2 ${inputBg} ${textPrimary}`}
                placeholder="Adicione tags manualmente e pressione Enter"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value.trim();
                    if (val && !tags.includes(val)) {
                      setTags([...tags, val]);
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
              <div className="flex gap-2 text-xs flex-wrap">
                <span className={textSecondary}>Sugeridos:</span>
                {SUGGESTED_TAGS.map(t => (
                  <button
                    key={t}
                    onClick={() => !tags.includes(t) && setTags([...tags, t])}
                    className={`border px-2 py-0.5 rounded transition-colors ${theme === 'dark' ? 'border-zinc-700 text-zinc-400 hover:text-white' : 'border-gray-300 text-gray-600 hover:text-black'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={`flex justify-end gap-4 pt-4 border-t ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
            <button
              onClick={() => navigate(-1)}
              className={`px-6 py-2 font-medium transition-colors ${theme === 'dark' ? 'text-zinc-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Cancelar
            </button>
            <button
              onClick={handlePrePublish}
              disabled={isUploading}
              className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg shadow-blue-900/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {isUploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Enviando... {uploadProgress}%
                </>
              ) : (
                <>
                  {editId ? <Save size={18} /> : <Check size={18} />}
                  {editId ? 'Salvar Alterações' : 'Publicar'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* COPYRIGHT WARNING MODAL */}
      {showCopyrightModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-yellow-600/50 rounded-xl w-full max-w-lg p-6 relative animate-fade-in shadow-2xl shadow-yellow-900/20">
            <button
              onClick={() => setShowCopyrightModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-yellow-900/20 rounded-full flex items-center justify-center mb-4 border border-yellow-600/30">
                <ShieldAlert size={32} className="text-yellow-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Aviso de Direitos Autorais</h2>
            </div>

            <div className="bg-yellow-950/30 border border-yellow-900/50 rounded-lg p-4 mb-6">
              <p className="text-yellow-200 text-sm leading-relaxed flex items-start gap-2 text-left">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Atenção:</strong> Certifique-se de que seu vídeo não contém músicas, imagens ou trechos protegidos por direitos autorais. O uso indevido pode gerar protestos, bloqueios ou penalidades. Suba apenas conteúdo que você tem permissão legal para usar.
                </span>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCopyrightModal(false)}
                className="flex-1 py-3 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-medium transition-colors"
              >
                Revisar Conteúdo
              </button>
              <button
                onClick={handlePublishOrUpdate}
                className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-lg shadow-blue-900/20"
              >
                Entendi, Publicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Upload;
