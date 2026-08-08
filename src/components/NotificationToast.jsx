import React from 'react';
import { useStore } from '../context/StoreContext';
import { CheckCircle2, AlertCircle, Info, Headphones, Sparkles } from 'lucide-react';

export const NotificationToast = () => {
  const { toast } = useStore();

  if (!toast) return null;

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'music':
        return <Headphones className="w-5 h-5 text-amber-400 animate-bounce" />;
      default:
        return <Sparkles className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="fixed top-24 right-6 z-50 animate-bounce">
      <div className="glass-panel border border-slate-700/80 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-md">
        {getIcon()}
        <span className="text-xs sm:text-sm font-semibold text-white">
          {toast.message}
        </span>
      </div>
    </div>
  );
};
