import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Inbox, Bell, Megaphone, MessageSquare, Calendar, X, Send, Loader2 } from "lucide-react";
import { Department } from "@/entities/Department";
import { Announcement } from "@/entities/Announcement";
import { AnnouncementInbox } from "@/entities/AnnouncementInbox";
import { ChatChannel } from "@/entities/ChatChannel";
import { ChatMembership } from "@/entities/ChatMembership";
import { User } from "@/entities/User";
import { Employee } from "@/entities/Employee";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import ChatPanel from "@/components/chat/ChatPanel";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

export default function CommsCenter(props) {
  const { onClose, className = "" } = props || {};
  const dataFloatingKey = props ? props["data-floating-key"] : undefined;

  const [me, setMe] = React.useState(null);

  // Inbox state
  const [loadingInbox, setLoadingInbox] = React.useState(true);
  const [inboxRows, setInboxRows] = React.useState([]); // [{inbox, announcement}]
  const [selectedRow, setSelectedRow] = React.useState(null);

  // Chat state
  const [departments, setDepartments] = React.useState([]);
  const [deptId, setDeptId] = React.useState("");
  const [channelId, setChannelId] = React.useState("");

  // Employees (for targeting)
  const [employees, setEmployees] = React.useState([]);

  // SMS state
  const [backendOk, setBackendOk] = React.useState(false);
  const [checkingBackend, setCheckingBackend] = React.useState(true);
  const [smsDept, setSmsDept] = React.useState("");
  const [smsTo, setSmsTo] = React.useState("");
  const [smsBody, setSmsBody] = React.useState("");
  const [smsSending, setSmsSending] = React.useState(false);

  // Quick Announce (email + inbox + optional SMS)
  const [annTitle, setAnnTitle] = React.useState("");
  const [annCategory, setAnnCategory] = React.useState("announcement");
  const [annDeptId, setAnnDeptId] = React.useState("");
  const [annBody, setAnnBody] = React.useState("");
  const [annSendEmail, setAnnSendEmail] = React.useState(true);
  const [annShowOnLogin, setAnnShowOnLogin] = React.useState(true);
  const [annSendSms, setAnnSendSms] = React.useState(false);
  const [annSmsText, setAnnSmsText] = React.useState("");
  const [annSending, setAnnSending] = React.useState(false);
  const [annStatus, setAnnStatus] = React.useState("");

  // Targeting mode
  const [annTargetMode, setAnnTargetMode] = React.useState("department"); // "department" | "individual"
  const [annEmployeeId, setAnnEmployeeId] = React.useState("");

  React.useEffect(() => {
    (async () => {
      const u = await User.me().catch(() => null);
      setMe(u);
      const ds = await Department.list().catch(() => []);
      setDepartments(ds || []);
      const es = await Employee.list().catch(() => []);
      setEmployees(es || []);
      await loadInbox(u);

      setCheckingBackend(true);
      try {
        const { data } = await base44.functions.invoke("smsHealth", {});
        setBackendOk(!!data?.ok);
      } catch {
        setBackendOk(false);
      } finally {
        setCheckingBackend(false);
      }
    })();
  }, []);

  async function loadInbox(userArg) {
    const u = userArg || me;
    if (!u?.email) return;
    setLoadingInbox(true);
    const inbox = await AnnouncementInbox.filter({ user_email: u.email }, "-delivered_at", 100).catch(() => []);
    const ids = Array.from(new Set((inbox || []).map(r => r.announcement_id).filter(Boolean)));
    const byId = {};
    await Promise.all(ids.map(async (id) => {
      const list = await Announcement.filter({ id }).catch(() => []);
      if (Array.isArray(list) && list[0]) byId[id] = list[0];
    }));
    const rows = (inbox || []).map(r => ({ inbox: r, announcement: byId[r.announcement_id] || null }));
    setInboxRows(rows);
    if (!selectedRow && rows[0]) setSelectedRow(rows[0]);
    setLoadingInbox(false);
  }

  const markRead = async (row) => {
    if (!row?.inbox?.id) return;
    await AnnouncementInbox.update(row.inbox.id, { status: "read", read_at: new Date().toISOString() });
    setInboxRows(prev => prev.map(x => x.inbox.id === row.inbox.id ? { ...x, inbox: { ...x.inbox, status: "read", read_at: new Date().toISOString() } } : x));
  };
  const markUnread = async (row) => {
    if (!row?.inbox?.id) return;
    await AnnouncementInbox.update(row.inbox.id, { status: "unread", read_at: null });
    setInboxRows(prev => prev.map(x => x.inbox.id === row.inbox.id ? { ...x, inbox: { ...x.inbox, status: "unread", read_at: null } } : x));
  };

  const ensureWardChannel = React.useCallback(async (dept) => {
    if (!dept) return;
    const d = (departments || []).find(x => x.id === dept);
    const name = d ? `${d.name} chat` : "Ward chat";
    const existing = await ChatChannel.filter({ department_id: dept }).catch(() => []);
    const found = (existing || [])[0] || null;
    const ch = found || await ChatChannel.create({ name, department_id: dept });
    if (!found && me?.email) {
      await ChatMembership.create({ channel_id: ch.id, user_email: me.email, role: "admin" });
    }
    setChannelId(ch.id);
  }, [departments, me]);

  React.useEffect(() => {
    if (deptId) ensureWardChannel(deptId);
  }, [deptId, ensureWardChannel]);

  const smsSegments = React.useMemo(() => {
    const t = smsBody || "";
    if (!t) return 0;
    const gsm7 = /^[\x00-\x7F]+$/.test(t);
    const S = gsm7 ? 160 : 70;
    const C = gsm7 ? 153 : 67;
    const L = Array.from(t).length;
    return L <= S ? 1 : Math.ceil(L / C);
  }, [smsBody]);

  const sendSms = async () => {
    const to = String(smsTo || "").trim();
    if (!to || !smsBody.trim()) return;
    setSmsSending(true);
    try {
      await base44.functions.invoke("sendSms", {
        to,
        body: smsBody,
        staff_id: me?.email || "me",
        tags: smsDept ? [smsDept] : []
      });
      setSmsBody("");
    } finally {
      setSmsSending(false);
    }
  };

  const announceRecipients = React.useMemo(() => {
    if (annTargetMode === "individual") {
      const e = (employees || []).find(x => x.id === annEmployeeId);
      return e ? [e] : [];
    }
    const all = employees || [];
    if (!annDeptId) return all;
    return all.filter(e => e.department_id === annDeptId);
  }, [employees, annDeptId, annTargetMode, annEmployeeId]);

  const stripHtml = React.useCallback((html) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = String(html || "");
    return (tmp.textContent || tmp.innerText || "").trim();
  }, []);

  const sendQuickAnnounce = async () => {
    if (!annTitle || !annBody) {
      setAnnStatus("Please enter title and message.");
      return;
    }
    const recips = announceRecipients;
    if (recips.length === 0) {
      setAnnStatus("No recipients for the selected target.");
      return;
    }
    setAnnSending(true);
    setAnnStatus("Preparing…");

    try {
      // Create Announcement record
      const ann = await Announcement.create({
        title: annTitle,
        body_html: annBody,
        category: annCategory,
        department_id: annTargetMode === "department" ? (annDeptId || "") : "",
        recipient_employee_ids: annTargetMode === "individual" ? recips.map(e => e.id) : [],
        send_via_email: !!annSendEmail,
        show_on_login: !!annShowOnLogin,
        schedule_type: "once",
        recurrence: "none",
        status: "sent",
      });

      // Build inbox rows
      const rows = recips.map(e => ({
        announcement_id: ann.id,
        user_email: e.user_email || "",
        employee_id: e.employee_id || "",
        status: "unread",
        delivered_at: new Date().toISOString(),
        delivery_channel: annSendEmail && e.user_email ? "both" : "in_app"
      })).filter(r => r.user_email || r.employee_id);
      if (rows.length > 0) {
        setAnnStatus("Delivering to in-app inbox…");
        await AnnouncementInbox.bulkCreate(rows);
      }

      // Email copies
      if (annSendEmail) {
        setAnnStatus("Sending email copies…");
        const subject = `[${annCategory.toUpperCase()}] ${annTitle}`;
        const html = `<div style="font-family:Arial,Helvetica,sans-serif"><h3 style="margin:0 0 8px 0">${annTitle}</h3><div>${annBody}</div></div>`;
        let sent = 0;
        for (let i = 0; i < recips.length; i++) {
          const e = recips[i];
          if (!e.user_email) continue;
          await base44.functions.invoke("sendAcsEmail", {
            to: e.user_email,
            subject,
            html,
            from_name: me?.full_name || "Announcements",
          });
          sent += 1;
          if (sent % 10 === 0) setAnnStatus(`Email sent: ${sent}/${recips.length}`);
        }
      }

      // Optional SMS copies
      if (annSendSms) {
        const smsMsg = (annSmsText && annSmsText.trim()) ? annSmsText.trim() : (annTitle ? `${annTitle}: ` : "") + stripHtml(annBody);
        const smsTargets = recips.filter(e => !!String(e.phone || "").trim());
        if (smsTargets.length > 0) {
          setAnnStatus(`Sending SMS to ${smsTargets.length} recipient(s)…`);
          let sent = 0;
          for (let i = 0; i < smsTargets.length; i++) {
            const e = smsTargets[i];
            await base44.functions.invoke("sendSms", {
              to: e.phone,
              body: smsMsg,
              tags: annTargetMode === "department" && annDeptId ? [annDeptId] : [annCategory],
              staff_id: me?.email || "system"
            });
            sent += 1;
            if (sent % 10 === 0) setAnnStatus(`SMS sent: ${sent}/${smsTargets.length}`);
          }
        } else {
          setAnnStatus("No phone numbers on recipients; SMS skipped.");
        }
      }

      setAnnStatus(`Announcement delivered. Recipients: ${recips.length}.`);
      setAnnTitle("");
      setAnnBody("");
      setAnnSendSms(false);
      setAnnSmsText("");
      await loadInbox();
    } catch (e) {
      setAnnStatus(`Failed: ${e?.message || String(e)}`);
    } finally {
      setAnnSending(false);
    }
  };

  return (
    <div
      className={`floating-panel ${className}`}
      data-floating-key={dataFloatingKey || "comms_center"}
      style={{ right: 16, bottom: 120, maxWidth: 1100, width: "96vw", height: "78vh" }}
    >
      <Card className="bg-white border rounded-xl shadow-2xl overflow-hidden h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-800 text-white">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4" />
            <span className="text-sm font-semibold">Communications Center</span>
          </div>
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/10" onClick={onClose} data-no-drag title="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="inbox" className="h-full flex flex-col">
            <div className="border-b p-2">
              <TabsList>
                <TabsTrigger value="inbox" className="gap-1"><Bell className="w-3 h-3" /> Inbox</TabsTrigger>
                <TabsTrigger value="chat" className="gap-1"><MessageSquare className="w-3 h-3" /> Ward Chat</TabsTrigger>
                <TabsTrigger value="sms" className="gap-1"><Send className="w-3 h-3" /> Staff Messaging</TabsTrigger>
                <TabsTrigger value="announce" className="gap-1"><Megaphone className="w-3 h-3" /> Announce</TabsTrigger>
              </TabsList>
            </div>

            {/* Inbox */}
            <TabsContent value="inbox" className="flex-1 overflow-hidden">
              <div className="grid grid-cols-12 gap-3 h-full">
                <aside className="col-span-12 md:col-span-4 border-r bg-slate-50 h-full overflow-auto">
                  {loadingInbox ? (
                    <div className="p-3 text-sm text-slate-500">Loading…</div>
                  ) : (inboxRows.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500">No messages.</div>
                  ) : inboxRows.map((row) => {
                    const a = row.announcement;
                    const active = selectedRow?.inbox?.id === row.inbox.id;
                    const unread = row.inbox.status === "unread";
                    const preview = (a?.body_html || "").replace(/<[^>]+>/g, "").slice(0, 100);
                    return (
                      <div
                        key={row.inbox.id}
                        className={`px-3 py-2 border-b cursor-pointer ${active ? "bg-slate-100" : "hover:bg-slate-100"}`}
                        onClick={() => setSelectedRow(row)}
                      >
                        <div className="flex items-center justify-between">
                          <div className={`text-sm font-semibold ${unread ? "text-slate-900" : "text-slate-700"}`}>{a?.title || "Untitled"}</div>
                          <div className="flex items-center gap-2">
                            {unread && <span className="inline-block h-2 w-2 bg-sky-600 rounded-full" />}
                            <span className="text-[11px] text-slate-400">{row.inbox?.delivered_at ? format(new Date(row.inbox.delivered_at), "MMM d, HH:mm") : ""}</span>
                          </div>
                        </div>
                        <div className="text-xs text-slate-600 line-clamp-2">{preview}</div>
                      </div>
                    );
                  }))}
                </aside>
                <section className="col-span-12 md:col-span-8 h-full overflow-auto">
                  {!selectedRow ? (
                    <div className="p-4 text-sm text-slate-500">Select a message.</div>
                  ) : (
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-lg font-semibold">{selectedRow.announcement?.title || "Untitled"}</div>
                          <div className="text-xs text-slate-500">{selectedRow.announcement?.category?.toUpperCase() || "ANNOUNCEMENT"}</div>
                        </div>
                        <div className="flex gap-2">
                          {selectedRow.inbox.status === "unread" ? (
                            <Button size="sm" variant="outline" onClick={() => markRead(selectedRow)}>Mark read</Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => markUnread(selectedRow)}>Mark unread</Button>
                          )}
                        </div>
                      </div>
                      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selectedRow.announcement?.body_html || "" }} />
                    </div>
                  )}
                </section>
              </div>
            </TabsContent>

            {/* Ward Chat */}
            <TabsContent value="chat" className="flex-1 overflow-auto">
              <div className="p-3 space-y-3 h-full flex flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={deptId} onValueChange={setDeptId}>
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Select ward" />
                    </SelectTrigger>
                    <SelectContent>
                      {(departments || []).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => ensureWardChannel(deptId)} disabled={!deptId} className="bg-sky-600 hover:bg-sky-700">Open ward channel</Button>
                </div>
                <div className="flex-1 min-h-0">
                  {channelId ? (
                    <ChatPanel channelId={channelId} className="h-[60vh]" />
                  ) : (
                    <div className="h-full border rounded-xl bg-slate-50 flex items-center justify-center text-sm text-slate-500">Pick a ward and open its channel</div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Staff Messaging (SMS) */}
            <TabsContent value="sms" className="flex-1 overflow-auto">
              <div className="p-3 space-y-3">
                <div className="text-sm text-slate-600">
                  {checkingBackend ? "Checking SMS backend…" : (backendOk ? "SMS backend: active" : "SMS backend: not installed — using log-only mode")}
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-slate-600">Department tag</div>
                    <Select value={smsDept} onValueChange={setSmsDept}>
                      <SelectTrigger><SelectValue placeholder="All depts" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>All departments</SelectItem>
                        {(departments || []).map(d => <SelectItem key={d.id} value={d.name || d.id}>{d.name || d.id}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <div className="text-xs text-slate-600">Recipient (E.164 or UK 07…)</div>
                    <Input value={smsTo} onChange={(e) => setSmsTo(e.target.value)} placeholder="+447700900123" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-slate-600">Message</div>
                  <Textarea value={smsBody} onChange={(e) => setSmsBody(e.target.value)} rows={6} placeholder="Short operational message…" />
                  <div className="text-xs text-slate-500">Segments: {smsSegments}</div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={sendSms} disabled={smsSending || !smsBody.trim() || !smsTo.trim()} className="bg-sky-600 hover:bg-sky-700">
                    {smsSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-1" />} Send SMS
                  </Button>
                </div>
                <div className="text-[11px] text-slate-500">Note: SMS respects your Azure Communication Services configuration.</div>
              </div>
            </TabsContent>

            {/* Announce */}
            <TabsContent value="announce" className="flex-1 overflow-auto">
              <div className="p-3 space-y-3">
                <div className="text-slate-900 font-semibold">Quick Announce (Email + In‑app + optional SMS)</div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Title</Label>
                    <Input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder="e.g., Annual leave deadline" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Select value={annCategory} onValueChange={setAnnCategory}>
                      <SelectTrigger><SelectValue placeholder="Announcement" /></SelectTrigger>
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

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Target</Label>
                    <Select value={annTargetMode} onValueChange={(v) => { setAnnTargetMode(v); setAnnEmployeeId(""); }}>
                      <SelectTrigger><SelectValue placeholder="Target audience" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="department">Department</SelectItem>
                        <SelectItem value="individual">Individual staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {annTargetMode === "department" ? (
                    <div className="space-y-1">
                      <Label className="text-xs">Department</Label>
                      <Select value={annDeptId} onValueChange={setAnnDeptId}>
                        <SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>All departments</SelectItem>
                          {(departments || []).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-slate-500 mt-1">Recipients: {announceRecipients.length}</div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label className="text-xs">Recipient</Label>
                      <Select value={annEmployeeId} onValueChange={setAnnEmployeeId}>
                        <SelectTrigger><SelectValue placeholder="Choose staff…" /></SelectTrigger>
                        <SelectContent>
                          {(employees || []).map(e => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.full_name || e.employee_id} {e.user_email ? `— ${e.user_email}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-slate-500 mt-1">Recipients: {announceRecipients.length}</div>
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between border rounded px-3 py-2 bg-white">
                    <div>
                      <div className="text-sm font-medium">Email copies</div>
                      <div className="text-xs text-slate-500">Send email if addresses exist</div>
                    </div>
                    <Switch checked={annSendEmail} onCheckedChange={setAnnSendEmail} />
                  </div>
                  <div className="flex items-center justify-between border rounded px-3 py-2 bg-white">
                    <div>
                      <div className="text-sm font-medium">Show on login</div>
                      <div className="text-xs text-slate-500">Popup on recipient login</div>
                    </div>
                    <Switch checked={annShowOnLogin} onCheckedChange={setAnnShowOnLogin} />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Message</Label>
                  <div className="rounded border overflow-hidden">
                    <ReactQuill theme="snow" value={annBody} onChange={setAnnBody} style={{ height: 240 }} />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between border rounded px-3 py-2 bg-white">
                    <div>
                      <div className="text-sm font-medium">Also send SMS</div>
                      <div className="text-xs text-slate-500">Uses ACS SMS if configured</div>
                    </div>
                    <Switch checked={annSendSms} onCheckedChange={setAnnSendSms} disabled={!backendOk} />
                  </div>
                  {annSendSms && (
                    <div className="space-y-1">
                      <Label className="text-xs">Optional SMS text</Label>
                      <Textarea
                        rows={4}
                        value={annSmsText}
                        onChange={(e) => setAnnSmsText(e.target.value)}
                        placeholder="Leave blank to auto-use a plain-text version of the announcement"
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <Button onClick={sendQuickAnnounce} disabled={annSending || !annTitle || !annBody || announceRecipients.length === 0} className="bg-sky-600 hover:bg-sky-700">
                    {annSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span className="ml-2">{annSending ? "Sending…" : "Send now"}</span>
                  </Button>
                  {annStatus && <span className="text-sm text-slate-600">{annStatus}</span>}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );
}