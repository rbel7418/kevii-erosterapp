
import React, { useState, useEffect, useMemo } from "react";
import DepartmentManager from "@/components/settings/DepartmentManager";
import RoleManager from "@/components/settings/RoleManager";
import ShiftCodeColorManager from "@/components/settings/ShiftCodeColorManager";
import EmployeeMasterList from "@/components/settings/EmployeeMasterList";
import IntegrationsList from "@/components/settings/IntegrationsList";
import ThemeManager from "@/components/settings/ThemeManager"; // NEW
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Settings as SettingsIcon, Palette, Shield, Building2, Bot, CreditCard, Smile, Rss, DollarSign, Lock, Plug2, Search, Briefcase, Users } from "lucide-react";
import { ShiftCode } from "@/entities/ShiftCode";

export default function Settings() {
  // simple tab handling via URL param
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("tab") || "company";
  const [tab, setTab] = React.useState(initialTab);

  const setTabAndUrl = (t) => {
    setTab(t);
    const u = new URL(window.location.href);
    u.searchParams.set("tab", t);
    window.history.replaceState({}, "", u.toString());
  };

  // NEW: company left menu section state synced to URL (?section=...)
  const initialSection = urlParams.get("section") || "departments";
  const [companySection, setCompanySection] = React.useState(initialSection);
  const setSectionAndUrl = (s) => {
    setCompanySection(s);
    const u = new URL(window.location.href);
    u.searchParams.set("section", s);
    window.history.replaceState({}, "", u.toString());
  };

  const TABS = [
    { key: "general", label: "General", icon: SettingsIcon },
    { key: "branding", label: "Logo & Colours", icon: Palette },
    { key: "permissions", label: "Permissions", icon: Shield },
    { key: "company", label: "Company", icon: Building2 },
    { key: "agents", label: "AI Agents", icon: Bot },
    { key: "billing", label: "Billing", icon: CreditCard },
    { key: "welcome", label: "Welcome", icon: Smile },
    { key: "feed", label: "Feed", icon: Rss },
    { key: "pay", label: "Pay Rates", icon: DollarSign },
    { key: "security", label: "Security", icon: Lock },
    { key: "integrations", label: "Integrations", icon: Plug2 },
  ];

  // NEW: left menu entries for company tab
  const COMPANY_MENU = [
    { key: "departments", label: "Departments", icon: Building2, desc: "Manage departments & locations" },
    { key: "roles", label: "Roles", icon: Briefcase, desc: "Manage roles & position rates" },
    { key: "employees", label: "Employees", icon: Users, desc: "Control who appears on the roster grid" },
    { key: "shiftcodes", label: "Shift Codes", icon: Palette, desc: "Manage shift code colors & defaults" },
  ];

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      <div className="w-full space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-600">Configure your healthcare roster system</p>
        </div>

        {/* Tabs header */}
        <div className="bg-white border border-slate-200 rounded-md p-2 flex flex-wrap items-center gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <Button
                key={t.key}
                variant={active ? "default" : "ghost"}
                className={`h-8 ${active ? "bg-slate-900 text-white" : "text-slate-700"}`}
                onClick={() => setTabAndUrl(t.key)}
              >
                <Icon className="w-4 h-4 mr-2" />
                {t.label}
              </Button>
            );
          })}
        </div>

        {/* Tab content */}
        {tab === "company" ? (
          // NEW: Left-sided layout
          <div className="grid grid-cols-12 gap-4 lg:gap-6">
            {/* Left sidebar */}
            <aside className="col-span-12 md:col-span-3 lg:col-span-2">
              <div className="sticky top-16">
                <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
                  <div className="px-4 py-3 border-b bg-slate-50">
                    <div className="font-semibold text-slate-800">Company</div>
                    <div className="text-xs text-slate-500">Structure & setup</div>
                  </div>
                  <nav className="p-2 space-y-1">
                    {COMPANY_MENU.map((m) => {
                      const Icon = m.icon;
                      const active = companySection === m.key;
                      return (
                        <button
                          key={m.key}
                          onClick={() => setSectionAndUrl(m.key)}
                          className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-md transition ${
                            active
                              ? "bg-slate-900 text-white"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{m.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </div>
            </aside>

            {/* Right content */}
            <section className="col-span-12 md:col-span-9 lg:col-span-10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {COMPANY_MENU.find((m) => m.key === companySection)?.label}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {COMPANY_MENU.find((m) => m.key === companySection)?.desc}
                  </p>
                </div>
              </div>

              {companySection === "departments" && (
                <DepartmentManager />
              )}

              {companySection === "roles" && (
                <RoleManager />
              )}

              {companySection === "employees" && (
                <EmployeeMasterList />
              )}

              {companySection === "shiftcodes" && (
                <ShiftCodeColorManager />
              )}
            </section>
          </div>
        ) : tab === "branding" ? (
          <div className="space-y-4">
            <ThemeManager />
          </div>
        ) : tab === "integrations" ? (
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <IntegrationsList />
          </div>
        ) : (
          <Card className="p-8 text-slate-600 text-sm">
            This section will be available soon. Switch to the Company tab to manage Departments and Roles.
          </Card>
        )}
      </div>
    </div>
  );
}
