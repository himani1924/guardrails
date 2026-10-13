'use client';

import { useEffect } from 'react';

import { AppShell } from '@/components/app-shell';
import { IconAlert } from '@/components/icons';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppShell>
      <div className="mx-auto mt-10 max-w-lg rounded-xl border border-rose-500/30 bg-surface p-8 text-center shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-600">
          <IconAlert width={22} height={22} />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-ink">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink-muted">
          The page could not be loaded. Check that Postgres is running and the database is migrated, then try again.
        </p>
        {error.digest ? <p className="mt-2 text-xs text-ink-subtle">Reference: {error.digest}</p> : null}
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" onClick={reset} className="btn btn-primary">
            Try again
          </button>
          <a href="/" className="btn btn-secondary">
            Go to dashboard
          </a>
        </div>
      </div>
    </AppShell>
  );
}
