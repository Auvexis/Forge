import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  route(":view?", "routes/home.tsx")
] satisfies RouteConfig;
