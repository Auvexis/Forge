export type DesktopUpdateChannel = "safe" | "stable" | "beta" | "alpha";

export interface DesktopUpdateInfo {
  currentVersion: string;
  updateAvailable: boolean;
  channel: DesktopUpdateChannel;
  version: string | null;
  title: string | null;
  notes: string | null;
  url: string | null;
  publishedAt: string | null;
}

interface GitHubRelease {
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
}

const releasesUrl = "https://api.github.com/repos/Auvexis/fabric/releases";

export async function checkDesktopUpdate(
  currentVersion: string,
  channel: DesktopUpdateChannel = "safe",
): Promise<DesktopUpdateInfo> {
  const releases = await fetchReleases();
  const release = releases.find((candidate) => isEligibleRelease(candidate, channel));

  if (!release) {
    return emptyUpdate(currentVersion, channel);
  }

  const version = normalizeVersion(release.tag_name);
  const updateAvailable = compareVersions(version, currentVersion) > 0;

  return {
    currentVersion,
    updateAvailable,
    channel,
    version,
    title: release.name || release.tag_name,
    notes: release.body ?? "",
    url: release.html_url,
    publishedAt: release.published_at,
  };
}

async function fetchReleases(): Promise<GitHubRelease[]> {
  const response = await fetch(releasesUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "Fabric-Desktop",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub releases request failed with ${response.status}`);
  }

  return (await response.json()) as GitHubRelease[];
}

function isEligibleRelease(release: GitHubRelease, channel: DesktopUpdateChannel): boolean {
  if (release.draft) return false;

  const searchable = `${release.tag_name} ${release.name ?? ""}`.toLowerCase();
  if (channel === "safe") return searchable.includes("safe");
  if (channel === "stable") return !release.prerelease && !hasPrereleaseMarker(searchable);
  return searchable.includes(channel);
}

function hasPrereleaseMarker(value: string): boolean {
  return value.includes("alpha") || value.includes("beta") || value.includes("rc");
}

function normalizeVersion(value: string): string {
  const match = value.match(/\d+\.\d+\.\d+(?:[-.][0-9a-z]+(?:\.\d+)?)?/i);
  return match?.[0]?.replace(/\.(alpha|beta|rc)\./i, "-$1.") ?? value.replace(/^v/i, "");
}

function compareVersions(a: string, b: string): number {
  const parsedA = parseVersion(a);
  const parsedB = parseVersion(b);

  for (let index = 0; index < 3; index += 1) {
    const diff = parsedA.core[index]! - parsedB.core[index]!;
    if (diff !== 0) return diff;
  }

  return prereleaseRank(parsedA.prerelease) - prereleaseRank(parsedB.prerelease);
}

function parseVersion(value: string): { core: number[]; prerelease: string } {
  const [coreValue = "0.0.0", prerelease = ""] = normalizeVersion(value).split("-", 2);
  const core = coreValue.split(".").map((part) => Number.parseInt(part, 10) || 0);
  return { core: [core[0] ?? 0, core[1] ?? 0, core[2] ?? 0], prerelease };
}

function prereleaseRank(value: string): number {
  if (!value) return 4;
  if (value.startsWith("stable")) return 4;
  if (value.startsWith("rc")) return 3;
  if (value.startsWith("beta")) return 2;
  if (value.startsWith("alpha")) return 1;
  return 0;
}

function emptyUpdate(currentVersion: string, channel: DesktopUpdateChannel): DesktopUpdateInfo {
  return {
    currentVersion,
    updateAvailable: false,
    channel,
    version: null,
    title: null,
    notes: null,
    url: null,
    publishedAt: null,
  };
}
