import React from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, LogOut } from "lucide-react";

export default function PendingApproval({ email, allowedDomain, status = "pending", onLogout }) {
  const domainOk = String(email || "").toLowerCase().endsWith("@" + allowedDomain);
  const title =
    status === "rejected"
      ? "Access denied"
      : domainOk
      ? "Registration pending approval"
      : "Use your work email";

  const message =
    status === "rejected"
      ? `Your registration was rejected. If you believe this is an error, contact your manager.`
      : domainOk
      ? `Thanks for registering. Your account is waiting for manager approval. You will be notified once it's approved.`
      : `Please sign out and register again using your ${allowedDomain} email address. Personal emails are not allowed.`;

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-3">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        </div>
        <Alert className="mb-4">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        {email && (
          <div className="text-sm text-slate-600 mb-4">
            Signed in as <span className="font-medium">{email}</span>
          </div>
        )}
        <div className="flex justify-end">
          <Button onClick={onLogout} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}