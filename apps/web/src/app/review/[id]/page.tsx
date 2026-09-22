import Link from 'next/link';
import { notFound } from 'next/navigation';

import { analyses, campaigns, humanReview } from '@guardrail/core';

import { AppShell } from '@/components/app-shell';
import { Card, SectionHeading, StatusBadge } from '@/components/ui';
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

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between gap-4">
        <SectionHeading
          eyebrow={`Review · ${review.status}`}
          title={campaign.name}
          description={`Opened ${new Date(review.createdAt).toLocaleString()} by ${review.reviewerName ?? review.reviewerId}`}
        />
        <Link href="/review" className="text-sm text-slate-300 hover:text-slate-100">
          ← Back to queue
        </Link>
      </div>

      <Card className="mb-4">
        <h2 className="text-sm uppercase tracking-widest text-slate-400">Copy</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-100">{campaign.copy}</p>
      </Card>

      <SectionHeading eyebrow="Risk overview" title="Risk dimensions" />
      {analysis ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {analysis.risks.map((r) => (
            <Card key={r.dimension}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-100">{r.dimension}</h3>
                <StatusBadge
                  level={r.level === 'critical' ? 'critical' : (r.level as never)}
                  label={r.level}
                />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {r.reasons.slice(0, 2).join(' · ')}
              </p>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mb-4">
          <p className="text-sm text-slate-300">
            This campaign has no completed analysis yet.
          </p>
        </Card>
      )}

      <SectionHeading eyebrow="Findings" title="Findings requiring human review" />
      <div className="mb-4 space-y-3">
        {(analysis?.findings ?? [])
          .filter((f) => f.requiresHumanReview)
          .map((f) => (
            <Card key={f.id}>
              <div className="flex items-center gap-2">
                <StatusBadge level={f.severity === 'info' ? 'info' : (f.severity as never)} label={f.severity} />
                <span className="text-xs uppercase tracking-widest text-slate-400">
                  {f.category}
                </span>
              </div>
              <h3 className="mt-1 font-medium text-slate-100">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-300">{f.explanation}</p>
              {f.affectedContent ? (
                <blockquote className="mt-2 border-l-2 border-slate-700 pl-3 text-sm text-slate-400">
                  “{f.affectedContent}”
                </blockquote>
              ) : null}
              <p className="mt-2 text-xs text-slate-500">
                Evidence status: {f.evidenceStatus} · Confidence {Math.round(f.confidence * 100)}%
              </p>
            </Card>
          ))}
        {analysis && !analysis.findings.some((f) => f.requiresHumanReview) ? (
          <Card>
            <p className="text-sm text-slate-300">
              No findings explicitly required human review. Reviewer can still
              approve, reject or request changes below.
            </p>
          </Card>
        ) : null}
      </div>

      {review.status === 'pending' ? (
        <ReviewActions reviewId={review.id} campaignId={campaign.id} />
      ) : (
        <Card>
          <p className="text-sm text-slate-300">
            This review is <strong>{review.status}</strong>.
          </p>
          {review.decision ? (
            <p className="mt-2 text-sm text-slate-400">Decision: {review.decision}</p>
          ) : null}
          {review.comments ? (
            <p className="mt-2 text-sm text-slate-400">Comments: {review.comments}</p>
          ) : null}
        </Card>
      )}
    </AppShell>
  );
}
