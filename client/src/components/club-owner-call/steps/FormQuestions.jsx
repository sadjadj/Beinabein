import React, { useState } from "react";
import FormField from "../wizard/FormField";

export const isValid = (d) => !!(d.topics || "").trim();

const MAX_BYTES = 5 * 1024 * 1024; // same cap the API enforces

// Optional resume PDF, read in the browser and sent inline with the submission
// as { name, data: base64 } — the API checks it again and stores it.
function ResumeUpload({ value, onChange }) {
  const [error, setError] = useState("");

  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) return setError("فقط فایل PDF قابل بارگذاری است");
    if (file.size > MAX_BYTES) return setError("حجم فایل نباید بیشتر از ۵ مگابایت باشد");
    setError("");
    const reader = new FileReader();
    reader.onload = () => onChange({ name: file.name, data: String(reader.result).split(",")[1] });
    reader.onerror = () => setError("خواندن فایل ناموفق بود");
    reader.readAsDataURL(file);
  };

  return (
    <div className="-mt-3 mb-7">
      {value ? (
        <div className="flex items-center justify-between gap-3 border border-[#D1D1D1] px-4 py-2.5">
          <span dir="ltr" className="text-[14px] text-[#0A0A0A] truncate">{value.name}</span>
          <button type="button" onClick={() => onChange(undefined)} className="text-[13px] text-[#8C8C8C] hover:text-[#0A0A0A] flex-shrink-0">حذف</button>
        </div>
      ) : (
        <label className="inline-flex items-center cursor-pointer border border-[#D1D1D1] hover:border-[#0A0A0A] px-4 py-2 text-[14px] text-[#0A0A0A] transition-colors">
          بارگذاری فایل PDF
          <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={pick} />
        </label>
      )}
      <p className="mt-2 text-[12px] text-[#8C8C8C]">حداکثر ۵ مگابایت</p>
      {error && <p className="mt-1.5 text-[11px] text-[#B00]">{error}</p>}
    </div>
  );
}

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
        label="اگر رزومه یا تجربه‌ای دارید که به بهتر شناختنتان کمک می‌کند، لینکش را اینجا بگذارید یا فایل PDF آن را بارگذاری کنید."
        type="url"
        value={formData.resume}
        onChange={(v) => updateField("resume", v)}
        optional
        placeholder="https://..."
      />
      <ResumeUpload value={formData.resume_file} onChange={(v) => updateField("resume_file", v)} />
    </div>
  );
}
