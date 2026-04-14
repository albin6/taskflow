'use client';

import { Headset, Wrench, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export default function TechSupportPage() {
  const { user } = useAuthStore();
  const hasAccess = !!(user?.level === 0 || user?.permissions?.includes('TECH_SUPPORT'));

  if (!hasAccess) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center">
        <div className="max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Tech Support Access Required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This module is available to global admins by default, and to other roles only when they include the <span className="font-semibold text-foreground">Tech Support</span> permission.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tech Support</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This area is now permission-ready and reserved for upcoming support workflows.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Headset className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Support Workspace</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ticketing, issue triage, and internal support tools will be introduced here in future phases.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
            <Wrench className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Coming Soon</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The permission is active now so roles can be prepared ahead of the full Tech Support rollout.
          </p>
        </div>
      </div>
    </div>
  );
}
