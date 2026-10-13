import type { types } from '@guardrail/core';

import { ConfidenceMeter, LEVEL_ACCENT, StatusBadge, Tag } from './ui';
import type { Level } from './ui';

export function severityToLevel(s: types.Severity): Level {
  return s === 'critical' ? 'critical' : s === 'high' ? 'high' : s === 'medium' ? 'medium' : s === 'low' ? 'low' : 'info';
}

const AGENT_LABEL: Record<types.AgentKind, string> = {
  rule_engine: 'Rule engine',
  compliance: 'Compliance agent',
  sentiment: 'Sentiment agent',
  cultural: 'Cultural agent',
  audience: 'Audience agent',
  recommendation: 'Recommendation agent',
};

export function agentLabel(k: types.AgentKind): string {
  return AGENT_LABEL[k] ?? k;
}

const EVIDENCE_TONE: Record<types.EvidenceStatus, 'emerald' | 'amber' | 'slate' | 'sky'> = {
  SUPPORTED: 'emerald',
  INSUFFICIENT_EVIDENCE: 'amber',
  CONTRADICTED: 'amber',
  NOT_FOUND: 'amber',
  REQUIRES_HUMAN_REVIEW: 'amber',
  NOT_APPLICABLE: 'slate',
};

export function FindingCard({
  finding: f,
  showEvidence = true,
}: {
  finding: types.Finding;
  showEvidence?: boolean;
}) {
  const level = severityToLevel(f.severity);
  return (
    <article className={`rounded-xl border border-l-4 border-line bg-surface p-5 shadow-card ${LEVEL_ACCENT[level]}`}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge level={level} label={f.severity} />
        <Tag>{f.category.replace(/_/g, ' ')}</Tag>
        <Tag tone={f.producedBy === 'rule_engine' ? 'sky' : 'violet'}>{agentLabel(f.producedBy)}</Tag>
        {f.requiresHumanReview ? <Tag tone="amber">Human review</Tag> : null}
      </div>
      <h3 className="mt-3 text-base font-semibold text-ink">{f.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{f.explanation}</p>
      {f.affectedContent ? (
        <blockquote className="mt-3 rounded-r-lg border-l-2 border-slate-700 bg-surface-raised py-2 pl-3 pr-2 text-sm italic text-slate-300">
          “{f.affectedContent}”
        </blockquote>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <ConfidenceMeter value={f.confidence} />
        <span className="flex items-center gap-1.5 text-xs text-ink-subtle">
          Evidence <Tag tone={EVIDENCE_TONE[f.evidenceStatus] ?? 'slate'}>{f.evidenceStatus.replace(/_/g, ' ').toLowerCase()}</Tag>
        </span>
      </div>
      {showEvidence && f.evidence.length > 0 ? (
        <details className="group mt-4 rounded-lg border border-line bg-surface-raised">
          <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-brand-300 hover:text-brand-200">
            Cited sources ({f.evidence.length})
          </summary>
          <ol className="space-y-2 px-3 pb-3">
            {f.evidence.map((ev, i) => (
              <li key={ev.id} className="rounded-lg border border-line bg-surface p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-brand-500/10 text-[11px] font-semibold text-brand-300">
                    {i + 1}
                  </span>
                  <span className="font-medium text-ink">{ev.sourceTitle}</span>
                  <Tag>{ev.sourceType.replace(/_/g, ' ')}</Tag>
                  <span className="ml-auto text-xs tabular-nums text-ink-subtle">
                    relevance {Math.round(ev.relevanceScore * 100)}%
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{ev.excerpt}</p>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </article>
  );
}
