import React from "react";

// Link only — no file upload; the API has no file storage.
export default function ResumeField({ value, onChange }) {
  return (
    <div className="mb-7">
      <label className="block text-[14px] font-semibold text-[#0A0A0A] mb-2">
        رزومه
        <span className="text-[#8C8C8C] font-normal text-[11px] mr-1">(اختیاری)</span>
      </label>
      <p className="text-[12px] text-[#8C8C8C] leading-relaxed mb-3">
        لینک رزومه را وارد کنید (مثلاً گوگل درایو).
      </p>
      <input
        type="url"
        dir="ltr"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://..."
        className="w-full bg-transparent border-b border-[#D1D1D1] focus:border-[#0A0A0A] outline-none py-2 text-[15px] text-[#0A0A0A] transition-colors placeholder:text-[#C0C0C0]"
      />
    </div>
  );
}
