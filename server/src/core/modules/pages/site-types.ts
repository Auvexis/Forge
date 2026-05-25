export type SiteFileKind = "folder" | "file" | "asset";

export interface SiteFile {
  path: string;
  kind: SiteFileKind;
  content?: string;
  mimeType?: string;
  size?: number;
  url?: string;
  updatedAt: string;
}

export interface SailorSite {
  id: string;
  profileId: string;
  name: string;
  slug: string;
  homePageId: string | null;
  files: SiteFile[];
  createdAt: string;
  updatedAt: string;
}
