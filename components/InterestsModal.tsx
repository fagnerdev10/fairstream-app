
import React, { useState, useEffect } from 'react';
import { X, Sparkles, Tag, Search, Heart, Save, Trash2 } from 'lucide-react';
import { recommendationService } from '../services/recommendationService';
import { useSettings } from '../contexts/SettingsContext';

interface InterestsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const InterestsModal: React.FC<InterestsModalProps> = ({ isOpen, onClose }) => {
    const { theme } = useSettings();
    const [interests, setInterests] = useState('');
    const [topInterests, setTopInterests] = useState<{ keyword: string; weight: number }[]>([]);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Carrega interesses salvos
            const manual = recommendationService.getManualInterests();
            setInterests(manual.join(', '));

            // Carrega top interesses detectados
            setTopInterests(recommendationService.getTopInterests(15));
            setSaved(false);
        }
    }, [isOpen]);

    const handleSave = () => {
        recommendationService.setManualInterests(interests);
        setSaved(true);
        setTimeout(() => {
            onClose();
        }, 1000);
    };

    const handleClear = () => {
        if (confirm('Tem certeza que deseja limpar todos os seus interesses? A plataforma vai recomeçar a aprender do zero.')) {
            recommendationService.clearProfile();
            setInterests('');
            setTopInterests([]);
        }
    };

    if (!isOpen) return null;

    const bgModal = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
    const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
    const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-gray-600';
    const borderColor = theme === 'dark' ? 'border-zinc-700' : 'border-gray-300';
    const inputBg = theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-100';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className={`relative w-full max-w-2xl mx-4 rounded-2xl shadow-2xl ${bgModal} border ${borderColor} animate-fade-in`}>
                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b ${borderColor}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                            <Sparkles className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className={`text-xl font-bold ${textPrimary}`}>Meus Interesses</h2>
                            <p className={`text-sm ${textSecondary}`}>Personalize o que você quer ver</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full hover:bg-zinc-800 transition-colors ${textSecondary}`}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">

                    {/* Manual Input */}
                    <div>
                        <label className={`flex items-center gap-2 text-sm font-bold mb-3 ${textPrimary}`}>
                            <Heart className="text-pink-500" size={18} />
                            O que você gostaria de ver?
                        </label>
                        <p className={`text-sm ${textSecondary} mb-3`}>
                            Escreva palavras ou frases separadas por vírgula. Exemplo: viagem para europa, salário de mecânico na itália, como morar em portugal, receitas de bolo...
                        </p>
                        <textarea
                            value={interests}
                            onChange={(e) => setInterests(e.target.value)}
                            placeholder="viagem para europa, trabalho remoto, culinária brasileira, programação, vida na espanha..."
                            rows={4}
                            className={`w-full p-4 rounded-xl border ${borderColor} ${inputBg} ${textPrimary} placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none`}
                        />
                    </div>

                    {/* Interesses detectados */}
                    {topInterests.length > 0 && (
                        <div>
                            <label className={`flex items-center gap-2 text-sm font-bold mb-3 ${textPrimary}`}>
                                <Search className="text-blue-500" size={18} />
                                Interesses detectados automaticamente
                            </label>
                            <p className={`text-sm ${textSecondary} mb-3`}>
                                Baseado nas suas pesquisas, vídeos assistidos e likes:
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {topInterests.map((item, idx) => (
                                    <span
                                        key={idx}
                                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${item.weight > 20
                                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                            : item.weight > 10
                                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                : theme === 'dark'
                                                    ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                                    : 'bg-gray-200 text-gray-600 border border-gray-300'
                                            }`}
                                    >
                                        <Tag size={12} />
                                        {item.keyword}
                                        <span className="opacity-50 text-xs">({item.weight})</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Dica */}
                    <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-blue-900/20 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                        <p className={`text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                            💡 <strong>Dica:</strong> Quanto mais você usar a plataforma, melhor ela vai entender seus gostos!
                            Pesquisas, vídeos assistidos e likes ajudam a personalizar sua experiência.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className={`flex items-center justify-between p-6 border-t ${borderColor}`}>
                    <button
                        onClick={handleClear}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                        <Trash2 size={18} />
                        Limpar tudo
                    </button>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-gray-200 hover:bg-gray-300'} ${textPrimary} font-medium transition-colors`}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${saved
                                ? 'bg-green-500 text-white'
                                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
                                }`}
                        >
                            {saved ? (
                                <>✅ Salvo!</>
                            ) : (
                                <><Save size={18} /> Salvar Interesses</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InterestsModal;
