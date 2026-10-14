import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import type { DetectedImageElements } from '../../types/image';

import { analysisRuns } from './analyses';
import { campaignAssets } from './campaigns';

/** Per-run, per-image OCR / description output of the image-extraction step. */
export const imageExtractions = pgTable(
  'image_extractions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    analysisRunId: uuid('analysis_run_id')
      .notNull()
      .references(() => analysisRuns.id, { onDelete: 'cascade' }),
    assetId: uuid('asset_id').references(() => campaignAssets.id, { onDelete: 'set null' }),
    imageIndex: integer('image_index').notNull(),
    title: varchar('title', { length: 200 }),
    mimeType: varchar('mime_type', { length: 100 }),
    status: varchar('status', { length: 20 }).notNull(),
    extractedText: text('extracted_text').notNull().default(''),
    description: text('description').notNull().default(''),
    detectedElements: jsonb('detected_elements').$type<DetectedImageElements>().notNull(),
    possibleConcerns: jsonb('possible_concerns').$type<string[]>().notNull().default([]),
    error: text('error'),
    model: varchar('model', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('image_extractions_analysis_run_id_idx').on(t.analysisRunId)],
);

export type ImageExtractionRow = typeof imageExtractions.$inferSelect;
