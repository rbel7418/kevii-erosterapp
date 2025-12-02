import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ShiftComment, Shift } from "@/entities/all";
import { AuditLog } from "@/entities/AuditLog";
import { User } from "@/entities/User";
import { format, parseISO } from "date-fns";
import { Clock, History, User as UserIcon, Calendar, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ShiftCommentsDialog({ open, onClose, shift, canManage, onChanged }) {
  const [comments, setComments] = React.useState([]);
  const [newComment, setNewComment] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [me, setMe] = React.useState(null);
  const [revisions, setRevisions] = React.useState([]);
  const [loadingRevisions, setLoadingRevisions] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    User.me().then(setMe).catch(() => setMe(null));
  }, [open]);

  React.useEffect(() => {
    if (!open || !shift?.id) return;
    loadComments();
    loadRevisions();
  }, [open, shift?.id]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const list = await ShiftComment.filter({ shift_id: shift.id }, "-created_date");
      setComments(list || []);
    } finally {
      setLoading(false);
    }
  };

  const loadRevisions = async () => {
    setLoadingRevisions(true);
    try {
      const logs = await AuditLog.filter({ 
        entity_type: "Shift", 
        record_id: shift.id 
      }, "-changed_at", 100);
      setRevisions(logs || []);
    } catch (error) {
      console.error("Failed to load revision history:", error);
      setRevisions([]);
    } finally {
      setLoadingRevisions(false);
    }
  };

  const handleAdd = async () => {
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      await ShiftComment.create({
        shift_id: shift.id,
        content: newComment.trim(),
        author_email: me?.email || "",
        author_name: me?.full_name || me?.email || "Unknown"
      });
      await Shift.update(shift.id, { has_comments: true });
      setNewComment("");
      await loadComments();
      onChanged?.();
    } finally {
      setLoading(false);
    }
  };

  const formatRevisionValue = (val) => {
    if (val == null || val === "") return "—";
    if (typeof val === "boolean") return val ? "Yes" : "No";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  const getFieldLabel = (field) => {
    const labels = {
      shift_code: "Shift Code",
      employee_id: "Employee",
      department_id: "Department",
      role_id: "Role",
      date: "Date",
      start_time: "Start Time",
      end_time: "End Time",
      break_minutes: "Break (min)",
      notes: "Notes",
      status: "Status",
      is_open: "Open Shift",
      claimed_by: "Claimed By"
    };
    return labels[field] || field;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-600" />
            Shift Details & Comments
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Shift Info Card */}
          <div className="border rounded-lg p-3 bg-slate-50">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-sky-600 text-white">{shift.shift_code || "N/A"}</Badge>
                  <span className="text-sm text-slate-600">
                    {shift.date ? format(parseISO(shift.date), "EEE, MMM d, yyyy") : "No date"}
                  </span>
                </div>
                {shift.start_time && shift.end_time && (
                  <div className="text-sm text-slate-600">
                    {shift.start_time} - {shift.end_time}
                    {shift.break_minutes > 0 && ` (${shift.break_minutes}min break)`}
                  </div>
                )}
              </div>
              {shift.created_date && (
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Created: {format(parseISO(shift.created_date), "dd/MM/yyyy HH:mm")}
                </div>
              )}
            </div>
            {shift.created_by && (
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <UserIcon className="w-3.5 h-3.5" />
                Created by: {shift.created_by}
              </div>
            )}
          </div>

          {/* CHANGED: Comment Input - Available to everyone, not just managers */}
          <div className="border rounded-lg p-4 bg-white shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5 text-sky-600" />
              <h3 className="font-semibold text-base">Add Comment</h3>
            </div>
            <Textarea
              placeholder="Type your comment here... (e.g., shift swap request, notes, questions, special circumstances, etc.)"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={5}
              className="resize-none mb-3 text-base"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleAdd}
                disabled={!newComment.trim() || loading}
                size="default"
                className="bg-sky-600 hover:bg-sky-700 px-6"
              >
                {loading ? "Adding..." : "Add Comment"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-hidden">
            {/* Previous Comments Section */}
            <div className="border rounded-lg overflow-hidden flex flex-col">
              <div className="p-3 border-b bg-slate-50">
                <h3 className="font-semibold text-sm">Previous Comments ({comments.length})</h3>
              </div>
              <ScrollArea className="flex-1 p-3">
                {loading && comments.length === 0 ? (
                  <div className="text-sm text-slate-500">Loading comments...</div>
                ) : comments.length === 0 ? (
                  <div className="text-sm text-slate-500 text-center py-8">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No comments yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {comments.map((c) => (
                      <div key={c.id} className="border rounded-lg p-3 bg-white">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="text-xs font-medium text-slate-900">
                            {c.author_name || c.author_email}
                          </div>
                          {c.created_date && (
                            <div className="text-xs text-slate-500">
                              {format(parseISO(c.created_date), "dd/MM HH:mm")}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-slate-700 whitespace-pre-wrap">{c.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Revision History Section */}
            <div className="border rounded-lg overflow-hidden flex flex-col">
              <div className="p-3 border-b bg-slate-50 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-600" />
                <h3 className="font-semibold text-sm">Revision History ({revisions.length})</h3>
              </div>
              <ScrollArea className="flex-1 p-3">
                {loadingRevisions ? (
                  <div className="text-sm text-slate-500">Loading history...</div>
                ) : revisions.length === 0 ? (
                  <div className="text-sm text-slate-500 text-center py-8">
                    <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No revisions recorded
                  </div>
                ) : (
                  <div className="space-y-2">
                    {revisions.map((log) => {
                      const isCreate = log.operation === "create";
                      const isUpdate = log.operation === "update";
                      const isDelete = log.operation === "delete";

                      return (
                        <div key={log.id} className="border-l-2 border-slate-300 pl-3 py-2">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                isCreate ? "border-green-500 text-green-700" :
                                isUpdate ? "border-blue-500 text-blue-700" :
                                "border-red-500 text-red-700"
                              }`}
                            >
                              {log.operation}
                            </Badge>
                            {log.changed_at && (
                              <div className="text-xs text-slate-500">
                                {format(parseISO(log.changed_at), "dd/MM/yyyy HH:mm:ss")}
                              </div>
                            )}
                          </div>
                          
                          {log.changed_by && (
                            <div className="text-xs text-slate-600 mb-1">
                              By: {log.changed_by}
                            </div>
                          )}

                          {isUpdate && log.field_name && (
                            <div className="text-xs text-slate-700 space-y-1">
                              <div className="font-medium">{getFieldLabel(log.field_name)}</div>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500 line-through">
                                  {formatRevisionValue(log.old_value)}
                                </span>
                                <span className="text-slate-400">→</span>
                                <span className="text-slate-900 font-medium">
                                  {formatRevisionValue(log.new_value)}
                                </span>
                              </div>
                            </div>
                          )}

                          {log.reason && (
                            <div className="text-xs text-slate-500 italic mt-1">
                              Reason: {log.reason}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}