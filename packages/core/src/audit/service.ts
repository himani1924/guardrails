import { getDb } from '../db/client';
import { auditLogs } from '../db/schema';
import { getLogger } from '../logging';

const log = getLogger({ component: 'audit' });

export interface RecordAuditEventInput {
  actor:
    | { kind: 'system'; component: string }
    | { kind: 'agent'; agent: string; model?: string }
    | { kind: 'user'; userId: string; name?: string };
  action: string;
  entityType: string;
  entityId: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export async function recordAuditEvent(evt: RecordAuditEventInput): Promise<void> {
  const db = getDb();
  const actorId =
    evt.actor.kind === 'system'
      ? evt.actor.component
      : evt.actor.kind === 'agent'
        ? evt.actor.agent
        : evt.actor.userId;
  const actorName = evt.actor.kind === 'user' ? evt.actor.name : undefined;
  const metadata = { ...(evt.metadata ?? {}) };
  if (evt.actor.kind === 'agent' && evt.actor.model) metadata.model = evt.actor.model;

  await db.insert(auditLogs).values({
    actorKind: evt.actor.kind,
    actorId,
    actorName,
    action: evt.action,
    entityType: evt.entityType,
    entityId: evt.entityId,
    summary: evt.summary,
    metadata,
  });

  log.debug({ action: evt.action, entityType: evt.entityType, entityId: evt.entityId }, 'audit');
}
