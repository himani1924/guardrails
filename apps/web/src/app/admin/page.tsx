import { feedback } from '@guardrail/core';

import { AppShell } from '@/components/app-shell';
import { IconChart } from '@/components/icons';
import { Card, EmptyState, PageHeader, SectionHeading, StatCard, Tag } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const summary = await feedback.summariseFeedback();
  const maxCount = Math.max(1, ...summary.byAction.map((a) => a.count));
  return (
    <AppShell>
      <PageHeader
        eyebrow="Admin"
        title="Reviewer feedback"
        description="Signals we can use later to calibrate agents. Nothing is auto-fed back into the AI."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total events" value={summary.totalEvents} hint="feedback events recorded" />
        <StatCard
          label="Reviewer disagreement rate"
          value={`${Math.round(summary.disagreementRate * 100)}%`}
          hint="Share of feedback events that reject a finding."
        />
        <Card className="!p-5">
          <p className="text-sm font-medium text-ink-muted">Actions</p>
          {summary.byAction.length === 0 ? (
            <p className="mt-3 text-sm text-ink-subtle">No events yet.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {summary.byAction.map((a) => (
                <li key={a.action} className="text-sm">
                  <div className="flex justify-between">
                    <span className="capitalize text-ink">{a.action.replace(/_/g, ' ')}</span>
                    <span className="tabular-nums text-ink-subtle">{a.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(a.count / maxCount) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <SectionHeading eyebrow="Recent" title="Recent reviewer actions on findings" />
      {summary.recentFindingActions.length === 0 ? (
        <EmptyState icon={<IconChart />} title="No reviewer actions on findings yet" />
      ) : (
        <Card className="!p-0">
          <ul className="divide-y divide-line">
            {summary.recentFindingActions.map((r) => (
              <li key={r.findingId + r.createdAt} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-1.5">
                    <Tag>{r.findingCategory}</Tag>
                    <Tag tone="brand">{r.action}</Tag>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-ink">{r.findingTitle}</p>
                  {r.comments ? <p className="mt-1 text-sm text-ink-muted">{r.comments}</p> : null}
                </div>
                <div className="text-right text-xs text-ink-subtle">
                  {new Date(r.createdAt).toLocaleString()}
                  <br />
                  {r.reviewerName ?? '—'}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </AppShell>
  );
}
