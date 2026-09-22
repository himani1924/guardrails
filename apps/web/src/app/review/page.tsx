import Link from 'next/link';

import { humanReview } from '@guardrail/core';

import { AppShell } from '@/components/app-shell';
import { Card, SectionHeading, StatusBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function ReviewQueuePage() {
  const list = await humanReview.listReviews();
  return (
    <AppShell>
      <SectionHeading
        eyebrow="Human review"
        title="Review queue"
        description={`${list.length} review${list.length === 1 ? '' : 's'} in the queue.`}
      />
      {list.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-300">
            Nothing waiting for review. Open a campaign and start an analysis to escalate one.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/review/${r.id}`}
                    className="font-medium text-slate-50 hover:text-sky-300"
                  >
                    {r.campaignName}
                  </Link>
                  <p className="mt-1 text-xs text-slate-400">
                    Opened {new Date(r.createdAt).toLocaleString()} · reviewer{' '}
                    {r.reviewerName ?? r.reviewerId}
                  </p>
                </div>
                <StatusBadge
                  level={
                    r.status === 'pending'
                      ? 'high'
                      : r.status === 'approved'
                        ? 'low'
                        : r.status === 'rejected'
                          ? 'critical'
                          : 'medium'
                  }
                  label={r.status}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
