
import React from "react";
// Removed Base44 function imports

// Mock postSMS helper
async function postSMS({ to, body, staff_id, tags = [] }) {
  console.log("Mock SMS sent to:", to, body);
  return { id: "mock-sms-id", provider: "mock", status: "sent" };
}

export default function Messaging({
  staff = [],
  currentUser = { id: "unknown" },
  defaultDepartment = "",
  defaultChannel = "sms",
}) {
  const [dept, setDept] = React.useState(defaultDepartment);
  const [channel, setChannel] = React.useState(defaultChannel); // "sms" | "email"
  const [logOnly, setLogOnly] = React.useState(true); // Default to log only
  const [selectedStaffIds, setSelectedStaffIds] = React.useState([]);
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);

  // New state for backend health check - defaulted to true for mock
  const [backendOk, setBackendOk] = React.useState(true);
  const [checkingBackend, setCheckingBackend] = React.useState(false);

  // Local OutboundMessage list to reflect results immediately
  const [outbound, setOutbound] = React.useState([]);
  // shape: {id, to_number, body, provider, provider_message_id, status, staff_id, tags, created_at}

  // Effect to check backend health - removed network call
  React.useEffect(() => {
    setBackendOk(true);
    setCheckingBackend(false);
  }, []);

  // If backend isn't available, enforce Log-only even if the user toggles it off
  React.useEffect(() => {
    if (!backendOk) {
      setLogOnly(true);
    }
  }, [backendOk]);

  const staffInDept = React.useMemo(
    () => staff.filter((s) => !dept || s.department_id === dept),
    [staff, dept]
  );

  const toggleSelect = (id) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const send = async () => {
    if (!body.trim()) return;
    if (selectedStaffIds.length === 0) return;

    setSending(true);
    const now = new Date().toISOString();
    const targets = staffInDept.filter((s) => selectedStaffIds.includes(s.id));

    try {
      // Pre-log locally so UI is responsive
      const preRows = targets.map((t) => ({
        id: crypto.randomUUID(),
        to_number: t.mobile_e164 || "",
        body,
        provider: logOnly ? "log" : (channel === "sms" ? "acs" : "n/a"),
        provider_message_id: null,
        status: logOnly ? "logged" : (channel === "sms" ? "queued" : "sent"),
        staff_id: currentUser.id,
        tags: dept ? [dept] : [],
        created_at: now,
        name: t.name,
        channel
      }));
      setOutbound((prev) => [...preRows, ...prev]);

      // EMAIL path is already working in your app; leave as-is.
      // Only wire the SMS path per your request:
      if (channel === "sms" && logOnly === false) {
        // Send one-by-one (keeps receipts separate). For large blasts, batch with a queue.
        for (const t of targets) {
          if (!t.mobile_e164) {
            // Update the pre-logged row as failed if no number
            setOutbound((prev) =>
              prev.map((row) =>
                row.name === t.name && row.created_at === now && row.body === body
                  ? { ...row, status: "failed", provider_message_id: "NO_NUMBER" }
                  : row
              )
            );
            continue;
          }

          try {
            const res = await postSMS({
              to: t.mobile_e164,
              body,
              staff_id: currentUser.id,
              tags: dept ? [dept] : []
            });
            // Merge provider_message_id/status back into the matching local row
            setOutbound((prev) => {
              const idx = prev.findIndex(
                (r) => r.name === t.name && r.created_at === now && r.body === body
              );
              if (idx === -1) return prev;
              const copy = [...prev];
              copy[idx] = {
                ...copy[idx],
                id: res.id, // your backend's internal id
                provider: res.provider || "acs",
                provider_message_id: res.provider_message_id || null,
                status: res.status || "queued"
              };
              return copy;
            });
          } catch (err) {
            setOutbound((prev) =>
              prev.map((row) =>
                row.name === t.name && row.created_at === now && row.body === body
                  ? { ...row, status: "failed", provider_message_id: "ERROR" }
                  : row
              )
            );
            console.error("SMS send failed:", err);
          }
        }
      } else {
        // Log-only (no network) or Email path -> nothing else to do here
      }

      // Clear message box after send
      setBody("");
    } finally {
      setSending(false);
    }
  };

  const allDepts = React.useMemo(
    () => Array.from(new Set(staff.map((s) => s.department_id).filter(Boolean))),
    [staff]
  );

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Messaging</h1>

      {/* Backend status banner */}
      <div className={`text-sm px-3 py-2 rounded border ${
        backendOk ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-700"
      }`}>
        {checkingBackend
          ? "Checking SMS backend…"
          : backendOk
            ? "SMS backend connected — you can turn OFF “Log only” to send real texts."
            : "SMS backend not installed — messages will be logged only until backend functions are enabled."}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="border rounded px-2 py-1"
          value={dept}
          onChange={(e) => setDept(e.target.value)}
        >
          <option value="">All departments</option>
          {allDepts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <div className="flex items-center gap-1 border rounded px-2 py-1">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="channel"
              value="sms"
              checked={channel === "sms"}
              onChange={() => setChannel("sms")}
            />
            SMS
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="channel"
              value="email"
              checked={channel === "email"}
              onChange={() => setChannel("email")}
            />
            Email
          </label>
        </div>

        <label className={`flex items-center gap-2 border rounded px-2 py-1 ${!backendOk ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}>
          <input
            type="checkbox"
            checked={logOnly}
            onChange={(e) => setLogOnly(e.target.checked)}
            disabled={!backendOk} // Disable checkbox if backend is not ok
          />
          Log only (no SMS)
        </label>

        <span className={`text-xs px-2 py-1 rounded ${channel === "sms" && !logOnly && backendOk ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
          {channel === "sms" && !logOnly && backendOk ? "SMS backend: active" : "SMS backend: log-only"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="border rounded p-2">
          <div className="font-medium mb-2">Recipients</div>
          <div className="max-h-64 overflow-auto space-y-1">
            {staffInDept.map((s) => (
              <label key={s.id} className="flex items-center gap-2 p-1 rounded hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedStaffIds.includes(s.id)}
                  onChange={() => toggleSelect(s.id)}
                />
                <div className="flex-1">
                  <div className="text-sm">{s.name}</div>
                  <div className="text-xs text-gray-500">
                    {s.mobile_e164 ? s.mobile_e164 : "No mobile on record"}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 border rounded p-2 flex flex-col gap-2">
          <div className="font-medium">Message</div>
          <textarea
            className="w-full border rounded p-2 min-h-[120px]"
            placeholder="Short operational message (no PHI). Include a link to the portal for details."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex justify-end">
            <button
              className={`px-4 py-2 rounded text-white ${sending ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
              disabled={sending || !body.trim() || selectedStaffIds.length === 0}
              onClick={send}
            >
              {sending ? "Sending…" : (channel === "sms" && !logOnly && backendOk ? "Send SMS" : "Save / Log")}
            </button>
          </div>
        </div>
      </div>

      <div className="border rounded p-2">
        <div className="font-medium mb-2">Recent sends</div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-1 pr-2">When</th>
                <th className="py-1 pr-2">Recipient</th>
                <th className="py-1 pr-2">To</th>
                <th className="py-1 pr-2">Status</th>
                <th className="py-1 pr-2">Provider msg id</th>
                <th className="py-1 pr-2">Preview</th>
              </tr>
            </thead>
            <tbody>
              {outbound.map((row) => (
                <tr key={`${row.id}-${row.to_number}-${row.created_at}`}>
                  <td className="py-1 pr-2">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="py-1 pr-2">{row.name || ""}</td>
                  <td className="py-1 pr-2">{row.to_number}</td>
                  <td className="py-1 pr-2">
                    <span className={
                      row.status === "delivered" ? "text-green-700" :
                      row.status === "failed" ? "text-red-700" :
                      row.status === "queued" || row.status === "sent" ? "text-amber-700" :
                      "text-gray-700"
                    }>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-1 pr-2">{row.provider_message_id || "-"}</td>
                  <td className="py-1 pr-2 truncate max-w-[280px]">{row.body}</td>
                </tr>
              ))}
              {outbound.length === 0 && (
                <tr><td className="py-2 text-gray-500" colSpan={6}>No messages yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
