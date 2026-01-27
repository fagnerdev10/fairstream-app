import { supabase } from './supabaseClient';

export interface PlatformSettings {
    asaasKey: string;
    asaasWalletId: string;
    isMaintenanceMode: boolean;
    maxWarnings: number;
    allowRegistrations: boolean;
}

const SETTINGS_CACHE_KEY = 'fairstream_platform_settings_cache';

const DEFAULT_SETTINGS: PlatformSettings = {
    asaasKey: '',
    asaasWalletId: '',
    isMaintenanceMode: false,
    maxWarnings: 3,
    allowRegistrations: true
};

export const platformSettingsService = {
    /**
     * Busca todas as configurações do Supabase.
     * Utiliza cache local para minimizar chamadas ao banco.
     */
    getSettings: async (forceRefresh = false): Promise<PlatformSettings> => {
        try {
            // Tenta carregar do cache se não for forçado
            if (!forceRefresh) {
                const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
                if (cached) {
                    return JSON.parse(cached);
                }
            }

            const { data, error } = await supabase
                .from('platform_settings')
                .select('*')
                .eq('id', 'global_settings')
                .single();

            if (error) {
                console.error('Erro ao buscar platform_settings:', error);
                // Fallback para localStorage individual (transição) ou padrão
                return {
                    asaasKey: localStorage.getItem('fairstream_asaas_key') || '',
                    asaasWalletId: localStorage.getItem('fairstream_asaas_wallet_id') || '',
                    isMaintenanceMode: localStorage.getItem('fairstream_maintenance_mode') === 'true',
                    maxWarnings: parseInt(localStorage.getItem('fairstream_max_warnings') || '3'),
                    allowRegistrations: localStorage.getItem('fairstream_allow_registrations') !== 'false'
                };
            }

            const settings: PlatformSettings = {
                asaasKey: data.asaas_key || '',
                asaasWalletId: data.asaas_wallet_id || '',
                isMaintenanceMode: data.is_maintenance_mode || false,
                maxWarnings: data.max_warnings || 3,
                allowRegistrations: data.allow_registrations ?? true
            };

            // Atualiza o cache
            localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));

            // Sincroniza retrocompatibilidade (temporário)
            localStorage.setItem('fairstream_asaas_key', settings.asaasKey);
            localStorage.setItem('fairstream_asaas_wallet_id', settings.asaasWalletId);
            localStorage.setItem('fairstream_maintenance_mode', settings.isMaintenanceMode.toString());
            localStorage.setItem('fairstream_max_warnings', settings.maxWarnings.toString());
            localStorage.setItem('fairstream_allow_registrations', settings.allowRegistrations.toString());

            return settings;
        } catch (e) {
            console.error('Erro crítico no platformSettingsService:', e);
            return DEFAULT_SETTINGS;
        }
    },

    /**
     * Atualiza as configurações no Supabase.
     */
    updateSettings: async (updates: Partial<PlatformSettings>): Promise<boolean> => {
        try {
            const dbUpdates: any = { updated_at: new Date().toISOString() };

            if (updates.asaasKey !== undefined) dbUpdates.asaas_key = updates.asaasKey;
            if (updates.asaasWalletId !== undefined) dbUpdates.asaas_wallet_id = updates.asaasWalletId;
            if (updates.isMaintenanceMode !== undefined) dbUpdates.is_maintenance_mode = updates.isMaintenanceMode;
            if (updates.maxWarnings !== undefined) dbUpdates.max_warnings = updates.maxWarnings;
            if (updates.allowRegistrations !== undefined) dbUpdates.allow_registrations = updates.allowRegistrations;

            const { error } = await supabase
                .from('platform_settings')
                .update(dbUpdates)
                .eq('id', 'global_settings');

            if (error) {
                // Se a tabela não existe ou erro de permissão, salva apenas localmente como fallback
                console.error('Erro ao salvar no Supabase, salvando apenas localmente:', error);
                if (updates.asaasKey !== undefined) localStorage.setItem('fairstream_asaas_key', updates.asaasKey);
                if (updates.asaasWalletId !== undefined) localStorage.setItem('fairstream_asaas_wallet_id', updates.asaasWalletId);
                return false;
            }

            // Invalida o cache para recarregar no próximo GET
            localStorage.removeItem(SETTINGS_CACHE_KEY);
            await platformSettingsService.getSettings(true);

            return true;
        } catch (e) {
            console.error('Erro ao atualizar configurações:', e);
            return false;
        }
    }
};
