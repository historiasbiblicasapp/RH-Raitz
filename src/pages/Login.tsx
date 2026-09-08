import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, Lock, Mail, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('rh@empresa.com');
  const [password, setPassword] = useState('senha123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemo = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await demoLogin();
      navigate('/dashboard');
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
            Gestão de novos colaboradores • Raitz
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
                  placeholder="rh@empresa.com"
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
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-4 rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                <span>{isLoading ? 'Autenticando...' : 'Entrar'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Atalho de Demonstração Rápida */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleDemo}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Entrar com conta demo de RH</span>
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-2">
              Credenciais demonstrativas pré-configuradas para avaliação
            </p>
          </div>
        </div>

        {/* Rodapé LGPD */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Ambiente seguro com criptografia de ponta e conformidade com a LGPD.
        </p>
      </div>
    </div>
  );
};
