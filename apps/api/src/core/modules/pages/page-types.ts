export type PageBlockTag =
  | "header"
  | "section"
  | "div"
  | "footer"
  | "form"
  | "button"
  | "input"
  | "text"
  | "image"
  | "audio"
  | "video"
  | "youtube"
  | "link";

export type PageBlockAction =
  | {
      id: string;
      type: "submitForm";
      formId: string;
      workflowId?: string;
    }
  | {
      id: string;
      type: "triggerWorkflow";
      workflowId: string;
      triggerId?: string;
    }
  | {
      id: string;
      type: "openUrl";
      url: string;
      target?: "_self" | "_blank";
    };

export type PageBlockStyles = Record<string, string | number>;
export type PageBlockProps = Record<string, string | number | boolean | null | undefined>;
export type PageBlockAttributes = Record<string, string | number | boolean>;

export interface PageBlock {
  id: string;
  tag: PageBlockTag;
  props?: PageBlockProps;
  styles?: PageBlockStyles;
  elementId?: string;
  attributes?: PageBlockAttributes;
  className?: string;
  customCss?: string;
  customJs?: string;
  action?: PageBlockAction;
  children?: PageBlock[];
}

export type PageActionBindableElementProperty = "value" | "checked" | "text";

export interface PageActionElementBindingTarget {
  elementId: string;
  property: PageActionBindableElementProperty;
  label: string;
}

export interface PageActionInputBinding {
  id: string;
  actionId: string;
  inputKey: string;
  source: "element";
  target: PageActionElementBindingTarget;
  createdAt: string;
}

export interface PageActionOutputBinding {
  id: string;
  actionId: string;
  resultPath: string;
  target: PageActionElementBindingTarget;
  createdAt: string;
}

export interface PageActionCollectionBinding {
  id: string;
  actionId: string;
  collectionPath: string;
  targetElementId: string;
  itemAlias: string;
  mode?: "repeater" | "table";
  createdAt: string;
}

export interface PageActionDocument {
  inputBindings: Record<string, Record<string, PageActionInputBinding>>;
  outputBindings?: Record<string, PageActionOutputBinding[]>;
  collectionBindings?: Record<string, PageActionCollectionBinding[]>;
}

export interface FabricPage {
  id: string;
  profileId: string;
  siteId: string;
  title: string;
  slug: string;
  publicPath?: string;
  metaTitle?: string;
  metaDescription?: string;
  faviconUrl?: string;
  bodyStyles?: PageBlockStyles;
  pageActions?: PageActionDocument;
  blocks: PageBlock[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePageInput {
  profileId: string;
  siteId?: string;
  title: string;
  slug?: string;
  publicPath?: string;
  metaTitle?: string;
  metaDescription?: string;
  faviconUrl?: string;
  bodyStyles?: PageBlockStyles;
  pageActions?: PageActionDocument;
  blocks?: PageBlock[];
}

export interface UpdatePageInput {
  title?: string;
  slug?: string;
  publicPath?: string;
  metaTitle?: string;
  metaDescription?: string;
  faviconUrl?: string;
  bodyStyles?: PageBlockStyles;
  pageActions?: PageActionDocument;
  blocks?: PageBlock[];
}

export interface PublishedPage {
  id: string;
  pageId: string;
  profileId: string;
  siteId: string;
  title: string;
  slug: string;
  fileSlug?: string;
  publicPath?: string;
  metaTitle?: string;
  metaDescription?: string;
  faviconUrl?: string;
  bodyStyles?: PageBlockStyles;
  pageActions?: PageActionDocument;
  blocks: PageBlock[];
  publishedAt: string;
}

export type PageValidationResult =
  | { success: true; page: FabricPage }
  | { success: false; error: string };
