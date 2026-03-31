'use client';

import { useEffect, useState } from 'react';
import api from '../../../lib/axios';
import { Plus, Shield, Trash2, Pencil, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import ConfirmationModal from '../../../components/ui/confirmation-modal';
import BadgeList from '../../../components/ui/badge-list';

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

export default function TeamRolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);

  // Confirmation Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);

  const { user } = useAuthStore();

  // Form State
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.teamId) {
      fetchRoles();
    }
  }, [user?.teamId]);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/roles?teamId=${user?.teamId}`);
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

  const openCreateModal = () => {
    setEditingRole(null);
    setRoleName('');
    setSelectedPermissions([]);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (role: any) => {
    setEditingRole(role);
    setRoleName(role.name);
    setSelectedPermissions(role.permissions);
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmitRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim() || !user?.teamId) return;

    setSubmitting(true);
    setError('');

    try {
      if (editingRole) {
        await api.patch(`/roles/${editingRole.id}`, {
          name: roleName,
          permissions: selectedPermissions,
        });
      } else {
        await api.post('/roles', {
          name: roleName,
          permissions: selectedPermissions,
          teamId: user.teamId
        });
      }
      setIsModalOpen(false);
      fetchRoles();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError(`A role with the name "${roleName}" already exists for your team.`);
      } else {
        setError(err.response?.data?.message || `Failed to ${editingRole ? 'update' : 'create'} role.`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteRole = (roleId: string) => {
    setRoleToDelete(roleId);
    setIsConfirmModalOpen(true);
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    try {
      await api.delete(`/roles/${roleToDelete}`);
      setIsConfirmModalOpen(false);
      setRoleToDelete(null);
      fetchRoles();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete role.');
    }
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Team Roles</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage custom hierarchy levels and accessible actions buckets for your team</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-sm flex items-center gap-1.5 shadow-sm transition-shadow"
        >
          <Plus className="h-4 w-4" />
          Add Role
        </button>
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
                     <BadgeList items={role.permissions} limit={3} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => openEditModal(role)}
                        disabled={role.level < (user?.level || 0)} // Can only edit roles at or below own level
                        className="text-primary hover:text-primary/80 p-1.5 rounded-md hover:bg-primary/10 transition-colors disabled:opacity-30"
                        title="Edit Role"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {role.level > (user?.level || 0) && role.level > 2 && ( // Can only delete custom roles strictly below own level
                        <button 
                          onClick={() => confirmDeleteRole(role.id)}
                          className="text-red-500 hover:text-red-600 p-1.5 rounded-md hover:bg-red-500/10 transition-colors"
                          title="Delete Role"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {roles.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-sm">
                    No roles found for your team.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card w-full max-w-lg p-6 rounded-2xl border border-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </h2>
              {editingRole && editingRole.level <= (user?.level || 0) && (
                <span className="text-xxs px-2 py-1 rounded bg-amber-500/10 text-amber-600 flex items-center gap-1 font-semibold">
                  <ShieldAlert className="h-3 w-3" /> RESTRICTED LEVEL
                </span>
              )}
            </div>
            {error && <div className="p-2 text-xs text-red-500 bg-red-500/10 rounded-md">{error}</div>}
            
            <form onSubmit={handleSubmitRole} className="space-y-4">
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
                  {submitting ? (editingRole ? 'Updating...' : 'Creating...') : (editingRole ? 'Update Role' : 'Create Role')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal 
        isOpen={isConfirmModalOpen}
        title="Delete Role"
        message="Are you sure you want to delete this role? This will remove all associated permissions and cannot be undone."
        onConfirm={handleDeleteRole}
        onCancel={() => setIsConfirmModalOpen(false)}
        variant="danger"
        confirmText="Delete Role"
      />
    </div>
  );
}
