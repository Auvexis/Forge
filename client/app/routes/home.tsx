import { Navigate } from "react-router";

/**
 * Legacy root redirect — index route is now handled by routes/explorer.tsx
 * via the layout route configuration in routes.ts.
 */
export default function Home() {
  return <Navigate to="/explorer" replace />;
}
