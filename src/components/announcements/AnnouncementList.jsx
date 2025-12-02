
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

function stripHtml(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = String(html || "");
  return (tmp.textContent || tmp.innerText || "").trim();
}

export default function AnnouncementList({ items = [], selectedId, onSelect, onDelete }) {
  const [q, setQ] = React.useState("");

  const filtered = React.useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((it) => {
      const a = it.announcement || {};
      const title = String(a.title || "").toLowerCase();
      const body = stripHtml(a.body_html || "").toLowerCase();
      return title.includes(qq) || body.includes(qq);
    });
  }, [q, items]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search announcements"
          className="h-9"
        />
      </div>
      <div className="flex-1 overflow-auto">
        {filtered.map((row) => {
          const { inbox, announcement: a } = row;
          const isSelected = selectedId === inbox.id;
          const unread = inbox.status === "unread";
          const preview = stripHtml(a?.body_html || "").slice(0, 120);
          return (
            <button
              key={inbox.id}
              onClick={() => onSelect && onSelect(row)}
              className={`w-full text-left px-3 py-2 border-b hover:bg-slate-50 ${isSelected ? "bg-slate-100" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm line-clamp-1">
                  {a?.title || "Untitled"}
                </div>
                <div className="flex items-center gap-2">
                  {a?.category && <Badge variant="outline" className="text-[10px] capitalize">{a.category}</Badge>}
                  {unread && <span className="inline-block h-2 w-2 bg-sky-600 rounded-full" />}
                  {onDelete && (
                    <span
                      role="button"
                      title="Delete"
                      className="p-1 rounded hover:bg-slate-200"
                      onClick={(e) => { e.stopPropagation(); onDelete(row); }}
                    >
                      <X className="w-3 h-3 text-slate-500" />
                    </span>
                  )}
                </div>
              </div>
              {preview && <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">{preview}</div>}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-4 text-sm text-slate-500">No messages</div>
        )}
      </div>
    </div>
  );
}
