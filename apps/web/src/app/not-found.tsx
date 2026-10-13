import Link from 'next/link';

import { AppShell } from '@/components/app-shell';

export default function NotFound() {
  return (
    <AppShell>
      <div className="mx-auto mt-10 max-w-lg rounded-xl border border-line bg-surface p-8 text-center shadow-card">
        <p className="text-4xl font-semibold text-slate-600">404</p>
        <h1 className="mt-2 text-lg font-semibold text-ink">Not found</h1>
        <p className="mt-2 text-sm text-ink-muted">The campaign, run or review you are looking for does not exist.</p>
        <Link href="/" className="btn btn-primary mt-6">
          Go to dashboard
        </Link>
      </div>
    </AppShell>
  );
}
