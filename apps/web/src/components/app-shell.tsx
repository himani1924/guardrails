import type { ReactNode } from 'react';
import Link from 'next/link';

import { IconShield } from './icons';
import { SidebarNav } from './sidebar-nav';

function Brand({ dark }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
        <IconShield width={18} height={18} />
      </span>
      <span className={`text-base font-semibold tracking-tight ${dark ? 'text-white' : 'text-ink'}`}>
        Guardrail
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-[#070a11] px-4 py-5 lg:flex">
        <div className="px-2">
          <Brand dark />
          <p className="mt-1 pl-[2.6rem] text-xs text-slate-400">Campaign assurance</p>
        </div>
        <div className="mt-8">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>
          <SidebarNav variant="sidebar" />
        </div>
        <div className="mt-auto rounded-lg border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-slate-300">
          <p className="font-semibold text-white">Decision support only</p>
          <p className="mt-1 text-slate-400">
            Findings are advisory. A human reviewer makes the final call.
          </p>
        </div>
      </aside>

      {/* Mobile / tablet top bar */}
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Brand />
          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300">
            MVP · advisory
          </span>
        </div>
        <SidebarNav variant="top" />
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}
