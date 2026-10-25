import React from "react";

export default function StepCTA({ isDark }) {
  const ink = isDark ? "text-[#F4F4F4]" : "text-[#0A0A0A]";
  const sub = isDark ? "text-[#9A9A9A]" : "text-[#3A3A3A]";
  const rule = isDark ? "border-[#2A2A2A]" : "border-[#D1D1D1]";
  return (
    <div className="flex flex-col justify-center min-h-[78vh] py-6">
      <h2 dir="ltr" className={`font-mono-lab font-bold text-[26px] uppercase tracking-lab ${ink} mb-6`}>
        07 Apply
      </h2>
      <div className={`divider-rule ${rule} mb-6`} />
      <p className={`text-[17px] font-semibold leading-[1.7] ${ink} mb-4`}>
        اگر همچین ذهنیتی دارید…
      </p>
      <div className={`space-y-4 text-[16px] leading-[1.8] ${sub}`}>
        <p>
          برای شرکت در <span className="font-mono-lab">Challenge Day</span> باید یک فرم پر کنید. این فرم درخواست کمتر درباره رزومه و بیشتر درباره شیوه‌ی فکر کردن شماست.
        </p>
        <p>
          درخواست‌ها به‌صورت مستمر بررسی می‌شوند و پس از بررسی اولیه، با افرادی که برای مرحله‌ی بعد انتخاب می‌شوند تماس گرفته خواهد شد.
        </p>
      </div>
    </div>
  );
}