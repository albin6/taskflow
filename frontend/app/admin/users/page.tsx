'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../../lib/axios';
import { Plus, UserPlus, Eye, EyeOff, X, Loader2 } from 'lucide-react';
import InputError from '../../../components/ui/input-error';

const userSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  teamId: z.string().min(1, 'Team is required'),
  roleId: z.string().min(1, 'Role is required'),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
      teamId: '',
      roleId: '',
    },
  });

  const selectedTeamId = watch('teamId');

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

  const onSubmit = async (data: UserFormValues) => {
    setSubmitting(true);
    setServerError('');

    try {
      await api.post('/users', data);
      setIsModalOpen(false);
      reset();
      fetchUsers();
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = () => {
    reset();
    setServerError('');
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Global Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all accounts and their workspace bindings</p>
        </div>
        <button 
          onClick={openModal}
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
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Create User (Bypasses Approval)</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            
            {serverError && <div className="p-2.5 text-xs font-medium text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">{serverError}</div>}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Full Name</label>
                <input 
                  {...register('name')}
                  type="text" 
                  className={`w-full px-3.5 py-2 rounded-lg border bg-background text-sm transition-all ${
                    errors.name ? 'border-red-500 ring-2 ring-red-500/10' : 'border-border focus:ring-2 focus:ring-primary/20'
                  }`}
                  placeholder="John Doe"
                />
                <InputError message={errors.name?.message} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Email</label>
                <input 
                  {...register('email')}
                  type="email" 
                  className={`w-full px-3.5 py-2 rounded-lg border bg-background text-sm transition-all ${
                    errors.email ? 'border-red-500 ring-2 ring-red-500/10' : 'border-border focus:ring-2 focus:ring-primary/20'
                  }`}
                  placeholder="john@example.com"
                />
                <InputError message={errors.email?.message} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input 
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'} 
                    className={`w-full px-3.5 py-2 pr-10 rounded-lg border bg-background text-sm transition-all ${
                      errors.password ? 'border-red-500 ring-2 ring-red-500/10' : 'border-border focus:ring-2 focus:ring-primary/20'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <InputError message={errors.password?.message} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Phone (Optional)</label>
                <input 
                  {...register('phone')}
                  type="text" 
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="+123456789"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Team</label>
                  <select 
                    {...register('teamId')}
                    className={`w-full px-3.5 py-2 rounded-lg border bg-background text-sm transition-all ${
                      errors.teamId ? 'border-red-500 ring-2 ring-red-500/10' : 'border-border focus:ring-2 focus:ring-primary/20'
                    }`}
                  >
                    <option value="">Select Team</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <InputError message={errors.teamId?.message} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Role</label>
                  <select 
                    {...register('roleId')}
                    disabled={!selectedTeamId}
                    className={`w-full px-3.5 py-2 rounded-lg border bg-background text-sm transition-all disabled:opacity-50 ${
                      errors.roleId ? 'border-red-500 ring-2 ring-red-500/10' : 'border-border focus:ring-2 focus:ring-primary/20'
                    }`}
                  >
                    <option value="">Select Role</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <InputError message={errors.roleId?.message} />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-border mt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-5 py-2 rounded-lg border border-border hover:bg-muted font-bold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
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
