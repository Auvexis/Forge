import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  layout("routes/layout.tsx", [
    index("routes/explorer.tsx"),
    route("explorer", "routes/explorer.tsx", { id: "explorer-route" }),
    route("workflows", "routes/workflows.tsx"),
  ]),
] satisfies RouteConfig;
