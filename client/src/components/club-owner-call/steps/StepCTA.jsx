import React from "react";

export default function StepCTA({ isDark }) {
  const ink = isDark ? "text-[#F4F4F4]" : "text-[#0A0A0A]";
  const sub = isDark ? "text-[#9A9A9A]" : "text-[#3A3A3A]";
  const rule = isDark ? "border-[#2A2A2A]" : "border-[#D1D1D1]";
  return (
    <div className="flex flex-col justify-center min-h-[62vh] py-6">
      <h2 className={`text-[26px] font-bold leading-[1.4] ${ink} mb-6`}>
        اگر جمع‌ساز هستید…
      </h2>
      <div className={`divider-rule ${rule} mb-6`} />
      <div className={`space-y-4 text-[16px] leading-[1.8] ${sub}`}>
        <p>
          برای دعوت به دورهمی بینابین، فرم کوتاهی را پر کنید. این فرم بیشتر درباره‌ی موضوع‌هایی است که دوست دارید جمعی حولشان بسازید تا سابقه و رزومه‌تان.
        </p>
        <p>
          درخواست‌ها به‌صورت مستمر بررسی می‌شوند و با کسانی که برای دورهمی انتخاب می‌شوند تماس می‌گیریم.
        </p>
      </div>
    </div>
  );
}