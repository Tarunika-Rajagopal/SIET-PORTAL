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
      <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-modal text-xs font-semibold backdrop-blur-md ${
        type === 'success' ? 'bg-[#1B2119] text-[#EDF1EC] border border-[#4A5844]' :
        type === 'error' ? 'bg-[#381717] text-[#F8EEEE] border border-[#7C3838]' :
        'bg-[#1A1A1A] text-[#F8F5EE] border border-[#D8CCBA]'
      }`}>
        {type === 'success' && <CheckCircle2 size={17} className="text-[#84A07B]" />}
        {type === 'error' && <AlertCircle size={17} className="text-[#D9AEAE]" />}
        {type === 'info' && <Info size={17} className="text-[#B8AA97]" />}
        
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
