'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../../lib/axios';
import { UserPlus, ShieldAlert, Eye, EyeOff, X, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import InputError from '../../../components/ui/input-error';

const memberSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  teamId: z.string().min(1, 'Team is required'),
  roleId: z.string().min(1, 'Role is required'),
});

type MemberFormValues = z.infer<typeof memberSchema>;

export default function TeamMembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [activeTeams, setActiveTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('all');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const { user } = useAuthStore();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
      teamId: user?.teamId || '',
      roleId: '',
    },
  });

  const memberTeamId = watch('teamId');

  useEffect(() => {
    if (user) {
      if (user.teamId) setValue('teamId', user.teamId);
      fetchMembers();
      fetchGlobalTeams();
    }
  }, [user]);

  useEffect(() => {
    if (memberTeamId) {
      fetchRoles(memberTeamId);
    } else {
      setRoles([]);
    }
  }, [memberTeamId]);

  useEffect(() => {
    // Extract unique teams from visible members for the tab bar
    const teamsInRoster = members.reduce((acc: any[], m) => {
      if (m.team && !acc.find(t => t.id === m.team.id)) {
        acc.push(m.team);
      }
      return acc;
    }, []);
    setActiveTeams(teamsInRoster);
  }, [members]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users'); 
      setMembers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch team members', err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalTeams = async () => {
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
      // Only show roles that are strictly lower level than current user
      // If user is Admin (0), show all. If Head (1), show Level 2+.
      if (Array.isArray(res.data)) {
        setRoles(res.data.filter((r: any) => r.level > (user?.level || 0)));
      } else {
        setRoles([]);
      }
    } catch (err) {
      console.error('Failed to fetch roles', err);
      setRoles([]);
    }
  };

  const onSubmit = async (data: MemberFormValues) => {
    setSubmitting(true);
    setServerError('');
 
    try {
      await api.post('/users', data);
 
      setIsModalOpen(false);
      reset();
      fetchMembers();
    } catch (err: any) {
      setServerError(err.message || 'Failed to create member.');
    } finally {
      setSubmitting(false);
    }
  };
 
  const filteredMembers = selectedTeamId === 'all' 
    ? members 
    : members.filter(m => m.team?.id === selectedTeamId);

  const openModal = () => {
    reset();
    setServerError('');
    setIsModalOpen(true);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70">Team Workspace</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium italic">Manage users and roles within your organization container</p>
        </div>
        <button 
          onClick={openModal}
          className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm flex items-center gap-2 shadow-xl shadow-primary/25 transition-all active:scale-95"
        >
          <UserPlus className="h-4 w-4 stroke-[3px]" />
          Add Member
        </button>
      </div>

      {activeTeams.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedTeamId('all')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${
              selectedTeamId === 'all' 
                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                : 'bg-card text-muted-foreground border-border hover:border-primary/50'
            }`}
          >
            All Teams
          </button>
          {activeTeams.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTeamId(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${
                selectedTeamId === t.id 
                  ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                  : 'bg-card text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border/40 bg-muted/20 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            {selectedTeamId === 'all' ? 'Active Roster' : `${activeTeams.find(t => t.id === selectedTeamId)?.name} Roster`}
          </h2>
          <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded-lg uppercase tracking-wider">
            {filteredMembers.length} Members
          </span>
        </div>
        <div className="overflow-x-auto">
          {loading && members.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground animate-pulse font-medium italic">Synchronizing roster...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Contact</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Designation</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">{member.name}</div>
                      {selectedTeamId === 'all' && member.team && (
                        <div className="text-[10px] uppercase tracking-widest font-black text-primary/60">{member.team.name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground font-medium">{member.email}</td>
                    <td className="px-6 py-4 text-sm text-foreground">
                       <span className="px-2 py-1 bg-primary/5 text-primary rounded-lg font-bold text-xs">
                          {member.role?.name || 'N/A'}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-widest ${
                        member.status === 'ACTIVE' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 
                        member.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'
                      }`}>
                        {member.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredMembers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-sm italic font-medium">
                      No members identified {selectedTeamId === 'all' ? 'in this workspace' : 'in this team container'}.
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
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border border-border shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Provision Team Member</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            
            {serverError && <div className="mb-4 p-3 text-sm font-medium text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl">{serverError}</div>}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-widest">Full Name</label>
                <input 
                  {...register('name')}
                  type="text" 
                  className={`w-full px-4 py-2.5 rounded-xl border bg-background text-sm transition-all font-medium ${
                    errors.name ? 'border-red-500 ring-2 ring-red-500/10' : 'border-border focus:ring-2 focus:ring-primary/20'
                  }`}
                  placeholder="John Doe"
                />
                <InputError message={errors.name?.message} />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-widest">Email Address</label>
                <input 
                  {...register('email')}
                  type="email" 
                  className={`w-full px-4 py-2.5 rounded-xl border bg-background text-sm transition-all font-medium ${
                    errors.email ? 'border-red-500 ring-2 ring-red-500/10' : 'border-border focus:ring-2 focus:ring-primary/20'
                  }`}
                  placeholder="john@example.com"
                />
                <InputError message={errors.email?.message} />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-widest">Access Password</label>
                <div className="relative">
                  <input 
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'} 
                    className={`w-full px-4 py-2.5 pr-10 rounded-xl border bg-background text-sm transition-all font-medium ${
                      errors.password ? 'border-red-500 ring-2 ring-red-500/10' : 'border-border focus:ring-2 focus:ring-primary/20'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <InputError message={errors.password?.message} />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-widest">Phone (Optional)</label>
                <input 
                  {...register('phone')}
                  type="text" 
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  placeholder="+123456789"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-widest">Target Team</label>
                <select 
                  {...register('teamId')}
                  disabled={!!user?.teamId}
                  className={`w-full px-4 py-2.5 rounded-xl border bg-background text-sm transition-all font-bold disabled:opacity-70 ${
                    errors.teamId ? 'border-red-500 ring-2 ring-red-500/10' : 'border-border focus:ring-2 focus:ring-primary/20'
                  }`}
                >
                  <option value="">Select Team</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <InputError message={errors.teamId?.message} />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-widest">Assigned Role</label>
                <select 
                  {...register('roleId')}
                  className={`w-full px-4 py-2.5 rounded-xl border bg-background text-sm transition-all font-bold ${
                    errors.roleId ? 'border-red-500 ring-2 ring-red-500/10' : 'border-border focus:ring-2 focus:ring-primary/20'
                  }`}
                >
                  <option value="">Select Role</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                {roles.length === 0 && (
                   <div className="mt-2 text-[10px] text-amber-600 font-bold flex items-center gap-1.5 bg-amber-500/5 p-2 rounded-lg border border-amber-500/20">
                      <ShieldAlert className="h-3.5 w-3.5" /> 
                      No lower-hierarchy roles available for assignment.
                   </div>
                )}
                <InputError message={errors.roleId?.message} />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border/40 mt-2">
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
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/20 transition-all flex items-center gap-2 active:scale-95"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? 'Provisioning...' : 'Provision Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
