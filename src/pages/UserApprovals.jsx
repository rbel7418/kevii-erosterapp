import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, XCircle, Shield } from "lucide-react";

const ALLOWED_DOMAIN = "kingedwardvii.co.uk";

export default function UserApprovals() {
  const qc = useQueryClient();

  const pendingQuery = useQuery({
    queryKey: ["pending-users"],
    queryFn: async () => {
      const res = await base44.functions.invoke("listPendingUsers", {});
      return res.data;
    },
  });

  const approveMut = useMutation({
    mutationFn: async ({ user_id, access_level }) => {
      const res = await base44.functions.invoke("approveUser", { user_id, access_level });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pending-users"] }),
  });

  const rejectMut = useMutation({
    mutationFn: async ({ user_id }) => {
      const res = await base44.functions.invoke("rejectUser", { user_id });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pending-users"] }),
  });

  const rows = pendingQuery.data?.rows || [];
  const error = pendingQuery.error;
  const isForbidden = error && (error.status === 403 || error?.response?.status === 403);

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-slate-900">User Approvals</h1>
          <div className="text-sm text-slate-600 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Allowed domain: {ALLOWED_DOMAIN}
          </div>
        </div>

        {isForbidden && (
          <Alert className="mb-4">
            <AlertDescription>
              You do not have permission to view approvals. Only Admins and Managers can access this page.
            </AlertDescription>
          </Alert>
        )}

        {!isForbidden && (
          <Card className="shadow-lg">
            <CardHeader className="border-b">
              <CardTitle className="text-base">Pending registrations ({rows.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Dept (requested)</TableHead>
                    <TableHead>Domain OK</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((u) => {
                    const domainOk = String(u.email || "").toLowerCase().endsWith("@" + ALLOWED_DOMAIN);
                    return (
                      <TableRow key={u.id}>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.full_name || "-"}</TableCell>
                        <TableCell>{u.job_title || "-"}</TableCell>
                        <TableCell>{u.requested_department_id || "-"}</TableCell>
                        <TableCell>
                          {domainOk ? (
                            <span className="text-emerald-600 text-sm">Yes</span>
                          ) : (
                            <span className="text-rose-600 text-sm">No</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => rejectMut.mutate({ user_id: u.id })}
                              disabled={rejectMut.isLoading}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              onClick={() => approveMut.mutate({ user_id: u.id, access_level: "staff" })}
                              disabled={!domainOk || approveMut.isLoading}
                              className="bg-emerald-600 hover:bg-emerald-700"
                              title={domainOk ? "" : "Email domain must be " + ALLOWED_DOMAIN}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                        No pending users.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}