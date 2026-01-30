
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

// 🔍 Sanitização das chaves do ambiente
const R2_ACCOUNT_ID = (import.meta.env.VITE_R2_ACCOUNT_ID || "").trim();
const R2_ACCESS_KEY_ID = (import.meta.env.VITE_R2_ACCESS_KEY_ID || "").trim();
const R2_SECRET_ACCESS_KEY = (import.meta.env.VITE_R2_SECRET_ACCESS_KEY || "").trim();
const R2_BUCKET_NAME = (import.meta.env.VITE_R2_BUCKET_NAME || "").trim();
const R2_PUBLIC_URL = (import.meta.env.VITE_R2_PUBLIC_DOMAIN || import.meta.env.VITE_R2_PUBLIC_URL || "").trim();

// Configuração Silenciosa do S3 Client
const s3Client = new S3Client({
    region: "auto", // Compatibilidade automática da Cloudflare
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

export const r2Service = {
    async uploadFile(file: File, path: string, onProgress?: (progress: number) => void): Promise<string> {
        if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
            console.error("❌ ERRO: Configuração R2 incompleta no .env.local", {
                accountId: !!R2_ACCOUNT_ID,
                accessKey: !!R2_ACCESS_KEY_ID,
                secretKey: !!R2_SECRET_ACCESS_KEY,
                bucket: !!R2_BUCKET_NAME
            });
            throw new Error("Configuração R2 ausente ou incompleta no .env.local. Verifique se o arquivo está salvo em UTF-8 e se as chaves VITE_R2_* estão presentes.");
        }

        try {
            const upload = new Upload({
                client: s3Client,
                params: {
                    Bucket: R2_BUCKET_NAME,
                    Key: path,
                    Body: file,
                    ContentType: file.type
                },
                queueSize: 4,
                partSize: 1024 * 1024 * 5, // 5MB
                leavePartsOnError: false,
            });

            upload.on("httpUploadProgress", (progress) => {
                if (onProgress && progress.loaded && progress.total) {
                    const percentage = Math.round((progress.loaded / progress.total) * 100);
                    onProgress(percentage);
                }
            });

            await upload.done();
            return `${R2_PUBLIC_URL}/${path}`;
        } catch (error: any) {
            console.error("❌ [R2 Upload Error]:", error);
            throw error;
        }
    },

    async uploadThumbnail(file: File, videoId: string): Promise<string> {
        const extension = file.name.split('.').pop();
        const path = `thumbnails/${videoId}.${extension}`;
        return this.uploadFile(file, path);
    },

    async uploadAvatar(file: File, userId: string): Promise<string> {
        const extension = file.name.split('.').pop();
        const path = `avatars/${userId}.${extension}`;
        return this.uploadFile(file, path);
    },

    async uploadVideo(file: File, fileName: string, onProgress?: (progress: number) => void): Promise<string> {
        const timestamp = Date.now();
        const safeName = fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const path = `videos/${timestamp}_${safeName}`;
        return this.uploadFile(file, path, onProgress);
    },

    async testConnection(): Promise<{ success: boolean; message: string }> {
        if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
            return { success: false, message: "Configuração incompleta no arquivo .env.local" };
        }

        try {
            // 📡 TESTE 1: Rede Direta (Fetch HEAD) - Para isolar CORS
            console.log("📡 R2 Test Phase 1: Direct Fetch HEAD...");
            const headUrl = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}`;
            try {
                await fetch(headUrl, { method: 'HEAD', mode: 'cors' });
                console.log("✅ Phase 1 Success: Cloudflare domain is reachable from browser.");
            } catch (fetchError: any) {
                console.warn("⚠️ Phase 1 Warning: Direct fetch failed. This usually confirms CORS or AdBlock issues.", fetchError);
            }

            // 📦 TESTE 2: SDK Command
            console.log("📦 R2 Test Phase 2: SDK PutObjectCommand...");
            const testKey = `_test_${Date.now()}.txt`;
            const command = new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: testKey,
                Body: "test",
                ContentType: "text/plain"
            });
            await s3Client.send(command);
            return { success: true, message: "Conexão R2 estabelecida com sucesso! ✅" };
        } catch (error: any) {
            console.error("R2 Test Error:", error);
            let msg = error.message;
            if (msg.includes('Failed to fetch') || error.name === 'TypeError') {
                msg = "Bloqueio de Rede/CORS: O navegador impediu a conexão. Verifique AdBlock ou as configurações de CORS na Cloudflare.";
            }
            if (error.name === 'InvalidAccessKeyId') msg = "Access Key ID inválida.";
            if (error.name === 'SignatureDoesNotMatch') msg = "Secret Access Key incorreta ou Relógio do Windows desalinhado.";
            if (error.name === 'AccessDenied' || msg.includes('403')) msg = "Acesso Negado (403): Verifique se o Bucket e as Chaves têm permissão de escrita.";
            return { success: false, message: msg };
        }
    }
};
