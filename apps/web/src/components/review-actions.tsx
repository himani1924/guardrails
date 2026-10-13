'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Spinner } from './spinner';
import { Alert, Card } from './ui';

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
      <h3 className="text-base font-semibold text-ink">Reviewer decision</h3>
      <p className="mt-1 text-sm text-ink-muted">
        Record your decision. It updates the campaign status and is written to the audit log.
      </p>
      <label className="mt-5 block">
        <span className="field-label">Decision summary</span>
        <input
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          className="input"
          placeholder="e.g. Approve with disclaimer added."
        />
      </label>
      <label className="mt-4 block">
        <span className="field-label">Comments</span>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={4}
          className="input"
          placeholder="Context for the marketer and the audit trail…"
        />
      </label>
      {error ? (
        <div className="mt-4">
          <Alert tone="error" title="Could not save decision">
            {error}
          </Alert>
        </div>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5">
        <button
          onClick={() => resolve('approved')}
          disabled={busy}
          type="button"
          className="btn btn-success"
        >
          Approve
        </button>
        <button
          onClick={() => resolve('changes_requested')}
          disabled={busy}
          type="button"
          className="btn btn-warning"
        >
          Request changes
        </button>
        <button
          onClick={() => resolve('rejected')}
          disabled={busy}
          type="button"
          className="btn btn-danger"
        >
          Reject
        </button>
        {busy ? (
          <span className="ml-2 flex items-center gap-2 text-sm text-ink-subtle">
            <Spinner /> Saving…
          </span>
        ) : null}
      </div>
    </Card>
  );
}
