import { useEffect, useState } from "react";
import { useGetPluginStatus } from "../hooks/useGetPluginConfig";
import { useGetPlugin } from "../hooks/useGetPlugin";
import { Settings, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { API_BASE_URL } from "~/shared/constants";
import { handleApi } from "~/shared/helpers/apiHandler";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export const PluginMenuAuth = ({ pluginId }: { pluginId: string }) => {
  const { plugin, getPlugin } = useGetPlugin();
  const { pluginStatus, loading, getPluginStatus } = useGetPluginStatus();
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    getPlugin(pluginId);
    getPluginStatus(pluginId);
  }, []);

  // Pre-fill form with existing credentials
  useEffect(() => {
    if (pluginStatus?.credentials) {
      setFormValues(pluginStatus.credentials);
    }
  }, [pluginStatus]);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await handleApi(
        `${API_BASE_URL}/plugins/${pluginId}/credentials`,
        { method: "POST" },
        formValues,
      );
      await getPluginStatus(pluginId);
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const data = await handleApi<{ url?: string }>(
        `${API_BASE_URL}/plugins/${pluginId}/auth/connect`,
        { method: "POST" },
      );

      if (data?.url) {
        // Open OAuth popup
        const popup = window.open(
          data.url,
          "_blank",
          "width=600,height=700",
        );

        // Listen for OAuth callback message
        const handler = (event: MessageEvent) => {
          if (
            event.data?.type === "oauth-success" &&
            event.data?.plugin === pluginId
          ) {
            window.removeEventListener("message", handler);
            getPluginStatus(pluginId);
            setConnecting(false);
          } else if (
            event.data?.type === "oauth-error" &&
            event.data?.plugin === pluginId
          ) {
            window.removeEventListener("message", handler);
            setConnecting(false);
          }
        };
        window.addEventListener("message", handler);
      }
    } catch {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await handleApi(
      `${API_BASE_URL}/plugins/${pluginId}/auth/disconnect`,
      { method: "POST" },
    );
    await getPluginStatus(pluginId);
  };

  if (loading || !pluginStatus) {
    return (
      <main className="w-full h-full flex items-center justify-center mt-5">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="w-full h-full flex flex-col mt-2 gap-3">
      {/* Header */}
      <header className="flex flex-row items-center gap-3">
        <div className="w-10 h-10 bg-accent/50 p-2.5 flex justify-center items-center rounded-xl">
          <Settings className="w-full h-full text-accent-foreground/70" />
        </div>
        <div>
          <h1 className="text-lg font-heading">Plugin Settings</h1>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {pluginStatus.status === "connected" && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span>Connected</span>
              </>
            )}
            {pluginStatus.status === "configured" && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
                <span>Credentials saved — connect to authenticate</span>
              </>
            )}
            {pluginStatus.status === "not_configured" && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                <span>Not configured</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Credential Form (rendered from credential_schema) */}
      {pluginStatus.credential_schema && (
        <section>
          <form
            onSubmit={handleSaveCredentials}
            className="flex flex-col gap-3"
          >
            {Object.entries(pluginStatus.credential_schema).map(
              ([key, field]) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label
                    htmlFor={key}
                    className="text-sm font-medium text-foreground"
                  >
                    {field.label}
                    {field.required && (
                      <span className="text-red-500 ml-0.5">*</span>
                    )}
                  </label>
                  {field.description && (
                    <p className="text-xs text-muted-foreground">
                      {field.description}
                    </p>
                  )}
                  <Input
                    id={key}
                    name={key}
                    type={field.inputType}
                    required={field.required}
                    placeholder={field.placeholder}
                    value={formValues[key] ?? ""}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                  />
                </div>
              ),
            )}

            <Button
              type="submit"
              disabled={saving}
              variant={"outline"}
              className="inline-flex items-center justify-center text-sm font-medium h-9 px-4 py-2 disabled:opacity-50 mt-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Save Credentials
            </Button>
          </form>
        </section>
      )}

      {/* OAuth2 Connect/Disconnect */}
      {pluginStatus.auth_type === "oauth2" && (
        <section className="flex flex-col gap-2">
          {pluginStatus.status === "configured" && (
            <Button
              onClick={handleConnect}
              disabled={connecting}
              variant={"default"}
              className="inline-flex items-center justify-center text-sm font-medium h-9 px-4 py-2 disabled:opacity-50"
            >
              {connecting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Connect with OAuth2
            </Button>
          )}

          {pluginStatus.status === "connected" && (
            <Button
              onClick={handleDisconnect}
              variant={"destructive"}
              className="inline-flex items-center justify-center text-sm font-medium h-9 px-4 py-2"
            >
              Disconnect
            </Button>
          )}
        </section>
      )}
    </main>
  );
};
