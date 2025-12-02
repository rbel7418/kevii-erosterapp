import React from "react";
import { User } from "@/entities/User";
import { createPageUrl } from "@/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Check, X, RefreshCw, ExternalLink, GraduationCap } from "lucide-react";
import RequestForm from "@/components/requests/RequestForm";
import { format, parseISO } from "date-fns";

// --- MOCK DATA FOR TRAINING ---
let MOCK_REQUESTS = [];

const MockRequest = {
  list: async () => {
    await new Promise(r => setTimeout(r, 300));
    return [...MOCK_REQUESTS];
  },
  create: async (data) => {
    await new Promise(r => setTimeout(r, 500));
    const newReq = { 
        ...data, 
        id: "mock_req_" + Math.random().toString(36).substr(2, 9), 
        created_date: new Date().toISOString(),
        status: 'submitted'
    };
    MOCK_REQUESTS.unshift(newReq);
    return newReq;
  },
  update: async (id, data) => {
    await new Promise(r => setTimeout(r, 300));
    const idx = MOCK_REQUESTS.findIndex(r => r.id === id);
    if (idx !== -1) {
        MOCK_REQUESTS[idx] = { ...MOCK_REQUESTS[idx], ...data };
    }
    return MOCK_REQUESTS[idx];
  }
};
// -----------------------------

export default function TrainingRequests() {
  const [me, setMe] = React.useState(null);
  const [requests, setRequests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [tab, setTab] = React.useState("mine");

  React.useEffect(() => {
    (async () => {
      const u = await User.me();
      setMe(u);
      const list = await MockRequest.list();
      setRequests(list);
      setLoading(false);
    })();
  }, []);

  // Always allow management in training mode for demonstration
  const canManage = true; 

  const submitRequest = async (payload) => {
    setSubmitting(true);
    try {
      await MockRequest.create({
        ...payload,
        employee_id: "training_emp_id",
        status: "submitted"
      });
      const list = await MockRequest.list();
      setRequests(list);
      alert("Training Mode: Request submitted! (No email sent)");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecision = async (req, decision) => {
    await MockRequest.update(req.id, { status: decision });
    const list = await MockRequest.list();
    setRequests(list);
    alert(`Training Mode: Request ${decision}. (No email sent)`);
  };

  const RequestRow = ({ r }) => {
    const who = "Training User";
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
    <div className="p-4 md:p-6 bg-red-50/30 min-h-screen">
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className="bg-red-600 text-white">TRAINING MODE</Badge>
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Requests (Training)</h1>
                <p className="text-sm text-slate-600">Practice submitting and managing requests.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()} disabled={loading}>
            <RefreshCw className={loading ? "w-4 h-4 mr-2 animate-spin" : "w-4 h-4 mr-2"} />
            Reset
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1 border-red-200 bg-white/80">
            <CardHeader className="py-3 border-b border-red-100">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-red-600" />
                New Request
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <RequestForm submitting={submitting} onSubmit={submitRequest} />
              <div className="text-[11px] text-red-500 mt-2">
                Training Mode: No emails will be sent.
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-red-200 bg-white/80">
            <CardHeader className="py-3 border-b border-red-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Requests List</CardTitle>
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList>
                    <TabsTrigger value="mine">My Requests</TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {requests.map(r => (
                  <RequestRow key={r.id} r={r} />
                ))}
                {requests.length === 0 && (
                  <div className="text-sm text-slate-500 py-8 text-center">No mock requests yet. Try submitting one!</div>
                )}
              </div>
              <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
                <GraduationCap className="w-3.5 h-3.5 text-red-500" />
                Training Mode: Changes here are temporary and local to your session.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}