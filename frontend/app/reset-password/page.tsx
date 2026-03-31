'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import api from '../../lib/axios';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Invalid or missing reset token.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: password,
      });
      setStatus('success');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'success') {
    return (
      <div className="text-center">
        <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mx-auto mb-6">
          <CheckCircle2 size={32} />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Password reset successfully</h1>
        <p className="text-muted-foreground mb-8">
          Your password has been securely updated. You can now log in with your new password.
        </p>
        <Link 
          href="/login" 
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition-all shadow-lg shadow-primary/25"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">Set New Password</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a strong password for your account.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex items-start gap-2">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {status === 'error' && !token ? (
        <Link 
          href="/forgot-password" 
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg border border-border hover:bg-muted font-semibold transition-all"
        >
          <ArrowLeft size={16} />
          Request New Link
        </Link>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">New Password</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Confirm New Password</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/25 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Reset Password'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card p-8 rounded-2xl border border-border shadow-xl">
        <Suspense fallback={<div className="text-center py-12 text-muted-foreground">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
