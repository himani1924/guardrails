import type { ReactNode } from 'react';
import Link from 'next/link';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-surface-border bg-surface-soft">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
          <Link href="/" className="text-lg font-semibold text-slate-50">
            Guardrail
          </Link>
          <nav className="flex items-center gap-4 text-sm text-slate-300">
            <Link href="/campaigns" className="hover:text-slate-50">
              Campaigns
            </Link>
            <Link href="/review" className="hover:text-slate-50">
              Review queue
            </Link>
            <Link href="/knowledge" className="hover:text-slate-50">
              Policies
            </Link>
            <Link href="/admin" className="hover:text-slate-50">
              Admin
            </Link>
          </nav>
          <div className="ml-auto text-xs uppercase tracking-widest text-slate-500">
            MVP · decision support only
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
