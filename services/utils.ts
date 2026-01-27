
/**
 * Utilitários globais de formatação
 */

export const formatRelativeDate = (dateInput: string | Date): string => {
    if (!dateInput) return '';

    // Se já for uma string amigável (ex: "2 dias atrás"), retorna como está
    if (typeof dateInput === 'string' && !dateInput.includes('T') && isNaN(Date.parse(dateInput))) {
        return dateInput;
    }

    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return String(dateInput);

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'agora mesmo';

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `há ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `há ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'ontem';
    if (diffInDays < 7) return `há ${diffInDays} dias`;

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `há ${diffInWeeks} semana${diffInWeeks > 1 ? 's' : ''}`;

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `há ${diffInMonths} mês${diffInMonths > 1 ? 'es' : ''}`;

    const diffInYears = Math.floor(diffInDays / 365);
    return `há ${diffInYears} ano${diffInYears > 1 ? 's' : ''}`;
};

export const formatCompactNumber = (num: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(num);
};

export const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
};
