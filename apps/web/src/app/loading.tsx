import { AppShell } from '@/components/app-shell';

export default function Loading() {
  return (
    <AppShell>
      <div className="animate-pulse" aria-busy="true" aria-label="Loading">
        <div className="h-3 w-24 rounded bg-slate-800" />
        <div className="mt-3 h-8 w-80 max-w-full rounded bg-slate-800" />
        <div className="mt-3 h-4 w-[32rem] max-w-full rounded bg-slate-800" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl border border-line bg-surface" />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
