'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputErrorProps {
  message?: string;
  className?: string;
}

export default function InputError({ message, className }: InputErrorProps) {
  return (
    <AnimatePresence mode="wait">
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2 }}
          transition={{ duration: 0.2 }}
          className={cn("flex items-center gap-1.5 mt-1.5 text-red-500", className)}
        >
          <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" />
          <p className="text-[11px] font-medium leading-none">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
