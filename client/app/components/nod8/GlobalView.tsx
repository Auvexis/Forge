import { Navigate } from "react-router";

/**
 * Legacy redirect — the real views now live at /explorer and /workflows.
 * Kept so that any stale imports don't break the build.
 */
export const GlobalViewProvider = () => <Navigate to="/explorer" replace />;
