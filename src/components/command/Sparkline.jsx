import React from "react";
export default function Sparkline({ data = [], color = "#0ea5e9" }) {
  if (!data.length) return <div className="h-10" />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const norm = v => (max === min ? 50 : ((v - min) / (max - min)) * 100);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - norm(v)}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" className="w-full h-10">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  );
}