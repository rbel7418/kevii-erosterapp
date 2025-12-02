import React from "react";

function getInitials(nameOrEmail) {
  const base = String(nameOrEmail || "").trim();
  const name = base.includes("@") ? base.split("@")[0] : base;
  const parts = name.replace(/[_.-]+/g, " ").split(" ").filter(Boolean);
  if (parts.length === 0) return "ST";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function StaffBadge({ name, size = 40, variant = "blue", className = "" }) {
  const initials = getInitials(name);
  const bg =
    variant === "blue"
      ? "linear-gradient(135deg, #0072CE, #005EB8)"
      : "linear-gradient(135deg, #94A3B8, #64748B)"; // slate variant
  return (
    <div
      className={`flex items-center justify-center rounded-md shadow-sm border border-black/5 ${className}`}
      style={{
        width: size,
        height: size,
        background: bg,
        color: "white",
        fontWeight: 800,
        letterSpacing: 0.5,
        fontSize: Math.max(10, Math.floor(size * 0.4)),
      }}
      title={name || "Staff"}
    >
      {initials}
    </div>
  );
}