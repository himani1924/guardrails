'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { types } from '@guardrail/core';

import { Spinner } from './spinner';
import { Alert, Card } from './ui';

const CAMPAIGN_TYPES = [
  'promotional',
  'brand',
  'product_launch',
  'seasonal',
  'influencer',
  'other',
] as const;
const PLATFORMS = [
  'instagram',
  'facebook',
  'tiktok',
  'twitter',
  'linkedin',
  'youtube',
  'web',
  'email',
  'print',
  'tv',
  'other',
] as const;

type Segment = types.AudienceSegment;

/**
 * Draft persistence (new-campaign form only). Edit forms are not drafted, so a
 * stale local draft can never silently overwrite server data.
 */
const DRAFT_KEY = 'guardrail:new-campaign-draft:v1';
const DRAFT_DEBOUNCE_MS = 500;

interface CampaignDraft {
  name: string;
  copy: string;
  campaignType: string;
  platform: string;
  country: string;
  region: string;
  festivalName: string;
  festivalKey: string;
  policyContext: string;
  selectedSegments: string[];
  selectedPolicyKeys: string[];
  savedAt: string;
}

function readDraft(): CampaignDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<CampaignDraft>;
    return typeof d === 'object' && d !== null ? (d as CampaignDraft) : null;
  } catch {
    return null;
  }
}

function clearStoredDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // storage unavailable (private mode etc.): nothing to clear
  }
}

interface CampaignPayload {
  name: string;
  copy: string;
  campaignType: (typeof CAMPAIGN_TYPES)[number];
  platform: (typeof PLATFORMS)[number];
  geography: { country: string; region?: string };
  festivalContext?: { key: string; name: string; description?: string };
  applicablePolicyContext: string[];
  audienceSegmentKeys: string[];
  assets: Array<{
    type: 'text' | 'image' | 'video' | 'audio' | 'url';
    title?: string;
    description?: string;
    url?: string;
  }>;
}

