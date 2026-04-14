'use client';

import { useEffect, useState } from 'react';
import { BarChart3, PieChart, Users, CheckCircle2, Clock, Inbox } from 'lucide-react';
import api from '../../../lib/axios';

interface TechSupportAnalytics {
  totalTickets: number;
  statusDistribution: Record<string, number>;
  domainDistribution: Record<string, number>;
  assigneeDistribution: Record<string, number>;
}

export default function SupportAnalytics() {
  const [stats, setStats] = useState<TechSupportAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const response = await api.get('/tech-support/analytics');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/50" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const resolved = stats.statusDistribution['resolved'] || 0;
  const inProgress = stats.statusDistribution['in_progress'] || 0;
  const pending = stats.statusDistribution['pending'] || (stats.totalTickets - resolved - inProgress);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Tickets */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Inbox className="h-5 w-5" />
            </div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Tickets</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-foreground">{stats.totalTickets}</h3>
            <span className="text-xs text-muted-foreground">tickets logged</span>
          </div>
        </div>

        {/* Status: Resolved */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Resolved</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-foreground">{resolved}</h3>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-1">
              <div 
                className="h-full bg-green-500 transition-all duration-500" 
                style={{ width: `${(resolved / stats.totalTickets) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Status: In Progress */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">In Progress</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-foreground">{inProgress}</h3>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-1">
              <div 
                className="h-full bg-amber-500 transition-all duration-500" 
                style={{ width: `${(inProgress / stats.totalTickets) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Most Active Domain */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Top Domain</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-lg font-bold text-foreground truncate max-w-[150px]">
              {Object.entries(stats.domainDistribution).sort((a,b) => b[1]-a[1])[0]?.[0] || 'N/A'}
            </h3>
          </div>
        </div>
      </div>

      {/* Mini Charts Row */}
      <div className="grid gap-4 md:grid-cols-3">
         <div className="md:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
               <h4 className="text-sm font-semibold text-foreground">Active Support Members</h4>
               <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
               {Object.entries(stats.assigneeDistribution).slice(0, 4).map(([name, count]) => (
                  <div key={name} className="flex items-center gap-4 text-sm">
                     <div className="w-24 truncate font-medium">{name}</div>
                     <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                           className="h-full bg-primary transition-all duration-500" 
                           style={{ width: `${(count / stats.totalTickets) * 100}%` }}
                        />
                     </div>
                     <div className="w-8 text-right font-bold text-muted-foreground">{count}</div>
                  </div>
               ))}
               {Object.keys(stats.assigneeDistribution).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No assignments tracked yet.</p>
               )}
            </div>
         </div>
         
         <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4">
               <PieChart className="h-4 w-4 text-primary" />
               <h4 className="text-sm font-semibold text-foreground">Contact Health</h4>
            </div>
            <div className="flex items-center justify-around">
               <div className="text-center">
                  <p className="text-2xl font-bold text-green-500">{Math.round((resolved / stats.totalTickets) * 100) || 0}%</p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Resolved</p>
               </div>
               <div className="w-px h-10 bg-border" />
               <div className="text-center">
                  <p className="text-2xl font-bold text-amber-500">{Math.round(((inProgress + pending) / stats.totalTickets) * 100) || 0}%</p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Unresolved</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
