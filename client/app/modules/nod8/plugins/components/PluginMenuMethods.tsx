import { useState } from "react";
import { useNod8 } from "~/providers/Nod8Provider";
import {
  ChevronDown,
  ChevronsDownUp,
  ChevronUp,
  Loader2,
  Play,
  Workflow,
  Download,
  CheckCircle2,
  FileDown,
} from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Switch } from "~/components/ui/switch";
import { Separator } from "~/components/ui/separator";
import { TableRenderer } from "../renderers/TableRenderer";
import { useExecutePlugin } from "../hooks/useExecutePlugin";
import { CardRenderer } from "../renderers/CardRenderer";
import {
  getPropertyLabel,
  getSchemaProperties,
} from "../utils/getSchemaProperties";
import { toast } from "~/shared/helpers/toast";

// ── Download helper ──────────────────────────────────────────────────────────

/**
 * Detects whether the plugin result is a download response.
 * The backend signals a download by returning:
 *   { download: { content: string, filename: string, mimeType: string } }
 * `content` can be a base64 string (most common) or a UTF-8 string.
 */
function isDownloadResult(result: any): result is {
  download: { content: string; filename: string; mimeType: string };
} {
  return (
    result &&
    typeof result === "object" &&
    "download" in result &&
    result.download &&
    typeof result.download.content === "string" &&
    typeof result.download.filename === "string"
  );
}

/**
 * Creates a Blob from a base64 string and triggers a browser file download.
 * Falls back to treating `content` as plain text if atob throws.
 */
