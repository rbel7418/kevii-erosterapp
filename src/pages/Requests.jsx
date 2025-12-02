import React from "react";
import { Request, Employee, Shift, ShiftSwapRequest } from "@/entities/all";
import { User } from "@/entities/User";
import { SendEmail } from "@/integrations/Core";
import { createPageUrl } from "@/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Mail, ClipboardList, Check, X, RefreshCw, ExternalLink } from "lucide-react";
import RequestForm from "@/components/requests/RequestForm";
import SwapShiftDialog from "@/components/requests/SwapShiftDialog";
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
  const [showSwap, setShowSwap] = React.useState(false);
  const [swapRequests, setSwapRequests] = React.useState([]);

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
      
      // Load Swap Requests
      const swaps = await ShiftSwapRequest.list("-created_date");
      setSwapRequests(swaps);

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

  const handleSwapDecision = async (swap, decision) => {
    // If decision is 'peer_approved', we update status and notify manager
    // If decision is 'peer_rejected', we update status to rejected
    // If decision is 'manager_approved', we perform the swap and update status
    // If decision is 'manager_rejected', we update status
    
    if (decision === "peer_approved") {
      await ShiftSwapRequest.update(swap.id, { status: "peer_approved" });
      // Notify Manager
      if (swap.manager_approver_email) {
        SendEmail({
          to: swap.manager_approver_email,
          subject: `Shift Swap Approval Required`,
          body: `${swap.requester_name} and ${swap.target_employee_name} want to swap shifts.\n\nRequester: ${swap.requester_shift_code} on ${swap.requester_date}\nTarget: ${swap.target_shift_code} on ${swap.target_date}\n\nBoth parties agreed. Please approve in the app.`
        }).catch(() => {});
      }
    } else if (decision === "peer_rejected") {
      await ShiftSwapRequest.update(swap.id, { status: "peer_rejected" });
    } else if (decision === "manager_approved") {
       // PERFORM SWAP
       try {
         // Fetch fresh shifts
         const reqShifts = await Shift.filter({ id: swap.requester_shift_id });
         const tgtShifts = await Shift.filter({ id: swap.target_shift_id });
         const reqS = reqShifts[0];
         const tgtS = tgtShifts[0];
         
         if (reqS && tgtS) {
           // Swap employee IDs
           await Shift.update(reqS.id, { employee_id: swap.target_employee_id });
           await Shift.update(tgtS.id, { employee_id: swap.requester_id });
           
           await ShiftSwapRequest.update(swap.id, { status: "manager_approved" });
           alert("Swap executed successfully!");
         } else {
           alert("Error: One or both shifts not found. Cannot swap.");
           await ShiftSwapRequest.update(swap.id, { status: "manager_rejected" }); // effectively failed
         }
       } catch (e) {
         console.error(e);
         alert("Failed to execute swap.");
       }
    } else if (decision === "manager_rejected") {
      await ShiftSwapRequest.update(swap.id, { status: "manager_rejected" });
    }

    // Refresh list
    const swaps = await ShiftSwapRequest.list("-created_date");
    setSwapRequests(swaps);
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

  const SwapRow = ({ s }) => {
    // Determine if I am the target (for peer approval) or manager (for final approval)
    const isMyTarget = s.target_employee_id === myEmployee?.id;
    const isMyRequest = s.requester_id === myEmployee?.id;
    const isPendingPeer = s.status === "pending_peer";
    const isPeerApproved = s.status === "peer_approved";
    // Approx check for manager access
    const isManager = canManage; 

    const showPeerAction = isMyTarget && isPendingPeer;
    const showManagerAction = isManager && isPeerApproved;

    return (
      <div className="p-3 bg-white border border-slate-200 rounded-md hover:bg-slate-50 mb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-medium text-slate-900">Shift Swap Request</div>
            <div className="mt-1 text-sm text-slate-600">
              <span className="font-semibold">{s.requester_name}</span> ({s.requester_shift_code} on {s.requester_date}) 
              <br/> wants to swap with <br/>
              <span className="font-semibold">{s.target_employee_name}</span> ({s.target_shift_code} on {s.target_date})
            </div>
            {s.status === "peer_approved" && <div className="mt-1 text-xs text-blue-600">Peer Approved - Waiting for Manager</div>}
            {s.status === "manager_approved" && <div className="mt-1 text-xs text-green-600">Swap Complete</div>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className="capitalize">{s.status.replace('_', ' ')}</Badge>
            
            {showPeerAction && (
              <div className="flex gap-2">
                <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700" onClick={() => handleSwapDecision(s, "peer_approved")}>Accept</Button>
                <Button size="sm" variant="outline" className="h-7 text-red-600" onClick={() => handleSwapDecision(s, "peer_rejected")}>Decline</Button>
              </div>
            )}

            {showManagerAction && (
              <div className="flex gap-2">
                <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700" onClick={() => handleSwapDecision(s, "manager_approved")}>Approve Swap</Button>
                <Button size="sm" variant="outline" className="h-7 text-red-600" onClick={() => handleSwapDecision(s, "manager_rejected")}>Reject</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

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
              <Tabs defaultValue="standard">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="standard" className="flex-1">Leave / Change</TabsTrigger>
                  <TabsTrigger value="swap" className="flex-1">Swap Shift</TabsTrigger>
                </TabsList>
                <TabsContent value="standard">
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
                </TabsContent>
                <TabsContent value="swap">
                   <div className="text-sm text-slate-600 mb-4">
                     Swap your shift with a colleague. Requires their approval + manager approval.
                   </div>
                   <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => setShowSwap(true)}>
                     Start Swap Request
                   </Button>
                </TabsContent>
              </Tabs>
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
              {/* Swap Requests Section */}
              {swapRequests.length > 0 && (
                <div className="mb-6 pb-4 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Swap Requests</h3>
                  <div className="space-y-2">
                    {swapRequests
                      .filter(s => 
                        (tab === 'all' && canManage) || 
                        s.requester_id === myEmployee?.id || 
                        s.target_employee_id === myEmployee?.id
                      )
                      .map(s => <SwapRow key={s.id} s={s} />)
                    }
                    {swapRequests.filter(s => (tab === 'all' && canManage) || s.requester_id === myEmployee?.id || s.target_employee_id === myEmployee?.id).length === 0 && (
                      <div className="text-sm text-slate-400 italic">No active swap requests involved with you.</div>
                    )}
                  </div>
                </div>
              )}

              <h3 className="text-sm font-semibold text-slate-900 mb-3">Leave & Schedule Requests</h3>
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
      <SwapShiftDialog 
        open={showSwap} 
        onClose={() => setShowSwap(false)} 
        myEmployee={myEmployee}
        employees={employees}
      />
    </div>
  );
}