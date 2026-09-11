import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogIn } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React component tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              Algo inesperado aconteceu
            </h2>
            
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              O aplicativo encontrou uma falha na renderização. Você pode recarregar a tela ou retornar à página de login.
            </p>

            {this.state.error?.message && (
              <div className="text-left bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6 font-mono text-xs text-slate-700 overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar página
              </button>
              
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('admissao_user');
                  localStorage.removeItem('admissao_token');
                  window.location.href = '/login';
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition"
              >
                <LogIn className="w-4 h-4" />
                Ir para o Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
