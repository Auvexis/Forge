import type Database from "better-sqlite3";
import type {
  AgentMessage,
  AgentMessagePart,
  AgentMessageRole,
  AgentMessageWithParts,
  AgentSession,
  AgentSessionSnapshot,
  AgentSessionState,
  AgentTurn,
  AgentTurnState,
} from "./agent-session-contracts.ts";

export interface AgentMessagePage {
  items: AgentMessageWithParts[];
  nextCursor: number | null;
}

export class AgentSessionRepository {
  constructor(
    private readonly db: Database.Database,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  createSession(input: {
    id: string;
    profileId: string;
    workflowId: string;
    triggerNodeId: string;
    title: string;
  }): AgentSession {
    const now = this.now();
    this.db.prepare(`
      INSERT INTO agent_sessions
        (id, profile_id, workflow_id, trigger_node_id, title, state, revision, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', 1, ?, ?)
    `).run(
      input.id,
      input.profileId,
      input.workflowId,
      input.triggerNodeId,
      input.title,
      now,
      now,
    );
    return this.requireSession(input.profileId, input.id);
  }

  getSession(profileId: string, sessionId: string): AgentSession | null {
    const row = this.db.prepare(`
      SELECT * FROM agent_sessions WHERE profile_id = ? AND id = ?
    `).get(profileId, sessionId) as SessionRow | undefined;
    return row ? mapSession(row) : null;
  }

  createTurn(input: {
    id: string;
    profileId: string;
    sessionId: string;
    runId?: string;
    state?: AgentTurnState;
    expectedRevision: number;
  }): AgentTurn {
    return this.transactionalMutation(
      input.profileId,
      input.sessionId,
      input.expectedRevision,
      () => {
        const now = this.now();
        const sequence = this.nextSequence("agent_session_turns", input.sessionId);
        this.db.prepare(`
          INSERT INTO agent_session_turns
            (id, session_id, run_id, state, sequence, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          input.id,
          input.sessionId,
          input.runId ?? null,
          input.state ?? "queued",
          sequence,
          now,
          now,
        );
        return this.requireTurn(input.sessionId, input.id);
      },
    );
  }

  updateTurn(input: {
    profileId: string;
    sessionId: string;
    turnId: string;
    state: AgentTurnState;
    expectedRevision: number;
  }): AgentTurn {
    return this.transactionalMutation(
      input.profileId,
      input.sessionId,
      input.expectedRevision,
      () => {
        const now = this.now();
        const completedAt = isTerminalTurn(input.state) ? now : null;
        const result = this.db.prepare(`
          UPDATE agent_session_turns
          SET state = ?, updated_at = ?, completed_at = ?
          WHERE session_id = ? AND id = ?
        `).run(input.state, now, completedAt, input.sessionId, input.turnId);
        if (result.changes !== 1) throw new Error(`Agent turn not found: ${input.turnId}`);
        return this.requireTurn(input.sessionId, input.turnId);
      },
    );
  }

  appendMessage(input: {
    id: string;
    profileId: string;
    sessionId: string;
    turnId: string;
    role: AgentMessageRole;
    expectedRevision: number;
  }): AgentMessage {
    return this.transactionalMutation(
      input.profileId,
      input.sessionId,
      input.expectedRevision,
      () => {
        this.requireTurn(input.sessionId, input.turnId);
        const sequence = this.nextSequence("agent_session_messages", input.sessionId);
        this.db.prepare(`
          INSERT INTO agent_session_messages
            (id, session_id, turn_id, role, sequence, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(input.id, input.sessionId, input.turnId, input.role, sequence, this.now());
        return this.requireMessage(input.sessionId, input.id);
      },
    );
  }

  appendPart(input: {
    part: AgentMessagePart;
    profileId: string;
    expectedRevision: number;
  }): AgentMessagePart {
    const { part } = input;
    return this.transactionalMutation(
      input.profileId,
      part.sessionId,
      input.expectedRevision,
      () => {
        const message = this.requireMessage(part.sessionId, part.messageId);
        if (message.turnId !== part.turnId) throw new Error("Agent part turn does not match its message");
        const sequence = this.nextPartSequence(part.messageId);
        if (part.sequence !== sequence) throw new Error(`Expected agent part sequence ${sequence}`);
        this.db.prepare(`
          INSERT INTO agent_message_parts
            (id, session_id, turn_id, message_id, type, sequence, data_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          part.id,
          part.sessionId,
          part.turnId,
          part.messageId,
          part.type,
          part.sequence,
          JSON.stringify(partData(part)),
          part.createdAt,
          part.updatedAt,
        );
        return this.requirePart(part.sessionId, part.id);
      },
    );
  }

  replacePart(input: {
    part: AgentMessagePart;
    profileId: string;
    expectedRevision: number;
  }): AgentMessagePart {
    const { part } = input;
    return this.transactionalMutation(
      input.profileId,
      part.sessionId,
      input.expectedRevision,
      () => {
        const current = this.requirePart(part.sessionId, part.id);
        if (
          current.type !== part.type ||
          current.messageId !== part.messageId ||
          current.turnId !== part.turnId ||
          current.sequence !== part.sequence
        ) {
          throw new Error("Agent part identity cannot be changed");
        }
        const result = this.db.prepare(`
          UPDATE agent_message_parts
          SET data_json = ?, updated_at = ?
          WHERE session_id = ? AND id = ?
        `).run(JSON.stringify(partData(part)), part.updatedAt, part.sessionId, part.id);
        if (result.changes !== 1) throw new Error(`Agent part not found: ${part.id}`);
        return this.requirePart(part.sessionId, part.id);
      },
    );
  }

  pageMessages(input: {
    profileId: string;
    sessionId: string;
    limit?: number;
    afterSequence?: number;
  }): AgentMessagePage {
    this.requireSession(input.profileId, input.sessionId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const rows = this.db.prepare(`
      SELECT * FROM agent_session_messages
      WHERE session_id = ? AND sequence > ?
      ORDER BY sequence ASC
      LIMIT ?
    `).all(input.sessionId, input.afterSequence ?? 0, limit + 1) as MessageRow[];
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: this.hydrateMessages(pageRows),
      nextCursor: hasMore ? pageRows.at(-1)!.sequence : null,
    };
  }

  getSnapshot(input: {
    profileId: string;
    sessionId: string;
    messageLimit?: number;
    afterSequence?: number;
  }): AgentSessionSnapshot {
    const session = this.requireSession(input.profileId, input.sessionId);
    const activeTurnRow = this.db.prepare(`
      SELECT * FROM agent_session_turns
      WHERE session_id = ? AND state IN ('queued', 'running', 'waiting-user', 'waiting-approval')
      ORDER BY sequence DESC LIMIT 1
    `).get(input.sessionId) as TurnRow | undefined;
    const messages = this.pageMessages({
      ...input,
      limit: input.messageLimit,
    }).items;
    const pendingInteraction = messages
      .flatMap((entry) => entry.parts)
      .find((part) => part.type === "interaction" && part.state === "pending") ?? null;
    return {
      session,
      activeTurn: activeTurnRow ? mapTurn(activeTurnRow) : null,
      messages,
      pendingInteraction: pendingInteraction?.type === "interaction" ? pendingInteraction : null,
      revision: session.revision,
    };
  }

  private transactionalMutation<T>(
    profileId: string,
    sessionId: string,
    expectedRevision: number,
    mutation: () => T,
  ): T {
    return this.db.transaction(() => {
      const session = this.requireSession(profileId, sessionId);
      if (session.revision !== expectedRevision) {
        throw new Error(`Agent session revision conflict: expected ${expectedRevision}, received ${session.revision}`);
      }
      const value = mutation();
      const result = this.db.prepare(`
        UPDATE agent_sessions
        SET revision = revision + 1, updated_at = ?
        WHERE profile_id = ? AND id = ? AND revision = ?
      `).run(this.now(), profileId, sessionId, expectedRevision);
      if (result.changes !== 1) throw new Error("Agent session revision conflict");
      return value;
    })();
  }

  private hydrateMessages(rows: MessageRow[]): AgentMessageWithParts[] {
    if (rows.length === 0) return [];
    const placeholders = rows.map(() => "?").join(",");
    const parts = this.db.prepare(`
      SELECT * FROM agent_message_parts
      WHERE message_id IN (${placeholders})
      ORDER BY message_id, sequence
    `).all(...rows.map((row) => row.id)) as PartRow[];
    const byMessage = new Map<string, AgentMessagePart[]>();
    for (const row of parts) {
      const list = byMessage.get(row.message_id) ?? [];
      list.push(mapPart(row));
      byMessage.set(row.message_id, list);
    }
    return rows.map((row) => ({
      message: mapMessage(row),
      parts: byMessage.get(row.id) ?? [],
    }));
  }

  private nextSequence(table: "agent_session_turns" | "agent_session_messages", sessionId: string): number {
    const row = this.db.prepare(`
      SELECT COALESCE(MAX(sequence), 0) + 1 AS sequence FROM ${table} WHERE session_id = ?
    `).get(sessionId) as { sequence: number };
    return row.sequence;
  }

  private nextPartSequence(messageId: string): number {
    const row = this.db.prepare(`
      SELECT COALESCE(MAX(sequence), 0) + 1 AS sequence
      FROM agent_message_parts WHERE message_id = ?
    `).get(messageId) as { sequence: number };
    return row.sequence;
  }

  private requireSession(profileId: string, sessionId: string): AgentSession {
    const session = this.getSession(profileId, sessionId);
    if (!session) throw new Error(`Agent session not found: ${sessionId}`);
    return session;
  }

  private requireTurn(sessionId: string, turnId: string): AgentTurn {
    const row = this.db.prepare(`
      SELECT * FROM agent_session_turns WHERE session_id = ? AND id = ?
    `).get(sessionId, turnId) as TurnRow | undefined;
    if (!row) throw new Error(`Agent turn not found: ${turnId}`);
    return mapTurn(row);
  }

  private requireMessage(sessionId: string, messageId: string): AgentMessage {
    const row = this.db.prepare(`
      SELECT * FROM agent_session_messages WHERE session_id = ? AND id = ?
    `).get(sessionId, messageId) as MessageRow | undefined;
    if (!row) throw new Error(`Agent message not found: ${messageId}`);
    return mapMessage(row);
  }

  private requirePart(sessionId: string, partId: string): AgentMessagePart {
    const row = this.db.prepare(`
      SELECT * FROM agent_message_parts WHERE session_id = ? AND id = ?
    `).get(sessionId, partId) as PartRow | undefined;
    if (!row) throw new Error(`Agent part not found: ${partId}`);
    return mapPart(row);
  }
}

interface SessionRow {
  id: string;
  profile_id: string;
  workflow_id: string;
  trigger_node_id: string;
  title: string;
  state: AgentSessionState;
  revision: number;
  created_at: string;
  updated_at: string;
}

interface TurnRow {
  id: string;
  session_id: string;
  run_id: string | null;
  state: AgentTurnState;
  sequence: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface MessageRow {
  id: string;
  session_id: string;
  turn_id: string;
  role: AgentMessageRole;
  sequence: number;
  created_at: string;
  completed_at: string | null;
}

interface PartRow {
  id: string;
  session_id: string;
  turn_id: string;
  message_id: string;
  type: AgentMessagePart["type"];
  sequence: number;
  data_json: string;
  created_at: string;
  updated_at: string;
}

function mapSession(row: SessionRow): AgentSession {
  return {
    id: row.id,
    profileId: row.profile_id,
    workflowId: row.workflow_id,
    triggerNodeId: row.trigger_node_id,
    title: row.title,
    state: row.state,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTurn(row: TurnRow): AgentTurn {
  return {
    id: row.id,
    sessionId: row.session_id,
    ...(row.run_id ? { runId: row.run_id } : {}),
    state: row.state,
    sequence: row.sequence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.completed_at ? { completedAt: row.completed_at } : {}),
  };
}

function mapMessage(row: MessageRow): AgentMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    turnId: row.turn_id,
    role: row.role,
    sequence: row.sequence,
    createdAt: row.created_at,
    ...(row.completed_at ? { completedAt: row.completed_at } : {}),
  };
}

function mapPart(row: PartRow): AgentMessagePart {
  return {
    id: row.id,
    sessionId: row.session_id,
    turnId: row.turn_id,
    messageId: row.message_id,
    type: row.type,
    sequence: row.sequence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...JSON.parse(row.data_json),
  } as AgentMessagePart;
}

function partData(part: AgentMessagePart): Record<string, unknown> {
  const {
    id: _id,
    sessionId: _sessionId,
    turnId: _turnId,
    messageId: _messageId,
    type: _type,
    sequence: _sequence,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...data
  } = part;
  return data;
}

function isTerminalTurn(state: AgentTurnState): boolean {
  return state === "completed" || state === "failed" || state === "cancelled";
}
