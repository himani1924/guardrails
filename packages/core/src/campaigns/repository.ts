import { and, asc, desc, eq, inArray, notInArray } from 'drizzle-orm';

import { getDb } from '../db/client';
import {
  audienceSegments,
  campaignAssetFiles,
  campaignAssets,
  campaignAudienceSegments,
  campaigns,
} from '../db/schema';
import { NotFoundError, ValidationError } from '../errors';
import type { Campaign, CampaignAsset } from '../types/campaign';
import type { CampaignStatus } from '../types/enums';

import type { CampaignAssetInput, CreateCampaignInput, UpdateCampaignInput } from './schemas';

type AssetRow = typeof campaignAssets.$inferSelect & { byteSize?: number | null };

/** Asset rows (with stored-file size, never the bytes) in display order. */
function assetQuery(db: ReturnType<typeof getDb>) {
  return db
    .select({
      id: campaignAssets.id,
      campaignId: campaignAssets.campaignId,
      type: campaignAssets.type,
      title: campaignAssets.title,
      description: campaignAssets.description,
      url: campaignAssets.url,
      storagePath: campaignAssets.storagePath,
      mimeType: campaignAssets.mimeType,
      sortOrder: campaignAssets.sortOrder,
      createdAt: campaignAssets.createdAt,
      byteSize: campaignAssetFiles.byteSize,
    })
    .from(campaignAssets)
    .leftJoin(campaignAssetFiles, eq(campaignAssetFiles.assetId, campaignAssets.id));
}

const assetOrder = [asc(campaignAssets.sortOrder), asc(campaignAssets.createdAt), asc(campaignAssets.id)];

function toCampaign(
  row: typeof campaigns.$inferSelect,
  assets: AssetRow[],
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
    applicablePolicyContext: Array.isArray(row.applicablePolicyContext)
      ? (row.applicablePolicyContext as string[])
      : [],
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toCampaignAsset(row: AssetRow): CampaignAsset {
  return {
    id: row.id,
    campaignId: row.campaignId,
    type: row.type,
    title: row.title ?? undefined,
    description: row.description ?? undefined,
    url: row.url ?? undefined,
    storagePath: row.storagePath ?? undefined,
    mimeType: row.mimeType ?? undefined,
    byteSize: row.byteSize ?? undefined,
    hasFile: row.byteSize != null,
    sortOrder: row.sortOrder,
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
    assetQuery(db).where(inArray(campaignAssets.campaignId, ids)).orderBy(...assetOrder),
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

  const assetsByCampaign = new Map<string, AssetRow[]>();
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
    assetQuery(db).where(eq(campaignAssets.campaignId, id)).orderBy(...assetOrder),
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

    await insertAssets(tx, inserted.id, input.assets.map((a, i) => ({ a, sortOrder: i })));

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
      // Keep assets referenced by id (so their stored image bytes and old
      // runs' thumbnails stay valid), delete the rest, insert new ones.
      const existing = await tx
        .select({ id: campaignAssets.id })
        .from(campaignAssets)
        .where(eq(campaignAssets.campaignId, id));
      const existingIds = new Set(existing.map((r) => r.id));
      const keptIds = input.assets
        .map((a) => a.id)
        .filter((x): x is string => !!x && existingIds.has(x));
      await tx
        .delete(campaignAssets)
        .where(
          keptIds.length > 0
            ? and(eq(campaignAssets.campaignId, id), notInArray(campaignAssets.id, keptIds))
            : eq(campaignAssets.campaignId, id),
        );
      const fresh: Array<{ a: CampaignAssetInput; sortOrder: number }> = [];
      for (const [i, a] of input.assets.entries()) {
        if (a.id && existingIds.has(a.id)) {
          await tx
            .update(campaignAssets)
            .set({ title: a.title ?? null, description: a.description ?? null, sortOrder: i })
            .where(eq(campaignAssets.id, a.id));
        } else {
          fresh.push({ a, sortOrder: i });
        }
      }
      await insertAssets(tx, id, fresh);
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

type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

async function insertAssets(
  tx: Tx,
  campaignId: string,
  items: Array<{ a: CampaignAssetInput; sortOrder: number }>,
): Promise<void> {
  for (const { a, sortOrder } of items) {
    const [row] = await tx
      .insert(campaignAssets)
      .values({
        campaignId,
        type: a.type,
        title: a.title,
        description: a.description,
        url: a.url,
        storagePath: a.storagePath,
        mimeType: a.mimeType,
        sortOrder,
      })
      .returning({ id: campaignAssets.id });
    if (row && a.dataBase64) {
      const data = Buffer.from(a.dataBase64, 'base64');
      await tx.insert(campaignAssetFiles).values({
        assetId: row.id,
        mimeType: a.mimeType ?? 'application/octet-stream',
        byteSize: data.length,
        data,
      });
    }
  }
}

/** Stored bytes of one asset (for the image endpoint), or null. */
export async function getCampaignAssetFile(
  assetId: string,
): Promise<{ mimeType: string; byteSize: number; data: Buffer } | null> {
  const db = getDb();
  const [row] = await db
    .select({
      mimeType: campaignAssetFiles.mimeType,
      byteSize: campaignAssetFiles.byteSize,
      data: campaignAssetFiles.data,
    })
    .from(campaignAssetFiles)
    .where(eq(campaignAssetFiles.assetId, assetId));
  return row ?? null;
}

/** Image assets of a campaign with their bytes, in "image N" order. */
export async function listCampaignImages(campaignId: string): Promise<
  Array<{ assetId: string; title?: string; mimeType: string; data: Buffer | null }>
> {
  const db = getDb();
  const rows = await db
    .select({
      assetId: campaignAssets.id,
      title: campaignAssets.title,
      assetMime: campaignAssets.mimeType,
      fileMime: campaignAssetFiles.mimeType,
      data: campaignAssetFiles.data,
    })
    .from(campaignAssets)
    .leftJoin(campaignAssetFiles, eq(campaignAssetFiles.assetId, campaignAssets.id))
    .where(and(eq(campaignAssets.campaignId, campaignId), eq(campaignAssets.type, 'image')))
    .orderBy(...assetOrder);
  return rows.map((r) => ({
    assetId: r.assetId,
    title: r.title ?? undefined,
    mimeType: r.fileMime ?? r.assetMime ?? 'application/octet-stream',
    data: r.data ?? null,
  }));
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
