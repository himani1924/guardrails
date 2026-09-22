import { errors } from '@guardrail/core';

/**
 * A tiny prompt-injection guard used by API routes that accept
 * user-supplied campaign copy before it is forwarded to an LLM.
 *
 * This is intentionally narrow: reject strings that look like they are
 * trying to override the system prompt or exfiltrate sources. It is a
 * seatbelt, not a security boundary — the primary defence is the
 * structured-output contract and the `EvidenceStatus` enum.
 */
const RED_FLAGS: RegExp[] = [
  /\bignore (all|previous|the) (system|prior|previous)? ?instructions?\b/i,
  /\bdisregard (the|all|your) (system|previous) prompt\b/i,
  /\bpretend (you are|to be) (an? )?(admin|developer|system)\b/i,
  /\byou are now\b/i,
  /\brepeat (the )?(system|hidden) prompt\b/i,
];

const MAX_COPY_LENGTH = 10_000;

export function guardCampaignInput(input: { name: string; copy: string }): void {
  if (input.copy.length > MAX_COPY_LENGTH) {
    throw new errors.ValidationError('Campaign copy is too long', {
      max: MAX_COPY_LENGTH,
    });
  }
  const joined = `${input.name}\n${input.copy}`;
  for (const rx of RED_FLAGS) {
    if (rx.test(joined)) {
      throw new errors.ValidationError(
        'Campaign copy looks like a prompt-injection attempt. Please rephrase.',
        { pattern: rx.source },
      );
    }
  }
}
