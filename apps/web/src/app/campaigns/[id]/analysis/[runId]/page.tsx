import Link from 'next/link';
import { notFound } from 'next/navigation';

import { analyses, campaigns } from '@guardrail/core';
import type { types } from '@guardrail/core';

import { AppShell } from '@/components/app-shell';
import { FindingCard, agentLabel } from '@/components/finding-card';
import { IconArrowLeft, IconShield, IconSparkles, IconUsers } from '@/components/icons';
import { RiskCard } from '@/components/risk-card';
import {
  Alert,
  Card,
  ConfidenceMeter,
  EmptyState,
  PageHeader,
  SectionHeading,
  StatusBadge,
  Tag,
} from '@/components/ui';
import type { Level } from '@/components/ui';
import { SendToReviewButton } from '@/components/send-to-review-button';
import { AcceptCampaignButton } from '@/components/accept-campaign-button';

export const dynamic = 'force-dynamic';

const LEVEL_ORDER: types.RiskLevel[] = ['critical', 'high', 'medium', 'low', 'unknown'];
const SEVERITY_ORDER: types.Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

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
  const analysisComplete = result.status === 'completed';
  const needsReview =
    analysisComplete &&
    (result.risks.some((r) => r.humanReviewRequired) ||
      result.findings.some((f) => f.requiresHumanReview));
  const canAccept =
    analysisComplete && !needsReview && campaign.status !== 'approved';

  const overall: Level =
    LEVEL_ORDER.find((l) => l !== 'unknown' && result.risks.some((r) => r.level === l)) ?? 'unknown';
  const bySeverity = (f: types.Finding, g: types.Finding) =>
    SEVERITY_ORDER.indexOf(f.severity) - SEVERITY_ORDER.indexOf(g.severity);
  const ruleFindings = result.findings.filter((f) => f.producedBy === 'rule_engine').sort(bySeverity);
  const agentFindings = result.findings.filter((f) => f.producedBy !== 'rule_engine').sort(bySeverity);
  const sevCount = (s: types.Severity) => result.findings.filter((f) => f.severity === s).length;

  return (
    <AppShell>
      <Link
        href={`/campaigns/${campaign.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-subtle hover:text-ink"
      >
        <IconArrowLeft width={16} height={16} /> Back to campaign
      </Link>
      <PageHeader
        eyebrow={`Analysis results · ${result.status}`}
        title={campaign.name}
        description={`Run started ${new Date(result.startedAt).toLocaleString()} · provider ${result.provider ?? 'n/a'}`}
        actions={
          <>
            {needsReview ? (
              <SendToReviewButton campaignId={campaign.id} analysisRunId={result.runId} />
            ) : null}
            {canAccept ? <AcceptCampaignButton campaignId={campaign.id} /> : null}
          </>
        }
      />

      <Alert tone="info" title="Advisory output">
        These are AI-assisted risk signals and simulated audience perspectives, not factual
        predictions of public reaction. A human reviewer makes the final decision.
      </Alert>

      {/* Summary strip */}
      <Card className="mt-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <p className="eyebrow">Overall risk</p>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge level={overall} label={overall} />
              {needsReview ? <Tag tone="amber">Human review required</Tag> : null}
            </div>
            <p className="mt-2 text-xs text-ink-subtle">Highest level across the six risk dimensions.</p>
          </div>
          <div>
            <p className="eyebrow">Findings</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{result.findings.length}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {SEVERITY_ORDER.filter((s) => sevCount(s) > 0).map((s) => (
                <Tag key={s}>
                  {sevCount(s)} {s}
                </Tag>
              ))}
            </div>
          </div>
          <div>
            <p className="eyebrow">Sources of findings</p>
            <p className="mt-1 text-sm text-ink-muted">
              <strong className="text-ink">{ruleFindings.length}</strong> from deterministic rules ·{' '}
              <strong className="text-ink">{agentFindings.length}</strong> from AI agents
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              <strong className="text-ink">{result.recommendations.length}</strong> recommendations ·{' '}
              <strong className="text-ink">{result.audiencePerspectives.length}</strong> personas
            </p>
          </div>
        </div>
      </Card>

      <SectionHeading
        eyebrow="Overview"
        title="Risk dimensions"
        description="Scored by deterministic code from the findings, not by the LLM."
      />
      {result.risks.length === 0 ? (
        <EmptyState title="No risk assessments for this run" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.risks.map((r) => (
            <RiskCard key={r.dimension} risk={r} />
          ))}
        </div>
      )}

      <SectionHeading
        eyebrow="Deterministic layer"
        title="Rule findings"
        description="Coded checks that run before any AI call."
        actions={<Tag tone="sky">{ruleFindings.length}</Tag>}
      />
      {ruleFindings.length === 0 ? (
        <EmptyState icon={<IconShield />} title="No rule findings">
          None of the deterministic rules flagged this campaign.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {ruleFindings.map((f) => (
            <FindingCard key={f.id} finding={f} />
          ))}
        </div>
      )}

      <SectionHeading
        eyebrow="AI agents"
        title="Agent findings"
        description="Compliance and cultural findings may only cite sources retrieved from the policy library."
        actions={<Tag tone="violet">{agentFindings.length}</Tag>}
      />
      {agentFindings.length === 0 ? (
        <EmptyState icon={<IconSparkles />} title="No agent findings">
          The AI agents returned no findings for this run.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {agentFindings.map((f) => (
            <FindingCard key={f.id} finding={f} />
          ))}
        </div>
      )}

      <SectionHeading
        eyebrow="Audience perspectives"
        title="Simulated personas"
        description="Simulated readings per selected audience segment. These are not survey results."
      />
      {result.audiencePerspectives.length === 0 ? (
        <EmptyState icon={<IconUsers />} title="No audience perspective results" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {result.audiencePerspectives.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/10 text-violet-300">
                  <IconUsers />
                </span>
                <h3 className="text-sm font-semibold text-ink">{p.audienceSegmentKey}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">{p.possibleInterpretation}</p>
              <div className="mt-4 grid flex-1 gap-3 sm:grid-cols-2">
                <SignalList title="Positive signals" items={p.positiveSignals} tone="emerald" />
                <SignalList title="Concern signals" items={p.concernSignals} tone="amber" />
              </div>
              {p.ambiguity ? (
                <p className="mt-3 rounded-lg bg-surface-raised p-2.5 text-xs text-ink-muted">
                  <span className="font-semibold text-ink">Ambiguity:</span> {p.ambiguity}
                </p>
              ) : null}
              <div className="mt-4 border-t border-line pt-3">
                <ConfidenceMeter value={p.confidence} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <SectionHeading
        eyebrow="Recommendations"
        title="Suggested actions"
        description="Each action is tied to a finding."
      />
      {result.recommendations.length === 0 ? (
        <EmptyState title="No recommendations for this run" />
      ) : (
        <div className="space-y-3">
          {result.recommendations.map((r) => {
            const finding = findingById.get(r.findingId);
            return (
              <Card key={r.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone="brand">{r.action.replace(/_/g, ' ')}</Tag>
                  <span className="text-xs text-ink-subtle">
                    for finding: <span className="font-medium text-ink-muted">{finding ? finding.title : r.findingId}</span>
                    {finding ? ` · ${agentLabel(finding.producedBy)}` : ''}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink">{r.reason}</p>
                {r.originalContent || r.suggestedModification ? (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {r.originalContent ? (
                      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-300">Original</p>
                        <p className="mt-1 text-slate-300">“{r.originalContent}”</p>
                      </div>
                    ) : null}
                    {r.suggestedModification ? (
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">Suggested</p>
                        <p className="mt-1 text-slate-300">“{r.suggestedModification}”</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function SignalList({ title, items, tone }: { title: string; items: string[]; tone: 'emerald' | 'amber' }) {
  const color = tone === 'emerald' ? 'text-emerald-300' : 'text-amber-300';
  const dot = tone === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500';
  return (
    <div>
      <p className={`text-[11px] font-semibold uppercase tracking-wider ${color}`}>{title}</p>
      {items.length === 0 ? (
        <p className="mt-1 text-xs text-ink-subtle">None</p>
      ) : (
        <ul className="mt-1.5 space-y-1 text-sm text-ink-muted">
          {items.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
