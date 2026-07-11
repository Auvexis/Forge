import type { PluginManifest, FabricPlugin } from "@auvexis/fabric-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createPostgresqlMethods } from "./methods.ts";

const PostgresqlPlugin: FabricPlugin = {
  id: "fabric-postgresql",
  manifest: manifest as PluginManifest,
  auth: {
    type: "api_key",
    credentialSchema: {
      connectionString: {
        type: "string",
        inputType: "password",
        label: "Connection String",
        required: true,
        description: "postgres://user:password@host:5432/database?sslmode=require",
      },
      sslMode: {
        type: "string",
        inputType: "text",
        label: "SSL Mode",
        required: false,
        description: "disable, require, no-verify",
      },
      allowUnsafeSql: {
        type: "string",
        inputType: "password",
        label: "Allow Unsafe SQL",
        required: false,
        description: "Use I_UNDERSTAND_SQL_RISK to enable raw SQL methods.",
      },
    },
  },
  methods: createPostgresqlMethods(),
};

export default PostgresqlPlugin;
