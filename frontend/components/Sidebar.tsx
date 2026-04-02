'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../store/useAuthStore';
import { 
  LayoutDashboard, 
  Users, 
  ShieldAlert, 
  FileText, 
  Settings, 
  CheckSquare,
  ClipboardList,
  LogOut 
} from 'lucide-react';
import { clsx } from 'clsx';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  if (!user) return null; // Or skeleton during loading

  const routes = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard',
      visible: true,
    },
    {
      label: 'Tasks',
      icon: CheckSquare,
      href: '/tasks',
      visible: user.level !== 0,
    },
    {
      label: 'Assign Task',
      icon: ClipboardList,
      href: '/assign-tasks',
      visible: user.level !== 0,
    },
    {
      label: 'Teams',
      icon: Users,
      href: '/admin/teams',
      visible: user.level === 0,
    },
    {
      label: 'Members',
      icon: Users,
      href: '/admin/users',
      visible: user.level === 0, // Split Admin from Workspace Members
    },
    {
      label: 'Roles',
      icon: Settings,
      href: '/admin/roles',
      visible: user.level === 0,
    },
    {
      label: 'Audit Logs',
      icon: FileText,
      href: '/admin/audit-log',
      visible: user.level === 0,
    },
    {
      label: 'Team Members',
      icon: Users,
      href: '/team/members',
      visible: user.level > 0 && user.level <= 2,
    },
    {
      label: 'Approvals',
      icon: ShieldAlert,
      href: '/team/approvals',
      visible: user.level > 0 && user.level <= 2,
    },
    {
      label: 'Audit Log',
      icon: FileText,
      href: '/team/audit-log',
      visible: user.level > 0 && user.level <= 2,
    },
  ];

  return (
    <div className="flex flex-col h-full w-64 bg-card border-r border-border shadow-sm">
      <div className="p-6 flex items-center gap-2 border-b border-border">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg">
          T
        </div>
        <span className="font-bold text-xl tracking-tight text-foreground">Taskflow</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {routes.map((route) => (
          route.visible && (
            <Link
              key={route.href}
              href={route.href}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                pathname === route.href 
                  ? "bg-primary text-white" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <route.icon className="h-5 w-5" />
              {route.label}
            </Link>
          )
        ))}
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-white font-medium">
            {user?.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate" title={user?.name}>
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate" title={user?.email}>
              {user?.email}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
