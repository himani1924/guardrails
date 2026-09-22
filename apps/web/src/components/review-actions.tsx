'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Card } from './ui';

type ReviewStatus = 'approved' | 'rejected' | 'changes_requested';

export function ReviewActions({ reviewId, campaignId }: { reviewId: string; campaignId: string }) {
  const router = useRouter();
  const [decision, setDecision] = useState('');
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve(status: ReviewStatus) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, decision, comments }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? 'Failed');
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          humanReviewId: reviewId,
          action: 'comment',
          comments: `[final review outcome: ${status}] ${comments}`,
        }),
      });
      router.push('/review');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h3 className="text-sm uppercase tracking-widest text-slate-400">Resolve</h3>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block text-slate-300">Decision summary</span>
        <input
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          className="w-full rounded border border-surface-border bg-black/30 px-3 py-2 text-sm text-slate-100"
          placeholder="e.g. Approve with disclaimer added."
        />
      </label>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block text-slate-300">Comments</span>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={3}
          className="w-full rounded border border-surface-border bg-black/30 px-3 py-2 text-sm text-slate-100"
        />
      </label>
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => resolve('approved')}
          disabled={busy}
          className="rounded bg-emerald-700 px-3 py-1.5 text-sm text-white hover:bg-emerald-600 disabled:opacity-60"
        >
          Approve
        </button>
        <button
          onClick={() => resolve('changes_requested')}
          disabled={busy}
          className="rounded bg-amber-700 px-3 py-1.5 text-sm text-white hover:bg-amber-600 disabled:opacity-60"
        >
          Request changes
        </button>
        <button
          onClick={() => resolve('rejected')}
          disabled={busy}
          className="rounded bg-red-700 px-3 py-1.5 text-sm text-white hover:bg-red-600 disabled:opacity-60"
        >
          Reject
        </button>
      </div>
    </Card>
  );
}
