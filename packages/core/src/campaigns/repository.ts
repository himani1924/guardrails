import { and, desc, eq, inArray } from 'drizzle-orm';

import { getDb } from '../db/client';
import {
  audienceSegments,
  campaignAssets,
  campaignAudienceSegments,
  campaigns,
} from '../db/schema';
import { NotFoundError, ValidationError } from '../errors';
import type { Campaign, CampaignAsset } from '../types/campaign';
import type { CampaignStatus } from '../types/enums';

import type { CreateCampaignInput, UpdateCampaignInput } from './schemas';

function toCampaign(
  row: typeof campaigns.$inferSelect,
  assets: (typeof campaignAssets.$inferSelect)[],
  segmentKeys: string[],
): Campaign {
  return {
    id: row.id,
    name: row.name,
    copy: row.copy,
    campaignType: row.campaignType,
    platform: row.platform,
    geography: row.geography,
    festivalContext: row.festivalContext ?? undefined,
    audienceSegmentIds: segmentKeys,
    assets: assets.map(toCampaignAsset),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toCampaignAsset(row: typeof campaignAssets.$inferSelect): CampaignAsset {
  return {
    id: row.id,
    campaignId: row.campaignId,
    type: row.type,
    title: row.title ?? undefined,
    description: row.description ?? undefined,
    url: row.url ?? undefined,
    storagePath: row.storagePath ?? undefined,
    mimeType: row.mimeType ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

async function resolveSegmentIdsByKey(keys: string[]): Promise<Map<string, string>> {
  if (keys.length === 0) return new Map();
  const db = getDb();
  const rows = await db
    .select({ id: audienceSegments.id, key: audienceSegments.key })
    .from(audienceSegments)
    .where(inArray(audienceSegments.key, keys));
  const map = new Map(rows.map((r) => [r.key, r.id]));
  const missing = keys.filter((k) => !map.has(k));
  if (missing.length > 0) {
    throw new ValidationError('Unknown audience segment keys', { missing });
  }
  return map;
}

export async function listCampaigns(options?: {
  status?: CampaignStatus;
}): Promise<Campaign[]> {
  const db = getDb();
  const rows = await db.query.campaigns.findMany({
    where: options?.status ? eq(campaigns.status, options.status) : undefined,
    orderBy: desc(campaigns.createdAt),
  });
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const [assetRows, linkRows] = await Promise.all([
    db.select().from(campaignAssets).where(inArray(campaignAssets.campaignId, ids)),
    db
      .select({
        campaignId: campaignAudienceSegments.campaignId,
        key: audienceSegments.key,
      })
      .from(campaignAudienceSegments)
      .innerJoin(
        audienceSegments,
        eq(campaignAudienceSegments.audienceSegmentId, audienceSegments.id),
      )
      .where(inArray(campaignAudienceSegments.campaignId, ids)),
  ]);

  const assetsByCampaign = new Map<string, (typeof campaignAssets.$inferSelect)[]>();
  for (const a of assetRows) {
    const list = assetsByCampaign.get(a.campaignId) ?? [];
    list.push(a);
    assetsByCampaign.set(a.campaignId, list);
  }
  const segmentsByCampaign = new Map<string, string[]>();
  for (const l of linkRows) {
    const list = segmentsByCampaign.get(l.campaignId) ?? [];
    list.push(l.key);
    segmentsByCampaign.set(l.campaignId, list);
  }

  return rows.map((r) =>
    toCampaign(r, assetsByCampaign.get(r.id) ?? [], segmentsByCampaign.get(r.id) ?? []),
  );
}

export async function getCampaignById(id: string): Promise<Campaign> {
  const db = getDb();
  const row = await db.query.campaigns.findFirst({ where: eq(campaigns.id, id) });
  if (!row) throw new NotFoundError('Campaign not found', { id });

  const [assetRows, linkRows] = await Promise.all([
    db.select().from(campaignAssets).where(eq(campaignAssets.campaignId, id)),
    db
      .select({ key: audienceSegments.key })
      .from(campaignAudienceSegments)
      .innerJoin(
        audienceSegments,
        eq(campaignAudienceSegments.audienceSegmentId, audienceSegments.id),
      )
      .where(eq(campaignAudienceSegments.campaignId, id)),
  ]);

  return toCampaign(
    row,
    assetRows,
    linkRows.map((l) => l.key),
  );
}

export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  const db = getDb();
  const segmentMap = await resolveSegmentIdsByKey(input.audienceSegmentKeys);

  const id = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(campaigns)
      .values({
        name: input.name,
        copy: input.copy,
        campaignType: input.campaignType,
        platform: input.platform,
        geography: input.geography,
        festivalContext: input.festivalContext,
        applicablePolicyContext: input.applicablePolicyContext,
        status: 'draft',
      })
      .returning({ id: campaigns.id });
    if (!inserted) throw new Error('Failed to insert campaign');

    if (input.assets.length > 0) {
      await tx.insert(campaignAssets).values(
        input.assets.map((a) => ({
          campaignId: inserted.id,
          type: a.type,
          title: a.title,
          description: a.description,
          url: a.url,
          storagePath: a.storagePath,
          mimeType: a.mimeType,
        })),
      );
    }

    await tx.insert(campaignAudienceSegments).values(
      input.audienceSegmentKeys.map((k) => ({
        campaignId: inserted.id,
        audienceSegmentId: segmentMap.get(k)!,
      })),
    );

    return inserted.id;
  });

  return getCampaignById(id);
}

export async function updateCampaign(
  id: string,
  input: UpdateCampaignInput,
): Promise<Campaign> {
  const db = getDb();
  await getCampaignById(id);

  let segmentMap: Map<string, string> | undefined;
  if (input.audienceSegmentKeys) {
    segmentMap = await resolveSegmentIdsByKey(input.audienceSegmentKeys);
  }

  await db.transaction(async (tx) => {
    const patch: Partial<typeof campaigns.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.name !== undefined) patch.name = input.name;
    if (input.copy !== undefined) patch.copy = input.copy;
    if (input.campaignType !== undefined) patch.campaignType = input.campaignType;
    if (input.platform !== undefined) patch.platform = input.platform;
    if (input.geography !== undefined) patch.geography = input.geography;
    if (input.festivalContext !== undefined) patch.festivalContext = input.festivalContext;
    if (input.applicablePolicyContext !== undefined) {
      patch.applicablePolicyContext = input.applicablePolicyContext;
    }
    if (input.status !== undefined) patch.status = input.status;

    await tx.update(campaigns).set(patch).where(eq(campaigns.id, id));

    if (input.assets !== undefined) {
      await tx.delete(campaignAssets).where(eq(campaignAssets.campaignId, id));
      if (input.assets.length > 0) {
        await tx.insert(campaignAssets).values(
          input.assets.map((a) => ({
            campaignId: id,
            type: a.type,
            title: a.title,
            description: a.description,
            url: a.url,
            storagePath: a.storagePath,
            mimeType: a.mimeType,
          })),
        );
      }
    }

    if (input.audienceSegmentKeys !== undefined && segmentMap) {
      await tx
        .delete(campaignAudienceSegments)
        .where(eq(campaignAudienceSegments.campaignId, id));
      if (input.audienceSegmentKeys.length > 0) {
        await tx.insert(campaignAudienceSegments).values(
          input.audienceSegmentKeys.map((k) => ({
            campaignId: id,
            audienceSegmentId: segmentMap!.get(k)!,
          })),
        );
      }
    }
  });

  return getCampaignById(id);
}

export async function updateCampaignStatus(
  id: string,
  status: CampaignStatus,
): Promise<void> {
  const db = getDb();
  const result = await db
    .update(campaigns)
    .set({ status, updatedAt: new Date() })
    .where(eq(campaigns.id, id))
    .returning({ id: campaigns.id });
  if (result.length === 0) throw new NotFoundError('Campaign not found', { id });
}

export async function deleteCampaign(id: string): Promise<void> {
  const db = getDb();
  const result = await db
    .delete(campaigns)
    .where(eq(campaigns.id, id))
    .returning({ id: campaigns.id });
  if (result.length === 0) throw new NotFoundError('Campaign not found', { id });
}

// used by orchestrator + rule engine
export { and, eq };
