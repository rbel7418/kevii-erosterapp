import React from "react";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Palette,
  Briefcase,
  Shield,
  Users,
  Eye,
  Settings as SettingsIcon,
  GraduationCap
} from "lucide-react";

export default function TrainingAdminHub() {
  const [tab, setTab] = React.useState("employees");

  const SECTIONS = [
    { key: "employees", label: "Employee Details", icon: Users, desc: "Manage employees (Training Mode)" },
    { key: "departments", label: "Department Config", icon: Building2, desc: "Manage departments (Training Mode)" },
    { key: "shiftcodes", label: "Shift Codes Config", icon: Palette, desc: "Shift code colours (Training Mode)" },
    { key: "roles", label: "Roles Config", icon: Briefcase, desc: "Roles management (Training Mode)" },
    { key: "useraccess", label: "User Access Permissions", icon: Shield, desc: "User access (Training Mode)" },
    { key: "pagesperms", label: "Pages & Components Permissions", icon: SettingsIcon, desc: "Permissions (Training Mode)" },
    { key: "design", label: "Global Design", icon: Palette, desc: "Design settings (Training Mode)" },
    { key: "visibility", label: "Global Pages Visibility", icon: Eye, desc: "Visibility settings (Training Mode)" },
  ];

  return (
    <div className="p-6 md:p-8 min-h-screen bg-red-50/30">
      <div className="w-full space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Badge className="bg-red-600 text-white">TRAINING MODE</Badge>
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Admin Hub (Training)</h1>
                <p className="text-sm text-slate-500">Practice configuration safely. Changes here are not saved to the live system.</p>
            </div>
          </div>
          <div className="w-full md:w-72">
            <Input
              placeholder="Training Mode Active"
              className="h-9 bg-red-50 border-red-200"
              readOnly
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="border rounded-md p-2 overflow-x-auto bg-white/80 border-red-200">
          <div className="flex items-center gap-2 min-w-max">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = tab === s.key;
              return (
                <Button
                  key={s.key}
                  variant={active ? "default" : "ghost"}
                  className={`h-9 ${active ? "bg-red-600 hover:bg-red-700 text-white" : "text-slate-700 hover:bg-red-50 hover:text-red-700"}`}
                  onClick={() => setTab(s.key)}
                  title={s.desc}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {s.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Active section content placeholder */}
        <div className="p-8 border-2 border-dashed border-red-200 rounded-xl bg-white/50 flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
            <div className="p-4 bg-red-100 rounded-full">
                <GraduationCap className="w-12 h-12 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800">Training Simulation</h3>
            <p className="text-slate-600 max-w-md">
                You are viewing the <strong>{SECTIONS.find(s => s.key === tab)?.label}</strong> section in Training Mode.
            </p>
            <p className="text-sm text-slate-500">
                This is a safe environment. Configuration panels are simulated here to prevent accidental changes to the live system.
            </p>
        </div>
      </div>
    </div>
  );
}