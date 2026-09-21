import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  ArrowRight, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

  const { login, demoLogin, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar. Verifique seus dados.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await demoLogin();
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setForgotPasswordSent(true);
    setTimeout(() => setForgotPasswordSent(false), 5000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo e Títulos */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <img
              src="/raitz-logo.jpg"
              alt="Logo Raitz"
              referrerPolicy="no-referrer"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shadow-lg shadow-slate-900/10 border border-slate-200"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Admissão Digital
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Portal do Recursos Humanos • Raitz
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-slate-200/80 rounded-2xl">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {forgotPasswordSent && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Instruções de redefinição foram enviadas para o seu e-mail cadastrado.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo E-mail */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                E-mail corporativo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rh@galvanizacaoraitz.com.br"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Senha
                </label>
                <a
                  href="#esqueci"
                  onClick={handleForgotPassword}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Esqueci minha senha
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botão Entrar */}
            <div className="pt-2 space-y-2.5">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-4 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <span>{isLoading ? 'Autenticando...' : 'Acessar Painel do RH'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-2 text-[11px] text-slate-400 font-medium">ou</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <button
                type="button"
                onClick={handleQuickDemo}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 px-3 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Acesso Rápido RH (Demonstração)</span>
              </button>
            </div>
          </form>
        </div>

        {/* Rodapé LGPD */}
        <div className="mt-6 text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ambiente restrito ao RH • Conformidade com a LGPD</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Acesso e gerenciamento de contas realizado internamente pela equipe de Recursos Humanos.
          </p>
        </div>
      </div>
    </div>
  );
};

