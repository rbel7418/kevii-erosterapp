import React from "react";
import { OrgSettings } from "@/entities/OrgSettings";
import { UploadFile } from "@/integrations/Core";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Upload, CheckCircle2, RefreshCw, Trash2, Code, FileJson, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ThemeManager() {
  const [row, setRow] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [themeText, setThemeText] = React.useState("");
  const [customCss, setCustomCss] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [applying, setApplying] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("json");

  React.useEffect(() => {
    (async () => {
      try {
        const list = await OrgSettings.list();
        const r = Array.isArray(list) ? list[0] : null;
        setRow(r || null);
        setThemeText(r?.theme_json || "");
        setCustomCss(r?.custom_css || "");
      } catch {
        setRow(null);
        setThemeText("");
        setCustomCss("");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Inject custom CSS into page
  React.useEffect(() => {
    const styleId = "custom-theme-css";
    let styleEl = document.getElementById(styleId);
    
    if (customCss && customCss.trim()) {
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = customCss;
      console.log("✅ Custom CSS injected successfully!");
      console.log("📝 CSS length:", customCss.length, "characters");
    } else {
      if (styleEl) {
        styleEl.remove();
        console.log("❌ Custom CSS removed");
      }
    }

    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, [customCss]);

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const text = await file.text();
      
      if (file.name.endsWith('.json')) {
        JSON.parse(text); // validate
        const { file_url } = await UploadFile({ file });
        setThemeText(text);
        setRow((prev) => ({ ...(prev || {}), theme_url: file_url }));
      } else if (file.name.endsWith('.css')) {
        setCustomCss(text);
      } else {
        alert("Please upload a .json or .css file");
      }
    } catch (err) {
      alert("Invalid file. Please upload valid JSON or CSS.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const applyJsonTheme = async () => {
    setApplying(true);
    try {
      let payload = {
        ...(row || {}),
        theme_json: themeText || "",
        theme_url: row?.theme_url || ""
      };
      if (row?.id) {
        await OrgSettings.update(row.id, payload);
      } else {
        const created = await OrgSettings.create(payload);
        setRow(created);
      }
      try {
        const parsed = themeText ? JSON.parse(themeText) : null;
        window.dispatchEvent(new CustomEvent("theme-updated", { detail: { theme: parsed } }));
      } catch {}
      alert("✅ JSON theme applied successfully!");
    } finally {
      setApplying(false);
    }
  };

  const applyCssTheme = async () => {
    setApplying(true);
    try {
      let payload = {
        ...(row || {}),
        custom_css: customCss || ""
      };
      
      let updated;
      if (row?.id) {
        updated = await OrgSettings.update(row.id, payload);
      } else {
        updated = await OrgSettings.create(payload);
      }
      
      setRow(updated);
      setCustomCss(customCss);
      
      alert("✅ Custom CSS applied and injected into page!");
    } finally {
      setApplying(false);
    }
  };

  const resetJsonTheme = async () => {
    if (!confirm("Reset JSON theme to default?")) return;
    setApplying(true);
    try {
      if (row?.id) {
        await OrgSettings.update(row.id, { ...row, theme_json: "", theme_url: "", nav_overrides: null });
        setThemeText("");
        setRow({ ...row, theme_json: "", theme_url: "", nav_overrides: null });
      }
      window.dispatchEvent(new CustomEvent("theme-updated", { detail: { theme: null } }));
      alert("✅ JSON theme reset to default.");
    } finally {
      setApplying(false);
    }
  };

  const resetCssTheme = async () => {
    if (!confirm("Revert custom CSS to default?")) return;
    setApplying(true);
    try {
      if (row?.id) {
        await OrgSettings.update(row.id, { ...row, custom_css: "" });
        setCustomCss("");
        setRow({ ...row, custom_css: "" });
      }
      alert("✅ Custom CSS reverted to default.");
    } finally {
      setApplying(false);
    }
  };

  const sampleJson = `{
  "name": "My Theme",
  "colors": {
    "topbar_bg": "#002B55",
    "topbar_text": "#FFFFFF",
    "acc1": "#0b5ed7",
    "acc2": "#0ea5e9",
    "acc3": "#8b5cf6",
    "acc4": "#f59e0b",
    "acc5": "#14b8a6"
  },
  "nav": {
    "visible": ["Dashboard","Activity KPIs","Rotas","Company","Reports","Design"],
    "order": ["Dashboard","Activity KPIs","Rotas","Reports","Company","Design"],
    "rename": { "Rotas": "Schedule" }
  }
}`;

  const sampleCss = `:root {
  /* Brand colors */
  --color-brand-primary: rgb(0, 145, 255);
  --color-brand-secondary: rgb(139, 92, 246);
  --color-brand-accent: rgb(245, 158, 11);
  
  /* Override existing theme variables */
  --dm-bg-base: #0c0a09;
  --dm-bg-elevated: #1c1917;
  --dm-bg-subtle: #292524;
  --dm-text-primary: #fafaf9;
  --dm-text-secondary: #a8a29e;
  --dm-border: #44403c;
  --dm-accent: #0091ff;
  
  /* Typography */
  --font-heading: 'Newsreader', serif;
  --font-body: 'Manrope', sans-serif;
  
  /* Shadows */
  --shadow-soft: 0 4px 16px rgba(0, 0, 0, 0.08);
  --shadow-strong: 0 12px 32px rgba(0, 0, 0, 0.12);
}

/* Apply to all text */
body {
  font-family: var(--font-body);
  background: var(--dm-bg-base);
  color: var(--dm-text-primary);
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
}

/* Custom utility classes */
.btn-brand {
  background: var(--color-brand-primary);
  color: white;
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: 600;
}

.glass-effect {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.card-elevated {
  background: var(--dm-bg-elevated);
  border: 1px solid var(--dm-border);
  border-radius: 12px;
  box-shadow: var(--shadow-soft);
}`;

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b">
        <CardTitle className="text-base flex items-center gap-2">
          <Code className="w-4 h-4 text-sky-600" />
          Theme Manager
          {!loading && (
            <Badge variant="outline" className="ml-2">
              {(themeText || customCss) ? "Custom Active" : "Default"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="json" className="gap-2">
              <FileJson className="w-4 h-4" />
              JSON Theme
            </TabsTrigger>
            <TabsTrigger value="css" className="gap-2">
              <Code className="w-4 h-4" />
              Custom CSS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="json" className="space-y-4">
            <div className="flex items-center gap-2">
              <Input type="file" accept=".json" onChange={onPickFile} className="max-w-xs" />
              <Button onClick={applyJsonTheme} disabled={applying || uploading} className="bg-sky-600 hover:bg-sky-700">
                {applying ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Apply JSON
              </Button>
              <Button variant="outline" onClick={resetJsonTheme} disabled={applying || uploading} className="text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" /> Reset
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-slate-600 mb-1">Theme JSON</div>
                <textarea
                  value={themeText}
                  onChange={(e) => setThemeText(e.target.value)}
                  className="w-full min-h-[300px] p-3 border rounded-md font-mono text-xs"
                  placeholder={sampleJson}
                />
                <div className="text-[11px] text-slate-500 mt-2">
                  Supported keys: colors.topbar_bg, colors.topbar_text, colors.acc1..acc5; nav.visible, nav.order, nav.rename.
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-600 mb-1">Sample schema</div>
                <pre className="bg-slate-50 border rounded-md p-3 text-xs overflow-auto min-h-[300px]">{sampleJson}</pre>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="css" className="space-y-4">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-xs">
                <strong>⚠️ Important:</strong> Use standard CSS custom properties and classes. Tailwind's <code className="bg-amber-100 px-1 rounded">@theme</code> directive won't work here (it needs build-time compilation).
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-2">
              <Input type="file" accept=".css" onChange={onPickFile} className="max-w-xs" />
              <Button onClick={applyCssTheme} disabled={applying || uploading} className="bg-sky-600 hover:bg-sky-700">
                {applying ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Apply CSS
              </Button>
              <Button variant="outline" onClick={resetCssTheme} disabled={applying || uploading} className="text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" /> Revert
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-slate-600 mb-1">Custom CSS</div>
                <textarea
                  value={customCss}
                  onChange={(e) => setCustomCss(e.target.value)}
                  className="w-full min-h-[400px] p-3 border rounded-md font-mono text-xs bg-slate-900 text-green-400"
                  placeholder={sampleCss}
                  spellCheck={false}
                />
                <div className="text-[11px] text-slate-500 mt-2">
                  Write standard CSS. Use CSS custom properties (<code>::root</code>) to override theme variables. Changes apply instantly.
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-600 mb-1">Sample CSS (works at runtime)</div>
                <pre className="bg-slate-900 text-green-400 border rounded-md p-3 text-xs overflow-auto min-h-[400px]">{sampleCss}</pre>
                <div className="text-[11px] text-slate-500 mt-2">
                  Use :root for CSS variables, then apply them throughout your styles. Custom utility classes also work.
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-800">
              <strong>💡 What you CAN do:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Define CSS custom properties in <code className="bg-blue-100 px-1 rounded">:root</code></li>
                <li>Override existing theme variables (--dm-bg-base, --dm-accent, etc.)</li>
                <li>Create custom utility classes (.btn-brand, .glass-effect, etc.)</li>
                <li>Style specific elements (body, h1-h6, buttons, etc.)</li>
                <li>Changes apply instantly without page reload</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}