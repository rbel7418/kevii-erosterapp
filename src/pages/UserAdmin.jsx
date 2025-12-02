
import React, { useEffect, useMemo, useState } from "react";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, ChevronUp, ChevronDown, Users } from "lucide-react";
import UserAccessDialog from "@/components/settings/UserAccessDialog";

export default function UserAdmin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("");
  const [pending, setPending] = useState({}); // userId -> "admin" | "manager" | "staff"
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogUser, setDialogUser] = useState(null);
  const [dialogLevel, setDialogLevel] = useState("staff");

  useEffect(() => {
    (async () => {
      const me = await User.me();
      setCurrentUser(me);

      // Only admins can list all users due to platform security rules
      if (me?.role === "admin") {
        const list = await User.list();
        // Add safe defaults for missing access_level
        setUsers((list || []).map((u) => ({
          ...u,
          access_level: u.access_level || (u.role === "admin" ? "admin" : "staff")
        })));
      } else if (me?.access_level === "manager") {
        // Managers cannot list others; show only themselves to create a sense of control
        setUsers([{
          ...me,
          access_level: me.access_level || "manager"
        }]);
      }
    })();
  }, []);

  const isAdmin = currentUser?.role === "admin";
  const isManager = !isAdmin && currentUser?.access_level === "manager";

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
    String(u.full_name || "").toLowerCase().includes(q) ||
    String(u.email || "").toLowerCase().includes(q)
    );
  }, [users, filter]);

  // Stage a change locally (no immediate API call)
  const stageAccessLevel = (u, level) => {
    if (!isAdmin && level === "admin") {
      alert("Only admins can grant admin access.");
      return;
    }
    // Managers can only change their own access level
    if (isManager && u.id !== currentUser.id) return;
    setPending((prev) => ({ ...prev, [u.id]: level }));
  };

  // Apply all staged changes
  const applyChanges = async () => {
    const entries = Object.entries(pending);
    if (entries.length === 0) return;
    for (const [id, level] of entries) {
      const userRow = users.find((x) => x.id === id);
      if (!userRow) continue;
      if (!isAdmin && level === "admin") continue; // safety
      const payload =
      level === "admin" ?
      { role: "admin", access_level: "admin" } :
      level === "manager" ?
      { role: "user", access_level: "manager" } :
      { role: "user", access_level: "staff" };
      await User.update(id, payload);
      // reflect locally
      setUsers((prev) => prev.map((x) => x.id === id ? { ...x, ...payload } : x));
      if (currentUser && id === currentUser.id) {
        setCurrentUser((prev) => ({ ...(prev || {}), ...payload }));
      }
    }
    setPending({});
    alert("Changes saved.");
  };

  const openDialog = (u) => {
    const currentLevel = u.role === "admin" ? "admin" : u.access_level || "staff";
    setDialogUser(u);
    setDialogLevel(currentLevel);
    setDialogOpen(true);
  };

  const saveDialog = async (level) => {
    if (!dialogUser) return;
    // reuse apply logic from page
    if (!isAdmin && level === "admin") {
      alert("Only admins can grant admin access.");
      return;
    }
    const payload =
    level === "admin" ?
    { role: "admin", access_level: "admin" } :
    level === "manager" ?
    { role: "user", access_level: "manager" } :
    { role: "user", access_level: "staff" };
    await User.update(dialogUser.id, payload);
    setUsers((prev) => prev.map((x) => x.id === dialogUser.id ? { ...x, ...payload } : x));
    if (currentUser && dialogUser.id === currentUser.id) {
      setCurrentUser((prev) => ({ ...(prev || {}), ...payload }));
    }
    setDialogOpen(false);
    setDialogUser(null);
  };

  if (!currentUser) {
    return <div className="p-6">Loading…</div>;
  }

  // Staff (non-managers) cannot access this page
  if (!isAdmin && !isManager) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
        <div className="w-full max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                Restricted
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-slate-700">
              You don&apos;t have permission to manage user access. Contact an admin if you need changes.
            </CardContent>
          </Card>
        </div>
      </div>);

  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-600" />
              {isAdmin ? "User Access" : "Manager Console"}
            </h1>
            <p className="text-sm text-slate-600">
              {isAdmin ?
              "Promote or demote users. Only admins can assign Admin access." :
              "Manage your role visibility. Admin access is not available for managers."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin &&
            <div className="w-64">
                <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search name or email"
                className="h-9" />
              
              </div>
            }
            <Button
              onClick={applyChanges}
              disabled={Object.keys(pending).length === 0}
              className={`h-9 ${Object.keys(pending).length ? "bg-sky-600 hover:bg-sky-700" : "bg-slate-300"}`}
              title={Object.keys(pending).length ? "Save pending changes" : "No changes to save"}>
              
              Save changes
            </Button>
          </div>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="border-b">
            <CardTitle className="text-base">{isAdmin ? "All users" : "Your access"}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-12 text-s font-bold text-slate-500 px-4 py-2">
              <div className="bg-transparent text-slate-800 col-span-4">User</div>
              <div className="text-slate-800 col-span-3">Email</div>
              <div className="text-slate-800 col-span-2">Current</div>
              <div className="text-slate-800 pr-2 text-right col-span-3">Change access</div>
            </div>
            <div className="divide-y">
              {filtered.map((u) => {
                const currentLevel = u.role === "admin" ? "admin" : u.access_level || "staff";
                const stagedLevel = pending[u.id] ?? currentLevel;
                return (
                  <div key={u.id} className="grid grid-cols-12 items-center px-4 py-3 hover:bg-slate-50">
                    <div className="col-span-4">
                      <button
                        className="font-medium text-slate-900 hover:underline text-left"
                        onClick={() => openDialog(u)}
                        title="Edit user access">
                        
                        {u.full_name || u.email}
                      </button>
                      {u.full_name && <div className="text-slate-800">{u.email}</div>}
                    </div>
                    <div className="text-slate-800 col-span-3 truncate">{u.email}</div>
                    <div className="col-span-2">
                      <Badge variant="outline" className="capitalize">
                        {stagedLevel}
                      </Badge>
                    </div>
                    <div className="col-span-3 flex items-center justify-end gap-2">
                      <Select
                        value={stagedLevel}
                        onValueChange={(val) => stageAccessLevel(u, val)}
                        // Managers can only change their own access level
                        disabled={isManager && u.id !== currentUser.id}>
                        
                        <SelectTrigger className="w-36 h-8">
                          <SelectValue placeholder="Access level" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Admin option only shown to admins */}
                          {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                      {/* Quick promote/demote buttons */}
                      {isAdmin &&
                      <Button
                        size="icon"
                        variant="outline"
                        title="Promote"
                        onClick={() => stageAccessLevel(u, currentLevel === "admin" ? "admin" : currentLevel === "manager" ? "admin" : "manager")}
                        className="h-8 w-8">
                        
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                      }
                      <Button
                        size="icon"
                        variant="outline"
                        title="Demote"
                        onClick={() => stageAccessLevel(u, currentLevel === "admin" ? "staff" : "staff")}
                        className="h-8 w-8"
                        // Managers can only demote themselves
                        disabled={isManager && u.id !== currentUser.id}>
                        
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>);

              })}
              {filtered.length === 0 &&
              <div className="px-4 py-8 text-center text-slate-500 text-sm">
                  {isAdmin ? "No users found." : "No data available."}
                </div>
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {dialogOpen &&
      <UserAccessDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        user={dialogUser}
        canEdit={isAdmin || isManager && dialogUser?.id === currentUser?.id}
        initialLevel={dialogLevel}
        onSave={saveDialog} />

      }
    </div>);

}