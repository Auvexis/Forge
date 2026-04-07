import { useEffect, useState } from "react";
import { useGetPlugin } from "../hooks/useGetPlugin";
import { useGetPluginStatus } from "../hooks/useGetPluginConfig";
import {
  ChevronDown,
  ChevronsDownUp,
  ChevronUp,
  Loader2,
  Play,
  TableProperties,
  Workflow,
} from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { TableRenderer } from "../renderers/TableRenderer";
import { useExecutePlugin } from "../hooks/useExecutePlugin";
import { fileToBase64 } from "../../../../shared/utils/fileToBase64";
import { CardRenderer } from "../renderers/CardRenderer";

export const PluginMenuMethods = ({ pluginId }: { pluginId: string }) => {
  // Hooks
  const { plugin, loading, getPlugin } = useGetPlugin();
  const { pluginStatus, getPluginStatus } = useGetPluginStatus();
  const { executePlugin } = useExecutePlugin();

  // UI States
  const [outputCollapsed, setOutputCollapsed] = useState<
    Record<string, boolean>
  >({});
  const [results, setResults] = useState<Record<string, any>>({});
  const [loadingPluginMethod, setLoadingPluginMethod] = useState<string | null>(
    null,
  );

  // Form Data
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  useEffect(() => {
    getPlugin(pluginId);
    getPluginStatus(pluginId);
  }, []);

  if (loading || !pluginStatus) {
    return (
      <main className="w-full h-full flex items-center justify-center mt-5">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="w-full h-full overflow-y-auto flex p-1 flex-col mt-2 gap-3">
      {Object.entries(plugin?.manifest.methods || {}).map(
        ([methodKey, methodValue]) => (
          <Card key={methodKey} className="w-full p-2 px-0 shrink-0">
            <CardContent className="px-2">
              <Collapsible>
                <CollapsibleTrigger className="w-full flex group justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-7.5 h-7.5 p-2 flex justify-center items-center bg-accent rounded-md group-hover:bg-accent/80 transition-colors">
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
                  {/* Method Form */}
                  <form
                    className="grid grid-cols-2 gap-4 w-full"
                    onSubmit={async (e) => {
                      e.preventDefault();

                      try {
                        setLoadingPluginMethod(methodKey);

                        const payload: Record<string, any> = {};

                        for (const [paramKey, paramValue] of Object.entries(
                          methodValue.parameters,
                        )) {
                          const inputValue = formValues[paramKey];

                          if (
                            paramValue.inputType === "file" &&
                            paramValue.isBase64
                          ) {
                            if (inputValue instanceof File) {
                              const base64 = await fileToBase64(inputValue);
                              payload[paramKey] = base64;
                            }
                          } else {
                            payload[paramKey] = inputValue;
                          }
                        }

                        const result = await executePlugin(
                          pluginId,
                          methodKey,
                          payload,
                        );

                        setResults((prev) => ({
                          ...prev,
                          [methodKey]: result,
                        }));
                      } catch (err) {
                        throw new Error(err as string);
                      } finally {
                        setLoadingPluginMethod(null);
                      }
                    }}
                  >
                    {Object.entries(methodValue.parameters).map(
                      ([paramKey, paramValue]) => (
                        <div
                          key={paramKey}
                          className="flex flex-col items-start gap-2"
                        >
                          <span className="font-medium flex gap-2">
                            {paramKey}
                            <Separator orientation="vertical" />
                            <span className="text-muted-foreground">
                              {paramValue.type}
                            </span>
                            {paramValue.required && (
                              <span className="text-red-500">*</span>
                            )}
                          </span>

                          {paramValue.inputType !== "file" ? (
                            <Input
                              name={paramKey}
                              type={paramValue.inputType}
                              required={paramValue.required}
                              onChange={(e) => {
                                setFormValues((prev) => ({
                                  ...prev,
                                  [paramKey]: e.target.value,
                                }));
                              }}
                            />
                          ) : (
                            <Input
                              name={paramKey}
                              type="file"
                              required={paramValue.required}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                setFormValues((prev) => {
                                  const next = { ...prev, [paramKey]: file };

                                  // Try to populate 'name' and 'mimeType' if they exist in the manifest but are empty
                                  if (
                                    methodValue.parameters["name"] &&
                                    !prev["name"]
                                  ) {
                                    next["name"] = file.name;
                                  }
                                  if (
                                    methodValue.parameters["mimeType"] &&
                                    !prev["mimeType"]
                                  ) {
                                    next["mimeType"] = file.type;
                                  }

                                  return next;
                                });
                              }}
                            />
                          )}
                        </div>
                      ),
                    )}

                    <Button type="submit" className="col-span-2 h-10">
                      {loadingPluginMethod === methodKey ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Run
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Expand Button */}
                  {!outputCollapsed[methodKey] && results[methodKey] && (
                    <div className="w-full flex justify-center items-center gap-0.5">
                      <div className="w-full h-px bg-border"></div>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setOutputCollapsed({ [methodKey]: true })
                        }
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                      <div className="w-full h-px bg-border"></div>
                    </div>
                  )}

                  {/* Output */}
                  {outputCollapsed[methodKey] && (
                    <>
                      {results[methodKey] && (
                        <div className="w-full h-64 overflow-auto mt-3 rounded-md flex">
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
                        </div>
                      )}

                      {/* Collapse Button */}
                      <div className="w-full flex justify-center items-center gap-0.5">
                        <div className="w-full h-px bg-border"></div>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setOutputCollapsed({
                              [methodKey]: false,
                            })
                          }
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <div className="w-full h-px bg-border"></div>
                      </div>
                    </>
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
