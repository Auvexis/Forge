import type { CommandDescriptor } from "./command-types.ts";

export interface CommandSearchResult {
  command: CommandDescriptor;
  score: number;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function tokens(value: string): string[] {
  return normalize(value).split(" ").filter(Boolean);
}

function scoreCommand(query: string, command: CommandDescriptor): number {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return 1;

  const label = normalize(command.label);
  const id = normalize(command.id);
  const group = normalize(command.group);
  const keywords = (command.keywords ?? []).map(normalize);
  const searchable = [label, id, group, ...keywords].join(" ");
  const queryTokens = tokens(normalizedQuery);

  if (label === normalizedQuery) return 1000;
  if (label.startsWith(normalizedQuery)) return 850;
  if (label.includes(normalizedQuery)) return 700;
  if (id.includes(normalizedQuery)) return 650;

  const keywordPhraseMatch = keywords.some((keyword) => keyword.includes(normalizedQuery));
  if (keywordPhraseMatch) return 550;

  if (queryTokens.every((token) => searchable.includes(token))) {
    const labelMatches = queryTokens.filter((token) => label.includes(token)).length;
    return 350 + labelMatches * 50;
  }

  return 0;
}

export function searchCommands(
  query: string,
  commands: CommandDescriptor[],
): CommandSearchResult[] {
  const normalizedQuery = normalize(query);
  const results = commands
    .map((command) => ({ command, score: scoreCommand(normalizedQuery, command) }))
    .filter((result) => !normalizedQuery || result.score > 0);

  return results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.command.label.localeCompare(b.command.label, "en", { sensitivity: "base" });
  });
}
