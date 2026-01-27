// ======================================
// CONFIGURAÇÃO DO BUNNY.NET STREAM
// ======================================
// Cliente para upload e streaming de vídeos

const BUNNY_CONFIG = {
    libraryId: '581585',
    apiKey: 'c77c6f08-d164-4a9c-b04470ab12b4-7957-4996',
    cdnHost: 'vz-614d418d-4cc.b-cdn.net',
    apiUrl: 'https://video.bunnycdn.com/library'
};

// ======================================
// TIPOS
// ======================================

export interface BunnyVideo {
    guid: string;
    title: string;
    dateUploaded: string;
    views: number;
    status: number; // 0=created, 1=uploaded, 2=processing, 3=transcoding, 4=finished, 5=error
    length: number; // duração em segundos
    thumbnailUrl?: string;
    directPlayUrl?: string;
}

export interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}

// ======================================
// FUNÇÕES DA API
// ======================================

/**
 * Cria um novo vídeo na biblioteca (retorna o GUID para upload)
 */
export async function createVideo(title: string): Promise<{ guid: string; success: boolean }> {
    try {
        const response = await fetch(`${BUNNY_CONFIG.apiUrl}/${BUNNY_CONFIG.libraryId}/videos`, {
            method: 'POST',
            headers: {
                'AccessKey': BUNNY_CONFIG.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title })
        });

        if (!response.ok) {
            throw new Error(`Erro ao criar vídeo: ${response.status}`);
        }

        const data = await response.json();
        return { guid: data.guid, success: true };
    } catch (error) {
        console.error('Erro ao criar vídeo no Bunny:', error);
        return { guid: '', success: false };
    }
}

/**
 * Faz upload do arquivo de vídeo
 */
export async function uploadVideo(
    videoGuid: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
): Promise<boolean> {
    try {
        const uploadUrl = `${BUNNY_CONFIG.apiUrl}/${BUNNY_CONFIG.libraryId}/videos/${videoGuid}`;

        // Usando XMLHttpRequest para ter progresso
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable && onProgress) {
                    onProgress({
                        loaded: event.loaded,
                        total: event.total,
                        percentage: Math.round((event.loaded / event.total) * 100)
                    });
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(true);
                } else {
                    reject(new Error(`Upload falhou: ${xhr.status}`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Erro de rede no upload'));
            });

            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('AccessKey', BUNNY_CONFIG.apiKey);
            xhr.send(file);
        });
    } catch (error) {
        console.error('Erro no upload do vídeo:', error);
        return false;
    }
}

/**
 * Obtém informações de um vídeo
 */
