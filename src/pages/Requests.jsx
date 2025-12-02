
import React from "react";
import { Request, Employee } from "@/entities/all";
import { User } from "@/entities/User";
import { SendEmail } from "@/integrations/Core";
import { createPageUrl } from "@/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Mail, ClipboardList, Check, X, RefreshCw, ExternalLink } from "lucide-react";
import RequestForm from "@/components/requests/RequestForm";
import { format, parseISO } from "date-fns";
import { withRetry } from "@/components/utils/withRetry"; // ADD: use retry and keep UI responsive

export default function RequestsPage() {
  const [me, setMe] = React.useState(null);
  const [myEmployee, setMyEmployee] = React.useState(null);
  const [employees, setEmployees] = React.useState([]);
  const [requests, setRequests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [tab, setTab] = React.useState("mine"); // mine | all (managers/admins)

  React.useEffect(() => {
    (async () => {
      const u = await User.me();
      setMe(u);
      const emps = await Employee.list();
      setEmployees(emps || []);
      const mine = emps.find(e => e.user_email === u.email) || null;
      setMyEmployee(mine);

      // Managers/admin see all; staff see their own
      const canSeeAll = u.role === "admin" || u.access_level === "manager" || u.access_level === "admin";
      const list = await Request.list("-created_date");
      setRequests(list.filter(r => canSeeAll ? true : r.employee_id === mine?.id));
      if (!canSeeAll) setTab("mine");
      setLoading(false);
    })();
  }, []);

  const canManage = React.useMemo(() => {
    return me?.role === "admin" || me?.access_level === "manager" || me?.access_level === "admin";
  }, [me]);

  const mapEmp = React.useMemo(() => {
    const m = {};
    (employees || []).forEach(e => { m[e.id] = e; });
    return m;
  }, [employees]);

  const submitRequest = async (payload) => {
    setSubmitting(true);
    const managerEmail = myEmployee?.reports_to;
    try {
      // Create request record (with retry)
      await withRetry(() => Request.create({
        ...payload,
        employee_id: myEmployee?.id,
        status: "submitted"
      }));

      // Refresh list (doesn't block button state)
      const canSeeAll = me.role === "admin" || me.access_level === "manager" || me.access_level === "admin";
      const list = await withRetry(() => Request.list("-created_date"));
      setRequests(list.filter(r => canSeeAll ? true : r.employee_id === myEmployee?.id));

      // Fire-and-forget the email so the UI doesn't wait on delivery
      if (managerEmail) {
        const reqTypeLabel = payload.request_type === "annual_leave" ? "Annual Leave" : "Schedule Change";
        const link = window.location.origin + createPageUrl("Requests");
        SendEmail({
          to: managerEmail,
          subject: `New ${reqTypeLabel} request from ${myEmployee?.full_name || me?.email}`,
          body: [
            `Hello,`,
            ``,
            `${myEmployee?.full_name || me?.email} submitted a ${reqTypeLabel} request.`,
            `Subject: ${payload.subject || "(no subject)"}`,
            payload.start_date ? `Start: ${payload.start_date}` : null,
            payload.end_date ? `End: ${payload.end_date}` : null,
            ``,
            `Details:`,
            payload.details || "(no details)",
            ``,
            `Review it here: ${link}`
          ].filter(Boolean).join("\n")
        }).catch(() => {
          // Non-blocking; ignore email failures here to keep UI responsive
          console.warn("Manager email failed to send (non-blocking).");
        });
        alert("Your request was submitted. An email to your manager is being sent in the background.");
      } else {
        alert("Your request was submitted. No manager email is set on your profile.");
      }
    } finally {
      // Always re-enable the button even if a network call is slow
      setSubmitting(false);
    }
  };

  const handleDecision = async (req, decision) => {
    // Only managers/admins decide
    if (!canManage) return;
    // Fast UI: update status, refresh list, email requester in background
    await withRetry(() => Request.update(req.id, { ...req, status: decision }));
    const canSeeAll = canManage;
    const list = await withRetry(() => Request.list("-created_date"));
    setRequests(list.filter(r => canSeeAll ? true : r.employee_id === myEmployee?.id));

    // Background email to requester
    const requester = mapEmp[req.employee_id];
    const to = requester?.user_email;
    if (to) {
      const decisionWord = decision === "approved" ? "APPROVED" : "REJECTED";
      const typeLabel = req.request_type === "annual_leave" ? "Annual Leave" : "Schedule Change";
      const link = window.location.origin + createPageUrl("Requests");
      SendEmail({
        to,
        subject: `${typeLabel} request ${decisionWord}`,
        body: [
          `Hello ${requester?.full_name || ""},`,
          ``,
          `Your ${typeLabel} request "${req.subject || "(no subject)"}" was ${decisionWord.toLowerCase()}.`,
          // FIX: use req.*, not payload.*
          req.start_date ? `Start: ${req.start_date}` : null,
          req.end_date ? `End: ${req.end_date}` : null,
          ``,
          `Details you submitted:`,
          req.details || "(no details)",
          ``,
          `View in the app: ${link}`
        ].filter(Boolean).join("\n")
      }).catch(() => {});
    }
  };

  const myList = requests.filter(r => r.employee_id === myEmployee?.id);
  const allList = requests;

  const RequestRow = ({ r }) => {
    const e = mapEmp[r.employee_id];
    const who = e?.full_name || e?.user_email || "Employee";
    const t = r.request_type === "annual_leave" ? "Annual Leave" : "Schedule Change";
    const isPending = (r.status || "submitted") === "submitted";
    const showActions = canManage && isPending;

    return (
      <div className="p-3 bg-white border border-slate-200 rounded-md hover:bg-slate-50">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-medium text-slate-900">{r.subject || t}</div>
            <div className="mt-1 text-sm text-slate-600">
              <span className="font-medium">{t}</span> · {who}
              {(r.start_date || r.end_date) && (
                <span> · {r.start_date ? format(parseISO(r.start_date), "d MMM yyyy") : ""}{r.end_date ? ` – ${format(parseISO(r.end_date), "d MMM yyyy")}` : ""}</span>
              )}
            </div>
            {r.details && <div className="mt-2 text-sm text-slate-700">{r.details}</div>}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {r.status || "submitted"}
            </Badge>
            {showActions && (
              <div className="flex items-center gap-2">
                <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700" onClick={() => handleDecision(r, "approved")}>
                  <Check className="w-4 h-4 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="h-8 border-red-200 text-red-700 hover:bg-red-50" onClick={() => handleDecision(r, "rejected")}>
                  <X className="w-4 h-4 mr-1" /> Reject
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Requests</h1>
            <p className="text-sm text-slate-600">Submit Annual Leave or Schedule Change requests. Your manager gets an automatic email.</p>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()} disabled={loading}>
            <RefreshCw className={loading ? "w-4 h-4 mr-2 animate-spin" : "w-4 h-4 mr-2"} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1 border-slate-200">
            <CardHeader className="py-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-sky-600" />
                New Request
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <RequestForm submitting={submitting} onSubmit={submitRequest} />
              {myEmployee?.reports_to ? (
                <div className="text-[11px] text-slate-500 mt-2">
                  Emails will be sent to your manager: {myEmployee.reports_to}
                </div>
              ) : (
                <div className="text-[11px] text-orange-600 mt-2">
                  No manager email is set on your profile. The request will be saved without email notification.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-slate-200">
            <CardHeader className="py-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Requests</CardTitle>
                {canManage && (
                  <Tabs value={tab} onValueChange={setTab}>
                    <TabsList>
                      <TabsTrigger value="mine">My Requests</TabsTrigger>
                      <TabsTrigger value="all">All</TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {(tab === "all" ? allList : myList).map(r => (
                  <RequestRow key={r.id} r={r} />
                ))}
                {(tab === "all" ? allList : myList).length === 0 && (
                  <div className="text-sm text-slate-500 py-8 text-center">No requests yet.</div>
                )}
              </div>
              <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5" />
                Managers/Admins see all requests and can approve or reject; staff see only their own.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
