import React, { useEffect, useState } from "react";
import FormField from "../wizard/FormField";
import ResumeField from "../wizard/ResumeField";

const toDigits = (s) => s.replace(/[^\d۰-۹]/g, "");
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export default function FormBasic({ formData, updateField, setCanProceed }) {
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    const phoneDigits = toDigits(formData.phone || "");
    const phoneOk = phoneDigits.length >= 7;
    const emailOk = isEmail(formData.email || "");
    const ok = formData.full_name && emailOk && phoneOk && formData.background;
    setCanProceed(!!ok);
  }, [formData.full_name, formData.email, formData.phone, formData.background, formData.resume, setCanProceed]);

  const emailInvalid = formData.email && !isEmail(formData.email);

  const handlePhone = (v) => {
    if (/[^\d۰-۹]/.test(v)) {
      setPhoneError("فقط عدد وارد کنید");
    } else {
      setPhoneError("");
    }
    updateField("phone", toDigits(v));
  };

  return (
    <div className="py-6">
      <p dir="ltr" className="font-mono-lab text-[11px] uppercase tracking-lab text-[#8C8C8C] mb-2">08 Basic Info</p>
      <h2 className="text-[20px] font-bold text-[#0A0A0A] mb-6">اطلاعات اولیه</h2>

      <FormField label="نام و نام خانوادگی" value={formData.full_name} onChange={(v) => updateField("full_name", v)} required placeholder="پاسخ کوتاه" />
      <FormField label="ایمیل" type="email" value={formData.email} onChange={(v) => updateField("email", v)} required placeholder="example@mail.com" error={emailInvalid ? "ایمیل معتبر نیست" : ""} />
      <FormField label="شماره تماس" type="tel" inputMode="numeric" value={formData.phone} onChange={handlePhone} required placeholder="۰۹۱۲..." hint="فقط عدد" error={phoneError} />
      <FormField label="حوزه یا حوزه‌های فعالیت، کنجکاوی، مطالعه یا تخصص" value={formData.background} onChange={(v) => updateField("background", v)} required placeholder="پاسخ کوتاه" />
      <FormField label="یک لینک، فایل، نوشته، پروژه یا هر چیز دیگری که به شناخت بهتر شما کمک می‌کند" value={formData.work_link} onChange={(v) => updateField("work_link", v)} optional placeholder="لینک" />
      <ResumeField value={formData.resume} onChange={(v) => updateField("resume", v)} />
    </div>
  );
}