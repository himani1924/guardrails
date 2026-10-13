import Link from 'next/link';

import { campaigns, humanReview } from '@guardrail/core';

import { AppShell } from '@/components/app-shell';
import {
  IconArrowRight,
  IconBook,
  IconCheck,
  IconInbox,
  IconMegaphone,
  IconPlus,
  IconShield,
  IconSparkles,
  IconUsers,
} from '@/components/icons';
import {
  Card,
  EmptyState,
  PageHeader,
  SectionHeading,
  StatCard,
  StatusBadge,
  campaignStatus,
} from '@/components/ui';

export const dynamic = 'force-dynamic';

const PIPELINE = [
  { icon: IconShield, title: 'Deterministic rules', body: 'Six coded checks run first: metadata, disclaimers, discounts, influencer disclosure, health claims and festival lines.' },
  { icon: IconBook, title: 'Grounded AI agents', body: 'Compliance and cultural agents retrieve from your policy library (pgvector) and may only cite what was retrieved.' },
  { icon: IconUsers, title: 'Audience simulation', body: 'Each selected persona gives a simulated reading of the campaign, used to estimate polarization.' },
  { icon: IconCheck, title: 'Human decision', body: 'Risk is scored by code across six dimensions. A reviewer approves, requests changes or rejects.' },
];

export default async function HomePage() {
  const [list, reviews] = await Promise.all([campaigns.listCampaigns(), humanReview.listReviews()]);
  const count = (s: string) => list.filter((c) => c.status === s).length;
  const pending = reviews.filter((r) => r.status === 'pending');
  const recent = list.slice(0, 5);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Dashboard"
        title="Campaign assurance overview"
        description="Check marketing campaigns for compliance, cultural, sentiment and audience risk before they go live. All findings are advisory; a human reviewer makes the final decision."
        actions={
          <>
            <Link href="/knowledge" className="btn btn-secondary">
              <IconBook width={16} height={16} /> Policies
            </Link>
            <Link href="/campaigns/new" className="btn btn-primary">
              <IconPlus width={16} height={16} /> New campaign
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Campaigns" value={list.length} hint="in the workspace" icon={<IconMegaphone />} />
        <StatCard label="Awaiting review" value={pending.length} hint="pending reviewer sign-off" icon={<IconInbox />} />
        <StatCard label="Analyzed" value={count('analyzed') + count('in_review')} hint="with a completed analysis" icon={<IconSparkles />} />
        <StatCard label="Approved" value={count('approved')} hint={`${count('rejected')} rejected`} icon={<IconCheck />} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SectionHeading
            title="Recent campaigns"
            actions={
              <Link href="/campaigns" className="link inline-flex items-center gap-1 text-sm">
                View all <IconArrowRight width={14} height={14} />
              </Link>
            }
          />
          {recent.length === 0 ? (
            <EmptyState
              icon={<IconMegaphone />}
              title="No campaigns yet"
              action={
                <Link href="/campaigns/new" className="btn btn-primary">
                  <IconPlus width={16} height={16} /> Create a campaign
                </Link>
              }
            >
              Draft your first campaign, or run <code>npm run db:seed</code> for demo data.
            </EmptyState>
          ) : (
            <Card className="!p-0">
              <ul className="divide-y divide-line">
                {recent.map((c) => {
                  const st = campaignStatus(c.status);
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/campaigns/${c.id}`}
                        className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-white/5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{c.name}</p>
                          <p className="mt-0.5 text-xs capitalize text-ink-subtle">
                            {c.campaignType.replace(/_/g, ' ')} · {c.platform} · {c.geography.country}
                          </p>
                        </div>
                        <StatusBadge level={st.level} label={st.label} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          <SectionHeading
            title="Review queue"
            actions={
              <Link href="/review" className="link inline-flex items-center gap-1 text-sm">
                Open queue <IconArrowRight width={14} height={14} />
              </Link>
            }
          />
          {pending.length === 0 ? (
            <EmptyState icon={<IconInbox />} title="Nothing waiting">
              Campaigns escalated for sign-off will appear here.
            </EmptyState>
          ) : (
            <Card className="!p-0">
              <ul className="divide-y divide-line">
                {pending.slice(0, 5).map((r) => (
                  <li key={r.id}>
                    <Link href={`/review/${r.id}`} className="block px-5 py-4 hover:bg-white/5">
                      <p className="truncate text-sm font-medium text-ink">{r.campaignName}</p>
                      <p className="mt-0.5 text-xs text-ink-subtle">
                        Opened {new Date(r.createdAt).toLocaleString()}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <SectionHeading eyebrow="How it works" title="The analysis pipeline" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PIPELINE.map(({ icon: Icon, title, body }, i) => (
          <Card key={title} className="!p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-300">
                <Icon />
              </span>
              <span className="text-xs font-semibold text-ink-subtle">Step {i + 1}</span>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{body}</p>
          </Card>
        ))}
      </div>

      <p className="mt-8 text-xs text-ink-subtle">
        Health check: <code>GET /api/health</code>
      </p>
    </AppShell>
  );
}
