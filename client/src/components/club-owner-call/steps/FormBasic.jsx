import React, { useState } from "react";
import FormField from "../wizard/FormField";

// Keeps digits only, Persian ones converted to Latin so stored phones match the dashboard's.
const toDigits = (s) => s.replace(/[۰-۹]/g, (c) => "۰۱۲۳۴۵۶۷۸۹".indexOf(c)).replace(/\D/g, "");

export const isValid = (d) => !!(d.full_name || "").trim() && toDigits(d.phone || "").length >= 7;

export default function FormBasic({ formData, updateField }) {
  const [phoneError, setPhoneError] = useState("");

  const handlePhone = (v) => {
    setPhoneError(/[^\d۰-۹]/.test(v) ? "فقط عدد وارد کنید" : "");
    updateField("phone", toDigits(v).slice(0, 11)); // Iranian numbers are 11 digits
  };

  return (
    <div className="py-6">
      <h2 className="text-[20px] font-bold text-[#0A0A0A] mb-6">اطلاعات اولیه</h2>

      <FormField label="اسم و فامیل" value={formData.full_name} onChange={(v) => updateField("full_name", v)} required placeholder="پاسخ کوتاه" />
      <FormField label="شماره تماس" type="tel" inputMode="numeric" value={formData.phone} onChange={handlePhone} required placeholder="۰۹۱۲..." error={phoneError} />
      <FormField label="صفحه‌ای که شاید با آن بتوانیم شما را بهتر بشناسیم" value={formData.work_link} onChange={(v) => updateField("work_link", v)} optional placeholder="لینک (اینستاگرام، سایت، ...)" />
    </div>
  );
}
