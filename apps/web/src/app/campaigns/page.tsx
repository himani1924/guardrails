import Link from 'next/link';

import { campaigns } from '@guardrail/core';

import { AppShell } from '@/components/app-shell';
import { Card, SectionHeading, StatusBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, { level: 'critical' | 'high' | 'medium' | 'low' | 'unknown' | 'info'; label: string }> = {
  draft: { level: 'info', label: 'Draft' },
  ready_for_analysis: { level: 'info', label: 'Ready' },
  analyzing: { level: 'medium', label: 'Analyzing' },
  analyzed: { level: 'low', label: 'Analyzed' },
  in_review: { level: 'high', label: 'In review' },
  approved: { level: 'low', label: 'Approved' },
  rejected: { level: 'critical', label: 'Rejected' },
};

export default async function CampaignsPage() {
  const list = await campaigns.listCampaigns();
  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between">
        <SectionHeading
          eyebrow="Campaigns"
          title="All campaigns"
          description={`${list.length} campaign${list.length === 1 ? '' : 's'} in the system.`}
        />
        <Link
          href="/campaigns/new"
          className="rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500"
        >
          New campaign
        </Link>
      </div>

      {list.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-300">
            No campaigns yet.{' '}
            <Link href="/campaigns/new" className="text-sky-300 underline">
              Create the first one
            </Link>
            .
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((c) => {
            const status = STATUS_LABEL[c.status] ?? STATUS_LABEL.draft!;
            return (
              <Card key={c.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="text-lg font-medium text-slate-50 hover:text-sky-300"
                    >
                      {c.name}
                    </Link>
                    <p className="mt-1 text-sm text-slate-300 line-clamp-2">{c.copy}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                      <span>{c.campaignType}</span>
                      <span>·</span>
                      <span>{c.platform}</span>
                      <span>·</span>
                      <span>{c.geography.country}</span>
                      {c.festivalContext ? (
                        <>
                          <span>·</span>
                          <span>{c.festivalContext.name}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge level={status.level} label={status.label} />
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="text-xs text-slate-400 hover:text-slate-200"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