function triggerBlobDownload(
  content: string,
  filename: string,
  mimeType: string,
): void {
  let blob: Blob;
  try {
    // Try to interpret as base64
    const binary = atob(content);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    blob = new Blob([bytes], { type: mimeType || "application/octet-stream" });
  } catch {
    // Fallback: treat as plain text
    blob = new Blob([content], { type: mimeType || "text/plain" });
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const PluginMenuMethods = ({ pluginId }: { pluginId: string }) => {
  const { activePlugin: plugin } = useNod8();
  const { executePlugin } = useExecutePlugin();

  const [outputCollapsed, setOutputCollapsed] = useState<
    Record<string, boolean>
  >({});
  const [results, setResults] = useState<Record<string, any>>({});
  const [loadingPluginMethod, setLoadingPluginMethod] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<Record<string, string | null>>({});

  // Scoped form data: { [methodKey]: { [paramKey]: value } }
  const [formValues, setFormValues] = useState<
    Record<string, Record<string, any>>
  >({});

  const updateFormValue = (methodKey: string, paramKey: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [methodKey]: {
        ...(prev[methodKey] || {}),
        [paramKey]: value,
      },
    }));
  };

  if (!plugin) return null;

  return (
    <main className="w-full h-full overflow-y-auto flex flex-col p-1 gap-3">
      {(Object.entries(plugin.manifest.methods || {}) as [string, any][]).map(
        ([methodKey, methodValue]) => (
          <Card
            key={methodKey}
            className="w-full p-2 px-0 shrink-0 rounded-sm!"
          >
            <CardContent className="px-2">
              <Collapsible>
                <CollapsibleTrigger className="w-full flex group justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 p-2 flex justify-center items-center border border-border rounded-md group-hover:bg-accent/80 transition-colors">
                      <Workflow className="w-full h-full text-accent-foreground" />
                    </div>
                    <span className="font-medium">
                      {methodValue.metadata.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronsDownUp className="w-4 h-4 text-muted-foreground/70" />
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="flex flex-col items-start gap-2 mt-3 text-sm">
                  <form
                    className="grid grid-cols-2 gap-4 w-full"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        setError((prev) => ({ ...prev, [methodKey]: null }));
                        setLoadingPluginMethod(methodKey);
                        const methodParams = formValues[methodKey] || {};
                        const payload: Record<string, any> = {
                          ...methodParams,
                        };

                        const result = await executePlugin(
                          pluginId,
                          methodKey,
                          payload,
                        );

                        // ── Download detection ──────────────────────────────
                        // If the backend returns { download: { content, filename, mimeType } }
                        // we trigger a browser download automatically instead of
                        // rendering the binary content as JSON.
                        if (isDownloadResult(result)) {
                          const { content, filename, mimeType } = result.download;
                          triggerBlobDownload(content, filename, mimeType);
                          toast.success("File downloaded", {
                            description: `"${filename}" saved to your Downloads folder.`,
                          });
                          // Store a lightweight indicator so the UI can show a
                          // "download complete" message instead of raw binary.
                          setResults((prev) => ({
                            ...prev,
                            [methodKey]: { _download: true, filename, mimeType, size: content.length },
                          }));
                        } else {
                          setResults((prev) => ({
                            ...prev,
                            [methodKey]: result,
                          }));
                        }

                        setOutputCollapsed((prev) => ({
                          ...prev,
                          [methodKey]: true,
                        }));
                      } catch (err: any) {
                        setError((prev) => ({
                          ...prev,
                          [methodKey]: err.message || "Execution failed",
                        }));
                      } finally {
                        setLoadingPluginMethod(null);
                      }
                    }}
                  >
                    {(getSchemaProperties(methodValue.parameters) || []).map(
                      ([paramKey, paramValue]) => {
                        const isRequired =
                          methodValue.parameters.required?.includes(paramKey);
                        const label = getPropertyLabel(paramKey, paramValue);
                        const inputType =
                          paramValue["x-input-type"] ||
                          (paramValue.type === "integer" ||
                          paramValue.type === "number"
                            ? "number"
                            : "text");

                        return (
                          <div
                            key={paramKey}
                            className="flex flex-col items-start gap-2"
                          >
                            <span className="font-medium flex gap-2">
                              {label}
                              <Separator orientation="vertical" />
                              <span className="text-muted-foreground text-xs font-normal lowercase">
                                {paramValue.type}
                              </span>
                              {isRequired && (
                                <span className="text-red-500">*</span>
                              )}
                            </span>

                            {(inputType as any) === "toggle" ? (
                              <div className="flex items-center gap-2 h-10">
                                <Switch
                                  checked={!!formValues[methodKey]?.[paramKey]}
                                  onCheckedChange={(val) =>
                                    updateFormValue(methodKey, paramKey, val)
                                  }
                                />
                                <span className="text-xs text-muted-foreground italic">
                                  {formValues[methodKey]?.[paramKey]
                                    ? "Enabled"
                                    : "Disabled"}
                                </span>
                              </div>
                            ) : inputType === "textarea" ? (
                              <Textarea
                                name={paramKey}
                                placeholder={paramValue.description}
                                required={isRequired}
                                value={formValues[methodKey]?.[paramKey] || ""}
                                onChange={(e) =>
                                  updateFormValue(
                                    methodKey,
                                    paramKey,
                                    e.target.value,
                                  )
                                }
                              />
                            ) : inputType !== "file" ? (
                              <Input
                                name={paramKey}
                                type={inputType}
                                placeholder={paramValue.description}
                                required={isRequired}
                                value={formValues[methodKey]?.[paramKey] || ""}
                                onChange={(e) =>
                                  updateFormValue(
                                    methodKey,
                                    paramKey,
                                    e.target.value,
                                  )
                                }
                              />
                            ) : (
                              <Input
                                name={paramKey}
                                type="file"
                                required={isRequired}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;

                                  // Auto-populate 'name' and 'mimeType' helpers
                                  setFormValues((prev) => {
                                    const currentParams = prev[methodKey] || {};
                                    const nextParams = {
                                      ...currentParams,
                                      [paramKey]: file,
                                    };

                                    // Check if 'name' and 'mimeType' properties exist in schema
                                    const props =
                                      methodValue.parameters.properties || {};

                                    if (props["name"] && !currentParams["name"])
                                      nextParams["name"] = file.name;
                                    if (
                                      props["mimeType"] &&
                                      !currentParams["mimeType"]
                                    )
                                      nextParams["mimeType"] = file.type;

                                    return { ...prev, [methodKey]: nextParams };
                                  });
                                }}
                              />
                            )}
                          </div>
                        );
                      },
                    )}

                    <Button
                      type="submit"
                      className="col-span-2 h-10"
                      disabled={loadingPluginMethod === methodKey}
                    >
                      {loadingPluginMethod === methodKey ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Run
                        </>
                      )}
                    </Button>

                    {error[methodKey] && (
                      <div className="col-span-2 p-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                        {error[methodKey]}
                      </div>
                    )}
                  </form>

                  {/* Results Section */}
                  {results[methodKey] && (
                    <div className="w-full flex flex-col gap-2 mt-2">
                      <div className="w-full flex justify-center items-center gap-2">
                        <div className="flex-1 h-px bg-border"></div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() =>
                            setOutputCollapsed((prev) => ({
                              ...prev,
                              [methodKey]: !prev[methodKey],
                            }))
                          }
                        >
                          {outputCollapsed[methodKey] ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                          <span className="ml-1 text-xs">Output</span>
                        </Button>
                        <div className="flex-1 h-px bg-border"></div>
                      </div>

                      {outputCollapsed[methodKey] && (
                        <div className="w-full h-64 overflow-auto rounded-md border border-border bg-accent/10 p-2">
                          {/* ── Download result indicator ── */}
                          {results[methodKey]?._download ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                              </div>
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium text-foreground">
                                  File downloaded successfully
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {results[methodKey].filename}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {results[methodKey].mimeType}
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 text-xs"
                                onClick={async () => {
                                  // Re-run to re-download
                                  const methodParams = formValues[methodKey] || {};
                                  const result = await executePlugin(pluginId, methodKey, methodParams);
                                  if (isDownloadResult(result)) {
                                    triggerBlobDownload(
                                      result.download.content,
                                      result.download.filename,
                                      result.download.mimeType,
                                    );
                                    toast.success("File downloaded", {
                                      description: `"${result.download.filename}" saved.`,
                                    });
                                  }
                                }}
                              >
                                <Download className="w-3.5 h-3.5" />
                                Download again
                              </Button>
                            </div>
                          ) : (
                            <>
                              {methodValue.ui.component === "table" && (
                                <TableRenderer
                                  pluginId={pluginId}
                                  ui={methodValue.ui}
                                  schema={methodValue.responseSchema}
                                  data={results[methodKey]}
                                />
                              )}
                              {methodValue.ui.component === "card" && (
                                <CardRenderer
                                  pluginId={pluginId}
                                  ui={methodValue.ui}
                                  schema={methodValue.responseSchema}
                                  data={results[methodKey]}
                                />
                              )}
                              {methodValue.ui.component === "text" && (
                                <pre className="text-xs p-2 whitespace-pre-wrap">
                                  {JSON.stringify(results[methodKey], null, 2)}
                                </pre>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        ),
      )}
    </main>
  );
};
