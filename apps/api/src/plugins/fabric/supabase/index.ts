import type { PluginManifest, FabricPlugin } from "@auvexis/fabric-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createSupabaseMethods } from "./methods.ts";

const SupabasePlugin: FabricPlugin = {
  id: "fabric-supabase",
  manifest: manifest as PluginManifest,
  auth: {
    type: "api_key",
    credentialSchema: {
      url: {
        type: "string",
        inputType: "url",
        label: "Supabase URL",
        required: true,
        description: "https://project.supabase.co or http://127.0.0.1:54321",
      },
      key: {
        type: "string",
        inputType: "password",
        label: "Supabase Key",
        required: true,
        description: "Anon key, service role key, or compatible self-hosted key.",
      },
      schema: {
        type: "string",
        inputType: "text",
        label: "Default Schema",
        required: false,
        description: "Usually public.",
      },
    },
  },
  methods: createSupabaseMethods(),
};

export default SupabasePlugin;
