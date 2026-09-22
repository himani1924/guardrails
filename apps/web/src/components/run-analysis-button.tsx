'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
        className="rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
      >
        {busy ? 'Analyzing…' : 'Run analysis'}
      </button>
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </div>
  );
}
