import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { PluginMethodUI } from "../types/plugin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { MoreHorizontalIcon } from "lucide-react";
import { executeAction } from "../utils/executeAction";
import { useEffect, useState } from "react";
import { useExecutePlugin } from "../hooks/useExecutePlugin";
import { downloadFile } from "~/shared/utils/downloadFile";
import { getSchemaProperties, getPropertyLabel } from "../utils/getSchemaProperties";

type Props = {
  pluginId: string;
  ui: PluginMethodUI;
  schema: any;
  data?: any;
};

export const TableRenderer = ({ pluginId, ui, schema, data }: Props) => {
  // Hooks
  const { executePlugin } = useExecutePlugin();

  // States
  const [tableData, setTableData] = useState(data);

  // Get properties from schema
  const entries = getSchemaProperties(schema);

  useEffect(() => {
    setTableData(data);
  }, [data]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {ui.actions !== null && <TableHead>Actions</TableHead>}
          {entries?.map(([key, prop]) => (
            <TableHead key={key}>{getPropertyLabel(key, prop)}</TableHead>
          ))}
        </TableRow>
      </TableHeader>

      {tableData && (
        <TableBody>
          {(Array.isArray(tableData) ? tableData : [tableData]).map(
            (row, i) => (
              <TableRow key={i}>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant={"ghost"}
                        size={"icon"}
                        className="size-8"
                      >
                        <MoreHorizontalIcon />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {ui.actions?.map((action) => (
                        <DropdownMenuItem
                          key={action.label}
                          onClick={async () => {
                            const result = await executeAction(
                              executePlugin,
                              pluginId,
                              action.action,
                              action.parameters,
                              row,
                            );

                            if (result?.download) {
                              downloadFile({
                                base64: result.download.base64,
                                fileName: result.download.name,
                                mimeType: result.download.mimeType,
                              });
                              return;
                            }

                            if (result !== undefined && result !== null) {
                              setTableData(result);
                            }
                          }}
                        >
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                {entries?.map(([key]) => (
                  <TableCell key={key}>{String(row[key] ?? "-")}</TableCell>
                ))}
              </TableRow>
            ),
          )}
        </TableBody>
      )}
    </Table>
  );
};
