import Link from 'next/link';
import { notFound } from 'next/navigation';

import { analyses, campaigns } from '@guardrail/core';

import { AppShell } from '@/components/app-shell';
import { IconArrowLeft, IconArrowRight, IconEdit, IconSparkles } from '@/components/icons';
import {
  Card,
  DefinitionRow,
  PageHeader,
  StatusBadge,
  Tag,
  campaignStatus,
} from '@/components/ui';
import { RunAnalysisButton } from '@/components/run-analysis-button';
import { SendToReviewButton } from '@/components/send-to-review-button';
import { AcceptCampaignButton } from '@/components/accept-campaign-button';

export const dynamic = 'force-dynamic';

export default async function CampaignDetailPage(
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  let campaign;
  try {
    campaign = await campaigns.getCampaignById(id);
  } catch {
    notFound();
  }
  const latestRun = await analyses.getLatestAnalysisRunForCampaign(campaign.id);
  const status = campaignStatus(campaign.status);
  const needsReview =
    !!latestRun &&
    latestRun.status === 'completed' &&
    (latestRun.risks.some((r) => r.humanReviewRequired) ||
      latestRun.findings.some((f) => f.requiresHumanReview));
  const canAccept =
    !!latestRun &&
    latestRun.status === 'completed' &&
    !needsReview &&
    campaign.status !== 'approved';

  return (
    <AppShell>
      <Link href="/campaigns" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-subtle hover:text-ink">
        <IconArrowLeft width={16} height={16} /> All campaigns
      </Link>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            Campaign · {campaign.campaignType.replace(/_/g, ' ')}
          </span>
        }
        title={
          <span className="flex flex-wrap items-center gap-3">
            {campaign.name}
            <StatusBadge level={status.level} label={status.label} />
          </span>
        }
        actions={
          <>
            <Link href={`/campaigns/${campaign.id}/edit`} className="btn btn-secondary">
              <IconEdit width={16} height={16} /> Edit
            </Link>
            {needsReview && latestRun ? (
              <SendToReviewButton campaignId={campaign.id} analysisRunId={latestRun.runId} />
            ) : null}
            {canAccept ? <AcceptCampaignButton campaignId={campaign.id} /> : null}
            <RunAnalysisButton campaignId={campaign.id} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <p className="eyebrow">Campaign copy</p>
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{campaign.copy}</p>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-300">
                <IconSparkles />
              </span>
              <div>
                <h2 className="text-base font-semibold text-ink">Latest analysis</h2>
                <p className="text-sm text-ink-muted">
                  Rules, AI agents and the risk aggregator run in sequence.
                </p>
              </div>
            </div>
            {latestRun ? (
              <Link
                href={`/campaigns/${campaign.id}/analysis/${latestRun.runId}`}
                className="group mt-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-surface-raised p-4 hover:border-brand-500/50 hover:bg-brand-500/10"
              >
                <div className="text-sm">
                  <p className="font-medium text-ink">
                    Run started {new Date(latestRun.startedAt).toLocaleString()}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-ink-muted">
                    <StatusBadge
                      level={latestRun.status === 'completed' ? 'low' : latestRun.status === 'failed' ? 'critical' : 'medium'}
                      label={latestRun.status}
                    />
                    <span>{latestRun.findings.length} findings</span>
                    {needsReview ? <Tag tone="amber">human review required</Tag> : null}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-300">
                  View results <IconArrowRight width={16} height={16} />
                </span>
              </Link>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-ink-muted">
                No analysis run yet. Use <strong>Run analysis</strong> to check this campaign.
              </div>
            )}
          </Card>
        </div>

        <Card className="h-fit">
          <p className="eyebrow">Context</p>
          <dl className="mt-2 divide-y divide-line">
            <DefinitionRow label="Platform" value={<span className="capitalize">{campaign.platform}</span>} />
            <DefinitionRow
              label="Geography"
              value={`${campaign.geography.country}${campaign.geography.region ? ` / ${campaign.geography.region}` : ''}`}
            />
            {campaign.festivalContext ? (
              <DefinitionRow label="Festival" value={campaign.festivalContext.name} />
            ) : null}
            <DefinitionRow label="Assets" value={String(campaign.assets.length)} />
          </dl>
          <p className="eyebrow mt-5">Audience</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {campaign.audienceSegmentIds.length === 0 ? (
              <span className="text-sm text-ink-subtle">none</span>
            ) : (
              campaign.audienceSegmentIds.map((a) => (
                <Tag key={a} tone="violet">
                  {a}
                </Tag>
              ))
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
