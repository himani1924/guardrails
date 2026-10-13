'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { IconInbox } from './icons';
import { Spinner } from './spinner';

export function SendToReviewButton({
  campaignId,
  analysisRunId,
}: {
  campaignId: string;
  analysisRunId?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          ...(analysisRunId ? { analysisRunId } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? 'Failed to open review');
      const reviewId = body.reviewId as string;
      router.push(`/review/${reviewId}`);
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
        onClick={send}
        disabled={busy}
        className="btn btn-warning"
      >
        {busy ? <Spinner /> : <IconInbox width={16} height={16} />}
        {busy ? 'Sending…' : 'Send to review'}
      </button>
      {error ? <span role="alert" className="max-w-xs text-right text-xs text-rose-600">{error}</span> : null}
    </div>
  );
}
