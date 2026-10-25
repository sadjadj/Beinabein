import React from "react";

export const isValid = (d) => !!d.can_attend;

export default function FormAttendance({ formData, updateField }) {
  return (
    <div className="py-6">
      <h2 className="text-[20px] font-bold text-[#0A0A0A] mb-5">امکان حضور</h2>
      <p className="text-[15px] leading-[1.7] text-[#3A3A3A] mb-6">
        امکان حضور در دورهمی روز پنج‌شنبه، ۱۴ آبان در تهران را دارید؟
      </p>

      <div className="flex gap-3 mb-8">
        <button
          onClick={() => updateField("can_attend", "yes")}
          className={`flex-1 py-3 text-[15px] font-bold transition-colors ${
          formData.can_attend === "yes" ?
          "bg-[#0A0A0A] text-[#F4F4F4]" :
          "bg-[#E2E2E2] text-[#0A0A0A]"}`
          }>
          
          بله
        </button>
        <button
          onClick={() => updateField("can_attend", "no")}
          className={`flex-1 py-3 text-[15px] font-bold transition-colors ${
          formData.can_attend === "no" ?
          "bg-[#0A0A0A] text-[#F4F4F4]" :
          "bg-[#E2E2E2] text-[#0A0A0A]"}`
          }>
          
          خیر
        </button>
      </div>

      <div className="divider-rule mb-5" />
      <p className="text-[13px] leading-[1.7] text-[#8C8C8C] mb-4">
        پس از بررسی درخواست‌ها، با کسانی که برای دورهمی انتخاب می‌شوند تماس گرفته خواهد شد.
      </p>
      <p className="text-[12px] text-[#8C8C8C]">
        دورهمی بینابین: پنجشنبه ۱۴ آبان
      </p>
    </div>);

}