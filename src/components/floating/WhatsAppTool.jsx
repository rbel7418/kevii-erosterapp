import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Shift } from "@/entities/Shift";
import { Employee } from "@/entities/Employee";
import { agentSDK } from "@/agents";
import { X, MessageSquare, Link as LinkIcon } from "lucide-react";

export default function WhatsAppTool({ onClose }) {
  const [shifts, setShifts] = React.useState([]);
  const [employees, setEmployees] = React.useState([]);
  const [query, setQuery] = React.useState("");
  const [template, setTemplate] = React.useState("Hi {name}, your schedule changed for {date}. Shift: {shift_code} {start_time}-{end_time}.");
  const [selected, setSelected] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      const s = await Shift.list("-updated_date", 50);
      const e = await Employee.list();
      setShifts(s || []);
      setEmployees(e || []);
    })();
  }, []);

  const nameById = React.useMemo(() => {
    const m = {};
    employees.forEach(e => m[e.id] = e.full_name || e.user_email || e.employee_id);
    return m;
  }, [employees]);
  const phoneById = React.useMemo(() => {
    const m = {};
    employees.forEach(e => { if (e.phone) m[e.id] = String(e.phone); });
    return m;
  }, [employees]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return shifts;
    return shifts.filter(s =>
      String(s.shift_code || "").toLowerCase().includes(q) ||
      String(nameById[s.employee_id] || "").toLowerCase().includes(q) ||
      String(s.date || "").includes(q)
    );
  }, [shifts, query, nameById]);

  const connectURL = agentSDK.getWhatsAppConnectURL("shift_notifier");
  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const msgFor = (s) => template
    .replaceAll("{name}", nameById[s.employee_id] || "there")
    .replaceAll("{date}", s.date || "")
    .replaceAll("{shift_code}", s.shift_code || "")
    .replaceAll("{start_time}", s.start_time || "")
    .replaceAll("{end_time}", s.end_time || "");

  return (
    <div className="floating-panel">
      <Card className="bg-white border rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-emerald-600 text-white">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm font-semibold">WhatsApp Notifier</span>
          </div>
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/10" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-3 space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Search shifts, staff, date…" value={query} onChange={(e)=>setQuery(e.target.value)} />
            <a href={connectURL} target="_blank" rel="noreferrer">
              <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <LinkIcon className="w-4 h-4" />
                Connect
              </Button>
            </a>
          </div>
          <Textarea value={template} onChange={(e)=>setTemplate(e.target.value)} className="h-20" />
          <div className="max-h-56 overflow-auto space-y-2">
            {filtered.map(s => {
              const ready = !!phoneById[s.employee_id];
              return (
                <div key={s.id} className="flex items-center justify-between border rounded p-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{nameById[s.employee_id] || "Employee"}</div>
                    <div className="text-xs text-slate-600">{s.date} • {s.shift_code} {s.start_time}-{s.end_time}</div>
                    <div className="text-[11px] text-slate-500 truncate">{msgFor(s)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={ready ? "default" : "secondary"} className={ready ? "" : "bg-slate-200 text-slate-600"}>{ready ? "has phone" : "no phone"}</Badge>
                    <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <div className="text-xs text-slate-500 px-1 py-3">No results.</div>}
          </div>
          <div className="text-xs text-slate-600">Select rows, then message from WhatsApp chat. The agent drafts messages using your template.</div>
        </div>
      </Card>
    </div>
  );
}