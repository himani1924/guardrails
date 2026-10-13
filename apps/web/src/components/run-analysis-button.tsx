'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { IconSparkles } from './icons';
import { Spinner } from './spinner';

export function RunAnalysisButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/analyze`, {
        method: 'POST',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? 'Analysis failed');
      router.push(`/campaigns/${campaignId}/analysis/${body.analysisRunId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={run}
        disabled={busy}
        className="btn btn-primary"
      >
        {busy ? (
          <>
            <Spinner /> Analyzing…
          </>
        ) : (
          <>
            <IconSparkles width={16} height={16} /> Run analysis
          </>
        )}
      </button>
      {error ? <span role="alert" className="max-w-xs text-right text-xs text-rose-600">{error}</span> : null}
    </div>
  );
}
