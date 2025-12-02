import React from "react";
import { ResponsiveContainer, LineChart, Line, AreaChart, Area } from "recharts";

export default function MiniSparkline({ data = [], dataKey = "v", stroke = "#0b5ed7", fill = "rgba(11,94,215,0.12)", height = 32, area = true }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <div style={{ height }} />;
  }
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {area ? (
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <Area type="monotone" dataKey={dataKey} stroke={stroke} fill={fill} strokeWidth={1.5} />
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <Line type="monotone" dataKey={dataKey} stroke={stroke} strokeWidth={1.5} dot={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}