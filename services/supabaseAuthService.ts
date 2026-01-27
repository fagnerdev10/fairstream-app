// ======================================
// SERVIÇO DE AUTENTICAÇÃO COM SUPABASE
// ======================================
// Fonte única de verdade para dados de usuários

import { supabase } from './supabaseClient';
import { User, UserRole, ChannelStatus, SocialLinks, PixKeyType } from '../types';

// ======================================
// MAPPER: DB (Profiles) -> APP (User)
// ======================================

const mapDbToUser = (profile: any): User => {
    if (!profile) return null as any;

    // Fallback para nome e avatar
    const name = profile.name || profile.email?.split('@')[0] || 'Usuário';
    const email = profile.email || '';

    return {
        id: profile.id,
        name: name,
        email: email,
        phone: profile.phone || '',
        role: profile.role || 'viewer',
        avatar: profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
        isCreator: profile.role === 'creator' || profile.role === 'owner',
        interests: [],
        pixKey: profile.pix_key || email,
        pixKeyType: (profile.pix_key_type || 'email') as PixKeyType,
        status: (profile.status || 'active') as ChannelStatus,
        warnings: profile.warnings || 0,
        createdAt: profile.created_at || new Date().toISOString(),
        description: profile.bio || '',
        channelMessage: profile.channel_message || '',
        socialLinks: profile.social_links || {},
        isSeed: false,
        cpf: profile.cpf || '',
        payoutEmail: '',
        payoutHolderName: '',
        membershipPrice: profile.membership_price || 9.90,
        lastActive: profile.updated_at ? new Date(profile.updated_at).getTime() : Date.now(),
        asaasWalletId: profile.asaas_wallet_id || '',
        asaasApiKey: '',
        blockedChannels: profile.blocked_channels || [],
        ignoredChannels: profile.ignored_channels || [],
        liveId: profile.live_id || ''
    };
};

