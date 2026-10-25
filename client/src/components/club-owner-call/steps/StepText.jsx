import React from "react";

// One reading page of the call: optional title, paragraphs, and an optional
// small footer (e.g. date/place).
export default function StepText({ title, paragraphs = [], footer = [] }) {
  return (
    <div className="min-h-[62vh] flex flex-col justify-center py-6">
      {title && <h2 className="text-[26px] font-bold leading-[1.4] text-[#0A0A0A] mb-6">{title}</h2>}
      <div className="space-y-5 text-[16px] leading-[1.8] text-[#3A3A3A]">
        {paragraphs.map((p) => <p key={p}>{p}</p>)}
      </div>
      {footer.length > 0 && (
        <div className="mt-10 pt-4 divider-rule space-y-1">
          {footer.map((f) => <p key={f} className="text-[12px] text-[#8C8C8C]">{f}</p>)}
        </div>
      )}
    </div>
  );
}
