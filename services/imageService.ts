
import { Video, ThumbnailSource } from '../types';
import { supabase } from './supabaseClient';
import { r2Service } from './r2Service';

export const imageService = {
  /**
   * Aplica parâmetros do Bunny Optimizer para redimensionamento e conversão WebP.
   * @param url URL original da imagem
   * @param width Largura desejada em pixels
   * @returns URL otimizada
   */
  optimizeBunnyUrl: (url: string, width: number = 1280): string => {
    // Se o usuário não tem o Optimizer (pago), retornar a URL original para evitar erro 406
    return url;
  },

  getSmartThumbnail: (video: Video, width: number = 1280): string => {
    let url = video.thumbnailUrl;
    const source = video.thumbnailSource;

    // Se o usuário explicitamente escolheu uma capa ou frame, NÃO usamos Picsum nunca
    if ((source === 'manual' || source === 'frame') && url && url.length > 10) {
      // Retorna a URL como está (ela já deve vir com o timestamp do banco se for nova)
      return url;
    }

    // Se estiver vazio ou explicitamente for aleatório
    if (!url || url.includes('picsum.photos') || url.length < 5 || source === 'random') {
      return `https://picsum.photos/seed/${video.id}/1280/720`;
    }

    return url;
  },

  getRandomThumbnailByCategory: (category: string): string => {
    return `https://picsum.photos/seed/${encodeURIComponent(category)}/1280/720`;
  },

  generateThumbnailIA: async (
    title: string,
    category: string,
    description: string = '',
    tags: string[] = [],
    videoElement?: HTMLVideoElement
  ): Promise<string> => {
    if (videoElement && videoElement.readyState >= 2) {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0, 1280, 720);
        return canvas.toDataURL('image/jpeg', 0.9);
      }
    }
    return 'https://picsum.photos/1280/720';
  },

  suggestThumbnails: async (title: string, category: string, description: string = '', tags: string[] = [], videoElement?: HTMLVideoElement): Promise<Array<{ src: string, source: ThumbnailSource }>> => {
    return [];
  },

  /**
   * Otimiza uma imagem no lado do cliente antes do upload.
   * Redimensiona, converte para WebP (se possível) e aplica compressão.
   */
  optimizeImage: async (file: File | string, maxWidth: number = 1200, quality: number = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Mantém a proporção
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Could not get canvas context');

        ctx.drawImage(img, 0, 0, width, height);

        // Forçar JPEG para compatibilidade total com o Bunny.net
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject('Conversion failed');
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject('Error loading image');

      if (typeof file === 'string') {
        img.src = file;
      } else {
        img.src = URL.createObjectURL(file);
      }
    });
  },

  /**
   * Faz upload de uma imagem otimizada.
   * Agora redirecionado para o Cloudflare R2 para custo zero de egress.
   */
  uploadToSupabase: async (blob: Blob, bucket: string, fileName: string): Promise<string> => {
    // Mapeia o nome do bucket do Supabase para uma pasta no R2
    const folder = bucket === 'profiles' ? 'avatars' : bucket;

    try {
      console.log(`☁️ [ImageService] Tentando upload para Cloudflare R2: ${folder}/${fileName}...`);
      const publicUrl = await r2Service.uploadFile(blob, folder, fileName);
      if (publicUrl && !publicUrl.includes('blob:')) return publicUrl;
      throw new Error("Upload R2 falhou ou retornou link inválido");
    } catch (error: any) {
      console.error('⚠️ [ImageService] R2 falhou, tentando fallback Supabase:', error.message);

      // FALLBACK DE EMERGÊNCIA: Se R2 falhar, tenta salvar no Supabase Storage
      try {
        const { data, error: sbError } = await supabase.storage
          .from(bucket)
          .upload(fileName, blob, { upsert: true });

        if (sbError) throw sbError;

        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        console.log('✅ [ImageService] Upload concluído via Fallback Supabase:', publicUrl);
        return publicUrl;
      } catch (sbErr: any) {
        console.error('❌ [ImageService] Falha TOTAL no upload (R2 e Supabase):', sbErr);
        throw new Error("Não foi possível salvar o arquivo em nenhum provedor. Verifique sua conexão e configurações.");
      }
    }
  }
};
