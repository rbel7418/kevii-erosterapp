
import React from "react";
import { ChatMessage } from "@/entities/ChatMessage";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Loader2, Send } from "lucide-react";

export default function ChatPanel({ channelId, className }) {
  const [me, setMe] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [body, setBody] = React.useState("");

  React.useEffect(() => {
    let stop = false;
    (async () => {
      try { const u = await User.me(); if (!stop) setMe(u); } finally {}
    })();
    return () => { stop = true; };
  }, []);

  const load = React.useCallback(async () => {
    if (!channelId) return;
    const rows = await ChatMessage.filter({ channel_id: channelId }, "-created_date", 100);
    setMessages(rows || []);
    setLoading(false);
  }, [channelId]);

  React.useEffect(() => {
    setLoading(true);
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [load]);

  const onSend = async (e) => {
    e?.preventDefault?.();
    const txt = String(body || "").trim();
    if (!txt || !me?.email || !channelId) return;
    setSending(true);
    try {
      await ChatMessage.create({
        channel_id: channelId,
        sender_email: me.email,
        body: txt
      });
      setBody("");
      // optimistic refresh
      load();
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className={`${className || "h-[70vh]"} flex flex-col`}>
      <CardContent className="flex-1 p-0 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-2 p-3 bg-slate-50">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading messages…
            </div>
          ) : messages.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">No messages yet. Say hello 👋</div>
          ) : (
            messages.map((m) => {
              const mine = me && m.sender_email === me.email;
              return (
                <div key={m.id} className={`max-w-[84%] rounded-xl p-3 shadow-sm border ${mine ? "ml-auto bg-white" : "bg-white"}`}>
                  <div className="text-[11px] text-slate-500 mb-1">
                    {m.sender_email} · {m.created_date ? format(new Date(m.created_date), "dd/MM/yyyy HH:mm") : ""}
                  </div>
                  <div className="text-sm text-slate-800 whitespace-pre-wrap">{m.body}</div>
                </div>
              );
            })
          )}
        </div>
        <form onSubmit={onSend} className="p-2 border-t flex gap-2 bg-white">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type a message…"
            className="flex-1"
          />
          <Button type="submit" disabled={sending || !body.trim()} className="bg-sky-600 hover:bg-sky-700">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
