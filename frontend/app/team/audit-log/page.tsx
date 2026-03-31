'use client';

import { useEffect, useState } from 'react';
import api from '../../../lib/axios';

export default function TeamAuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit-logs'); // Backend automatically scopes by actor bounds
      setLogs(res.data.data);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Team Audit Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">Immutable history of team mutation streams</p>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actor</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors text-sm">
                  <td className="px-6 py-4 text-muted-foreground">{new Date(log.timestamp || log.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-4 font-medium text-foreground">{log.actor?.name || 'System'}</td>
                  <td className="px-6 py-4">
                     <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">
                        {log.actionType}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground truncate max-w-xs">{log.targetEntity}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    {loading ? 'Loading traces...' : 'No audit logs found for your team.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
