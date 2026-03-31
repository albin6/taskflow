'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../../lib/axios';
import { Plus, Shield, Trash2, Pencil, X, Loader2 } from 'lucide-react';
import ConfirmationModal from '../../../components/ui/confirmation-modal';
import BadgeList from '../../../components/ui/badge-list';
import InputError from '../../../components/ui/input-error';

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

const roleSchema = z.object({
  name: z.string().min(2, 'Role name is required'),
  permissions: z.array(z.string()),
});

type RoleFormValues = z.infer<typeof roleSchema>;

export default function AdminRolesPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);

  // Confirmation Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      permissions: [],
    },
  });

  const currentPermissions = watch('permissions');

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
        setSelectedTeamId(res.data[0].id);
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
    const updated = currentPermissions.includes(permId)
      ? currentPermissions.filter(p => p !== permId)
      : [...currentPermissions, permId];
    setValue('permissions', updated);
  };

  const openCreateModal = () => {
    setEditingRole(null);
    setServerError('');
    reset({ name: '', permissions: [] });
    setIsModalOpen(true);
  };

  const openEditModal = (role: any) => {
    setEditingRole(role);
    setServerError('');
    reset({
      name: role.name,
      permissions: role.permissions || [],
    });
    setIsModalOpen(true);
  };

  const onSubmit: SubmitHandler<RoleFormValues> = async (data) => {
    if (!selectedTeamId) return;

    setSubmitting(true);
    setServerError('');

    try {
      if (editingRole) {
        await api.patch(`/roles/${editingRole.id}`, data);
      } else {
        await api.post('/roles', {
          ...data,
          teamId: selectedTeamId
        });
      }
      setIsModalOpen(false);
      fetchRoles(selectedTeamId);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setServerError(`A role with the name "${data.name}" already exists for this team.`);
      } else {
        setServerError(err.response?.data?.message || `Failed to ${editingRole ? 'update' : 'create'} role.`);
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
      fetchRoles(selectedTeamId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete role.');
    }
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70">Team Roles</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium italic">Manage custom hierarchy levels and accessible action permissions</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={selectedTeamId} 
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="px-4 py-2 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
          >
            <option value="">Select a Team</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
          <button 
            onClick={openCreateModal}
            disabled={!selectedTeamId}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 active:scale-95"
          >
            <Plus className="h-4 w-4 stroke-[3px]" />
            Add Role
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground animate-pulse font-medium italic">Synchronizing roles...</div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Role Name</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Hierarchy</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Permissions</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4 flex items-center gap-3 font-semibold text-foreground">
                    <div className="p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    {role.name}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <span className="px-2 py-1 bg-muted rounded-lg text-muted-foreground">Level {role.level}</span>
                  </td>
                  <td className="px-6 py-4">
                     <BadgeList items={role.permissions} limit={3} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => openEditModal(role)}
                        className="text-primary hover:text-primary/80 p-2 rounded-xl hover:bg-primary/10 transition-colors"
                        title="Edit Role"
                      >
                        <Pencil className="h-4.5 w-4.5" />
                      </button>
                      {role.level > 2 && (
                        <button 
                          onClick={() => confirmDeleteRole(role.id)}
                          className="text-red-500 hover:text-red-600 p-2 rounded-xl hover:bg-red-500/10 transition-colors"
                          title="Delete Role"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {roles.length === 0 && selectedTeamId && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-sm italic font-medium">
                    No custom roles found for this team segment.
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
          <div className="bg-card w-full max-w-lg p-6 rounded-2xl border border-border shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                {editingRole ? 'Edit Custom Role' : 'Establish New Role'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            
            {serverError && <div className="mb-4 p-3 text-sm font-medium text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl">{serverError}</div>}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-widest">Role Name</label>
                <input 
                  {...register('name')}
                  type="text" 
                  className={`w-full px-4 py-2.5 rounded-xl border bg-background text-sm transition-all font-medium ${
                    errors.name ? 'border-red-500 ring-2 ring-red-500/10' : 'border-border focus:ring-2 focus:ring-primary/20'
                  }`}
                  placeholder="e.g., Lead Architect, QA Engineer"
                />
                <InputError message={errors.name?.message} />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-3 uppercase tracking-widest">Permission Scope</label>
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-3 border border-border/60 rounded-xl bg-muted/5 custom-scrollbar">
                  {ALL_PERMISSIONS.map(p => (
                    <label key={p.id} className={`flex items-center gap-3 text-xs cursor-pointer p-2 rounded-lg transition-colors ${currentPermissions.includes(p.id) ? 'bg-primary/5 text-primary' : 'hover:bg-muted font-medium'}`}>
                      <input 
                        type="checkbox" 
                        checked={currentPermissions.includes(p.id)}
                        onChange={() => handlePermissionChange(p.id)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                      />
                      <span className="font-bold tracking-tight">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border/40">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-6 py-2.5 rounded-xl border border-border hover:bg-muted font-bold text-sm transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {submitting ? 'Processing...' : editingRole ? 'Update Role' : 'Create Role'}
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
