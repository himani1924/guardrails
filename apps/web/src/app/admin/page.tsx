import { feedback } from '@guardrail/core';

import { AppShell } from '@/components/app-shell';
import { Card, SectionHeading } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const summary = await feedback.summariseFeedback();
  return (
    <AppShell>
      <SectionHeading
        eyebrow="Admin"
        title="Reviewer feedback"
        description="Signals we can use later to calibrate agents. Nothing is auto-fed back into the AI."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="text-xs uppercase tracking-widest text-slate-400">
            Total events
          </h2>
          <p className="mt-1 text-3xl font-semibold text-slate-50">
            {summary.totalEvents}
          </p>
        </Card>
        <Card>
          <h2 className="text-xs uppercase tracking-widest text-slate-400">
            Reviewer disagreement rate
          </h2>
          <p className="mt-1 text-3xl font-semibold text-slate-50">
            {Math.round(summary.disagreementRate * 100)}%
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Share of feedback events that reject a finding.
          </p>
        </Card>
        <Card>
          <h2 className="text-xs uppercase tracking-widest text-slate-400">
            Actions
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {summary.byAction.length === 0 ? (
              <li className="text-slate-500">No events yet.</li>
            ) : (
              summary.byAction.map((a) => (
                <li key={a.action} className="flex justify-between">
                  <span>{a.action}</span>
                  <span className="text-slate-400">{a.count}</span>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      <SectionHeading eyebrow="Recent" title="Recent reviewer actions on findings" />
      {summary.recentFindingActions.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-300">No reviewer actions on findings yet.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {summary.recentFindingActions.map((r) => (
            <Card key={r.findingId + r.createdAt}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-400">
                    {r.findingCategory} · {r.action}
                  </div>
                  <div className="mt-1 text-slate-100">{r.findingTitle}</div>
                  {r.comments ? (
                    <p className="mt-1 text-sm text-slate-300">{r.comments}</p>
                  ) : null}
                </div>
                <div className="text-right text-xs text-slate-500">
                  {new Date(r.createdAt).toLocaleString()}
                  <br />
                  {r.reviewerName ?? '—'}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