export const supabaseAuthService = {
    // ======================================
    // AUTENTICAÇÃO
    // ======================================

    register: async (email: string, password: string, name: string, role: UserRole) => {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name, role } }
        });

        if (authError) throw authError;

        const profileData = {
            id: authData.user!.id,
            email,
            name,
            role: role === 'owner' ? 'viewer' : role,
            is_verified: true,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { error: profileError } = await supabase.from('profiles').upsert(profileData);
        if (profileError) console.error('Erro ao criar perfil:', profileError);

        return { ok: true, user: authData.user };
    },

    login: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Tenta buscar perfil, se não existir, cria
        let profile = await supabaseAuthService.getUserById(data.user.id);

        if (!profile) {
            console.log('🛠️ Criando perfil pós-login...');
            await supabaseAuthService.getCurrentUser(); // Trigger auto-cura
            profile = await supabaseAuthService.getUserById(data.user.id);
        }

        if (!profile) throw new Error('Falha ao sincronizar perfil do usuário.');
        return profile;
    },

    logout: async () => {
        await supabase.auth.signOut();
    },

    getCurrentUser: async (): Promise<User | null> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            // Busca perfil
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile) return mapDbToUser(profile);

            // AUTO-CURA: Se o usuário existe no Auth mas não no Profiles, cria agora
            console.log('🛠️ [Supabase] Perfil não encontrado. Criando registro automático...');
            const newProfile = {
                id: user.id,
                email: user.email,
                name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
                role: user.user_metadata?.role || 'viewer',
                avatar: user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.id}&background=random`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_verified: true
            };

            const { data: created, error: iError } = await supabase
                .from('profiles')
                .insert(newProfile)
                .select()
                .single();

            if (iError) {
                console.error('❌ Erro ao auto-criar perfil:', iError.message);
                return mapDbToUser(newProfile);
            }

            return mapDbToUser(created);
        } catch (e) {
            console.error('❌ Erro no getCurrentUser:', e);
            return null;
        }
    },

    // ======================================
    // GERENCIAMENTO
    // ======================================

    getAllUsers: async (): Promise<User[]> => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return [];
        return (data || []).map(mapDbToUser);
    },

    getUserById: async (id: string): Promise<User | null> => {
        try {
            // Validação de UUID: Se não for um UUID válido, nem tenta no Supabase (evita erro 400)
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            if (!isUUID) {
                console.warn(`⚠️ [Supabase] ID inválido para busca no banco: ${id}. Ignorando.`);
                return null;
            }

            console.log(`🔍 [Supabase] Buscando perfil para ID: ${id}`);

            // Tenta buscar o perfil
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (data) {
                console.log(`✅ [Supabase] Perfil encontrado para ID: ${id}`);
                return mapDbToUser(data);
            }

            // --- LÓGICA DE AUTO-RECUPERAÇÃO ---
            // Se não encontrou o perfil, mas o ID buscado é o do usuário logado agora...
            const { data: { user: sessionUser } } = await supabase.auth.getUser();

            if (sessionUser && sessionUser.id === id) {
                console.log('🛠️ [Supabase] Canal próprio sem perfil detectado. Forçando criação...');

                const newProfile = {
                    id: sessionUser.id,
                    email: sessionUser.email,
                    name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'Criador',
                    role: 'creator', // Forçamos como criador aqui
                    avatar: sessionUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${sessionUser.email}&background=random`,
                    is_verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const { data: created, error: iError } = await supabase
                    .from('profiles')
                    .upsert(newProfile) // Usa UPSERT para garantir que salve
                    .select()
                    .single();

                if (!iError && created) {
                    console.log('✨ [Supabase] Perfil criado/recuperado com sucesso!');
                    return mapDbToUser(created);
                } else {
                    console.warn('⚠️ Falha ao criar perfil via código:', iError?.message);
                    // Último recurso: Retorna um objeto User fake baseado na sessão para a UI não quebrar
                    return mapDbToUser(newProfile);
                }
            }

            if (error) {
                console.error(`❌ [Supabase] Erro de banco ao buscar ID ${id}:`, error.message);
            }

            return null;
        } catch (e) {
            console.error('❌ [Supabase] Erro fatal no getUserById:', e);
            return null;
        }
    },

    updateUser: async (userId: string, updates: Partial<User>): Promise<User> => {
        console.log('☁️ [Supabase] Iniciando atualização de perfil para:', userId);

        // Mapeamento App -> DB
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
        if (updates.description !== undefined) dbUpdates.bio = updates.description;
        if (updates.pixKey !== undefined) dbUpdates.pix_key = updates.pixKey;
        if (updates.pixKeyType !== undefined) dbUpdates.pix_key_type = updates.pixKeyType;
        if (updates.membershipPrice !== undefined) dbUpdates.membership_price = updates.membershipPrice;
        if (updates.socialLinks !== undefined) dbUpdates.social_links = updates.socialLinks;
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
        if (updates.cpf !== undefined) dbUpdates.cpf = updates.cpf;
        if (updates.asaasWalletId !== undefined) dbUpdates.asaas_wallet_id = updates.asaasWalletId;
        if (updates.channelMessage !== undefined) dbUpdates.channel_message = updates.channelMessage;
        if (updates.blockedChannels !== undefined) dbUpdates.blocked_channels = updates.blockedChannels;
        if (updates.ignoredChannels !== undefined) dbUpdates.ignored_channels = updates.ignoredChannels;
        if (updates.liveId !== undefined) dbUpdates.live_id = updates.liveId;

        // 1. TENTA O UPDATE COMPLETO
        const { data, error } = await supabase
            .from('profiles')
            .update(dbUpdates)
            .eq('id', userId)
            .select()
            .single();

        if (!error) {
            console.log('✅ [Supabase] Perfil atualizado com sucesso (Bulk update)');
            return mapDbToUser(data);
        }

        // 2. SE FALHAR POR COLUNA INEXISTENTE, TENTA SALVAR O QUE DER
        console.warn('⚠️ [Supabase] Falha no update em massa:', error.message);

        if (error.message.includes('column') || error.code === '42703') {
            const missingColumn = error.message.match(/column "(.+)" of relation/i)?.[1] || "desconhecida";
            console.error(`🚨 [Supabase] FALHA CRÍTICA: A coluna "${missingColumn}" não existe na tabela 'profiles'.`);
            console.warn('🛠️ [Supabase] Tentando salvamento resiliente (campo a campo) para contornar o erro...');

            // Campos que SABEMOS que existem sempre
            const basicUpdates: any = {
                name: dbUpdates.name || updates.name,
                avatar: dbUpdates.avatar || updates.avatar,
                updated_at: new Date().toISOString()
            };

            // Tenta o update básico primeiro
            const { data: basicData, error: basicError } = await supabase
                .from('profiles')
                .update(basicUpdates)
                .eq('id', userId)
                .select()
                .single();

            if (basicError) {
                console.error('❌ [Supabase] Falha até no update básico:', basicError.message);
                throw basicError;
            }

            // Tenta os outros campos individualmente para não perder nada do que existir
            let finalData = basicData;
            const extraFields = Object.keys(dbUpdates).filter(k => k !== 'name' && k !== 'avatar');

            for (const field of extraFields) {
                try {
                    const { data: fieldData, error: fieldError } = await supabase
                        .from('profiles')
                        .update({ [field]: dbUpdates[field] })
                        .eq('id', userId)
                        .select()
                        .single();

                    if (!fieldError) {
                        finalData = { ...finalData, ...fieldData };
                        console.log(`   ✨ Campo '${field}' atualizado com sucesso.`);
                    } else {
                        console.error(`   ❌ [Supabase] Erro no campo '${field}': Coluna ausente no banco de dados. RODAR SQL V27.`);
                    }
                } catch (e) {
                    console.error(`   ❌ [Supabase] Erro fatal no campo '${field}':`, e);
                }
            }

            console.log('✅ [Supabase] Salvamento resiliente concluído. Alguns campos podem ter sido ignorados.');
            return mapDbToUser(finalData);
        }

        throw error;
    },

    // --- MODERAÇÃO ---
    warnUser: async (userId: string): Promise<void> => {
        const { data: user } = await supabase.from('profiles').select('warnings').eq('id', userId).single();
        const newWarnings = (user?.warnings || 0) + 1;
        await supabase.from('profiles').update({ warnings: newWarnings }).eq('id', userId);
    },

    suspendUser: async (userId: string): Promise<void> => {
        await supabase.from('profiles').update({ status: 'suspended' }).eq('id', userId);
    },

    reactivateUser: async (userId: string): Promise<void> => {
        await supabase.from('profiles').update({ status: 'active', warnings: 0 }).eq('id', userId);
    },

    // --- MANUTENÇÃO ---
    isMaintenanceMode: (): boolean => {
        return localStorage.getItem('fairstream_maintenance') === 'true';
    },

    setMaintenanceMode: (active: boolean): void => {
        localStorage.setItem('fairstream_maintenance', String(active));
    },

    getMaxWarnings: (): number => {
        return parseInt(localStorage.getItem('fairstream_max_warnings') || '3');
    },

    setMaxWarnings: (count: number): void => {
        localStorage.setItem('fairstream_max_warnings', String(count));
    },

    updateLastActive: async (userId: string): Promise<void> => {
        try {
            await supabase
                .from('profiles')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', userId);
        } catch (e) { }
    },

    getOnlineCount: async (): Promise<number> => {
        try {
            // Conta usuários que tiveram atividade nos últimos 5 minutos
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

            const { count, error } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .gt('updated_at', fiveMinutesAgo);

            if (error) throw error;
            return count || 0;
        } catch (e) {
            console.error('[Supabase] Error getting online count:', e);
            return 0;
        }
    },

    createWalletForUser: async (userId: string, cpf: string): Promise<User> => {
        // 1. Busca o perfil atual
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (fetchError || !profile) throw new Error("Usuário não encontrado.");

        // 2. Chama o Asaas (Simulado/Vite Proxy)
        const { asaasService } = await import('./asaasService');
        const subAccount = await asaasService.createSubAccount({
            name: profile.name,
            email: profile.email,
            cpf: cpf
        });

        // 3. Atualiza o perfil com o walletId
        const { data: updated, error: updateError } = await supabase
            .from('profiles')
            .update({
                asaas_wallet_id: subAccount.walletId || subAccount.apiKey, // Depende do retorno do Asaas
                cpf: cpf
            })
            .eq('id', userId)
            .select()
            .single();

        if (updateError) throw updateError;
        return mapDbToUser(updated);
    }
};
