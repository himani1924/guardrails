import Link from 'next/link';

import { humanReview } from '@guardrail/core';

import { AppShell } from '@/components/app-shell';
import { IconArrowRight, IconInbox } from '@/components/icons';
import { Card, EmptyState, PageHeader, StatusBadge } from '@/components/ui';
import type { Level } from '@/components/ui';

export const dynamic = 'force-dynamic';

function reviewLevel(status: string): Level {
  return status === 'pending'
    ? 'high'
    : status === 'approved'
      ? 'low'
      : status === 'rejected'
        ? 'critical'
        : 'medium';
}

export default async function ReviewQueuePage() {
  const list = await humanReview.listReviews();
  const pending = list.filter((r) => r.status === 'pending').length;
  return (
    <AppShell>
      <PageHeader
        eyebrow="Human review"
        title="Review queue"
        description={`${list.length} review${list.length === 1 ? '' : 's'} in the queue · ${pending} pending.`}
      />
      {list.length === 0 ? (
        <EmptyState icon={<IconInbox />} title="Nothing waiting for review">
          Open a campaign and run an analysis. Campaigns that need sign-off can be sent here.
        </EmptyState>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="hidden grid-cols-12 gap-4 border-b border-line bg-surface-raised px-5 py-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle sm:grid">
            <span className="col-span-5">Campaign</span>
            <span className="col-span-3">Opened</span>
            <span className="col-span-2">Reviewer</span>
            <span className="col-span-2 text-right">Status</span>
          </div>
          <ul className="divide-y divide-line">
            {list.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/review/${r.id}`}
                  className="group grid grid-cols-1 gap-1 px-5 py-4 hover:bg-white/5 sm:grid-cols-12 sm:items-center sm:gap-4"
                >
                  <span className="col-span-5 flex items-center gap-2 font-medium text-ink group-hover:text-brand-200">
                    {r.campaignName}
                    <IconArrowRight width={14} height={14} className="opacity-0 transition group-hover:opacity-100" />
                  </span>
                  <span className="col-span-3 text-sm text-ink-muted">
                    {new Date(r.createdAt).toLocaleString()}
                  </span>
                  <span className="col-span-2 truncate text-sm text-ink-muted">
                    {r.reviewerName ?? r.reviewerId}
                  </span>
                  <span className="col-span-2 sm:text-right">
                    <StatusBadge level={reviewLevel(r.status)} label={r.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </AppShell>
  );
}
