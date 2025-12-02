
import React from "react";
import { User } from "@/entities/User";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Save, Link2, Info, Trash2 } from "lucide-react";

export default function ActivityKPIs() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [embedUrl, setEmbedUrl] = React.useState("");
  const [draftUrl, setDraftUrl] = React.useState("");

  // Load current user + saved URL
  React.useEffect(() => {
    (async () => {
      const u = await User.me();
      setUser(u);
      const saved = u?.settings?.kpi_embed_url || "";
      const urlParams = new URLSearchParams(window.location.search);
      const override = urlParams.get("url") || "";
      const initial = override || saved;
      setEmbedUrl(initial);
      setDraftUrl(saved);
      setLoading(false);
    })();
  }, []);

  // Add a helper to scroll to settings
  const scrollToSettings = () => {
    const el = document.getElementById("kpi-settings");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const validHttp = (s) => /^https?:\/\//i.test(String(s || "").trim());
  const isPowerBI = (s) => /powerbi\.com/i.test(String(s || ""));
  const canSave = validHttp(draftUrl) && !saving;

  const save = async () => {
    if (!user) return;
    if (!validHttp(draftUrl)) {
      alert("Please paste a valid Power BI public embed link (Publish to web).");
      return;
    }
    setSaving(true);
    const next = {
      ...(user.settings || {}),
      kpi_embed_url: draftUrl.trim()
    };
    const updated = await User.updateMyUserData({ settings: next });
    setUser({ ...user, settings: next });
    setEmbedUrl(draftUrl.trim());
    setSaving(false);
  };

  const clearSaved = async () => {
    if (!user) return;
    setSaving(true);
    const next = { ...(user.settings || {}) };
    delete next.kpi_embed_url;
    await User.updateMyUserData({ settings: next });
    setUser({ ...user, settings: next });
    setDraftUrl("");
    setEmbedUrl("");
    setSaving(false);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Activity KPIs</h1>
            <p className="text-sm text-slate-600">
              Embed a Power BI report (Publish to web). Use ?url=... in the address bar to preview without saving.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            Power BI public embeds supported
          </Badge>
        </div>

        {/* EMBED FIRST */}
        {embedUrl ? (
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="px-4 py-2 border-b text-sm text-slate-700 flex items-center justify-between">
              <span>Embedded report</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={scrollToSettings}
                  className="text-slate-600 hover:text-slate-900 hover:underline"
                  title="Edit report link"
                >
                  Edit link
                </button>
                <a href={embedUrl} target="_blank" rel="noreferrer" className="text-sky-700 hover:underline">
                  Open in new tab
                </a>
              </div>
            </div>
            <div className="relative w-full" style={{ height: "75vh" }}>
              <iframe
                src={embedUrl}
                title="Activity KPIs"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
                style={{ border: 0 }}
              />
            </div>
          </div>
        ) : (
          <Card className="border-slate-200">
            <CardContent className="p-6 text-sm text-slate-600">
              No report configured yet. Paste a Power BI public embed link below and click Save.
            </CardContent>
          </Card>
        )}

        {/* SETTINGS MOVED TO BOTTOM */}
        <Card id="kpi-settings" className="border-slate-200">
          <CardHeader className="py-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="w-4 h-4 text-sky-600" />
              Report URL
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
              <Input
                placeholder="https://app.powerbi.com/view?r=..."
                value={draftUrl}
                onChange={(e) => setDraftUrl(e.target.value)}
                className="md:flex-1"
              />
              <Button onClick={save} disabled={!canSave} className="bg-sky-600 hover:bg-sky-700">
                {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save
              </Button>
              <Button variant="outline" onClick={() => setDraftUrl(embedUrl || "")} disabled={saving}>
                Reset
              </Button>
              <Button
                variant="outline"
                onClick={clearSaved}
                disabled={saving || !embedUrl}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
              <Info className="w-3.5 h-3.5" />
              {draftUrl
                ? (isPowerBI(draftUrl) ? "Looks like a Power BI link." : "This URL doesn’t look like a Power BI link, but we’ll still try to embed it.")
                : "Paste the Power BI 'Publish to web' URL."}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
