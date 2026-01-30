
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, ArrowRight, Loader2, AlertTriangle, ArrowLeft, KeyRound, CheckCircle, CreditCard, Phone } from 'lucide-react';
import { UserRole } from '../types';
import { useAuth, USE_SUPABASE_AUTH } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { supabaseAuthService } from '../services/supabaseAuthService';
import { useSettings } from '../contexts/SettingsContext';

// Seleciona o serviço de auth baseado na configuração
const auth: any = USE_SUPABASE_AUTH ? supabaseAuthService : authService;

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme } = useSettings();

  // States de Visualização
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('viewer');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  // Address Fields
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [province, setProvince] = useState('');

  // Forgot Password Fields
  const [resetStep, setResetStep] = useState(1); // 1 = Email, 2 = Code + New Pass
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleRedirect = (role: string) => {
    switch (role) {
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
        navigate('/');
        break;
      default:
        navigate('/');
        break;
    }
  };

  const handleLoginOrRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (view === 'login') {
        // --- LOGIN ---
        const user = await auth.login(email, password);
        login(user);
        handleRedirect(user.role);
      } else {
        // --- REGISTER ---
        const addressData = role === 'creator' ? {
          address,
          number: addressNumber,
          province,
          postalCode
        } : undefined;

        const result = await auth.register(email, password, name, role, cpf, phone, addressData, birthDate);

        // Se retornou autoLogin, fazer login direto
        if (result.autoLogin && result.user) {
          login(result.user);
          // Redirecionar baseado no role
          switch (result.user.role) {
            case 'advertiser':
              navigate('/ads');
              break;
            case 'creator':
              navigate('/dashboard');
              break;
            case 'owner':
              navigate('/admin');
              break;
            default:
              navigate('/');
          }
          return;
        }

        // Caso contrário, vai para verificação
        navigate(`/verify?email=${encodeURIComponent(email)}`, {
          state: { email, autoCode: USE_SUPABASE_AUTH ? undefined : result.codigo }
        });
      }
    } catch (error: any) {
      if (error.message === "ACCOUNT_EXISTS") {
        setView('login');
        setErrorMessage("Conta já existe. Por favor, faça login.");
      } else {
        // Traduzir erros do Supabase para português
        let errorMsg = error.message || "Erro desconhecido.";
        if (errorMsg.includes('6 characters')) {
          errorMsg = 'A senha deve ter pelo menos 6 caracteres.';
        } else if (errorMsg.includes('already registered')) {
          errorMsg = 'Este email já está cadastrado.';
        } else if (errorMsg.includes('Invalid login')) {
          errorMsg = 'Email ou senha incorretos.';
        } else if (errorMsg.includes('Email not confirmed')) {
          errorMsg = 'Email ainda não confirmado. Verifique sua caixa de entrada.';
        } else if (errorMsg.includes('security purposes')) {
          // Extrair o tempo de espera da mensagem
          const match = errorMsg.match(/after (\d+) seconds/);
          const seconds = match ? match[1] : '60';
          errorMsg = `Por segurança, aguarde ${seconds} segundos antes de tentar novamente.`;
        } else if (errorMsg.includes('rate limit')) {
          errorMsg = 'Muitas tentativas. Aguarde alguns segundos.';
        }
        setErrorMessage(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      if (resetStep === 1) {
        // Pedir código
        const res = await auth.requestPasswordReset(email);
        setSuccessMessage(`Código enviado! (Simulação: ${res.code})`);
        setResetStep(2);
      } else {
        // Redefinir senha
        await auth.completePasswordReset(email, resetCode, newPassword);
        alert("Senha redefinida com sucesso! Agora faça login.");
        setView('login');
        setResetStep(1);
        setResetCode('');
        setNewPassword('');
        setPassword(''); // Limpa campo de senha do login
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Erro na recuperação.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Styles ---
  const pageBg = theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-100';
  const cardBg = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200';
  const titleColor = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const inputBg = theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400';
  const iconColor = theme === 'dark' ? 'text-zinc-500' : 'text-gray-400';
  const linkColor = theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-gray-600 hover:text-gray-900';

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative transition-colors duration-300 ${pageBg}`}>
      <button
        onClick={() => navigate('/')}
        className={`absolute top-6 left-6 flex items-center gap-2 transition-colors z-10 ${linkColor}`}
      >
        <ArrowLeft size={24} />
        <span className="text-sm font-medium hidden sm:inline">Voltar ao Início</span>
      </button>

      <div className={`w-full max-w-md border rounded-2xl shadow-2xl p-8 transition-colors duration-300 ${cardBg}`}>

        {/* --- CABEÇALHO --- */}
        <h1 className={`text-2xl font-bold text-center mb-6 ${titleColor}`}>
          {view === 'login' && 'Acessar Conta'}
          {view === 'register' && 'Criar Nova Conta'}
          {view === 'forgot' && 'Recuperar Senha'}
        </h1>

        {/* --- FORMULÁRIO DE LOGIN / CADASTRO --- */}
        {view !== 'forgot' && (
          <form onSubmit={handleLoginOrRegister} className="space-y-4">
            {view === 'register' && (
              <div className="relative">
                <UserIcon className={`absolute left-3 top-3 ${iconColor}`} size={20} />
                <input
                  type="text"
                  placeholder="Nome Completo"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={`w-full border rounded-lg py-3 pl-10 pr-4 focus:border-red-600 outline-none transition-colors ${inputBg}`}
                  required
                />
              </div>
            )}

            <div className="relative">
              <Mail className={`absolute left-3 top-3 ${iconColor}`} size={20} />
              <input
                type="email"
                placeholder="Seu E-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={`w-full border rounded-lg py-3 pl-10 pr-4 focus:border-red-600 outline-none transition-colors ${inputBg}`}
                required
              />
            </div>

            <div className="relative">
              <Lock className={`absolute left-3 top-3 ${iconColor}`} size={20} />
              <input
                type="password"
                placeholder="Sua Senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`w-full border rounded-lg py-3 pl-10 pr-4 focus:border-red-600 outline-none transition-colors ${inputBg}`}
                required
              />
            </div>

            {view === 'register' && role === 'creator' && (
              <>
                <div className="relative">
                  <CreditCard className={`absolute left-3 top-3 ${iconColor}`} size={20} />
                  <input
                    type="text"
                    placeholder="CPF (Para receber pagamentos)"
                    value={cpf}
                    onChange={e => setCpf(e.target.value)}
                    className={`w-full border rounded-lg py-3 pl-10 pr-4 focus:border-red-600 outline-none transition-colors ${inputBg}`}
                    required
                  />
                </div>
                <div className="relative">
                  <Phone className={`absolute left-3 top-3 ${iconColor}`} size={20} />
                  <input
                    type="text"
                    placeholder="Celular (Para notificações)"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className={`w-full border rounded-lg py-3 pl-10 pr-4 focus:border-red-600 outline-none transition-colors ${inputBg}`}
                    required
                  />
                </div>

                <div className="relative">
                  <span className={`absolute left-3 top-3 ${iconColor}`}>📅</span>
                  <input
                    type="date"
                    placeholder="Data de Nascimento"
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    className={`w-full border rounded-lg py-3 pl-10 pr-4 focus:border-red-600 outline-none transition-colors ${inputBg}`}
                    required
                    style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                  />
                </div>

                {/* Address Fields */}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="CEP (00000-000)"
                    value={postalCode}
                    onChange={e => setPostalCode(e.target.value)}
                    className={`w-full border rounded-lg py-3 px-3 focus:border-red-600 outline-none transition-colors ${inputBg}`}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Número"
                    value={addressNumber}
                    onChange={e => setAddressNumber(e.target.value)}
                    className={`w-full border rounded-lg py-3 px-3 focus:border-red-600 outline-none transition-colors ${inputBg}`}
                    required
                  />
                </div>
                <input
                  type="text"
                  placeholder="Endereço (Rua, Av...)"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className={`w-full border rounded-lg py-3 px-3 focus:border-red-600 outline-none transition-colors ${inputBg}`}
                  required
                />
                <input
                  type="text"
                  placeholder="Bairro"
                  value={province}
                  onChange={e => setProvince(e.target.value)}
                  className={`w-full border rounded-lg py-3 px-3 focus:border-red-600 outline-none transition-colors ${inputBg}`}
                  required
                />

                <div className="text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 p-2 rounded">
                  <p>⚠️ Criaremos uma conta automática para você receber pagamentos.</p>
                </div>
              </>
            )}

            {view === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setView('forgot'); setErrorMessage(''); }}
                  className={`text-xs transition-colors ${linkColor}`}
                >
                  Esqueci minha senha
                </button>
              </div>
            )}

            {view === 'register' && (
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => setRole('viewer')} className={`py-2 border rounded text-xs sm:text-sm transition-colors ${role === 'viewer' ? 'bg-zinc-800 border-red-500 text-white' : (theme === 'dark' ? 'border-zinc-700 text-zinc-500' : 'border-gray-300 text-gray-500')}`}>Espectador</button>
                <button type="button" onClick={() => setRole('creator')} className={`py-2 border rounded text-xs sm:text-sm transition-colors ${role === 'creator' ? 'bg-zinc-800 border-red-500 text-white' : (theme === 'dark' ? 'border-zinc-700 text-zinc-500' : 'border-gray-300 text-gray-500')}`}>Criador</button>
                <button type="button" onClick={() => setRole('advertiser')} className={`py-2 border rounded text-xs sm:text-sm transition-colors ${role === 'advertiser' ? 'bg-zinc-800 border-red-500 text-white' : (theme === 'dark' ? 'border-zinc-700 text-zinc-500' : 'border-gray-300 text-gray-500')}`}>Anunciante</button>
              </div>
            )}

            {errorMessage && (
              <div className="text-sm p-3 rounded flex items-start gap-2 bg-red-900/20 border border-red-900/50 text-red-600 dark:text-red-200">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-transform active:scale-[0.98]"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <>{view === 'login' ? 'Entrar Agora' : 'Cadastrar Conta'} <ArrowRight size={18} /></>}
            </button>
          </form>
        )}

        {/* --- FORMULÁRIO DE RECUPERAÇÃO DE SENHA --- */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">

            {resetStep === 1 ? (
              // Passo 1: Digitar Email
              <div className="relative">
                <Mail className={`absolute left-3 top-3 ${iconColor}`} size={20} />
                <input
                  type="email"
                  placeholder="E-mail da conta"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={`w-full border rounded-lg py-3 pl-10 pr-4 focus:border-blue-500 outline-none transition-colors ${inputBg}`}
                  required
                />
              </div>
            ) : (
              // Passo 2: Código + Nova Senha
              <>
                <div className="p-3 bg-blue-900/20 border border-blue-800 rounded text-sm text-blue-600 dark:text-blue-200 mb-2">
                  <p>Enviamos um código para <strong>{email}</strong>.</p>
                </div>
                <div className="relative">
                  <KeyRound className={`absolute left-3 top-3 ${iconColor}`} size={20} />
                  <input
                    type="text"
                    placeholder="Código de Verificação"
                    value={resetCode}
                    onChange={e => setResetCode(e.target.value)}
                    className={`w-full border rounded-lg py-3 pl-10 pr-4 focus:border-blue-500 outline-none transition-colors ${inputBg}`}
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className={`absolute left-3 top-3 ${iconColor}`} size={20} />
                  <input
                    type="password"
                    placeholder="Nova Senha"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className={`w-full border rounded-lg py-3 pl-10 pr-4 focus:border-blue-500 outline-none transition-colors ${inputBg}`}
                    required
                  />
                </div>
              </>
            )}

            {errorMessage && (
              <div className="text-sm p-3 rounded flex items-start gap-2 bg-red-900/20 border border-red-900/50 text-red-600 dark:text-red-200">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="text-sm p-3 rounded flex items-start gap-2 bg-green-900/20 border border-green-900/50 text-green-600 dark:text-green-200">
                <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-transform active:scale-[0.98]"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : (resetStep === 1 ? 'Enviar Código' : 'Redefinir Senha')}
            </button>

            <button
              type="button"
              onClick={() => { setView('login'); setResetStep(1); setErrorMessage(''); setSuccessMessage(''); }}
              className={`w-full text-sm py-2 transition-colors ${linkColor}`}
            >
              Cancelar e Voltar
            </button>
          </form>
        )}

        {/* --- RODAPÉ DE TROCA DE MODO --- */}
        {view !== 'forgot' && (
          <div className={`mt-6 text-center pt-4 border-t ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
            <button
              type="button"
              onClick={() => {
                setView(view === 'login' ? 'register' : 'login');
                setErrorMessage('');
              }}
              className={`text-sm transition-colors ${linkColor}`}
            >
              {view === 'login' ? 'Novo por aqui? Criar conta' : 'Já tem cadastro? Fazer Login'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
