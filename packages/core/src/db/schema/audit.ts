import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * Append-only trail. Written by the orchestrator (STEP 15) and the review
 * workflow (STEP 17). Entities are referenced by (type, id) strings rather
 * than FKs so the log can outlive a deleted campaign / run without cascade
 * gymnastics.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorKind: varchar('actor_kind', { length: 20 }).notNull(),
    actorId: varchar('actor_id', { length: 200 }).notNull(),
    actorName: varchar('actor_name', { length: 200 }),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    entityId: varchar('entity_id', { length: 100 }).notNull(),
    summary: text('summary'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_logs_entity_idx').on(t.entityType, t.entityId),
    index('audit_logs_action_idx').on(t.action),
    index('audit_logs_created_at_idx').on(t.createdAt),
  ],
);

export type AuditLogRow = typeof auditLogs.$inferSelect;
export type NewAuditLogRow = typeof auditLogs.$inferInsert;
