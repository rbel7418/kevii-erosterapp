import React from "react";
export default function RagDot({ state }) {
  const color = state === "green" ? "#059669" : state === "amber" ? "#D97706" : state === "red" ? "#DC2626" : "#94A3B8";
  return <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color }} />;
}