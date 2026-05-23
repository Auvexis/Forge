import type { PageBlock, PageBlockProps, PageBlockTag, PublishedPage } from "./page-types.ts";

const RENDER_TAGS: Record<PageBlockTag, string> = {
  header: "header",
  section: "section",
  div: "div",
  footer: "footer",
  form: "form",
  button: "button",
  input: "input",
  text: "span",
  image: "img",
  link: "a",
};

const PROP_ALLOWLIST: Record<PageBlockTag, Set<string>> = {
  header: new Set(["ariaLabel"]),
  section: new Set(["ariaLabel"]),
  div: new Set(["ariaLabel"]),
  footer: new Set(["ariaLabel"]),
  form: new Set(["name", "method"]),
  button: new Set(["type", "name", "value"]),
  input: new Set(["name", "type", "placeholder", "required", "value"]),
  text: new Set([]),
  image: new Set(["src", "alt", "title"]),
  link: new Set(["href", "target", "title"]),
};

const STYLE_ALLOWLIST = new Set([
  "width",
  "height",
  "maxWidth",
  "minHeight",
  "padding",
  "margin",
  "display",
  "flexDirection",
  "alignItems",
  "justifyContent",
  "gap",
  "backgroundColor",
  "backgroundImage",
  "color",
  "border",
  "borderRadius",
  "boxShadow",
  "opacity",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "textAlign",
]);

const DANGEROUS_CSS_PATTERN = /javascript:|data:text\/html|expression\s*\(|<\/style|<\s*script/i;

export function renderPublishedPage(page: PublishedPage): string {
  const title = escapeHtml(page.title);
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title}</title>`,
    `<style>${renderPageCss(page)}</style>`,
    "</head>",
    "<body>",
    renderPageBody(page.blocks),
    "</body>",
    "</html>",
  ].join("");
}

export function renderPageBody(blocks: PageBlock[]): string {
  return blocks.map((block) => renderBlock(block)).join("");
}

export function renderPageCss(page: PublishedPage): string {
  return page.blocks.flatMap((block) => collectBlockCss(block)).join("\n");
}

function renderBlock(block: PageBlock): string {
  const tag = RENDER_TAGS[block.tag];
  const attrs = renderAttributes(block);
  const children = renderPageBody(block.children ?? []);

  if (block.tag === "input") {
    return `<input${attrs}>`;
  }

  if (block.tag === "image") {
    return `<img${attrs}>`;
  }

  const text = getBlockText(block);
  return `<${tag}${attrs}>${text}${children}</${tag}>`;
}

function renderAttributes(block: PageBlock): string {
  const attrs: Record<string, string> = {
    class: ["sailor-page-block", blockClass(block.id), sanitizeClassName(block.className)]
      .filter(Boolean)
      .join(" "),
  };

  for (const [key, value] of Object.entries(block.props ?? {})) {
    if (!PROP_ALLOWLIST[block.tag].has(key) || value === false || value === null || value === undefined) {
      continue;
    }

    const attrName = propToAttributeName(key);
    const attrValue = String(value);
    if ((key === "href" && !isSafeLinkUrl(attrValue)) || (key === "src" && !isSafeImageUrl(attrValue))) {
      continue;
    }

    attrs[attrName] = attrValue;
  }

  if (block.props?.ariaLabel) {
    attrs["aria-label"] = String(block.props.ariaLabel);
  }

  if (block.action && (block.tag === "form" || block.tag === "button")) {
    attrs["data-sailor-action-id"] = block.action.id;
  }

  return Object.entries(attrs)
    .map(([key, value]) => ` ${key}="${escapeAttribute(value)}"`)
    .join("");
}

function getBlockText(block: PageBlock): string {
  const props = block.props ?? {};
  if (block.tag === "text" || block.tag === "button" || block.tag === "link") {
    return escapeHtml(String(props.text ?? ""));
  }
  return "";
}

function collectBlockCss(block: PageBlock): string[] {
  const declarations = [
    ...Object.entries(block.styles ?? {})
      .filter(([key, value]) => STYLE_ALLOWLIST.has(key) && !containsDangerousCss(String(value)))
      .map(([key, value]) => `${camelToKebab(key)}: ${String(value)};`),
    ...sanitizeCustomCss(block.customCss ?? ""),
  ];

  const ownCss = declarations.length
    ? [`.${blockClass(block.id)} {\n  ${declarations.join("\n  ")}\n}`]
    : [];

  return [...ownCss, ...(block.children ?? []).flatMap((child) => collectBlockCss(child))];
}

function sanitizeCustomCss(css: string): string[] {
  if (!css) return [];
  return css
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !containsDangerousCss(part))
    .filter((part) => /^[a-z-]+\s*:\s*[^{}<>]+$/i.test(part))
    .map((part) => `${part};`);
}

function sanitizeClassName(className: unknown): string {
  if (typeof className !== "string") return "";
  return className
    .split(/\s+/)
    .filter((part) => /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(part))
    .join(" ");
}

function blockClass(id: string): string {
  return `sailor-block-${String(id).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function propToAttributeName(prop: string): string {
  if (prop === "ariaLabel") return "aria-label";
  return prop.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function camelToKebab(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function containsDangerousCss(value: string): boolean {
  return DANGEROUS_CSS_PATTERN.test(value);
}

function isSafeImageUrl(url: string): boolean {
  return url.startsWith("/") || isUrlWithProtocol(url, new Set(["http:", "https:"]));
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
