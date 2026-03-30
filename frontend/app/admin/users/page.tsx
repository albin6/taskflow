'use client';

import { useEffect, useState } from 'react';
import api from '../../../lib/axios';
import { Plus, UserPlus, Eye, EyeOff } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New User Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      fetchRoles(selectedTeamId);
    } else {
      setRoles([]);
    }
  }, [selectedTeamId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await api.get('/teams');
      setTeams(res.data);
    } catch (err) {
      console.error('Failed to fetch teams', err);
    }
  };

  const fetchRoles = async (teamId: string) => {
    try {
      const res = await api.get(`/roles?teamId=${teamId}`);
      setRoles(res.data);
    } catch (err) {
      console.error('Failed to fetch roles', err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim() || !selectedTeamId || !selectedRoleId) return;

    setSubmitting(true);
    setError('');

    try {
      await api.post('/users', {
        name,
        email,
        password,
        phone,
        teamId: selectedTeamId,
        roleId: selectedRoleId,
      });
      
      // Reset
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setSelectedTeamId('');
      setSelectedRoleId('');
      setIsModalOpen(false);
      fetchUsers(); // Reload lists
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Global Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all accounts and their workspace bindings</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-sm flex items-center gap-1.5 shadow-sm transition-shadow"
        >
          <UserPlus className="h-4 w-4" />
          Add User
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Users List</h2>
        </div>
        <div className="overflow-x-auto">
          {loading && users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Loading accounts...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team</th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{user.name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{user.team?.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{user.role?.name || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.status === 'ACTIVE' ? 'bg-green-500/10 text-green-600' : 
                        user.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-red-500/10 text-red-600'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-sm">
                      No users found. Create one to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border border-border shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-foreground">Create User (Bypasses Approval)</h2>
            {error && <div className="p-2 text-xs text-red-500 bg-red-500/10 rounded-md">{error}</div>}
            
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Full Name</label>
                <input 
                  type="text" required value={name} onChange={(e) => setName(e.target.value)} 
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Email</label>
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)} 
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required value={password} onChange={(e) => setPassword(e.target.value)} 
                    className="w-full px-3 py-2 pr-10 rounded-lg border border-border bg-background text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Phone (Optional)</label>
                <input 
                  type="text" value={phone} onChange={(e) => setPhone(e.target.value)} 
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  placeholder="+123456789"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Team</label>
                  <select 
                    required 
                    value={selectedTeamId} 
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  >
                    <option value="">Select Team</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Role</label>
                  <select 
                    required 
                    value={selectedRoleId} 
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    disabled={!selectedTeamId}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm disabled:opacity-50"
                  >
                    <option value="">Select Role</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-border mt-1">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); setError(''); }} 
                  className="px-4 py-2 rounded-lg border border-border hover:bg-muted font-medium text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-sm disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
