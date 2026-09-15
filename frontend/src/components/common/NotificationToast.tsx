import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  message?: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose?: () => void;
}

export const NotificationToast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  duration = 3500,
  onClose
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        if (onClose) onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message, duration, onClose]);

  if (!visible || !message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5">
      <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-white text-xs font-semibold backdrop-blur-md ${
        type === 'success' ? 'bg-siet-dark/95 border border-emerald-500/30' :
        type === 'error' ? 'bg-rose-700/95 border border-rose-500/30' :
        'bg-slate-800/95 border border-slate-700'
      }`}>
        {type === 'success' && <CheckCircle2 size={17} className="text-siet-yellow" />}
        {type === 'error' && <AlertCircle size={17} className="text-rose-300" />}
        {type === 'info' && <Info size={17} className="text-sky-300" />}
        
        <span>{message}</span>

        <button
          onClick={() => {
            setVisible(false);
            if (onClose) onClose();
          }}
          className="ml-2 hover:opacity-70 text-white"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
