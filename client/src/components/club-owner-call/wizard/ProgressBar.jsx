import React from "react";

export default function ProgressBar({ current, total, isDark, isWhite }) {
  const pct = ((current + 1) / total) * 100;
  const trackColor = isDark ? "bg-[#2A2A2A]" : isWhite ? "bg-[#E2E2E2]" : "bg-[#D1D1D1]";
  const fillColor = isDark ? "bg-[#F4F4F4]" : "bg-[#0A0A0A]";
  return (
    <div className="px-6 pb-4 flex-shrink-0">
      <div className={`h-[2px] ${trackColor} relative overflow-hidden`}>
        <div
          className={`absolute top-0 right-0 h-full ${fillColor} transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}