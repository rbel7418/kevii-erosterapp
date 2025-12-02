
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, X, Send, Trash2, Mail, CornerDownLeft } from "lucide-react";
import { Announcement } from "@/entities/Announcement";
import { AnnouncementInbox } from "@/entities/AnnouncementInbox";
import { Department } from "@/entities/Department";
import { Employee } from "@/entities/Employee";
import { User } from "@/entities/User";
import { createPageUrl } from "@/utils";
import { sendAcsEmail } from "@/functions/sendAcsEmail";

function stripHtml(html = "") {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").trim();
}
function timeAgo(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleString();
}

export default function AnnouncementsFloating({ onClose, className = "", "data-floating-key": dataFloatingKey }) {
  const [me, setMe] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState([]); // [{inbox, announcement}]
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState(null);

  // compose dialog (inline on the right)
  const [composeMode, setComposeMode] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [category, setCategory] = React.useState("announcement");
  const [targetType, setTargetType] = React.useState("self"); // self | department | all
  const [deptId, setDeptId] = React.useState("");
  const [sendEmail, setSendEmail] = React.useState(false);
  const [departments, setDepartments] = React.useState([]);
  const [sending, setSending] = React.useState(false);

  const canCompose = React.useMemo(() => {
    const role = me?.role === "admin" ? "admin" : me?.access_level || "staff";
    return role === "admin" || role === "manager";
  }, [me]);

  React.useEffect(() => {
    (async () => {
      const u = await User.me().catch(() => null);
      setMe(u);
      const depts = await Department.list().catch(() => []);
      setDepartments(depts || []);
      await reload(u);
    })();
  }, []);

  async function reload(userArg) {
    const user = userArg || me;
    if (!user?.email) return;
    setLoading(true);
    const inbox = await AnnouncementInbox.filter({ user_email: user.email }, "-delivered_at", 200).catch(() => []);
    const ids = Array.from(new Set((inbox || []).map(r => r.announcement_id).filter(Boolean)));
    const byId = {};
    for (let i = 0; i < ids.length; i++) {
      const list = await Announcement.filter({ id: ids[i] }).catch(() => []);
      if (list && list[0]) byId[ids[i]] = list[0];
    }
    const merged = (inbox || []).map(r => ({ inbox: r, announcement: byId[r.announcement_id] || null }));
    setRows(merged);
    if (!selected && merged[0]) setSelected(merged[0]);
    setLoading(false);
  }

  const filtered = React.useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;
    return rows.filter(({ announcement }) => {
      const t = (announcement?.title || "").toLowerCase();
      const b = stripHtml(announcement?.body_html || "").toLowerCase();
      const c = (announcement?.category || "").toLowerCase();
      return t.includes(qq) || b.includes(qq) || c.includes(qq);
    });
  }, [q, rows]);

  const markUnread = async (row) => {
    if (!row?.inbox?.id) return;
    await AnnouncementInbox.update(row.inbox.id, { status: "unread", read_at: null });
    setRows(prev => prev.map(r => r.inbox.id === row.inbox.id ? { ...r, inbox: { ...r.inbox, status: "unread", read_at: null } } : r));
  };
  const markRead = async (row) => {
    if (!row?.inbox?.id) return;
    await AnnouncementInbox.update(row.inbox.id, { status: "read", read_at: new Date().toISOString() });
    setRows(prev => prev.map(r => r.inbox.id === row.inbox.id ? { ...r, inbox: { ...r.inbox, status: "read", read_at: new Date().toISOString() } } : r));
  };
  const deleteInboxItem = async (row) => {
    if (!row?.inbox?.id) return;
    const ok = window.confirm("Remove this message from your inbox?");
    if (!ok) return;
    await AnnouncementInbox.delete(row.inbox.id);
    setRows(prev => prev.filter(r => r.inbox.id !== row.inbox.id));
    if (selected?.inbox?.id === row.inbox.id) setSelected(null);
  };

  const openCompose = () => {
    setComposeMode(true);
    setTitle("");
    setBody("");
    setCategory("announcement");
    setTargetType("self");
    setDeptId("");
    // Ensure that if a staff user opens compose, target type is "self"
    if (!canCompose && targetType !== "self") {
      setTargetType("self");
    }
  };

  const sendNow = async () => {
    if (!title || !body) {
      alert("Please enter a title and message.");
      return;
    }
    setSending(true);
    try {
      // Resolve recipients
      let recipients = [];
      if (targetType === "self") {
        if (me?.email) recipients = [me.email];
      } else if (targetType === "department") {
        const emps = await Employee.filter({ department_id: deptId }).catch(() => []);
        recipients = (emps || []).map(e => e.user_email).filter(Boolean);
      } else if (targetType === "all") {
        const emps = await Employee.list().catch(() => []);
        recipients = (emps || []).map(e => e.user_email).filter(Boolean);
      }
      recipients = Array.from(new Set(recipients)).filter(Boolean);
      if (recipients.length === 0) {
        alert("No recipients found.");
        setSending(false);
        return;
      }

      const ann = await Announcement.create({
        title,
        body_html: body,
        category,
        department_id: targetType === "department" ? deptId : "",
        recipient_employee_ids: [],
        send_via_email: !!sendEmail,
        show_on_login: true,
        status: "sent",
      });

      // Build inbox rows
      const inboxRows = recipients.map(email => ({
        announcement_id: ann.id,
        user_email: email,
        status: "unread",
        delivered_at: new Date().toISOString(),
        delivery_channel: sendEmail ? "both" : "in_app",
      }));
      if (inboxRows.length > 0) {
        await AnnouncementInbox.bulkCreate(inboxRows);
      }

      if (sendEmail) {
        const subject = `[${category.toUpperCase()}] ${title}`;
        const html = `<div style="font-family:Arial,Helvetica,sans-serif"><h3>${title}</h3><div>${body}</div></div>`;
        for (let i = 0; i < recipients.length; i++) {
          const to = recipients[i];
          try {
            await sendAcsEmail({ to, subject, html });
          } catch (e) {
            // continue; show a toast-like alert for first failure
            if (i === 0) console.warn("Email send failed for", to, e);
          }
        }
      }

      // If self is among recipients, refresh inbox
      if (recipients.includes(me?.email)) await reload(me);
      setComposeMode(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`floating-panel ${className}`} data-floating-key={dataFloatingKey || "announcements_main"} style={{ right: 16, bottom: 120, maxWidth: 1100, width: "96vw", height: "78vh" }}>
      <Card className="bg-white border rounded-xl shadow-2xl overflow-hidden h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-800 text-white">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            <span className="text-sm font-semibold">Announcements</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => { window.location.href = createPageUrl("Announcements"); }}
              title="Open full page"
              data-no-drag
            >
              Open full page
            </Button>
            {/* EDIT: Always show Compose; staff will be limited to 'Only me' */}
            <Button
              size="sm"
              className="bg-sky-600 hover:bg-sky-700"
              onClick={openCompose}
              data-no-drag
              title="Compose"
            >
              <Send className="w-4 h-4 mr-1" /> Compose
            </Button>
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/10" onClick={onClose} data-no-drag title="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex">
          {/* Left: Inbox */}
          <aside className="w-[320px] border-r bg-slate-50 flex flex-col">
            <div className="p-3">
              <Input placeholder="Search inbox..." value={q} onChange={(e) => setQ(e.target.value)} className="h-9" />
            </div>
            <div className="flex-1 overflow-auto">
              {loading && <div className="px-3 py-2 text-sm text-slate-500">Loading…</div>}
              {!loading && filtered.length === 0 && <div className="px-3 py-2 text-sm text-slate-500">No messages.</div>}
              {!loading && filtered.map((row) => {
                const { inbox, announcement: a } = row;
                const active = selected?.inbox?.id === inbox.id;
                const unread = inbox.status === "unread";
                const preview = stripHtml(a?.body_html || "").slice(0, 120);
                return (
                  <div
                    key={inbox.id}
                    className={`px-3 py-2 border-b cursor-pointer ${active ? "bg-slate-100" : "hover:bg-slate-100"}`}
                    onClick={() => setSelected(row)}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`font-semibold text-sm line-clamp-1 ${unread ? "text-slate-900" : "text-slate-700"}`}>
                        {a?.title || "Untitled"}
                      </div>
                      <div className="flex items-center gap-2">
                        {unread && <span className="inline-block h-2 w-2 bg-sky-600 rounded-full" />}
                        <span className="text-[11px] text-slate-400">{timeAgo(inbox.delivered_at)}</span>
                        {/* NEW: X delete on list row */}
                        <button
                          title="Delete"
                          className="p-1 rounded hover:bg-slate-200"
                          onClick={(e) => { e.stopPropagation(); deleteInboxItem(row); }}
                        >
                          <X className="w-3 h-3 text-slate-500" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 line-clamp-2">{preview}</div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Right: Reader / Composer */}
          <section className="flex-1 bg-white">
            {/* Composer */}
            {composeMode ? (
              <div className="p-4 space-y-3">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Subject…" />
                  </div>
                  <div className="space-y-1">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="announcement">Announcement</SelectItem>
                        <SelectItem value="reminder">Reminder</SelectItem>
                        <SelectItem value="must_do">Must do</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Message</Label>
                  <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} placeholder="Write your message…" />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>Recipients</Label>
                    {/* EDIT: Staff limited to 'Only me'; admin/manager can choose */}
                    <Select
                      value={targetType}
                      onValueChange={setTargetType}
                    >
                      <SelectTrigger><SelectValue placeholder="Recipients" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="self">Only me (test)</SelectItem>
                        {canCompose && <>
                          <SelectItem value="department">A department</SelectItem>
                          <SelectItem value="all">All staff</SelectItem>
                        </>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Department</Label>
                    <Select value={deptId} onValueChange={setDeptId} disabled={!canCompose || targetType !== "department"}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        {(departments || []).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Email copies</Label>
                    <Button
                      type="button"
                      variant={sendEmail ? "default" : "outline"}
                      onClick={() => setSendEmail(v => !v)}
                      className={sendEmail ? "bg-sky-600 hover:bg-sky-700" : ""}
                    >
                      <Mail className="w-4 h-4 mr-2" /> {sendEmail ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={sendNow} disabled={sending} className="bg-sky-600 hover:bg-sky-700">
                    <Send className="w-4 h-4 mr-2" /> {sending ? "Sending…" : "Send now"}
                  </Button>
                  <Button variant="outline" onClick={() => setComposeMode(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              // Reader
              <div className="h-full flex flex-col">
                {!selected ? (
                  <div className="p-6 text-sm text-slate-500">Select a message to read.</div>
                ) : (
                  <>
                    <div className="px-4 py-3 border-b bg-white flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-lg text-slate-900">{selected.announcement?.title || "Untitled"}</div>
                        <div className="text-xs text-slate-500">
                          {selected.announcement?.category?.toUpperCase() || "ANNOUNCEMENT"} • {timeAgo(selected.inbox?.delivered_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selected.inbox?.status === "unread" ? (
                          <Button size="sm" variant="outline" onClick={() => markRead(selected)}>Mark read</Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => markUnread(selected)}>Mark unread</Button>
                        )}
                        <Button size="sm" variant="destructive" onClick={() => deleteInboxItem(selected)}>
                          <Trash2 className="w-4 h-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                    <div className="p-4 overflow-auto text-sm leading-relaxed">
                      <div className="prose prose-sm max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: selected.announcement?.body_html || "" }} />
                      </div>
                    </div>
                    <div className="px-4 py-2 border-t text-xs text-slate-500 flex items-center gap-2">
                      <CornerDownLeft className="w-3 h-3" />
                      Tip: Drag this window anywhere. It bounces and remembers position.
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </Card>
    </div>
  );
}
