import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, X, CheckCircle2 } from "lucide-react";

function getTitle(item) {
  return (
    item?.title ||
    item?.subject ||
    item?.announcement_title ||
    item?.announcement?.title ||
    "Announcement"
  );
}

function getSnippet(item) {
  const raw =
    item?.summary ||
    item?.message ||
    item?.body ||
    item?.text ||
    item?.announcement?.summary ||
    "";
  const str = typeof raw === "string" ? raw : JSON.stringify(raw || "");
  return str.length > 160 ? str.slice(0, 157) + "..." : str;
}

function getDate(item) {
  return item?.created_date || item?.sent_at || item?.updated_date || null;
}

export default function FloatingAnnouncementsWidget({
  items = [],
  onClose,
  onMarkAllRead,
  userEmail,
  className = "",
  ...rest
}) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden ${className}`}
      style={{ width: "380px", maxWidth: "92vw" }}
      {...rest}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-blue-600 text-white flex items-center justify-center shadow">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Notifications</div>
            <div className="text-xs text-slate-500">{userEmail || ""}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!!items?.length && (
            <Button
              variant="outline"
              size="sm"
              onClick={onMarkAllRead}
              className="h-8 text-xs"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} title="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="max-h-[60vh]">
        <div className="p-3 space-y-2">
          {(!items || items.length === 0) && (
            <div className="text-sm text-slate-500 px-2 py-3">No unread notifications.</div>
          )}

          {items?.map((item) => {
            const dateVal = getDate(item);
            const when =
              dateVal ? new Date(dateVal).toLocaleString() : "Just now";
            return (
              <div
                key={item?.id || Math.random()}
                className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-white shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-slate-900 text-sm truncate">
                        {getTitle(item)}
                      </div>
                      <Badge className="bg-orange-100 text-orange-800">New</Badge>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{when}</div>
                  </div>
                </div>
                <div className="text-sm text-slate-700 mt-2">
                  {getSnippet(item)}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}