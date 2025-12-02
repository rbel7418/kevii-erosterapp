import React from "react";
import { agentSDK } from "@/agents";
import { Shift } from "@/entities/Shift";
import { Employee } from "@/entities/Employee";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Link as LinkIcon, Users } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function WhatsAppNotifier() {
  const [shifts, setShifts] = React.useState([]);
  const [employees, setEmployees] = React.useState([]);
  const [query, setQuery] = React.useState("");
  const [message, setMessage] = React.useState("Hi {name}, your schedule has changed for {date}. Shift: {shift_code} ({start_time}-{end_time}). Please confirm you received this. Thanks!");
  const [selectedIds, setSelectedIds] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      const latestShifts = await Shift.list("-updated_date", 20);
      setShifts(latestShifts || []);
      const emps = await Employee.list();
      setEmployees(emps || []);
    })();
  }, []);

  const phoneByEmployeeId = React.useMemo(() => {
    const map = {};
    (employees || []).forEach(e => { if (e?.id && e?.phone) map[e.id] = String(e.phone); });
    return map;
  }, [employees]);

  const nameByEmployeeId = React.useMemo(() => {
    const map = {};
    (employees || []).forEach(e => { if (e?.id) map[e.id] = e.full_name || e.user_email || e.employee_id || "Employee"; });
    return map;
  }, [employees]);

  const filteredShifts = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return shifts;
    return shifts.filter(s =>
      String(s.shift_code || "").toLowerCase().includes(q) ||
      String(nameByEmployeeId[s.employee_id] || "").toLowerCase().includes(q) ||
      String(s.date || "").includes(q)
    );
  }, [shifts, query, nameByEmployeeId]);

  const toggle = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const connectURL = agentSDK.getWhatsAppConnectURL("shift_notifier");

  const createTemplate = (s) => {
    const name = nameByEmployeeId[s.employee_id] || "there";
    return message
      .replaceAll("{name}", name)
      .replaceAll("{date}", s.date || "")
      .replaceAll("{shift_code}", s.shift_code || "")
      .replaceAll("{start_time}", s.start_time || "")
      .replaceAll("{end_time}", s.end_time || "");
  };

  const selectedShifts = shifts.filter(s => selectedIds.includes(s.id));
  const readyToSend = selectedShifts.filter(s => phoneByEmployeeId[s.employee_id]);

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            WhatsApp Notifier
          </h1>
          <div className="flex items-center gap-2">
            <a href={connectURL} target="_blank" rel="noreferrer">
              <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <LinkIcon className="w-4 h-4" />
                Connect WhatsApp
              </Button>
            </a>
            <Button variant="outline" onClick={() => (window.location.href = createPageUrl("RotaGrid"))}>
              Go to Rotas
            </Button>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="py-3 border-b">
            <CardTitle className="text-base">Message template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-slate-500">Placeholders: {`{name}`} {`{date}`} {`{shift_code}`} {`{start_time}`} {`{end_time}`}</div>
            <Textarea value={message} onChange={(e)=>setMessage(e.target.value)} className="h-24" />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="py-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-600" />
              Recent shift updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <Input placeholder="Search by name, code, or date" value={query} onChange={(e)=>setQuery(e.target.value)} />
            </div>
            <div className="divide-y">
              {filteredShifts.map(s => {
                const name = nameByEmployeeId[s.employee_id] || "Unassigned";
                const phone = phoneByEmployeeId[s.employee_id] || "";
                const selected = selectedIds.includes(s.id);
                return (
                  <label key={s.id} className="flex items-start gap-3 py-2 cursor-pointer">
                    <input type="checkbox" checked={selected} onChange={()=>toggle(s.id)} className="mt-1" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-900">{name} <Badge variant="outline" className="ml-2">{s.shift_code || "—"}</Badge></div>
                      <div className="text-xs text-slate-600">{s.date} • {s.start_time || ""}{s.end_time ? `-${s.end_time}` : ""}</div>
                      {phone ? (
                        <div className="text-xs text-emerald-700 mt-0.5">WhatsApp: {phone}</div>
                      ) : (
                        <div className="text-xs text-amber-700 mt-0.5">No WhatsApp number on file</div>
                      )}
                    </div>
                  </label>
                );
              })}
              {filteredShifts.length === 0 && <div className="text-sm text-slate-500 py-6">No recent shifts found.</div>}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="py-3 border-b">
            <CardTitle className="text-base">Preview for first selected</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedShifts.length === 0 ? (
              <div className="text-sm text-slate-500">Select at least one shift above.</div>
            ) : (
              <div className="bg-white border rounded-md p-3 text-sm text-slate-800">
                {createTemplate(selectedShifts[0])}
              </div>
            )}
            <div className="mt-3 flex items-center gap-2">
              <a href={connectURL} target="_blank" rel="noreferrer">
                <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" disabled={readyToSend.length === 0}>
                  <Send className="w-4 h-4" />
                  Open WhatsApp agent
                </Button>
              </a>
              <div className="text-xs text-slate-500">
                Tip: After connecting, paste or forward the preview into the WhatsApp chat to notify selected staff. The agent can help refine and deliver messages.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}