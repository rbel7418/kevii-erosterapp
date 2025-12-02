import React, { useEffect } from "react";
import { createPageUrl } from "@/utils";

export default function DepartmentMonth() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const department = params.get("department") || "all";
    const month = params.get("month"); // yyyy-MM
    const qs = new URLSearchParams();
    if (department) qs.set("department", department);
    if (month) qs.set("month", month);
    const target = createPageUrl(`RotaGrid${qs.toString() ? "?" + qs.toString() : ""}`);
    window.location.replace(target);
  }, []);

  return (
    <div className="h-full flex items-center justify-center p-8 text-slate-600">
      Redirecting to Rotas…
    </div>
  );
}