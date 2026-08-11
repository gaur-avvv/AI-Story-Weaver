import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldCheck } from 'lucide-react';
import { clearNonEssentialCache } from '../services/storageService';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRecovering: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isRecovering: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, isRecovering: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught Error Boundary Exception:", error, errorInfo);
    (this as any).setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleRecoverAndContinue = async () => {
    (this as any).setState({ isRecovering: true });
    try {
      await clearNonEssentialCache();
    } catch (e) {
      console.warn("Non-essential cache clear during recovery failed:", e);
    } finally {
      (this as any).setState({ hasError: false, error: null, errorInfo: null, isRecovering: false });
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 select-none">
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-2xl backdrop-blur-xl text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/10">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight text-white mb-1">
                Story Engine Interrupted
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                An unexpected system exception occurred. Don't worry, your progress and story session can be recovered.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 text-left overflow-x-auto max-h-32">
                <p className="text-[11px] font-mono text-red-300 break-words">
                  {this.state.error.message || 'Unknown error'}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2.5 w-full mt-2">
              <button
                onClick={this.handleRecoverAndContinue}
                disabled={this.state.isRecovering}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-purple-600/25 transition-all flex items-center justify-center gap-2 border border-purple-400/30 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 text-purple-200" />
                {this.state.isRecovering ? 'Clearing Non-Essential Cache...' : 'Recover & Continue Session'}
              </button>

              <div className="flex gap-2.5 w-full">
                <button
                  onClick={this.handleRecoverAndContinue}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-all border border-slate-700/50 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Try Soft Reset
                </button>
                <button
                  onClick={this.handleReload}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-all border border-slate-700/50 flex items-center justify-center gap-1.5"
                >
                  <Home className="w-3.5 h-3.5" />
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props?.children;
  }
}

