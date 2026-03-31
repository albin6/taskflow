'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BadgeListProps {
  items: string[];
  limit?: number;
  className?: string;
}

export default function BadgeList({ items, limit = 3, className }: BadgeListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleItems = items.slice(0, limit);
  const hiddenItems = items.slice(limit);
  const hasMore = hiddenItems.length > 0;

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      // If less than 250px above, show below to avoid clipping
      setPosition(spaceAbove < 250 ? 'bottom' : 'top');
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen]);

  // Handle click outside for mobile convenience
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!items || items.length === 0) {
    return <span className="text-xxs text-muted-foreground italic">None</span>;
  }

  return (
    <div className={cn("flex flex-wrap gap-1 items-center relative", className)} ref={containerRef}>
      {visibleItems.map((item) => (
        <span 
          key={item} 
          className="text-xxs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium whitespace-nowrap"
        >
          {item.replace(/_/g, ' ')}
        </span>
      ))}

      {hasMore && (
        <div className="relative">
          <button
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "text-xxs px-1.5 py-0.5 rounded-full font-medium transition-all cursor-help",
              isOpen 
                ? "bg-primary text-white shadow-sm ring-2 ring-primary/20" 
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            +{hiddenItems.length} more
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: position === 'top' ? 10 : -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: position === 'top' ? 5 : -5, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className={cn(
                  "absolute z-[60] left-1/2 -translate-x-1/2 w-max max-w-[200px]",
                  position === 'top' ? "bottom-full mb-2" : "top-full mt-2"
                )}
              >
                <div className="bg-card/95 backdrop-blur-md border border-border p-2.5 rounded-xl shadow-xl space-y-1.5">
                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 px-1">
                      Additional Privileges
                   </p>
                   <div className="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {hiddenItems.map(item => (
                        <div 
                          key={item} 
                          className="text-[11px] px-2 py-1 rounded-md bg-muted/50 text-foreground font-medium flex items-center gap-2 group"
                        >
                          <div className="h-1 w-1 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                          {item.replace(/_/g, ' ')}
                        </div>
                      ))}
                   </div>
                   {/* Tooltip Arrow alternative (simple bottom center) */}
                   <div className={cn(
                      "absolute w-2 h-2 bg-card border-border rotate-45 transition-all duration-200",
                      position === 'top' 
                        ? "-bottom-1 left-1/2 -translate-x-1/2 border-r border-b" 
                        : "-top-1 left-1/2 -translate-x-1/2 border-l border-t"
                   )} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
