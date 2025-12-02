import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Calendar, Send } from "lucide-react";

export default function RequestForm({ submitting, onSubmit }) {
  const [type, setType] = React.useState("annual_leave");
  const [subject, setSubject] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      request_type: type,
      subject: subject || (type === "annual_leave" ? "Annual leave request" : "Schedule change request"),
      details,
      start_date: start || null,
      end_date: end || null
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="md:col-span-1">
          <div className="text-xs font-medium text-slate-600 mb-1">What is the request about?</div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="annual_leave">Annual Leave</SelectItem>
              <SelectItem value="schedule_change">Schedule Change</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <div className="text-xs font-medium text-slate-600 mb-1">Subject</div>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Short subject"
            className="h-9"
          />
        </div>
      </div>

      {/* Dates row (shown for both types; optional for schedule change) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <div className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Start date
          </div>
          <Input type="date" value={start || ""} onChange={(e) => setStart(e.target.value)} className="h-9" />
        </div>
        <div>
          <div className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" /> End date
          </div>
          <Input type="date" value={end || ""} onChange={(e) => setEnd(e.target.value)} className="h-9" />
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-slate-600 mb-1">Details</div>
        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Add context for your manager..."
          className="min-h-[110px]"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} className="bg-sky-600 hover:bg-sky-700">
          <Send className="w-4 h-4 mr-2" />
          {submitting ? "Submitting…" : "Submit request"}
        </Button>
      </div>
    </form>
  );
}