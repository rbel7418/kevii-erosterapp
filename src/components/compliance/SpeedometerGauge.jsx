import React from "react";
import { B_PAL } from "./ComplianceUtils";

// Simple semicircle speedometer with needle and centered value
export default function SpeedometerGauge({
  value = 0,
  max = 100,
  label = "",
  size = 180,        // full width in px; height is ~ size/2
  segments = 5,
  showPercent = true // display value with % or raw value
}) {
  const w = size;
  const h = Math.round(size * 0.6);
  const cx = w / 2;
  const cy = h;
  const rOuter = Math.round(size * 0.48);
  const rInner = Math.round(rOuter * 0.62);
  const startAngle = -90;
  const endAngle = 90;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const ratio = clamp(max ? value / max : 0, 0, 1);
  const needleAngle = startAngle + (endAngle - startAngle) * ratio;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const polar = (r, a) => [cx + r * Math.cos(toRad(a)), cy + r * Math.sin(toRad(a))];

  const arcPath = (ri, ro, a0, a1) => {
    const [x0, y0] = polar(ro, a0);
    const [x1, y1] = polar(ro, a1);
    const [x2, y2] = polar(ri, a1);
    const [x3, y3] = polar(ri, a0);
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M ${x0} ${y0} A ${ro} ${ro} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${ri} ${ri} 0 ${large} 0 ${x3} ${y3} Z`;
  };

  const segAngle = (endAngle - startAngle) / segments;
  const segs = Array.from({ length: segments }, (_, i) => ({
    a0: startAngle + i * segAngle,
    a1: startAngle + (i + 1) * segAngle,
    color: B_PAL[Math.min(B_PAL.length - 1, i + 1)] // mid-to-light blues left->right
  }));

  const [nx, ny] = polar(rOuter * 0.98, needleAngle);
  const [kb, ky] = polar(rOuter * 0.1, needleAngle + 180);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <svg width={w} height={h + 8} viewBox={`0 0 ${w} ${h + 8}`}>
        {/* background arcs */}
        {segs.map((s, idx) => (
          <path key={idx} d={arcPath(rInner, rOuter, s.a0, s.a1)} fill={s.color} opacity={0.85} />
        ))}

        {/* needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={B_PAL[0]} strokeWidth="3" />
        <circle cx={cx} cy={cy} r="6" fill="white" stroke={B_PAL[0]} strokeWidth="2" />
        <line x1={cx} y1={cy} x2={kb} y2={ky} stroke={B_PAL[0]} strokeWidth="3" opacity="0.35" />
      </svg>

      <div className="text-center -mt-3">
        <div className="text-2xl font-bold" style={{ color: B_PAL[1] }}>
          {showPercent ? Math.round(value) + "%" : value}
        </div>
        {label && <div className="text-xs text-slate-600 mt-0.5">{label}</div>}
      </div>
    </div>
  );
}