export function CampaignForm({
  mode,
  segments,
  initialId,
  initial,
}: {
  mode: 'create' | 'edit';
  segments: Segment[];
  initialId?: string;
  initial?: Partial<CampaignPayload> & { name?: string; copy?: string };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? '');
  const [copy, setCopy] = useState(initial?.copy ?? '');
  const [campaignType, setCampaignType] = useState<CampaignPayload['campaignType']>(
    initial?.campaignType ?? 'promotional',
  );
  const [platform, setPlatform] = useState<CampaignPayload['platform']>(
    initial?.platform ?? 'instagram',
  );
  const [country, setCountry] = useState(initial?.geography?.country ?? 'IN');
  const [region, setRegion] = useState(initial?.geography?.region ?? '');
  const [festivalName, setFestivalName] = useState(
    initial?.festivalContext?.name ?? '',
  );
  const [festivalKey, setFestivalKey] = useState(initial?.festivalContext?.key ?? '');
  const [policyContext, setPolicyContext] = useState<string>(
    (initial?.applicablePolicyContext ?? []).join(', '),
  );
  const [selectedSegments, setSelectedSegments] = useState<string[]>(
    initial?.audienceSegmentKeys ?? [],
  );
  // Assets field is hidden for now (see the commented-out "Campaign creative assets"
  // field below). To restore: bring back an `assetText` state seeded from
  // initial.assets and send [{ type: 'text', title: 'Primary caption', description: assetText }].
  const [knowledgeDocs, setKnowledgeDocs] = useState<
    Array<{ id: string; title: string; sourceType: string; category?: string | null }>
  >([]);
  const [selectedPolicyKeys, setSelectedPolicyKeys] = useState<string[]>(
    initial?.applicablePolicyContext ?? [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftEnabled = mode === 'create';
  // Restore happens after mount (localStorage is client-only), so SSR and the
  // first client render match and there is no hydration mismatch.
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [policiesLoading, setPoliciesLoading] = useState(false);
  const skipNextSave = useRef(false);

  useEffect(() => {
    if (!draftEnabled) return;
    const d = readDraft();
    if (d) {
      const isType = (v: string): v is CampaignPayload['campaignType'] =>
        (CAMPAIGN_TYPES as readonly string[]).includes(v);
      const isPlatform = (v: string): v is CampaignPayload['platform'] =>
        (PLATFORMS as readonly string[]).includes(v);
      setName(String(d.name ?? ''));
      setCopy(String(d.copy ?? ''));
      if (isType(String(d.campaignType))) setCampaignType(d.campaignType as CampaignPayload['campaignType']);
      if (isPlatform(String(d.platform))) setPlatform(d.platform as CampaignPayload['platform']);
      setCountry(String(d.country ?? 'IN'));
      setRegion(String(d.region ?? ''));
      setFestivalName(String(d.festivalName ?? ''));
      setFestivalKey(String(d.festivalKey ?? ''));
      setPolicyContext(String(d.policyContext ?? ''));
      setSelectedSegments(Array.isArray(d.selectedSegments) ? d.selectedSegments.map(String) : []);
      setSelectedPolicyKeys(Array.isArray(d.selectedPolicyKeys) ? d.selectedPolicyKeys.map(String) : []);
      setDraftSavedAt(d.savedAt ?? null);
      setDraftRestored(true);
      skipNextSave.current = true;
    }
    setDraftLoaded(true);
  }, [draftEnabled]);

  // Debounced autosave of the draft.
  useEffect(() => {
    if (!draftEnabled || !draftLoaded) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const empty =
      !name && !copy && !region && !festivalName && !policyContext &&
      selectedSegments.length === 0 && selectedPolicyKeys.length === 0;
    const t = window.setTimeout(() => {
      if (empty) {
        clearStoredDraft();
        setDraftSavedAt(null);
        return;
      }
      const draft: CampaignDraft = {
        name, copy, campaignType, platform, country, region, festivalName, festivalKey,
        policyContext, selectedSegments, selectedPolicyKeys,
        savedAt: new Date().toISOString(),
      };
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        setDraftSavedAt(draft.savedAt);
      } catch {
        // storage full / unavailable: keep working without a draft
      }
    }, DRAFT_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [
    draftEnabled, draftLoaded, name, copy, campaignType, platform, country, region,
    festivalName, festivalKey, policyContext, selectedSegments, selectedPolicyKeys,
  ]);

  function clearDraft() {
    clearStoredDraft();
    skipNextSave.current = true;
    setName('');
    setCopy('');
    setCampaignType('promotional');
    setPlatform('instagram');
    setCountry('IN');
    setRegion('');
    setFestivalName('');
    setFestivalKey('');
    setPolicyContext('');
    setSelectedSegments([]);
    setSelectedPolicyKeys([]);
    setDraftSavedAt(null);
    setDraftRestored(false);
  }

  const loadPolicies = useCallback(async () => {
    setPoliciesLoading(true);
    try {
      const body = await fetch('/api/knowledge', { cache: 'no-store' }).then((r) => r.json());
      if (Array.isArray(body.documents)) {
        setKnowledgeDocs(
          body.documents.map(
            (d: { id: string; title: string; sourceType: string; category?: string | null }) => ({
              id: d.id,
              title: d.title,
              sourceType: d.sourceType,
              category: d.category,
            }),
          ),
        );
      }
    } catch {
      // keep the current list if the refresh fails
    } finally {
      setPoliciesLoading(false);
    }
  }, []);

  // Load policies on mount and whenever the tab regains focus, so documents
  // uploaded in another tab show up without leaving this form.
  useEffect(() => {
    void loadPolicies();
    const onFocus = () => void loadPolicies();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadPolicies();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadPolicies]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload: CampaignPayload = {
      name,
      copy,
      campaignType,
      platform,
      geography: { country, ...(region ? { region } : {}) },
      festivalContext:
        festivalName && festivalKey
          ? { key: festivalKey, name: festivalName }
          : undefined,
      applicablePolicyContext: Array.from(
        new Set([
          ...selectedPolicyKeys,
          ...policyContext
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        ]),
      ),
      audienceSegmentKeys: selectedSegments,
      // Assets UI hidden: new campaigns send none; edits resend the existing
      // assets unchanged so saving the form never deletes them.
      assets:
        mode === 'edit'
          ? (initial?.assets ?? []).map((a) => ({
              type: a.type,
              ...(a.title ? { title: a.title } : {}),
              ...(a.description ? { description: a.description } : {}),
              ...(a.url ? { url: a.url } : {}),
            }))
          : [],
    };

    try {
      const url =
        mode === 'create' ? '/api/campaigns' : `/api/campaigns/${initialId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message ?? 'Request failed');
      }
      const id = body.campaign?.id ?? initialId;
      if (draftEnabled) {
        skipNextSave.current = true;
        clearStoredDraft();
      }
      router.push(`/campaigns/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {draftEnabled && draftRestored ? (
        <Alert tone="info" title="Draft restored">
          Your unsaved campaign was restored from this browser. Use <strong>Clear draft</strong> to start over.
        </Alert>
      ) : null}
      {error ? (
        <Alert tone="error" title="Could not save the campaign">
          {error}
        </Alert>
      ) : null}

      <Card>
        <FormSection
          step={1}
          title="Basics"
          description="Name, format and where the campaign will run."
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={3}
              maxLength={200}
              className="input"
            />
          </Field>
          <Field label="Campaign type">
            <select
              value={campaignType}
              onChange={(e) => setCampaignType(e.target.value as CampaignPayload['campaignType'])}
              className="input"
            >
              {CAMPAIGN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Platform">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as CampaignPayload['platform'])}
              className="input"
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Country (ISO)">
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              required
              minLength={2}
              maxLength={3}
              className="input"
            />
          </Field>
          <Field label="Region (optional)">
            <input value={region} onChange={(e) => setRegion(e.target.value)} className="input" />
          </Field>
          <Field label="Festival name (optional)">
            <input
              value={festivalName}
              onChange={(e) => {
                setFestivalName(e.target.value);
                if (!festivalKey) setFestivalKey(e.target.value.toLowerCase().replace(/\s+/g, '_'));
              }}
              className="input"
            />
          </Field>
        </div>
      </Card>

      <Card>
        <FormSection
          step={2}
          title="Content"
          description="The copy is what the rules and AI agents analyse."
        />
        <div className="space-y-5">
        <Field label="Campaign copy">
          <textarea
            value={copy}
            onChange={(e) => setCopy(e.target.value)}
            required
            minLength={1}
            maxLength={10000}
            rows={6}
            className="input font-mono"
          />
        </Field>
        {/* Hidden for now: "Campaign creative assets (optional — captions, image notes, URLs)"
            textarea bound to assetText. Restore together with the assetText state above. */}
        </div>
      </Card>

      <Card>
        <FormSection
          step={3}
          title="Policy context & audience"
          description="Choose the policies that apply and the audience personas to simulate."
        />
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="field-label !mb-0">Policies & compliance documents</span>
            <span className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void loadPolicies()}
                disabled={policiesLoading}
                className="link text-xs disabled:opacity-60"
              >
                {policiesLoading ? 'Refreshing…' : 'Refresh policies'}
              </button>
              <a href="/knowledge" target="_blank" rel="noopener noreferrer" className="link text-xs">
                Upload policy in new tab ↗
              </a>
            </span>
          </div>
          {knowledgeDocs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-700 bg-surface-raised p-4 text-sm text-ink-muted">
              No documents in the knowledge base yet. Upload one in a new tab; this list refreshes when you come back to this tab.
            </p>
          ) : (
            <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
              {knowledgeDocs.map((d) => {
                const key = (d.category && d.category.trim()) || d.id;
                const checked = selectedPolicyKeys.includes(key);
                return (
                  <label
                    key={d.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition-colors ${
                      checked
                        ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500'
                        : 'border-line bg-surface hover:border-slate-600 hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-brand-600"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedPolicyKeys((prev) =>
                          e.target.checked
                            ? [...prev, key]
                            : prev.filter((k) => k !== key),
                        );
                      }}
                    />
                    <span>
                      <span className="block font-medium text-ink">{d.title}</span>
                      <span className="mt-0.5 block text-xs text-ink-subtle">
                        {d.sourceType}
                        {d.category ? ` · ${d.category}` : ''}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <div className="space-y-5">
        <Field label="Extra policy keys (comma-separated, optional)">
          <input
            value={policyContext}
            onChange={(e) => setPolicyContext(e.target.value)}
            className="input"
            placeholder="internal_marketing_policy, brand_guideline"
          />
        </Field>
        <Field label="Audience segments">
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {segments.map((s) => {
              const checked = selectedSegments.includes(s.key);
              return (
                <label
                  key={s.id}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition-colors ${
                    checked
                      ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500'
                      : 'border-line bg-surface hover:border-slate-600 hover:bg-white/5'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-brand-600"
                    checked={checked}
                    onChange={(e) => {
                      setSelectedSegments((prev) =>
                        e.target.checked
                          ? [...prev, s.key]
                          : prev.filter((k) => k !== s.key),
                      );
                    }}
                  />
                  <span>
                    <span className="block font-medium text-ink">{s.name}</span>
                    <span className="mt-0.5 block text-xs text-ink-subtle">{s.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </Field>
        </div>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t border-line bg-canvas/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:bg-surface sm:px-5">
        <span className="mr-auto hidden items-center gap-3 text-xs text-ink-subtle sm:flex">
          {draftEnabled ? (
            <>
              <span aria-live="polite">
                {draftSavedAt
                  ? `Draft saved · ${new Date(draftSavedAt).toLocaleTimeString()}`
                  : 'Changes are saved as a draft in this browser'}
              </span>
              {draftSavedAt ? (
                <button type="button" onClick={clearDraft} disabled={busy} className="link">
                  Clear draft
                </button>
              ) : null}
            </>
          ) : (
            'Saved campaigns can be analysed from their detail page.'
          )}
        </span>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={busy}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? <Spinner /> : null}
          {busy ? 'Saving…' : mode === 'create' ? 'Create campaign' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function FormSection({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3 border-b border-line pb-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-sm font-semibold text-brand-300">
        {step}
      </span>
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
      </div>
    </div>
  );
}
