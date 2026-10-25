import React from "react";

export default function FormField({ label, value, onChange, type = "text", inputMode, placeholder, required, optional, hint, error }) {
  return (
    <div className="mb-7">
      {label &&
      <label className="block text-[14px] font-semibold text-[#0A0A0A] mb-2">
          {label}
          {required && <span className="text-[#8C8C8C] font-normal mr-1 text-[12px]">*</span>}
          {optional && <span className="text-[#8C8C8C] font-normal text-[11px] mr-1">(اختیاری)</span>}
        </label>
      }
      
      {type === "textarea" ?
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={5}
        className="w-full bg-transparent border-b border-[#D1D1D1] focus:border-[#0A0A0A] outline-none py-2 text-[15px] leading-[1.7] text-[#0A0A0A] resize-none transition-colors placeholder:text-[#C0C0C0]" /> :


      <input
        type={type}
        inputMode={inputMode}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border-b border-[#D1D1D1] focus:border-[#0A0A0A] outline-none py-2 text-[15px] text-[#0A0A0A] transition-colors placeholder:text-[#C0C0C0]" />

      }
      {error && <p className="mt-1.5 text-[11px] text-[#B00] leading-relaxed">{error}</p>}
    </div>);

}