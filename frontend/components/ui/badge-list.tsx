'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, direction: 'top' as 'top' | 'bottom' });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [mounted, setMounted] = useState(false);

  const handleOpen = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setIsOpen(true);
  };

  const handleClose = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150); // Small delay to prevent flickering
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const visibleItems = items.slice(0, limit);
  const hiddenItems = items.slice(limit);
  const hasMore = hiddenItems.length > 0;

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      
      const spaceAbove = rect.top;
      const direction = spaceAbove < 200 ? 'bottom' : 'top';
      
      setCoords({
        top: direction === 'top' 
          ? rect.top + scrollY 
          : rect.bottom + scrollY,
        left: rect.left + scrollX + (rect.width / 2),
        width: rect.width,
        direction
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  // Handle click outside for mobile convenience
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Also check if the click was inside the portal (optional, but since we use portal it's tricky)
        // For now, simple outside container check.
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

  const tooltipContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: coords.direction === 'top' ? 10 : -10, scale: 0.95, x: '-50%' }}
          animate={{ opacity: 1, y: coords.direction === 'top' ? -8 : 8, scale: 1, x: '-50%' }}
          exit={{ opacity: 0, y: coords.direction === 'top' ? 5 : -5, scale: 0.95, x: '-50%' }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{ 
            position: 'absolute',
            top: coords.top,
            left: coords.left,
            zIndex: 9999,
            pointerEvents: 'none' // Allow hovering to continue on the button
          }}
          className="w-max max-w-[220px]"
        >
          <div className="bg-card/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-2xl space-y-2 pointer-events-auto">
             <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 px-1 border-b border-border/50 pb-1">
                Additional Privileges
             </p>
             <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {hiddenItems.map(item => (
                  <div 
                    key={item} 
                    className="text-[11px] px-2 py-1.5 rounded-md bg-muted/40 text-foreground font-medium flex items-center gap-2 group border border-transparent hover:border-primary/20 hover:bg-muted/60 transition-all"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/30 group-hover:bg-primary transition-colors" />
                    {item.replace(/_/g, ' ')}
                  </div>
                ))}
             </div>
             {/* Tooltip Arrow alternative (simple center) */}
             <div className={cn(
                "absolute w-2.5 h-2.5 bg-card border-border rotate-45",
                coords.direction === 'top' 
                  ? "-bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b" 
                  : "-top-1.5 left-1/2 -translate-x-1/2 border-l border-t"
             )} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className={cn("flex flex-wrap gap-1 items-center", className)} ref={containerRef}>
      {visibleItems.map((item) => (
        <span 
          key={item} 
          className="text-xxs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium whitespace-nowrap"
        >
          {item.replace(/_/g, ' ')}
        </span>
      ))}

      {hasMore && (
        <div className="inline-block" onMouseLeave={handleClose}>
          <button
            ref={buttonRef}
            onMouseEnter={handleOpen}
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "text-xxs px-1.5 py-0.5 rounded-full font-medium transition-all cursor-help whitespace-nowrap",
              isOpen 
                ? "bg-primary text-white shadow-md ring-2 ring-primary/20" 
                : "bg-muted text-muted-foreground hover:bg-muted/90 hover:text-foreground"
            )}
          >
            +{hiddenItems.length} more
          </button>

          {mounted && createPortal(
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: coords.direction === 'top' ? 10 : -10, scale: 0.95, x: '-50%' }}
                  animate={{ opacity: 1, y: coords.direction === 'top' ? -12 : 12, scale: 1, x: '-50%' }}
                  exit={{ opacity: 0, y: coords.direction === 'top' ? 5 : -5, scale: 0.95, x: '-50%' }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  onMouseEnter={handleOpen}
                  onMouseLeave={handleClose}
                  style={{ 
                    position: 'absolute',
                    top: coords.top,
                    left: coords.left,
                    zIndex: 9999,
                    pointerEvents: 'auto'
                  }}
                  className="w-max max-w-[220px]"
                >
                  <div className="bg-card/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-2xl space-y-2">
                     <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 px-1 border-b border-border/50 pb-1">
                        Additional Privileges
                     </p>
                     <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                        {hiddenItems.map(item => (
                          <div 
                            key={item} 
                            className="text-[11px] px-2 py-1.5 rounded-md bg-muted/40 text-foreground font-medium flex items-center gap-2 group border border-transparent hover:border-primary/20 hover:bg-muted/60 transition-all"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-primary/30 group-hover:bg-primary transition-colors" />
                            {item.replace(/_/g, ' ')}
                          </div>
                        ))}
                     </div>
                     {/* Tooltip Arrow alternative (simple center) */}
                     <div className={cn(
                        "absolute w-2.5 h-2.5 bg-card border-border rotate-45 transition-all duration-200",
                        coords.direction === 'top' 
                          ? "-bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b" 
                          : "-top-1.5 left-1/2 -translate-x-1/2 border-l border-t"
                     )} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          , document.body)}
        </div>
      )}
    </div>
  );
}
