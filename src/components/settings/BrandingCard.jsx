import React from "react";
import { OrgSettings } from "@/entities/OrgSettings";
import { User } from "@/entities/User";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UploadFile } from "@/integrations/Core";

export default function BrandingCard() {
  const [me, setMe] = React.useState(null);
  const [row, setRow] = React.useState(null);
  const [logo, setLogo] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const u = await User.me();
        setMe(u || null);
        const list = await OrgSettings.list();
        const r = Array.isArray(list) ? list[0] : null;
        setRow(r || null);
        setLogo(r?.company_logo || "");
      } catch {
        setRow(null);
      }
    })();
  }, []);

  const isAllowed = me?.role === "admin" || me?.access_level === "manager";

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setLogo(file_url);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!logo) return;
    setSaving(true);
    try {
      if (row?.id) {
        const updated = await OrgSettings.update(row.id, { ...row, company_logo: logo });
        setRow(updated);
      } else {
        const created = await OrgSettings.create({ company_logo: logo });
        setRow(created);
      }
      // Notify layout/theme listeners to refresh logo immediately
      try { window.dispatchEvent(new CustomEvent("theme-updated", {})); } catch {}
    } finally {
      setSaving(false);
    }
  };

  if (!me) {
    return <Card><CardContent className="p-4">Loading…</CardContent></Card>;
  }

  if (!isAllowed) {
    return (
      <Card>
        <CardHeader><CardTitle>Branding</CardTitle></CardHeader>
        <CardContent>
          <Alert><AlertDescription>You need admin or manager access to change branding.</AlertDescription></Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Branding (Logo)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="text-sm text-slate-600 mb-2">Current logo</div>
          <div className="flex items-center gap-4">
            <div className="h-12 w-auto border rounded bg-white px-2 py-1 inline-flex items-center">
              {logo ? (
                <img src={logo} alt="Logo preview" className="h-10 w-auto object-contain" />
              ) : (
                <span className="text-slate-400 text-sm">No logo uploaded</span>
              )}
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Tip: Transparent PNG or SVG; height ~24–32px fits best in the top bar.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => handleUpload(e.target.files?.[0])}
            disabled={uploading}
            className="max-w-xs"
          />
          <Button onClick={save} disabled={!logo || uploading || saving} className="bg-sky-600 hover:bg-sky-700">
            {saving ? "Saving…" : "Save logo"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}