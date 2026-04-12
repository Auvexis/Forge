/**
 * Re-exports sonner's toast() for use throughout the app.
 *
 * Usage:
 *   import { toast } from "~/shared/helpers/toast";
 *
 *   toast.success("Workflow saved");
 *   toast.error("Something went wrong", { description: err.message });
 *   toast.loading("Running...");
 *   toast.promise(myPromise, { loading: "Saving...", success: "Done!", error: "Failed" });
 */
export { toast } from "sonner";
