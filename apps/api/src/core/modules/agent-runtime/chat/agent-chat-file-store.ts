import fs from "node:fs";
import path from "node:path";
import type { AgentChatMessage, AppendChatMessageInput } from "./chat-message-repository.ts";
import type { AgentChatSession, CreateChatSessionInput } from "./chat-session-repository.ts";
import { resolveAgentChatDir } from "./agent-chat-paths.ts";

export interface AgentChatFileStoreOptions {
  profilesDir: string;
}

export interface AgentChatFile {
  session: AgentChatSession;
  messages: AgentChatMessage[];
  executions: unknown[];
  updatedAt: string;
}

export class AgentChatFileStore {
  private readonly profilesDir: string;

  constructor(options: AgentChatFileStoreOptions) {
    this.profilesDir = options.profilesDir;
  }

  createSession(input: CreateChatSessionInput): AgentChatSession {
    const now = new Date().toISOString();
    const session = { ...input, createdAt: now, updatedAt: now };
    this.writeChat(input.profileId, input.id, {
      session,
      messages: [],
      executions: [],
      updatedAt: now,
    });
    return session;
  }

  create(input: CreateChatSessionInput): AgentChatSession {
    return this.createSession(input);
  }

  getChat(profileId: string, sessionId: string): AgentChatFile | null {
    const filePath = this.chatJsonPath(profileId, sessionId);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as AgentChatFile;
  }

  getSession(profileId: string, sessionId: string): AgentChatSession | null {
    return this.getChat(profileId, sessionId)?.session ?? null;
  }

  getById(profileId: string, sessionId: string): AgentChatSession | null {
    return this.getSession(profileId, sessionId);
  }

  listSessionsByAgentKey(profileId: string, agentKey: string): AgentChatSession[] {
    return this.listChats(profileId)
      .map((chat) => chat.session)
      .filter((session) => session.agentKey === agentKey)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  listByAgentKey(profileId: string, agentKey: string): AgentChatSession[] {
    return this.listSessionsByAgentKey(profileId, agentKey);
  }

  listMessages(profileId: string, sessionId: string): AgentChatMessage[] {
    return this.getChat(profileId, sessionId)?.messages ?? [];
  }

  listBySession(profileId: string, sessionId: string): AgentChatMessage[] {
    return this.listMessages(profileId, sessionId);
  }

  appendMessage(input: AppendChatMessageInput): AgentChatMessage {
    const chat = this.requireChat(input.profileId, input.sessionId);
    const createdAt = this.nextMessageCreatedAt(chat);
    const message = { ...input, createdAt };
    chat.messages.push(message);
    this.touchChat(chat, createdAt);
    this.writeChat(input.profileId, input.sessionId, chat);
    return message;
  }

  append(input: AppendChatMessageInput): AgentChatMessage {
    return this.appendMessage(input);
  }

  touch(profileId: string, sessionId: string): void {
    const chat = this.requireChat(profileId, sessionId);
    this.touchChat(chat);
    this.writeChat(profileId, sessionId, chat);
  }

  appendExecution(profileId: string, sessionId: string, execution: unknown): void {
    const chat = this.requireChat(profileId, sessionId);
    chat.executions.push(execution);
    this.touchChat(chat);
    this.writeChat(profileId, sessionId, chat);
  }

  deleteSession(profileId: string, sessionId: string): boolean {
    const chatDir = this.chatDir(profileId, sessionId);
    if (!fs.existsSync(chatDir)) return false;
    fs.rmSync(chatDir, { recursive: true, force: true });
    return true;
  }

  delete(profileId: string, sessionId: string): boolean {
    return this.deleteSession(profileId, sessionId);
  }

  private listChats(profileId: string): AgentChatFile[] {
    const chatsDir = path.join(this.profileDir(profileId), "chats");
    if (!fs.existsSync(chatsDir)) return [];
    return fs.readdirSync(chatsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => this.getChat(profileId, entry.name))
      .filter((chat): chat is AgentChatFile => Boolean(chat));
  }

  private requireChat(profileId: string, sessionId: string): AgentChatFile {
    const chat = this.getChat(profileId, sessionId);
    if (!chat) throw new Error(`Agent chat not found: ${sessionId}`);
    return chat;
  }

  private touchChat(chat: AgentChatFile, timestamp = new Date().toISOString()): void {
    chat.updatedAt = timestamp;
    chat.session.updatedAt = timestamp;
  }

  private nextMessageCreatedAt(chat: AgentChatFile): string {
    const previous = chat.messages.at(-1)?.createdAt;
    const now = new Date();
    const previousTimes = [previous, chat.updatedAt, chat.session.updatedAt]
      .map((value) => (value ? Date.parse(value) : NaN))
      .filter(Number.isFinite);
    const latestPreviousTime = previousTimes.length > 0 ? Math.max(...previousTimes) : NaN;
    if (!Number.isFinite(latestPreviousTime) || now.getTime() > latestPreviousTime) return now.toISOString();
    return new Date(latestPreviousTime + 1).toISOString();
  }

  private writeChat(profileId: string, sessionId: string, chat: AgentChatFile): void {
    const chatDir = this.chatDir(profileId, sessionId);
    fs.mkdirSync(chatDir, { recursive: true });
    fs.writeFileSync(this.chatJsonPath(profileId, sessionId), `${JSON.stringify(chat, null, 2)}\n`, "utf8");
  }

  private chatJsonPath(profileId: string, sessionId: string): string {
    return path.join(this.chatDir(profileId, sessionId), "chat.json");
  }

  private chatDir(profileId: string, sessionId: string): string {
    return resolveAgentChatDir({ profilesDir: this.profilesDir, profileId, chatId: sessionId });
  }

  private profileDir(profileId: string): string {
    return path.join(this.profilesDir, profileId);
  }
}
