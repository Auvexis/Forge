import { base64ToFile } from "./base64ToFile";

export const downloadFile = (props: {
  base64: string;
  fileName: string;
  mimeType: string;
}) => {
  const blob = base64ToFile(props.base64, props.mimeType);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = props.fileName;
  a.click();
  URL.revokeObjectURL(url);
};
