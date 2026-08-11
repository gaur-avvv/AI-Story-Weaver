import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'error' | 'warning' | 'info' | 'success';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  showErrorToast: (message: string, title?: string) => void;
  showWarningToast: (message: string, title?: string) => void;
  showSuccessToast: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { id, type, title, message };
    
    setToasts(prev => [...prev.slice(-4), newToast]); // Keep max 5 toasts

    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, [removeToast]);

  const showErrorToast = useCallback((message: string, title = 'Error Occurred') => {
    showToast(message, 'error', title);
  }, [showToast]);

  const showWarningToast = useCallback((message: string, title = 'Warning') => {
    showToast(message, 'warning', title);
  }, [showToast]);

  const showSuccessToast = useCallback((message: string, title = 'Success') => {
    showToast(message, 'success', title);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showErrorToast, showWarningToast, showSuccessToast }}>
      {children}
      <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className={`pointer-events-auto p-3.5 rounded-2xl border shadow-xl backdrop-blur-xl flex items-start gap-3 relative overflow-hidden ${
                toast.type === 'error'
                  ? 'bg-red-950/85 border-red-500/40 text-red-100 shadow-red-950/50'
                  : toast.type === 'warning'
                  ? 'bg-amber-950/85 border-amber-500/40 text-amber-100 shadow-amber-950/50'
                  : toast.type === 'success'
                  ? 'bg-emerald-950/85 border-emerald-500/40 text-emerald-100 shadow-emerald-950/50'
                  : 'bg-slate-900/90 border-slate-700/50 text-slate-100 shadow-slate-950/50'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
                {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-purple-400" />}
              </div>

              <div className="flex-1 pr-4">
                {toast.title && <h4 className="text-xs font-bold mb-0.5 tracking-wide">{toast.title}</h4>}
                <p className="text-xs font-medium leading-relaxed opacity-90">{toast.message}</p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 text-white/50 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: 'linear' }}
                className={`absolute bottom-0 left-0 h-0.5 ${
                  toast.type === 'error' ? 'bg-red-400' : toast.type === 'warning' ? 'bg-amber-400' : toast.type === 'success' ? 'bg-emerald-400' : 'bg-purple-400'
                }`}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};
