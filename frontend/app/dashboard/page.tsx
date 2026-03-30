'use client';

import { useAuthStore } from '../../store/useAuthStore';
import { CheckSquare, Users, ShieldAlert, Zap } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const stats = [
    { label: 'Active Tasks', value: '12', icon: CheckSquare, color: 'text-blue-500 bg-blue-500/10' },
    { label: 'Team Members', value: '4', icon: Users, color: 'text-purple-500 bg-purple-500/10' },
    { label: 'Pending Approvals', value: '2', icon: ShieldAlert, color: 'text-amber-500 bg-amber-500/10' },
    { label: 'Completion Rate', value: '84%', icon: Zap, color: 'text-green-500 bg-green-500/10' },
  ];

  return (
    <div className="space-y-6 h-full overflow-y-auto pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome Back, {user?.name || 'User'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here is an overview of your workspace and tasks today.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="bg-card p-6 rounded-xl border border-border flex items-center justify-between shadow-sm">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{item.value}</p>
            </div>
            <div className={`p-3 rounded-lg ${item.color}`}>
              <item.icon className="h-6 w-6" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
          <div className="text-sm text-muted-foreground text-center py-12">
             No recent activity stream found for your profile bounds.
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Upcoming Due Dates</h2>
          <div className="text-sm text-muted-foreground text-center py-12">
             No immediate deadlines approaching.
          </div>
        </div>
      </div>
    </div>
  );
}
