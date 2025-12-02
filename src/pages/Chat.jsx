import React from "react";
import { Department } from "@/entities/Department";
import { ChatChannel } from "@/entities/ChatChannel";
import { ChatMembership } from "@/entities/ChatMembership";
import { User } from "@/entities/User";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PlusCircle, MessageSquare } from "lucide-react";
import ChatPanel from "@/components/chat/ChatPanel";

const ALL = "__ALL__";

export default function Chat() {
  const [me, setMe] = React.useState(null);
  const [departments, setDepartments] = React.useState([]);
  const [deptId, setDeptId] = React.useState(ALL);
  const [channels, setChannels] = React.useState([]);
  const [channelId, setChannelId] = React.useState("");

  React.useEffect(() => {
    (async () => {
      try {
        const u = await User.me();
        setMe(u);
      } catch {}
      const ds = await Department.list();
      setDepartments(ds || []);
      const ch = await ChatChannel.list("-created_date", 200);
      setChannels(ch || []);
    })();
  }, []);

  const filteredChannels = React.useMemo(() => {
    return (channels || []).filter(c => deptId === ALL || c.department_id === deptId);
  }, [channels, deptId]);

  const ensureWardChannel = async () => {
    if (deptId === ALL) return;
    const name = (() => {
      const d = (departments || []).find(x => x.id === deptId);
      return d ? `${d.name} chat` : "Ward chat";
    })();
    const existing = (channels || []).find(c => c.department_id === deptId) || null;
    const ch = existing || await ChatChannel.create({
      name,
      department_id: deptId
    });
    if (!existing) {
      setChannels(prev => [ch, ...prev]);
      // add self as member
      if (me?.email) {
        await ChatMembership.create({
          channel_id: ch.id,
          user_email: me.email,
          role: "admin"
        });
      }
    }
    setChannelId(ch.id);
  };

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-sky-600" /> Ward Chat
          </h1>
          <div className="flex items-center gap-2">
            <Select value={deptId} onValueChange={setDeptId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="All wards" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All wards</SelectItem>
                {(departments || []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={ensureWardChannel} disabled={deptId === ALL} className="gap-2 bg-sky-600 hover:bg-sky-700">
              <PlusCircle className="w-4 h-4" /> Open ward channel
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Channels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {filteredChannels.map(c => (
                <Button key={c.id} variant={channelId === c.id ? "default" : "outline"} onClick={() => setChannelId(c.id)}>
                  {c.name}
                </Button>
              ))}
              {filteredChannels.length === 0 && (
                <div className="text-sm text-slate-500">No channels yet. Select a ward and click “Open ward channel”.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {channelId ? (
          <ChatPanel channelId={channelId} />
        ) : (
          <div className="text-sm text-slate-600">Pick a channel to start chatting.</div>
        )}
      </div>
    </div>
  );
}