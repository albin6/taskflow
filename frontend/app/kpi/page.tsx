'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import api from '../../lib/axios';
import { 
  TrendingUp, 
  BarChart2, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ChevronRight,
  User as UserIcon
} from 'lucide-react';
import { clsx } from 'clsx';
import PerformanceDetailModal from '../../components/kpi/PerformanceDetailModal';

interface KpiMetrics {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  avgResolutionTimeHours: number;
  statusDistribution: { status: string; count: number; }[];
}

interface PerformanceEntry {
  user: {
    id: string;
    name: string;
    email: string;
  };
  metrics: KpiMetrics;
}

interface TeamPerformance {
  teamId: string;
  memberCount: number;
  performances: PerformanceEntry[];
  teamAverageCompletionRate: number;
}

export default function KpiPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<TeamPerformance | null>(null);
  const [personalMetrics, setPersonalMetrics] = useState<KpiMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail View State
  const [selectedMember, setSelectedMember] = useState<PerformanceEntry | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleSelectMember = async (entry: PerformanceEntry) => {
    setSelectedMember(entry);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/kpi/history/${entry.user.id}?days=7`);
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch personal metrics
        const personalRes = await api.get('/kpi/my');
        setPersonalMetrics(personalRes.data);

        // If Manager/Admin, fetch team metrics
        if (user && (user.level <= 2 || user.permissions?.includes('VIEW_KPI'))) {
          if (user.level === 0) {
            // Global stats for admin - in this simplified impl we'll just fetch a placeholder or skip
          } else if (user.teamId) {
            const teamRes = await api.get(`/kpi/team/${user.teamId}`);
            setData(teamRes.data);
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch KPI data:', err);
        setError(err.message || 'Error loading performance metrics');
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 flex items-center gap-3">
        <AlertCircle className="h-5 w-5" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 h-full overflow-y-auto pb-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <TrendingUp className="h-8 w-8 text-primary" />
          Performance & KPIs
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor team productivity and individual performance metrics.
        </p>
      </header>

      {/* Personal Snapshot */}
      <section className="bg-card rounded-2xl border border-border p-8 shadow-sm">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <UserIcon className="h-5 w-5 text-muted-foreground" />
          Your Snapshot
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard 
            label="Total Finished" 
            value={personalMetrics?.completedTasks || 0} 
            icon={CheckCircle} 
            variant="success" 
          />
          <StatCard 
            label="Completion Rate" 
            value={`${(personalMetrics?.completionRate || 0).toFixed(1)}%`} 
            icon={BarChart2} 
            variant="primary" 
          />
          <StatCard 
            label="Avg. Resolution" 
            value={`${(personalMetrics?.avgResolutionTimeHours || 0).toFixed(1)}h`} 
            icon={Clock} 
            variant="warning" 
          />
          <StatCard 
            label="Overdue (Est.)" 
            value={personalMetrics?.overdueTasks || 0} 
            icon={AlertCircle} 
            variant="danger" 
          />
        </div>
      </section>

      {/* Team Analytics */}
      {data && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Team Members Performance</h2>
            <div className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium">
              Team Avg: {data.teamAverageCompletionRate.toFixed(1)}%
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">Member</th>
                  <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">Completion Rate</th>
                  <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">Solved</th>
                  <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">Avg Time</th>
                  <th className="px-6 py-4 text-sm font-semibold text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.performances.map((p) => (
                  <tr 
                    key={p.user.id} 
                    onClick={() => handleSelectMember(p)}
                    className="hover:bg-muted/20 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {p.user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{p.user.name}</p>
                          <p className="text-xs text-muted-foreground">{p.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-muted rounded-full max-w-[100px] overflow-hidden">
                          <div 
                            className={clsx(
                              "h-full rounded-full transition-all duration-1000",
                              p.metrics.completionRate > 80 ? "bg-green-500" : 
                              p.metrics.completionRate > 50 ? "bg-amber-500" : "bg-red-500"
                            )}
                            style={{ width: `${p.metrics.completionRate}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-foreground">
                          {p.metrics.completionRate.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-foreground">{p.metrics.completedTasks}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {p.metrics.avgResolutionTimeHours.toFixed(1)}h
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted transition-all">
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Detail Performance Modal */}
      {selectedMember && (
        <PerformanceDetailModal 
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          user={selectedMember.user}
          metrics={selectedMember.metrics}
          history={history}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, variant }: { label: string, value: string | number, icon: any, variant: 'success' | 'danger' | 'warning' | 'primary' }) {
  const styles = {
    success: "text-green-500 bg-green-500/10",
    danger: "text-red-500 bg-red-500/10",
    warning: "text-amber-500 bg-amber-500/10",
    primary: "text-primary bg-primary/10",
  }[variant];

  return (
    <div className="p-6 rounded-xl border border-border bg-card/50 flex flex-col items-center text-center">
      <div className={clsx("p-3 rounded-2xl mb-4", styles)}>
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
    </div>
  );
}
