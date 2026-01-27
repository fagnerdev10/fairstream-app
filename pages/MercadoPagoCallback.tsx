
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { mercadoPagoService } from '../services/mercadoPagoService';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const MercadoPagoCallback: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [error, setError] = useState('');

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state'); // creatorId enviado no redirect

        if (!code || !state) {
            setStatus('error');
            setError('Código de autorização não encontrado.');
            return;
        }

        const connect = async () => {
            try {
                await mercadoPagoService.exchangeCodeForToken(code, state);
                setStatus('success');
                setTimeout(() => {
                    navigate('/dashboard/financial?connected=mp');
                }, 2000);
            } catch (err: any) {
                setStatus('error');
                setError(err.message || 'Falha ao conectar conta.');
            }
        };

        connect();
    }, [searchParams, navigate]);

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center text-white">
            {status === 'loading' && (
                <>
                    <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
                    <h2 className="text-2xl font-bold">Conectando sua conta...</h2>
                    <p className="text-zinc-400 mt-2">Estamos processando sua autorização com o Mercado Pago.</p>
                </>
            )}

            {status === 'success' && (
                <div className="animate-in fade-in zoom-in-95">
                    <CheckCircle className="text-green-500 mb-4 mx-auto" size={64} />
                    <h2 className="text-2xl font-bold">Conta Conectada com Sucesso!</h2>
                    <p className="text-zinc-400 mt-2">Redirecionando para o seu painel financeiro...</p>
                </div>
            )}

            {status === 'error' && (
                <div className="animate-in fade-in zoom-in-95">
                    <AlertCircle className="text-red-500 mb-4 mx-auto" size={64} />
                    <h2 className="text-2xl font-bold">Erro na Conexão</h2>
                    <p className="text-red-400 mt-2">{error}</p>
                    <button
                        onClick={() => navigate('/dashboard/payments')}
                        className="mt-6 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                        Tentar Novamente
                    </button>
                </div>
            )}
        </div>
    );
};

export default MercadoPagoCallback;
