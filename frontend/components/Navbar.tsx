'use client';

import { useTheme } from './theme-context';
import { useAuthStore } from '../store/useAuthStore';
import { Sun, Moon, Bell } from 'lucide-react';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <header className="h-16 px-6 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-2">
        {/* Mobile menu trigger could go here */}
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="h-5 w-5" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </button>

        <div className="border-l border-border h-6" />

        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-medium text-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-foreground hidden sm:block truncate max-w-[150px]">
            {user.name}
          </span>
        </div>
      </div>
    </header>
  );
}
