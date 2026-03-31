'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../../lib/axios';
import { Plus, Users, Loader2 } from 'lucide-react';
import InputError from '../../../components/ui/input-error';

const teamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').max(50, 'Team name too long'),
});

type TeamFormValues = z.infer<typeof teamSchema>;

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    setLoadingTasks(true);
    try {
      const res = await api.get('/teams');
      setTeams(res.data);
    } catch (err) {
      console.error('Failed to fetch teams', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const onSubmit = async (data: TeamFormValues) => {
    setSubmitting(true);
    setServerError('');

    try {
      await api.post('/teams', data);
      reset();
      fetchTeams();
    } catch (err: any) {
      if (err.status === 409) {
        setServerError(`A team with the name "${data.name}" already exists.`);
      } else {
        setServerError(err.message || 'Failed to create team.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70">Global Teams</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium italic">Manage and provision organizational containers</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm backdrop-blur-sm">
        <h2 className="text-lg font-bold mb-4 text-foreground flex items-center gap-2">
           <Plus className="h-5 w-5 text-primary" />
           Create New Team
        </h2>
        
        {serverError && <div className="mb-4 p-3 text-sm font-medium text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl animate-in fade-in slide-in-from-top-2">{serverError}</div>}
        
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              {...register('name')}
              type="text"
              placeholder="Team Name (e.g., Engineering)"
              className={`w-full px-4 py-2.5 rounded-xl border bg-background text-foreground text-sm transition-all ${
                errors.name ? 'border-red-500 ring-2 ring-red-500/10' : 'border-border focus:ring-2 focus:ring-primary/20'
              }`}
            />
            <InputError message={errors.name?.message} />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 h-[42px] rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-70"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Plus className="h-4 w-4 stroke-[3px]" />}
            {submitting ? 'Creating...' : 'Create Team'}
          </button>
        </form>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border/40 bg-muted/20">
          <h2 className="text-lg font-bold text-foreground">Teams List</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Name</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking_widest">ID Reference</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {loadingTasks && teams.length === 0 ? (
                <tr>
                   <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground animate-pulse font-medium italic">Synchronizing teams...</td>
                </tr>
              ) : teams.map((team) => (
                <tr key={team.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4 flex items-center gap-3 font-semibold text-foreground">
                    <div className="p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    {team.name}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-muted-foreground tracking-tighter">{team.id}</td>
                  <td className="px-6 py-4 text-sm">
                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-green-500/10 text-green-600 border border-green-500/20 uppercase tracking-widest">
                        Active
                     </span>
                  </td>
                </tr>
              ))}
              {!loadingTasks && teams.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground text-sm italic">
                    No teams established. Create your first organizational unit above.
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
