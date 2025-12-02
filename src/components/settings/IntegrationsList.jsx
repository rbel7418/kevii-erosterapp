import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Mail, Upload, Image, FileSearch, Link2, Lock, MessageCircle } from "lucide-react";

const items = [
  {
    name: "InvokeLLM",
    icon: Bot,
    status: "Available",
    desc: "Call an LLM with a prompt. Optional web context and JSON responses.",
    how: `import { InvokeLLM } from "@/integrations/Core";
await InvokeLLM({ prompt: "Hello" });`
  },
  {
    name: "SendEmail",
    icon: Mail,
    status: "Available",
    desc: "Send transactional emails to users.",
    how: `import { SendEmail } from "@/integrations/Core";
await SendEmail({ to, subject, body });`
  },
  {
    name: "UploadFile",
    icon: Upload,
    status: "Available",
    desc: "Upload a public file and get a URL you can display or store.",
    how: `import { UploadFile } from "@/integrations/Core";
const { file_url } = await UploadFile({ file });`
  },
  {
    name: "GenerateImage",
    icon: Image,
    status: "Available",
    desc: "Generate an AI image from a detailed prompt.",
    how: `import { GenerateImage } from "@/integrations/Core";
const { url } = await GenerateImage({ prompt });`
  },
  {
    name: "ExtractDataFromUploadedFile",
    icon: FileSearch,
    status: "Available",
    desc: "Extract structured data from CSV, PDF, or images using a target schema.",
    how: `import { ExtractDataFromUploadedFile } from "@/integrations/Core";
const res = await ExtractDataFromUploadedFile({ file_url, json_schema });`
  },
  {
    name: "CreateFileSignedUrl",
    icon: Link2,
    status: "Available",
    desc: "Create a time‑limited signed URL for private files.",
    how: `import { CreateFileSignedUrl } from "@/integrations/Core";
const { signed_url } = await CreateFileSignedUrl({ file_uri });`
  },
  {
    name: "UploadPrivateFile",
    icon: Lock,
    status: "Available",
    desc: "Upload a file to private storage (use with signed URLs).",
    how: `import { UploadPrivateFile } from "@/integrations/Core";
const { file_uri } = await UploadPrivateFile({ file });`
  }
];

export default function IntegrationsList() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Supported Integrations</h2>
        <p className="text-sm text-slate-600">All integrations below are built in and ready to use.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Card key={it.name} className="border-slate-200 shadow-sm">
              <CardHeader className="py-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="w-4 h-4 text-teal-600" />
                    {it.name}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">{it.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm text-slate-700">{it.desc}</p>
                <pre className="text-xs bg-slate-50 border rounded p-2 overflow-x-auto">{it.how}</pre>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="py-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-sky-600" />
            Agents & WhatsApp (optional)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-sm text-slate-700">
          - Agents can use entity tools and support a WhatsApp channel out of the box.
          - Enable an agent in the app to use WhatsApp; no extra integration code is needed.
        </CardContent>
      </Card>
    </div>
  );
}