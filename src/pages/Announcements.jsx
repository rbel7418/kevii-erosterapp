
import React from "react";
import { Department } from "@/entities/Department";
import { Employee } from "@/entities/Employee";
import { Announcement } from "@/entities/Announcement";
import { AnnouncementInbox } from "@/entities/AnnouncementInbox";
import { User } from "@/entities/User";
import { OrgSettings } from "@/entities/OrgSettings";
import { UploadFile } from "@/integrations/Core";
import { sendAcsEmail } from "@/functions/sendAcsEmail";
import { acsSmokeTest } from "@/functions/acsSmokeTest";
import { base44 } from "@/api/base44Client"; // NEW: for invoking SMS functions
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, Plus, X, Paperclip, Send, Clock } from "lucide-react";
import ReactQuill from "react-quill";
import 'react-quill/dist/quill.snow.css';

import { format } from "date-fns";
import AnnouncementList from "@/components/announcements/AnnouncementList";

const ALL_DEPTS = "__ALL_DEPARTMENTS__"; // non-empty sentinel used by Select
const NONE_DEPT = "__NO_DEPARTMENT__";   // NEW: pick-only mode (no dept broadcast)

export default function Announcements() {
  const [me, setMe] = React.useState(null);
  const [departments, setDepartments] = React.useState([]);
  const [employees, setEmployees] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [sending, setSending] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [deptId, setDeptId] = React.useState(ALL_DEPTS);
  const [picked, setPicked] = React.useState([]); // array of employee ids
  const [empQuery, setEmpQuery] = React.useState("");
  const [category, setCategory] = React.useState("announcement");
  const [body, setBody] = React.useState("");
  const [sendEmail, setSendEmail] = React.useState(true);
  const [sendSms, setSendSms] = React.useState(false);              // NEW: SMS copies toggle
  const [smsText, setSmsText] = React.useState("");                 // NEW: optional SMS override
  const [showOnLogin, setShowOnLogin] = React.useState(true);
  const [attachments, setAttachments] = React.useState([]);
  const [scheduleType, setScheduleType] = React.useState("once");
  const [sendAt, setSendAt] = React.useState("");
  const [recurrence, setRecurrence] = React.useState("none");
  const [untilDate, setUntilDate] = React.useState("");

  const [statusMsg, setStatusMsg] = React.useState("");

  // NEW: email health state
  const [emailHealth, setEmailHealth] = React.useState({ ok: null, cause: null, note: null, from_domain: null, last6: null });
  const [healthChecked, setHealthChecked] = React.useState(false);

  // NEW: SMS health state
  const [smsHealth, setSmsHealth] = React.useState({ ok: null, from: null });   // NEW: SMS health state, added `from`
  const [smsChecked, setSmsChecked] = React.useState(false);        // NEW: track check

  // NEW: inbox state
  const [inbox, setInbox] = React.useState([]); // [{inbox, announcement}]
  const [selected, setSelected] = React.useState(null); // {inbox, announcement}

  // NEW: sender name for emails
  const [senderName, setSenderName] = React.useState("");

  // Utility: strip HTML to plain text for SMS fallback
  const stripHtml = React.useCallback((html) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = String(html || "");
    return (tmp.textContent || tmp.innerText || "").trim();
  }, []);

  React.useEffect(() => {
    (async () => {
      const u = await User.me().catch(() => null);
      setMe(u);
      // Load org settings to pick default sender name (prefer ALISA)
      let org = null;
      try {
        const rows = await OrgSettings.list();
        org = Array.isArray(rows) ? rows[0] : null;
      } catch (e) {
        console.error("Failed to load OrgSettings:", e);
      }
      const defaultSender =
        (org?.email_sender_name && String(org.email_sender_name).trim()) ||
        "ALISA";
      if (!senderName) setSenderName(defaultSender);
      
      const [ds, es] = await Promise.all([Department.list(), Employee.list()]);
      setDepartments(ds || []);
      setEmployees(es || []);

      // NEW: load inbox for current user
      if (u?.email) {
        const rows = await AnnouncementInbox.filter({ user_email: u.email }, "-delivered_at", 100).catch(() => []);
        const ids = Array.from(new Set((rows || []).map(r => r.announcement_id).filter(Boolean)));
        const anns = {};
        // fetch announcements in parallel
        await Promise.all(ids.map(async (id) => {
          const list = await Announcement.filter({ id }).catch(() => []);
          if (Array.isArray(list) && list[0]) anns[id] = list[0];
        }));
        const joined = (rows || []).map(r => ({ inbox: r, announcement: anns[r.announcement_id] || null }));
        setInbox(joined);
      }
    })();
  }, []);

  // NEW: auto-run email health check once user is known
  React.useEffect(() => {
    (async () => {
      if (!me?.email) {
        setHealthChecked(true); // Mark as checked even if no email, to avoid perpetual loading state if email isn't present
        return;
      }
      try {
        const { data } = await acsSmokeTest({ to: me.email });
        setEmailHealth(data || {});
      } catch (e) {
        // ignore UI noise, user can run manual check
        console.error("Auto ACS smoke test failed:", e);
      } finally {
        setHealthChecked(true);
      }
    })();
  }, [me]);

  // NEW: auto-run SMS health check on mount to get 'from' number
  React.useEffect(() => {
    (async () => {
      try {
        const { data } = await base44.functions.invoke("smsHealth", {});
        setSmsHealth(data || {});
        setSmsChecked(true);
      } catch {
        // ignore; manual button still works
      }
    })();
  }, []);

  const isManager = me?.role === "admin" || me?.access_level === "manager";

  // Replace deptOptions to include explicit pick-only option
  const deptOptions = [{ id: ALL_DEPTS, name: "All departments" }, { id: NONE_DEPT, name: "Only selected staff" }, ...(departments || [])];

  const availableEmps = React.useMemo(() => {
    const q = String(empQuery || "").trim().toLowerCase();
    return (employees || []).
      filter((e) => deptId === ALL_DEPTS || e.department_id === deptId || deptId === NONE_DEPT). // Include all if NONE_DEPT to allow picking
      filter((e) => !q || String(e.employee_id || "").toLowerCase().includes(q) || String(e.full_name || "").toLowerCase().includes(q) || String(e.user_email || "").toLowerCase().includes(q)).
      slice(0, 20);
  }, [employees, deptId, empQuery]);

  const addPick = (emp) => {
    if (!emp?.id) return;
    if (!picked.includes(emp.id)) setPicked((prev) => [...prev, emp.id]);
    setEmpQuery("");
  };
  const removePick = (id) => setPicked((prev) => prev.filter((x) => x !== id));

  const handleUpload = async (file) => {
    if (!file) return;
    const { file_url } = await UploadFile({ file });
    setAttachments((prev) => [...prev, file_url]);
  };

  // UPDATED: recipient resolver with pick-only mode
  const resolveRecipients = () => {
    const emps = employees || [];
    const pickedSet = new Set(picked);

    // NEW: pick-only mode
    if (deptId === NONE_DEPT) {
      // If no one picked, no recipients (prevents accidental broadcast)
      if (pickedSet.size === 0) return [];
      return emps.filter((e) => pickedSet.has(e.id));
    }

    // Existing behaviour: start with all, then filter by department if chosen
    let targets = emps;
    if (deptId && deptId !== ALL_DEPTS) {
      targets = targets.filter((e) => e.department_id === deptId);
    }
    // If staff are picked, restrict to them
    if (pickedSet.size > 0) {
      targets = targets.filter((e) => pickedSet.has(e.id));
    }
    // De-duplicate
    const uniqById = {};
    targets.forEach((e) => { uniqById[e.id] = e; });
    return Object.values(uniqById);
  };

  // Count recipients that have phone numbers for SMS
  const countSmsTargets = React.useMemo(() => {
    const recips = resolveRecipients();
    return recips.filter(r => !!String(r.phone || "").trim()).length;
  }, [employees, deptId, picked, empQuery]); // resolves via resolveRecipients() internally

  // Derive SMS text (override or stripped HTML)
  const getSmsBody = React.useCallback(() => {
    const base = smsText && smsText.trim().length ? smsText.trim() : stripHtml(body);
    // Prepend title if present (short)
    const prefix = title ? `${title}: ` : "";
    return (prefix + base).replace(/\s+/g, " ").slice(0, 2000); // hard cap
  }, [smsText, body, title, stripHtml]);

  const createAnnouncementRecord = async () => {
    const rec = await Announcement.create({
      title,
      body_html: body,
      category,
      department_id: deptId === ALL_DEPTS || deptId === NONE_DEPT ? "" : deptId,
      recipient_employee_ids: picked,
      send_via_email: !!sendEmail,
      show_on_login: !!showOnLogin,
      schedule_type: scheduleType,
      send_at: sendAt || null,
      recurrence,
      until_date: untilDate || null,
      attachments,
      status: "sent"
    });
    return rec;
  };

  // NEW: open an inbox item (mark as read)
  const openInboxItem = async (row) => {
    setSelected(row);
    if (row?.inbox?.status === "unread") {
      await AnnouncementInbox.update(row.inbox.id, { status: "read", read_at: new Date().toISOString() });
      setInbox((prev) => prev.map(x => x.inbox.id === row.inbox.id ? { ...x, inbox: { ...x.inbox, status: "read", read_at: new Date().toISOString() } } : x));
    }
  };

  // NEW: delete inbox message
  const deleteInboxItem = async (row) => {
    if (!row?.inbox?.id) return;
    const ok = window.confirm("Delete this message from your inbox?");
    if (!ok) return;
    await AnnouncementInbox.delete(row.inbox.id);
    setInbox((prev) => prev.filter((x) => x.inbox.id !== row.inbox.id));
    if (selected?.inbox?.id === row.inbox.id) setSelected(null);
  };

  // NEW: clear selection to compose new
  const startNew = () => {
    setSelected(null);
    setTitle("");
    setDeptId(ALL_DEPTS);
    setPicked([]);
    setEmpQuery("");
    setCategory("announcement");
    setBody("");
    setSendEmail(true);
    setSendSms(false); // Reset SMS state
    setSmsText("");     // Reset SMS text
    setShowOnLogin(true);
    setAttachments([]);
    setScheduleType("once");
    setSendAt("");
    setRecurrence("none");
    setUntilDate("");
    setStatusMsg("");
  };

  const sendNow = async () => {
    if (!title || !body) { setStatusMsg("Please enter title and message."); return; }

    // Email safety checks (existing)
    if (sendEmail) {
      if (emailHealth?.ok === false && (emailHealth?.cause === "SENDER_DOMAIN_NOT_VERIFIED" || emailHealth?.cause === "BAD_FROM")) {
        setStatusMsg(`Email blocked: sender domain not verified. Set ACS_FROM to a sender identity on a verified ACS Email domain (current: ${emailHealth?.from_domain || "unknown"}). Use the Email health check for steps.`);
        return;
      }
      if (emailHealth?.ok === false && emailHealth?.cause === "BAD_CONNECTION_STRING") {
        setStatusMsg("Email blocked: ACS connection string format is incorrect. Update ACS_CONNECTION_STRING exactly as shown in Azure → Communication Services → Keys.");
        return;
      }
    }

    // SMS pre-check: just a gentle notice (we allow sending even if not checked)
    if (sendSms && smsChecked && smsHealth?.ok === false) {
      const go = window.confirm("SMS configuration appears unhealthy. Send anyway?");
      if (!go) return;
    }

    setSending(true);
    setStatusMsg("Preparing recipients...");

    const recips = resolveRecipients();

    // Guard: if none selected, block sending
    if (recips.length === 0) {
      setStatusMsg("No recipients. Pick staff or choose a department.");
      setSending(false);
      return;
    }
    // Guard: confirm large sends
    if (recips.length > 100) {
      const ok = window.confirm(`You are about to message ${recips.length} people. Continue?`);
      if (!ok) {
        setSending(false);
        return;
      }
    }

    const ann = await createAnnouncementRecord();

    // Build inbox (existing)
    const inboxRows = recips.map((e) => ({
      announcement_id: ann.id,
      user_email: e.user_email || "",
      employee_id: e.employee_id || "",
      status: "unread",
      delivered_at: new Date().toISOString(),
      delivery_channel: sendEmail && e.user_email ? "both" : "in_app"
    })).filter((r) => r.user_email || r.employee_id);
    if (inboxRows.length > 0) {
      await AnnouncementInbox.bulkCreate(inboxRows);
    }

    // EMAIL SEND (existing)
    if (sendEmail) {
      setStatusMsg("Sending email copies...");
      const fromName = (senderName || me?.full_name || "Announcements");
      const subj = `[${category.toUpperCase()}] ${title}`;
      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif">
          <h3 style="margin:0 0 8px 0">${title}</h3>
          <div>${body}</div>
        </div>`;

      for (let i = 0; i < recips.length; i++) {
        const e = recips[i];
        if (!e.user_email) continue;
        try {
          await sendAcsEmail({ to: e.user_email, subject: subj, html, from_name: fromName });
          setStatusMsg(`Email ${i + 1} of ${recips.length} sent...`);
        } catch (err) {
          const apiMsg = err?.response?.data?.error || err?.message || "Unknown error";
          const hint = err?.response?.data?.action || err?.response?.data?.hint || "";
          setStatusMsg(`Email delivery failed: ${apiMsg}${hint ? " — " + hint : ""}`);
          setSending(false);
          return;
        }
      }
    }

    // NEW: SMS SEND
    if (sendSms) {
      const smsTargets = recips.filter(e => !!String(e.phone || "").trim());
      const msg = getSmsBody();
      if (smsTargets.length === 0) {
        setStatusMsg("No phone numbers found for selected recipients. SMS skipped.");
      } else {
        // Character count info (not blocking)
        const len = msg.length;
        if (len > 320) {
          setStatusMsg(`SMS is long (${len} chars). Will be split by carriers. Sending...`);
        } else {
          setStatusMsg(`Sending SMS to ${smsTargets.length} recipient(s)...`);
        }

        for (let i = 0; i < smsTargets.length; i++) {
          const e = smsTargets[i];
          try {
            await base44.functions.invoke("sendSms", {
              to: e.phone,
              body: msg,
              tags: [category || "announcement"],
              staff_id: e.employee_id || me?.email || "system"
            });
            setStatusMsg(`SMS ${i + 1} of ${smsTargets.length} sent...`);
          } catch (err) {
            const apiMsg = err?.data?.error || err?.response?.data?.error || err?.message || "Unknown error";
            setStatusMsg(`SMS delivery failed: ${apiMsg}`);
            setSending(false);
            return;
          }
        }
      }
    }

    setStatusMsg(`Announcement delivered. Email: ${sendEmail ? "yes" : "no"} • SMS: ${sendSms ? "yes" : "no"}.`);
    setSending(false);
  };

  // Add a quick health check runner
  const runEmailHealth = async () => {
    setStatusMsg("Checking email configuration…");
    const dest = me?.email || "";
    try {
      const { data } = await acsSmokeTest({ to: dest });
      setEmailHealth(data || {});
      if (data?.ok) {
        setStatusMsg(`Email OK (operation ${data.operation_id || "n/a"}; key …${data.last6 || "?"})`);
      } else {
        const cause = data?.cause || "unknown";
        const note = data?.note || data?.error || "See details in console.";
        const extras = data?.from_domain ? ` domain=${data.from_domain}` : "";
        setStatusMsg(`Email check failed: ${cause}. ${note}.${extras ? " " + extras : ""}`);
        console.warn("ACS health details:", data);
      }
    } catch (err) {
      setStatusMsg("Health check failed to run.");
      console.error(err);
    } finally {
      setHealthChecked(true); // Ensure healthChecked is true after manual check
    }
  };

  // NEW: SMS health check
  const runSmsHealth = async () => {
    setStatusMsg("Checking SMS configuration…");
    try {
      const { data } = await base44.functions.invoke("smsHealth", {});
      setSmsHealth(data || {});
      if (data?.ok) {
        setStatusMsg("SMS OK and ready.");
      } else {
        const note = data?.note || data?.error || "Not configured.";
        setStatusMsg(`SMS check: ${note}`);
      }
    } catch (e) {
      setStatusMsg("SMS health check failed.");
      setSmsHealth({ ok: false, error: e?.message || String(e) });
    } finally {
      setSmsChecked(true);
    }
  };

  if (!isManager) {
    // For staff, show inbox-only page in split layout
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
        <div className="max-w-6xl mx-auto grid grid-cols-12 gap-4">
          <aside className="col-span-12 md:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-3 py-2 font-semibold border-b">Inbox</div>
            <AnnouncementList items={inbox} selectedId={selected?.inbox?.id} onSelect={openInboxItem} onDelete={deleteInboxItem} />
          </aside>
          <section className="col-span-12 md:col-span-8">
            {selected ?
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-semibold">{selected.announcement?.title || "Untitled"}</div>
                    <div className="text-xs text-slate-500">
                      {selected.announcement?.category?.toUpperCase()} • {selected.inbox?.delivered_at ? format(new Date(selected.inbox.delivered_at), 'MMM dd, yyyy h:mm a') : ""}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={startNew}>Compose new</Button>
                </div>
                <div className="prose prose-sm max-w-none mt-3" dangerouslySetInnerHTML={{ __html: selected.announcement?.body_html || "" }} />
              </div> :
              <div className="text-sm text-slate-500 p-6">Select a message from the inbox.</div>
            }
          </section>
        </div>
      </div>
    );
  }

  // Managers/Admins: full email-like layout (Inbox + expanded composer)
  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-4">
        {/* LEFT: Inbox Pane */}
        <aside className="col-span-12 md:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-3 py-2 font-semibold border-b flex items-center justify-between">
            <span>Inbox</span>
            <Button variant="outline" size="sm" onClick={startNew}>New</Button>
          </div>
          <AnnouncementList items={inbox} selectedId={selected?.inbox?.id} onSelect={openInboxItem} onDelete={deleteInboxItem} />
        </aside>

        {/* RIGHT: Compose / View Pane */}
        <section className="col-span-12 md:col-span-8">
          {/* If selected, show viewer header */}
          {selected &&
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold">{selected.announcement?.title || "Untitled"}</div>
                  <div className="text-xs text-slate-500">
                    {selected.announcement?.category?.toUpperCase()} • {selected.inbox?.delivered_at ? format(new Date(selected.inbox.delivered_at), 'MMM dd, yyyy h:mm a') : ""}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={startNew}>Compose new</Button>
              </div>
              <div className="prose prose-sm max-w-none mt-3" dangerouslySetInnerHTML={{ __html: selected.announcement?.body_html || "" }} />
            </div>
          }

          {/* NEW: ACS configuration banner */}
          {healthChecked && emailHealth?.ok === false && (
            <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 text-amber-900 p-3 text-sm">
              <div className="font-semibold mb-1">Email configuration issue: {emailHealth.cause || "unknown"}</div>
              <div className="mb-2">{emailHealth.note || emailHealth.error || "Email cannot be sent until this is fixed."}</div>
              {emailHealth.from_domain && <div>Current ACS_FROM domain: <b>{emailHealth.from_domain}</b></div>}
              <div className="mt-2">
                • In Azure Portal: Communication Services → Email → Domains → add/verify a domain (or use an Azure‑managed domain) → add a Sender Identity → set ACS_FROM to that exact address.
              </div>
              <div className="mt-2">
                <button onClick={runEmailHealth} className="underline text-amber-900">Re-run email health check</button>
              </div>
            </div>
          )}

          {/* Compose card (existing content, expanded editor) */}
          <Card className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <CardHeader><CardTitle className="text-base">Compose</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Annual leave deadline" />
                </div>

                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
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

              {/* NEW: Sender name */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Sender name</Label>
                  <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="e.g., Matron Sarah Lewis" />
                  <div className="text-xs text-slate-500">Shown as the email sender name.</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Department</Label>
                  <Select value={deptId} onValueChange={setDeptId}>
                    <SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem key="only-picked" value={NONE_DEPT}>Only selected staff</SelectItem> {/* NEW */}
                      <SelectItem key="all-depts" value={ALL_DEPTS}>All departments</SelectItem>
                      {(departments || []).map((d) =>
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-slate-500 mt-1">
                    Tip: “Only selected staff” sends to the people you pick below (no broadcast).
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Pick staff (type EMP_ID, name or email)</Label>
                  <Input value={empQuery} onChange={(e) => setEmpQuery(e.target.value)} placeholder="Type to search staff…" />
                  {empQuery &&
                    <div className="mt-1 border rounded bg-white max-h-40 overflow-auto">
                      {availableEmps.map((e) =>
                        <button key={e.id} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"
                          onClick={() => addPick(e)}>
                          {e.employee_id ? `${e.employee_id} — ` : ""}{e.full_name || e.user_email}
                        </button>
                      )}
                      {availableEmps.length === 0 && <div className="px-3 py-2 text-sm text-slate-500">No matches</div>}
                    </div>
                  }
                </div>
              </div>

              {picked.length > 0 &&
                <div className="flex flex-wrap gap-2">
                  {picked.map((id) => {
                    const e = employees.find((x) => x.id === id);
                    return (
                      <Badge key={id} variant="outline" className="gap-2">
                        {(e?.employee_id ? `${e.employee_id} — ` : "") + (e?.full_name || e?.user_email || id)}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => removePick(id)} />
                      </Badge>
                    );
                  })}
                </div>
              }

              <div className="space-y-1">
                <Label>Message</Label>
                {/* Expanded editor height for proper email-like composing */}
                <div className="rounded border">
                  <ReactQuill theme="snow" value={body} onChange={setBody} style={{ height: 320 }} />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Attachments</Label>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 px-3 py-2 border rounded cursor-pointer bg-white">
                    <Paperclip className="w-4 h-4" />
                    <span>Attach file</span>
                    <input type="file" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
                  </label>
                  {attachments.map((u, i) =>
                    <a key={i} href={u} target="_blank" rel="noreferrer" className="text-sm text-sky-700 underline">
                      Attachment {i + 1}
                    </a>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Schedule</Label>
                  <Select value={scheduleType} onValueChange={setScheduleType}>
                    <SelectTrigger><SelectValue placeholder="Schedule type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">Once</SelectItem>
                      <SelectItem value="recurring">Recurring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{scheduleType === "once" ? "Send at" : "First send at"}</Label>
                  <Input type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Recurrence</Label>
                  <Select value={recurrence} onValueChange={setRecurrence} disabled={scheduleType !== "recurring"}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="date" value={untilDate} onChange={(e) => setUntilDate(e.target.value)} placeholder="Until date" className="mt-2" />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between border rounded px-3 py-2 bg-white">
                  <div>
                    <div className="text-sm font-medium">Email copies</div>
                    <div className="text-xs text-slate-500">Send via email when addresses exist</div>
                  </div>
                  <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
                </div>
                <div className="flex items-center justify-between border rounded px-3 py-2 bg-white">
                  <div>
                    <div className="text-sm font-medium">Show on login</div>
                    <div className="text-xs text-slate-500">Popup for recipients</div>
                  </div>
                  <Switch checked={showOnLogin} onCheckedChange={setShowOnLogin} />
                </div>

                {/* SMS switch tile (enhanced with from-number) */}
                <div className="flex items-center justify-between border rounded px-3 py-2 bg-white">
                  <div>
                    <div className="text-sm font-medium">Text message copies</div>
                    <div className="text-xs text-slate-500">
                      Will send to {countSmsTargets} recipient(s) with phone numbers
                      {smsChecked && smsHealth?.ok && smsHealth?.from ? ` • From ${smsHealth.from}` : ""}
                    </div>
                  </div>
                  <Switch checked={sendSms} onCheckedChange={setSendSms} />
                </div>
              </div>

              {/* NEW: Optional SMS text (only show when enabled) */}
              {sendSms && (
                <div className="space-y-1">
                  <Label>Optional SMS text</Label>
                  <Textarea
                    value={smsText}
                    onChange={(e) => setSmsText(e.target.value)}
                    placeholder="Leave blank to auto-use a plain-text version of the announcement"
                    className="h-20"
                  />
                  <div className="text-xs text-slate-500">
                    Length: {getSmsBody().length} characters. Longer texts may be split by carriers.
                  </div>
                </div>
              )}

              {/* NEW: Health checks + recipient preview row additions */}
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="text-xs">
                  Recipients: {resolveRecipients().length}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => setStatusMsg(`Preview: ${resolveRecipients().slice(0,50).map(e => e.full_name || e.user_email || e.employee_id).join(", ")}${resolveRecipients().length > 50 ? " …" : ""}`)}>
                  Preview recipients
                </Button>
                <Button variant="outline" size="sm" onClick={runEmailHealth}>
                  Email health check
                </Button>
                {/* NEW: SMS health check button */}
                <Button variant="outline" size="sm" onClick={runSmsHealth}>
                  SMS health check
                </Button>
                {smsChecked && smsHealth?.ok && (
                  <span className="text-xs text-emerald-700">SMS OK</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button className="bg-sky-600 hover:bg-sky-700 gap-2" onClick={sendNow} disabled={sending || resolveRecipients().length === 0}>
                  <Send className="w-4 h-4" /> Send now
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setSaving(true)} disabled={saving}>
                  <Clock className="w-4 h-4" /> Save as scheduled
                </Button>
                {saving && <div className="text-sm text-slate-600">Saved schedule in draft/scheduled status.</div>}
              </div>

              {statusMsg && <div className="text-sm text-slate-600">{statusMsg}</div>}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
