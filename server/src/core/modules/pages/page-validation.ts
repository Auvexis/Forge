import type {
  PageBlock,
  PageBlockAttributes,
  PageBlockAction,
  PageBlockProps,
  PageBlockStyles,
  PageBlockTag,
  PageValidationResult,
  SailorPage,
} from "./page-types.ts";

const PAGE_TITLE_MAX_LENGTH = 120;
const PAGE_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PAGE_PUBLIC_PATH_REGEX = /^\/?[a-z0-9]+(?:[/-][a-z0-9]+)*\/?$/;
const MAX_BLOCKS = 300;
const MAX_DEPTH = 8;
const MAX_CUSTOM_CODE_LENGTH = 50000;

const ALLOWED_TAGS = new Set<PageBlockTag>([
  "header",
  "section",
  "div",
  "footer",
  "form",
  "button",
  "input",
  "text",
  "image",
  "audio",
  "video",
  "youtube",
  "link",
]);

const ALLOWED_ACTION_TYPES = new Set(["submitForm", "triggerWorkflow", "openUrl"]);

const ALLOWED_PROPS: Record<PageBlockTag, Set<string>> = {
  header: new Set(["ariaLabel"]),
  section: new Set(["ariaLabel"]),
  div: new Set(["ariaLabel"]),
  footer: new Set(["ariaLabel"]),
  form: new Set(["name", "method"]),
  button: new Set(["text", "type", "name", "value"]),
  input: new Set(["name", "type", "label", "placeholder", "required", "value"]),
  text: new Set(["text"]),
  image: new Set(["src", "alt", "title"]),
  audio: new Set(["src", "controls", "autoplay", "loop", "muted"]),
  video: new Set(["src", "poster", "controls", "autoplay", "loop", "muted"]),
  youtube: new Set(["url", "videoId", "title", "autoplay"]),
  link: new Set(["href", "text", "target", "title"]),
};

const ALLOWED_STYLES = new Set([
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "overflow",
  "padding",
  "margin",
  "display",
  "flexDirection",
  "alignItems",
  "justifyContent",
  "gap",
  "backgroundColor",
  "backgroundImage",
  "backgroundSize",
  "backgroundPosition",
  "color",
  "border",
  "borderWidth",
  "borderStyle",
  "borderColor",
  "borderRadius",
  "boxShadow",
  "opacity",
  "fontSize",
  "fontFamily",
  "fontWeight",
  "lineHeight",
  "textAlign",
  "textTransform",
  "letterSpacing",
  "objectFit",
  "objectPosition",
]);

const DANGEROUS_PATTERN = /<\s*script|javascript:|data:text\/html|on\w+\s*=|expression\s*\(/i;

export function validatePageInput(input: SailorPage): PageValidationResult {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (title.length < 1 || title.length > PAGE_TITLE_MAX_LENGTH) {
    return { success: false, error: "Page title must be 1-120 chars." };
  }

  const slug = typeof input.slug === "string" ? input.slug.trim() : "";
  if (slug.length < 3 || slug.length > 80 || !PAGE_SLUG_REGEX.test(slug)) {
    return { success: false, error: "Page slug must be kebab-case and 3-80 chars." };
  }
  const publicPath = normalizePublicPath(input.publicPath);
  if (typeof input.publicPath === "string" && input.publicPath.trim() && !publicPath) {
    return { success: false, error: "Page URL must be a safe path like /meusite/signup." };
  }
  const metaTitle = normalizeOptionalText(input.metaTitle, 160);
  const metaDescription = normalizeOptionalText(input.metaDescription, 240);
  const faviconUrl = normalizeOptionalUrl(input.faviconUrl);

  if (!Array.isArray(input.blocks)) {
    return { success: false, error: "Page blocks must be an array." };
  }

  const blockCount = countBlocks(input.blocks);
  if (blockCount > MAX_BLOCKS) {
    return { success: false, error: "Page cannot contain more than 300 blocks." };
  }

  const normalizedBlocks: PageBlock[] = [];
  for (const block of input.blocks) {
    const result = normalizeBlock(block, 1);
    if (!result.success) return result;
    normalizedBlocks.push(result.block);
  }
  const bodyStylesResult = normalizeStyles(input.bodyStyles ?? {});
  if (!bodyStylesResult.success) return bodyStylesResult;

  return {
    success: true,
    page: {
      ...input,
      title,
      slug,
      ...(publicPath ? { publicPath } : {}),
      ...(metaTitle ? { metaTitle } : {}),
      ...(metaDescription ? { metaDescription } : {}),
      ...(faviconUrl ? { faviconUrl } : {}),
      bodyStyles: bodyStylesResult.styles,
      blocks: normalizedBlocks,
    },
  };
}

function normalizePublicPath(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().toLowerCase().replace(/\/+/g, "/").replace(/\/$/g, "");
  if (!trimmed || containsDangerousText(trimmed)) return "";
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (normalized.length < 2 || normalized.length > 120 || !PAGE_PUBLIC_PATH_REGEX.test(normalized)) return "";
  return normalized;
}

function normalizeOptionalText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  const normalized = value.trim().slice(0, maxLength);
  return containsDangerousText(normalized) ? "" : normalized;
}

function normalizeOptionalUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  if (!normalized || containsDangerousText(normalized)) return "";
  return isSafeMediaUrl(normalized) ? normalized : "";
}

function normalizeBlock(
  block: PageBlock,
  depth: number,
): { success: true; block: PageBlock } | { success: false; error: string } {
  if (depth > MAX_DEPTH) {
    return { success: false, error: "Page block tree exceeds max depth." };
  }

  if (!block || typeof block !== "object") {
    return { success: false, error: "Invalid page block." };
  }

  if (!ALLOWED_TAGS.has(block.tag)) {
    return { success: false, error: `Unsupported tag: ${String(block.tag)}` };
  }

  if (containsDangerousText(block.id)) {
    return { success: false, error: "Block contains custom JavaScript." };
  }

  const propsResult = normalizeProps(block.tag, block.props ?? {});
  if (!propsResult.success) return propsResult;

  const stylesResult = normalizeStyles(block.styles ?? {});
  if (!stylesResult.success) return stylesResult;

  const elementId = normalizeElementId(block.elementId);
  const attributes = normalizeAttributes(block.attributes ?? {});
  const className = normalizeClassName(block.className);
  const customCss = block.customCss ?? "";
  if (customCss.length > MAX_CUSTOM_CODE_LENGTH) {
    return { success: false, error: "Block custom CSS is too long." };
  }
  const customJs = block.customJs ?? "";
  if (customJs.length > MAX_CUSTOM_CODE_LENGTH) {
    return { success: false, error: "Block custom JS is too long." };
  }

  const actionResult = normalizeAction(block.action);
  if (!actionResult.success) return actionResult;

  const children: PageBlock[] = [];
  for (const child of block.children ?? []) {
    const childResult = normalizeBlock(child, depth + 1);
    if (!childResult.success) return childResult;
    children.push(childResult.block);
  }

  return {
    success: true,
    block: {
      id: String(block.id),
      tag: block.tag,
      props: propsResult.props,
      styles: stylesResult.styles,
      ...(elementId ? { elementId } : {}),
      ...(Object.keys(attributes).length ? { attributes } : {}),
      ...(className ? { className } : {}),
      ...(customCss ? { customCss } : {}),
      ...(customJs ? { customJs } : {}),
      ...(actionResult.action ? { action: actionResult.action } : {}),
      children,
    },
  };
}

function normalizeAttributes(attributes: PageBlockAttributes): PageBlockAttributes {
  const normalized: PageBlockAttributes = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (!isSafeAttributeName(key) || value === false || value === null || value === undefined) continue;
    normalized[key] = typeof value === "boolean" ? value : String(value);
  }
  return normalized;
}

