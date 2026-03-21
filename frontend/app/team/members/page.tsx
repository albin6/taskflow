'use client';

import { useEffect, useState } from 'react';
import api from '../../../lib/axios';
import { UserPlus, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';

export default function TeamMembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { user } = useAuthStore();

  // Create User Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMembers();
    fetchRoles();
  }, [user?.teamId]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users'); // Scoped automatically by Backend for non-admin level 0
      setMembers(res.data);
    } catch (err) {
      console.error('Failed to fetch team members', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    if (!user?.teamId) return;
    try {
      const res = await api.get(`/roles?teamId=${user.teamId}`);
      // Filter roles: only show roles strictly below current_user level (higher number)
      setRoles(res.data.filter((r: any) => r.level > (user.level || 99)));
    } catch (err) {
      console.error('Failed to fetch roles', err);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim() || !selectedRoleId || !user?.teamId) return;

    setSubmitting(true);
    setError('');

    try {
      await api.post('/users', {
        name,
        email,
        password,
        phone,
        teamId: user.teamId,
        roleId: selectedRoleId,
      });

      // Reset
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setSelectedRoleId('');
      setIsModalOpen(false);
      fetchMembers(); // Reload list
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create member.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Team Workspace</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage users and roles within your organization container</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-sm flex items-center gap-1.5 shadow-sm transition-shadow"
        >
          <UserPlus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Roster</h2>
        </div>
        <div className="overflow-x-auto">
          {loading && members.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Loading roster...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{member.name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{member.email}</td>
                    <td className="px-6 py-4 text-sm text-foreground font-medium">{member.role?.name || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        member.status === 'ACTIVE' ? 'bg-green-500/10 text-green-600' : 
                        member.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-red-500/10 text-red-600'
                      }`}>
                        {member.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-sm">
                      No members found. Create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border border-border shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-foreground">Create Team Member</h2>
            {error && <div className="p-2 text-xs text-red-500 bg-red-500/10 rounded-md">{error}</div>}
            
            <form onSubmit={handleCreateMember} className="space-y-3">
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
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)} 
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Phone (Optional)</label>
                <input 
                  type="text" value={phone} onChange={(e) => setPhone(e.target.value)} 
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  placeholder="+123456789"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Role</label>
                <select 
                  required 
                  value={selectedRoleId} 
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                >
                  <option value="">Select Role</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                {roles.length === 0 && (
                   <p className="text-xxs text-amber-500 mt-1 flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> No lower-hierarchy roles found for your level.</p>
                )}
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
                  {submitting ? 'Creating...' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
