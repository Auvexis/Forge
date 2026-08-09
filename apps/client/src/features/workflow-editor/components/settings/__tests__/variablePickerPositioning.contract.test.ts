import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const expressionInputSource = readFileSync(
  fileURLToPath(new URL("../expressions/ExpressionInput.vue", import.meta.url)),
  "utf8",
);

const expressionTextareaSource = readFileSync(
  fileURLToPath(
    new URL("../expressions/ExpressionTextarea.vue", import.meta.url),
  ),
  "utf8",
);

const triggerEditorSource = readFileSync(
  fileURLToPath(new URL("../editors/TriggerEditor.vue", import.meta.url)),
  "utf8",
);

const pickerPositionSource = readFileSync(
  fileURLToPath(
    new URL("../expressions/useVariablePickerPosition.ts", import.meta.url),
  ),
  "utf8",
);

describe("variable picker positioning", () => {
  it("uses BaseSelect-style viewport-aware fixed positioning", () => {
    assert.match(pickerPositionSource, /spaceBelow/);
    assert.match(pickerPositionSource, /spaceAbove/);
    assert.match(pickerPositionSource, /openUp/);
    assert.match(pickerPositionSource, /position: 'fixed'/);
    assert.match(pickerPositionSource, /desiredLeft/);
    assert.match(pickerPositionSource, /rect\.right - pickerWidth/);
    assert.match(pickerPositionSource, /ownerWindow\.innerHeight/);
  });

  it("teleports variable pickers to the local overlay host and binds computed position styles", () => {
    for (const source of [
      expressionInputSource,
      expressionTextareaSource,
      triggerEditorSource,
    ]) {
      assert.match(source, /useVariablePickerPosition/);
      assert.match(source, /<RenderPortal>/);
      assert.match(source, /:style="pickerStyle"/);
    }
  });

  it("closes teleported pickers from owner-document captured outside pointer events", () => {
    for (const source of [expressionInputSource, expressionTextareaSource]) {
      assert.match(
        source,
        /ownerDocument\.addEventListener\('pointerdown', [^,\n]+, true\)/,
      );
      assert.match(
        source,
        /ownerDocumentOf\(rootRef\.value\)\.removeEventListener\('pointerdown', [^,\n]+, true\)/,
      );
    }
    assert.match(
      triggerEditorSource,
      /ownerDocumentOf\(activeTriggerParamAnchor\.value \?\? editorRef\.value\)\.addEventListener/,
    );
    assert.match(
      triggerEditorSource,
      /ownerDocument\.removeEventListener\('pointerdown', onTriggerParamDocumentPointerDown, true\)/,
    );
  });
});