function normalizeProps(
  tag: PageBlockTag,
  props: PageBlockProps,
): { success: true; props: PageBlockProps } | { success: false; error: string } {
  const normalized: PageBlockProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (!ALLOWED_PROPS[tag].has(key)) continue;
    if (typeof value === "string" && containsDangerousText(value)) {
      return { success: false, error: `Prop ${key} contains custom JavaScript.` };
    }
    normalized[key] = value;
  }

  if (tag === "image" && typeof normalized.src === "string" && !isSafeImageUrl(normalized.src)) {
    return { success: false, error: "Image URL must use http, https, or a root-relative path." };
  }

  if ((tag === "audio" || tag === "video") && typeof normalized.src === "string" && !isSafeMediaUrl(normalized.src)) {
    return { success: false, error: "Media URL must use http, https, or a root-relative path." };
  }

  if (tag === "video" && typeof normalized.poster === "string" && normalized.poster && !isSafeMediaUrl(normalized.poster)) {
    return { success: false, error: "Media poster URL must use http, https, or a root-relative path." };
  }

  if (tag === "link" && typeof normalized.href === "string" && !isSafeLinkUrl(normalized.href)) {
    return { success: false, error: "Link URL contains unsafe JavaScript or unsupported protocol." };
  }

  return { success: true, props: normalized };
}

function normalizeStyles(
  styles: PageBlockStyles,
): { success: true; styles: PageBlockStyles } | { success: false; error: string } {
  const normalized: PageBlockStyles = {};
  for (const [key, value] of Object.entries(styles)) {
    if (!ALLOWED_STYLES.has(key)) continue;
    if (typeof value === "string" && containsDangerousText(value)) {
      return { success: false, error: `Style ${key} contains unsafe content.` };
    }
    if (key === "position") continue;
    normalized[key] = value;
  }
  return { success: true, styles: normalized };
}

function normalizeAction(
  action: PageBlockAction | undefined,
): { success: true; action?: PageBlockAction } | { success: false; error: string } {
  if (!action) return { success: true };
  if (!ALLOWED_ACTION_TYPES.has(action.type)) {
    return { success: false, error: `Unsupported action type: ${String(action.type)}` };
  }
  if (containsDangerousText(JSON.stringify(action))) {
    return { success: false, error: "Action contains custom JavaScript." };
  }
  if (action.type === "openUrl" && !isSafeLinkUrl(action.url)) {
    return { success: false, error: "Open URL action contains unsafe URL." };
  }
  return { success: true, action };
}

function countBlocks(blocks: PageBlock[]): number {
  return blocks.reduce((count, block) => count + 1 + countBlocks(block.children ?? []), 0);
}

function normalizeClassName(className: unknown): string | undefined {
  if (typeof className !== "string") return undefined;
  return className
    .split(/\s+/)
    .map((part) => part.replace(/[<>"']/g, ""))
    .filter(Boolean)
    .join(" ");
}

function normalizeElementId(elementId: unknown): string | undefined {
  if (typeof elementId !== "string") return undefined;
  return elementId.trim().replace(/[<>"'\s]/g, "");
}

function isSafeAttributeName(name: string): boolean {
  return /^(data-[a-z0-9_.:-]+|aria-[a-z0-9_.:-]+|role|title|name|placeholder|target|rel)$/i.test(name);
}

function containsDangerousText(value: string): boolean {
  return DANGEROUS_PATTERN.test(value);
}

function isSafeImageUrl(url: string): boolean {
  return isUrlWithProtocol(url, new Set(["http:", "https:"])) || url.startsWith("/");
}

function isSafeMediaUrl(url: string): boolean {
  return isUrlWithProtocol(url, new Set(["http:", "https:"])) || url.startsWith("/");
}

function isSafeLinkUrl(url: string): boolean {
  return (
    url.startsWith("/") ||
    url.startsWith("#") ||
    isUrlWithProtocol(url, new Set(["http:", "https:", "mailto:", "tel:"]))
  );
}

function isUrlWithProtocol(url: string, protocols: Set<string>): boolean {
  try {
    return protocols.has(new URL(url).protocol);
  } catch {
    return false;
  }
}
