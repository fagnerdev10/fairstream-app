import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

/**
 * ☁️ Cloudflare R2 Service - FairStream
 * Este serviço gerencia o upload de imagens e ativos para o Cloudflare R2,
 * eliminando os custos de saída (egress) do Supabase Storage.
 */

const R2_ACCOUNT_ID = (import.meta as any).env?.VITE_R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = (import.meta as any).env?.VITE_R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = (import.meta as any).env?.VITE_R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = (import.meta as any).env?.VITE_R2_BUCKET_NAME || "fairstream-media";
const R2_PUBLIC_DOMAIN = (import.meta as any).env?.VITE_R2_PUBLIC_DOMAIN || "";

// Inicializa o cliente S3 para o R2
const s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    forcePathStyle: true, // Necessário para R2 funcionar corretamente com S3 SDK no navegador
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

export const r2Service = {
    /**
     * Faz upload de uma imagem ou arquivo para o bucket do R2.
     * @param file Arquivo ou Blob para upload
     * @param folder Pasta dentro do bucket (ex: 'thumbnails', 'avatars')
     * @param fileName Nome do arquivo
     * @returns URL pública do arquivo enviado
     */
    uploadFile: async (file: File | Blob, folder: string, fileName: string): Promise<string> => {
        try {
            console.log(`📡 [R2Service] Iniciando upload para R2: ${folder}/${fileName}...`);

            let fileExt = fileName.includes('.') ? fileName.split('.').pop() : (file.type ? file.type.split('/')[1] : 'jpg');
            // Correção para svgs
            if (fileExt?.includes('svg')) fileExt = 'svg';

            const baseName = fileName.includes('.') ? fileName.split('.').slice(0, -1).join('.') : fileName;
            const safeBaseName = baseName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const cleanFileName = `${Date.now()}_${safeBaseName}.${fileExt}`;
            const key = `${folder}/${cleanFileName}`;

            const arrayBuffer = await file.arrayBuffer();

            const command = new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: key,
                Body: new Uint8Array(arrayBuffer),
                ContentType: file.type || 'image/jpeg',
            });

            await s3Client.send(command);

            const publicUrl = `${R2_PUBLIC_DOMAIN}${key}`;
            console.log(`✅ [R2Service] Upload concluído com sucesso: ${publicUrl}`);

            return publicUrl;
        } catch (error: any) {
            console.error("❌ [R2Service] Erro crítico no upload para R2:");
            console.error("Nome do Erro:", error?.name);
            console.error("Mensagem:", error?.message);
            console.error("Erro Completo:", error);
            throw error;
        }
    },

    /**
     * Helper para upload de Thumbnails
     */
    uploadThumbnail: async (file: File | Blob, videoId: string): Promise<string> => {
        return r2Service.uploadFile(file, 'thumbnails', `thumb_${videoId}.jpg`);
    },

    /**
     * Helper para upload de Avatares
     */
    uploadAvatar: async (file: File | Blob, userId: string): Promise<string> => {
        return r2Service.uploadFile(file, 'avatars', `avatar_${userId}.jpg`);
    },

    /**
     * Helper para upload de Banners de Campanhas
     */
    uploadBanner: async (file: File | Blob, campaignId: string): Promise<string> => {
        return r2Service.uploadFile(file, 'banners', `banner_${campaignId}.jpg`);
    },

    /**
     * Faz upload de um arquivo grande (vídEO) com acompanhamento de progresso.
     */
    uploadVideo: async (
        file: File | Blob,
        fileName: string,
        onProgress?: (progress: number) => void
    ): Promise<string> => {
        try {
            const safeName = fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const key = `videos/${Date.now()}_${safeName}`;

            console.log(`📡 [R2Service] Iniciando upload PARTE A PARTE de vídeo: ${key}...`);

            const parallelUploads3 = new Upload({
                client: s3Client,
                params: {
                    Bucket: R2_BUCKET_NAME,
                    Key: key,
                    Body: file,
                    ContentType: file.type || 'video/mp4',
                },
                queueSize: 4,
                partSize: 1024 * 1024 * 5, // 5MB por parte
                leavePartsOnError: false,
            });

            parallelUploads3.on("httpUploadProgress", (progress) => {
                if (progress.loaded && progress.total && onProgress) {
                    const percentage = Math.round((progress.loaded / progress.total) * 100);
                    onProgress(percentage);
                }
            });

            await parallelUploads3.done();

            const publicUrl = `${R2_PUBLIC_DOMAIN}${key}`;
            console.log(`✅ [R2Service] Vídeo enviado com sucesso: ${publicUrl}`);
            return publicUrl;
        } catch (error: any) {
            console.error("❌ [R2Service] Erro crítico no upload de vídeo para R2:", error);
            throw error;
        }
    }
};
