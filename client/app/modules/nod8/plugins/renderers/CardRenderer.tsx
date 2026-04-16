import {
  Clapperboard,
  File,
  FileArchive,
  FileText,
  FolderClosed,
  Image,
  Loader2,
  Paperclip,
} from "lucide-react";
import type {
  JSONSchemaProperty,
  PluginManifestResponseSchema,
  PluginMethodUI,
} from "../types/plugin";
import {
  getSchemaProperties,
  getPropertyLabel,
  getDisplayType,
} from "../utils/getSchemaProperties";
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

// ──────────── Icon Strategy ────────────

/**
 * Picks the correct icon for the card's icon zone based on the display type
 * and, optionally, the mimeType field present in the data row.
 */
function getDisplayIcon(
  displayType: string,
  data: Record<string, any>,
): React.ReactNode {
  // For file display types, use the mimeType to pick a specific icon
  if (displayType === "file") {
    const mime: string = data?.mimeType ?? "";

    if (!mime) return <File className="w-[85%] h-[85%] opacity-80" />;
    if (mime.startsWith("image/")) return <Image className="w-[85%] h-[85%] opacity-80" />;
    if (mime.startsWith("video/")) return <Clapperboard className="w-[85%] h-[85%] opacity-80" />;
    if (mime.endsWith("folder")) return <FolderClosed className="w-[85%] h-[85%] opacity-80" />;

    switch (mime) {
      case "application/pdf":
        return <FileText className="w-[85%] h-[85%] opacity-80" />;
      case "application/x-zip-compressed":
      case "application/zip":
        return <FileArchive className="w-[85%] h-[85%] opacity-80" />;
      default:
        return <File className="w-[85%] h-[85%] opacity-80" />;
    }
  }

  if (displayType === "folder") {
    return <FolderClosed className="w-full h-full opacity-80" />;
  }

  if (displayType === "media") {
    return <Clapperboard className="w-[70%] h-[70%] opacity-80" />;
  }

  // "text" | "generic" | anything else
  return <Paperclip className="w-[70%] h-[70%] opacity-80" />;
}

// ──────────── Property Row ────────────

function PropertyRow({
  prop,
  propKey,
  value,
}: {
  prop: JSONSchemaProperty & { label?: string };
  propKey: string;
  value: any;
}) {
  const label = getPropertyLabel(propKey, prop);
  const display = value !== undefined && value !== null ? String(value) : "—";

  return (
    <div className="flex gap-2 text-sm">
      <span className="font-medium shrink-0">{label}:</span>
      <span className="text-muted-foreground max-h-14 text-ellipsis overflow-hidden">
        {display}
      </span>
    </div>
  );
}

// ──────────── Action Bar ────────────

function ActionBar({
  actions,
  loadingAction,
  onAction,
}: {
  actions: NonNullable<PluginMethodUI["actions"]>;
  loadingAction: string | null;
  onAction: (action: (typeof actions)[number]) => void;
}) {
  if (!actions.length) return null;
  return (
    <>
      <Separator orientation="horizontal" />
      <div className="flex flex-wrap gap-2 pb-3">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            onClick={() => onAction(action)}
            disabled={loadingAction === action.label}
          >
            {loadingAction === action.label && (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            )}
            {action.label}
          </Button>
        ))}
      </div>
    </>
  );
}

// ──────────── CardRenderer ────────────

/**
 * Generic card renderer driven entirely by the responseSchema.
 *
 * Display strategy is selected via `x-nod8-display` (or legacy `x-type`):
 *   - "file"    → file icon resolved from mimeType
 *   - "folder"  → folder icon
 *   - "media"   → clapperboard icon
 *   - "text" / "generic" / unknown → paperclip icon
 *
 * Property labels use `x-label` first, then the raw key name.
 * Actions are rendered in an ActionBar and can mutate the card state.
 */
export const CardRenderer = ({ pluginId, ui, schema, data }: Props) => {
  const { executePlugin } = useExecutePlugin();

  const entries = getSchemaProperties(schema);
  const displayType = getDisplayType(schema);

  const [cardData, setCardData] = useState<Record<string, any>>(data ?? {});
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  useEffect(() => {
    setCardData(data ?? {});
  }, [data]);

  const handleAction = async (
    action: NonNullable<PluginMethodUI["actions"]>[number],
  ) => {
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
  };

  return (
    <div className="w-full h-full flex gap-5">
      {/* Icon zone — driven by displayType */}
      <div className="w-[25%] flex rounded-lg justify-center items-center bg-accent/50 p-8 shrink-0">
        {getDisplayIcon(displayType, cardData)}
      </div>

      {/* Content zone — same for every display type */}
      <div className="w-[75%] h-full flex flex-col justify-between gap-3">
        <div className="flex flex-col gap-1">
          {entries?.map(([key, value]) => (
            <PropertyRow
              key={key}
              propKey={key}
              prop={value}
              value={cardData[key]}
            />
          ))}
        </div>

        <ActionBar
          actions={ui.actions ?? []}
          loadingAction={loadingAction}
          onAction={handleAction}
        />
      </div>
    </div>
  );
};
