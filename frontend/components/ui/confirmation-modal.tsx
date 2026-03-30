'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, Info, AlertCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  variant = 'danger',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}: ConfirmationModalProps) {
  
  // Close on Escape key press
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onCancel();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: <AlertTriangle className="h-6 w-6 text-red-500" />,
      button: 'bg-red-500 hover:bg-red-600 focus:ring-red-500/50',
      bg: 'bg-red-500/10',
    },
    warning: {
      icon: <AlertCircle className="h-6 w-6 text-amber-500" />,
      button: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500/50',
      bg: 'bg-amber-500/10',
    },
    info: {
      icon: <Info className="h-6 w-6 text-primary" />,
      button: 'bg-primary hover:bg-primary/90 focus:ring-primary/50',
      bg: 'bg-primary/10',
    },
  };

  const currentVariant = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className={`p-3 rounded-xl ${currentVariant.bg}`}>
              {currentVariant.icon}
            </div>
            <button 
              onClick={onCancel}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-foreground leading-tight">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border hover:bg-muted font-semibold text-sm transition-all active:scale-95"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2.5 rounded-xl text-white font-semibold text-sm transition-all active:scale-95 shadow-lg shadow-primary/10 focus:ring-4 ${currentVariant.button}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
