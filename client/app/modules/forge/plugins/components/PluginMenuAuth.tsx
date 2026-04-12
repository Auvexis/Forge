import { useEffect, useState } from "react";
import { useForge } from "~/providers/ForgeProvider";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { handleApi } from "~/shared/helpers/apiHandler";
import { API_BASE_URL } from "~/shared/constants";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Settings,
  Lock,
} from "lucide-react";

export const PluginMenuAuth = ({ pluginId }: { pluginId: string }) => {
  const {
    activePluginStatus: pluginStatus,
    refreshActivePluginStatus: updateStatus,
    startOAuthFlow,
    authLoading,
  } = useForge();

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

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
      await updateStatus(pluginId);
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async () => {
    try {
      const data = await handleApi<{ url?: string }>(
        `${API_BASE_URL}/plugins/${pluginId}/auth/connect`,
        { method: "POST" },
      );

      if (data?.url) {
        await startOAuthFlow(pluginId, data.url);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDisconnect = async () => {
    try {
      await handleApi(`${API_BASE_URL}/plugins/${pluginId}/auth/disconnect`, {
        method: "POST",
      });
      await updateStatus(pluginId);
    } catch (err) {
      console.error(err);
    }
  };

  if (!pluginStatus) return null;

  return (
    <main className="w-full h-full flex flex-col p-1! gap-3">
      <header className="flex flex-row items-center gap-3">
        <div className="w-10 h-10 border border-border p-2.5 flex justify-center items-center rounded-xl">
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

      {pluginStatus.credential_schema && (
        <section>
          <form
            onSubmit={handleSaveCredentials}
            className="flex flex-col gap-3"
          >
            {(
              Object.entries(pluginStatus.credential_schema) as [string, any][]
            ).map(([key, field]) => {
              const isLocked = (pluginStatus.locked_fields ?? []).includes(key);
              return (
              <div key={key} className="flex flex-col gap-1.5">
                <label htmlFor={key} className="text-sm font-medium flex items-center gap-1.5">
                  {field.label}
                  {field.required && !isLocked && (
                    <span className="text-red-500 ml-0.5">*</span>
                  )}
                  {isLocked && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full ml-auto">
                      <Lock className="w-2.5 h-2.5" />
                      ENV
                    </span>
                  )}
                </label>
                {field.description && (
                  <p className="text-xs text-muted-foreground">
                    {field.description}
                  </p>
                )}
                {isLocked ? (
                  <div className="flex items-center gap-2 px-3 h-10 rounded-md border border-border/50 bg-accent/10 text-muted-foreground text-sm">
                    <Lock className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs">Configured via environment variable</span>
                  </div>
                ) : (
                  <Input
                    id={key}
                    type={field.inputType}
                    required={field.required}
                    placeholder={field.placeholder}
                    value={formValues[key] || ""}
                    onChange={(e) =>
                      setFormValues({ ...formValues, [key]: e.target.value })
                    }
                  />
                )}
              </div>
              );
            })}

            <Button
              type="submit"
              disabled={saving}
              variant="outline"
              className="mt-2"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Credentials
            </Button>
          </form>
        </section>
      )}

      {pluginStatus.auth_type === "oauth2" && (
        <section className="flex flex-col gap-2">
          {pluginStatus.status === "configured" && (
            <Button
              onClick={handleConnect}
              disabled={authLoading}
              className="w-full"
            >
              {authLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Connect with OAuth2
            </Button>
          )}

          {pluginStatus.status === "connected" && (
            <Button
              onClick={handleDisconnect}
              variant="destructive"
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          )}
        </section>
      )}
    </main>
  );
};
