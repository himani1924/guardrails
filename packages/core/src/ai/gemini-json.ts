import type { ZodType, ZodTypeAny, ZodTypeDef } from 'zod';

type ZodDef = {
  typeName?: string;
  values?: string[];
  shape?: () => Record<string, ZodTypeAny>;
  type?: ZodTypeAny;
  innerType?: ZodTypeAny;
  defaultValue?: () => unknown;
};

export function collectEnumPaths(
  schema: ZodTypeAny,
  path: string[] = [],
): Array<{ path: string; values: string[] }> {
  const def = schema._def as ZodDef;
  const typeName = def.typeName ?? '';
  if (typeName === 'ZodEnum' && Array.isArray(def.values)) {
    return [{ path: path.join('.') || '(root)', values: [...def.values] }];
  }
  if (typeName === 'ZodObject' && typeof def.shape === 'function') {
    return Object.entries(def.shape()).flatMap(([key, child]) =>
      collectEnumPaths(child, [...path, key]),
    );
  }
  if (typeName === 'ZodArray' && def.type) {
    return collectEnumPaths(def.type, [...path, '*']);
  }
  if (
    (typeName === 'ZodOptional' ||
      typeName === 'ZodNullable' ||
      typeName === 'ZodDefault' ||
      typeName === 'ZodEffects') &&
    def.innerType
  ) {
    return collectEnumPaths(def.innerType, path);
  }
  return [];
}

export function describeEnumsForPrompt(schema: ZodTypeAny): string {
  const enums = collectEnumPaths(schema);
  if (enums.length === 0) return '';
  const lines = enums.map(
    (e) => `- ${e.path}: ${e.values.map((v) => JSON.stringify(v)).join(' | ')}`,
  );
  return `\nAllowed enum values (use these EXACT strings, including case):\n${lines.join('\n')}\n`;
}

function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

const CATEGORY_ALIASES: Record<string, string> = {
  disclaimer: 'missing_disclaimer',
  missingdisclaimer: 'missing_disclaimer',
  regulatedclaim: 'regulatory',
  regulation: 'regulatory',
  regulatoryclaim: 'regulatory',
  regulated: 'regulatory',
  misleadingclaim: 'misleading_claim',
  misleading: 'misleading_claim',
  unsupportedclaim: 'unsupported_claim',
  unsupported: 'unsupported_claim',
  pricingissue: 'pricing',
  influencerdisclosure: 'influencer_disclosure',
  disclosure: 'influencer_disclosure',
  brandpolicy: 'brand_policy',
  brand: 'brand_policy',
  audiencepolarization: 'audience_polarization',
  polarization: 'audience_polarization',
  culturalrisk: 'cultural',
  culture: 'cultural',
};

const EVIDENCE_ALIASES: Record<string, string> = {
  supported: 'SUPPORTED',
  insufficientevidence: 'INSUFFICIENT_EVIDENCE',
  insufficient: 'INSUFFICIENT_EVIDENCE',
  contradicted: 'CONTRADICTED',
  notfound: 'NOT_FOUND',
  missing: 'NOT_FOUND',
  requireshumanreview: 'REQUIRES_HUMAN_REVIEW',
  humanreview: 'REQUIRES_HUMAN_REVIEW',
  notapplicable: 'NOT_APPLICABLE',
  na: 'NOT_APPLICABLE',
};

function matchEnum(raw: string, allowed: string[]): string | undefined {
  const exact = allowed.find((v) => v === raw);
  if (exact) return exact;
  const lower = allowed.find((v) => v.toLowerCase() === raw.toLowerCase());
  if (lower) return lower;
  const nk = normalizeKey(raw);
  const byNorm = allowed.find((v) => normalizeKey(v) === nk);
  if (byNorm) return byNorm;
  if (CATEGORY_ALIASES[nk] && allowed.includes(CATEGORY_ALIASES[nk])) {
    return CATEGORY_ALIASES[nk];
  }
  if (EVIDENCE_ALIASES[nk] && allowed.includes(EVIDENCE_ALIASES[nk])) {
    return EVIDENCE_ALIASES[nk];
  }
  return undefined;
}

export function coerceValue(value: unknown, schema: ZodTypeAny): unknown {
  const def = schema._def as ZodDef;
  const typeName = def.typeName ?? '';

  if (typeName === 'ZodOptional' || typeName === 'ZodNullable') {
    if (value === null || value === undefined) return value;
    return coerceValue(value, def.innerType!);
  }
  if (typeName === 'ZodDefault') {
    if (value === null || value === undefined) {
      return typeof def.defaultValue === 'function' ? def.defaultValue() : value;
    }
    return coerceValue(value, def.innerType!);
  }
  if (typeName === 'ZodEffects' && def.innerType) {
    return coerceValue(value, def.innerType);
  }
  if (typeName === 'ZodEnum' && typeof value === 'string' && def.values) {
    return matchEnum(value, def.values) ?? value;
  }
  if (typeName === 'ZodBoolean') {
    if (typeof value === 'boolean') return value;
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') {
      const s = value.toLowerCase().trim();
      if (['true', 'yes', '1'].includes(s)) return true;
      if (['false', 'no', '0'].includes(s)) return false;
    }
    if (typeof value === 'number') return value !== 0;
    return Boolean(value);
  }
  if (typeName === 'ZodNumber') {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
      return Number(value);
    }
    return value;
  }
  if (typeName === 'ZodString') {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return value;
  }
  if (typeName === 'ZodArray' && Array.isArray(value) && def.type) {
    return value.map((item) => coerceValue(item, def.type!));
  }
  if (
    typeName === 'ZodObject' &&
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    def.shape
  ) {
    const shape = def.shape();
    let out: Record<string, unknown> = { ...(value as Record<string, unknown>) };
    out = applyFieldAliases(out, Object.keys(shape));
    for (const [key, child] of Object.entries(shape)) {
      if (key in out) out[key] = coerceValue(out[key], child);
    }
    return out;
  }
  return value;
}



