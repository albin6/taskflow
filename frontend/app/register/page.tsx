'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../lib/axios';
import InputError from '../../components/ui/input-error';

const registerSchema = z.object({
  name: z.string().min(3, 'Full name must be at least 3 characters'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  teamId: z.string().min(1, 'Please select a team'),
  roleId: z.string().min(1, 'Please select a role'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  });

  const selectedTeamId = watch('teamId');

  useEffect(() => {
    api.get('/auth/teams')
       .then(res => setTeams(res.data))
       .catch(err => console.error('Failed to load teams', err));
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
       api.get(`/auth/roles/${selectedTeamId}`)
          .then(res => {
            setRoles(res.data);
            // Reset role if it's not valid for the new team
            setValue('roleId', '');
          })
          .catch(err => console.error('Failed to load roles', err));
    } else {
       setRoles([]);
    }
  }, [selectedTeamId, setValue]);

  const onSubmit = async (data: RegisterFormValues) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = {
         ...data,
         phone: data.phone || undefined,
      };

      const res = await api.post('/auth/register', payload);
      setSuccess(res.data?.message || 'Registration request submitted. Awaiting approval.');
      
      setTimeout(() => {
          router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit registration. verify fields.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card p-8 rounded-2xl border border-border shadow-xl">
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg shadow-primary/20">
            T
          </div>
          <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
          <p className="text-sm text-muted-foreground mt-1">Register for hierarchy approval</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-600 text-sm font-medium">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Full Name</label>
            <input
              {...register('name')}
              type="text"
              className={`w-full px-3.5 py-2 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm ${
                errors.name ? 'border-red-500 ring-1 ring-red-500/20' : 'border-border'
              }`}
              placeholder="John Doe"
            />
            <InputError message={errors.name?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              className={`w-full px-3.5 py-2 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm ${
                errors.email ? 'border-red-500 ring-1 ring-red-500/20' : 'border-border'
              }`}
              placeholder="you@example.com"
            />
            <InputError message={errors.email?.message} />
          </div>
 
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Password</label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className={`w-full px-3.5 py-2 pr-10 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm ${
                  errors.password ? 'border-red-500 ring-1 ring-red-500/20' : 'border-border'
                }`}
                placeholder="Min 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <InputError message={errors.password?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Join Team</label>
            <select
              {...register('teamId')}
              className={`w-full px-3.5 py-2 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm ${
                errors.teamId ? 'border-red-500 ring-1 ring-red-500/20' : 'border-border'
              }`}
            >
              <option value="">Select Team...</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <InputError message={errors.teamId?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Desired Role</label>
            <select
              {...register('roleId')}
              disabled={!selectedTeamId}
              className={`w-full px-3.5 py-2 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm disabled:opacity-50 ${
                errors.roleId ? 'border-red-500 ring-1 ring-red-500/20' : 'border-border'
              }`}
            >
              <option value="">Select Role...</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <InputError message={errors.roleId?.message} />
          </div>

          <button
            type="submit"
            disabled={loading || success.length > 0}
            className="w-full mt-2 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/25 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed text-sm"
          >
            {loading ? 'Submitting...' : 'Register'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
