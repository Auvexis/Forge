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

const DANGEROUS_CSS_PATTERN = /javascript:|data:text\/html|expression\s*\(|<\/style|<\s*script/i;

export function renderPublishedPage(page: PublishedPage): string {
  const title = escapeHtml(page.title);
  const pageJs = renderPageJs(page);
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title}</title>`,
    `<style>${renderPageCss(page)}</style>`,
    "</head>",
    `<body${renderBodyStyle(page)}>`,
    renderPageBody(page.blocks),
    pageJs ? `<script>${pageJs}</script>` : "",
    "</body>",
    "</html>",
  ].join("");
}

function renderBodyStyle(page: PublishedPage): string {
  const declarations = Object.entries(page.bodyStyles ?? {})
    .filter(([key, value]) => STYLE_ALLOWLIST.has(key) && !containsDangerousCss(String(value)))
    .map(([key, value]) => `${camelToKebab(key)}: ${escapeAttribute(String(value))};`)
    .join(" ");
  return declarations ? ` style="${declarations}"` : "";
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

  if (block.elementId) attrs.id = block.elementId;

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

  for (const [key, value] of Object.entries(block.attributes ?? {})) {
    if (!isSafeAttributeName(key) || value === false || value === null || value === undefined) continue;
    attrs[key] = String(value);
  }

  if (block.action && (block.tag === "form" || block.tag === "button")) {
    attrs["data-sailor-action-id"] = block.action.id;
    attrs["data-sailor-action-type"] = block.action.type;
    if (block.action.type === "openUrl" && isSafeLinkUrl(block.action.url)) {
      attrs.href = block.action.url;
      attrs.target = block.action.target ?? "_blank";
    }
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
  ];

  const ownCss = declarations.length
    ? [`.${blockClass(block.id)} {\n  ${declarations.join("\n  ")}\n}`]
    : [];
  const customCss = formatCustomCss(block);

  return [...ownCss, ...customCss, ...(block.children ?? []).flatMap((child) => collectBlockCss(child))];
}

function formatCustomCss(block: PageBlock): string[] {
  const css = block.customCss?.trim();
  if (!css) return [];
  if (css.includes("{")) return [css];
  return [`.${blockClass(block.id)} {\n  ${css}\n}`];
}

function renderPageJs(page: PublishedPage): string {
  const scripts = page.blocks.flatMap((block) => collectBlockJs(block));
  const actionRuntime = hasPageActions(page.blocks) ? renderActionRuntime(page.slug) : "";
  return [actionRuntime, ...scripts].filter(Boolean).join("\n");
}

function hasPageActions(blocks: PageBlock[]): boolean {
  return blocks.some((block) => block.action || hasPageActions(block.children ?? []));
}

function renderActionRuntime(slug: string): string {
  return [
    `;(() => {`,
    `  const slug = ${JSON.stringify(slug)};`,
    `  let pendingActionId = "";`,
    `  let executionId = "";`,
    `  let runtimeError = "";`,
    `  const status = document.createElement("div");`,
    `  status.setAttribute("data-sailor-runtime-status", "");`,
    `  document.body.appendChild(status);`,
    `  function updateStatus() {`,
    `    status.textContent = runtimeError || (executionId ? "Accepted: " + executionId : "");`,
    `  }`,
    `  async function submitAction(actionId, payload) {`,
    `    pendingActionId = actionId;`,
    `    runtimeError = "";`,
    `    executionId = "";`,
    `    updateStatus();`,
    `    try {`,
    `      const response = await fetch("/p/" + encodeURIComponent(slug) + "/actions/" + encodeURIComponent(actionId), {`,
    `        method: "POST",`,
    `        headers: { "content-type": "application/json" },`,
    `        body: JSON.stringify(payload),`,
    `      });`,
    `      const body = await response.json();`,
    `      if (!response.ok) throw new Error(body?.error || body?.message || "Action failed");`,
    `      executionId = body?.data?.executionId || "";`,
    `    } catch (error) {`,
    `      runtimeError = error instanceof Error ? error.message : "Action failed";`,
    `    } finally {`,
    `      pendingActionId = "";`,
    `      updateStatus();`,
    `    }`,
    `  }`,
    `  document.addEventListener("submit", (event) => {`,
    `    const form = event.target;`,
    `    const actionId = form?.dataset?.sailorActionId;`,
    `    if (!actionId) return;`,
    `    event.preventDefault();`,
    `    submitAction(actionId, Object.fromEntries(new FormData(form).entries()));`,
    `  });`,
    `  document.addEventListener("click", (event) => {`,
    `    const actionElement = event.target?.closest?.("[data-sailor-action-id]");`,
    `    if (!actionElement || actionElement.tagName.toLowerCase() === "form") return;`,
    `    const actionId = actionElement.dataset.sailorActionId;`,
    `    if (!actionId) return;`,
    `    if (actionElement.dataset.sailorActionType === "openUrl") return;`,
    `    event.preventDefault();`,
    `    submitAction(actionId, {});`,
    `  });`,
    `})();`,
  ].join("\n");
}

function collectBlockJs(block: PageBlock): string[] {
  const script = block.customJs?.trim();
  const ownScript = script
    ? [
        `;(() => {`,
        `  const element = ${JSON.stringify(block.elementId ?? "")} ? document.getElementById(${JSON.stringify(block.elementId ?? "")}) : document.querySelector(${JSON.stringify(`.${blockClass(block.id)}`)});`,
        `  const block = element;`,
        `  ${escapeScript(script)}`,
        `})();`,
      ].join("\n")
    : "";

  return [...(ownScript ? [ownScript] : []), ...(block.children ?? []).flatMap((child) => collectBlockJs(child))];
}

function sanitizeClassName(className: unknown): string {
  if (typeof className !== "string") return "";
  return className
    .split(/\s+/)
    .map((part) => part.replace(/[<>"']/g, ""))
    .filter(Boolean)
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

function escapeScript(value: string): string {
  return value.replace(/<\/script/gi, "<\\/script");
}

function camelToKebab(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function containsDangerousCss(value: string): boolean {
  return DANGEROUS_CSS_PATTERN.test(value);
}

function isSafeAttributeName(name: string): boolean {
  return /^(data-[a-z0-9_.:-]+|aria-[a-z0-9_.:-]+|role|title|name|placeholder|target|rel)$/i.test(name);
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
