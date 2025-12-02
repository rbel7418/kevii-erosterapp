import React from "react";
import { Presence } from "@/entities/Presence";
import { withRetry } from "@/components/utils/withRetry";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function OnlineUsersWidget() {
  const [users, setUsers] = React.useState([]);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    let interval;
    let consecutiveFailures = 0;

    const fetchPresence = async () => {
      try {
        // CRITICAL: Longer retry delays for rate-limited endpoint
        const list = await withRetry(
          () => Presence.list("-last_seen", 50),
          { 
            retries: 2,
            baseDelay: 2000, // Start at 2s
            shouldRetry: (err) => {
              const isNetwork = !err?.response && /network|fetch|timeout/i.test(String(err?.message || ""));
              const is429 = err?.response?.status === 429 || /rate limit/i.test(String(err?.message || ""));
              
              // Only retry 429s, not network errors
              return is429;
            }
          }
        );
        
        if (!mounted) return;
        
        const recent = (list || []).filter((u) => {
          if (!u.last_seen) return false;
          const ts = new Date(u.last_seen).getTime();
          const now = Date.now();
          return now - ts < 5 * 60 * 1000; // 5 minutes
        });
        
        setUsers(recent);
        setError(false);
        consecutiveFailures = 0;
      } catch (err) {
        console.warn("⚠️ Presence unavailable (non-critical):", err.message || err);
        consecutiveFailures++;
        
        if (mounted) {
          setError(true);
          setUsers([]);
          
          // If failing repeatedly, stop trying
          if (consecutiveFailures >= 3 && interval) {
            clearInterval(interval);
            console.warn("🛑 Presence polling stopped after 3 failures");
          }
        }
      }
    };

    // Initial fetch
    fetchPresence();
    
    // Poll every 60 seconds (much less aggressive than before)
    interval = setInterval(fetchPresence, 60_000);

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, []);

  // Don't render anything if error or no users (silent failure)
  if (error || users.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full border border-slate-200 shadow-sm">
      <Users className="w-3.5 h-3.5 text-green-600" />
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-2">
        {users.length} online
      </Badge>
    </div>
  );
}