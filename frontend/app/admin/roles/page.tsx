'use client';

import { useEffect, useState } from 'react';
import api from '../../../lib/axios';
import { Plus, Shield, Trash2 } from 'lucide-react';

const ALL_PERMISSIONS = [
  { id: 'MANAGE_ROLES', label: 'Manage Roles' },
  { id: 'REORDER_ROLES', label: 'Reorder Roles' },
  { id: 'MANAGE_USERS', label: 'Manage Users' },
  { id: 'APPROVE_REGISTRATIONS', label: 'Approve Registrations' },
  { id: 'VIEW_TEAM_AUDIT', label: 'View Team Audit Log' },
  { id: 'CREATE_TASK', label: 'Create Tasks' },
  { id: 'EDIT_TASK', label: 'Edit Tasks' },
  { id: 'DELETE_TASK', label: 'Delete Tasks' },
  { id: 'ASSIGN_TASK', label: 'Assign Tasks' },
];

export default function AdminRolesPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Role Form State
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      fetchRoles(selectedTeamId);
    } else {
      setRoles([]);
    }
  }, [selectedTeamId]);

  const fetchTeams = async () => {
    try {
      const res = await api.get('/teams');
      setTeams(res.data);
      if (res.data.length > 0) {
        setSelectedTeamId(res.data[0].id); // Default to first team
      }
    } catch (err) {
      console.error('Failed to fetch teams', err);
    }
  };

  const fetchRoles = async (teamId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/roles?teamId=${teamId}`);
      setRoles(res.data);
    } catch (err) {
      console.error('Failed to fetch roles', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (permId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim() || !selectedTeamId) return;

    setSubmitting(true);
    setError('');

    try {
      await api.post('/roles', {
        name: roleName,
        permissions: selectedPermissions,
        teamId: selectedTeamId
      });
      setRoleName('');
      setSelectedPermissions([]);
      setIsModalOpen(false);
      fetchRoles(selectedTeamId); // Reload
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create role.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      await api.delete(`/roles/${roleId}`);
      fetchRoles(selectedTeamId); // Reload
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete role.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Team Roles</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage custom hierarchy levels and accessible actions buckets</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={selectedTeamId} 
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Select a Team</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
          <button 
            onClick={() => setIsModalOpen(true)}
            disabled={!selectedTeamId}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-sm flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Role
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading roles...</div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hierarchy Level</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Permissions</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-2 font-medium text-foreground">
                    <Shield className="h-4 w-4 text-primary" />
                    {role.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{role.level}</td>
                  <td className="px-6 py-4">
                     <div className="flex flex-wrap gap-1">
                        {role.permissions.slice(0, 3).map((p: string) => (
                          <span key={p} className="text-xxs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            {p.replace('_', ' ')}
                          </span>
                        ))}
                        {role.permissions.length > 3 && (
                          <span className="text-xxs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            +{role.permissions.length - 3} more
                          </span>
                        )}
                     </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {role.level > 2 && ( // Anchor roles Admin(0), Head(1), Lead(2) cannot be deleted
                      <button 
                        onClick={() => handleDeleteRole(role.id)}
                        className="text-red-500 hover:text-red-600 p-1 rounded-md hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {roles.length === 0 && selectedTeamId && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-sm">
                    No custom roles found for this team.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card w-full max-w-lg p-6 rounded-2xl border border-border shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-foreground">Create New Role</h2>
            {error && <div className="p-2 text-xs text-red-500 bg-red-500/10 rounded-md">{error}</div>}
            
            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Role Name</label>
                <input 
                  type="text" 
                  required 
                  value={roleName} 
                  onChange={(e) => setRoleName(e.target.value)} 
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  placeholder="e.g., Designer, QA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Permissions</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-border/60 rounded-lg">
                  {ALL_PERMISSIONS.map(p => (
                    <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted p-1 rounded">
                      <input 
                        type="checkbox" 
                        checked={selectedPermissions.includes(p.id)}
                        onChange={() => handlePermissionChange(p.id)}
                        className="rounded border-border text-primary focus:ring-primary/50"
                      />
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-border">
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
                  {submitting ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
