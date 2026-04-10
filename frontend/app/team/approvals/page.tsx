'use client';

import { useEffect, useState } from 'react';
import api from '../../../lib/axios';
import { useAuthStore } from '../../../store/useAuthStore';
import { Check, X } from 'lucide-react';

export default function TeamApprovalsPage() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.level === 0;

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/approvals'); // Backend automatically scopes by actor bounds
      setRequests(res.data);
    } catch (err) {
      console.error('Failed to fetch approvals', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      await api.post(`/approvals/${id}/${action}`);
      fetchApprovals(); // Reload
    } catch (err) {
      console.error(`Failed to ${action} request`, err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Pending Approvals</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin ? 'Review registration requests from across all teams' : 'Review registration requests from your team members'}
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Requests</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Requester</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                {isAdmin && <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team</th>}
                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Requested Role</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">{request.requester?.name}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{request.requester?.email}</td>
                  {isAdmin && <td className="px-6 py-4 text-sm text-foreground">{request.requester?.team?.name || 'Global'}</td>}
                  <td className="px-6 py-4 text-sm text-foreground">{request.requestedRole?.name || 'N/A'}</td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    <button
                      onClick={() => handleAction(request.id, 'approve')}
                      className="p-1 px-2.5 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium text-xs flex items-center gap-1 transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(request.id, 'reject')}
                      className="p-1 px-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium text-xs flex items-center gap-1 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="px-6 py-8 text-center text-muted-foreground text-sm">
                    {loading ? 'Loading requests...' : 'No pending approvals found.'}
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
