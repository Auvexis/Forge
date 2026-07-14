import type { PageBlock, PageBlockProps, PageBlockTag, PublishedPage } from "./page-types.ts";
import type { FabricSite } from "./site-types.ts";

interface RenderOptions {
  site?: FabricSite | null;
}

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
  audio: "audio",
  video: "video",
  youtube: "iframe",
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
  audio: new Set(["src", "controls", "autoplay", "loop", "muted"]),
  video: new Set(["src", "poster", "controls", "autoplay", "loop", "muted"]),
  youtube: new Set(["url", "videoId", "title", "autoplay"]),
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

export function renderPublishedPage(page: PublishedPage, site?: FabricSite | null): string {
  const title = escapeHtml(page.metaTitle?.trim() || page.title);
  const pageJs = renderPageJs(page, site);
  const siteJs = renderSiteJs(page, site);
  const css = [renderBaseCss(), renderSiteFontFaces(site), renderSiteCss(page, site), renderPageCss(page)].filter(Boolean).join("\n");
  const metaDescription = page.metaDescription?.trim()
    ? `<meta name="description" content="${escapeAttribute(page.metaDescription.trim())}">`
    : "";
  const favicon = page.faviconUrl?.trim() && isSafeMediaUrl(page.faviconUrl.trim())
    ? `<link rel="icon" href="${escapeAttribute(page.faviconUrl.trim())}">`
    : "";
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title}</title>`,
    metaDescription,
    favicon,
    `<style>${css}</style>`,
    "</head>",
    `<body${renderBodyStyle(page)}>`,
    renderPageBody(page.blocks, { site }),
    siteJs ? `<script>${siteJs}</script>` : "",
    pageJs ? `<script>${pageJs}</script>` : "",
    "</body>",
    "</html>",
  ].join("");
}

function renderBodyStyle(page: PublishedPage): string {
  const declarations = Object.entries(normalizeBodyStyles(page.bodyStyles ?? {}))
    .filter(([key, value]) => STYLE_ALLOWLIST.has(key) && !containsDangerousCss(String(value)))
    .map(([key, value]) => `${camelToKebab(key)}: ${escapeAttribute(normalizeStyleValue(key, String(value)))};`)
    .join(" ");
  return declarations ? ` style="${declarations}"` : "";
}

function normalizeBodyStyles(styles: Record<string, unknown>): Record<string, unknown> {
  return {
    margin: "0",
    ...styles,
    ...(styles.height ? {} : { height: styles.minHeight ?? "100vh" }),
    ...(styles.minHeight ? {} : { minHeight: styles.height ?? "100vh" }),
  };
}

export function renderPageBody(blocks: PageBlock[], options: RenderOptions = {}): string {
  return blocks.map((block) => renderBlock(block, options)).join("");
}

export function renderPageCss(page: PublishedPage): string {
  return page.blocks.flatMap((block) => collectBlockCss(block)).join("\n");
}

function renderBlock(block: PageBlock, options: RenderOptions): string {
  const tag = RENDER_TAGS[block.tag];
  const attrs = renderAttributes(block, options);
  const children = renderPageBody(block.children ?? [], options);

  if (block.tag === "input") {
    return `<input${attrs}>`;
  }

  if (block.tag === "image") {
    return `<img${attrs}>`;
  }

  if (block.tag === "audio" || block.tag === "video" || block.tag === "youtube") {
    return `<${tag}${attrs}></${tag}>`;
  }

  const text = getBlockText(block);
  return `<${tag}${attrs}>${text}${children}</${tag}>`;
}

function renderAttributes(block: PageBlock, options: RenderOptions): string {
  const attrs: Record<string, string> = {
    class: ["fabric-page-block", blockClass(block.id), sanitizeClassName(block.className)]
      .filter(Boolean)
      .join(" "),
    "data-page-action-binding-element-id": block.id,
  };

  if (block.elementId) attrs.id = block.elementId;

  for (const [key, value] of Object.entries(block.props ?? {})) {
    if (!PROP_ALLOWLIST[block.tag].has(key) || value === false || value === null || value === undefined) {
      continue;
    }

    if (block.tag === "youtube" && (key === "url" || key === "videoId")) continue;

    const attrName = propToAttributeName(key);
    const attrValue = key === "src" ? resolveImageSrc(String(value), options.site) : String(value);
    if (
      (key === "href" && !isSafeLinkUrl(attrValue)) ||
      (key === "src" && !isSafeMediaUrl(attrValue)) ||
      (key === "poster" && attrValue && !isSafeMediaUrl(attrValue))
    ) {
      continue;
    }

    attrs[attrName] = attrValue;
  }

  if (block.tag === "youtube") {
    const src = youtubeEmbedSrc(block.props ?? {});
    if (src) attrs.src = src;
    attrs.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    attrs.allowfullscreen = "true";
  }

  if (block.props?.ariaLabel) {
    attrs["aria-label"] = String(block.props.ariaLabel);
  }

  for (const [key, value] of Object.entries(block.attributes ?? {})) {
    if (!isSafeAttributeName(key) || value === false || value === null || value === undefined) continue;
    attrs[key] = String(value);
  }

  if (block.action && (block.tag === "form" || block.tag === "button")) {
    attrs["data-fabric-action-id"] = block.action.id;
    attrs["data-fabric-action-type"] = block.action.type;
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
      .map(([key, value]) => `${camelToKebab(key)}: ${normalizeStyleValue(key, String(value))};`),
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

function renderPageJs(page: PublishedPage, site?: FabricSite | null): string {
  const scripts = page.blocks.flatMap((block) => collectBlockJs(block));
  const actionRuntime = hasPageActions(page.blocks) || hasPageActionBindings(page) ? renderActionRuntime(page, site) : "";
  return [actionRuntime, ...scripts].filter(Boolean).join("\n");
}

function renderSiteCss(page: PublishedPage, site?: FabricSite | null): string {
  return renderPageLocalFiles(site, "css", pageFileSlug(page));
}

function renderPageLocalFiles(site: FabricSite | null | undefined, extension: "css" | "js", slug?: string): string {
  if (!site || !slug) return "";
  return (site?.files ?? [])
    .filter((file) => file.kind === "file" && file.path.startsWith(`pages/${slug}/`) && file.path.endsWith(`.${extension}`))
    .map((file) => file.content?.trim() ?? "")
    .filter((content) => content && (extension === "js" || !containsDangerousCss(content)))
    .map((content) => extension === "js" ? escapeScript(content) : content)
    .join("\n");
}

function renderBaseCss(): string {
  return [
    "html { width: 100%; height: 100%; }",
    "body { box-sizing: border-box; }",
    ".fabric-page-block { box-sizing: border-box; }",
    ":where(input.fabric-page-block, button.fabric-page-block, textarea.fabric-page-block, select.fabric-page-block) { font: inherit; }",
  ].join("\n");
}

function renderSiteFontFaces(site?: FabricSite | null): string {
  return (site?.files ?? [])
    .filter((file) => file.kind === "asset" && isFontAsset(file.path, file.mimeType) && file.url && isSafeMediaUrl(file.url))
    .map((file) => {
      const family = fontFamilyFromAssetPath(file.path);
      return `@font-face { font-family: "${escapeCssString(family)}"; src: url("${escapeCssString(file.url ?? "")}") format("${fontFormat(file.path)}"); font-display: swap; }`;
    })
    .join("\n");
}

function normalizeStyleValue(key: string, value: string): string {
  if (key !== "fontFamily") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (isAssetFontReference(trimmed)) return `"${escapeCssString(fontFamilyFromAssetPath(trimmed))}"`;
  if (/^inter$/i.test(trimmed)) return `"Inter", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  return value;
}

