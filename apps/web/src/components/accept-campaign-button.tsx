'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { IconCheck } from './icons';
import { Spinner } from './spinner';

export function AcceptCampaignButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? 'Failed to accept');
      router.push(`/campaigns/${campaignId}`);
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
        type="button"
        onClick={accept}
        disabled={busy}
        className="btn btn-success"
      >
        {busy ? <Spinner /> : <IconCheck width={16} height={16} />}
        {busy ? 'Accepting…' : 'Accept campaign'}
      </button>
      {error ? <span role="alert" className="max-w-xs text-right text-xs text-rose-600">{error}</span> : null}
    </div>
  );
}
