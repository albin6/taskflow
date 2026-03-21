'use client';

export default function TeamRolesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Team Roles</h1>
        <p className="text-sm text-muted-foreground mt-1">Local hierarchies and permission cascades</p>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm p-8 text-center text-muted-foreground">
         <p>Team Roles & Permission overrides are managed via Admin endpoints.</p>
         <p className="text-xs mt-1">Default sets: Team Head (Lvl 1), Team Lead (Lvl 2), Member (Lvl 10).</p>
      </div>
    </div>
  );
}
