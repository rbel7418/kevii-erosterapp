import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function IntegrationConnectDialog({
  open,
  onClose,
  serviceKey,          // e.g. "microsoft_teams"
  serviceName,         // e.g. "Microsoft Teams"
  description,         // short text shown at the top
  initialConfig = {},  // { enabled?: boolean, webhook_url?: string, notes?: string }
  onSave               // async (serviceKey, config) => void
}) {
  const [enabled, setEnabled] = useState(!!initialConfig?.enabled);
  const [webhook, setWebhook] = useState(initialConfig?.webhook_url || "");
  const [notes, setNotes] = useState(initialConfig?.notes || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEnabled(!!initialConfig?.enabled);
    setWebhook(initialConfig?.webhook_url || "");
    setNotes(initialConfig?.notes || "");
  }, [open, initialConfig?.enabled, initialConfig?.webhook_url, initialConfig?.notes]);

  const handleSave = async () => {
    setSaving(true);
    await onSave?.(serviceKey, {
      enabled,
      webhook_url: webhook,
      notes
    });
    setSaving(false);
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose?.(); }}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{enabled ? "Manage" : "Connect"} {serviceName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {description && (
            <Alert className="bg-slate-50 border-slate-200">
              <AlertDescription className="text-sm text-slate-700">
                {description}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Incoming Webhook URL (optional)</Label>
            <Input
              placeholder="https://outlook.office.com/webhook/..."
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              If you use Microsoft Teams Incoming Webhooks, paste the URL here. We’ll save it for future automations.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input
              placeholder="Channel or team name, who owns it, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-xs text-blue-900">
              Heads‑up: Direct Teams/Slack/Calendar automations need backend functions enabled in this workspace.
              You can enable them under Dashboard → Settings. Meanwhile, this saves your config so we can wire it up later.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} className="bg-teal-600 hover:bg-teal-700" disabled={saving}>
            {saving ? "Saving…" : (enabled ? "Save" : "Connect")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}