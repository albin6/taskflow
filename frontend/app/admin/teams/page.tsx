'use client';

import { useEffect, useState } from 'react';
import api from '../../../lib/axios';
import { Plus, Users } from 'lucide-react';

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await api.get('/teams');
      setTeams(res.data);
    } catch (err) {
      console.error('Failed to fetch teams', err);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    setLoading(true);
    setError('');

    try {
      await api.post('/teams', { name: newTeamName });
      setNewTeamName('');
      fetchTeams(); // Reload
    } catch (err: any) {
      console.error('Create Team Error Details:', err.response?.data || err);
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create team.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Global Teams</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and provision organizations containers</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Create New Team</h2>
        {error && <div className="mb-3 text-red-500 text-sm">{error}</div>}
        <form onSubmit={handleCreateTeam} className="flex gap-2">
          <input
            type="text"
            placeholder="Team Name (e.g., Engineering)"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-sm flex items-center gap-1.5 transition-shadow disabled:opacity-70"
          >
            <Plus className="h-4 w-4" />
            {loading ? 'Creating...' : 'Create'}
          </button>
        </form>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Teams List</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teams.map((team) => (
                <tr key={team.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-2 font-medium text-foreground">
                    <Users className="h-4 w-4 text-primary" />
                    {team.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{team.id.substring(0, 8)}...</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(team.id ? Date.now() : Date.now()).toLocaleDateString()}</td>
                </tr>
              ))}
              {teams.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground text-sm">
                    No teams found. create one above.
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