export async function getVideo(videoGuid: string): Promise<BunnyVideo | null> {
    try {
        const response = await fetch(
            `${BUNNY_CONFIG.apiUrl}/${BUNNY_CONFIG.libraryId}/videos/${videoGuid}`,
            {
                headers: {
                    'AccessKey': BUNNY_CONFIG.apiKey
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Erro ao obter vídeo: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Erro ao obter vídeo:', error);
        return null;
    }
}

/**
 * Lista todos os vídeos da biblioteca
 */
export async function listVideos(page = 1, itemsPerPage = 100): Promise<BunnyVideo[]> {
    try {
        const response = await fetch(
            `${BUNNY_CONFIG.apiUrl}/${BUNNY_CONFIG.libraryId}/videos?page=${page}&itemsPerPage=${itemsPerPage}`,
            {
                headers: {
                    'AccessKey': BUNNY_CONFIG.apiKey
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Erro ao listar vídeos: ${response.status}`);
        }

        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error('Erro ao listar vídeos:', error);
        return [];
    }
}

/**
 * Deleta um vídeo
 */
export async function deleteVideo(videoGuid: string): Promise<boolean> {
    try {
        const response = await fetch(
            `${BUNNY_CONFIG.apiUrl}/${BUNNY_CONFIG.libraryId}/videos/${videoGuid}`,
            {
                method: 'DELETE',
                headers: {
                    'AccessKey': BUNNY_CONFIG.apiKey
                }
            }
        );

        return response.ok;
    } catch (error) {
        console.error('Erro ao deletar vídeo:', error);
        return false;
    }
}

/**
 * Gera a URL de streaming do vídeo
 */
export function getStreamUrl(videoGuid: string): string {
    return `https://${BUNNY_CONFIG.cdnHost}/${videoGuid}/playlist.m3u8`;
}

/**
 * Gera a URL do thumbnail do vídeo
 */
export function getThumbnailUrl(videoGuid: string): string {
    if (!videoGuid) return '';
    // Para thumbnails, o host da biblioteca é o mais confiável e imediato
    return `https://vz-581585.b-cdn.net/${videoGuid}/thumbnail.jpg`;
}

/**
 * Gera a URL do player embed do vídeo
 */
export function getEmbedUrl(videoGuid: string): string {
    return `https://iframe.mediadelivery.net/embed/${BUNNY_CONFIG.libraryId}/${videoGuid}`;
}

export async function uploadCustomThumbnail(videoGuid: string, imageFile: Blob | File): Promise<boolean> {
    try {
        console.log(`📤 [BunnyService] Enviando thumbnail (${imageFile.size} bytes) para o vídeo ${videoGuid}...`);

        // Converte Blob para arquivo se necessário para garantir o tipo
        const body = imageFile instanceof File ? imageFile : new File([imageFile], 'thumbnail.jpg', { type: 'image/jpeg' });

        const response = await fetch(
            `${BUNNY_CONFIG.apiUrl}/${BUNNY_CONFIG.libraryId}/videos/${videoGuid}/thumbnail`,
            {
                method: 'POST',
                headers: {
                    'AccessKey': BUNNY_CONFIG.apiKey
                    // Removido Content-Type e Accept para evitar 406 e problemas de boundary
                },
                body: imageFile // Envia o Blob ou File diretamente
            }
        );

        if (!response.ok) {
            const text = await response.text();
            console.error(`❌ [BunnyService] Erro no upload (Status ${response.status}):`, text);
            return false;
        }

        console.log(`✅ [BunnyService] Thumbnail enviada com sucesso!`);
        return true;
    } catch (error) {
        console.error('❌ [BunnyService] Falha fatal no upload:', error);
        return false;
    }
}

/**
 * Define o thumbnail do vídeo baseado em um tempo específico (segundos)
 */
export async function setVideoThumbnail(videoGuid: string, timeInSeconds: number): Promise<boolean> {
    try {
        const response = await fetch(
            `${BUNNY_CONFIG.apiUrl}/${BUNNY_CONFIG.libraryId}/videos/${videoGuid}/thumbnail?time=${Math.floor(timeInSeconds)}`,
            {
                method: 'POST',
                headers: {
                    'AccessKey': BUNNY_CONFIG.apiKey
                }
            }
        );
        return response.ok;
    } catch (error) {
        console.error('Erro ao definir thumbnail no Bunny:', error);
        return false;
    }
}

/**
 * Gera a URL de preview (gif animado)
 */
export function getPreviewUrl(videoGuid: string): string {
    return `https://${BUNNY_CONFIG.cdnHost}/${videoGuid}/preview.webp`;
}

/**
 * Upload completo: cria o vídeo e faz upload do arquivo
 */
export async function uploadVideoComplete(
    title: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
): Promise<{ success: boolean; videoGuid: string; streamUrl: string; thumbnailUrl: string }> {
    // 1. Criar o vídeo
    const createResult = await createVideo(title);
    if (!createResult.success) {
        return { success: false, videoGuid: '', streamUrl: '', thumbnailUrl: '' };
    }

    // 2. Fazer upload
    const uploadSuccess = await uploadVideo(createResult.guid, file, onProgress);
    if (!uploadSuccess) {
        return { success: false, videoGuid: '', streamUrl: '', thumbnailUrl: '' };
    }

    // 3. Retornar as URLs
    return {
        success: true,
        videoGuid: createResult.guid,
        streamUrl: getStreamUrl(createResult.guid),
        thumbnailUrl: getThumbnailUrl(createResult.guid)
    };
}

// Status do vídeo
export const VIDEO_STATUS = {
    CREATED: 0,
    UPLOADED: 1,
    PROCESSING: 2,
    TRANSCODING: 3,
    FINISHED: 4,
    ERROR: 5
};

export function getVideoStatusText(status: number): string {
    switch (status) {
        case VIDEO_STATUS.CREATED: return 'Criado';
        case VIDEO_STATUS.UPLOADED: return 'Enviado';
        case VIDEO_STATUS.PROCESSING: return 'Processando';
        case VIDEO_STATUS.TRANSCODING: return 'Transcodificando';
        case VIDEO_STATUS.FINISHED: return 'Pronto';
        case VIDEO_STATUS.ERROR: return 'Erro';
        default: return 'Desconhecido';
    }
}

console.log('✅ Bunny.net configurado - Library:', BUNNY_CONFIG.libraryId);
