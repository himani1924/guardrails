import Link from 'next/link';
import { notFound } from 'next/navigation';

import { analyses, campaigns, humanReview } from '@guardrail/core';

import { AppShell } from '@/components/app-shell';
import { FindingCard } from '@/components/finding-card';
import { IconArrowLeft, IconArrowRight } from '@/components/icons';
import { RiskCard } from '@/components/risk-card';
import { Card, EmptyState, PageHeader, SectionHeading, StatusBadge } from '@/components/ui';
import { ReviewActions } from '@/components/review-actions';

export const dynamic = 'force-dynamic';

export default async function ReviewDetailPage(
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  let review;
  try {
    review = await humanReview.getReview(id);
  } catch {
    notFound();
  }

  const campaign = await campaigns.getCampaignById(review.campaignId);
  const analysis = review.analysisRunId
    ? await analyses.getAnalysisRun(review.analysisRunId)
    : await analyses.getLatestAnalysisRunForCampaign(review.campaignId);
  const reviewFindings = (analysis?.findings ?? []).filter((f) => f.requiresHumanReview);

  return (
    <AppShell>
      <Link href="/review" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-subtle hover:text-ink">
        <IconArrowLeft width={16} height={16} /> Back to queue
      </Link>
      <PageHeader
        eyebrow={`Review · ${review.status}`}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {campaign.name}
            <StatusBadge
              level={review.status === 'pending' ? 'high' : review.status === 'approved' ? 'low' : review.status === 'rejected' ? 'critical' : 'medium'}
              label={review.status}
            />
          </span>
        }
        description={`Opened ${new Date(review.createdAt).toLocaleString()} by ${review.reviewerName ?? review.reviewerId}`}
        actions={
          analysis ? (
            <Link href={`/campaigns/${campaign.id}/analysis/${analysis.runId}`} className="btn btn-secondary">
              Full analysis <IconArrowRight width={16} height={16} />
            </Link>
          ) : null
        }
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <p className="eyebrow">Campaign copy</p>
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{campaign.copy}</p>
          </Card>

          <SectionHeading eyebrow="Risk overview" title="Risk dimensions" />
          {analysis ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {analysis.risks.map((r) => (
                <RiskCard key={r.dimension} risk={r} maxReasons={2} />
              ))}
            </div>
          ) : (
            <EmptyState title="No completed analysis yet">
              This campaign has no completed analysis yet.
            </EmptyState>
          )}

          <SectionHeading eyebrow="Findings" title="Findings requiring human review" />
          <div className="space-y-3">
            {reviewFindings.map((f) => (
              <FindingCard key={f.id} finding={f} />
            ))}
            {analysis && reviewFindings.length === 0 ? (
              <EmptyState title="No findings explicitly required review">
                You can still approve, reject or request changes.
              </EmptyState>
            ) : null}
          </div>
        </div>

        <div>
          <div className="lg:sticky lg:top-8">
            {review.status === 'pending' ? (
              <ReviewActions reviewId={review.id} campaignId={campaign.id} />
            ) : (
              <Card>
                <p className="eyebrow">Outcome</p>
                <p className="mt-2 text-sm text-ink">
                  This review is <strong className="capitalize">{review.status.replace(/_/g, ' ')}</strong>.
                </p>
                {review.decision ? (
                  <p className="mt-3 text-sm text-ink-muted">
                    <span className="font-medium text-ink">Decision:</span> {review.decision}
                  </p>
                ) : null}
                {review.comments ? (
                  <p className="mt-2 text-sm text-ink-muted">
                    <span className="font-medium text-ink">Comments:</span> {review.comments}
                  </p>
                ) : null}
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
