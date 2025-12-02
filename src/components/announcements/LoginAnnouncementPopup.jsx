import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Megaphone } from "lucide-react";

export default function LoginAnnouncementPopup({ items = [], onClose, onMarkAllRead }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const first = items[0];
  const restCount = Math.max(0, items.length - 1);

  return (
    <div className="floating-panel" data-floating-key="login_announcement" style={{ right: 16, bottom: 152, zIndex: 10030 }}>
      <Card className="bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden w-[360px]">
        <div className="flex items-center justify-between px-3 py-2 bg-sky-700 text-white">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            <div className="text-sm font-semibold">Announcement</div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-white hover:bg-white/20">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-3">
          <div className="text-sm font-semibold">{first.title || "Untitled"}</div>
          <div className="prose prose-sm max-w-none mt-1" dangerouslySetInnerHTML={{ __html: first.body_html || "" }} />
          {restCount > 0 && (
            <div className="mt-2 text-xs text-slate-600">+ {restCount} more unread message{restCount > 1 ? "s" : ""}</div>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={onMarkAllRead}>Mark all as read</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}