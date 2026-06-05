import path from "node:path";

export function resolveAgentChatDir(input: {
  profilesDir: string;
  profileId: string;
  chatId: string;
}): string {
  return path.join(input.profilesDir, input.profileId, "chats", input.chatId);
}

export function resolveAgentChatMemoryPath(input: {
  profilesDir: string;
  profileId: string;
  chatId: string;
}): string {
  return path.join(resolveAgentChatDir(input), "memory.sqlite");
}

export function resolveAgentChatFileCacheDir(input: {
  profilesDir: string;
  profileId: string;
  chatId: string;
}): string {
  return path.join(resolveAgentChatDir(input), "cache", "files");
}

export function resolveAgentExecutionFileCacheDir(input: {
  profilesDir: string;
  profileId: string;
  executionId: string;
}): string {
  return path.join(input.profilesDir, input.profileId, "agent-cache", "executions", input.executionId, "files");
}
