import React, { useState } from "react";
import { api } from "@/api/client";
import FormField from "../wizard/FormField";

// «ادامه» stays disabled while a resume is still uploading.
export const isValid = (d) => !!(d.topics || "").trim() && !d.resume_uploading;

const MAX_BYTES = 5 * 1024 * 1024; // same cap the API enforces

// Optional resume PDF, uploaded as soon as it's picked; the application only
// carries the returned file id.
function ResumeUpload({ formData, updateField }) {
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const uploading = !!formData.resume_uploading;

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) return setError("فقط فایل PDF قابل بارگذاری است");
    if (file.size > MAX_BYTES) return setError("حجم فایل نباید بیشتر از ۵ مگابایت باشد");
    setError("");
    setProgress(0);
    updateField("resume_uploading", true);
    try {
      const { id, filename } = await api.uploadResume(file, setProgress);
      updateField("resume_file_id", id);
      updateField("resume_file_name", filename);
    } catch (err) {
      setError(err.message);
    }
    updateField("resume_uploading", false);
  };

  const remove = () => {
    updateField("resume_file_id", undefined);
    updateField("resume_file_name", undefined);
  };

  const percent = Math.round(progress * 100).toLocaleString("fa-IR");

  return (
    <div className="-mt-3 mb-7">
      {uploading ? (
        <div className="border border-[#D1D1D1] px-4 py-2.5" role="status">
          <div className="flex items-center gap-3 text-[14px] text-[#3A3A3A]">
            <span className="w-4 h-4 rounded-full border-2 border-[#D1D1D1] border-t-[#0A0A0A] animate-spin flex-shrink-0" />
            در حال بارگذاری… {percent}٪
          </div>
          <div className="mt-2 h-[2px] bg-[#E2E2E2]">
            <div className="h-full bg-[#0A0A0A] transition-all duration-200" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      ) : formData.resume_file_id ? (
        <div className="flex items-center justify-between gap-3 border border-[#D1D1D1] px-4 py-2.5">
          <span className="flex items-center gap-2 min-w-0">
            <span className="w-5 h-5 rounded-full bg-[#1D7A46] text-white flex items-center justify-center text-[12px] flex-shrink-0" aria-label="بارگذاری شد">✓</span>
            <span dir="ltr" className="text-[14px] text-[#0A0A0A] truncate">{formData.resume_file_name}</span>
          </span>
          <button type="button" onClick={remove} className="text-[13px] text-[#8C8C8C] hover:text-[#0A0A0A] flex-shrink-0">حذف</button>
        </div>
      ) : (
        <label className="inline-flex items-center cursor-pointer border border-[#D1D1D1] hover:border-[#0A0A0A] px-4 py-2 text-[14px] text-[#0A0A0A] transition-colors">
          بارگذاری فایل PDF
          <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={pick} />
        </label>
      )}
      <p className="mt-2 text-[12px] text-[#8C8C8C]">
        {formData.resume_file_id && !uploading ? "فایل با موفقیت بارگذاری شد" : "حداکثر ۵ مگابایت"}
      </p>
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
        label="اگر رزومه یا تجربه‌ای دارید که به بهتر شناختنتان کمک می‌کند، لطفا در اینجا بارگذاری کنید (می‌تواند لینک، ویدیو یا یک فایل پی‌دی‌اف باشد)."
        type="url"
        value={formData.resume}
        onChange={(v) => updateField("resume", v)}
        optional
        placeholder="https://..."
      />
      <ResumeUpload formData={formData} updateField={updateField} />
    </div>
  );
}
