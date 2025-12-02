import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PublishDialog({ open, onClose, onConfirm, isCurrentlyPublished, monthName }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCurrentlyPublished ? (
              <>
                <EyeOff className="w-5 h-5 text-orange-600" />
                Unpublish Rota
              </>
            ) : (
              <>
                <Eye className="w-5 h-5 text-green-600" />
                Publish Rota
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {monthName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {isCurrentlyPublished ? (
            <>
              <Alert className="bg-orange-50 border-orange-200">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  Unpublishing will hide this rota from team members. They won't be able to view their shifts until you publish it again.
                </AlertDescription>
              </Alert>
              
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <h4 className="font-semibold text-sm">What happens when you unpublish:</h4>
                <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                  <li>Team members can't see their assigned shifts</li>
                  <li>Open shifts won't be visible for claiming</li>
                  <li>You can still edit and make changes</li>
                  <li>Shifts remain saved in the system</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <Alert className="bg-green-50 border-green-200">
                <Eye className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Publishing will make this rota visible to all team members. They'll be able to see their shifts and claim open shifts.
                </AlertDescription>
              </Alert>
              
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <h4 className="font-semibold text-sm">What happens when you publish:</h4>
                <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                  <li>All team members can view their shifts</li>
                  <li>Open shifts become available for claiming</li>
                  <li>Team members receive notifications</li>
                  <li>You can still make edits after publishing</li>
                </ul>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            className={isCurrentlyPublished 
              ? "bg-orange-600 hover:bg-orange-700" 
              : "bg-green-600 hover:bg-green-700"
            }
          >
            {isCurrentlyPublished ? "Unpublish Rota" : "Publish Rota"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}