function isAssetFontReference(value: string): boolean {
  return isFontAsset(value) && (value.startsWith("assets/") || value.startsWith("/sites/"));
}

function isFontAsset(path: string, mimeType = ""): boolean {
  return /^font\//i.test(mimeType) || /\.(woff2?|ttf|otf)$/i.test(path);
}

function fontFamilyFromAssetPath(path: string): string {
  const filename = path.split(/[\\/]/).pop() ?? path;
  return filename.replace(/\.(woff2?|ttf|otf)$/i, "").replace(/[_-]+/g, " ").trim() || "Fabric Font";
}

function fontFormat(path: string): string {
  if (/\.woff2$/i.test(path)) return "woff2";
  if (/\.woff$/i.test(path)) return "woff";
  if (/\.otf$/i.test(path)) return "opentype";
  return "truetype";
}

function renderSiteJs(page: PublishedPage, site?: FabricSite | null): string {
  return renderPageLocalFiles(site, "js", pageFileSlug(page));
}

function pageFileSlug(page: PublishedPage): string {
  return page.fileSlug ?? page.slug.replace(/^\/+/, "").split("/").filter(Boolean).at(-1) ?? page.slug;
}

function hasPageActions(blocks: PageBlock[]): boolean {
  return blocks.some((block) => block.action || hasPageActions(block.children ?? []));
}

function hasPageActionBindings(page: PublishedPage): boolean {
  return Object.values(page.pageActions?.inputBindings ?? {}).some((bindings) => Object.keys(bindings).length > 0);
}

