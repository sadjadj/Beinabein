import React from "react";
import FormField from "../wizard/FormField";

export const isValid = (d) => !!(d.topics || "").trim();

export default function FormQuestions({ formData, updateField }) {
  return (
    <div className="py-6">
      <h2 className="text-[20px] font-bold text-[#0A0A0A] mb-6">درباره‌ی شما</h2>

      <div className="mb-8">
        <p className="text-[14px] font-semibold leading-[1.8] text-[#0A0A0A] mb-3">
          درباره‌ی موضوعاتی که در آن‌ها کنجکاوید یا تخصص دارید و می‌توانید حولش جمعی را تشکیل دهید، یک پاراگراف بنویسید.
          <span className="text-[#8C8C8C] font-normal mr-1 text-[12px]">*</span>
        </p>
        {/* Hint drawn by hand: some browsers indent a native placeholder in RTL textareas. */}
        <div className="relative">
          <textarea
            value={formData.topics || ""}
            onChange={(e) => updateField("topics", e.target.value)}
            rows={6}
            aria-label="یک پاراگراف"
            dir="rtl"
            className="block w-full bg-transparent border border-[#D1D1D1] focus:border-[#A8A8A8] outline-none px-4 py-3 text-right text-[15px] leading-[1.7] text-[#0A0A0A] resize-none transition-colors"
          />
          {!formData.topics && (
            <span className="pointer-events-none absolute top-3 right-4 text-[15px] leading-[1.7] text-[#C0C0C0]">یک پاراگراف</span>
          )}
        </div>
      </div>

      <FormField
        label="اگر رزومه یا تجربه‌ای دارید که به بهتر شناختنتان کمک می‌کند، لینکش را اینجا بگذارید (می‌تواند صفحه، ویدیو یا فایل PDF باشد)."
        type="url"
        value={formData.resume}
        onChange={(v) => updateField("resume", v)}
        optional
        placeholder="https://..."
      />
    </div>
  );
}
