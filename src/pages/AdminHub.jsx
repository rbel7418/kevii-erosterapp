import React from "react";
import { User } from "@/entities/User";
import DepartmentManager from "@/components/settings/DepartmentManager";
import RoleManager from "@/components/settings/RoleManager";
import ShiftCodeColorManager from "@/components/settings/ShiftCodeColorManager";
import ShiftCodeColorSchemeSelector from "@/components/settings/ShiftCodeColorSchemeSelector"; // NEW
import ThemeManager from "@/components/settings/ThemeManager";
import UserAdmin from "./UserAdmin";
import AdminPagesPermissions from "./AdminPagesPermissions";
import AdminEmployeePermissions from "./AdminEmployeePermissions";
import IPCTrainingDB from "./IPCTrainingDB";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Palette,
  Briefcase,
  Shield,
  Users,
  Eye,
  Settings as SettingsIcon,
  FileText,
} from "lucide-react";

export default function AdminHub() {
  const [me, setMe] = React.useState(null);
  const [tab, setTab] = React.useState(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("tab") || "employees";
  });

  React.useEffect(() => {
    (async () => {
      try {
        const u = await User.me();
        setMe(u);
      } catch {
        setMe(null);
      }
    })();
  }, []);

  const setTabAndUrl = (key) => {
    setTab(key);
    const u = new URL(window.location.href);
    u.searchParams.set("tab", key);
    window.history.replaceState({}, "", u.toString());
  };

  const SECTIONS = [
    { key: "employees", label: "Employee Details", icon: Users, desc: "Manage employees, access levels, status and bulk actions" },
    { key: "departments", label: "Department Config", icon: Building2, desc: "Create and manage departments/wards" },
    { key: "shiftcodes", label: "Shift Codes Config", icon: Palette, desc: "Define shift code colours and defaults" },
    { key: "roles", label: "Roles Config", icon: Briefcase, desc: "Manage roles and default rates" },
    { key: "useraccess", label: "User Access Permissions", icon: Shield, desc: "Promote/demote users and manage roles" },
    { key: "pagesperms", label: "Pages & Components Permissions", icon: SettingsIcon, desc: "Control which roles can see pages/components" },
    { key: "design", label: "Global Design", icon: Palette, desc: "Apply theme, colours and navigation overrides" },
    { key: "visibility", label: "Global Pages Visibility", icon: Eye, desc: "Fine-tune visibility of pages and components" },
    { key: "ipctrainingdb", label: "IPC Training DB", icon: Shield, desc: "IPC training compliance imports and views" }
  ];

  const isAdmin = me?.role === "admin";

  const renderActive = () => {
    switch (tab) {
      case "employees":
        return <AdminEmployeePermissions />;
      case "departments":
        return <DepartmentManager />;
      case "shiftcodes":
        return (
          <div className="space-y-3">
            <ShiftCodeColorManager />
            <ShiftCodeColorSchemeSelector />
          </div>
        );
      case "roles":
        return <RoleManager />;
      case "useraccess":
        return <UserAdmin />;
      case "pagesperms":
        return <AdminPagesPermissions />;
      case "design":
        return (
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <ThemeManager />
            </CardContent>
          </Card>
        );
      case "visibility":
        return <AdminPagesPermissions />;
      case "ipctrainingdb":
        return <IPCTrainingDB />;
      default:
        return null;
    }
  };

  if (!me) {
    return <div className="p-6 md:p-8 themed">Loading…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-6 md:p-8 themed">
        <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Restricted</h2>
          <p className="text-sm text-slate-600">Admins only. Contact an administrator if you need access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 themed min-h-screen" style={{ background: 'var(--dm-bg-base)' }}>
      <div className="w-full space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--dm-text-primary)' }}>Admin Hub</h1>
            <p className="text-sm" style={{ color: 'var(--dm-text-tertiary)' }}>Centralised configuration for employees and platform settings</p>
          </div>
          <div className="w-full md:w-72">
            <Input
              placeholder="Quick tip: Use the tabs below to switch sections"
              className="h-9"
              readOnly
              onFocus={(e) => e.target.blur()}
            />
          </div>
        </div>

        {/* Second top-level header style tabs */}
        <div className="border rounded-md p-2 overflow-x-auto" style={{ background: 'var(--dm-bg-elevated)', borderColor: 'var(--dm-border)' }}>
          <div className="flex items-center gap-2 min-w-max">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = tab === s.key;
              return (
                <Button
                  key={s.key}
                  variant={active ? "default" : "ghost"}
                  className={`h-9 ${active ? "bg-slate-900 text-white" : ""}`}
                  style={!active ? { color: 'var(--dm-text-primary)' } : {}}
                  onClick={() => setTabAndUrl(s.key)}
                  title={s.desc}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {s.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Active section content */}
        <div className="space-y-3">{renderActive()}</div>
      </div>
    </div>
  );
}