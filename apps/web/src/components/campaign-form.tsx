'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { types } from '@guardrail/core';

import { Card } from './ui';

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
  const [assetText, setAssetText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      applicablePolicyContext: policyContext
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      audienceSegmentKeys: selectedSegments,
      assets: assetText
        ? [{ type: 'text', title: 'Primary caption', description: assetText }]
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
      {error ? (
        <Card className="border-red-800 bg-red-950/50 text-sm text-red-100">
          {error}
        </Card>
      ) : null}

      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
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
        <Field label="Primary caption / asset description (optional)">
          <textarea
            value={assetText}
            onChange={(e) => setAssetText(e.target.value)}
            rows={3}
            className="input"
          />
        </Field>
      </Card>

      <Card>
        <Field label="Applicable policy context (comma-separated keys)">
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
                  className={`flex cursor-pointer items-start gap-2 rounded border p-2 text-sm ${
                    checked
                      ? 'border-sky-500 bg-sky-900/30'
                      : 'border-surface-border bg-surface-soft'
                  }`}
                >
                  <input
                    type="checkbox"
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
                    <span className="block font-medium text-slate-100">{s.name}</span>
                    <span className="block text-xs text-slate-400">{s.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </Field>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {busy ? 'Saving…' : mode === 'create' ? 'Create campaign' : 'Save changes'}
        </button>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 6px;
          border: 1px solid rgb(31 41 55);
          background: rgb(17 24 39);
          padding: 0.5rem 0.75rem;
          color: rgb(241 245 249);
          font-size: 0.875rem;
        }
        .input:focus {
          outline: 2px solid rgb(56 189 248);
          outline-offset: -1px;
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-300">{label}</span>
      {children}
    </label>
  );
}
