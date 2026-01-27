export const ASAAS_CONFIG = {
    // ✅ PRODUÇÃO - Chaves lidas das Variáveis de Ambiente
    API_KEY: (import.meta as any).env?.VITE_ASAAS_API_KEY || "",
    WALLET_ID: (import.meta as any).env?.VITE_ASAAS_WALLET_ID || ""
};

