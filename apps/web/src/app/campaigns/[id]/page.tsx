import Link from 'next/link';
import { notFound } from 'next/navigation';

import { analyses, campaigns } from '@guardrail/core';

import { AppShell } from '@/components/app-shell';
import { Card, SectionHeading, StatusBadge } from '@/components/ui';
import { RunAnalysisButton } from '@/components/run-analysis-button';

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
  const status = STATUS_LABEL[campaign.status] ?? STATUS_LABEL.draft!;

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between gap-4">
        <SectionHeading
          eyebrow={`Campaign · ${campaign.campaignType}`}
          title={campaign.name}
        />
        <StatusBadge level={status.level} label={status.label} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <h2 className="text-sm uppercase tracking-widest text-slate-400">Copy</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-100">{campaign.copy}</p>
        </Card>
        <Card>
          <h2 className="text-sm uppercase tracking-widest text-slate-400">Context</h2>
          <dl className="mt-3 space-y-2 text-sm text-slate-200">
            <Row label="Platform" value={campaign.platform} />
            <Row
              label="Geography"
              value={`${campaign.geography.country}${campaign.geography.region ? ` / ${campaign.geography.region}` : ''}`}
            />
            {campaign.festivalContext ? (
              <Row label="Festival" value={campaign.festivalContext.name} />
            ) : null}
            <Row
              label="Audience"
              value={campaign.audienceSegmentIds.join(', ') || 'none'}
            />
            <Row label="Assets" value={String(campaign.assets.length)} />
          </dl>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm uppercase tracking-widest text-slate-400">Analysis</h2>
            {latestRun ? (
              <p className="mt-1 text-sm text-slate-300">
                Last run{' '}
                <Link
                  href={`/campaigns/${campaign.id}/analysis/${latestRun.runId}`}
                  className="text-sky-300 underline"
                >
                  {new Date(latestRun.startedAt).toLocaleString()}
                </Link>{' '}
                — status {latestRun.status}, findings {latestRun.findings.length}
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-300">
                No analysis run yet.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href={`/campaigns/${campaign.id}/edit`}
              className="rounded border border-surface-border px-3 py-1.5 text-sm text-slate-200 hover:bg-surface-soft"
            >
              Edit
            </Link>
            <RunAnalysisButton campaignId={campaign.id} />
          </div>
        </div>
      </Card>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right text-slate-100">{value}</dd>
    </div>
  );
}
