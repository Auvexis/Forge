import { GoogleDrivePluginMethods } from "./methods.ts";
import manifest from "./models/manifest.json" with { type: "json" };

const GoogleDrivePlugin = {
  id: "google-drive",
  icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Google_Drive_icon_%282020%29.svg/3840px-Google_Drive_icon_%282020%29.svg.png",
  name: "Google Drive",
  description: "Google Drive plugin",
  category: "Google",
  version: "1.0.0",
  author: "Forge",
  repository: "https://github.com/Auvexis/Forge",
  manifest: manifest,
  methods: GoogleDrivePluginMethods,
};

export default GoogleDrivePlugin;
