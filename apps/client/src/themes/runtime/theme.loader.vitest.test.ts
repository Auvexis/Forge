import { describe, expect, it } from "vitest";

import darkTheme from "../json/dark.json";
import lightTheme from "../json/light.json";
import { renderThemeCss, tokenNameToCssVar } from "./theme.loader";
import type { FabricThemeDefinition } from "./theme.types";

describe("theme loader", () => {
  it("converts dot and camelCase token names to CSS custom property names", () => {
    expect(tokenNameToCssVar("appPopover.dropdown.bg")).toBe("--fabric-app-popover-dropdown-bg");
    expect(tokenNameToCssVar("workflowChrome.menuTrigger.text")).toBe(
      "--fabric-workflow-chrome-menu-trigger-text",
    );
  });

  it("renders built-in themes without nested CSS variable references", () => {
    for (const theme of [darkTheme, lightTheme] as FabricThemeDefinition[]) {
      const css = renderThemeCss(theme);

      expect(css).toContain(":root {");
      expect(css).not.toContain("var(");
      expect(css).not.toContain("--fabric-: ");
    }
  });
});