/** Common Gemini field-name mistakes → our schema keys */
const FIELD_ALIASES: Record<string, string[]> = {
  title: ['name', 'headline', 'label', 'summary'],
  explanation: ['description', 'reason', 'rationale', 'details', 'detail'],
  tone: ['mood', 'voice', 'style'],
  emotions: ['feelings', 'emotionList', 'emotionalSignals'],
  overallSentiment: ['sentiment', 'overall', 'overallMood'],
  overallConfidence: ['confidence', 'overallCertainty'],
  overallUncertainty: ['uncertainty', 'uncertaintyNote'],
  riskSignals: ['risks', 'signals', 'concerns', 'flags'],
  audienceSegmentKey: ['key', 'segmentKey', 'audienceKey', 'segment'],
  possibleInterpretation: ['interpretation', 'reading', 'perspective'],
  positiveSignals: ['positives', 'positive', 'upsides'],
  concernSignals: ['concerns', 'negatives', 'risks'],
  polarizationRisk: ['polarization', 'polarizationLevel'],
  polarizationExplanation: ['polarizationReason', 'polarizationNotes'],
  perspectives: ['audiencePerspectives', 'segments'],
  findings: ['issues', 'violations', 'results'],
  category: ['type', 'kind'],
  severity: ['level', 'risk', 'priority'],
  confidence: ['certainty', 'score'],
  uncertainty: ['uncertaintyNote', 'caveat'],
  requiresHumanReview: ['humanReview', 'needsReview', 'humanReviewRecommended'],
  evidenceRequired: ['needsEvidence', 'requiresEvidence'],
  evidenceStatus: ['evidenceState', 'status'],
  suggestedAction: ['action', 'recommendation', 'fix'],
  citedSourceIds: ['sources', 'sourceIds', 'citations'],
  affectedContent: ['quote', 'snippet', 'content'],
  contextualSignals: ['signals', 'culturalSignals'],
  potentialInterpretation: ['interpretation', 'possibleInterpretation'],
  humanReviewRecommended: ['requiresHumanReview', 'needsReview'],
  affectedContext: ['affectedContent', 'context'],
};

function applyFieldAliases(obj: Record<string, unknown>, shapeKeys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = { ...obj };
  for (const key of shapeKeys) {
    if (key in out && out[key] !== undefined) continue;
    const aliases = FIELD_ALIASES[key] ?? [];
    for (const alias of aliases) {
      if (alias in out && out[alias] !== undefined) {
        out[key] = out[alias];
        break;
      }
    }
  }
  // If title still missing but description exists, copy it.
  if (!('title' in out) && typeof out.description === 'string') out.title = out.description;
  if (!('explanation' in out) && typeof out.description === 'string') out.explanation = out.description;
  return out;
}

function skeletonFromZod(schema: ZodTypeAny, depth = 0): unknown {
  if (depth > 6) return null;
  const def = schema._def as ZodDef;
  const typeName = def.typeName ?? '';
  if (typeName === 'ZodOptional' || typeName === 'ZodNullable' || typeName === 'ZodDefault' || typeName === 'ZodEffects') {
    return skeletonFromZod(def.innerType!, depth);
  }
  if (typeName === 'ZodEnum' && def.values?.length) return def.values[0];
  if (typeName === 'ZodString') return '';
  if (typeName === 'ZodNumber') return 0;
  if (typeName === 'ZodBoolean') return false;
  if (typeName === 'ZodArray' && def.type) return [skeletonFromZod(def.type, depth + 1)];
  if (typeName === 'ZodObject' && def.shape) {
    const shape = def.shape();
    const obj: Record<string, unknown> = {};
    for (const [k, child] of Object.entries(shape)) {
      obj[k] = skeletonFromZod(child, depth + 1);
    }
    return obj;
  }
  return null;
}

export function describeSchemaShapeForPrompt(schema: ZodTypeAny): string {
  const enums = describeEnumsForPrompt(schema);
  const skeleton = skeletonFromZod(schema);
  return (
    enums +
    `
Required JSON shape example (replace values; keep keys exact):\n` +
    JSON.stringify(skeleton, null, 2) +
    `
`
  );
}

export function parseCoercedJson<T>(
  raw: string,
  schema: ZodType<T, ZodTypeDef, unknown>,
): { ok: true; data: T } | { ok: false; issues: unknown; rawSlice: string } {
  let obj: unknown;
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    obj = JSON.parse(cleaned);
  } catch {
    return { ok: false, issues: [{ message: 'non-json' }], rawSlice: raw.slice(0, 400) };
  }
  const coerced = coerceValue(obj, schema as ZodTypeAny);
  const parsed = schema.safeParse(coerced);
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, issues: parsed.error.issues, rawSlice: raw.slice(0, 600) };
}
