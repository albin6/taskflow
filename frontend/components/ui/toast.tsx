'use client';
 
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { useEffect } from 'react';
 
export type ToastType = 'success' | 'error' | 'warning' | 'info';
 
interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onClose: (id: string) => void;
  duration?: number;
}
 
export const Toast = ({ id, message, type, onClose, duration = 5000 }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, onClose, duration]);
 
  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertCircle className="h-5 w-5 text-amber-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  };
 
  const backgrounds = {
    success: 'bg-green-500/10 border-green-500/20',
    error: 'bg-red-500/10 border-red-500/20',
    warning: 'bg-amber-500/10 border-amber-500/20',
    info: 'bg-blue-500/10 border-blue-500/20',
  };
 
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      layout
      className={`flex items-center gap-3 p-4 pr-12 rounded-2xl border backdrop-blur-md shadow-2xl min-w-[320px] max-w-md ${backgrounds[type]}`}
    >
      <div className="shrink-0">{icons[type]}</div>
      <p className="text-sm font-bold text-foreground leading-tight tracking-tight">{message}</p>
      
      <button 
        onClick={() => onClose(id)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-foreground/5 text-muted-foreground/60 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
 
      {/* Timer Bar */}
      <motion.div 
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        className={`absolute bottom-0 left-0 h-0.5 opacity-30 ${
           type === 'error' ? 'bg-red-500' : 
           type === 'success' ? 'bg-green-500' :
           type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
        }`}
      />
    </motion.div>
  );
};
 
export const ToastContainer = ({ toasts, onClose }: { toasts: any[], onClose: (id: string) => void }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast {...toast} onClose={onClose} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};
