import Link from 'next/link';
import { notFound } from 'next/navigation';

import { analyses, campaigns } from '@guardrail/core';
import type { types } from '@guardrail/core';

import { AppShell } from '@/components/app-shell';
import { Card, SectionHeading, StatusBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';

type RiskDim = types.RiskDimension;
const DIM_LABEL: Record<RiskDim, string> = {
  compliance: 'Compliance',
  cultural: 'Cultural',
  sentiment: 'Sentiment',
  brand: 'Brand',
  evidence: 'Evidence',
  polarization: 'Polarization',
};

export default async function AnalysisPage(
  props: { params: Promise<{ id: string; runId: string }> },
) {
  const { id, runId } = await props.params;
  let campaign;
  try {
    campaign = await campaigns.getCampaignById(id);
  } catch {
    notFound();
  }
  let result;
  try {
    result = await analyses.getAnalysisRun(runId);
  } catch {
    notFound();
  }

  const findingById = new Map(result.findings.map((f) => [f.id, f]));

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between gap-4">
        <SectionHeading
          eyebrow={`Analysis · ${result.status}`}
          title={campaign.name}
          description={`Run started ${new Date(result.startedAt).toLocaleString()} · provider ${result.provider ?? 'n/a'}`}
        />
        <Link
          href={`/campaigns/${campaign.id}`}
          className="text-sm text-slate-300 hover:text-slate-100"
        >
          ← Back to campaign
        </Link>
      </div>

      <p className="mb-4 text-xs text-slate-500">
        These are AI-assisted risk signals and simulated audience perspectives —
        not factual predictions of public reaction. A human reviewer makes the
        final decision.
      </p>

      <SectionHeading eyebrow="Overview" title="Risk dimensions" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {result.risks.map((r) => {
          const level = r.level === 'critical' ? 'critical' : r.level;
          return (
            <Card key={r.dimension}>
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-100">
                  {DIM_LABEL[r.dimension]} risk
                </h3>
                <StatusBadge level={level} label={r.level} />
              </div>
              <ul className="mt-2 space-y-1 text-xs text-slate-300">
                {r.reasons.slice(0, 3).map((rr, i) => (
                  <li key={i}>· {rr}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500">
                Confidence {Math.round(r.confidence * 100)}%
                {r.humanReviewRequired ? ' · human review required' : ''}
              </p>
            </Card>
          );
        })}
      </div>

      <SectionHeading eyebrow="Findings" title="Detailed findings" />
      {result.findings.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-300">
            No findings recorded for this run.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {result.findings.map((f) => (
            <Card key={f.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge level={severityToLevel(f.severity)} label={f.severity} />
                    <span className="text-xs uppercase tracking-widest text-slate-400">
                      {f.category} · {f.producedBy}
                    </span>
                    {f.requiresHumanReview ? (
                      <span className="rounded bg-amber-900 px-1.5 py-0.5 text-xs text-amber-100">
                        HUMAN REVIEW
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-1 text-base font-medium text-slate-100">
                    {f.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-300">{f.explanation}</p>
                  {f.affectedContent ? (
                    <blockquote className="mt-2 border-l-2 border-slate-700 pl-3 text-sm text-slate-400">
                      “{f.affectedContent}”
                    </blockquote>
                  ) : null}
                </div>
                <div className="text-right text-xs text-slate-500">
                  Conf {Math.round(f.confidence * 100)}%
                  <br />
                  Evidence: {f.evidenceStatus}
                </div>
              </div>
              {f.evidence.length > 0 ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-sky-300 hover:text-sky-200">
                    Show cited evidence ({f.evidence.length})
                  </summary>
                  <ul className="mt-2 space-y-2">
                    {f.evidence.map((ev) => (
                      <li
                        key={ev.id}
                        className="rounded border border-surface-border bg-black/20 p-2 text-xs text-slate-300"
                      >
                        <div className="text-slate-100">{ev.sourceTitle}</div>
                        <div className="mt-1">{ev.excerpt}</div>
                        <div className="mt-1 text-slate-500">
                          type: {ev.sourceType} · rel {Math.round(ev.relevanceScore * 100)}%
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <SectionHeading eyebrow="Audience perspectives" title="Simulated audience perspectives" />
      {result.audiencePerspectives.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-300">
            No audience perspective results.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {result.audiencePerspectives.map((p) => (
            <Card key={p.id}>
              <h3 className="font-medium text-slate-100">
                {p.audienceSegmentKey}
              </h3>
              <p className="mt-1 text-sm text-slate-300">
                {p.possibleInterpretation}
              </p>
              {p.positiveSignals.length > 0 ? (
                <div className="mt-2">
                  <div className="text-xs uppercase tracking-widest text-emerald-300">
                    Positive signals
                  </div>
                  <ul className="mt-1 space-y-0.5 text-xs text-slate-300">
                    {p.positiveSignals.map((s, i) => (
                      <li key={i}>· {s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {p.concernSignals.length > 0 ? (
                <div className="mt-2">
                  <div className="text-xs uppercase tracking-widest text-amber-300">
                    Concern signals
                  </div>
                  <ul className="mt-1 space-y-0.5 text-xs text-slate-300">
                    {p.concernSignals.map((s, i) => (
                      <li key={i}>· {s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {p.ambiguity ? (
                <p className="mt-2 text-xs text-slate-400">
                  Ambiguity: {p.ambiguity}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-slate-500">
                Confidence {Math.round(p.confidence * 100)}%
              </p>
            </Card>
          ))}
        </div>
      )}

      <SectionHeading eyebrow="Recommendations" title="Suggested actions" />
      {result.recommendations.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-300">
            No recommendations for this run.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {result.recommendations.map((r) => {
            const finding = findingById.get(r.findingId);
            return (
              <Card key={r.id}>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-sky-900 px-2 py-0.5 text-xs text-sky-100">
                    {r.action}
                  </span>
                  <span className="text-xs text-slate-400">
                    for finding: {finding ? finding.title : r.findingId}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-200">{r.reason}</p>
                {r.originalContent ? (
                  <p className="mt-2 text-xs text-slate-400">
                    Original: “{r.originalContent}”
                  </p>
                ) : null}
                {r.suggestedModification ? (
                  <p className="mt-1 text-xs text-emerald-200">
                    Suggested: “{r.suggestedModification}”
                  </p>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function severityToLevel(s: types.Severity): 'critical' | 'high' | 'medium' | 'low' | 'info' {
  return s === 'critical' ? 'critical' : s === 'high' ? 'high' : s === 'medium' ? 'medium' : s === 'low' ? 'low' : 'info';
}
