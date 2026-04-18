'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Activity, 
  Calendar,
  Zap,
  Target,
  BarChart2
} from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';

interface MetricDetail {
  status: string;
  count: number;
}

interface HistoricalEntry {
  timestamp: string;
  value: string | number;
  metricType: string;
}

interface PerformanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string;
    email: string;
  };
  metrics: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    completionRate: number;
    avgResolutionTimeHours: number;
    statusDistribution: MetricDetail[];
  };
  history: HistoricalEntry[];
}

export default function PerformanceDetailModal({ isOpen, onClose, user, metrics, history }: PerformanceDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'trend'>('stats');

  const completionHistory = (history || [])
    .filter(h => h.metricType === 'TASK_COMPLETION_RATE')
    .slice(-7);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/40 backdrop-blur-xl z-[60]"
          />
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-4 right-4 w-full max-w-xl bg-card border border-border/60 shadow-2xl z-[70] rounded-3xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-border/40 bg-gradient-to-br from-primary/5 to-transparent">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold border border-primary/20 shadow-inner">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground tracking-tight">{user.name}</h2>
                    <p className="text-sm text-muted-foreground font-medium">{user.email}</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2.5 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground border border-transparent hover:border-border"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => setActiveTab('stats')}
                  className={clsx(
                    "px-6 py-2 rounded-xl text-sm font-bold transition-all border",
                    activeTab === 'stats' 
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                      : "bg-background text-muted-foreground border-border hover:border-primary/30"
                  )}
                >
                  Performance Stats
                </button>
                <button 
                  onClick={() => setActiveTab('trend')}
                  className={clsx(
                    "px-6 py-2 rounded-xl text-sm font-bold transition-all border",
                    activeTab === 'trend'
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                      : "bg-background text-muted-foreground border-border hover:border-primary/30"
                  )}
                >
                  Activity Trend
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {activeTab === 'stats' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                     <QuickStat 
                        label="Productivity" 
                        value={`${metrics.completionRate.toFixed(1)}%`} 
                        icon={Zap} 
                        desc="Overall completion rate"
                     />
                     <QuickStat 
                        label="Speed" 
                        value={`${metrics.avgResolutionTimeHours.toFixed(1)}h`} 
                        icon={Clock} 
                        desc="Avg. resolution time"
                     />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                       <Activity className="h-4 w-4" />
                       Task Distribution
                    </h3>
                    <div className="space-y-3">
                      {metrics.statusDistribution?.length > 0 ? metrics.statusDistribution.map(item => (
                        <div key={item.status} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold px-1">
                            <span className="capitalize">{item.status.toLowerCase().replace('_', ' ')}</span>
                            <span>{item.count} tasks</span>
                          </div>
                          <div className="h-2.5 bg-muted rounded-full overflow-hidden border border-border/20">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(item.count / metrics.totalTasks) * 100}%` }}
                              className={clsx(
                                "h-full rounded-full transition-all duration-500",
                                item.status === 'APPROVED' || item.status === 'DONE' ? "bg-green-500" :
                                item.status === 'TODO' || item.status === 'PENDING' ? "bg-primary/60" :
                                "bg-amber-500"
                              )}
                            />
                          </div>
                        </div>
                      )) : (
                        <p className="text-xs text-muted-foreground italic">No task data available.</p>
                      )}
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/10 space-y-2">
                    <h3 className="text-sm font-extrabold text-primary flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      STRATEGIC INSIGHT
                    </h3>
                    <p className="text-sm text-foreground/80 leading-relaxed italic font-medium">
                      {metrics.completionRate > 80 
                        ? "Currently operating at peak efficiency. High bandwidth for strategic planning or mentoring junior members."
                        : metrics.overdueTasks > 0
                        ? "Task accumulation detected in overdues. Consider redistributing high-priority blockers to maintain flow."
                        : "Stable productivity levels. Focus on optimizing average resolution time to further enhance team velocity."}
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                     <Calendar className="h-4 w-4" />
                     Completion Rate Trend (Last 7 Days)
                  </h3>
                  
                  {completionHistory.length > 0 ? (
                    <div className="flex items-end justify-between h-48 gap-3 pt-4 border-b border-border/40 italic">
                      {completionHistory.map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                          <div className="relative w-full flex-1 flex flex-col justify-end">
                             <motion.div 
                               initial={{ height: 0 }}
                               animate={{ height: `${Number(h.value)}%` }}
                               className="w-full bg-primary/20 group-hover:bg-primary/40 rounded-t-lg transition-colors border-x border-t border-primary/20"
                             />
                             <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-black">
                               {Number(h.value).toFixed(0)}%
                             </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-black whitespace-nowrap">
                            {new Date(h.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border rounded-2xl bg-muted/5">
                      <BarChart2 className="h-8 w-8 mb-2 opacity-20" />
                      <p className="text-xs font-medium">Insufficient historical data for trend analysis.</p>
                      <p className="text-[10px] opacity-60">Snapshots are generated daily at midnight.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-border/40 bg-muted/20 flex justify-end">
              <button 
                onClick={onClose}
                className="px-8 py-3 rounded-2xl bg-foreground text-background font-black text-sm hover:opacity-90 transition-all active:scale-95"
              >
                CLOSE VIEW
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function QuickStat({ label, value, icon: Icon, desc }: { label: string, value: string, icon: any, desc: string }) {
  return (
    <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm space-y-1 group hover:border-primary/30 transition-colors">
       <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
             <Icon className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
       </div>
       <div className="text-2xl font-black text-foreground">{value}</div>
       <div className="text-[10px] text-muted-foreground font-medium italic">{desc}</div>
    </div>
  );
}