function renderActionRuntime(page: PublishedPage, site?: FabricSite | null): string {
  return [
    `;(() => {`,
    `  const slug = ${JSON.stringify(page.slug)};`,
    `  const projectPublicId = ${JSON.stringify(site?.publicId ?? page.siteId)};`,
    `  const inputBindings = ${JSON.stringify(page.pageActions?.inputBindings ?? {})};`,
    `  let pendingActionId = "";`,
    `  let executionId = "";`,
    `  let runtimeError = "";`,
    `  const status = document.createElement("div");`,
    `  status.setAttribute("data-fabric-runtime-status", "");`,
    `  document.body.appendChild(status);`,
    `  function updateStatus() {`,
    `    status.textContent = runtimeError || (executionId ? "Accepted: " + executionId : "");`,
    `  }`,
    `  function encodePublishedPath(path) {`,
    `    return String(path).replace(/^\\/+/, "").split("/").map(encodeURIComponent).join("/");`,
    `  }`,
    `  function readBindingValue(target) {`,
    `    const element = document.querySelector("[data-page-action-binding-element-id='" + cssEscape(target.elementId) + "']");`,
    `    if (!element) return "";`,
    `    if (target.property === "checked" && "checked" in element) return Boolean(element.checked);`,
    `    if (target.property === "value" && "value" in element) return element.value;`,
    `    if (target.property === "text") return element.textContent || "";`,
    `    return element.getAttribute(target.property) || element.textContent || "";`,
    `  }`,
    `  function cssEscape(value) {`,
    `    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(String(value));`,
    `    return String(value).replace(/['\\\\]/g, "\\\\$&");`,
    `  }`,
    `  function payloadWithBindings(actionId, payload) {`,
    `    const next = { ...(payload || {}) };`,
    `    const bindings = inputBindings[actionId] || {};`,
    `    for (const binding of Object.values(bindings)) next[binding.inputKey] = readBindingValue(binding.target);`,
    `    return next;`,
    `  }`,
    `  async function submitAction(actionId, payload) {`,
    `    pendingActionId = actionId;`,
    `    runtimeError = "";`,
    `    executionId = "";`,
    `    updateStatus();`,
    `    try {`,
    `      const response = await fetch("/p/" + encodeURIComponent(projectPublicId) + "/actions/" + encodeURIComponent(actionId) + "/" + encodePublishedPath(slug), {`,
    `        method: "POST",`,
    `        headers: { "content-type": "application/json" },`,
    `        body: JSON.stringify(payloadWithBindings(actionId, payload)),`,
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
    `    const actionId = form?.dataset?.fabricActionId;`,
    `    if (!actionId) return;`,
    `    event.preventDefault();`,
    `    submitAction(actionId, Object.fromEntries(new FormData(form).entries()));`,
    `  });`,
    `  document.addEventListener("click", (event) => {`,
    `    const actionElement = event.target?.closest?.("[data-fabric-action-id]");`,
    `    if (!actionElement || actionElement.tagName.toLowerCase() === "form") return;`,
    `    const actionId = actionElement.dataset.fabricActionId;`,
    `    if (!actionId) return;`,
    `    if (actionElement.dataset.fabricActionType === "openUrl") return;`,
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
  return `fabric-block-${String(id).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
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

function escapeCssString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function camelToKebab(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function containsDangerousCss(value: string): boolean {
  return DANGEROUS_CSS_PATTERN.test(value);
}

function resolveImageSrc(src: string, site?: FabricSite | null): string {
  if (!src.startsWith("assets/") || !site) return src;
  const assetPath = src.slice("assets/".length);
  if (!assetPath || assetPath.includes("..") || assetPath.includes("\\") || assetPath.startsWith("/")) return src;
  return `/sites/${encodeURIComponent(site.id)}/assets/${assetPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function isSafeAttributeName(name: string): boolean {
  return /^(data-[a-z0-9_.:-]+|aria-[a-z0-9_.:-]+|role|title|name|placeholder|target|rel)$/i.test(name);
}

function isSafeMediaUrl(url: string): boolean {
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

function youtubeEmbedSrc(props: PageBlockProps): string {
  const videoId = String(props.videoId ?? "").trim() || youtubeIdFromUrl(String(props.url ?? ""));
  if (!/^[a-zA-Z0-9_-]{6,}$/.test(videoId)) return "";
  const query = props.autoplay === true ? "?autoplay=1" : "";
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}${query}`;
}

function youtubeIdFromUrl(value: string): string {
  const match = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{6,})/);
  return match?.[1] ?? "";
}
