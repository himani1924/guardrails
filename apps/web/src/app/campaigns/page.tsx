import Link from 'next/link';

import { campaigns } from '@guardrail/core';

import { AppShell } from '@/components/app-shell';
import { IconArrowRight, IconMegaphone, IconPlus } from '@/components/icons';
import { EmptyState, PageHeader, StatusBadge, Tag, campaignStatus } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
  const list = await campaigns.listCampaigns();
  return (
    <AppShell>
      <PageHeader
        eyebrow="Campaigns"
        title="All campaigns"
        description={`${list.length} campaign${list.length === 1 ? '' : 's'} in the system.`}
        actions={
          <Link href="/campaigns/new" className="btn btn-primary">
            <IconPlus width={16} height={16} /> New campaign
          </Link>
        }
      />

      {list.length === 0 ? (
        <EmptyState
          icon={<IconMegaphone />}
          title="No campaigns yet"
          action={
            <Link href="/campaigns/new" className="btn btn-primary">
              <IconPlus width={16} height={16} /> Create the first one
            </Link>
          }
        >
          Draft a campaign to run rules and AI checks before it goes live.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((c) => {
            const status = campaignStatus(c.status);
            return (
              <Link
                key={c.id}
                href={`/campaigns/${c.id}`}
                className="group flex flex-col rounded-xl border border-line bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand-500/50 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold text-ink group-hover:text-brand-200">
                    {c.name}
                  </h2>
                  <StatusBadge level={status.level} label={status.label} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">{c.copy}</p>
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  <Tag tone="brand">{c.campaignType.replace(/_/g, ' ')}</Tag>
                  <Tag>{c.platform}</Tag>
                  <Tag>{c.geography.country}</Tag>
                  {c.festivalContext ? <Tag tone="amber">{c.festivalContext.name}</Tag> : null}
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-ink-subtle group-hover:text-brand-200">
                    View <IconArrowRight width={14} height={14} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
