
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, Mail, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useAuth, USE_SUPABASE_AUTH } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { supabaseAuthService } from '../services/supabaseAuthService';

// Seleciona o serviço de auth baseado na configuração
const auth: any = USE_SUPABASE_AUTH ? supabaseAuthService : authService;

const Verification: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const email = searchParams.get('email') || location.state?.email;
  const autoCode = location.state?.autoCode;

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-preencher código de teste (modo localStorage)
  useEffect(() => {
    if (autoCode) {
      setCode(String(autoCode));
    }
  }, [autoCode]);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code) return setError("Digite o código.");

    setIsLoading(true);
    setError('');

    try {
      // Usa o serviço local - Sem erro de conexão
      const user = await auth.verify(email, code);
      login(user);

      // Redirecionamento inteligente baseado no cargo
      switch (user.role) {
        case 'advertiser':
          navigate('/ads');
          break;
        case 'creator':
          navigate('/dashboard');
          break;
        case 'owner':
          navigate('/admin');
          break;
        case 'viewer':
        default:
          navigate('/');
          break;
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Código incorreto.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl relative">
        <button onClick={() => navigate('/auth')} className="absolute top-4 left-4 text-zinc-500 hover:text-white">
          <ArrowLeft size={20} />
        </button>

        <div className="w-16 h-16 bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="text-blue-500" size={32} />
        </div>

        <h2 className="text-xl font-bold mb-2">Verifique seu E-mail</h2>
        <p className="text-zinc-400 text-sm mb-6">
          Código enviado para:<br />
          <span className="font-bold text-white">{email || '...'}</span>
        </p>

        {/* Mostra código de teste se disponível (modo localStorage) */}
        {autoCode ? (
          <div className="mb-4 bg-yellow-900/10 p-2 rounded border border-yellow-900/30 text-xs text-yellow-500 flex items-center justify-center gap-2">
            <AlertTriangle size={12} /> Código de Teste: <strong>{autoCode}</strong>
          </div>
        ) : (
          <div className="mb-4 bg-blue-900/10 p-3 rounded border border-blue-900/30 text-xs text-blue-400">
            <p className="mb-1">📧 <strong>Enviamos um email de confirmação!</strong></p>
            <p>Clique no link do email para ativar sua conta, ou digite o código abaixo.</p>
          </div>
        )}

        <form onSubmit={handleVerify}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="0000"
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-4 text-center text-3xl font-mono tracking-[1em] text-white mb-6 outline-none focus:border-blue-500 transition-colors"
            maxLength={4}
          />

          {error && <p className="text-red-400 text-sm mb-4 bg-red-900/20 p-2 rounded">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={18} /> Confirmar e Entrar</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Verification;
