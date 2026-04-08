import {
  Clapperboard,
  File,
  FileArchive,
  FileText,
  Film,
  FolderClosed,
  Image,
  Loader2,
  Paperclip,
} from "lucide-react";
import type {
  PluginManifestResponseSchema,
  PluginMethodUI,
} from "../types/plugin";
import { getSchemaProperties } from "../utils/getSchemaProperties";
import { Separator } from "~/components/ui/separator";
import { Button } from "~/components/ui/button";
import { executeAction } from "../utils/executeAction";
import { useExecutePlugin } from "../hooks/useExecutePlugin";
import { useEffect, useState } from "react";
import { downloadFile } from "~/shared/utils/downloadFile";

type Props = {
  pluginId: string;
  ui: PluginMethodUI;
  schema: PluginManifestResponseSchema;
  data?: any;
};

export const CardRenderer = ({ pluginId, ui, schema, data }: Props) => {
  const { executePlugin } = useExecutePlugin();

  const entries = getSchemaProperties(schema);

  // States
  const [cardData, setCardData] = useState(data);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  useEffect(() => {
    setCardData(data);
  }, [data]);

  const renderFileIcon = () => {
    if (!data?.mimeType) {
      return <File className="w-[85%] h-[85%] opacity-80" />;
    }

    if (data.mimeType.startsWith("image/")) {
      return <Image className="w-[85%] h-[85%] opacity-80" />;
    }

    if (data.mimeType.startsWith("video/")) {
      return <Clapperboard className="w-[85%] h-[85%] opacity-80" />;
    }

    if (data.mimeType.endsWith("folder")) {
      return <FolderClosed className="w-[85%] h-[85%] opacity-80" />;
    }

    switch (data.mimeType) {
      case "application/pdf":
        return <FileText className="w-[85%] h-[85%] opacity-80" />;
      case "application/x-zip-compressed":
        return <FileArchive className="w-[85%] h-[85%] opacity-80" />;
      default:
        return <File className="w-[85%] h-[85%] opacity-80" />;
    }
  };

  return (
    <div className="w-full h-full flex">
      {schema["x-type"] === "file" && (
        <div className="w-full h-full flex gap-5">
          <div className="w-[25%] flex rounded-lg justify-center items-center bg-accent/50 p-8">
            {renderFileIcon()}
          </div>

          <div className="w-[75%] h-full flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-1">
              {entries?.map(([key, value]) => {
                return (
                  <div key={key} className="flex gap-2">
                    <h1 className="text-md font-medium">{value.label}: </h1>
                    <p className="max-h-14 text-ellipsis overflow-hidden">
                      {(cardData[key] as string) || "-"}
                    </p>
                  </div>
                );
              })}
            </div>

            {ui.actions?.length && ui.actions.length > 0 && (
              <Separator orientation="horizontal" />
            )}

            <div className="flex gap-2">
              {ui.actions?.map((action) => {
                return (
                  <Button
                    key={action.label}
                    variant="outline"
                    onClick={async () => {
                      try {
                        setLoadingAction(action.label);

                        const result = await executeAction(
                          executePlugin,
                          pluginId,
                          action.action,
                          action.parameters,
                          cardData,
                        );

                        if (result?.download) {
                          downloadFile({
                            base64: result.download.base64,
                            fileName: result.download.fileName,
                            mimeType: result.download.mimeType,
                          });
                          return;
                        }

                        if (result !== undefined && result !== null) {
                          setCardData(result);
                        }
                      } finally {
                        setLoadingAction(null);
                      }
                    }}
                  >
                    {loadingAction === action.label && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {schema["x-type"] === "folder" && (
        <div className="w-full h-full flex gap-5">
          <div className="w-[25%] flex rounded-lg justify-center items-center bg-accent/50 p-8">
            <FolderClosed className="w-full h-full opacity-80" />
          </div>

          <div className="w-[75%] h-full flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-1">
              {entries?.map(([key, value]) => {
                return (
                  <div key={key} className="flex gap-2">
                    <h1 className="text-md font-medium">{value.label}: </h1>
                    <p className="">{(cardData[key] as string) || "-"}</p>
                  </div>
                );
              })}
            </div>

            <Separator orientation="horizontal" />

            <div className="flex gap-2">
              {ui.actions?.map((action) => {
                return (
                  <Button
                    key={action.label}
                    variant="outline"
                    onClick={async () => {
                      const result = await executeAction(
                        executePlugin,
                        pluginId,
                        action.action,
                        action.parameters,
                        cardData,
                      );

                      if (result?.download) {
                        downloadFile({
                          base64: result.download.base64,
                          fileName: result.download.fileName,
                          mimeType: result.download.mimeType,
                        });
                        return;
                      }

                      if (result !== undefined && result !== null) {
                        setCardData(result);
                      }
                    }}
                  >
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {schema["x-type"] === "text" && (
        <div className="w-full h-full flex gap-5">
          <div className="w-[25%] flex rounded-lg justify-center items-center bg-accent/50 p-8">
            <Film className="w-[70%] h-[70%] opacity-80" />
          </div>

          <div className="w-[75%] h-full flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-1">
              {entries?.map(([key, value]) => {
                return (
                  <div key={key} className="flex gap-2">
                    <h1 className="text-md font-medium">{value.label}: </h1>
                    <p className="max-h-14 text-ellipsis overflow-hidden">
                      {(cardData[key] as string) || "-"}
                    </p>
                  </div>
                );
              })}
            </div>

            {ui.actions?.length && ui.actions.length > 0 && (
              <Separator orientation="horizontal" />
            )}

            <div className="flex gap-2">
              {ui.actions?.map((action) => {
                return (
                  <Button
                    key={action.label}
                    variant="outline"
                    onClick={async () => {
                      try {
                        setLoadingAction(action.label);

                        const result = await executeAction(
                          executePlugin,
                          pluginId,
                          action.action,
                          action.parameters,
                          cardData,
                        );

                        if (result?.download) {
                          downloadFile({
                            base64: result.download.base64,
                            fileName: result.download.fileName,
                            mimeType: result.download.mimeType,
                          });
                          return;
                        }

                        if (result !== undefined && result !== null) {
                          setCardData(result);
                        }
                      } finally {
                        setLoadingAction(null);
                      }
                    }}
                  >
                    {loadingAction === action.label && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
